import { runCurrentIndependentScopedCli } from "./current-independent-scoped-cli-lib.mjs";

await runCurrentIndependentScopedCli({
  scope: "domain_manifests",
  moduleUrl: import.meta.url,
  successPrefix: "CURRENT_INDEPENDENT_DOMAIN_MANIFESTS_OK"
});
