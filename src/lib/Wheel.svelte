<script lang="ts">
  import { WHEEL_THEMES, contrastInk } from "./wheel/theme";
  import { annularSector } from "./wheel/arcPath";
  import { longitudeToSvgAngle } from "./wheel/angles";
  import { wheelPoint, layoutBodyPositions } from "./wheel/geometry";
  import { bodySymbols } from "./wheel/body-symbols";
  import { zodiacGlyphPaths } from "./wheel/zodiac-glyphs";
  import type { Chart } from "./calculation/chart";
  import type { Astrology } from "./calculation/snapshot";
  const theme = WHEEL_THEMES.traditional;
  let {
    chart,
    astrology,
    selectedBody = null,
    onselect = () => {},
    onblank = () => {},
  }: {
    chart: Chart;
    astrology: Astrology;
    selectedBody?: Chart["bodies"][number]["name"] | null;
    onselect?: (
      name: Chart["bodies"][number]["name"],
      origin: Element,
      keyboard: boolean,
    ) => void;
    onblank?: () => void;
  } = $props();
  let selected = $state<{ name: string; x: number; y: number } | null>(null);
  const asc = $derived(
    chart.bodies.find((b) => b.name === "ASCENDANT_SYMBOL")!.longitude,
  );
  const point = (longitude: number, radius: number) =>
    wheelPoint(longitude, radius, asc);
  const bodies = $derived(
    layoutBodyPositions(
      chart.bodies.filter(
        (b) =>
          ![
            "ASCENDANT_SYMBOL",
            "MIDHEAVEN",
            "DESCENDANT",
            "IMUM_COELI",
          ].includes(b.name),
      ),
    ),
  );
  const signs = [
    "aries",
    "taurus",
    "gemini",
    "cancer",
    "leo",
    "virgo",
    "libra",
    "scorpio",
    "sagittarius",
    "capricorn",
    "aquarius",
    "pisces",
  ];
  const title = (s: string) => s[0].toUpperCase() + s.slice(1);
  const aspects = $derived(
    astrology.aspects
      .filter((a) =>
        ["Sextile", "Square", "Trine", "Opposition"].includes(a.type),
      )
      .map((a) => {
        const first = bodies.find((b) => b.name === a.planetA),
          second = bodies.find((b) => b.name === a.planetB);
        if (!first || !second) return null;
        return {
          key: a.planetA + a.planetB,
          a: point(first.longitude, 104),
          b: point(second.longitude, 104),
          tone: ["Square", "Opposition"].includes(a.type) ? "hard" : "soft",
          width:
            0.7 +
            1.3 *
              Math.max(
                0,
                1 -
                  a.orb /
                    (a.type === "Sextile"
                      ? 4
                      : a.type === "Opposition"
                        ? 8
                        : 6),
              ),
          opacity:
            0.2 +
            0.6 *
              Math.max(
                0,
                1 -
                  a.orb /
                    (a.type === "Sextile"
                      ? 4
                      : a.type === "Opposition"
                        ? 8
                        : 6),
              ),
        };
      })
      .filter((a) => a !== null),
  );
  const select = (name: string, x: number, y: number) =>
    (selected = { name, x, y });
  const keySelect = (e: KeyboardEvent, name: string, x: number, y: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(name, x, y);
    }
  };
</script>

