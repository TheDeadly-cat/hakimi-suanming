import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  lstat,
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
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
  VedicIndependentEngineeringManifestV3Error,
  buildCurrentVedicIndependentEngineeringManifestV3,
  computeVedicIndependentEngineeringManifestV3Digest,
  getVedicIndependentEngineeringManifestV3Summary,
  isVerifiedVedicIndependentEngineeringManifestV3,
  loadVedicIndependentEngineeringManifestV3,
  serializeVedicIndependentEngineeringManifestV3,
  vedicIndependentEngineeringManifestV3TestOnly as testOnly
} from "./vedic-independent-engineering-manifest-v3-lib.mjs";
import {
  readCurrentVedicIndependentEngineeringManifestV2
} from "./vedic-independent-engineering-manifest-v2-lib.mjs";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const CLI_PATH = path.join(
  WORKSPACE_ROOT,
  "scripts",
  "verify-vedic-independent-engineering-manifest-v3.mjs"
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function redigest(value) {
  value.manifestDigest = computeVedicIndependentEngineeringManifestV3Digest(value);
  return value;
}

async function expectCode(action, expectedCode) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof VedicIndependentEngineeringManifestV3Error);
    assert.equal(error.code, expectedCode);
    return true;
  });
}

async function makeRootFixture() {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-v3-roots-"));
  for (const relativePath of testOnly.EXPECTED_AUTHORED_PATHS) {
    const destination = path.join(fixture, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(WORKSPACE_ROOT, ...relativePath.split("/")), destination);
  }
  return fixture;
}

async function withFixture(callback) {
  const fixture = await makeRootFixture();
  try {
    return await callback(fixture);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

test("fixed-path full loader verifies the current 58-file recursive root identity", async () => {
  const loaded = await loadVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV3(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.equal(Object.isFrozen(loaded.manifest.recursiveAuthoredRootClosure.files), true);
  const summary = getVedicIndependentEngineeringManifestV3Summary(loaded);
  assert.deepEqual(summary, {
    artifact: {
      path: VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH,
      rawBytes: 35_325,
      rawSha256: "c3d35e24073e7be14be971dae4e6825758b9fbfc3efd4adbc372e91fb74bf278"
    },
    manifestId:
      "hakimi.vedic-astrology.five-allowlisted-authored-root-recursive-machine-identity-manifest/3.0.0",
    manifestDigest: "b466a83ada3c9f39721cfc4a54628eb1a9afa03ff4794f51461fb6b4100041b2",
    allowlistedRootCount: 5,
    authoredOrdinaryFileCount: 58,
    additionalDiscoveredFileCount: 15,
    excludedRuntimeSubtreeCount: 25,
    currentEngineeringManifestMechanicallyVerified: true,
    currentFullDomainManifestMechanicallyVerified: false,
    admissionGatesSatisfied: 0,
    admissionGatesRequired: 8,
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    productIdentity: null,
    releaseIdentity: null,
    targetSchema: null,
    migrationId: null,
    releaseReady: false,
    publicReleaseAuthorized: false
  });
});

test("fresh build exactly matches canonical persisted bytes and frozen identity", async () => {
  const built = await buildCurrentVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  const persistedBytes = await readFile(
    path.join(WORKSPACE_ROOT, ...VEDIC_INDEPENDENT_ENGINEERING_MANIFEST_V3_RELATIVE_PATH.split("/"))
  );
  const persisted = JSON.parse(persistedBytes.toString("utf8"));
  assert.equal(serializeVedicIndependentEngineeringManifestV3(built), persistedBytes.toString("utf8"));
  assert.deepEqual(built, persisted);
  assert.equal(persistedBytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
  assert.equal(
    createHash("sha256").update(persistedBytes).digest("hex"),
    testOnly.EXPECTED_PERSISTED.rawSha256
  );
  assert.equal(persisted.manifestDigest, testOnly.EXPECTED_PERSISTED.manifestDigest);
});

test("15 additional files are exact identities and mean v2-unselected, not unauthorized", async () => {
  const loaded = await loadVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  const manifest = loaded.manifest;
  assert.equal(manifest.parentV2Partition.additionalMeansNotSelectedByV2NotUnauthorized, true);
  assert.equal(manifest.parentV2Partition.unauthorizedFileDeterminationMade, false);
  assert.equal(manifest.parentV2Partition.additionalFilesAuthorizedAsDomainContent, false);
  assert.deepEqual(
    manifest.parentV2Partition.additionalDiscoveredFiles.map((entry) => entry.path),
    testOnly.EXPECTED_ADDITIONAL_PATHS
  );
  for (const additional of manifest.parentV2Partition.additionalDiscoveredFiles) {
    const physical = manifest.recursiveAuthoredRootClosure.files.find(
      (entry) => entry.path === additional.path
    );
    assert.ok(physical);
    assert.equal(physical.selectedByParentV2, false);
    assert.equal(additional.bytes, physical.bytes);
    assert.equal(additional.sha256, physical.sha256);
  }
});

test("excluded runtime subtrees remain explicitly non-enumerated and non-authoritative", async () => {
  await withFixture(async (fixture) => {
    const excluded = path.join(
      fixture,
      "isolated-drafts",
      "vedic-civil-time-fact-browser-draft",
      "node_modules",
      "nested"
    );
    await mkdir(excluded, { recursive: true });
    await writeFile(path.join(excluded, "runtime-cache.bin"), "not-authoritative", "utf8");
    const inventory = await testOnly.enumerateAllowlistedAuthoredRoots(fixture);
    assert.equal(inventory.fileRecords.length, 58);
    assert.equal(
      inventory.fileRecords.some((entry) => entry.path.includes("node_modules")),
      false
    );
  });
});

test("a future ordinary file inside a visited authored directory fails closed", async () => {
  await withFixture(async (fixture) => {
    const extra = path.join(
      fixture,
      "packages",
      "vedic-input-admission-kernel-draft",
      "src",
      "future.ts"
    );
    await writeFile(extra, "export {};\n", "utf8");
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_FILE_SET_DRIFT"
    );
  });
});

test("a missing expected file fails closed", async () => {
  await withFixture(async (fixture) => {
    const missing = path.join(
      fixture,
      "packages",
      "tzdb-core",
      "src",
      "index.test.ts"
    );
    await rm(missing);
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_FILE_SET_DRIFT"
    );
  });
});

test("an unexpected directory fails even when it is empty", async () => {
  await withFixture(async (fixture) => {
    await mkdir(path.join(
      fixture,
      "packages",
      "vedic-input-admission-kernel-draft",
      "future-empty"
    ));
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_DIRECTORY_SET_DRIFT"
    );
  });
});

test("a hardlinked expected endpoint is rejected", async () => {
  await withFixture(async (fixture) => {
    const target = path.join(
      fixture,
      "packages",
      "tzdb-core",
      "package.json"
    );
    const aliasDirectory = path.join(fixture, "outside-allowlist");
    await mkdir(aliasDirectory);
    await link(target, path.join(aliasDirectory, "alias.json"));
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_HARDLINK_FORBIDDEN"
    );
  });
});

