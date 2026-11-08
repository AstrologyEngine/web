<script lang="ts">
  import type { Snapshot } from "./calculation/snapshot";
  import ExplorerChart from "./ExplorerChart.svelte";
  let {
    snapshot,
    birthIdentity,
  }: { snapshot: Snapshot; birthIdentity?: string } = $props();
  let birthKey = $derived(birthIdentity ?? JSON.stringify(snapshot.birth));
</script>

{#key birthKey}
  <ExplorerChart {snapshot} />
{/key}
