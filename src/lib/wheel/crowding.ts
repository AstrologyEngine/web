import type { Chart } from "../calculation/chart";

type Body = Chart["bodies"][number] & { labelLongitude: number };
export type BodyGroup = {
  members: Body[];
  longitude: number;
  radius: number;
  extent: number;
};
const relative = (value: number, start: number) => (value - start + 360) % 360;

/** Group bodies only when their actual points are spatially close in a house.
 * House membership and connector tips use unmodified engine positions. */
export const groupCrowdedBodies = (
  bodies: Body[],
  cusps: number[],
): BodyGroup[] =>
  cusps.flatMap((start, index) => {
    const width = relative(cusps[(index + 1) % cusps.length]!, start);
    const members = bodies
      .filter((body) => relative(body.longitude, start) < width)
      .sort(
        (a, b) => relative(a.longitude, start) - relative(b.longitude, start),
      );
    const clusters = members.reduce<Body[][]>((groups, body) => {
      const last = groups.at(-1);
      if (
        last &&
        relative(body.longitude, start) -
          relative(last.at(-1)!.longitude, start) <
          12
      )
        last.push(body);
      else groups.push([body]);
      return groups;
    }, []);
    return clusters.map((group) => {
      const radius = 188;
      const extent = Math.max(
        0.5,
        Math.min(
          group.length > 1 ? 19 : 16,
          radius * Math.sin((width * Math.PI) / 360) - 0.5,
        ),
      );
      const inset =
        (Math.asin(Math.min(1, (extent + 0.5) / radius)) * 180) / Math.PI;
      const center =
        group.reduce((sum, b) => sum + relative(b.longitude, start), 0) /
        group.length;
      const offset = Math.max(inset, Math.min(width - inset, center));
      return {
        members: group,
        longitude: (start + offset) % 360,
        radius,
        extent,
      };
    });
  });
