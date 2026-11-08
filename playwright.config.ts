import { defineConfig } from "@playwright/test";
const remote = process.env.E2E_BASE_URL;
const port = process.env.PLAYWRIGHT_PORT ?? "4173";
export default defineConfig({
  testDir: "tests",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    baseURL: remote ?? `http://127.0.0.1:${port}`,
  },
  webServer: remote
    ? undefined
    : {
        command: `bun run dev --host 127.0.0.1 --port ${port} --strictPort`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
      },
});
