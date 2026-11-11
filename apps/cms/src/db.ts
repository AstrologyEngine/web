import type { LocaleRow } from "./locales";

export const contentVersion = async (db: D1Database) => {
  const row = await db
    .prepare("SELECT value FROM meta WHERE key = 'content_version'")
    .first<{ value: number }>();
  if (!row) throw new Error("content_version missing; migrations not applied");
  return row.value;
};

type LocaleRecord = {
  code: string;
  name: string;
  enabled: number;
  is_default: number;
  fallback: string | null;
  created_at: string;
  updated_at: string;
};

export type Locale = LocaleRow & { createdAt: string; updatedAt: string };

const toLocale = (row: LocaleRecord): Locale => ({
  code: row.code,
  name: row.name,
  enabled: row.enabled === 1,
  isDefault: row.is_default === 1,
  fallback: row.fallback,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** All locales, default first, then by code. */
export const listLocales = async (db: D1Database) => {
  const { results } = await db
    .prepare("SELECT * FROM locales ORDER BY is_default DESC, code")
    .all<LocaleRecord>();
  return results.map(toLocale);
};

export type TranslationRecord = {
  collection: string;
  key: string;
  locale: string;
  fields: string;
  revision: number;
  updated_at: string;
};

/** Every stored translation for the given locales. */
export const translationsIn = async (db: D1Database, locales: string[]) => {
  if (!locales.length) return [];
  const { results } = await db
    .prepare(
      `SELECT * FROM translations WHERE locale IN (${locales.map(() => "?").join(", ")})`,
    )
    .bind(...locales)
    .all<TranslationRecord>();
  return results;
};

/** Translations of one entry for the given locales. */
export const entryTranslations = async (
  db: D1Database,
  collection: string,
  key: string,
  locales?: string[],
) => {
  const filter = locales?.length
    ? ` AND locale IN (${locales.map(() => "?").join(", ")})`
    : "";
  const { results } = await db
    .prepare(
      `SELECT * FROM translations WHERE collection = ? AND key = ?${filter} ORDER BY locale`,
    )
    .bind(collection, key, ...(locales ?? []))
    .all<TranslationRecord>();
  return results;
};

export const allTranslations = async (db: D1Database) =>
  (
    await db
      .prepare("SELECT * FROM translations ORDER BY collection, key, locale")
      .all<TranslationRecord>()
  ).results;
