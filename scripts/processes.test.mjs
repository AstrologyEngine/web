import assert from "node:assert/strict";
import { test } from "node:test";
import { createSupervisor, waitForReady } from "./processes.mjs";

test("supervisor detects early failure and only shuts down its owned processes", async () => {
  const owned = createSupervisor(),
    unrelated = createSupervisor();
  const other = unrelated.start(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    process.cwd(),
  );
  try {
    const dead = owned.start(
      process.execPath,
      ["-e", "process.exit(7)"],
      process.cwd(),
    );
    await assert.rejects(waitForReady("http://127.0.0.1:9", dead), /exited/);
    const running = owned.start(
      process.execPath,
      ["-e", "setInterval(()=>{},1000)"],
      process.cwd(),
    );
    await owned.cleanup();
    await assert.rejects(running.done);
    assert.doesNotThrow(() => process.kill(other.child.pid, 0));
    await owned.cleanup();
  } finally {
    await unrelated.cleanup();
  }
});
