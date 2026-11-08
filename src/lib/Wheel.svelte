<script lang="ts">
  import { WHEEL_THEMES, contrastInk } from "./wheel/theme";
  import { annularSector } from "./wheel/arcPath";
  import { longitudeToSvgAngle } from "./wheel/angles";
  import { wheelPoint, layoutBodyPositions } from "./wheel/geometry";
  import { bodySymbols } from "./wheel/body-symbols";
  import { zodiacGlyphPaths } from "./wheel/zodiac-glyphs";
  import { groupCrowdedBodies } from "./wheel/crowding";
  import GroupedPicker from "./GroupedPicker.svelte";
  import { tick } from "svelte";
  import type { Chart } from "./calculation/chart";
  import type { Astrology } from "./calculation/snapshot";
  const theme = WHEEL_THEMES.traditional;
  let {
    chart,
    astrology,
    selectedBody = null,
    onselect = () => {},
    onblank = () => {},
    selectedSign = null,
    selectedHouse = null,
    selectedAngle = null,
    onselectSign,
    onselectHouse,
    onselectAngle,
    onselectAspects,
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
    selectedSign?: Chart["zodiac_sectors"][number]["sign"] | null;
    selectedHouse?: number | null;
    selectedAngle?: Chart["bodies"][number]["name"] | null;
    onselectSign?: (
      sign: Chart["zodiac_sectors"][number]["sign"],
      origin: Element,
      keyboard: boolean,
    ) => void;
    onselectHouse?: (house: number, origin: Element, keyboard: boolean) => void;
    onselectAngle?: (
      angle: Chart["bodies"][number]["name"],
      origin: Element,
      keyboard: boolean,
    ) => void;
    onselectAspects?: (
      aspects: Astrology["aspects"],
      origin: Element,
      keyboard: boolean,
    ) => void;
  } = $props();
  let width = $state(0);
  let picker = $state<{
    members: Chart["bodies"][number]["name"][];
    origin: Element;
  } | null>(null);
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
  const groups = $derived(
    width > 0 && width < 800
      ? groupCrowdedBodies(
          bodies as (Chart["bodies"][number] & { labelLongitude: number })[],
          chart.cusps,
        )
      : bodies.map((body) => ({
          members: [body],
          longitude: body.labelLongitude!,
          radius: 188,
          extent: 16,
        })),
  );
  const openGroup = (
    members: Chart["bodies"][number]["name"][],
    origin: Element,
  ) => {
    picker = { members, origin };
  };
  const closeGroup = async () => {
    const origin = picker?.origin;
    picker = null;
    await tick();
    if (origin instanceof SVGElement || origin instanceof HTMLElement)
      origin.focus();
  };
  const chooseGroup = async (name: Chart["bodies"][number]["name"]) => {
    const origin = picker?.origin;
    picker = null;
    await tick();
    if (origin) selectBody(name, origin, true);
  };
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
          key: a.planetA + a.planetB + a.type,
          aspect: a,
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
  const select = (name: string, x: number, y: number) => {
    onblank();
    selected = selected?.name === name ? null : { name, x, y };
  };
  const selectBody = (
    name: Chart["bodies"][number]["name"],
    origin: Element,
    keyboard: boolean,
  ) => {
    selected = null;
    onselect(name, origin, keyboard);
  };
  $effect(() => {
    if (selectedBody) selected = null;
  });
  const clear = () => {
    selected = null;
    onblank();
  };
  const keySelect = (e: KeyboardEvent, name: string, x: number, y: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(name, x, y);
    }
  };
</script>

<svelte:window
  bind:innerWidth={width}
  onkeydown={(event) => {
    if (event.key === "Escape" && !event.defaultPrevented && selected) {
      selected = null;
    }
  }}
