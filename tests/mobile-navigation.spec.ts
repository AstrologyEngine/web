import { expect, test } from "@playwright/test";

test("a phone visitor enlarges, pans and returns to the whole wheel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "Zoom half wheel" }).click();
  await expect(
    page.getByRole("button", { name: "Show whole wheel" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pan wheel right" }).click();
  const viewport = page.getByRole("region", { name: "Chart viewport" });
  await expect(viewport).toHaveJSProperty("scrollLeft", 140);
  await viewport.scrollIntoViewIfNeeded();
  const rect = await viewport.boundingBox();
  if (!rect) throw new Error("Chart viewport is missing");
  await page.mouse.move(rect.x + rect.width * 0.7, rect.y + 50);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * 0.4, rect.y + 50, { steps: 4 });
  await page.mouse.up();
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(140);
  const panned = await viewport.evaluate((element) => element.scrollLeft);
  await page.getByRole("button", { name: "Show whole wheel" }).click();
  await page.getByRole("button", { name: "Zoom half wheel" }).click();
  await expect(viewport).toHaveJSProperty("scrollLeft", panned);
  await page.getByRole("button", { name: "Show whole wheel" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
});

test("controlled crowded positions in a calculated narrow house open a named picker", async ({
  page,
}) => {
  // Fixture concentrates six bodies into the narrowest calculated house; its cusps are unchanged.
  await page.route("**/calculation-worker.js", async (route) => {
    const response = await route.fetch();
    const patch = `const post = self.postMessage.bind(self); self.postMessage = message => { if (message.result?.ok) { const c = message.result.snapshot.systems.astrology.selectedFrame; const spans = c.cusps.map((start, i) => ({start, width: (c.cusps[(i + 1) % 12] - start + 360) % 360})); const h = spans.reduce((a,b) => a.width < b.width ? a : b); c.bodies.filter(b => ['SUN','MOON','MERCURY','VENUS','MARS','JUPITER'].includes(b.name)).forEach((b,i) => b.longitude = (h.start + h.width * (0.4 + i * 0.03)) % 360); } post(message); };\n`;
    await route.fulfill({ response, body: patch + (await response.text()) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: /True Sky.*Placidus houses/ }),
  ).toBeVisible();
  const group = page
    .getByRole("button", { name: /Grouped bodies:.*Sun/ })
    .first();
  await page.getByRole("button", { name: "Zoom half wheel" }).click();
  await page.getByRole("button", { name: "Pan wheel right" }).click();
  await group.focus();
  await page.keyboard.press("Enter");
  const picker = page.getByRole("dialog", { name: "Choose a body" });
  await expect(picker).toBeVisible();
  const viewport = page.getByRole("region", { name: "Chart viewport" });
  const position = await viewport.evaluate((element) => element.scrollLeft);
  await page.keyboard.press("Escape");
  await expect(group).toBeFocused();
  await page.keyboard.press("Enter");
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(viewport).toHaveJSProperty("scrollLeft", position);
  await expect(
    page.getByRole("heading", { name: "Sun", exact: true }),
  ).toBeVisible();
  await expect(group).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(group).toBeFocused();
  await expect(viewport).toHaveJSProperty("scrollLeft", position);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
