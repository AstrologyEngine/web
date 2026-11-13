import type { z } from "zod";
import type { settingsSchema } from "./domain";

export type Settings = z.infer<typeof settingsSchema>;
/**
 * The three zodiac presets. Each fixes the sign system; the house system is
 * chosen separately and shared across presets.
 */
export const presets = {
  Tropical: { reference: "tropical", divisions: "equal", ophiuchus: false },
  Vedic: { reference: "fagan-bradley", divisions: "equal", ophiuchus: false },
  "True Sky": {
    reference: "true-sky",
    divisions: "constellation",
    ophiuchus: true,
  },
} as const satisfies Record<
  string,
  Pick<Settings, "reference" | "divisions" | "ophiuchus">
>;
export type Preset = keyof typeof presets;
export const presetNames = Object.keys(presets) as Preset[];
/** The preset whose sign system the settings use; houses are not part of it. */
export const matchPreset = (settings: Settings): Preset =>
  presetNames.find((name) => presets[name].reference === settings.reference) ??
  "Tropical";
/** Switch the sign system, keeping the house system and everything else. */
export const choosePreset = (name: Preset, current: Settings): Settings => ({
  ...current,
  ...presets[name],
});
export const chooseHouses = (
  houses: Settings["houses"],
  current: Settings,
): Settings => ({ ...current, houses });
