# Implementation plan: Astrology Engine CMS

|             |                                                                       |
| ----------- | --------------------------------------------------------------------- |
| **Status**  | Implemented 2026-11-10 (Phase 0 approved incl. SvelteKit 2 downgrade) |
| **Date**    | 2026-11-10                                                            |
| **Design**  | `docs/designs/cms.md` (rev. 2, approved)                              |
| **Runbook** | `docs/runbooks/cms.md`                                                |

## 0. Findings that shape this plan

Verified in the sandbox before planning (throwaway copies under `/tmp`, repo
untouched):

1. **The web app cannot be installed from this registry.** 21 locked tarballs
   are missing: the entire `@rsvelte/*` toolchain (Svelte compiler override,
   formatter, svelte-check, oxlint plugin), `@sveltejs/adapter-cloudflare@8.0.2`,
   `wrangler@4.157.0` and its `miniflare`/`workerd`, plus a few transitive
   packages.
2. **No available Cloudflare adapter works with SvelteKit 3.1.1.** The only 8.x
   adapter here (`8.0.0-next.6`) calls `generateManifest`, which SvelteKit 3.1
   removed. The adapter that works is `7.2.9`, which needs SvelteKit 2.
3. **A SvelteKit 2.59.1 build is green.** The combination is SvelteKit 2.59.1,
   adapter 7.2.9, the official `@sveltejs/vite-plugin-svelte@7.3.1`,
   `svelte-check@4.7.8` and `wrangler@4.156.0`, with Svelte 5.57.1, Vite 8.3.5
   and TypeScript unchanged. With those versions and the small code changes in
   Phase 0:
   - `build` succeeds;
   - `bun test verification` passes (8/8) and `node --test scripts` passes;
   - **all 43 Playwright tests pass**.
4. **Node 22 is fine.** Wrangler 4.156 requires Node ≥ 22; `wrangler dev`, local
   D1 migrations and the Workers Vitest integration all run on Node 22.21.
5. **Browser binaries can't be downloaded here** (`cdn.playwright.dev` doesn't
   resolve). Chromium 153 from npm (`@sparticuz/chromium`) works with Playwright
   1.64 when passed as `executablePath`.
6. **Workers Vitest integration:** `@cloudflare/vitest-pool-workers` is
   deprecated in favour of `@cloudflare/vitest-plugin@1.1.13` (Vitest 4.1). Its
   bundled runtime supports compatibility dates up to **2026-09-25**, so the CMS
   uses that date.
7. **Formatting:** with `printWidth: 80`, `oxfmt` reproduces the existing
   formatting of all `.ts`/`.js` files. It does not handle `.svelte` files. For
   those, `prettier-plugin-svelte` differs from the current formatting in 7 of
   10 files, so they get a one-time reformat.

## Method: red-green TDD

All new behaviour is built test-first:

1. **Red**: write the smallest test that states the next behaviour, run it and
   confirm it fails _for the expected reason_ (not a typo or a missing import).
2. **Green**: write the least code that makes it pass; run the whole suite.
3. **Refactor** with the suite green.

Each cycle is committed as a pair: `test(scope): … [red]` (only the failing
test), then `feat(scope): …` (code that turns it green). That keeps the red step
visible in history. Only the `[red]` commits are expected to fail; every other
commit is green.

Where TDD doesn't apply, the existing suite is the safety net and must stay
green at every commit:

- Phase 0 (toolchain swap): no new behaviour; the existing 43 Playwright tests,
  verification tests and script tests.
- Phase 6 copy extraction (a refactor with unchanged English output): the
  existing Playwright tests. New behaviour in Phase 6, such as resolver codes,
  placeholder substitution and the hardcoded-copy guard, still goes red-green.

## Phase 0 — Make the web app installable (approved)

Recommended option: move to SvelteKit 2 with the official Svelte toolchain. The
code changes are small, and the alternative (waiting for registry access) blocks
all web work.

**`AstrologyEngine-web/package.json`**

| Package                        | From                                    | To                                                                                                              |
| ------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `@sveltejs/kit`                | 3.1.1                                   | 2.59.1                                                                                                          |
| `@sveltejs/adapter-cloudflare` | 8.0.2                                   | 7.2.9                                                                                                           |
| `@sveltejs/vite-plugin-svelte` | `npm:@rsvelte/vite-plugin-svelte@0.5.3` | 7.3.1 (official compiler); `overrides` removed                                                                  |
| `@rsvelte/svelte-check`        | 0.5.32                                  | replaced by `svelte-check@4.7.8`                                                                                |
| `@rsvelte/fmt`                 | 0.7.25                                  | replaced by `oxfmt` (ts/js/json, already a dependency) + `prettier` / `prettier-plugin-svelte` (`.svelte` only) |
| `@rsvelte/oxlint-plugin`       | 0.2.6                                   | removed (oxlint still lints `<script>` blocks)                                                                  |
| `wrangler`                     | 4.157.0                                 | 4.156.0                                                                                                         |
| `bun.lock`                     | —                                       | regenerated                                                                                                     |

