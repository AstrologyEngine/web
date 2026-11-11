<script lang="ts">
  import DetailsShell from "./DetailsShell.svelte";
  import type { Chart } from "./calculation/chart";
  import { copy, t } from "./copy/index.svelte";
  import { referenceLabel } from "./labels";
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
  let name = $derived(copy().pointName(body.name));
  let content = $derived(copy().body(body.name));
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

<DetailsShell
  label={t("details.label.body")}
  {name}
  bind:heading
  bind:snap
  {onclose}
>
  {#if content}
    <p>{content.insight}</p>
    <p class="keywords">{content.keywords.join(" · ")}</p>
  {:else}
    <p>{t("details.unavailable")}</p>
  {/if}
  <dl>
    <div>
      <dt>{t("details.body.sign")}</dt>
      <dd>{copy().signName(body.sign.sign)}</dd>
    </div>
    <div>
      <dt>{t("details.body.house")}</dt>
      <dd>{house}</dd>
    </div>
    <div>
      <dt>{t("details.body.degree")}</dt>
      <dd>{Math.floor(progress * 100) / 100}°</dd>
    </div>
    <div>
      <dt>{t("details.body.retrograde")}</dt>
      <dd>{body.speed < 0 ? t("details.body.yes") : t("details.body.no")}</dd>
    </div>
  </dl>
  {#if bridge}<p>{t("details.bridging")}</p>{/if}
  <p class="context">
    {t("details.context", {
      reference: t(referenceLabel[chart.configuration.reference]),
      houseSystem: chart.house_system,
    })}
  </p>
</DetailsShell>
