import { defineCatalog } from "../src/catalog-schema";

/** Small catalog for route tests; the real one is tested separately. */
export const testCatalog = defineCatalog({
  body: {
    shape: "named",
    keys: { SUN: [], MOON: [], MARS: [] },
  },
  house: { shape: "reference", keys: { "1": [], "2": [] } },
  ui: {
    shape: "text",
    keys: {
      "landing.title": [],
      "app.previous": ["date", "place"],
    },
  },
});

export const sun = {
  name: "Sun",
  insight: "The Sun symbolizes identity.",
  keywords: ["identity", "purpose"],
};
