<script lang="ts">
  import type { Chart } from "./calculation/chart";
  import type { Selection } from "./selection";
  import { houseFor, signAt } from "./selection";
  import {
    signs,
    houses,
    angles,
    aspectContent,
    rulers,
  } from "./exploration-content";
  import { bodySymbols } from "./wheel/body-symbols";
  let {
    selection,
    chart,
    heading = $bindable(),
    snap = $bindable(40),
    onclose,
  }: {
    selection: Exclude<Selection, { kind: "body" }>;
    chart: Chart;
    heading?: HTMLHeadingElement;
    snap: 40 | 70;
    onclose: () => void;
  } = $props();
  const title = (value: string) => value[0]!.toUpperCase() + value.slice(1);
  let name = $derived(
    selection.kind === "sign"
      ? title(selection.name)
      : selection.kind === "house"
        ? `House ${selection.number}`
        : selection.kind === "angle"
          ? (bodySymbols[selection.name]?.name ?? selection.name)
          : `${bodySymbols[selection.first]?.name ?? selection.first} ${selection.aspectType} ${bodySymbols[selection.second]?.name ?? selection.second}`,
  );
  let content = $derived(
    selection.kind === "sign"
      ? signs[selection.name]
      : selection.kind === "house"
        ? houses[selection.number - 1]!
        : selection.kind === "angle"
          ? angles[selection.name]!
          : aspectContent[selection.aspectType],
  );
  let cuspSign = $derived(
    selection.kind === "house"
      ? signAt(chart.cusps[selection.number - 1]!, chart)
      : undefined,
  );
  let ruler = $derived(cuspSign ? rulers[cuspSign] : undefined);
  let occupants = $derived(
    selection.kind === "house"
      ? chart.bodies.filter(
          (b) =>
            ![
              "ASCENDANT_SYMBOL",
              "MIDHEAVEN",
              "DESCENDANT",
              "IMUM_COELI",
            ].includes(b.name) &&
            houseFor(b.longitude, chart) === selection.number,
        )
      : [],
  );
  let startY = 0;
  const touchStart = (e: TouchEvent) => {
    startY = e.touches[0]?.clientY ?? 0;
  };
  const touchEnd = (e: TouchEvent) => {
    const delta = (e.changedTouches[0]?.clientY ?? startY) - startY;
    if (delta < -30) snap = 70;
    else if (delta > 30) {
      if (snap === 70) snap = 40;
      else onclose();
    }
  };
</script>

<aside
  aria-label={`${title(selection.kind)} details`}
  style:--sheet-height={`${snap}dvh`}
>
  <div class="handle">
    <button
      ontouchstart={touchStart}
      ontouchend={touchEnd}
      aria-label="Resize details"
      aria-valuemin="0"
      aria-valuemax="70"
      aria-valuenow={snap}
      role="slider"
      onkeydown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          snap = 70;
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          if (snap === 70) snap = 40;
          else onclose();
        }
      }}
      onclick={() => (snap = snap === 40 ? 70 : 40)}
      ><span></span><span></span></button
    >
  </div>
  <div class="scroll">
    <button class="close" onclick={onclose} aria-label="Close details">×</button
    >
    <h2 bind:this={heading} tabindex="-1">{name}</h2>
    <p>{content.insight}</p>
    <p class="keywords">{content.keywords.join(" · ")}</p>
    {#if selection.kind === "house"}
      <dl>
        <div>
          <dt>Sign at cusp</dt>
          <dd>{cuspSign ? title(cuspSign) : "Unavailable"}</dd>
        </div>
        {#if ruler && ruler[0] !== ruler[1]}
          <div>
            <dt>Traditional ruler</dt>
            <dd>{ruler[0]}</dd>
          </div>
          <div>
            <dt>Modern ruler</dt>
            <dd>{ruler[1]}</dd>
          </div>
        {:else}<div>
            <dt>Ruler</dt>
            <dd>{ruler ? ruler[0] : "No established ruler"}</dd>
          </div>{/if}
        <div>
          <dt>Occupants</dt>
          <dd>
            {occupants.length
              ? occupants
                  .map((b) => bodySymbols[b.name]?.name ?? b.name)
                  .join(", ")
              : "No bodies in this house"}
          </dd>
        </div>
      </dl>
    {/if}
    <p class="context">
      {chart.configuration.reference === "tropical"
        ? "Tropical"
        : chart.configuration.reference === "fagan-bradley"
          ? "Vedic"
          : "True Sky"} · {chart.house_system} houses{chart.requested_house_system !== chart.house_system
        ? ` (requested ${chart.requested_house_system})`
        : ""}
    </p>
  </div>
</aside>

<style>
  aside {
    border: 1px solid #d8cfc1;
    background: #fffdf8;
    border-radius: 1rem;
    color: #28231f;
  }
  .scroll {
    padding: 1.5rem;
    overflow-y: auto;
    min-height: 0;
  }
  h2 {
    font:
      400 2rem Georgia,
      serif;
    margin: 0 0 1rem;
  }
  h2:focus {
    outline: none;
  }
  .close {
    float: right;
    border: 0;
    background: transparent;
    font-size: 1.8rem;
    cursor: pointer;
  }
  .keywords,
  .context {
    color: #765b50;
    font-size: 0.9rem;
  }
  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  dt {
    font-size: 0.8rem;
    color: #765b50;
  }
  dd {
    margin: 0.25rem 0 0;
    text-transform: capitalize;
  }
  .handle {
    display: none;
  }
  @media (max-width: 799px) {
    aside {
      position: fixed;
      z-index: 10;
      bottom: 0;
      left: 0;
      right: 0;
      height: var(--sheet-height);
      display: flex;
      flex-direction: column;
      border-radius: 1rem 1rem 0 0;
      box-shadow: 0 -4px 24px #0002;
    }
    .handle {
      display: flex;
      justify-content: center;
      touch-action: none;
    }
    .handle button {
      border: 0;
      background: transparent;
      padding: 9px 35px;
      cursor: pointer;
    }
    .handle span {
      display: block;
      width: 40px;
      height: 3px;
      border-radius: 3px;
      background: #9c8c7c;
      margin: 3px;
    }
  }
</style>
