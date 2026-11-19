import { dev } from "$app/environment";
import type { Bundle, ContentEntries } from "../../copy/copy";
import { english } from "../../copy/content/english";

const defaultCode = "en";
const pseudo =
  dev && import.meta.env.MODE === "e2e-i18n"
    ? (await import("../../../../tests/fixtures/pseudo-locale.json")).default
    : null;

export const locales = [
  { code: defaultCode, name: "English" },
  ...(pseudo ? [{ code: pseudo.code, name: pseudo.name }] : []),
];
export { defaultCode };

export const resolveEntries = (
  base: ContentEntries,
  translated: ContentEntries,
): ContentEntries => ({
  ui: { ...base.ui, ...translated.ui },
  body: { ...base.body, ...translated.body },
  angle: { ...base.angle, ...translated.angle },
  sign: { ...base.sign, ...translated.sign },
  aspect: { ...base.aspect, ...translated.aspect },
  house: { ...base.house, ...translated.house },
});

const pseudoEntries = pseudo ? resolveEntries(english, pseudo.entries) : null;
export const bundle = (locale: string): Bundle =>
  pseudo && pseudoEntries && locale === pseudo.code
    ? { locale, entries: pseudoEntries }
    : { locale: defaultCode, entries: english };
