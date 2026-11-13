<script lang="ts">
  import type { Snippet } from "svelte";
  // Variant A composition below the masthead: the chart stage (controls, wheel,
  // status) beside a sticky reading rail, with secondary content below the fold.
  let {
    controls,
    wheel,
    status,
    rail,
    below,
    railElement = $bindable(),
  }: {
    controls?: Snippet;
    wheel: Snippet;
    status?: Snippet;
    rail: Snippet;
    below?: Snippet;
    railElement?: HTMLElement;
  } = $props();
</script>

<div class="chart-layout">
  <div class="chart-stage">
    {#if controls}<div class="chart-controls">{@render controls()}</div>{/if}
    <div class="wheel-space">{@render wheel()}</div>
    {#if status}<div class="stage-status">{@render status()}</div>{/if}
  </div>
  <div class="reading-rail" bind:this={railElement}>{@render rail()}</div>
  <div class="below-fold">{@render below?.()}</div>
</div>

<style>
  .chart-layout {
    --masthead: 80px;
    --rail: 340px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) var(--rail);
    grid-template-rows: calc(100dvh - var(--masthead)) auto;
  }
  .chart-stage {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .chart-controls {
    display: flex;
    justify-content: center;
    padding: 16px 24px 0;
  }
  .wheel-space {
    container-type: size;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 24px 18px;
  }
  /* The wheel fills the largest square the stage allows. */
  .wheel-space :global(.wheel),
  .wheel-space :global(.empty-wheel) {
    width: min(100cqw, 100cqh);
    max-width: none;
    margin: 0;
  }
  .stage-status {
    flex: none;
    padding: 0 24px;
    text-align: center;
  }
  /* Space only while there is a status to show, so the wheel does not shift. */
  .stage-status:has(:global(p, button)) {
    padding-bottom: 16px;
  }
  .reading-rail {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: start;
    position: sticky;
    top: var(--masthead);
    height: calc(100dvh - var(--masthead));
    overflow-y: auto;
    border-left: 1px solid var(--line);
    padding: 38px 30px;
    background: var(--surface);
  }
  .below-fold {
    grid-column: 1;
    grid-row: 2;
    min-width: 0;
    padding: 35px 5vw 100px;
    border-top: 1px solid var(--line);
  }
  @media (max-width: 1050px) {
    .chart-layout {
      --rail: 320px;
    }
    .reading-rail {
      padding: 24px;
    }
  }
  /* Basic single column; mobile requirements are a separate ticket. */
  @media (max-width: 799px) {
    .chart-layout {
      display: block;
    }
    .wheel-space {
      container-type: normal;
      display: block;
      padding: 10px 12px;
    }
    .wheel-space :global(.wheel),
    .wheel-space :global(.empty-wheel) {
      width: 100%;
    }
    .reading-rail {
      position: static;
      height: auto;
      overflow: visible;
      border-left: 0;
      border-top: 1px solid var(--line);
      padding: 24px 16px;
    }
    .below-fold {
      padding: 24px 16px 64px;
    }
  }
</style>
