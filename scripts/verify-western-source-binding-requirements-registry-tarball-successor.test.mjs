import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_RELATIVE_PATH,
  WesternSourceBindingRegistryTarballSuccessorError,
  canonicalStringifyWesternSourceBindingRegistryTarballSuccessor,
  computeWesternSourceBindingRegistryTarballSuccessorDigest,
  isVerifiedWesternSourceBindingRegistryTarballSuccessor,
  loadWesternSourceBindingRegistryTarballSuccessor,
  parseWesternSourceBindingRegistryTarballSuccessorArtifact,
  serializeWesternSourceBindingRegistryTarballSuccessor,
  verifyWesternSourceBindingRegistryTarballSuccessorLedger,
  westernSourceBindingRegistryTarballSuccessorTestOnly
} from "./western-source-binding-requirements-registry-tarball-successor-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = path.join(root,
  ...WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_RELATIVE_PATH.split("/"));
const cliPath = path.join(root, "scripts",
  "verify-western-source-binding-requirements-registry-tarball-successor.mjs");
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
  context = await westernSourceBindingRegistryTarballSuccessorTestOnly.collectCurrentInputs(root);
  expected = westernSourceBindingRegistryTarballSuccessorTestOnly.buildProjection(context);
  loaded = await loadWesternSourceBindingRegistryTarballSuccessor(root);
  bytes = await readFile(artifactPath);
});

