<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createMeasurement,
    type Measurement,
  } from "../../lib/measurement/client";
  import AppMasthead from "../../lib/AppMasthead.svelte";
  import BirthModal from "../../lib/BirthModal.svelte";
  import CalculationStatus from "../../lib/CalculationStatus.svelte";
  import Explorer from "../../lib/Explorer.svelte";
  import SettingsControls from "../../lib/SettingsControls.svelte";
  import SystemOverview from "../../lib/SystemOverview.svelte";
  import { matchPreset, type Settings } from "../../lib/settings";
  import { birthSchema, initialSettings } from "../../lib/domain";
  import { snapshotSchema } from "../../lib/calculation/snapshot";
  import type { Snapshot } from "../../lib/calculation/snapshot";
  import type { resolveBirth } from "../../lib/server/birth/resolve";
  import { z } from "zod";
  import { t } from "../../lib/copy/index.svelte";
  import { calculationCode, type CalculationCode } from "../../lib/messages";
  import { housesLabel } from "../../lib/labels";
  import "../../lib/app.css";
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
      retryable: z.boolean(),
    }),
    z
      .object({
        kind: z.literal("needs_input"),
        code: z.string(),
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
  let measurement = $state<Measurement | null>(null);
  let birth = $state<Birth | null>(null);
  let settings = $state<Settings>(initialSettings);
  let snapshot = $state<Snapshot | null>(null);
  // The birth modal opens on arrival. It may close once a chart has rendered.
  let modalOpen = $state(true);
  let closable = $derived(!!snapshot?.systems.astrology);
  let loading = $state(false);
  let error = $state<CalculationCode | null>(null);
  let masthead = $state<AppMasthead>();
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
      if (
        parsed &&
        parsed.success &&
        parsed.data.generation === generation &&
        JSON.stringify(parsed.data.birth) ===
          JSON.stringify($state.snapshot(birth)) &&
        JSON.stringify(parsed.data.requestedSettings) ===
          JSON.stringify($state.snapshot(settings))
      ) {
        snapshot = parsed.data;
        measurement?.chart(matchPreset(parsed.data.requestedSettings));
        error = null;
      } else {
        measurement?.fail("calculation", "failed");
        error = calculationCode(result?.code);
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
      measurement?.fail("calculation", "unavailable");
      error = "NOT_STARTED";
    };
    return instance;
  };
  const calculate = (value: Birth) => {
    generation++;
    loading = true;
    error = null;
    clearTimeout(timeout);
    try {
      worker ??= makeWorker();
      worker.postMessage({
        generation,
        birth: birthSchema.parse(value),
        settings: $state.snapshot(settings),
      });
      timeout = setTimeout(() => {
        worker?.terminate();
        worker = undefined;
        loading = false;
        measurement?.fail("calculation", "timeout");
        error = "TIMEOUT";
      }, 30000);
    } catch {
      worker?.terminate();
      worker = undefined;
      loading = false;
      measurement?.fail("calculation", "unavailable");
      error = "NOT_STARTED";
    }
  };
  onMount(() => {
    measurement = createMeasurement();
    return () => {
      generation++;
      clearTimeout(timeout);
      worker?.terminate();
    };
  });
  async function resolve(input: {
    sentence: string;
    dateKey?: string;
    locationKey?: string;
    timeKey?: string;
  }): Promise<Resolution> {
    let data: unknown;
    try {
      const response = await fetch("/api/resolve-birth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      data = await response.json();
    } catch {
      measurement?.fail("resolver", "unavailable");
      throw Error("Resolver unavailable");
    }
    const validated = resolutionSchema.safeParse(data);
    if (!validated.success) {
      measurement?.fail("resolver", "invalid");
      throw Error("Invalid response");
    }
    if (validated.data.kind === "error")
      measurement?.fail("resolver", "failed");
    return data as Resolution;
  }
  function applySettings(next: Settings) {
    const changed =
      JSON.stringify($state.snapshot(settings)) !== JSON.stringify(next);
    settings = next;
    if (changed && birth) calculate(birth);
  }
  // Live preview: each complete resolution of the modal's text recalculates.
  function preview(next: Birth) {
    if (JSON.stringify(next) === JSON.stringify($state.snapshot(birth))) return;
    measurement?.complete();
    birth = next;
    calculate(next);
  }
  async function closeModal() {
    modalOpen = false;
    await tick();
    masthead?.focusBirth();
  }
</script>

<svelte:head><title>{t("app.meta.title")}</title></svelte:head>
{#snippet status()}<CalculationStatus
    {snapshot}
    {settings}
    {loading}
    {error}
    onretry={() => birth && calculate(birth)}
  />{/snippet}
{#snippet controls(showOverview: () => void)}<SettingsControls
    requested={settings}
    accepted={snapshot?.requestedSettings ?? settings}
    pending={loading}
    onapply={applySettings}
    onhelp={showOverview}
    {measurement}
  />{/snippet}
{#snippet overview()}<SystemOverview
    settings={snapshot?.requestedSettings ?? settings}
    houses={snapshot?.systems.astrology?.selectedFrame.house_system ??
      t(housesLabel[settings.houses])}
  />{/snippet}
<div class="app-shell">
  <AppMasthead bind:this={masthead} {birth} onedit={() => (modalOpen = true)} />
  <main>
    <h1 class="sr-only">{t("app.entry.headingWithBirth")}</h1>
    <Explorer
      {snapshot}
      birthIdentity={JSON.stringify(birth)}
      {measurement}
      {controls}
      status={modalOpen ? undefined : status}
      {overview}
    />
  </main>
  {#if modalOpen}<BirthModal
      {birth}
      {closable}
      {resolve}
      onresolve={preview}
      onstart={() => measurement?.start()}
      onclose={closeModal}
      {status}
    />{/if}
</div>

<style>
  main {
    margin: 0;
    padding: 0;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
