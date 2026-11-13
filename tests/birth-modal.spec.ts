import { expect, test, type Page } from "@playwright/test";
import {
  LONDON,
  birthDialog,
  birthField,
  doneButton,
  editBirthButton,
  enterBirth,
  reopenBirth,
} from "./helpers";

const chart = (page: Page) => page.getByRole("group", { name: /natal chart/i });
const sunCentre = async (page: Page) => {
  const box = await chart(page)
    .getByRole("button", { name: "Sun", exact: true })
    .boundingBox();
  return box && `${Math.round(box.x)},${Math.round(box.y)}`;
};
/** A point on the backdrop, well outside the centred dialog. */
const clickBackdrop = (page: Page) => page.mouse.click(12, 500);

/** Hold resolver responses until the returned release function is called. */
const holdResolver = async (page: Page) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/resolve-birth", async (route) => {
    await held;
    await route.continue();
  });
  return release;
};

test("the modal opens on arrival and cannot be dismissed before a chart exists", async ({
  page,
}) => {
  await page.goto("/app");
  const dialog = birthDialog(page);
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "Start with your birth details" }),
  ).toBeVisible();
  await expect(birthField(page)).toBeFocused();
  await expect(doneButton(page)).toBeDisabled();
  // A repeated Escape must not trigger the browser's forced close.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await clickBackdrop(page);
  await expect(dialog).toBeVisible();
  await birthField(page).fill("incomplete");
  await expect(doneButton(page)).toBeDisabled();
  await page.keyboard.press("Escape");
  await clickBackdrop(page);
  await expect(dialog).toBeVisible();
  await expect(chart(page)).toHaveCount(0);
});

test("a resolved sentence renders the chart behind the open modal", async ({
  page,
}) => {
  await page.goto("/app");
  await birthField(page).fill(LONDON);
  await expect(chart(page)).toBeVisible({ timeout: 30_000 });
  await expect(birthDialog(page)).toBeVisible();
  await expect(doneButton(page)).toBeEnabled();
  await doneButton(page).click();
  await expect(birthDialog(page)).toHaveCount(0);
  const edit = editBirthButton(page);
  await expect(edit).toBeFocused();
  await expect(edit).toHaveAttribute("title", "Edit birth details");
  await expect(edit).toHaveAccessibleDescription(
    "June 21, 2000 at 1:00 PM, London, England, United Kingdom",
  );
});

test("Done waits for parsing, and a backdrop click mid-parse keeps the chart", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const before = await sunCentre(page);
  const release = await holdResolver(page);
  await reopenBirth(page);
  await birthField(page).fill("January 2, 1980 at 3pm in London");
  await expect(doneButton(page)).toBeDisabled();
  await expect(doneButton(page)).toHaveAttribute("aria-busy", "true");
  await clickBackdrop(page);
  await expect(birthDialog(page)).toHaveCount(0);
  release();
  // The late resolution is dropped: the chart and birth line stay as they were.
  await page.waitForTimeout(1000);
  expect(await sunCentre(page)).toBe(before);
  await expect(editBirthButton(page)).toHaveAccessibleDescription(
    /June 21, 2000/,
  );
});

test("feedback keeps the last parse until a new result replaces it", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await reopenBirth(page);
  const dialog = birthDialog(page);
  const release = await holdResolver(page);
  await birthField(page).fill("January 2, 1980 at 3pm in London");
  await expect(doneButton(page)).toHaveAttribute("aria-busy", "true");
  await expect(
    dialog.getByText("June 21, 2000", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/needed/i)).toHaveCount(0);
  release();
  await expect(
    dialog.getByText("January 2, 1980", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("June 21, 2000", { exact: true })).toHaveCount(
    0,
  );
});

