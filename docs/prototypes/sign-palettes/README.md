# Sign palette comparison — throwaway prototype

Question: which colored-sign treatment belongs in the approved desktop A and responsive C Explorer layouts?

Owner choice is pending. This branch does not deliver production behavior.

## Run

`bun run dev --host 127.0.0.1 --port 5197`

Open `/app?variant=A`, `B`, or `C`. The bottom bar and left/right keys switch palettes without changing the computed chart or selection. Input fields retain their arrow keys. `review=0` hides review controls. The same computed example appears at `/?variant=A|B|C` in a cropped homepage composition. Homepage composition here is a palette context, not a new approved layout.

| Variant | Direction | Consideration |
| --- | --- | --- |
| A — Mineral spectrum | Muted continuous spectrum, individual hues for each sign | Neighboring signs are deliberately related in hue |
| B — Botanical elements | Warm fire, olive earth, ochre air, slate water; shades distinguish signs | Element relationships are stronger than a continuous spectrum |
| C — Inked enamel | Deeper spectrum and alternating black/white glyph ink | More visual weight; the ring dominates the quiet shell |

The shell follows web-legacy warm paper, dark ink and muted purple. All variants retain the same aspect inks, chart, controls and geometry. Signs are identified by glyphs and accessible names; selection and focus have outlines. Glyph ink uses relative luminance contrast, with a minimum measured ratio of 4.95 (A), 5.32 (B), and 4.61 (C), including Ophiuchus.

## References and limits

Based on updated origin/main `0e6eb14`; copied only the required responsive prototype files from approved `2989488`. Desktop A composition is carried by that checkpoint. Branch `prototype/sign-palettes`, worktree `/private/tmp/astrology-web-sign-palettes`.

The example resolves June 21, 2000 at 1pm in London through the existing atlas and calculation worker. Birth editing lets reviewers compare other charts. Calculations remain Tropical / Whole Sign; system buttons preview placement and explanation. No production calculation behavior is inferred from this prototype. Homepage sign selection is a minimal label preview; production tooltip timing is outside this palette decision.

Screenshots: `{A,B,C}-{desktop,mid,mobile}.png`, corresponding `-selected.png`, and `{A,B,C}-home-{desktop,mid,mobile}.png`. Sizes: 1440×1000, 834×1112, 393×852. The bottom comparison harness is deliberately visible; hide it to examine unobstructed chart/sheet geometry.

Checks: Svelte check (zero errors/warnings), lint, production build, official Svelte autofixer (no issues; existing architectural suggestions retained), Impeccable detector (empty findings). Chromium checked all variants and viewport classes, sign selection, crowded mobile chart, homepage rendering, no app horizontal overflow and no page errors. Physical devices, Safari, color-vision simulation, production integration and deployment remain unverified. This chooses a shipped theme; it is not a proposed user theme picker.

Ticket: https://github.com/AstrologyEngine/web-issues/issues/29
