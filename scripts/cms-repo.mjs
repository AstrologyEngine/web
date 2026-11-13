import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const cmsRepoPath = (env = process.env) => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const cms = resolve(root, env.CMS_REPO_PATH || "../cms");
  if (!existsSync(resolve(cms, "packages/contract/package.json")))
    throw new Error(
      `CMS checkout missing at ${cms}. Clone AstrologyEngine/cms beside web or set CMS_REPO_PATH.`,
    );
  return cms;
};
