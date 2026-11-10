<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import { untrack, type Snippet } from "svelte";
  let {
    children,
    measurement,
    initialZoomed = false,
    iconToggle = false,
    gestures = false,
  }: {
    children: Snippet;
    measurement: Measurement | null;
    initialZoomed?: boolean;
    iconToggle?: boolean;
    gestures?: boolean;
  } = $props();
  let zoomed = $state(untrack(() => initialZoomed));
  let scale = $state(untrack(() => (initialZoomed ? 2 : 1)));
  let viewport = $state<HTMLDivElement>();
  let pointers: Record<number, { x: number; y: number }> = {};
  let pinch: { distance: number; scale: number; x: number; y: number } | null =
    null;
  let gestureMoved = false;
  const distance = (points: { x: number; y: number }[]) =>
    Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y);
  const beginGesture = (event: PointerEvent) => {
    if (!viewport) return;
    pointers = {
      ...pointers,
      [event.pointerId]: { x: event.clientX, y: event.clientY },
    };
    if (Object.keys(pointers).length === 1) {
      gestureMoved = false;
      suppressClick = false;
    }
    const points = Object.values(pointers);
    if (points.length === 2) {
      const box = viewport.getBoundingClientRect();
      pinch = {
        distance: distance(points),
        scale,
        x: (points[0]!.x + points[1]!.x) / 2 - box.left + viewport.scrollLeft,
        y: (points[0]!.y + points[1]!.y) / 2 - box.top + viewport.scrollTop,
      };
      gestureMoved = true;
      for (const id of Object.keys(pointers))
        viewport.setPointerCapture(Number(id));
    }
  };
  const moveGesture = (event: PointerEvent) => {
    const previous = pointers[event.pointerId];
    if (!previous || !viewport) return;
    pointers = {
      ...pointers,
      [event.pointerId]: { x: event.clientX, y: event.clientY },
    };
    const points = Object.values(pointers);
    if (points.length === 2 && pinch) {
      const next = Math.max(
        1,
        Math.min(
          2.5,
          (pinch.scale * distance(points)) / Math.max(1, pinch.distance),
        ),
      );
      const box = viewport.getBoundingClientRect();
      const x = (points[0]!.x + points[1]!.x) / 2 - box.left;
      const y = (points[0]!.y + points[1]!.y) / 2 - box.top;
      const anchor = pinch;
      scale = next;
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollLeft = (anchor.x * next) / anchor.scale - x;
          viewport.scrollTop = (anchor.y * next) / anchor.scale - y;
        }
      });
    } else if (points.length === 1) {
      const dx = previous.x - event.clientX,
        dy = previous.y - event.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        gestureMoved = true;
        viewport.setPointerCapture(event.pointerId);
      }
      viewport.scrollLeft += dx;
      viewport.scrollTop += dy;
    }
  };
  const endGesture = (event: PointerEvent) => {
    const { [event.pointerId]: removed, ...remaining } = pointers;
    void removed;
    pointers = remaining;
    if (Object.keys(remaining).length < 2) pinch = null;
    if (gestureMoved) suppressClick = true;
  };

  let savedPosition = 0;
  let drag: {
    id: number;
    x: number;
    y: number;
    scroll: number;
    moved: boolean;
  } | null = null;
  let suppressClick = false;
  function toggle() {
    if (zoomed && viewport) savedPosition = viewport.scrollLeft;
    zoomed = !zoomed;
    measurement?.use("half_wheel");
    measurement?.interaction("zoom");
    if (zoomed)
      requestAnimationFrame(() => {
        if (viewport) viewport.scrollLeft = savedPosition;
      });
  }
  function down(event: PointerEvent) {
    if (gestures) {
      beginGesture(event);
      return;
    }
    if (zoomed && event.isPrimary)
      drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        scroll: viewport?.scrollLeft ?? 0,
        moved: false,
      };
  }
  function move(event: PointerEvent) {
    if (gestures) {
      moveGesture(event);
      return;
    }
    if (!drag || drag.id !== event.pointerId || !viewport) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - drag.y)) {
      if (!drag.moved) measurement?.interaction("pan");
      drag.moved = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.scrollLeft = drag.scroll - dx;
    }
  }
  function up() {
    if (drag?.moved) suppressClick = true;
    drag = null;
  }
