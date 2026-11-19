import { defineConfig } from "@playwright/test";

const remote = process.env.E2E_BASE_URL;
const port = Number(process.env.PLAYWRIGHT_PORT ?? "4173");
const url = (p: number) => `http://127.0.0.1:${p}`;
const chromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const web = (p: number, mode = "") => ({
  command: `bun run dev --host 127.0.0.1 --port ${p} --strictPort ${mode}`,
  url: url(p),
  reuseExistingServer: false,
  timeout: 120_000,
});

export default defineConfig({
  testDir: "tests",
  globalSetup: "./tests/global-setup.ts",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    ...(chromium
      ? {
          launchOptions: {
            executablePath: chromium,
            args: ["--no-sandbox", "--disable-gpu"],
          },
        }
      : {}),
  },
  projects: remote
    ? [
        {
          name: "remote",
          use: { baseURL: remote },
          testIgnore: /i18n/,
        },
      ]
    : [
        {
          name: "default",
          use: { baseURL: url(port) },
          testIgnore: /i18n/,
        },
        {
          name: "i18n",
          use: { baseURL: url(port + 1) },
          testMatch: /i18n\.spec\.ts/,
        },
      ],
  webServer: remote ? undefined : [web(port), web(port + 1, "--mode e2e-i18n")],
});
