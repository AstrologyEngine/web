import { expect, test } from "@playwright/test";
import { enterBirth } from "./helpers";

// Runs against a web server whose CMS is unreachable: copy comes from the
// bundled snapshot and the site keeps working.
test("the landing page renders snapshot copy", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: /explore your birth chart/i }),
  ).toBeVisible();
  await expect(
    page.getByText("A LITTLE CURIOSITY GOES A LONG WAY"),
  ).toBeVisible();
});

test("a visitor can still create and explore a chart", async ({ page }) => {
  await page.goto("/app");
  await enterBirth(page);
  const chart = page.getByRole("group", { name: /natal chart/i });
  await expect(chart).toBeVisible({ timeout: 30000 });
  await chart.getByRole("button", { name: "Sun" }).click();
  await expect(
    page.getByText(/The Sun symbolizes identity, purpose/),
  ).toBeVisible();
});
