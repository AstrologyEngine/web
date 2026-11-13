/**
 * Typed access to CMS copy (docs/designs/cms.md §9.3). Keys and placeholder
 * names come from the CMS catalog, so unknown keys fail type checks.
 */
import type { AppCatalog } from "@astrologyengine/cms-contract/catalog";

type UiKeys = AppCatalog["ui"]["keys"];
export type UiKey = keyof UiKeys & string;
type ParamsOf<K extends UiKey> = UiKeys[K] extends readonly []
  ? []
  : [params: Record<UiKeys[K][number], string | number>];

/** Keys whose text takes no placeholders. */
export type PlainKey = {
  [K in UiKey]: UiKeys[K] extends readonly [] ? K : never;
}[UiKey];

export type Reference = { insight: string; keywords: string[] };
export type NamedReference = Reference & { name: string };

import type { Bundle } from "@astrologyengine/cms-contract/types";
export type { Bundle } from "@astrologyengine/cms-contract/types";

type Options = { warn?: (message: string) => void };

const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

export const createCopy = (
  bundle: Bundle,
  { warn = console.warn }: Options = {},
) => {
  const warned = new Set<string>();
  const missing = (id: string) => {
    if (warned.has(id)) return;
    warned.add(id);
    warn(`Missing CMS copy: ${id} (${bundle.locale})`);
  };
  const lookup = <T>(collection: string, key: string) =>
    bundle.entries[collection]?.[key] as T | undefined;

  const t = <K extends UiKey>(key: K, ...[params]: ParamsOf<K>): string => {
    const entry = lookup<{ text: string }>("ui", key);
    if (!entry) {
      missing(`ui:${key}`);
      return key;
    }
    if (!params) return entry.text;
    const values = params as Record<string, string | number>;
    return entry.text.replace(PLACEHOLDER, (match, name: string) =>
      Object.hasOwn(values, name) ? String(values[name]) : match,
    );
  };

  const named =
    (collection: string) =>
    (key: string): NamedReference | undefined =>
      lookup<NamedReference>(collection, key);
  const body = named("body");
  const angle = named("angle");
  const sign = named("sign");
  const aspect = named("aspect");
  const nameOr = (
    entry: NamedReference | undefined,
    id: string,
    kind: string,
  ) => {
    if (entry) return entry.name;
    missing(`${kind}:${id}`);
    return id;
  };

  return {
    locale: bundle.locale,
    t,
    /** Text split on `\n` for components that render line breaks. */
    lines: (key: PlainKey) => t(key).split("\n"),
    body,
    angle,
    sign,
    aspect,
    house: (number: number) => lookup<Reference>("house", String(number)),
    /** Display name of a body or angle. */
    pointName: (id: string) => nameOr(body(id) ?? angle(id), id, "body"),
    signName: (id: string) => nameOr(sign(id), id, "sign"),
    aspectName: (type: string) => nameOr(aspect(type), type, "aspect"),
    houseName: (number: number) => t("chart.house.name", { number }),
  };
};

export type Copy = ReturnType<typeof createCopy>;
