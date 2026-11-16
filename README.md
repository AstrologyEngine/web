# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.

## Development

Use Node 24.10.0 and Bun 1.3.14.

```sh
bun install --frozen-lockfile
bun run sync
bun run dev
```

Web can install, check and build independently. Without a running CMS, local
requests use baseline copy bundled from the pinned contract package.

For both services, clone [AstrologyEngine/cms](https://github.com/AstrologyEngine/cms)
as sibling `../cms` and run:

```sh
bun run dev:stack
# Other checkout/ports:
CMS_REPO_PATH=/path/to/cms WEB_PORT=5174 CMS_PORT=8789 bun run dev:stack
```

The launcher installs frozen dependencies, migrates/seeds persistent local D1,
watches and temporarily links the local contract, and starts CMS then web.
Ctrl+C stops its processes and restores the pinned package. Each service can
also run separately: start CMS there, then set `CMS_ORIGIN` when starting web
(default `http://127.0.0.1:8787`). `scripts/review.sh` runs checks and browser
tests before starting the same stack; `--serve` starts it without checks.

Before committing: `bun run sync`, `bun run check`, `bun run check:ts`,
`bun run lint`, `bun run format:check`, `node --test scripts/*.test.mjs`,
`bun test verification`, `bun run build`, both environment dry runs and
`bun run test:browser` (install Chromium with `bunx playwright install chromium`).

## CMS copy

[CMS](https://github.com/AstrologyEngine/cms) owns website copy, the typed
catalog, locale helpers and baseline English seed. Web pins
`@astrologyengine/cms-contract` to an exact public GitHub release asset.

New keys: update and release CMS, deploy/seed it, then update web's dependency
URL and lockfile before using those keys. Ordinary content edits use the CMS
admin API and need no web release. See the
[CMS runbook](https://github.com/AstrologyEngine/cms/blob/main/docs/runbooks/cms.md).

Builds bundle outage snapshots from the package's baseline seed by default.
`CMS_SNAPSHOT_ORIGIN` fetches all enabled locales from a live CMS; fetch errors
fail the build. Deployed builds always use their target CMS origin.

Browser tests require a CMS checkout and use isolated databases for English,
a partial pseudo-locale and CMS outages. `CMS_REPO_PATH` overrides the sibling
path; `PLAYWRIGHT_PORT` changes test ports. `E2E_BASE_URL` tests an existing site
without a local CMS checkout. See [extraction details](docs/cms-extraction.md).
