<script lang="ts">
  import { systemHelp } from "./exploration-content";
  import { settingsSchema } from "./domain";
  import {
    choosePreset,
    customFields,
    matchPreset,
    type Custom,
    type Preset,
    type Settings,
  } from "./settings";
  let {
    requested,
    accepted,
    custom,
    pending,
    onapply,
    actualHouses,
  }: {
    requested: Settings;
    accepted: Settings;
    custom: Custom;
    pending: boolean;
    onapply: (next: Settings, custom: Custom) => void;
    actualHouses: string;
  } = $props();
  let draft = $state<Settings | null>(null);
  let dialogOpen = $state(false);
  let helpOpen = $state(false);
  let selected = $derived(matchPreset(accepted));
  let requestedName = $derived(matchPreset(requested));
  const names: Preset[] = ["Tropical", "Vedic", "True Sky", "Custom"];
  const choose = (name: Preset) =>
    onapply(choosePreset(name, requested, custom), custom);
  const open = () => {
    draft = structuredClone($state.snapshot(requested));
    dialogOpen = true;
  };
  const apply = () => {
    if (!draft) return;
    const parsed = settingsSchema.safeParse($state.snapshot(draft));
    if (!parsed.success) return;
    const next = parsed.data;
    const changed =
      JSON.stringify(customFields(next)) !==
      JSON.stringify(customFields(requested));
    onapply(next, changed ? customFields(next) : custom);
    draft = null;
    dialogOpen = false;
  };
  const setup = (node: HTMLDialogElement) => {
    const opener = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (opener instanceof HTMLElement) opener.focus();
    };
  };
</script>

<div class="settings">
  <div class="presets" role="group" aria-label="Zodiac presets">
    {#each names as name (name)}
      <button
        aria-pressed={selected === name}
        aria-busy={pending && requestedName === name}
        onclick={() => choose(name)}>{name}</button
      >
    {/each}
  </div>
  <button
    aria-expanded={helpOpen}
    aria-controls="system-help"
    onclick={() => (helpOpen = !helpOpen)}>About this system</button
  >
  {#if helpOpen}<div id="system-help" role="region" aria-label="System help">
      <p>
        {accepted.reference === "true-sky" && accepted.divisions === "equal"
          ? "This custom setting uses the True Sky reference with equal sign divisions."
          : systemHelp[accepted.reference]}
      </p>
      <p>
        Signs: {accepted.divisions}{accepted.divisions ===
        "constellation"
          ? accepted.ophiuchus
            ? " · Ophiuchus included"
            : " · Ophiuchus excluded"
          : ""}. Actual houses: {actualHouses}.
      </p>
    </div>{/if}
  <button class="advanced" onclick={open}
    >Advanced settings: {selected} · {accepted.houses === "whole-sign"
      ? "Whole Sign"
      : accepted.houses === "placidus"
        ? "Placidus"
        : "Equal"} houses</button
  >
</div>
{#if dialogOpen && draft}
  <dialog
    aria-label="Advanced settings"
    {@attach setup}
    onkeydown={(event) => {
      if (event.key === "Escape") event.stopPropagation();
    }}
    oncancel={(event) => {
      event.preventDefault();
      apply();
    }}
    onclick={(event) => {
      if (event.target === event.currentTarget) {
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          apply();
      }
    }}
  >
    <div class="dialog-header">
      <h2>Advanced settings</h2>
      <button aria-label="Close Advanced settings" onclick={apply}>✕</button>
    </div>
    <p>Changes apply when you press Apply or close this panel.</p>
    <label> Zodiac reference
      <select
        bind:value={draft.reference}
        onchange={() => {
          if (draft && draft.reference !== "true-sky") {
            draft.divisions = "equal";
            draft.ophiuchus = false;
          }
        }}
      >
        <option value="tropical">Tropical</option><option value="fagan-bradley"
          >Fagan–Bradley (Vedic)</option
        ><option value="true-sky">True Sky</option>
      </select>
    </label>
    <label
      >Sign divisions
      <select
        bind:value={draft.divisions}
        disabled={draft.reference !== "true-sky"}
        onchange={() => {
          if (draft && draft.divisions === "equal") draft.ophiuchus = false;
        }}
      ><option value="equal">Equal</option><option value="constellation">Constellation</option></select>
    </label>
    <label
      >House system <select bind:value={draft.houses}><option value="whole-sign">Whole Sign</option><option value="equal">Equal</option><option value="placidus">Placidus</option></select></label
    >
    <label class="check"
      ><input
        type="checkbox"
        bind:checked={draft.ophiuchus}
        disabled={draft.reference !== "true-sky" ||
          draft.divisions !== "constellation"}
      /> Include Ophiuchus</label
    >
    <label
      >Atmakaraka method <select bind:value={draft.atmakaraka}><option value="progressInSign">Progress in Sign</option><option value="closestToMC">Closest to MC</option></select></label
    >
    <footer><button class="primary" onclick={apply}>Apply</button></footer>
  </dialog>
{/if}

<style>
  .settings {
    margin: 2rem 0 1rem;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .presets button[aria-pressed="true"] {
    color: white;
    background: #252e2a;
  }
  .advanced {
    margin-top: 0.75rem;
  }
  dialog {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100dvh - 40px);
    overflow: auto;
    border: 0;
    border-radius: 16px;
    padding: 24px;
    box-sizing: border-box;
    color: #1f2937;
    box-shadow: 0 18px 80px #0f172a30;
  }
  dialog::backdrop {
    background: #0f172a65;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  h2 {
    margin: 0;
    font-size: 1.4rem;
  }
  label:not(.check) {
    display: block;
    font-weight: 600;
    margin: 1rem 0;
  }
  select {
    display: block;
    width: 100%;
    margin-top: 0.4rem;
    padding: 0.6rem;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
</style>
