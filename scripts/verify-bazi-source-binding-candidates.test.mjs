import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  computeCandidateDigest,
  computeFacsimileCollationCandidateDigest,
  computeLedgerDigest,
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const sourceLedger = JSON.parse(readFileSync(
  path.resolve(workspaceRoot, "content/bazi-strength-source-binding-candidates.v1.json"),
  "utf8"
));

function refreshedLedger(mutator) {
  const ledger = structuredClone(sourceLedger);
  mutator(ledger);
  ledger.candidates.forEach((candidate) => {
    candidate.facsimileCollationCandidates.forEach((collation) => {
      collation.collationDigest = computeFacsimileCollationCandidateDigest(collation);
    });
  });
  ledger.candidates.forEach((candidate) => {
    candidate.candidateDigest = computeCandidateDigest(candidate);
  });
  ledger.ledgerDigest = computeLedgerDigest(ledger);
  return ledger;
}

test("accepts the pinned hash-only link-only source and facsimile candidate ledger", () => {
  const gate = verifyBaziSourceBindingCandidateLedger(structuredClone(sourceLedger)).gateSummary;
  assert.equal(gate.normalizedFacsimileCollationCandidatesObserved, 7);
  assert.equal(gate.exactGlyphFacsimileCorrespondenceCandidatesObserved, 1);
  assert.equal(gate.exactFacsimileCollationsVerified, 0);
  assert.equal(gate.bindingFrozenVerified, 0);
});

test("rejects a changed MediaWiki revision digest even after envelope digests are refreshed", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].carrierIdentity.rawWikitextSha256 = "f".repeat(64);
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /rawWikitextSha256 does not match the acquired revision lock/u
  );
});

test("rejects plaintext quote material in the public candidate envelope", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].quoteCandidates[0].quote = "forbidden plaintext";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /keys expected/u
  );
});

test("rejects a changed facsimile carrier digest even after envelope digests are refreshed", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[1].facsimileAnchors[0].carrierSha256 = "f".repeat(64);
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /carrierSha256 does not match the acquired facsimile lock/u
  );
});

test("rejects dropping the second DTT carrier even after envelope digests are refreshed", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[1].facsimileAnchors.pop();
    candidateLedger.candidates[1].facsimileCollationCandidates.splice(2, 2);
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /facsimileAnchors count does not match/u
  );
});

test("rejects drift in the YHZP hidden-stem quote locator", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[3].quoteCandidates[0].rawCharacterEndExclusive += 1;
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /rawCharacterEndExclusive expected 927, got 928/u
  );
});

test("rejects a changed Page namespace revision lock", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].facsimileAnchors[0].pageRefs[0].pageRevisionId += 1;
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /pageRevisionId does not match the acquired page lock/u
  );
});

test("rejects promoting an unproofread Page transcription to a proofread state", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    const pageRef = candidateLedger.candidates[0].facsimileAnchors[0].pageRefs[0];
    pageRef.pageTranscriptionQualityLevel = 4;
    pageRef.pageTranscriptionQualityState = "proofread";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /pageTranscriptionQualityLevel does not match the acquired page lock/u
  );
});

test("rejects stored facsimile files or an implied exact collation", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[0].facsimileAnchors[0].repositoryPageImagesStored = true;
    candidateLedger.candidates[0].facsimileAnchors[0].exactCollationStatus = "verified";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /must remain link-only, visually corroborated, uncollated, and legally unadjudicated/u
  );
});

test("rejects plaintext in the hash-only normalized collation candidate", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.candidates[1].facsimileCollationCandidates[0].carrierText = "forbidden plaintext";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /keys expected/u
  );
});

test("rejects promoting the YHZP normalized comparison to exact evidence", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    const collation = candidateLedger.candidates[3].facsimileCollationCandidates[0];
    collation.exactGlyphSequenceEqual = true;
    collation.bindingFreezeEffect = "frozen";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /must remain nonexpert, hash-only, and non-promotional/u
  );
});

test("rejects promoting a nonexpert normalized comparison to exact or reviewed evidence", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    const collation = candidateLedger.candidates[1].facsimileCollationCandidates[0];
    collation.exactGlyphSequenceEqual = true;
    collation.humanCollatorAttestations = ["invented-reviewer"];
    collation.bindingFreezeEffect = "frozen";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /must remain nonexpert, hash-only, and non-promotional/u
  );
});

test("rejects promoting a CADAL normalized comparison to frozen evidence", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    const collation = candidateLedger.candidates[1].facsimileCollationCandidates[2];
    collation.humanCollatorAttestations = ["invented-reviewer"];
    collation.bindingFreezeEffect = "frozen";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /must remain nonexpert, hash-only, and non-promotional/u
  );
});

test("rejects promoting an exact-glyph visual candidate to a verified human collation", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    const collation = candidateLedger.candidates[0].facsimileCollationCandidates[1];
    collation.humanCollatorAttestations = ["invented-reviewer"];
    collation.domainExpertReviewIds = ["invented-expert-review"];
    collation.bindingFreezeEffect = "frozen";
    candidateLedger.gateSummary.exactFacsimileCollationsVerified = 1;
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /must remain nonexpert, hash-only, and non-promotional/u
  );
});

test("rejects promotion to frozen or rights-reviewed state without human evidence", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.gateSummary.bindingFrozenVerified = 1;
    candidateLedger.candidates[0].rightsObservation.distributionDecision = "redistributable";
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /rightsObservation must remain unreviewed, link-only, and legally unestablished/u
  );
});

test("rejects a parallel conceptual binding identifier", () => {
  const ledger = refreshedLedger((candidateLedger) => {
    candidateLedger.conceptualTopicMapping[0].currentBindingIds = ["strength.yueling_exact_quote"];
  });
  assert.throws(
    () => verifyBaziSourceBindingCandidateLedger(ledger),
    /currentBindingIds expected/u
  );
});
