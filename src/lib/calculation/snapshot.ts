import { z } from "zod";
import { birthSchema, settingsSchema } from "../domain";
import { chartSchema } from "./chart";
import slices from "./slices.json";
const body = z.enum([
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
  "ASCENDANT_SYMBOL",
  "MIDHEAVEN",
  "DESCENDANT",
  "IMUM_COELI",
]);
const sign = z.enum([
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
]);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
export const astrologySchema = z.strictObject({
  selectedFrame: chartSchema,
  tropicalBasis: chartSchema,
  aspects: z.array(
    z.strictObject({
      planetA: body,
      planetB: body,
      type: z.enum([
        "Conjunction",
        "Semisextile",
        "Sextile",
        "Square",
        "Trine",
        "Quincunx",
        "Opposition",
      ]),
      angle: z.number().min(0).max(180),
      orb: z.number().nonnegative(),
      status: z.enum(["applying", "separating"]),
    }),
  ),
  atmakaraka: body,
  interceptedSigns: z.array(sign),
});
export const snapshotSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    calculationId: z.uuid(),
    generation: z.number().int().positive(),
    birth: birthSchema,
    requestedSettings: settingsSchema,
    provenance: z.strictObject({
      engineCommit: z.literal("b2bd547728f31a951a1afd78dfaa94225d8c152f"),
      supplementarySourceCommit: z.literal(
        "3771c081ba41bce4818984ce999158d88902d93d",
      ),
      wrapperSha256: z.literal(
        "22c1aa9cd9b457b24521d0dc7a1e90710a9fbd29bc40040f2a359b51a59096ff",
      ),
      datasetSha256: z.literal(
        "06d4c26e589207bf479dbd217fafb3e4d6c559626425b156912e39a4d859487b",
      ),
      datasetFingerprint: z.literal("d83046a0"),
      sliceSha256: z.array(hash).length(1),
      conventionRevision: z.string().min(1),
    }),
    systems: z.strictObject({
      astrology: astrologySchema.optional(),
    }),
  })
  .superRefine((snapshot, ctx) => {
    const s = snapshot.requestedSettings,
      a = snapshot.systems.astrology,
      c = a?.selectedFrame,
      t = a?.tropicalBasis;
    if (!c) {
      ctx.addIssue({ code: "custom", message: "No enabled calculation." });
      return;
    }
    if (
      snapshot.provenance.sliceSha256[0] !==
        slices[
          new Date(snapshot.birth.utc)
            .getUTCFullYear()
            .toString() as keyof typeof slices
        ] ||
      Boolean(a) !== s.systems.astrology ||
      s.systems.humanDesign ||
      c.configuration.reference !== s.reference ||
      c.configuration.divisions !== s.divisions ||
      c.configuration.ophiuchus !==
        (s.divisions === "equal"
          ? null
          : s.ophiuchus
            ? "enabled"
            : "disabled") ||
      c.requested_house_system !== s.houses ||
      (t &&
        (t.configuration.reference !== "tropical" ||
          t.configuration.divisions !== "equal")) ||
      snapshot.provenance.conventionRevision !== c.convention_revision
    )
      ctx.addIssue({
        code: "custom",
        message: "Calculation does not match the requested settings.",
      });
  });
export type Astrology = z.infer<typeof astrologySchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
