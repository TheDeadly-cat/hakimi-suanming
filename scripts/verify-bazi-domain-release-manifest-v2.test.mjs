import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH,
  BAZI_V17_FROZEN_GOLDEN_SHA256,
  buildCurrentBaziDomainReleaseManifestV2,
  canonicalStringifyBaziDomainReleaseManifestV2,
  computeBaziDomainReleaseManifestV2Digest,
  isVerifiedBaziDomainReleaseManifestV2,
  loadBaziDomainReleaseManifestV2,
  serializeBaziDomainReleaseManifestV2,
  baziDomainReleaseManifestV2TestOnly
} from "./bazi-domain-release-manifest-v2-lib.mjs";
import {
  readBaziDttStableWorkspaceArtifact,
  parseBaziDttStrictJsonArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import { writeBaziDomainReleaseManifestV2File } from "./write-bazi-domain-release-manifest-v2.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
let historicalInputRoot;

async function removeTemporaryManifestFixture(temporaryRoot) {
  assert.equal(path.isAbsolute(temporaryRoot), true);
  assert.equal(path.dirname(temporaryRoot), path.resolve(os.tmpdir()));
  assert.match(path.basename(temporaryRoot), /^hakimi-bazi-manifest-v2-(?:writer|history)-[a-z0-9]{6}$/iu);
  const metadata = await lstat(temporaryRoot);
  assert.equal(metadata.isDirectory(), true);
  assert.equal(metadata.isSymbolicLink(), false);
  assert.equal(await realpath(temporaryRoot), temporaryRoot);
  await rm(temporaryRoot, { recursive: true, force: true });
}

before(async () => {
  const archive = await readFile(path.join(
    repositoryRoot, "scripts/fixtures/bazi-domain-manifest-v2-original-inputs.zip"
  ));
  assert.equal(createHash("sha256").update(archive).digest("hex"),
    "0d9659b5eb8f652c0803305cbc4372c97cfc46f7d711ceeb5c7dfae98bec71be");
  const entries = Object.entries(unzipSync(archive));
  assert.equal(entries.length, 37);
  historicalInputRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-manifest-v2-history-"));
  for (const [relativePath, bytes] of entries) {
    assert.equal(path.isAbsolute(relativePath), false);
    assert.equal(relativePath.includes("\\"), false);
    assert.equal(relativePath.split("/").some((part) => part === "" || part === "." || part === ".."), false);
    const target = path.resolve(historicalInputRoot, relativePath);
    assert.equal(path.relative(historicalInputRoot, target).startsWith(".."), false);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
});

after(async () => {
  if (historicalInputRoot) await removeTemporaryManifestFixture(historicalInputRoot);
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Object.keys(value)) assertDeepFrozen(value[key], seen);
}

test("loads the persisted v2 machine identity with exact bytes and a private brand", async () => {
  const result = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.equal(isVerifiedBaziDomainReleaseManifestV2(result), true);
  assert.equal(result.manifestId, "hakimi.bazi.single-chart-report.domain-release-manifest/2.0.0");
  assert.equal(result.rawBytes, 16743);
  assert.equal(result.rawSha256, "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1");
  assert.equal(result.manifestDigest, "5236c63f4586e64a06e5d4304c7d40900d5ef6be41268e0b2d01ee4b566a5c80");
  assert.equal(result.frozenGoldenSha256, BAZI_V17_FROZEN_GOLDEN_SHA256);
  assertDeepFrozen(result);
  assert.equal(isVerifiedBaziDomainReleaseManifestV2(clone(result)), false);
});

test("maps product 1.7 to exact rules input fact source rights expert policy and report digests", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.equal(manifest.surface.productVersion, "1.7");
  assert.equal(manifest.surface.surfaceVersion, "1.7.0");
  assert.equal(manifest.domainIdentity.productVersion, "1.7");
  const componentById = Object.fromEntries(manifest.components.map((entry) => [entry.componentId, entry]));
  assert.equal(manifest.domainIdentity.rulesetDigest, componentById.interpretation_rules.digest);
  assert.equal(manifest.domainIdentity.inputPolicyDigest, componentById.input_policy.digest);
  assert.equal(manifest.domainIdentity.factSchemaDigest, componentById.fact_contract.digest);
  assert.equal(manifest.domainIdentity.sourceBundleDigest, componentById.source_bundle.digest);
  assert.equal(manifest.domainIdentity.rightsBundleDigest, componentById.rights_bundle.digest);
  assert.equal(manifest.domainIdentity.expertReviewBundleDigest, componentById.expert_review_bundle.digest);
  assert.equal(manifest.domainIdentity.highRiskPolicyDigest, componentById.high_risk_policy.digest);
  assert.equal(manifest.domainIdentity.reportContractDigest, componentById.report_contract.digest);
  assert.deepEqual(manifest.domainIdentity.expertReviewIds, []);
});

test("holds every authority gate red while preserving legacy-v13 and the epoch boundary", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.deepEqual(manifest.releaseGovernance, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(manifest.gateState.bindingRequired, 12);
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.independentExpertsRequired, 2);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
  assert.equal(manifest.gateState.bindingReadinessConsumesLatestSourceRightsPair, false);
  assert.equal(manifest.gateState.bindingReadinessStillPinsHistoricalParents, true);
  assert.equal(manifest.gateState.sourceCarrierReadinessSuccessorCreated, false);
  assert.equal(manifest.gateState.formalAdmissionPromotionBlocked, true);
  assert.equal(manifest.gateState.releaseCandidateFreezeAllowed, false);
  assert.equal(manifest.snapshotBoundary.crossFileAtomicSnapshot, false);
  assert.equal(manifest.snapshotBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(manifest.snapshotBoundary.abaExcluded, false);
  assert.equal(manifest.authorityBoundary.releaseReady, false);
  assert.equal(manifest.authorityBoundary.publicDeploymentAuthorized, false);
  assert.equal(manifest.authorityBoundary.expertClaimsAuthorized, false);
});

test("binds the historical SMT source-rights pair plus carrier and vacant expert private contexts", async () => {
  const { manifest } = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.deepEqual(
    manifest.verifiedMechanicalContexts.map((entry) => entry.contextId),
    [
      "hakimi.bazi.smt-v10-versioned-parent-supersession/1.0.0",
      "hakimi.bazi.source-carrier-record-readiness/1.0.0",
      "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0"
    ]
  );
  assert.equal(manifest.verifiedMechanicalContexts[0].sourceLedgerId,
    "hakimi.bazi.strength.source-binding-candidates/1.7.0");
  assert.equal(manifest.verifiedMechanicalContexts[0].rightsLedgerId,
    "hakimi.bazi.strength.source-rights-candidates/1.3.0");
  for (const context of manifest.verifiedMechanicalContexts) {
    assert.equal(context.privateBrandVerified, true);
    assert.equal(context.activeAdmissionEffect, "none");
  }
});

test("preserves the stale predecessor byte-for-byte and does not silently integrate central consumers", async () => {
  const predecessor = await readBaziDttStableWorkspaceArtifact(
    historicalInputRoot,
    baziDomainReleaseManifestV2TestOnly.PREDECESSOR.path
  );
  assert.equal(predecessor.rawBytes, baziDomainReleaseManifestV2TestOnly.PREDECESSOR.rawBytes);
  assert.equal(predecessor.rawSha256, baziDomainReleaseManifestV2TestOnly.PREDECESSOR.rawSha256);
  const registrySource = await readFile(
    path.resolve(repositoryRoot, "scripts/system-admission-registry-lib.mjs"),
    "utf8"
  );
  assert.equal(registrySource.includes(BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH), false);
  const { manifest } = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.equal(manifest.lineage.predecessorPreservedUnmodified, true);
  assert.equal(manifest.lineage.predecessorCurrent, false);
  assert.equal(manifest.lineage.centralSystemAdmissionRegistryIntegrated, false);
  assert.equal(manifest.lineage.crossSystemEngineeringReceiptRegistryIntegrated, false);
});

test("persisted bytes are exact pretty JSON with one terminal LF and a valid digest", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(historicalInputRoot);
  const text = await readFile(
    path.resolve(historicalInputRoot, ...BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH.split("/")),
    "utf8"
  );
  assert.equal(text, serializeBaziDomainReleaseManifestV2(expected));
  assert.equal(text.endsWith("\n"), true);
  assert.equal(text.endsWith("\n\n"), false);
  assert.equal(Buffer.byteLength(text), 16743);
  assert.equal(createHash("sha256").update(text).digest("hex"),
    "f5d7c2793f29a1b36e65c2cf087994bb2ed4be84e4fbb3d40e7ecdf13f6921c1");
  assert.equal(computeBaziDomainReleaseManifestV2Digest(expected), expected.manifestDigest);
});

