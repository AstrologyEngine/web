import assert from "node:assert/strict";
const {
  CLOUDFLARE_ACCOUNT_ID: account,
  CLOUDFLARE_API_TOKEN: token,
  PR: pr,
} = process.env;
assert(
  account && token && /^\d+$/.test(pr ?? ""),
  "Expected account, token and numeric PR",
);
const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${account}/workers/workers/astrology-engine-web-staging/previews/pr-${pr}`,
  { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
);
assert(
  response.ok || response.status === 404,
  `Preview cleanup failed: HTTP ${response.status}`,
);
console.log(`Preview pr-${pr} removed or already absent`);
