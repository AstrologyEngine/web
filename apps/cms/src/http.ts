import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "bad_request"
  | "validation_failed"
  | "unauthorized"
  | "not_found"
  | "locale_not_found"
  | "unknown_entry"
  | "conflict"
  | "precondition_failed"
  | "placeholder_mismatch"
  | "fallback_cycle"
  | "method_not_allowed"
  | "unsupported_media_type"
  | "payload_too_large"
  | "admin_disabled"
  | "internal";

export type ApiError = Error & {
  status: ContentfulStatusCode;
  code: ErrorCode;
  extra: Record<string, unknown>;
};

export const apiError = (
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
  extra: Record<string, unknown> = {},
): ApiError =>
  Object.assign(new Error(message), {
    name: "CmsApiError",
    status,
    code,
    extra,
  });

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof Error && error.name === "CmsApiError";

export const errorResponse = (c: Context, error: ApiError) => {
  c.header("Cache-Control", "no-store");
  c.header("ETag", undefined);
  return c.json(
    { error: { code: error.code, message: error.message, ...error.extra } },
    error.status,
  );
};

export const PUBLIC_CACHE = "public, max-age=60, stale-while-revalidate=600";

export const versionTag = (version: number) => `"v${version}"`;

/** True when an If-None-Match header matches the given entity tag. */
export const matchesIfNoneMatch = (header: string | undefined, tag: string) =>
  !!header &&
  header
    .split(",")
    .map((value) => value.trim().replace(/^W\//, ""))
    .some((value) => value === tag || value === "*");

/**
 * Public, cacheable response keyed by content version. Answers 304 before
 * running `body` when the client already has this version.
 */
export const publicVersioned = async (
  c: Context,
  version: number,
  body: () => Promise<unknown>,
) => {
  const tag = versionTag(version);
  c.header("Cache-Control", PUBLIC_CACHE);
  c.header("ETag", tag);
  if (matchesIfNoneMatch(c.req.header("if-none-match"), tag))
    return c.body(null, 304);
  return c.json(await body());
};
