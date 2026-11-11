import { planetGlyphPaths } from "./planet-glyphs";

const planetIds = [
  "SUN",
  "MOON",
  "MERCURY",
  "VENUS",
  "MARS",
  "JUPITER",
  "SATURN",
  "URANUS",
  "NEPTUNE",
  "PLUTO",
] as const;
const planetSymbols = Object.fromEntries(
  planetIds.map((id, index) => [
    id,
    {
      path: planetGlyphPaths[index]!,
    },
  ]),
) as Record<(typeof planetIds)[number], { path: string }>;

// SVG glyphs ported from astrology-engine-website at 9613598; Earth and Ceres retained for this app.
/** Glyphs only; display names come from the CMS `body` and `angle` entries. */
export const bodySymbols: Record<string, { path: string }> = {
  ...planetSymbols,
  EARTH: {
    path: "M50 8a42 42 0 1 0 0 84 42 42 0 0 0 0-84Zm-4 8v30H16a34 34 0 0 1 30-30Zm8 0a34 34 0 0 1 30 30H54Zm30 38a34 34 0 0 1-30 30V54ZM46 84a34 34 0 0 1-30-30h30Z",
  },
  CERES: {
    path: "M48 8a27 27 0 1 1 0 54h-4v12H30v8h14v14h8V82h14v-8H52V54h-4a19 19 0 1 0-19-19h-8A27 27 0 0 1 48 8Z",
  },
  CHIRON: {
    path: "M46 48V12h8v18l23-19 5 6-28 23v8a21 21 0 1 1-8 0Zm4 8a13 13 0 1 0 0 26 13 13 0 0 0 0-26Z",
  },
  NORTH_NODE: {
    path: "M20 61V44a30 30 0 0 1 60 0v17a13 13 0 1 1-8-12v-5a22 22 0 0 0-44 0v5a13 13 0 1 1-8 12Z",
  },
  SOUTH_NODE: {
    path: "M20 39V56a30 30 0 0 0 60 0V39a13 13 0 1 0-8 12v5a22 22 0 0 1-44 0v-5a13 13 0 1 0-8-12Z",
  },
};
