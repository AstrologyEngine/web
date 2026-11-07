import { execFileSync } from "node:child_process";
import { appendFileSync, writeFileSync, readFileSync } from "node:fs";

export const marker = "<!-- astrology-claude-review -->";
export const statusMarker = "<!-- astrology-claude-review-status -->";
export const runMarker = (runId, attempt, base) =>
  `<!-- astrology-claude-review-run: ${runId}:${attempt} base:${base} -->`;
export const markedReviews = (reviews) =>
  reviews.filter(
    (r) =>
      r.user?.login === "claude[bot]" &&
      r.state === "COMMENTED" &&
      r.submitted_at &&
      (r.body ?? "").startsWith(`${marker}\n`),
  );
export const newReview = (reviews, ids, sha, started, expectedMarker) =>
  markedReviews(reviews).find(
    (r) =>
      !ids.includes(r.id) &&
      r.commit_id === sha &&
      (r.body === `${marker}\n${expectedMarker}` ||
        r.body.startsWith(`${marker}\n${expectedMarker}\n`)) &&
      Date.parse(r.submitted_at) >= Date.parse(started),
  );
export const reviewBase = (review) =>
  (review?.body ?? "").match(
    /^<!-- astrology-claude-review -->\n<!-- astrology-claude-review-run: [0-9]+:[0-9]+ base:([0-9a-f]{40}) -->(?:\n|$)/,
  )?.[1];
export const ownedStatus = (comments) =>
  comments.find(
    (c) =>
      c.user?.login === "github-actions[bot]" &&
      (c.body ?? "").includes(statusMarker),
  );
export const resolveScope = (last, head, base, git, priorBase) => {
  if (!last) return { mode: "full", reason: "no-previous-review" };
  if (last === head) return { mode: "full", reason: "no-new-commits" };
  if (!git.exists(last)) return { mode: "full", reason: "unknown-sha" };
  if (!git.ancestor(last, head))
    return { mode: "full", reason: "history-rewritten" };
  const mergeBase = git.mergeBase(base, head);
  if (!mergeBase || !git.ancestor(mergeBase, last))
    return { mode: "full", reason: "base-merged-in" };
  if (!priorBase) return { mode: "full", reason: "missing-review-context" };
  if (mergeBase !== priorBase) return { mode: "full", reason: "base-changed" };
  return { mode: "incremental", reason: "", reviewBase: last };
};
const run = (command, args) =>
  execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const git = {
  exists: (sha) => {
    try {
      run("git", ["cat-file", "-e", `${sha}^{commit}`]);
      return true;
    } catch {
      return false;
    }
  },
  ancestor: (a, b) => {
    try {
      run("git", ["merge-base", "--is-ancestor", a, b]);
      return true;
    } catch {
      return false;
    }
  },
  mergeBase: (a, b) => {
    try {
      return run("git", ["merge-base", a, b]);
    } catch {
      return "";
    }
  },
};
const api = (path) =>
  JSON.parse(run("gh", ["api", path, "--paginate", "--slurp"])).flat();
const output = (values) =>
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(values)
      .map(([k, v]) => `${k}=${v ?? ""}\n`)
      .join(""),
  );
const { REPO, PR, HEAD_SHA, BASE_SHA } = process.env;
const reviewsPath = `repos/${REPO}/pulls/${PR}/reviews`;
const commentsPath = `repos/${REPO}/issues/${PR}/comments`;
const main = () => {
  if (process.argv[2] === "scope") {
    let reviews = [];
    try {
      reviews = api(reviewsPath);
    } catch (e) {
      console.error("Review lookup failed; using full scope:", e.message);
    }
    const last = markedReviews(reviews).at(-1);
    const scope = resolveScope(
      last?.commit_id,
      HEAD_SHA,
      BASE_SHA,
      git,
      reviewBase(last),
    );
    const fullBase = git.mergeBase(BASE_SHA, HEAD_SHA);
    if (!fullBase)
      throw new Error("Cannot resolve merge base for fixed full diff");
    output({
      ...scope,
      review_base: scope.reviewBase,
      diff_base: scope.reviewBase || fullBase,
      merge_base: fullBase,
    });
  } else if (process.argv[2] === "baseline") {
    const reviews = api(reviewsPath);
    writeFileSync(
      process.env.BASELINE_FILE,
      JSON.stringify({
        ids: reviews.map((r) => r.id),
        started: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      }),
    );
  } else if (process.argv[2] === "verify") {
    const baseline = JSON.parse(
      readFileSync(process.env.BASELINE_FILE, "utf8"),
    );
    if (
      !newReview(
        api(reviewsPath),
        baseline.ids,
        HEAD_SHA,
        baseline.started,
        runMarker(
          process.env.RUN_ID,
          process.env.RUN_ATTEMPT,
          process.env.MERGE_BASE,
        ),
      )
    )
      throw new Error("No new marked Claude review for triggering SHA");
  } else if (process.argv[2] === "status") {
    const { MODE, REASON, REVIEW_BASE, OUTCOME, VERIFY_OUTCOME, RUN_URL } =
      process.env;
    const scope =
      MODE === "incremental"
        ? `incremental since \`${REVIEW_BASE}\``
        : `full (${REASON || "unknown"})`;
    const result =
      OUTCOME === "success" && VERIFY_OUTCOME === "success"
        ? "Review complete"
        : `Review incomplete (action: ${OUTCOME || "not run"}; verification: ${VERIFY_OUTCOME || "not run"})`;
    const body = `${statusMarker}\n${result}. [Run log](${RUN_URL})\n\nScope: ${scope}; commit: \`${HEAD_SHA}\`.`;
    const current = ownedStatus(api(commentsPath));
    const args = current
      ? [`repos/${REPO}/issues/comments/${current.id}`, "-X", "PATCH"]
      : [commentsPath, "-X", "POST"];
    run("gh", ["api", ...args, "-f", `body=${body}`]);
  }
};
if (
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
