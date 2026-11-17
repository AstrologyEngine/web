<script lang="ts">
  import { onMount } from "svelte";
  import { resolve } from "$app/paths";
  import LanguageSwitcher from "../lib/LanguageSwitcher.svelte";
  import Wheel from "../lib/Wheel.svelte";
  import sample from "../lib/home/chart.json";
  import { inVisibleQuarter } from "../lib/home/visible";
  import type { Chart } from "../lib/calculation/chart";
  import type { Aspect, Selection } from "../lib/selection";
  import { copy, t } from "../lib/copy/index.svelte";
  const chart = sample.chart as Chart;
  const aspects = sample.aspects as Aspect[];
  const visible = inVisibleQuarter(chart);
  // Glyphs become buttons once they can respond, not in server-rendered HTML.
  let hydrated = $state(false);
  onMount(() => (hydrated = true));

  /** The open info card: what was chosen and where, in page coordinates. */
  let info = $state<{ selection: Selection; x: number; y: number } | null>(
    null,
  );
  let pageWidth = $state(0),
    pageHeight = $state(0),
    cardWidth = $state(0),
    cardHeight = $state(0);
  let chartElement = $state<HTMLElement>();
  let openedWidth = 0;
  const GAP = 28,
    MARGIN = 12;
  const describe = (selection: Selection) => {
    const c = copy();
    switch (selection.kind) {
      case "body":
        return [c.pointName(selection.name), c.body(selection.name)?.insight];
      case "angle":
        return [c.pointName(selection.name), c.angle(selection.name)?.insight];
      case "sign":
        return [c.signName(selection.name), c.sign(selection.name)?.insight];
      case "house":
        return [
          c.houseName(selection.number),
          c.house(selection.number)?.insight,
        ];
      case "aspect":
        return [
          c.aspectName(selection.aspectType),
          c.aspect(selection.aspectType)?.insight,
        ];
    }
  };
  const content = $derived(info && describe(info.selection));
  /** Beside the chosen point, flipped to stay inside the page. */
  const position = $derived.by(() => {
    if (!info) return null;
    let left = info.x + GAP,
      top = info.y + GAP;
    if (left + cardWidth > pageWidth - MARGIN) left = info.x - GAP - cardWidth;
    if (top + cardHeight > pageHeight - MARGIN) top = info.y - GAP - cardHeight;
    return { left: Math.max(MARGIN, left), top: Math.max(MARGIN, top) };
  });
  /** Opens the card, or closes it when the same item is chosen again. */
  const show = (selection: Selection, x: number, y: number) => {
    openedWidth = window.innerWidth;
    info =
      JSON.stringify(info?.selection) === JSON.stringify(selection)
        ? null
        : { selection, x, y };
  };
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape" && info) info = null;
  }}
  onclick={(event) => {
    // Clicks on the chart open, switch or close the card themselves.
    if (event.target instanceof Node && !chartElement?.contains(event.target))
      info = null;
  }}
  onresize={() => {
    // Width changes move the wheel; mobile toolbars only change the height.
    if (info && window.innerWidth !== openedWidth) info = null;
  }}
/>

<svelte:head>
  <title>{t("landing.meta.title")}</title>
  <meta name="description" content={t("landing.meta.description")} />
</svelte:head>

