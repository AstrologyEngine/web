# Runbook: Astrology Engine CMS

|                   |                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Service**       | `AstrologyEngine-web/apps/cms`: Cloudflare Worker + D1 holding all website copy                                          |
| **Consumers**     | `AstrologyEngine-web` (Service Binding `CMS`); anyone via public GET                                                     |
| **Design / plan** | `docs/designs/cms.md`, `docs/plans/cms.md`                                                                               |
| **Status**        | Verified against the implementation locally (Wrangler 4.156.0, local D1); not yet exercised against a Cloudflare account |

All commands run from `AstrologyEngine-web/apps/cms/` unless noted. `<env>` is `staging` or `alpha`.
Both are production environments for the new site; the legacy site at
`astrologyengine.dev` is not affected by anything here.

## 1. Inventory

| Resource           | Staging                                                           | Alpha                                |
| ------------------ | ----------------------------------------------------------------- | ------------------------------------ |
| Worker             | `astrology-engine-cms-staging`                                    | `astrology-engine-cms-alpha`         |
| D1 database        | `astrology-engine-cms-staging`                                    | `astrology-engine-cms-alpha`         |
| Custom domain      | `cms-staging.astrologyengine.dev`                                 | `cms-alpha.astrologyengine.dev`      |
| Secret             | `CMS_ADMIN_TOKEN` (+ optional `CMS_ADMIN_TOKEN_NEXT`)             | same                                 |
| Var                | `CMS_ALLOWED_ORIGINS=https://staging.astrologyengine.dev`         | `https://alpha.astrologyengine.dev`  |
| Web Worker binding | `astrology-engine-web-staging` → `CMS`                            | `astrology-engine-web-alpha` → `CMS` |
| WAF rule           | Rate limit `/v1/admin/*` on the zone (one rule covers both hosts) | ←                                    |

Local development uses `astrology-engine-cms-local` with a local SQLite D1 under
`AstrologyEngine-web/apps/cms/.wrangler/`; nothing in Cloudflare.

## 2. Prerequisites

- Bun 1.3.14 and Node ≥ 22 (see `AstrologyEngine-web/apps/cms/package.json`); `bun install --frozen-lockfile`.
- Cloudflare access to the account that owns the `astrologyengine.dev` zone.
- Authentication, either:
  - interactive: `bunx wrangler login`, or
  - CI/token: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, where the token
    has the permissions **Account › Workers Scripts: Edit**, **Account › D1:
    Edit**, **Zone › Workers Routes: Edit** and **Zone › DNS: Edit** (the last
    two are needed for custom domains) on the `astrologyengine.dev` zone.
- A password manager entry per environment for the admin token.

Check: `bunx wrangler whoami` shows the right account.

## 3. First-time setup (once per environment)

Do staging first, verify, then repeat for alpha.

### 3.1 Create the database

```sh
bunx wrangler d1 create astrology-engine-cms-<env>
```

Copy the printed `database_id` into `AstrologyEngine-web/apps/cms/wrangler.jsonc` →
`env.<env>.d1_databases[0].database_id` (replacing
`REPLACE_WITH_STAGING_DATABASE_ID` or `REPLACE_WITH_ALPHA_DATABASE_ID`) and
commit it. Database IDs are not secret.

### 3.2 Apply migrations

```sh
bun run migrate:<env>          # wrangler d1 migrations apply DB --remote --env <env>
```

Expect `0001_init.sql ✅`. Re-running is a no-op.

### 3.3 Set the admin token

```sh
openssl rand -base64 48 | tr -d '\n'       # 64 characters; store it in the password manager first
bunx wrangler secret put CMS_ADMIN_TOKEN --env <env>   # paste when prompted
```

Tokens shorter than 32 characters are rejected at runtime: every admin route
answers `503 admin_disabled`. Never put tokens in `wrangler.jsonc`, shell
history, tickets or chat.

### 3.4 Deploy the Worker

```sh
bun run deploy:<env>           # wrangler deploy --env <env>
```

The first deploy also creates the custom domain and its DNS record. It can take
a few minutes before the certificate is active.

### 3.5 Seed English copy

```sh
bun run seed:<env>             # inserts missing rows only; never overwrites edits
```

### 3.6 Verify

```sh
CMS=https://cms-<env>.astrologyengine.dev
curl -s $CMS/health                              # {"ok":true,"version":N}
curl -s $CMS/v1/locales                          # default "en", one locale
curl -s $CMS/v1/content/en | head -c 300; echo
curl -s -H "Authorization: Bearer $CMS_TOKEN" $CMS/v1/admin/coverage   # en complete: true
curl -s -o /dev/null -w "%{http_code}\n" -X PUT $CMS/v1/content/en      # 405
curl -s -o /dev/null -w "%{http_code}\n" $CMS/v1/admin/coverage         # 401
```

Keep `CMS_TOKEN` in your shell only for the session
(`read -rs CMS_TOKEN && export CMS_TOKEN`).

### 3.7 WAF rate-limiting rule (once per zone)

