<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import type { Snippet } from "svelte";
  let {
    children,
    measurement,
  }: { children: Snippet; measurement: Measurement | null } = $props();
  let zoomed = $state(false);
  let viewport = $state<HTMLDivElement>();
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

<div class="mobile-wheel">
  <div class="controls">
    <button onclick={toggle} aria-pressed={zoomed}
      >{zoomed ? "Show whole wheel" : "Zoom half wheel"}</button
    >
    {#if zoomed}
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
  </div>
  <div
    bind:this={viewport}
    class={["viewport", { zoomed }]}
    role="region"
    aria-label="Chart viewport"
    tabindex="-1"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={() => (drag = null)}
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
    .viewport {
      overflow-x: auto;
      max-width: 100%;
      touch-action: pan-y;
    }
    .zoomed .drawing {
      width: 200%;
    }
    .zoomed :global(.wheel) {
      max-width: none;
    }
  }
</style>
