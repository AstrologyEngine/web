<script lang="ts">
  // Throwaway: three responsive sheet alternatives on /app?variant=A|B|C. Ticket 36.
  import { onMount, tick } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import MobileWheel from "../MobileWheel.svelte";
  import Wheel from "../Wheel.svelte";
  import Details from "../Details.svelte";
  import ReferenceDetails from "../ReferenceDetails.svelte";
  import BirthEdit from "../BirthEdit.svelte";
  import { initialSettings, birthSchema } from "../domain";
  import { snapshotSchema, type Snapshot } from "../calculation/snapshot";
  import type { Selection } from "../selection";
  import { bodySymbols } from "../wheel/body-symbols";
  import { birthDateLabel, birthTimeLabel } from "../birth-display";
  import type { resolveBirth } from "../server/birth/resolve";
  type Birth = ReturnType<typeof birthSchema.parse>;
  const variants = ["A", "B", "C"];
  const names = ["Compact overlay", "Tall reading sheet", "Expandable peek"];
  const systems = ["Tropical", "Vedic", "True Sky"];
  let variant = $derived(
    variants.includes(page.url.searchParams.get("variant") ?? "")
      ? page.url.searchParams.get("variant")!
      : "A",
  );
  let index = $derived(variants.indexOf(variant));
  let reviewing = $derived(
    import.meta.env.DEV && page.url.searchParams.get("review") === "1",
  );
  let birth = $state<Birth | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  let editing = $state(true);
  let busy = $state(false);
  let error = $state("");
  let system = $state("Tropical");
  let advanced = $state(false);
  let long = $state(false);
  let selection = $state<Selection | null>(null);
  type SheetSnap = "hidden" | "compact" | "tall";
  let snap = $state<SheetSnap>("hidden");
  let sheetOpen = $derived(snap !== "hidden");
  let expanded = $derived(snap === "tall");
  let dragHeight = $state<number | null>(null);
  let dragBottom = $state(0);
  let drag: {
    id: number;
    y: number;
    height: number;
    startSnap: SheetSnap;
  } | null = null;
  let suppressHandleClick = false;
  let sheet: HTMLElement;
  let origin: Element | null = null;

  const dismiss = () => {
    snap = "hidden";
    if (origin instanceof HTMLElement || origin instanceof SVGElement)
      origin.focus({ preventScroll: true });
  };
  const snapHeights = () => {
    const mobile = window.matchMedia("(max-width: 799px)").matches;
    const compact = mobile
      ? innerHeight * (variant === "A" ? 0.4 : variant === "B" ? 0.72 : 0.27)
      : variant === "C"
        ? innerHeight * 0.46
        : innerHeight - (variant === "A" ? 128 : 80);
    return {
      hidden: 0,
      compact,
      tall: mobile ? innerHeight * 0.78 : innerHeight - 80,
    };
  };
  const startResize = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    dragBottom = innerHeight - sheet.getBoundingClientRect().bottom;
    drag = {
      id: event.pointerId,
      y: event.clientY,
      height: sheet.getBoundingClientRect().height,
      startSnap: snap,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    suppressHandleClick = false;
  };
  const moveResize = (event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const delta = drag.y - event.clientY;
    if (Math.abs(delta) > 5) suppressHandleClick = true;
    dragHeight = Math.max(0, Math.min(snapHeights().tall, drag.height + delta));
  };
  const finishResize = (event: PointerEvent, cancelled = false) => {
    if (!drag || drag.id !== event.pointerId) return;
    if (cancelled) snap = drag.startSnap;
    else if (suppressHandleClick) {
      const upward = event.clientY < drag.y;
      snap = upward ? "tall" : drag.startSnap === "tall" ? "compact" : "hidden";
      if (snap === "hidden") dismiss();
    }
    drag = null;
    dragHeight = null;
  };
  const show = async (event?: MouseEvent) => {
    origin =
      event?.currentTarget instanceof Element
        ? event.currentTarget
        : document.activeElement;
    if (snap === "hidden") snap = "compact";
    sheet?.querySelector(".pane-content")?.scrollTo(0, 0);
    await tick();
    if (event?.detail === 0) sheet?.focus({ preventScroll: true });
  };
  const choose = (next: Selection, target: Element, keyboard: boolean) => {
    selection = next;
    sheet?.querySelector(".pane-content")?.scrollTo(0, 0);
    origin = target;
    if (snap === "hidden") snap = "compact";
    if (keyboard) void tick().then(() => sheet?.focus({ preventScroll: true }));
  };
  let worker: Worker;
  let generation = 0;
  let chart = $derived(snapshot?.systems.astrology?.selectedFrame);
  let astrology = $derived(snapshot?.systems.astrology);
  let bodyName = $derived(selection?.kind === "body" ? selection.name : null);
  let body = $derived(chart?.bodies.find((b) => b.name === bodyName));
  let reference = $derived(
    selection && selection.kind !== "body" ? selection : null,
  );
  const cycle = (step: number) => {
    const url = new URL(page.url.href);
    url.searchParams.set("variant", variants[(index + step + 3) % 3]!);
    void goto(resolve(`/app?${url.searchParams.toString()}`), {
      replace: true,
    });
  };
  const resolveBirthInput = async (
    input: Parameters<typeof resolveBirth>[0],
  ): Promise<Awaited<ReturnType<typeof resolveBirth>>> => {
    const response = await fetch("/app/prototype-birth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  };
  const accept = (next: Birth | null) => {
    if (!next) {
      if (birth) editing = false;
      return;
    }
    birth = next;
    editing = false;
    selection = null;
    busy = true;
    error = "";
    worker.postMessage({
      generation: ++generation,
      birth: $state.snapshot(next),
      settings: initialSettings,
    });
  };
  const example = async () => {
    try {
      const result = await resolveBirthInput({
        sentence: "June 21, 2000 at 1pm in London",
      });
      if (result.kind === "resolved") accept(result.birth);
      else error = result.message;
    } catch {
      error = "Example could not load. Enter birth details to retry.";
    }
  };
  onMount(() => {
    worker = new Worker("/calculation-worker.js", { type: "module" });
    worker.onmessage = (event) => {
      if (event.data.generation !== generation) return;
      busy = false;
      const result = snapshotSchema.safeParse(event.data.result?.snapshot);
      if (result.success) snapshot = result.data;
      else
        error =
          event.data.result?.message ??
          "Calculation failed. Try the example again.";
    };
    worker.onerror = () => {
      busy = false;
      error = "Calculation unavailable. Reload to retry.";
    };
    return () => worker.terminate();
  });
  const reset = () => {
    ++generation;
    snapshot = null;
    birth = null;
    selection = null;
    system = "Tropical";
    editing = true;
    busy = false;
    error = "";
  };
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape" && sheetOpen && !editing) {
      dismiss();
      return;
    }
    if (event.defaultPrevented) return;
    const target = event.target;
    if (
      !reviewing ||
      editing ||
      (target instanceof Element &&
        target.closest("input, textarea, select, [contenteditable]"))
    )
      return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      cycle(event.key === "ArrowRight" ? 1 : -1);
    }
  }}
