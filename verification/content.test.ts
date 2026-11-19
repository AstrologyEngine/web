import { expect, test } from "bun:test";
import { english } from "../src/lib/copy/content/english";
import { placeholders } from "../src/lib/copy/content/placeholders";
import { angleIds, aspectTypes, bodyIds, signIds } from "../src/lib/identities";
import pseudo from "../tests/fixtures/pseudo-locale.json";

const signature = (text: string) =>
  [
    ...new Set(
      Array.from(
        text.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g),
        ([, name]) => name,
      ),
    ),
  ].sort();

test("English UI files contain unique keys for their feature and valid placeholders", async () => {
  const ui = new Map<string, string>();
  const root = new URL("../src/lib/copy/content/en/ui/", import.meta.url)
    .pathname;
  for await (const file of new Bun.Glob("*.json").scan(root)) {
    const values = (await Bun.file(root + file).json()) as Record<
      string,
      string
    >;
    for (const [key, value] of Object.entries(values)) {
      expect(key.split(".")[0] + ".json", key).toBe(file);
      expect(ui.has(key), key).toBe(false);
      expect(typeof value, key).toBe("string");
      expect(value.trim(), key).not.toBe("");
      expect(signature(value), key).toEqual(
        [
          ...(Object.entries(placeholders).find(
            ([entry]) => entry === key,
          )?.[1] ?? []),
        ].sort(),
      );
      ui.set(key, value);
    }
  }
  expect(Object.fromEntries(ui)).toEqual(english.ui);
});

const verifyReference = (key: string, entry: unknown, named: boolean) => {
  expect(entry, key).toBeObject();
  const fields = entry as Record<string, unknown>;
  expect(Object.keys(fields).sort(), key).toEqual(
    named ? ["insight", "keywords", "name"] : ["insight", "keywords"],
  );
  expect(typeof fields.insight, key).toBe("string");
  expect((fields.insight as string).trim(), key).not.toBe("");
  if (named) {
    expect(typeof fields.name, key).toBe("string");
    expect((fields.name as string).trim(), key).not.toBe("");
  }
  expect(Array.isArray(fields.keywords), key).toBe(true);
  const keywords = fields.keywords as unknown[];
  expect(keywords.length, key).toBeGreaterThan(0);
  for (const keyword of keywords) {
    expect(typeof keyword, key).toBe("string");
    expect((keyword as string).trim(), key).not.toBe("");
  }
};

test("English defines each chart reference with the expected fields", () => {
  const collections = {
    body: bodyIds,
    angle: angleIds,
    sign: signIds,
    aspect: aspectTypes,
    house: Array.from({ length: 12 }, (_, index) => String(index + 1)),
  };
  for (const key of Object.keys(collections) as (keyof typeof collections)[]) {
    expect(Object.keys(english[key]).sort(), key).toEqual(
      [...collections[key]].sort(),
    );
    for (const [id, entry] of Object.entries(english[key]))
      verifyReference(`${key}:${id}`, entry, key !== "house");
  }
});

test("the pseudo-locale translates known entries with matching fields and placeholders", () => {
  const ui = new Map(Object.entries(english.ui));
  for (const [key, value] of Object.entries(pseudo.entries.ui)) {
    const original = ui.get(key);
    expect(original, key).toBeDefined();
    expect(value.trim(), key).not.toBe("");
    expect(signature(value), key).toEqual(signature(original!));
  }
  for (const [key, entry] of Object.entries(pseudo.entries.body)) {
    expect(Object.hasOwn(english.body, key), key).toBe(true);
    verifyReference(key, entry, true);
  }
});
