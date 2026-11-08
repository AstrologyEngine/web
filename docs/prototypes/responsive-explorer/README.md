# Responsive Explorer sheet review

Throwaway alternatives for [Prototype mid-size and mobile layouts around the selected desktop direction](https://github.com/AstrologyEngine/web/issues/36). **Owner direction: C is closest; refine with a subtle drag handle and compact / tall / hidden snaps. Refined prototype review pending.** This is a decision prototype; production implementation remains in the dependent delivery tickets.

## Run and compare

`bun install --frozen-lockfile`, then `bun run dev --host 127.0.0.1 --port 5196`.

Open http://127.0.0.1:5196/app?variant=A&review=1. Enter birth details, or use the example loader to calculate June 21, 2000, 1pm, London. The floating review bar switches A/B/C, toggles long text and resets the empty state. “Hide review controls” removes the harness without losing the chart; add `review=1` again to restore it (reloading clears in-memory chart state).

| Alternative | Mid-size right sheet | Mobile bottom sheet | Strength | Cost |
| --- | --- | --- | --- | --- |
| A — Compact overlay | 360px wide, inset 24px below header and above bottom | 40% viewport height | Useful reading space with some wheel visible | Overlaps the wheel and part of the toolbar at mid-size |
| B — Tall reading sheet | 360px wide, header to bottom | 72% viewport height | More continuous reading, fewer internal scrolls | Covers most of the mobile chart |
| C — Expandable peek | 320px wide, 46% viewport height, bottom inset 24px | 27% viewport height | More chart stays visible | Only the beginning of an explanation fits before expansion or scrolling |

All sheets are nonmodal. Select another visible glyph to replace the details; they do not resize the wheel. The subtle top handle tracks vertical pointer drag continuously and snaps by drag direction on release: upward goes tall; downward steps tall to compact, or compact to hidden. C retains its 27% mobile / 46% mid-size compact size; tall is 78% mobile / header-to-bottom at mid-size. Tap the handle to toggle compact/tall; Arrow Up/Right expands, Arrow Down/Left steps tall to compact to hidden; Home hides and End expands. Pointer cancellation restores the starting snap. Opening a hidden sheet starts compact. Close and Escape dismiss and return focus to the opener. Dragging the handle down far enough snaps hidden. Long explanations scroll inside the sheet. Outside clicks do not dismiss. Keyboard selection moves focus to the sheet; pointer selection keeps chart interaction available. These are explicit prototype behaviors for owner review, not settled product decisions.

Desktop remains approved A — Chart toolbar, with the permanent 340px sticky rail spanning chart and tables, no close button, and Vedic centered over the wheel. The [approved desktop reference](https://github.com/AstrologyEngine/web/issues/35#issuecomment-6727352529) at `2eb34b7fca7e37932356ad95fe8c92a50333395e` is the source. This prototype starts from current main `1baf702`, carrying over its reference component and development birth adapter without replacing later production changes.

## Breakpoint proposals

- **1120px and wider:** permanent desktop rail. Below this, retaining a 340px rail leaves less than approximately 730px of wheel space after gutters; a right overlay lets the wheel remain primary. The proposed transition was checked at 1119/1120px.
- **800–1119px:** full wheel with right sheet; brand becomes an icon. The sheet can obscure controls; close it to regain those controls without resizing or losing the chart.
- **Below 800px:** the existing `MobileWheel` navigation and its established 799/800 transition are reused unchanged. “Zoom half wheel”, horizontal drag, pan buttons and “Show whole wheel” preserve their behavior and pan state. This map does not reopen that navigation decision.
- On short mobile viewports the chart region has a 640px minimum so the controls and wheel remain usable through vertical page scrolling. Tables follow that primary region.

## Walkthrough

1. Inspect the empty-wheel birth modal at narrow and wide sizes. Required initial entry cannot be dismissed; later editing returns to the chart.
2. Load the computed example. Select a house, sign, planet or angle; grouped body markers open the existing picker. Compare each sheet size with actual explanation text.
3. Toggle half-wheel mode, pan horizontally, open details, close them and confirm pan is preserved.
4. Open system details with `?`; compare A/B/C and drag the handle through all three snap states. Enable long text and scroll inside the pane.
5. With keyboard, focus a glyph and press Enter. Escape returns focus. Repeat with `?` and inspect the close button and toolbar swipe.
6. Resize through 799/800 and 1119/1120; inspect the full wheel, compact birth header, and sticky desktop rail while scrolling to tables.

## Evidence and limitations

Playwright Chromium walkthrough: 360, 390, 799, 800, 834, 1119, 1120, 1280 and 1440px widths; no horizontal document overflow and no page errors. Screenshots use 390×844, 834×1112 and 1440×900. At 390×844 the default sheet heights were approximately 338px / 608px / 228px for A/B/C. At 834px right sheets were 360px / 360px / 320px wide. Half-wheel pan reached 140px and survived viewport transitions. Keyboard entry focused the pane; Escape restored the opener. Actual House 1 selection rendered in the pane; expanded long content scrolled internally (600px visible, 1203px content). Toolbar pointer swipe dismissed the sheet. Nested production detail shells are reset to static positioning inside this prototype so their mobile fixed sheets do not escape the comparison pane.

Svelte check, lint, changed-file formatting, official Svelte autofixer (no issues), and production build passed. Browser checks exercise desktop Chromium and emulated viewport/pointer events; physical phone touch, Safari, OS keyboard and deployment acceptance are not established. The optional Impeccable mechanical detector was unavailable after its context step because the installed launcher path disappeared; no detector result is claimed.

Calculations remain Tropical / Whole Sign. Zodiac controls preview the selected explanation and placement; actual system and house changes are other tickets. Tables preview placement, not complete table interactions. No analytics delivery is claimed. All state is in memory; the prototype and birth adapter are development-only.

Captures: [A mobile](A-mobile.webp), [A mid-size](A-mid.webp), [B mobile](B-mobile.webp), [B mid-size](B-mid.webp), [C mobile](C-mobile.webp), [C mid-size](C-mid.webp), [expanded glyph details](C-glyph-expanded.webp), [desktop reference preserved](desktop.webp).

## C refinement evidence

Owner requested C with a subtle handle and compact, tall, hidden snaps. Chromium pointer drags verified compact → tall → compact → hidden, compact reopening, keyboard tall/hidden, and continuous bottom-anchored resizing at 390×844 and 834×1112. No page errors. [Refined compact sheet](C-handle-compact.webp), [refined tall sheet](C-handle-tall.webp). Earlier captures preserve comparison history and show the prior More/Less toolbar. Final breakpoint and refined prototype approval remain pending.

Owner amendment: drag direction determines the next snap, independent of release proximity. A meaningful upward drag goes tall; a downward drag moves one state lower (tall → compact → hidden). The 5px movement threshold distinguishes a drag from a tap.

Owner amendment: the responsive prototype starts in half-wheel mode. A borderless SVG magnifying glass replaces the text zoom toggle: minus shows the whole wheel, plus returns to half-wheel. Accessible labels and a 44px target remain. [Current default view](C-zoom-default.webp). Chromium verified initial half-wheel, both toggle directions, SVG-only content and computed 0px border / transparent background.
