<script lang="ts">
  import { birthDateLabel, birthTimeLabel } from "./birth-display";
  import { onMount, tick, untrack, type Snippet } from "svelte";
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
    onresolve,
    onstart = () => {},
    closable,
    ondone,
    status,
  }: {
    /** Prefill; read once when the editor mounts. */
    birth: Birth | null;
    resolve: (input: {
      sentence: string;
      dateKey?: string;
      locationKey?: string;
      timeKey?: string;
    }) => Promise<Resolution>;
    /** Each complete resolution of the current text (the live preview). */
    onresolve: (birth: Birth) => void;
    onstart?: () => void;
    /** Whether Done may close the editor; it also waits for pending parses. */
    closable: boolean;
    ondone: () => void;
    /** Calculation status, rendered above Done. */
    status?: Snippet;
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
    busy = $state(false),
    // The text changed since the last result: its choices no longer apply.
    stale = $state(false);
  let dateKey = $state<string | undefined>(),
    locationKey = $state<string | undefined>(),
    timeKey = $state<string | undefined>();
  let serial = 0,
    timer: ReturnType<typeof setTimeout>;
  let field = $state<HTMLTextAreaElement>();
  onMount(() => {
    ready = true;
    // After the update that enables the field (and the dialog has opened),
    // focus it with the caret after any prefill.
    void tick().then(() => {
      if (!field) return;
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
      field.scrollTop = field.scrollHeight;
    });
    // Unmounting drops a pending parse: its result can no longer apply.
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
      busy = stale = false;
      return;
    }
    busy = true;
    try {
      const next = await resolve({
        sentence,
        ...(dateKey ? { dateKey } : {}),
        ...(locationKey ? { locationKey } : {}),
        ...(timeKey ? { timeKey } : {}),
      });
      if (version !== serial) return;
      result = next;
      if (next.kind === "resolved") onresolve(next.birth);
    } catch {
      if (version === serial)
        result = { kind: "error", code: "TEMPORARY_FAILURE", retryable: true };
    } finally {
      if (version === serial) busy = stale = false;
    }
  }
  function changed() {
    onstart();
    serial++;
    // Feedback from the last parse stays until the next result replaces it.
    stale = true;
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
</script>

<section>
  <div>
    <label class="field"
      >{t("birth.input.label")}
      <textarea
        id="birth-input"
        disabled={!ready}
        bind:this={field}
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
              disabled={stale}
              onclick={() => choose("date", date.key)}>{date.label}</button
            >{/each}
        </fieldset>{/if}
      {#if result.locations.length > 1}<fieldset>
          <legend>{t("birth.choice.place")}</legend
          >{#each result.locations as place (place.key)}<button
              aria-pressed={locationKey === place.key}
              disabled={stale}
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
              disabled={stale}
              onclick={() => choose("time", time.key)}>{time.label}</button
            >{/each}
        </fieldset>{/if}
    {/if}
  </div>
  {@render status?.()}
  <div class="actions">
    <button
      class="primary done"
      disabled={busy || !closable}
      aria-busy={busy}
      onclick={ondone}
      >{#if busy}<span class="spinner" aria-hidden="true"></span>{/if}{t(
        "birth.action.done",
      )}</button
    >
  </div>
</section>

<style>
  .done {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation-duration: 2.4s;
    }
  }
  fieldset button {
    margin: 4px;
  }
  fieldset button[aria-pressed="true"] {
    border-color: var(--accent);
    background: var(--accent-wash);
    color: var(--accent);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
  [role="status"]:not(.warning) {
    margin: 8px 0;
    color: var(--muted);
    font-size: 13px;
  }
</style>
