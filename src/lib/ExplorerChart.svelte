<script lang="ts">
  import type { Measurement } from "./measurement/client";
  import { tick, untrack, type Snippet } from "svelte";
  import { angleIds, isAngle } from "./identities";
  import type { Snapshot } from "./calculation/snapshot";
  import type { BodyName, SignName, Selection, Aspect } from "./selection";
  import { samePair, supported } from "./selection";
  import Wheel from "./Wheel.svelte";
  import MobileWheel from "./MobileWheel.svelte";
  import Details from "./Details.svelte";
  import ReferenceDetails from "./ReferenceDetails.svelte";
  import ChartLayout from "./ChartLayout.svelte";
  import { copy, t } from "./copy/index.svelte";
  let {
    snapshot,
    measurement,
    controls,
    status,
    overview,
  }: {
    snapshot: Snapshot;
    measurement: Measurement | null;
    /** Chart controls; receives a callback that shows the overview in the rail. */
    controls?: Snippet<[() => void]>;
    status?: Snippet;
    /** Reading rail content while nothing is selected. */
    overview?: Snippet;
  } = $props();
  let rail = $state<HTMLElement>();
  let selection = $state<Selection | null>(null);
  let origin: Element | null = null;
  let heading = $state<HTMLHeadingElement>();
  let snap = $state<40 | 70>(40);
  let announcement = $state("");
  let astrology = $derived(snapshot.systems.astrology!);
  let chart = $derived(astrology.selectedFrame);
  let selectedName = $derived(
    selection?.kind === "body" ? selection.name : null,
  );
  let body = $derived(chart.bodies.find((b) => b.name === selectedName));
  let reference = $derived(
    selection && selection.kind !== "body" ? selection : null,
  );
  let pickerOpen = $state(false);
  let pickerGeneration = $state(0);
  let candidates = $state<Aspect[]>([]);
  let first = $state<BodyName | null>(null);
  let pickerOrigin: Element | null = null;
  let pickerFirst = $derived([
    ...new Set(candidates.flatMap((a) => [a.planetA, a.planetB])),
  ]);
  let pickerSecond = $derived(
    first
      ? [
          ...new Set(
            candidates
              .filter((a) => a.planetA === first || a.planetB === first)
              .map((a) => (a.planetA === first ? a.planetB : a.planetA)),
          ),
        ]
      : [],
  );
  const label = (name: BodyName) => copy().pointName(name);
  $effect(() => {
    const current = selection;
    if (current && !supported(current, chart, astrology.aspects))
      untrack(() => {
        selection = null;
        announcement = t("explorer.announce.unavailable");
      });
  });
  $effect(() => {
    if (pickerOpen && snapshot.generation !== pickerGeneration)
      untrack(() => {
        pickerOpen = false;
        announcement = t("explorer.announce.pickerReset");
      });
  });
  function dismiss(restore = false) {
    selection = null;
    announcement = t("explorer.announce.cleared");
    if (
      restore &&
      (origin instanceof HTMLElement || origin instanceof SVGElement)
    )
      origin.focus();
  }
  function revealChartTarget(target: Element) {
    if (!window.matchMedia("(max-width: 799px)").matches) return;
    const sheet = heading?.closest("aside");
    const chartTarget = target.closest(".wheel")
      ? target
      : target
          .closest(".chart-layout")
          ?.querySelector('.wheel [aria-pressed="true"]');
    if (!sheet || !chartTarget) return;
    const availableBottom = sheet.getBoundingClientRect().top;
    const bounds = chartTarget.getBoundingClientRect();
    // Fixed sheets do not reduce the browser's scroll-into-view area. Reveal the
    // selected target in the space above the sheet without changing wheel pan.
    if (bounds.top < 16 || bounds.bottom > availableBottom - 16)
      window.scrollBy({
        top: bounds.top + bounds.height / 2 - availableBottom / 2,
        behavior: "instant",
      });
  }
  async function choose(next: Selection, target: Element, keyboard: boolean) {
    if (JSON.stringify(selection) === JSON.stringify(next)) {
      measurement?.interaction("repeat");
      dismiss(keyboard);
      return;
    }
    origin = target;
    measurement?.open(next);
    selection = next;
    announcement = t("explorer.announce.opened");
    snap = 40;
    await tick();
    if (keyboard)
      heading?.focus({
        preventScroll: window.matchMedia("(max-width: 799px)").matches,
      });
    revealChartTarget(target);
  }
  const selectBody = (name: BodyName, target: Element, keyboard: boolean) =>
    choose({ kind: "body", name }, target, keyboard);
  const selectSign = (name: SignName, target: Element, keyboard: boolean) =>
    choose({ kind: "sign", name }, target, keyboard);
  const selectHouse = (number: number, target: Element, keyboard: boolean) =>
    choose({ kind: "house", number }, target, keyboard);
  const selectAngle = (name: BodyName, target: Element, keyboard: boolean) =>
    choose({ kind: "angle", name }, target, keyboard);
  function openPicker(
    list: Aspect[],
    target: Element,
    fromBody: BodyName | null = null,
  ) {
    measurement?.use("aspect_picker");
    measurement?.interaction("navigation");
    candidates = list;
    first = fromBody;
    pickerOrigin = target;
    pickerGeneration = snapshot.generation;
    pickerOpen = true;
  }
  function closePicker() {
    measurement?.interaction("navigation");
    pickerOpen = false;
    if (
      pickerOrigin instanceof HTMLElement ||
      pickerOrigin instanceof SVGElement
    )
      pickerOrigin.focus();
  }
  function pickFirst(name: BodyName) {
    measurement?.interaction("navigation");
    first = name;
  }
  function backPicker() {
    measurement?.interaction("navigation");
    first = null;
  }
  async function pickSecond(name: BodyName) {
    if (!first) return;
    const aspect = candidates.find((a) => samePair(a, first!, name));
    if (!aspect) return;
    pickerOpen = false;
    const [a, b] = [first, name].sort() as [BodyName, BodyName];
    await choose(
      { kind: "aspect", first: a, second: b, aspectType: aspect.type },
      pickerOrigin!,
      true,
    );
  }
  // "?" returns the rail to the system overview and moves focus to its heading.
  async function showOverview() {
    selection = null;
    await tick();
    rail?.querySelector<HTMLElement>("[data-rail-heading]")?.focus();
  }
  const setupDialog = (node: HTMLDialogElement) => {
    node.showModal();
    return () => node.close();
  };
