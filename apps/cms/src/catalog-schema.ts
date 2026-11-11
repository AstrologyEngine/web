export type Shape = "named" | "reference" | "text";
export type CollectionDef = {
  shape: Shape;
  /** key → placeholder names its text must contain (text shape only). */
  keys: Record<string, readonly string[]>;
};
export type Catalog = Record<string, CollectionDef>;

export const defineCatalog = <const C extends Catalog>(catalog: C) => catalog;
