import { page } from "$app/state";
import { createCopy, type Bundle, type Copy } from "./copy";

const cache = new WeakMap<Bundle, Copy>();

/** Copy for the current page's locale; reactive in templates. */
export const copy = (): Copy => {
  const bundle = page.data.content;
  let current = cache.get(bundle);
  if (!current) {
    current = createCopy(bundle);
    cache.set(bundle, current);
  }
  return current;
};

export const t = ((...args: Parameters<Copy["t"]>) =>
  copy().t(...args)) as Copy["t"];
