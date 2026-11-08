type SignName = string;

// Theming contract for the AstroChart wheel. A theme is a small token set, not
// a free-for-all: three ink levels (the engraving hierarchy), three aspect
// tones (the one place color always lives), and two optional decorations. Any
// CSS color works; use `light-dark(a, b)` to vary by scheme — the app root
// already declares `color-scheme: light dark`.
export type AstroChartTheme = {
  ink: {
    /** planet glyphs, axis labels, leader ticks — the loudest ink */
    strong: string;
    /** sign glyphs, major ticks, boundaries, degree text */
    mid: string;
    /** hairline rings, minor ticks, cusp spokes */
    faint: string;
  };
  aspect: { hard: string; soft: string; neutral: string };
  /** optional disc behind the wheel, so the plate can own its background */
  plate?: string;
  /** optional zodiac wedge fills (hex only — glyph ink auto-contrasts) */
  signFills?: Record<SignName, string>;
};

export type WheelThemeName = "monochrome" | "traditional" | "solstice";

/** The engraved instrument: slate ink, color reserved for the aspect web. */
const monochrome: AstroChartTheme = {
  ink: {
    strong: "light-dark(#1e293b, #f1f5f9)",
    mid: "light-dark(#64748b, #94a3b8)",
    faint: "light-dark(#cbd5e1, #334155)",
  },
  aspect: {
    hard: "light-dark(#f43f5e, #fb7185)",
    soft: "light-dark(#3b82f6, #60a5fa)",
    neutral: "light-dark(#94a3b8, #64748b)",
  },
};

/** TrueSky's look: the rainbow zodiac ring, red/blue aspects, white plate. */
const traditional: AstroChartTheme = {
  ink: {
    strong: "light-dark(#1f1f1f, #ececec)",
    mid: "light-dark(#4a4a4a, #b8b8b8)",
    faint: "light-dark(#d0d0d0, #47506b)",
  },
  aspect: {
    hard: "light-dark(#cc2222, #ff7070)",
    soft: "light-dark(#2255cc, #7099ff)",
    neutral: "light-dark(#999999, #6f7688)",
  },
  plate: "light-dark(#ffffff, #20243a)",
  // Verbatim TrueSky sign hues (docs/research/truesky, sharedNatal.js color table).
  signFills: {
    Aries: "#e15947",
    Taurus: "#d58f3b",
    Gemini: "#c9dd47",
    Cancer: "#a5c16f",
    Leo: "#33b278",
    Virgo: "#44c1a8",
    Libra: "#33b7bb",
    Scorpio: "#3388c7",
    Ophiuchus: "#353535",
    Sagittarius: "#7a33d0",
    Capricorn: "#a14cd3",
    Aquarius: "#cf49cc",
    Pisces: "#c16195",
  },
};

/** Dusk atlas: ivory-to-midnight plate, burnished gold ink, ember and teal. */
const solstice: AstroChartTheme = {
  ink: {
    strong: "light-dark(#33305e, #f0e7d0)",
    mid: "light-dark(#a08339, #c9a961)",
    faint: "light-dark(#e3d9bd, #2e3158)",
  },
  aspect: {
    hard: "light-dark(#c14e2a, #ff8a5c)",
    soft: "light-dark(#2e7f8a, #56c8d8)",
    neutral: "light-dark(#b9ad8d, #4c5080)",
  },
  plate: "light-dark(#f7f2e5, #131630)",
};

export const WHEEL_THEMES: Record<WheelThemeName, AstroChartTheme> = {
  monochrome,
  traditional,
  solstice,
};

/**
 * Pick a legible glyph ink for a wedge fill — TrueSky's Ophiuchus wedge is
 * near-black and takes a white glyph; every pastel wedge takes dark ink.
 * Hex colors only (that's all signFills accepts); anything unparseable gets
 * dark ink and a shrug.
 */
export const contrastInk = (hexFill: string): string => {
  const hex = hexFill.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return "#1f2937";
  const [r, g, b] = [0, 2, 4].map(
    (i) => Number.parseInt(full.slice(i, i + 2), 16) / 255,
  );
  const luminance = 0.299 * r! + 0.587 * g! + 0.114 * b!;
  return luminance > 0.45 ? "#1f2937" : "#f8fafc";
};
