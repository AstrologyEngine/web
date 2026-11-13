import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  symlink,
} from "node:fs/promises";
import { resolve } from "node:path";

const exists = async (path) => {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
};

// Acquire before installing dependencies so competing launchers cannot alter an active link.
export const acquireStackLock = async (root) => {
  const directory = resolve(root, ".cache");
  const lockPath = resolve(directory, "cms-stack-lock");
  await mkdir(directory, { recursive: true });
  let lock;
  try {
    lock = await open(lockPath, "wx");
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        `Another stack owns this checkout, or a previous run was killed. Inspect ${lockPath} before recovering its contract link.`,
      );
    throw error;
  }
  await lock.writeFile(
    JSON.stringify({
      pid: process.pid,
      target: resolve(root, "node_modules/@astrologyengine/cms-contract"),
      backup: resolve(
        root,
        "node_modules/@astrologyengine/cms-contract.stack-backup",
      ),
    }) + "\n",
  );
  await lock.close();
  return () => rm(lockPath, { force: true });
};

export const linkLocalContract = async ({ root, cms }) => {
  const target = resolve(root, "node_modules/@astrologyengine/cms-contract");
  const backup = `${target}.stack-backup`;
  await mkdir(resolve(root, "node_modules/@astrologyengine"), {
    recursive: true,
  });
  let moved = false,
    linked = false;
  const restore = async () => {
    if (linked) {
      await rm(target, { recursive: true, force: true });
      linked = false;
    }
    if (moved) {
      await rename(backup, target);
      moved = false;
    }
  };
  try {
    if (await exists(backup))
      throw new Error(`Contract backup already exists: ${backup}`);
    const pkg = JSON.parse(
      await readFile(resolve(cms, "packages/contract/package.json"), "utf8"),
    );
    if (pkg.name !== "@astrologyengine/cms-contract")
      throw new Error("Unexpected local contract package");
    if (await exists(target)) {
      await rename(target, backup);
      moved = true;
    }
    await symlink(resolve(cms, "packages/contract"), target, "dir");
    linked = true;
    return restore;
  } catch (error) {
    await restore();
    throw error;
  }
};
