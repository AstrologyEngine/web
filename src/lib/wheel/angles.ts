// Angle math for the natal-chart wheel.
//
// Coordinate system: a unit circle in an SVG viewBox of "-1 -1 2 2", so y
// increases *downward*. polarToCartesian therefore uses +sin for y — a screen
// angle of 90° points straight down (6 o'clock). All wheel angles are these
// screen angles unless a name says "longitude".

export type Point = { x: number; y: number };

/** Wrap any angle (degrees) into the half-open range [0, 360). */
export const normalizeAngle = (deg: number): number =>
  ((deg % 360) + 360) % 360;

/** Point on a circle of the given radius at a screen angle (degrees, y-down). */
export const polarToCartesian = (angleDeg: number, radius: number): Point => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
};

/**
 * Project an ecliptic longitude onto a screen angle. The ascendant is pinned to
 * 180° (screen left, 9 o'clock) and the zodiac runs counterclockwise, so a
 * longitude 90° past the ascendant lands at 90° (screen bottom).
 */
export const longitudeToSvgAngle = (
  longitudeDeg: number,
  ascendantDeg: number,
): number => normalizeAngle(180 - longitudeDeg + ascendantDeg);

/** Midpoint of the shorter arc between two screen angles; wraparound-safe. */
export const circularMidpoint = (a: number, b: number): number => {
  // Signed shortest offset from a to b, in (-180, 180].
  const delta = ((((b - a) % 360) + 540) % 360) - 180;
  return normalizeAngle(a + delta / 2);
};
