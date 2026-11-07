import { test } from "node:test";
import assert from "node:assert/strict";
import { publishRelease } from "./release.mjs";
const scenario = ({ existing, taggedCommit, ancestor = true } = {}) => {
  const writes = [];
  const run = (command, args) => {
    const key = `${command} ${args.join(" ")}`;
    if (key.startsWith("gh api ")) {
      if (existing) return JSON.stringify(existing);
      throw Object.assign(new Error("404"), { stderr: "Not Found" });
    }
    if (key.startsWith("git ls-remote"))
      return taggedCommit ? `${taggedCommit}\trefs/tags/v0.2.0` : "";
    if (key === "git rev-parse HEAD") return "current";
    if (key === "git rev-parse FETCH_HEAD^{commit}") return taggedCommit;
    if (key.startsWith("git merge-base")) {
      if (!ancestor) throw new Error("Unrelated tag");
      return "";
    }
    if (key.startsWith("git show")) return JSON.stringify({ version: "0.2.0" });
    if (!key.startsWith("git fetch")) writes.push(key);
    return "";
  };
  return {
    writes,
    publish: () =>
      publishRelease({
        run,
        version: "0.2.0",
        repository: "AstrologyEngine/web",
      }),
  };
};
test("normal commits after a published version do not republish", () => {
  const s = scenario({
    existing: { prerelease: true, draft: false },
    taggedCommit: "previous",
  });
  s.publish();
  assert.deepEqual(s.writes, []);
});
test("new version creates its tag and GitHub prerelease", () => {
  const s = scenario();
  s.publish();
  assert.equal(s.writes.length, 3);
  assert.match(s.writes[2], /--prerelease/);
});
test("retry after tag creation can finish publishing the checked commit", () => {
  const s = scenario({ taggedCommit: "current" });
  s.publish();
  assert.equal(s.writes.length, 1);
});
test("unpublished conflicting tag cannot release another commit", () => {
  const s = scenario({ taggedCommit: "other" });
  assert.throws(s.publish, /does not match/);
  assert.deepEqual(s.writes, []);
});
test("published unrelated tag is rejected", () => {
  const s = scenario({
    existing: { prerelease: true },
    taggedCommit: "other",
    ancestor: false,
  });
  assert.throws(s.publish, /Unrelated/);
});
test("an existing stable release cannot be silently treated as alpha", () => {
  const s = scenario({
    existing: { prerelease: false },
    taggedCommit: "previous",
  });
  assert.throws(s.publish, /Invalid existing/);
});
