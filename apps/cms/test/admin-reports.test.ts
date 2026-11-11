import { beforeEach, describe, expect, it } from "vitest";
import { addLocale, addTranslation, admin, resetDb } from "./helpers";
import { sun, testCatalog } from "./fixtures";

beforeEach(resetDb);

describe("GET /v1/admin/catalog", () => {
  it("returns the catalog", async () => {
    expect(await (await admin("/v1/admin/catalog")).json()).toEqual({
      collections: testCatalog,
    });
  });
});

describe("GET /v1/admin/coverage", () => {
  beforeEach(async () => {
    // Catalog: body SUN/MOON/MARS, house 1/2, ui landing.title/app.previous (7).
    for (const key of ["SUN", "MOON", "MARS"])
      await addTranslation("body", key, "en", sun);
    for (const key of ["1", "2"])
      await addTranslation("house", key, "en", {
        insight: "x",
        keywords: ["x"],
      });
    await addTranslation("ui", "landing.title", "en", { text: "Hi" });
    await addTranslation("ui", "app.previous", "en", {
      text: "{date} in {place}",
    });
    await addLocale("es-419", { enabled: false });
    await addLocale("es-ES", { fallback: "es-419" });
    await addTranslation("body", "SUN", "es-419", sun);
    await addTranslation("body", "MOON", "es-ES", sun);
    await addTranslation("ui", "app.previous", "es-ES", { text: "{date}" });
    await addTranslation("body", "PLUTO", "es-ES", sun);
  });

  it("reports per-locale completeness, fallbacks, mismatches and orphans", async () => {
    const response = await admin("/v1/admin/coverage");
    expect(response.status).toBe(200);
    const report = await response.json<{
      total: number;
      locales: Record<string, unknown>[];
      orphans: unknown[];
    }>();
    expect(report.total).toBe(7);
    expect(report.locales).toEqual([
      {
        code: "en",
        enabled: true,
        chain: ["en"],
        translated: 7,
        missing: [],
        fallbacks: {},
        placeholderMismatches: [],
        complete: true,
      },
      {
        code: "es-419",
        enabled: false,
        chain: ["es-419", "en"],
        translated: 1,
        missing: [
          "body:MARS",
          "body:MOON",
          "house:1",
          "house:2",
          "ui:app.previous",
          "ui:landing.title",
        ],
        fallbacks: {
          "body:MARS": "en",
          "body:MOON": "en",
          "house:1": "en",
          "house:2": "en",
          "ui:app.previous": "en",
          "ui:landing.title": "en",
        },
        placeholderMismatches: [],
        complete: false,
      },
      {
        code: "es-ES",
        enabled: true,
        // es-419 is disabled, so it is skipped.
        chain: ["es-ES", "en"],
        translated: 2,
        missing: [
          "body:MARS",
          "body:SUN",
          "house:1",
          "house:2",
          "ui:landing.title",
        ],
        fallbacks: {
          "body:MARS": "en",
          "body:SUN": "en",
          "house:1": "en",
          "house:2": "en",
          "ui:landing.title": "en",
        },
        placeholderMismatches: ["ui:app.previous"],
        complete: false,
      },
    ]);
    expect(report.orphans).toEqual([
      { collection: "body", key: "PLUTO", locale: "es-ES" },
    ]);
  });
});

describe("GET /v1/admin/revisions", () => {
  const write = (key: string, locale: string, insight: string, actor = "a") =>
    admin(`/v1/admin/entries/body/${key}/translations/${locale}`, {
      method: "PUT",
      json: { ...sun, insight },
      headers: { "x-cms-actor": actor },
    });

  beforeEach(async () => {
    await addLocale("fr");
    await write("SUN", "en", "one");
    await write("SUN", "en", "two", "amy");
    await write("MOON", "en", "three");
    await write("SUN", "fr", "four");
  });

  it("lists newest first with parsed snapshots", async () => {
    const { revisions, next } = await (
      await admin("/v1/admin/revisions")
    ).json<{ revisions: Record<string, unknown>[]; next: number | null }>();
    expect(
      revisions.map((r) => (r.after as { insight: string }).insight),
    ).toEqual(["four", "three", "two", "one"]);
    expect(revisions[2]).toEqual({
      id: expect.any(Number),
      subject: "translation",
      action: "update",
      collection: "body",
      key: "SUN",
      locale: "en",
      before: { ...sun, insight: "one" },
      after: { ...sun, insight: "two" },
      actor: "amy",
      createdAt: expect.any(String),
    });
    expect(next).toBeNull();
  });

  it("filters by collection, key and locale", async () => {
    const { revisions } = await (
      await admin("/v1/admin/revisions?collection=body&key=SUN&locale=en")
    ).json<{ revisions: { after: { insight: string } }[] }>();
    expect(revisions.map((r) => r.after.insight)).toEqual(["two", "one"]);
  });

  it("paginates with limit and before", async () => {
    const first = await (
      await admin("/v1/admin/revisions?limit=3")
    ).json<{ revisions: { id: number }[]; next: number | null }>();
    expect(first.revisions).toHaveLength(3);
    expect(first.next).toBe(first.revisions[2]!.id);
    const second = await (
      await admin(`/v1/admin/revisions?limit=3&before=${first.next}`)
    ).json<{ revisions: { id: number }[]; next: number | null }>();
    expect(second.revisions).toHaveLength(1);
    expect(second.next).toBeNull();
  });

  it.each(["limit=0", "limit=201", "limit=x", "before=-1", "before=x"])(
    "rejects %s",
    async (query) => {
      const response = await admin(`/v1/admin/revisions?${query}`);
      expect(response.status).toBe(422);
    },
  );
});
