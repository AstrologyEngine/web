import type { placeholders, UiKey } from "./content/placeholders";

export type { UiKey } from "./content/placeholders";

type UiKeys = {
  [K in UiKey]: K extends keyof typeof placeholders
    ? (typeof placeholders)[K]
    : readonly [];
};
type ParamsOf<K extends UiKey> = UiKeys[K] extends readonly []
  ? []
  : [params: Record<UiKeys[K][number], string | number>];

export type PlainKey = {
  [K in UiKey]: UiKeys[K] extends readonly [] ? K : never;
}[UiKey];

export type Reference = { insight: string; keywords: string[] };
export type NamedReference = Reference & { name: string };
export type ContentEntries = {
  ui?: Partial<Record<UiKey, string>>;
  body?: Record<string, NamedReference>;
  angle?: Record<string, NamedReference>;
  sign?: Record<string, NamedReference>;
  aspect?: Record<string, NamedReference>;
  house?: Record<string, Reference>;
};
export type Bundle = { locale: string; entries: ContentEntries };

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
    warn(`Missing copy: ${id} (${bundle.locale})`);
  };
  const lookup = <T>(collection: keyof ContentEntries, key: string) =>
    (bundle.entries[collection] as Record<string, unknown> | undefined)?.[
      key
    ] as T | undefined;

  const t = <K extends UiKey>(key: K, ...[params]: ParamsOf<K>): string => {
    const entry = lookup<string>("ui", key);
    if (!entry) {
      missing(`ui:${key}`);
      return key;
    }
    if (!params) return entry;
    const values = params as Record<string, string | number>;
    return entry.replace(PLACEHOLDER, (match, name: string) =>
      Object.hasOwn(values, name) ? String(values[name]) : match,
    );
  };

  const named =
    (collection: keyof ContentEntries) =>
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
