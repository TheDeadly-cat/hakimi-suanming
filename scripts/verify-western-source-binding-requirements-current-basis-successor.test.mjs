import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH,
  WesternSourceBindingCurrentBasisSuccessorError,
  canonicalStringifyWesternSourceBindingCurrentBasisSuccessor,
  computeWesternSourceBindingCurrentBasisSuccessorDigest,
  isVerifiedWesternSourceBindingCurrentBasisSuccessor,
  loadWesternSourceBindingCurrentBasisSuccessor,
  parseWesternSourceBindingCurrentBasisSuccessorArtifact,
  serializeWesternSourceBindingCurrentBasisSuccessor,
  verifyWesternSourceBindingCurrentBasisSuccessorLedger,
  westernSourceBindingCurrentBasisSuccessorTestOnly
} from "./western-source-binding-requirements-current-basis-successor-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = path.join(
  workspaceRoot,
  ...WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH.split("/")
);
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-western-source-binding-requirements-current-basis-successor.mjs"
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function reseal(value) {
  value.ledgerDigest = computeWesternSourceBindingCurrentBasisSuccessorDigest(value);
  return value;
}

function expectCode(code, operation) {
  assert.throws(operation, (reason) => {
    assert.ok(reason instanceof WesternSourceBindingCurrentBasisSuccessorError);
    assert.equal(reason.code, code);
    return true;
  });
}

function cleanEnv(overrides = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...overrides };
}

function spawnCli(args = [], options = {}) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? workspaceRoot,
    encoding: "utf8",
    env: cleanEnv(options.env),
    windowsHide: true
  });
}

let context;
let expected;
let loaded;
let persistedBytes;
let persistedLedger;

before(async () => {
  context = await westernSourceBindingCurrentBasisSuccessorTestOnly
    .collectCurrentInputs(workspaceRoot);
  expected = westernSourceBindingCurrentBasisSuccessorTestOnly.buildProjection(context);
  loaded = await loadWesternSourceBindingCurrentBasisSuccessor(workspaceRoot);
  persistedBytes = await readFile(ledgerPath);
  persistedLedger = JSON.parse(persistedBytes.toString("utf8"));
});

