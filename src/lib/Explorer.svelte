<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Measurement } from "./measurement/client";
  import type { Snapshot } from "./calculation/snapshot";
  import ChartLayout from "./ChartLayout.svelte";
  import EmptyWheel from "./EmptyWheel.svelte";
  import ExplorerChart from "./ExplorerChart.svelte";
  let {
    snapshot,
    birthIdentity,
    measurement,
    controls,
    status,
    overview,
  }: {
    /** The chart on screen; null shows the empty wheel. */
    snapshot: Snapshot | null;
    birthIdentity?: string;
    measurement: Measurement | null;
    controls?: Snippet<[() => void]>;
    status?: Snippet;
    overview?: Snippet;
  } = $props();
  let birthKey = $derived(
    birthIdentity ?? (snapshot ? JSON.stringify(snapshot.birth) : ""),
  );
</script>

{#snippet emptyControls()}{@render controls?.(() => {})}{/snippet}
{#snippet emptyWheel()}<EmptyWheel />{/snippet}
{#snippet emptyRail()}{@render overview?.()}{/snippet}

{#if snapshot?.systems.astrology}
  {#key birthKey}
    <ExplorerChart {snapshot} {measurement} {controls} {status} {overview} />
  {/key}
{:else}
  <ChartLayout
    controls={controls ? emptyControls : undefined}
    wheel={emptyWheel}
    {status}
    rail={emptyRail}
  />
{/if}
