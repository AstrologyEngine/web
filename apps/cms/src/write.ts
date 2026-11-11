import type { Context } from "hono";
import type { AppEnv } from "./app";
import { apiError } from "./http";

export const MAX_BODY_BYTES = 64 * 1024;

/** Parse a JSON request body, enforcing content type and size. */
export const readJson = async (c: Context<AppEnv>): Promise<unknown> => {
  const type = c.req.header("content-type")?.split(";")[0]?.trim();
  if (type !== "application/json")
    throw apiError(
      415,
      "unsupported_media_type",
      "Content-Type must be application/json.",
    );
  const declared = Number(c.req.header("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) tooLarge();
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength > MAX_BODY_BYTES) tooLarge();
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw apiError(400, "bad_request", "Body is not valid JSON.");
  }
};

const tooLarge = (): never => {
  throw apiError(413, "payload_too_large", "Body exceeds 64 KB.");
};

/** The informational actor from X-CMS-Actor (1–64 printable chars). */
export const actorOf = (c: Context<AppEnv>) => {
  const actor = c.req.header("x-cms-actor");
  if (actor === undefined) return "admin";
  // oxlint-disable-next-line no-control-regex
  if (!actor.trim() || actor.length > 64 || /[\u0000-\u001f\u007f]/.test(actor))
    throw apiError(
      422,
      "validation_failed",
      "X-CMS-Actor must be 1–64 printable characters.",
    );
  return actor.trim();
};

export const now = () => new Date().toISOString();

export type Revision = {
  subject: "translation" | "locale";
  action: "create" | "update" | "delete";
  collection?: string | null;
  key?: string | null;
  locale?: string | null;
  before?: unknown;
  after?: unknown;
  actor: string;
};

/**
 * Run a write atomically with its revision row and a content version bump.
 *
 * With `guard`, the revision and version bump only apply if the first
 * statement changed a row (SQLite `changes()` within the same batch), so a
 * failed precondition leaves no trace. Returns `version: null` in that case.
 */
export const commitWrite = async (
  db: D1Database,
  statements: D1PreparedStatement[],
  revision: Revision,
  { guard = false }: { guard?: boolean } = {},
) => {
  const condition = guard ? " WHERE changes() > 0" : "";
  const results = await db.batch([
    ...statements,
    db
      .prepare(
        `INSERT INTO revisions (subject, action, collection, key, locale, before, after, actor, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?${condition}`,
      )
      .bind(
        revision.subject,
        revision.action,
        revision.collection ?? null,
        revision.key ?? null,
        revision.locale ?? null,
        revision.before === undefined ? null : JSON.stringify(revision.before),
        revision.after === undefined ? null : JSON.stringify(revision.after),
        revision.actor,
        now(),
      ),
    db.prepare(
      `UPDATE meta SET value = value + 1 WHERE key = 'content_version'${guard ? " AND changes() > 0" : ""} RETURNING value`,
    ),
  ]);
  const bumped = results.at(-1)!.results[0] as { value: number } | undefined;
  const version = bumped?.value ?? null;
  if (version !== null)
    console.log({
      event: "cms_write",
      subject: revision.subject,
      action: revision.action,
      collection: revision.collection ?? null,
      key: revision.key ?? null,
      locale: revision.locale ?? null,
      actor: revision.actor,
      version,
    });
  return { results: results.slice(0, statements.length), version };
};
