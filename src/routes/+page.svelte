<script lang="ts">
  import { resolve } from "$app/paths";
  import { zodiacGlyphPaths } from "../lib/wheel/zodiac-glyphs";
  import { planetGlyphPaths } from "../lib/wheel/planet-glyphs";
  import LanguageSwitcher from "../lib/LanguageSwitcher.svelte";
  import { copy, t } from "../lib/copy/index.svelte";
</script>

<svelte:head>
  <title>{t("landing.meta.title")}</title>
  <meta name="description" content={t("landing.meta.description")} />
</svelte:head>

<main>
  <header>
    <span class="brand-mark" aria-hidden="true">✳</span>
    {t("brand.name")}
    <span class="beta">{t("brand.beta")}</span>
    <LanguageSwitcher />
  </header>
  <div class="hero">
    <section class="intro">
      <p class="eyebrow">{t("landing.hero.eyebrow")}</p>
      <h1>
        {#each copy().lines("landing.hero.title") as line, i (i)}{#if i}<br
            />{/if}{line}{/each}
      </h1>
      <p class="description">{t("landing.hero.description")}</p>
      <a class="cta" href={resolve("/app")}
        >{t("landing.hero.cta")} <span aria-hidden="true">↗</span></a
      >
      <p class="note">{t("landing.hero.note")}</p>
    </section>
    <figure>
      <div class="sample-label">
        <span>{t("landing.sample.index")}</span><span
          >{t("landing.sample.label")}</span
        >
      </div>
      <svg
        viewBox="0 0 420 420"
        role="img"
        aria-label={t("landing.sample.alt")}
      >
        <path
          d="M20 400 A380 380 0 0 1 70.9 210 L122.9 240 A320 320 0 0 0 80 400Z"
          fill="#e15947"
        />
        <path
          d="M70.9 210 A380 380 0 0 1 210 70.9 L240 122.9 A320 320 0 0 0 122.9 240Z"
          fill="#d58f3b"
        />
        <path
          d="M210 70.9 A380 380 0 0 1 400 20 L400 80 A320 320 0 0 0 240 122.9Z"
          fill="#c9dd47"
        />
        <g fill="none" stroke="#d0d0d0" stroke-width="1">
          <path
            d="M20 400 A380 380 0 0 1 400 20 M80 400 A320 320 0 0 1 400 80 M215 400 A185 185 0 0 1 400 215 M250 400 A150 150 0 0 1 400 250"
          />
          <path
            d="M20 400H250 M70.9 210L122.9 240 M210 70.9L240 122.9 M400 20V250 M239.8 307.5L280 330.7 M307.5 239.8L330.7 280"
          />
        </g>
        <g fill="#1f1f1f">
          <path
            d={zodiacGlyphPaths[0]}
            transform="translate(38 298) scale(.29)"
          />
          <path
            d={zodiacGlyphPaths[1]}
            transform="translate(124 130) scale(.29)"
          />
          <path
            d={zodiacGlyphPaths[2]}
            transform="translate(297 38) scale(.29)"
          />
          <path
            d={planetGlyphPaths[0]}
            transform="translate(114 308) scale(.25)"
          />
          <path
            d={planetGlyphPaths[1]}
            transform="translate(183 210) scale(.25)"
          />
          <path
            d={planetGlyphPaths[2]}
            transform="translate(300 116) scale(.25)"
          />
        </g>
        <g
          fill="#4a4a4a"
          font-size="15"
          font-family="system-ui, sans-serif"
          text-anchor="middle"
          ><text x="236" y="373">1</text><text x="282" y="290">2</text><text
            x="373"
            y="239">3</text
          ></g
        >
        <g fill="none" stroke-width="1.3" opacity=".65"
          ><path d="M255 369L347 269" stroke="#2255cc" /><path
            d="M291 291L379 254"
            stroke="#cc2222"
          /></g
        >
      </svg>
      <figcaption>{t("landing.sample.caption")}</figcaption>
    </figure>
  </div>
  <footer>
    {t("landing.footer.brand")}
    <span>{t("landing.footer.tagline")} ✳</span>
  </footer>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #f8f6f0;
    color: #1f1f1f;
    font-family: system-ui, sans-serif;
  }
  main {
    min-height: 100svh;
    max-width: 1500px;
    margin: auto;
    padding: 2rem clamp(1.4rem, 6vw, 6rem) 1.5rem;
    display: flex;
    flex-direction: column;
  }
  header {
    font-family: Georgia, serif;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .brand-mark {
    color: #b6503d;
    font-size: 1.7rem;
  }
  .beta,
  .eyebrow,
  .sample-label,
  footer {
    font:
      600 0.65rem/1.4 system-ui,
      sans-serif;
    letter-spacing: 0.15em;
  }
  .beta {
    border: 1px solid #c8c3b8;
    border-radius: 20px;
    padding: 0.25rem 0.5rem;
    margin-left: 0.3rem;
  }
  .hero {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 4rem;
    padding: 4rem 0;
  }
  .intro {
    max-width: 570px;
  }
  .eyebrow {
    color: #a04938;
    margin: 0 0 1.6rem;
  }
  h1 {
    font:
      400 clamp(3.6rem, 6.8vw, 6.8rem)/0.98 Georgia,
      serif;
    letter-spacing: -0.055em;
    margin: 0;
  }
  .description {
    max-width: 440px;
    color: #555850;
    font-size: 1.08rem;
    line-height: 1.7;
    margin: 2rem 0;
  }
  .cta {
    display: inline-flex;
    gap: 3rem;
    align-items: center;
    background: #252e2a;
    color: white;
    text-decoration: none;
    padding: 1rem 1.3rem;
    border-radius: 3px;
    font-size: 0.9rem;
    font-weight: 600;
  }
  .cta:hover {
    background: #46594d;
  }
  .cta:focus-visible {
    outline: 3px solid #a04938;
    outline-offset: 4px;
  }
  .note,
  figcaption {
    color: #6d716a;
    font-size: 0.8rem;
    line-height: 1.5;
  }
  .note {
    margin-top: 1rem;
  }
  figure {
    margin: 0;
    padding: 1.4rem;
    background: #fff;
    border: 1px solid #e2dfd7;
  }
  .sample-label {
    color: #696d65;
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }
  svg {
    display: block;
    width: min(100%, 490px);
    margin: 1.5rem auto 0;
  }
  figcaption {
    border-top: 1px solid #e5e3dd;
    margin-top: 1rem;
    padding-top: 1rem;
  }
  footer {
    display: flex;
    justify-content: space-between;
    color: #777b73;
    border-top: 1px solid #dedbd2;
    padding-top: 1.3rem;
  }
  @media (max-width: 720px) {
    main {
      padding-top: 1.25rem;
    }
    .hero {
      grid-template-columns: 1fr;
      gap: 2.8rem;
      padding: 4rem 0 3rem;
    }
    h1 {
      font-size: clamp(3.3rem, 13vw, 5rem);
    }
    .description {
      margin: 1.5rem 0;
    }
    figure {
      padding: 1rem;
    }
  }
</style>
