import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { publishRelease } from "./release.mjs";
publishRelease({
  run: (command, args) =>
    execFileSync(command, args, { encoding: "utf8" }).trim(),
  version: JSON.parse(readFileSync("package.json", "utf8")).version,
  repository: process.env.GITHUB_REPOSITORY,
});
