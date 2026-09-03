import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  computeRightsCandidateDigest,
  computeRightsCandidateLedgerDigest,
  verifyBaziSourceRightsCandidateLedger
} from "./bazi-source-rights-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const sourceRightsLedger = JSON.parse(readFileSync(
  path.resolve(workspaceRoot, "content/bazi-strength-source-rights-candidates.v1.json"),
  "utf8"
));
const sourceBindingLedger = JSON.parse(readFileSync(
  path.resolve(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json"),
  "utf8"
));

function refreshedLedger(mutator) {
  const ledger = structuredClone(sourceRightsLedger);
  mutator(ledger);
  ledger.candidates.forEach((candidate) => {
    candidate.candidateDigest = computeRightsCandidateDigest(candidate);
  });
  ledger.ledgerDigest = computeRightsCandidateLedgerDigest(ledger);
  return ledger;
}

test("accepts the link-only three-layer rights observation ledger", () => {
  const verified = verifyBaziSourceRightsCandidateLedger(
    structuredClone(sourceRightsLedger),
    structuredClone(sourceBindingLedger)
  );
  assert.equal(verified.gateSummary.redistributableSources, 0);
  assert.equal(verified.gateSummary.formalSourceRightsRecordsCreated, 0);
  assert.equal(verified.gateSummary.formalSourceCarrierRecordsCreated, 0);
  assert.equal(verified.gateSummary.commonsPublicDomainMetadataObserved, 5);
});

test("rejects a rights ledger detached from the verified source ledger", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.sourceBindingLedger.ledgerDigest = "f".repeat(64);
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /sourceBindingLedger does not match/u
  );
});

test("rejects fabricating a page-specific PD notice for the volume-five revision", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[2].workLayer.pageSpecificNoticeObservation = "pd_old_template_observed";
    candidateLedger.candidates[2].workLayer.observedTemplateNames = ["Template:PD-old"];
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /workLayer does not match the acquired work observation lock/u
  );
});

test("rejects turning Commons public-domain metadata into carrier clearance", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].carrierLayers[0].status = "cleared";
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /cannot imply carrier reuse clearance/u
  );
});

test("rejects omitting the second DTT carrier rights layer", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[1].carrierLayers.pop();
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /carrierLayers count must match/u
  );
});

test("rejects clearing only the second DTT carrier layer", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[1].carrierLayers[1].status = "cleared";
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /cannot imply carrier reuse clearance/u
  );
});

test("rejects a formal SourceRightsRecord or SourceCarrierRecord claim without an actual document", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].decision.formalSourceRightsRecordCreated = true;
    candidateLedger.candidates[0].decision.formalSourceCarrierRecordCreated = true;
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /formalSourceRightsRecordCreated must remain false/u
  );
});

test("rejects redistributable promotion or a legal conclusion without review", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].decision.distributionPolicy = "redistributable";
    candidateLedger.candidates[0].decision.legalConclusion = "cleared";
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /cannot imply formal records, legal review, clearance, or freezing/u
  );
});

test("rejects stored source bodies or carrier files in this public candidate ledger", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.accessBoundary.sourceBodiesStored = true;
    candidateLedger.accessBoundary.carrierFilesStored = true;
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /repository-empty/u
  );
});

test("rejects policy revision drift even when envelope digests are refreshed", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.policyEvidence[0].revisionId += 1;
  });
  assert.throws(
    () => verifyBaziSourceRightsCandidateLedger(ledger, structuredClone(sourceBindingLedger)),
    /revisionId does not match the acquired policy lock/u
  );
});
