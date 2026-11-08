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
    "The Sun symbolizes identity, purpose and the wish to express yourself.",
    ["identity", "purpose"],
  ],
  MOON: [
    "The Moon symbolizes emotional needs, familiar habits and what feels comforting.",
    ["emotions", "comfort"],
  ],
  MERCURY: [
    "Mercury symbolizes learning, reasoning and the exchange of ideas.",
    ["thought", "communication"],
  ],
  VENUS: [
    "Venus symbolizes affection, attraction and what you value or enjoy.",
    ["connection", "values"],
  ],
  MARS: [
    "Mars symbolizes initiative, desire and the way you assert yourself.",
    ["action", "drive"],
  ],
  JUPITER: [
    "Jupiter symbolizes growth through exploration, belief and a search for meaning.",
    ["growth", "meaning"],
  ],
  SATURN: [
    "Saturn symbolizes boundaries, responsibility and what takes time to build.",
    ["discipline", "structure"],
  ],
  URANUS: [
    "Uranus symbolizes independence, experimentation and breaks with familiar patterns.",
    ["change", "freedom"],
  ],
  NEPTUNE: [
    "Neptune symbolizes imagination, longing and the blurred line between ideals and illusion.",
    ["imagination", "ideals"],
  ],
  PLUTO: [
    "Pluto symbolizes power, control and profound processes of change.",
    ["power", "transformation"],
  ],
  CHIRON: [
    "Chiron symbolizes vulnerability and the understanding that can grow from difficult experiences.",
    ["vulnerability", "understanding"],
  ],
  CERES: [
    "Ceres symbolizes nurturing, nourishment and the experience of giving or receiving care.",
    ["care", "nourishment"],
  ],
  NORTH_NODE: [
    "The North Node marks the point where the Moon crosses the Sun’s apparent path northward, interpreted here as a symbol of development.",
    ["lunar node", "development"],
  ],
  SOUTH_NODE: [
    "The South Node marks the point where the Moon crosses the Sun’s apparent path southward, interpreted here as a symbol of familiar patterns.",
    ["lunar node", "familiarity"],
  ],
  EARTH: [
    "Earth is shown here as a symbolic point opposite the Sun, rather than a planet observed from Earth.",
    ["Earth point", "opposite Sun"],
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
  text: "This placement is in the final degree of its sign, offered here as a symbolic prompt to reflect on transition within that sign.",
  ...pendingReview(),
};
