import { describe, expect, it } from "vitest";
import {
  canonicalLocale,
  defaultFallbackFor,
  effectiveChain,
  negotiate,
  parseAcceptLanguage,
  wouldCycle,
  type LocaleRow,
} from "../src/locales";

const row = (
  code: string,
  extra: Partial<Omit<LocaleRow, "code">> = {},
): LocaleRow => ({
  code,
  name: code,
  enabled: true,
  isDefault: false,
  fallback: null,
  ...extra,
});
const en = row("en", { isDefault: true });

describe("canonicalLocale", () => {
  it.each([
    ["en", "en"],
    ["ES", "es"],
    ["es-mx", "es-MX"],
    ["es-419", "es-419"],
    ["zh-hant-tw", "zh-Hant-TW"],
  ])("canonicalises %s to %s", (input, output) => {
    expect(canonicalLocale(input)).toBe(output);
  });

  it.each(["", "*", "e", "english", "en_US", "en-", "x".repeat(40)])(
    "rejects %j",
    (input) => {
      expect(canonicalLocale(input)).toBeNull();
    },
  );
});

describe("effectiveChain", () => {
  it("is just the default for the default locale", () => {
    expect(effectiveChain("en", [en])).toEqual(["en"]);
  });

  it("follows fallback pointers and ends at the default", () => {
    const locales = [en, row("es-419"), row("es-ES", { fallback: "es-419" })];
    expect(effectiveChain("es-ES", locales)).toEqual(["es-ES", "es-419", "en"]);
  });

  it("goes straight to the default without a fallback", () => {
    expect(effectiveChain("fr", [en, row("fr")])).toEqual(["fr", "en"]);
  });

  it("skips disabled hops but keeps the requested locale", () => {
    const locales = [
      en,
      row("es", { enabled: false }),
      row("es-419", { fallback: "es" }),
      row("es-MX", { fallback: "es-419", enabled: false }),
    ];
    expect(effectiveChain("es-MX", locales)).toEqual(["es-MX", "es-419", "en"]);
  });

  it("terminates on cycles", () => {
    const locales = [
      en,
      row("a", { fallback: "b" }),
      row("b", { fallback: "a" }),
    ];
    expect(effectiveChain("a", locales)).toEqual(["a", "b", "en"]);
  });
});

describe("defaultFallbackFor", () => {
  it("prefers the base language", () => {
    expect(defaultFallbackFor("es-MX", [en, row("es"), row("es-419")])).toBe(
      "es",
    );
  });

  it("uses the alphabetically first sibling without a base language", () => {
    expect(defaultFallbackFor("es-ES", [en, row("es-MX"), row("es-419")])).toBe(
      "es-419",
    );
  });

  it("is null without relatives", () => {
    expect(defaultFallbackFor("fr", [en, row("es")])).toBeNull();
    expect(defaultFallbackFor("es", [en, row("es")])).toBeNull();
  });

  it("uses a regional variant for a base language", () => {
    expect(defaultFallbackFor("es", [en, row("es-419")])).toBe("es-419");
  });
});

describe("wouldCycle", () => {
  const locales = [en, row("a", { fallback: "b" }), row("b"), row("c")];
  it("detects a pointer back to the start", () => {
    expect(wouldCycle("b", "a", locales)).toBe(true);
    expect(wouldCycle("a", "a", locales)).toBe(true);
  });
  it("accepts acyclic pointers", () => {
    expect(wouldCycle("c", "a", locales)).toBe(false);
    expect(wouldCycle("b", null, locales)).toBe(false);
  });
});

describe("parseAcceptLanguage", () => {
  it("orders by quality, keeps ties stable and drops q=0 and *", () => {
    expect(
      parseAcceptLanguage("fr;q=0.5, es-ES, de;q=0, *;q=0.1, en-GB;q=0.9"),
    ).toEqual(["es-ES", "en-GB", "fr"]);
  });
  it("ignores malformed input", () => {
    expect(parseAcceptLanguage("")).toEqual([]);
    expect(parseAcceptLanguage(";;;, ,q=1")).toEqual([]);
  });
});

describe("negotiate", () => {
  const enabled = ["en", "es-419", "pt"];
  it.each([
    [["es-419"], "es-419"],
    [["ES-419"], "es-419"],
    [["es-ES"], "es-419"],
    [["es"], "es-419"],
    [["pt-BR"], "pt"],
    [["de", "pt"], "pt"],
    [["de"], "en"],
    [[], "en"],
  ])("%j → %s", (requested, expected) => {
    expect(negotiate(requested, enabled, "en")).toBe(expected);
  });
});
