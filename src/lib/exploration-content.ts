import type { SignName, BodyName, Aspect } from "./selection";
import { pendingReview, type ReferenceContent } from "./reference-content";
const ref = (insight: string, ...keywords: string[]): ReferenceContent => ({
  insight,
  keywords,
  ...pendingReview(),
});
export const signs: Record<SignName, ReferenceContent> = {
  aries: ref(
    "Aries approaches life through initiative and direct action.",
    "initiative",
    "courage",
  ),
  taurus: ref(
    "Taurus seeks stability, pleasure and tangible value.",
    "steadiness",
    "sensibility",
  ),
  gemini: ref(
    "Gemini explores through curiosity and exchange.",
    "curiosity",
    "communication",
  ),
  cancer: ref(
    "Cancer responds through care, belonging and emotional awareness.",
    "care",
    "belonging",
  ),
  leo: ref(
    "Leo expresses creativity and a desire to shine.",
    "creativity",
    "expression",
  ),
  virgo: ref(
    "Virgo finds meaning in discernment and useful attention.",
    "discernment",
    "service",
  ),
  libra: ref(
    "Libra seeks balance and connection with others.",
    "balance",
    "relationship",
  ),
  scorpio: ref(
    "Scorpio explores depth, trust and transformation.",
    "depth",
    "transformation",
  ),
  ophiuchus: ref(
    "Ophiuchus is a constellation included in some True Sky charts.",
    "constellation",
    "discovery",
  ),
  sagittarius: ref(
    "Sagittarius seeks understanding through exploration.",
    "exploration",
    "meaning",
  ),
  capricorn: ref(
    "Capricorn works toward lasting goals with patience.",
    "commitment",
    "structure",
  ),
  aquarius: ref(
    "Aquarius considers new possibilities and the wider community.",
    "innovation",
    "community",
  ),
  pisces: ref(
    "Pisces approaches experience with imagination and empathy.",
    "imagination",
    "empathy",
  ),
};
export const houses: ReferenceContent[] = [
  ref(
    "The first house concerns identity and how you meet the world.",
    "identity",
    "beginnings",
  ),
  ref(
    "The second house concerns resources, values and material security.",
    "resources",
    "values",
  ),
  ref(
    "The third house concerns learning, communication and your immediate surroundings.",
    "learning",
    "communication",
  ),
  ref(
    "The fourth house concerns home, roots and foundations.",
    "home",
    "roots",
  ),
  ref(
    "The fifth house concerns creativity, play and self-expression.",
    "creativity",
    "play",
  ),
  ref(
    "The sixth house concerns daily routines, work and care.",
    "routine",
    "care",
  ),
  ref(
    "The seventh house concerns close partnerships and one-to-one relationships.",
    "partnership",
    "relationship",
  ),
  ref(
    "The eighth house concerns shared resources and transformation.",
    "sharing",
    "transformation",
  ),
  ref(
    "The ninth house concerns exploration, beliefs and broader understanding.",
    "exploration",
    "belief",
  ),
  ref(
    "The tenth house concerns public life, vocation and direction.",
    "vocation",
    "direction",
  ),
  ref(
    "The eleventh house concerns community, friendship and shared aims.",
    "community",
    "aspiration",
  ),
  ref(
    "The twelfth house concerns reflection, solitude and the unseen.",
    "reflection",
    "rest",
  ),
];
export const angles: Partial<Record<BodyName, ReferenceContent>> = {
  ASCENDANT_SYMBOL: ref(
    "The Ascendant marks the eastern horizon and your approach to new experiences.",
    "arrival",
    "approach",
  ),
  MIDHEAVEN: ref(
    "The Midheaven marks the upper meridian and themes of public direction.",
    "direction",
    "public life",
  ),
  DESCENDANT: ref(
    "The Descendant marks the western horizon and themes of partnership.",
    "partnership",
    "encounter",
  ),
  IMUM_COELI: ref(
    "The Imum Coeli marks the lower meridian and themes of roots and home.",
    "roots",
    "foundation",
  ),
};
export const aspectContent: Record<Aspect["type"], ReferenceContent> = {
  Conjunction: ref(
    "A conjunction brings two chart factors together.",
    "union",
    "focus",
  ),
  Semisextile: ref(
    "A semisextile places two chart factors in a subtle relationship.",
    "adjustment",
    "awareness",
  ),
  Sextile: ref(
    "A sextile connects two chart factors through opportunity and cooperation.",
    "opportunity",
    "cooperation",
  ),
  Square: ref(
    "A square connects two chart factors through tension that invites action.",
    "tension",
    "action",
  ),
  Trine: ref(
    "A trine connects two chart factors through a sense of ease.",
    "flow",
    "ease",
  ),
  Quincunx: ref(
    "A quincunx connects two chart factors through a need for adjustment.",
    "adjustment",
    "adaptation",
  ),
  Opposition: ref(
    "An opposition connects two chart factors across a polarity.",
    "polarity",
    "balance",
  ),
};
export const rulers: Partial<Record<SignName, [string, string]>> = {
  aries: ["Mars", "Mars"],
  taurus: ["Venus", "Venus"],
  gemini: ["Mercury", "Mercury"],
  cancer: ["Moon", "Moon"],
  leo: ["Sun", "Sun"],
  virgo: ["Mercury", "Mercury"],
  libra: ["Venus", "Venus"],
  scorpio: ["Mars", "Pluto"],
  sagittarius: ["Jupiter", "Jupiter"],
  capricorn: ["Saturn", "Saturn"],
  aquarius: ["Saturn", "Uranus"],
  pisces: ["Jupiter", "Neptune"],
};
export const systemHelp = {
  tropical:
    "Tropical astrology measures signs from the seasonal equinoxes and solstices.",
  "fagan-bradley":
    "This Vedic preset uses the Fagan–Bradley sidereal reference and equal signs; Vedic traditions use more than one convention.",
  "true-sky":
    "True Sky uses constellation-based divisions and can include Ophiuchus.",
} as const;

// Definitions and lookup conventions are independently awaiting editorial review.
export const systemHelpReview = {
  tropical: pendingReview(),
  "fagan-bradley": pendingReview(),
  "true-sky": pendingReview(),
} as const;
export const customTrueSkyHelp = {
  text: "This custom setting uses the True Sky reference with equal sign divisions.",
  ...pendingReview(),
};
export const rulerReview = {
  aries: pendingReview(),
  taurus: pendingReview(),
  gemini: pendingReview(),
  cancer: pendingReview(),
  leo: pendingReview(),
  virgo: pendingReview(),
  libra: pendingReview(),
  scorpio: pendingReview(),
  ophiuchus: pendingReview(),
  sagittarius: pendingReview(),
  capricorn: pendingReview(),
  aquarius: pendingReview(),
  pisces: pendingReview(),
} satisfies Record<SignName, ReturnType<typeof pendingReview>>;
