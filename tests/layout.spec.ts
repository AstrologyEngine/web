import { expect, test } from "@playwright/test";
import { birthDialog, editBirthButton, enterBirth } from "./helpers";

test.use({ viewport: { width: 1440, height: 1000 } });

test("variant A places the masthead, stage, rail and alternatives", async ({
  page,
}) => {
  await page.goto("/app");
  // Before any chart: the empty wheel and the default system overview.
  await expect(
    page.getByRole("img", { name: "Empty chart awaiting birth details" }),
  ).toBeAttached();
  await expect(birthDialog(page)).toBeVisible();
  await enterBirth(page);

  const masthead = (await page.getByRole("banner").boundingBox())!;
  expect(masthead.y).toBe(0);
  expect(masthead.height).toBe(80);
  const presets = page.getByRole("group", { name: /Zodiac presets/ });
  await expect(presets.getByRole("button")).toHaveText([
    "Tropical",
    "Vedic",
    "True Sky",
  ]);
  const overview = page.getByRole("region", { name: "System help" });
  await expect(
    overview.getByRole("heading", { name: "Tropical" }),
  ).toBeVisible();
  const wheel = (await page
    .getByRole("group", { name: /natal chart/i })
    .boundingBox())!;
  const rail = (await overview.boundingBox())!;
  expect(rail.x).toBeGreaterThan(wheel.x + wheel.width);
  expect(wheel.y + wheel.height).toBeLessThanOrEqual(1000);

  // Alternatives start below the fold.
  const bodies = page.getByText("Choose a body by name");
  await expect(bodies).not.toBeInViewport();
  await bodies.scrollIntoViewIfNeeded();
  await expect(bodies).toBeInViewport();
  // The rail and masthead stay in place while the page scrolls.
  await expect(overview).toBeInViewport();
  await expect(editBirthButton(page)).toBeInViewport();
});

test("selection fills the rail and ? returns it to the system overview", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const overview = page.getByRole("region", { name: "System help" });
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "Sun", exact: true })
    .click();
  const details = page.getByRole("complementary", { name: "Body details" });
  await expect(details).toBeVisible();
  await expect(overview).toHaveCount(0);
  await page.getByRole("button", { name: "About this system" }).click();
  await expect(details).toHaveCount(0);
  await expect(
    overview.getByRole("heading", { name: "Tropical" }),
  ).toBeFocused();
  await page.getByRole("button", { name: /Advanced settings/ }).click();
  await expect(page.getByRole("menu", { name: "House system" })).toBeVisible();
});

test.describe("at phone width", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the modal, chart and birth button work in one column", async ({
    page,
  }) => {
    await page.goto("/app");
    const dialog = birthDialog(page);
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await enterBirth(page);
    await expect(
      page.getByRole("group", { name: /natal chart/i }),
    ).toBeVisible();
    await expect(editBirthButton(page)).toBeInViewport();
    await expect(editBirthButton(page)).toHaveAccessibleDescription(
      /June 21, 2000 at 1:00 PM/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});