describe("Western source-binding nonformal registry-tarball successor v1.4", () => {
  it("loads a frozen private-branded 1-partial 0/28 successor", () => {
    assert.equal(isVerifiedWesternSourceBindingRegistryTarballSuccessor(loaded), true);
    assert.equal(isVerifiedWesternSourceBindingRegistryTarballSuccessor(clone(loaded)), false);
    assert.equal(Object.isFrozen(loaded), true);
    assert.equal(loaded.currentPartialCandidatesAttached, 1);
    assert.equal(loaded.bindingFrozenVerified, 0);
    assert.equal(loaded.bindingRequired, 28);
    assert.equal(loaded.subjectFullySatisfied, 0);
  });

  it("has exact raw identity, self digest and canonical LF materialization", () => {
    const frozen = westernSourceBindingRegistryTarballSuccessorTestOnly.EXPECTED_PERSISTED;
    assert.equal(bytes.length, frozen.rawBytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), frozen.rawSha256);
    assert.equal(bytes.toString("utf8"), serializeWesternSourceBindingRegistryTarballSuccessor(expected));
    assert.equal(expected.ledgerDigest,
      computeWesternSourceBindingRegistryTarballSuccessorDigest(expected));
    assert.equal(bytes.at(-1), 0x0a);
    assert.equal(bytes.includes(Buffer.from("\r\n")), false);
  });

  it("requires the v1.3 private-branded nonformal parent and gives v1.4 no formal effect", () => {
    const boundary = expected.formalStateBoundary;
    assert.equal(boundary.nonformalV13ParentPrivateBrandVerified, true);
    assert.equal(boundary.nonformalV13ParentIsFormalCurrent, false);
    assert.equal(boundary.nonformalV13ParentActiveEffect, "none");
    assert.equal(boundary.nonformalParentConsumptionEstablished, true);
    assert.equal(boundary.v14SuccessorIsFormalCurrent, false);
    assert.equal(boundary.v14SuccessorActiveEffect, "none");
    assert.equal(boundary.formalV1RemainsDeclaredCurrent, true);
    assert.equal(boundary.formalManifestIntegrated, false);
    assert.equal(boundary.formalRegistryIntegrated, false);
  });

  it("replaces only the existing rights candidate and leaves 27 subjects exact", () => {
    const targetId = westernSourceBindingRegistryTarballSuccessorTestOnly.TARGET_SUBJECT_ID;
    const parentSubjects = context.parent.ledger.subjects;
    const currentSubjects = expected.subjects;
    assert.equal(currentSubjects.length, 28);
    assert.equal(currentSubjects.filter((item) => item.bindingState === "candidate_only_unbound").length, 1);
    for (let index = 0; index < currentSubjects.length; index += 1) {
      if (currentSubjects[index].subjectId !== targetId) {
        assert.equal(
          canonicalStringifyWesternSourceBindingRegistryTarballSuccessor(currentSubjects[index]),
          canonicalStringifyWesternSourceBindingRegistryTarballSuccessor(parentSubjects[index]),
          currentSubjects[index].subjectId
        );
      }
    }
  });

  it("binds two exact registry observations without upgrading the rights subject", () => {
    const candidate = expected.candidateEvidenceBindings[0];
    assert.equal(candidate.subjectId, westernSourceBindingRegistryTarballSuccessorTestOnly.TARGET_SUBJECT_ID);
    assert.equal(candidate.candidateId,
      westernSourceBindingRegistryTarballSuccessorTestOnly.CANDIDATE_ID);
    assert.equal(candidate.registryTarballParityObservations.length, 2);
    assert.deepEqual(candidate.registryTarballParityObservations.map((item) =>
      item.packageName + "@" + item.version), ["astronomy-engine@2.1.19", "zod@4.4.3"]);
    assert.equal(candidate.exactLocatorEstablished, false);
    assert.equal(candidate.exactQuoteStored, false);
    assert.equal(candidate.publisherAuthenticityEstablished, false);
    assert.equal(candidate.licenseApplicabilityEstablished, false);
    assert.equal(candidate.workRightsEstablished, false);
    assert.equal(candidate.versionRightsEstablished, false);
    assert.equal(candidate.carrierRightsEstablished, false);
    assert.equal(candidate.rightsLegalConclusionEstablished, false);
    assert.equal(candidate.redistributionAuthorized, false);
    assert.equal(candidate.subjectFullySatisfied, false);
    assert.equal(candidate.countsTowardFrozenBindingGate, false);
  });

  it("preserves evidence accounts and release governance separately", () => {
    assert.equal(expected.evidenceLedger.browserRuntimeEvidence, "not_assessed");
    assert.equal(expected.evidenceLedger.contentTruth, "not_established");
    assert.equal(expected.evidenceLedger.expertTruth, "not_established");
    assert.equal(expected.evidenceLedger.rightsLegalConclusion, "not_established");
    assert.equal(expected.evidenceLedger.releaseReadiness, "not_ready");
    assert.equal(expected.evidenceLedger.publicReleaseAuthorization, "not_authorized");
    assert.deepEqual(expected.releaseGovernance, {
      activeLine: "legacy-v13",
      expertClaimsAuthorized: false,
      migrationId: null,
      mutationEpochAvailableForSchema13: false,
      mutationEpochBoundaryRequired: true,
      mutationEpochReceipt: null,
      publicDeploymentAuthorized: false,
      targetSchema: 13
    });
  });

  it("keeps runtime, trusted time, epoch, atomicity, interval and ABA red", () => {
    assert.equal(expected.runtimeTrustBoundary.nodeRuntimeIdentityEstablished, false);
    assert.equal(expected.runtimeTrustBoundary.loaderIdentityEstablished, false);
    assert.equal(expected.runtimeTrustBoundary.launcherIdentityEstablished, false);
    assert.equal(expected.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
    assert.equal(expected.timeBoundary.trustedClockOrTimestampAuthorityEstablished, false);
    assert.equal(expected.integrityBoundary.crossFileAtomicSnapshotEstablished, false);
    assert.equal(expected.integrityBoundary.mutationEpochAvailable, false);
    assert.equal(expected.integrityBoundary.mutationEpochReceipt, null);
    assert.equal(expected.integrityBoundary.intervalMutationExcludedAcrossFiles, false);
    assert.equal(expected.integrityBoundary.abaExcluded, false);
  });

  it("self-reseal cannot promote rights, bindings, formal state or release", () => {
    for (const mutate of [
      (v) => { v.gateSummary.bindingFrozenVerified = 1; },
      (v) => { v.gateSummary.rightsLegalConclusionEstablished = true; },
      (v) => { v.formalStateBoundary.v14SuccessorIsFormalCurrent = true; },
      (v) => { v.gateSummary.publicReleaseAuthorized = true; },
      (v) => { v.integrityBoundary.mutationEpochAvailable = true; }
    ]) {
      const value = clone(expected);
      mutate(value);
      value.ledgerDigest = computeWesternSourceBindingRegistryTarballSuccessorDigest(value);
      assert.throws(() => verifyWesternSourceBindingRegistryTarballSuccessorLedger(value, context),
        (error) => error instanceof WesternSourceBindingRegistryTarballSuccessorError
          && error.code === "SUCCESSOR_CONTRACT_MISMATCH");
    }
  });

  it("rejects duplicate keys and contains no backlink in v1.3", async () => {
    const duplicate = Buffer.from('{"ledgerId":"a","ledgerId":"b"}\n');
    assert.throws(() => parseWesternSourceBindingRegistryTarballSuccessorArtifact({
      path: "duplicate.json", bytes: duplicate, rawBytes: duplicate.length, rawSha256: "0".repeat(64)
    }), (error) => error.code === "JSON_DUPLICATE_KEY");
    const text = await readFile(path.join(root,
      ...westernSourceBindingRegistryTarballSuccessorTestOnly.PARENT_V13.path.split("/")), "utf8");
    assert.equal(text.includes(westernSourceBindingRegistryTarballSuccessorTestOnly.LEDGER_ID), false);
    assert.equal(text.includes(WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_RELATIVE_PATH), false);
  });

  it("fixed CLI succeeds and rejects operands, visible preload and wrong cwd", () => {
    const ok = spawnCli();
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /^WESTERN_SOURCE_BINDING_REGISTRY_TARBALL_SUCCESSOR_OK /u);
    const operand = spawnCli(["unexpected"]);
    assert.equal(operand.status, 1);
    assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);
    const env = spawnCli([], { env: { NODE_OPTIONS: "" } });
    assert.equal(env.status, 1);
    assert.match(env.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
    assert.equal(spawnCli([], { cwd: path.dirname(root) }).status, 1);
  });
});
