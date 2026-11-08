import type { Chart } from "./calculation/chart";

type BodyName = Chart["bodies"][number]["name"];
export type ReferenceContent = {
  insight: string;
  keywords: string[];
  editorialStatus: "pending-review";
};
const meanings: Partial<Record<BodyName, [string, string[]]>> = {
  SUN: [
    "The Sun describes your sense of identity and vitality.",
    ["identity", "vitality"],
  ],
  MOON: [
    "The Moon speaks to emotional needs and habitual responses.",
    ["feelings", "instinct"],
  ],
  MERCURY: [
    "Mercury describes how you think and communicate.",
    ["thought", "communication"],
  ],
  VENUS: [
    "Venus describes how you relate, appreciate and find pleasure.",
    ["connection", "values"],
  ],
  MARS: [
    "Mars describes how you act and pursue what matters to you.",
    ["action", "drive"],
  ],
  JUPITER: [
    "Jupiter describes how you seek growth and meaning.",
    ["growth", "meaning"],
  ],
  SATURN: [
    "Saturn describes responsibility, limits and sustained effort.",
    ["discipline", "structure"],
  ],
  URANUS: [
    "Uranus describes change, independence and originality.",
    ["change", "freedom"],
  ],
  NEPTUNE: [
    "Neptune describes imagination, ideals and sensitivity.",
    ["imagination", "ideals"],
  ],
  PLUTO: [
    "Pluto describes transformation and encounters with power.",
    ["transformation", "depth"],
  ],
  CHIRON: [
    "Chiron describes themes of vulnerability and healing.",
    ["healing", "vulnerability"],
  ],
  CERES: [
    "Ceres describes themes of care and nourishment.",
    ["care", "nourishment"],
  ],
  NORTH_NODE: [
    "The North Node describes a direction of development.",
    ["growth", "direction"],
  ],
  SOUTH_NODE: [
    "The South Node describes familiar patterns and strengths.",
    ["experience", "familiarity"],
  ],
  EARTH: [
    "Earth represents grounding and embodied experience.",
    ["grounding", "experience"],
  ],
};
export const bodyReference = (name: BodyName): ReferenceContent => {
  const [insight, keywords] = meanings[name] ?? [
    "This point offers a perspective on your chart.",
    ["perspective"],
  ];
  return { insight, keywords, editorialStatus: "pending-review" };
};
export const bridgingReference = {
  text: "This placement is in the final degree of its sign, a point often associated with transition and emphasis.",
  editorialStatus: "pending-review" as const,
};
