# Lahiri integration prerequisite

Inspected 2026-11-10 for [Compare three fixed zodiac systems while preserving the chosen house system](https://github.com/AstrologyEngine/web-issues/issues/30). This is a read-only investigation of engine state, not a new implementation or numerical acceptance report.

## Finding

Reuse the existing engine effort: [feat: add Lahiri chart reference (benchmark alignment pending)](https://github.com/AstrologyEngine/library/pull/9). It is open and draft, on `feat/lahiri` at `2b86542`, with an explicit consumer-rollout exclusion. Its local worktree is `/Users/jacksteam/Documents/AstrologyEngine/library/.worktrees/lahiri`; it was clean when inspected. Do not duplicate that work, copy its unaccepted binary into the website, or choose another Lahiri model while treating the existing effort as absent.

The refreshed engine default `e47f53bdc00875b4e03885571f2461617da0971d` exposes Tropical, Fagan–Bradley and True Sky, without Lahiri. Its unified `calculate_chart` pipeline owns reference offset, daily-rate correction, projection, sign assignment and house construction. Use the accepted source revision rather than assuming the candidate branch is ready for consumers. [Current configuration](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/src/conventions.rs), [shared pipeline](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/src/chart.rs).

## Existing numerical contract and acceptance gap

The candidate already selects current PAC/Indian Astronomical Ephemeris Lahiri: J2000 mean offset 23°51′25.53″ and the publication's formula introduced in 2021, evaluated in TT, plus the engine's nutation for true-equinoctial tropical coordinates. It adds the reference to Rust and Wasm through the shared projection pipeline. Its stated helper range is 1800–2200 TT, additionally restricted by dataset coverage. These are candidate contracts, not a fresh endorsement of full-chart accuracy. [Candidate implementation and tests](https://github.com/AstrologyEngine/library/blob/2b86542/src/sidereal.rs), [candidate convention notes](https://github.com/AstrologyEngine/library/blob/2b86542/docs/chart-conventions.md#lahiri).

The official [IMD publication page](https://mausam.imd.gov.in/responsive/indianAstronomicalEphemeris.php) identifies PAC as publisher and links the 2027 publication archive. The candidate cites printed pages 382 and 423 for its mean formula and nutation relationship. This investigation verified the live publisher/index link; it did not independently inspect the archive pages or rerun numerical comparisons.

The latest PR description is more current than the candidate's initial five-chart notes: reference transforms pass all 125 dates; matched-TT tropical bodies pass 123/125, with remaining Saturn and Ceres discrepancies. Whole Sign/Equal geometry passes 110/125 per zodiac and Placidus 109/121 admitted cases. Polar orientation, time conventions, remaining frame errors and fitting-versus-source behavior remain follow-ups. Passing regular CI does not clear these numerical acceptance gaps. The PR remains draft and explicitly excludes rollout. [Current investigation and acceptance status](https://github.com/AstrologyEngine/library/pull/9).

## Verification and distribution constraints

The engine [AGENTS.md](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/AGENTS.md#swiss-ephemeris-prohibition) prohibits Swiss Ephemeris use in runtime, development, tests, comparisons, and derived reference artifacts. An executable Swiss oracle or fixtures generated from it is therefore unavailable under current instructions. Discussion in prose is permitted; that exception does not authorize execution or copied code. Continue the existing approved benchmark investigation and permitted PAC/JPL source checks; do not introduce a new comparison harness using prohibited software.

The current engine is MPL-2.0, including its first-party adapters. Rebuilt browser distributions must preserve notices and ship the corresponding source snapshot (`ASTROLOGY_ENGINE_SOURCE.tar.gz`) alongside Wasm. The website's MIT license does not remove those covered-file requirements. [Distribution instructions](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/THIRD_PARTY_NOTICES.md).

## Consumer handoff after engine acceptance

1. Resume the existing engine PR's benchmark prerequisites and record acceptance before consumer rollout. No new product choice of zodiac is necessary; fixed Lahiri is already approved.
2. Pin the accepted engine commit, build the browser adapter from that exact source, preserve its notices/source snapshot, and record the new Wasm hash. The documented build needs Rust 1.96, Bun 1.3.14, `wasm32-unknown-unknown`, and wasm-bindgen-cli 0.2.122. The first three were locally available; `wasm-bindgen` was absent from PATH. [Build guide](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/examples/configurable-chart/README.md), [build script](https://github.com/AstrologyEngine/library/blob/e47f53bdc00875b4e03885571f2461617da0971d/examples/configurable-chart/build-wasm.ts).
3. Update website settings and chart schemas to admit `lahiri`, the Vedic preset, help text, worker hash and snapshot provenance together. Retain the existing dataset unless evidence requires a separately validated change. The website currently pins engine `b2bd547...` and Wasm `22c1aa9...`; changing a label alone cannot satisfy the ticket. [Worker](../../src/lib/calculation/worker.ts), [snapshot validation](../../src/lib/calculation/snapshot.ts), [settings](../../src/lib/settings.ts).
4. Validate zodiac and requested-house independence across all three systems, actual fallback metadata, native/Wasm behavior, browser interactions, bounded measurement events, and staged revision. Engine numerical acceptance, website checks, CI, staging behavior and explicit product acceptance remain separate gates.

No source code, engine worktree, benchmark data or product settings were changed by this investigation.
