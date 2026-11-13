import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [sveltekit()],
  server: process.env.CMS_REPO_PATH
    ? {
        fs: {
          allow: [
            searchForWorkspaceRoot(process.cwd()),
            resolve(process.env.CMS_REPO_PATH, "packages/contract"),
          ],
        },
      }
    : {},
});
