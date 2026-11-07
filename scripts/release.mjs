export const publishRelease = ({ run, version, repository }) => {
  const tag = `v${version}`;
  let existing;
  try {
    existing = JSON.parse(
      run("gh", ["api", `repos/${repository}/releases/tags/${tag}`]),
    );
  } catch (error) {
    if (!String(error.stderr).includes("Not Found")) throw error;
  }
  const remote = run("git", ["ls-remote", "origin", `refs/tags/${tag}`]);
  const head = run("git", ["rev-parse", "HEAD"]);
  let taggedCommit;
  if (remote) {
    run("git", ["fetch", "origin", `refs/tags/${tag}`]);
    taggedCommit = run("git", ["rev-parse", "FETCH_HEAD^{commit}"]);
  }
  if (existing) {
    if (!remote || existing.draft || !existing.prerelease)
      throw new Error(`Invalid existing prerelease ${tag}`);
    run("git", ["merge-base", "--is-ancestor", taggedCommit, head]);
    const taggedVersion = JSON.parse(
      run("git", ["show", `${taggedCommit}:package.json`]),
    ).version;
    if (taggedVersion !== version)
      throw new Error(`Tag ${tag} contains a different package version`);
    return;
  }
  if (remote && taggedCommit !== head)
    throw new Error(`Unpublished tag ${tag} does not match checked commit`);
  if (!remote) {
    run("git", ["tag", tag]);
    run("git", ["push", "origin", `refs/tags/${tag}`]);
  }
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
};
