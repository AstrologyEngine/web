import { z } from "zod";
import type { Catalog, Shape } from "./catalog-schema";
import { placeholdersIn, samePlaceholders } from "./placeholders";

const trimmed = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((value) => value.trim() === value && value.trim().length > 0, {
      message: "Must not be blank or have leading/trailing whitespace",
    });

const keywords = z.array(trimmed(50)).min(1).max(8);

export const shapeSchemas = {
  named: z.strictObject({
    name: trimmed(100),
    insight: trimmed(2000),
    keywords,
  }),
  reference: z.strictObject({ insight: trimmed(2000), keywords }),
  text: z.strictObject({ text: trimmed(2000) }),
} satisfies Record<Shape, z.ZodType>;

export type FieldsResult =
  | { ok: true; fields: Record<string, unknown> }
  | {
      ok: false;
      code: "unknown_entry" | "validation_failed" | "placeholder_mismatch";
      message: string;
      [detail: string]: unknown;
    };

export const isCatalogEntry = (
  catalog: Catalog,
  collection: string,
  key: string,
) =>
  Object.hasOwn(catalog, collection) &&
  Object.hasOwn(catalog[collection]!.keys, key);

/** Validate translation fields for a catalog entry. */
export const validateFields = (
  catalog: Catalog,
  collection: string,
  key: string,
  fields: unknown,
): FieldsResult => {
  if (!isCatalogEntry(catalog, collection, key))
    return {
      ok: false,
      code: "unknown_entry",
      message: `'${collection}:${key}' is not in the catalog.`,
    };
  const definition = catalog[collection]!;
  const parsed = shapeSchemas[definition.shape].safeParse(fields);
  if (!parsed.success)
    return {
      ok: false,
      code: "validation_failed",
      message: "Fields are invalid.",
      issues: parsed.error.issues.map(({ path, message }) => ({
        path: path.join("."),
        message,
      })),
    };
  if ("text" in parsed.data) {
    const expected = definition.keys[key]!;
    const actual = placeholdersIn(parsed.data.text);
    if (!samePlaceholders(expected, actual))
      return {
        ok: false,
        code: "placeholder_mismatch",
        message: "Text must use exactly the declared placeholders.",
        expected: [...expected],
        actual,
      };
  }
  return { ok: true, fields: parsed.data };
};
