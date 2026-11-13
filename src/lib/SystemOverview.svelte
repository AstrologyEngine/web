<script lang="ts">
  import { t } from "./copy/index.svelte";
  import type { PlainKey } from "./copy/copy";
  import { presetLabel } from "./labels";
  import { matchPreset, type Settings } from "./settings";
  // The reading rail's default content: what the accepted system is.
  let {
    settings,
    houses,
  }: {
    /** Settings of the chart on screen (the requested ones before any chart). */
    settings: Settings;
    /** House system the engine actually used. */
    houses: string;
  } = $props();
  const systemHelpKey = {
    tropical: "settings.help.tropical",
    "fagan-bradley": "settings.help.faganBradley",
    "true-sky": "settings.help.trueSkyConstellations",
  } as const satisfies Record<Settings["reference"], PlainKey>;
</script>

<section class="overview" aria-label={t("settings.help.label")}>
  <h2 tabindex="-1" data-rail-heading>
    {t(presetLabel[matchPreset(settings)])}
  </h2>
  <p>
    {t(systemHelpKey[settings.reference])}
  </p>
  <p>
    {t(
      settings.divisions === "constellation" && settings.ophiuchus
        ? "settings.help.summaryOphiuchusIncluded"
        : "settings.help.summary",
      {
        divisions: t(
          settings.divisions === "constellation"
            ? "settings.help.divisionsConstellation"
            : "settings.help.divisionsEqual",
        ),
        houses,
      },
    )}
  </p>
  <p class="hint">{t("app.rail.hint")}</p>
</section>

<style>
  h2 {
    font:
      400 38px/1.15 Georgia,
      serif;
    margin: 0 0 20px;
  }
  h2:focus {
    outline: none;
  }
  p {
    margin: 0 0 18px;
  }
  .hint {
    border-top: 1px solid var(--line);
    padding-top: 18px;
    color: var(--muted);
  }
</style>
