import { test, expect } from "bun:test";
import { resolveBirth } from "../src/lib/server/birth/resolve";
import { readFile } from "node:fs/promises";
const assets = async (path: string) => {
  try {
    return new Response(await readFile(`static${path}`));
  } catch {
    return new Response(null, { status: 404 });
  }
};
test("requires an explicitly supplied birth time", async () => {
  const result = await resolveBirth(
    { sentence: "Born January 2, 1980 in London, England" },
    assets,
  );
  expect(result.kind).toBe("needs_input");
  expect(result.message).toContain("birth time");
});
test("preserves explicit seconds and validates atlas identity", async () => {
  const result = await resolveBirth(
    { sentence: "Born January 2, 1980 at 3:04:05 PM in London, England" },
    assets,
  );
  expect(result.kind).toBe("resolved");
  if (result.kind !== "resolved") throw new Error(JSON.stringify(result));
  expect(result.birth.localTime).toBe("15:04:05");
  expect(result.birth.timePrecision).toBe("second");
  expect(result.birth.utc).toBe("1980-01-02T15:04:05Z");
  const { validateResolvedBirth } =
    await import("../src/lib/server/birth/resolve");
  expect(await validateResolvedBirth(result.birth, assets)).toBe(true);
  expect(
    await validateResolvedBirth({ ...result.birth, latitude: 0 }, assets),
  ).toBe(false);
});
test("requires a choice when a clock time repeats and rejects a gap", async () => {
  const sentence = "Born November 3, 2024 at 1:30 AM in New York, NY";
  const overlap = await resolveBirth({ sentence }, assets);
  expect(overlap.kind).toBe("needs_input");
  if (overlap.kind !== "needs_input") throw new Error(JSON.stringify(overlap));
  expect(overlap.timeChoices?.length).toBe(2);
  const picked = await resolveBirth(
    { sentence, timeKey: overlap.timeChoices![1]!.key },
    assets,
  );
  expect(picked.kind).toBe("resolved");
  if (picked.kind === "resolved")
    expect(picked.birth.utc).toBe("2024-11-03T06:30:00Z");
  const gap = await resolveBirth(
    { sentence: "Born March 10, 2024 at 2:30 AM in New York, NY" },
    assets,
  );
  expect(gap.kind).toBe("needs_input");
  if (gap.kind === "needs_input") expect(gap.message).toContain("skipped");
});
test("presents ambiguous numeric dates", async () => {
  const result = await resolveBirth(
    { sentence: "Born 08/06/1981 at 3 PM in London, England" },
    assets,
  );
  expect(result.kind).toBe("needs_input");
  if (result.kind === "needs_input") expect(result.dates.length).toBe(2);
});
test("does not discard explicitly supplied timezone or offset", async () => {
  for (const sentence of [
    "Born 1980-01-02T15:04:05Z in New York, NY",
    "Born January 2, 1980 at 3PM UTC in New York, NY",
    "Born 1980-01-02T15:04:05-05:00 in New York, NY",
    "Born January 2, 1980 at 3PM America/New_York in New York, NY",
  ]) {
    const result = await resolveBirth({ sentence }, assets);
    expect(result.kind).toBe("needs_input");
    if (result.kind === "needs_input")
      expect(result.message).toContain("timezone");
  }
});
test("requires a single date and time instead of resolving a range", async () => {
  for (const sentence of [
    "Born January 2-3, 1980 at 3 PM in London, England",
    "Born January 2, 1980 at 3 to 4 PM in London, England",
  ]) {
    const result = await resolveBirth({ sentence }, assets);
    expect(result.kind).toBe("needs_input");
    if (result.kind === "needs_input")
      expect(result.message).toContain("range");
  }
});
test("resolves historical offsets beyond fourteen hours", async () => {
  const result = await resolveBirth(
    { sentence: "Born January 15, 1860 at 10:30 AM in Juneau, AK" },
    assets,
  );
  expect(result.kind).toBe("resolved");
  if (result.kind === "resolved") {
    expect(result.birth.utcOffset).toBe("+15:02:19");
    expect(result.birth.utc).toBe("1860-01-14T19:27:41Z");
  }
});
