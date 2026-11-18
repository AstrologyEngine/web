import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyCmsDeployment } from "./verify-cms-deployment.mjs";

const revision = "a".repeat(40);
const newer = "b".repeat(40);
const assess = (answers, target = "staging") => {
  const paths = [];
  const result = verifyCmsDeployment({
    target,
    revision,
    fetch: async (url) => {
      paths.push(new URL(url).pathname + new URL(url).search);
      assert.ok(answers.length, "Unexpected GitHub API request");
      return Response.json(answers.shift());
    },
  });
  return { paths, result };
};

test("checks the matching CMS environment and accepts a deployed descendant", async () => {
  const { paths, result } = assess(
    [
      [{ id: 42, sha: newer }],
      [{ state: "success", log_url: "https://github.com/example" }],
      { status: "ahead" },
    ],
    "alpha",
  );
  assert.deepEqual(await result, {
    revision: newer,
    logUrl: "https://github.com/example",
  });
  assert.deepEqual(paths, [
    "/repos/AstrologyEngine/cms/deployments?environment=alpha&task=deploy&per_page=1",
    "/repos/AstrologyEngine/cms/deployments/42/statuses?per_page=1",
    `/repos/AstrologyEngine/cms/compare/${revision}...${newer}`,
  ]);
});

test("accepts the exact pinned revision", async () => {
  const { result } = assess([
    [{ id: 42, sha: revision }],
    [{ state: "success" }],
  ]);
  assert.equal((await result).revision, revision);
});

test("fails when CMS has never been deployed by GitHub", async () => {
  await assert.rejects(assess([[]]).result, /No CMS staging deployment/);
});

test("fails on the latest failed or pending deploy even if an earlier deploy succeeded", async () => {
  for (const state of ["failure", "in_progress"])
    await assert.rejects(
      assess([[{ id: 42, sha: revision }], [{ state }, { state: "success" }]])
        .result,
      /wait for CMS migration, seed, and smoke checks/,
    );
});

test("rejects an older or divergent CMS deployment", async () => {
  for (const status of ["behind", "diverged"])
    await assert.rejects(
      assess([[{ id: 42, sha: newer }], [{ state: "success" }], { status }])
        .result,
      /does not include the pinned contract revision/,
    );
});

test("uses the Actions token and can read public metadata if cross-repo access is denied", async () => {
  const auth = [];
  const result = await verifyCmsDeployment({
    target: "staging",
    revision,
    token: "test-token",
    fetch: async (url, { headers }) => {
      assert.equal(new URL(url).origin, "https://api.github.com");
      auth.push(headers.Authorization);
      if (auth.length === 1) return Response.json({}, { status: 403 });
      if (auth.length === 2) return Response.json([{ id: 42, sha: revision }]);
      return Response.json([{ state: "success" }]);
    },
  });
  assert.equal(result.revision, revision);
  assert.deepEqual(auth, ["Bearer test-token", undefined, "Bearer test-token"]);
});
