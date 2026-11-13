import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readlink,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { test } from "node:test";
import { acquireStackLock, linkLocalContract } from "./local-contract.mjs";

test("local contract link restores the installed package and rejects competing launchers", async () => {
  const root = await mkdtemp(resolve(tmpdir(), "cms-link-"));
  const cms = resolve(root, "cms");
  const target = resolve(root, "node_modules/@astrologyengine/cms-contract");
  try {
    await mkdir(target, { recursive: true });
    await writeFile(resolve(target, "installed"), "pinned release");
    await mkdir(resolve(cms, "packages/contract"), { recursive: true });
    await writeFile(
      resolve(cms, "packages/contract/package.json"),
      '{"name":"@astrologyengine/cms-contract"}',
    );
    const unlock = await acquireStackLock(root);
    await assert.rejects(acquireStackLock(root), /Another stack/);
    const restore = await linkLocalContract({ root, cms });
    assert.equal(await readlink(target), resolve(cms, "packages/contract"));
    await restore();
    assert.equal(
      await readFile(resolve(target, "installed"), "utf8"),
      "pinned release",
    );
    const again = await linkLocalContract({ root, cms });
    await again();
    await unlock();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
