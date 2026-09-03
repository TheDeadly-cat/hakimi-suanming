import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  loadVedicTzdbCoreDependencyLicenseCarrierChild
} from "./vedic-tzdb-core-dependency-license-carrier-observation-child-lib.mjs";
import {
  VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH,
  buildExpectedVedicTzdbCoreRegistryTarballParityChild,
  computeVedicTzdbCoreRegistryTarballParityChildDigest,
  getVedicTzdbCoreRegistryTarballParityChildSummary,
  isVerifiedVedicTzdbCoreRegistryTarballParityChild,
  loadVedicTzdbCoreRegistryTarballParityChild,
  parseVedicTzdbCoreRegistryTarballParityChildArtifact,
  serializeVedicTzdbCoreRegistryTarballParityChild,
  vedicTzdbCoreRegistryTarballParityChildTestOnly,
  verifyVedicTzdbCoreRegistryTarballParityChildLedger
} from "./vedic-tzdb-core-registry-tarball-parity-observation-child-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts/verify-vedic-tzdb-core-registry-tarball-parity-observation-child.mjs"
);

async function loadInputs() {
  const predecessor = await loadVedicTzdbCoreDependencyLicenseCarrierChild(workspaceRoot);
  const verified = await loadVedicTzdbCoreRegistryTarballParityChild(workspaceRoot);
  return { predecessor, verified };
}

function withRefreshedDigest(child) {
  child.childDigest = computeVedicTzdbCoreRegistryTarballParityChildDigest(child);
  return child;
}

test("full loader verifies the persisted point-in-time Registry parity child", async () => {
  const { verified } = await loadInputs();
  assert.equal(isVerifiedVedicTzdbCoreRegistryTarballParityChild(verified), true);
  assert.equal(verified.metadataEndpointsObserved, 3);
  assert.equal(verified.tarballEndpointsObserved, 3);
  assert.equal(verified.selectedEntryByteParitiesObserved, 8);
  assert.equal(verified.bindingFrozenVerified, 0);
  assert.equal(verified.bindingRequired, 38);
  assert.equal(verified.inheritedPartialCandidates, 2);
});

test("persisted bytes are canonical and match the independently built expected child", async () => {
  const { predecessor, verified } = await loadInputs();
  const expected = buildExpectedVedicTzdbCoreRegistryTarballParityChild(predecessor);
  assert.deepEqual(verified.child, expected);
  const bytes = await readFile(
    path.join(workspaceRoot, VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH)
  );
  assert.equal(bytes.toString("utf8"), serializeVedicTzdbCoreRegistryTarballParityChild(
    expected,
    predecessor
  ));
  assert.equal(bytes.byteLength, vedicTzdbCoreRegistryTarballParityChildTestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
});

test("three exact package endpoints close lock, dist and tarball digests", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.child.packageParityObservations.length, 3);
  for (const observed of verified.child.packageParityObservations) {
    assert.equal(observed.metadataObservation.httpStatus, 200);
    assert.equal(observed.metadataObservation.finalUrlExact, true);
    assert.equal(observed.metadataObservation.strictDuplicateKeyRejectingJsonUsed, true);
    assert.equal(observed.tarballObservation.httpStatus, 200);
    assert.equal(observed.tarballObservation.finalUrlExact, true);
    assert.equal(observed.tarballObservation.distIntegrityMatchesObservedSha512, true);
    assert.equal(observed.tarballObservation.distShasumMatchesObservedSha1, true);
    assert.equal(observed.tarballObservation.packageLockIntegrityMatchesDistIntegrity, true);
    assert.equal(observed.tarballObservation.packageLockResolvedMatchesDistTarball, true);
    assert.equal(observed.distProjection.integrity, observed.tarballObservation.rawIdentity.sriSha512);
    assert.equal(observed.distProjection.shasum, observed.tarballObservation.rawIdentity.rawSha1);
    assert.match(observed.tarballObservation.rawIdentity.rawSha512, /^[0-9a-f]{128}$/u);
    assert.match(observed.tarballObservation.rawIdentity.rawSha1, /^[0-9a-f]{40}$/u);
  }
});

test("all eight selected tar entries equal their current local carriers", async () => {
  const { verified } = await loadInputs();
  const entries = verified.child.packageParityObservations.flatMap((entry) => entry.selectedEntries);
  assert.equal(entries.length, 8);
  assert.equal(entries.filter((entry) => entry.role === "package_manifest").length, 3);
  assert.equal(entries.filter((entry) => entry.role === "license_carrier").length, 3);
  assert.equal(entries.filter((entry) => entry.role === "packed_tzdb_carrier").length, 2);
  for (const entry of entries) {
    assert.equal(entry.exactByteEqualityObserved, true);
    assert.deepEqual(entry.tarEntryIdentity, entry.localCarrierIdentity);
  }
});

test("2026c and 2025b packed semantics remain separate and exact", async () => {
  const { verified } = await loadInputs();
  const packed = verified.child.packageParityObservations
    .map((entry) => entry.packedSemantics)
    .filter((entry) => entry !== null);
  assert.deepEqual(packed.map((entry) => entry.ianaVersion), ["2026c", "2025b"]);
  for (const entry of packed) {
    assert.deepEqual(
      { zones: entry.zoneCount, links: entry.linkCount, countries: entry.countryCount },
      { zones: 340, links: 257, countries: 247 }
    );
  }
});

