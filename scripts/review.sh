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
import { runStack } from './scripts/dev-stack.mjs';
try {
  await runStack({ review: true, serveOnly: process.env.REVIEW_SERVE_ONLY === '1' });
} catch (error) {
  console.error(`Review stopped: ${error.message}`);
  process.exitCode = 1;
}
JS
