import { runCurrentIndependentScopedCli } from "./current-independent-scoped-cli-lib.mjs";

await runCurrentIndependentScopedCli({
  scope: "source_requirements",
  moduleUrl: import.meta.url,
  successPrefix: "CURRENT_INDEPENDENT_SOURCE_REQUIREMENTS_OK"
});
