import { test, expect } from "bun:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import slices from "../src/lib/calculation/slices.json";

const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
test("published engine and annual slices match the selected dataset", async () => {
  const indexBytes = await readFile("static/engine/ephemeris/index.json");
  expect(sha(indexBytes)).toBe(
    "adc9ea1aea895e98f8984f7d20fce8d187bd834d6d883f5a5467f0b67437e3fe",
  );
  const index = JSON.parse(indexBytes.toString());
  expect(index.source.sha256).toBe(
    "06d4c26e589207bf479dbd217fafb3e4d6c559626425b156912e39a4d859487b",
  );
  expect(index.segments).toHaveLength(301);
  expect(slices).toEqual(
    Object.fromEntries(
      index.segments.map((segment: { year: number; sha256: string }) => [
        segment.year,
        segment.sha256,
      ]),
    ),
  );
  for (const segment of index.segments) {
    const bytes = await readFile(`static/engine/ephemeris/${segment.url}`);
    expect(bytes.length).toBe(segment.bytes);
    expect(sha(bytes)).toBe(segment.sha256);
  }
  expect(sha(await readFile("static/engine/chart_bg.wasm"))).toBe(
    "22c1aa9cd9b457b24521d0dc7a1e90710a9fbd29bc40040f2a359b51a59096ff",
  );
});
