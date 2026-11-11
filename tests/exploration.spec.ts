import { expect, test } from "@playwright/test";

test("a visitor selects a body and reads its placement", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const sun = page.getByRole("button", { name: "Sun", exact: true });
  await sun.click();
  await expect(sun).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Retrograde", { exact: true })).toBeVisible();
});

test("keyboard selection focuses details and Escape returns to its origin", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const sun = page.getByRole("button", { name: "Sun", exact: true });
  await sun.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sun).toBeFocused();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("complementary", { name: "Body details" }),
  ).toHaveCount(0);
});

test("mobile details can be resized, dismissed and leave the chart available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Choose a body by name").click();
  await page.getByRole("button", { name: "Sun", exact: true }).last().click();
  const sheet = page.getByRole("complementary", { name: "Body details" });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await expect
    .poll(() =>
      sheet
        .locator(".scroll")
        .evaluate((element) => element.scrollHeight > element.clientHeight),
    )
    .toBe(true);
  const resize = page.getByRole("slider", { name: "Resize details" });
  await expect(resize).toHaveAttribute("aria-valuenow", "40");
  await resize.focus();
  await page.keyboard.press("ArrowUp");
  await expect(resize).toHaveAttribute("aria-valuenow", "70");
  await page.keyboard.press("ArrowDown");
  await expect(resize).toHaveAttribute("aria-valuenow", "40");
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("complementary", { name: "Body details" }),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
});

test("controlled engine positions use raw final-degree boundaries", async ({
  page,
}) => {
  // These fixtures change only the returned Sun sign progress; they do not test engine accuracy.
  let progress = 28.9999;
  await page.route("**/calculation-worker.js", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    const patch = `const originalPostMessage = self.postMessage.bind(self); self.postMessage = (message) => { if (message.result?.ok) { const sun = message.result.snapshot.systems.astrology.selectedFrame.bodies.find(b => b.name === "SUN"); sun.sign.degrees_in_sign = ${progress}; if (${progress} === 0) sun.sign.sign = "cancer"; } originalPostMessage(message); };\n`;
    await route.fulfill({ response, body: patch + source });
  });
  for (const fixture of [
    { progress: 28.9999, degree: "28.99°", bridge: false },
    { progress: 29, degree: "29°", bridge: true },
    { progress: 29.9999, degree: "29.99°", bridge: true },
    { progress: 0, degree: "0°", bridge: false },
  ]) {
    progress = fixture.progress;
    await page.goto("/app");
    await page
      .getByLabel("Birth details")
      .fill("June 21, 2000 at 1pm in London");
    await page.getByRole("button", { name: "Apply" }).click();
    await page.getByRole("button", { name: "Sun", exact: true }).click();
    const details = page.getByRole("complementary", { name: "Body details" });
    await expect(
      details.getByText(fixture.degree, { exact: true }),
    ).toBeVisible();
    if (fixture.progress === 0)
      await expect(details.getByText("Cancer", { exact: true })).toBeVisible();
    await expect(details.getByText(/final degree of its sign/i)).toHaveCount(
      fixture.bridge ? 1 : 0,
    );
  }
});

test("reselecting, blank chart space, and Close clear the selected body", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const chart = page.getByRole("group", { name: /natal chart/i });
  const sun = chart.getByRole("button", { name: "Sun", exact: true });
  await sun.click();
  await sun.click();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await sun.click();
  await chart.click({ position: { x: 5, y: 5 } });
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await sun.click();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
});

test("a sign highlight clears when a body replaces it", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const chart = page.getByRole("group", { name: /natal chart/i });
  const aries = chart.getByRole("button", { name: "Aries", exact: true });
  await aries.click();
  await expect(aries).toHaveAttribute("aria-pressed", "true");
  await chart.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(aries).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeVisible();
});

test("controlled final-degree note follows accepted systems and is suppressed in True Sky", async ({
  page,
}) => {
  // This worker fixture sets Sun progress to 29.25 degrees and a compatible sign width in each accepted frame.
  await page.route("**/calculation-worker.js", async (route) => {
    const response = await route.fetch();
    const patch = `const originalPostMessage = self.postMessage.bind(self); self.postMessage = (message) => { if (message.result?.ok) { const sun = message.result.snapshot.systems.astrology.selectedFrame.bodies.find(b => b.name === "SUN"); sun.sign.width_degrees = Math.max(30.5, sun.sign.width_degrees); sun.sign.degrees_in_sign = 29.25; } originalPostMessage(message); };\n`;
    await route.fulfill({ response, body: patch + (await response.text()) });
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  const details = page.getByRole("complementary", { name: "Body details" });
  await expect(details.getByText(/final degree of its sign/i)).toBeVisible();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(details.getByText(/final degree of its sign/i)).toBeVisible();
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(details.getByText(/final degree of its sign/i)).toHaveCount(0);
  await expect(details.getByRole("heading", { name: "Sun" })).toBeVisible();
});

test("an accepted birth edit clears prior selection", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  await page
    .getByLabel("Birth details")
    .fill("January 2, 1980 at 3pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(
    page.getByRole("complementary", { name: "Body details" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sun", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("desktop keyboard selection from below the wheel reveals the details heading", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Choose a body by name", { exact: true }).click();
  const sun = page
    .locator(".body-list")
    .getByRole("button", { name: "Sun", exact: true });
  await sun.evaluate((element) => element.scrollIntoView({ block: "start" }));
  await sun.focus();
  await page.keyboard.press("Enter");
  const heading = page.getByRole("heading", { name: "Sun", exact: true });
  await expect(heading).toBeFocused();
  await expect(heading).toBeInViewport();
});
