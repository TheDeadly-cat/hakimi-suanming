import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH,
  WesternIndependentEngineeringManifestV5Error,
  buildCurrentWesternIndependentEngineeringManifestV5,
  computeWesternIndependentEngineeringManifestV5Digest,
  getWesternIndependentEngineeringManifestV5Summary,
  isVerifiedWesternIndependentEngineeringManifestV5,
  loadWesternIndependentEngineeringManifestV5,
  serializeWesternIndependentEngineeringManifestV5,
  westernIndependentEngineeringManifestV5TestOnly as testOnly
} from "./western-independent-engineering-manifest-v5-lib.mjs";
import {
  loadWesternIndependentEngineeringManifestV4
} from "./western-independent-engineering-manifest-v4-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CLI = path.join(ROOT, "scripts", "verify-western-independent-engineering-manifest-v5.mjs");
const parentPromise = loadWesternIndependentEngineeringManifestV4(ROOT);
const builtPromise = buildCurrentWesternIndependentEngineeringManifestV5(ROOT);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  value.manifestDigest = computeWesternIndependentEngineeringManifestV5Digest(value);
  return value;
}

async function expectCode(action, code) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof WesternIndependentEngineeringManifestV5Error);
    assert.equal(error.code, code);
    return true;
  });
}

async function makeFixture() {
  const parent = await parentPromise;
  const expected = testOnly.deriveExpectedPartition(parent).expectedPaths;
  const fixture = await mkdtemp(path.join(os.tmpdir(), "hakimi-western-v5-roots-"));
  for (const relativePath of expected) {
    const destination = path.join(fixture, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(ROOT, ...relativePath.split("/")), destination);
  }
  return fixture;
}

async function withFixture(action) {
  const fixture = await makeFixture();
  try {
    return await action(fixture, await parentPromise);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

test("fresh v5 projection is exactly six roots, 110 files, and a 95 plus 15 partition", async () => {
  const built = await builtPromise;
  assert.equal(built.recursiveAuthoredRootClosure.allowlistedRootCount, 6);
  assert.equal(built.recursiveAuthoredRootClosure.observedAuthoredOrdinaryFileCount, 110);
  assert.equal(built.predecessorV4Partition.predecessorSelectedPathsInsideSixRoots, 95);
  assert.equal(built.predecessorV4Partition.previouslyUnselectedFileCount, 15);
  assert.deepEqual(built.recursiveAuthoredRootClosure.rootFileCounts, testOnly.ROOT_FILE_COUNTS);
});

test("fixed-path full loader verifies canonical persisted bytes and frozen identity", async () => {
  const loaded = await loadWesternIndependentEngineeringManifestV5(ROOT);
  const built = await builtPromise;
  assert.equal(isVerifiedWesternIndependentEngineeringManifestV5(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.manifest.recursiveAuthoredRootClosure.files), true);
  const bytes = await readFile(path.join(
    ROOT,
    ...WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V5_RELATIVE_PATH.split("/")
  ));
  assert.equal(serializeWesternIndependentEngineeringManifestV5(built), bytes.toString("utf8"));
  assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256);
  assert.equal(loaded.manifest.manifestDigest, testOnly.EXPECTED_PERSISTED.manifestDigest);
});

test("15 files mean only v4-unselected and never authorized or formally promoted", async () => {
  const built = await builtPromise;
  const partition = built.predecessorV4Partition;
  assert.deepEqual(partition.previouslyUnselectedFiles.map((entry) => entry.path),
    testOnly.PREVIOUSLY_UNSELECTED_PATHS);
  assert.equal(partition.previouslyUnselectedMeansOnlyAbsentFromV4SelectedPathSet, true);
  assert.equal(partition.authorizationDeterminationMade, false);
  assert.equal(partition.previouslyUnselectedFilesAuthorizedAsDomainContent, false);
  assert.equal(partition.previouslyUnselectedFilesFormallyPromoted, false);
  for (const entry of partition.previouslyUnselectedFiles) {
    assert.equal(entry.authorizationDeterminationMade, false);
    assert.equal(entry.formallyPromoted, false);
  }
});

test("all five civil-time input adapter files are covered only by machine identity", async () => {
  const built = await builtPromise;
  const inputFiles = built.recursiveAuthoredRootClosure.files.filter((entry) =>
    entry.path.startsWith("packages/western-civil-time-input-adapter-draft/"));
  assert.equal(inputFiles.length, 5);
  assert.equal(built.componentAndCapabilityBoundary.formalInputContractEstablished, false);
  assert.equal(built.componentAndCapabilityBoundary.factContractFormallyEstablished, false);
  assert.equal(built.productBoundary.mainApplicationIntegrated, false);
});

test("tzdb-core remains a shared dependency, never Western ownership or rights clearance", async () => {
  const built = await builtPromise;
  assert.deepEqual(built.sharedDependencyBoundary, {
    sharedRoot: "packages/tzdb-core",
    includedAsMachineIdentityDependencyRoot: true,
    exclusivelyOwnedByWesternEstablished: false,
    sourceProvenanceComplete: false,
    rightsOrRedistributionCleared: false,
    establishesWesternRuleset: false,
    establishesEntireWesternEngineeringClosure: false
  });
});

test("browser child evidence is retained by parent reference and is not rerun", async () => {
  const built = await builtPromise;
  assert.equal(built.lineage.predecessorBrowserChildBindingRetainedByReference, true);
  assert.equal(built.lineage.browserMatrixRerunByThisManifest, false);
  assert.equal(built.browserEvidenceBoundary.browserMatrixRerunByThisManifest, false);
  assert.equal(built.browserEvidenceBoundary.totalPassedScenarioOutcomesAtChildIssuance, 10);
  assert.equal(built.browserEvidenceBoundary.browserRuntimeEvidenceEstablishedByThisManifest, false);
});

test("direct runtime subtree contents are excluded but explicitly non-authoritative", async () => {
  await withFixture(async (fixture, parent) => {
    const runtimeDirectory = path.join(
      fixture,
      "isolated-drafts",
      "western-civil-time-fact-browser-draft",
      "node_modules",
      "nested"
    );
    await mkdir(runtimeDirectory, { recursive: true });
    await writeFile(path.join(runtimeDirectory, "cache.bin"), "not-authoritative", "utf8");
    const inventory = await testOnly.enumerateAuthoredPaths(fixture, parent);
    assert.equal(inventory.paths.length, 110);
    assert.equal(inventory.paths.some((entry) => entry.includes("node_modules")), false);
  });
});

test("a future ordinary file inside a visited root fails closed", async () => {
  await withFixture(async (fixture, parent) => {
    await writeFile(path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "src",
      "future.ts"
    ), "export {};\n", "utf8");
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_FILE_SET_DRIFT");
  });
});

