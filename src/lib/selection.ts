import type { Chart } from "./calculation/chart";
import type { Astrology } from "./calculation/snapshot";
export type BodyName = Chart["bodies"][number]["name"];
export type SignName = Chart["zodiac_sectors"][number]["sign"];
export type Aspect = Astrology["aspects"][number];
export type Selection =
  | { kind: "body"; name: BodyName }
  | { kind: "angle"; name: BodyName }
  | { kind: "sign"; name: SignName }
  | { kind: "house"; number: number }
  | {
      kind: "aspect";
      first: BodyName;
      second: BodyName;
      aspectType: Aspect["type"];
    };
export const samePair = (aspect: Aspect, a: BodyName, b: BodyName) =>
  (aspect.planetA === a && aspect.planetB === b) ||
  (aspect.planetA === b && aspect.planetB === a);
export const supported = (
  selection: Selection,
  chart: Chart,
  aspects: Aspect[],
) => {
  switch (selection.kind) {
    case "body":
    case "angle":
      return chart.bodies.some((b) => b.name === selection.name);
    case "sign":
      return chart.zodiac_sectors.some((s) => s.sign === selection.name);
    case "house":
      return selection.number >= 1 && selection.number <= chart.cusps.length;
    case "aspect":
      return aspects.some(
        (a) =>
          samePair(a, selection.first, selection.second) &&
          a.type === selection.aspectType,
      );
  }
};
export const houseFor = (longitude: number, chart: Chart) =>
  chart.cusps.findIndex(
    (cusp, i) =>
      (longitude - cusp + 360) % 360 <
      (chart.cusps[(i + 1) % 12]! - cusp + 360) % 360,
  ) + 1;
export const signAt = (longitude: number, chart: Chart) =>
  chart.zodiac_sectors.find(
    (sector) =>
      (longitude - sector.start_degrees + 360) % 360 < sector.width_degrees,
  )?.sign;
