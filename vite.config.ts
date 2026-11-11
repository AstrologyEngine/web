import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [sveltekit()],
  // The CMS in apps/cms keeps local D1 state there while browser tests run.
  server: { watch: { ignored: ["**/apps/cms/.wrangler/**"] } },
});
