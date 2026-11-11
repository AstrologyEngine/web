import assert from "node:assert/strict";
import { test } from "node:test";
import { findHardcodedCopy, checkFiles } from "./check-copy.mjs";

const find = (markup) =>
  findHardcodedCopy(markup, "Example.svelte").map(({ text }) => text);

test("flags text nodes with letters", () => {
  assert.deepEqual(find("<p>Hello there</p>"), ["Hello there"]);
  assert.deepEqual(find("{#if a > b}<span>Yes</span>{:else}No{/if}"), [
    "Yes",
    "No",
  ]);
  assert.deepEqual(find("<svg><title>Sun</title></svg>"), ["Sun"]);
});

test("flags literal accessible and hint attributes", () => {
  assert.deepEqual(
    find(
      '<button aria-label="Close">×</button><input placeholder="Name" /><img alt="Chart" src="x" /><g title="Tip"></g><option label="One"></option>',
    ),
    [
      "aria-label=Close",
      "placeholder=Name",
      "alt=Chart",
      "title=Tip",
      "label=One",
    ],
  );
});

test("allows CMS expressions, symbols, numbers and non-copy attributes", () => {
  assert.deepEqual(
    find(`<script lang="ts">const x = "Not markup";</script>
<p class="primary" role="status">{t("brand.name")} ✳ × ° ↗ · 12</p>
<button aria-label={t("details.shell.close")} data-x="y">×</button>
<style>p::after { content: "Not copy"; }</style>
<!-- a comment with words -->`),
    [],
  );
});

test("reports line numbers", () => {
  const [finding] = findHardcodedCopy(
    "<div>\n  <p>Oops</p>\n</div>",
    "A.svelte",
  );
  assert.equal(finding.line, 2);
});

test("the application has no hardcoded copy", async () => {
  assert.deepEqual(await checkFiles("src"), []);
});
