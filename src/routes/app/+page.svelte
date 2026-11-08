<script lang="ts">
  import { onMount, tick } from "svelte";
  import BirthEdit from "../../lib/BirthEdit.svelte";
  import Wheel from "../../lib/Wheel.svelte";
  import { birthSchema, initialSettings } from "../../lib/domain";
  import { snapshotSchema } from "../../lib/calculation/snapshot";
  import type { Snapshot } from "../../lib/calculation/snapshot";
  import type { resolveBirth } from "../../lib/server/birth/resolve";
  import { z } from "zod";
  import "../../lib/prototype.css";
  type Birth = z.infer<typeof birthSchema>;
  type Resolution = Awaited<ReturnType<typeof resolveBirth>>;
  const resolutionSchema = z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("resolved"),
      birth: birthSchema,
      digest: z.string().regex(/^[0-9a-f]{64}$/),
    }),
    z.object({
      kind: z.literal("error"),
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    }),
    z
      .object({
        kind: z.literal("needs_input"),
        message: z.string(),
        locationQuery: z.string(),
        dates: z.array(
          z
            .object({
              key: z.string(),
              label: z.string(),
              valid: z.boolean(),
              hasTime: z.boolean(),
              wallClock: z
                .object({
                  year: z.number(),
                  month: z.number(),
                  day: z.number(),
                  hour: z.number().optional(),
                  minute: z.number().optional(),
                  second: z.number().optional(),
                })
                .passthrough(),
              order: z.string(),
            })
            .passthrough(),
        ),
        locations: z.array(
          z
            .object({
              key: z.string(),
              city: z.string(),
              region: z.string(),
              country: z.string(),
            })
            .passthrough(),
        ),
        timeChoices: z
          .array(z.object({ key: z.string(), label: z.string() }))
          .optional(),
      })
      .passthrough(),
  ]);
  let birth = $state<Birth | null>(null);
  let snapshot = $state<Snapshot | null>(null);
  let editing = $state(true);
  let loading = $state(false);
  let error = $state("");
  let editButton = $state<HTMLButtonElement>();
  let generation = 0;
  let worker: Worker | undefined;
  let timeout: ReturnType<typeof setTimeout>;
  const makeWorker = () => {
    const instance = new Worker("/calculation-worker.js", { type: "module" });
    instance.onmessage = (event) => {
      if (worker !== instance || event.data?.generation !== generation) return;
      clearTimeout(timeout);
      const result = event.data?.result;
      const parsed = result?.ok && snapshotSchema.safeParse(result.snapshot);
      if (parsed && parsed.success && parsed.data.generation === generation) {
        snapshot = parsed.data;
        error = "";
      } else {
        error =
          typeof result?.message === "string"
            ? result.message
            : "Calculation failed. Please retry.";
        if (result?.retryWorker) {
          instance.terminate();
          worker = undefined;
        }
      }
      loading = false;
    };
    instance.onerror = () => {
      if (worker !== instance) return;
      instance.terminate();
      worker = undefined;
      clearTimeout(timeout);
      loading = false;
      error = "Calculation could not start. Please retry.";
    };
    return instance;
  };
  const calculate = (value: Birth) => {
    generation++;
    loading = true;
    error = "";
    clearTimeout(timeout);
    try {
      worker ??= makeWorker();
      worker.postMessage({
        generation,
        birth: birthSchema.parse(value),
        settings: initialSettings,
      });
      timeout = setTimeout(() => {
        worker?.terminate();
        worker = undefined;
        loading = false;
        error = "Calculation took too long. Please retry.";
      }, 30000);
    } catch {
      worker?.terminate();
      worker = undefined;
      loading = false;
      error = "Calculation could not start. Please retry.";
    }
  };
  onMount(() => () => {
    generation++;
    clearTimeout(timeout);
    worker?.terminate();
  });
  async function resolve(input: {
    sentence: string;
    dateKey?: string;
    locationKey?: string;
    timeKey?: string;
  }): Promise<Resolution> {
    const response = await fetch("/api/resolve-birth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    const data: unknown = await response.json();
    const validated = resolutionSchema.safeParse(data);
    if (!validated.success) throw Error("Invalid response");
    return data as Resolution;
  }
  async function accept(next: Birth | null) {
    if (next) {
      birth = next;
      editing = false;
      calculate(next);
    } else if (birth) editing = false;
    if (!editing) {
      await tick();
      editButton?.focus();
    }
  }
</script>

<svelte:head><title>Your chart | Astrology Engine</title></svelte:head>
<main>
  <header><span>✳</span> Astrology Engine <small>BETA</small></header>
  <section class="entry">
    <p class="eyebrow">YOUR NATAL CHART</p>
    <h1>{birth ? "Your birth chart" : "Start with your birth details"}</h1>
    {#if editing}<BirthEdit {birth} {resolve} onclose={accept} />{:else}
      <p>{birth?.localDate} at {birth?.localTime} in {birth?.place.label}</p>
      <button bind:this={editButton} onclick={() => (editing = true)}
        >Edit birth details</button
      >
    {/if}
  </section>
  {#if loading}<p role="status">
      Calculating your chart…{snapshot ? " Showing your previous chart." : ""}
    </p>{/if}
  {#if error}
    <p role="alert">{error}</p>
    <button onclick={() => birth && calculate(birth)}>Retry calculation</button>
  {/if}
  {#if snapshot && birth && (snapshot.birth.utc !== birth.utc || snapshot.birth.place.id !== birth.place.id)}<p
      role="status"
    >
      Showing the previous chart for {snapshot.birth.localDate} at {snapshot.birth
        .localTime}
      in {snapshot.birth.place.label}.
    </p>{/if}
  {#if snapshot?.systems.astrology}
    {#if snapshot.systems.astrology.selectedFrame.requested_house_system !== snapshot.systems.astrology.selectedFrame.house_system}<p>
        House system adjusted to {snapshot.systems.astrology.selectedFrame
          .house_system}.
      </p>{/if}
    <Wheel
      chart={snapshot.systems.astrology.selectedFrame}
      astrology={snapshot.systems.astrology}
    />
  {/if}
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f8f6f0;
    color: #1f1f1f;
    font-family: system-ui, sans-serif;
  }
  main {
    max-width: 1100px;
    margin: auto;
    padding: 2rem clamp(1.4rem, 6vw, 5rem);
  }
  header {
    font:
      1.25rem Georgia,
      serif;
    margin-bottom: 3rem;
  }
  header span {
    color: #b6503d;
  }
  small {
    font: 600 0.65rem system-ui;
    letter-spacing: 0.15em;
  }
  .entry {
    max-width: 720px;
  }
  .eyebrow {
    color: #a04938;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.15em;
  }
  h1 {
    font:
      400 clamp(2.5rem, 5vw, 4rem)/1.05 Georgia,
      serif;
    letter-spacing: -0.04em;
  }
</style>
