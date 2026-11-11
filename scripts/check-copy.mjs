// Fails when Svelte markup contains hardcoded copy: text nodes with letters or
// literal aria-label/placeholder/title/alt/label attributes. All user-facing
// copy comes from the CMS (docs/designs/cms.md). Symbols and numbers are fine.
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "svelte/compiler";

const COPY_ATTRIBUTES = new Set([
  "aria-label",
  "placeholder",
  "title",
  "alt",
  "label",
]);
const LETTER = /\p{L}/u;

const lineOf = (source, offset) => source.slice(0, offset).split("\n").length;

export const findHardcodedCopy = (source, file) => {
  const ast = parse(source, { modern: true });
  const findings = [];
  const report = (node, text) =>
    findings.push({ file, line: lineOf(source, node.start), text });
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === "Text" && LETTER.test(node.data))
      report(node, node.data.trim().replace(/\s+/g, " "));
    // Attribute values are not text nodes; only copy attributes are checked.
    for (const attribute of node.attributes ?? [])
      if (
        attribute.type === "Attribute" &&
        COPY_ATTRIBUTES.has(attribute.name.toLowerCase()) &&
        Array.isArray(attribute.value)
      )
        for (const part of attribute.value)
          if (part.type === "Text" && LETTER.test(part.data))
            report(part, `${attribute.name}=${part.data}`);
    for (const [key, value] of Object.entries(node))
      if (
        ![
          "attributes",
          "instance",
          "module",
          "css",
          "parent",
          "metadata",
        ].includes(key)
      )
        visit(value);
  };
  visit(ast.fragment);
  return findings;
};

const svelteFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return svelteFiles(path);
      return entry.name.endsWith(".svelte") ? [path] : [];
    }),
  );
  return files.flat();
};

export const checkFiles = async (dir) => {
  const findings = [];
  for (const file of await svelteFiles(dir))
    findings.push(...findHardcodedCopy(await readFile(file, "utf8"), file));
  return findings;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const findings = await checkFiles("src");
  for (const { file, line, text } of findings)
    console.error(`${relative(".", file)}:${line}: hardcoded copy: ${text}`);
  if (findings.length) {
    console.error(
      `${findings.length} hardcoded string(s). Add them to the CMS catalog and use t().`,
    );
    process.exit(1);
  }
  console.log("No hardcoded copy in Svelte markup.");
}
