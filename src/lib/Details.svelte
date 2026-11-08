<script lang="ts">
  import DetailsShell from "./DetailsShell.svelte";
  import type { Chart } from "./calculation/chart";
  import { bodySymbols } from "./wheel/body-symbols";
  import { bodyReference, bridgingReference } from "./reference-content";
  type Body = Chart["bodies"][number];
  let {
    body,
    chart,
    heading = $bindable(),
    snap = $bindable(40),
    onclose,
  }: {
    body: Body;
    chart: Chart;
    heading?: HTMLHeadingElement;
    snap: 40 | 70;
    onclose: () => void;
  } = $props();
  let name = $derived(bodySymbols[body.name]?.name ?? body.name);
  let content = $derived(bodyReference(body.name));
  let progress = $derived(body.sign.degrees_in_sign);
  let bridge = $derived(
    chart.configuration.divisions === "equal" &&
      ["tropical", "fagan-bradley"].includes(chart.configuration.reference) &&
      progress >= 29 &&
      progress < 30,
  );
  let house = $derived.by(() => {
    const relative = (body.longitude - chart.cusps[0]! + 360) % 360;
    return (
      chart.cusps.findLastIndex(
        (c) => (c - chart.cusps[0]! + 360) % 360 <= relative,
      ) + 1
    );
  });
</script>

<DetailsShell label="Body details" {name} bind:heading bind:snap {onclose}>
  <p>{content.insight}</p>
  <p class="keywords">{content.keywords.join(" · ")}</p>
  <dl>
    <div>
      <dt>Sign</dt>
      <dd>{body.sign.sign}</dd>
    </div>
    <div>
      <dt>House</dt>
      <dd>{house}</dd>
    </div>
    <div>
      <dt>Degree</dt>
      <dd>{Math.floor(progress * 100) / 100}°</dd>
    </div>
    <div>
      <dt>Retrograde</dt>
      <dd>{body.speed < 0 ? "Yes" : "No"}</dd>
    </div>
  </dl>
  {#if bridge}<p>{bridgingReference.text}</p>{/if}
  <p class="context">
    {chart.configuration.reference === "tropical"
      ? "Tropical"
      : chart.configuration.reference === "fagan-bradley"
        ? "Vedic"
        : "True Sky"} · {chart.house_system} houses
  </p>
</DetailsShell>
