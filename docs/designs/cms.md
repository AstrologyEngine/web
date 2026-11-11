# Design: Astrology Engine CMS

|             |                                                                        |
| ----------- | ---------------------------------------------------------------------- |
| **Status**  | Implemented (rev. 2 approved 2026-11-10); see §14 for as-built notes   |
| **Date**    | 2026-11-10                                                             |
| **Code**    | `AstrologyEngine-web/apps/cms` (new), `AstrologyEngine-web` (consumer) |
| **Related** | `docs/plans/cms.md` (plan), `docs/runbooks/cms.md` (operations)        |

**Revision 2 changes:** keys and collections are defined in code (no runtime
entry creation/deletion, no `entries` table); outage fallback uses per-language
static JSON snapshots bundled with the site; language fallback is an explicit,
editable per-locale chain that supports regional siblings (e.g. `es-ES` →
`es-419`); seeding runs on every deploy.

## 1. Summary

A small Cloudflare Worker (`AstrologyEngine-web/apps/cms`) backed by Cloudflare D1 becomes the single
source of truth for all user-facing copy on the Natal Chart Explorer website. It
serves anonymous, cacheable, read-only JSON to everyone, and lets administrators
who present a Bearer token (held in a Worker secret) manage locales and
translations. The set of content keys is defined in code, because only code
changes can consume a new key; the _text_ for every key, in every language, lives
in D1. English is the default and final fallback; Spanish or any other BCP 47
locale can be added at runtime without a deploy. The website's SvelteKit server
reads copy through a Cloudflare **Service Binding** and ships a build-time JSON
snapshot per language as its outage fallback.

## 2. Context

Today every string the site shows is hardcoded:

- `src/lib/reference-content.ts` and `src/lib/exploration-content.ts` — 51
  reference entries (15 bodies, 13 signs, 12 houses, 4 angles, 7 aspects, each an
  insight plus keywords), 3 system explanations, the custom True Sky explanation,
  the final-degree bridging note, a sign → ruler table written as English planet
  names, and editorial review metadata.
- Svelte components and routes — landing page, page titles and meta description,
  headings, button labels, ARIA labels, status and error messages, chip labels,
  picker titles, settings labels, body/angle/sign display names
  (`wheel/body-symbols.ts`, `title(sign)`), etc.
- Server and worker messages — `/api/resolve-birth` and `lib/server/birth/resolve.ts`
  return English `message` strings; the calculation worker returns English error
  messages.
- `scripts/editorial/review-packet.ts` renders the content files into a review
  document.

## 3. Decisions captured during review

