<script lang="ts">
  import { t } from "./copy/index.svelte";
</script>

<svg
  class="empty-wheel"
  viewBox="0 0 640 640"
  role="img"
  aria-label={t("app.empty.label")}
>
  {#each [295, 268, 232, 174] as r (r)}<circle cx="320" cy="320" {r} />{/each}
  {#each Array(12) as _, i (i)}<path
      d="M320 25V146"
      transform={`rotate(${i * 30} 320 320)`}
    />{/each}
  <text x="320" y="315" text-anchor="middle">{t("app.empty.title")}</text>
  <text class="caption" x="320" y="343" text-anchor="middle"
    >{t("app.empty.caption")}</text
  >
</svg>

<style>
  .empty-wheel {
    display: block;
    max-height: 100%;
    fill: none;
    stroke: #bdb3c3;
    stroke-width: 1;
  }
  text {
    fill: #6b5380;
    stroke: none;
    font:
      24px Georgia,
      serif;
  }
  .caption {
    font:
      13px system-ui,
      sans-serif;
    fill: #686273;
  }
</style>
