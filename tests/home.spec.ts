import { test, expect } from "@playwright/test";

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`visitor previews the chart and reaches birth entry at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /explore your birth chart/i }),
    ).toBeVisible();
    await expect(page.getByText(/sample chart/i)).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: /sample.*aries.*taurus.*gemini.*houses 1.*3/i,
      }),
    ).toBeVisible();
    const start = page.getByRole("link", { name: /start exploring/i });
    await start.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/app$/);
    const entry = page.getByLabel(/birth details/i);
    await expect(entry).toBeVisible();
    await expect(entry).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(entry).toBeFocused();
    await expect(entry).toBeEmpty();
  });
}

test("visitor creates a personal chart from birth details", async ({
  page,
}) => {
  await page.goto("/app");
  await page
    .getByLabel(/birth details/i)
    .fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: /apply|create chart/i }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible({
    timeout: 30000,
  });
});

test("visitor resolves an ambiguous date and can discard an incomplete edit", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("03/04/2000 at 1pm in London");
  await page.getByRole("button", { name: /Mar 4, 2000/ }).click();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  await page.getByLabel("Birth details").fill("incomplete");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit birth details" }),
  ).toBeFocused();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await expect(page.getByText(/2000-03-04/)).toBeVisible();
});

test("visitor can retry an unavailable birth resolver", async ({ page }) => {
  let fail = true;
  await page.route("**/api/resolve-birth", async (route) => {
    if (fail) {
      fail = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
});

test("visitor can retry unavailable calculation data and reload starts fresh", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/engine/ephemeris/index.json", async (route) => {
    if (fail) {
      fail = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toContainText(
    /download calculation data/i,
  );
  await page.getByRole("button", { name: "Retry calculation" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Birth details")).toBeEmpty();
  await expect(page.getByRole("group", { name: /natal chart/i })).toHaveCount(
    0,
  );
});

test("failed update labels the previous chart and retains keyboard focus", async ({
  page,
}) => {
  let failSlice = false;
  await page.route("**/engine/ephemeris/**/*.bin", async (route) => {
    if (failSlice) await route.abort();
    else await route.continue();
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  failSlice = true;
  await page
    .getByLabel("Birth details")
    .fill("January 2, 1980 at 3pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByText(/Showing the previous chart for 2000-06-21/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit birth details" }),
  ).toBeFocused();
});

test("visitor sees a retry when the calculation worker cannot start", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", { value: undefined });
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toContainText(/could not start/i);
  await expect(
    page.getByRole("button", { name: "Retry calculation" }),
  ).toBeVisible();
});
