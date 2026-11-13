import { test, expect } from "@playwright/test";
import {
  birthField,
  editBirthButton,
  enterBirth,
  reopenBirth,
} from "./helpers";

test("learner switches an accepted chart to Vedic", async ({ page }) => {
  await page.goto("/app");
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", {
      name: "Advanced settings: Whole Sign houses",
    }),
  ).toBeVisible();
});

test("the house system applies from the menu and is kept across presets", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await expect(
    page.getByRole("group", { name: "Zodiac presets" }).getByRole("button"),
  ).toHaveText(["Tropical", "Vedic", "True Sky"]);
  await page.getByRole("button", { name: /Advanced settings/ }).click();
  const menu = page.getByRole("menu", { name: "House system" });
  await expect(
    menu.getByRole("menuitemradio", { name: "Whole Sign" }),
  ).toHaveAttribute("aria-checked", "true");
  await menu.getByRole("menuitemradio", { name: "Placidus" }).click();
  await expect(menu).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Advanced settings: Placidus houses" }),
  ).toBeVisible();
  await expect(page.getByText(/Actual houses: placidus/)).toBeVisible();
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Advanced settings: Placidus houses" }),
  ).toBeVisible();
  await page.reload();
  await expect(birthField(page)).toBeEmpty();
  await expect(
    page.getByRole("img", { name: "Empty chart awaiting birth details" }),
  ).toBeAttached();
  await expect(page.getByRole("group", { name: /natal chart/i })).toHaveCount(
    0,
  );
  await enterBirth(page);
  await expect(
    page.getByRole("button", { name: "Advanced settings: Whole Sign houses" }),
  ).toBeVisible();
});

test("the house menu works from the keyboard and closes without changes", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "Sun", exact: true })
    .click();
  const details = page.getByRole("complementary", { name: "Body details" });
  const more = page.getByRole("button", { name: /Advanced settings/ });
  const menu = page.getByRole("menu", { name: "House system" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(
    menu.getByRole("menuitemradio", { name: "Whole Sign" }),
  ).toBeFocused();
  // Arrow keys move focus without applying.
  await page.keyboard.press("ArrowDown");
  await expect(
    menu.getByRole("menuitemradio", { name: "Equal" }),
  ).toBeFocused();
  await expect(more).toHaveAccessibleName(
    "Advanced settings: Whole Sign houses",
  );
  // Escape closes the menu only: the selected body stays open.
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(more).toBeFocused();
  await expect(details).toBeVisible();
  // An outside click closes without changes.
  await more.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(5, 400);
  await expect(menu).toBeHidden();
  await expect(more).toHaveAccessibleName(
    "Advanced settings: Whole Sign houses",
  );
  // Enter applies the focused option and returns focus to the button.
  await more.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(more).toHaveAccessibleName("Advanced settings: Placidus houses");
  await expect(more).toBeFocused();
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
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await reopenBirth(page);
  hold = true;
  await enterBirth(page, "January 2, 1980 at 3pm in London");
  await waiting;
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tropical", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  release();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(editBirthButton(page)).toHaveAccessibleDescription(
    /January 2, 1980 at 3:00 PM/,
  );
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
  await enterBirth(page);
  await expect(page.getByRole("group", { name: /natal chart/i })).toBeVisible();
  await reopenBirth(page);
  fail = true;
  await enterBirth(page, "January 2, 1980 at 3pm in London");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert")).toHaveCount(0);
});
