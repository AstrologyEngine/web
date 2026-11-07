# Timezone-to-city mapping research

Research for [Define timezone-to-city location mapping](https://github.com/AstrologyEngine/web/issues/7), part of [Port the plugin UI into a standalone astrology explorer](https://github.com/AstrologyEngine/web/issues/5). Checked 2026-11-07. Planning only; no mapping or application code is implemented.

## Finding

A static, versioned lookup generated from GeoNames settlement records and IANA/ECMA identifier rules is feasible. It can deterministically select the largest **recorded population in a chosen snapshot**, rather than assuming the timezone namesake is its largest city. Neither source establishes a globally consistent, current census definition of “largest city.” Universal city coverage and failure behavior need explicit product policy.

## Sources and identifier handling

- [GeoNames export documentation](https://download.geonames.org/export/dump/readme.txt) defines downloadable records containing stable numeric ID, place name, feature classification, country, population, decimal WGS84 latitude/longitude, IANA timezone, and modification date. `allCountries.zip` contains the combined records; `cities500.zip` restricts coverage to population above 500 or selected administrative seats. The latter is convenient for a sample, insufficient as a promise of every inhabited timezone.
- [GeoNames source list](https://www.geonames.org/data-sources.html) shows aggregation from many providers. The export has no population observation year or common city-boundary definition. A record modification date is not a census date. Consequently, a maximum is a dataset result, not proof of the largest contemporary municipality, urban area, or metro area.
- [IANA theory](https://data.iana.org/time-zones/tzdb/theory.html) defines timezones by civil-clock history, not geographic proximity or just current UTC offset. Names are chosen for stability; a timezone namesake does not constitute a population ranking. Do not infer city from the final path component or group cities by present offset.
- [ECMA-402 timezone requirements](https://tc39.es/ecma402/#sec-use-of-the-iana-time-zone-database) preserve country-associated identifiers in `zone.tab`, even where ordinary tzdb builds merge their clocks. They also define country-preserving alias resolution and accommodate delayed adoption of renamed identifiers. Accept both old and new names; do not rely on the generator's installed runtime as the authoritative alias dataset. Read the browser default through `Intl.DateTimeFormat().resolvedOptions().timeZone`, with exception/missing-value handling. Host configuration is an approximation, not measured location.
- [IANA backward links](https://data.iana.org/time-zones/tzdb/backward) include `US/Central → America/Chicago`, `Asia/Calcutta → Asia/Kolkata`, and `Europe/Kiev → Europe/Kyiv`. They also merge `Europe/Amsterdam → Europe/Brussels` and `Africa/Accra → Africa/Abidjan`. Blindly following every link would discard useful country identity.
- [zone.tab](https://data.iana.org/time-zones/tzdb/zone.tab) retains a country-associated geographical identifier; [zone1970.tab](https://data.iana.org/time-zones/tzdb/zone1970.tab) groups clocks across countries and provides principal-location coordinates. Neither contains city populations or geographic boundary polygons. Principal coordinates are not a verified largest-city coordinate source. Although IANA deprecates `zone.tab` for ordinary timezone selection, ECMA explicitly uses it for its country-preserving semantics.

These facts support a geographical lookup identity aligned with ECMA, rather than an equivalence class of all clocks sharing an IANA `Zone`. That alignment is a proposed interpretation of the owner's requirement; it should be confirmed in the follow-up decision.

## Concrete generation approach — proposal, not owner-approved policy

1. Pin a tzdb release, its relevant identifier files (including `zone.tab`, `backward`, and `backzone` where country-preserving resolution requires it), and a dated GeoNames extract. Prefer the full extract when generating the final coverage report; do not ship it to browsers or fetch it per visit.
2. Construct a versioned identifier-to-geographical-key table following ECMA country preservation. Keep geographical `zone.tab` entries distinct; connect spelling/legacy aliases to the appropriate key. Check every GeoNames timezone against that same table. Do not just recursively flatten `backward`; country-preserving cases such as `Pacific/Truk` require the additional ECMA rules. Preserve the original browser identifier for diagnosis.
3. Define eligible settlements explicitly. The sample below uses feature class `P` and only `PPL`, `PPLA`, `PPLA2`, `PPLA3`, `PPLA4`, `PPLA5`, `PPLC`, `PPLG`; positive integer population; finite latitude/longitude within normal bounds. This excludes neighborhoods, historical/abandoned places, and non-settlement administrative areas. The [GeoNames feature code definitions](https://download.geonames.org/export/dump/featureCodes_en.txt) distinguish these categories. Broader small-settlement eligibility, including `PPLL`, `PPLF`, `PPLR`, `STLMT`, and the newly documented `PPLCD`, needs a declared policy before final generation. Do not silently exclude an inhabited region because it lacks a large city.
4. Group by geographical key; rank by population descending, then numeric GeoNames ID ascending. Use the chosen record's point coordinates and name; never sum overlapping city, neighborhood, and metro records. Retain GeoNames ID, country, raw timezone, population, and modification date in provenance.
5. Emit a compact lookup plus coverage/audit report. Every expected geographical identifier must have either an audited selection or an explicit unresolved reason. Flag no-candidate regions, unknown timezone strings, invalid coordinates, unexpected cross-country aliasing, unusual winner changes, and suspicious geography. Maintain reviewed exclusions/overrides with source and reason if policy permits them.
6. The browser performs only lookup. A missing or non-geographical identifier returns a typed unresolved result for the product policy to handle. Never substitute the server's timezone. Deliver ordinary chart inputs to the existing calculation adapter; browser detection and data acquisition stay outside the calculation library.

The ranking, tie rule, selected fields, and coverage checks are engineering proposals. They become a specification only after the outstanding population/coverage policy is settled.

## Direct data checks

Downloaded the official [cities500.zip](https://download.geonames.org/export/dump/cities500.zip) on 2026-11-07. Archive member timestamp: `2026-11-07 03:47:24` (timezone unspecified). SHA-256: `bf2516f404ceefd24e099e48c8cd91730c9b1ab85158dd77eb9d943275d6b072`.

Parsed UTF-8 tab-separated rows using the documented schema, applied the exact sample filter above, and sorted by `(-population, numeric geonameid)` within each **literal GeoNames timezone**. This sample does not implement alias generation. It contained 236,953 records; 194,783 eligible records across 391 literal timezone IDs.

| Literal timezone | Maximum eligible record | ID | Recorded population | Coordinates |
| --- | --- | --- | ---: | --- |
| America/Chicago | Chicago | 4887398 | 2,664,452 | 41.85003, -87.65005 |
| America/Los_Angeles | Los Angeles | 5368361 | 3,820,914 | 34.05223, -118.24368 |
| Asia/Kolkata | Mumbai | 1275339 | 12,691,836 | 19.07283, 72.88261 |
| Europe/Amsterdam | Rotterdam | 2747891 | 868,135 | 51.9225, 4.47917 |
| Africa/Accra | Kumasi | 2298890 | 2,544,530 | 6.68848, -1.62443 |

Mumbai and Kumasi demonstrate why namesake substitution fails. Rotterdam is the maximum **settlement record** in this snapshot (`PPL`); Amsterdam's `PPLC` record has 741,636. No municipality records were compared. This establishes a snapshot ranking only; it does not establish Rotterdam as the largest real-world Dutch city. Mixed population dates/definitions remain a material limitation.

A join against downloaded `zone.tab` found 27 identifiers with no eligible positive-population record in this small extract, including `Australia/Eucla`, `Australia/Lord_Howe`, `America/Adak`, and Antarctic identifiers. This is not proof those places are uninhabited or absent from the full extract. The full extract was not downloaded or audited.

The literal `Pacific/Chatham` maximum was `Windsor Park`, ID `13631316`, population 4,000, coordinates `-36.73966, 174.7423`; `Waitangi`, ID `4032804`, population 140, coordinates `-43.95353, -176.55973`, was another candidate. The separation is an apparent data-quality anomaly requiring review before use; this research has not corrected either record. Numeric validation alone cannot establish geographic correctness.

Downloaded IANA `version` reported `2026f`, matching the [IANA release page](https://www.iana.org/time-zones). Relevant file hashes:

- `zone.tab`: `e2e8e31c4e10f44576c79345e76060591dbb3eef6ce14e006afc8a373caa9593`
- `zone1970.tab`: `5f23781702bf51408ff1581daa109ab3b9257fb433b1554e579d92172892c0cf`
- `backward`: `b8296b9ef1ece72d813878132c0f17e2c52b26af6004eeb9c37d049b64cd9401`

The download URLs are mutable. Hashes identify this checked sample; a future implementation must retain/pin its own source snapshots. No global generated mapping or browser compatibility check was performed.

## Licensing, attribution, and maintenance

GeoNames declares [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) in its export documentation. The license permits adaptation and redistribution with appropriate credit, a license link, and an indication of changes. Proposed attribution: “City data: GeoNames, CC BY 4.0; filtered and ranked by AstrologyEngine,” linked to the source and license. Retain attribution with distributed derived data and in an accessible website credits surface. Placement is a later integration detail, not resolved here.

[IANA's license](https://data.iana.org/time-zones/tzdb/LICENSE) places the data files in the public domain unless otherwise specified. Keep their version/license metadata. Any additional alias dataset would require its own license review; it is not assumed here.

GeoNames offers daily extracts; IANA publishes periodic rule updates. A reproducible build should record URLs, UTC download time, archive/member hashes, tzdb version, generator/policy version, and curated exceptions. Rebuild as a reviewed data change when dependencies update; compare winners, coverage, and aliases before release. No background updating or live third-party lookup is needed. An automatic schedule has not been chosen.

Existing sibling plugin source inspected: `src/lib/server/birth/atlas-row.ts` already models city/population/timezone/coordinates; `scripts/birth/manifest.ts` records GeoNames licensing and SHA-256 asset hashes. Those are useful conventions, but this research does not establish that the shipped atlas has exhaustive timezone coverage or validated city rankings.

## Decisions still requiring the owner

One follow-up grilling ticket can settle the mapping policy, one question at a time:

1. **Meaning of largest city:** Is the maximum eligible GeoNames settlement population in a pinned snapshot sufficient, with reviewed exceptions, or is a common census/urban-area definition required? The former is compact and deterministic but can produce counterintuitive ranks; the latter needs further primary population sources and a clear shared definition. Confirm ECMA country-preserving geography rather than merging all clock-equivalent countries.
2. **Coverage and data errors:** Are small settlements allowed when no city exists, and may reviewed geographic corrections/exclusions override the raw maximum? The sample filter and suspicious Chatham result make this concrete. Unknown/zero population cannot establish a maximum.
3. **Unresolved browser location:** What should users see for missing/throwing Intl, UTC/GMT-only or fixed-offset identifiers (`Etc/GMT±n`, `+05:30`), newer unsupported zones, no eligible settlement, or rejected data? An explicit default city, opening the birth editor before calculation, or another owner-defined behavior are product alternatives. UTC is valid but does not imply London; numeric offsets do not identify longitude/latitude. Do not silently invent a location.

These are new product choices, not grounds to reopen the approved one-chart, fresh-visit, transient-input behavior. The separate calculation-initialization ticket retains ownership of input/output shapes, epoch/time semantics, settings, engine provenance, and WASM parity.
