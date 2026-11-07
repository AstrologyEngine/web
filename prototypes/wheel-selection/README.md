# Wheel selection — throwaway interaction prototype

Question: how should single selection, crowded targets, overlapping aspects,
and responsive details behave when the plugin wheel becomes a beginner tool?

Open `prototype.html` directly in a browser. It is self-contained and offline.
Rebuild with `bun prototypes/wheel-selection/build.ts` from this worktree.
The generated file is checked in so reviewing it needs no dependencies.

This is the **interaction/state** branch of the prototype skill: a single demo
of the existing wheel, rather than alternate visual redesigns. The owner selected horizontal panning for half-wheel zoom and a mobile
details sheet that snaps to 0%, 40%, and 70% with internal content scrolling.
Picker concepts and remaining behaviors await owner feedback. No application implementation or
full fidelity acceptance is implied.

## What to try

- Select bodies, signs, house wedges, angles, and aspect lines.
- Select Sun to preview the approved reference depth and body facts.
- Select a body to dim unrelated aspects; select an aspect independently.
- Click the center where opposition lines cross to get a choice of nearby lines.
- Use the named target list for small, crowded, or ambiguous targets.
- Tab to a target; Enter/Space opens details; Escape/Close restores focus.
- Reselecting a target or clicking blank wheel space clears it.
- Switch initial/edited/crowded fixture scenarios to clear stale selection.
- Below 800px the sidebar becomes a nonmodal bottom overlay: snaps at 0dvh (dismissed), 40dvh,
  and 70dvh; the details content scrolls inside the sheet. The double-line
  resize handle supports dragging and arrow/Home/End keys. The wheel stays interactive behind it.
- Angles currently show reference text only, for discussion.

## Deliberate limits

All positions, aspects, houses, motion flags, and birth-input transitions are
synthetic fixtures. The scenario control simulates inputs changing; it is not
a birth editor or new chart mode. The crowded fixture deliberately stresses
hit targets and its aspect labels are not astronomical assertions.

There are no calculations, location mapping, Human Design UI, settings editor,
or storage. Horizontal pan and sheet resizing are prototype gestures; inertia
and pinch zoom are not included. Most reference entries are omitted; the demo
uses representative copy from the approved content decision plus brief angle
and aspect samples. Screen-reader semantics are present but have not been
validated with an actual screen reader. Wheel hit areas shrink with the chart;
the native named-button list supplies larger alternate targets.

## Source and context

- Decision ticket: https://github.com/AstrologyEngine/web/issues/10
- Content authority: https://github.com/AstrologyEngine/web/issues/9
- Plugin source commit: `8446c7b1388349a28daaabf27f13096b61142271`
- `source/{geometry,angles,arcPath,body-symbols,planet-glyphs,zodiac-glyphs,theme}.ts`
  are copied from `plugin/src/lib/wheel/`; geometry accumulation uses immutable
  arrays here. Wheel rings, radii, sign fills, and glyph paths follow `plugin/src/lib/Wheel.svelte`. No MCP service code is copied.

Keep this artifact on `prototype/wheel-selection`, outside main. The verdict
belongs in the decision ticket after live owner review.

## Second iteration: picker concepts

Use the floating bottom switcher or `?variant=A`, `B`, or `C`:

- **A — Folder tiles:** a named glyph tile for each body. Familiar, scannable,
  and spatial; needs more sheet space.
- **B — Guided list:** one named body per row with placement context. Explicit
  labels and large targets; longer groups need more scrolling.
- **C — Spotlight cards:** one large named choice at a time with previous/next
  controls. Low visual density; takes more navigation to compare choices.

Add `&picker=folder` to open the crowded fixture and folder directly.

The same picker presentation handles aspect drill-down:
**body → relationship type → other body → reference and facts**. From a body
entry, “Explore connections” starts at that body's relationship types. At a
crossing-line hit, the starting body list and later levels are limited to
those nearby aspects. Breadcrumbs let reviewers move back through the levels.

Bodies within 12° of one another in the same synthetic equal-house sector
share an Android-style folder target with miniature glyphs and a count.
Folder anchors use the group's average true longitude; individual glyphs no
longer spread into adjacent houses. This threshold and cross-house collision
handling remain prototype limitations, not a settled production algorithm.

Zoom doubles the wheel width inside a horizontally clipped viewport, showing
half its width and retaining its full height, matching the owner's reference.
Drag sideways or use the pan buttons. Full-wheel view remains available.
