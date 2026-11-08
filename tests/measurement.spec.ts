import { expect, test } from "@playwright/test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

test("a usable chart makes a zero-opening visit eligible without birth data in events", async ({
  page,
}) => {
  const events: unknown[] = [];
  await page.route("**/api/measurement", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await expect
    .poll(() => events.some((event: any) => event.event === "eligible"))
    .toBe(true);
  expect(
    events.filter((event: any) => event.event === "eligible"),
  ).toHaveLength(1);
  expect(
    events.filter((event: any) => event.event === "explanation_open"),
  ).toHaveLength(0);
  expect(JSON.stringify(events)).not.toMatch(/2000|London|1pm/i);
});

test("openings, repeats and both available surfaces count once per visit", async ({
  page,
}) => {
  const events: Record<string, any>[] = [];
  await page.route("**/api/measurement", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const sun = page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "Sun", exact: true });
  await sun.click();
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await sun.click();
  await page.getByRole("button", { name: "About this system" }).click();
  await expect
    .poll(() => events.filter((e) => e.event === "explanation_open").length)
    .toBe(3);
  expect(events.filter((e) => e.event === "eligible")).toHaveLength(1);
  expect(events.filter((e) => e.event === "first_insight")).toHaveLength(1);
  expect(events.find((e) => e.event === "first_insight")?.identity).toEqual({
    kind: "body",
    name: "SUN",
  });
  expect(
    events.filter((e) => e.event === "interaction" && e.category === "repeat"),
  ).toHaveLength(1);
  expect(
    events.filter((e) => e.event === "exposure" && e.feature === "system_help"),
  ).toHaveLength(1);
  expect(
    events.filter(
      (e) => e.event === "feature_use" && e.feature === "system_help",
    ),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(events.filter((e) => e.event === "chart_usable")).toHaveLength(1);
  await page.getByRole("button", { name: "About this system" }).click();
  await page.getByRole("button", { name: "About this system" }).click();
  await expect
    .poll(() =>
      events.some(
        (e) =>
          e.event === "feature_use" &&
          e.feature === "system_help" &&
          e.system === "Vedic",
      ),
    )
    .toBe(true);
  await page.route("**/api/resolve-birth", (route) => route.abort());
  await page.getByRole("button", { name: "Edit birth details" }).click();
  await page
    .getByLabel("Birth details")
    .fill("January 2, 1980 at 3pm in London");
  await expect
    .poll(() =>
      events.some((e) => e.event === "failure" && e.system === "Vedic"),
    )
    .toBe(true);
  await page.unrouteAll({ behavior: "wait" });
  await page.route("**/api/measurement", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.reload();
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect
    .poll(() => events.filter((e) => e.event === "eligible").length)
    .toBe(2);
  const folder = mkdtempSync(join(tmpdir(), "measurement-test-"));
  try {
    const file = join(folder, "synthetic.json");
    const records = events.map((event) => ({
      event_source: "natal_explorer_measurement_v1",
      measurement: event,
    }));
    writeFileSync(file, JSON.stringify([...records, records[0]]));
    const report = JSON.parse(
      execFileSync(
        "bun",
        ["scripts/measurement-report.ts", file, "test cohort", "test grace"],
        { encoding: "utf8" },
      ),
    );
    expect(report.funnel.eligible).toBe(2);
    expect(report.funnel.opened).toBe(1);
    expect(report.totalOpens).toBe(4);
    expect(report.distinctExplanationsAcrossVisits).toBe(3);
    expect(
      report.conversionByEligibilityContext["desktop/Tropical"].eligible,
    ).toBe(2);
    expect(
      report.featureActivityByEventContext["desktop/Vedic"].system_help.uses,
    ).toBe(1);
    expect(
      report.reliabilityByEventContext["desktop/Vedic"]["resolver/unavailable"],
    ).toBeGreaterThan(0);
    expect(report.deduplicatedEvents).toBe(events.length);
    const firstVisit = events.find(
      (event) => event.event === "first_insight",
    )!.visitId;
    writeFileSync(
      file,
      JSON.stringify(
        records.filter(
          (record) =>
            !(
              record.measurement.visitId === firstVisit &&
              record.measurement.event === "eligible"
            ),
        ),
      ),
    );
    const incomplete = JSON.parse(
      execFileSync(
        "bun",
        ["scripts/measurement-report.ts", file, "test cohort", "test grace"],
        { encoding: "utf8" },
      ),
    );
    expect(incomplete.funnel.eligible).toBe(1);
    expect(incomplete.funnel.opened).toBe(0);
    expect(incomplete.funnel.orphanOpenings).toBe(1);
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("the collection endpoint rejects non-allowlisted payloads and is no-store", async ({
  page,
}) => {
  await page.goto("/app");
  const result = await page.evaluate(async () => {
    const base = {
      v: 1,
      eventId: crypto.randomUUID(),
      visitId: crypto.randomUUID(),
      device: "desktop",
      system: null,
      ms: 0,
      event: "entry_started",
    };
    const send = (data: object) =>
      fetch("/api/measurement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    const invalid = await send({ ...base, sentence: "private text" });
    const valid = await send(base);
    return {
      invalid: invalid.status,
      valid: valid.status,
      cache: valid.headers.get("cache-control"),
    };
  });
  expect(result).toEqual({ invalid: 400, valid: 204, cache: "no-store" });
});

test("resolver network failure records a safe category", async ({ page }) => {
  const events: Record<string, any>[] = [];
  await page.route("**/api/measurement", async (route) => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/resolve-birth", (route) => route.abort());
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await expect
    .poll(() =>
      events.some(
        (event) =>
          event.event === "failure" &&
          event.stage === "resolver" &&
          event.category === "unavailable",
      ),
    )
    .toBe(true);
  expect(JSON.stringify(events)).not.toMatch(/2000|London|1pm/i);
});
