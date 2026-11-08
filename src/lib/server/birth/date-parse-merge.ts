/**
 * date-parse-merge — the deep module of the natural-language birth input
 * (CHAT-dfimrhdr). Raw free-form text in; date candidates + consumed
 * character spans out. Owns, behind that one function:
 *
 *  - dual-locale chrono parse (US month-first + GB day-first), because chrono
 *    returns exactly one reading per locale and an ambiguous 08/06/1981 has two;
 *  - fragment merge: a component (year/month/day/hour/minute) is taken only
 *    from a fragment that stated it for certain (`isCertain`) — implied
 *    defaults (hour ⇒ noon) must never leak into a birth chart;
 *  - span union across every fragment, so the caller can carve the location
 *    query out of whatever chrono did not claim;
 *  - locale de-dupe (unambiguous input and the >12 auto-swap collapse to one
 *    candidate, order tagged "us");
 *  - `hasTime` from `isCertain('hour')`;
 *  - validity: complete, non-conflicting calendar input. UTC coverage and future
 *    checks belong to the resolver after timezone conversion.
 *
 * This file feeds chart input. No jokes here.
 */
import { Temporal } from "@js-temporal/polyfill";
import * as en from "chrono-node/en";
const MIN_CALENDAR_YEAR = 1;
const MAX_CALENDAR_YEAR = 9999;

export type Span = { start: number; end: number };

export type WallClockParts = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

export type DateOrder = "us" | "gb";

export type DateCandidate = {
  wallClock: WallClockParts;
  hasTime: boolean;
  label: string;
  order: DateOrder;
  valid: boolean;
  invalidReason?: string;
};

export type DateParseResult = {
  dates: DateCandidate[];
  consumedSpans: Span[];
  hasRange: boolean;
  hasExplicitTimezone: boolean;
};

export type ParseDatesOptions = {
  // Reference date used by chrono while identifying date fragments.
  referenceDate?: Date;
};

const COMPONENTS = [
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
] as const;
type Component = (typeof COMPONENTS)[number];

const MONTH_ABBREVIATIONS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

type MergedFragments = {
  known: Partial<Record<Component, number>>;
  conflicted: Component[];
  spans: Span[];
};

// Collapse a locale's fragments into one set of certain components. A
// component conflict (two fragments both certain, different values) is
// recorded, never resolved by guessing.
const mergeFragments = (
  results: ReturnType<typeof en.casual.parse>,
): MergedFragments => {
  const known: Partial<Record<Component, number>> = {};
  const conflicted: Component[] = [];
  const spans: Span[] = [];
  for (const result of results) {
    spans.push({ start: result.index, end: result.index + result.text.length });
    for (const component of COMPONENTS) {
      if (!result.start.isCertain(component)) continue;
      const value = result.start.get(component);
      if (value == null) continue;
      if (known[component] !== undefined && known[component] !== value) {
        if (!conflicted.includes(component)) conflicted.push(component);
        continue; // first certain value wins the wall clock; the flag blocks charting
      }
      known[component] = value;
    }
  }
  return { known, conflicted, spans };
};

const formatTwelveHour = (hour: number, minute: number): string => {
  const meridiem = hour < 12 ? "AM" : "PM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${meridiem}`;
};

const formatLabel = (wallClock: WallClockParts, hasTime: boolean): string => {
  const monthName =
    MONTH_ABBREVIATIONS[wallClock.month - 1] ?? String(wallClock.month);
  const datePart = `${monthName} ${wallClock.day}, ${wallClock.year}`;
  return hasTime
    ? `${datePart} · ${formatTwelveHour(wallClock.hour ?? 0, wallClock.minute ?? 0)}`
    : datePart;
};

type Validity = { valid: true } | { valid: false; invalidReason: string };

