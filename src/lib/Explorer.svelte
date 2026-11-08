<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import type { Snapshot } from "./calculation/snapshot";
  import ExplorerChart from "./ExplorerChart.svelte";
  let {
    snapshot,
    birthIdentity,
    measurement,
  }: {
    snapshot: Snapshot;
    birthIdentity?: string;
    measurement: Measurement | null;
  } = $props();
  let birthKey = $derived(birthIdentity ?? JSON.stringify(snapshot.birth));
</script>

{#key birthKey}
  <ExplorerChart {snapshot} {measurement} />
{/key}