Scripts: `check` → `svelte-check`; `format` / `format:check` → `oxfmt` +
`prettier --plugin prettier-plugin-svelte` on `**/*.svelte`.

**Code changes required by SvelteKit 2:**

- `vite.config.ts`: the adapter moves to a new `svelte.config.js`.
- `tsconfig.json`: `extends: "./.svelte-kit/tsconfig.json"`.
- `$app/env` → `$app/environment`.
- `import { env } from "cloudflare:workers"` → `platform.env` (SvelteKit 2 route
  analysis can't load `cloudflare:` modules). `src/cloudflare.d.ts` is replaced
  by `src/app.d.ts` declaring `App.Platform`.
- `resolve("/app")` adjusted to SvelteKit 2's `resolve` signature.
- `.oxlintrc.json`: plugin reference removed; `.oxfmtrc.json`: `printWidth: 80`.
- The 7 `.svelte` files that Prettier formats differently are reformatted in this
  phase, in their own commit, so no content diffs are mixed in.

**Sandbox-only testing aid:** `playwright.config.ts` reads an optional
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` into `launchOptions.executablePath`. It has no
effect when unset.

**Done when:** `bun install --frozen-lockfile`, `check`, `check:ts`, `lint`,
`format:check`, `node --test scripts/*.test.mjs`, `bun test verification`,
`build` and all 43 Playwright tests pass.

## Phase 1 — CMS scaffold (`AstrologyEngine-web/apps/cms`)

```
apps/cms/
  package.json  bun.lock  tsconfig.json  wrangler.jsonc  vitest.config.ts
  .oxlintrc.json  .oxfmtrc.json  .gitignore  .dev.vars.example  README.md
  migrations/0001_init.sql
  seed/en.json
  scripts/seed.ts
  src/
    index.ts          Hono app, error handler, 404/405, body-size limit
    catalog.ts        collections + keys + ui placeholders (dependency-free, `as const`)
    fields.ts         zod field schemas per collection shape
    locales.ts        canonicalisation, fallback-chain resolution, negotiation helper
    placeholders.ts   extract/compare `{name}` sets
    auth.ts           Bearer check (SHA-256 + timingSafeEqual, rotation, fail-closed)
    cors.ts           allow-list CORS for public routes
    db.ts             D1 queries and write batches (revision + version bump)
    http.ts           JSON errors, ETag helpers
    routes/public.ts  /v1/locales, /v1/content/…, /health
    routes/admin.ts   /v1/admin/…
  test/ …             one file per area (see Phase 4)
```

- Dependencies: `hono`, `zod@4.6.7`. Dev dependencies: `wrangler@4.156.0`,
  `@cloudflare/vitest-plugin@1.1.13`, `vitest@4.1.12`,
  `@cloudflare/workers-types`, `typescript@6.0.3`, `oxlint`, `oxfmt`. All pinned
  exactly, like the web app.
- `wrangler.jsonc`:
  - Top level `astrology-engine-cms-local`, plus `env.staging` and `env.alpha`,
    each with its own `d1_databases` entry (`binding: "DB"`, placeholder
    `database_id`s filled in from the runbook).
  - Custom domains `cms-staging` / `cms-alpha.astrologyengine.dev`.
  - `CMS_ALLOWED_ORIGINS` var per environment.
  - `workers_dev: false`, `preview_urls: false`, observability as in the web
    app, `compatibility_date: "2026-09-25"`.
- Scripts: `dev`, `dev:e2e` (fresh local state → migrate → seed → dev),
  `migrate:{local,staging,alpha}`, `seed:{local,staging,alpha}`,
  `deploy:{staging,alpha}`, `test`, `check`, `lint`, `format`, `format:check`,
  `types` (`wrangler types`).

**Done when:** `bun install`, `check`, `lint` and `format:check` pass, and
`wrangler dev` answers `/health`.

## Phase 2 — Schema, catalog and seed

1. `migrations/0001_init.sql`: schema exactly as design §6.1, plus the seeded
   `meta.content_version = 1` and the `en` locale.
2. **Copy inventory.** Walk every web source file that renders text and record
   each string as a catalog key with its English text. That covers `routes/`,
   every component, `resolve.ts`, `/api/resolve-birth`, the calculation worker,
   `body-symbols.ts` names, the `*-content.ts` files, `<title>`, meta
   description and ARIA labels.
   - Each distinct message gets its own key. For example, the two
     `OUT_OF_RANGE` worker messages become `error.calculation.outOfRange.date`
     and `error.calculation.outOfRange.data`.
   - Output: `src/catalog.ts` and `seed/en.json`, with the English text
     unchanged (existing Playwright text assertions depend on it).
3. `scripts/seed.ts`: read `seed/en.json` and emit SQL with
   `INSERT … ON CONFLICT DO NOTHING` for each translation, plus a
   `content_version` bump. Then run `wrangler d1 execute --file` for `--local`
   or `--remote --env <env>`.

**Done when:** tests (Phase 4) confirm seed ⇔ catalog parity and field validity,
and running the seed twice changes nothing.

## Phase 3 — API

Implemented in this order, each behaviour red-green (test first, see Method):

1. Shared pieces: error shape, 64 KB body limit, JSON content-type enforcement
   on writes, 404/405 handling.
2. Public: `GET /health`, `GET /v1/locales`, `GET /v1/content/:locale`
   (fallback chain, `fallbacks` map, `ETag` / `304` after the single-row version
   read, cache headers), `GET /v1/content/:locale/:collection/:key`, CORS and
   preflight.
3. Auth middleware for `/v1/admin/*`: fail-closed, rotation,
   `WWW-Authenticate`, `Cache-Control: no-store`.
4. Admin locales: list, create (canonicalise, automatic fallback default,
   starts disabled), patch (default locale protections, cycle detection),
   delete.
5. Admin translations: `GET entry`, `PUT` (catalog check, field validation,
   placeholder check, `If-Match` / `If-None-Match` via conditional `UPDATE`,
   revision row, version bump, `X-CMS-Actor`), `DELETE` (default-locale rule,
   orphans allowed).
6. Admin read-only: `GET catalog`, `GET coverage` (missing, fallback-served,
   placeholder mismatches, orphans), `GET revisions` (filters, cursor, limit).
7. Structured `cms_write` log line per write.

## Phase 4 — CMS test suite and quality gates

The tests below are written _during_ Phases 2–3 as the red step of each cycle;
this phase is the final pass on coverage and the gates. Vitest with
`@cloudflare/vitest-plugin`, real local D1 with migrations applied and seeded per
test file:

- `public.test.ts`: bundle shape, `fallbacks`, `404` for disabled/unknown locale,
  `ETag` / `304`, cache headers, single entry, `405` for writes.
- `auth.test.ts`: missing/invalid/valid token, `NEXT` token, short or unset
  token → `503`, no token material in responses.
- `locales.test.ts`: canonicalisation, automatic fallback (base, then sibling),
  cycles, disabled hops skipped, default locale protections, delete nulls
  pointers.
- `translations.test.ts`: catalog enforcement, field validation, placeholders,
  concurrency (`412`), revisions written, version bumped, orphan handling.
- `coverage.test.ts`, `revisions.test.ts`, `cors.test.ts`.
- `seed.test.ts`: parity with the catalog, validity, idempotence.
- `locales-unit.test.ts`: pure chain and negotiation functions.

**Done when:** `bun run test`, `check`, `lint` and `format:check` are green.

## Phase 5 — Web infrastructure

1. `wrangler.jsonc`: `services: [{ binding: "CMS", service: … }]` at top level,
   `env.staging` and `env.alpha`. `App.Platform.env.CMS: Fetcher`.
2. `svelte.config.js`: `kit.alias.$cms = "apps/cms/src"`, used only for
   `import type` from `catalog.ts`.
3. `src/lib/server/cms/`:
   - `client.ts`: the CMS fetch (`platform.env.CMS` in production,
     `CMS_ORIGIN` in dev), 2 s timeout, `If-None-Match`.
   - `source.ts`: the copy source (fresh cache → live → stale cache →
     snapshot), `cms_fallback` logging. Unit-tested with injected fetchers.
   - `negotiate.ts`: `?lang` → cookie → `Accept-Language` → default, using the
     same exact/base/sibling matching as the CMS.
4. `src/hooks.server.ts`: negotiation, cookie, `event.locals.locale`,
   `%lang%` substitution, `Vary: Cookie, Accept-Language`.
5. `src/app.html`: `<html lang="%lang%">`. `src/error.html`: last-resort page.
6. `src/routes/+layout.server.ts`: returns `{ locale, locales, content }`.
   `+layout.svelte` renders the language switcher when more than one locale is
   enabled.
7. `scripts/cms-snapshot.mjs`: writes `static/content/{index,<locale>}.json`,
   from `CMS_SNAPSHOT_ORIGIN` (and fails the build if that fetch fails) or from
   `apps/cms/seed/en.json`. Runs in `dev` and `build` next to
   `build-info.mjs`. `static/content/` is gitignored.

## Phase 6 — Web copy migration

1. `src/lib/copy.ts`: typed `t(key, params)`, `entry(collection, key)`,
   `bodyName`, `signName`, `aspectName`, `\n` line-break helper, missing-key
   behaviour.
2. Migrate components one at a time, running the Playwright suite after each.
   Order: `+page.svelte` (landing), `app/+page.svelte`, `BirthEdit`,
   `SettingsControls`, `ExplorerChart`, `Details`, `ReferenceDetails`,
   `DetailsShell`, `GroupedPicker`, `MobileWheel`, `Wheel`.
3. `rulers` in code as body IDs; `bodySymbols` keeps glyph paths only.
4. Resolver, `/api/resolve-birth` and worker: return codes, no English; the
   client maps codes to `error.*` keys. `verification/birth.test.ts` asserts
   codes.
5. Delete `reference-content.ts`, `exploration-content.ts`,
   `scripts/editorial/review-packet.ts` and the `docs/editorial` ignore entry in
   `.oxfmtrc.json`.
6. Guard: a check that fails when a `.svelte` file contains a bare text node or
   a literal `aria-label` / `placeholder` / `title` string. It runs in `lint` as
   a small script, so new hardcoded copy can't creep back in.

## Phase 7 — Web test projects

The unit and e2e tests for Phases 5–6 behaviour are written first, as the red
step of each cycle. This phase covers the Playwright project wiring and the final
pass.

- `playwright.config.ts` becomes multi-project with these web servers:
  - **default** (the existing 43 tests): CMS `dev:e2e` on 8787 + web on 4173.
  - **i18n**: a second CMS on 8788 seeded with a test-only pseudo-locale
    (`en-XA`, partially translated) + web on 4175. Tests cover `?lang`, cookie
    persistence, `Accept-Language`, the switcher, fallback rendering and
    `<html lang>`.
  - **cms-down**: web on 4174 with an unreachable `CMS_ORIGIN`. Tests cover
    snapshot copy being served and the app still working end to end.
- Unit tests (`bun test`): negotiation, copy source order, `t()` placeholder
  substitution.

**Done when:** all projects are green and all web quality gates from Phase 0
still pass.

## Phase 8 — Documentation

- `docs/runbooks/cms.md` (drafted before implementation, updated at the end).
- `AstrologyEngine-web/apps/cms/README.md`: local development, API quick reference, adding a key.
- `AstrologyEngine-web/README.md`: CMS dependency, `CMS_ORIGIN`,
  `CMS_SNAPSHOT_ORIGIN`, new toolchain, local Playwright browser variable.
- Design doc status set to _Implemented_, with any deviations listed.

## Commits

Phase 0: one self-contained, revertable commit (dependencies, code and reformat). CMS
and web behaviour: `[red]` / green commit pairs per TDD cycle. Phase 6 copy
extraction: one commit per component group. Everything goes to `master` in
`/workspace`. Nothing is
deployed: no Cloudflare credentials exist in the sandbox, and first deploys
follow the runbook.

## Risks

| Risk                                                                                               | Mitigation                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Your real environment has the packages this sandbox lacks, and you'd prefer to stay on SvelteKit 3 | Phase 0 is isolated in its own commits and can be reverted; the later phases don't depend on SvelteKit-3-only APIs.     |
| CMS compatibility date held at 2026-09-25 by the test runtime                                      | Harmless for this Worker; bump it when the Vitest plugin updates (runbook note).                                        |
| Copy inventory misses a string                                                                     | The Phase 6 lint guard, plus a Playwright pass with a pseudo-locale that makes any untranslated English text stand out. |
| Wrangler's local service bindings in `vite dev`                                                    | Not relied on: dev uses `CMS_ORIGIN` over HTTP, as the existing `ASSETS` code does.                                     |
| Snapshot build needs network access to the CMS                                                     | Only deployed builds set `CMS_SNAPSHOT_ORIGIN`; local builds use the seed.                                              |

## Out of scope

Spanish content, locale-aware date formatting, non-English birth-sentence
parsing, an admin UI, real Cloudflare provisioning or deployment, and CI
workflow files (not part of this export).

## Outcome

All phases are complete; deviations are listed in the design doc, §14. The
CMS was then moved from `/workspace/apps/cms` to `AstrologyEngine-web/apps/cms`
(design §14.11).
Everything was verified locally; nothing has been deployed.

| Gate                                                                                 | Result              |
| ------------------------------------------------------------------------------------ | ------------------- |
| CMS `bun run test`                                                                   | 158 tests, 14 files |
| CMS `check`, `lint`, `format:check`, `wrangler deploy --dry-run --env staging/alpha` | pass                |
| Web `check`, `check:ts`, `lint` (incl. copy guard), `format:check`                   | pass                |
| Web `node --test scripts/*.test.mjs`                                                 | 15 tests            |
| Web `bun test verification`                                                          | 32 tests            |
| Web `build`, `wrangler deploy --dry-run --env staging/alpha`                         | pass                |
| Web Playwright (`default`, `i18n`, `cms-down`)                                       | 53 tests            |
