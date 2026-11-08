<script lang="ts">
  import { isAngle } from "./identities";
  import DetailsShell from "./DetailsShell.svelte";
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
            !isAngle(b.name) &&
            houseFor(b.longitude, chart) === selection.number,
        )
      : [],
  );
</script>

<DetailsShell
  label={`${title(selection.kind)} details`}
  {name}
  bind:heading
  bind:snap
  {onclose}
>
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
</DetailsShell>
