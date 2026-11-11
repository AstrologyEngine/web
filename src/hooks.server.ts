import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { contentSource } from "$lib/server/cms";
import { chooseLocale } from "$lib/server/cms/locale";

const YEAR = 60 * 60 * 24 * 365;

/** Negotiates the page locale (docs/designs/cms.md §9.2). */
export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api/")) return resolve(event);
  const locales = await contentSource({
    platform: event.platform,
    origin: event.url.origin,
  }).locales();
  const { locale, persist } = chooseLocale({
    query: event.url.searchParams.get("lang"),
    cookie: event.cookies.get("lang"),
    acceptLanguage: event.request.headers.get("accept-language"),
    enabled: locales.locales.map((entry) => entry.code),
    defaultCode: locales.default,
  });
  if (persist)
    event.cookies.set("lang", locale, {
      path: "/",
      maxAge: YEAR,
      sameSite: "lax",
      secure: !dev,
      httpOnly: true,
    });
  event.locals.locale = locale;
  const response = await resolve(event, {
    transformPageChunk: ({ html }) => html.replace("%lang%", locale),
  });
  response.headers.append("Vary", "Cookie, Accept-Language");
  return response;
};
