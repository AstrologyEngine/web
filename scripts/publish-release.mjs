import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const run = (command, args) =>
  execFileSync(command, args, { encoding: "utf8" }).trim();
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const tag = `v${version}`;
const remote = run("git", ["ls-remote", "origin", `refs/tags/${tag}`]);
const head = run("git", ["rev-parse", "HEAD"]);
if (remote) {
  run("git", ["fetch", "origin", `refs/tags/${tag}`]);
  if (run("git", ["rev-parse", "FETCH_HEAD^{commit}"]) !== head)
    throw new Error(`Tag ${tag} does not match checked commit`);
}
if (!remote) {
  run("git", ["tag", tag]);
  run("git", ["push", "origin", `refs/tags/${tag}`]);
}
const releases = JSON.parse(
  run("gh", [
    "api",
    `repos/${process.env.GITHUB_REPOSITORY}/releases?per_page=100`,
  ]),
);
if (!releases.some((release) => release.tag_name === tag)) {
  run("gh", [
    "release",
    "create",
    tag,
    "--verify-tag",
    "--prerelease",
    "--title",
    tag,
    "--generate-notes",
  ]);
}