test("self-resealed authority promotions and unknown fields cannot pass the fixed persisted identity", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(historicalInputRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    historicalInputRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH
  );
  const cases = [
    (value) => { value.gateState.bindingFrozenVerified = 12; },
    (value) => { value.gateState.independentExpertReviewsVerified = 2; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.releaseStatus = "release_candidate"; },
    (value) => { value.publicReleaseApproved = true; }
  ];
  for (const mutate of cases) {
    const value = clone(expected);
    mutate(value);
    value.manifestDigest = computeBaziDomainReleaseManifestV2Digest(value);
    assert.throws(
      () => baziDomainReleaseManifestV2TestOnly.verifyPersistedAgainstExpected(snapshot, value, expected),
      (error) => ["MANIFEST_DIGEST_DRIFT", "MANIFEST_MISMATCH"].includes(error.code)
    );
  }
});

test("raw drift and duplicate JSON keys fail before any candidate can be branded", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(historicalInputRoot);
  const persistedSnapshot = await readBaziDttStableWorkspaceArtifact(
    historicalInputRoot,
    BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(persistedSnapshot);
  assert.throws(
    () => baziDomainReleaseManifestV2TestOnly.verifyPersistedAgainstExpected(
      { ...persistedSnapshot, rawSha256: "0".repeat(64) },
      persisted,
      expected
    ),
    (error) => error.code === "MANIFEST_RAW_DRIFT"
  );
  const duplicate = new TextEncoder().encode('{"manifestDigest":"a","manifestDigest":"b"}');
  assert.throws(
    () => parseBaziDttStrictJsonArtifact({ path: "duplicate.json", bytes: duplicate }),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
});

test("canonical digest input rejects accessors without invoking their getter", () => {
  let calls = 0;
  const value = {};
  Object.defineProperty(value, "createdAt", {
    enumerable: true,
    get() {
      calls += 1;
      return "never";
    }
  });
  assert.throws(
    () => computeBaziDomainReleaseManifestV2Digest(value),
    (error) => error.code === "NON_CANONICAL_JSON"
  );
  assert.equal(calls, 0);

  const array = [];
  Object.defineProperty(array, "0", {
    enumerable: true,
    configurable: true,
    get() {
      calls += 1;
      return "never";
    }
  });
  array.length = 1;
  assert.throws(
    () => canonicalStringifyBaziDomainReleaseManifestV2({ array }),
    (error) => error.code === "NON_CANONICAL_JSON"
  );
  assert.equal(calls, 0);
});

test("captured manifest primordials survive post-import Array WeakSet freeze descriptor and hash poisoning", () => {
  const source = `
    const lib = await import('./scripts/bazi-domain-release-manifest-v2-lib.mjs');
    const result = await lib.loadBaziDomainReleaseManifestV2(process.argv[1]);
    const clone = JSON.parse(JSON.stringify(result.manifest));
    Array.prototype.push = function () { throw new Error('push poisoned'); };
    Array.prototype.sort = function () { throw new Error('sort poisoned'); };
    Array.prototype[Symbol.iterator] = function* () { return; };
    WeakSet.prototype.has = function () { return false; };
    WeakSet.prototype.add = function () { throw new Error('weakset poisoned'); };
    Object.freeze = (value) => value;
    Object.getOwnPropertyDescriptor = () => ({ get() { return 1; } });
    const crypto = await import('node:crypto');
    crypto.Hash.prototype.update = function () { throw new Error('hash poisoned'); };
    if (!lib.isVerifiedBaziDomainReleaseManifestV2(result)) process.exit(91);
    if (lib.canonicalStringifyBaziDomainReleaseManifestV2(result.manifest).length === 0) process.exit(93);
    if (lib.computeBaziDomainReleaseManifestV2Digest(result.manifest) !== result.manifestDigest) process.exit(94);
    lib.baziDomainReleaseManifestV2TestOnly.deepFreezeInternal(clone);
    if (!Object.isFrozen(result.manifest.components[0].files[0])) process.exit(92);
    if (!Object.isFrozen(clone.components[0].files[0])) process.exit(95);
    process.stdout.write('ok');
  `;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", source, historicalInputRoot], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "ok");
});

test("CLI emits only the narrow machine identity and rejects argv or NODE_OPTIONS", () => {
  const cli = spawnSync(process.execPath, [
    "scripts/verify-bazi-domain-release-manifest-v2.mjs", "--historical-input-root", historicalInputRoot
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(cli.status, 0, cli.stderr);
  const result = JSON.parse(cli.stdout);
  assert.equal(result.baziV17MachineIdentityManifestV2MechanicallyVerified, true);
  assert.equal(result.verificationScope, "historical_input_root");
  assert.equal(result.currentApplicabilityAssessed, false);
  assert.equal(result.historicalInputRoot, historicalInputRoot);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.expertClaimsAuthorized, false);

  const argv = spawnSync(process.execPath,
    ["scripts/verify-bazi-domain-release-manifest-v2.mjs", "unexpected"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "" }
    });
  assert.equal(argv.status, 1);
  assert.match(argv.stderr, /CLI_INVOCATION_REJECTED/u);

  const options = spawnSync(process.execPath,
    ["scripts/verify-bazi-domain-release-manifest-v2.mjs"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
    });
  assert.equal(options.status, 1);
  assert.match(options.stderr, /CLI_INVOCATION_REJECTED/u);

  for (const operands of [
    ["--historical-input-root"],
    ["--historical-input-root", ""],
    ["--historical-input-root", "--unknown"],
    ["--historical-input-root", historicalInputRoot, "extra"],
    ["--historical-input-root", historicalInputRoot, "--historical-input-root", historicalInputRoot],
    [`--historical-input-root=${historicalInputRoot}`]
  ]) {
    const invalid = spawnSync(process.execPath, ["scripts/verify-bazi-domain-release-manifest-v2.mjs", ...operands], {
      cwd: repositoryRoot, encoding: "utf8", windowsHide: true,
      env: { ...process.env, NODE_OPTIONS: "" }
    });
    assert.equal(invalid.status, 1, invalid.stderr);
    assert.equal(invalid.stdout, "");
    assert.match(invalid.stderr, /CLI_INVOCATION_REJECTED/u);
  }
});

test("exclusive writer serializes persisted JSON into a temporary file without granting manifest authority", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-manifest-v2-writer-"));
  t.after(() => removeTemporaryManifestFixture(temporaryRoot));
  const target = path.join(temporaryRoot, "manifest.json");
  // This covers the actual writer and serializer only. The builder and loader
  // cases above retain their historical-input identity checks. The current
  // checkout is independently rejected below instead of borrowing this fixture.
  const manifest = JSON.parse(await readFile(
    path.join(repositoryRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH), "utf8"
  ));
  const expectedBytes = Buffer.from(serializeBaziDomainReleaseManifestV2(manifest), "utf8");
  await writeBaziDomainReleaseManifestV2File(target, manifest);
  assert.deepEqual(await readFile(target), expectedBytes);
  await assert.rejects(
    writeBaziDomainReleaseManifestV2File(target, { fixtureOnly: "must not replace existing bytes" }),
    (error) => error?.code === "EEXIST"
  );
  assert.deepEqual(await readFile(target), expectedBytes);
});