<div class="page" bind:clientWidth={pageWidth} bind:clientHeight={pageHeight}>
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
      <div class="hero-chart">
        <div class="frame" bind:this={chartElement}>
          <Wheel
            {chart}
            {aspects}
            label={t("landing.sample.label")}
            selected={info?.selection ?? null}
            interactive={(glyph) => hydrated && visible(glyph)}
            crowding={false}
            onglyphclick={({ glyph, x, y }) => show(glyph, x, y)}
            onaspectclick={({ aspects: [aspect], x, y }) =>
              show(
                {
                  kind: "aspect",
                  first: aspect.planetA,
                  second: aspect.planetB,
                  aspectType: aspect.type,
                },
                x,
                y,
              )}
            onblank={() => (info = null)}
          />
        </div>
      </div>
    </div>
    <footer>
      {t("landing.footer.brand")}
      <span>{t("landing.footer.tagline")} ✳</span>
    </footer>
  </main>
  <div class="card-layer" aria-live="polite">
    {#if info && content && position}
      <div
        class="info-card"
        bind:offsetWidth={cardWidth}
        bind:offsetHeight={cardHeight}
        style:left="{position.left}px"
        style:top="{position.top}px"
      >
        <strong>{content[0]}</strong>
        {#if content[1]}<p>{content[1]}</p>{/if}
      </div>
    {/if}
  </div>
</div>

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
  /* The page clips the oversized wheel at the viewport edges. */
  .page {
    position: relative;
    overflow: clip;
    /* Zodiac ring radius; the wheel's outer ring is 273 of its 640 units. */
    --r: min(50vw, 80svh);
    --size: calc(var(--r) * 640 / 273);
  }
  main {
    min-height: 100svh;
    max-width: 1500px;
    margin: auto;
    padding: 2rem clamp(1.4rem, 6vw, 6rem) 1.5rem;
    display: flex;
    flex-direction: column;
  }
  /* Text sits above the wheel; the wheel takes clicks everywhere else. */
  header,
  .intro,
  footer {
    position: relative;
    z-index: 1;
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
    display: flex;
    align-items: center;
    padding: 4rem 0;
  }
  .intro {
    max-width: min(570px, 40vw);
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
  .note {
    color: #6d716a;
    font-size: 0.8rem;
    line-height: 1.5;
    margin-top: 1rem;
  }
  /* Wheel centre 5% in from the top-right corner: the bottom-left quarter
     shows, and the rings start curving back before they leave the page. */
  .hero-chart {
    position: absolute;
    inset: 0;
  }
  .frame {
    position: absolute;
    width: var(--size);
    left: calc(95% - var(--size) / 2);
    top: calc(5svh - var(--size) / 2);
    --wheel-max-width: none;
  }
  .info-card {
    position: absolute;
    z-index: 2;
    width: max-content;
    max-width: min(300px, calc(100vw - 24px));
    padding: 0.9rem 1.1rem 1rem;
    background: #fffdf8;
    border: 1px solid #e2dfd7;
    border-radius: 4px;
    box-shadow: 0 12px 36px rgb(37 46 42 / 0.14);
    pointer-events: none;
  }
  .info-card strong {
    display: block;
    font:
      400 1.35rem/1.2 Georgia,
      serif;
    letter-spacing: -0.01em;
  }
  .info-card p {
    margin: 0.4rem 0 0;
    color: #555850;
    font-size: 0.88rem;
    line-height: 1.55;
  }
  footer {
    display: flex;
    justify-content: space-between;
    color: #777b73;
    border-top: 1px solid #dedbd2;
    padding-top: 1.3rem;
  }
  @media (max-width: 720px) {
    .page {
      --r: 84vw;
    }
    main {
      padding-top: 1.25rem;
    }
    .hero {
      display: block;
      padding: 4rem 0 0;
    }
    .intro {
      max-width: none;
    }
    h1 {
      font-size: clamp(3.3rem, 13vw, 5rem);
    }
    .description {
      margin: 1.5rem 0;
    }
    /* Below the text: the bottom-left quarter in full, the top-left quarter
       faded behind the text and out through the top of the page. */
    .hero-chart {
      position: relative;
      height: calc(var(--r) + 3.5rem);
      margin-inline: calc(-1 * clamp(1.4rem, 6vw, 6rem));
    }
    .frame {
      left: calc(95% - var(--size) / 2);
      top: calc(2.5rem - var(--size) / 2);
      mask-image: linear-gradient(
        to bottom,
        rgb(0 0 0 / 0.14) calc(50% - 3rem),
        rgb(0 0 0 / 1) 50%
      );
    }
  }
</style>
