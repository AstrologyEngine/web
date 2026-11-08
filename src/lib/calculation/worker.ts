import { birthSchema, settingsSchema } from "../domain";
import { chartSchema, deriveAstrology } from "./chart";
import { snapshotSchema } from "./snapshot";

const DATASET =
  "06d4c26e589207bf479dbd217fafb3e4d6c559626425b156912e39a4d859487b";
const INDEX =
  "adc9ea1aea895e98f8984f7d20fce8d187bd834d6d883f5a5467f0b67437e3fe";
const WASM = "22c1aa9cd9b457b24521d0dc7a1e90710a9fbd29bc40040f2a359b51a59096ff";
const root = new URL("./engine/", self.location.href);
const hash = async (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const verified = async (url: URL, expected: string, bytes?: number) => {
  const r = await fetch(url).catch(() => {
    throw Error("Could not download calculation data.");
  });
  if (!r.ok) throw Error("Could not download calculation data.");
  const b = await r.arrayBuffer();
  if (
    (bytes !== undefined && b.byteLength !== bytes) ||
    (await hash(b)) !== expected
  )
    throw Error("Calculation data failed its integrity check.");
  return b;
};
type Engine = {
  default: (arg: { module_or_path: ArrayBuffer }) => Promise<unknown>;
  calculate: (bytes: Uint8Array, request: string) => string;
};
let enginePromise: Promise<Engine> | undefined;
const engine = () =>
  (enginePromise ??= (async () => {
    const moduleUrl = new URL("chart.js", root).href;
    const [m, wasm] = await Promise.all([
      import(/* @vite-ignore */ moduleUrl) as Promise<Engine>,
      verified(new URL("chart_bg.wasm", root), WASM),
    ]);
    await m.default({ module_or_path: wasm });
    return m;
  })().catch((e) => {
    enginePromise = undefined;
    throw e;
  }));
type Segment = { year: number; url: string; bytes: number; sha256: string };
let indexPromise:
  | Promise<{
      birthCoverageUtc: { startUtc: string; endUtc: string };
      segments: Segment[];
    }>
  | undefined;
const index = (): Promise<{
  birthCoverageUtc: { startUtc: string; endUtc: string };
  segments: Segment[];
}> =>
  (indexPromise ??= verified(new URL("ephemeris/index.json", root), INDEX)
    .then((b) => JSON.parse(new TextDecoder().decode(b)))
    .catch((e) => {
      indexPromise = undefined;
      throw e;
    }));
const cache = new Map<string, Uint8Array>();
const dataset = async (utc: string) => {
  const idx = await index();
  const t = Date.parse(utc);
  if (
    t < Date.parse(idx.birthCoverageUtc.startUtc) ||
    t > Date.parse(idx.birthCoverageUtc.endUtc)
  )
    throw Error("Birth date is outside the supported calculation range.");
  const s = idx.segments.find((s) => s.year === new Date(t).getUTCFullYear());
  if (
    !s ||
    !s.url.startsWith(DATASET + "/") ||
    s.url !== `${DATASET}/${s.sha256}.bin`
  )
    throw Error("No verified data covers this date.");
  let data = cache.get(s.sha256);
  if (!data) {
    data = new Uint8Array(
      await verified(new URL("ephemeris/" + s.url, root), s.sha256, s.bytes),
    );
    cache.set(s.sha256, data);
    if (cache.size > 3) cache.delete(cache.keys().next().value!);
  }
  return { data, sha256: s.sha256 };
};
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent) => {
  queue = queue
    .then(async () => {
      const generation = event.data.generation;
      let initializationFailed = false;
      try {
        const input = birthSchema.safeParse(event.data.birth),
          options = settingsSchema.safeParse(event.data.settings);
        if (
          !input.success ||
          !options.success ||
          !options.data.systems.astrology ||
          options.data.systems.humanDesign
        ) {
          self.postMessage({
            generation,
            result: {
              ok: false,
              code: "INVALID_INPUT",
              retryWorker: false,
              message:
                "Birth details or settings are invalid. Please check them and try again.",
            },
          });
          return;
        }
        const birth = input.data,
          settings = options.data;
        const [m, slice] = await Promise.all([
          engine().catch((error) => {
            initializationFailed = true;
            throw error;
          }),
          dataset(birth.utc),
        ]);
        const configuration = {
          reference: settings.reference,
          divisions: settings.divisions,
          ophiuchus:
            settings.divisions === "equal"
              ? null
              : settings.ophiuchus
                ? "enabled"
                : "disabled",
        };
        const calc = (
          config: typeof configuration,
          instant:
            | { scale: "utc"; value: string }
            | { scale: "et"; value: number },
        ) =>
          chartSchema.parse(
            JSON.parse(
              m.calculate(
                slice.data,
                JSON.stringify({
                  instant,
                  latitude: birth.latitude,
                  longitude: birth.longitude,
                  house_system: settings.houses,
                  configuration: config,
                }),
              ),
            ),
          );
        const selected = calc(configuration, {
          scale: "utc",
          value: birth.utc,
        });
        const astrology = settings.systems.astrology
          ? deriveAstrology(
              selected,
              calc(
                { reference: "tropical", divisions: "equal", ophiuchus: null },
                { scale: "utc", value: birth.utc },
              ),
              settings.atmakaraka,
            )
          : undefined;
        const snapshot = {
          schemaVersion: 1,
          calculationId: crypto.randomUUID(),
          generation,
          birth,
          requestedSettings: settings,
          provenance: {
            engineCommit: "b2bd547728f31a951a1afd78dfaa94225d8c152f",
            supplementarySourceCommit:
              "3771c081ba41bce4818984ce999158d88902d93d",
            wrapperSha256: WASM,
            datasetSha256: DATASET,
            datasetFingerprint: "d83046a0",
            sliceSha256: [slice.sha256],
            conventionRevision: selected.convention_revision,
          },
          systems: astrology ? { astrology } : {},
        };
        self.postMessage({
          generation,
          result: { ok: true, snapshot: snapshotSchema.parse(snapshot) },
        });
      } catch (error) {
        self.postMessage({
          generation,
          result: {
            ok: false,
            retryWorker: initializationFailed,
            code:
              error instanceof Error &&
              error.message === "Could not download calculation data."
                ? "DATA_UNAVAILABLE"
                : error instanceof Error &&
                    error.message ===
                      "Calculation data failed its integrity check."
                  ? "DATA_INTEGRITY"
                  : error instanceof Error &&
                      [
                        "Birth date is outside the supported calculation range.",
                        "No verified data covers this date.",
                      ].includes(error.message)
                    ? "OUT_OF_RANGE"
                    : "CALCULATION_FAILED",
            message:
              error instanceof Error &&
              [
                "Could not download calculation data.",
                "Calculation data failed its integrity check.",
                "Birth date is outside the supported calculation range.",
                "No verified data covers this date.",
              ].includes(error.message)
                ? error.message
                : "Calculation failed. Please retry.",
          },
        });
      }
    })
    .catch(() => {});
};
