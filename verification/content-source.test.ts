import { beforeEach, describe, expect, test } from "bun:test";
import { createContentSource } from "../src/lib/server/cms/source";

const bundle = (locale: string, version: number) => ({
  locale,
  default: "en",
  chain: locale === "en" ? ["en"] : [locale, "en"],
  version,
  entries: { ui: { "brand.name": { text: `${locale} v${version}` } } },
  fallbacks: {},
});
const index = {
  default: "en",
  version: 1,
  locales: [
    { code: "en", name: "English", chain: ["en"] },
    { code: "es-ES", name: "Español", chain: ["es-ES", "es-419", "en"] },
    { code: "es-419", name: "Latam", chain: ["es-419", "en"] },
  ],
};

type Reply = Response | Error | "hang";
let clock = 0;
let replies: Reply[] = [];
let requests: { path: string; etag: string | null }[] = [];
let logs: Record<string, unknown>[] = [];
let snapshots: Record<string, unknown> = {};

const json = (body: unknown, etag: string) =>
  new Response(JSON.stringify(body), { status: 200, headers: { etag } });
const source = () =>
  createContentSource({
    fetchCms: (path, init) => {
      requests.push({
        path,
        etag: new Headers(init?.headers).get("if-none-match"),
      });
      const reply = replies.shift() ?? new Error("no reply queued");
      if (reply === "hang")
        return new Promise((_, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        );
      return reply instanceof Error
        ? Promise.reject(reply)
        : Promise.resolve(reply);
    },
    readSnapshot: async (file) => snapshots[file] ?? null,
    now: () => clock,
    log: (event) => logs.push(event),
    freshMs: 60_000,
    timeoutMs: 20,
  });

beforeEach(() => {
  clock = 0;
  replies = [];
  requests = [];
  logs = [];
  snapshots = { "index.json": index, "en.json": bundle("en", 1) };
});

describe("bundle", () => {
  test("fetches live once, then serves the fresh cache", async () => {
    const cms = source();
    replies = [json(bundle("en", 5), '"v5"')];
    expect((await cms.bundle("en")).version).toBe(5);
    clock = 59_999;
    expect((await cms.bundle("en")).version).toBe(5);
    expect(requests).toEqual([{ path: "/v1/content/en", etag: null }]);
    expect(logs).toEqual([]);
  });

  test("revalidates with If-None-Match after the fresh window", async () => {
    const cms = source();
    replies = [
      json(bundle("en", 5), '"v5"'),
      new Response(null, { status: 304 }),
    ];
    await cms.bundle("en");
    clock = 60_000;
    expect((await cms.bundle("en")).version).toBe(5);
    expect(requests[1]).toEqual({ path: "/v1/content/en", etag: '"v5"' });
    clock = 100_000;
    await cms.bundle("en");
    expect(requests).toHaveLength(2);
  });

  test("replaces the cache when the content changed", async () => {
    const cms = source();
    replies = [json(bundle("en", 5), '"v5"'), json(bundle("en", 6), '"v6"')];
    await cms.bundle("en");
    clock = 60_000;
    expect((await cms.bundle("en")).version).toBe(6);
  });

  test("serves the stale cache when the CMS fails, then backs off", async () => {
    const cms = source();
    replies = [
      json(bundle("en", 5), '"v5"'),
      new Response("down", { status: 500 }),
    ];
    await cms.bundle("en");
    clock = 500_000;
    expect((await cms.bundle("en")).version).toBe(5);
    expect(logs).toEqual([
      expect.objectContaining({
        event: "cms_fallback",
        source: "stale",
        locale: "en",
      }),
    ]);
    clock = 559_999;
    await cms.bundle("en");
    expect(requests).toHaveLength(2);
  });

  test("serves the snapshot when the CMS is unreachable and nothing is cached", async () => {
    const cms = source();
    replies = [new Error("network")];
    expect((await cms.bundle("en")).version).toBe(1);
    expect(logs).toEqual([
      expect.objectContaining({
        event: "cms_fallback",
        source: "snapshot",
        locale: "en",
      }),
    ]);
  });

  test("times out a hanging CMS", async () => {
    const cms = source();
    replies = ["hang"];
    expect((await cms.bundle("en")).version).toBe(1);
  });

  test("walks the snapshot chain for a locale without its own file", async () => {
    snapshots["es-419.json"] = bundle("es-419", 1);
    const cms = source();
    replies = [new Error("network")];
    expect((await cms.bundle("es-ES")).locale).toBe("es-419");
    replies = [new Error("network")];
    expect((await cms.bundle("fr")).locale).toBe("en");
  });

  test("throws when neither the CMS nor a snapshot is available", async () => {
    snapshots = {};
    const cms = source();
    replies = [new Error("network")];
    await expect(cms.bundle("en")).rejects.toThrow(/unavailable/i);
  });

  test("falls back to the default locale when a locale disappeared", async () => {
    const cms = source();
    replies = [
      new Response(
        JSON.stringify({ error: { code: "locale_not_found", message: "x" } }),
        { status: 404 },
      ),
      json(bundle("en", 7), '"v7"'),
    ];
    expect((await cms.bundle("es-ES")).locale).toBe("en");
    expect(requests.map((r) => r.path)).toEqual([
      "/v1/content/es-ES",
      "/v1/content/en",
    ]);
  });
});

describe("locales", () => {
  test("fetches live with the same caching", async () => {
    const cms = source();
    const live = { default: "en", locales: [index.locales[0]] };
    replies = [json(live, '"v3"')];
    expect(await cms.locales()).toEqual(live);
    await cms.locales();
    expect(requests).toEqual([{ path: "/v1/locales", etag: null }]);
  });

  test("falls back to the snapshot index", async () => {
    const cms = source();
    replies = [new Error("network")];
    expect((await cms.locales()).locales).toHaveLength(3);
    expect(logs[0]).toMatchObject({ source: "snapshot", locale: null });
  });
});
