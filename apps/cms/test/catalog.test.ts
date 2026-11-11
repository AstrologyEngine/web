import { describe, expect, it } from "vitest";
import { catalog } from "../src/catalog";
import { validateFields } from "../src/fields";
import type { SeedFile } from "../src/seed";
import seedJson from "../seed/en.json";

const seed = seedJson as SeedFile;
const ids = (entries: Record<string, Record<string, unknown>>) =>
  Object.entries(entries)
    .flatMap(([collection, keys]) =>
      Object.keys(keys).map((key) => `${collection}:${key}`),
    )
    .sort();

describe("catalog", () => {
  it("uses valid keys and placeholder names", () => {
    for (const [collection, definition] of Object.entries(catalog)) {
      expect(collection).toMatch(/^[a-z]+$/);
      for (const [key, placeholders] of Object.entries(definition.keys)) {
        expect(key).toMatch(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);
        if (definition.shape !== "text") expect(placeholders).toEqual([]);
        for (const name of placeholders)
          expect(name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
      }
    }
  });

  it("names ui keys <area>.<element>[.<variant>] in lower camel case", () => {
    for (const key of Object.keys(catalog.ui.keys))
      expect(key).toMatch(/^[a-z][A-Za-z0-9]*(\.[a-z0-9][A-Za-z0-9]*){1,4}$/);
  });
});

describe("seed/en.json", () => {
  it("is English", () => {
    expect(seed.locale).toBe("en");
  });

  it("covers exactly the catalog", () => {
    const catalogIds = ids(
      Object.fromEntries(
        Object.entries(catalog).map(([name, def]) => [name, def.keys]),
      ),
    );
    expect(ids(seed.entries)).toEqual(catalogIds);
  });

  it("passes field and placeholder validation", () => {
    for (const [collection, entries] of Object.entries(seed.entries))
      for (const [key, fields] of Object.entries(entries)) {
        const result = validateFields(catalog, collection, key, fields);
        expect(result, `${collection}:${key}`).toMatchObject({ ok: true });
      }
  });
});
