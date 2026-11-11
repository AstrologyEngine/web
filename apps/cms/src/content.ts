import type { Catalog } from "./catalog-schema";
import type { TranslationRecord } from "./db";

type Fields = Record<string, unknown>;

/** Pick, for one entry, the first translation along the chain. */
export const resolveEntry = (
  chain: string[],
  rows: Pick<TranslationRecord, "locale" | "fields">[],
) => {
  for (const locale of chain) {
    const row = rows.find((candidate) => candidate.locale === locale);
    if (row) return { locale, fields: JSON.parse(row.fields) as Fields };
  }
  return null;
};

/** Bundle of all catalog entries resolved along `chain`. */
export const buildEntries = (
  catalog: Catalog,
  chain: string[],
  rows: TranslationRecord[],
) => {
  const byEntry = new Map<string, TranslationRecord[]>();
  for (const row of rows) {
    const id = `${row.collection}:${row.key}`;
    byEntry.set(id, [...(byEntry.get(id) ?? []), row]);
  }
  const entries: Record<string, Record<string, Fields>> = {};
  const fallbacks: Record<string, string> = {};
  for (const [collection, definition] of Object.entries(catalog)) {
    entries[collection] = {};
    for (const key of Object.keys(definition.keys)) {
      const id = `${collection}:${key}`;
      const resolved = resolveEntry(chain, byEntry.get(id) ?? []);
      if (!resolved) continue;
      entries[collection][key] = resolved.fields;
      if (resolved.locale !== chain[0]) fallbacks[id] = resolved.locale;
    }
  }
  return { entries, fallbacks };
};