| #    | Question                 | Decision                                                                                                                                                         |
| ---- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Repo layout              | CMS in `AstrologyEngine-web/apps/cms/` as its own package (no Bun workspace); `docs/` beside `AstrologyEngine-web/`.                                             |
| 2    | Scope of copy            | **All** user-facing copy: the `*-content.ts` files _and_ strings in components, routes, resolver and worker.                                                     |
| 3    | Rulers                   | Ruler mapping stays in code as body IDs (`MARS`, `PLUTO`); planet names exist once, in the CMS `body` entries.                                                   |
| 4/5  | Editorial review         | Review packet script and editorial review metadata removed; revision history replaces provenance.                                                                |
| 6    | Schema shape             | Generic tables (locales, translations) with per-collection field validation in the Worker.                                                                       |
| 7    | Locales                  | BCP 47 tags; `en` is the default and cannot be deleted or disabled; new locales start disabled.                                                                  |
| 8    | Missing translation      | Fall back along the locale's chain, ending at the default; flag fallbacks; admin coverage endpoint across languages.                                             |
| 9    | Key set                  | **Code-defined** (rev. 2). Collections and keys live in a catalog in the CMS code; admins edit text, not keys.                                                   |
| 10   | Spanish seed             | Not seeded. Spanish content is out of scope; the system must support it.                                                                                         |
| 11   | Publishing               | Writes are live immediately; every change is recorded in a revision history; optimistic concurrency via `ETag`/`If-Match`.                                       |
| 12   | Public read shape        | One whole-locale bundle endpoint plus locale list and single-entry endpoints.                                                                                    |
| 13   | Caching                  | `Cache-Control: public, max-age=60, stale-while-revalidate=600` + version-based `ETag`.                                                                          |
| 14   | Auth                     | `CMS_ADMIN_TOKEN` secret (+ optional `CMS_ADMIN_TOKEN_NEXT` for rotation), constant-time compare; brute-force protection by a Cloudflare WAF rate-limiting rule. |
| 15   | CORS                     | Public GETs allow the site origins only; admin routes emit no CORS headers. No admin UI.                                                                         |
| 16   | Site integration         | SvelteKit server fetches through a Service Binding.                                                                                                              |
| 17   | CMS unavailable          | **Bundled static JSON snapshot per language** (rev. 2), see §9.5. No full outage.                                                                                |
| 18   | Language selection       | `?lang=` parameter persisted in a cookie; `Accept-Language` on first visit; switcher shown when more than one locale is enabled.                                 |
| 19   | Environments             | `staging` and `alpha` are the production environments for the new site; `astrologyengine.dev` (legacy) is untouched.                                             |
| 20   | Tooling                  | Hono, zod, D1 migrations via Wrangler, Vitest + `@cloudflare/vitest-pool-workers`, Bun.                                                                          |
| 13.3 | Resolver/worker messages | Become codes mapped to CMS copy on the client. Approved.                                                                                                         |
| 13.4 | Hostnames                | `cms-staging.` / `cms-alpha.astrologyengine.dev`. Approved.                                                                                                      |
| 13.6 | Sibling locales          | Supported through per-locale fallback chains (§7.3).                                                                                                             |

## 4. Goals and non-goals

**Goals**

- Every user-facing string on the site is served by the CMS. The web repo
  contains no hand-written copy; its only copy is generated snapshots (§9.5) and
  the last-resort static error page (§9.6).
- English and Spanish supported by the data model and API; any further BCP 47
  locale can be added at runtime, including regional variants that fall back to
  each other.
- Anonymous, cacheable public reads; admin operations behind a Bearer token.
- Cheap to run and operate: one Worker and one D1 database per environment.

**Non-goals (this work)**

- Spanish copy, Spanish date/number formatting, or Spanish birth-input parsing
  (the resolver parses English sentences via chrono-node).
- An admin UI, multiple admin identities, roles, drafts or scheduled publishing.
- Creating or deleting content keys at runtime.
- Rich text. Copy is plain text (§5.5).
- Pluralisation/ICU MessageFormat. Current copy needs none; placeholders only.
- Copy embedded in non-text assets (SVG glyph paths, the sample wheel drawing).

## 5. Content model

### 5.1 Catalog

An **entry** is identified by `(collection, key)` and has zero or one
**translation** per locale. A translation is a JSON object of **fields** whose
shape is determined by the collection.

Collections _and_ keys are declared in one dependency-free TypeScript module,
`AstrologyEngine-web/apps/cms/src/catalog.ts` (`as const` data). It is the contract between the CMS
and the website:

- The CMS validates every admin write against it (`404 unknown_entry` for keys
  not in the catalog) and builds bundles from it.
- The website imports its **types** (`import type` through a `$cms` alias to
  `apps/cms/src`), so `t("landing.hero.titel")` is a compile error. Type-only
  imports are erased; no CMS code is bundled into the site.
- Adding a key = edit the catalog + add its English text to the seed + use it in
  the site, in one change. Removing a key = delete it from the catalog; existing
  translations become **orphans**, which are excluded from public output, listed
  by coverage and deletable by admins.

Initial collections:

