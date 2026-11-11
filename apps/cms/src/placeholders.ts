const PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

/** Unique `{name}` placeholders in order of first appearance. */
export const placeholdersIn = (text: string) => [
  ...new Set(Array.from(text.matchAll(PLACEHOLDER), (match) => match[1]!)),
];

export const samePlaceholders = (
  a: readonly string[],
  b: readonly string[],
) => {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((name) => right.has(name));
};
