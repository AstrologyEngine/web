import { beforeEach, describe, expect, it } from "vitest";
import { ADMIN_TOKEN, call, resetDb } from "./helpers";

beforeEach(resetDb);

const site = "https://staging.example.test";
const origins = { CMS_ALLOWED_ORIGINS: `${site}, http://localhost:5173` };
const get = (path: string, origin?: string, method = "GET") =>
  call(path, { method, headers: origin ? { origin } : {} }, origins);

describe("CORS", () => {
  it("allows configured origins on public routes", async () => {
    for (const path of ["/v1/locales", "/v1/content/en", "/health"]) {
      const response = await get(path, site);
      expect(response.headers.get("access-control-allow-origin"), path).toBe(
        site,
      );
      expect(response.headers.get("access-control-expose-headers")).toBe(
        "ETag",
      );
      expect(response.headers.get("vary")).toContain("Origin");
    }
  });

  it("sends no allow-origin to other origins but still varies", async () => {
    const response = await get("/v1/locales", "https://evil.test");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("answers preflight for allowed origins", async () => {
    const response = await call(
      "/v1/content/en",
      {
        method: "OPTIONS",
        headers: {
          origin: site,
          "access-control-request-method": "GET",
          "access-control-request-headers": "if-none-match",
        },
      },
      origins,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(site);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, HEAD, OPTIONS",
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "If-None-Match",
    );
    expect(response.headers.get("access-control-max-age")).toBe("86400");
  });

  it("never emits CORS headers on admin routes", async () => {
    for (const method of ["GET", "OPTIONS"]) {
      const response = await call(
        "/v1/admin/locales",
        {
          method,
          headers: {
            origin: site,
            authorization: `Bearer ${ADMIN_TOKEN}`,
            "access-control-request-method": "PUT",
          },
        },
        origins,
      );
      expect(
        response.headers.get("access-control-allow-origin"),
        method,
      ).toBeNull();
      expect(response.headers.get("access-control-allow-methods")).toBeNull();
    }
  });
});
