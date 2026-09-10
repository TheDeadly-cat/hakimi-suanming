import { runCurrentIndependentInventoryCli } from "./current-independent-scoped-cli-lib.mjs";

await runCurrentIndependentInventoryCli({
  scope: "source_requirements",
  moduleUrl: import.meta.url,
  successPrefix: "CURRENT_INDEPENDENT_SOURCE_INVENTORY_OK"
});
