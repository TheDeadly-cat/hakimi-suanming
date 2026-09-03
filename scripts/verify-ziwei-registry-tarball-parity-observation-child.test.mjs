import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { loadZiweiDeclaredDependencyLicenseCarrierChild } from "./ziwei-declared-dependency-license-carrier-observation-child-lib.mjs";
import {
  ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH,
  buildExpectedZiweiRegistryTarballParityChild,
  computeZiweiRegistryTarballParityChildDigest,
  getZiweiRegistryTarballParityChildSummary,
  isVerifiedZiweiRegistryTarballParityChild,
  loadZiweiRegistryTarballParityChild,
  parseZiweiRegistryTarballParityChildArtifact,
  serializeZiweiRegistryTarballParityChild,
  verifyZiweiRegistryTarballParityChildLedger,
  ziweiRegistryTarballParityChildTestOnly
} from "./ziwei-registry-tarball-parity-observation-child-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts/verify-ziwei-registry-tarball-parity-observation-child.mjs");

async function loadInputs() {
  const predecessor = await loadZiweiDeclaredDependencyLicenseCarrierChild();
  const verified = await loadZiweiRegistryTarballParityChild();
  return { predecessor, verified };
}

function reseal(child) {
  child.childDigest = computeZiweiRegistryTarballParityChildDigest(child);
  return child;
}

test("full loader verifies the seven-package Registry parity child", async () => {
  const { verified } = await loadInputs();
  assert.equal(isVerifiedZiweiRegistryTarballParityChild(verified), true);
  assert.equal(verified.packagesObserved, 7);
  assert.equal(verified.selectedEntryByteParitiesOperatorObserved, 14);
  assert.equal(verified.inheritedPartialCandidates, 2);
  assert.equal(verified.bindingFrozenVerified, 0);
  assert.equal(verified.bindingRequired, 27);
});

test("persisted bytes are raw-pinned canonical JSON", async () => {
  const { predecessor, verified } = await loadInputs();
  const expected = buildExpectedZiweiRegistryTarballParityChild(predecessor);
  assert.deepEqual(verified.child, expected);
  const bytes = await readFile(path.join(workspaceRoot, ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH));
  assert.equal(bytes.toString("utf8"), serializeZiweiRegistryTarballParityChild(expected, predecessor));
  assert.equal(bytes.byteLength, ziweiRegistryTarballParityChildTestOnly.EXPECTED_PERSISTED_RAW.rawBytes);
  assert.equal(verified.artifact.rawSha256, ziweiRegistryTarballParityChildTestOnly.EXPECTED_PERSISTED_RAW.rawSha256);
});

test("seven exact packages close dist-lock-download digest parity only", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.child.packageObservations.length, 7);
  for (const observed of verified.child.packageObservations) {
    assert.equal(observed.lockProjection.metadataTarballMatchesLockResolved, true);
    assert.equal(observed.lockProjection.metadataIntegrityMatchesLockIntegrity, true);
    assert.equal(observed.tarballObservation.metadataIntegrityMatchesDownloadSri, true);
    assert.equal(observed.tarballObservation.metadataShasumMatchesDownloadSha1, true);
    assert.equal(observed.tarballObservation.rawSha1, observed.metadataDistObservation.shasum);
    assert.match(observed.tarballObservation.rawSha256, /^[0-9a-f]{64}$/u);
    assert.match(observed.tarballObservation.rawSha512, /^[0-9a-f]{128}$/u);
  }
});

test("fourteen selected tar entries equal current local carriers", async () => {
  const { verified } = await loadInputs();
  const entries = verified.child.packageObservations.flatMap((entry) => entry.selectedEntries);
  assert.equal(entries.length, 14);
  assert.equal(entries.filter((entry) => entry.role === "package_manifest").length, 7);
  assert.equal(entries.filter((entry) => entry.role === "license_carrier").length, 7);
  for (const entry of entries) {
    assert.equal(entry.exactByteEqualityOperatorObserved, true);
    assert.deepEqual(entry.tarEntryIdentity, entry.localCarrierIdentity);
  }
});

test("unobserved HTTP redirect header TLS and network-time fields stay explicit", async () => {
  const { verified } = await loadInputs();
  const boundary = verified.child.operatorObservationBoundary;
  assert.equal(boundary.httpStatusCaptured, false);
  assert.equal(boundary.redirectBehaviorCaptured, false);
  assert.equal(boundary.responseHeadersCaptured, false);
  assert.equal(boundary.networkTimeCaptured, false);
  assert.equal(boundary.tlsSessionEvidenceCaptured, false);
  for (const observed of verified.child.packageObservations) {
    assert.equal(observed.metadataDistObservation.httpStatus, null);
    assert.equal(observed.metadataDistObservation.finalUrl, null);
    assert.equal(observed.metadataDistObservation.redirectChain, null);
    assert.equal(observed.metadataDistObservation.responseHeaders, null);
    assert.equal(observed.metadataDistObservation.networkObservedAt, null);
  }
});

