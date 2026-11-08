import { readFile, writeFile } from "node:fs/promises";
import {
  bodyReference,
  bridgingReference,
  meanings,
  type BodyTarget,
  type EditorialReview,
  type ReferenceContent,
} from "../../src/lib/reference-content";
import {
  signs,
  houses,
  angles,
  aspectContent,
  rulers,
  rulerReview,
  systemHelp,
  systemHelpReview,
  customTrueSkyHelp,
} from "../../src/lib/exploration-content";
import type { SignName, BodyName, Aspect } from "../../src/lib/selection";

const bodyIds: BodyTarget[] = [
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
];
const signIds: SignName[] = [
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
];
const angleIds: BodyName[] = [
  "ASCENDANT_SYMBOL",
  "MIDHEAVEN",
  "DESCENDANT",
  "IMUM_COELI",
];
const aspectIds: Aspect["type"][] = [
  "Conjunction",
  "Semisextile",
  "Sextile",
  "Square",
  "Trine",
  "Quincunx",
  "Opposition",
];
const systemIds = ["tropical", "fagan-bradley", "true-sky"] as const;
const assertKeys = (
  label: string,
  expected: readonly string[],
  actual: string[],
) => {
  const missing = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (missing.length || extra.length)
    throw Error(
      `${label}: missing ${missing.join(", ")}; unexpected ${extra.join(", ")}`,
    );
};
assertKeys("bodies", bodyIds, Object.keys(meanings));
assertKeys("signs", signIds, Object.keys(signs));
assertKeys("angles", angleIds, Object.keys(angles));
assertKeys("aspects", aspectIds, Object.keys(aspectContent));
assertKeys("systems", systemIds, Object.keys(systemHelp));
assertKeys("ruler review", signIds, Object.keys(rulerReview));
if (houses.length !== 12) throw Error("Exactly 12 house entries are required.");
const status = (item: EditorialReview) => {
  if (item.editorialStatus === "pending-review") return "Pending";
  if (!item.reviewer.trim() || !item.notes.trim())
    throw Error(
      "A reviewed entry needs the actual reviewer and outcome notes.",
    );
  return `Reviewed: ${item.reviewer}; ${item.outcome}; ${item.notes}`;
};
const row = (id: string, item: ReferenceContent) => {
  if (
    !item.insight.trim() ||
    item.keywords.length < 2 ||
    item.keywords.some((word) => !word.trim())
  )
    throw Error(`Incomplete copy: ${id}`);
  return `| ${id} | ${item.insight} | ${item.keywords.join(" · ")} | ${status(item)} |`;
};
const table = (heading: string, rows: string[]) =>
  `## ${heading}\n\n| Entry | Key insight | Keywords | Review |\n| --- | --- | --- | --- |\n${rows.join("\n")}\n`;
const bodyRows = bodyIds.map((id) => row(id, bodyReference(id)));
const signRows = signIds.map((id) => row(id, signs[id]));
const houseRows = houses.map((value, index) =>
  row(`House ${index + 1}`, value),
);
const angleRows = angleIds.map((id) => {
  const content = angles[id];
  if (!content) throw Error(`Missing angle ${id}`);
  return row(id, content);
});
const aspectRows = aspectIds.map((id) => row(id, aspectContent[id]));
const systems = systemIds.map(
  (id) => `| ${id} | ${systemHelp[id]} | ${status(systemHelpReview[id])} |`,
);
const rulerRows = signIds.map((id) => {
  const entry = rulers[id];
  return `| ${id} | ${entry ? entry[0] : "No established ruler"} | ${entry ? entry[1] : "No established ruler"} | ${status(rulerReview[id])} |`;
});
const inventory: [string, EditorialReview][] = [
  ...bodyIds.map((id): [string, EditorialReview] => [
    `body:${id}`,
    bodyReference(id),
  ]),
  ...signIds.map((id): [string, EditorialReview] => [`sign:${id}`, signs[id]]),
  ...houses.map((item, index): [string, EditorialReview] => [
    `house:${index + 1}`,
    item,
  ]),
  ...angleIds.map((id): [string, EditorialReview] => [
    `angle:${id}`,
    angles[id]!,
  ]),
  ...aspectIds.map((id): [string, EditorialReview] => [
    `aspect:${id}`,
    aspectContent[id],
  ]),
  ...systemIds.map((id): [string, EditorialReview] => [
    `system:${id}`,
    systemHelpReview[id],
  ]),
  ["system:true-sky-equal-custom", customTrueSkyHelp],
  ["bridging:final-degree", bridgingReference],
  ...signIds.map((id): [string, EditorialReview] => [
    `ruler:${id}`,
    rulerReview[id],
  ]),
];
const outstanding = inventory
  .filter(
    ([, review]) =>
      review.editorialStatus === "pending-review" ||
      review.outcome === "revision-requested",
  )
  .map(([id]) => id);
