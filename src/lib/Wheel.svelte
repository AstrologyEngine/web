<script lang="ts">
  import { angleIds, isAngle, signIds } from "./identities";
  import { WHEEL_THEMES, contrastInk } from "./wheel/theme";
  import { annularSector } from "./wheel/arcPath";
  import { longitudeToSvgAngle } from "./wheel/angles";
  import { wheelPoint, layoutBodyPositions } from "./wheel/geometry";
  import { bodySymbols } from "./wheel/body-symbols";
  import { copy, t } from "./copy/index.svelte";
  import { zodiacGlyphPaths } from "./wheel/zodiac-glyphs";
  import { groupCrowdedBodies } from "./wheel/crowding";
  import GroupedPicker from "./GroupedPicker.svelte";
  import { tick } from "svelte";
  import type { Chart } from "./calculation/chart";
  import type { Aspect, BodyName, Glyph, Selection } from "./selection";
  import type { AspectEvent, GlyphEvent } from "./wheel/events";
  const theme = WHEEL_THEMES.traditional;
  let {
    chart,
    aspects: chartAspects,
    label,
    selected = null,
    interactive,
    crowding = true,
    onglyphclick,
    onglyphhover,
    onaspectclick,
    onblank = () => {},
    onexposeGroup = () => {},
    onopenGroup = () => {},
  }: {
    chart: Chart;
    aspects: Aspect[];
    /** Accessible name of the chart; defaults to the app's chart label. */
    label?: string;
    /** Marks the matching glyph as pressed; aspects dim lines off the body. */
    selected?: Selection | null;
    /** Which glyphs are buttons; all of them when omitted. */
    interactive?: (glyph: Glyph) => boolean;
    /** Group crowded bodies into badges on narrow windows (the app's mobile). */
    crowding?: boolean;
    onglyphclick?: (event: GlyphEvent) => void;
    /** Pointer entered a glyph, or left it (`null`). */
    onglyphhover?: (event: GlyphEvent | null) => void;
    onaspectclick?: (event: AspectEvent) => void;
    onblank?: () => void;
    onexposeGroup?: () => void;
    onopenGroup?: () => void;
  } = $props();
  let width = $state(0);
  let picker = $state<{
    members: BodyName[];
    origin: Element;
  } | null>(null);
  const selectedBody = $derived(
    selected?.kind === "body" ? selected.name : null,
  );
  const isPressed = (glyph: Glyph) =>
    !!selected &&
    selected.kind === glyph.kind &&
    JSON.stringify(selected) === JSON.stringify(glyph);
  const isOn = (glyph: Glyph) =>
    !!onglyphclick && (interactive?.(glyph) ?? true);
  /** Page coordinates of the pointer, or of the glyph's centre for keys. */
  const pagePoint = (event: MouseEvent | KeyboardEvent, origin: Element) => {
    if (event instanceof MouseEvent && event.detail !== 0)
      return { x: event.pageX, y: event.pageY };
    const box = origin.getBoundingClientRect();
    return {
      x: box.left + box.width / 2 + window.scrollX,
      y: box.top + box.height / 2 + window.scrollY,
    };
  };
  const activate = (
    glyph: Glyph,
    event: MouseEvent | KeyboardEvent,
    origin: Element,
    keyboard: boolean,
  ) =>
    onglyphclick?.({
      glyph,
      origin,
      keyboard,
      ...pagePoint(event, origin),
    });
  /** Click, Enter/Space and hover handlers for an interactive glyph. */
  const handlers = (glyph: Glyph) => ({
    onclick: (event: MouseEvent & { currentTarget: Element }) =>
      activate(glyph, event, event.currentTarget, false),
    onkeydown: (event: KeyboardEvent & { currentTarget: Element }) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(glyph, event, event.currentTarget, true);
      }
    },
    onpointerenter: (event: PointerEvent & { currentTarget: Element }) =>
      onglyphhover?.({
        glyph,
        origin: event.currentTarget,
        keyboard: false,
        x: event.pageX,
        y: event.pageY,
      }),
    onpointerleave: () => onglyphhover?.(null),
  });
  /** Button attributes for an interactive glyph; hidden from AT otherwise. */
  const button = (glyph: Glyph, name: string) =>
    isOn(glyph)
      ? {
          "data-glyph": "",
          role: "button",
          tabindex: 0,
          "aria-label": name,
          "aria-pressed": isPressed(glyph),
          ...handlers(glyph),
        }
      : { "aria-hidden": true };
  const asc = $derived(
    chart.bodies.find((b) => b.name === "ASCENDANT_SYMBOL")!.longitude,
  );
  const point = (longitude: number, radius: number) =>
    wheelPoint(longitude, radius, asc);
  const bodies = $derived(
    layoutBodyPositions(chart.bodies.filter((b) => !isAngle(b.name))),
  );
  const groups = $derived(
    crowding && width > 0 && width < 800
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
  $effect(() => {
    if (groups.some((group) => group.members.length > 1)) onexposeGroup();
  });
  const openGroup = (members: BodyName[], origin: Element) => {
    onopenGroup();
    picker = { members, origin };
  };
  const closeGroup = async () => {
    const origin = picker?.origin;
    picker = null;
    await tick();
    if (origin instanceof SVGElement || origin instanceof HTMLElement)
      origin.focus();
  };
  const chooseGroup = async (name: BodyName) => {
    const origin = picker?.origin;
    picker = null;
    await tick();
    if (!origin) return;
    const box = origin.getBoundingClientRect();
    onglyphclick?.({
      glyph: { kind: "body", name },
      origin,
      keyboard: true,
      x: box.left + box.width / 2 + window.scrollX,
      y: box.top + box.height / 2 + window.scrollY,
    });
  };
  const signs: readonly string[] = signIds.filter(
    (sign) => sign !== "ophiuchus",
  );
  const title = (s: string) => s[0].toUpperCase() + s.slice(1);
  const aspects = $derived(
    chartAspects
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
</script>

<svelte:window bind:innerWidth={width} />
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
    aria-label={label ?? t("wheel.label")}
    tabindex="-1"
    onclick={(e) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-glyph]")) {
        const svg = e.currentTarget;
        const matrix = svg.getScreenCTM();
        if (matrix && onaspectclick) {
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
            onaspectclick({
              aspects: near,
              origin: svg,
              keyboard: false,
              x: e.pageX,
              y: e.pageY,
            });
            return;
          }
        }
        onblank();
      }
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
        {@const a = point(cusp, 133)}{@const b = point(cusp, 231)}{@const next =
          chart.cusps[(i + 1) % 12]}{@const label = point(
          cusp + ((next - cusp + 360) % 360) / 2,
          118,
        )}
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
      {#each [{ key: "wheel.angle.asc", body: "ASCENDANT_SYMBOL" }, { key: "wheel.angle.mc", body: "MIDHEAVEN" }, { key: "wheel.angle.dsc", body: "DESCENDANT" }, { key: "wheel.angle.ic", body: "IMUM_COELI" }] as const as angle (angle.body)}
        {@const l = chart.bodies.find(
          (b) => b.name === angle.body,
        )!.longitude}{@const a = point(l, 232)}{@const b = point(
          l,
          280,
        )}{@const label = point(l, 293)}
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
          dominant-baseline="middle">{t(angle.key)}</text
        >
      {/each}
    </g>
    {#each chart.cusps as cusp, i (i)}
      {@const glyph = { kind: "house", number: i + 1 } as const}
      {#if isOn(glyph)}
        {@const next = chart.cusps[(i + 1) % 12]}
        <path
          data-glyph
          role="button"
          tabindex="0"
          aria-label={copy().houseName(i + 1)}
          aria-pressed={isPressed(glyph)}
          d={annularSector(
            133,
            231,
            longitudeToSvgAngle(next, asc),
            longitudeToSvgAngle(cusp, asc),
          )}
          transform="translate(300 300)"
          fill="transparent"
          {...handlers(glyph)}
        />
      {/if}
    {/each}
    {#each chart.zodiac_sectors as sign (sign.sign)}
      {@const a = point(sign.start_degrees, 231)}{@const b = point(
        sign.start_degrees,
        273,
      )}{@const p = point(sign.start_degrees + sign.width_degrees / 2, 253)}
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
      {@const glyph = { kind: "sign", name: sign.sign } as const}
      {#if isOn(glyph)}
        <path
          {...button(
            glyph,
            t("wheel.sign.region", { sign: copy().signName(sign.sign) }),
          )}
          d={annularSector(
            231,
            273,
            longitudeToSvgAngle(sign.start_degrees + sign.width_degrees, asc),
            longitudeToSvgAngle(sign.start_degrees, asc),
          )}
          transform="translate(300 300)"
          fill="transparent"
        />
      {/if}
      <g
        {...button(glyph, copy().signName(sign.sign))}
        style="--glyph-focus:{contrastInk(theme.signFills![title(sign.sign)])}"
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
    {#each angleIds as name (name)}
      {@const glyph = { kind: "angle", name } as const}
      {#if isOn(glyph)}
        {@const p = point(
          chart.bodies.find((b) => b.name === name)!.longitude,
          293,
        )}
        <g {...button(glyph, copy().pointName(name))}
          ><circle cx={p.x} cy={p.y} r="15" fill="transparent" /></g
        >
      {/if}
    {/each}
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
        {@const selectedMember = group.members.find(
          (body) => body.name === selectedBody,
        )}
        {@const selectedSize = Math.min(20, group.extent * 1.1)}
        {@const members = group.members.map((b) => b.name)}
        {@const bodies = members
          .map((name) => copy().pointName(name))
          .join(", ")}
        <g
          {...members.some((name) => isOn({ kind: "body", name }))
            ? {
                "data-glyph": "",
                role: "button",
                tabindex: 0,
                "aria-label": selectedMember
                  ? t("wheel.group.labelSelected", {
                      bodies,
                      body: copy().pointName(selectedMember.name),
                    })
                  : t("wheel.group.label", { bodies }),
                "aria-pressed": !!selectedMember,
                onclick: (e: MouseEvent & { currentTarget: Element }) =>
                  openGroup(members, e.currentTarget),
                onkeydown: (e: KeyboardEvent & { currentTarget: Element }) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openGroup(members, e.currentTarget);
                  }
                },
              }
            : { "aria-hidden": true }}
        >
          <circle
            cx={p.x}
            cy={p.y}
            r={group.extent}
            fill="var(--w-plate)"
            stroke="var(--w-strong)"
          />
          {#if selectedMember}
            <svg
              x={p.x - selectedSize * 0.6}
              y={p.y - selectedSize * 0.6}
              width={selectedSize}
              height={selectedSize}
              viewBox="0 0 100 100"
              aria-hidden="true"
            >
              <title>{copy().pointName(selectedMember.name)}</title>
              <path
                d={bodySymbols[selectedMember.name].path}
                fill="var(--w-strong)"
                fill-rule="evenodd"
              />
            </svg>
          {/if}
          <text
            x={p.x + (selectedMember ? group.extent * 0.55 : 0)}
            y={p.y + (selectedMember ? group.extent * 0.55 : 0)}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size={selectedMember
              ? Math.min(10, group.extent * 0.55)
              : Math.min(13, group.extent)}
            fill="var(--w-strong)">{group.members.length}</text
          >
        </g>
      {:else}
        {@const body = group.members[0]}{@const name = copy().pointName(
          body.name,
        )}{@const isNode =
          body.name === "NORTH_NODE" || body.name === "SOUTH_NODE"}
        <g {...button({ kind: "body", name: body.name }, name)}>
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
    /* No tap flash on phones; glyphs show their own pressed state. */
    -webkit-tap-highlight-color: transparent;
    /* Pages may set --wheel-max-width; the app keeps it within the viewport. */
    max-width: var(
      --wheel-max-width,
      min(660px, max(240px, calc(100vh - 170px)))
    );
    margin: auto;
  }
  svg {
    display: block;
  }
  .chart-root {
    width: 100%;
    height: auto;
    /* Focusable only to take Escape; its glyphs show their own focus. */
    outline: none;
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
  /* Sectors draw their own keyboard focus; browsers would otherwise outline
     them on every click. */
  path[role="button"] {
    cursor: pointer;
    outline: none;
  }
  path[role="button"]:focus-visible {
    stroke: var(--w-strong);
    stroke-width: 2.5;
  }
  /* Hover highlights a glyph with its focus ring; sectors take a light wash. */
  @media (hover: hover) {
    g[role="button"]:hover > circle:first-of-type {
      stroke: var(--glyph-focus, var(--w-strong));
      stroke-width: 2.5;
    }
    path[role="button"]:hover {
      fill: color-mix(in srgb, var(--w-strong) 7%, transparent);
    }
  }
</style>