test("all authority, legal, expert and release boundaries stay red", async () => {
  const { verified } = await loadInputs();
  for (const value of Object.values(verified.child.authorityBoundary)) assert.equal(value, false);
  assert.equal(verified.child.rightsBoundary.publicRegistryTarballToLocalCarrierByteParityObserved, true);
  for (const key of [
    "publisherAuthenticatedTarballParityEstablished",
    "licenseAuthenticityEstablished",
    "licenseApplicabilityEstablished",
    "workRightsEstablished",
    "versionRightsEstablished",
    "carrierRightsEstablished",
    "rightsLegalConclusionEstablished",
    "redistributionAuthorized",
    "noticeObligationSatisfied"
  ]) assert.equal(verified.child.rightsBoundary[key], false);
  assert.equal(verified.child.sourceRequirementsProjectionBoundary.newCandidateIdAdded, false);
  assert.equal(verified.child.sourceRequirementsProjectionBoundary.subjectFullySatisfied, false);
});

test("legacy-v13, schema 13, null migration and null mutation epoch stay fixed", async () => {
  const { verified } = await loadInputs();
  assert.deepEqual(verified.child.projectReleaseGovernanceContext, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    projectContextOnly: true,
    inheritedByVedicProductIdentity: false,
    mutationEpochAvailableForSchema13: false,
    mutationEpochReceipt: null,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false
  });
  assert.equal(verified.child.observationBoundary.remoteAndLocalCrossFileAtomicSnapshotEstablished, false);
  assert.equal(verified.child.observationBoundary.intervalMutationExcludedAcrossNetworkAndLocalFiles, false);
  assert.equal(verified.child.observationBoundary.abaExcluded, false);
});

test("temp execution evidence records cleanup and no lifecycle execution", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.child.temporaryExecutionBoundary.systemTemporaryDirectoryParentVerified, true);
  assert.equal(verified.child.temporaryExecutionBoundary.targetRevalidatedBeforeRecursiveCleanup, true);
  assert.equal(verified.child.temporaryExecutionBoundary.cleanupVerifiedAfterObservation, true);
  assert.equal(verified.child.temporaryExecutionBoundary.temporaryDirectoryPathPersisted, false);
  assert.equal(verified.child.temporaryExecutionBoundary.lifecycleScriptsExecuted, false);
  assert.equal(verified.child.temporaryExecutionBoundary.npmInstallExecuted, false);
  assert.equal(verified.child.temporaryExecutionBoundary.npmPackExecuted, false);
});

test("digest tampering fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.childDigest = "0".repeat(64);
  assert.throws(
    () => verifyVedicTzdbCoreRegistryTarballParityChildLedger(tampered, predecessor),
    /childDigest/u
  );
});

test("publisher authenticity overclaim fails even with refreshed digest", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.rightsBoundary.publisherAuthenticatedTarballParityEstablished = true;
  withRefreshedDigest(tampered);
  assert.throws(
    () => verifyVedicTzdbCoreRegistryTarballParityChildLedger(tampered, predecessor),
    /Registry|publisher|权利/u
  );
});

test("candidate or frozen-binding promotion fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  for (const mutation of [
    (value) => { value.gateSummary.newCandidateIdsAdded = 1; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.sourceRequirementsProjectionBoundary.subjectFullySatisfied = true; }
  ]) {
    const tampered = structuredClone(verified.child);
    mutation(tampered);
    withRefreshedDigest(tampered);
    assert.throws(
      () => verifyVedicTzdbCoreRegistryTarballParityChildLedger(tampered, predecessor)
    );
  }
});

test("remote or local parity drift fails with refreshed digest", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.packageParityObservations[0].selectedEntries[0].tarEntryIdentity.rawSha256 =
    "f".repeat(64);
  withRefreshedDigest(tampered);
  assert.throws(
    () => verifyVedicTzdbCoreRegistryTarballParityChildLedger(tampered, predecessor),
    /固定点时观察|不一致/u
  );
});

test("strict parser rejects duplicate keys and BOM", async () => {
  const { verified } = await loadInputs();
  const raw = JSON.stringify(verified.child);
  const duplicate = Buffer.from(raw.replace(
    "{",
    "{\"schemaVersion\":\"9.9.9\","
  ), "utf8");
  assert.throws(
    () => parseVedicTzdbCoreRegistryTarballParityChildArtifact(duplicate),
    /strict|duplicate|严格|重复/iu
  );
  assert.throws(
    () => parseVedicTzdbCoreRegistryTarballParityChildArtifact(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(raw, "utf8")])
    ),
    /strict|BOM|严格/iu
  );
});

test("summary rejects unbranded lookalikes", async () => {
  const { verified } = await loadInputs();
  assert.throws(
    () => getVedicTzdbCoreRegistryTarballParityChildSummary(structuredClone(verified)),
    /private|品牌/iu
  );
});

test("fixed CLI succeeds and rejects arguments and visible preload environment", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8"
  });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^VEDIC_TZDB_CORE_REGISTRY_TARBALL_PARITY_CHILD_OK /u);
  const argument = spawnSync(process.execPath, [cliPath, "--write"], {
    cwd: workspaceRoot,
    env: cleanEnv,
    encoding: "utf8"
  });
  assert.equal(argument.status, 1);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);
  const preload = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    env: { ...cleanEnv, NODE_PATH: workspaceRoot },
    encoding: "utf8"
  });
  assert.equal(preload.status, 1);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
