# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.

## Build the calculation engine

Build the browser Wasm wrapper from the sibling `../library` source tree before
running the website or its checks. The annual ephemeris `.bin` files and
`static/engine/ephemeris/index.json` remain included, as does the independent
GeoNames atlas in `static/atlas/`. Only the generated Wasm wrapper and its
JavaScript/TypeScript bindings must be built locally.

Use the library's `rust-toolchain.toml`,
`examples/configurable-chart/README.md`, and `tools/notices/README.md` for the
selected source revision. The current library requires Rust 1.96.0 with the
`wasm32-unknown-unknown` target, a native Rust build environment, Bun 1.3.14,
wasm-bindgen-cli 0.2.122, and `tar`. Install these prerequisites before building;
`WASM_BINDGEN` can select an existing compatible executable. The library must
include its checked-in notice bundles; follow its notice guide if they are stale.

Run from this web repository:

```sh
set -eu
export WEB_ROOT="$PWD"
export LIBRARY_ROOT="$(cd ../library && pwd)"
(
  set -eu
  cd "$LIBRARY_ROOT/examples/configurable-chart"
  bun install --frozen-lockfile
  bun run build:wasm
  bun run check
  mkdir -p "$WEB_ROOT/static/engine"
  cp -R engine/. "$WEB_ROOT/static/engine/"
)
```

Copy the complete wrapper output, including `chart.js`, `chart_bg.wasm`, their
TypeScript declarations, license/notice documents and source archive. Keep
`static/engine/ephemeris/` intact. Building this wrapper does not require
regenerating the dataset or its annual slices. A full dataset supplied with the
library may be used for its own verification, but is not a replacement for the
website's existing slice layout.

### Pin and verify the rebuilt wrapper

The website rejects a Wasm binary whose SHA-256 differs from its checked-in pin.
Compute the hash of the actual build:

```sh
node --input-type=module <<'NODE'
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
console.log(createHash('sha256').update(
  readFileSync('static/engine/chart_bg.wasm'),
).digest('hex'));
NODE
```

When adopting a rebuilt wrapper, review and update these records together:

- `src/lib/calculation/worker.ts`: `WASM` and the actual library `engineCommit`.
- `src/lib/calculation/snapshot.ts`: matching `wrapperSha256` and `engineCommit` literals.
- `verification/engine-assets.test.ts`: expected Wasm hash.
- `docs/calculation-provenance.md`: library revision, Wasm hash and verification evidence.

Record the exact library source commit even if its directory has no Git metadata.
Do not change dataset/index hashes, dataset fingerprint, the slice map or segment
count when reusing the included ephemeris files. `supplementarySourceCommit`
identifies separate website adaptation code and also remains unchanged.
Preserve integrity checks rather than disabling them. The rebuilt library's
`calculate(bytes, JSON-request)` export must remain compatible with
`src/lib/calculation/chart.ts` and the website's requested settings.

Run the development checks below, including `bun test verification`, the web
build and browser tests with the CMS installed. `bun run worker:build` builds the
JS worker, not the Rust/Wasm wrapper. CI/deployment must build the same wrapper,
include its notices, and verify its pin before packaging. That provisioning is
not yet configured; a fresh checkout is not ready for chart calculation or
deployment until the wrapper is prepared.

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