| Collection | Keys (initial)                                              | Fields                        | Replaces                                                                      |
| ---------- | ----------------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `body`     | `SUN` … `CERES` (15)                                        | `name`, `insight`, `keywords` | `meanings`, `bodySymbols[].name`                                              |
| `angle`    | `ASCENDANT_SYMBOL`, `MIDHEAVEN`, `DESCENDANT`, `IMUM_COELI` | `name`, `insight`, `keywords` | `angles`, angle names in `Wheel.svelte` / `bodySymbols`                       |
| `sign`     | `aries` … `pisces` incl. `ophiuchus` (13)                   | `name`, `insight`, `keywords` | `signs`, `title(sign)` display                                                |
| `aspect`   | `Conjunction` … `Opposition` (7)                            | `name`, `insight`, `keywords` | `aspectContent`, aspect type display                                          |
| `house`    | `1` … `12`                                                  | `insight`, `keywords`         | `houses`                                                                      |
| `ui`       | dotted keys, e.g. `landing.hero.title` (~130)               | `text`                        | all other strings, incl. system help, bridging note, resolver/worker messages |

### 5.2 Field rules

Validated on every write; unknown fields are rejected.

- `name`: 1–100 chars, trimmed, non-empty.
- `insight`: 1–2000 chars.
- `keywords`: array of 1–8 strings, each 1–50 chars.
- `text`: 1–2000 chars.

`ui` key convention: `<area>.<element>[.<variant>]` in lower camel segments, e.g.
`app.entry.heading.withBirth`, `birth.chip.timeNeeded`, `error.resolver.range`,
`system.trueSky.help`.

### 5.3 Rulers

`rulers` moves to web code as
`Record<SignName, readonly [traditional: BodyId, modern: BodyId]>` (e.g.
`scorpio: ["MARS", "PLUTO"]`). The site renders `body[id].name`. Ophiuchus has
no entry and renders `ui: details.house.noRuler`. Planet names therefore appear
exactly once, in `body` entries.

### 5.4 Placeholders

Strings may contain named placeholders `{name}` (ASCII identifier in braces),
e.g. `"Showing the previous chart for {date} at {time} in {place}."`. The
catalog declares each `ui` key's placeholders, and writes whose text uses a
different set are rejected with `422 placeholder_mismatch`. The site substitutes
values; an unsubstituted placeholder stays visible rather than failing silently.

### 5.5 Plain text only

Copy is never rendered as HTML (`{@html}` is not used), which removes an XSS path
from anyone holding the admin token. The only formatting convention is `\n`,
which components that opt in (the landing-page title) render as a line break.

### 5.6 Removed

`EditorialReview`, `pendingReview()`, `bodyReviews`, `systemHelpReview`,
`rulerReview`, and `scripts/editorial/review-packet.ts` are deleted. Who changed
what and when is answered by the revision history (§6.4).

## 6. Storage (D1)

### 6.1 Schema

```sql
CREATE TABLE locales (
  code        TEXT PRIMARY KEY,                 -- canonical BCP 47, e.g. 'en', 'es', 'es-419'
  name        TEXT NOT NULL,                    -- endonym for the switcher, e.g. 'Español'
  enabled     INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  fallback    TEXT REFERENCES locales (code) ON DELETE SET NULL,  -- next hop, §7.3
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX locales_single_default ON locales (is_default) WHERE is_default = 1;

CREATE TABLE translations (
  collection  TEXT NOT NULL,
  key         TEXT NOT NULL,
  locale      TEXT NOT NULL REFERENCES locales (code) ON DELETE CASCADE,
  fields      TEXT NOT NULL CHECK (json_valid(fields)),
  revision    INTEGER NOT NULL DEFAULT 1,       -- per-translation ETag source
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (collection, key, locale)
);
CREATE INDEX translations_locale ON translations (locale);

CREATE TABLE revisions (
  id          INTEGER PRIMARY KEY,
  subject     TEXT NOT NULL CHECK (subject IN ('translation', 'locale')),
  action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  collection  TEXT,
  key         TEXT,
  locale      TEXT,
  before      TEXT,                             -- JSON snapshot or NULL
  after       TEXT,                             -- JSON snapshot or NULL
  actor       TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX revisions_lookup ON revisions (collection, key, locale, id);

CREATE TABLE meta (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
-- migration seeds: meta ('content_version', 1); locale ('en', 'English', enabled, default)
```

Timestamps are ISO-8601 UTC strings. Foreign keys are enforced (D1 default).
There is no `entries` table: entry existence is defined by the catalog.

### 6.2 Writes

