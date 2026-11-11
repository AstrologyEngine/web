# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.

## Development

Use Node 24.10.0 and Bun 1.3.14.

```sh
bun install --frozen-lockfile
(cd apps/cms && bun install --frozen-lockfile)
bun run sync
bun run dev
```

Before committing: `bun run check`, `bun run check:ts`, `bun run lint`,
`bun run format:check`, `bun run build`, both environment dry runs, and
`bun run test:browser` (install Chromium with `bunx playwright install chromium`).

## CMS copy

The [CMS Worker](apps/cms/README.md) stores website text and reference content.
See the [design](docs/designs/cms.md), [plan](docs/plans/cms.md) and
[operations runbook](docs/runbooks/cms.md).

Start `bun run dev:e2e` in `apps/cms` in a separate terminal for a fresh local
CMS on port 8787. The web server uses `CMS_ORIGIN` (default
`http://127.0.0.1:8787`); deployed Workers use the `CMS` service binding.
The server negotiates `?lang`, the language cookie and `Accept-Language`.
A language switcher appears when multiple locales are enabled.

Dev and build generate outage snapshots in `static/content/` from the English
seed. Set `CMS_SNAPSHOT_ORIGIN` to the target CMS for deployed builds; a failed
snapshot fetch fails the build. Provision and seed the CMS before deploying the
web service binding, following the runbook. Remote database IDs are placeholders.

The imported toolchain uses SvelteKit 2.59.1, Cloudflare adapter 7.2.9 and the
official Svelte compiler, with oxfmt and Prettier for formatting. Node and Bun
pins remain unchanged.

Run `node --test scripts/*.test.mjs` and `bun test verification` alongside the
web checks above. Run `test`, `check`, `lint` and `format:check` in `apps/cms`.
Browser tests start two local CMS instances and three web servers to cover
English, a partial pseudo-locale and CMS outages. `PLAYWRIGHT_PORT` changes the
base web port; `E2E_BASE_URL` uses an existing server;
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` optionally selects a local Chromium executable.
