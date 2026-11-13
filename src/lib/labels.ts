/** CMS keys for settings identifiers that the UI displays. */
import type { PlainKey } from "./copy/copy";
import type { Preset, Settings } from "./settings";

export const presetLabel = {
  Tropical: "settings.preset.tropical",
  Vedic: "settings.preset.vedic",
  "True Sky": "settings.preset.trueSky",
} as const satisfies Record<Preset, PlainKey>;

/** Short reference name used in chart context lines. */
export const referenceLabel = {
  tropical: "chart.reference.tropical",
  "fagan-bradley": "chart.reference.faganBradley",
  "true-sky": "chart.reference.trueSky",
} as const satisfies Record<Settings["reference"], PlainKey>;

export const housesLabel = {
  "whole-sign": "settings.houses.wholeSign",
  equal: "settings.houses.equal",
  placidus: "settings.houses.placidus",
} as const satisfies Record<Settings["houses"], PlainKey>;
