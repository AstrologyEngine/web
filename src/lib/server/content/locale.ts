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

const NO_MATCH = "";

/** The enabled locale matching `tag` (exact, base, sibling), or null. */
const match = (tag: string | null | undefined, enabled: string[]) => {
  if (!tag) return null;
  const found = negotiate([tag], enabled, NO_MATCH);
  return found === NO_MATCH ? null : found;
};

/**
 * Locale for a request: `?lang` (persisted in a
 * cookie) → cookie → Accept-Language → default.
 */
export const chooseLocale = ({
  query,
  cookie,
  acceptLanguage,
  enabled,
  defaultCode,
}: {
  query: string | null;
  cookie?: string;
  acceptLanguage: string | null;
  enabled: string[];
  defaultCode: string;
}) => {
  const fromQuery = match(query, enabled);
  if (fromQuery) return { locale: fromQuery, persist: true };
  const fromCookie = match(cookie, enabled);
  if (fromCookie) return { locale: fromCookie, persist: false };
  return {
    locale: negotiate(
      parseAcceptLanguage(acceptLanguage ?? ""),
      enabled,
      defaultCode,
    ),
    persist: false,
  };
};