Every mutating request executes as one `db.batch([...])` (atomic in D1): the
change itself, a `revisions` insert and
`UPDATE meta SET value = value + 1 WHERE key = 'content_version'`.
Optimistic-concurrency checks are expressed in the `WHERE` clause of the update
(`… AND revision = ?`), so there is no read-then-write race; zero affected rows
yields `412`.

### 6.3 Reads

The bundle for locale `L` reads `content_version`, then all translations for the
locales in `L`'s fallback chain (`WHERE locale IN (…)`, at most a few hundred
rows), and resolves each catalog entry in code by chain order. Responses are on
the order of 25–40 KB uncompressed.

### 6.4 Revisions

Append-only. `actor` is taken from an optional `X-CMS-Actor` request header
(1–64 chars, e.g. an editor's name or a script name), default `admin`. Because all
admins share a token, `actor` is informational, not authenticated. Reverting is a
manual read-revision-then-PUT. Seeding (§8) does not write revisions (it only
inserts missing rows); no retention limit.

## 7. API

Base path `/v1`. JSON in and out (`application/json; charset=utf-8`). Request
bodies are limited to 64 KB. Errors use one shape:

```json
{
  "error": {
    "code": "locale_not_found",
    "message": "Locale 'xx' is not available."
  }
}
```

Codes: `bad_request`, `validation_failed` (with `issues`), `unauthorized`,
`not_found`, `locale_not_found`, `unknown_entry`, `conflict`,
`precondition_failed`, `placeholder_mismatch`, `fallback_cycle`,
`method_not_allowed`, `payload_too_large`, `admin_disabled`, `internal`.

### 7.1 Public (anonymous; GET/HEAD/OPTIONS only)

| Method & path                              | Description                                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/locales`                          | Enabled locales, the default and each locale's effective chain: `{ "default": "en", "locales": [{ "code": "en", "name": "English", "chain": ["en"] }] }` |
| `GET /v1/content/:locale`                  | Whole bundle for an enabled locale (shape below).                                                                                                        |
| `GET /v1/content/:locale/:collection/:key` | One entry: `{ collection, key, locale, fallback, fields }`.                                                                                              |
| `GET /health`                              | `{ "ok": true, "version": <content_version> }`; checks D1 connectivity.                                                                                  |

Bundle shape:

```json
{
  "locale": "es-ES",
  "default": "en",
  "chain": ["es-ES", "es-419", "en"],
  "version": 42,
  "entries": {
    "body": {
      "SUN": { "name": "Sol", "insight": "…", "keywords": ["…", "…"] }
    },
    "ui": { "landing.hero.title": { "text": "…" } }
  },
  "fallbacks": { "ui:landing.hero.title": "en" }
}
```

`fallbacks` maps `collection:key` to the locale actually used, for entries not
served in the requested locale. A disabled or unknown locale returns
`404 locale_not_found`. A catalog entry with no translation anywhere in the chain
is omitted; the seed (§8) prevents this for the default locale.

Any non-GET/HEAD/OPTIONS method outside `/v1/admin` returns `405`.

### 7.2 Admin (`Authorization: Bearer <token>` required)

| Method & path                                                     | Description                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/admin/locales`                                           | All locales including disabled, with `fallback` and effective chain.                                                                                              |
| `POST /v1/admin/locales`                                          | `{ code, name, enabled?, fallback? }`. Code canonicalised with `Intl.getCanonicalLocales`; `409` if it exists. Default `fallback` per §7.3.                       |
| `PATCH /v1/admin/locales/:code`                                   | `{ name?, enabled?, fallback? }`. The default locale cannot be disabled and has no fallback; cycles are rejected (`422 fallback_cycle`).                          |
| `DELETE /v1/admin/locales/:code`                                  | Deletes the locale and its translations; locales pointing to it get `fallback = NULL`. Default locale refused (`409`).                                            |
| `GET /v1/admin/catalog`                                           | The catalog: collections, keys, field shape, placeholders.                                                                                                        |
| `GET /v1/admin/entries/:collection/:key`                          | One entry with every stored translation and its `revision`.                                                                                                       |
| `PUT /v1/admin/entries/:collection/:key/translations/:locale`     | Create or replace one translation. `404 unknown_entry` if not in catalog. Returns it with `ETag: "r<revision>"`.                                                  |
| `DELETE /v1/admin/entries/:collection/:key/translations/:locale`  | Delete one translation (including orphans). Refused for the default locale unless the entry is an orphan.                                                         |
| `GET /v1/admin/coverage`                                          | Per locale: translated count, missing ids, ids served by fallback and from which locale, placeholder mismatches; plus orphaned translations; `complete: boolean`. |
| `GET /v1/admin/revisions?collection=&key=&locale=&before=&limit=` | Newest-first history, cursor pagination by `id`, `limit` ≤ 200.                                                                                                   |

Concurrency on `PUT …/translations/:locale`:

- `If-Match: "r<n>"`: replace only if current revision is `n`, else `412`.
- `If-None-Match: *`: create only, `412` if it exists.
- Neither header: unconditional upsert (convenient for scripts). Editors using
  tooling are expected to send `If-Match`.

Admin responses carry `Cache-Control: no-store` and no CORS headers.

### 7.3 Locale fallback chains (sibling support)

Each locale has an optional `fallback` pointer to another locale. The effective
chain for `L` follows the pointers, **skipping disabled locales**, and always
ends at the default locale:

```
es-ES  (fallback: es-419)  →  es-419  (fallback: null)  →  en
es-MX  (fallback: es-419)  →  es-419                    →  en
pt-PT  (fallback: pt-BR)   →  pt-BR                     →  en
```

- **Automatic default on creation** when `fallback` is omitted: the base
  language if it exists (`es-MX` → `es`), else an existing sibling with the same
  language (`es-ES` → `es-419`; if several, the alphabetically first, editable
  later), else `NULL` (straight to the default).
- Editable any time with `PATCH`; cycles are rejected; deleting a locale nulls
  pointers to it.
- The chain is returned by `GET /v1/locales`, in bundles and in coverage, so it is
  never implicit.

**Negotiation** (website, §9.2) uses the same idea: for an
`Accept-Language: es-ES` visitor when only `es-419` is enabled, the match order
is exact tag → base language → any enabled sibling with the same language →
default.

### 7.4 Authentication

- Secrets: `CMS_ADMIN_TOKEN` (required for admin), `CMS_ADMIN_TOKEN_NEXT`
  (optional, accepted in addition during rotation).
- Comparison: SHA-256 both the presented and configured tokens, then
  `crypto.subtle.timingSafeEqual` on the digests (equal length, constant time).
- Fail closed: if `CMS_ADMIN_TOKEN` is unset or shorter than 32 characters, every
  admin route returns `503 admin_disabled`.
- Failure: `401` with `WWW-Authenticate: Bearer realm="cms"`. Tokens are never
  logged.
- Brute-force protection: Cloudflare WAF rate-limiting rule on `/v1/admin/*`
  (runbook), not in code.

### 7.5 CORS

`CMS_ALLOWED_ORIGINS` (comma-separated var per environment). For public routes,
a matching `Origin` gets `Access-Control-Allow-Origin: <origin>`,
`Vary: Origin`, methods `GET, HEAD, OPTIONS`; preflight answered with `204`.
Non-matching origins receive no CORS headers. Admin routes never emit CORS
headers, so browsers cannot call them cross-origin.

### 7.6 Caching

- Public responses: `Cache-Control: public, max-age=60, stale-while-revalidate=600`,
  `ETag: "v<content_version>"`. `If-None-Match` is checked after a single-row
  read of `meta` and answered `304` without reading translations.
- Worker-generated responses are not stored by Cloudflare's CDN, so these headers
  govern browsers and other HTTP clients. The website keeps its own in-isolate
  cache (§9.4). Net effect: edits are visible on the site within about a minute.

### 7.7 Observability

Observability enabled as in the web app (logs on, query strings redacted). Each
admin write emits one structured log line `{ event: "cms_write", subject,
action, collection, key, locale, actor, version }`. No request bodies or tokens
are logged.

## 8. Seeding

`AstrologyEngine-web/apps/cms/seed/en.json` holds English text for every catalog entry, extracted
from the current code, in bundle `entries` shape. A test asserts the seed and the
catalog contain exactly the same keys and that every seed value passes field
validation.

`bun run seed:<env>` converts the seed into SQL
(`INSERT … ON CONFLICT (collection, key, locale) DO NOTHING`, plus one
`content_version` bump) and runs it with `wrangler d1 execute`. Because existing
rows are never touched, the seed is safe to run **on every deploy**. That is how
new catalog keys get their initial English text before the website that uses
them goes live. After a key is seeded, D1 is the source of truth and later edits
to the seed file have no effect on that environment. Spanish is not seeded.

## 9. Website integration

### 9.1 Binding

Web `wrangler.jsonc` gains a service binding `CMS` per environment (bindings are
not inherited by Wrangler environments):

| Web env                       | Binding target                 |
| ----------------------------- | ------------------------------ |
| top level (local)             | `astrology-engine-cms-local`   |
| `staging` (incl. PR previews) | `astrology-engine-cms-staging` |
| `alpha`                       | `astrology-engine-cms-alpha`   |

`src/cloudflare.d.ts` declares `CMS: Fetcher`. In `vite dev`, where the existing
code already bypasses Cloudflare bindings (`dev ? fetch(path) : env.ASSETS…`),
the same pattern is used: `dev ? fetch(CMS_ORIGIN + path) : env.CMS.fetch(…)`,
with `CMS_ORIGIN` defaulting to `http://127.0.0.1:8787` (the local `wrangler dev`
CMS).

### 9.2 Locale negotiation (`hooks.server.ts`)

1. `?lang=<code>` if it negotiates to an enabled locale → use it and set cookie
   `lang` (`Path=/; Max-Age=31536000; SameSite=Lax; Secure` outside dev).
2. Else cookie `lang` if it still negotiates to an enabled locale.
3. Else best match from `Accept-Language` by q-value, each tag matched as in §7.3.
4. Else the default locale.

The result goes into `event.locals.locale`; `app.html` uses `<html lang="%lang%">`
filled via `transformPageChunk`. SSR responses get
`Vary: Cookie, Accept-Language`.

### 9.3 Loading and using copy

- `src/routes/+layout.server.ts` loads `{ locale, locales, content }` through the
  copy source (§9.4–9.5); all pages receive it through `page.data`.
- `src/lib/copy.ts` offers typed helpers used by components: `t(key, params?)`
  for `ui` text, `entry(collection, key)` for reference content, plus
  `bodyName(id)`, `signName(id)`, `aspectName(type)`. Keys are typed from the
  catalog (§5.1).
- A key missing at runtime (only possible if the CMS and site are out of step)
  renders the key itself and logs a warning; reference lookups return
  `undefined` and the details panel shows `ui: details.unavailable`. Nothing
  crashes.
- Resolver (`resolve.ts`, `/api/resolve-birth`) and calculation worker stop
  producing English: they return stable `code`s (most already exist; new ones
  added for each `needs_input` case) and the client maps them to
  `ui: error.resolver.<code>` / `error.calculation.<code>`. The response drops
  `message` and adds `code` on `needs_input`.
- Language switcher: rendered in the header only when more than one locale is
  enabled; links to `?lang=<code>`. With only English enabled it does not appear.

### 9.4 Web-side cache

Module-level cache per isolate, keyed by locale: fresh for 60 s; after that the
server revalidates with `If-None-Match` (cheap `304`). CMS calls time out after
2 s. The enabled-locale list is cached the same way.

### 9.5 Bundled snapshot fallback

At build time, `scripts/cms-snapshot.mjs` writes one file per enabled locale plus
an index into `static/content/` (gitignored, generated like `release.json`):

```
static/content/index.json   { "default": "en", "version": 42, "locales": [...] }
static/content/en.json      full bundle, same shape as GET /v1/content/en
```

- **Deployed builds** fetch from the target environment's public CMS
  (`CMS_SNAPSHOT_ORIGIN=https://cms-staging.astrologyengine.dev`, etc.). If
  that fails, the build fails, so a release never ships without a snapshot.
- **Local builds, dev and tests** without `CMS_SNAPSHOT_ORIGIN` generate the
  snapshot from the CMS seed (`apps/cms/seed/en.json`).

Resolution order on the server for each request:

1. Fresh in-isolate cache.
2. Live CMS via the binding (revalidating the cache).
3. Stale in-isolate cache (any age; it is newer than the snapshot).
4. Bundled snapshot for the negotiated locale, else the first snapshot in its
   chain, else `en.json`. Read through `env.ASSETS` and cached in the isolate.

Every degraded response logs `{ event: "cms_fallback", source, locale }` so
outages are visible. Snapshot copy can be as old as the last deploy, which is
accepted for outages.

### 9.6 Last resort

If even the bundled snapshot can't be read (the site's own assets are broken),
the root layout load throws a `503` and SvelteKit serves the static
`src/error.html` with a one-line hardcoded message. This page is the only
hand-written copy left in the web repo.

