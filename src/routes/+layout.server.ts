import { bundle, locales } from "$lib/server/content";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, url }) => {
  // Re-run when the requested language changes.
  url.searchParams.get("lang");
  return { locale: locals.locale, locales, content: bundle(locals.locale) };
};