/>
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
    tabindex="-1"
    onclick={(e) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-glyph]")) {
        const svg = e.currentTarget;
        const matrix = svg.getScreenCTM();
        if (matrix && onselectAspects) {
          const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
            matrix.inverse(),
          );
          const distance = (line: (typeof aspects)[number]) => {
            const dx = line.b.x - line.a.x,
              dy = line.b.y - line.a.y;
            const t = Math.max(
              0,
              Math.min(
                1,
                ((p.x - line.a.x) * dx + (p.y - line.a.y) * dy) /
                  (dx * dx + dy * dy || 1),
              ),
            );
            return Math.hypot(p.x - line.a.x - t * dx, p.y - line.a.y - t * dy);
          };
          const near = aspects
            .filter((line) => distance(line) < 11)
            .map((line) => line.aspect);
          if (near.length) {
            onselectAspects(near, svg, false);
            return;
          }
        }
        clear();
      }
    }}
    onkeydown={(e) => {
      if (e.target === e.currentTarget && e.key === "Escape") clear();
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
          opacity={selectedBody &&
          line.aspect.planetA !== selectedBody &&
          line.aspect.planetB !== selectedBody
            ? line.opacity * 0.18
            : line.opacity}
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
    {#if onselectHouse}
      {#each chart.cusps as cusp, i (i)}
        {@const next = chart.cusps[(i + 1) % 12]}
        <path
          data-glyph
          role="button"
          tabindex="0"
          aria-label={`House ${i + 1}`}
          aria-pressed={selectedHouse === i + 1}
          d={annularSector(
            133,
            231,
            longitudeToSvgAngle(next, asc),
            longitudeToSvgAngle(cusp, asc),
          )}
          transform="translate(300 300)"
          fill="transparent"
          onclick={(e) => onselectHouse?.(i + 1, e.currentTarget, false)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onselectHouse?.(i + 1, e.currentTarget, true);
            }
          }}
        />
      {/each}
    {/if}
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
      {#if onselectSign}
        <path
          data-glyph
          role="button"
          tabindex="0"
          aria-label={`${title(sign.sign)} sign region`}
          aria-pressed={selectedSign === sign.sign}
          d={annularSector(
            231,
            273,
            longitudeToSvgAngle(sign.start_degrees + sign.width_degrees, asc),
            longitudeToSvgAngle(sign.start_degrees, asc),
          )}
          transform="translate(300 300)"
          fill="transparent"
          onclick={(e) => onselectSign?.(sign.sign, e.currentTarget, false)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onselectSign?.(sign.sign, e.currentTarget, true);
            }
          }}
        />
      {/if}
      <g
        data-glyph
        role="button"
        tabindex="0"
        aria-label={title(sign.sign)}
        style="--glyph-focus:{contrastInk(theme.signFills![title(sign.sign)])}"
        aria-pressed={onselectSign
          ? selectedSign === sign.sign
          : selected?.name === title(sign.sign)}
        onclick={(e) =>
          onselectSign
            ? onselectSign(sign.sign, e.currentTarget, false)
            : select(title(sign.sign), p.x, p.y)}
        onkeydown={(e) => {
          if (onselectSign && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onselectSign(sign.sign, e.currentTarget, true);
          } else if (!onselectSign) keySelect(e, title(sign.sign), p.x, p.y);
        }}
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
    {#if onselectAngle}
      {#each [{ name: "Ascendant", body: "ASCENDANT_SYMBOL" }, { name: "Midheaven", body: "MIDHEAVEN" }, { name: "Descendant", body: "DESCENDANT" }, { name: "Imum Coeli", body: "IMUM_COELI" }] as angle (angle.body)}
        {@const p = point(
          chart.bodies.find((b) => b.name === angle.body)!.longitude,
          293,
        )}
        <g
          data-glyph
          role="button"
          tabindex="0"
          aria-label={angle.name}
          aria-pressed={selectedAngle === angle.body}
          onclick={(e) =>
            onselectAngle?.(
              angle.body as Chart["bodies"][number]["name"],
              e.currentTarget,
              false,
            )}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onselectAngle?.(
                angle.body as Chart["bodies"][number]["name"],
                e.currentTarget,
                true,
              );
            }
          }}><circle cx={p.x} cy={p.y} r="15" fill="transparent" /></g
        >
      {/each}
    {/if}
    <g aria-hidden="true" pointer-events="none">
      {#each groups as group (group.members[0].name)}
        {@const p = point(group.longitude, group.radius)}
        {#each group.members as body (body.name)}
          {@const tip = point(body.longitude, 230)}
          <line
            x1={tip.x}
            y1={tip.y}
            x2={p.x}
            y2={p.y}
            stroke="var(--w-mid)"
            stroke-width=".8"
          />
          <circle cx={tip.x} cy={tip.y} r="2" fill="var(--w-strong)" />
        {/each}
      {/each}
    </g>
    {#each groups as group (group.members[0].name)}
      {@const p = point(group.longitude, group.radius)}
      {#if group.members.length > 1}
        <g
          data-glyph
          role="button"
          tabindex="0"
          aria-label={`Grouped bodies: ${group.members.map((b) => bodySymbols[b.name].name).join(", ")}`}
          aria-pressed={group.members.some((b) => b.name === selectedBody)}
          onclick={(e) =>
            openGroup(
              group.members.map((b) => b.name),
              e.currentTarget,
            )}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openGroup(
                group.members.map((b) => b.name),
                e.currentTarget,
              );
            }
          }}
        >
          <circle
            cx={p.x}
            cy={p.y}
            r={group.extent}
            fill="var(--w-plate)"
            stroke="var(--w-strong)"
          />
          <text
            x={p.x}
            y={p.y}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size={Math.min(13, group.extent)}
            fill="var(--w-strong)">{group.members.length}</text
          >
        </g>
      {:else}
        {@const body = group.members[0]}{@const name = bodySymbols[body.name].name}{@const isNode =
          body.name === "NORTH_NODE" || body.name === "SOUTH_NODE"}
        <g
          data-glyph
          role="button"
          tabindex="0"
          aria-label={name}
          aria-pressed={selectedBody === body.name}
          onclick={(e) => selectBody(body.name, e.currentTarget, false)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              selectBody(body.name, e.currentTarget, true);
            }
          }}
        >
          <circle cx={p.x} cy={p.y} r={group.extent} fill="var(--w-wash)" />
          <svg
            x={p.x - Math.min(12, group.extent)}
            y={p.y - Math.min(12, group.extent)}
            width={Math.min(24, group.extent * 2)}
            height={Math.min(24, group.extent * 2)}
            viewBox="0 0 100 100"
            aria-hidden="true"
            ><path
              d={bodySymbols[body.name].path}
              fill={isNode ? "light-dark(#000000, #ececec)" : "var(--w-strong)"}
              fill-rule="evenodd"
            /></svg
          >
        </g>
      {/if}
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
{#if picker}<GroupedPicker
    members={picker.members}
    onchoose={chooseGroup}
    onclose={closeGroup}
  />{/if}

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
  }
  .chart-root {
    width: 100%;
    height: auto;
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
