import type { bodyIds } from "./identities";
import type { SignName } from "./selection";

type BodyId = (typeof bodyIds)[number];

/**
 * Traditional and modern ruler of each sign, as body IDs; their names come
 * from the CMS. Ophiuchus has no established ruler.
 */
export const rulers: Partial<
  Record<SignName, readonly [traditional: BodyId, modern: BodyId]>
> = {
  aries: ["MARS", "MARS"],
  taurus: ["VENUS", "VENUS"],
  gemini: ["MERCURY", "MERCURY"],
  cancer: ["MOON", "MOON"],
  leo: ["SUN", "SUN"],
  virgo: ["MERCURY", "MERCURY"],
  libra: ["VENUS", "VENUS"],
  scorpio: ["MARS", "PLUTO"],
  sagittarius: ["JUPITER", "JUPITER"],
  capricorn: ["SATURN", "SATURN"],
  aquarius: ["SATURN", "URANUS"],
  pisces: ["JUPITER", "NEPTUNE"],
};
