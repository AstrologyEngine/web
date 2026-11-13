<script lang="ts">
  import { onMount } from "svelte";
  import type { Chart } from "./calculation/chart";
  import { bodySymbols } from "./wheel/body-symbols";
  import { copy, t } from "./copy/index.svelte";
  type BodyName = Chart["bodies"][number]["name"];
  let {
    members,
    onchoose,
    onclose,
  }: {
    members: BodyName[];
    onchoose: (name: BodyName) => void;
    onclose: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  onMount(() => {
    dialog.showModal();
  });
</script>

<dialog
  bind:this={dialog}
  aria-label={t("wheel.groupPicker.title")}
  oncancel={(event) => {
    event.preventDefault();
    event.stopPropagation();
    onclose();
  }}
  onkeydown={(event) => {
    if (event.key === "Escape") event.stopPropagation();
  }}
>
  <div class="header">
    <h2>{t("wheel.groupPicker.title")}</h2>
    <button aria-label={t("wheel.groupPicker.close")} onclick={onclose}
      >×</button
    >
  </div>
  <div class="tiles">
    {#each members as name (name)}
      <button onclick={() => onchoose(name)}
        ><svg viewBox="0 0 100 100" aria-hidden="true"
          ><path
            d={bodySymbols[name].path}
            fill="currentColor"
            fill-rule="evenodd"
          /></svg
        ><span>{copy().pointName(name)}</span></button
      >
    {/each}
  </div>
</dialog>

<style>
  dialog {
    width: min(90vw, 440px);
    max-height: 80dvh;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    padding: 20px;
  }
  dialog::backdrop {
    background: #292d3859;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h2 {
    font:
      400 1.6rem Georgia,
      serif;
  }
  .header button {
    border: 0;
    background: transparent;
    font-size: 1.8rem;
  }
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }
  .tiles button {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    min-height: 56px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--field);
    padding: 0.6rem;
  }
  svg {
    width: 24px;
    height: 24px;
    flex: none;
  }
</style>
