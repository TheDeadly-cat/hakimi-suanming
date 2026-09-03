import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
  WesternIndependentEngineeringManifestV2Error,
  buildCurrentWesternIndependentEngineeringManifestV2,
  canonicalPrettyStringifyWesternIndependentEngineeringManifestV2,
  computeWesternIndependentEngineeringManifestV2Digest,
  getWesternIndependentEngineeringManifestV2Summary,
  isVerifiedWesternIndependentEngineeringManifestV2,
  loadWesternIndependentEngineeringManifestV2,
  westernIndependentEngineeringManifestV2TestOnly as testOnly
} from "./western-independent-engineering-manifest-v2-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, "..");
const persistedPath = path.resolve(
  workspaceRoot,
  ...WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH.split("/")
);
const cliPath = path.join(
  scriptsDirectory,
  "verify-western-independent-engineering-manifest-v2.mjs"
);
const OK_PREFIX =
  "WESTERN_THREE_PACKAGE_AUTHORED_MACHINE_IDENTITY_MANIFEST_V2_OK ";
const FAILED_PREFIX =
  "WESTERN_THREE_PACKAGE_AUTHORED_MACHINE_IDENTITY_MANIFEST_V2_FAILED ";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizedEnvironment(extra = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...extra };
}

function expectCode(code) {
  return (error) => {
    assert.equal(error?.code, code, `unexpected ${error?.code ?? error?.name}`);
    return true;
  };
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) assertDeepFrozen(value[key], seen);
}

