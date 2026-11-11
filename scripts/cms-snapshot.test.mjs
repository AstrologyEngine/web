import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { writeSnapshot } from "./cms-snapshot.mjs";

const read = async (dir, file) =>
  JSON.parse(await readFile(join(dir, file), "utf8"));
const temp = () => mkdtemp(join(tmpdir(), "cms-snapshot-"));

const seed = {
  locale: "en",
  entries: { ui: { "brand.name": { text: "Astrology Engine" } }, body: {} },
};

test("builds an English snapshot from the CMS seed without an origin", async () => {
  const dir = await temp();
  const seedPath = join(dir, "seed.json");
  await writeFile(seedPath, JSON.stringify(seed));
  const out = join(dir, "content");
  await writeSnapshot({ seedPath, outDir: out });
  assert.deepEqual(await read(out, "index.json"), {
    default: "en",
    version: 0,
    locales: [{ code: "en", name: "English", chain: ["en"] }],
  });
  assert.deepEqual(await read(out, "en.json"), {
    locale: "en",
    default: "en",
    chain: ["en"],
    version: 0,
    entries: seed.entries,
    fallbacks: {},
  });
});

const bundle = (locale, version) => ({
  locale,
  default: "en",
  chain: [locale],
  version,
  entries: {},
  fallbacks: {},
});

test("fetches every enabled locale from the origin and replaces stale files", async () => {
  const out = join(await temp(), "content");
  await mkdir(out);
  await writeFile(join(out, "fr.json"), "{}");
  const requested = [];
  const fetch = async (url) => {
    requested.push(String(url));
    const path = new URL(url).pathname;
    const body =
      path === "/v1/locales"
        ? {
            default: "en",
            locales: [
              { code: "en", name: "English", chain: ["en"] },
              { code: "es", name: "Español", chain: ["es", "en"] },
            ],
          }
        : bundle(path.split("/").at(-1), path.endsWith("/es") ? 9 : 8);
    return new Response(JSON.stringify(body), { status: 200 });
  };
  await writeSnapshot({ origin: "https://cms.test", outDir: out, fetch });
  assert.deepEqual(requested, [
    "https://cms.test/v1/locales",
    "https://cms.test/v1/content/en",
    "https://cms.test/v1/content/es",
  ]);
  assert.deepEqual((await readdir(out)).sort(), [
    "en.json",
    "es.json",
    "index.json",
  ]);
  assert.equal((await read(out, "index.json")).version, 9);
  assert.equal((await read(out, "es.json")).locale, "es");
});

test("fails when the origin cannot provide a locale", async () => {
  const out = join(await temp(), "content");
  const fetch = async (url) =>
    new URL(url).pathname === "/v1/locales"
      ? new Response(
          JSON.stringify({
            default: "en",
            locales: [{ code: "en", name: "English", chain: ["en"] }],
          }),
        )
      : new Response("down", { status: 503 });
  await assert.rejects(
    writeSnapshot({ origin: "https://cms.test", outDir: out, fetch }),
    /503/,
  );
});

test("fails when the origin is unreachable", async () => {
  const out = join(await temp(), "content");
  const fetch = async () => {
    throw new Error("getaddrinfo ENOTFOUND");
  };
  await assert.rejects(
    writeSnapshot({ origin: "https://cms.test", outDir: out, fetch }),
    /ENOTFOUND/,
  );
});
