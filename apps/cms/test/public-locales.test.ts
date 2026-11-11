import { beforeEach, describe, expect, it } from "vitest";
import { addLocale, call, resetDb, setVersion } from "./helpers";

beforeEach(resetDb);

describe("GET /v1/locales", () => {
  it("lists the default locale", async () => {
    const response = await call("/v1/locales");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      default: "en",
      locales: [{ code: "en", name: "English", chain: ["en"] }],
    });
  });

  it("lists enabled locales only, default first, with effective chains", async () => {
    await addLocale("es-419", { name: "Español (Latinoamérica)" });
    await addLocale("es-ES", { name: "Español (España)", fallback: "es-419" });
    await addLocale("fr", { name: "Français", enabled: false });
    const body = await (await call("/v1/locales")).json();
    expect(body).toEqual({
      default: "en",
      locales: [
        { code: "en", name: "English", chain: ["en"] },
        {
          code: "es-419",
          name: "Español (Latinoamérica)",
          chain: ["es-419", "en"],
        },
        {
          code: "es-ES",
          name: "Español (España)",
          chain: ["es-ES", "es-419", "en"],
        },
      ],
    });
  });

  it("is cacheable and revalidates by content version", async () => {
    await setVersion(7);
    const response = await call("/v1/locales");
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, stale-while-revalidate=600",
    );
    expect(response.headers.get("etag")).toBe('"v7"');

    const revalidated = await call("/v1/locales", {
      headers: { "if-none-match": '"v7"' },
    });
    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get("etag")).toBe('"v7"');

    const stale = await call("/v1/locales", {
      headers: { "if-none-match": '"v6"' },
    });
    expect(stale.status).toBe(200);
  });
});