describe("Western source-binding current-basis nonformal successor", () => {
  it("fixed loader returns a frozen private-branded nonformal 0/28 successor", () => {
    assert.equal(isVerifiedWesternSourceBindingCurrentBasisSuccessor(loaded), true);
    assert.equal(isVerifiedWesternSourceBindingCurrentBasisSuccessor(clone(loaded)), false);
    assert.equal(Object.isFrozen(loaded), true);
    assert.equal(Object.isFrozen(loaded.ledger), true);
    assert.equal(loaded.currentPartialCandidatesAttached, 1);
    assert.equal(loaded.bindingFrozenVerified, 0);
    assert.equal(loaded.bindingRequired, 28);
    assert.equal(loaded.subjectFullySatisfied, 0);
  });

  it("persisted identity, domain digest and canonical LF materialization are exact", () => {
    const frozen = westernSourceBindingCurrentBasisSuccessorTestOnly.EXPECTED_PERSISTED;
    assert.equal(persistedBytes.length, frozen.rawBytes);
    assert.equal(createHash("sha256").update(persistedBytes).digest("hex"), frozen.rawSha256);
    assert.equal(
      persistedBytes.toString("utf8"),
      serializeWesternSourceBindingCurrentBasisSuccessor(expected)
    );
    assert.equal(persistedLedger.ledgerDigest,
      computeWesternSourceBindingCurrentBasisSuccessorDigest(persistedLedger));
    assert.equal(persistedBytes.at(-1), 0x0a);
    assert.equal(persistedBytes.toString("utf8").includes("\r\n"), false);
  });

  it("keeps formal v1 declared current but mechanically stale and gives v1.3 no effect", () => {
    assert.equal(loaded.formalV1RemainsDeclaredCurrent, true);
    assert.equal(loaded.formalV1MechanicallyCurrent, false);
    assert.equal(loaded.ledger.formalCurrentBinding.loaderFailureClass, "LEDGER_MISMATCH");
    assert.equal(loaded.successorIsFormalCurrent, false);
    assert.equal(loaded.successorActiveEffect, "none");
    assert.equal(loaded.ledger.formalStateBoundary.formalParentConsumptionEstablished, false);
    assert.equal(loaded.ledger.formalStateBoundary.formalManifestIntegrated, false);
    assert.equal(loaded.ledger.formalStateBoundary.formalRegistryIntegrated, false);
  });

  it("marks v1.1 and v1.2 stale, private-brand unavailable and wholly unconsumed", () => {
    const historical = loaded.ledger.historicalCandidateBoundary;
    assert.equal(historical.historicalCandidates.length, 2);
    assert.equal(historical.historicalTzdbPartialCandidatesObserved, 2);
    assert.equal(historical.historicalCandidatesConsumedByThisSuccessor, 0);
    assert.equal(historical.historicalCandidatesCarriedForwardAsCurrent, 0);
    assert.equal(historical.historicalCandidateEvidenceTrustedAsCurrent, false);
    for (const item of historical.historicalCandidates) {
      assert.equal(item.isFormalCurrent, false);
      assert.equal(item.activeEffect, "none");
      assert.equal(item.mechanicallyCurrent, false);
      assert.equal(item.currentPrivateBrandAvailable, false);
      assert.equal(item.loaderFailureClass, "LEDGER_MISMATCH");
    }
  });

  it("changes exactly the engine-code rights subject to one partial candidate", () => {
    const candidates = loaded.ledger.candidateEvidenceBindings;
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].subjectId, "western.rights.engine-code-and-distribution");
    assert.equal(candidates[0].bindingState, "candidate_only_unbound");
    assert.equal(candidates[0].subjectFullySatisfied, false);
    assert.equal(candidates[0].countsTowardFrozenBindingGate, false);

    const candidateSubjects = loaded.ledger.subjects.filter(
      (subject) => subject.bindingState === "candidate_only_unbound"
    );
    const requiredSubjects = loaded.ledger.subjects.filter(
      (subject) => subject.bindingState === "required_unbound"
    );
    assert.deepEqual(candidateSubjects.map((subject) => subject.subjectId), [
      "western.rights.engine-code-and-distribution"
    ]);
    assert.equal(requiredSubjects.length, 27);
    assert.equal(loaded.ledger.subjects.length, 28);
  });

  it("limits the current candidate to astronomy-engine and zod carrier endpoints", () => {
    const candidate = loaded.ledger.candidateEvidenceBindings[0];
    assert.deepEqual(candidate.fixedDependencyIdentities.map((item) => (
      item.packageName + "@" + item.version
    )), ["astronomy-engine@2.1.19", "zod@4.4.3"]);
    assert.equal(candidate.coversAstronomyEngine2_1_19, true);
    assert.equal(candidate.coversZod4_4_3, true);
    assert.equal(candidate.coversSofa, false);
    assert.equal(candidate.coversSwissEphemeris, false);
    assert.equal(candidate.coversCivilTimeTzdbOrMomentTimezone, false);
  });

  it("records Astronomy installed LICENSE absence and the two controlled copies precisely", () => {
    const astronomy = loaded.ledger.candidateEvidenceBindings[0].fixedDependencyIdentities[0];
    assert.equal(
      astronomy.installedExactLicenseEndpoint.path,
      "node_modules/astronomy-engine/LICENSE"
    );
    assert.equal(
      astronomy.installedExactLicenseEndpoint.observation,
      "exact_path_absent_at_two_point_in_time_checks"
    );
    assert.equal(astronomy.installedExactLicenseEndpoint.persistentAbsenceEstablished, false);
    assert.equal(astronomy.controlledProjectLicenseCopies.length, 2);
    assert.deepEqual(
      astronomy.controlledProjectLicenseCopies.map((copy) => copy.rawSha256),
      [
        "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023",
        "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023"
      ]
    );
  });

  it("keeps authenticity applicability rights legal and redistribution gates red", () => {
    const candidate = loaded.ledger.candidateEvidenceBindings[0];
    for (const field of [
      "publisherAuthenticityEstablished",
      "licenseApplicabilityEstablished",
      "licenseCompatibilityEstablished",
      "workRightsEstablished",
      "versionRightsEstablished",
      "editionRightsEstablished",
      "carrierRightsEstablished",
      "rightsLegalConclusionEstablished",
      "redistributionAuthorized",
      "noticeObligationSatisfied",
      "independentRightsReviewVerified"
    ]) assert.equal(candidate[field], false, field);

    for (const field of [
      "publisherAuthenticityEstablished",
      "licenseApplicabilityEstablished",
      "licenseCompatibilityEstablished",
      "workRightsEstablished",
      "versionRightsEstablished",
      "editionRightsEstablished",
      "carrierRightsEstablished",
      "independentRightsReviewsVerified"
    ]) assert.equal(loaded.ledger.gateSummary[field], 0, field);
    assert.equal(loaded.ledger.gateSummary.rightsLegalConclusionEstablished, false);
    assert.equal(loaded.ledger.gateSummary.redistributionAuthorized, false);
  });

  it("keeps expert release runtime trusted-time and mutation-epoch accounts red", () => {
    const gates = loaded.ledger.gateSummary;
    assert.equal(gates.expertReviewedSubjects, 0);
    assert.equal(gates.independentDomainExpertReviewsVerified, 0);
    assert.equal(gates.browserRuntimeValidated, false);
    assert.equal(gates.releaseReady, false);
    assert.equal(gates.publicDeploymentAuthorized, false);
    assert.equal(gates.publicReleaseAuthorized, false);

    const runtime = loaded.ledger.runtimeTrustBoundary;
    assert.equal(runtime.trustedTimeEstablished, false);
    assert.equal(runtime.nodeRuntimeIdentityEstablished, false);
    assert.equal(runtime.loaderIdentityEstablished, false);
    assert.equal(runtime.launcherIdentityEstablished, false);
    assert.equal(runtime.cliOutputTrustedAttestation, false);

    const integrity = loaded.ledger.integrityBoundary;
    assert.equal(integrity.crossFileAtomicSnapshotEstablished, false);
    assert.equal(integrity.mutationEpochAvailable, false);
    assert.equal(integrity.mutationEpochReceipt, null);
    assert.equal(integrity.intervalMutationExcludedAcrossFiles, false);
    assert.equal(integrity.abaExcluded, false);
  });

  it("keeps engineering observation separate from truth rights and release claims", () => {
    assert.equal(
      loaded.ledger.evidenceLedger.engineeringEvidence,
      "current_four_endpoint_basis_and_three_package_two_external_dependency_carrier_observation_verified"
    );
    assert.equal(loaded.ledger.evidenceLedger.browserRuntimeEvidence, "not_assessed");
    assert.equal(loaded.ledger.evidenceLedger.contentTruth, "not_established");
    assert.equal(loaded.ledger.evidenceLedger.expertTruth, "not_established");
    assert.equal(loaded.ledger.evidenceLedger.rightsLegalConclusion, "not_established");
    assert.equal(loaded.ledger.evidenceLedger.releaseReadiness, "not_ready");
    assert.equal(loaded.ledger.evidenceLedger.publicReleaseAuthorization, "not_authorized");
  });

  it("self-reseal cannot promote formal state or consume historical candidates", () => {
    const mutations = [
      (value) => { value.formalStateBoundary.successorIsFormalCurrent = true; },
      (value) => { value.formalStateBoundary.successorActiveEffect = "active"; },
      (value) => { value.formalCurrentBinding.mechanicallyCurrent = true; },
      (value) => { value.historicalCandidateBoundary.historicalCandidatesConsumedByThisSuccessor = 2; },
      (value) => { value.historicalCandidateBoundary.historicalCandidates[0].currentPrivateBrandAvailable = true; }
    ];
    for (const mutate of mutations) {
      const value = clone(expected);
      mutate(value);
      reseal(value);
      expectCode("SUCCESSOR_CONTRACT_MISMATCH", () =>
        verifyWesternSourceBindingCurrentBasisSuccessorLedger(value, context));
    }
  });

  it("self-reseal cannot promote bindings rights experts release runtime time or epoch", () => {
    const mutations = [
      (value) => { value.gateSummary.bindingFrozenVerified = 1; },
      (value) => { value.gateSummary.rightsLegalConclusionEstablished = true; },
      (value) => { value.gateSummary.independentDomainExpertReviewsVerified = 2; },
      (value) => { value.gateSummary.releaseReady = true; },
      (value) => { value.gateSummary.publicReleaseAuthorized = true; },
      (value) => { value.runtimeTrustBoundary.trustedTimeEstablished = true; },
      (value) => { value.runtimeTrustBoundary.cliOutputTrustedAttestation = true; },
      (value) => { value.integrityBoundary.mutationEpochAvailable = true; },
      (value) => { value.integrityBoundary.abaExcluded = true; }
    ];
    for (const mutate of mutations) {
      const value = clone(expected);
      mutate(value);
      reseal(value);
      expectCode("SUCCESSOR_CONTRACT_MISMATCH", () =>
        verifyWesternSourceBindingCurrentBasisSuccessorLedger(value, context));
    }
  });

  it("strict parser rejects duplicate keys", () => {
    const bytes = Buffer.from('{"ledgerId":"a","ledgerId":"b"}\n', "utf8");
    expectCode("JSON_DUPLICATE_KEY", () =>
      parseWesternSourceBindingCurrentBasisSuccessorArtifact({
        path: "duplicate.json",
        bytes,
        rawBytes: bytes.length,
        rawSha256: "0".repeat(64)
      }));
  });

  it("canonicalization rejects accessors aliases cycles and dangerous keys", () => {
    const accessor = clone(expected);
    Object.defineProperty(accessor, "status", {
      enumerable: true,
      get() { return expected.status; }
    });
    assert.throws(() =>
      canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(accessor));

    const alias = clone(expected);
    alias.alias = alias.gateSummary;
    assert.throws(() =>
      canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(alias));

    const cycle = clone(expected);
    cycle.self = cycle;
    assert.throws(() =>
      canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(cycle));

    const dangerous = clone(expected);
    Object.defineProperty(dangerous, "__proto__", {
      value: {}, enumerable: true, configurable: true, writable: true
    });
    assert.throws(() =>
      canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(dangerous));
  });

  it("canonicalization and serialization ignore inherited toJSON poisoning", () => {
    const structuralClone = clone(expected);
    const originalObject = Object.prototype.toJSON;
    const originalArray = Array.prototype.toJSON;
    Object.prototype.toJSON = () => ({ promoted: true });
    Array.prototype.toJSON = () => ["promoted"];
    try {
      assert.equal(
        canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(expected),
        canonicalStringifyWesternSourceBindingCurrentBasisSuccessor(structuralClone)
      );
      assert.equal(
        serializeWesternSourceBindingCurrentBasisSuccessor(expected),
        persistedBytes.toString("utf8")
      );
    } finally {
      if (originalObject === undefined) delete Object.prototype.toJSON;
      else Object.prototype.toJSON = originalObject;
      if (originalArray === undefined) delete Array.prototype.toJSON;
      else Array.prototype.toJSON = originalArray;
    }
  });

  it("formal v1 v1.1 and v1.2 contain no successor or child backlink", async () => {
    const needles = [
      westernSourceBindingCurrentBasisSuccessorTestOnly.LEDGER_ID,
      WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_RELATIVE_PATH,
      westernSourceBindingCurrentBasisSuccessorTestOnly.CHILD.childId,
      westernSourceBindingCurrentBasisSuccessorTestOnly.CHILD.path
    ];
    for (const spec of [
      westernSourceBindingCurrentBasisSuccessorTestOnly.FORMAL_V1,
      westernSourceBindingCurrentBasisSuccessorTestOnly.HISTORICAL_V11,
      westernSourceBindingCurrentBasisSuccessorTestOnly.HISTORICAL_V12
    ]) {
      const text = await readFile(path.join(workspaceRoot, ...spec.path.split("/")), "utf8");
      for (const needle of needles) assert.equal(text.includes(needle), false, spec.path);
    }
  });

  it("release governance remains legacy-v13 targetSchema 13 migrationId null", () => {
    const release = loaded.ledger.releaseGovernance;
    assert.equal(release.activeLine, "legacy-v13");
    assert.equal(release.targetSchema, 13);
    assert.equal(release.migrationId, null);
    assert.equal(release.mutationEpochBoundaryRequired, true);
    assert.equal(release.mutationEpochAvailableForSchema13, false);
    assert.equal(release.mutationEpochReceipt, null);
    assert.equal(release.expertClaimsAuthorized, false);
    assert.equal(release.publicDeploymentAuthorized, false);
  });

  it("fixed CLI succeeds and reports the nonformal stale-history boundary", () => {
    const result = spawnCli();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^WESTERN_SOURCE_BINDING_CURRENT_BASIS_SUCCESSOR_OK /u);
    const summary = JSON.parse(result.stdout.slice(result.stdout.indexOf(" ") + 1));
    assert.equal(summary.formalV1RemainsDeclaredCurrent, true);
    assert.equal(summary.formalV1MechanicallyCurrent, false);
    assert.equal(summary.successorIsFormalCurrent, false);
    assert.equal(summary.successorActiveEffect, "none");
    assert.equal(summary.currentPartialCandidatesAttached, 1);
    assert.equal(summary.historicalStaleCandidatesObserved, 2);
    assert.equal(summary.historicalCandidatesConsumed, 0);
    assert.equal(summary.bindings, "0/28");
    assert.equal(summary.publicReleaseAuthorized, false);
  });

  it("fixed CLI rejects operands visible preload environment import and wrong cwd", () => {
    const operand = spawnCli(["unexpected"]);
    assert.equal(operand.status, 1);
    assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);

    const environment = spawnCli([], { env: { NODE_OPTIONS: "" } });
    assert.equal(environment.status, 1);
    assert.match(environment.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);

    const visibleImport = spawnSync(
      process.execPath,
      ["--import=data:text/javascript,globalThis.__westernStageCPreloaded%3Dtrue", cliPath],
      { cwd: workspaceRoot, encoding: "utf8", env: cleanEnv(), windowsHide: true }
    );
    assert.equal(visibleImport.status, 1);
    assert.match(visibleImport.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);

    const wrongRoot = spawnCli([], { cwd: path.dirname(workspaceRoot) });
    assert.equal(wrongRoot.status, 1);
    assert.match(wrongRoot.stderr, /WORKSPACE_ROOT_REQUIRED/u);
  });
});
