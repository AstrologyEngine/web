import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { seedSql, type SeedFile } from "../src/seed";
import { addTranslation, resetDb, version } from "./helpers";
import { sun } from "./fixtures";

beforeEach(resetDb);

const seed: SeedFile = {
  locale: "en",
  entries: {
    body: { SUN: sun, MOON: { ...sun, name: 'Moon\'s "light"' } },
    ui: { "landing.title": { text: "Explore your\nbirth chart." } },
  },
};

const run = (sql: string) =>
  env.DB.batch(
    sql
      .split("\n")
      .filter(Boolean)
      .map((line) => env.DB.prepare(line)),
  );
const fields = async (collection: string, key: string) =>
  JSON.parse(
    (await env.DB.prepare(
      "SELECT fields FROM translations WHERE collection = ? AND key = ? AND locale = 'en'",
    )
      .bind(collection, key)
      .first<{ fields: string }>())!.fields,
  );

describe("seedSql", () => {
  it("emits one statement per line", () => {
    const sql = seedSql(seed, "2026-11-10T00:00:00.000Z");
    const lines = sql.trim().split("\n");
    expect(lines).toHaveLength(4);
    expect(lines.every((line) => line.endsWith(";"))).toBe(true);
  });

  it("inserts every entry, preserving quotes and newlines", async () => {
    await run(seedSql(seed, "2026-11-10T00:00:00.000Z"));
    expect(await fields("body", "SUN")).toEqual(sun);
    expect((await fields("body", "MOON")).name).toBe('Moon\'s "light"');
    expect((await fields("ui", "landing.title")).text).toBe(
      "Explore your\nbirth chart.",
    );
    expect(await version()).toBe(2);
  });

  it("never overwrites existing rows and is idempotent", async () => {
    const edited = { ...sun, insight: "Edited in the CMS." };
    await addTranslation("body", "SUN", "en", edited);
    await run(seedSql(seed, "2026-11-10T00:00:00.000Z"));
    expect(await fields("body", "SUN")).toEqual(edited);
    expect(await version()).toBe(2);
    await run(seedSql(seed, "2026-11-10T00:00:01.000Z"));
    expect(await version()).toBe(2);
  });
});
