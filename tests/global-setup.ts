import { chromium, type FullConfig } from "@playwright/test";

/**
 * Warm every local dev server before tests start. Vite compiles routes and
 * client modules on first request, and the birth resolver loads its atlas on
 * first use; under a loaded machine those first requests can take longer than
 * a test's whole timeout. Web servers are already up when global setup runs.
 */
export default async function warmUp(config: FullConfig) {
  if (process.env.E2E_BASE_URL) return;
  const origins = [
    ...new Set(
      config.projects
        .map((project) => project.use.baseURL)
        .filter((url): url is string => !!url),
    ),
  ];
  const browser = await chromium.launch(config.projects[0]?.use.launchOptions);
  try {
    await Promise.all(
      origins.map(async (origin) => {
        const page = await browser.newPage();
        try {
          await page.goto(`${origin}/`);
          // Load /app twice: the first load can make Vite discover and
          // re-bundle dependencies; the second waits for that bundle, so no
          // test arrives while it is being rebuilt.
          for (let load = 0; load < 2; load++) {
            await page.goto(`${origin}/app`, { waitUntil: "networkidle" });
            // Hydrated: the client module graph for /app has been compiled.
            await page
              .getByRole("textbox", { name: "Birth details" })
              .and(page.locator(":enabled"))
              .waitFor({ timeout: 120_000 });
          }
          const response = await page.request.post(
            `${origin}/api/resolve-birth`,
            {
              data: { sentence: "June 21, 2000 at 1pm in London" },
              timeout: 120_000,
            },
          );
          if (!response.ok())
            throw new Error(`${origin} resolver: ${response.status()}`);
        } finally {
          await page.close();
        }
      }),
    );
  } finally {
    await browser.close();
  }
}
