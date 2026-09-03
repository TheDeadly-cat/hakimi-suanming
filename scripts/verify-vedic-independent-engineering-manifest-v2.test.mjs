import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

import {
  buildCurrentVedicIndependentEngineeringManifestV2,
  canonicalPrettyStringifyVedicIndependentEngineeringManifestV2,
  computeVedicIndependentEngineeringManifestV2Digest,
  getVedicIndependentEngineeringManifestV2Summary,
  isVerifiedVedicIndependentEngineeringManifestV2,
  parseVedicIndependentEngineeringManifestV2JsonBytes,
  readCurrentVedicIndependentEngineeringManifestV2,
  vedicIndependentEngineeringManifestV2TestOnly as testOnly
} from "./vedic-independent-engineering-manifest-v2-lib.mjs";
import {
  loadVedicSameArtifactCandidate
} from "./vedic-civil-time-same-artifact-browser-observation-lib.mjs";
import {
  readCurrentVedicIndependentEngineeringManifestV1
} from "./vedic-independent-engineering-manifest-v1-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLI_PATH = path.join(
  SCRIPT_DIR,
  "verify-vedic-independent-engineering-manifest-v2.mjs"
);

let expected;
let loaded;
let predecessor;
let browserChild;

function clone(value) {
  return structuredClone(value);
}

function resign(value) {
  const candidate = clone(value);
  candidate.manifestDigest =
    computeVedicIndependentEngineeringManifestV2Digest(candidate);
  return candidate;
}

function assertRejectsProjection(candidate) {
  assert.throws(
    () => testOnly.assertExpectedProjection(candidate, expected),
    (error) => error?.code === "RED_OR_SCOPE_BOUNDARY_MISMATCH"
      || error?.code === "CURRENT_MANIFEST_MISMATCH"
  );
}

function cleanCliEnvironment(extra = {}) {
  const env = { ...process.env, ...extra };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return env;
}

before(async () => {
  expected =
    await buildCurrentVedicIndependentEngineeringManifestV2(WORKSPACE_ROOT);
  loaded =
    await readCurrentVedicIndependentEngineeringManifestV2(WORKSPACE_ROOT);
  predecessor =
    await readCurrentVedicIndependentEngineeringManifestV1(WORKSPACE_ROOT);
  browserChild = loadVedicSameArtifactCandidate(WORKSPACE_ROOT);
});

