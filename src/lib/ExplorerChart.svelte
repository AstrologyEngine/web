<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { Snapshot } from "./calculation/snapshot";
  import type { BodyName, SignName, Selection, Aspect } from "./selection";
  import { samePair, supported } from "./selection";
  import Wheel from "./Wheel.svelte";
  import MobileWheel from "./MobileWheel.svelte";
  import Details from "./Details.svelte";
  import ReferenceDetails from "./ReferenceDetails.svelte";
  import { bodySymbols } from "./wheel/body-symbols";
  let { snapshot }: { snapshot: Snapshot } = $props();
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
  const title = (s: string) => s[0]!.toUpperCase() + s.slice(1);
  const label = (name: BodyName) => bodySymbols[name]?.name ?? name;
  $effect(() => {
    const current = selection;
    if (current && !supported(current, chart, astrology.aspects))
      untrack(() => {
        selection = null;
        announcement = "Selection no longer available";
      });
  });
  $effect(() => {
    if (pickerOpen && snapshot.generation !== pickerGeneration)
      untrack(() => {
        pickerOpen = false;
        announcement = "Connections updated; open the picker again.";
      });
  });
  function dismiss(restore = false) {
    selection = null;
    announcement = "Selection cleared";
    if (
      restore &&
      (origin instanceof HTMLElement || origin instanceof SVGElement)
    )
      origin.focus();
  }
  async function choose(next: Selection, target: Element, keyboard: boolean) {
    if (JSON.stringify(selection) === JSON.stringify(next)) {
      dismiss(keyboard);
      return;
    }
    origin = target;
    selection = next;
    announcement = "Selection opened";
    snap = 40;
    if (keyboard) {
      await tick();
      heading?.focus();
    }
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
    candidates = list;
    first = fromBody;
    pickerOrigin = target;
    pickerGeneration = snapshot.generation;
    pickerOpen = true;
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
<div class={["explorer", { "with-details": !!selection }]}>
  <MobileWheel
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
  <div class="alternatives">
    <details class="body-list">
      <summary>Choose a body by name</summary>
      <div>
        {#each chart.bodies.filter((item) => !["ASCENDANT_SYMBOL", "MIDHEAVEN", "DESCENDANT", "IMUM_COELI"].includes(item.name)) as item (item.name)}<button
            aria-pressed={body?.name === item.name}
            onclick={(event) =>
              selectBody(item.name, event.currentTarget, event.detail === 0)}>{label(
                item.name,
              )}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>Choose a sign by name</summary>
      <div>
        {#each chart.zodiac_sectors as sign (sign.sign)}<button
            aria-pressed={selection?.kind === "sign" &&
              selection.name === sign.sign}
            onclick={(event) =>
              selectSign(sign.sign, event.currentTarget, event.detail === 0)}>{title(
                sign.sign,
              )}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>Choose a house by number</summary>
      <div>
        {#each chart.cusps as _, index (index)}<button
            aria-pressed={selection?.kind === "house" &&
              selection.number === index + 1}
            onclick={(event) =>
              selectHouse(index + 1, event.currentTarget, event.detail === 0)}>House
              {index + 1}</button
          >{/each}
      </div>
    </details>
    <details>
      <summary>Choose an angle by name</summary>
      <div>
        {#each ["ASCENDANT_SYMBOL", "MIDHEAVEN", "DESCENDANT", "IMUM_COELI"] as name (name)}<button
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
      >Explore aspects{body ? ` of ${label(body.name)}` : ""}</button
    >
  </div>
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
    />{/if}
  <span class="sr-only" aria-live="polite">{announcement}</span>
</div>
{#if pickerOpen}<dialog
    aria-label="Choose an aspect"
    {@attach setupDialog}
    onkeydown={(event) => {
      if (event.key === "Escape") event.stopPropagation();
    }}
    oncancel={(event) => {
      event.preventDefault();
      pickerOpen = false;
      if (
        pickerOrigin instanceof HTMLElement ||
        pickerOrigin instanceof SVGElement
      )
        pickerOrigin.focus();
    }}
  >
    <h2>
      {first
        ? `Choose a connection to ${label(first)}`
        : "Choose the first body"}
    </h2>
    <div class="picker-buttons">
      {#each first ? pickerSecond : pickerFirst as name (name)}<button
          onclick={() => (first ? pickSecond(name) : (first = name))}>{label(
            name,
          )}</button
        >{/each}
    </div>
    {#if first}<button onclick={() => (first = null)}>Back</button>{/if}<button
      onclick={() => {
        pickerOpen = false;
        if (
          pickerOrigin instanceof HTMLElement ||
          pickerOrigin instanceof SVGElement
        )
          pickerOrigin.focus();
      }}>Close</button
    >
  </dialog>{/if}

<style>
  .explorer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem 2rem;
    align-items: start;
  }
  .with-details {
    grid-template-columns: minmax(0, 1fr) minmax(250px, 340px);
  }
  .alternatives {
    grid-column: 1;
  }
  .alternatives details {
    margin-bottom: 0.7rem;
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
    border: 1px solid #a89583;
    border-radius: 1rem;
    background: #fffdf8;
    padding: 0.35rem 0.7rem;
  }
  .alternatives button[aria-pressed="true"] {
    background: #523f37;
    color: white;
  }
  .with-details :global(aside) {
    grid-column: 2;
    grid-row: 1 / span 2;
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
    border-radius: 1rem;
    padding: 1.5rem;
  }
  dialog::backdrop {
    background: #0f172a65;
  }
  @media (max-width: 799px) {
    .explorer {
      display: block;
      padding-bottom: 2rem;
    }
  }
</style>
