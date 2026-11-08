import { readFile } from "node:fs/promises";
import {
  measurementSchema,
  type MeasurementEvent,
} from "../src/lib/measurement/schema";

const file = process.argv[2];
if (!file) {
  console.error(
    "Usage: bun scripts/measurement-report.ts <filtered-json-or-ndjson-export> <cohort-window> <grace-period>",
  );
  process.exit(1);
}
const raw = await readFile(file, "utf8");
let input: unknown;
try {
  input = JSON.parse(raw);
} catch {
  input = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
const events = new Map<string, MeasurementEvent>();
const extract = (value: unknown): void => {
  if (
    typeof value === "string" &&
    value.length < 1000000 &&
    (value.trim().startsWith("[") || value.trim().startsWith("{"))
  ) {
    try {
      extract(JSON.parse(value));
    } catch {
      /* Ignore non-JSON log messages. */
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(extract);
    return;
  }
  const object = value as Record<string, unknown>;
  if (object.event_source === "natal_explorer_measurement_v1") {
    const result = measurementSchema.safeParse(object.measurement);
    if (result.success) events.set(result.data.eventId, result.data);
    return;
  }
  Object.values(object).forEach(extract);
};
extract(input);
const visits = new Map<string, MeasurementEvent[]>();
for (const event of events.values())
  visits.set(event.visitId, [...(visits.get(event.visitId) ?? []), event]);
const countVisits = (predicate: (event: MeasurementEvent) => boolean) =>
  [...visits.values()].filter((items) => items.some(predicate)).length;
const byEvent = (name: MeasurementEvent["event"]) =>
  countVisits((event) => event.event === name);
const entryStarted = byEvent("entry_started"),
  entryCompleted = byEvent("entry_completed");
const features = [
  "chart",
  "system_help",
  "settings",
  "half_wheel",
  "body_picker",
  "aspect_picker",
] as const;
const featureStats = Object.fromEntries(
  features.map((feature) => [
    feature,
    {
      exposedVisits: countVisits(
        (e) => e.event === "exposure" && e.feature === feature,
      ),
      usingVisits: countVisits(
        (e) => e.event === "feature_use" && e.feature === feature,
      ),
    },
  ]),
);
const segment: Record<
  string,
  {
    visits: number;
    eligible: number;
    opened: number;
    starts: number;
    completed: number;
    usable: number;
    failures: number;
  }
> = {};
for (const items of visits.values()) {
  const context = items.find((e) => e.event === "eligible") ?? items[0]!;
  const key = `${context.device}/${context.system ?? "unavailable"}`;
  const row = (segment[key] ??= {
    visits: 0,
    eligible: 0,
    opened: 0,
    starts: 0,
    completed: 0,
    usable: 0,
    failures: 0,
  });
  row.visits++;
  if (items.some((e) => e.event === "eligible")) row.eligible++;
  if (
    items.some((e) => e.event === "eligible") &&
    items.some((e) => e.event === "explanation_open")
  )
    row.opened++;
  if (items.some((e) => e.event === "entry_started")) row.starts++;
  if (items.some((e) => e.event === "entry_completed")) row.completed++;
  if (items.some((e) => e.event === "chart_usable")) row.usable++;
  if (items.some((e) => e.event === "failure")) row.failures++;
}
const failureCounts: Record<string, number> = {};
const interactionCounts: Record<string, number> = {};
const firstKinds: Record<string, number> = {};
const firstIdentities: Record<string, number> = {};
const firstTimes: number[] = [],
  chartTimes: number[] = [];
let totalOpens = 0,
  distinctPerVisit = 0,
  chartVisitsOver15Interactions = 0;
for (const items of visits.values()) {
  const distinct = new Set<string>();
  for (const e of items) {
    if (e.event === "failure") {
      const key = `${e.stage}/${e.category}`;
      failureCounts[key] = (failureCounts[key] ?? 0) + 1;
    }
    if (e.event === "interaction")
      interactionCounts[e.category] = (interactionCounts[e.category] ?? 0) + 1;
    if (e.event === "explanation_open") {
      totalOpens++;
      distinct.add(JSON.stringify(e.identity));
    }
    if (e.event === "first_insight") {
      firstKinds[e.identity.kind] = (firstKinds[e.identity.kind] ?? 0) + 1;
      const identity = JSON.stringify(e.identity);
      firstIdentities[identity] = (firstIdentities[identity] ?? 0) + 1;
      firstTimes.push(e.ms);
    }
    if (e.event === "chart_usable") chartTimes.push(e.ms);
  }
  distinctPerVisit += distinct.size;
  if (
    items.some((e) => e.event === "chart_usable") &&
    items.filter((e) => e.event === "interaction").length > 15
  )
    chartVisitsOver15Interactions++;
}
console.log(
  JSON.stringify(
    {
      cohort: process.argv[3] ?? "UNSPECIFIED",
      grace: process.argv[4] ?? "UNSPECIFIED",
      deduplicatedEvents: events.size,
      visits: visits.size,
      funnel: {
        entryStarted,
        entryCompleted,
        startedWithoutCompletion:
          countVisits((e) => e.event === "entry_started") -
          [...visits.values()].filter(
            (items) =>
              items.some((e) => e.event === "entry_started") &&
              items.some((e) => e.event === "entry_completed"),
          ).length,
        chartUsable: byEvent("chart_usable"),
        eligible: byEvent("eligible"),
        opened: [...visits.values()].filter(
          (items) =>
            items.some((e) => e.event === "eligible") &&
            items.some((e) => e.event === "explanation_open"),
        ).length,
        orphanOpenings: [...visits.values()].filter(
          (items) =>
            !items.some((e) => e.event === "eligible") &&
            items.some((e) => e.event === "explanation_open"),
        ).length,
      },
      features: featureStats,
      totalOpens,
      distinctExplanationsAcrossVisits: distinctPerVisit,
      interactionCounts,
      chartVisitsOver15Interactions,
      firstKinds,
      firstIdentities,
      firstInsightMs: firstTimes,
      chartUsableMs: chartTimes,
      failureCounts,
      segment,
      note: "Observed within-visit lower bounds; incomplete delivery and sampling can bias results.",
    },
    null,
    2,
  ),
);