async function withAuthoredPackageFixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-manifest-v2-"));
  try {
    for (const relativePath of testOnly.EXPECTED_AUTHORED_PATHS) {
      const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
      const destination = path.resolve(root, ...relativePath.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(source, destination);
    }
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function runNode(argumentsList, options = {}) {
  try {
    const result = await execFileAsync(process.execPath, argumentsList, {
      cwd: options.cwd ?? workspaceRoot,
      env: options.env ?? sanitizedEnvironment(),
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: error.code,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? ""
    };
  }
}

test("builder stays unbranded while fixed-path full loader mints one frozen v2 brand", async () => {
  const built = await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot);
  const loaded = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  assert.deepEqual(loaded.manifest, built);
  assert.equal(isVerifiedWesternIndependentEngineeringManifestV2(built), false);
  assert.equal(isVerifiedWesternIndependentEngineeringManifestV2(loaded), true);
  assert.equal(
    isVerifiedWesternIndependentEngineeringManifestV2(structuredClone(loaded)),
    false
  );
  assertDeepFrozen(loaded);
});

test("persisted bytes, SHA-256, canonical LF and semantic digest are exact", async () => {
  const loaded = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  const raw = await readFile(persistedPath);
  assert.equal(raw.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(loaded.manifest.manifestDigest, testOnly.EXPECTED_PERSISTED.manifestDigest);
  assert.equal(
    computeWesternIndependentEngineeringManifestV2Digest(loaded.manifest),
    loaded.manifest.manifestDigest
  );
  assert.equal(
    raw.toString("utf8"),
    canonicalPrettyStringifyWesternIndependentEngineeringManifestV2(loaded.manifest)
  );
  assert.equal(raw.includes(13), false);
  assert.equal(raw.at(-1), 10);
});

test("three selected package roots are exact without promotion to full Western closure", async () => {
  const loaded = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  const manifest = loaded.manifest;
  const closure = manifest.threePackageAuthoredFileClosure;
  assert.equal(closure.scopeClass,
    "three_selected_package_roots_exact_not_entire_western_engineering_closure");
  assert.equal(closure.threeSelectedPackageRootsExact, true);
  assert.equal(closure.entireWesternEngineeringClosureEstablished, false);
  assert.equal(closure.observedUniquePhysicalPaths, 70);
  assert.deepEqual(closure.rootFileCounts, {
    "packages/western-astrology-contracts-draft": 6,
    "packages/western-astrology-rules-preview-draft": 24,
    "packages/western-astronomy-engine-adapter-draft": 40
  });
  assert.deepEqual(
    closure.files.map((file) => file.path),
    testOnly.EXPECTED_AUTHORED_PATHS
  );
  assert.deepEqual(closure.explicitlyOutsideThisClosure, [
    {
      enumeratedByThisManifest: false,
      identityVerifiedByThisManifest: false,
      path: "isolated-drafts/western-civil-time-fact-browser-draft"
    },
    {
      enumeratedByThisManifest: false,
      identityVerifiedByThisManifest: false,
      path: "packages/western-civil-time-input-adapter-draft"
    }
  ]);
});

test("nine component views are a bidirectional path-name heuristic over 70 identities", async () => {
  const manifest = (await loadWesternIndependentEngineeringManifestV2(workspaceRoot)).manifest;
  assert.equal(manifest.componentAccounting.componentCount, 9);
  assert.equal(manifest.componentAccounting.componentFileReferences, 152);
  assert.equal(manifest.componentAccounting.uniquePhysicalPaths, 70);
  assert.equal(manifest.components.length, 9);
  assert.ok(manifest.components.every((component) => component.files.length > 0));
  assert.deepEqual(manifest.componentClassificationBoundary, {
    componentMembershipEstablishesDomainTruth: false,
    componentReferenceFanoutEqualsIndependentSemanticChanges: false,
    pathNameHeuristicRoutingOnly: true,
    semanticDependencyOrCallgraphEstablished: false
  });
  for (const physical of manifest.threePackageAuthoredFileClosure.files) {
    assert.ok(physical.componentIds.length > 0);
    for (const componentId of physical.componentIds) {
      const component = manifest.components.find((entry) => entry.componentId === componentId);
      assert.equal(
        component.files.filter((entry) => entry.path === physical.path).length,
        1
      );
    }
  }
});

test("componentIds use fixed business order rather than code-unit order", async () => {
  const manifest = await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot);
  const contractsIndex = manifest.threePackageAuthoredFileClosure.files.find(
    (file) => file.path === "packages/western-astrology-contracts-draft/src/index.ts"
  );
  assert.deepEqual(contractsIndex.componentIds, [
    "execution_rules",
    "interpretation_rules",
    "input_policy",
    "fact_contract",
    "high_risk_policy",
    "report_contract"
  ]);
  const tampered = clone(manifest);
  tampered.threePackageAuthoredFileClosure.files.find(
    (file) => file.path === contractsIndex.path
  ).componentIds.sort();
  assert.throws(
    () => testOnly.assertManifestBoundary(tampered),
    expectCode("ARRAY_BOUNDARY_INVALID")
  );
});

test("current parent is branded while four historical records remain raw+self context only", async () => {
  const manifest = (await loadWesternIndependentEngineeringManifestV2(workspaceRoot)).manifest;
  assert.equal(manifest.artifactBindings.length, 5);
  assert.equal(manifest.artifactBindings[0].path, testOnly.DRIFT_RECEIPT.path);
  assert.equal(manifest.artifactBindings[0].privateBrandConsumed, true);
  assert.equal(manifest.artifactBindings[0].currentFullLoaderVerified, true);
  for (const context of manifest.artifactBindings.slice(1)) {
    assert.equal(context.rawAndSelfDigestVerified, true);
    assert.equal(context.privateBrandConsumed, false);
    assert.equal(context.currentFullLoader, false);
    assert.equal(context.rebindOrResignPerformed, false);
  }
});

test("product, source, runtime, epoch, gate and authority accounts stay red", async () => {
  const manifest = (await loadWesternIndependentEngineeringManifestV2(workspaceRoot)).manifest;
  assert.deepEqual(manifest.productBoundary, {
    centralRegistryIntegration: "absent",
    formalProductSurface: "absent",
    mainApplicationIntegrated: false,
    migrationId: null,
    productIdentity: null,
    releaseIdentity: null,
    runtimeOption: "unselected",
    storageBackend: "unselected",
    targetSchema: null
  });
  assert.equal(manifest.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(manifest.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(manifest.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(manifest.projectReleaseGovernanceContext.inheritedByWesternProductIdentity, false);
  assert.equal(manifest.currentnessBoundary.currentFullDomainManifest, false);
  assert.equal(manifest.currentnessBoundary.formalOrCurrentSourceRequirements, false);
  assert.equal(manifest.currentnessBoundary.browserRuntimeEvidence, false);
  assert.equal(manifest.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(manifest.observationBoundary.mutationEpochAvailable, false);
  assert.equal(manifest.observationBoundary.mutationEpochReceipt, null);
  assert.equal(manifest.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(manifest.observationBoundary.abaExcluded, false);
  assert.equal(manifest.runtimeTrustBoundary.hiddenPreloadExcluded, false);
  assert.equal(manifest.gateState.admissionGatesSatisfied, 0);
  assert.equal(manifest.gateState.admissionGatesRequired, 8);
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.bindingRequired, 28);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(manifest.gateState.independentExpertsRequired, 2);
  assert.ok(Object.values(manifest.authorityBoundary).every((value) => value === false));
});

test("recursive enumeration exact-compares all 70 authored leaves", async () => {
  await withAuthoredPackageFixture(async (root) => {
    const files = await testOnly.collectAuthoredPackageClosure(root);
    assert.equal(files.length, 70);
    assert.deepEqual(files.map((file) => file.path), testOnly.EXPECTED_AUTHORED_PATHS);
  });
});

test("hidden, extensionless and unknown-extension authored leaves cannot disappear", async () => {
  await withAuthoredPackageFixture(async (root) => {
    const probes = [
      "packages/western-astrology-contracts-draft/src/.hidden",
      "packages/western-astrology-contracts-draft/src/extensionless",
      "packages/western-astrology-contracts-draft/src/policy.xyzzy"
    ];
    for (const probe of probes) {
      const target = path.resolve(root, ...probe.split("/"));
      await writeFile(target, "probe\n", "utf8");
      await assert.rejects(
        testOnly.collectAuthoredPackageClosure(root),
        expectCode("AUTHORED_CLOSURE_PATH_SET_MISMATCH")
      );
      await rm(target);
    }
  });
});

test("only exact package-root runtime subtrees are excluded", async () => {
  await withAuthoredPackageFixture(async (root) => {
    for (const subtree of testOnly.EXCLUDED_RUNTIME_SUBTREES) {
      const directory = path.resolve(root, ...subtree.split("/"));
      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, "ignored.anything"), "ignored\n", "utf8");
    }
    const files = await testOnly.collectAuthoredPackageClosure(root);
    assert.deepEqual(files.map((file) => file.path), testOnly.EXPECTED_AUTHORED_PATHS);

    const nested = path.resolve(
      root,
      "packages/western-astrology-contracts-draft/src/tmp/policy.ts"
    );
    await mkdir(path.dirname(nested), { recursive: true });
    await writeFile(nested, "export {};\n", "utf8");
    await assert.rejects(
      testOnly.collectAuthoredPackageClosure(root),
      expectCode("AUTHORED_CLOSURE_EXTRA_DIRECTORY")
    );
  });
});

test("an ordinary extra directory fails before it can become an unlisted subtree", async () => {
  await withAuthoredPackageFixture(async (root) => {
    await mkdir(path.resolve(
      root,
      "packages/western-astrology-rules-preview-draft/src/extra-authored"
    ));
    await assert.rejects(
      testOnly.collectAuthoredPackageClosure(root),
      expectCode("AUTHORED_CLOSURE_EXTRA_DIRECTORY")
    );
  });
});

test("reparse/junction at an otherwise excluded root is rejected before exclusion", async (t) => {
  await withAuthoredPackageFixture(async (root) => {
    const target = path.resolve(root, "junction-target");
    const junction = path.resolve(
      root,
      "packages/western-astrology-contracts-draft/tmp"
    );
    await mkdir(target);
    try {
      await symlink(target, junction, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        t.skip(`platform cannot create reparse probe: ${error.code}`);
        return;
      }
      throw error;
    }
    await assert.rejects(
      testOnly.collectAuthoredPackageClosure(root),
      expectCode("AUTHORED_REPARSE_OR_SYMLINK_FORBIDDEN")
    );
  });
});

test("hardlinked authored identity is rejected by held-handle reader", async () => {
  await withAuthoredPackageFixture(async (root) => {
    const target = path.resolve(
      root,
      "packages/western-astrology-contracts-draft/README.md"
    );
    await link(target, path.resolve(root, "hardlink-shadow.md"));
    await assert.rejects(
      testOnly.collectAuthoredPackageClosure(root),
      expectCode("HARDLINK_REJECTED")
    );
  });
});

test("duplicate physical membership cannot be hidden by map or set deduplication", async () => {
  const manifest = clone(
    await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot)
  );
  manifest.threePackageAuthoredFileClosure.files[1] = clone(
    manifest.threePackageAuthoredFileClosure.files[0]
  );
  manifest.manifestDigest = computeWesternIndependentEngineeringManifestV2Digest(manifest);
  assert.throws(
    () => testOnly.assertManifestBoundary(manifest),
    expectCode("ARRAY_BOUNDARY_INVALID")
  );
});

test("component physical membership must remain bidirectional", async () => {
  const manifest = clone(
    await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot)
  );
  const physical = manifest.threePackageAuthoredFileClosure.files.find(
    (file) => file.componentIds.length > 1
  );
  physical.componentIds.pop();
  manifest.manifestDigest = computeWesternIndependentEngineeringManifestV2Digest(manifest);
  assert.throws(
    () => testOnly.assertManifestBoundary(manifest),
    expectCode("COMPONENT_PHYSICAL_MEMBERSHIP_MISMATCH")
  );
});

test("promotion tampering fails before any authority can turn green", async () => {
  const baseline = await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot);
  const cases = [
    ["RED_BOUNDARY_MISMATCH", (value) => {
      value.authorityBoundary.publicReleaseAuthorized = true;
    }],
    ["GATE_PROMOTION_FORBIDDEN", (value) => {
      value.gateState.admissionGatesSatisfied = 1;
    }],
    ["PRODUCT_PROMOTION_FORBIDDEN", (value) => {
      value.productBoundary.productIdentity = "forbidden";
    }],
    ["MUTATION_BOUNDARY_PROMOTION_FORBIDDEN", (value) => {
      value.observationBoundary.mutationEpochAvailable = true;
    }],
    ["UPSTREAM_CURRENTNESS_MISMATCH", (value) => {
      value.currentnessBoundary.currentFullDomainManifest = true;
    }],
    ["COMPONENT_CLASSIFICATION_BOUNDARY_MISMATCH", (value) => {
      value.componentClassificationBoundary.semanticDependencyOrCallgraphEstablished = true;
    }]
  ];
  for (const [code, mutate] of cases) {
    const value = clone(baseline);
    mutate(value);
    value.manifestDigest = computeWesternIndependentEngineeringManifestV2Digest(value);
    assert.throws(() => testOnly.assertManifestBoundary(value), expectCode(code));
  }
});

test("summary accepts only the v2 fixed-path private brand", async () => {
  const built = await buildCurrentWesternIndependentEngineeringManifestV2(workspaceRoot);
  assert.throws(
    () => getWesternIndependentEngineeringManifestV2Summary(built),
    expectCode("VERIFIED_BRAND_REQUIRED")
  );
  const loaded = await loadWesternIndependentEngineeringManifestV2(workspaceRoot);
  const summary = getWesternIndependentEngineeringManifestV2Summary(loaded);
  assert.equal(summary.uniquePhysicalPaths, 70);
  assert.equal(summary.threeSelectedPackageRootsExact, true);
  assert.equal(summary.entireWesternEngineeringClosureEstablished, false);
  assert.equal(summary.componentReferencesArePathNameHeuristicRoutingOnly, true);
  assert.equal(summary.componentReferenceFanoutEqualsIndependentSemanticChanges, false);
  assert.equal(summary.publicReleaseAuthorized, false);
});

test("CLI resolves its fixed workspace from another cwd and reports narrow red boundaries", async () => {
  const result = await runNode([cliPath], { cwd: os.tmpdir() });
  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.ok(result.stdout.startsWith(OK_PREFIX));
  const summary = JSON.parse(result.stdout.slice(OK_PREFIX.length));
  assert.equal(summary.artifact.rawBytes, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(summary.artifact.rawSha256, testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(summary.manifestDigest, testOnly.EXPECTED_PERSISTED.manifestDigest);
  assert.equal(summary.uniquePhysicalPaths, 70);
  assert.equal(summary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(summary.browserRuntimeEvidenceEstablished, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicReleaseAuthorized, false);
});

test("CLI rejects operands and visible loader environments", async () => {
  const operand = await runNode([cliPath, "unexpected"]);
  assert.equal(operand.exitCode, 1);
  assert.equal(operand.stderr, `${FAILED_PREFIX}ARGUMENTS_FORBIDDEN\n`);

  const options = await runNode([cliPath], {
    env: sanitizedEnvironment({ NODE_OPTIONS: "--no-warnings" })
  });
  assert.equal(options.exitCode, 1);
  assert.equal(options.stderr, `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`);

  const nodePath = await runNode([cliPath], {
    env: sanitizedEnvironment({ NODE_PATH: workspaceRoot })
  });
  assert.equal(nodePath.exitCode, 1);
  assert.equal(nodePath.stderr, `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
});

test("visible --import is rejected before poisoned toLowerCase or argv[1] dispatch", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-cli-poison-"));
  try {
    const lowerPoison = path.join(root, "lower-poison.mjs");
    const argvPoison = path.join(root, "argv-poison.mjs");
    await writeFile(lowerPoison, "String.prototype.toLowerCase = () => '';\n", "utf8");
    await writeFile(argvPoison, "process.argv[1] = undefined;\n", "utf8");
    for (const poison of [lowerPoison, argvPoison]) {
      const result = await runNode(["--import", pathToFileURL(poison).href, cliPath]);
      assert.equal(result.exitCode, 1);
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("supported -r preload reaches the guard; compact -r runtime rejection is calibrated", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-cli-require-"));
  try {
    const poison = path.join(root, "poison.cjs");
    await writeFile(poison, "process.argv[1] = undefined;\n", "utf8");
    const supported = await runNode(["-r", "./poison.cjs", cliPath], { cwd: root });
    assert.equal(supported.exitCode, 1);
    assert.equal(supported.stdout, "");
    assert.equal(supported.stderr,
      `${FAILED_PREFIX}PRELOAD_ENVIRONMENT_FORBIDDEN\n`);

    const compact = await runNode(["-r./poison.cjs", cliPath], { cwd: root });
    assert.notEqual(compact.exitCode, 0);
    assert.equal(compact.stdout, "");
    assert.match(compact.stderr, /bad option|PRELOAD_ENVIRONMENT_FORBIDDEN/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("importing CLI as a module does not dispatch", async () => {
  const result = await runNode([
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(pathToFileURL(cliPath).href)});`
  ]);
  assert.equal(result.exitCode, 0, result.stderr);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
});

test("library exposes its dedicated error type for fail-closed callers", () => {
  const error = new WesternIndependentEngineeringManifestV2Error("PROBE", "probe");
  assert.equal(error.code, "PROBE");
  assert.match(error.message, /^PROBE:/u);
});