const validate = (
  wallClock: WallClockParts,
  conflicted: Component[],
): Validity => {
  if (conflicted.length > 0) {
    return {
      valid: false,
      invalidReason:
        "That looks like more than one date — keep the one that belongs to your birth.",
    };
  }
  try {
    Temporal.PlainDateTime.from(
      {
        year: wallClock.year,
        month: wallClock.month,
        day: wallClock.day,
        hour: wallClock.hour ?? 0,
        minute: wallClock.minute ?? 0,
        second: wallClock.second ?? 0,
      },
      { overflow: "reject" },
    );
  } catch {
    return {
      valid: false,
      invalidReason: "Enter a valid calendar date and time.",
    };
  }
  if (
    wallClock.year < MIN_CALENDAR_YEAR ||
    wallClock.year > MAX_CALENDAR_YEAR
  ) {
    return {
      valid: false,
      invalidReason: `We can chart births from ${MIN_CALENDAR_YEAR} through ${MAX_CALENDAR_YEAR} — ${wallClock.year} falls outside that range.`,
    };
  }
  return { valid: true };
};

const toCandidate = (
  merged: MergedFragments,
  order: DateOrder,
): DateCandidate | null => {
  const { known, conflicted } = merged;
  // A birth date needs a stated year, month, and day. Implied values (chrono
  // filling in "this year") must never become a chart, so partial parses
  // yield no candidate rather than a confident-looking wrong one.
  if (
    known.year === undefined ||
    known.month === undefined ||
    known.day === undefined
  ) {
    return null;
  }
  const hasTime = known.hour !== undefined;
  const wallClock: WallClockParts = {
    year: known.year,
    month: known.month,
    day: known.day,
    // An unstated minute alongside a stated hour ("at 3pm") is a true zero.
    ...(hasTime
      ? {
          hour: known.hour,
          minute: known.minute ?? 0,
          ...(known.second !== undefined ? { second: known.second } : {}),
        }
      : {}),
  };
  const validity = validate(wallClock, conflicted);
  return {
    wallClock,
    hasTime,
    label: formatLabel(wallClock, hasTime),
    order,
    ...(validity.valid
      ? { valid: true }
      : { valid: false, invalidReason: validity.invalidReason }),
  };
};

const sameReading = (a: DateCandidate, b: DateCandidate): boolean =>
  a.hasTime === b.hasTime &&
  a.wallClock.year === b.wallClock.year &&
  a.wallClock.month === b.wallClock.month &&
  a.wallClock.day === b.wallClock.day &&
  a.wallClock.hour === b.wallClock.hour &&
  a.wallClock.minute === b.wallClock.minute &&
  a.wallClock.second === b.wallClock.second;

const dedupeSpans = (spans: Span[]): Span[] => {
  const seen = new Set<string>();
  const unique: Span[] = [];
  for (const span of spans) {
    const key = `${span.start}:${span.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(span);
  }
  return unique.sort((a, b) => a.start - b.start || a.end - b.end);
};

export const parseDates = (
  rawText: string,
  options?: ParseDatesOptions,
): DateParseResult => {
  const referenceDate = options?.referenceDate ?? new Date();
  const locales: Array<{ order: DateOrder; parser: typeof en.casual }> = [
    { order: "us", parser: en.casual },
    { order: "gb", parser: en.GB },
  ];

  const spans: Span[] = [];
  const candidates: DateCandidate[] = [];
  let hasRange = false;
  let hasExplicitTimezone = false;
  for (const { order, parser } of locales) {
    const results = parser.parse(rawText, referenceDate);
    hasRange ||= results.some((result) => result.end != null);
    hasExplicitTimezone ||= results.some(
      (result) =>
        result.start.isCertain("timezoneOffset") ||
        !!result.end?.isCertain("timezoneOffset"),
    );
    const merged = mergeFragments(results);
    spans.push(...merged.spans);
    const candidate = toCandidate(merged, order);
    if (!candidate) continue;
    // Locale de-dupe: when US and GB agree the input was never ambiguous —
    // one candidate, tagged with the default (US) order.
    if (candidates.some((existing) => sameReading(existing, candidate)))
      continue;
    candidates.push(candidate);
  }

  return {
    dates: candidates,
    consumedSpans: dedupeSpans(spans),
    hasRange,
    hasExplicitTimezone,
  };
};
