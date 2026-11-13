import { test, expect } from "@playwright/test";
import {
  birthDialog,
  birthField,
  doneButton,
  editBirthButton,
  enterBirth,
  reopenBirth,
} from "./helpers";

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
    const entry = birthField(page);
    await expect(birthDialog(page)).toBeVisible();
    await expect(entry).toBeEnabled();
    await expect(entry).toBeFocused();
    await expect(entry).toBeEmpty();
  });
}

test("visitor creates a personal chart from birth details", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible({
    timeout: 30000,
  });
});

test("visitor resolves an ambiguous date and can discard an incomplete edit", async ({
  page,
}) => {
  await page.goto("/app");
  await birthField(page).fill("03/04/2000 at 1pm in London");
  await page.getByRole("button", { name: /Mar 4, 2000/ }).click();
  await expect(doneButton(page)).toBeEnabled();
  await doneButton(page).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await reopenBirth(page);
  await birthField(page).fill("incomplete");
  await page.keyboard.press("Escape");
  await expect(birthDialog(page)).toHaveCount(0);
  await expect(editBirthButton(page)).toBeFocused();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await expect(editBirthButton(page)).toHaveAccessibleDescription(
    /March 4, 2000 at 1:00 PM/,
  );
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
  await birthField(page).fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await doneButton(page).click();
  await expect(birthDialog(page)).toHaveCount(0);
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
  await birthField(page).fill("June 21, 2000 at 1pm in London");
  // The first calculation fails inside the modal, which stays open.
  const dialog = birthDialog(page);
  await expect(dialog.getByRole("alert")).toContainText(
    "Whoops, chart data couldn’t be downloaded.",
  );
  await expect(doneButton(page)).toBeDisabled();
  await dialog.getByRole("button", { name: "Retry calculation" }).click();
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await doneButton(page).click();
  await page.reload();
  await expect(birthField(page)).toBeEmpty();
  await expect(page.getByRole("group", { name: /natal chart/i })).toHaveCount(
    0,
  );
});

test("a failed update shows a Whoops line with Retry and retains keyboard focus", async ({
  page,
}) => {
  let failSlice = false;
  await page.route("**/engine/ephemeris/**/*.bin", async (route) => {
    if (failSlice) await route.abort();
    else await route.continue();
  });
  await page.goto("/app");
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await reopenBirth(page);
  failSlice = true;
  await birthField(page).fill("January 2, 1980 at 3pm in London");
  // The failure appears in the open modal as one line with a Retry link.
  const dialog = birthDialog(page);
  await expect(dialog.getByRole("alert")).toHaveText(
    "Whoops, chart data couldn’t be downloaded.",
  );
  await expect(
    dialog.getByRole("button", { name: "Retry calculation" }),
  ).toHaveText("Retry");
  await expect(dialog.getByText(/previous chart/i)).toHaveCount(0);
  await doneButton(page).click();
  await expect(editBirthButton(page)).toBeFocused();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry calculation" }),
  ).toBeVisible();
});

test("visitor sees a retry when the calculation worker cannot start", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "Worker", { value: undefined });
  });
  await page.goto("/app");
  await birthField(page).fill("June 21, 2000 at 1pm in London");
  const dialog = birthDialog(page);
  await expect(dialog.getByRole("alert")).toHaveText(
    "Whoops, chart calculation couldn’t start.",
  );
  await expect(
    dialog.getByRole("button", { name: "Retry calculation" }),
  ).toBeVisible();
  await expect(doneButton(page)).toBeDisabled();
});
