import { describe, expect, mock, test } from "bun:test";
import { createCopy, type Bundle } from "../src/lib/copy/copy";

const bundle: Bundle = {
  locale: "en",
  default: "en",
  chain: ["en"],
  version: 3,
  entries: {
    body: {
      SUN: { name: "Sun", insight: "Identity.", keywords: ["identity"] },
    },
    angle: {
      MIDHEAVEN: { name: "Midheaven", insight: "Vocation.", keywords: ["a"] },
    },
    sign: {
      aries: { name: "Aries", insight: "Begin.", keywords: ["initiative"] },
    },
    aspect: {
      Trine: { name: "Trine", insight: "Flow.", keywords: ["flow"] },
    },
    house: { "1": { insight: "Presence.", keywords: ["presence"] } },
    ui: {
      "brand.name": { text: "Astrology Engine" },
      "chart.house.name": { text: "House {number}" },
      "app.entry.summary": { text: "{date} at {time} in {place}" },
      "landing.hero.title": { text: "Explore your\nbirth chart." },
    },
  },
  fallbacks: {},
};

describe("createCopy", () => {
  test("returns ui text", () => {
    expect(createCopy(bundle).t("brand.name")).toBe("Astrology Engine");
  });

  test("substitutes placeholders, leaving unknown ones visible", () => {
    const { t } = createCopy(bundle);
    expect(
      t("app.entry.summary", { date: "June 21", time: "1:00", place: "Oslo" }),
    ).toBe("June 21 at 1:00 in Oslo");
    expect(t("chart.house.name", { number: 7 })).toBe("House 7");
    expect(
      t("app.entry.summary", { date: "$&", time: "$1", place: "{date}" }),
    ).toBe("$& at $1 in {date}");
  });

  test("renders a missing key as the key and warns once", () => {
    const warn = mock(() => {});
    const copy = createCopy(bundle, { warn });
    expect(copy.t("details.house.empty")).toBe("details.house.empty");
    copy.t("details.house.empty");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  test("splits opt-in line breaks", () => {
    expect(createCopy(bundle).lines("landing.hero.title")).toEqual([
      "Explore your",
      "birth chart.",
    ]);
  });

  test("looks up reference entries", () => {
    const copy = createCopy(bundle);
    expect(copy.body("SUN")?.insight).toBe("Identity.");
    expect(copy.sign("aries")?.keywords).toEqual(["initiative"]);
    expect(copy.angle("MIDHEAVEN")?.name).toBe("Midheaven");
    expect(copy.aspect("Trine")?.insight).toBe("Flow.");
    expect(copy.house(1)?.insight).toBe("Presence.");
    expect(copy.body("MOON")).toBeUndefined();
  });

  test("names bodies, angles, signs, aspects and houses with fallbacks", () => {
    const copy = createCopy(bundle, { warn: () => {} });
    expect(copy.pointName("SUN")).toBe("Sun");
    expect(copy.pointName("MIDHEAVEN")).toBe("Midheaven");
    expect(copy.pointName("MOON")).toBe("MOON");
    expect(copy.signName("aries")).toBe("Aries");
    expect(copy.signName("taurus")).toBe("taurus");
    expect(copy.aspectName("Trine")).toBe("Trine");
    expect(copy.houseName(4)).toBe("House 4");
  });

  test("exposes the locale", () => {
    expect(createCopy(bundle).locale).toBe("en");
  });
});
