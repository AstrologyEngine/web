import { test, expect } from "@playwright/test";
import { enterBirth, reopenBirth } from "./helpers";

test("a learner explores a sign and its chart context", async ({ page }) => {
  await page.goto("/app");
  await enterBirth(page);
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "Aries", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aries", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Sign details" })
      .getByText(/Tropical.*whole-sign/i),
  ).toBeVisible();
});

test("named alternatives explain a house, angle and aspect with active system help", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await page.getByText("Choose a house by number").click();
  await page
    .getByRole("button", { name: "House 1", exact: true })
    .last()
    .click();
  const house = page.getByRole("complementary", { name: "House details" });
  await expect(house.getByRole("heading", { name: "House 1" })).toBeVisible();
  await expect(house.getByText("Occupants")).toBeVisible();
  await expect(house.getByText("Ruler", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByText("Choose an angle by name").click();
  await page
    .getByRole("button", { name: "Ascendant", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("complementary", { name: "Angle details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page
    .getByRole("button", { name: "Explore aspects", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(picker.getByRole("button", { name: "Back" })).toBeVisible();
  await picker.getByRole("button", { name: "Back" }).click();
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  const second = picker.locator(".picker-buttons button").first();
  const secondName = await second.textContent();
  await second.click();
  const aspect = page.getByRole("complementary", { name: "Aspect details" });
  await expect(aspect).toContainText("Sun");
  await expect(aspect).toContainText(secondName!.trim());
  await expect(aspect).not.toContainText(/orb|applying|separating/i);
  await page.getByRole("button", { name: "About this system" }).click();
  await expect(page.getByRole("region", { name: "System help" })).toContainText(
    "Tropical",
  );
});

test("supported signs persist and Ophiuchus clears when unavailable", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await page.getByText("Choose a sign by name").click();
  await page.getByRole("button", { name: "Aries", exact: true }).last().click();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const detail = page.getByRole("complementary", { name: "Sign details" });
  await expect(detail.getByRole("heading", { name: "Aries" })).toBeVisible();
  await expect(detail).toContainText("Vedic");
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Ophiuchus", exact: true })
    .last()
    .click();
  await expect(
    detail.getByRole("heading", { name: "Ophiuchus" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tropical", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tropical", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(detail).toHaveCount(0);
});

test("aspect pair can be reselected in reverse to clear details", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const explore = page.getByRole("button", {
    name: "Explore aspects",
    exact: true,
  });
  await explore.click();
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  const second = (await picker
    .locator(".picker-buttons button")
    .first()
    .textContent())!.trim();
  await picker.getByRole("button", { name: second, exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Aspect details" }),
  ).toBeVisible();
  await explore.click();
  await picker.getByRole("button", { name: second, exact: true }).click();
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Aspect details" }),
  ).toHaveCount(0);
});

test("an open aspect picker closes when a newer chart is accepted", async ({
  page,
}) => {
  let hold = false;
  let release: () => void = () => {};
  let arrived: () => void = () => {};
  const waiting = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/engine/ephemeris/**/*.bin", async (route) => {
    if (hold) {
      hold = false;
      arrived();
      await gate;
    }
    await route.continue();
  });
  await page.goto("/app");
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await reopenBirth(page);
  hold = true;
  await enterBirth(page, "January 2, 1980 at 3pm in London");
  await waiting;
  await page
    .getByRole("button", { name: "Explore aspects", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Choose an aspect" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("dialog", { name: "Choose an aspect" }),
  ).toHaveCount(0);
});

test("body selection dims unrelated lines and starts the aspect picker at its connections", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const chart = page.getByRole("group", { name: /natal chart/i });
  const lines = chart.locator(
    'line[stroke="var(--w-hard)"], line[stroke="var(--w-soft)"]',
  );
  await expect(lines.first()).toBeAttached();
  const before = await lines.evaluateAll((items) =>
    items.map((line) => Number(line.getAttribute("opacity"))),
  );
  await chart.getByRole("button", { name: "Sun", exact: true }).click();
  const after = await lines.evaluateAll((items) =>
    items.map((line) => Number(line.getAttribute("opacity"))),
  );
  expect(after.some((value, index) => value < before[index]!)).toBe(true);
  expect(after.some((value, index) => value === before[index])).toBe(true);
  await page.getByRole("button", { name: "Explore aspects of Sun" }).click();
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await expect(
    picker.getByRole("heading", { name: "Choose a connection to Sun" }),
  ).toBeVisible();
  await picker.getByRole("button", { name: "Back" }).click();
  await expect(
    picker.getByRole("heading", { name: "Choose the first body" }),
  ).toBeVisible();
});

test("pointer aspect picker limits choices to lines near the click", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const chart = page.getByRole("group", { name: /natal chart/i });
  await expect(chart).toBeVisible();
  await chart.scrollIntoViewIfNeeded();
  const point = await chart.evaluate((svg) => {
    const lines = [
      ...svg.querySelectorAll(
        'line[stroke="var(--w-hard)"], line[stroke="var(--w-soft)"]',
      ),
    ].map((line) => ({
      x1: Number(line.getAttribute("x1")),
      y1: Number(line.getAttribute("y1")),
      x2: Number(line.getAttribute("x2")),
      y2: Number(line.getAttribute("y2")),
    }));
    const distance = (
      p: { x: number; y: number },
      l: (typeof lines)[number],
    ) => {
      const dx = l.x2 - l.x1,
        dy = l.y2 - l.y1;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - l.x1) * dx + (p.y - l.y1) * dy) / (dx * dx + dy * dy || 1),
        ),
      );
      return Math.hypot(p.x - l.x1 - t * dx, p.y - l.y1 - t * dy);
    };
    for (const line of lines)
      for (const t of [0.25, 0.35, 0.45, 0.55, 0.65, 0.75]) {
        const p = {
          x: line.x1 + (line.x2 - line.x1) * t,
          y: line.y1 + (line.y2 - line.y1) * t,
        };
        if (
          lines.filter((candidate) => distance(p, candidate) < 11).length === 1
        ) {
          const screen = new DOMPoint(p.x, p.y).matrixTransform(
            (svg as SVGSVGElement).getScreenCTM()!,
          );
          return { x: screen.x, y: screen.y };
        }
      }
    throw Error("No isolated line found in fixture");
  });
  await page.mouse.click(point.x, point.y);
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await expect(picker).toBeVisible();
  await expect(picker.locator(".picker-buttons button")).toHaveCount(2);
  await picker.locator(".picker-buttons button").first().click();
  await expect(picker.locator(".picker-buttons button")).toHaveCount(1);
});

test("direct house and angle targets open mobile details", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await enterBirth(page);
  const chart = page.getByRole("group", { name: /natal chart/i });
  const house = chart.getByRole("button", { name: "House 1", exact: true });
  await house.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "House details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(house).toBeFocused();
  const angle = chart.getByRole("button", { name: "Ascendant", exact: true });
  await angle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Angle details" }),
  ).toBeVisible();
});

test("an Ophiuchus house cusp has Pluto as its only, modern ruler", async ({
  page,
}) => {
  // Controlled cusp positions exercise wording and do not establish astronomical accuracy.
  await page.route("**/calculation-worker.js", async (route) => {
    const response = await route.fetch();
    const patch = `const post = self.postMessage.bind(self); self.postMessage = message => { if (message.result?.ok) { const c = message.result.snapshot.systems.astrology.selectedFrame; const sector = c.zodiac_sectors.find(s => s.sign === 'ophiuchus'); if (sector) { const target = sector.start_degrees + sector.width_degrees / 2; const delta = target - c.cusps[0]; c.cusps = c.cusps.map(value => (value + delta + 360) % 360); } } post(message); };\n`;
    await route.fulfill({ response, body: patch + (await response.text()) });
  });
  await page.goto("/app");
  await enterBirth(page);
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "House 1", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const house = page.getByRole("complementary", { name: "House details" });
  await expect(house.getByText("Ophiuchus", { exact: true })).toBeVisible();
  await expect(
    house.locator("dt", { hasText: /^Modern ruler$/ }).locator("+ dd"),
  ).toHaveText("Pluto");
  await expect(house.getByText("Traditional ruler")).toHaveCount(0);
});
