import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("GET /health", () => {
  it("reports D1 connectivity and the content version", async () => {
    const response = await exports.default.fetch("https://cms.test/health");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, version: 1 });
  });
});