</script>

<div class={["mobile-wheel", { "icon-navigation": iconToggle }]}>
  {#if !gestures}<div class="controls">
      <button
        class={{ "zoom-icon": iconToggle }}
        onclick={toggle}
        aria-pressed={zoomed}
        aria-label={zoomed ? "Show whole wheel" : "Zoom half wheel"}
        title={zoomed ? "Show whole wheel" : "Zoom half wheel"}
      >
        {#if iconToggle}
          <svg viewBox="0 0 24 24" aria-hidden="true"
            ><circle cx="10" cy="10" r="6.5" /><path
              d="m15 15 5 5M7 10h6"
            />{#if !zoomed}<path d="M10 7v6" />{/if}</svg
          >
        {:else}{zoomed ? "Show whole wheel" : "Zoom half wheel"}{/if}
      </button>
      {#if zoomed && !iconToggle}
        <button
          aria-label="Pan wheel left"
          onclick={() => {
            measurement?.interaction("pan");
            viewport?.scrollBy({ left: -140 });
          }}>←</button
        >
        <button
          aria-label="Pan wheel right"
          onclick={() => {
            measurement?.interaction("pan");
            viewport?.scrollBy({ left: 140 });
          }}>→</button
        >
        <small>Drag sideways to pan</small>
      {/if}
    </div>{/if}
  <!-- Scrollable chart region supports keyboard pan/zoom without changing glyph semantics. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={viewport}
    class={["viewport", { zoomed, gestures }]}
    style:--zoom-scale={scale}
    role="region"
    aria-label="Chart viewport"
    tabindex={gestures ? 0 : -1}
    onkeydown={(event) => {
      if (!gestures || event.target !== event.currentTarget || !viewport)
        return;
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        viewport.scrollBy({
          left:
            event.key === "ArrowLeft"
              ? -80
              : event.key === "ArrowRight"
                ? 80
                : 0,
          top:
            event.key === "ArrowUp" ? -80 : event.key === "ArrowDown" ? 80 : 0,
        });
      } else if (["+", "=", "-"].includes(event.key)) {
        event.preventDefault();
        scale = Math.max(
          1,
          Math.min(2.5, scale + (event.key === "-" ? -0.25 : 0.25)),
        );
      }
    }}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={(event) => (gestures ? endGesture(event) : up())}
    onpointercancel={(event) => {
      if (gestures) endGesture(event);
      else drag = null;
    }}
    onclickcapture={(event) => {
      if (suppressClick) {
        event.stopPropagation();
        suppressClick = false;
      }
    }}
  >
    <div class="drawing">{@render children()}</div>
  </div>
</div>

<style>
  .mobile-wheel {
    min-width: 0;
  }
  .controls {
    display: none;
  }
  .controls .zoom-icon {
    border: 0;
    background: transparent;
    width: 44px;
    height: 44px;
    padding: 10px;
    cursor: pointer;
  }
  .zoom-icon svg {
    display: block;
    width: 24px;
    height: 24px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  @media (max-width: 799px) {
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .controls button {
      min-height: 44px;
    }
    .icon-navigation {
      position: relative;
    }
    .icon-navigation .controls {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      margin: 0;
    }

    .viewport {
      overflow-x: auto;
      max-width: 100%;
      touch-action: pan-y;
    }
    .viewport.gestures {
      height: calc(100dvh - 156px);
      overflow: auto;
      touch-action: none;
      overscroll-behavior: contain;
      scrollbar-width: none;
    }
    .gestures .drawing {
      width: calc(100% * var(--zoom-scale));
      margin-top: calc(-16px * var(--zoom-scale));
    }
    .zoomed:not(.gestures) .drawing {
      width: 200%;
    }
    .zoomed :global(.wheel) {
      max-width: none;
    }
  }
</style>
