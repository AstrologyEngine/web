import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "./app";
import { apiError } from "./http";

export const MIN_TOKEN_LENGTH = 32;

const digest = async (value: string) =>
  new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );

/** Constant-time comparison of SHA-256 digests (equal length by construction). */
const tokenMatches = async (presented: string, expected: string) =>
  crypto.subtle.timingSafeEqual(
    await digest(presented),
    await digest(expected),
  );

/**
 * Bearer auth for /v1/admin/*. Fails closed when CMS_ADMIN_TOKEN is unset or
 * shorter than 32 characters; CMS_ADMIN_TOKEN_NEXT is accepted for rotation.
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.header("Cache-Control", "no-store");
  const primary = c.env.CMS_ADMIN_TOKEN ?? "";
  if (primary.length < MIN_TOKEN_LENGTH)
    throw apiError(503, "admin_disabled", "Admin access is not configured.");
  const accepted = [primary, c.env.CMS_ADMIN_TOKEN_NEXT ?? ""].filter(
    (token) => token.length >= MIN_TOKEN_LENGTH,
  );
  const match = c.req.header("authorization")?.match(/^Bearer (.+)$/i);
  const presented = match?.[1] ?? "";
  let authorised = false;
  // Compare against every accepted token so timing doesn't reveal which matched.
  for (const token of accepted)
    if (await tokenMatches(presented, token)) authorised = true;
  if (!authorised) {
    c.header("WWW-Authenticate", 'Bearer realm="cms"');
    throw apiError(401, "unauthorized", "A valid admin token is required.");
  }
  await next();
};
