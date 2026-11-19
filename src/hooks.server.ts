import { dev } from "$app/environment";
import type { Handle } from "@sveltejs/kit";
import { defaultCode, locales } from "$lib/server/content";
import { chooseLocale } from "$lib/server/content/locale";

const YEAR = 60 * 60 * 24 * 365;

/** Negotiates the page locale. */
export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api/")) return resolve(event);
  const { locale, persist } = chooseLocale({
    query: event.url.searchParams.get("lang"),
    cookie: event.cookies.get("lang"),
    acceptLanguage: event.request.headers.get("accept-language"),
    enabled: locales.map((entry) => entry.code),
    defaultCode,
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
