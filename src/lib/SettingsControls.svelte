<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import { t } from "./copy/index.svelte";
  import { housesLabel, presetLabel } from "./labels";
  import type { PlainKey } from "./copy/copy";
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
    measurement,
  }: {
    requested: Settings;
    accepted: Settings;
    custom: Custom;
    pending: boolean;
    onapply: (next: Settings, custom: Custom) => void;
    actualHouses: string;
    measurement: Measurement | null;
  } = $props();
  let draft = $state<Settings | null>(null);
  let dialogOpen = $state(false);
  let helpOpen = $state(false);
  let selected = $derived(matchPreset(accepted));
  let requestedName = $derived(matchPreset(requested));
  const names: Preset[] = ["Tropical", "Vedic", "True Sky", "Custom"];
  const systemHelpKey = {
    tropical: "settings.help.tropical",
    "fagan-bradley": "settings.help.faganBradley",
    "true-sky": "settings.help.trueSky",
  } as const satisfies Record<Settings["reference"], PlainKey>;
  const choose = (name: Preset) => {
    measurement?.use("settings");
    measurement?.interaction("navigation");
    onapply(choosePreset(name, requested, custom), custom);
  };
  const open = () => {
    measurement?.use("settings");
    measurement?.interaction("navigation");
    draft = structuredClone($state.snapshot(requested));
    dialogOpen = true;
  };
  const apply = () => {
    if (!draft) return;
    const parsed = settingsSchema.safeParse($state.snapshot(draft));
    if (!parsed.success) return;
    measurement?.interaction("navigation");
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
  <div class="presets" role="group" aria-label={t("settings.presets.label")}>
    {#each names as name (name)}
      <button
        aria-pressed={selected === name}
        aria-busy={pending && requestedName === name}
        onclick={() => choose(name)}>{t(presetLabel[name])}</button
      >
    {/each}
  </div>
  <button
    aria-expanded={helpOpen}
    aria-controls="system-help"
    onclick={() => {
      helpOpen = !helpOpen;
      if (helpOpen) {
        measurement?.use("system_help");
        measurement?.open({ kind: "system_help", system: selected });
      }
    }}>{t("settings.help.toggle")}</button
  >
  {#if helpOpen}<div
      id="system-help"
      role="region"
      aria-label={t("settings.help.label")}
    >
      <p>
        {accepted.reference === "true-sky" && accepted.divisions === "equal"
          ? t("settings.help.trueSkyEqual")
          : t(systemHelpKey[accepted.reference])}
      </p>
      <p>
        {t(
          accepted.divisions !== "constellation"
            ? "settings.help.summary"
            : accepted.ophiuchus
              ? "settings.help.summaryOphiuchusIncluded"
              : "settings.help.summaryOphiuchusExcluded",
          {
            divisions: t(
              accepted.divisions === "constellation"
                ? "settings.help.divisionsConstellation"
                : "settings.help.divisionsEqual",
            ),
            houses: actualHouses,
          },
        )}
      </p>
    </div>{/if}
  <button class="advanced" onclick={open}
    >{t("settings.advanced.open", {
      preset: t(presetLabel[selected]),
      houses: t(housesLabel[accepted.houses]),
    })}</button
  >
</div>
{#if dialogOpen && draft}
  <dialog
    aria-label={t("settings.advanced.title")}
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
      <h2>{t("settings.advanced.title")}</h2>
      <button aria-label={t("settings.advanced.close")} onclick={apply}
        >✕</button
      >
    </div>
    <p>{t("settings.advanced.intro")}</p>
    <label>
      {t("settings.reference.label")}
      <select
        bind:value={draft.reference}
        onchange={() => {
          if (draft && draft.reference !== "true-sky") {
            draft.divisions = "equal";
            draft.ophiuchus = false;
          }
        }}
      >
        <option value="tropical">{t("settings.reference.tropical")}</option
        ><option value="fagan-bradley"
          >{t("settings.reference.faganBradley")}</option
        ><option value="true-sky">{t("settings.reference.trueSky")}</option>
      </select>
    </label>
    <label
      >{t("settings.divisions.label")}
      <select
        bind:value={draft.divisions}
        disabled={draft.reference !== "true-sky"}
        onchange={() => {
          if (draft && draft.divisions === "equal") draft.ophiuchus = false;
        }}
        ><option value="equal">{t("settings.divisions.equal")}</option><option
          value="constellation">{t("settings.divisions.constellation")}</option
        ></select
      >
    </label>
    <label
      >{t("settings.houses.label")}
      <select bind:value={draft.houses}
        ><option value="whole-sign">{t("settings.houses.wholeSign")}</option
        ><option value="equal">{t("settings.houses.equal")}</option><option
          value="placidus">{t("settings.houses.placidus")}</option
        ></select
      ></label
    >
    <label class="check"
      ><input
        type="checkbox"
        bind:checked={draft.ophiuchus}
        disabled={draft.reference !== "true-sky" ||
          draft.divisions !== "constellation"}
      />
      {t("settings.ophiuchus.label")}</label
    >
    <label
      >{t("settings.atmakaraka.label")}
      <select bind:value={draft.atmakaraka}
        ><option value="progressInSign"
          >{t("settings.atmakaraka.progressInSign")}</option
        ><option value="closestToMC"
          >{t("settings.atmakaraka.closestToMc")}</option
        ></select
      ></label
    >
    <footer>
      <button class="primary" onclick={apply}
        >{t("settings.advanced.apply")}</button
      >
    </footer>
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
