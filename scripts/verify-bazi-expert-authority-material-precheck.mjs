function visibleLoaderInjectionPresent() {
  const nodeOptions = typeof process.env.NODE_OPTIONS === "string"
    ? process.env.NODE_OPTIONS.trim()
    : "";
  const injectedExecArg = process.execArgv.some((arg) =>
    /^(?:--import|--loader|--require|-r)(?:=|$)/u.test(arg)
  );
  return nodeOptions !== "" || injectedExecArg;
}

function safeCode(error) {
  return typeof error?.code === "string" && /^[A-Z0-9_]{1,80}$/u.test(error.code)
    ? error.code
    : "UNEXPECTED_FAILURE";
}

if (visibleLoaderInjectionPresent()) {
  process.stderr.write(JSON.stringify({
    code: "VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN",
    status: "bazi_expert_authority_material_precheck_failed"
  }) + "\n");
  process.exitCode = 1;
} else {
  try {
    const module = await import("./bazi-expert-authority-material-precheck-lib.mjs");
    const result = await module.loadBaziExpertAuthorityMaterialPrecheck(process.cwd());
    process.stdout.write(JSON.stringify({
      authorityMaterialContractStructurallyPrechecked:
        result.authorityMaterialContractStructurallyPrechecked,
      countsTowardExpertGate: false,
      expertClaimsAuthorized: false,
      expertTruthEstablished: false,
      firstFormalParentFailureCode: result.firstFormalParentFailureCode,
      historicalExecutionAttested: false,
      ledgerDigest: result.ledgerDigest,
      ledgerId: result.ledgerId,
      loaderIdentityEstablished: false,
      nodeRuntimeIdentityEstablished: false,
      publicDeploymentAuthorized: false,
      realReviewerInstances: 0,
      releaseReady: false,
      status: result.status,
      verifierAuthorityGrantInstances: 0
    }) + "\n");
  } catch (error) {
    process.stderr.write(JSON.stringify({
      code: safeCode(error),
      status: "bazi_expert_authority_material_precheck_failed"
    }) + "\n");
    process.exitCode = 1;
  }
}
