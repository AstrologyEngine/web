import { contentSource } from "$lib/server/cms";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, platform, url }) => {
  // Re-run when ?lang changes (the hook negotiates from it).
  url.searchParams.get("lang");
  const source = contentSource({ platform, origin: url.origin });
  const [locales, content] = await Promise.all([
    source.locales(),
    source.bundle(locals.locale),
  ]);
  return {
    locale: locals.locale,
    locales: locales.locales.map(({ code, name }) => ({ code, name })),
    content,
  };
};
