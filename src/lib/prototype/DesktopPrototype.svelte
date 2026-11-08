<script lang="ts">
  // Throwaway: three desktop compositions on /app?variant=A|B|C. Ticket 35.
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
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
  const names = ["Chart toolbar", "Reading rail", "Lower control dock"];
  const systems = ["Tropical", "Vedic", "True Sky"];
  let variant = $derived(
    variants.includes(page.url.searchParams.get("variant") ?? "")
      ? page.url.searchParams.get("variant")!
      : "A",
  );
  let index = $derived(variants.indexOf(variant));
  let reviewing = $derived(page.url.searchParams.get("review") === "1");
  let birth = $state<Birth | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  let editing = $state(true);
  let busy = $state(false);
  let error = $state("");
  let system = $state("Tropical");
  let advanced = $state(false);
  let long = $state(false);
  let selection = $state<Selection | null>(null);
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
<svelte:head><title>Desktop layout review | Astrology Engine</title></svelte:head>

{#snippet controls()}
  <div class="controls" aria-label="Zodiac system controls">
    <div class="presets" role="group" aria-label="Zodiac system">
      {#each systems as label (label)}
        <button
          aria-pressed={system === label}
          onclick={() => {
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
      onclick={() => {
        selection = null;
        advanced = false;
      }}>?</button
    >
    <button
      class="icon more"
      title="Advanced"
      aria-label="Advanced"
      aria-expanded={advanced}
      onclick={() => {
        advanced = !advanced;
        selection = null;
      }}>•••</button
    >
  </div>
{/snippet}

<main class="desktop-prototype" data-variant={variant}>
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
        {#if variant !== "B"}<div class="chart-controls">
            {@render controls()}
          </div>{/if}
        <div class="wheel-space">
          {#if chart && astrology}
            <Wheel
              {chart}
              {astrology}
              selectedBody={body?.name ?? null}
              selectedSign={selection?.kind === "sign" ? selection.name : null}
              selectedHouse={selection?.kind === "house"
                ? selection.number
                : null}
              selectedAngle={selection?.kind === "angle"
                ? selection.name
                : null}
              onselect={(name) => (selection = { kind: "body", name })}
              onselectSign={(name) => (selection = { kind: "sign", name })}
              onselectHouse={(number) =>
                (selection = { kind: "house", number })}
              onselectAngle={(name) => (selection = { kind: "angle", name })}
              onblank={() => (selection = null)}
            />
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
      <aside class="reading-pane" aria-label="Chart explanation">
        {#if variant === "B"}<div class="rail-controls">
            {@render controls()}
          </div>{/if}
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
      <button onclick={reset}>Empty state</button><button
        onclick={() => void example()}>Example chart</button
      ><button aria-pressed={long} onclick={() => (long = !long)}
        >Long details</button
      >
    </div>
    <p>
      Desktop prototype · Chart: Tropical · System controls preview placement
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
  [data-variant="B"] {
    --stage: min(100dvh - 160px, 70vw);
  }
  [data-variant="B"] .composition {
    grid-template-columns: minmax(0, 1fr) 400px;
  }
  [data-variant="B"] .reading-pane {
    margin: 24px 24px 24px 0;
    border: 1px solid var(--line);
    border-radius: 16px;
  }
  .rail-controls {
    padding: 20px 16px;
    border-bottom: 1px solid var(--line);
  }
  .rail-controls .controls {
    justify-content: center;
    gap: 3px;
  }
  .rail-controls .controls button {
    padding: 7px 12px;
  }
  .rail-controls .controls .icon {
    padding: 0;
  }
  [data-variant="B"] .pane-content {
    padding-top: 28px;
  }
  [data-variant="C"] {
    --stage: min(100dvh - 184px, 68vw);
  }
  [data-variant="C"] .composition {
    grid-template-columns: minmax(0, 1fr) 30%;
  }
  [data-variant="C"] .chart-controls {
    order: 2;
    padding: 10px 0 18px;
  }
  [data-variant="C"] .reading-pane {
    background: transparent;
  }
  [data-variant="C"] .pane-content {
    padding: 48px 42px;
  }
  [data-variant="C"] .masthead {
    border-bottom: 0;
    background: transparent;
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
  @media (max-width: 1050px) {
    [data-variant="A"] {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
    .masthead {
      padding: 0 20px;
      grid-template-columns: 1fr 2fr;
    }
    .composition,
    [data-variant="B"] .composition,
    [data-variant="C"] .composition {
      grid-template-columns: minmax(0, 1fr) 320px;
    }
    .brand span {
      font-size: 13px;
    }
    .pane-content,
    [data-variant="C"] .pane-content {
      padding: 24px;
    }
    .rail-controls {
      padding: 16px 8px;
    }
    .rail-controls .controls button {
      padding: 7px 8px;
    }
  }
  @media (max-width: 799px) {
    .desktop-prototype {
      min-width: 960px;
    }
    .review-bar {
      width: calc(100vw - 24px);
      grid-template-columns: 1fr;
      justify-items: center;
    }
    .review-bar p {
      max-width: 70ch;
    }
  }
</style>
