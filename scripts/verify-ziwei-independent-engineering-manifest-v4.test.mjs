import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, test } from "node:test";

import {
  buildCurrentZiweiIndependentEngineeringManifestV4,
  canonicalPrettyStringifyZiweiIndependentEngineeringManifestV4,
  computeZiweiIndependentEngineeringManifestV4Digest,
  getZiweiIndependentEngineeringManifestV4Summary,
  isVerifiedZiweiIndependentEngineeringManifestV4,
  loadZiweiIndependentEngineeringManifestV4,
  parseZiweiIndependentEngineeringManifestV4JsonBytes,
  ziweiIndependentEngineeringManifestV4TestOnly as testOnly
} from "./ziwei-independent-engineering-manifest-v4-lib.mjs";
import {
  loadZiweiIndependentEngineeringManifestV3
} from "./ziwei-independent-engineering-manifest-v3-lib.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPT_DIR, "..");
const CLI_PATH = path.join(SCRIPT_DIR, "verify-ziwei-independent-engineering-manifest-v4.mjs");
const ARTIFACT_PATH = path.join(
  WORKSPACE_ROOT,
  ..."content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v4.json".split("/")
);

let expected;
let loaded;

function clone(value) {
  return structuredClone(value);
}

function resign(value) {
  const candidate = clone(value);
  candidate.manifestDigest = computeZiweiIndependentEngineeringManifestV4Digest(candidate);
  return candidate;
}

function cleanCliEnvironment(extra = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  Object.assign(env, extra);
  return env;
}

