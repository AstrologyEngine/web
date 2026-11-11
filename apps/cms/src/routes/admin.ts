import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../app";
import type { Catalog } from "../catalog-schema";
import {
  allTranslations,
  entryTranslations,
  listLocales,
  type Locale,
  type TranslationRecord,
} from "../db";
import { coverageReport } from "../coverage";
import { isCatalogEntry, validateFields } from "../fields";
import { apiError } from "../http";
import {
  canonicalLocale,
  defaultFallbackFor,
  effectiveChain,
  wouldCycle,
} from "../locales";
import { actorOf, commitWrite, now, readJson } from "../write";

const localeCode = z.string().transform((value, ctx) => {
  const canonical = canonicalLocale(value);
  if (!canonical) {
    ctx.addIssue({ code: "custom", message: "Not a valid language tag" });
    return z.NEVER;
  }
  return canonical;
});
const localeName = z
  .string()
  .min(1)
  .max(100)
  .refine((value) => value.trim() === value && value.length > 0, {
    message: "Must not be blank or padded",
  });

const createLocale = z.strictObject({
  code: localeCode,
  name: localeName,
  enabled: z.boolean().optional(),
  fallback: localeCode.nullable().optional(),
});
const updateLocale = z
  .strictObject({
    name: localeName.optional(),
    enabled: z.boolean().optional(),
    fallback: localeCode.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field",
  });

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw apiError(422, "validation_failed", "Request is invalid.", {
      issues: parsed.error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message,
      })),
    });
  return parsed.data;
};

const invalid = (message: string): never => {
  throw apiError(422, "validation_failed", message);
};

const present = (locale: Locale, locales: Locale[]) => ({
  code: locale.code,
  name: locale.name,
  enabled: locale.enabled,
  isDefault: locale.isDefault,
  fallback: locale.fallback,
  chain: effectiveChain(locale.code, locales),
  createdAt: locale.createdAt,
  updatedAt: locale.updatedAt,
});

const snapshot = (locale: Locale) => ({
  code: locale.code,
  name: locale.name,
  enabled: locale.enabled,
  isDefault: locale.isDefault,
  fallback: locale.fallback,
});

const findLocale = (locales: Locale[], requested: string) => {
  const code = canonicalLocale(requested);
  const locale = locales.find((candidate) => candidate.code === code);
  if (!locale)
    throw apiError(
      404,
      "locale_not_found",
      `Locale '${requested}' does not exist.`,
    );
  return locale;
};

