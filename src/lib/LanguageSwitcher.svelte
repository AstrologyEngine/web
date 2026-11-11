<script lang="ts">
  import { page } from "$app/state";
  import { t } from "./copy/index.svelte";
</script>

{#if page.data.locales.length > 1}
  <nav class="language" aria-label={t("language.switcher")}>
    {#each page.data.locales as locale (locale.code)}
      <a
        href={`?lang=${locale.code}`}
        hreflang={locale.code}
        lang={locale.code}
        aria-current={locale.code === page.data.locale ? "true" : undefined}
        data-sveltekit-reload>{locale.name}</a
      >
    {/each}
  </nav>
{/if}

<style>
  .language {
    display: inline-flex;
    gap: 0.75rem;
    margin-left: 1rem;
    font:
      0.8rem system-ui,
      sans-serif;
  }
  a {
    color: inherit;
  }
  a[aria-current="true"] {
    font-weight: 700;
    text-decoration: none;
  }
</style>
