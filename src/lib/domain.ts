import { z } from "zod";

const text = z.string().min(1).max(200);
export const birthSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    localDate: z.iso.date(),
    localTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/),
    timePrecision: z.enum(["minute", "second"]),
    place: z.strictObject({
      id: text,
      city: text,
      region: z.string().max(200),
      country: text,
      label: text,
    }),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    timezone: text.refine(
      (value) => !/^[+-]/.test(value),
      "Timezone must be an IANA name.",
    ),
    utcOffset: z.string().regex(/^[+-](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
    utc: z.string().regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
    resolverVersion: text,
    atlasHash: text,
    timezoneDataVersion: text,
  })
  .superRefine((birth, ctx) => {
    const bad = () =>
      ctx.addIssue({
        code: "custom",
        message:
          "Civil time, offset, timezone and UTC must describe the same instant.",
      });
    const instant = Date.parse(birth.utc);
    if (
      !Number.isFinite(instant) ||
      new Date(instant).toISOString().slice(0, 19) + "Z" !== birth.utc
    )
      return bad();
    if (birth.timePrecision === "minute" && !birth.localTime.endsWith(":00"))
      return bad();
    const sign = birth.utcOffset[0] === "-" ? -1 : 1;
    const seconds =
      sign *
      (Number(birth.utcOffset.slice(1, 3)) * 3600 +
        Number(birth.utcOffset.slice(4, 6)) * 60 +
        Number(birth.utcOffset.slice(7, 9) || 0));
    const civil = new Date(instant + seconds * 1000).toISOString().slice(0, 19);
    if (civil !== `${birth.localDate}T${birth.localTime}`) return bad();
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: birth.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(instant);
      const get = (type: string) =>
        parts.find((part) => part.type === type)?.value;
      if (
        `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}` !==
        civil
      )
        bad();
    } catch {
      bad();
    }
  });
const settingsObject = z.strictObject({
  schemaVersion: z.literal(1),
  reference: z.enum(["tropical", "fagan-bradley", "true-sky"]),
  divisions: z.enum(["equal", "constellation"]),
  ophiuchus: z.boolean(),
  houses: z.enum(["whole-sign", "equal", "placidus"]),
  atmakaraka: z.enum(["progressInSign", "closestToMC"]),
  systems: z.strictObject({
    astrology: z.boolean(),
    humanDesign: z.boolean(),
  }),
});
export const settingsSchema = settingsObject.refine(
  (s) =>
    (s.systems.astrology || s.systems.humanDesign) &&
    (s.divisions !== "constellation" || s.reference === "true-sky"),
);
export const initialSettings = {
  schemaVersion: 1,
  reference: "tropical",
  divisions: "equal",
  ophiuchus: false,
  houses: "whole-sign",
  atmakaraka: "progressInSign",
  systems: { astrology: true, humanDesign: false },
} as const;
