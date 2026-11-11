# CMS archive import review — 2026-11-11

## Provenance and reconciliation

- Original: `AstrologyEngine-web-2026-11-09-192440.zip`, SHA-256
  `2fddccb333e836fad8cdfe59fab40b880ebe6df9860fb47da52faf065c9e3143`.
- Returned: `478fcd8d-824d-4b97-8f19-720441173f5a_6_a_all_code.tar.gz`, SHA-256
  `2ed3a03bd20f2bb39a5f857ccd6665492a1791cf2a4fd6216bae4803c201b623`.
- Recorded source: `18e4914f3dd39bacd517e67f36a787d5c8846a17`, verified as a
  commit in this repository and an ancestor of fetched `origin/main`.
- Import base: `0e6eb14edd153f572c68cfd016a72cd757462eeb`.
- Branch: `import/cms-archive-20261111`.

Both project wrappers map `AstrologyEngine-web/` to the repository root. The
nested `apps/cms/package.json` belongs to the added CMS package. The loose
`docs/{plans,designs,runbooks}/cms.md` files map to the corresponding repository
documents. No mappings collide. No unchanged runtime atlas or engine assets are
replaced, and files omitted from both archives remain untouched.

Text changes were reconciled first against recorded source using the export as
ancestor, then against the import base using recorded source as ancestor. No
text conflicts or binary replacements were encountered. The export README was
transformed, so only its CMS additions were applied manually to the repository
README; export boilerplate and sanitization notices were not imported.

## Review and corrections

Reviewed the complete source delta, package scripts, both dependency graphs and
lockfiles, build/test configuration, local and remote maintenance commands,
D1 migration, authentication, network access and credential handling before
running imported code. Installs disabled lifecycle scripts. Maintenance commands
that deploy, seed remote databases or apply remote migrations were not run.

- Replaced imported error classes with functional error factories.
- Restored 47 missing optional native package entries in each lockfile from the
  original export, requiring exact version matches. The returned lockfiles
  otherwise fail on macOS because native formatter, linter and bundler bindings
  were pruned. Selected package versions were preserved.
- Preserved repository README context, agent instructions, workflows, release
  metadata and existing documentation; formatted imported documents and touched
  source to repository checks. Retained the existing editorial-document format
  exclusion because that document was omitted from the export.
- Static `static/content/` snapshots were excluded as generated output; the
  build regenerates them from the retained English seed.
- The Svelte autofixer reported no issues in the changed components. Its
  suggestions about existing DOM bindings and selection-reset effects were
  reviewed; those established interactions were retained.

## Validation

Executed using Node 24.10.0 and Bun 1.3.14. A local ignored Node executable
link ensured Bun subprocesses used the pinned Node instead of the user's default.

| Check                                                                                | Result                                                         |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Frozen dependency installs, lifecycle scripts disabled                               | Web and CMS passed after lockfile repair                       |
| Web sync, Svelte check, TypeScript check, lint/copy guard, format check              | Passed; Svelte reported zero errors and warnings               |
| CMS TypeScript check, lint, format check                                             | Passed                                                         |
| Node script tests                                                                    | 15 passed                                                      |
| Web verification tests                                                               | 32 passed                                                      |
| CMS Vitest/local workerd/D1 tests                                                    | 158 passed, 14 files                                           |
| Full web production build                                                            | Passed                                                         |
| Web staging and alpha deploy dry runs                                                | Passed; no upload                                              |
| CMS staging and alpha deploy dry runs                                                | Passed; no upload                                              |
| Playwright, local English/pseudo-locale/CMS-down projects                            | 53 passed, two workers, 56.4 seconds                           |
| Gitleaks, external default-rule configuration, inline allows ignored, full redaction | Initial candidate and final staged scans passed; zero findings |

Sandbox localhost restrictions required running the CMS and browser tests outside
the sandbox. The first verification attempt preceded successful SvelteKit sync
and could not resolve the shared alias; after sync all 32 tests passed. Initial
native-binding failures were resolved by the lockfile repair above. The full
build succeeded despite a sandbox restriction on Wrangler's home-directory log;
later checks redirected Wrangler logs to private temporary files.

Archived plan/design outcome claims describe the returned coding environment.
The results above are from this import run. No deployment, remote migration or
remote seed was performed. Cloudflare provisioning and hosted acceptance remain
separate.

## Deployment limitations

