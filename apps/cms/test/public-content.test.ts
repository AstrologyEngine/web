import { beforeEach, describe, expect, it } from "vitest";
import {
  addLocale,
  addTranslation,
  call,
  resetDb,
  setVersion,
} from "./helpers";
import { sun } from "./fixtures";

beforeEach(resetDb);

const title = { text: "Explore your chart." };

describe("GET /v1/content/:locale", () => {
  it("returns every catalog collection with the translated entries", async () => {
    await addTranslation("body", "SUN", "en", sun);
    await addTranslation("ui", "landing.title", "en", title);
    const response = await call("/v1/content/en");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      locale: "en",
      default: "en",
      chain: ["en"],
      version: 1,
      entries: {
        body: { SUN: sun },
        house: {},
        ui: { "landing.title": title },
      },
      fallbacks: {},
    });
  });

  it("resolves each entry along the chain and reports fallbacks", async () => {
    await addLocale("es-419");
    await addLocale("es-ES", { fallback: "es-419" });
    await addTranslation("body", "SUN", "en", sun);
    await addTranslation("body", "MOON", "en", { ...sun, name: "Moon" });
    await addTranslation("body", "MARS", "en", { ...sun, name: "Mars" });
    await addTranslation("body", "SUN", "es-419", { ...sun, name: "Sol" });
    await addTranslation("body", "MOON", "es-ES", { ...sun, name: "Luna" });

    const body = await (
      await call("/v1/content/es-ES")
    ).json<{
      chain: string[];
      entries: { body: Record<string, { name: string }> };
      fallbacks: Record<string, string>;
    }>();
    expect(body.chain).toEqual(["es-ES", "es-419", "en"]);
    expect(body.entries.body.SUN?.name).toBe("Sol");
    expect(body.entries.body.MOON?.name).toBe("Luna");
    expect(body.entries.body.MARS?.name).toBe("Mars");
    expect(body.fallbacks).toEqual({ "body:SUN": "es-419", "body:MARS": "en" });
  });

  it("accepts non-canonical casing", async () => {
    await addLocale("es-419");
    const body = await (
      await call("/v1/content/ES-419")
    ).json<{
      locale: string;
    }>();
    expect(body.locale).toBe("es-419");
  });

  it("excludes orphaned translations", async () => {
    await addTranslation("body", "PLUTO", "en", { ...sun, name: "Pluto" });
    await addTranslation("planet", "SUN", "en", sun);
    const body = await (
      await call("/v1/content/en")
    ).json<{
      entries: Record<string, Record<string, unknown>>;
    }>();
    expect(body.entries.body).toEqual({});
    expect(body.entries).not.toHaveProperty("planet");
  });

  it.each([
    ["disabled", "fr"],
    ["unknown", "de"],
    ["invalid", "not_a_locale"],
  ])("answers 404 locale_not_found for a %s locale", async (_label, code) => {
    await addLocale("fr", { enabled: false });
    const response = await call(`/v1/content/${code}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "locale_not_found" },
    });
  });

  it("is cacheable and revalidates by content version", async () => {
    await setVersion(12);
    const response = await call("/v1/content/en");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=600",
    );
    expect(response.headers.get("etag")).toBe('"v12"');
    expect((await response.json<{ version: number }>()).version).toBe(12);
    const revalidated = await call("/v1/content/en", {
      headers: { "if-none-match": 'W/"v12"' },
    });
    expect(revalidated.status).toBe(304);
  });
});

describe("GET /v1/content/:locale/:collection/:key", () => {
  beforeEach(async () => {
    await addLocale("es-419");
    await addTranslation("body", "SUN", "en", sun);
    await addTranslation("body", "MOON", "es-419", { ...sun, name: "Luna" });
  });

  it("returns one entry, flagging fallback", async () => {
    expect(await (await call("/v1/content/es-419/body/SUN")).json()).toEqual({
      collection: "body",
      key: "SUN",
      locale: "en",
      fallback: true,
      fields: sun,
    });
    expect(
      await (await call("/v1/content/es-419/body/MOON")).json(),
    ).toMatchObject({ locale: "es-419", fallback: false });
  });

  it("is cacheable", async () => {
    const response = await call("/v1/content/en/body/SUN");
    expect(response.headers.get("etag")).toBe('"v1"');
  });

  it("answers 404 unknown_entry outside the catalog", async () => {
    const response = await call("/v1/content/en/body/PLUTO");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "unknown_entry" },
    });
  });

  it("answers 404 not_found for an untranslated catalog entry", async () => {
    const response = await call("/v1/content/en/body/MARS");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "not_found" },
    });
  });

  it("answers 404 locale_not_found for unavailable locales", async () => {
    const response = await call("/v1/content/fr/body/SUN");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "locale_not_found" },
    });
  });
});

describe("error responses", () => {
  it("are never cacheable", async () => {
    for (const path of [
      "/v1/content/en/body/MARS",
      "/v1/content/en/body/PLUTO",
      "/v1/content/fr",
    ]) {
      const response = await call(path);
      expect(response.status, path).toBe(404);
      expect(response.headers.get("cache-control"), path).toBe("no-store");
      expect(response.headers.get("etag"), path).toBeNull();
    }
  });
});
