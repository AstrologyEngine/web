import type { Chart } from "./calculation/chart";
import { bodyIds } from "./identities";

type BodyName = Chart["bodies"][number]["name"];
export type BodyTarget = (typeof bodyIds)[number];
export type EditorialReview =
  | { editorialStatus: "pending-review"; reviewer: null; outcome: null }
  | {
      editorialStatus: "reviewed";
      reviewer: string;
      outcome: "approved" | "revision-requested";
      notes: string;
    };
export const pendingReview = (): EditorialReview => ({
  editorialStatus: "pending-review",
  reviewer: null,
  outcome: null,
});
export type ReferenceContent = {
  insight: string;
  keywords: string[];
} & EditorialReview;
export const meanings: Record<BodyTarget, [string, string[]]> = {
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
// Each displayed body has an explicit, independently editable review record.
export const bodyReviews: Record<BodyTarget, EditorialReview> = {
  SUN: pendingReview(),
  EARTH: pendingReview(),
  MOON: pendingReview(),
  NORTH_NODE: pendingReview(),
  SOUTH_NODE: pendingReview(),
  MERCURY: pendingReview(),
  VENUS: pendingReview(),
  MARS: pendingReview(),
  JUPITER: pendingReview(),
  SATURN: pendingReview(),
  URANUS: pendingReview(),
  NEPTUNE: pendingReview(),
  PLUTO: pendingReview(),
  CHIRON: pendingReview(),
  CERES: pendingReview(),
};
export const bodyReference = (name: BodyName): ReferenceContent => {
  if (!Object.hasOwn(meanings, name))
    throw new Error(`No body reference for ${name}`);
  const key = name as BodyTarget;
  const [insight, keywords] = meanings[key];
  return { insight, keywords, ...bodyReviews[key] };
};
export const bridgingReference = {
  text: "This placement is in the final degree of its sign, a point often associated with transition and emphasis.",
  ...pendingReview(),
};
