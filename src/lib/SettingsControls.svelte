<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import { t } from "./copy/index.svelte";
  import type { PlainKey } from "./copy/copy";
  import { housesLabel, presetLabel } from "./labels";
  import {
    chooseHouses,
    choosePreset,
    matchPreset,
    presetNames,
    type Preset,
    type Settings,
  } from "./settings";
  let {
    requested,
    accepted,
    pending,
    onapply,
    onhelp,
    measurement,
  }: {
    /** The latest settings asked for (may still be calculating). */
    requested: Settings;
    /** Settings of the chart on screen. */
    accepted: Settings;
    pending: boolean;
    onapply: (next: Settings) => void;
    /** Show the accepted system's overview (in the reading rail). */
    onhelp: () => void;
    measurement: Measurement | null;
  } = $props();
  const id = $props.id();
  const menuId = `${id}-houses`;
  const titleId = `${id}-houses-title`;
  const houses = ["whole-sign", "equal", "placidus"] as const;
  const houseHint = {
    "whole-sign": "settings.houses.wholeSignHint",
    equal: "settings.houses.equalHint",
    placidus: "settings.houses.placidusHint",
  } as const satisfies Record<Settings["houses"], PlainKey>;
  let selected = $derived(matchPreset(accepted));
  let requestedName = $derived(matchPreset(requested));
  let advancedLabel = $derived(
    t("settings.advanced.houses", { houses: t(housesLabel[accepted.houses]) }),
  );
  let trigger = $state<HTMLButtonElement>();
  let menu = $state<HTMLElement>();
  let menuOpen = $state(false);
  const help = () => {
    measurement?.use("system_help");
    measurement?.open({ kind: "system_help", system: selected });
    onhelp();
  };
  const choose = (name: Preset) => {
    measurement?.use("settings");
    measurement?.interaction("navigation");
    onapply(choosePreset(name, requested));
  };
  // The popover sits in the top layer; keep it below the button, right-aligned.
  const place = () => {
    if (!trigger || !menu) return;
    const box = trigger.getBoundingClientRect();
    menu.style.top = `${box.bottom + 8}px`;
    menu.style.right = `${Math.max(8, document.documentElement.clientWidth - box.right)}px`;
  };
  const items = () =>
    [
      ...(menu?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []),
    ] as HTMLElement[];
  const chooseHouse = (value: Settings["houses"]) => {
    measurement?.interaction("navigation");
    menu?.hidePopover();
    if (value !== requested.houses) onapply(chooseHouses(value, requested));
  };
  // Menu button pattern: arrows move focus without applying; Enter, Space or a
  // click applies (native button activation); Escape closes (native popover).
  const navigate = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Closing the menu must not also clear the chart selection.
      event.stopPropagation();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      menu?.hidePopover();
      return;
    }
    const list = items();
    const index = list.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown"
        ? (index + 1) % list.length
        : event.key === "ArrowUp"
          ? (index - 1 + list.length) % list.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? list.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    list[next]?.focus();
  };
</script>

<svelte:window
  onresize={() => menuOpen && place()}
  onscroll={() => menuOpen && place()}
/>

<div class="settings">
  <div class="presets" role="group" aria-label={t("settings.presets.label")}>
    {#each presetNames as name (name)}
      <button
        aria-pressed={selected === name}
        aria-busy={pending && requestedName === name}
        onclick={() => choose(name)}>{t(presetLabel[name])}</button
      >
    {/each}
  </div>
  <button
    class="icon"
    aria-label={t("settings.help.toggle")}
    title={t("settings.help.toggle")}
    onclick={help}>?</button
  >
  <button
    bind:this={trigger}
    class="icon more"
    aria-label={advancedLabel}
    title={advancedLabel}
    aria-haspopup="menu"
    aria-expanded={menuOpen}
    aria-controls={menuId}
    popovertarget={menuId}>•••</button
  >
</div>
<div
  bind:this={menu}
  id={menuId}
  class="house-menu"
  popover="auto"
  onbeforetoggle={(event) => {
    menuOpen = event.newState === "open";
    if (!menuOpen) return;
    place();
    measurement?.use("settings");
    measurement?.interaction("navigation");
  }}
>
  <p id={titleId} class="menu-title">{t("settings.houses.label")}</p>
  <div role="menu" aria-labelledby={titleId} tabindex="-1" onkeydown={navigate}>
    {#each houses as value (value)}
      <!-- Native popover focus must land on the selected menu item. -->
      <!-- svelte-ignore a11y_autofocus -->
      <button
        autofocus={requested.houses === value}
        role="menuitemradio"
        aria-checked={requested.houses === value}
        aria-labelledby={`${id}-${value}`}
        aria-describedby={`${id}-${value}-hint`}
        tabindex="-1"
        onclick={() => chooseHouse(value)}
        ><span id={`${id}-${value}`} class="name">{t(housesLabel[value])}</span
        ><span id={`${id}-${value}-hint`} class="hint"
          >{t(houseHint[value])}</span
        ></button
      >
    {/each}
  </div>
</div>

<style>
  .settings {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--line-strong);
    border-radius: 30px;
    padding: 3px;
  }
  .presets button,
  .icon {
    min-height: 36px;
    border: 0;
    border-radius: 24px;
    background: transparent;
    padding: 7px 16px;
    font-size: 13px;
    white-space: nowrap;
  }
  .presets button:hover,
  .icon:hover {
    background: var(--accent-wash);
  }
  .presets button[aria-pressed="true"] {
    color: var(--accent-ink);
    background: var(--accent);
  }
  .icon {
    width: 32px;
    height: 32px;
    min-height: 32px;
    padding: 0;
    border: 1px solid var(--line-strong);
  }
  .more {
    border-color: transparent;
    letter-spacing: 1px;
  }
  .more[aria-expanded="true"] {
    background: var(--accent-wash);
  }
  /* Desktop: the pill stays centred; help and advanced hang off its right edge. */
  @media (min-width: 800px) {
    .settings {
      position: relative;
    }
    .settings > .icon {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: calc(100% + 7px);
    }
    .settings > .more {
      left: calc(100% + 46px);
    }
  }
  @media (max-width: 799px) {
    .settings {
      width: 100%;
    }
    .presets {
      flex: 1;
    }
    .presets button {
      padding: 7px 6px;
    }
  }
  .house-menu {
    inset: auto;
    margin: 0;
    width: min(300px, calc(100vw - 16px));
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 12px 40px #292d3826;
  }
  .menu-title {
    margin: 4px 8px 8px;
    color: var(--muted);
    font-size: 12px;
    font-weight: 600;
  }
  [role="menu"] {
    display: grid;
    gap: 2px;
  }
  [role="menuitemradio"] {
    position: relative;
    display: grid;
    gap: 2px;
    min-height: 0;
    padding: 8px 10px 8px 30px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    text-align: left;
  }
  [role="menuitemradio"]:hover,
  [role="menuitemradio"]:focus-visible {
    background: var(--accent-wash);
  }
  [role="menuitemradio"]:focus-visible {
    outline-offset: 0;
  }
  [role="menuitemradio"][aria-checked="true"]::before {
    content: "✓";
    position: absolute;
    left: 10px;
    top: 8px;
    color: var(--accent);
  }
  .name {
    font-weight: 600;
  }
  .hint {
    color: var(--muted);
    font-size: 12px;
  }
</style>
