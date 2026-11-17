import { test, expect, type Page } from "@playwright/test";
import {
  birthDialog,
  birthField,
  doneButton,
  editBirthButton,
  enterBirth,
  reopenBirth,
} from "./helpers";

const sampleChart = (page: Page) =>
  page.getByRole("group", { name: "SAMPLE CHART" });
const glyph = (page: Page, name: string) =>
  sampleChart(page).getByRole("button", { name, exact: true });
const SUN =
  "The Sun symbolizes identity, purpose and the wish to express yourself.";
const JUPITER =
  "Jupiter symbolizes growth through exploration, belief and a search for meaning.";

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
    for (const name of ["Sun", "Mercury", "Jupiter"])
      await expect(glyph(page, name)).toBeInViewport();
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

test("sample chart glyphs open a card with their name and description", async ({
  page,
}) => {
  await page.goto("/");
  const sun = glyph(page, "Sun");
  await sun.click();
  await expect(page.getByText(SUN)).toBeVisible();
  await expect(sun).toHaveAttribute("aria-pressed", "true");
  // Choosing it again closes the card; another glyph replaces it.
  await sun.click();
  await expect(page.getByText(SUN)).toHaveCount(0);
  await glyph(page, "Jupiter").click();
  await expect(page.getByText(JUPITER)).toBeVisible();
  await glyph(page, "Cancer").click();
  await expect(
    page.getByText(/Cancer symbolizes emotional attachment/),
  ).toBeVisible();
  await glyph(page, "House 3").click();
  await expect(page.getByText("House 3", { exact: true })).toBeVisible();
  await expect(page.getByText(/The third house represents/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/The third house represents/)).toHaveCount(0);
  await glyph(page, "Imum Coeli").click();
  await expect(page.getByText(/The Imum Coeli is the point/)).toBeVisible();
  // A click outside the chart closes it.
  await page
    .getByRole("heading", { name: /explore your birth chart/i })
    .click();
  await expect(page.getByText(/The Imum Coeli is the point/)).toHaveCount(0);
});

test("a sample chart glyph opens from the keyboard and keeps focus", async ({
  page,
}) => {
  await page.goto("/");
  const mercury = glyph(page, "Mercury");
  await mercury.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/Mercury symbolizes learning/)).toBeVisible();
  await expect(mercury).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Mercury symbolizes learning/)).toHaveCount(0);
  await expect(mercury).toBeFocused();
});

test("hover highlights a sample chart glyph and aspect lines open a card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const jupiter = glyph(page, "Jupiter");
  await jupiter.hover();
  await expect(jupiter.locator("circle").first()).toHaveCSS(
    "stroke-width",
    "2.5px",
  );
  // A visible point on an aspect line, away from any glyph.
  const point = await sampleChart(page).evaluate((svg: SVGSVGElement) => {
    const matrix = svg.getScreenCTM()!;
    for (const line of svg.querySelectorAll<SVGLineElement>(
      'line[stroke="var(--w-hard)"], line[stroke="var(--w-soft)"]',
    ))
      for (const t of [0.3, 0.5, 0.7]) {
        const [x1, y1, x2, y2] = ["x1", "y1", "x2", "y2"].map(
          (name) => +line.getAttribute(name)!,
        );
        const p = new DOMPoint(
          x1! + (x2! - x1!) * t,
          y1! + (y2! - y1!) * t,
        ).matrixTransform(matrix);
        if (p.x > 0 && p.x < innerWidth && p.y > 0 && p.y < innerHeight) {
          const hit = document.elementFromPoint(p.x, p.y);
          if (hit && !hit.closest("[data-glyph]")) return { x: p.x, y: p.y };
        }
      }
    return null;
  });
  expect(point).not.toBeNull();
  await page.mouse.click(point!.x, point!.y);
  await expect(
    page.getByText(/^(Sextile|Square|Trine|Opposition)$/),
  ).toBeVisible();
});

test("clicking the sample chart draws no focus outline; keys still show focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  for (const name of ["House 4", "Leo sign region", "Sun"]) {
    const target = glyph(page, name);
    // Sectors are rings: click a point that hits them, not their box centre.
    const point = await target.evaluate((el) => {
      const box = el.getBoundingClientRect();
      for (let fy = 0.1; fy < 1; fy += 0.1)
        for (let fx = 0.1; fx < 1; fx += 0.1) {
          const x = box.left + box.width * fx,
            y = box.top + box.height * fy;
          const hit = document.elementFromPoint(x, y);
          if (hit && el.contains(hit)) return { x, y };
        }
      return null;
    });
    expect(point).not.toBeNull();
    await page.mouse.click(point!.x, point!.y);
    await expect(target).toBeFocused();
    await expect(target).toHaveCSS("outline-style", "none");
    await page.keyboard.press("Escape");
  }
  const sector = glyph(page, "House 4");
  await page.keyboard.press("Tab");
  await sector.focus();
  await expect(sector).toHaveCSS("stroke-width", "2.5px");
});

test("only glyphs in the visible quarter are buttons", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  // Glyphs become buttons once the page is interactive.
  await expect(glyph(page, "Sun")).toBeVisible();
  for (const name of ["Moon", "Venus", "Mars", "Saturn", "Earth", "Midheaven"])
    await expect(glyph(page, name)).toHaveCount(0);
  const buttons = await sampleChart(page).getByRole("button").all();
  expect(buttons.length).toBeGreaterThan(3);
  for (const button of buttons) await expect(button).toBeInViewport();
  // On phones none of them sit behind the text above the chart.
  await page.setViewportSize({ width: 390, height: 844 });
  const note = (await page.getByText(/Your chart begins with/).boundingBox())!;
  for (const button of buttons)
    expect((await button.boundingBox())!.y).toBeGreaterThan(
      note.y + note.height,
    );
  await glyph(page, "Jupiter").click();
  const card = (await page.getByText(JUPITER).boundingBox())!;
  expect(card.x).toBeGreaterThanOrEqual(0);
  expect(card.x + card.width).toBeLessThanOrEqual(390);
});

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
