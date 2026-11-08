import { z } from "zod";
import { signIds as signs, chartPointIds as names } from "../identities";
const sign = z.enum(signs),
  name = z.enum(names),
  angle = z.number().min(0).lt(360);
const sector = z.strictObject({
  sign,
  start_degrees: angle,
  width_degrees: z.number().positive().max(360),
});
const body = z.strictObject({
  name,
  longitude: angle,
  speed: z.number(),
  declination: z.number(),
  sign: z.strictObject({
    sign,
    degrees_in_sign: z.number().nonnegative(),
    width_degrees: z.number().positive().max(360),
  }),
});
export const chartSchema = z
  .strictObject({
    configuration: z.strictObject({
      reference: z.enum(["tropical", "fagan-bradley", "true-sky"]),
      divisions: z.enum(["equal", "constellation"]),
      ophiuchus: z.enum(["enabled", "disabled"]).nullable(),
    }),
    convention_revision: z.string().min(1),
    reference_offset_degrees: z.number(),
    speed_reference: z.string().min(1),
    bodies: z.array(body).length(names.length),
    zodiac_sectors: z.array(sector).min(12).max(13),
    house_sectors: z.array(sector).length(12).nullable(),
    cusps: z.array(angle).length(12),
    requested_house_system: z.string().min(1),
    house_system: z.string().min(1),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.bodies.map((b) => b.name)).size !== names.length)
      ctx.addIssue({ code: "custom", message: "Missing or duplicate body" });
    const expected = signs.filter(
      (s) =>
        s !== "ophiuchus" ||
        (c.configuration.divisions === "constellation" &&
          c.configuration.ophiuchus === "enabled"),
    );
    const validSectors = (
      sectors: typeof c.zodiac_sectors,
      expectedSigns: readonly string[],
    ) =>
      sectors.length === expectedSigns.length &&
      sectors.every(
        (sector, i) =>
          sector.sign === expectedSigns[i] &&
          Math.abs(
            sector.start_degrees -
              (i
                ? sectors[i - 1]!.start_degrees + sectors[i - 1]!.width_degrees
                : 0),
          ) < 1e-9,
      ) &&
      Math.abs(
        sectors.at(-1)!.start_degrees + sectors.at(-1)!.width_degrees - 360,
      ) < 1e-9;
    if (
      !validSectors(c.zodiac_sectors, expected) ||
      (c.house_system === "whole-sign"
        ? !c.house_sectors ||
          !validSectors(
            c.house_sectors,
            signs.filter((s) => s !== "ophiuchus"),
          )
        : c.house_sectors !== null)
    )
      ctx.addIssue({ code: "custom", message: "Invalid zodiac sectors" });
    if (c.bodies.some((b) => b.sign.degrees_in_sign >= b.sign.width_degrees))
      ctx.addIssue({ code: "custom", message: "Invalid sign progress" });
    const relative = c.cusps.map((v) => (v - c.cusps[0]! + 360) % 360);
    if (relative.some((v, i) => i > 0 && v <= relative[i - 1]!))
      ctx.addIssue({ code: "custom", message: "Invalid house cusps" });
  });
export type Chart = z.infer<typeof chartSchema>;
const sep = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const aspectTypes = [
  ["Conjunction", 0, 10],
  ["Semisextile", 30, 2],
  ["Sextile", 60, 6],
  ["Square", 90, 8],
  ["Trine", 120, 8],
  ["Quincunx", 150, 3],
  ["Opposition", 180, 10],
] as const;
const eligible = new Set([
  "SUN",
  "MOON",
  "MERCURY",
  "VENUS",
  "MARS",
  "JUPITER",
  "SATURN",
  "URANUS",
  "NEPTUNE",
  "PLUTO",
]);
export const deriveAstrology = (
  selected: Chart,
  tropical: Chart,
  method: "progressInSign" | "closestToMC",
) => {
  const planets = tropical.bodies;
  const aspects = planets.flatMap((a, i) =>
    planets.slice(i + 1).flatMap((b) => {
      const distance = sep(a.longitude, b.longitude);
      const match = aspectTypes.find(
        ([, exact, orb]) => Math.abs(distance - exact) <= orb,
      );
      if (!match) return [];
      const [type, exact] = match;
      return [
        {
          planetA: a.name,
          planetB: b.name,
          type,
          angle: distance,
          orb: Math.abs(distance - exact),
          status: (Math.abs(
            sep(a.longitude + a.speed * 0.001, b.longitude + b.speed * 0.001) -
              exact,
          ) < Math.abs(distance - exact)
            ? "applying"
            : "separating") as "applying" | "separating",
        },
      ];
    }),
  );
  const mc = selected.bodies.find((b) => b.name === "MIDHEAVEN")!.longitude;
  const candidates = selected.bodies.filter((b) => eligible.has(b.name));
  const atmakaraka = candidates.reduce((best, b) =>
    method === "progressInSign"
      ? b.sign.degrees_in_sign / b.sign.width_degrees >
        best.sign.degrees_in_sign / best.sign.width_degrees
        ? b
        : best
      : sep(b.longitude, mc) < sep(best.longitude, mc)
        ? b
        : best,
  ).name;
  const asc = selected.cusps[0]!;
  const norm = (x: number) => (x - asc + 720) % 360;
  const cusps = selected.cusps.map(norm);
  const interceptedSigns = selected.zodiac_sectors
    .filter((s) => {
      const start = norm(s.start_degrees),
        end = norm(s.start_degrees + s.width_degrees);
      return (
        end > start &&
        cusps.some((c, i) => c < start && end < (cusps[i + 1] ?? 360))
      );
    })
    .map((s) => s.sign);
  return {
    selectedFrame: selected,
    tropicalBasis: tropical,
    aspects,
    atmakaraka,
    interceptedSigns,
  };
};
