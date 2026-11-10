import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const git = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "ignore"],
});
const commit = git.status === 0 ? git.stdout.trim() : null;
mkdirSync("static", { recursive: true });
writeFileSync(
  "static/release.json",
  JSON.stringify({ version, commit }) + "\n",
);