const summary = outstanding.length
  ? `${outstanding.length} entries require review or revision, individually listed below.`
  : "No entries are pending or marked for revision in source; confirm the recorded reviewer and outcome for each entry.";
const out = `# Natal Chart Explorer editorial review packet\n\n**Assigned reviewer:** Amy (PM), identified by the owner. **Decision:** recorded per entry below. Draft wording is present for the supported inventory. ${summary} Ticket #26 and reviewed beta coverage remain incomplete while review is outstanding. No editorial sources have been selected or asserted.\n\nThis packet is generated from the editable application content. Review each row and return **approve** or **revise**, with exact wording and rationale for revisions. Record a real reviewer, an outcome of approved or revision-requested, and outcome notes in the corresponding source entry only after the decision is received. Revision-requested entries remain outstanding. For body entries update bodyReviews; other entries carry their review metadata alongside the copy or in the corresponding review map. Run \`bun scripts/editorial/review-packet.ts\` after edits; \`--check\` verifies this packet matches source.\n\n- [ ] Review all 15 bodies, 13 signs, 12 houses, 4 angles and 7 aspect types below, including keywords.\n- [ ] Review the three system definitions, custom True Sky wording, bridging note and ruler mappings below.\n- [ ] Review empty-house and unavailable-ruler wording, chart context and the final-degree behavior described below.\n- [ ] Provide actual approval or requested revisions and identify any sources used; record unresolved entries individually.\n\n${table("Bodies (15)", bodyRows)}\n${table("Signs (13)", signRows)}\n${table("Houses (12)", houseRows)}\n${table("Angles (4)", angleRows)}\n${table("Aspect types (7)", aspectRows)}\n## System definitions\n\n| Entry | Exact wording | Review |\n| --- | --- | --- |\n${systems.join("\n")}\n| true-sky equal custom | ${customTrueSkyHelp.text} | ${status(customTrueSkyHelp)} |\n\n## Final-degree bridging\n\n**Exact wording:** ${bridgingReference.text}\n\n**Review:** ${status(bridgingReference)}. The note is shown for raw sign progress from 29° inclusive to 30° exclusive only in equal Tropical or Fagan–Bradley frames. The returned sign remains unchanged; displayed degrees are truncated to at most two decimals. True Sky is excluded pending separate specification #29.\n\n## House rulers\n\nThe selected frame supplies the sign at the house cusp. These mappings follow the existing prototype and are draft reference material, not a claim of universal agreement.\n\n| Cusp sign | Traditional | Modern | Review |\n| --- | --- | --- | --- |\n${rulerRows.join("\n")}\n\nWhen the two values differ, the UI labels them “Traditional ruler” and “Modern ruler”; otherwise it shows “Ruler”. For Ophiuchus it shows “No established ruler”. An empty house displays “No bodies in this house”. Houses omit cusp degrees; angles show reference content without personalized placement facts. Context identifies the accepted zodiac reference and actual house system, including requested-house fallback when applicable.\n\n## Outstanding coverage\n\n${summary} Pending rows are unreviewed and revision-requested rows remain uncovered; automated inventory and browser checks do not constitute editorial approval. Source: \`src/lib/reference-content.ts\` and \`src/lib/exploration-content.ts\`.\n`;
const path = "docs/editorial/natal-chart-review.md";
if (process.argv.includes("--check")) {
  if ((await readFile(path, "utf8")) !== out)
    throw Error("Editorial packet differs from source; regenerate it.");
  console.log(
    "Editorial packet matches source; all inventory categories are present.",
  );
} else {
  await writeFile(path, out);
  console.log(`Wrote ${path}`);
}
