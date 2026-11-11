/**
 * Seed SQL for the default-locale copy (docs/designs/cms.md §8). Inserts only
 * missing rows, so running it on every deploy never overwrites CMS edits; bumps
 * the content version only when this run inserted something.
 */
export type SeedFile = {
  locale: string;
  entries: Record<string, Record<string, Record<string, unknown>>>;
};

const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

/** One statement per line (JSON escapes newlines inside values). */
export const seedSql = (seed: SeedFile, timestamp: string) => {
  const lines: string[] = [];
  for (const [collection, entries] of Object.entries(seed.entries))
    for (const [key, fields] of Object.entries(entries))
      lines.push(
        `INSERT INTO translations (collection, key, locale, fields, revision, updated_at) VALUES (${[
          collection,
          key,
          seed.locale,
          JSON.stringify(fields),
        ]
          .map(literal)
          .join(
            ", ",
          )}, 1, ${literal(timestamp)}) ON CONFLICT (collection, key, locale) DO NOTHING;`,
      );
  lines.push(
    `UPDATE meta SET value = value + 1 WHERE key = 'content_version' AND EXISTS (SELECT 1 FROM translations WHERE updated_at = ${literal(timestamp)});`,
  );
  return `${lines.join("\n")}\n`;
};
