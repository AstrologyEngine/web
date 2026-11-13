import { test, expect } from "bun:test";
import { initialSettings, settingsSchema } from "../src/lib/domain";
import {
  chooseHouses,
  choosePreset,
  matchPreset,
  presetNames,
} from "../src/lib/settings";

const houses = ["whole-sign", "equal", "placidus"] as const;

test("there are three presets and every one starts with whole-sign houses", () => {
  expect(presetNames).toEqual(["Tropical", "Vedic", "True Sky"]);
  for (const name of presetNames)
    expect(choosePreset(name, initialSettings).houses).toBe("whole-sign");
});

test("each preset is identified with any house system", () => {
  for (const name of presetNames)
    for (const value of houses) {
      const settings = chooseHouses(value, choosePreset(name, initialSettings));
      expect(settingsSchema.safeParse(settings).success).toBe(true);
      expect(matchPreset(settings)).toBe(name);
    }
});

test("switching presets keeps the chosen house system", () => {
  const placidus = chooseHouses("placidus", initialSettings);
  for (const name of presetNames)
    expect(choosePreset(name, placidus).houses).toBe("placidus");
});

test("True Sky always includes Ophiuchus; Tropical and Vedic never do", () => {
  expect(choosePreset("True Sky", initialSettings)).toMatchObject({
    reference: "true-sky",
    divisions: "constellation",
    ophiuchus: true,
  });
  for (const name of ["Tropical", "Vedic"] as const)
    expect(choosePreset(name, initialSettings)).toMatchObject({
      divisions: "equal",
      ophiuchus: false,
    });
});
