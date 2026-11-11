/**
 * Apply the English seed (inserts missing rows only; never overwrites edits).
 *
 *   bun scripts/seed.ts --local [--persist-to DIR]
 *   bun scripts/seed.ts --env staging|alpha
 *   bun scripts/seed.ts --local --file extra.json   (additional seed file)
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { seedSql, type SeedFile } from "../src/seed";

const { values } = parseArgs({
  options: {
    local: { type: "boolean", default: false },
    env: { type: "string" },
    "persist-to": { type: "string" },
    file: { type: "string", default: "seed/en.json" },
  },
});
if (values.local === !!values.env)
  throw new Error("Pass exactly one of --local or --env <staging|alpha>.");

export const applySql = (
  sql: string,
  target: { local: boolean; env?: string; persistTo?: string },
) => {
  const dir = mkdtempSync(join(tmpdir(), "cms-seed-"));
  const file = join(dir, "seed.sql");
  writeFileSync(file, sql);
  try {
    const args = [
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--file",
      file,
      "--yes",
      ...(target.local
        ? [
            "--local",
            ...(target.persistTo ? ["--persist-to", target.persistTo] : []),
          ]
        : ["--remote", "--env", target.env!]),
    ];
    const result = Bun.spawnSync(["bunx", ...args], {
      stdout: "inherit",
      stderr: "inherit",
    });
    if (result.exitCode !== 0)
      throw new Error(`wrangler exited ${result.exitCode}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  const seed = JSON.parse(readFileSync(values.file!, "utf8")) as SeedFile;
  applySql(seedSql(seed, new Date().toISOString()), {
    local: values.local!,
    env: values.env,
    persistTo: values["persist-to"],
  });
  console.log(
    `Seeded ${values.file} (${seed.locale}); existing rows untouched.`,
  );
}
