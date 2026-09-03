import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS,
  buildCurrentIndependentSourceRequirements,
  canonicalStringifyIndependentSourceRequirements,
  readIndependentSourceRequirements,
  verifyIndependentSourceRequirements
} from "./independent-source-binding-requirements-lib.mjs";
import { verifyZiweiHkoCalendarSourceEvidence } from "./ziwei-hko-calendar-source-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HKO_SUBJECT_ID = "ziwei.engineering.official-calendar-differential";
const HKO_CANDIDATE_ID =
  "hakimi.ziwei.source-candidate/hko-calendar-boundary-replay-2023-2028/1.0.0";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectMismatch(definitionInput, candidate) {
  await assert.rejects(
    verifyIndependentSourceRequirements(workspaceRoot, definitionInput, candidate),
    /requirements 与当前依据、精确 subject inventory 或失败关闭账不一致/u
  );
}

test("Ziwei and Western requirement ledgers exactly bind their current subject inventories", async () => {
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    const expected = await buildCurrentIndependentSourceRequirements(workspaceRoot, definitionInput, {
      createdAt: ledger.createdAt
    });
    assert.equal(
      canonicalStringifyIndependentSourceRequirements(ledger),
      canonicalStringifyIndependentSourceRequirements(expected)
    );
    await verifyIndependentSourceRequirements(workspaceRoot, definitionInput, ledger);
  }
});

test("the exact inventories contain 27 Ziwei and 28 Western required subjects", async () => {
  const expectedCounts = new Map([
    ["ziwei-doushu", 27],
    ["western-astrology", 28]
  ]);
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    assert.equal(ledger.gateSummary.bindingRequired, expectedCounts.get(definitionInput.productSystemId));
    assert.equal(ledger.subjects.length, expectedCounts.get(definitionInput.productSystemId));
    assert.equal(new Set(ledger.subjects.map((entry) => entry.subjectId)).size, ledger.subjects.length);
  }
});

test("only the Ziwei HKO subject has one partial candidate while every binding remains unfrozen", async () => {
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    for (const entry of ledger.subjects) {
      const isHkoCandidate = definitionInput.productSystemId === "ziwei-doushu"
        && entry.subjectId === HKO_SUBJECT_ID;
      assert.equal(entry.bindingState, isHkoCandidate ? "candidate_only_unbound" : "required_unbound");
      assert.deepEqual(entry.sourceCandidateIds, isHkoCandidate ? [HKO_CANDIDATE_ID] : []);
      assert.equal(entry.frozenBindingId, null);
      if (isHkoCandidate) {
        assert.match(entry.sourceBodyDigest, /^[a-f0-9]{64}$/u);
        assert.equal(entry.exactLocatorEstablished, true);
      } else {
        assert.equal(entry.sourceBodyDigest, null);
        assert.equal(entry.exactLocatorEstablished, false);
      }
      assert.equal(entry.exactQuoteStored, false);
      assert.equal(entry.workRightsEstablished, false);
      assert.equal(entry.editionRightsEstablished, false);
      assert.equal(entry.carrierRightsEstablished, false);
      assert.equal(entry.rightsLegalConclusion, "not_established");
      assert.deepEqual(entry.expertReviewIds, []);
      assert.equal(entry.frozenAt, null);
    }
    if (definitionInput.productSystemId === "ziwei-doushu") {
      assert.equal(ledger.status, "requirements_plus_one_partial_candidate_no_bindings_frozen");
      assert.equal(ledger.candidateEvidenceBindings.length, 1);
      const binding = ledger.candidateEvidenceBindings[0];
      const target = ledger.subjects.find((entry) => entry.subjectId === HKO_SUBJECT_ID);
      assert.ok(target);
      assert.equal(binding.subjectId, HKO_SUBJECT_ID);
      assert.equal(binding.candidateId, HKO_CANDIDATE_ID);
      assert.equal(
        binding.path,
        "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json"
      );
      assert.equal(Number.isSafeInteger(binding.bytes) && binding.bytes > 0, true);
      assert.match(binding.sha256, /^[a-f0-9]{64}$/u);
      assert.match(binding.evidenceDigest, /^[a-f0-9]{64}$/u);
      assert.equal(binding.sourceBodySetDigest, target.sourceBodyDigest);
      assert.equal(binding.coverageScope, "calendar_resolution");
      assert.equal(binding.subjectFullySatisfied, false);
      assert.deepEqual(ledger.gateSummary, {
        bindingRequired: 27,
        bindingFrozenVerified: 0,
        sourceCandidatesAttached: 1,
        sourceBodiesBound: 1,
        exactQuotesBound: 0,
        exactLocatorsEstablished: 1,
        workRightsEstablished: 0,
        editionRightsEstablished: 0,
        carrierRightsEstablished: 0,
        expertReviewedSubjects: 0,
        sourceBundleComplete: false,
        rightsBundleComplete: false,
        expertReviewBundleComplete: false,
        releaseReady: false
      });
    } else {
      assert.equal(ledger.status, "requirements_only_no_bindings_frozen");
      assert.equal(Object.hasOwn(ledger, "candidateEvidenceBindings"), false);
      assert.equal(ledger.gateSummary.sourceCandidatesAttached, 0);
      assert.equal(ledger.gateSummary.sourceBodiesBound, 0);
      assert.equal(ledger.gateSummary.exactLocatorsEstablished, 0);
    }
  }
});

test("the Ziwei candidate entry reuses the child verified artifact identity", async () => {
  const definitionInput = INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
  const binding = ledger.candidateEvidenceBindings[0];
  const childVerification = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  assert.deepEqual(
    { path: binding.path, bytes: binding.bytes, sha256: binding.sha256 },
    childVerification.artifact
  );
});