test("temporary directory exact path and cleanup observation are frozen", async () => {
  const { verified } = await loadInputs();
  assert.equal(verified.child.temporaryExecutionBoundary.exactTemporaryDirectoryPath,
    "C:\\Users\\Administrator\\AppData\\Local\\Temp\\hakimi-ziwei-npm-parity-20260901-01");
  assert.equal(verified.child.temporaryExecutionBoundary.parentWasVerifiedAsExactSystemTemporaryDirectory, true);
  assert.equal(verified.child.temporaryExecutionBoundary.recursiveCleanupApi, "System.IO.Directory.Delete(path,true)");
  assert.equal(verified.child.temporaryExecutionBoundary.operatorReportedRemoved, true);
  assert.equal(verified.child.temporaryExecutionBoundary.currentPathExists, false);
});

test("all authenticity rights expert release runtime time and epoch gates stay red", async () => {
  const { verified } = await loadInputs();
  for (const value of Object.values(verified.child.authorityBoundary)) assert.equal(value, false);
  for (const key of ["publisherIdentityVerified", "packageSignatureVerified", "firstSeenEstablished",
    "packageAuthenticityEstablished", "licenseAuthenticityEstablished", "licenseApplicabilityEstablished",
    "workRightsEstablished", "editionRightsEstablished", "carrierRightsEstablished",
    "rightsLegalConclusionEstablished", "redistributionAuthorized", "noticeObligationSatisfied"]) {
    assert.equal(verified.child.rightsBoundary[key], false);
  }
  assert.equal(verified.child.observationBoundary.mutationEpochReceipt, null);
  assert.equal(verified.child.observationBoundary.crossFileAndNetworkAtomicSnapshotEstablished, false);
  assert.equal(verified.child.observationBoundary.intervalMutationExcluded, false);
  assert.equal(verified.child.observationBoundary.abaExcluded, false);
  assert.equal(verified.child.timeBoundary.trustedTimestampEstablished, false);
  assert.equal(verified.child.runtimeTrustBoundary.loaderIdentityEstablished, false);
});

test("digest tampering fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.childDigest = "0".repeat(64);
  assert.throws(() => verifyZiweiRegistryTarballParityChildLedger(tampered, predecessor), /childDigest/u);
});

test("self-resealed publisher authenticity overclaim fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.rightsBoundary.publisherIdentityVerified = true;
  reseal(tampered);
  assert.throws(() => verifyZiweiRegistryTarballParityChildLedger(tampered, predecessor));
});

test("self-resealed unobserved HTTP claim fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.operatorObservationBoundary.httpStatusCaptured = true;
  reseal(tampered);
  assert.throws(() => verifyZiweiRegistryTarballParityChildLedger(tampered, predecessor));
});

test("candidate or frozen-binding promotion fails closed", async () => {
  const { predecessor, verified } = await loadInputs();
  for (const mutate of [
    (value) => { value.gateSummary.newCandidateIdsAdded = 1; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.sourceRequirementsProjectionBoundary.subjectFullySatisfied = true; }
  ]) {
    const tampered = structuredClone(verified.child);
    mutate(tampered);
    reseal(tampered);
    assert.throws(() => verifyZiweiRegistryTarballParityChildLedger(tampered, predecessor));
  }
});

test("package or selected-entry drift fails even after reseal", async () => {
  const { predecessor, verified } = await loadInputs();
  const tampered = structuredClone(verified.child);
  tampered.packageObservations[0].selectedEntries[0].tarEntryIdentity.rawSha256 = "f".repeat(64);
  reseal(tampered);
  assert.throws(() => verifyZiweiRegistryTarballParityChildLedger(tampered, predecessor));
});

test("strict parser rejects duplicate keys and BOM", async () => {
  const { verified } = await loadInputs();
  const raw = JSON.stringify(verified.child);
  const duplicate = Buffer.from(raw.replace("{", "{\"schemaVersion\":\"9.9.9\","), "utf8");
  assert.throws(() => parseZiweiRegistryTarballParityChildArtifact(duplicate), /strict|duplicate|严格|重复/iu);
  assert.throws(() => parseZiweiRegistryTarballParityChildArtifact(
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(raw, "utf8")])
  ), /strict|BOM|严格/iu);
});

test("summary rejects unbranded lookalikes", async () => {
  const { verified } = await loadInputs();
  assert.throws(() => getZiweiRegistryTarballParityChildSummary(structuredClone(verified)), /private|brand|品牌/iu);
});

test("fixed CLI succeeds and rejects arguments and visible preload environment", () => {
  const cleanEnv = { ...process.env };
  delete cleanEnv.NODE_OPTIONS;
  delete cleanEnv.NODE_PATH;
  const success = spawnSync(process.execPath, [cliPath], { cwd: workspaceRoot, env: cleanEnv, encoding: "utf8" });
  assert.equal(success.status, 0, success.stderr);
  assert.match(success.stdout, /^ZIWEI_REGISTRY_TARBALL_PARITY_CHILD_OK /u);
  const argument = spawnSync(process.execPath, [cliPath, "--write"], { cwd: workspaceRoot, env: cleanEnv, encoding: "utf8" });
  assert.equal(argument.status, 1);
  assert.match(argument.stderr, /ARGUMENTS_FORBIDDEN/u);
  const preload = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot, env: { ...cleanEnv, NODE_PATH: workspaceRoot }, encoding: "utf8"
  });
  assert.equal(preload.status, 1);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});
