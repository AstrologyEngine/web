#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."
usage() {
  cat <<'USAGE'
Usage: scripts/review.sh [--serve]

  (default)  Install dependencies, run every automated check and browser test,
             then start the review stack (web + CMS) for manual review.
  --serve    Skip checks and tests: install dependencies, prepare the local CMS,
             and start the review stack only.

Ctrl+C stops the stack. If either service stops, the other is stopped too.
USAGE
}
REVIEW_SERVE_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --serve) REVIEW_SERVE_ONLY=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done
export REVIEW_SERVE_ONLY
# Use the pinned Node/Bun versions on PATH. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE
# only when using an existing local browser instead of a Playwright download.
# Manual QA for the birth details modal and variant A layout ({WEB} is the web URL).
MANUAL_REVIEW_TASKS=(
  "Birth entry: open {WEB}/app in a desktop-width window. The birth details modal opens with the field focused and an empty wheel behind it. Escape, clicking outside the modal and Done do nothing yet."
  "Live preview: type \"June 21, 2000 at 1pm in London\" slowly. The date, time and place tags update as results arrive (they are not reset while typing), Done shows a spinner while parsing, and the chart appears behind the open modal. Done then closes the modal and focus lands on the birth line in the header."
  "Later editing: hover the birth line (tooltip \"Edit birth details\") and click it. The modal reopens as \"Edit birth details\", prefilled, with the cursor at the end. Change 1pm to 3pm: the chart updates behind the modal."
  "Discarding: in the reopened modal, delete the place so the details are incomplete, then press Escape (and, separately, click outside the modal). The modal closes and the chart and header keep the last complete birth."
  "Choices: enter \"03/04/2000 at 1pm in London\", choose \"Mar 4, 2000\" and check that the chart updates."
  "Layout: a sticky header, the Tropical / Vedic / True Sky pill above the wheel, system help in the right-hand panel, and the \"Choose a ... by name\" lists below the fold. Scroll down: the header and right-hand panel stay in place."
  "Selection: click the Sun on the wheel. Its details appear in the right-hand panel. Close, Escape or \"?\" return the panel to system help."
  "House system: click \"...\" next to the pill. Choose Placidus (it applies immediately), then switch presets: Placidus is kept. With the keyboard, the arrow keys move without applying, Enter applies and Escape closes without changes."
  "Errors: in DevTools > Network, block requests matching \"ephemeris\", then edit the birth to \"January 2, 1980 at 3pm in Paris\". The modal shows \"Whoops, chart data couldn't be downloaded. Retry\". Unblock, then click Retry: the chart updates."
  "Mobile: switch to a 390px-wide device in DevTools and reload. One column, a two-line truncated birth line, a full-width modal, and a details bottom sheet after choosing a body from the lists."
  "Reload: the page starts fresh, with the modal open and an empty field."
)
command -v node >/dev/null || { echo 'Install Node 24.10.0 first.' >&2; exit 1; }
command -v bun >/dev/null || { echo 'Install Bun 1.3.14 first.' >&2; exit 1; }
[[ "$(node --version)" == v24.10.0 && "$(bun --version)" == 1.3.14 ]] || {
  echo 'Use Node 24.10.0 and Bun 1.3.14.' >&2; exit 1;
}
export REVIEW_MANUAL_TASKS_JSON="$(node -e 'console.log(JSON.stringify(process.argv.slice(1)))' "${MANUAL_REVIEW_TASKS[@]+"${MANUAL_REVIEW_TASKS[@]}"}")"
exec node --input-type=module <<'JS'
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
const root = process.cwd(), cms = `${root}/apps/cms`;
const processes = new Set();
let stopping = false;
const signal = (pid, name) => {
  try { process.kill(-pid, name); } catch (e) { if (e.code !== 'ESRCH') throw e; }
};
const stop = async (pid) => {
  signal(pid, 'SIGTERM');
  try { process.kill(-pid, 0); } catch (e) { if (e.code === 'ESRCH') return; throw e; }
  await delay(1000); signal(pid, 'SIGKILL');
};
const cleanup = async () => {
  stopping = true;
  const owned = [...processes];
  await Promise.all(owned.map(stop));
  owned.forEach((pid) => processes.delete(pid));
};
for (const [name, code] of [['SIGINT', 130], ['SIGTERM', 143]])
  process.once(name, () => { if (!stopping) void cleanup().then(() => process.exit(code)); });