test("source candidates quotes frozen bindings and rights cannot be fabricated", async () => {
  const mutations = [
    (value) => { value.subjects[0].sourceCandidateIds = ["candidate:invented"]; },
    (value) => { value.subjects[0].bindingState = "frozen_verified"; },
    (value) => { value.subjects[0].sourceBodyDigest = "a".repeat(64); },
    (value) => { value.subjects[0].exactQuoteStored = true; },
    (value) => { value.subjects[0].carrierRightsEstablished = true; },
    (value) => { value.subjects[0].rightsLegalConclusion = "cleared"; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; }
  ];
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    for (const mutate of mutations) {
      const candidate = clone(ledger);
      mutate(candidate);
      await expectMismatch(definitionInput, candidate);
    }
  }
});

test("the Ziwei HKO candidate binding cannot be aliased widened frozen or promoted", async () => {
  const definitionInput = INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
  const targetIndex = ledger.subjects.findIndex((entry) => entry.subjectId === HKO_SUBJECT_ID);
  assert.notEqual(targetIndex, -1);

  const mutations = [
    (value) => { value.candidateEvidenceBindings[0].candidateId = "candidate:alias"; },
    (value) => { value.candidateEvidenceBindings[0].path = "content/system-admission/other.json"; },
    (value) => { value.candidateEvidenceBindings[0].sha256 = "0".repeat(64); },
    (value) => { value.candidateEvidenceBindings[0].evidenceDigest = "0".repeat(64); },
    (value) => { value.candidateEvidenceBindings[0].sourceBodySetDigest = "0".repeat(64); },
    (value) => { value.candidateEvidenceBindings[0].coverageScope = "ziwei_chart_rules"; },
    (value) => { value.candidateEvidenceBindings[0].subjectFullySatisfied = true; },
    (value) => { value.subjects[targetIndex].bindingState = "frozen_verified"; },
    (value) => { value.subjects[targetIndex].frozenBindingId = "binding:invented"; },
    (value) => { value.subjects[targetIndex].exactQuoteStored = true; },
    (value) => { value.subjects[targetIndex].workRightsEstablished = true; },
    (value) => { value.subjects[targetIndex].expertReviewIds = ["expert:invented"]; },
    (value) => { value.gateSummary.sourceCandidatesAttached = 2; },
    (value) => { value.gateSummary.sourceBodiesBound = 6; },
    (value) => { value.gateSummary.exactLocatorsEstablished = 0; },
    (value) => { value.gateSummary.bindingFrozenVerified = 1; },
    (value) => { value.gateSummary.sourceBundleComplete = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(ledger);
    mutate(candidate);
    await expectMismatch(definitionInput, candidate);
  }

  const moved = clone(ledger);
  moved.subjects[targetIndex].sourceCandidateIds = [];
  moved.subjects[targetIndex].bindingState = "required_unbound";
  moved.subjects[targetIndex].sourceBodyDigest = null;
  moved.subjects[targetIndex].exactLocatorEstablished = false;
  moved.subjects[0].sourceCandidateIds = [HKO_CANDIDATE_ID];
  moved.subjects[0].bindingState = "candidate_only_unbound";
  moved.subjects[0].sourceBodyDigest = ledger.subjects[targetIndex].sourceBodyDigest;
  moved.subjects[0].exactLocatorEstablished = true;
  await expectMismatch(definitionInput, moved);

  const westernDefinition = INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS.find(
    (entry) => entry.productSystemId === "western-astrology"
  );
  assert.ok(westernDefinition);
  const western = clone(await readIndependentSourceRequirements(workspaceRoot, westernDefinition));
  western.candidateEvidenceBindings = [clone(ledger.candidateEvidenceBindings[0])];
  await expectMismatch(westernDefinition, western);
});

test("expert truth default v13 inheritance and public authorization cannot be fabricated", async () => {
  const mutations = [
    (value) => { value.subjects[0].expertReviewIds = ["expert:invented"]; },
    (value) => { value.evidenceLedger.expertTruth = "inherited_from_bazi"; },
    (value) => { value.releaseGovernance.targetSchema = 14; },
    (value) => { value.releaseGovernance.migrationId = "invented"; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; }
  ];
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    for (const mutate of mutations) {
      const candidate = clone(ledger);
      mutate(candidate);
      await expectMismatch(definitionInput, candidate);
    }
  }
});

test("basis artifact identities bind byte length and SHA-256 to one file buffer", async () => {
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);
    for (const artifact of ledger.basisArtifacts) {
      const buffer = await readFile(path.resolve(workspaceRoot, ...artifact.path.split("/")));
      assert.equal(artifact.bytes, buffer.byteLength);
      assert.equal(artifact.sha256, createHash("sha256").update(buffer).digest("hex"));
    }
  }
});

test("basis artifact drift subject omission and unknown fields fail closed", async () => {
  for (const definitionInput of INDEPENDENT_SOURCE_REQUIREMENT_DEFINITIONS) {
    const ledger = await readIndependentSourceRequirements(workspaceRoot, definitionInput);

    const digestDrift = clone(ledger);
    digestDrift.basisArtifacts[0].sha256 = "0".repeat(64);
    await expectMismatch(definitionInput, digestDrift);

    const subjectOmission = clone(ledger);
    subjectOmission.subjects.pop();
    subjectOmission.gateSummary.bindingRequired -= 1;
    await expectMismatch(definitionInput, subjectOmission);

    const unknown = clone(ledger);
    unknown.sourceAuthorityApproved = true;
    await expectMismatch(definitionInput, unknown);
  }
});
