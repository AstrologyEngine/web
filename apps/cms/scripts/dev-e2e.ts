/**
 * Fresh, seeded local CMS for browser tests:
 *   bun scripts/dev-e2e.ts [--port 8787] [--fixture path/to/fixture.json]
 *
 * A fixture adds locales and translations on top of the English seed:
 *   { "locales": [{ "code": "en-XA", "name": "…", "enabled": true, "fallback": null }],
 *     "seeds": [{ "locale": "en-XA", "entries": { … } }] }
 */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { seedSql, type SeedFile } from "../src/seed";

const { values } = parseArgs({
  options: {
    port: { type: "string", default: "8787" },
    fixture: { type: "string" },
  },
});
const persistTo = `.wrangler/e2e-${values.port}`;
const run = (args: string[]) => {
  const result = Bun.spawnSync(["bunx", "wrangler", ...args], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) throw new Error(`wrangler ${args[0]} failed`);
};
const execute = (sql: string) => {
  const file = `${persistTo}.sql`;
  writeFileSync(file, sql);
  run([
    "d1",
    "execute",
    "DB",
    "--local",
    "--persist-to",
    persistTo,
    "--file",
    file,
    "--yes",
  ]);
  rmSync(file, { force: true });
};
const literal = (value: string | null) =>
  value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;

rmSync(persistTo, { recursive: true, force: true });
run(["d1", "migrations", "apply", "DB", "--local", "--persist-to", persistTo]);
execute(
  seedSql(
    JSON.parse(readFileSync("seed/en.json", "utf8")) as SeedFile,
    new Date().toISOString(),
  ),
);
if (values.fixture) {
  const fixture = JSON.parse(readFileSync(values.fixture, "utf8")) as {
    locales: {
      code: string;
      name: string;
      enabled: boolean;
      fallback?: string | null;
    }[];
    seeds: SeedFile[];
  };
  const now = new Date().toISOString();
  execute(
    fixture.locales
      .map(
        (locale) =>
          `INSERT INTO locales (code, name, enabled, is_default, fallback, created_at, updated_at) VALUES (${literal(locale.code)}, ${literal(locale.name)}, ${locale.enabled ? 1 : 0}, 0, ${literal(locale.fallback ?? null)}, '${now}', '${now}');`,
      )
      .join("\n") + "\n",
  );
  for (const seed of fixture.seeds)
    execute(seedSql(seed, `${now}-${seed.locale}`));
}
const dev = Bun.spawn(
  [
    "bunx",
    "wrangler",
    "dev",
    "--ip",
    "127.0.0.1",
    "--port",
    values.port!,
    "--inspector-port",
    String(Number(values.port) + 10_000),
    "--show-interactive-dev-session=false",
    "--persist-to",
    persistTo,
  ],
  { stdout: "inherit", stderr: "inherit" },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => dev.kill(signal));
process.exit(await dev.exited);