const start = (command, args, cwd = root, env = process.env) => {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const child = spawn(command, args, { cwd, env, detached: true, stdio: 'inherit' });
  if (child.pid) processes.add(child.pid);
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, sig) => code === 0 ? resolve() : reject(new Error(`${command} failed (${sig ?? code})`)));
  });
  void done.catch(() => {});
  return { child, done };
};
const run = async (command, args, cwd = root, env = process.env) => {
  const service = start(command, args, cwd, env);
  try { await service.done; } finally {
    if (service.child.pid && !stopping) { await stop(service.child.pid); processes.delete(service.child.pid); }
  }
};
const port = (name, fallback) => {
  const n = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(n) || n < 1024 || n > 65535) throw new Error(`Invalid ${name}`);
  return n;
};
const available = (port) => new Promise((resolve, reject) => {
  const server = createServer();
  server.once('error', () => reject(new Error(`Port ${port} is unavailable; configure review/Playwright ports.`)));
  server.listen(port, '127.0.0.1', () => server.close(resolve));
});
const ready = (url, service) => Promise.race([
  service.done.then(() => { throw new Error(`Service exited: ${url}`); }),
  (async () => {
    const end = Date.now() + 120000;
    while (!stopping && Date.now() < end) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
        await r.body?.cancel(); if (r.ok) return;
      } catch {}
      await delay(250);
    }
    throw new Error(`Readiness failed: ${url}`);
  })(),
]);
try {
  const wp = port('REVIEW_WEB_PORT', 5173), cp = port('REVIEW_CMS_PORT', 8787), tp = port('PLAYWRIGHT_PORT', 4173);
  const serveOnly = process.env.REVIEW_SERVE_ONLY === '1';
  const testPorts = serveOnly ? [] : [tp, tp + 1, tp + 2, tp + 4614, tp + 4615, tp + 14614, tp + 14615];
  const ports = [wp, cp, cp + 10000, ...testPorts];
  if (ports.some((p) => p > 65535) || wp === cp || wp === cp + 10000) throw new Error('Invalid derived ports.');
  for (const p of new Set(ports)) await available(p);
  await run('bun', ['install', '--frozen-lockfile']);
  await run('bun', ['install', '--frozen-lockfile'], cms);
  if (!serveOnly) {
    // Browser setup needs no administrator access: the download goes to the user's
    // Playwright cache, and missing system libraries stop the run with Playwright's
    // one-time install command instead of being installed here.
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
    if (!executablePath) await run('bunx', ['playwright', 'install', 'chromium']);
    console.log('\n> Chromium launch check');
    const { chromium } = await import('@playwright/test');
    try {
      // Same executable and arguments as playwright.config.ts.
      await (await chromium.launch(executablePath ? { executablePath, args: ['--no-sandbox', '--disable-gpu'] } : {})).close();
    } catch (error) {
      throw new Error(`Chromium cannot start.\n${error.message}\nIf system libraries are missing, install them once (needs administrator access):\n  sudo bunx playwright install-deps chromium`);
    }
    for (const check of ["sync", "check", "check:ts", "lint", "format:check"]) await run('bun', ['run', check]);
    await run('bash', ['-c', 'node --test scripts/*.test.mjs']);
    await run('bun', ['test', 'verification']);
    for (const check of ["test", "check", "lint", "format:check"]) await run('bun', ['run', check], cms);
    await run('bun', ['run', 'build']);
    const env = { ...process.env }; delete env.E2E_BASE_URL;
    await run('bun', ['run', 'test:browser'], root, env);
  }
  await run('bun', ['run', 'migrate:local'], cms);
  await run('bun', ['run', 'seed:local'], cms);
  const cu = `http://127.0.0.1:${cp}`, wu = `http://127.0.0.1:${wp}`;
  const cs = start('bunx', ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', String(cp), '--inspector-port', String(cp + 10000), '--show-interactive-dev-session=false'], cms);
  await ready(`${cu}/health`, cs);
  const ws = start('bun', ['run', 'dev', '--host', '127.0.0.1', '--port', String(wp), '--strictPort'], root, { ...process.env, CMS_ORIGIN: cu });
  await ready(wu, ws);
  console.log(`\n${serveOnly ? 'Checks and tests skipped (--serve).' : 'All automated checks passed.'}\nWeb: ${wu}\nCMS: ${cu}\n\nManual review tasks:`);
  const tasks = JSON.parse(process.env.REVIEW_MANUAL_TASKS_JSON);
  if (tasks.length) tasks.forEach((task, i) => console.log(`${i + 1}. ${task.replaceAll('{WEB}', wu)}`));
  else console.log('No manual review tasks specified.');
  console.log('\nPress Ctrl+C to stop the review stack. Restart it without checks: ./scripts/review.sh --serve');
  const stopped = (name, service) => service.done.then(() => name, () => name);
  const name = await Promise.race([stopped('CMS', cs), stopped('web dev server', ws)]);
  throw new Error(`The ${name} stopped, so the review stack was shut down. Restart it with: ./scripts/review.sh --serve`);
} catch (error) {
  if (!stopping) { console.error(`Review stopped: ${error.message}`); process.exitCode = 1; }
} finally { if (!stopping) await cleanup(); }
JS
