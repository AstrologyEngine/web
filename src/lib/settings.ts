import type { z } from "zod";
import type { customSchema, settingsSchema } from "./domain";

export type Settings = z.infer<typeof settingsSchema>;
export type Custom = z.infer<typeof customSchema>;
export const presets = {
  Tropical: {
    schemaVersion: 1,
    reference: "tropical",
    divisions: "equal",
    ophiuchus: false,
    houses: "whole-sign",
    atmakaraka: "progressInSign",
  },
  Vedic: {
    schemaVersion: 1,
    reference: "fagan-bradley",
    divisions: "equal",
    ophiuchus: false,
    houses: "equal",
    atmakaraka: "progressInSign",
  },
  "True Sky": {
    schemaVersion: 1,
    reference: "true-sky",
    divisions: "constellation",
    ophiuchus: true,
    houses: "placidus",
    atmakaraka: "progressInSign",
  },
} as const satisfies Record<string, Custom>;
export type Preset = keyof typeof presets | "Custom";
export const customFields = (settings: Settings): Custom => {
  const { systems: _, ...custom } = settings;
  return custom;
};
export const matchPreset = (settings: Settings): Preset => {
  const custom = customFields(settings);
  return (
    (Object.keys(presets) as (keyof typeof presets)[]).find((name) => {
      const preset = presets[name];
      return (
        preset.reference === custom.reference &&
        preset.divisions === custom.divisions &&
        (custom.divisions === "equal" ||
          preset.ophiuchus === custom.ophiuchus) &&
        preset.houses === custom.houses &&
        preset.atmakaraka === custom.atmakaraka
      );
    }) ?? "Custom"
  );
};
export const choosePreset = (
  name: Preset,
  current: Settings,
  custom: Custom,
): Settings => ({
  ...(name === "Custom" ? custom : presets[name]),
  systems: current.systems,
});
