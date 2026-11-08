# AI editorial revision before Amy’s review

An AI editorial pass revised the editable application copy on 2026-11-07. Amy remains the assigned final reviewer. All 69 inventory entries remain `pending-review`; this pass is neither Amy’s approval nor a substitute for it. The generated [review packet](./natal-chart-review.md) contains the current exact wording.

## Scope and changes

Reviewed all 15 body/point entries, 13 signs, 12 houses, four angles, seven aspects, three system definitions, the custom True Sky definition, final-degree note and 13 ruler rows. Rewrote the 56 prose entries; retained the 13 ruler mappings and their pending review records. Also inspected the rendered labels, empty-house and unavailable-ruler messages, chart context and final-degree condition in the existing detail and settings components. No calculation, selection, layout, ID or ruler mapping changed.

- Body and sign insights now describe symbolism instead of asserting a personal trait. Keywords distinguish identity from self-presentation, personal resources from shared resources, and vocation from private foundations.
- Earth now explains the app’s opposite-Sun point. It no longer presents an unusual geocentric chart entry as an ordinary observed planet or gives it an unsupported universal interpretation.
- The lunar nodes are identified as crossing points; their development/familiarity meanings are explicitly this draft’s interpretive framing. Chiron’s wording avoids a promise or medical claim about healing.
- House copy names concrete areas of life. Angle copy identifies horizon or meridian geometry and keeps it separate from symbolic meaning; it does not equate the Midheaven with the tenth-house cusp.
- Aspect insights name the approximate zodiac separation and describe symbolic relationships without predicting events or claiming that ease is always beneficial or tension always harmful.
- Ophiuchus has an astronomical explanation, without inventing a personality, ruler or inherited interpretive tradition. True Sky help identifies the engine’s Chimenti convention and accommodates the custom Ophiuchus toggle; it does not claim to use IAU boundaries.
- Tropical help uses the March equinox reference, avoiding hemisphere-dependent seasonal language. The app’s Vedic label is retained, but help explicitly identifies its Fagan–Bradley implementation as a Western sidereal convention. Custom True Sky help distinguishes equal signs from constellation-based divisions.
- The final-degree note is a symbolic reflection prompt within the current sign. It no longer implies consensus about special significance, a blended sign, or a prediction. Its existing 29° inclusive to 30° exclusive condition remains limited to equal Tropical and Fagan–Bradley frames, with True Sky excluded.

## Factual references consulted for this AI pass

These are AI-pass verification references, not sources selected or approved by Amy, and not evidence validating astrological interpretation.

- [NASA, Eclipses and the Moon’s Orbit](https://eclipse.gsfc.nasa.gov/help/moonorbit.html): the northward and southward crossings of the ecliptic define the ascending and descending lunar nodes.
- [Astrodienst, Ayanamshas in Sidereal Astrology](https://www.astro.com/info/in_ayanamsha_e.htm): distinguishes Fagan–Bradley’s Western sidereal use from conventions commonly used in Hindu astrology, including Lahiri.
- [Astrodienst, Sidereal Ephemeris files](https://www.astro.com/swisseph/sweph_sfb_e.htm): tropical zodiac origin at the equinox and the Fagan–Bradley sidereal reference.
- [Adler Planetarium, Zodiac Coloring Book](https://www.adlerplanetarium.org/wp-content/uploads/210420_Zodiac_Coloringbook-1.pdf), Ophiuchus entry: the Sun’s apparent path crosses Ophiuchus under astronomical constellation boundaries. This supports the astronomical description, not the engine’s sector widths or an astrological meaning.
- [Swiss Ephemeris documentation](https://www.astro.com/swisseph-download/doc/swisseph.pdf), house-calculation discussion: Ascendant/ecliptic geometry and the distinction between the meridian and horizon, including polar qualifications. The copy avoids claiming that the Midheaven is the zenith or invariably the highest point above the horizon.
- Local engine sources inspected at `AstrologyEngine/library` commit `71350f0889c3b5e1585935d2017c97efe0bb5848`: `src/cheb/chart.rs` (`earth_from_sun`, longitude opposite the Sun); `src/astro/houses.rs` (angles and opposite points); `docs/chart-conventions.md` (Chimenti reference, constellation divisions, Ophiuchus options and twelve-house convention). Application preset behavior was checked against `src/lib/settings.ts`; final-degree rendering against `src/lib/Details.svelte`.

## Decisions still for Amy

- Approve or revise each insight and its keywords, including the modern psychological framing, node meanings, Chiron/Ceres symbolism and minor-aspect meanings. No interpretive bibliography has been selected by Amy.
- Decide whether the product label “Vedic” should change in a separate product decision; this copy pass clarifies the current convention without changing it.
- Confirm the factual-only treatment of Earth and Ophiuchus, and the draft’s conventional traditional/modern ruler assignments. “No established ruler” remains the existing Ophiuchus message, not a researched claim that no practitioner has proposed one.
- Confirm the scope of the final-degree reflection prompt and whether its interpretive framing needs a chosen source. No True Sky bridging rule is introduced.
- Review the retained “No bodies in this house” wording, which describes displayed occupants and does not imply an empty life area, and the concise system/house context labels. The inventory’s category “Bodies” includes calculated points as well as physical bodies.

## Validation

Completed checks:

- Regenerated the review packet and passed `bun run check:content`; all 69 entries remain pending.
- Passed `bun run check:ts`, `bun run check` (zero errors or warnings), `bun run lint`, `bun run format:check`, `git diff --check` and `bun run build`.
- Ran the existing `full-exploration`, `exploration` and `settings` browser suites: 22 of 24 passed on the first run; the first body/sign journeys timed out on the initial birth-entry screen. Both passed on a focused rerun with one worker. No test or application behavior was changed to obtain those results. Coverage includes body/sign/house/angle/aspect details, mobile details, system switching, Ophiuchus ruler fallback and final-degree boundaries/exclusion.

These checks establish source consistency and rendering behavior, not editorial approval or independent astronomical accuracy.
