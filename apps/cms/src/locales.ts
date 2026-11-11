/**
 * Locale rules shared by the CMS and the website. Dependency-free on purpose:
 * the website imports this module (see docs/designs/cms.md §5.1, §7.3).
 */
export type LocaleRow = {
  code: string;
  name: string;
  enabled: boolean;
  isDefault: boolean;
  fallback: string | null;
};

const MAX_TAG_LENGTH = 35;

/** Canonical BCP 47 tag (e.g. `es-mx` → `es-MX`), or null if invalid. */
export const canonicalLocale = (tag: string): string | null => {
  if (!tag || tag.length > MAX_TAG_LENGTH || !/^[A-Za-z0-9-]+$/.test(tag))
    return null;
  try {
    const [canonical] = Intl.getCanonicalLocales(tag);
    if (!canonical) return null;
    // ISO 639 two- or three-letter languages only (BCP 47 also allows 5–8).
    return /^[a-z]{2,3}$/.test(new Intl.Locale(canonical).language)
      ? canonical
      : null;
  } catch {
    return null;
  }
};

export const languageOf = (code: string) => new Intl.Locale(code).language;

const byCode = (locales: LocaleRow[]) =>
  new Map(locales.map((locale) => [locale.code, locale]));

const defaultCode = (locales: LocaleRow[]) => {
  const found = locales.find((locale) => locale.isDefault);
  if (!found) throw new Error("No default locale");
  return found.code;
};

/**
 * Locales consulted for `code`, in order: the locale itself, then its fallback
 * pointers (skipping disabled locales, stopping on cycles), then the default.
 */
export const effectiveChain = (code: string, locales: LocaleRow[]) => {
  const index = byCode(locales);
  const chain = [code];
  const seen = new Set(chain);
  let next = index.get(code)?.fallback ?? null;
  while (next && !seen.has(next)) {
    seen.add(next);
    const locale = index.get(next);
    if (!locale) break;
    if (locale.enabled) chain.push(next);
    next = locale.fallback;
  }
  const fallbackDefault = defaultCode(locales);
  if (!chain.includes(fallbackDefault)) chain.push(fallbackDefault);
  return chain;
};

/** Base language if present, else the alphabetically first sibling, else null. */
export const defaultFallbackFor = (code: string, locales: LocaleRow[]) => {
  const language = languageOf(code);
  const others = locales.filter(
    (locale) => locale.code !== code && !locale.isDefault,
  );
  if (others.some((locale) => locale.code === language) && code !== language)
    return language;
  const siblings = others
    .filter((locale) => languageOf(locale.code) === language)
    .map((locale) => locale.code)
    .sort();
  return siblings[0] ?? null;
};

/** Whether pointing `code` at `fallback` would create a loop. */
export const wouldCycle = (
  code: string,
  fallback: string | null,
  locales: LocaleRow[],
) => {
  const index = byCode(locales);
  const seen = new Set<string>();
  let next = fallback;
  while (next && !seen.has(next)) {
    if (next === code) return true;
    seen.add(next);
    next = index.get(next)?.fallback ?? null;
  }
  return false;
};

/** Language tags from an Accept-Language header, best first. */
export const parseAcceptLanguage = (header: string) =>
  header
    .split(",")
    .map((part, position) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim().match(/^q=([01](?:\.\d{0,3})?)$/))
        .find(Boolean);
      return { tag: tag.trim(), q: q ? Number(q[1]) : 1, position };
    })
    .filter(({ tag, q }) => tag && tag !== "*" && q > 0 && canonicalLocale(tag))
    .sort((a, b) => b.q - a.q || a.position - b.position)
    .map(({ tag }) => tag);

/**
 * First enabled locale matching a requested tag: exact, then base language,
 * then a sibling sharing the language (alphabetical). Falls back to default.
 */
export const negotiate = (
  requested: string[],
  enabled: string[],
  fallbackDefault: string,
) => {
  const available = [...enabled].sort();
  for (const tag of requested) {
    const canonical = canonicalLocale(tag);
    if (!canonical) continue;
    if (available.includes(canonical)) return canonical;
    const language = languageOf(canonical);
    if (available.includes(language)) return language;
    const sibling = available.find((code) => languageOf(code) === language);
    if (sibling) return sibling;
  }
  return fallbackDefault;
};