test("writer CLI rejects an operand when launched through a temporary symlink", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-manifest-v2-writer-"));
  t.after(() => removeTemporaryManifestFixture(temporaryRoot));
  const linkedCli = path.join(temporaryRoot, "writer.mjs");
  await symlink(path.join(repositoryRoot, "scripts/write-bazi-domain-release-manifest-v2.mjs"), linkedCli, "file");
  const child = spawnSync(process.execPath, [linkedCli, "unexpected"], {
    cwd: temporaryRoot, encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 1, child.stderr);
  assert.equal(child.stdout, "");
  assert.equal(child.stderr.trim(), "BAZI_DOMAIN_RELEASE_MANIFEST_V2_WRITE_FAILED CLI_INVOCATION_REJECTED");
});

test("importing the writer is silent and leaves persisted bytes unchanged", async () => {
  const artifact = path.join(repositoryRoot, BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH);
  const before = await readFile(artifact);
  const writerUrl = pathToFileURL(path.join(repositoryRoot, "scripts/write-bazi-domain-release-manifest-v2.mjs")).href;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(writerUrl)});`], {
    cwd: os.tmpdir(), encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout, "");
  assert.equal(child.stderr, "");
  assert.deepEqual(await readFile(artifact), before);
});

test("the historical formal manifest stays expected-red instead of borrowing v2 authority", () => {
  const old = spawnSync(process.execPath, ["scripts/verify-bazi-domain-release-manifest.mjs"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(old.status, 1);
  assert.match(`${old.stdout}\n${old.stderr}`, /manifest|MANIFEST/u);
});

test("canonical rendering is deterministic for the historical manifest", async () => {
  const expected = await buildCurrentBaziDomainReleaseManifestV2(historicalInputRoot);
  const rebuilt = await buildCurrentBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.equal(
    canonicalStringifyBaziDomainReleaseManifestV2(expected),
    canonicalStringifyBaziDomainReleaseManifestV2(rebuilt)
  );
});

test("the current checkout still rejects the missing historical basis without archive fallback", async () => {
  await assert.rejects(loadBaziDomainReleaseManifestV2(repositoryRoot),
    (error) => error?.code === "BOUND_READINESS_BASIS_DRIFT");
  const current = spawnSync(process.execPath, ["scripts/verify-bazi-domain-release-manifest-v2.mjs"], {
    cwd: repositoryRoot, encoding: "utf8", windowsHide: true,
    env: { ...process.env, NODE_OPTIONS: "" }
  });
  assert.equal(current.status, 1);
  assert.equal(current.stdout, "");
  assert.match(current.stderr, /BOUND_READINESS_BASIS_DRIFT/u);
});

test("verified historical inputs preserve the selected current domain manifest", async () => {
  const currentIndexPath = path.join(repositoryRoot, "content/system-admission/current-index.v1.json");
  const indexBefore = await readFile(currentIndexPath);
  const index = JSON.parse(indexBefore);
  const domain = index.entries.find((entry) =>
    entry.familyKey === "content/domain-release/bazi.single-chart-report.v1.7.0.manifest");
  const { loadBaziCurrentDomainManifest } = await import("./bazi-scoped-current-lib.mjs");
  const currentBefore = await loadBaziCurrentDomainManifest(repositoryRoot);
  assert.equal(currentBefore.artifact.path, domain.selectedCurrent.path);
  assert.notEqual(currentBefore.artifact.path, BAZI_DOMAIN_RELEASE_MANIFEST_V2_RELATIVE_PATH);

  const historical = await loadBaziDomainReleaseManifestV2(historicalInputRoot);
  assert.equal(isVerifiedBaziDomainReleaseManifestV2(historical), true);
  assert.deepEqual(await loadBaziCurrentDomainManifest(repositoryRoot), currentBefore);
  assert.deepEqual(await readFile(currentIndexPath), indexBefore);
});