</script>

<svelte:window
  onkeydown={(event) => {
    if (
      event.key === "Escape" &&
      !event.defaultPrevented &&
      !pickerOpen &&
      selection
    ) {
      event.preventDefault();
      dismiss(true);
    }
  }}
/>
{#snippet stageControls()}{@render controls?.(showOverview)}{/snippet}
{#snippet wheelView()}
  <MobileWheel {measurement}
    ><Wheel
      {chart}
      {astrology}
      selectedBody={body?.name ?? null}
      selectedSign={selection?.kind === "sign" ? selection.name : null}
      selectedHouse={selection?.kind === "house" ? selection.number : null}
      selectedAngle={selection?.kind === "angle" ? selection.name : null}
      onselect={selectBody}
      onselectSign={selectSign}
      onselectHouse={selectHouse}
      onselectAngle={selectAngle}
      onexposeGroup={() => measurement?.expose("body_picker")}
      onopenGroup={() => {
        measurement?.use("body_picker");
        measurement?.interaction("navigation");
      }}
      onselectAspects={(near, target) =>
        openPicker(
          near,
          target,
          body &&
            near.some((a) => a.planetA === body.name || a.planetB === body.name)
            ? body.name
            : null,
        )}
      onblank={() => dismiss()}
    /></MobileWheel
  >
{/snippet}
{#snippet railView()}
  {#if body}<Details
      {body}
      {chart}
      bind:heading
      bind:snap
      onclose={() => dismiss(true)}
    />{:else if reference}<ReferenceDetails
      selection={reference}
      {chart}
      bind:heading
      bind:snap
      onclose={() => dismiss(true)}
    />{:else}{@render overview?.()}{/if}
{/snippet}
{#snippet alternatives()}
  <div class="alternatives">
    <details class="body-list">
      <summary>{t("explorer.list.bodies")}</summary>
      <div>
        {#each chart.bodies.filter((item) => !isAngle(item.name)) as item (item.name)}<button
            aria-pressed={body?.name === item.name}
            onclick={(event) =>
              selectBody(item.name, event.currentTarget, event.detail === 0)}
            >{label(item.name)}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>{t("explorer.list.signs")}</summary>
      <div>
        {#each chart.zodiac_sectors as sign (sign.sign)}<button
            aria-pressed={selection?.kind === "sign" &&
              selection.name === sign.sign}
            onclick={(event) =>
              selectSign(sign.sign, event.currentTarget, event.detail === 0)}
            >{copy().signName(sign.sign)}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>{t("explorer.list.houses")}</summary>
      <div>
        {#each chart.cusps as _, index (index)}<button
            aria-pressed={selection?.kind === "house" &&
              selection.number === index + 1}
            onclick={(event) =>
              selectHouse(index + 1, event.currentTarget, event.detail === 0)}
            >{copy().houseName(index + 1)}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>{t("explorer.list.angles")}</summary>
      <div>
        {#each angleIds as name (name)}<button
            aria-pressed={selection?.kind === "angle" &&
              selection.name === name}
            onclick={(event) =>
              selectAngle(
                name as BodyName,
                event.currentTarget,
                event.detail === 0,
              )}>{label(name as BodyName)}</button
          >{/each}
      </div>
    </details>
    <button
      onclick={(event) =>
        openPicker(astrology.aspects, event.currentTarget, body?.name ?? null)}
      >{body
        ? t("explorer.aspects.exploreOf", { body: label(body.name) })
        : t("explorer.aspects.explore")}</button
    >
  </div>
{/snippet}
<ChartLayout
  controls={controls ? stageControls : undefined}
  wheel={wheelView}
  {status}
  rail={railView}
  below={alternatives}
  bind:railElement={rail}
/>
<span class="sr-only" aria-live="polite">{announcement}</span>
{#if pickerOpen}<dialog
    aria-label={t("explorer.picker.label")}
    {@attach setupDialog}
    onkeydown={(event) => {
      if (event.key === "Escape") event.stopPropagation();
    }}
    oncancel={(event) => {
      event.preventDefault();
      closePicker();
    }}
  >
    <h2>
      {first
        ? t("explorer.picker.second", { body: label(first) })
        : t("explorer.picker.first")}
    </h2>
    <div class="picker-buttons">
      {#each first ? pickerSecond : pickerFirst as name (name)}<button
          onclick={() => (first ? pickSecond(name) : pickFirst(name))}
          >{label(name)}</button
        >{/each}
    </div>
    {#if first}<button onclick={backPicker}>{t("explorer.picker.back")}</button
      >{/if}<button onclick={closePicker}>{t("explorer.picker.close")}</button>
  </dialog>{/if}

<style>
  .alternatives details {
    margin-bottom: 0.7rem;
  }
  .alternatives summary {
    cursor: pointer;
    width: fit-content;
  }
  .alternatives details div,
  .picker-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
  }
  .alternatives button,
  .picker-buttons button {
    min-height: 36px;
    padding: 6px 14px;
    border: 1px solid var(--line-strong);
    border-radius: 20px;
    background: var(--field);
    font-size: 14px;
  }
  .alternatives button[aria-pressed="true"] {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--accent-ink);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  dialog {
    width: min(500px, calc(100vw - 32px));
    max-height: 80dvh;
    overflow: auto;
    border: 0;
    border-radius: 16px;
    padding: 24px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 18px 70px #292d3830;
  }
  dialog::backdrop {
    background: #292d3859;
  }
  dialog h2 {
    margin: 0 0 12px;
    font: 400 24px/1.2 var(--serif);
  }
</style>
