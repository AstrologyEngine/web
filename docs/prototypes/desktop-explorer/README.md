# Desktop Explorer layout review

Throwaway alternatives for [Prototype desktop Explorer layouts with the wheel as the primary visual](https://github.com/AstrologyEngine/web/issues/35). No owner choice has been recorded. This branch is a primary source for the layout decision, not a production implementation.

## Run

From this worktree: `bun install --frozen-lockfile`, then `bun run dev --host 127.0.0.1 --port 5195`.

Open `/app?variant=A`, `/app?variant=B`, or `/app?variant=C`. The floating bottom bar and left/right arrow keys switch variants without discarding the in-memory chart. The modal initially requires birth details; “Use example for layout review” computes June 21, 2000, 1pm, London using the existing resolver, atlas and engine. The centered birth line reopens the editor. Reloading clears the chart.

## Comparison

| Layout | Strength | Cost / consideration |
| --- | --- | --- |
| A — Chart toolbar | Keeps zodiac controls visibly connected to the wheel; a compact permanent pane leaves a broad chart area. | Toolbar takes vertical space; narrower reading measure. |
| B — Reading rail | Groups system choice with its explanation and gives the wheel uninterrupted vertical space. | Wider inset pane takes horizontal room; controls sit farther from the chart center. |
| C — Lower control dock | Keeps the upper canvas quiet; open reading column has more room for explanations. | Zodiac controls are below the wheel; wider prose area leaves less chart width. |

Legacy shell authority: `../web-legacy/src/routes/+layout.svelte` and `+page.svelte`: cream `#f5f2eb`, lighter surface `#faf8f3`, ink `#292d38`, plum `#644678` / `#6b5380`, line `#ded9d0`; system body typography and Georgia headings. The existing chart palette stays unchanged pending the separate palette decision.

## Walkthrough

1. Compare the empty wheel behind the required birth modal. Load the review example or enter a birth date, time and place.
2. Select the Sun, another body, a sign, an angle or a house. The permanent explanation pane changes without resizing the wheel and has no close button.
3. Use `?` to restore the selected system explanation. Click Tropical, Vedic and True Sky to compare control placement and system copy.
4. Use the adjacent three dots to inspect Advanced placement. Toggle Long details in the review bar and scroll inside the pane.
5. Switch layouts, then scroll below the first viewport to inspect secondary table placement. These table headings preview layout; table interaction is a later ticket.
6. Reopen the centered birth line, edit a date, and apply. Use Empty state to restart the required entry flow.

## Boundaries

The live wheel is calculated in Tropical with Whole Sign houses. Zodiac buttons preview layout and explanatory states; they do not change the calculation. Vedic copy reflects the agreed Lahiri direction, whose implementation belongs to the separate system-interaction ticket. Advanced’s house selector is disabled. No analytics delivery is claimed. Mobile and mid-size compositions remain separate decisions; this desktop harness intentionally uses a desktop canvas at widths below 800px.

The prototype route switch and its birth-resolver adapter are development-only. The adapter uses the existing pure resolver with SvelteKit’s asset fetch because Vite does not expose the deployed `ASSETS` binding. The production adapter remains unchanged. No persistence is added.

## Evidence

Browser walkthrough: 1440×1000 and a 1280×800 capture. Real birth resolution and WASM calculation, system explanation selection, Advanced opening, birth editing and all three variants ran with no page errors. Glyph selection kept the exact same wheel bounds within each variant. Long content scrolled inside the pane. Secondary tables began at y=1000 in the 1000px-high viewport.

| Variant at 1440×1000 | Wheel diameter | Long pane visible / scroll height |
| --- | ---: | ---: |
| A | 760px | 848 / 1273px |
| B | 820px | 713 / 1215px |
| C | 748px | 848 / 1173px |

Validation: Svelte check (zero errors/warnings), lint, official Svelte autofixer (no issues for new component), production build. These establish runnable prototype behavior; they do not establish owner approval, deployment or final implementation acceptance.

Screenshots: [A empty](A-empty.webp), [A system](A-system.webp), [A selected](A-selected.webp), [A long](A-long.webp); [B empty](B-empty.webp), [B system](B-system.webp), [B selected](B-selected.webp), [B long](B-long.webp); [C empty](C-empty.webp), [C system](C-system.webp), [C selected](C-selected.webp), [C long](C-long.webp), [C at 1280×800](C-1280.webp).

Owner decision pending: choose A, B, C, or describe a combination. Keep the prototype ticket open and dependent visual tickets blocked until that decision is recorded.
