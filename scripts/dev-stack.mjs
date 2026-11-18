import { watch } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cmsRepoPath } from "./cms-repo.mjs";
import { acquireStackLock, linkLocalContract } from "./local-contract.mjs";
import { availablePort, createSupervisor, waitForReady } from "./processes.mjs";
import { writeSnapshot } from "./cms-snapshot.mjs";

const port = (value, fallback) => {
  const number = Number(value ?? fallback);
  if (!Number.isInteger(number) || number < 1024 || number > 65535)
    throw new Error(`Invalid port: ${value}`);
  return number;
};

const runStack = async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const cms = cmsRepoPath();
  const wp = port(process.env.WEB_PORT, 5173);
  const cp = port(process.env.CMS_PORT, 8787);
  const ports = [wp, cp, cp + 10000];
  if (new Set(ports).size !== ports.length || ports.some((p) => p > 65535))
    throw new Error("Stack ports must be distinct and at most 65535");
  for (const p of ports) await availablePort(p);
  const releaseLock = await acquireStackLock(root);
  const supervisor = createSupervisor();
  let linkSetup, seedWatcher, stopping;
  const stop = () =>
    (stopping ??= (async () => {
      seedWatcher?.close();
      await supervisor.cleanup();
      const restore = await linkSetup?.catch(() => undefined);
      await restore?.();
      await releaseLock();
    })());
  const handlers = [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ].map(([signal, code]) => {
    const handler = () => {
      void stop().then(() => process.exit(code));
    };
    process.once(signal, handler);
    return [signal, handler];
  });
  const env = { ...process.env, CMS_REPO_PATH: cms };
  const assertRunning = () => {
    if (stopping) throw new Error("Stack is stopping");
  };
  const start = (...args) => {
    assertRunning();
    return supervisor.start(...args);
  };
  const run = async (args, cwd = root) => {
    assertRunning();
    await supervisor.run("bun", args, cwd, env);
    assertRunning();
  };
  try {
    console.log(`Web: ${root}\nCMS: ${cms}`);
    await run(["install", "--frozen-lockfile"]);
    await run(["install", "--frozen-lockfile"], cms);
    await run(["run", "contract:build"], cms);
    linkSetup = linkLocalContract({ root, cms });
    await linkSetup;
    assertRunning();
    await run(["run", "migrate:local"], cms);
    await run(["run", "seed:local"], cms);
    const contract = start("bun", ["run", "contract:watch"], cms, env);
    const cu = `http://127.0.0.1:${cp}`,
      wu = `http://127.0.0.1:${wp}`;
    const cs = start(
      "bun",
      [
        "x",
        "wrangler",
        "dev",
        "--ip",
        "127.0.0.1",
        "--port",
        String(cp),
        "--inspector-port",
        String(cp + 10000),
        "--show-interactive-dev-session=false",
      ],
      cms,
      env,
    );
    await waitForReady(`${cu}/health`, cs);
    const ws = start(
      "bun",
      [
        "run",
        "dev",
        "--host",
        "127.0.0.1",
        "--port",
        String(wp),
        "--strictPort",
      ],
      root,
      { ...env, CMS_ORIGIN: cu },
    );
    await waitForReady(wu, ws);
    let snapshotWrite = Promise.resolve();
    seedWatcher = watch(resolve(cms, "packages/contract/seed"), () => {
      snapshotWrite = snapshotWrite
        .then(() =>
          writeSnapshot({
            seedPath: resolve(cms, "packages/contract/seed/en.json"),
            outDir: resolve(root, "static/content"),
          }),
        )
        .catch((error) => console.error(`Snapshot update: ${error.message}`));
    });
    console.log(
      `\nWeb: ${wu}\nCMS: ${cu}\nLocal data persists in the CMS checkout. Ctrl+C stops this stack.`,
    );
    const name = await Promise.race(
      [
        ["CMS", cs],
        ["web", ws],
        ["contract watcher", contract],
      ].map(([name, service]) => service.done.then(() => name)),
    );
    throw new Error(`${name} stopped; shutting down the stack`);
  } finally {
    await stop();
    for (const [signal, handler] of handlers)
      process.removeListener(signal, handler);
  }
};

runStack().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
