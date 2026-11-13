# Astrology Engine web

Natal Chart Explorer website built with SvelteKit, strict TypeScript, Bun and Cloudflare Workers. The current candidate supports transient birth entry, chart exploration and three astrology systems; editorial review and candidate acceptance remain pending.

## Build the calculation engine

The calculation engine is built from the sibling `../library` source tree.
`static/engine/` is generated locally and is not committed. The GeoNames atlas
in `static/atlas/` is a separate input and remains included.

Before running the website or its checks, provide the library source and its
compatible `HDCHEB01` ephemeris dataset (`cheb.bin`). Keep the full dataset outside
this web repository. The library's `README.md`, `rust-toolchain.toml`,
`examples/configurable-chart/README.md`, and `tools/notices/README.md` are the
build references for that source revision. Record its exact source commit when
preparing the assets, even when the source directory has no Git metadata.

The current library build requires Rust 1.96.0 with the
`wasm32-unknown-unknown` target, a native Rust build environment, Bun 1.3.14,
wasm-bindgen-cli 0.2.122, and `tar`. Install those prerequisites before building;
`WASM_BINDGEN` can select an existing compatible wasm-bindgen executable.
The library must include its checked-in notice bundles. If the build reports
stale notices, follow its notice guide to refresh and verify them.

Run the following from this web repository, setting `EPHEMERIS_FILE` to the
absolute path of the supplied dataset. Use an empty `static/engine/` destination;
for a rebuild, preserve or move aside existing assets before starting so files
from different builds cannot be mixed.

```sh
set -eu
export EPHEMERIS_FILE=/absolute/path/to/cheb.bin
export WEB_ROOT="$PWD"
export LIBRARY_ROOT="$(cd ../library && pwd)"
test -f "$EPHEMERIS_FILE"
test ! -e "$WEB_ROOT/static/engine"

(
  set -eu
  cd "$LIBRARY_ROOT"
  cargo build --locked --release -p dataset-builder
  cd examples/configurable-chart
  bun install --frozen-lockfile
  bun run build:wasm
  bun run check
  mkdir -p "$WEB_ROOT/static/engine"
  cp -R engine/. "$WEB_ROOT/static/engine/"
  bun prepare-segments.ts "$EPHEMERIS_FILE" "$WEB_ROOT/static/engine/ephemeris"
  bun verify-segments.ts "$EPHEMERIS_FILE" "$WEB_ROOT/static/engine/ephemeris"
)
```

Stop if any command fails. The Wasm build produces `chart.js`, `chart_bg.wasm`
and their TypeScript declarations. Copy the whole `engine/` output, including
its license, notice documents and source archive. The segment preparation step
produces `ephemeris/index.json` and hash-named binary files under
`ephemeris/<dataset-sha256>/`. A full `cheb.bin` alone is not the website's expected
asset layout. Segment verification checks full-versus-sliced parity in the
library's Wasm adapter; it does not establish website compatibility.

### Pin and verify the rebuilt assets

The website deliberately rejects assets with unexpected hashes. Its existing
pins describe the previous engine build; copying newly built files alone is
not enough. After selecting and reviewing a new library revision or dataset,
calculate the asset identities from the actual output:

```sh
node --input-type=module <<'NODE'
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const indexBytes = readFileSync('static/engine/ephemeris/index.json');
const index = JSON.parse(indexBytes);
console.log(JSON.stringify({
  wasmSha256: hash(readFileSync('static/engine/chart_bg.wasm')),
  indexSha256: hash(indexBytes),
  datasetSha256: index.source.sha256,
  datasetFingerprint: index.source.engineFingerprint,
  segmentCount: index.segments.length,
  birthCoverageUtc: index.birthCoverageUtc,
  slices: Object.fromEntries(index.segments.map(s => [s.year, s.sha256])),
}, null, 2));
NODE
```

Update these checked-in integrity/provenance records together:

- `src/lib/calculation/worker.ts`: `WASM`, `INDEX`, `DATASET`,
  `engineCommit`, and `datasetFingerprint`.
- `src/lib/calculation/snapshot.ts`: the matching provenance literals.
- `src/lib/calculation/slices.json`: the complete year-to-hash `slices` map.
- `verification/engine-assets.test.ts`: expected Wasm, index and dataset hashes,
  and the segment count for the selected coverage.
- `docs/calculation-provenance.md`: source revision, dataset identity,
  fingerprint, asset hashes, and verification evidence.

Use the library source commit for `engineCommit`, not the web commit. The
`supplementarySourceCommit` identifies separate website adaptation code and does
not change simply because the calculation engine is rebuilt. Preserve integrity
checks; do not remove them to accept a mismatching build. The library's
`calculate(bytes, JSON-request)` export must still satisfy
`src/lib/calculation/chart.ts` and the website's requested settings.

Then run the development checks below, including
`bun test verification/engine-assets.test.ts`, the full verification suite, the
web build, and browser tests with the CMS installed. Building the JS worker with
`bun run worker:build` does not compile Rust or prepare ephemeris assets.

CI and deployment must provision the same library revision and dataset, build
the assets with their notices, and verify the checked-in pins before packaging
the website. That provisioning is not yet configured; a checkout without these
assets is not ready for deployment or chart calculation.

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