<div
  class="wheel"
  style="--w-strong:{theme.ink.strong};--w-mid:{theme.ink.mid};--w-faint:{theme
    .ink.faint};--w-hard:{theme.aspect.hard};--w-soft:{theme.aspect
    .soft};--w-plate:{theme.plate}"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <svg
    class="chart-root"
    viewBox="-20 -20 640 640"
    role="group"
    aria-label="Interactive natal chart"
    onclick={(e) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-glyph]"))
        onblank();
    }}
    onkeydown={(e) => {
      if (e.target === e.currentTarget && e.key === "Escape") onblank();
    }}
  >
    <g aria-hidden="true">
      <circle
        cx="300"
        cy="300"
        r="273"
        fill="var(--w-plate)"
        stroke="var(--w-faint)"
      />
      <circle
        cx="300"
        cy="300"
        r="231"
        fill="var(--w-wash)"
        stroke="var(--w-faint)"
      />
      <circle
        cx="300"
        cy="300"
        r="133"
        fill="var(--w-wash)"
        stroke="var(--w-faint)"
      />
      <circle
        cx="300"
        cy="300"
        r="108"
        fill="var(--w-plate)"
        stroke="var(--w-faint)"
      />
      {#each chart.cusps as cusp, i (i)}
        {@const a = point(cusp, 133)}{@const b = point(cusp, 231)}{@const next = chart.cusps[(i + 1) % 12]}{@const label = point(cusp + ((next - cusp + 360) % 360) / 2, 118)}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--w-faint)" />
        <text
          x={label.x}
          y={label.y}
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="13"
          fill="var(--w-mid)">{i + 1}</text
        >
      {/each}
      {#each aspects as line (line.key)}<line
          x1={line.a.x}
          y1={line.a.y}
          x2={line.b.x}
          y2={line.b.y}
          stroke={line.tone === "hard" ? "var(--w-hard)" : "var(--w-soft)"}
          stroke-width={line.width}
          opacity={line.opacity}
        />{/each}
      {#each [{ name: "ASC", body: "ASCENDANT_SYMBOL" }, { name: "MC", body: "MIDHEAVEN" }, { name: "DSC", body: "DESCENDANT" }, { name: "IC", body: "IMUM_COELI" }] as angle (angle.name)}
        {@const l = chart.bodies.find((b) => b.name === angle.body)!.longitude}{@const a = point(l, 232)}{@const b = point(l, 280)}{@const label = point(l, 293)}
        <line
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke="var(--w-strong)"
          stroke-width="1.5"
        />
        <text
          x={label.x}
          y={label.y}
          font-size="11"
          fill="var(--w-strong)"
          text-anchor="middle"
          dominant-baseline="middle">{angle.name}</text
        >
      {/each}
    </g>
    {#each chart.zodiac_sectors as sign (sign.sign)}
      {@const a = point(sign.start_degrees, 231)}{@const b = point(sign.start_degrees, 273)}{@const p = point(sign.start_degrees + sign.width_degrees / 2, 253)}
      <path
        aria-hidden="true"
        d={annularSector(
          231,
          273,
          longitudeToSvgAngle(sign.start_degrees + sign.width_degrees, asc),
          longitudeToSvgAngle(sign.start_degrees, asc),
        )}
        transform="translate(300 300)"
        fill={theme.signFills![title(sign.sign)]}
      />
      <line
        aria-hidden="true"
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="var(--w-faint)"
      />
      <g
        data-glyph
        role="button"
        tabindex="0"
        aria-label={title(sign.sign)}
        style="--glyph-focus:{contrastInk(theme.signFills![title(sign.sign)])}"
        aria-pressed={selected?.name === title(sign.sign)}
        onclick={() => select(title(sign.sign), p.x, p.y)}
        onkeydown={(e) => keySelect(e, title(sign.sign), p.x, p.y)}
      >
        <circle cx={p.x} cy={p.y} r="22" fill="transparent" />
        <svg
          x={p.x - 12}
          y={p.y - 12}
          width="24"
          height="24"
          viewBox="0 0 100 100"
          aria-hidden="true"
        >
          {#if sign.sign === "ophiuchus"}<path
              d="M25 18V57C25 86 75 86 75 57V18M12 42C36 68 64 16 88 42"
              fill="none"
              stroke={contrastInk(theme.signFills![title(sign.sign)])}
              stroke-width="8"
            />{:else}<path
              d={zodiacGlyphPaths[signs.indexOf(sign.sign)]}
              fill={contrastInk(theme.signFills![title(sign.sign)])}
              fill-rule="evenodd"
            />{/if}
        </svg>
      </g>
    {/each}
    {#each bodies as body (body.name)}
      {@const tip = point(body.longitude, 230)}{@const p = point(body.labelLongitude!, 188)}{@const name = bodySymbols[body.name].name}{@const isNode = body.name === "NORTH_NODE" || body.name === "SOUTH_NODE"}
      <line
        aria-hidden="true"
        x1={tip.x}
        y1={tip.y}
        x2={p.x}
        y2={p.y}
        stroke="var(--w-mid)"
        stroke-width=".8"
      />
      <circle
        aria-hidden="true"
        cx={tip.x}
        cy={tip.y}
        r="2"
        fill="var(--w-strong)"
      />
      <g
        data-glyph
        role="button"
        tabindex="0"
        aria-label={name}
        aria-pressed={selectedBody === body.name}
        onclick={(e) => onselect(body.name, e.currentTarget, false)}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onselect(body.name, e.currentTarget, true);
          }
        }}
      >
        <circle cx={p.x} cy={p.y} r="22" fill="transparent" /><circle cx={p.x} cy={p.y} r="16" fill="var(--w-wash)" />
        <svg
          x={p.x - 12}
          y={p.y - 12}
          width="24"
          height="24"
          viewBox="0 0 100 100"
          aria-hidden="true"
          ><path
            d={bodySymbols[body.name].path}
            fill={isNode ? "light-dark(#000000, #ececec)" : "var(--w-strong)"}
            fill-rule="evenodd"
          /></svg
        >
      </g>
    {/each}
  </svg>
  {#if selected}<div
      role="status"
      class="glyph-name"
      style:left="{Math.min(
        82,
        Math.max(18, ((selected.x + 20) / 640) * 100),
      )}%"
      style:top="{Math.min(92, ((selected.y + 20) / 640) * 100 + 6)}%"
    >
      {selected.name}
    </div>{/if}
</div>

<style>
  .wheel {
    font-family: "Times New Roman", serif;
    --w-wash: color-mix(in srgb, var(--w-strong) 4%, var(--w-plate));
    position: relative;
    width: 100%;
    max-width: min(660px, max(240px, calc(100vh - 170px)));
    margin: auto;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  svg svg {
    width: 24px;
    height: 24px;
  }
  g[role="button"] {
    cursor: pointer;
    outline: none;
  }
  g[role="button"]:focus-visible > circle:first-of-type,
  g[aria-pressed="true"] > circle:first-of-type {
    stroke: var(--glyph-focus, var(--w-strong));
    stroke-width: 2.5;
  }
  .glyph-name {
    position: absolute;
    transform: translateX(-50%);
    background: var(--w-plate);
    color: var(--w-strong);
    border: 1px solid var(--w-mid);
    padding: 8px 13px;
    border-radius: 6px;
    font-size: 14px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 1;
  }
</style>