test("a missing expected file fails closed", async () => {
  await withFixture(async (fixture, parent) => {
    await rm(path.join(fixture, "packages", "tzdb-core", "src", "index.test.ts"));
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_FILE_SET_DRIFT");
  });
});

test("an unexpected empty directory inside a visited root fails closed", async () => {
  await withFixture(async (fixture, parent) => {
    await mkdir(path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "future-empty"
    ));
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_DIRECTORY_SET_DRIFT");
  });
});

test("a hardlinked expected file is rejected", async () => {
  await withFixture(async (fixture, parent) => {
    const target = path.join(fixture, "packages", "tzdb-core", "package.json");
    const outside = path.join(fixture, "outside");
    await mkdir(outside);
    await link(target, path.join(outside, "alias.json"));
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_HARDLINK_FORBIDDEN");
  });
});

test("a directory junction or symlink inside a visited root is rejected", async (t) => {
  await withFixture(async (fixture, parent) => {
    const original = path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "src"
    );
    const outside = path.join(fixture, "outside-src");
    await rename(original, outside);
    try {
      await symlink(outside, original, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        t.skip(`symlink/junction unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN");
  });
});

test("a junction at an excluded runtime subtree is still rejected", async (t) => {
  await withFixture(async (fixture, parent) => {
    const outside = path.join(fixture, "outside-runtime");
    await mkdir(outside);
    const junction = path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "node_modules"
    );
    try {
      await symlink(outside, junction, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        t.skip(`symlink/junction unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await expectCode(() => testOnly.enumerateAuthoredPaths(fixture, parent),
      "ROOT_SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN");
  });
});

test("detectable endpoint replacement after enumeration is rejected", async () => {
  await withFixture(async (fixture, parent) => {
    const target = path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "README.md"
    );
    let changed = false;
    await expectCode(
      () => testOnly.collectAuthoredTreeIdentity(fixture, parent, {
        async afterEnumeration({ pass }) {
          if (pass !== 1 || changed) return;
          changed = true;
          const bytes = await readFile(target);
          await rm(target);
          await writeFile(target, bytes);
        }
      }),
      "ROOT_INVENTORY_ENDPOINT_DRIFT"
    );
  });
});

test("detectable content mutation between complete passes is rejected", async () => {
  await withFixture(async (fixture, parent) => {
    const target = path.join(
      fixture,
      "packages",
      "western-civil-time-input-adapter-draft",
      "README.md"
    );
    await expectCode(
      () => testOnly.collectAuthoredTreeIdentity(fixture, parent, {
        async afterFirstPass() {
          await writeFile(target, "changed between complete passes\n", "utf8");
        }
      }),
      "ROOT_TREE_PRE_POST_DRIFT"
    );
  });
});

test("boundary rejects recomputed reparse, authorization, ownership, capability, gate, and authority promotions", async () => {
  const built = await builtPromise;
  const mutations = [
    (value) => { value.recursiveAuthoredRootClosure.genericNtfsReparseTagEnumerated = true; },
    (value) => { value.recursiveAuthoredRootClosure.allReparseClassesExcluded = true; },
    (value) => { value.predecessorV4Partition.authorizationDeterminationMade = true; },
    (value) => { value.predecessorV4Partition.previouslyUnselectedFilesFormallyPromoted = true; },
    (value) => { value.sharedDependencyBoundary.exclusivelyOwnedByWesternEstablished = true; },
    (value) => { value.sharedDependencyBoundary.rightsOrRedistributionCleared = true; },
    (value) => { value.componentAndCapabilityBoundary.formalInputContractEstablished = true; },
    (value) => { value.browserEvidenceBoundary.browserMatrixRerunByThisManifest = true; },
    (value) => { value.gateState.bindingFrozenVerified = 1; },
    (value) => { value.gateState.independentExpertReviewsVerified = 1; },
    (value) => { value.authorityBoundary.contentTruthEstablished = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.productBoundary.productIdentity = "western-product"; },
    (value) => { value.observationBoundary.mutationEpochAvailable = true; },
    (value) => { value.observationBoundary.intervalMutationExcludedAcrossFiles = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(built);
    mutate(candidate);
    redigest(candidate);
    assert.throws(() => testOnly.assertBoundary(candidate));
  }
});

test("unbranded build cannot be summarized as a verified fixed-path manifest", async () => {
  const built = await builtPromise;
  assert.equal(isVerifiedWesternIndependentEngineeringManifestV5(built), false);
  assert.throws(() => getWesternIndependentEngineeringManifestV5Summary(built),
    (error) => error.code === "MANIFEST_PRIVATE_BRAND_REQUIRED");
});

test("CLI succeeds only on its fixed no-preload invocation", () => {
  const clean = { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" };
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: clean,
    timeout: 90_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout,
    /^WESTERN_SIX_ALLOWLISTED_AUTHORED_ROOT_RECURSIVE_MACHINE_IDENTITY_MANIFEST_V5_OK /u);

  const argument = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: clean
  });
  assert.notEqual(argument.status, 0);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preload = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...clean, NODE_PATH: "visible-loader-path" }
  });
  assert.notEqual(preload.status, 0);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});