test("choices from earlier text wait for the current text's result", async ({
  page,
}) => {
  await page.goto("/app");
  await birthField(page).fill("03/04/2000 at 1pm in London");
  const march = page.getByRole("button", { name: /Mar 4, 2000/ });
  await expect(march).toBeEnabled();
  const release = await holdResolver(page);
  await birthField(page).fill("03/04/2000 at 2pm in London");
  await expect(march).toBeDisabled();
  release();
  await expect(march).toBeEnabled();
  await march.click();
  // The choice resolves the sentence: its tags replace the choice buttons.
  await expect(
    birthDialog(page).getByText("March 4, 2000", { exact: true }),
  ).toBeVisible();
  await expect(doneButton(page)).toBeEnabled({ timeout: 30_000 });
});

test("reopening prefills the birth and discards invalid edits on close", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await reopenBirth(page);
  const dialog = birthDialog(page);
  await expect(
    dialog.getByRole("heading", { name: "Edit birth details" }),
  ).toBeVisible();
  const field = birthField(page);
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(
    "2000-06-21 at 13:00:00 in London, England, United Kingdom",
  );
  expect(
    await field.evaluate(
      (node: HTMLTextAreaElement) =>
        node.selectionStart === node.value.length &&
        node.selectionEnd === node.value.length,
    ),
  ).toBe(true);
  await expect(doneButton(page)).toBeEnabled();
  await field.fill("incomplete");
  await expect(dialog.getByText(/needed/i).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(chart(page)).toBeVisible();
  await expect(editBirthButton(page)).toHaveAccessibleDescription(
    /June 21, 2000/,
  );
});

test("edits update the chart live and invalid text leaves the latest chart", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  const june = await sunCentre(page);
  await reopenBirth(page);
  await birthField(page).fill("January 2, 1980 at 3pm in London");
  await expect.poll(() => sunCentre(page), { timeout: 30_000 }).not.toBe(june);
  await expect(birthDialog(page)).toBeVisible();
  const january = await sunCentre(page);
  await birthField(page).fill("January 2, 1980 at 3pm in");
  await expect(doneButton(page)).toBeEnabled();
  expect(await sunCentre(page)).toBe(january);
  await doneButton(page).click();
  await expect(birthDialog(page)).toHaveCount(0);
  expect(await sunCentre(page)).toBe(january);
  await expect(editBirthButton(page)).toHaveAccessibleDescription(
    /January 2, 1980 at 3:00 PM/,
  );
});

test("a failed first calculation keeps the modal open until Retry succeeds", async ({
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
  await birthField(page).fill(LONDON);
  const dialog = birthDialog(page);
  await expect(dialog.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await clickBackdrop(page);
  await expect(dialog).toBeVisible();
  await expect(doneButton(page)).toBeDisabled();
  await dialog.getByRole("button", { name: "Retry calculation" }).click();
  await expect(chart(page)).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("an error that retrying cannot fix has no Retry link", async ({
  page,
}) => {
  // The worker reports an out-of-range date instead of a chart.
  await page.route("**/calculation-worker.js", async (route) => {
    const response = await route.fetch();
    const patch = `const post = self.postMessage.bind(self); self.postMessage = (message) => { if (message.result?.ok) message.result = { ok: false, code: "OUT_OF_RANGE", retryWorker: false }; post(message); };\n`;
    await route.fulfill({ response, body: patch + (await response.text()) });
  });
  await page.goto("/app");
  await birthField(page).fill(LONDON);
  const dialog = birthDialog(page);
  await expect(dialog.getByRole("alert")).toHaveText(
    "Whoops, this birth date is outside the supported range.",
    { timeout: 30_000 },
  );
  await expect(
    dialog.getByRole("button", { name: "Retry calculation" }),
  ).toHaveCount(0);
  await expect(doneButton(page)).toBeDisabled();
});

test("dragging a text selection onto the backdrop does not close the modal", async ({
  page,
}) => {
  await page.goto("/app");
  await enterBirth(page);
  await reopenBirth(page);
  const box = (await birthField(page).boundingBox())!;
  await page.mouse.move(box.x + box.width - 10, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(12, 500, { steps: 5 });
  await page.mouse.up();
  await expect(birthDialog(page)).toBeVisible();
  await clickBackdrop(page);
  await expect(birthDialog(page)).toHaveCount(0);
});
