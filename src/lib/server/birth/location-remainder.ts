/**
 * location-remainder (CHAT-avgfsjky) — carve the location query out of
 * whatever chrono didn't claim. Pure function: raw text plus the consumed
 * date spans in, a filler-stripped query for the location FTS out. Handles
 * date-first, location-first, and location-wraps-date with the same three
 * steps: remove the spans, stitch the leftovers, drop connective filler.
 */
import type { Span } from "./date-parse-merge";

// Connective words people wrap around their birth sentence. Whole-token,
// case-insensitive — with one carve-out below for region codes.
const FILLER_WORDS = new Set(["i", "was", "born", "in", "at", "on"]);

// "IN" is Indiana and "ON" is Ontario. A 2+ letter token typed in ALL CAPS
// reads as a region code, not a connective, so it survives the filler strip.
// (A lone uppercase "I" stays filler — no region is one letter.)
const looksLikeRegionCode = (token: string): boolean =>
  token.length >= 2 && token === token.toUpperCase() && /[A-Z]/.test(token);

const stripOuterPunctuation = (token: string): string =>
  token.replace(/^[,.\s]+|[,.\s]+$/g, "");

export const extractLocationQuery = (
  rawText: string,
  consumedSpans: Span[],
): string => {
  // 1. Remove the consumed spans, keeping both sides.
  const sorted = [...consumedSpans].sort((a, b) => a.start - b.start);
  const segments: string[] = [];
  let cursor = 0;
  for (const span of sorted) {
    segments.push(rawText.slice(cursor, span.start));
    cursor = Math.max(cursor, span.end);
  }
  segments.push(rawText.slice(cursor));

  // 2. Stitch and tokenize.
  const tokens = segments.join(" ").split(/\s+/).filter(Boolean);

  // 3. Strip filler, then tidy the punctuation the stripping left behind.
  const kept = tokens.filter((token) => {
    const word = stripOuterPunctuation(token);
    if (!word) return false;
    if (!FILLER_WORDS.has(word.toLowerCase())) return true;
    return looksLikeRegionCode(word);
  });

  return kept
    .join(" ")
    .replace(/\s*,\s*/g, ", ") // normalize comma spacing
    .replace(/^[,\s]+|[,\s]+$/g, ""); // no leading/trailing separators
};
