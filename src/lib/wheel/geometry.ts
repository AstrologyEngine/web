// Layout ported from astrology-engine-website at 9613598.
/** Screen coordinates: Ascendant left; zodiac longitude increases counterclockwise. */
export const wheelPoint = (
  longitude: number,
  radius: number,
  ascendant: number,
) => {
  const radians = ((longitude - ascendant) * Math.PI) / 180;
  return {
    x: 300 - radius * Math.cos(radians),
    y: 300 + radius * Math.sin(radians),
  };
};

/** Spread glyph labels on one ring, preserving true positions for connector tips. */
export const layoutBodyPositions = <
  T extends { name: string; longitude: number },
>(
  bodies: readonly T[],
) => {
  if (!bodies.length) return [] as (T & { labelLongitude: number })[];
  const gap = 12;
  const sorted = [...bodies].sort((a, b) => a.longitude - b.longitude);
  // Put the cut in the emptiest arc so near-zero groups stay together.
  const seam = sorted.reduce(
    (best, body, index) => {
      const space =
        (sorted[(index + 1) % sorted.length]!.longitude -
          body.longitude +
          360) %
        360;
      return space > best.space ? { index, space } : best;
    },
    { index: sorted.length - 1, space: -1 },
  ).index;
  const ordered = [...sorted.slice(seam + 1), ...sorted.slice(0, seam + 1)];
  const origin = ordered[0]!.longitude;
  const actual = ordered.map(
    (body) => origin + ((body.longitude - origin + 360) % 360),
  );
  // Search possible starts, then project each label into the available arc.
  // The upper bound reserves space for every remaining label and the wrap gap.
  const candidates = Array.from(
    { length: 361 },
    (_, index) => actual[0]! + index - 180,
  );
  const best = candidates.reduce<{ cost: number; labels: number[] }>(
    (best, start) => {
      const labels = actual.reduce<number[]>((placed, longitude, index) => {
        placed.push(
          index === 0
            ? start
            : Math.min(
                Math.max(longitude, placed[index - 1]! + gap),
                start + 360 - (actual.length - index) * gap,
              ),
        );
        return placed;
      }, []);
      const cost = labels.reduce(
        (total, label, index) => total + (label - actual[index]!) ** 2,
        0,
      );
      return cost < best.cost ? { cost, labels } : best;
    },
    { cost: Infinity, labels: [] },
  );
  const labels = Object.fromEntries(
    ordered.map((body, index) => [body.name, best.labels[index]]),
  );
  return bodies.map((body) => ({ ...body, labelLongitude: labels[body.name] }));
};