/>
<svelte:head><title>Responsive sheet review | Astrology Engine</title></svelte:head>

{#snippet controls()}
  <div class="controls" aria-label="Zodiac system controls">
    <div class="presets" role="group" aria-label="Zodiac system">
      {#each systems as label (label)}
        <button
          aria-pressed={system === label}
          onclick={(event) => {
            void show(event);
            system = label;
            selection = null;
            advanced = false;
          }}>{label}</button
        >
      {/each}
    </div>
    <button
      class="icon"
      title="About this system"
      aria-label="About this system"
      onclick={(event) => {
        void show(event);
        selection = null;
        advanced = false;
      }}>?</button
    >
    <button
      class="icon more"
      title="Advanced"
      aria-label="Advanced"
      aria-expanded={advanced}
      onclick={(event) => {
        void show(event);
        advanced = !advanced;
        selection = null;
      }}>•••</button
    >
  </div>
{/snippet}

<main
  class="desktop-prototype"
  data-variant="A"
  data-sheet={variant}
  data-open={sheetOpen}
  data-expanded={expanded}
  data-snap={snap}
>
  <section class="workspace" aria-label="Natal Chart Explorer">
    <header class="masthead">
      <a href={resolve("/")} class="brand"
        ><svg viewBox="0 0 32 32" aria-hidden="true"
          ><circle cx="16" cy="16" r="12" /><circle
            cx="16"
            cy="16"
            r="6"
          /><path d="M16 1v8m0 14v8M1 16h8m14 0h8" /></svg
        ><span>Astrology Engine</span></a
      >
      <button class="birth-line" onclick={() => (editing = true)}>
        <span
          >{birth
            ? `${birthDateLabel(birth.localDate)} at ${birthTimeLabel(birth.localTime)}`
            : "Enter birth details"}</span
        >
        {#if birth}<span class="place">{birth.place.label}</span>{/if}
        <svg viewBox="0 0 24 24" aria-hidden="true"
          ><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z" /></svg
        >
      </button>
    </header>
    <div class="composition">
      <div class="chart-stage">
        <div class="chart-controls">
          {@render controls()}
        </div>
        <div class="wheel-space">
          {#if chart && astrology}
            <MobileWheel measurement={null} initialZoomed={true} gestures={true}
              ><Wheel
                {chart}
                {astrology}
                selectedBody={body?.name ?? null}
                selectedSign={selection?.kind === "sign"
                  ? selection.name
                  : null}
                selectedHouse={selection?.kind === "house"
                  ? selection.number
                  : null}
                selectedAngle={selection?.kind === "angle"
                  ? selection.name
                  : null}
                onselect={(name, target, keyboard) =>
                  choose({ kind: "body", name }, target, keyboard)}
                onselectSign={(name, target, keyboard) =>
                  choose({ kind: "sign", name }, target, keyboard)}
                onselectHouse={(number, target, keyboard) =>
                  choose({ kind: "house", number }, target, keyboard)}
                onselectAngle={(name, target, keyboard) =>
                  choose({ kind: "angle", name }, target, keyboard)}
                onblank={() => (selection = null)}
              /></MobileWheel
            >
          {:else}
            <svg
              class="empty-wheel"
              viewBox="0 0 640 640"
              role="img"
              aria-label="Empty chart awaiting birth details"
            >
              {#each [295, 268, 232, 174] as r (r)}<circle
                  cx="320"
                  cy="320"
                  {r}
                />{/each}
              {#each Array(12) as _, i (i)}<path
                  d="M320 25V146"
                  transform={`rotate(${i * 30} 320 320)`}
                />{/each}
              <text x="320" y="315" text-anchor="middle"
                >Your sky begins here</text
              ><text class="empty-caption" x="320" y="343" text-anchor="middle"
                >Add a date, time and place of birth</text
              >
            </svg>
          {/if}
        </div>
        {#if busy || error}<p class="calculation-status" role="status">
            {error || "Calculating your chart…"}
          </p>{/if}
      </div>
      <aside
        bind:this={sheet}
        class="reading-pane"
        style:height={dragHeight === null ? undefined : `${dragHeight}px`}
        style:top={dragHeight === null ? undefined : "auto"}
        style:bottom={dragHeight === null ? undefined : `${dragBottom}px`}
        aria-label="Chart explanation"
        tabindex="-1"
      >
        <div class="sheet-toolbar">
          <button
            class="resize-handle"
            role="slider"
            aria-label="Resize chart details"
            aria-valuemin="0"
            aria-valuemax="2"
            aria-valuenow={snap === "hidden" ? 0 : snap === "compact" ? 1 : 2}
            aria-valuetext={snap}
            aria-orientation="vertical"
            onpointerdown={startResize}
            onpointermove={moveResize}
            onpointerup={(event) => finishResize(event)}
            onpointercancel={(event) => finishResize(event, true)}
            onclick={() => {
              if (suppressHandleClick) {
                suppressHandleClick = false;
                return;
              }
              snap = snap === "tall" ? "compact" : "tall";
            }}
            onkeydown={(event) => {
              if (
                [
                  "ArrowUp",
                  "ArrowRight",
                  "ArrowDown",
                  "ArrowLeft",
                  "Home",
                  "End",
                ].includes(event.key)
              ) {
                event.preventDefault();
                if (event.key === "Home") dismiss();
                else if (["ArrowUp", "ArrowRight", "End"].includes(event.key))
                  snap = "tall";
                else if (snap === "tall") snap = "compact";
                else dismiss();
              }
            }}><span></span></button
          >
          <button
            class="sheet-close"
            aria-label="Close details"
            onclick={dismiss}
            ><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg
            ></button
          >
        </div>
        <div class="pane-content">
          {#if advanced}
            <h1>House system</h1>
            <p>Houses describe the areas of life in which the chart unfolds.</p>
            <label class="house-label"
              >House system <select disabled><option>Whole Sign</option></select></label
            >
            <p class="small">
              Control placement preview. House changes are delivered in the
              system interaction ticket.
            </p>
          {:else if body && chart}<Details
              {body}
              {chart}
              snap={40}
              onclose={() => {}}
            />
          {:else if reference && chart}<ReferenceDetails
              selection={reference}
              {chart}
              snap={40}
              onclose={() => {}}
            />
          {:else}
            <h1>{system}</h1>
            <p class="intro">
              {system === "Tropical"
                ? "A chart anchored to the seasons."
                : system === "Vedic"
                  ? "A chart anchored to the sidereal zodiac."
                  : "A chart shaped by the constellations."}
            </p>
            <p>
              {system === "Tropical"
                ? "The zodiac begins at the March equinox. Twelve equal signs mark the Sun’s yearly journey, each spanning 30 degrees."
                : system === "Vedic"
                  ? "The Vedic preset uses the Lahiri ayanamsa and twelve equal signs. It offers another reference for exploring the same sky."
                  : "True Sky follows unequal constellation spans using midpoint boundaries, including Ophiuchus."}
            </p>
            <dl>
              <div>
                <dt>Zodiac</dt>
                <dd>
                  {system === "True Sky"
                    ? "13 unequal constellations"
                    : "12 equal signs"}
                </dd>
              </div>
              <div>
                <dt>Houses</dt>
                <dd>Whole Sign</dd>
              </div>
              {#if system === "Vedic"}<div>
                  <dt>Ayanamsa</dt>
                  <dd>Lahiri</dd>
                </div>{/if}
            </dl>
            <h2>Explore your chart</h2>
            <p>
              Select a planet, sign, house or angle on the wheel. Its meaning
              and placement appear here, while your chart stays in place.
            </p>
          {/if}
          {#if long}
            <div class="long-content">
              <h2>Reading the wheel</h2>
              <p>
                A natal chart brings several layers together. The planet
                describes a function, the sign describes its expression, and the
                house describes an area of life.
              </p>
              <h2>Start with one detail</h2>
              <p>
                Look for a single symbol that interests you. Follow its position
                through the surrounding rings, then compare it with another part
                of the chart.
              </p>
              <h2>Keep the whole in view</h2>
              <p>
                These descriptions are a vocabulary for reflection. A single
                placement does not define a person, and each detail belongs to a
                wider picture.
              </p>
              <h2>Connections</h2>
              <p>
                Lines between bodies show angular relationships. Their geometry
                is one more layer to explore alongside signs and houses.
              </p>
              <h2>Returning to the system</h2>
              <p>
                The question-mark button brings you back to the selected
                zodiac’s explanation. Your birth details stay available in the
                centered line above.
              </p>
            </div>
          {/if}
        </div>
      </aside>
    </div>
  </section>
  <section class="tables" aria-label="Chart tables">
    <nav aria-label="Chart table previews">
      {#each ["Bodies", "Signs", "Houses", "Angles", "Aspects"] as label (label)}<span
          >{label}</span
        >{/each}
    </nav>
    <p>
      Table placement preview: secondary information begins below the first
      viewport.
    </p>
    {#if chart}<table>
        <thead><tr><th>Body</th><th>Sign</th><th>Degree</th></tr></thead><tbody
          >{#each chart.bodies as item (item.name)}<tr
              ><td>{bodySymbols[item.name]?.name ?? item.name}</td><td
                >{item.sign.sign}</td
              ><td>{item.sign.degrees_in_sign.toFixed(2)}°</td></tr
            >{/each}</tbody
        >
      </table>{/if}
  </section>
</main>

{#if editing}
  <dialog
    aria-labelledby="birth-modal-heading"
    oncancel={(event) => {
      event.preventDefault();
      if (birth) editing = false;
    }}
    {@attach (node) => {
      node.showModal();
      return () => node.close();
    }}
  >
    <h2 id="birth-modal-heading">
      {birth ? "Edit birth details" : "Begin with your birth details"}
    </h2>
    <p>A date, time and birthplace locate your chart in the sky.</p>
    <BirthEdit {birth} resolve={resolveBirthInput} onclose={accept} />
    {#if reviewing}<button class="example" onclick={() => void example()}>Use
    example for layout review</button>{/if}
    {#if error}<p role="alert">{error}</p>{/if}
  </dialog>
{/if}

{#if reviewing}
  <footer class="review-bar" aria-label="Prototype review controls">
    <div class="switcher">
      <button aria-label="Previous layout" onclick={() => cycle(-1)}>←</button
      ><strong>{variant} · {names[index]}</strong><button
        aria-label="Next layout"
        onclick={() => cycle(1)}>→</button
      >
    </div>
    <div class="review-actions">
      <button
        onclick={() => {
          const url = new URL(page.url.href);
          url.searchParams.delete("review");
          void goto(resolve(`/app?${url.searchParams.toString()}`), {
            replace: true,
          });
        }}>Hide review controls</button
      ><button onclick={reset}>Empty state</button><button
        onclick={() => void example()}>Example chart</button
      ><button aria-pressed={long} onclick={() => (long = !long)}
        >Long details</button
      >
    </div>
    <p>
      Responsive prototype · Chart: Tropical · System controls preview placement
      only
    </p>
  </footer>
{/if}

<style>
  :global(body:has(.desktop-prototype)) {
    margin: 0;
    background: #f5f2eb;
    color: #292d38;
    font:
      15px/1.6 system-ui,
      sans-serif;
  }
  .desktop-prototype {
    max-width: none;
    margin: 0;
    padding: 0;
    height: auto;
    --line: #ded9d0;
    --accent: #644678;
    --muted: #686273;
    --ink: #292d38;
    --stage: min(100dvh - 170px, 72vw);
  }
  .desktop-prototype,
  .desktop-prototype :global(*) {
    box-sizing: border-box;
  }
  .desktop-prototype :global(button),
  dialog :global(button),
  .review-bar button {
    font: inherit;
    color: inherit;
    cursor: pointer;
  }
  .desktop-prototype :global(button:focus-visible),
  dialog :global(:focus-visible),
  .review-bar button:focus-visible {
    outline: 2px solid #644678;
    outline-offset: 4px;
  }
  :global(body:has(.desktop-prototype) ::selection) {
    background: #dfd2e8;
    color: #292d38;
  }
  .workspace {
    flex: none;
    height: 100dvh;
    padding-bottom: 72px;
    display: flex;
    flex-direction: column;
  }
  .masthead {
    height: 80px;
    flex-shrink: 0;
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
    align-items: center;
    padding: 0 32px;
    border-bottom: 1px solid var(--line);
    background: #faf8f3;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: inherit;
    text-decoration: none;
    font-weight: 650;
    white-space: nowrap;
  }
  .brand svg {
    width: 30px;
    height: 30px;
    fill: none;
    stroke: #6b5380;
    stroke-width: 1.4;
  }
  .birth-line {
    grid-column: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px 12px;
    border: 0;
    padding: 8px;
    background: transparent;
    font-size: 13px !important;
  }
  .birth-line .place {
    color: var(--muted);
  }
  .birth-line svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  .composition {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
  }
  .chart-stage {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .chart-controls {
    display: flex;
    justify-content: center;
    padding: 16px 0 0;
  }
  .controls {
    display: flex;
    gap: 7px;
    align-items: center;
  }
  .presets {
    display: flex;
    border: 1px solid #cdc3d2;
    border-radius: 30px;
    padding: 3px;
  }
  .controls button {
    border: 0;
    background: transparent;
    padding: 7px 16px;
    min-height: 36px;
    font-size: 13px;
    white-space: nowrap;
    border-radius: 24px;
  }
  .controls button:hover {
    background: #e9e1ec;
  }
  .presets button[aria-pressed="true"] {
    background: #644678;
    color: #faf8f3;
  }
  .controls .icon {
    padding: 0;
    width: 32px;
    height: 32px;
    min-height: 32px;
    border: 1px solid #cdc3d2;
  }
  .controls .more {
    border-color: transparent;
    letter-spacing: 1px;
  }
  .wheel-space {
    container-type: size;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 24px 18px;
  }
  .wheel-space :global(.wheel) {
    width: min(100cqw, 100cqh);
    max-width: none;
    margin: 0;
    flex-shrink: 0;
  }
  .wheel-space :global(.chart-root) {
    display: block;
  }
  .empty-wheel {
    width: min(100cqw, 100cqh);
    max-height: 100%;
    fill: none;
    stroke: #bdb3c3;
    stroke-width: 1;
  }
  .empty-wheel text {
    fill: #6b5380;
    stroke: none;
    font:
      24px Georgia,
      serif;
  }
  .empty-wheel .empty-caption {
    font:
      13px system-ui,
      sans-serif;
    fill: #686273;
  }
  .calculation-status {
    position: absolute;
    bottom: 0;
    width: 100%;
    text-align: center;
  }
  .reading-pane {
    background: #faf8f3;
    border-left: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .pane-content {
    flex: 1;
    min-height: 0;
    padding: 38px 30px;
    overflow-y: auto;
    scrollbar-color: #b7a8bf #faf8f3;
    scrollbar-width: thin;
  }
  h1 {
    font:
      400 38px/1.15 Georgia,
      serif;
    margin: 0 0 20px;
  }
  h2 {
    font:
      400 24px/1.2 Georgia,
      serif;
    margin: 32px 0 12px;
  }
  p {
    margin: 0 0 18px;
  }
  .intro {
    color: #644678;
    font:
      21px/1.45 Georgia,
      serif;
  }
  dl {
    border-top: 1px solid var(--line);
    margin: 26px 0;
    padding-top: 20px;
    display: grid;
    gap: 14px;
  }
  dt {
    font-size: 12px;
    color: var(--muted);
  }
  dd {
    margin: 2px 0 0;
  }
  .pane-content :global(aside) {
    position: static;
    height: auto;
    box-shadow: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
  }
  .pane-content :global(.scroll) {
    padding: 0;
    overflow: visible;
  }
  .pane-content :global(.close),
  .pane-content :global(.handle) {
    display: none;
  }
  .pane-content :global(aside h2) {
    font-size: 38px;
  }
  .pane-content :global(.context),
  .pane-content :global(.keywords),
  .pane-content :global(dt) {
    color: #686273;
  }
  .small {
    font-size: 13px;
    color: var(--muted);
    margin-top: 20px;
  }
  .house-label {
    display: grid;
    gap: 8px;
  }
  select {
    font: inherit;
    padding: 8px;
    background: #faf8f3;
    border: 1px solid var(--line);
  }
  .tables {
    padding: 35px 5vw 100px;
    border-top: 1px solid var(--line);
  }
  .tables nav {
    display: flex;
    gap: 30px;
    margin-bottom: 24px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    text-align: left;
  }
  th,
  td {
    border-bottom: 1px solid var(--line);
    padding: 10px;
    font-variant-numeric: tabular-nums;
  }
  /* Selected desktop direction: the rail spans chart and tables. */
  [data-variant="A"] {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-rows: 80px calc(100dvh - 80px) auto;
  }
  [data-variant="A"] .workspace,
  [data-variant="A"] .composition {
    display: contents;
  }
  [data-variant="A"] .masthead {
    grid-column: 1 / -1;
    grid-row: 1;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  [data-variant="A"] .chart-stage {
    grid-column: 1;
    grid-row: 2;
  }
  [data-variant="A"] .chart-controls .controls {
    position: relative;
  }
  [data-variant="A"] .presets {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  [data-variant="A"] .chart-controls .icon {
    position: absolute;
    left: calc(100% + 7px);
  }
  [data-variant="A"] .chart-controls .more {
    left: calc(100% + 46px);
  }
  [data-variant="A"] .reading-pane {
    grid-column: 2;
    grid-row: 2 / span 2;
    position: sticky;
    top: 80px;
    height: calc(100dvh - 80px);
    align-self: start;
  }
  [data-variant="A"] .tables {
    grid-column: 1;
    grid-row: 3;
  }
  dialog {
    width: min(540px, calc(100vw - 40px));
    max-height: 85dvh;
    overflow: auto;
    padding: 36px;
    border: 0;
    border-radius: 16px;
    background: #faf8f3;
    color: #292d38;
    box-shadow: 0 18px 70px #292d3830;
    font:
      15px/1.6 system-ui,
      sans-serif;
  }
  dialog::backdrop {
    background: #f5f2eb38;
  }
  dialog h2 {
    font:
      30px/1.15 Georgia,
      serif;
    margin: 0 0 16px;
  }
  dialog :global(textarea) {
    background: #fffdf8;
    color: #292d38;
    border-color: #c9becf;
    caret-color: #644678;
  }
  dialog :global(.primary) {
    background: #644678;
  }
  .example {
    background: none;
    border: 0;
    color: #644678 !important;
    text-decoration: underline;
    text-underline-offset: 4px;
    margin-top: 14px;
    padding: 0;
  }
  .review-bar {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
    width: max-content;
    max-width: calc(100vw - 24px);
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    column-gap: 24px;
    padding: 8px 15px;
    border-radius: 12px;
    background: #292d38;
    color: #faf8f3;
    box-shadow: 0 5px 20px #292d3830;
    font:
      12px/1.4 system-ui,
      sans-serif;
  }
  .switcher {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .switcher strong {
    min-width: 168px;
    text-align: center;
  }
  .review-bar button {
    border: 0;
    background: transparent;
    color: inherit;
    padding: 5px 8px;
    border-radius: 6px;
  }
  .review-bar button:hover,
  .review-bar button[aria-pressed="true"] {
    background: #555464;
  }
  .review-actions {
    display: flex;
    gap: 4px;
  }
  .review-bar p {
    grid-column: 1/-1;
    text-align: center;
    margin: 5px 0 0;
    font-size: 10px;
    color: #d8cfe0;
  }
  .sheet-toolbar {
    display: none;
  }
  .wheel-space :global(.mobile-wheel) {
    width: min(100cqw, 100cqh);
  }
  .wheel-space :global(.mobile-wheel .wheel) {
    width: 100%;
  }
  @media (max-width: 1119px) {
    [data-variant="A"] {
      grid-template-columns: minmax(0, 1fr);
    }
    .brand span {
      display: none;
    }
    .masthead {
      grid-template-columns: 44px minmax(0, 1fr) 44px;
      padding: 0 16px;
    }
    [data-variant="A"] .reading-pane {
      display: none;
      position: fixed;
      z-index: 5;
      top: 80px;
      right: 0;
      width: 360px;
      height: calc(100dvh - 80px);
      box-shadow: -10px 12px 40px #292d3820;
    }
    [data-open="true"] .reading-pane {
      display: flex;
    }
    [data-sheet="A"] .reading-pane {
      top: 104px;
      height: calc(100dvh - 128px);
    }
    [data-sheet="C"] .reading-pane {
      top: auto;
      bottom: 24px;
      height: 46dvh;
      width: 320px;
    }
    [data-expanded="true"] .reading-pane {
      top: 80px;
      bottom: 0;
      height: calc(100dvh - 80px);
    }
    .sheet-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border-bottom: 1px solid var(--line);
      padding: 6px 12px;
      touch-action: none;
    }
    .sheet-toolbar button {
      min-height: 44px;
      min-width: 44px;
      border: 0;
      color: var(--accent);
      background: transparent;
    }
    .sheet-toolbar span {
      font-size: 13px;
      color: var(--muted);
    }
    .pane-content {
      padding: 24px;
      overscroll-behavior: contain;
    }
    [data-variant="A"] .tables {
      grid-column: 1/-1;
    }
    .review-bar {
      max-width: calc(100vw - 24px);
    }
  }
  @media (max-width: 799px) {
    [data-variant="A"] {
      grid-template-rows: 80px max(calc(100dvh - 80px), 640px) auto;
    }
    .birth-line {
      gap: 2px 6px;
      line-height: 1.4;
    }
    .birth-line .place {
      flex-basis: 100%;
      font-size: 11px;
    }
    .chart-controls {
      padding: 16px 12px 0;
    }
    [data-variant="A"] .chart-controls .controls {
      width: 100%;
      justify-content: center;
      gap: 4px;
    }
    [data-variant="A"] .chart-controls .icon {
      position: static;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .controls button {
      padding: 7px 10px;
      min-height: 44px;
      font-size: 12px;
    }
    .presets {
      flex: 1;
      max-width: 320px;
    }
    .wheel-space {
      container-type: normal;
      align-items: flex-start;
      padding: 0 12px;
    }
    .wheel-space :global(.mobile-wheel) {
      width: 100%;
    }
    .wheel-space :global(.mobile-wheel .controls) {
      font-size: 12px;
    }
    .wheel-space :global(.mobile-wheel button) {
      background: #faf8f3;
      color: #644678;
      border: 1px solid #cdc3d2;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .wheel-space :global(.mobile-wheel button.zoom-icon) {
      border: 0;
      background: transparent;
      padding: 10px;
    }
    .empty-wheel {
      width: 100%;
    }
    [data-variant="A"][data-open="true"] .reading-pane {
      top: auto;
      bottom: 0;
      right: 0;
      width: 100%;
      height: 40dvh;
      border-left: 0;
      border-top: 1px solid var(--line);
      box-shadow: 0 -10px 40px #292d3820;
      padding-bottom: env(safe-area-inset-bottom);
    }
    [data-sheet="B"][data-open="true"] .reading-pane {
      height: 72dvh;
    }
    [data-sheet="C"][data-open="true"] .reading-pane {
      height: 27dvh;
    }
    [data-variant="A"][data-expanded="true"][data-open="true"] .reading-pane {
      height: 78dvh;
    }
    .pane-content {
      padding: 20px 24px;
    }
    .tables {
      padding: 24px 16px 140px;
      overflow-x: auto;
    }
    .tables nav {
      gap: 20px;
      font-size: 13px;
    }
    .review-bar {
      width: calc(100vw - 24px);
      grid-template-columns: 1fr;
      justify-items: center;
      z-index: 6;
      bottom: 8px;
    }
    .review-bar p {
      display: none;
    }
    .review-actions button {
      font-size: 11px;
    }
    dialog {
      padding: 24px;
      width: calc(100vw - 24px);
      max-height: 90dvh;
    }
  }
  .sheet-toolbar {
    position: relative;
    padding: 0;
    border: 0;
    flex-shrink: 0;
  }
  .sheet-toolbar .resize-handle {
    flex: 1;
    height: 36px;
    min-height: 36px;
    border: 0;
    border-radius: 0;
    touch-action: none;
    cursor: ns-resize;
    display: grid;
    place-items: center;
  }
  .sheet-toolbar .resize-handle span {
    display: block;
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: #b7a8bf;
  }
  .sheet-toolbar .sheet-close {
    position: absolute;
    right: 4px;
    top: 0;
    width: 36px;
    min-width: 36px;
    min-height: 36px;
    padding: 10px;
  }
  .sheet-close svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
  }
  @media (max-width: 799px) {
    .reading-pane {
      --sheet-entry: 0 100%;
    }
  }
  @media (prefers-reduced-motion: no-preference) {
    .reading-pane {
      animation: reveal 160ms ease-out;
    }
    @keyframes reveal {
      from {
        opacity: 0.6;
        translate: var(--sheet-entry, 100% 0);
      }
    }
  }
</style>
