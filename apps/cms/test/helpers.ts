import { env } from "cloudflare:workers";
import { createApp } from "../src/app";
import { testCatalog } from "./fixtures";

export const ADMIN_TOKEN = "test-admin-token-0123456789abcdefghijklmnop";

const app = createApp(testCatalog);

/** Requests against an app built from the small test catalog. */
export const call = async (
  path: string,
  init?: RequestInit,
  overrides: Partial<Cloudflare.Env> = {},
) =>
  app.fetch(new Request(`https://cms.test${path}`, init), {
    ...env,
    ...overrides,
  });

export const admin = (
  path: string,
  init: RequestInit & { json?: unknown } = {},
) => {
  const { json, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("authorization", `Bearer ${ADMIN_TOKEN}`);
  if (json !== undefined) headers.set("content-type", "application/json");
  return call(path, {
    ...rest,
    headers,
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
  });
};

/** Tests in one file share D1 state; files are isolated from each other. */
export const resetDb = async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM translations"),
    env.DB.prepare("DELETE FROM revisions"),
    env.DB.prepare("DELETE FROM locales WHERE is_default = 0"),
    env.DB.prepare("UPDATE meta SET value = 1 WHERE key = 'content_version'"),
  ]);
};

export const addLocale = async (
  code: string,
  {
    enabled = true,
    fallback = null,
    name = code,
  }: { enabled?: boolean; fallback?: string | null; name?: string } = {},
) => {
  await env.DB.prepare(
    `INSERT INTO locales (code, name, enabled, is_default, fallback, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`,
  )
    .bind(code, name, enabled ? 1 : 0, fallback)
    .run();
};

export const addTranslation = async (
  collection: string,
  key: string,
  locale: string,
  fields: unknown,
) => {
  await env.DB.prepare(
    `INSERT INTO translations (collection, key, locale, fields, revision, updated_at)
     VALUES (?, ?, ?, ?, 1, '2026-01-01T00:00:00.000Z')`,
  )
    .bind(collection, key, locale, JSON.stringify(fields))
    .run();
};

export const setVersion = async (value: number) => {
  await env.DB.prepare(
    "UPDATE meta SET value = ? WHERE key = 'content_version'",
  )
    .bind(value)
    .run();
};

export const version = async () =>
  (await env.DB.prepare(
    "SELECT value FROM meta WHERE key = 'content_version'",
  ).first<{ value: number }>())!.value;

export type RevisionRow = {
  id: number;
  subject: string;
  action: string;
  collection: string | null;
  key: string | null;
  locale: string | null;
  before: string | null;
  after: string | null;
  actor: string;
  created_at: string;
};

export const revisions = async () =>
  (
    await env.DB.prepare(
      "SELECT * FROM revisions ORDER BY id",
    ).all<RevisionRow>()
  ).results;

export const localeRow = (code: string) =>
  env.DB.prepare("SELECT * FROM locales WHERE code = ?").bind(code).first<{
    code: string;
    enabled: number;
    fallback: string | null;
    name: string;
  }>();
