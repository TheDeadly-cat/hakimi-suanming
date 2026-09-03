import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  WESTERN_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH,
  WesternRegistryTarballParityChildError,
  canonicalStringifyWesternRegistryTarballParityChild,
  computeWesternRegistryTarballParityChildDigest,
  isVerifiedWesternRegistryTarballParityChild,
  loadWesternRegistryTarballParityChild,
  parseWesternRegistryTarballParityChildArtifact,
  serializeWesternRegistryTarballParityChild,
  verifyWesternRegistryTarballParityChildLedger,
  westernRegistryTarballParityChildTestOnly
} from "./western-registry-tarball-parity-observation-child-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(root, ...WESTERN_REGISTRY_TARBALL_PARITY_CHILD_RELATIVE_PATH.split("/"));
const cliPath = path.join(root, "scripts", "verify-western-registry-tarball-parity-observation-child.mjs");
const clone = (value) => JSON.parse(JSON.stringify(value));
const cleanEnv = (overrides = {}) => {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...overrides };
};
const spawnCli = (args = [], options = {}) => spawnSync(process.execPath, [cliPath, ...args], {
  cwd: options.cwd ?? root,
  encoding: "utf8",
  env: cleanEnv(options.env),
  windowsHide: true
});

let context;
let expected;
let loaded;
let bytes;

before(async () => {
  context = await westernRegistryTarballParityChildTestOnly.collectCurrentInputs(root);
  expected = westernRegistryTarballParityChildTestOnly.buildProjection(context);
  loaded = await loadWesternRegistryTarballParityChild(root);
  bytes = await readFile(artifactPath);
});

