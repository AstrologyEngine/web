import { defineConfig } from "@playwright/test";

// Projects (docs/plans/cms.md, Phase 7):
//   default  – the site against a seeded local CMS
//   i18n     – a second CMS seeded with a partially translated pseudo-locale
//   cms-down – the site with an unreachable CMS (bundled snapshot copy)
const remote = process.env.E2E_BASE_URL;
const port = Number(process.env.PLAYWRIGHT_PORT ?? "4173");
const ports = {
  web: port,
  webDown: port + 1,
  webI18n: port + 2,
  cms: port + 4614, // 8787 by default
  cmsI18n: port + 4615,
};
const url = (p: number) => `http://127.0.0.1:${p}`;
// Optional: use a locally installed Chromium when Playwright's download is unavailable.
const chromium = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

const cms = (p: number, fixture?: string) => ({
  command: `bun run dev:e2e --port ${p}${fixture ? ` --fixture ${fixture}` : ""}`,
  cwd: "apps/cms",
  url: `${url(p)}/health`,
  reuseExistingServer: false,
  timeout: 120_000,
});
const web = (p: number, cmsOrigin: string) => ({
  command: `bun run dev --host 127.0.0.1 --port ${p} --strictPort`,
  url: url(p),
  env: { CMS_ORIGIN: cmsOrigin },
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
          testIgnore: /i18n|cms-down/,
        },
      ]
    : [
        {
          name: "default",
          use: { baseURL: url(ports.web) },
          testIgnore: /i18n|cms-down/,
        },
        {
          name: "i18n",
          use: { baseURL: url(ports.webI18n) },
          testMatch: /i18n\.spec\.ts/,
        },
        {
          name: "cms-down",
          use: { baseURL: url(ports.webDown) },
          testMatch: /cms-down\.spec\.ts/,
        },
      ],
  webServer: remote
    ? undefined
    : [
        cms(ports.cms),
        cms(ports.cmsI18n, "../../tests/fixtures/cms-pseudo-locale.json"),
        web(ports.web, url(ports.cms)),
        web(ports.webI18n, url(ports.cmsI18n)),
        // Port 9 (discard) refuses connections: the CMS is down.
        web(ports.webDown, url(9)),
      ],
});
