import type { SignName, BodyName, Aspect } from "./selection";
import { pendingReview, type ReferenceContent } from "./reference-content";
const ref = (insight: string, ...keywords: string[]): ReferenceContent => ({
  insight,
  keywords,
  ...pendingReview(),
});
export const signs: Record<SignName, ReferenceContent> = {
  aries: ref(
    "Aries symbolizes the impulse to begin, take a risk and act directly.",
    "initiative",
    "courage",
  ),
  taurus: ref(
    "Taurus symbolizes steadiness, physical comfort and the patient cultivation of what matters.",
    "steadiness",
    "comfort",
  ),
  gemini: ref(
    "Gemini symbolizes curiosity, conversation and the exploration of different perspectives.",
    "curiosity",
    "communication",
  ),
  cancer: ref(
    "Cancer symbolizes emotional attachment, protection and the need for belonging.",
    "care",
    "belonging",
  ),
  leo: ref(
    "Leo symbolizes creative expression, generosity and the wish to be seen.",
    "creativity",
    "expression",
  ),
  virgo: ref(
    "Virgo symbolizes careful observation, practical service and the refinement of skills.",
    "discernment",
    "service",
  ),
  libra: ref(
    "Libra symbolizes cooperation, fairness and the weighing of different needs.",
    "balance",
    "relationship",
  ),
  scorpio: ref(
    "Scorpio symbolizes emotional depth, questions of trust and the process of letting go.",
    "depth",
    "transformation",
  ),
  ophiuchus: ref(
    "Ophiuchus is a constellation crossed by the Sun’s apparent path and included in this app’s True Sky preset.",
    "constellation",
    "Sun’s path",
  ),
  sagittarius: ref(
    "Sagittarius symbolizes exploration, the search for meaning and the testing of beliefs.",
    "exploration",
    "meaning",
  ),
  capricorn: ref(
    "Capricorn symbolizes responsibility, patient ambition and work toward lasting goals.",
    "commitment",
    "structure",
  ),
  aquarius: ref(
    "Aquarius symbolizes independent thought, collective ideals and alternatives to established ways.",
    "innovation",
    "community",
  ),
  pisces: ref(
    "Pisces symbolizes imagination, compassion and openness to experiences beyond clear boundaries.",
    "imagination",
    "empathy",
  ),
};
export const houses: ReferenceContent[] = [
  ref(
    "The first house represents self-presentation, physical presence and how you enter new situations.",
    "presence",
    "self-presentation",
  ),
  ref(
    "The second house represents personal resources, possessions and what you rely on for security.",
    "resources",
    "security",
  ),
  ref(
    "The third house represents everyday learning, communication, siblings and nearby surroundings.",
    "learning",
    "communication",
  ),
  ref(
    "The fourth house represents home, family roots and the foundations of private life.",
    "home",
    "roots",
  ),
  ref(
    "The fifth house represents creativity, play, romance and relationships with children.",
    "creativity",
    "play",
  ),
  ref(
    "The sixth house represents daily work, practical responsibilities and routines of care.",
    "routine",
    "care",
  ),
  ref(
    "The seventh house represents one-to-one commitments, including partnerships and agreements.",
    "partnership",
    "relationship",
  ),
  ref(
    "The eighth house represents shared resources, obligations and experiences of loss or change.",
    "shared resources",
    "change",
  ),
  ref(
    "The ninth house represents higher learning, travel and the beliefs that shape a wider worldview.",
    "exploration",
    "belief",
  ),
  ref(
    "The tenth house represents vocation, reputation and responsibilities in public life.",
    "vocation",
    "reputation",
  ),
  ref(
    "The eleventh house represents friendships, groups and hopes pursued with others.",
    "community",
    "aspiration",
  ),
  ref(
    "The twelfth house represents solitude, retreat and parts of life kept out of public view.",
    "solitude",
    "retreat",
  ),
];
export const angles: Partial<Record<BodyName, ReferenceContent>> = {
  ASCENDANT_SYMBOL: ref(
    "The Ascendant is where the zodiac meets the eastern horizon, symbolizing how you first meet the world.",
    "eastern horizon",
    "approach",
  ),
  MIDHEAVEN: ref(
    "The Midheaven marks the zodiac’s upper meridian crossing and symbolizes vocation and public visibility.",
    "meridian",
    "public life",
  ),
  DESCENDANT: ref(
    "The Descendant is where the zodiac meets the western horizon, symbolizing encounters and partnerships.",
    "western horizon",
    "partnership",
  ),
  IMUM_COELI: ref(
    "The Imum Coeli is the point opposite the Midheaven, symbolizing home, roots and private foundations.",
    "roots",
    "foundation",
  ),
};
export const aspectContent: Record<Aspect["type"], ReferenceContent> = {
  Conjunction: ref(
    "A conjunction places two chart factors near the same zodiac position, symbolically combining their themes.",
    "union",
    "focus",
  ),
  Semisextile: ref(
    "A semisextile places two chart factors about 30° apart, interpreted here as a subtle need to accommodate differences.",
    "adjustment",
    "awareness",
  ),
  Sextile: ref(
    "A sextile places two chart factors about 60° apart, symbolizing opportunities for cooperation.",
    "opportunity",
    "cooperation",
  ),
  Square: ref(
    "A square places two chart factors about 90° apart, symbolizing friction between themes that call for attention.",
    "tension",
    "action",
  ),
  Trine: ref(
    "A trine places two chart factors about 120° apart, symbolizing ease and mutual support.",
    "flow",
    "ease",
  ),
  Quincunx: ref(
    "A quincunx places two chart factors about 150° apart, symbolizing themes that can be difficult to reconcile.",
    "adjustment",
    "adaptation",
  ),
  Opposition: ref(
    "An opposition places two chart factors about 180° apart, symbolizing contrasting needs held in relationship.",
    "contrast",
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
    "Tropical astrology divides the zodiac into twelve equal signs, beginning at the March equinox point.",
  "fagan-bradley":
    "The preset labeled Vedic uses twelve equal signs with the Fagan–Bradley sidereal reference, a Western sidereal convention distinct from those commonly used in Vedic astrology.",
  "true-sky":
    "True Sky uses unequal, constellation-based divisions following the Chimenti convention, with Ophiuchus available as an optional thirteenth sector.",
} as const;

// Definitions and lookup conventions are independently awaiting editorial review.
export const systemHelpReview = {
  tropical: pendingReview(),
  "fagan-bradley": pendingReview(),
  "true-sky": pendingReview(),
} as const;
export const customTrueSkyHelp = {
  text: "This custom setting uses the True Sky starting point with twelve equal signs instead of constellation-based divisions.",
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
