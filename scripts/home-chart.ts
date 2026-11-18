// Generates the homepage's sample chart (src/lib/home/chart.json) with the
// app's engine and settings. The moment is anonymous on the page; it was
// chosen so a few major planets sit in the visible bottom-left quarter.
//
//   bun scripts/home-chart.ts
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chartSchema, deriveAstrology } from "../src/lib/calculation/chart";
import { initialSettings } from "../src/lib/domain";

export const SAMPLE = {
  utc: "2014-06-06T03:00:00Z",
  latitude: 51.5074,
  longitude: -0.1278,
};

const root = fileURLToPath(new URL("../static/engine/", import.meta.url));
const engine = await import(`${root}chart.js`);
engine.initSync({ module: readFileSync(`${root}chart_bg.wasm`) });
const index = JSON.parse(
  readFileSync(`${root}ephemeris/index.json`, "utf8"),
) as { segments: { year: number; url: string }[] };
const slices = new Map<number, Uint8Array>();
const slice = (year: number) => {
  let bytes = slices.get(year);
  if (!bytes) {
    const segment = index.segments.find((s) => s.year === year);
    if (!segment) throw new Error(`No ephemeris for ${year}`);
    bytes = readFileSync(`${root}ephemeris/${segment.url}`);
    slices.set(year, bytes);
  }
  return bytes;
};

/** The chart and aspects the app would show for this moment and place. */
export const calculate = ({ utc, latitude, longitude }: typeof SAMPLE) => {
  const { reference, divisions, houses } = initialSettings;
  const chart = chartSchema.parse(
    JSON.parse(
      engine.calculate(
        slice(new Date(utc).getUTCFullYear()),
        JSON.stringify({
          instant: { scale: "utc", value: utc },
          latitude,
          longitude,
          house_system: houses,
          configuration: { reference, divisions, ophiuchus: null },
        }),
      ),
    ),
  );
  const { aspects } = deriveAstrology(chart, chart, initialSettings.atmakaraka);
  return { chart, aspects };
};

if (import.meta.main) {
  const out = fileURLToPath(
    new URL("../src/lib/home/chart.json", import.meta.url),
  );
  writeFileSync(out, JSON.stringify(calculate(SAMPLE)) + "\n");
  // Keep the file in the repository's format.
  const format = spawnSync(
    "bun",
    ["x", "oxfmt", "--disable-nested-config", out],
    { stdio: "inherit" },
  );
  if (format.status !== 0) throw new Error("oxfmt failed");
  console.log(`Wrote ${out}`);
}
