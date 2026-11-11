import { describe, expect, it } from "vitest";
import { ADMIN_TOKEN, call } from "./helpers";

const NEXT = "next-admin-token-abcdefghijklmnopqrstuvwxyz012345";
const probe = (
  authorization?: string,
  overrides: Partial<Cloudflare.Env> = {},
  method = "GET",
) =>
  call(
    "/v1/admin/does-not-exist",
    { method, headers: authorization ? { authorization } : {} },
    overrides,
  );

describe("admin authentication", () => {
  it.each([
    ["no header", undefined],
    ["wrong scheme", `Basic ${ADMIN_TOKEN}`],
    ["wrong token", "Bearer not-the-token-0123456789abcdefghijkl"],
    ["empty token", "Bearer "],
    ["token prefix", `Bearer ${ADMIN_TOKEN.slice(0, -1)}`],
  ])("rejects %s with 401", async (_label, header) => {
    const response = await probe(header);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe('Bearer realm="cms"');
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      error: { code: "unauthorized" },
    });
  });

  it("accepts the admin token (case-insensitive scheme)", async () => {
    for (const scheme of ["Bearer", "bearer"]) {
      const response = await probe(`${scheme} ${ADMIN_TOKEN}`);
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });

  it("lets authorised writes through the read-only guard", async () => {
    const response = await probe(`Bearer ${ADMIN_TOKEN}`, {}, "POST");
    expect(response.status).toBe(404);
  });

  it("accepts the rotation token only while it is configured", async () => {
    expect(
      (await probe(`Bearer ${NEXT}`, { CMS_ADMIN_TOKEN_NEXT: NEXT })).status,
    ).toBe(404);
    expect((await probe(`Bearer ${NEXT}`)).status).toBe(401);
  });

  it.each([
    ["unset", { CMS_ADMIN_TOKEN: undefined }],
    ["empty", { CMS_ADMIN_TOKEN: "" }],
    ["too short", { CMS_ADMIN_TOKEN: "short-token" }],
    [
      "unset but NEXT set",
      { CMS_ADMIN_TOKEN: undefined, CMS_ADMIN_TOKEN_NEXT: NEXT },
    ],
  ])("fails closed with 503 when the token is %s", async (_label, env) => {
    const response = await probe(`Bearer ${ADMIN_TOKEN}`, env);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: { code: "admin_disabled" },
    });
  });

  it("ignores a too-short rotation token", async () => {
    const response = await probe("Bearer short", {
      CMS_ADMIN_TOKEN_NEXT: "short",
    });
    expect(response.status).toBe(401);
  });

  it("never echoes token material", async () => {
    const response = await probe(`Bearer ${ADMIN_TOKEN}x`);
    expect(await response.text()).not.toContain(ADMIN_TOKEN);
  });
});
