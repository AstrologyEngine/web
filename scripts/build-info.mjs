import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
mkdirSync("static", { recursive: true });
writeFileSync(
  "static/release.json",
  JSON.stringify({ version, commit }) + "\n",
);
