<script lang="ts">
  import { tick } from "svelte";
  import type { Snapshot } from "./calculation/snapshot";
  import type { Chart } from "./calculation/chart";
  import Wheel from "./Wheel.svelte";
  import Details from "./Details.svelte";
  import { bodySymbols } from "./wheel/body-symbols";
  type BodyName = Chart["bodies"][number]["name"];
  type Selection = { kind: "body"; name: BodyName };
  let { snapshot }: { snapshot: Snapshot } = $props();
  let selection = $state<Selection | null>(null);
  let origin: Element | null = null;
  let heading = $state<HTMLHeadingElement>();
  let snap = $state<40 | 70>(40);
  let announcement = $state("");
  let astrology = $derived(snapshot.systems.astrology!);
  let body = $derived(
    astrology.selectedFrame.bodies.find((b) => b.name === selection?.name),
  );
  function dismiss(restore = false) {
    selection = null;
    announcement = "Selection cleared";
    if (
      (restore && origin instanceof HTMLElement) ||
      (restore && origin instanceof SVGElement)
    )
      origin?.focus();
  }
  async function select(name: BodyName, target: Element, keyboard: boolean) {
    if (selection?.name === name) {
      dismiss(keyboard);
      return;
    }
    origin = target;
    selection = { kind: "body", name };
    announcement = `${bodySymbols[name]?.name ?? name} selected`;
    snap = 40;
    if (keyboard) {
      await tick();
      heading?.focus();
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape" && !event.defaultPrevented && selection) {
      event.preventDefault();
      dismiss(true);
    }
  }}
/>
<div class={["explorer", { "with-details": !!body }]}>
  <Wheel
    chart={astrology.selectedFrame}
    {astrology}
    selectedBody={body?.name ?? null}
    onselect={select}
    onblank={() => dismiss()}
  />
  <details class="body-list">
    <summary>Choose a body by name</summary>
    <div>
      {#each astrology.selectedFrame.bodies.filter((item) => !["ASCENDANT_SYMBOL", "MIDHEAVEN", "DESCENDANT", "IMUM_COELI"].includes(item.name)) as item (item.name)}
        <button
          aria-pressed={body?.name === item.name}
          onclick={(event) =>
            select(item.name, event.currentTarget, event.detail === 0)}
          >{bodySymbols[item.name].name}</button
        >
      {/each}
    </div>
  </details>
  {#if body}
    <Details
      {body}
      chart={astrology.selectedFrame}
      bind:heading
      bind:snap
      onclose={() => dismiss(true)}
    />
  {/if}
  <span class="sr-only" aria-live="polite">{announcement}</span>
</div>

<style>
  .explorer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem 2rem;
    align-items: start;
  }
  .with-details {
    grid-template-columns: minmax(0, 1fr) minmax(250px, 340px);
  }
  .body-list {
    grid-column: 1;
  }
  .body-list div {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .body-list button {
    border: 1px solid #a89583;
    border-radius: 1rem;
    background: #fffdf8;
    padding: 0.35rem 0.7rem;
  }
  .body-list button[aria-pressed="true"] {
    background: #523f37;
    color: white;
  }
  .with-details :global(aside) {
    grid-column: 2;
    grid-row: 1 / span 2;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (max-width: 799px) {
    .explorer {
      display: block;
      padding-bottom: 2rem;
    }
  }
</style>
