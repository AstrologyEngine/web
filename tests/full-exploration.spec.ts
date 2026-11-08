import { test, expect } from "@playwright/test";

test("a learner explores a sign and its chart context", async ({ page }) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page
    .getByRole("group", { name: /natal chart/i })
    .getByRole("button", { name: "Aries", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aries", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("complementary", { name: "Sign details" })
      .getByText(/Tropical.*whole-sign/i),
  ).toBeVisible();
});

test("named alternatives explain a house, angle and aspect with active system help", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Choose a house by number").click();
  await page.getByRole("button", { name: "House 1", exact: true }).click();
  const house = page.getByRole("complementary", { name: "House details" });
  await expect(house.getByRole("heading", { name: "House 1" })).toBeVisible();
  await expect(house.getByText("Occupants")).toBeVisible();
  await expect(house.getByText("Ruler", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByText("Choose an angle by name").click();
  await page.getByRole("button", { name: "Ascendant", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Angle details" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page
    .getByRole("button", { name: "Explore aspects", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(picker.getByRole("button", { name: "Back" })).toBeVisible();
  await picker.getByRole("button", { name: "Back" }).click();
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  const second = picker.locator(".picker-buttons button").first();
  const secondName = await second.textContent();
  await second.click();
  const aspect = page.getByRole("complementary", { name: "Aspect details" });
  await expect(aspect).toContainText("Sun");
  await expect(aspect).toContainText(secondName!.trim());
  await expect(aspect).not.toContainText(/orb|applying|separating/i);
  await page.getByRole("button", { name: "About this system" }).click();
  await expect(page.getByRole("region", { name: "System help" })).toContainText(
    "Tropical",
  );
});

test("supported signs persist and Ophiuchus clears when unavailable", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  await page.getByText("Choose a sign by name").click();
  await page.getByRole("button", { name: "Aries", exact: true }).last().click();
  await page.getByRole("button", { name: "Vedic", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vedic", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const detail = page.getByRole("complementary", { name: "Sign details" });
  await expect(detail.getByRole("heading", { name: "Aries" })).toBeVisible();
  await expect(detail).toContainText("Vedic");
  await page.getByRole("button", { name: "True Sky", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "True Sky", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Ophiuchus", exact: true })
    .last()
    .click();
  await expect(
    detail.getByRole("heading", { name: "Ophiuchus" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tropical", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tropical", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(detail).toHaveCount(0);
});

test("aspect pair can be reselected in reverse to clear details", async ({
  page,
}) => {
  await page.goto("/app");
  await page.getByLabel("Birth details").fill("June 21, 2000 at 1pm in London");
  await page.getByRole("button", { name: "Apply" }).click();
  const explore = page.getByRole("button", {
    name: "Explore aspects",
    exact: true,
  });
  await explore.click();
  const picker = page.getByRole("dialog", { name: "Choose an aspect" });
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  const second = (await picker
    .locator(".picker-buttons button")
    .first()
    .textContent())!.trim();
  await picker.getByRole("button", { name: second, exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Aspect details" }),
  ).toBeVisible();
  await explore.click();
  await picker.getByRole("button", { name: second, exact: true }).click();
  await picker.getByRole("button", { name: "Sun", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Aspect details" }),
  ).toHaveCount(0);
});

test("an open aspect picker closes when a newer chart is accepted", async ({
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
  await page
    .getByRole("button", { name: "Explore aspects", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Choose an aspect" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("dialog", { name: "Choose an aspect" }),
  ).toHaveCount(0);
});
