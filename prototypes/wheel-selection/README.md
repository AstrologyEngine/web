# Wheel selection — throwaway interaction prototype

Question: how should single selection, crowded targets, overlapping aspects,
and responsive details behave when the plugin wheel becomes a beginner tool?

Open `prototype.html` directly in a browser. It is self-contained and offline.
Rebuild with `bun prototypes/wheel-selection/build.ts` from this worktree.
The generated file is checked in so reviewing it needs no dependencies.

This is the **interaction/state** branch of the prototype skill: a single demo
of the existing wheel, rather than alternate visual redesigns. All behaviors
below are proposals awaiting owner feedback. No application implementation or
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
- Below 800px the sidebar becomes a nonmodal bottom overlay: 40dvh compact,
  75dvh expanded, internal scrolling. The wheel stays interactive behind it.
- Angles currently show reference text only, for discussion.

## Deliberate limits

All positions, aspects, houses, motion flags, and birth-input transitions are
synthetic fixtures. The scenario control simulates inputs changing; it is not
a birth editor or new chart mode. The crowded fixture deliberately stresses
hit targets and its aspect labels are not astronomical assertions.

There are no calculations, location mapping, Human Design UI, settings editor,
swipe/drag gestures, or storage. Most reference entries are omitted; the demo
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
  arrays here. Wheel rings, radii, sign fills, glyph paths, and label spreading
  follow `plugin/src/lib/Wheel.svelte`. No MCP service code is copied.

Keep this artifact on `prototype/wheel-selection`, outside main. The verdict
belongs in the decision ticket after live owner review.