The CMS staging/alpha database IDs are placeholders. The CMS must be provisioned,
migrated and seeded before the web binding is deployed. Existing CI/release and
preview workflows were omitted from the export and remain unchanged: they do
not yet run CMS checks or set `CMS_SNAPSHOT_ORIGIN` for deployed builds. Follow
the runbook and complete that release wiring before merging for deployment.

The repository automatically deploys PR previews when a same-repository PR is
opened, including draft PRs. Opening a PR therefore needs the user's explicit
approval of that side effect under the import skill's no-deployment constraint.

## Export delta inventory

### Additions (76)

- `apps/cms/.dev.vars.example`
- `apps/cms/.gitignore`
- `apps/cms/.oxfmtrc.json`
- `apps/cms/.oxlintrc.json`
- `apps/cms/README.md`
- `apps/cms/bun.lock`
- `apps/cms/migrations/0001_init.sql`
- `apps/cms/package.json`
- `apps/cms/scripts/dev-e2e.ts`
- `apps/cms/scripts/seed.ts`
- `apps/cms/scripts/tsconfig.json`
- `apps/cms/seed/en.json`
- `apps/cms/src/app.ts`
- `apps/cms/src/auth.ts`
- `apps/cms/src/catalog-schema.ts`
- `apps/cms/src/catalog.ts`
- `apps/cms/src/content.ts`
- `apps/cms/src/cors.ts`
- `apps/cms/src/coverage.ts`
- `apps/cms/src/db.ts`
- `apps/cms/src/env.ts`
- `apps/cms/src/fields.ts`
- `apps/cms/src/http.ts`
- `apps/cms/src/index.ts`
- `apps/cms/src/locales.ts`
- `apps/cms/src/placeholders.ts`
- `apps/cms/src/routes/admin.ts`
- `apps/cms/src/routes/public.ts`
- `apps/cms/src/seed.ts`
- `apps/cms/src/write.ts`
- `apps/cms/test/admin-locales.test.ts`
- `apps/cms/test/admin-reports.test.ts`
- `apps/cms/test/admin-translations.test.ts`
- `apps/cms/test/auth.test.ts`
- `apps/cms/test/catalog.test.ts`
- `apps/cms/test/cors.test.ts`
- `apps/cms/test/env.d.ts`
- `apps/cms/test/fields.test.ts`
- `apps/cms/test/fixtures.ts`
- `apps/cms/test/health.test.ts`
- `apps/cms/test/helpers.ts`
- `apps/cms/test/http.test.ts`
- `apps/cms/test/locales.test.ts`
- `apps/cms/test/public-content.test.ts`
- `apps/cms/test/public-locales.test.ts`
- `apps/cms/test/seed.test.ts`
- `apps/cms/test/setup.ts`
- `apps/cms/test/worker.test.ts`
- `apps/cms/tsconfig.json`
- `apps/cms/vitest.config.ts`
- `apps/cms/wrangler.jsonc`
- `scripts/check-copy.mjs`
- `scripts/check-copy.test.mjs`
- `scripts/cms-snapshot.mjs`
- `scripts/cms-snapshot.test.mjs`
- `src/app.d.ts`
- `src/error.html`
- `src/hooks.server.ts`
- `src/lib/LanguageSwitcher.svelte`
- `src/lib/copy/copy.ts`
- `src/lib/copy/index.svelte.ts`
- `src/lib/labels.ts`
- `src/lib/messages.ts`
- `src/lib/rulers.ts`
- `src/lib/server/cms/index.ts`
- `src/lib/server/cms/locale.ts`
- `src/lib/server/cms/source.ts`
- `src/routes/+layout.server.ts`
- `svelte.config.js`
- `tests/cms-down.spec.ts`
- `tests/fixtures/cms-pseudo-locale.json`
- `tests/i18n.spec.ts`
- `tests/locale.spec.ts`
- `verification/content-source.test.ts`
- `verification/copy.test.ts`
- `verification/locale.test.ts`

### Modifications (28)

