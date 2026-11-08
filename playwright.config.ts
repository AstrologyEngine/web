import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT ?? "4173";
export default defineConfig({
  testDir: "tests",
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `bun run dev --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
