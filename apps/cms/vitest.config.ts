import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations("./migrations"),
          CMS_ADMIN_TOKEN: "test-admin-token-0123456789abcdefghijklmnop",
        },
      },
    })),
  ],
  test: { setupFiles: ["./test/setup.ts"] },
});
