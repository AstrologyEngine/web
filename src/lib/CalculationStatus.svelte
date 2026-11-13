<script lang="ts">
  import type { Snapshot } from "./calculation/snapshot";
  import { matchPreset, type Settings } from "./settings";
  import { presetLabel } from "./labels";
  import {
    calculationMessages,
    calculationRetryable,
    type CalculationCode,
  } from "./messages";
  import { t } from "./copy/index.svelte";
  let {
    snapshot,
    settings,
    loading,
    error,
    onretry,
  }: {
    snapshot: Snapshot | null;
    settings: Settings;
    loading: boolean;
    error: CalculationCode | null;
    onretry: () => void;
  } = $props();
</script>

<div class="chart-status">
  {#if snapshot && JSON.stringify(snapshot.requestedSettings) !== JSON.stringify(settings)}<p
      role="status"
    >
      {loading
        ? t("app.status.updating", {
            shown: t(presetLabel[matchPreset(snapshot.requestedSettings)]),
            requested: t(presetLabel[matchPreset(settings)]),
          })
        : t("app.status.notApplied", {
            shown: t(presetLabel[matchPreset(snapshot.requestedSettings)]),
          })}
    </p>{/if}
  {#if loading}<p role="status">{t("app.status.calculating")}</p>{/if}
  {#if error}
    <p class="error">
      <span role="alert">{t(calculationMessages[error])}</span>
      {#if calculationRetryable(error)}<button
          class="link"
          aria-label={t("app.error.retry")}
          onclick={onretry}>{t("app.error.retryLink")}</button
        >{/if}
    </p>
  {/if}
  {#if snapshot?.systems.astrology && snapshot.systems.astrology.selectedFrame.requested_house_system !== snapshot.systems.astrology.selectedFrame.house_system}<p
    >
      {t("app.status.housesAdjusted", {
        houseSystem: snapshot.systems.astrology.selectedFrame.house_system,
      })}
    </p>{/if}
</div>

<style>
  .chart-status {
    font-size: 13px;
    color: var(--muted);
  }
  p {
    margin: 6px 0;
  }
  .error {
    color: var(--danger-ink);
  }
  /* Retry reads as an inline text link; it is a button for its behavior. */
  .link {
    display: inline;
    min-height: 0;
    margin-left: 4px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    font: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .link:hover {
    background: none;
    color: var(--accent-hover);
  }
</style>