async function makeAuthoredFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-ziwei-v4-tree-"));
  t.after(async () => {
    await rm(root, { recursive: true, force: true });
  });
  for (const relativePath of testOnly.EXPECTED_AUTHORED_PATHS) {
    const source = path.join(WORKSPACE_ROOT, ...relativePath.split("/"));
    const target = path.join(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  await mkdir(
    path.join(root, "packages", "ziwei-fortel-differential-draft", "fixtures"),
    { recursive: true }
  );
  return root;
}

before(async () => {
  expected = await buildCurrentZiweiIndependentEngineeringManifestV4(WORKSPACE_ROOT);
  loaded = await loadZiweiIndependentEngineeringManifestV4(WORKSPACE_ROOT);
});

test("fixed-path full loader returns the exact frozen v4 identity", () => {
  assert.equal(isVerifiedZiweiIndependentEngineeringManifestV4(loaded), true);
  assert.equal(Object.isFrozen(loaded), true);
  assert.deepEqual(clone(getZiweiIndependentEngineeringManifestV4Summary(loaded)), {
    activeAdmissionEffect: "none",
    artifact: {
      bytes: 40_230,
      path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v4.json",
      sha256: "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e"
    },
    authoredFileCount: 91,
    bindingFrozenVerified: 0,
    bindingRequired: 27,
    currentFourPackageAuthoredSourceRootManifestMechanicallyVerified: true,
    currentFullDomainManifestMechanicallyVerified: false,
    independentExpertReviewsVerified: 0,
    independentExpertsRequired: 2,
    manifestDigest: "46c2784875462e1851d0e3c7e352163660fbe29916e6ad6abd4f50065db42170",
    manifestId: "hakimi.ziwei-doushu.four-package-authored-source-root-machine-identity-manifest/4.0.0",
    newlyCoveredExtraCount: 33,
    prePostTreeDigestEqual: true,
    publicReleaseAuthorized: false,
    releaseReady: false,
    treeDigest: "5a2970df410e4d96ce598e4449bf5689a05276f7df4615de7ed9d26592fc53bc"
  });
  assert.equal(loaded.manifest.authoredSourceRootClosure.symlinkJunctionAndResolvedPathAliasRejected, true);
  assert.equal(loaded.manifest.authoredSourceRootClosure.genericNtfsReparseTagEnumerated, false);
  assert.equal(loaded.manifest.authoredSourceRootClosure.allReparseClassesExcluded, false);
});

test("persisted artifact is the exact canonical LF materialization", async () => {
  assert.deepEqual(loaded.manifest, expected);
  const persisted = await readFile(ARTIFACT_PATH, "utf8");
  const canonical = canonicalPrettyStringifyZiweiIndependentEngineeringManifestV4(expected);
  assert.equal(persisted, canonical);
  assert.equal(Buffer.byteLength(canonical, "utf8"), 40_230);
  assert.equal(
    testOnly.sha256Text(canonical),
    "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e"
  );
});

test("strict parser rejects duplicate keys", () => {
  assert.throws(
    () => parseZiweiIndependentEngineeringManifestV4JsonBytes(
      Buffer.from('{"schemaVersion":"4.0.0","schemaVersion":"4.0.0"}', "utf8")
    ),
    (error) => /duplicate|重复/iu.test(error?.message ?? "")
  );
});

test("v3 private brand is required and a structural clone is rejected", async () => {
  const predecessor = await loadZiweiIndependentEngineeringManifestV3(WORKSPACE_ROOT);
  assert.doesNotThrow(() => testOnly.requireVerifiedPredecessor(predecessor));
  assert.throws(
    () => testOnly.requireVerifiedPredecessor(clone(predecessor)),
    (error) => error?.code === "PREDECESSOR_PRIVATE_BRAND_REQUIRED"
  );
});

test("recursive closure binds 91 ordinary files and the exact 33-file v3 delta", () => {
  const closure = expected.authoredSourceRootClosure;
  assert.equal(closure.files.length, 91);
  assert.equal(new Set(closure.files.map((entry) => entry.path)).size, 91);
  assert.deepEqual(
    closure.files.map((entry) => entry.path),
    testOnly.EXPECTED_AUTHORED_PATHS
  );
  assert.equal(testOnly.exactJson(closure.rootFileCounts, testOnly.ROOT_FILE_COUNTS), true);
  assert.equal(closure.newlyCoveredExtra.length, 33);
  const fileByPath = new Map(closure.files.map((entry) => [entry.path, entry]));
  for (const entry of closure.newlyCoveredExtra) {
    assert.equal(entry.authorizationClaimed, false);
    assert.equal(entry.coverageMeaning, "authored_source_identity_only");
    assert.equal(entry.priorState, "known_v3_unselected_nonruntime_path");
    assert.equal(testOnly.exactJson(
      { bytes: entry.bytes, path: entry.path, sha256: entry.sha256 },
      fileByPath.get(entry.path)
    ), true);
  }
});

test("closure exclusions are only direct dist and node_modules subtrees", () => {
  assert.deepEqual(
    expected.authoredSourceRootClosure.excludedGeneratedSubtrees,
    testOnly.EXCLUDED_GENERATED_SUBTREES
  );
  for (const subtree of testOnly.EXCLUDED_GENERATED_SUBTREES) {
    const root = testOnly.PACKAGE_ROOTS.find((candidate) => subtree.startsWith(`${candidate}/`));
    assert.ok(root);
    assert.match(subtree.slice(root.length + 1), /^(?:dist|node_modules)$/u);
  }
  assert.equal(expected.authoredSourceRootClosure.excludedGeneratedSubtreeContentsBound, false);
});

test("all authority, admission, product and mutation boundaries remain closed", () => {
  assert.equal(expected.gateState.bindingFrozenVerified, 0);
  assert.equal(expected.gateState.independentExpertReviewsVerified, 0);
  assert.equal(expected.gateState.admissionGatesSatisfied, 0);
  for (const value of Object.values(expected.authorityBoundary)) assert.equal(value, false);
  assert.equal(expected.productBoundary.productIdentity, null);
  assert.equal(expected.productBoundary.releaseIdentity, null);
  assert.equal(expected.productBoundary.targetSchema, null);
  assert.equal(expected.productBoundary.migrationId, null);
  assert.equal(expected.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(expected.observationBoundary.mutationEpochAvailable, false);
  assert.equal(expected.observationBoundary.mutationEpochReceipt, null);
  assert.equal(expected.observationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(expected.observationBoundary.abaExcluded, false);
  assert.equal(expected.authoredSourceRootClosure.entireZiweiEngineeringClosureEstablished, false);
  assert.equal(expected.authoredSourceRootClosure.entireZiweiDomainClosureEstablished, false);
  assert.equal(expected.authoredSourceRootClosure.entireZiweiProductClosureEstablished, false);
});

test("digest-resigned authority or scope elevation is rejected", () => {
  const authority = clone(expected);
  authority.authorityBoundary.expertClaimsAuthorized = true;
  assert.throws(
    () => testOnly.requireFixedBoundary(resign(authority)),
    (error) => error?.code === "RED_OR_SCOPE_BOUNDARY_MISMATCH"
  );
  const domain = clone(expected);
  domain.authoredSourceRootClosure.entireZiweiDomainClosureEstablished = true;
  assert.throws(
    () => testOnly.requireFixedBoundary(resign(domain)),
    (error) => error?.code === "RED_OR_SCOPE_BOUNDARY_MISMATCH"
  );
  const epoch = clone(expected);
  epoch.observationBoundary.mutationEpochAvailable = true;
  epoch.observationBoundary.mutationEpochReceipt = "forged";
  assert.throws(
    () => testOnly.requireFixedBoundary(resign(epoch)),
    (error) => error?.code === "RED_OR_SCOPE_BOUNDARY_MISMATCH"
  );
});

test("recursive enumerator rejects an unexpected file and missing authored file", async (t) => {
  const extraRoot = await makeAuthoredFixture(t);
  await writeFile(
    path.join(extraRoot, "packages", "ziwei-doushu-contracts-draft", "unexpected.ts"),
    "export {};\n",
    "utf8"
  );
  await assert.rejects(
    testOnly.enumerateAuthoredPaths(extraRoot),
    (error) => error?.code === "AUTHORED_PATH_SET_MISMATCH"
  );

  const missingRoot = await makeAuthoredFixture(t);
  await unlink(path.join(
    missingRoot,
    "packages",
    "ziwei-doushu-contracts-draft",
    "src",
    "index.test.ts"
  ));
  await assert.rejects(
    testOnly.enumerateAuthoredPaths(missingRoot),
    (error) => error?.code === "AUTHORED_PATH_SET_MISMATCH"
  );
});

test("path escape is rejected before filesystem access", () => {
  assert.throws(
    () => testOnly.resolveInsideWorkspace(WORKSPACE_ROOT, "../outside.txt"),
    (error) => error?.code === "PATH_ESCAPE"
  );
  assert.throws(
    () => testOnly.resolveInsideWorkspace(WORKSPACE_ROOT, "C:/outside.txt"),
    (error) => error?.code === "PATH_INVALID" || error?.code === "PATH_ESCAPE"
  );
});

test("file symlink and hardlink endpoints fail closed", async (t) => {
  const symlinkRoot = await makeAuthoredFixture(t);
  const symlinkTarget = path.join(
    symlinkRoot,
    "packages",
    "ziwei-doushu-contracts-draft",
    "src",
    "index.ts"
  );
  const symlinkSibling = `${symlinkTarget}.real`;
  await copyFile(symlinkTarget, symlinkSibling);
  await unlink(symlinkTarget);
  try {
    await symlink(path.basename(symlinkSibling), symlinkTarget, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.diagnostic(`file symlink unavailable: ${error.code}`);
    } else {
      throw error;
    }
  }
  if ((await import("node:fs/promises")).lstat) {
    await assert.rejects(
      testOnly.enumerateAuthoredPaths(symlinkRoot),
      (error) => error?.code === "SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN"
        || error?.code === "AUTHORED_PATH_SET_MISMATCH"
    );
  }

  const hardlinkRoot = await makeAuthoredFixture(t);
  const hardlinkTarget = path.join(
    hardlinkRoot,
    "packages",
    "ziwei-doushu-contracts-draft",
    "src",
    "index.test.ts"
  );
  const hardlinkSibling = path.join(hardlinkRoot, "hardlink-backing");
  await copyFile(hardlinkTarget, hardlinkSibling);
  await unlink(hardlinkTarget);
  await link(hardlinkSibling, hardlinkTarget);
  await assert.rejects(
    testOnly.collectAuthoredTreeIdentity(hardlinkRoot),
    (error) => error?.code === "HARDLINK_REJECTED"
      || /HARDLINK_REJECTED/u.test(error?.message ?? "")
  );
});

test("junction or directory symlink fails closed even at an excluded subtree", async (t) => {
  const root = await makeAuthoredFixture(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), "hakimi-ziwei-v4-junction-target-"));
  t.after(async () => {
    await rm(outside, { recursive: true, force: true });
  });
  const junction = path.join(
    root,
    "packages",
    "ziwei-iztro-adapter-draft",
    "dist"
  );
  try {
    await symlink(outside, junction, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
      t.skip(`directory junction unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    testOnly.enumerateAuthoredPaths(root),
    (error) => error?.code === "SYMLINK_JUNCTION_OR_ALIAS_FORBIDDEN"
  );
});

test("two-pass tree identity detects an interval content mutation", async (t) => {
  const root = await makeAuthoredFixture(t);
  const target = path.join(
    root,
    "packages",
    "ziwei-doushu-contracts-draft",
    "src",
    "index.test.ts"
  );
  await assert.rejects(
    testOnly.collectAuthoredTreeIdentity(root, {
      async afterFirstPass() {
        await writeFile(target, "changed between complete passes\n", "utf8");
      }
    }),
    (error) => error?.code === "TREE_PRE_POST_MISMATCH"
  );
});

test("fixed CLI accepts no operands and rejects visible loader environments", () => {
  const success = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^ZIWEI_FOUR_PACKAGE_AUTHORED_SOURCE_ROOT_MANIFEST_V4_OK /u);

  const operand = spawnSync(process.execPath, [CLI_PATH, "unexpected"], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment()
  });
  assert.notEqual(operand.status, 0);
  assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);

  const nodePath = spawnSync(process.execPath, [CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanCliEnvironment({ NODE_PATH: "untrusted" })
  });
  assert.notEqual(nodePath.status, 0);
  assert.match(nodePath.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
