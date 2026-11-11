import { describe, expect, it } from "vitest";
import { validateFields } from "../src/fields";
import { placeholdersIn, samePlaceholders } from "../src/placeholders";
import { testCatalog } from "./fixtures";

const ok = (collection: string, key: string, fields: unknown) =>
  validateFields(testCatalog, collection, key, fields);

describe("validateFields", () => {
  it("accepts a named reference entry", () => {
    expect(
      ok("body", "SUN", {
        name: "Sun",
        insight: "The Sun symbolizes identity.",
        keywords: ["identity", "purpose"],
      }),
    ).toEqual({
      ok: true,
      fields: {
        name: "Sun",
        insight: "The Sun symbolizes identity.",
        keywords: ["identity", "purpose"],
      },
    });
  });

  it("accepts a reference entry without name and a text entry", () => {
    expect(
      ok("house", "1", { insight: "Presence.", keywords: ["presence"] }).ok,
    ).toBe(true);
    expect(ok("ui", "landing.title", { text: "Explore\nyour chart." }).ok).toBe(
      true,
    );
  });

  it("rejects unknown collections and keys", () => {
    expect(ok("planet", "SUN", { text: "x" })).toMatchObject({
      ok: false,
      code: "unknown_entry",
    });
    expect(ok("body", "PLUTO", { text: "x" })).toMatchObject({
      ok: false,
      code: "unknown_entry",
    });
  });

  it.each([
    ["missing field", { name: "Sun", keywords: ["a"] }],
    ["unknown field", { name: "Sun", insight: "x", keywords: ["a"], extra: 1 }],
    ["empty name", { name: "", insight: "x", keywords: ["a"] }],
    ["padded name", { name: " Sun", insight: "x", keywords: ["a"] }],
    ["blank insight", { name: "Sun", insight: "   ", keywords: ["a"] }],
    ["no keywords", { name: "Sun", insight: "x", keywords: [] }],
    [
      "too many keywords",
      { name: "Sun", insight: "x", keywords: Array(9).fill("a") },
    ],
    ["empty keyword", { name: "Sun", insight: "x", keywords: [""] }],
    ["long keyword", { name: "Sun", insight: "x", keywords: ["k".repeat(51)] }],
    ["long name", { name: "n".repeat(101), insight: "x", keywords: ["a"] }],
    [
      "long insight",
      { name: "Sun", insight: "i".repeat(2001), keywords: ["a"] },
    ],
    ["not an object", "Sun"],
  ])("rejects %s", (_label, fields) => {
    expect(ok("body", "SUN", fields)).toMatchObject({
      ok: false,
      code: "validation_failed",
      issues: expect.any(Array),
    });
  });

  it("rejects text that changes the declared placeholders", () => {
    expect(
      ok("ui", "app.previous", { text: "From {date} in {place}." }).ok,
    ).toBe(true);
    expect(ok("ui", "app.previous", { text: "From {date}." })).toMatchObject({
      ok: false,
      code: "placeholder_mismatch",
      expected: ["date", "place"],
      actual: ["date"],
    });
    expect(ok("ui", "landing.title", { text: "Hi {name}" })).toMatchObject({
      ok: false,
      code: "placeholder_mismatch",
    });
  });
});

describe("placeholders", () => {
  it("extracts unique names in order of appearance", () => {
    expect(placeholdersIn("{b} and {a} then {b}; not { c } or {1x}")).toEqual([
      "b",
      "a",
    ]);
  });
  it("compares as sets", () => {
    expect(samePlaceholders(["a", "b"], ["b", "a"])).toBe(true);
    expect(samePlaceholders(["a"], ["a", "b"])).toBe(false);
  });
});
