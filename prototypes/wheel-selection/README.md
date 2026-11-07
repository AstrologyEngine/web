# Mobile crowded-chart comparison — throwaway artifact

Current decision: [Compare mobile crowded-chart navigation for the beta](https://github.com/AstrologyEngine/web/issues/17).
Owner review is pending. This section supersedes older operation notes below;
the retained notes document the inherited prototype and its historical decisions.

Run from this worktree with `bun run prototype:mobile`, then open
<http://127.0.0.1:5191/prototypes/wheel-selection/prototype.html?variant=A&chart=true-whole&scenario=overflow>.
Use `PROTOTYPE_PORT=5192 bun run prototype:mobile` if the port is occupied.
Or open `prototype.html` directly: the generated artifact is self-contained.
Rebuild using `bun prototypes/wheel-selection/build.ts`.

Four alternatives on the same artifact, selected by `?variant=A|B|C|D` or the
floating arrows (keyboard left/right also cycles outside form fields/dialogs):

| Variant | Primary path | Strength | Weakness / consideration |
| --- | --- | --- | --- |
| A: Half wheel | Horizontal pan → group → named tile | Retains vertical wheel context; enlarged targets | Tall wheel and explanation sheet compete for room; horizontal search may be needed |
| B: Quarter wheel | Two-axis pan → group → named tile | More compact crop at the same magnification | Less orientation context; vertical pan competes with page scroll |
| C: Linked list | Named row → explanation | Direct choice with readable labels; marker shows true longitude | List scrolling and name recognition replace some spatial exploration |
| D: Area picker | Numbered house → named tile → explanation | Bounded choices and explicit areas, without panning | Extra step; beginners must understand house numbers; empty areas are disabled |

Counts above describe primary paths, not measured beginner performance. Whole
wheel / optional zoom and the shared named-target fallback remain available.
Combining paths remains a possible owner choice, not a fifth preselected answer.

## Review exercise

Use a phone-width browser. Find Sun, dismiss, then find Saturn. Restart each
attempt to reset its activation counter. Compare whole wheel return, chart
visibility, orientation, scroll/pan conflict, keyboard activation and dismissal.
Repeat with `chart=true-placidus`, `chart=tropical`, and `scenario=crowded`,
`scenario=triangle` or `scenario=overflow`. Overflow puts ten bodies in the
narrowest house; these deliberately perturbed positions are not a real birth
chart. Fixture source and house geometry remain visible under the guide.

All variants retain the existing wheel geometry, fit heuristic, lower connector
paint layer, named glyph tiles, aspect path and explanation sheet. Groups now
open a native modal dialog with focus containment; details remain nonmodal and
snap to 0/40/70%. Escape/Close restores the originating group, row or area control.
The linked-list marker uses the true body longitude, not the displaced glyph.
The quarter-wheel crop changes viewport clipping, not chart coordinates or
house widths. Pan/selection state is displayed. Variant switches reset selection
and camera, keeping fixture positions; Whole wheel keeps the current selection.
No application route imports these files; the switcher is confined to this
standalone local artifact and cannot enter the application production build.

## Verification and limits — 2026-11-07

Local headless Chromium, 390×844: all four alternatives across True Sky whole
sign, True Sky Placidus and tropical equal-house fixtures retained all 15 bodies
exactly once as individual targets or group members. Keyboard activation reached
Saturn, focused its details, snapped the sheet to 70%, and Escape restored the
origin in every combination. Native modal Escape and two-axis pointer pan were
exercised; whole-wheel return and no horizontal page overflow were checked.
No page exceptions occurred in that matrix. Mobile and 1280×900 desktop
screenshots were inspected. An initial duplicate heading in a closed picker
was corrected before the final matrix.

This establishes prototype operation, not usability preference, production
collision handling, physical touch behavior, actual screen-reader acceptance or
astronomical accuracy. The inherited heuristic still groups bodies rather than
promising that zoom separates every glyph. Quarter-wheel touch-action disables
page scrolling inside its crop; this is an explicit tradeoff to review. A 70%
sheet can obscure most of the chart; compare with 40% or dismissal. Screen space
and step counts are observations to discuss, not grounds for an automatic winner.

The question remains open until the owner reacts and chooses the beta behavior.
Application implementation and deployment remain outside this planning task.

---

## Inherited prototype history (historical notes)

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

## Selected picker and unequal-sector review

The owner chose **A — Folder tiles**. The default view now hides the comparison
switcher; old `?variant=` links retain it for reference.

- Connector lines are painted before the opaque group target and converge at
  its center. True body positions remain the connector origins.
- The complete group plus badge has eight SVG units of clearance from house
  cusp rays. Its visual anchor is clamped inside its actual house.
- A narrow house uses a compact count circle instead of a miniature-glyph
  tile. It opens the same picker without shrinking its contents into illegibility.
- Picker headings use `Bodies in <sign>` when all members share a sign,
  otherwise `Grouped bodies`. A visual collision group is not automatically
  a stellium: it can contain two bodies, nodes, asteroids, or multiple signs.

The default is now `?chart=true-whole`: True Sky constellation sectors with
Ophiuchus enabled, and twelve unequal whole-sign houses. The library merges
Ophiuchus into Scorpio for whole-sign houses. `?chart=true-placidus` compares
Placidus cusp geometry. `?chart=tropical` retains the original synthetic case.

`source/true-whole.json` and `source/true-placidus.json` are selected captures
from library regression fixtures, with capture provenance embedded. They use
the same historical reference instant/location, allowing cusp geometry to be
compared directly. They are captured calculation outputs, not a live engine
integration. The 13 sign-sector boundaries come from library `conventions.rs`.

Initial scenarios retain captured bodies/cusps. Edited and crowded scenarios
explicitly perturb body positions for interaction stress; the crowded scenario
places six bodies in the narrowest house. Context, body sign/degree, occupants,
and house assignment follow the chosen sectors/cusps. Aspect candidates in
captured layouts are derived from fixture positions. This does not validate
a live chart calculator or settle production collision handling for arbitrarily
small cusps, collisions across houses, or final minimum target sizes.

## Fit-first glyph arrangement (supersedes proximity grouping)

Owner direction: arrange bodies within their actual house; only group when
individual glyphs cannot fit. There is no stellium membership/count criterion.

`source/fit-bodies.ts` is a pure, deterministic layout function. It searches
staggered positions on two radii in each house's annular sector. Each glyph
reserves a 22-unit circular footprint, five units of clearance from house
boundaries/rings, and three units between footprints. Two outer positions and
one inner position can form the requested triangle. The score favors staying
near true longitude and using the outer row. All body facts and connector
origins remain unchanged.

A bounded beam search keeps up to 160 arrangements per placement step, rather
than committing to the first free slot. If it cannot place every body in a
house, that house's bodies use one fallback group with the chosen tile picker.
This is a practical prototype heuristic, not proof that no conceivable packing
exists. It deliberately reserves target space as well as visible glyph space.

Use `?chart=true-whole&scenario=triangle` for three bodies in a house near 30°
wide, or `&scenario=overflow` for ten bodies in the narrowest house. These are
explicitly synthetic perturbations of the captured layout. The scenario
selector also retains initial, edited, and crowded cases. A pair can group if
the house is too narrow to fit both targets; this is spatial grouping only.

Browser verification across three chart layouts × four scenarios retained all
15 bodies exactly once as individuals or picker members. The three-body cases
placed Sun and Mercury on the outer row and Moon inward. Individual target
centers remained at least 47 SVG units apart; overflow houses opened the tile
picker with all ten members. Desktop/mobile screenshots were inspected and no
page exceptions were observed. Physical-device usability remains unverified.

## House zoom picker (rejected experiment)

Historical experiment, rejected by the owner in live review. The current
prototype restores the prior tile picker; the description below records the
experiment rather than the current behavior.

In that experiment, a crowded-group activation zoomed the existing chart camera into that house
instead of opening a separate body tile picker. The outer SVG element is
preserved while its `viewBox` changes; signs, cusp geometry, body coordinates,
and aspect geometry still come from the same chart. No chart is recalculated
or copied into a separate picker surface.

The fit-first layout re-runs for the focused house at the magnified scale,
using more radial rows and smaller world-space footprints. Individual glyphs
remain readable at the resulting scale. Other houses retain their overview
layout. Connector origins and chart facts are unchanged; visual labels can
move within their house to make room. All body connectors share a layer before
sign glyphs, individual body glyphs, and group markers, so no later connector
can paint over an earlier glyph.

Select an individual glyph in the magnified house to open the normal details
sheet. “Back to whole chart” restores the prior overview/half-wheel zoom and
horizontal pan. Escape closes details first, then leaves the focused house;
keyboard focus returns to the original group. Changing the fixture/layout
clears house focus.

On mobile, the focused canvas is at least 640px wide, centered on entry, with
horizontal drag/pan controls. This keeps glyphs readable rather than shrinking
them to fit the phone. The overflow example's ten bodies remain individually
visible; wider house layouts may need panning. Mobile sheet snapping is
unchanged. The aspect relationship picker remains available from body details.

Direct review: `?chart=true-whole&scenario=overflow&focus=group`.

Headless checks across tropical, True Sky whole-sign, and True Sky Placidus
confirmed the same SVG identity through focus/return, ten individual overflow
members, normal selection, restored viewBox, and no page exceptions. A mobile
keyboard exercise confirmed details/escape behavior, original group focus,
and restoration of the previous half-wheel view and its 120px pan. Paint-order
inspection confirmed the connector layer precedes all body/group/sign targets.
This is still a prototype heuristic; arbitrary house occupancies and physical
touch-device usability are not yet established.


## Current restored iteration

The owner rejected the house-zoom picker and selected the preceding iteration:
fit-first glyph packing, with option A's body tiles when a house needs a group.
The house-zoom camera and magnified packing are removed from the current demo;
the experiment remains in Git history. The independent requirement that glyphs
paint above lines is retained through the shared connector layer. Half-wheel
zoom/pan, the 0/40/70% sheet, unequal-house scenarios, and triangular packing
remain available.

## Aspect picker simplification

Owner-selected aspect path is now **body A → body B → aspect details**.
There is no relationship-type selection stage. First-body selection shows
only second bodies connected by an aspect in the current scope. Crossing-line
entry retains its nearby-aspect scope. Entry from a selected body's details
starts directly with its possible second bodies. Back returns to first-body
selection. The aspect type/reference remains in the final details panel.

Desktop crossing-line and mobile True Sky whole-sign/Placidus exercises
verified the two-body flow, back navigation, selected-body shortcut, and
resulting aspect details with no page exceptions.
