import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_TOKEN,
  addLocale,
  addTranslation,
  admin,
  call,
  localeRow,
  resetDb,
  revisions,
  version,
} from "./helpers";
import { sun } from "./fixtures";

beforeEach(resetDb);
afterEach(() => vi.restoreAllMocks());

const post = (json: unknown, headers: Record<string, string> = {}) =>
  admin("/v1/admin/locales", { method: "POST", json, headers });
const patch = (code: string, json: unknown) =>
  admin(`/v1/admin/locales/${code}`, { method: "PATCH", json });
const remove = (code: string) =>
  admin(`/v1/admin/locales/${code}`, { method: "DELETE" });

describe("GET /v1/admin/locales", () => {
  it("lists all locales including disabled ones", async () => {
    await addLocale("fr", { enabled: false, name: "Français" });
    const response = await admin("/v1/admin/locales");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      default: "en",
      locales: [
        expect.objectContaining({
          code: "en",
          name: "English",
          enabled: true,
          isDefault: true,
          fallback: null,
          chain: ["en"],
        }),
        expect.objectContaining({
          code: "fr",
          name: "Français",
          enabled: false,
          isDefault: false,
          fallback: null,
          chain: ["fr", "en"],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      ],
    });
  });
});

describe("POST /v1/admin/locales", () => {
  it("creates a disabled, canonicalised locale", async () => {
    const response = await post({ code: "es-mx", name: "Español (México)" });
    expect(response.status).toBe(201);
    expect(response.headers.get("location")).toBe("/v1/admin/locales/es-MX");
    expect(await response.json()).toMatchObject({
      code: "es-MX",
      name: "Español (México)",
      enabled: false,
      isDefault: false,
      fallback: null,
      chain: ["es-MX", "en"],
    });
    expect(await localeRow("es-MX")).toMatchObject({ enabled: 0 });
  });

  it("defaults the fallback to the base language, then a sibling", async () => {
    await addLocale("es-419");
    await post({ code: "es-ES", name: "Español (España)" });
    expect((await localeRow("es-ES"))?.fallback).toBe("es-419");
    await post({ code: "es", name: "Español", enabled: true });
    await post({ code: "es-MX", name: "Español (México)" });
    expect((await localeRow("es-MX"))?.fallback).toBe("es");
  });

  it("honours an explicit fallback, including null", async () => {
    await addLocale("es-419");
    await post({ code: "es-ES", name: "España", fallback: null });
    expect((await localeRow("es-ES"))?.fallback).toBeNull();
    await post({ code: "pt", name: "Português", fallback: "ES-419" });
    expect((await localeRow("pt"))?.fallback).toBe("es-419");
  });

  it("records a revision, bumps the version and logs the write", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await post({ code: "fr", name: "Français" }, { "x-cms-actor": "amy" });
    expect(await version()).toBe(2);
    const [revision] = await revisions();
    expect(revision).toMatchObject({
      subject: "locale",
      action: "create",
      locale: "fr",
      before: null,
      actor: "amy",
    });
    expect(JSON.parse(revision!.after!)).toMatchObject({
      code: "fr",
      name: "Français",
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "cms_write",
        subject: "locale",
        action: "create",
        locale: "fr",
        actor: "amy",
        version: 2,
      }),
    );
  });

  it.each([
    ["an invalid code", { code: "english", name: "x" }],
    ["a missing name", { code: "fr" }],
    ["a blank name", { code: "fr", name: " " }],
    ["an unknown fallback", { code: "fr", name: "x", fallback: "de" }],
    ["itself as fallback", { code: "fr", name: "x", fallback: "fr" }],
    ["unknown fields", { code: "fr", name: "x", isDefault: true }],
  ])("rejects %s with 422", async (_label, json) => {
    const response = await post(json);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: "validation_failed" },
    });
    expect(await version()).toBe(1);
  });

  it("rejects duplicates with 409", async () => {
    const response = await post({ code: "EN", name: "English again" });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "conflict" },
    });
  });
});