const revisionQuery = z.strictObject({
  collection: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
  locale: localeCode.optional(),
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

type RevisionRecord = {
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

/** Parsed If-Match: null (absent), "any" (*), a revision, or "never" (unparseable). */
const ifMatch = (header: string | undefined) => {
  if (header === undefined) return null;
  if (header.trim() === "*") return "any" as const;
  const match = header.trim().match(/^(?:W\/)?"r(\d+)"$/);
  return match ? Number(match[1]) : ("never" as const);
};

const preconditionFailed = (): never => {
  throw apiError(
    412,
    "precondition_failed",
    "The translation changed or does not match the precondition.",
  );
};

const presentTranslation = (row: TranslationRecord) => ({
  locale: row.locale,
  fields: JSON.parse(row.fields) as unknown,
  revision: row.revision,
  updatedAt: row.updated_at,
});

export const adminRoutes = (catalog: Catalog) => {
  const routes = new Hono<AppEnv>();

  routes.get("/v1/admin/locales", async (c) => {
    const locales = await listLocales(c.env.DB);
    return c.json({
      default: locales.find((locale) => locale.isDefault)!.code,
      locales: locales.map((locale) => present(locale, locales)),
    });
  });

  routes.post("/v1/admin/locales", async (c) => {
    const actor = actorOf(c);
    const input = parse(createLocale, await readJson(c));
    const locales = await listLocales(c.env.DB);
    if (locales.some((locale) => locale.code === input.code))
      throw apiError(409, "conflict", `Locale '${input.code}' exists.`);
    let fallback: string | null;
    if (input.fallback === undefined)
      fallback = defaultFallbackFor(input.code, locales);
    else {
      fallback = input.fallback;
      if (fallback === input.code)
        invalid("A locale cannot fall back to itself.");
      if (fallback && !locales.some((locale) => locale.code === fallback))
        invalid(`Fallback '${fallback}' does not exist.`);
    }
    const timestamp = now();
    const created: Locale = {
      code: input.code,
      name: input.name,
      enabled: input.enabled ?? false,
      isDefault: false,
      fallback,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await commitWrite(
      c.env.DB,
      [
        c.env.DB.prepare(
          `INSERT INTO locales (code, name, enabled, is_default, fallback, created_at, updated_at)
           VALUES (?, ?, ?, 0, ?, ?, ?)`,
        ).bind(
          created.code,
          created.name,
          created.enabled ? 1 : 0,
          created.fallback,
          timestamp,
          timestamp,
        ),
      ],
      {
        subject: "locale",
        action: "create",
        locale: created.code,
        after: snapshot(created),
        actor,
      },
    );
    c.header("Location", `/v1/admin/locales/${created.code}`);
    return c.json(present(created, [...locales, created]), 201);
  });

  routes.patch("/v1/admin/locales/:code", async (c) => {
    const actor = actorOf(c);
    const locales = await listLocales(c.env.DB);
    const current = findLocale(locales, c.req.param("code"));
    const input = parse(updateLocale, await readJson(c));
    if (current.isDefault && input.enabled === false)
      throw apiError(409, "conflict", "The default locale stays enabled.");
    if (current.isDefault && input.fallback)
      throw apiError(409, "conflict", "The default locale has no fallback.");
    if (input.fallback) {
      if (!locales.some((locale) => locale.code === input.fallback))
        invalid(`Fallback '${input.fallback}' does not exist.`);
      if (wouldCycle(current.code, input.fallback, locales))
        throw apiError(
          422,
          "fallback_cycle",
          `Falling back to '${input.fallback}' would create a loop.`,
        );
    }
    const updated: Locale = {
      ...current,
      name: input.name ?? current.name,
      enabled: input.enabled ?? current.enabled,
      fallback:
        input.fallback === undefined ? current.fallback : input.fallback,
      updatedAt: now(),
    };
    await commitWrite(
      c.env.DB,
      [
        c.env.DB.prepare(
          "UPDATE locales SET name = ?, enabled = ?, fallback = ?, updated_at = ? WHERE code = ?",
        ).bind(
          updated.name,
          updated.enabled ? 1 : 0,
          updated.fallback,
          updated.updatedAt,
          updated.code,
        ),
      ],
      {
        subject: "locale",
        action: "update",
        locale: current.code,
        before: snapshot(current),
        after: snapshot(updated),
        actor,
      },
    );
    const next = locales.map((locale) =>
      locale.code === updated.code ? updated : locale,
    );
    return c.json(present(updated, next));
  });

  routes.delete("/v1/admin/locales/:code", async (c) => {
    const actor = actorOf(c);
    const locales = await listLocales(c.env.DB);
    const current = findLocale(locales, c.req.param("code"));
    if (current.isDefault)
      throw apiError(409, "conflict", "The default locale cannot be deleted.");
    const { results } = await c.env.DB.prepare(
      "SELECT collection, key, fields FROM translations WHERE locale = ? ORDER BY collection, key",
    )
      .bind(current.code)
      .all<{ collection: string; key: string; fields: string }>();
    await commitWrite(
      c.env.DB,
      [
        c.env.DB.prepare("DELETE FROM locales WHERE code = ?").bind(
          current.code,
        ),
      ],
      {
        subject: "locale",
        action: "delete",
        locale: current.code,
        before: {
          ...snapshot(current),
          translations: results.map((row) => ({
            collection: row.collection,
            key: row.key,
            fields: JSON.parse(row.fields),
          })),
        },
        actor,
      },
    );
    return c.body(null, 204);
  });

  routes.get("/v1/admin/catalog", (c) => c.json({ collections: catalog }));

  routes.get("/v1/admin/coverage", async (c) => {
    const [locales, rows] = await Promise.all([
      listLocales(c.env.DB),
      allTranslations(c.env.DB),
    ]);
    return c.json(coverageReport(catalog, locales, rows));
  });

  routes.get("/v1/admin/revisions", async (c) => {
    const query = parse(revisionQuery, c.req.query());
    const filters: string[] = [];
    const values: (string | number)[] = [];
    for (const column of ["collection", "key", "locale"] as const)
      if (query[column] !== undefined) {
        filters.push(`${column} = ?`);
        values.push(query[column]);
      }
    if (query.before !== undefined) {
      filters.push("id < ?");
      values.push(query.before);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const { results } = await c.env.DB.prepare(
      `SELECT * FROM revisions ${where} ORDER BY id DESC LIMIT ?`,
    )
      .bind(...values, query.limit + 1)
      .all<RevisionRecord>();
    const page = results.slice(0, query.limit);
    return c.json({
      revisions: page.map((row) => ({
        id: row.id,
        subject: row.subject,
        action: row.action,
        collection: row.collection,
        key: row.key,
        locale: row.locale,
        before: row.before === null ? null : JSON.parse(row.before),
        after: row.after === null ? null : JSON.parse(row.after),
        actor: row.actor,
        createdAt: row.created_at,
      })),
      next: results.length > query.limit ? page.at(-1)!.id : null,
    });
  });

  routes.get("/v1/admin/entries/:collection/:key", async (c) => {
    const { collection, key } = c.req.param();
    const inCatalog = isCatalogEntry(catalog, collection, key);
    const rows = await entryTranslations(c.env.DB, collection, key);
    if (!inCatalog && !rows.length)
      throw apiError(
        404,
        "unknown_entry",
        `'${collection}:${key}' is not in the catalog.`,
      );
    const definition = inCatalog ? catalog[collection]! : null;
    return c.json({
      collection,
      key,
      inCatalog,
      shape: definition?.shape ?? null,
      placeholders: definition ? [...definition.keys[key]!] : [],
      translations: rows.map(presentTranslation),
    });
  });

  routes.put(
    "/v1/admin/entries/:collection/:key/translations/:locale",
    async (c) => {
      const { collection, key } = c.req.param();
      const actor = actorOf(c);
      const locale = findLocale(
        await listLocales(c.env.DB),
        c.req.param("locale"),
      );
      const validated = validateFields(
        catalog,
        collection,
        key,
        await readJson(c),
      );
      if (!validated.ok) {
        const { code, message, ok: _ok, ...extra } = validated;
        throw apiError(
          code === "unknown_entry" ? 404 : 422,
          code,
          message,
          extra,
        );
      }
      const fields = JSON.stringify(validated.fields);
      const [existing] = await entryTranslations(c.env.DB, collection, key, [
        locale.code,
      ]);
      const match = ifMatch(c.req.header("if-match"));
      const createOnly = c.req.header("if-none-match")?.trim() === "*";
      if (match === "never") preconditionFailed();
      const timestamp = now();
      const db = c.env.DB;
      const where = "WHERE collection = ? AND key = ? AND locale = ?";
      const statement =
        match !== null
          ? db
              .prepare(
                `UPDATE translations SET fields = ?, revision = revision + 1, updated_at = ?
                 ${where}${match === "any" ? "" : " AND revision = ?"} RETURNING revision`,
              )
              .bind(
                fields,
                timestamp,
                collection,
                key,
                locale.code,
                ...(match === "any" ? [] : [match]),
              )
          : db
              .prepare(
                `INSERT INTO translations (collection, key, locale, fields, revision, updated_at)
                 VALUES (?, ?, ?, ?, 1, ?)
                 ON CONFLICT (collection, key, locale) DO ${
                   createOnly
                     ? "NOTHING"
                     : "UPDATE SET fields = excluded.fields, revision = translations.revision + 1, updated_at = excluded.updated_at"
                 }
                 RETURNING revision`,
              )
              .bind(collection, key, locale.code, fields, timestamp);
      const created = !existing && match === null;
      const { results, version } = await commitWrite(
        db,
        [statement],
        {
          subject: "translation",
          action: created ? "create" : "update",
          collection,
          key,
          locale: locale.code,
          ...(existing ? { before: JSON.parse(existing.fields) } : {}),
          after: validated.fields,
          actor,
        },
        { guard: true },
      );
      if (version === null) preconditionFailed();
      const revision = (results[0]!.results[0] as { revision: number })
        .revision;
      c.header("ETag", `"r${revision}"`);
      return c.json(
        {
          collection,
          key,
          locale: locale.code,
          fields: validated.fields,
          revision,
          updatedAt: timestamp,
        },
        revision === 1 ? 201 : 200,
      );
    },
  );

  routes.delete(
    "/v1/admin/entries/:collection/:key/translations/:locale",
    async (c) => {
      const { collection, key } = c.req.param();
      const actor = actorOf(c);
      const locales = await listLocales(c.env.DB);
      const code = canonicalLocale(c.req.param("locale"));
      const locale = locales.find((candidate) => candidate.code === code);
      const [existing] = locale
        ? await entryTranslations(c.env.DB, collection, key, [locale.code])
        : [];
      if (!locale || !existing)
        throw apiError(404, "not_found", "Translation does not exist.");
      if (locale.isDefault && isCatalogEntry(catalog, collection, key))
        throw apiError(
          409,
          "conflict",
          "Catalog entries keep their default-locale text; edit it instead.",
        );
      const match = ifMatch(c.req.header("if-match"));
      if (match === "never") preconditionFailed();
      const revisionFilter =
        typeof match === "number" ? " AND revision = ?" : "";
      const { version } = await commitWrite(
        c.env.DB,
        [
          c.env.DB.prepare(
            `DELETE FROM translations WHERE collection = ? AND key = ? AND locale = ?${revisionFilter}`,
          ).bind(
            collection,
            key,
            locale.code,
            ...(typeof match === "number" ? [match] : []),
          ),
        ],
        {
          subject: "translation",
          action: "delete",
          collection,
          key,
          locale: locale.code,
          before: JSON.parse(existing.fields),
          actor,
        },
        { guard: true },
      );
      if (version === null) preconditionFailed();
      return c.body(null, 204);
    },
  );

  return routes;
};
