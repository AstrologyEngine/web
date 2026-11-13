# Standalone CMS extraction

CMS source, D1 migrations, tests and operations docs moved from `apps/cms` to
[AstrologyEngine/cms](https://github.com/AstrologyEngine/cms), initially based on
web commit `4f4348aaa24829c4db0f21d799c970533cdafe61`. Existing git history and
archive-import records are retained here.

Web consumes the exact GitHub release tarball for `@astrologyengine/cms-contract`.
The package contains catalog types, locale helpers and baseline copy; regular
web installs and builds need no CMS checkout. Runtime reads still use HTTP in
development and the `CMS` Worker service binding when deployed. No API or D1
schema change is introduced by extraction.

`bun run dev:stack` runs sibling checkouts and temporarily links the local
contract. `CMS_REPO_PATH`, `WEB_PORT` and `CMS_PORT` select a different worktree
and ports. SIGINT/SIGTERM restore the pinned package and stop owned processes.
Do not run two stacks from one web checkout. If forcibly killed, inspect
`.cache/cms-stack-lock` and ensure its PID is no longer running; remove
only the stack-created package symlink, rename the recorded `.stack-backup`
back to the package path, then remove the lock. Never delete a backup blindly.

Browser tests start isolated CMS instances from the chosen checkout. CI obtains
that checkout's exact SHA from the installed contract's `cmsRevision`. Fixtures
are resolved from web, independently of checkout layout.

Deployment and preview creation require repository variable
`CMS_DEPLOY_ENABLED=true`, enabled only after the hosted setup gate in
[issue #39](https://github.com/AstrologyEngine/web-issues/issues/39). CMS deploys
and seeds first. Deployed web snapshots then fetch from the matching staging
or alpha CMS and fail the build if unreachable. Preview cleanup remains active.
Local builds use package baseline copy when `CMS_SNAPSHOT_ORIGIN` is absent.

## Extraction verification

The initial CMS release is `v0.1.0`, source commit
`e69a53e345c97a86d7cfb866cd0fcacea508963e`. Its hosted CI passed:
https://github.com/AstrologyEngine/cms/actions/runs/43506681296.

Local checks passed: 158 CMS tests, eight CMS packaging/release tests, 17 web
Node tests, 36 web verification tests and 65 browser tests across all three
projects. Both applications passed type/lint/format checks and staging/alpha
Worker dry runs. The real stack was exercised with a custom checkout path
containing spaces and `$`, alternate ports, watched contract/seed edits,
restart persistence, the review wrapper, a competing launcher, and SIGTERM
restoration without manifest/lockfile changes. Hosted resources and service
binding acceptance remain unverified under issue #39.
