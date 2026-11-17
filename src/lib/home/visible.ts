import type { Chart } from "../calculation/chart";
import type { Glyph } from "../selection";

/**
 * Glyphs in the wheel's bottom-left quarter, the part the homepage shows in
 * full: 0–90° past the Ascendant. Signs and houses count by their midpoint.
 */
export const inVisibleQuarter = (chart: Chart) => {
  const longitude = (name: string) =>
    chart.bodies.find((body) => body.name === name)!.longitude;
  const asc = longitude("ASCENDANT_SYMBOL");
  const visible = (at: number) => (at - asc + 720) % 360 <= 90;
  return (glyph: Glyph) => {
    switch (glyph.kind) {
      case "body":
      case "angle":
        return visible(longitude(glyph.name));
      case "sign": {
        const sign = chart.zodiac_sectors.find((s) => s.sign === glyph.name)!;
        return visible(sign.start_degrees + sign.width_degrees / 2);
      }
      case "house": {
        const start = chart.cusps[glyph.number - 1]!;
        const end = chart.cusps[glyph.number % chart.cusps.length]!;
        return visible(start + ((end - start + 360) % 360) / 2);
      }
    }
  };
};
