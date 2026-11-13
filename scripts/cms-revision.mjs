import { createRequire } from "node:module";
const pkg = createRequire(import.meta.url)(
  "@astrologyengine/cms-contract/package.json",
);
if (!/^[a-f0-9]{40}$/.test(pkg.cmsRevision))
  throw new Error("Installed CMS contract has no valid source revision");
console.log(`revision=${pkg.cmsRevision}`);
