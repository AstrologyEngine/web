<script lang="ts">
  import { isAngle } from "./identities";
  import DetailsShell from "./DetailsShell.svelte";
  import type { Chart } from "./calculation/chart";
  import type { Selection } from "./selection";
  import { houseFor, signAt } from "./selection";
  import { rulers } from "./rulers";
  import { copy, t } from "./copy/index.svelte";
  import type { PlainKey } from "./copy/copy";
  import { referenceLabel } from "./labels";
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
  const labels = {
    sign: "details.label.sign",
    house: "details.label.house",
    angle: "details.label.angle",
    aspect: "details.label.aspect",
  } as const satisfies Record<typeof selection.kind, PlainKey>;
  let name = $derived(
    selection.kind === "sign"
      ? copy().signName(selection.name)
      : selection.kind === "house"
        ? copy().houseName(selection.number)
        : selection.kind === "angle"
          ? copy().pointName(selection.name)
          : t("details.aspect.title", {
              first: copy().pointName(selection.first),
              aspect: copy().aspectName(selection.aspectType),
              second: copy().pointName(selection.second),
            }),
  );
  let content = $derived(
    selection.kind === "sign"
      ? copy().sign(selection.name)
      : selection.kind === "house"
        ? copy().house(selection.number)
        : selection.kind === "angle"
          ? copy().angle(selection.name)
          : copy().aspect(selection.aspectType),
  );
  let cuspSign = $derived(
    selection.kind === "house"
      ? signAt(chart.cusps[selection.number - 1]!, chart)
      : undefined,
  );
  let traditional = $derived(cuspSign ? rulers[cuspSign][0] : null);
  let modern = $derived(cuspSign ? rulers[cuspSign][1] : null);
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
  label={t(labels[selection.kind])}
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
  {#if selection.kind === "house"}
    <dl>
      <div>
        <dt>{t("details.house.cuspSign")}</dt>
        <dd>
          {cuspSign
            ? copy().signName(cuspSign)
            : t("details.house.unavailable")}
        </dd>
      </div>
      {#if modern && traditional && traditional !== modern}
        <div>
          <dt>{t("details.house.traditionalRuler")}</dt>
          <dd>{copy().pointName(traditional)}</dd>
        </div>
        <div>
          <dt>{t("details.house.modernRuler")}</dt>
          <dd>{copy().pointName(modern)}</dd>
        </div>
      {:else if modern && !traditional}
        <div>
          <dt>{t("details.house.modernRuler")}</dt>
          <dd>{copy().pointName(modern)}</dd>
        </div>
      {:else}<div>
          <dt>{t("details.house.ruler")}</dt>
          <dd>
            {modern ? copy().pointName(modern) : t("details.house.noRuler")}
          </dd>
        </div>{/if}
      <div>
        <dt>{t("details.house.occupants")}</dt>
        <dd>
          {occupants.length
            ? occupants.map((b) => copy().pointName(b.name)).join(", ")
            : t("details.house.empty")}
        </dd>
      </div>
    </dl>
  {/if}
  <p class="context">
    {chart.requested_house_system !== chart.house_system
      ? t("details.contextRequested", {
          reference: t(referenceLabel[chart.configuration.reference]),
          houseSystem: chart.house_system,
          requested: chart.requested_house_system,
        })
      : t("details.context", {
          reference: t(referenceLabel[chart.configuration.reference]),
          houseSystem: chart.house_system,
        })}
  </p>
</DetailsShell>
