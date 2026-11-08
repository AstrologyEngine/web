import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  resolveScope,
  newReview,
  ownedStatus,
  marker,
  statusMarker,
  runMarker,
  reviewBase,
} from "./review-controls.mjs";

const git = {
  exists: (s) => s !== "unknown",
  ancestor: (a, b) => !(a === "rewritten" || (a === "new-base" && b === "old")),
  mergeBase: (base) => base,
};
test("scope falls back for first, repeated, missing, rewritten, and base-merged histories", () => {
  for (const [last, base, reason] of [
    [undefined, "base", "no-previous-review"],
    ["head", "base", "no-new-commits"],
    ["unknown", "base", "unknown-sha"],
    ["rewritten", "base", "history-rewritten"],
    ["old", "new-base", "base-merged-in"],
  ]) {
    assert.deepEqual(resolveScope(last, "head", base, git), {
      mode: "full",
      reason,
    });
  }
  assert.deepEqual(resolveScope("old", "head", "base", git, "base"), {
    mode: "incremental",
    reason: "",
    reviewBase: "old",
  });
  assert.equal(resolveScope("old", "head", "", git).mode, "full");
  assert.equal(
    resolveScope("old", "head", "base", git).reason,
    "missing-review-context",
  );
  assert.equal(
    resolveScope("old", "head", "base", git, "previous-base").reason,
    "base-changed",
  );
});
test("only a newly posted marked Claude review at the trigger SHA satisfies verification", () => {
  const expected = runMarker("123", "1", "a".repeat(40));
  const review = {
    id: 2,
    state: "COMMENTED",
    user: { login: "claude[bot]" },
    body: `${marker}\n${expected}`,
    commit_id: "head",
    submitted_at: "2026-11-04T00:00:01Z",
  };
  const start = "2026-11-04T00:00:00Z";
  assert.equal(newReview([review], [1], "head", start, expected), review);
  assert.equal(newReview([review], [2], "head", start, expected), undefined);
  assert.equal(
    newReview([{ ...review, commit_id: "other" }], [], "head", start, expected),
    undefined,
  );
  assert.equal(
    newReview(
      [{ ...review, user: { login: "other" } }],
      [],
      "head",
      start,
      expected,
    ),
    undefined,
  );
  assert.equal(
    newReview([{ ...review, body: "" }], [], "head", start, expected),
    undefined,
  );
  assert.equal(
    newReview([{ ...review, state: "PENDING" }], [], "head", start, expected),
    undefined,
  );
  assert.equal(
    newReview(
      [review],
      [],
      "head",
      start,
      runMarker("124", "1", "a".repeat(40)),
    ),
    undefined,
  );
  assert.equal(
    newReview(
      [{ ...review, body: `Example:\n${review.body}` }],
      [],
      "head",
      start,
      expected,
    ),
    undefined,
  );
  assert.equal(reviewBase({ body: `Example:\n${review.body}` }), undefined);
  assert.equal(reviewBase(review), "a".repeat(40));
  assert.equal(reviewBase({ body: marker }), undefined);
  assert.equal(
    newReview(
      [{ ...review, submitted_at: "2026-11-03T00:00:00Z" }],
      [],
      "head",
      start,
      expected,
    ),
    undefined,
  );
  assert.equal(
    newReview(
      [
        {
          ...review,
          body: `${review.body}\nReview complete`,
          submitted_at: "2026-11-03T00:00:00Z",
        },
      ],
      [],
      "head",
      start,
      expected,
    ),
    undefined,
  );
});
test("status updates only the Actions bot owned marker", () => {
  const impersonation = {
    id: 1,
    user: { login: "person" },
    body: statusMarker,
  };
  const owned = {
    id: 2,
    user: { login: "github-actions[bot]" },
    body: statusMarker,
  };
  assert.equal(ownedStatus([impersonation]), undefined);
  assert.equal(ownedStatus([impersonation, owned]), owned);
});

test("scope follows actual Git ancestry across a base merge and rewrite", async () => {
  const { mkdtempSync, rmSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const dir = mkdtempSync(join(tmpdir(), "claude-scope-"));
  const cmd = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const commit = (file, content) => {
    writeFileSync(join(dir, file), content);
    cmd("add", file);
    cmd("commit", "-m", content);
    return cmd("rev-parse", "HEAD");
  };
  try {
    cmd("init", "-b", "main");
    cmd("config", "user.name", "Test");
    cmd("config", "user.email", "test@example.invalid");
    const base = commit("base", "initial");
    cmd("checkout", "-b", "feature");
    const old = commit("feature", "first");
    const head = commit("feature", "second");
    const realGit = {
      exists: (s) => {
        try {
          cmd("cat-file", "-e", `${s}^{commit}`);
          return true;
        } catch {
          return false;
        }
      },
      ancestor: (a, b) => {
        try {
          cmd("merge-base", "--is-ancestor", a, b);
          return true;
        } catch {
          return false;
        }
      },
      mergeBase: (a, b) => {
        try {
          return cmd("merge-base", a, b);
        } catch {
          return "";
        }
      },
    };
    assert.equal(
      resolveScope(old, head, base, realGit, base).mode,
      "incremental",
    );
    cmd("checkout", "main");
    const newBase = commit("base", "updated");
    cmd("checkout", "feature");
    cmd("merge", "--no-edit", "main");
    const merged = cmd("rev-parse", "HEAD");
    assert.equal(
      resolveScope(old, merged, newBase, realGit).reason,
      "base-merged-in",
    );
    cmd("checkout", "-b", "rewritten", base);
    const rewritten = commit("other", "replacement");
    assert.equal(
      resolveScope(old, rewritten, base, realGit).reason,
      "history-rewritten",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
