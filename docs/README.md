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