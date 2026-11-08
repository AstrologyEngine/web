import { Temporal } from "@js-temporal/polyfill";
import { z } from "zod";
import { parseDates } from "./date-parse-merge";
import { extractLocationQuery } from "./location-remainder";
import { REGION_ABBREVIATIONS } from "./regions";
import { atlasHash, atlasManifest } from "./atlas-manifest";
import { birthSchema } from "../../domain";

export const resolverVersion =
  "website-e00a2f9e10aa5b4f338875bc306166bfb939903c-plugin-v1";
// The host supplies ICU/tzdb through Intl; its version is not exposed by Workers.
export const timezoneDataVersion =
  "runtime-intl-tzdb-unreported-temporal-polyfill-0.5.1";
export const resolveInputSchema = z.strictObject({
  sentence: z.string().min(1).max(500),
  dateKey: z.string().max(200).optional(),
  locationKey: z.string().max(200).optional(),
  timeKey: z.string().max(200).optional(),
});
const row = z.tuple([
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.string(),
  z.number().min(-90).max(90),
  z.number().min(-180).max(180),
  z.number().nonnegative(),
  z.string(),
]);
const words = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];
type FetchAsset = (path: string) => Promise<Response>;
const cache = new Map<string, Promise<z.infer<typeof row>[]>>();
const load = async (initial: string, fetchAsset: FetchAsset) => {
  const name = `${initial.codePointAt(0)!.toString(16)}.bin`;
  const entry = (
    atlasManifest.shards as Record<string, { sha256: string; bytes: number }>
  )[name];
  if (!entry) return [];
  const existing = cache.get(name);
  if (existing) return existing;
  const pending = (async () => {
    const response = await fetchAsset(`/atlas/${name}`);
    if (!response.ok) throw new Error("atlas unavailable");
    const data = await response.arrayBuffer();
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    if (data.byteLength !== entry.bytes || digest !== entry.sha256)
      throw new Error("atlas integrity failure");
    const decompressed = await new Response(
      new Response(data).body!.pipeThrough(new DecompressionStream("gzip")),
    ).text();
    return z.array(row).parse(JSON.parse(decompressed));
  })().catch((error) => {
    cache.delete(name);
    throw error;
  });
  cache.set(name, pending);
  if (cache.size > 2) cache.delete(cache.keys().next().value!);
  return pending;
};
const locations = async (query: string, fetchAsset: FetchAsset) => {
  const tokens = query.replace(/,/g, " ").trim().split(/\s+/);
  const region =
    tokens.length > 1
      ? REGION_ABBREVIATIONS[tokens.at(-1)!.toUpperCase()]
      : undefined;
  if (region) tokens.pop();
  const required = words(tokens.join(" "));
  if (!required.length) return [];
  const matches = [];
  for (const [
    key,
    city,
    asciiName,
    province,
    country,
    countryCode,
    lat,
    lng,
    population,
    timezone,
  ] of await load(required[0]![0]!, fetchAsset)) {
    if (
      region &&
      (province !== region.region || countryCode !== region.country)
    )
      continue;
    const searchable = words([city, asciiName, province, country].join(" "));
    if (
      required.every((term) => searchable.some((word) => word.startsWith(term)))
    )
      matches.push({
        key,
        city,
        region: province,
        country,
        timezone,
        population,
        lat,
        lng,
      });
    if (matches.length === 5) break;
  }
  return matches;
};
const hex = async (s: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
export const resolveBirth = async (
  input: z.infer<typeof resolveInputSchema>,
  fetchAsset: FetchAsset,
) => {
  const body = resolveInputSchema.parse(input);
  const parsed = parseDates(body.sentence);
  const locationQuery = extractLocationQuery(
    body.sentence,
    parsed.consumedSpans,
  );
  const dates = parsed.dates.map((date) => ({
    ...date,
    key: `${date.wallClock.year}-${date.wallClock.month}-${date.wallClock.day}|${date.hasTime ? `${date.wallClock.hour}:${date.wallClock.minute}:${date.wallClock.second ?? 0}` : "timeless"}`,
  }));
  // An explicit offset or timezone must not be reinterpreted as local time.
  // Ask for a single local civil time, since the input contract has no zone-selection field.
  if (parsed.hasRange)
    return {
      kind: "needs_input" as const,
      dates,
      locations: [],
      locationQuery,
      message:
        "The birth details contain a range. Supply one exact date and time.",
    };
  if (
    parsed.hasExplicitTimezone ||
    /\b(?:UTC|GMT)(?:[+-]\d{1,2}(?::?\d{2})?)?\b/i.test(body.sentence) ||
    /\b[A-Za-z_]+\/[A-Za-z_]+(?:\/[A-Za-z_]+)?\b/.test(body.sentence)
  )
    return {
      kind: "needs_input" as const,
      dates,
      locations: [],
      locationQuery,
      message:
        "An explicit timezone or offset was supplied. Please provide the local birth date and time at the birthplace without a timezone, or clarify the intended local time.",
    };
  const places = await locations(locationQuery, fetchAsset);
  const valid = dates.filter((d) => d.valid);
  const date = body.dateKey
    ? valid.find((d) => d.key === body.dateKey)
    : valid.length === 1
      ? valid[0]
      : undefined;
  const place =
    places.find((p) => p.key === body.locationKey) ??
    (!body.locationKey &&
    (places.length < 2 || places[1]!.population < places[0]!.population * 0.5)
      ? places[0]
      : undefined);
  const base = { dates, locations: places, locationQuery };
  const need = (
    message: string,
    timeChoices?: { key: string; label: string }[],
  ) => ({
    kind: "needs_input" as const,
    ...base,
    message,
    ...(timeChoices ? { timeChoices } : {}),
  });
  if (!date)
    return need(
      dates.length
        ? "Choose a valid date interpretation."
        : "Enter a complete birth date, including the year.",
    );
  if (!date.hasTime) return need("Add your birth time to calculate a chart.");
  if (!place)
    return need(
      places.length
        ? "Choose your birthplace."
        : "No place found. Add a city and state or country.",
    );
  const wall = Temporal.PlainDateTime.from(date.wallClock, {
    overflow: "reject",
  });
  const earlier = wall.toZonedDateTime(place.timezone, {
    disambiguation: "earlier",
  });
  const later = wall.toZonedDateTime(place.timezone, {
    disambiguation: "later",
  });
  if (
    !earlier.toPlainDateTime().equals(wall) ||
    !later.toPlainDateTime().equals(wall)
  )
    return need(
      "That local time was skipped when the clocks changed. Correct the birth time.",
    );
  let zoned = earlier;
  if (earlier.epochNanoseconds !== later.epochNanoseconds) {
    const choices = [earlier, later].map((t) => ({
      key: t.toInstant().toString(),
      label: `${t.offset} (${t.toInstant().toString()})`,
    }));
    const selected = [earlier, later].find(
      (t) => t.toInstant().toString() === body.timeKey,
    );
    if (!selected)
      return need(
        "That local time occurred twice. Choose the recorded UTC offset.",
        choices,
      );
    zoned = selected;
  }
  const utc = zoned.toInstant().toString({ smallestUnit: "second" });
  if (Date.parse(utc) > Date.now())
    return need("Birth time must be in the past.");
  if (utc < "1849-12-31T23:59:28Z" || utc > "2149-12-20T23:58:50Z")
    return {
      kind: "error" as const,
      code: "OUT_OF_COVERAGE",
      message: "Birth time is outside sky data coverage.",
      retryable: false,
    };
  const label = [place.city, place.region, place.country]
    .filter(Boolean)
    .join(", ");
  const candidate = birthSchema.safeParse({
    schemaVersion: 1,
    localDate: wall.toPlainDate().toString(),
    localTime: wall.toPlainTime().toString({ smallestUnit: "second" }),
    timePrecision: date.wallClock.second === undefined ? "minute" : "second",
    place: {
      id: place.key,
      city: place.city,
      region: place.region,
      country: place.country,
      label,
    },
    latitude: place.lat,
    longitude: place.lng,
    timezone: place.timezone,
    utcOffset: zoned.offset,
    utc,
    resolverVersion,
    atlasHash,
    timezoneDataVersion,
  });
  if (!candidate.success)
    return {
      kind: "error" as const,
      code: "INVALID_INPUT",
      message:
        "The birth details could not be validated. Check the date, time and birthplace.",
      retryable: false,
    };
  const birth = candidate.data;
  return {
    kind: "resolved" as const,
    birth,
    digest: await hex(JSON.stringify(birth)),
  };
};
export const validateResolvedBirth = async (
  birth: z.infer<typeof birthSchema>,
  fetchAsset: FetchAsset,
) => {
  const parsed = birthSchema.parse(birth);
  if (
    parsed.atlasHash !== atlasHash ||
    parsed.resolverVersion !== resolverVersion ||
    parsed.timezoneDataVersion !== timezoneDataVersion
  )
    return false;
  const rows = await load(words(parsed.place.city)[0]?.[0] ?? "", fetchAsset);
  return (
    rows.some(
      ([id, city, , region, country, , lat, lng, , timezone]) =>
        id === parsed.place.id &&
        city === parsed.place.city &&
        region === parsed.place.region &&
        country === parsed.place.country &&
        lat === parsed.latitude &&
        lng === parsed.longitude &&
        timezone === parsed.timezone &&
        parsed.place.label ===
          [city, region, country].filter(Boolean).join(", "),
    ) &&
    parsed.utc >= "1849-12-31T23:59:28Z" &&
    parsed.utc <= "2149-12-20T23:58:50Z" &&
    Date.parse(parsed.utc) <= Date.now()
  );
};
