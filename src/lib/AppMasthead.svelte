<script lang="ts">
  import { resolve } from "$app/paths";
  import type { z } from "zod";
  import type { birthSchema } from "./domain";
  import { birthDateLabel, birthTimeLabel } from "./birth-display";
  import LanguageSwitcher from "./LanguageSwitcher.svelte";
  import { t } from "./copy/index.svelte";
  type Birth = z.infer<typeof birthSchema>;
  let { birth, onedit }: { birth: Birth | null; onedit: () => void } = $props();
  let button = $state<HTMLButtonElement>();
  let dateTime = $derived(
    birth
      ? t("app.birth.dateTime", {
          date: birthDateLabel(birth.localDate),
          time: birthTimeLabel(birth.localTime),
        })
      : t("app.birth.empty"),
  );
  export const focusBirth = () => button?.focus();
</script>

<header class="masthead">
  <a href={resolve("/")} class="brand"
    ><svg viewBox="0 0 32 32" aria-hidden="true"
      ><circle cx="16" cy="16" r="12" /><circle cx="16" cy="16" r="6" /><path
        d="M16 1v8m0 14v8M1 16h8m14 0h8"
      /></svg
    ><span>{t("brand.name")}</span></a
  >
  <button
    bind:this={button}
    class="birth-line"
    aria-label={t("app.entry.edit")}
    title={t("app.entry.edit")}
    aria-describedby="birth-line-summary"
    onclick={onedit}
  >
    <span class="summary" aria-hidden="true"
      ><span>{dateTime}</span>{#if birth}<span class="place"
          >{birth.place.label}</span
        >{/if}</span
    >
    <!-- The description is independent of the visual layout's spacing. -->
    <span id="birth-line-summary" hidden
      >{birth ? `${dateTime}, ${birth.place.label}` : dateTime}</span
    >
    <svg viewBox="0 0 24 24" aria-hidden="true"
      ><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z" /></svg
    >
  </button>
  <div class="language"><LanguageSwitcher /></div>
</header>

<style>
  .masthead {
    position: sticky;
    top: 0;
    z-index: 2;
    height: 80px;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    align-items: center;
    gap: 16px;
    padding: 0 32px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    width: fit-content;
    color: inherit;
    text-decoration: none;
    font-weight: 650;
    white-space: nowrap;
  }
  .brand svg {
    width: 30px;
    height: 30px;
    flex: none;
    fill: none;
    stroke: var(--glyph);
    stroke-width: 1.4;
  }
  .birth-line {
    justify-self: center;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    max-width: 100%;
    min-height: 44px;
    padding: 8px 12px;
    border: 0;
    background: transparent;
    font-size: 13px;
  }
  .birth-line:hover {
    background: transparent;
    color: var(--accent);
  }
  .birth-line:hover .summary > span:first-child {
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px 12px;
    min-width: 0;
  }
  .place {
    color: var(--muted);
  }
  .birth-line svg {
    width: 15px;
    height: 15px;
    flex: none;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .language {
    justify-self: end;
  }
  @media (max-width: 1050px) {
    .masthead {
      grid-template-columns: auto minmax(0, 1fr) auto;
      padding: 0 20px;
    }
    .brand span {
      font-size: 13px;
    }
  }
  @media (max-width: 799px) {
    .masthead {
      height: auto;
      min-height: 64px;
      gap: 8px;
      padding: 8px 12px;
    }
    .brand span {
      display: none;
    }
    .birth-line {
      justify-self: stretch;
      padding: 6px 4px;
    }
    /* One line each for date/time and place, truncated with an ellipsis. */
    .summary {
      display: grid;
      justify-content: start;
      gap: 0;
      text-align: left;
    }
    .summary > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
