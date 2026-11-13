import type { Bundle } from "../../copy/copy";

import type { LocalesIndex } from "@astrologyengine/cms-contract/types";
export type {
  LocaleSummary,
  LocalesIndex,
} from "@astrologyengine/cms-contract/types";

type Entry<T> = { value: T; etag: string | null; checkedAt: number };

const notFound = (path: string) =>
  Object.assign(new Error(path), { name: "CmsNotFound" });
const isNotFound = (error: unknown) =>
  error instanceof Error && error.name === "CmsNotFound";

/**
 * Copy source for the website (docs/designs/cms.md §9.4–9.5). Per key, in
 * order: fresh isolate cache → live CMS (revalidated with If-None-Match) →
 * stale cache → bundled snapshot. After a failure the fallback is reused for
 * `freshMs` before the CMS is tried again, so an outage does not make every
 * request wait for the timeout.
 */
export const createContentSource = ({
  fetchCms,
  readSnapshot,
  now = Date.now,
  log = (event) => console.warn(event),
  freshMs = 60_000,
  timeoutMs = 2_000,
}: {
  fetchCms: (path: string, init?: RequestInit) => Promise<Response>;
  readSnapshot: (file: string) => Promise<unknown | null>;
  now?: () => number;
  log?: (event: Record<string, unknown>) => void;
  freshMs?: number;
  timeoutMs?: number;
}) => {
  const cache = new Map<string, Entry<unknown>>();

  const live = async <T>(path: string, cached?: Entry<T>) => {
    const response = await fetchCms(path, {
      headers: cached?.etag ? { "if-none-match": cached.etag } : {},
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 304 && cached) {
      cached.checkedAt = now();
      return cached.value;
    }
    if (response.status === 404) throw notFound(path);
    if (!response.ok) throw new Error(`CMS answered ${response.status}`);
    const value = (await response.json()) as T;
    cache.set(path, {
      value,
      etag: response.headers.get("etag"),
      checkedAt: now(),
    });
    return value;
  };

  const load = async <T>(
    path: string,
    locale: string | null,
    snapshot: () => Promise<T | null>,
  ): Promise<T> => {
    const cached = cache.get(path) as Entry<T> | undefined;
    if (cached && now() - cached.checkedAt < freshMs) return cached.value;
    try {
      return await live(path, cached);
    } catch (error) {
      if (isNotFound(error)) throw error;
      const reason = String(error);
      if (cached) {
        cached.checkedAt = now();
        log({ event: "cms_fallback", source: "stale", locale, reason });
        return cached.value;
      }
      const value = await snapshot();
      if (value === null)
        throw new Error(`CMS copy unavailable for ${locale ?? "locales"}`, {
          cause: error,
        });
      cache.set(path, { value, etag: null, checkedAt: now() });
      log({ event: "cms_fallback", source: "snapshot", locale, reason });
      return value;
    }
  };

  const snapshotIndex = () =>
    readSnapshot("index.json") as Promise<
      (LocalesIndex & { version: number }) | null
    >;

  const locales = () => load<LocalesIndex>("/v1/locales", null, snapshotIndex);

  const snapshotBundle = async (locale: string) => {
    const index = await snapshotIndex();
    const chain = index?.locales.find((entry) => entry.code === locale)
      ?.chain ?? [locale];
    for (const code of [...chain, index?.default ?? "en"]) {
      const found = (await readSnapshot(`${code}.json`)) as Bundle | null;
      if (found) return found;
    }
    return null;
  };

  const bundle = async (locale: string): Promise<Bundle> => {
    try {
      return await load<Bundle>(`/v1/content/${locale}`, locale, () =>
        snapshotBundle(locale),
      );
    } catch (error) {
      if (!isNotFound(error)) throw error;
      // The locale was disabled or removed since the locale list was cached.
      const known = cache.get("/v1/locales")?.value as LocalesIndex | undefined;
      const fallback =
        known?.default ?? (await snapshotIndex())?.default ?? "en";
      if (fallback === locale) throw error;
      return bundle(fallback);
    }
  };

  return { locales, bundle };
};

export type ContentSource = ReturnType<typeof createContentSource>;
