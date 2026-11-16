import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

export const createSupervisor = () => {
  const children = new Set();
  const start = (command, args, cwd, env = process.env) => {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: true,
      stdio: "inherit",
    });
    const done = new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) =>
        code === 0
          ? resolve()
          : reject(new Error(`${command} exited (${signal ?? code})`)),
      );
    });
    void done.catch(() => {});
    const item = { child, done };
    children.add(item);
    return item;
  };
  const signalGroup = (pid, signal) => {
    if (!pid) return false;
    try {
      process.kill(-pid, signal);
      return true;
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
      return false;
    }
  };
  const stop = async (item) => {
    if (signalGroup(item.child.pid, "SIGTERM")) {
      await delay(250);
      signalGroup(item.child.pid, "SIGKILL");
    }
    children.delete(item);
  };
  const run = async (...args) => {
    const item = start(...args);
    try {
      await item.done;
    } finally {
      await stop(item);
    }
  };
  const cleanup = async () => {
    await Promise.all([...children].map(stop));
  };
  return { start, run, cleanup };
};

export const availablePort = (port) =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", () =>
      reject(
        new Error(
          `Port ${port} is unavailable; set WEB_PORT, CMS_PORT or PLAYWRIGHT_PORT.`,
        ),
      ),
    );
    server.listen(port, "127.0.0.1", () => server.close(resolve));
  });

export const waitForReady = async (url, service) => {
  const controller = new AbortController();
  try {
    await Promise.race([
      service.done.then(() => {
        throw new Error(`Service stopped before readiness: ${url}`);
      }),
      (async () => {
        for (
          let attempt = 0;
          attempt < 120 && !controller.signal.aborted;
          attempt++
        ) {
          try {
            const response = await fetch(url, {
              signal: AbortSignal.timeout(1000),
            });
            await response.body?.cancel();
            if (response.ok) return;
          } catch {}
          await delay(1000, undefined, { signal: controller.signal });
        }
        throw new Error(`Readiness timeout: ${url}`);
      })(),
    ]);
  } finally {
    controller.abort();
  }
};
