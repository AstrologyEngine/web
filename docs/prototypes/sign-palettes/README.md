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

## Second comparison: legacy theme directions

Owner feedback: retain the rainbow progression of A/C; investigate web-legacy for another set. No palette approved yet. Original A/B/C remain available.

- **D — Porcelain / warm paper:** pale rainbow, uniformly black sign glyphs; root legacy shell (`src/routes/+layout.svelte`): paper #f5f2eb, surface #faf8f3, charcoal #292d38, plum #644678. Quietest ring.
- **E — Pigment / pearl & violet:** richer mid-light rainbow, uniformly black glyphs; legacy natal course (`src/lib/courses/natal-chart/course.css`): pearl #f8f9fc, wash #edf0f9, navy #26395d, violet #65509b. More chroma in a cool shell.
- **F — Plum enamel / blue paper:** deep rainbow, uniformly white glyphs; legacy engine course (`src/lib/courses/engine/course.css`): paper #f6f9fc, wash #eaf1f7, slate #233b50, plum #75476f. Strongest ring contrast against the pale shell.

The shell previews retain the approved layout and typography hierarchy; they are color comparisons, not wholesale migrations of the course UI. The source lives at `/Users/jacksteam/Documents/AstrologyEngine/web-legacy`.

Gemini was black in C because automatic relative-luminance contrast selects black on its lighter ochre fill. D/E/F constrain the entire fill range so all signs use the same glyph ink. Minimum glyph contrast: D 10.31:1, E 6.34:1, F 5.96:1, all 13 fills included.

Review `/app?variant=D|E|F` and `/?variant=D|E|F`. The arrows now cycle all six options, preserving chart and selection. Selected-state captures use `review=0` so the prototype harness does not cover the compact sheet. Svelte check/lint pass; official autofixer reports no issues. Browser captures cover the same computed chart, selected states at desktop/mid/mobile, and homepage/app desktop/mobile. Device/Safari/color-vision simulation and production delivery remain outside the evidence recorded here.

## Front-page saturation pass

Owner found the previous palettes washed out and clarified that the front page is the priority. Added **G — Vivid spectrum** (bright, saturated rainbow with black glyphs) and **H — Jewel spectrum** (deeper saturated rainbow with white glyphs). Both use the warm legacy shell and preserve A/C's rainbow progression. Review the front page first: `/?variant=G` and `/?variant=H`. Screenshots include both routes at desktop/mobile. Chromium reported no page errors or horizontal overflow; Svelte check/lint/build and the mechanical detector pass. No owner choice recorded.

## Corrected reference: actual celestial legacy homepage

The owner clarified that “legacy front page” means the dark, starry homepage, confirmed by a screenshot of astrologyengine.dev. The local web-legacy checkout was 75 commits behind its tracked origin/main; earlier warm-paper comparisons used that stale working-tree source. The corrected reference is web-legacy `origin/main` at `e00a2f9e10aa5b4f338875bc306166bfb939903c`: `src/lib/homepage/celestial.css`, `TransitChart.svelte`, and `static/celestial/night-landscape.jpg`.

**I — Celestial vivid rainbow** and **J — Celestial jewel rainbow** pair the G/H sign fills with midnight #0c1223, ivory #f0e9dc, gold #ddbd79, and the actual legacy landscape asset. Planet/angle ink is gold, secondary ink is pale slate, and the plate is midnight. Homepage review uses a full wheel beside the source headline to assess this visual setting, rather than the warm-paper oversized-wheel context. This is a bounded color reference preview, not a replica of the complete legacy homepage or a production migration.

Review `/?variant=I` and `/?variant=J`; app counterparts remain available. Desktop/mobile captures, Svelte check/lint/build, autofixer, detector and Chromium page/overflow checks recorded. Owner choice remains pending.

## Independent website theme and quieter palettes

Owner found I/J too saturated and requested an independent website-theme dial, anticipating light/dark mode. Added **K — Mineral glow** (A's muted rainbow) and **L — Soft jewel** (medium saturation with white glyphs).

The second review dial now changes **Website: Warm light / Starry dark**, independently of the wheel-palette dial. URL state is `variant=K&theme=dark` or `theme=light`; default website theme is dark. Geometry stays fixed between modes. Palette changes preserve the website theme; website-theme changes preserve every sign fill while updating the page background, chart ink, plate, and aspect tones. Existing palette names retain comparison history; the website dial now overrides their earlier shell associations. This is a development review control, not a finalized production light/dark UX or persisted OS-preference setting.

Chromium verified independence in both directions and captured K/L in both modes at desktop/mobile. No page errors or horizontal overflow. Svelte/lint/build pass, official autofixer reports no issues, detector empty. Production integration, physical devices and final palette approval remain pending.
