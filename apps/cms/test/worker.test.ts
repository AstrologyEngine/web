import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { catalog } from "../src/catalog";
import { seedSql, type SeedFile } from "../src/seed";
import seedJson from "../seed/en.json";

// Wiring check of the deployed entry point (real catalog + seed).
describe("worker entry", () => {
  it("serves every catalog entry in English after seeding", async () => {
    const sql = seedSql(seedJson as SeedFile, "2026-11-10T00:00:00.000Z");
    await env.DB.batch(
      sql
        .split("\n")
        .filter(Boolean)
        .map((line) => env.DB.prepare(line)),
    );
    const response = await exports.default.fetch(
      "https://cms.test/v1/content/en",
    );
    expect(response.status).toBe(200);
    const bundle = await response.json<{
      entries: Record<string, Record<string, unknown>>;
      fallbacks: Record<string, string>;
    }>();
    for (const [collection, definition] of Object.entries(catalog))
      expect(Object.keys(bundle.entries[collection]!).sort()).toEqual(
        Object.keys(definition.keys).sort(),
      );
    expect(bundle.fallbacks).toEqual({});
  });
});
