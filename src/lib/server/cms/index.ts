import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { createContentSource, type ContentSource } from "./source";

let source: ContentSource | undefined;

/**
 * One content source per isolate, so its cache outlives requests. Production
 * reads the CMS through the `CMS` service binding and the snapshot through
 * `ASSETS`; `vite dev` uses CMS_ORIGIN over HTTP (like the ASSETS dev path).
 */
export const contentSource = ({
  platform,
  origin,
}: {
  platform: App.Platform | undefined;
  origin: string;
}) => {
  source ??= createContentSource({
    fetchCms: (path, init) =>
      dev || !platform
        ? fetch(`${env.CMS_ORIGIN || "http://127.0.0.1:8787"}${path}`, init)
        : platform.env.CMS.fetch(`https://cms.internal${path}`, init),
    readSnapshot: async (file) => {
      const path = `/content/${file}`;
      const response =
        dev || !platform
          ? await fetch(`${origin}${path}`)
          : await platform.env.ASSETS.fetch(new URL(path, origin));
      return response.ok ? response.json() : null;
    },
  });
  return source;
};
