/** Shared semantic identities; no user data or application state. */
export const bodyIds = [
  "SUN",
  "EARTH",
  "MOON",
  "NORTH_NODE",
  "SOUTH_NODE",
  "MERCURY",
  "VENUS",
  "MARS",
  "JUPITER",
  "SATURN",
  "URANUS",
  "NEPTUNE",
  "PLUTO",
  "CHIRON",
  "CERES",
] as const;
export const angleIds = [
  "ASCENDANT_SYMBOL",
  "MIDHEAVEN",
  "DESCENDANT",
  "IMUM_COELI",
] as const;
export const chartPointIds = [...bodyIds, ...angleIds] as const;
export const signIds = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "ophiuchus",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;
export const aspectTypes = [
  "Conjunction",
  "Semisextile",
  "Sextile",
  "Square",
  "Trine",
  "Quincunx",
  "Opposition",
] as const;
export const isAngle = (name: string): name is (typeof angleIds)[number] =>
  (angleIds as readonly string[]).includes(name);
