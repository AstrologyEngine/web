import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
const [base, commit] = process.argv.slice(2);
assert(base && commit, "Expected site URL and commit");
const verify = async () => {
  const response = await fetch(base);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Astrology Engine/);
  const assets = [
    ...html.matchAll(/(?:href|src)="([^" ]*\/_app\/[^" ]+)"/g),
  ].map((match) => new URL(match[1], base));
  for (const asset of assets)
    assert.equal(
      (await fetch(asset)).status,
      200,
      `Asset failed: ${asset.pathname}`,
    );
  const metadata = await fetch(new URL("/release.json", base));
  assert.equal(metadata.status, 200);
  assert.equal((await metadata.json()).commit, commit);
};
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    await verify();
    break;
  } catch (error) {
    if (attempt === 12) throw error;
    console.log(`Waiting for deployment readiness (${attempt}/12)`);
    await setTimeout(5000);
  }
}
console.log(`Verified ${base} at ${commit}`);
