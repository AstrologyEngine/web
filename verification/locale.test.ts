import { describe, expect, test } from "bun:test";
import { chooseLocale } from "../src/lib/server/cms/locale";

const enabled = ["en", "es-419", "pt"];
const choose = (input: {
  query?: string | null;
  cookie?: string;
  acceptLanguage?: string | null;
}) =>
  chooseLocale({
    query: null,
    acceptLanguage: null,
    ...input,
    enabled,
    defaultCode: "en",
  });

describe("chooseLocale", () => {
  test("uses ?lang when it matches and asks to persist it", () => {
    expect(choose({ query: "pt", cookie: "es-419" })).toEqual({
      locale: "pt",
      persist: true,
    });
    expect(choose({ query: "es-ES" })).toEqual({
      locale: "es-419",
      persist: true,
    });
  });

  test("ignores an unmatched ?lang", () => {
    expect(choose({ query: "de", cookie: "pt" })).toEqual({
      locale: "pt",
      persist: false,
    });
  });

  test("uses the cookie when it still matches", () => {
    expect(choose({ cookie: "es-419", acceptLanguage: "pt" })).toEqual({
      locale: "es-419",
      persist: false,
    });
    expect(choose({ cookie: "fr", acceptLanguage: "pt" }).locale).toBe("pt");
  });

  test("negotiates Accept-Language by quality with sibling matching", () => {
    expect(choose({ acceptLanguage: "fr;q=0.9, es-ES;q=0.8" }).locale).toBe(
      "es-419",
    );
    expect(choose({ acceptLanguage: "pt-BR, en;q=0.5" }).locale).toBe("pt");
  });

  test("falls back to the default", () => {
    expect(choose({})).toEqual({ locale: "en", persist: false });
    expect(choose({ acceptLanguage: "de, fr" }).locale).toBe("en");
    expect(choose({ query: "", cookie: "" }).locale).toBe("en");
  });
});
