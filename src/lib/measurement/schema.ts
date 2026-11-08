import { z } from "zod";
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
const system = z.enum(["Tropical", "Vedic", "True Sky", "Custom"]);
const identity = z.discriminatedUnion("kind", [
  z
    .strictObject({ kind: z.literal("body"), name: body })
    .refine(
      (value) =>
        !["ASCENDANT_SYMBOL", "MIDHEAVEN", "DESCENDANT", "IMUM_COELI"].includes(
          value.name,
        ),
    ),
  z
    .strictObject({ kind: z.literal("angle"), name: body })
    .refine((value) =>
      ["ASCENDANT_SYMBOL", "MIDHEAVEN", "DESCENDANT", "IMUM_COELI"].includes(
        value.name,
      ),
    ),
  z.strictObject({ kind: z.literal("sign"), name: sign }),
  z.strictObject({
    kind: z.literal("house"),
    number: z.number().int().min(1).max(12),
  }),
  z.strictObject({
    kind: z.literal("aspect"),
    first: body,
    second: body,
    aspectType: z.enum([
      "Conjunction",
      "Semisextile",
      "Sextile",
      "Square",
      "Trine",
      "Quincunx",
      "Opposition",
    ]),
  }),
  z.strictObject({ kind: z.literal("system_help"), system }),
]);
const common = {
  v: z.literal(1),
  eventId: z.uuid(),
  visitId: z.uuid(),
  device: z.enum(["mobile", "desktop"]),
  system: system.nullable(),
  ms: z.number().int().min(0).max(86400000),
};
const feature = z.enum([
  "chart",
  "system_help",
  "settings",
  "half_wheel",
  "body_picker",
  "aspect_picker",
]);
export const measurementSchema = z.discriminatedUnion("event", [
  z.strictObject({
    ...common,
    event: z.enum(["entry_started", "entry_completed", "chart_usable"]),
  }),
  z.strictObject({
    ...common,
    event: z.literal("eligible"),
    source: z.enum(["chart", "help"]),
  }),
  z.strictObject({ ...common, event: z.literal("first_insight"), identity }),
  z.strictObject({ ...common, event: z.literal("explanation_open"), identity }),
  z.strictObject({ ...common, event: z.literal("exposure"), feature }),
  z.strictObject({ ...common, event: z.literal("feature_use"), feature }),
  z.strictObject({
    ...common,
    event: z.literal("interaction"),
    category: z.enum(["selection", "navigation", "zoom", "repeat", "pan"]),
  }),
  z.strictObject({
    ...common,
    event: z.literal("failure"),
    stage: z.enum(["resolver", "calculation"]),
    category: z.enum(["unavailable", "invalid", "timeout", "failed"]),
  }),
]);
export type MeasurementEvent = z.infer<typeof measurementSchema>;
export type Identity = z.infer<typeof identity>;
export type Feature = z.infer<typeof feature>;
export type System = z.infer<typeof system>;
