import { expect, type Page } from "@playwright/test";

export const LONDON = "June 21, 2000 at 1pm in London";

/** The birth details field (its label is the same in every test locale). */
export const birthField = (page: Page) =>
  page.getByRole("textbox", { name: "Birth details" });

/** The birth details modal, found by its field so it works in any locale. */
export const birthDialog = (page: Page) =>
  page.getByRole("dialog").filter({ has: birthField(page) });

export const doneButton = (page: Page) =>
  birthDialog(page).getByRole("button", { name: "Done" });

export const editBirthButton = (page: Page) =>
  page.getByRole("button", { name: "Edit birth details" });

/**
 * Type birth details into the open modal, wait until the live preview has
 * rendered a chart and parsing has settled (Done enabled), then close it.
 */
export async function enterBirth(page: Page, sentence = LONDON) {
  await birthField(page).fill(sentence);
  await expect(doneButton(page)).toBeEnabled({ timeout: 30_000 });
  await doneButton(page).click();
  await expect(birthDialog(page)).toHaveCount(0);
}

/** Reopen the modal from the masthead birth line. */
export async function reopenBirth(page: Page) {
  await editBirthButton(page).click();
  await expect(birthDialog(page)).toBeVisible();
}
