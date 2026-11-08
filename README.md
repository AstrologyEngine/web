# Astrology Engine web

Private Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.
Configuration foundation: web-legacy main `e00a2f9e10aa5b4f338875bc306166bfb939903c`.
Toolchain foundation: plugin main `498e21f61cde2f90760370fe826f27cc6d735d30`.

## Development

Use Node 24.10.0 and Bun 1.3.14.

```sh
bun install --frozen-lockfile
bun run sync
bun run dev
```

Before committing: `bun run check`, `bun run check:ts`, `bun run lint`,
`bun run format:check`, `bun run check:content`, `bun run build`, both environment dry runs, and
`bun run test:browser` (install Chromium with `bunx playwright install chromium`).

The [editorial review packet](docs/editorial/natal-chart-review.md) records outstanding content review. The [measurement guide](docs/beta-measurement.md) describes the local collection and reporting path and its deployment verification limits.

## Delivery

PR CI checks types, lint, formatting, browser behavior, build and Worker packaging.
Main runs those checks once, then deploys staging and maintains the Changesets release PR.
Merge a release PR to publish a GitHub prerelease and deploy its exact tag to alpha.
The app is private and never published to npm. Regular releases do not deploy.

- Staging: https://staging.astrologyengine.dev (`astrology-engine-web-staging`)
- Alpha: https://alpha.astrologyengine.dev (`astrology-engine-web-alpha`)
- Production remains owned by web-legacy; this repository has no production route.

Add a changeset with `bun run changeset` for versioned changes. GitHub prerelease status
controls alpha promotion; package versions use ordinary semantic versioning.
Repository secrets: RELEASE_APP_CLIENT_ID, RELEASE_APP_PRIVATE_KEY,
CLOUDFLARE_API_TOKEN. No credentials belong in files or issue comments.

Deployment concurrency is per target; staging rechecks main before publishing.
`/release.json` identifies the deployed commit and package version.

## Pull request previews

Same-repository PRs deploy public named Workers Previews under staging. GitHub
Deployments links to the stable PR URL; the entire Playwright suite tests the
immutable deployment URL after checking its release SHA. Fork previews are skipped.
Closing or merging deletes the Preview and inactivates GitHub deployments;
reopening recreates it. The shared staging Worker remains running.

Use `bun run test:browser` locally, or set `E2E_BASE_URL` to test a hosted site
without starting Vite. New tests in `tests/` are included automatically. Staging
and alpha run the suite after deployment. Preview E2E failures fail the preview
check; reports and failure traces are uploaded as workflow artifacts.