Cloudflare dashboard → `astrologyengine.dev` → Security → WAF → Rate limiting
rules → Create:

- **If incoming requests match:** `(http.host in {"cms-staging.astrologyengine.dev" "cms-alpha.astrologyengine.dev"} and starts_with(http.request.uri.path, "/v1/admin/"))`
- **With the same characteristics:** IP
- **When rate exceeds:** 30 requests per 10 seconds (the lowest period available on all plans)
- **Then:** Block for 10 seconds (longer durations need a paid plan)

Verify from a throwaway shell:
`for i in $(seq 40); do curl -s -o /dev/null -w "%{http_code} " $CMS/v1/admin/coverage; done`
ends in `429`s.

### 3.8 Connect the website

The web Worker's `AstrologyEngine-web/wrangler.jsonc` already binds `CMS` to
`astrology-engine-cms-<env>`. The CMS must exist before the web deploy, or the
web deploy fails on the missing service.

Build the web app against the live CMS so its bundled outage snapshot is current:

```sh
cd ../..                 # from apps/cms to AstrologyEngine-web
CMS_SNAPSHOT_ORIGIN=https://cms-<env>.astrologyengine.dev bun run build
bunx wrangler deploy --env <env>
```

The build **fails** if the snapshot can't be fetched. That is deliberate: a
release must not ship without outage copy.

## 4. Routine deploys

Always in this order:

1. `bun run test` (CMS) and the web quality gates are green.
2. `bun run migrate:<env>`. Migrations are additive-only, so the running Worker
   keeps working.
3. `bun run deploy:<env>`.
4. `bun run seed:<env>`. Safe every time; gives new catalog keys their English
   text.
5. Web: `CMS_SNAPSHOT_ORIGIN=… bun run build` then `wrangler deploy --env <env>`.
6. Smoke: `curl $CMS/health`; load the site; `wrangler tail` shows no
   `cms_fallback` events.

Web PR previews (staging only) bind to the staging CMS and read staging copy.

## 5. Content operations

Examples assume `CMS` and `CMS_TOKEN` are set. Add `-H "X-CMS-Actor: <your name>"`
to every write so the revision history shows who made it.

### 5.1 Edit copy

```sh
# Read the current value and revision
curl -s -H "Authorization: Bearer $CMS_TOKEN" $CMS/v1/admin/entries/ui/landing.hero.title

# Replace it only if nobody changed it since (revision 3 → If-Match "r3")
curl -s -X PUT $CMS/v1/admin/entries/ui/landing.hero.title/translations/en \
  -H "Authorization: Bearer $CMS_TOKEN" -H "X-CMS-Actor: amy" \
  -H 'If-Match: "r3"' -H "Content-Type: application/json" \
  -d '{"text":"Explore your\nbirth chart."}'
```

`412` means someone else edited it first: re-read, merge, retry. Changes show on
the site within about a minute (cache TTL).

Reference entries (`body`, `sign`, `angle`, `aspect`) take
`{"name":…,"insight":…,"keywords":[…]}`; `house` takes
`{"insight":…,"keywords":[…]}`; `ui` takes `{"text":…}`. Placeholders such as
`{date}` must be kept exactly (`422 placeholder_mismatch` otherwise).

### 5.2 Add a language (e.g. Spanish)

1. Create it disabled:
   `curl -s -X POST $CMS/v1/admin/locales -H "Authorization: Bearer $CMS_TOKEN" -H "Content-Type: application/json" -d '{"code":"es","name":"Español"}'`
2. Add translations (`PUT …/translations/es` per entry; scripts may omit
   `If-Match`).
3. Check `GET /v1/admin/coverage`: `missing` should be empty; `fallback` lists
   entries that would show in English.
4. Preview before enabling is not possible through the public API (disabled
   locales return 404), so review the coverage output and the translations
   with `GET /v1/admin/entries/…`.
5. Enable it: `PATCH /v1/admin/locales/es` with `{"enabled":true}`. The site's
   language switcher appears within about a minute, and visitors whose browser
   prefers Spanish get it automatically.
6. Rebuild and redeploy the web app, so the outage snapshot includes Spanish.

**Regional variants.** Create `es-419` (Latin America) and then `es-ES`. When
`es` doesn't exist, `es-ES` falls back to its sibling `es-419` automatically.
Change a fallback with `PATCH /v1/admin/locales/es-ES {"fallback":"es-419"}`.
`GET /v1/locales` shows each locale's effective chain.

### 5.3 Disable or remove a language

- Hide it: `PATCH … {"enabled":false}`. Visitors with that cookie fall back to
  negotiation. Nothing is lost.
- Delete it permanently, including its translations: `DELETE /v1/admin/locales/<code>`.
  Export first (§7.2). `en` cannot be deleted or disabled.

### 5.4 Revert a bad edit

```sh
curl -s -H "Authorization: Bearer $CMS_TOKEN" \
  "$CMS/v1/admin/revisions?collection=ui&key=landing.hero.title&locale=en&limit=5"
```

Take the `before` value of the bad revision and `PUT` it back, with `If-Match`
set to the current revision.

