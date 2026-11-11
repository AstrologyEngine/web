import { negotiate, parseAcceptLanguage } from "$cms/locales";

const NO_MATCH = "";

/** The enabled locale matching `tag` (exact, base, sibling), or null. */
const match = (tag: string | null | undefined, enabled: string[]) => {
  if (!tag) return null;
  const found = negotiate([tag], enabled, NO_MATCH);
  return found === NO_MATCH ? null : found;
};

/**
 * Locale for a request (docs/designs/cms.md §9.2): `?lang` (persisted in a
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
