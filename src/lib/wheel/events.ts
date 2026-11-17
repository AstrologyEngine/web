import type { Aspect, Glyph } from "../selection";

/**
 * How a wheel item was activated. `x`/`y` are page coordinates: the pointer
 * for mouse, touch and hover; the item's centre for keyboard activation.
 */
type Activation = {
  origin: Element;
  keyboard: boolean;
  x: number;
  y: number;
};
export type GlyphEvent = Activation & { glyph: Glyph };
/** Aspect lines near a click on the wheel's open space. */
export type AspectEvent = Activation & { aspects: Aspect[] };
