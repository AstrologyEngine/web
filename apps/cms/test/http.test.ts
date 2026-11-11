import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const call = (path: string, init?: RequestInit) =>
  exports.default.fetch(`https://cms.test${path}`, init);

describe("error handling", () => {
  it("answers unknown routes with a JSON not_found error", async () => {
    const response = await call("/nope");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: expect.any(String) },
    });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "rejects %s outside /v1/admin with method_not_allowed",
    async (method) => {
      for (const path of ["/health", "/v1/locales", "/v1/content/en"]) {
        const response = await call(path, { method });
        expect(response.status, `${method} ${path}`).toBe(405);
        expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
        expect(await response.json()).toMatchObject({
          error: { code: "method_not_allowed" },
        });
      }
    },
  );
});