describe("Western public registry tarball parity observation child", () => {
  it("loads a frozen private-branded nonformal 1-partial 0/28 child", () => {
    assert.equal(isVerifiedWesternRegistryTarballParityChild(loaded), true);
    assert.equal(isVerifiedWesternRegistryTarballParityChild(clone(loaded)), false);
    assert.equal(Object.isFrozen(loaded), true);
    assert.equal(loaded.currentPartialCandidatesAttached, 1);
    assert.equal(loaded.bindingFrozenVerified, 0);
    assert.equal(loaded.bindingRequired, 28);
  });

  it("has exact raw identity, self digest and canonical LF materialization", () => {
    const frozen = westernRegistryTarballParityChildTestOnly.EXPECTED_PERSISTED;
    assert.equal(bytes.length, frozen.rawBytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), frozen.rawSha256);
    assert.equal(bytes.toString("utf8"), serializeWesternRegistryTarballParityChild(expected));
    assert.equal(expected.childDigest, computeWesternRegistryTarballParityChildDigest(expected));
    assert.equal(bytes.at(-1), 0x0a);
    assert.equal(bytes.includes(Buffer.from("\r\n")), false);
  });

  it("observes exact metadata, tarball and lock parity for two versions", () => {
    assert.deepEqual(expected.packages.map((item) => item.packageName + "@" + item.version), [
      "astronomy-engine@2.1.19", "zod@4.4.3"
    ]);
    assert.deepEqual(expected.packages.map((item) => item.tarball.rawBytes), [493468, 759588]);
    for (const item of expected.packages) {
      assert.equal(item.parity.downloadedSha512MatchesMetadataIntegrity, true);
      assert.equal(item.parity.downloadedSha1MatchesMetadataShasum, true);
      assert.equal(item.parity.metadataIntegrityMatchesPackageLockIntegrity, true);
      assert.equal(item.parity.metadataTarballMatchesPackageLockResolved, true);
      assert.equal(item.parity.tarballPackageManifestMatchesInstalledPackageManifest, true);
    }
  });

  it("separates Astronomy tarball absence, installed absence and two controlled copies", () => {
    const split = expected.packages[0].licenseCarrierSeparation;
    assert.equal(split.tarballStandaloneLicenseMemberPresent, false);
    assert.deepEqual(split.tarballStandaloneLicenseMembers, []);
    assert.equal(split.installedExactLicenseEndpoint.absentAtCurrentExactCheck, true);
    assert.equal(split.installedExactLicenseEndpoint.persistentAbsenceEstablished, false);
    assert.equal(split.controlledProjectLicenseCopies.length, 2);
    assert.equal(split.controlledCopiesEqualEachOther, true);
    assert.equal(split.controlledCopiesAreTarballLicenseMembers, false);
    assert.equal(split.tarballLicenseComparedToControlledCopies, false);
  });

  it("binds Zod tarball package manifest and LICENSE to local endpoints", () => {
    const zod = expected.packages[1];
    assert.deepEqual(zod.tarball.standaloneLicenseMembers, ["package/LICENSE"]);
    assert.equal(zod.parity.tarballLicenseMatchesInstalledLicense, true);
    assert.equal(zod.tarball.licenseMember.rawSha256,
      expected.workspaceBasis.installedZodLicense.rawSha256);
  });

  it("records temp cleanup truthfully and retains no remote bytes", () => {
    assert.equal(expected.observationProcedure.temporaryDirectoryValidatedUnderSystemTempBeforeUse, true);
    assert.equal(expected.observationProcedure.removeItemAttempted, true);
    assert.equal(expected.observationProcedure.removeItemExecutionBlockedByCommandSafetyLayer, true);
    assert.equal(expected.observationProcedure.fallbackExplicitDotNetFileAndEmptyDirectoryDeletionUsed, true);
    assert.equal(expected.observationProcedure.cleanupVerified, true);
    assert.equal(expected.observationProcedure.temporaryArtifactsRetained, false);
    assert.equal(expected.integrityBoundary.observedRemoteBytesRetainedInRepository, false);
  });

  it("keeps authenticity, rights, expert, release, runtime, time and epoch red", () => {
    const rights = expected.rightsAndAuthorityBoundary;
    for (const key of Object.keys(rights)) assert.equal(rights[key], false, key);
    assert.equal(expected.networkObservation.registryOrTlsEstablishesPublisherAuthenticity, false);
    assert.equal(expected.networkObservation.registryOrTlsEstablishesFirstSeen, false);
    assert.equal(expected.networkObservation.registryOrTlsEstablishesDigitalSignature, false);
    assert.equal(expected.runtimeTrustBoundary.nodeRuntimeIdentityEstablished, false);
    assert.equal(expected.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
    assert.equal(expected.timeBoundary.trustedClockOrTimestampAuthorityEstablished, false);
    assert.equal(expected.integrityBoundary.mutationEpochAvailable, false);
    assert.equal(expected.integrityBoundary.mutationEpochReceipt, null);
    assert.equal(expected.integrityBoundary.abaExcluded, false);
  });

  it("self-reseal cannot promote a red boundary", () => {
    for (const mutate of [
      (v) => { v.rightsAndAuthorityBoundary.publisherAuthenticityEstablished = true; },
      (v) => { v.rightsAndAuthorityBoundary.redistributionAuthorized = true; },
      (v) => { v.gateSummary.bindingFrozenVerified = 1; },
      (v) => { v.formalStateBoundary.childIsFormalCurrent = true; },
      (v) => { v.integrityBoundary.mutationEpochAvailable = true; }
    ]) {
      const value = clone(expected);
      mutate(value);
      value.childDigest = computeWesternRegistryTarballParityChildDigest(value);
      assert.throws(() => verifyWesternRegistryTarballParityChildLedger(value, context),
        (error) => error instanceof WesternRegistryTarballParityChildError
          && error.code === "CHILD_CONTRACT_MISMATCH");
    }
  });

  it("rejects duplicate keys and canonical accessors", () => {
    const duplicate = Buffer.from('{"childId":"a","childId":"b"}\n');
    assert.throws(() => parseWesternRegistryTarballParityChildArtifact({
      path: "duplicate.json", bytes: duplicate, rawBytes: duplicate.length, rawSha256: "0".repeat(64)
    }), (error) => error.code === "JSON_DUPLICATE_KEY");
    const accessor = clone(expected);
    Object.defineProperty(accessor, "status", { enumerable: true, get() { return expected.status; } });
    assert.throws(() => canonicalStringifyWesternRegistryTarballParityChild(accessor));
  });

  it("fixed CLI succeeds and rejects operands, visible preload and wrong cwd", () => {
    const ok = spawnCli();
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /^WESTERN_REGISTRY_TARBALL_PARITY_CHILD_OK /u);
    assert.equal(spawnCli(["unexpected"]).status, 1);
    assert.match(spawnCli(["unexpected"]).stderr, /ARGUMENTS_FORBIDDEN/u);
    assert.equal(spawnCli([], { env: { NODE_OPTIONS: "" } }).status, 1);
    assert.match(spawnCli([], { env: { NODE_OPTIONS: "" } }).stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
    assert.equal(spawnCli([], { cwd: path.dirname(root) }).status, 1);
  });
});
