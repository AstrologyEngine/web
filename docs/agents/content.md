# Edit website copy

1. Search the visible text or its key with `rg -n -F 'text' src/lib/copy/content/en`.
   UI files under `ui/` follow the first part of the key, such as `landing` or
   `settings`. Chart descriptions, names, and keywords are in `reference/`.
2. Edit the value in JSON. Keep its existing key, placeholders such as `{date}`,
   and intentional line breaks (`\n`). For new UI text, add a key to the
   relevant feature file and use `t()` where it appears. Add placeholder
   names to the signature in `src/lib/copy/content/placeholders.ts` when a
   new key takes values.
3. Run `bun run check:content`. Run `bun run dev` and open the affected view.
   For a homepage edit use `/`. For chart reference copy open `/app`,
   enter birth details, and select the chart item. Include the affected view
   in the PR so reviewers can verify the copy on the deployed preview.

English provides the default copy. A translation supplies complete entries
for the keys it translates. Missing entries display in English.
