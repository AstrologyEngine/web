<script lang="ts">
  import { onMount, tick } from "svelte";
  import {
    createMeasurement,
    type Measurement,
  } from "../../lib/measurement/client";
  import BirthEdit from "../../lib/BirthEdit.svelte";
  import Explorer from "../../lib/Explorer.svelte";
  import LanguageSwitcher from "../../lib/LanguageSwitcher.svelte";
  import SettingsControls from "../../lib/SettingsControls.svelte";
  import {
    customFields,
    matchPreset,
    type Custom,
    type Settings,
  } from "../../lib/settings";
  import { birthSchema, initialSettings } from "../../lib/domain";
  import { snapshotSchema } from "../../lib/calculation/snapshot";
  import type { Snapshot } from "../../lib/calculation/snapshot";
  import type { resolveBirth } from "../../lib/server/birth/resolve";
  import { z } from "zod";
  import { t } from "../../lib/copy/index.svelte";
  import type { PlainKey } from "../../lib/copy/copy";
  import { presetLabel } from "../../lib/labels";
  import { calculationMessageKey } from "../../lib/messages";
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
  let custom = $state<Custom>(customFields(initialSettings));
  let snapshot = $state<Snapshot | null>(null);
  let editing = $state(true);
  let loading = $state(false);
  let error = $state<PlainKey | null>(null);
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
        error = calculationMessageKey(result?.code);
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
      error = "error.calculation.notStarted";
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
        error = "error.calculation.timeout";
      }, 30000);
    } catch {
      worker?.terminate();
      worker = undefined;
      loading = false;
      measurement?.fail("calculation", "unavailable");
      error = "error.calculation.notStarted";
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
  function applySettings(next: Settings, nextCustom: Custom) {
    const changed =
      JSON.stringify($state.snapshot(settings)) !== JSON.stringify(next);
    settings = next;
    custom = nextCustom;
    if (changed && birth) calculate(birth);
  }
  async function accept(next: Birth | null) {
    if (next) {
      measurement?.complete();
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

<svelte:head><title>{t("app.meta.title")}</title></svelte:head>
<main class={{ "chart-ready": !!snapshot && !editing }}>
  <header>
    <span>✳</span>
    {t("brand.name")}
    <small>{t("brand.beta")}</small><LanguageSwitcher />
  </header>
  <section class="entry">
    <p class="eyebrow">{t("app.entry.eyebrow")}</p>
    <h1>
      {birth ? t("app.entry.headingWithBirth") : t("app.entry.headingEmpty")}
    </h1>
    {#if editing}<BirthEdit
        {birth}
        {resolve}
        onclose={accept}
        onstart={() => measurement?.start()}
      />{:else}
      {#if birth}<p>
          {t("app.entry.summary", {
            date: birth.localDate,
            time: birth.localTime,
            place: birth.place.label,
          })}
        </p>{/if}
      <button bind:this={editButton} onclick={() => (editing = true)}
        >{t("app.entry.edit")}</button
      >
    {/if}
  </section>
  {#if snapshot}<SettingsControls
      actualHouses={snapshot.systems.astrology!.selectedFrame.house_system}
      requested={settings}
      accepted={snapshot.requestedSettings}
      {custom}
      pending={loading}
      onapply={applySettings}
      {measurement}
    />{/if}
  {#if snapshot && JSON.stringify(snapshot.requestedSettings) !== JSON.stringify(settings)}<p
      role="status"
    >
      {loading
        ? t("app.status.updating", {
            shown: t(presetLabel[matchPreset(snapshot.requestedSettings)]),
            requested: t(presetLabel[matchPreset(settings)]),
          })
        : t("app.status.notApplied", {
            shown: t(presetLabel[matchPreset(snapshot.requestedSettings)]),
          })}
    </p>{/if}
  {#if loading}<p role="status">
      {snapshot
        ? t("app.status.calculatingWithPrevious")
        : t("app.status.calculating")}
    </p>{/if}
  {#if error}
    <p role="alert">{t(error)}</p>
    <button onclick={() => birth && calculate(birth)}
      >{t("app.error.retry")}</button
    >
  {/if}
  {#if snapshot && birth && (snapshot.birth.utc !== birth.utc || snapshot.birth.place.id !== birth.place.id)}<p
      role="status"
    >
      {t("app.status.previousBirth", {
        date: snapshot.birth.localDate,
        time: snapshot.birth.localTime,
        place: snapshot.birth.place.label,
      })}
    </p>{/if}
  {#if snapshot?.systems.astrology}
    {#if snapshot.systems.astrology.selectedFrame.requested_house_system !== snapshot.systems.astrology.selectedFrame.house_system}<p
      >
        {t("app.status.housesAdjusted", {
          houseSystem: snapshot.systems.astrology.selectedFrame.house_system,
        })}
      </p>{/if}
    <Explorer {snapshot} birthIdentity={JSON.stringify(birth)} {measurement} />
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
  @media (min-width: 800px) {
    .chart-ready {
      padding-top: 1rem;
    }
    .chart-ready header {
      margin-bottom: 0.5rem;
    }
    .chart-ready .entry {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: 1rem;
      max-width: none;
    }
    .chart-ready .eyebrow {
      margin: 0;
    }
    .chart-ready h1 {
      margin: 0.25rem 0;
      font-size: 2rem;
    }
    .chart-ready .entry > p {
      grid-column: 1;
      margin: 0;
    }
    .chart-ready .entry > button {
      grid-column: 2;
      grid-row: 1 / span 3;
      align-self: center;
    }
    .chart-ready :global(.settings) {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin: 0.75rem 0;
    }
    .chart-ready :global(.settings .advanced) {
      margin-top: 0;
    }
    .chart-ready :global(#system-help) {
      flex-basis: 100%;
      order: 1;
    }
  }
</style>
