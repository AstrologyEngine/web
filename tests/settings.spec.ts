import { test, expect } from "@playwright/test";

test("learner switches an accepted chart to Vedic", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Vedic.*Equal houses/)).toBeVisible();
});

test("advanced edits apply on close and Custom restores them during this visit", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: /Advanced settings/ }).click();
  await page.getByLabel("House system").selectOption("placidus");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Custom", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: /Custom.*Placidus houses/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tropical", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tropical", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Custom", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Custom", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: /Custom.*Placidus houses/ }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Birth details")).toBeEmpty();
  await expect(page.getByRole("group", { name: /Zodiac presets/ })).toHaveCount(
    0,
  );
});

test("newer birth and preset win while an earlier calculation is pending", async ({
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
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  hold = true;
  await page
    .getByLabel("Birth details")
    .fill("January 2, 1980 at 3pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await waiting;
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tropical", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText(/Showing the previous chart for 2000-06-21/),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Showing the previous chart for/)).toHaveCount(0);
  await expect(page.getByText(/1980-01-02/)).toBeVisible();
});

test("failed birth update can recover by choosing another preset", async ({
  page,
}) => {
  let fail = false;
  await page.route("**/engine/ephemeris/**/*.bin", async (route) => {
    if (fail) {
      fail = false;
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  fail = true;
  await page
    .getByLabel("Birth details")
    .fill("January 2, 1980 at 3pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/Showing the previous chart for/)).toHaveCount(0);
});

test("Escape closes advanced settings without dismissing the birth editor", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Edit birth details" }).click();
  await page.getByRole("button", { name: /Advanced settings/ }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Advanced settings" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Birth details")).toBeVisible();
});