test("all gate, product, mutation, content, expert, rights, and release ledgers stay red", async () => {
  const built = await builtPromise;
  assert.deepEqual(built.gateState, {
    admissionGatesRequired: 8,
    admissionGatesSatisfied: 0,
    bindingRequired: 28,
    bindingFrozenVerified: 0,
    independentExpertsRequired: 2,
    independentExpertReviewsVerified: 0,
    sourceBundleComplete: false,
    rightsBundleComplete: false,
    expertReviewBundleComplete: false,
    highRiskPolicyBound: false,
    releaseEvidenceComplete: false
  });
  assert.equal(built.productBoundary.productIdentity, null);
  assert.equal(built.productBoundary.releaseIdentity, null);
  assert.equal(built.productBoundary.targetSchema, null);
  assert.equal(built.productBoundary.migrationId, null);
  assert.equal(built.projectReleaseGovernanceContext.activeLine, "legacy-v13");
  assert.equal(built.projectReleaseGovernanceContext.targetSchema, 13);
  assert.equal(built.projectReleaseGovernanceContext.migrationId, null);
  assert.equal(built.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(built.observationBoundary.mutationEpochAvailable, false);
  assert.equal(built.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(built.observationBoundary.abaExcluded, false);
  assert.ok(Object.values(built.authorityBoundary).every((entry) => entry === false));
});
