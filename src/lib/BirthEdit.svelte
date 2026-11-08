<script lang="ts">
  import { birthDateLabel, birthTimeLabel } from "./birth-display";
  import { onMount, untrack } from "svelte";
  import { birthSchema } from "./domain";
  import type { resolveBirth } from "./server/birth/resolve";
  type Birth = ReturnType<typeof birthSchema.parse>;
  type Resolution = Awaited<ReturnType<typeof resolveBirth>>;
  let {
    birth,
    resolve,
    onclose,
    onstart = () => {},
  }: {
    birth: Birth | null;
    resolve: (input: {
      sentence: string;
      dateKey?: string;
      locationKey?: string;
      timeKey?: string;
    }) => Promise<Resolution>;
    onclose: (birth: Birth | null) => void;
    onstart?: () => void;
  } = $props();
  let ready = $state(false);
  const initialBirth = untrack(() => birth);
  const initial = initialBirth
    ? `${initialBirth.localDate} at ${initialBirth.localTime} in ${initialBirth.place.label}`
    : "";
  let sentence = $state(initial),
    result = $state<Resolution | null>(
      initialBirth
        ? {
            kind: "resolved",
            birth: initialBirth,
            digest: "",
          }
        : null,
    ),
    busy = $state(false);
  let dateKey = $state<string | undefined>(),
    locationKey = $state<string | undefined>(),
    timeKey = $state<string | undefined>();
  let serial = 0,
    timer: ReturnType<typeof setTimeout>;
  let closing = false;
  onMount(() => {
    ready = true;
    return () => {
      clearTimeout(timer);
      serial++;
    };
  });
  async function run() {
    clearTimeout(timer);
    const version = ++serial;
    if (!sentence.trim()) {
      result = null;
      busy = false;
      return null;
    }
    busy = true;
    try {
      const next = await resolve({
        sentence,
        ...(dateKey ? { dateKey } : {}),
        ...(locationKey ? { locationKey } : {}),
        ...(timeKey ? { timeKey } : {}),
      });
      if (version !== serial) return null;
      result = next;
      return next;
    } catch {
      if (version === serial)
        result = {
          kind: "error",
          code: "TEMPORARY_FAILURE",
          message: "Unable to resolve birth details. Please try again.",
          retryable: true,
        } as Resolution;
      return null;
    } finally {
      if (version === serial) busy = false;
    }
  }
  function changed() {
    onstart();
    serial++;
    result = null;
    dateKey = undefined;
    locationKey = undefined;
    timeKey = undefined;
    busy = true;
    clearTimeout(timer);
    timer = setTimeout(() => void run(), 350);
  }
  function choose(key: "date" | "location" | "time", value: string) {
    if (key === "date") dateKey = value;
    if (key === "location") locationKey = value;
    if (key === "time") timeKey = value;
    void run();
  }
  async function close() {
    if (closing) return;
    closing = true;
    const resolved =
      !busy && result?.kind === "resolved" ? result : await run();
    onclose(resolved?.kind === "resolved" ? resolved.birth : null);
    closing = false;
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape" && birth) {
      event.preventDefault();
      void close();
    }
  }}
/>

<section>
  <div>
    <label class="field"
      >Birth details
      <textarea
        id="birth-input"
        disabled={!ready}
        {@attach (node) => {
          if (initialBirth) node.focus();
        }}
        bind:value={sentence}
        oninput={changed}
        rows="3"
        placeholder="June 21, 2000 at 1pm in London"></textarea></label
    >
    <div class="chips" aria-live="polite">
      {#if result?.kind === "resolved"}<span class="confirmed"
          >{birthDateLabel(result.birth.localDate)}</span
        ><span class="confirmed">{birthTimeLabel(result.birth.localTime)}</span
        ><span class="confirmed">{result.birth.place.label}</span><span
          class="confirmed">{result.birth.timezone}</span
        >
      {:else if result?.kind === "needs_input"}<span
          class={{ confirmed: result.dates.some((d) => d.valid) }}
          >{result.dates.find((d) => d.valid)?.label ?? "Date needed"}</span
        ><span class={{ confirmed: result.dates.some((d) => d.hasTime) }}>
          {result.dates.some((d) => d.hasTime)
            ? "Time provided"
            : "Birth time needed"}</span
        ><span class={{ confirmed: result.locations.length > 0 }}
          >{result.locations.length ? "Place found" : "Birthplace needed"}</span
        >
      {:else}<span>Date needed</span><span>Birth time needed</span><span
          >Birthplace needed</span
        >{/if}
    </div>
    {#if busy}<p role="status">Resolving birth details…</p>{/if}
    {#if result && result.kind !== "resolved"}<p class="warning" role="status">
        {result.message}
      </p>{/if}
    {#if result?.kind === "error" && result.retryable}<button
        onclick={() => void run()}>Retry</button
      >{/if}
    {#if result?.kind === "needs_input"}
      {#if result.dates.filter((d) => d.valid).length > 1}<fieldset><legend>Choose
      a date</legend>{#each result.dates.filter((d) => d.valid) as date (date.key)}<button
              aria-pressed={dateKey === date.key}
              onclick={() => choose("date", date.key)}>{date.label}</button
            >{/each}</fieldset>{/if}
      {#if result.locations.length > 1}<fieldset><legend>Choose a birthplace</legend>{#each result.locations as place (place.key)}<button
              aria-pressed={locationKey === place.key}
              onclick={() => choose("location", place.key)}>{place.city}, {place.region},
              {place.country}</button
            >{/each}</fieldset>{/if}
      {#if result.timeChoices}<fieldset><legend>Choose the recorded offset</legend>{#each result.timeChoices as time (time.key)}<button
              aria-pressed={timeKey === time.key}
              onclick={() => choose("time", time.key)}>{time.label}</button
            >{/each}</fieldset>{/if}
    {/if}
  </div>
  <p class="field-hint">
    Complete edits apply on Apply or close. Incomplete edits are discarded on
    close.
  </p>
  <div class="actions">
    <button
      class="primary"
      disabled={busy || result?.kind !== "resolved"}
      onclick={() => void close()}>Apply</button
    >
    {#if birth}<button onclick={() => void close()}>Close</button>{/if}
  </div>
</section>

<style>
  fieldset button {
    margin: 4px;
  }
  fieldset button[aria-pressed="true"] {
    border-color: #7aa4e8;
    background: #eff5ff;
    color: #214f9e;
  }
</style>