describe("PATCH /v1/admin/locales/:code", () => {
  beforeEach(async () => {
    await addLocale("es-419");
    await addLocale("es-ES", { fallback: "es-419", enabled: false });
  });

  it("updates name, enabled and fallback with a before/after revision", async () => {
    const response = await patch("es-es", {
      name: "Español de España",
      enabled: true,
      fallback: null,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      code: "es-ES",
      name: "Español de España",
      enabled: true,
      fallback: null,
      chain: ["es-ES", "en"],
    });
    const [revision] = await revisions();
    expect(revision).toMatchObject({ subject: "locale", action: "update" });
    expect(JSON.parse(revision!.before!)).toMatchObject({ enabled: false });
    expect(JSON.parse(revision!.after!)).toMatchObject({ enabled: true });
    expect(await version()).toBe(2);
  });

  it("rejects fallback cycles", async () => {
    const response = await patch("es-419", { fallback: "es-ES" });
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({
      error: { code: "fallback_cycle" },
    });
  });

  it("protects the default locale", async () => {
    for (const json of [{ enabled: false }, { fallback: "es-419" }]) {
      const response = await patch("en", json);
      expect(response.status, JSON.stringify(json)).toBe(409);
    }
    expect((await patch("en", { name: "English (US)" })).status).toBe(200);
  });

  it.each([
    ["an empty body", {}],
    ["a bad type", { enabled: "yes" }],
    ["an unknown fallback", { fallback: "de" }],
  ])("rejects %s with 422", async (_label, json) => {
    expect((await patch("es-ES", json)).status).toBe(422);
  });

  it("answers 404 for unknown locales", async () => {
    const response = await patch("de", { name: "Deutsch" });
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      error: { code: "locale_not_found" },
    });
  });
});

describe("DELETE /v1/admin/locales/:code", () => {
  beforeEach(async () => {
    await addLocale("es-419");
    await addLocale("es-ES", { fallback: "es-419" });
    await addTranslation("body", "SUN", "es-419", { ...sun, name: "Sol" });
  });

  it("deletes the locale and its translations and nulls pointers", async () => {
    const response = await remove("es-419");
    expect(response.status).toBe(204);
    expect(await localeRow("es-419")).toBeNull();
    expect((await localeRow("es-ES"))?.fallback).toBeNull();
    const left = await env.DB.prepare(
      "SELECT count(*) AS n FROM translations WHERE locale = 'es-419'",
    ).first<{ n: number }>();
    expect(left?.n).toBe(0);
    const [revision] = await revisions();
    expect(revision).toMatchObject({
      subject: "locale",
      action: "delete",
      after: null,
    });
    expect(JSON.parse(revision!.before!)).toMatchObject({
      code: "es-419",
      translations: [
        { collection: "body", key: "SUN", fields: { name: "Sol" } },
      ],
    });
    expect(await version()).toBe(2);
  });

  it("refuses to delete the default locale", async () => {
    expect((await remove("en")).status).toBe(409);
  });

  it("answers 404 for unknown locales", async () => {
    expect((await remove("de")).status).toBe(404);
  });
});

describe("admin write plumbing", () => {
  it("requires a JSON body", async () => {
    const response = await call("/v1/admin/locales", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ADMIN_TOKEN}`,
        "content-type": "text/plain",
      },
      body: '{"code":"fr","name":"x"}',
    });
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({
      error: { code: "unsupported_media_type" },
    });
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await call("/v1/admin/locales", {
      method: "POST",
      headers: {
        authorization: `Bearer ${ADMIN_TOKEN}`,
        "content-type": "application/json",
      },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "bad_request" },
    });
  });

  it("rejects bodies over 64 KB with 413", async () => {
    const response = await post({ code: "fr", name: "x".repeat(70_000) });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { code: "payload_too_large" },
    });
  });

  it.each(["", " ", "a".repeat(65), "bad\u0007actor"])(
    "rejects actor %j with 422",
    async (actor) => {
      const response = await post(
        { code: "fr", name: "Français" },
        { "x-cms-actor": actor },
      );
      expect(response.status).toBe(422);
    },
  );

  it("defaults the actor to admin", async () => {
    await post({ code: "fr", name: "Français" });
    expect((await revisions())[0]?.actor).toBe("admin");
  });
});