### 5.5 Adding or removing keys (developer workflow)

Keys are code-defined. In a single PR:

1. Add the key to `AstrologyEngine-web/apps/cms/src/catalog.ts` (plus placeholders for `ui` keys).
2. Add its English text to `AstrologyEngine-web/apps/cms/seed/en.json`. The CMS tests fail until
   catalog and seed match.
3. Use it in the site with `t("…")`; type checks fail on unknown keys.

Deploy in the order in §4. Seeding makes the new English text live before the
web release that uses it.

Removing a key: delete it from the catalog, seed and site. Its translations
become orphans (shown in coverage, never served). Clean up with
`DELETE /v1/admin/entries/<collection>/<key>/translations/<locale>`.

## 6. Token rotation

Zero downtime:

1. Generate a new token (§3.3) and `wrangler secret put CMS_ADMIN_TOKEN_NEXT --env <env>`.
2. Switch all admin tooling and people to the new token; confirm it works.
3. `wrangler secret put CMS_ADMIN_TOKEN --env <env>` with the **new** value.
4. `wrangler secret delete CMS_ADMIN_TOKEN_NEXT --env <env>`.

Secret changes take effect on the next request; no redeploy is needed.

## 7. Monitoring, backups and recovery

### 7.1 Monitoring

- Logs: `bunx wrangler tail --env <env> --format pretty`, or Workers
  Observability in the dashboard.
- `cms_write` (CMS): every admin write, with actor, entry and new version.
- `cms_fallback` (web): the site served cached or snapshot copy. Any sustained
  occurrence means the CMS or the binding is unhealthy.
- Health: `GET /health` checks D1. Point an uptime check at it.

### 7.2 Backups

- D1 Time Travel keeps point-in-time history (30 days on Workers Paid, 7 on Free):
  `bunx wrangler d1 time-travel info DB --env <env>`.
- Before risky operations (locale delete, bulk scripts, migrations), export:
  `bunx wrangler d1 export DB --remote --env <env> --output backup-<env>-$(date +%F).sql`.
  Keep exports out of git.

### 7.3 Incidents

| Symptom                               | Impact                                                                                                                                                                                                                      | Action                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CMS Worker erroring or D1 unavailable | Site keeps working: cached copy, then the bundled snapshot (copy as of the last web deploy). Each web isolate retries the CMS at most once a minute, so visitors don't wait on the 2 s timeout. `cms_fallback` in web logs. | Check `/health` and `wrangler tail`. For a bad CMS deploy, run `bunx wrangler rollback --env <env>` (choose the previous version). For a D1 outage, check the Cloudflare status page.                         |
| Wrong or defaced copy                 | Visible within about a minute                                                                                                                                                                                               | Revert via revisions (§5.4). If the cause was a leaked token, rotate it immediately (§6), then review `GET /v1/admin/revisions` for everything since the leak.                                                |
| Bad migration or mass data loss       | Missing or wrong copy                                                                                                                                                                                                       | `wrangler d1 time-travel restore DB --env <env> --timestamp <RFC3339 before the change>`. This restores the whole database; later edits are lost, so export first. Then redeploy the matching Worker version. |
| Web build fails on the snapshot       | No release                                                                                                                                                                                                                  | The CMS isn't reachable from the build machine. Fix the CMS first; do not bypass the check by unsetting `CMS_SNAPSHOT_ORIGIN` for a deployed build.                                                           |
| Admin gets `503 admin_disabled`       | No edits                                                                                                                                                                                                                    | `CMS_ADMIN_TOKEN` is missing or under 32 characters. Set it (§3.3).                                                                                                                                           |
| Admin gets `429`                      | Edits throttled                                                                                                                                                                                                             | WAF rule (§3.7). Slow down scripted writes, or temporarily raise the threshold.                                                                                                                               |

## 8. Local development

```sh
cd AstrologyEngine-web/apps/cms
bun install
bun run dev:e2e          # fresh local D1 → migrate → seed → wrangler dev on :8787
# or: bun run migrate:local && bun run seed:local && bun run dev

cd ../..                 # AstrologyEngine-web
bun run dev              # talks to CMS_ORIGIN (default http://127.0.0.1:8787)
```

Local admin token: copy `.dev.vars.example` to `.dev.vars` and set
`CMS_ADMIN_TOKEN` (at least 32 characters). `.dev.vars` is gitignored.

The web Playwright suite starts its own CMS instances through `dev:e2e` (ports
8787 and 8788, state under `AstrologyEngine-web/apps/cms/.wrangler/e2e-<port>`), so
`AstrologyEngine-web/apps/cms/node_modules` must be installed before running it.

## 9. Maintenance notes

- **Compatibility date:** the CMS pins `compatibility_date` to 2026-09-25, the
  newest supported by the runtime bundled with `@cloudflare/vitest-plugin@1.1.13`.
  When upgrading that plugin, raise the date too and rerun the tests.
- **Migrations:** additive only (new tables or nullable columns). Destructive
  changes go in two deploys: stop using the column, then drop it.
