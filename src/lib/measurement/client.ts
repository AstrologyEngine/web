import type { Feature, Identity, MeasurementEvent, System } from "./schema";
type Payload = MeasurementEvent extends infer E
  ? E extends MeasurementEvent
    ? Omit<E, "v" | "eventId" | "visitId" | "device" | "system" | "ms">
    : never
  : never;
export const createMeasurement = () => {
  const visitId = crypto.randomUUID(),
    start = performance.now();
  let accepted: System | null = null,
    eligibleAt: number | null = null,
    first = false,
    started = false,
    completed = false,
    chartReported = false,
    count = 0;
  let entryAt: number | null = null;
  const exposures = new Set<Feature>(),
    identities = new Set<string>();
  const send = (payload: Payload, elapsed = performance.now() - start) => {
    if (count++ >= 250) return;
    const event = {
      v: 1,
      eventId: crypto.randomUUID(),
      visitId,
      device: innerWidth < 800 ? "mobile" : "desktop",
      system: accepted,
      ms: Math.min(86400000, Math.max(0, Math.round(elapsed))),
      ...payload,
    };
    void fetch("/api/measurement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => {});
  };
  const expose = (feature: Feature) => {
    if (!exposures.has(feature)) {
      exposures.add(feature);
      send({ event: "exposure", feature });
    }
  };
  const eligible = (source: "chart" | "help") => {
    if (eligibleAt === null) {
      eligibleAt = performance.now();
      send({ event: "eligible", source });
    }
  };
  return {
    start: () => {
      if (!started) {
        started = true;
        entryAt = performance.now();
        send({ event: "entry_started" });
      }
    },
    complete: () => {
      if (!completed) {
        completed = true;
        send({ event: "entry_completed" });
      }
    },
    chart: (system: System) => {
      accepted = system;
      if (!chartReported) {
        chartReported = true;
        send({ event: "chart_usable" }, performance.now() - (entryAt ?? start));
      }
      eligible("chart");
      expose("chart");
      expose("system_help");
      expose("settings");
      expose("aspect_picker");
      if (innerWidth < 800) expose("half_wheel");
    },
    fail: (
      stage: "resolver" | "calculation",
      category: "unavailable" | "invalid" | "timeout" | "failed",
    ) => send({ event: "failure", stage, category }),
    expose,
    use: (feature: Feature) => {
      expose(feature);
      send({ event: "feature_use", feature });
    },
    interaction: (
      category: "selection" | "navigation" | "zoom" | "repeat" | "pan",
    ) => send({ event: "interaction", category }),
    open: (identity: Identity) => {
      eligible(identity.kind === "system_help" ? "help" : "chart");
      const key = JSON.stringify(identity);
      send({
        event: "interaction",
        category: identities.has(key) ? "repeat" : "selection",
      });
      identities.add(key);
      send({ event: "explanation_open", identity });
      if (!first) {
        first = true;
        send(
          { event: "first_insight", identity },
          performance.now() - eligibleAt!,
        );
      }
    },
  };
};
export type Measurement = ReturnType<typeof createMeasurement>;
