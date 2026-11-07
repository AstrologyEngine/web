import { test, expect } from "@playwright/test";
test("placeholder page is accessible", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Astrology Engine" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Astrology Engine");
});