## 10. Environments and deployment

|                 | Local                                                    | Staging                               | Alpha                               |
| --------------- | -------------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| CMS Worker      | `astrology-engine-cms-local` (`wrangler dev`, port 8787) | `astrology-engine-cms-staging`        | `astrology-engine-cms-alpha`        |
| D1 database     | local SQLite in `.wrangler/`                             | `astrology-engine-cms-staging`        | `astrology-engine-cms-alpha`        |
| Public hostname | `127.0.0.1:8787`                                         | `cms-staging.astrologyengine.dev`     | `cms-alpha.astrologyengine.dev`     |
| Allowed origins | `http://127.0.0.1:4173`, `http://localhost:5173`         | `https://staging.astrologyengine.dev` | `https://alpha.astrologyengine.dev` |

- Hostnames are first-level subdomains so the zone's Universal SSL certificate
  (`*.astrologyengine.dev`) covers them.
- `workers_dev` and `preview_urls` are off for the CMS.
- Staging and alpha are treated as production for the new site; the legacy apex
  `astrologyengine.dev` is untouched.
- Deploy order: CMS migrate → CMS deploy → seed (every time; idempotent) → web
  build (snapshot from that environment's CMS) → web deploy. Migrations are
  additive-only, so a CMS deploy never breaks the running site.
- Details, commands and recovery procedures: `docs/runbooks/cms.md`.

## 11. Testing

- **CMS:** Vitest with `@cloudflare/vitest-pool-workers` runs the Worker in
  `workerd` against a real local D1 with migrations applied: routing, auth
  (including rotation and fail-closed), validation, catalog enforcement,
  fallback chains (siblings, disabled hops, cycles), ETags / 304, concurrency
  (`If-Match`), placeholders, coverage (missing, fallback, orphans), revisions,
  CORS, seed ⇔ catalog parity, seed idempotence.
- **Web:** existing Playwright journeys keep their English assertions. The
  Playwright config starts a seeded local CMS and the web dev server. New tests
  cover locale negotiation (`?lang`, cookie, `Accept-Language`, sibling match),
  the switcher hidden with one locale, rendering with a partially translated
  locale, and the CMS being down (snapshot copy served).
  `verification/birth.test.ts` moves from English message assertions to code
  assertions.
- **Types:** `check` / `check:ts` enforce that every key the site uses exists in
  the catalog.

## 12. Security considerations

- Public surface is read-only; all writes require the Bearer token.
- Token stored only as a Worker secret; ≥ 32 chars enforced; rotation without
  downtime via `CMS_ADMIN_TOKEN_NEXT`.
- Plain-text rendering only, so a leaked token cannot inject script into the
  site (it can still deface copy; revisions make that recoverable).
- Parameterised SQL everywhere; request size capped; input validated with zod;
  writes limited to catalog keys.
- WAF rate limiting on admin paths.

## 13. Points needing your explicit approval (rev. 2)

1. **Snapshot build dependency (§9.5):** deployed web builds _fail_ if the CMS
   can't be reached for the snapshot, rather than shipping the seed's English.
   The alternative (silently falling back to the seed) risks shipping stale copy
   unnoticed.
2. **Sibling default (§7.3):** when a new regional locale has no base-language
   locale, its fallback is set automatically to an existing sibling
   (alphabetically first if several). It is shown and editable, never hidden.
3. **Catalog as the shared contract (§5.1):** the web app type-imports the CMS
   catalog across the two package directories via an alias. This avoids a root
   workspace (decision 1a) while keeping keys type-checked.

## 14. As built (2026-11-10)

Implemented per `docs/plans/cms.md`. Deviations and clarifications:

1. **SvelteKit 2.** The web app moved from SvelteKit 3.1.1 to 2.59.1 with the
   official Svelte toolchain (plan, Phase 0), because the sandbox registry has
   no compatible Cloudflare adapter. It is one revertable commit. Bindings are
   read from `platform.env`.
2. **Runtime import of locale rules.** Besides type-importing the catalog, the
   website imports `negotiate`/`parseAcceptLanguage` from
   `$cms/locales` at runtime, so negotiation matches the CMS exactly. The
   module is dependency-free.
3. **Outage back-off (§9.4).** After a failed CMS call, the web isolate reuses
   the stale or snapshot copy for 60 s before trying again, so visitors don't
   each wait for the 2 s timeout during an outage. A bundle request for a
   locale that was disabled meanwhile (`404`) falls back to the default
   locale's bundle.
4. **Language switcher** links use `data-sveltekit-reload` (full page load), so
   `<html lang>` and all server-rendered copy change together. The `lang`
   cookie is `HttpOnly`.
5. **Codes.** The resolver returns `code` on `needs_input` (`RANGE`,
   `EXPLICIT_TIMEZONE`, `CHOOSE_DATE`, `DATE_INCOMPLETE`, `TIME_MISSING`,
   `CHOOSE_PLACE`, `PLACE_NOT_FOUND`, `TIME_SKIPPED`, `TIME_AMBIGUOUS`,
   `TIME_IN_FUTURE`) and no `message`. The previously shared `INVALID_INPUT`
   error was split so each message keeps its own copy: `INVALID_BIRTH`,
   `EMPTY_INPUT`, `INPUT_TOO_LONG`, `INVALID_INPUT`. The worker adds
   `NO_VERIFIED_DATA`. Mapping lives in `src/lib/messages.ts`.
6. **Inventory.** 51 reference entries and 166 `ui` strings, including two new
   strings: `language.switcher` and `details.unavailable` (shown if a reference
   entry is missing).
7. **Not treated as copy (unchanged, English):**
   - The prefilled birth sentence (`"{date} at {time} in {place}"` in the
     editor) is input for the English sentence parser.
   - Date, time and month-label formatting (`birth-display.ts`, resolver date
     labels) is out of scope (§4).
   - House-system names reported by the engine (`chart.house_system`) are shown
     as provided, inside localisable templates.
   - Internal error identifiers and schema diagnostics are never displayed.
   - `src/error.html` (§9.6).
8. **Visible change.** The body details "Sign" value now renders the CMS sign
   name ("Cancer") instead of the raw id ("cancer") that CSS capitalised.
   It looks the same on screen; one Playwright assertion was updated.
9. **Guard.** `scripts/check-copy.mjs` (part of `lint`) uses the Svelte parser
   to reject text nodes with letters and literal `aria-label`, `placeholder`,
   `title`, `alt` or `label` attributes in `src/**/*.svelte`.
10. **CMS test runtime.** `@cloudflare/vitest-plugin` (the renamed
    `vitest-pool-workers`) holds `compatibility_date` at 2026-09-25.
11. **Location.** The CMS lives in `AstrologyEngine-web/apps/cms/`. It was first
    built in `/workspace/apps/cms` and moved there on request. It keeps its own
    `package.json`, lockfile, lint/format configs and tests. The web app's
    oxlint/oxfmt run with `--disable-nested-config` and ignore `apps/**`, and
    Vite ignores `apps/cms/.wrangler/` (local D1 state).
