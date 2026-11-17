import { describe, expect, test } from "bun:test";
import sample from "../src/lib/home/chart.json";
import { chartSchema } from "../src/lib/calculation/chart";
import { astrologySchema } from "../src/lib/calculation/snapshot";
import { inVisibleQuarter } from "../src/lib/home/visible";
import { layoutBodyPositions } from "../src/lib/wheel/geometry";
import { angleIds, bodyIds } from "../src/lib/identities";

const chart = chartSchema.parse(sample.chart);
const visible = inVisibleQuarter(chart);
const asc = chart.bodies.find((b) => b.name === "ASCENDANT_SYMBOL")!.longitude;
/** Degrees past the Ascendant, from -180 to 180. */
const offset = (longitude: number) => ((longitude - asc + 540) % 360) - 180;

describe("homepage sample chart", () => {
  test("is a chart the wheel can draw", () => {
    expect(() => chartSchema.parse(sample.chart)).not.toThrow();
    expect(() =>
      astrologySchema.shape.aspects.parse(sample.aspects),
    ).not.toThrow();
  });

  test("shows only the Sun, Mercury and Jupiter, with the ASC and IC", () => {
    expect(bodyIds.filter((name) => visible({ kind: "body", name }))).toEqual([
      "SUN",
      "MERCURY",
      "JUPITER",
    ]);
    expect(angleIds.filter((name) => visible({ kind: "angle", name }))).toEqual(
      ["ASCENDANT_SYMBOL", "IMUM_COELI"],
    );
  });

  test("draws no other body at the edges of the visible quarter", () => {
    const drawn = layoutBodyPositions(
      chart.bodies.filter((b) => bodyIds.includes(b.name as never)),
    );
    const near = drawn.filter((b) => {
      const label = offset(b.labelLongitude),
        tip = offset(b.longitude);
      return (label > -12 && label < 102) || (tip > -12 && tip < 102);
    });
    expect(near.map((b) => b.name).sort()).toEqual([
      "JUPITER",
      "MERCURY",
      "SUN",
    ]);
  });

  test("counts signs and houses by their midpoint", () => {
    const signs = chart.zodiac_sectors
      .filter((s) => visible({ kind: "sign", name: s.sign }))
      .map((s) => s.sign);
    expect(signs).toEqual(["gemini", "cancer", "leo"]);
    const houses = chart.cusps
      .map((_, i) => i + 1)
      .filter((number) => visible({ kind: "house", number }));
    expect(houses).toEqual([2, 3, 4]);
  });
});
