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
    await page.keyboard.press("Tab");
    await expect(entry).toBeFocused();
    await expect(entry).toBeEmpty();
  });
}
