// Bundled outage copy (docs/designs/cms.md §9.5): one JSON file per enabled
// locale plus index.json in static/content/.
//
//   CMS_SNAPSHOT_ORIGIN=https://cms-staging.astrologyengine.dev node scripts/cms-snapshot.mjs
//     fetches every enabled locale; any failure fails the build.
//   node scripts/cms-snapshot.mjs
//     without an origin (local dev, tests): English from the CMS seed.
import { createRequire } from "node:module";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const getJson = async (fetch, url) => {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`CMS snapshot: ${url} answered ${response.status}`);
  return response.json();
};

const fromOrigin = async (origin, fetch) => {
  const locales = await getJson(fetch, new URL("/v1/locales", origin));
  const bundles = [];
  for (const { code } of locales.locales)
    bundles.push(await getJson(fetch, new URL(`/v1/content/${code}`, origin)));
  return {
    index: {
      default: locales.default,
      version: Math.max(...bundles.map((bundle) => bundle.version)),
      locales: locales.locales,
    },
    bundles,
  };
};

const fromSeed = async (seedPath) => {
  const seed = JSON.parse(await readFile(seedPath, "utf8"));
  const chain = [seed.locale];
  return {
    index: {
      default: seed.locale,
      version: 0,
      locales: [{ code: seed.locale, name: "English", chain }],
    },
    bundles: [
      {
        locale: seed.locale,
        default: seed.locale,
        chain,
        version: 0,
        entries: seed.entries,
        fallbacks: {},
      },
    ],
  };
};

export const writeSnapshot = async ({
  origin,
  seedPath,
  outDir,
  fetch = globalThis.fetch,
}) => {
  const { index, bundles } = origin
    ? await fromOrigin(origin, fetch)
    : await fromSeed(seedPath);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.json"), JSON.stringify(index));
  for (const bundle of bundles)
    await writeFile(
      join(outDir, `${bundle.locale}.json`),
      JSON.stringify(bundle),
    );
  return { source: origin ?? seedPath, locales: bundles.map((b) => b.locale) };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const result = await writeSnapshot({
    origin: process.env.CMS_SNAPSHOT_ORIGIN || undefined,
    seedPath: createRequire(import.meta.url).resolve(
      "@astrologyengine/cms-contract/seed/en.json",
    ),
    outDir: join(root, "static/content"),
  });
  console.log(
    `CMS snapshot: ${result.locales.join(", ")} from ${result.source}`,
  );
}
