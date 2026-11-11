import type { Catalog } from "./catalog-schema";
import { resolveEntry } from "./content";
import type { Locale, TranslationRecord } from "./db";
import { isCatalogEntry } from "./fields";
import { effectiveChain } from "./locales";
import { placeholdersIn, samePlaceholders } from "./placeholders";

/** Coverage of the catalog per locale, plus orphaned translations. */
export const coverageReport = (
  catalog: Catalog,
  locales: Locale[],
  rows: TranslationRecord[],
) => {
  const ids = Object.entries(catalog)
    .flatMap(([collection, definition]) =>
      Object.keys(definition.keys).map((key) => `${collection}:${key}`),
    )
    .sort();
  const byEntry = new Map<string, TranslationRecord[]>();
  for (const row of rows) {
    const id = `${row.collection}:${row.key}`;
    byEntry.set(id, [...(byEntry.get(id) ?? []), row]);
  }
  const mismatched = (row: TranslationRecord) => {
    const definition = catalog[row.collection];
    if (definition?.shape !== "text") return false;
    const { text } = JSON.parse(row.fields) as { text: string };
    return !samePlaceholders(definition.keys[row.key]!, placeholdersIn(text));
  };

  return {
    default: locales.find((locale) => locale.isDefault)!.code,
    total: ids.length,
    locales: locales.map((locale) => {
      const chain = effectiveChain(locale.code, locales);
      const missing: string[] = [];
      const fallbacks: Record<string, string | null> = {};
      const placeholderMismatches: string[] = [];
      for (const id of ids) {
        const entryRows = byEntry.get(id) ?? [];
        const own = entryRows.find((row) => row.locale === locale.code);
        if (own) {
          if (mismatched(own)) placeholderMismatches.push(id);
          continue;
        }
        missing.push(id);
        fallbacks[id] = resolveEntry(chain, entryRows)?.locale ?? null;
      }
      return {
        code: locale.code,
        enabled: locale.enabled,
        chain,
        translated: ids.length - missing.length,
        missing,
        fallbacks,
        placeholderMismatches,
        complete: !missing.length && !placeholderMismatches.length,
      };
    }),
    orphans: rows
      .filter((row) => !isCatalogEntry(catalog, row.collection, row.key))
      .map(({ collection, key, locale }) => ({ collection, key, locale }))
      .sort((a, b) =>
        `${a.collection}:${a.key}:${a.locale}`.localeCompare(
          `${b.collection}:${b.key}:${b.locale}`,
        ),
      ),
  };
};
