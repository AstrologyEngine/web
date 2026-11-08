import { polarToCartesian } from "./angles";

/**
 * SVG path for an annular sector (a ring segment): out along the outer radius
 * from start→end, in to the inner radius, back along the inner radius, close.
 *
 * The sweep runs start→end in increasing screen-angle order (SVG sweep-flag 1
 * on the outer arc, 0 on the inner return), matching polarToCartesian's y-down
 * frame. A start greater than end is read as a short wraparound (e.g. 350°→10°
 * is a 20° sweep, not 340°), and the large-arc flag flips once the sweep passes
 * 180°.
 */
export const annularSector = (
  innerRadius: number,
  outerRadius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string => {
  const outerStart = polarToCartesian(startAngleDeg, outerRadius);
  const outerEnd = polarToCartesian(endAngleDeg, outerRadius);
  const innerEnd = polarToCartesian(endAngleDeg, innerRadius);
  const innerStart = polarToCartesian(startAngleDeg, innerRadius);

  const sweep = (((endAngleDeg - startAngleDeg) % 360) + 360) % 360;
  const largeArc = sweep > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
};