test("a junction or directory symlink inside a visited tree is rejected before traversal", async (t) => {
  await withFixture(async (fixture) => {
    const original = path.join(
      fixture,
      "packages",
      "vedic-mutation-epoch-runtime-experiment-draft",
      "browser-app"
    );
    const outside = path.join(fixture, "outside-browser-app");
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
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_REPARSE_OR_SYMLINK_FORBIDDEN"
    );
  });
});

test("a junction placed at an excluded runtime subtree is still rejected", async (t) => {
  await withFixture(async (fixture) => {
    const outside = path.join(fixture, "outside-runtime");
    await mkdir(outside);
    const junction = path.join(
      fixture,
      "packages",
      "vedic-input-admission-kernel-draft",
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
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_REPARSE_OR_SYMLINK_FORBIDDEN"
    );
  });
});

test("an allowlisted root junction alias is rejected", async (t) => {
  await withFixture(async (fixture) => {
    const root = path.join(
      fixture,
      "isolated-drafts",
      "vedic-civil-time-input-resolution-draft"
    );
    const outside = path.join(fixture, "outside-input-root");
    await rename(root, outside);
    try {
      await symlink(outside, root, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        t.skip(`symlink/junction unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await expectCode(
      () => testOnly.enumerateAllowlistedAuthoredRoots(fixture),
      "ROOT_DIRECTORY_REPARSE_OR_TYPE_FORBIDDEN"
    );
  });
});

test("detectable file endpoint replacement between enumeration and reads is rejected", async () => {
  const parent = await readCurrentVedicIndependentEngineeringManifestV2(WORKSPACE_ROOT);
  await withFixture(async (fixture) => {
    const targetRelative =
      "isolated-drafts/vedic-civil-time-input-resolution-draft/package.json";
    const target = path.join(fixture, ...targetRelative.split("/"));
    let mutated = false;
    await expectCode(
      () => testOnly.collectRecursiveRootClosure(fixture, parent, {
        async afterEnumeration() {
          if (mutated) return;
          mutated = true;
          const bytes = await readFile(target);
          await rm(target);
          await writeFile(target, bytes);
        }
      }),
      "ROOT_INVENTORY_ENDPOINT_DRIFT"
    );
  });
});

test("detectable mutation after one held-handle snapshot is rejected", async () => {
  const parent = await readCurrentVedicIndependentEngineeringManifestV2(WORKSPACE_ROOT);
  await withFixture(async (fixture) => {
    const firstRelative = testOnly.EXPECTED_AUTHORED_PATHS[0];
    const target = path.join(fixture, ...firstRelative.split("/"));
    let mutated = false;
    await expectCode(
      () => testOnly.collectRecursiveRootClosure(fixture, parent, {
        async afterFileSnapshot({ index }) {
          if (index !== 0 || mutated) return;
          mutated = true;
          const bytes = await readFile(target);
          await rm(target);
          await writeFile(target, bytes);
        }
      }),
      "ROOT_INVENTORY_ENDPOINT_DRIFT"
    );
  });
});

test("boundary rejects a recomputed claim of full-domain closure", async () => {
  const built = await buildCurrentVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  const tampered = clone(built);
  tampered.recursiveAuthoredRootClosure.fullDomainManifestEstablished = true;
  redigest(tampered);
  assert.throws(
    () => testOnly.assertBoundary(tampered),
    (error) => error.code === "RECURSIVE_ROOT_CLOSURE_BOUNDARY_INVALID"
  );
});

test("boundary rejects recomputed product, rules, rights, expert, gate, and epoch promotions", async () => {
  const built = await buildCurrentVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  const mutations = [
    (value) => { value.productBoundary.productIdentity = "vedic-product"; },
    (value) => { value.productBoundary.runtimeOption = "browser"; },
    (value) => { value.productBoundary.storageBackend = "indexeddb"; },
    (value) => { value.componentAndCapabilityBoundary.executionRulesetEstablished = true; },
    (value) => { value.componentAndCapabilityBoundary.sourceBundleComplete = true; },
    (value) => { value.componentAndCapabilityBoundary.rightsBundleComplete = true; },
    (value) => { value.componentAndCapabilityBoundary.expertReviewBundleComplete = true; },
    (value) => { value.gateState.bindingFrozenVerified = 1; },
    (value) => { value.gateState.independentExpertReviewsVerified = 1; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.mutationEpochAvailable = true; },
    (value) => { value.observationBoundary.intervalMutationExcludedAcrossFiles = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ];
  for (const mutate of mutations) {
    const tampered = clone(built);
    mutate(tampered);
    redigest(tampered);
    assert.throws(() => testOnly.assertBoundary(tampered));
  }
});

test("summary refuses an unbranded but deeply frozen build result", async () => {
  const built = await buildCurrentVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  assert.equal(isVerifiedVedicIndependentEngineeringManifestV3(built), false);
  assert.throws(
    () => getVedicIndependentEngineeringManifestV3Summary(built),
    (error) => error.code === "VERIFIED_BRAND_REQUIRED"
  );
});

test("CLI succeeds only with the fixed invocation surface", () => {
  const normal = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout,
    /^VEDIC_FIVE_ALLOWLISTED_AUTHORED_ROOT_RECURSIVE_MACHINE_IDENTITY_MANIFEST_V3_OK /u);

  const argument = spawnSync(process.execPath, [CLI_PATH, "unexpected"], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" }
  });
  assert.notEqual(argument.status, 0);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preloadEnvironment = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "visible-loader-path" }
  });
  assert.notEqual(preloadEnvironment.status, 0);
  assert.match(preloadEnvironment.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});

test("current manifest preserves all red ledgers and exact Vedic gate counts", async () => {
  const loaded = await loadVedicIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  const manifest = loaded.manifest;
  assert.equal(manifest.gateState.admissionGatesSatisfied, 0);
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.bindingRequired, 38);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(manifest.gateState.independentExpertsRequired, 2);
  assert.equal(manifest.currentnessBoundary.currentFullDomainManifestMechanicallyVerified, false);
  assert.equal(manifest.productBoundary.productIdentity, null);
  assert.equal(manifest.productBoundary.runtimeOption, "unselected");
  assert.equal(manifest.productBoundary.storageBackend, "unselected");
  assert.equal(manifest.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(manifest.observationBoundary.mutationEpochAvailable, false);
  assert.equal(manifest.observationBoundary.mutationEpochReceipt, null);
  assert.equal(manifest.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(manifest.observationBoundary.abaExcluded, false);
  assert.ok(Object.values(manifest.authorityBoundary).every((value) => value === false));
});
