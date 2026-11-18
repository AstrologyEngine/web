import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repository = "https://api.github.com/repos/AstrologyEngine/cms";
const isRevision = (value) => /^[a-f0-9]{40}$/.test(value ?? "");

export const verifyCmsDeployment = async ({
  target,
  revision,
  fetch = globalThis.fetch,
}) => {
  if (!["staging", "alpha"].includes(target) || !isRevision(revision))
    throw new Error("Expected a CMS deployment target and pinned revision");

  const read = async (path) => {
    const response = await fetch(repository + path, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(
        `Could not verify CMS ${target}: GitHub HTTP ${response.status}`,
      );
    return response.json();
  };
  const [deployment] = await read(
    `/deployments?environment=${target}&task=deploy&per_page=1`,
  );
  if (!Number.isSafeInteger(deployment?.id) || !isRevision(deployment?.sha))
    throw new Error(`No CMS ${target} deployment recorded in GitHub`);

  const [status] = await read(
    `/deployments/${deployment.id}/statuses?per_page=1`,
  );
  if (status?.state !== "success")
    throw new Error(
      `Latest CMS ${target} deployment ${deployment.id} is ${status?.state ?? "pending"}; wait for CMS migration, seed, and smoke checks to pass.`,
    );

  if (deployment.sha !== revision) {
    const comparison = await read(`/compare/${revision}...${deployment.sha}`);
    if (comparison.status !== "ahead")
      throw new Error(
        `CMS ${target} deployment ${deployment.sha} does not include the pinned contract revision ${revision}`,
      );
  }
  return { revision: deployment.sha, logUrl: status.log_url };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2];
  const contract = createRequire(import.meta.url)(
    "@astrologyengine/cms-contract/package.json",
  );
  const deployment = await verifyCmsDeployment({
    target,
    revision: contract.cmsRevision,
  });
  console.log(
    `CMS ${target} verified at ${deployment.revision} (${deployment.logUrl ?? "no workflow link"})`,
  );
}
