import { expect, test } from "@playwright/test";
import { enterBirth } from "./helpers";

// Runs against a CMS seeded with tests/fixtures/cms-pseudo-locale.json.
const pseudoEyebrow = "[À ĹÎŢŢĹË ÇÛŔÎÖŚÎŢÝ ĜÖËŚ À ĹÖÑĜ ŴÀÝ]";

test.describe("with a browser preferring the pseudo-locale", () => {
  // Sets Accept-Language (Chromium ignores an extra header for it).
  test.use({ locale: "en-XA" });

  test("negotiates it and falls back to English per entry", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "en-XA");
    await expect(page.getByText(pseudoEyebrow)).toBeVisible();
    // Not translated in the fixture: served from English.
    await expect(
      page.getByRole("link", { name: /start exploring/i }),
    ).toBeVisible();
  });
});

test("?lang switches language and persists it in a cookie", async ({
  page,
}) => {
  await page.goto("/?lang=en-XA");
  await expect(page.getByText(pseudoEyebrow)).toBeVisible();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-XA");
  await page.goto("/?lang=en");
  await expect(
    page.getByText("A LITTLE CURIOSITY GOES A LONG WAY"),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("the language switcher lists enabled locales and switches", async ({
  page,
}) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Language" });
  await expect(
    nav.getByRole("link", { name: "English", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await nav.getByRole("link", { name: "English (pseudo)" }).click();
  await expect(page).toHaveURL(/\?lang=en-XA$/);
  await expect(page.getByText(pseudoEyebrow)).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "[Ĺàñĝûàĝë]" }).getByRole("link", {
      name: "English (pseudo)",
    }),
  ).toHaveAttribute("aria-current", "true");
});

test("the app and reference content use the locale", async ({ page }) => {
  await page.goto("/app?lang=en-XA");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-XA");
  await expect(
    page.getByRole("heading", { name: "[Šţàŕţ ŵîţĥ ýöûŕ ƀîŕţĥ ðëţàîĺš]" }),
  ).toBeVisible();
  await enterBirth(page);
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "[Šûñ]" })
    .click();
  await expect(page.getByText("[Ţĥë Šûñ šýɱƀöĺîžëš îðëñţîţý.]")).toBeVisible();
});
