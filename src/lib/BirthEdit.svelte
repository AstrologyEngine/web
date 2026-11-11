<script lang="ts">
  import { birthDateLabel, birthTimeLabel } from "./birth-display";
  import { onMount, untrack } from "svelte";
  import { birthSchema } from "./domain";
  import type { resolveBirth } from "./server/birth/resolve";
  import { t } from "./copy/index.svelte";
  import { resolverMessageKey, type ResolverCode } from "./messages";
  type Birth = ReturnType<typeof birthSchema.parse>;
  type Resolution =
    | Awaited<ReturnType<typeof resolveBirth>>
    | { kind: "error"; code: ResolverCode; retryable: boolean };
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
  // Input for the English sentence parser, not display copy.
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
        result = { kind: "error", code: "TEMPORARY_FAILURE", retryable: true };
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
      >{t("birth.input.label")}
      <textarea
        id="birth-input"
        disabled={!ready}
        {@attach (node) => {
          if (initialBirth) node.focus();
        }}
        bind:value={sentence}
        oninput={changed}
        rows="3"
        placeholder={t("birth.input.placeholder")}></textarea></label
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
          >{result.dates.find((d) => d.valid)?.label ??
            t("birth.chip.dateNeeded")}</span
        ><span class={{ confirmed: result.dates.some((d) => d.hasTime) }}>
          {result.dates.some((d) => d.hasTime)
            ? t("birth.chip.timeProvided")
            : t("birth.chip.timeNeeded")}</span
        ><span class={{ confirmed: result.locations.length > 0 }}
          >{result.locations.length
            ? t("birth.chip.placeFound")
            : t("birth.chip.placeNeeded")}</span
        >
      {:else}<span>{t("birth.chip.dateNeeded")}</span><span
          >{t("birth.chip.timeNeeded")}</span
        ><span>{t("birth.chip.placeNeeded")}</span>{/if}
    </div>
    {#if busy}<p role="status">{t("birth.status.resolving")}</p>{/if}
    {#if result && result.kind !== "resolved"}<p class="warning" role="status">
        {t(resolverMessageKey(result.code))}
      </p>{/if}
    {#if result?.kind === "error" && result.retryable}<button
        onclick={() => void run()}>{t("birth.action.retry")}</button
      >{/if}
    {#if result?.kind === "needs_input"}
      {#if result.dates.filter((d) => d.valid).length > 1}<fieldset>
          <legend>{t("birth.choice.date")}</legend
          >{#each result.dates.filter((d) => d.valid) as date (date.key)}<button
              aria-pressed={dateKey === date.key}
              onclick={() => choose("date", date.key)}>{date.label}</button
            >{/each}
        </fieldset>{/if}
      {#if result.locations.length > 1}<fieldset>
          <legend>{t("birth.choice.place")}</legend
          >{#each result.locations as place (place.key)}<button
              aria-pressed={locationKey === place.key}
              onclick={() => choose("location", place.key)}
              >{t("birth.choice.placeOption", {
                city: place.city,
                region: place.region,
                country: place.country,
              })}</button
            >{/each}
        </fieldset>{/if}
      {#if result.timeChoices}<fieldset>
          <legend>{t("birth.choice.offset")}</legend
          >{#each result.timeChoices as time (time.key)}<button
              aria-pressed={timeKey === time.key}
              onclick={() => choose("time", time.key)}>{time.label}</button
            >{/each}
        </fieldset>{/if}
    {/if}
  </div>
  <p class="field-hint">{t("birth.edit.hint")}</p>
  <div class="actions">
    <button
      class="primary"
      disabled={busy || result?.kind !== "resolved"}
      onclick={() => void close()}>{t("birth.action.apply")}</button
    >
    {#if birth}<button onclick={() => void close()}
        >{t("birth.action.close")}</button
      >{/if}
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
