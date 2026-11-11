import adapter from "@sveltejs/adapter-cloudflare";
/** @type {import("@sveltejs/kit").Config} */
export default {
  kit: {
    adapter: adapter(),
    // The CMS catalog and locale rules are the shared contract (docs/designs/cms.md §5.1).
    alias: { $cms: "apps/cms/src" },
  },
};
