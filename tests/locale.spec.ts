import { expect, test } from "@playwright/test";

test("pages declare the negotiated language", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/app");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the language switcher is hidden while only English is enabled", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Language" })).toHaveCount(
    0,
  );
});

test("an unknown ?lang is ignored", async ({ page }) => {
  await page.goto("/?lang=xx");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByText("A LITTLE CURIOSITY GOES A LONG WAY"),
  ).toBeVisible();
});

test("localised pages vary by cookie and Accept-Language", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["vary"]).toMatch(/cookie/i);
  expect(response.headers()["vary"]).toMatch(/accept-language/i);
});