test("fixed-path loader returns a private brand and exact frozen summary", () => {
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV2(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  const summary = getVedicIndependentEngineeringManifestV2Summary(loaded);
  assert.deepEqual(summary.artifact, {
    bytes: 47_107,
    path:
      "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v2.json",
    sha256: "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4"
  });
  assert.equal(
    summary.manifestDigest,
    "7d4fcf50e4fdfa513611ace4331abf2079b1faf433f0a1c58e60603a9584a347"
  );
  assert.equal(summary.selectedUniquePhysicalPaths, 57);
  assert.equal(summary.engineeringAttachmentPaths, 31);
  assert.equal(summary.currentEngineeringManifestMechanicallyVerified, true);
  assert.equal(summary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.browserRuntimeEvidenceEstablishedByThisManifest, false);
});

test("persisted artifact is the exact current canonical projection", () => {
  assert.deepEqual(loaded.manifest, expected);
  const canonical =
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2(expected);
  assert.equal(Buffer.byteLength(canonical, "utf8"), 47_107);
  assert.equal(
    testOnly.sha256Text(canonical),
    "ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4"
  );
});

test("both upstreams require their fixed-path full-loader private brands", () => {
  assert.doesNotThrow(() => testOnly.requireVerifiedPredecessor(predecessor));
  assert.doesNotThrow(() => testOnly.requireVerifiedBrowserChild(browserChild));
  assert.throws(
    () => testOnly.requireVerifiedPredecessor(clone(predecessor)),
    (error) => error?.code === "PREDECESSOR_PRIVATE_BRAND_REQUIRED"
  );
  assert.throws(
    () => testOnly.requireVerifiedBrowserChild(clone(browserChild)),
    (error) => error?.code === "BROWSER_CHILD_PRIVATE_BRAND_REQUIRED"
  );
});

test("summary rejects an exact structural clone without the v2 private brand", () => {
  const impostor = clone(loaded);
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV2(impostor), false);
  assert.throws(
    () => getVedicIndependentEngineeringManifestV2Summary(impostor),
    (error) => error?.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("selected closure is exactly predecessor 33 plus child authored 24 with no overlap", () => {
  const selected = expected.selectedClosure.files;
  assert.equal(selected.length, 57);
  assert.equal(new Set(selected.map((file) => file.path)).size, 57);
  assert.equal(
    selected.filter((file) => file.declaredBy === "predecessor_manifest_v1").length,
    33
  );
  assert.equal(
    selected.filter(
      (file) => file.declaredBy
        === "browser_child_expected_authored_build_graph"
    ).length,
    24
  );
  assert.equal(expected.selectedClosure.overlapBetweenParentSets, 0);
  assert.equal(expected.selectedClosure.recursiveDirectoryEnumerationPerformed, false);
  assert.equal(expected.selectedClosure.extraFileAbsenceEstablished, false);
});

test("conservative component ledger is 35 refs, 26 mapped, 31 attachments", () => {
  assert.deepEqual(expected.componentAccounting, {
    componentCount: 9,
    componentFileReferences: 35,
    engineeringAttachmentPaths: 31,
    mappedUniquePhysicalPaths: 26,
    selectedUniquePhysicalPaths: 57
  });
  assert.deepEqual(
    expected.components.map((component) => [
      component.componentId,
      component.files.length
    ]),
    [
      ["execution_rules", 8],
      ["interpretation_rules", 0],
      ["input_policy", 9],
      ["fact_contract", 8],
      ["source_bundle", 4],
      ["rights_bundle", 2],
      ["expert_review_bundle", 0],
      ["high_risk_policy", 1],
      ["report_contract", 3]
    ]
  );
  assert.equal(
    expected.componentClassificationBoundary.semanticMembershipEstablished,
    false
  );
  for (const component of expected.components) {
    assert.equal(component.classificationBasis, "path_name_and_file_role_heuristic_only");
    assert.equal(component.boundary.semanticMembershipEstablished, false);
    assert.equal(component.boundary.componentComplete, false);
  }
});

test("component-specific anti-laundering boundaries remain red", () => {
  const components = Object.fromEntries(
    expected.components.map((component) => [component.componentId, component])
  );
  assert.equal(components.execution_rules.boundary.vedicRulesetEstablished, false);
  assert.equal(
    components.execution_rules.boundary.retainedIana2025bScenarioRuntimeRequested,
    false
  );
  assert.equal(components.fact_contract.boundary.factContractEstablished, false);
  assert.equal(components.fact_contract.boundary.domainFactTruthEstablished, false);
  assert.equal(components.rights_bundle.boundary.rightsEvidenceEstablished, false);
  assert.equal(
    components.rights_bundle.boundary.rightsLegalConclusionEstablished,
    false
  );
  assert.equal(
    components.expert_review_bundle.boundary.expertReviewInstanceEstablished,
    false
  );
  assert.equal(components.report_contract.boundary.reportContractEstablished, false);
  assert.equal(components.report_contract.boundary.formalReportEstablished, false);
});

test("known 7/4/4 omission counterexamples stay outside selected identity", () => {
  const selectedPaths = new Set(
    expected.selectedClosure.files.map((file) => file.path)
  );
  const omitted = [
    ...testOnly.FACT_BROWSER_OMITTED_NON_EVIDENCE,
    ...testOnly.FACT_BROWSER_EVIDENCE_TOOL_ONLY,
    ...testOnly.TZDB_CORE_OMITTED
  ];
  assert.equal(testOnly.FACT_BROWSER_OMITTED_NON_EVIDENCE.length, 7);
  assert.equal(testOnly.FACT_BROWSER_EVIDENCE_TOOL_ONLY.length, 4);
  assert.equal(testOnly.TZDB_CORE_OMITTED.length, 4);
  for (const pathName of omitted) assert.equal(selectedPaths.has(pathName), false);
  assert.equal(
    expected.scopeOmissions.omissionListsMechanicallyReverifiedByThisLoader,
    false
  );
});

test("directory, package, engineering, and full-domain closure laundering is rejected", () => {
  for (const mutate of [
    (value) => {
      value.selectedClosure.recursiveDirectoryEnumerationPerformed = true;
    },
    (value) => {
      value.selectedClosure.extraFileAbsenceEstablished = true;
    },
    (value) => {
      value.selectedClosure.entireFactBrowserDraftRootClosureEstablished = true;
    },
    (value) => {
      value.selectedClosure.entireTzdbCorePackageClosureEstablished = true;
    },
    (value) => {
      value.selectedClosure.entireVedicEngineeringClosureEstablished = true;
    },
    (value) => {
      value.versionBoundary.currentFullDomainManifestMechanicallyVerified = true;
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("an omitted, evidence-only, tzdb-test, or historical output path cannot enter components", () => {
  const injectedPaths = [
    testOnly.FACT_BROWSER_OMITTED_NON_EVIDENCE[0],
    testOnly.FACT_BROWSER_EVIDENCE_TOOL_ONLY[0],
    testOnly.TZDB_CORE_OMITTED[0],
    "assets/iana-2025b-BLy5AmWt.js"
  ];
  for (const injectedPath of injectedPaths) {
    const candidate = clone(expected);
    candidate.components[0].files.push({
      path: injectedPath,
      bytes: 1,
      sha256: "0".repeat(64)
    });
    candidate.components[0].fileReferenceCount += 1;
    candidate.componentAccounting.componentFileReferences += 1;
    assertRejectsProjection(resign(candidate));
  }
});

test("empty interpretation and expert slots cannot be populated or promoted", () => {
  for (const index of [1, 6]) {
    const candidate = clone(expected);
    candidate.components[index].files.push(
      clone(expected.selectedClosure.files[0])
    );
    delete candidate.components[index].files[0].declaredBy;
    candidate.components[index].fileReferenceCount = 1;
    candidate.components[index].boundary.componentComplete = true;
    candidate.componentAccounting.componentFileReferences += 1;
    assertRejectsProjection(resign(candidate));
  }
});

test("historical 10/10 browser child cannot become current product, PWA, or production evidence", () => {
  assert.deepEqual(
    expected.browserEvidenceBoundary.historicalIssuanceScenarioRuntimePaths,
    testOnly.HISTORICAL_SCENARIO_RUNTIME_PATHS
  );
  assert.deepEqual(
    expected.browserEvidenceBoundary.historicalIssuanceEvidenceOnlyProbePaths,
    testOnly.HISTORICAL_EVIDENCE_ONLY_PROBE_PATHS
  );
  assert.deepEqual(
    expected.browserEvidenceBoundary
      .historicalIssuanceNeitherScenarioRequestedNorEvidenceProbedPaths,
    testOnly.HISTORICAL_NEITHER_SCENARIO_NOR_PROBE_PATHS
  );
  assert.equal(
    expected.browserEvidenceBoundary
      .allTwelveOutputPathsWereScenarioRequestedOrEvidenceProbed,
    false
  );
  for (const mutate of [
    (value) => {
      value.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest = true;
    },
    (value) => {
      value.browserEvidenceBoundary.currentWorkspaceOutputInventoryEstablished = true;
    },
    (value) => {
      value.browserEvidenceBoundary.productionBrowserRuntimeEvidenceEstablished = true;
    },
    (value) => {
      value.browserEvidenceBoundary.pwaOrServiceWorkerValidated = true;
    },
    (value) => {
      value.browserEvidenceBoundary.publicHostValidated = true;
    },
    (value) => {
      value.browserEvidenceBoundary.retained2025bChunkScenarioRuntimeRequested = true;
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("private package label cannot be promoted to owner product identity", () => {
  for (const mutate of [
    (value) => {
      value.surface.ownerAssignedProductIdentity = true;
    },
    (value) => {
      value.surface.packageLabelOrVersionIsProductIdentity = true;
    },
    (value) => {
      value.productBoundary.productIdentity = "vedic-civil-time";
    },
    (value) => {
      value.productBoundary.releaseIdentity = "legacy-v13";
    },
    (value) => {
      value.productBoundary.targetSchema = 13;
    },
    (value) => {
      value.projectDefaultReleaseGovernance.inheritedByThisSystem = true;
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("gates, truth, rights, expert, release, and publication flags cannot be raised", () => {
  for (const mutate of [
    (value) => {
      value.gateState.admissionGatesSatisfied = 1;
    },
    (value) => {
      value.gateState.bindingFrozenVerified = 1;
    },
    (value) => {
      value.gateState.independentExpertReviewsVerified = 1;
    },
    (value) => {
      value.authorityBoundary.contentTruthEstablished = true;
    },
    (value) => {
      value.authorityBoundary.expertTruthEstablished = true;
    },
    (value) => {
      value.authorityBoundary.rightsLegalConclusionEstablished = true;
    },
    (value) => {
      value.authorityBoundary.releaseReady = true;
    },
    (value) => {
      value.authorityBoundary.publicReleaseAuthorized = true;
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("mutation epoch, atomicity, interval integrity, and ABA stay unestablished", () => {
  for (const mutate of [
    (value) => {
      value.observationBoundary.crossFileAtomicSnapshot = true;
    },
    (value) => {
      value.observationBoundary.intervalMutationExcludedAcrossFiles = true;
    },
    (value) => {
      value.observationBoundary.abaExcluded = true;
    },
    (value) => {
      value.observationBoundary.mutationEpochReceipt = "forged";
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("artifact binding drift, an extra direct binding, and clone substitution are rejected", () => {
  for (const mutate of [
    (value) => {
      value.artifactBindings[0].rawSha256 = "0".repeat(64);
    },
    (value) => {
      value.artifactBindings[1].observationDigest = "0".repeat(64);
    },
    (value) => {
      value.artifactBindings.push(clone(value.artifactBindings[0]));
    }
  ]) {
    const candidate = clone(expected);
    mutate(candidate);
    assertRejectsProjection(resign(candidate));
  }
});

test("unknown top-level data remains forbidden even after digest recomputation", () => {
  const candidate = clone(expected);
  candidate.futureAuthority = false;
  assertRejectsProjection(resign(candidate));
});

test("strict JSON parser rejects duplicate keys and BOM", () => {
  assert.throws(() => parseVedicIndependentEngineeringManifestV2JsonBytes(
    Buffer.from('{"schemaVersion":"2.0.0","schemaVersion":"2.0.0"}', "utf8")
  ));
  assert.throws(() => parseVedicIndependentEngineeringManifestV2JsonBytes(
    Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
  ));
});

test("canonical materialization rejects aliases, accessors, sparse arrays, and negative zero", () => {
  const shared = {};
  assert.throws(() =>
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2({
      left: shared,
      right: shared
    })
  );
  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get() { return 1; } });
  assert.throws(() =>
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2(accessor)
  );
  const sparse = [];
  sparse.length = 1;
  assert.throws(() =>
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2(sparse)
  );
  assert.throws(() =>
    canonicalPrettyStringifyVedicIndependentEngineeringManifestV2({ value: -0 })
  );
});

test("legacy v1 and browser child remain independently loadable and unchanged", () => {
  assert.equal(
    predecessor.manifestDigest,
    testOnly.EXPECTED_PREDECESSOR.manifestDigest
  );
  assert.equal(
    browserChild.observationDigest,
    testOnly.EXPECTED_BROWSER_CHILD.observationDigest
  );
  assert.equal(browserChild.formalContext.currentEngineeringManifestConsumesThisChild, false);
});

test("CLI succeeds only with no caller-supplied operands", () => {
  const ok = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(
    ok.stdout,
    /^VEDIC_PARENT_DECLARED_SELECTED_PATH_MACHINE_IDENTITY_MANIFEST_V2_OK /
  );

  const extra = spawnSync(process.execPath, [CLI_PATH, "caller-path.json"], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.equal(extra.status, 1);
  assert.match(extra.stderr, /ARGUMENTS_FORBIDDEN/);
});

test("CLI rejects visible NODE_OPTIONS and NODE_PATH before dynamic imports", () => {
  for (const extra of [
    { NODE_OPTIONS: "--no-warnings" },
    { NODE_PATH: WORKSPACE_ROOT }
  ]) {
    const result = spawnSync(process.execPath, [CLI_PATH], {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      env: { ...cleanCliEnvironment(), ...extra }
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
  }
});

test("CLI rejects a visible --import pre-evaluation path", () => {
  const result = spawnSync(
    process.execPath,
    ["--import", "data:text/javascript,", CLI_PATH],
    {
      cwd: WORKSPACE_ROOT,
      encoding: "utf8",
      env: cleanCliEnvironment()
    }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/);
});
