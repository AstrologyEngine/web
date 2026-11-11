import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./app";

const allowedOrigins = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

/**
 * Allow-list CORS for public routes. Admin routes get no CORS headers, so
 * browsers cannot call them cross-origin (docs/designs/cms.md §7.5).
 */
export const cors: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.path.startsWith("/v1/admin/")) return next();
  const origin = c.req.header("origin");
  const allowed =
    !!origin && allowedOrigins(c.env.CMS_ALLOWED_ORIGINS).has(origin);

  if (c.req.method === "OPTIONS") {
    const headers = new Headers({ Vary: "Origin" });
    if (allowed) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "If-None-Match");
      headers.set("Access-Control-Max-Age", "86400");
    }
    return new Response(null, { status: 204, headers });
  }

  await next();
  c.res.headers.append("Vary", "Origin");
  if (allowed) {
    c.res.headers.set("Access-Control-Allow-Origin", origin);
    c.res.headers.set("Access-Control-Expose-Headers", "ETag");
  }
};