- `.gitignore`
- `.oxfmtrc.json`
- `.oxlintrc.json`
- `README.md`
- `bun.lock`
- `package.json`
- `playwright.config.ts`
- `src/app.html`
- `src/lib/BirthEdit.svelte`
- `src/lib/Details.svelte`
- `src/lib/DetailsShell.svelte`
- `src/lib/ExplorerChart.svelte`
- `src/lib/GroupedPicker.svelte`
- `src/lib/MobileWheel.svelte`
- `src/lib/ReferenceDetails.svelte`
- `src/lib/SettingsControls.svelte`
- `src/lib/Wheel.svelte`
- `src/lib/calculation/worker.ts`
- `src/lib/server/birth/resolve.ts`
- `src/lib/wheel/body-symbols.ts`
- `src/routes/+page.svelte`
- `src/routes/api/resolve-birth/+server.ts`
- `src/routes/app/+page.svelte`
- `tests/exploration.spec.ts`
- `tsconfig.json`
- `verification/birth.test.ts`
- `vite.config.ts`
- `wrangler.jsonc`

### Deletions (4)

- `scripts/editorial/review-packet.ts`
- `src/cloudflare.d.ts`
- `src/lib/exploration-content.ts`
- `src/lib/reference-content.ts`

### Relocations (3)

- Loose `docs/plans/cms.md` → repository `docs/plans/cms.md`.
- Loose `docs/designs/cms.md` → repository `docs/designs/cms.md`.
- Loose `docs/runbooks/cms.md` → repository `docs/runbooks/cms.md`.

### Exclusions (76 generated files; one loose attachment)

The following paths are relative to the returned project wrapper. Wrangler
files are local databases, cache state and compiled bundles; test results and
static output are generated. The loose screenshot is a reference attachment.

- `.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite`
- `.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-shm`
- `.wrangler/state/v3/cache/miniflare-CacheObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/cache/miniflare-CacheObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/cache/miniflare-CacheObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/cache/miniflare-CacheObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8787/v3/r2/miniflare-R2BucketObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8787/v3/r2/miniflare-R2BucketObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8787/v3/r2/miniflare-R2BucketObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/cache/miniflare-CacheObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/cache/miniflare-CacheObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/cache/miniflare-CacheObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/d1/miniflare-D1DatabaseObject/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/d1/miniflare-D1DatabaseObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/flagship/miniflare-flagship-FlagshipObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/kv/miniflare-KVNamespaceObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/a590acd76969f996ec6e4b599c3c09f58c283a76f2d61392b5d3046caf557602.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/observability/miniflare-wobs-trace-store/metadata.sqlite-wal`
- `apps/cms/.wrangler/e2e-8788/v3/r2/miniflare-R2BucketObject/metadata.sqlite`
- `apps/cms/.wrangler/e2e-8788/v3/r2/miniflare-R2BucketObject/metadata.sqlite-shm`
- `apps/cms/.wrangler/e2e-8788/v3/r2/miniflare-R2BucketObject/metadata.sqlite-wal`
- `apps/cms/.wrangler/tmp/bundle-0OwPZ9/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-0OwPZ9/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/bundle-BiQ1mU/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-BiQ1mU/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/bundle-GyF2R0/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-GyF2R0/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/bundle-Liu2fN/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-Liu2fN/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/bundle-Q5pIml/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-Q5pIml/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/bundle-pFgW1y/middleware-insertion-facade.js`
- `apps/cms/.wrangler/tmp/bundle-pFgW1y/middleware-loader.entry.ts`
- `apps/cms/.wrangler/tmp/dev-1fUJOK/index.js`
- `apps/cms/.wrangler/tmp/dev-1fUJOK/index.js.map`
- `apps/cms/.wrangler/tmp/dev-87lPSt/index.js`
- `apps/cms/.wrangler/tmp/dev-87lPSt/index.js.map`
- `apps/cms/.wrangler/tmp/dev-9ZJcVp/index.js`
- `apps/cms/.wrangler/tmp/dev-9ZJcVp/index.js.map`
- `apps/cms/.wrangler/tmp/dev-N9tWXw/index.js`
- `apps/cms/.wrangler/tmp/dev-N9tWXw/index.js.map`
- `apps/cms/.wrangler/tmp/dev-QRbg6t/index.js`
- `apps/cms/.wrangler/tmp/dev-QRbg6t/index.js.map`
- `apps/cms/.wrangler/tmp/dev-uIy3N9/index.js`
- `apps/cms/.wrangler/tmp/dev-uIy3N9/index.js.map`
- `static/calculation-worker.js`
- `static/content/en.json`
- `static/content/index.json`
- `static/release.json`
- `test-results/.last-run.json`
- Loose `pasted-20261110-1.png`.
