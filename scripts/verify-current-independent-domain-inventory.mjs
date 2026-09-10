import { runCurrentIndependentInventoryCli } from "./current-independent-scoped-cli-lib.mjs";

await runCurrentIndependentInventoryCli({
  scope: "domain_manifests",
  moduleUrl: import.meta.url,
  successPrefix: "CURRENT_INDEPENDENT_DOMAIN_INVENTORY_OK"
});
