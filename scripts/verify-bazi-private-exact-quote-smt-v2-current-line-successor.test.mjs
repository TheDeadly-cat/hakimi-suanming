import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_RECEIPT_SCHEMA_VERSION,
  BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION,
  baziPrivateExactQuoteSmtV2CurrentLineSuccessorTestOnly,
  isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt,
  isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
  loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
  summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
  verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes
} from "./bazi-private-exact-quote-smt-v2-current-line-successor-lib.mjs";
import {
  buildBaziBindingCitationLocatorLinkRequirements,
  isVerifiedBaziBindingCitationLocatorLinkRequirements,
  loadBaziBindingCitationLocatorLinkRequirements
} from "./bazi-binding-citation-locator-link-requirements-lib.mjs";

const TEST_FILE = fileURLToPath(import.meta.url);
const SCRIPTS_ROOT = path.dirname(TEST_FILE);
const WORKSPACE_ROOT = path.resolve(SCRIPTS_ROOT, "..");
const LIBRARY_PATH = path.join(SCRIPTS_ROOT, "bazi-private-exact-quote-smt-v2-current-line-successor-lib.mjs");
const CLI_PATH = path.join(SCRIPTS_ROOT, "verify-bazi-private-exact-quote-smt-v2-current-line-successor.mjs");
const CLI_OK = "BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_OK";
const CLI_FAILED = "BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_CURRENT_LINE_SUCCESSOR_FAILED";
const t = baziPrivateExactQuoteSmtV2CurrentLineSuccessorTestOnly;

function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  return env;
}

function runCli(args = [], options = {}) {
  return spawnSync(process.execPath, [...args, CLI_PATH, ...(options.operands ?? [])], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: options.env ?? cleanEnv(),
    timeout: 30000
  });
}

function errorHasCode(code) {
  return (error) => error?.code === code;
}

function request(overrides = {}) {
  return {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_request",
    requestId: "req-0123456789abcdef0123456789abcdef",
    topicId: "strength.yueling_exact_quote",
    quoteCandidateId: "smt-v10-yueling-minimal-v1",
    handlingBoundary: {
      bytesProvidedDirectlyByCaller: true,
      sourcePathAccepted: false,
      repositoryReadAllowed: false,
      repositoryStorageAllowed: false,
      materialRedistributionDecision: "not_established",
      quotePublicationDecision: "not_established",
      rightsLegalConclusion: "not_established"
    },
    ...overrides
  };
}

function digestCandidate(candidate) {
  const unsigned = t.snapshotDeclarative(candidate, "candidate");
  delete unsigned.candidateDigest;
  return t.sha256Bytes(Buffer.from(t.canonicalStringify(unsigned), "utf8"));
}

function syntheticFixture(text, start, end) {
  const bytes = Buffer.from(text, "utf8");
  const quoteText = text.slice(start, end);
  const quoteBytes = Buffer.from(quoteText, "utf8");
  let lineStart = 1;
  let lineEnd = 1;
  for (let index = 0; index < start; index += 1) {
    if (text.charCodeAt(index) === 10) lineStart += 1;
  }
  lineEnd = lineStart;
  for (let index = start; index < end; index += 1) {
    if (text.charCodeAt(index) === 10) lineEnd += 1;
  }
  return {
    bytes,
    carrier: {
      rawWikitextCharacters: text.length,
      rawWikitextUtf8Bytes: bytes.length,
      rawWikitextSha256: t.sha256Bytes(bytes)
    },
    quote: {
      rawCharacterStartZeroBased: start,
      rawCharacterEndExclusive: end,
      rawRevisionLineStart: lineStart,
      rawRevisionLineEnd: lineEnd,
      quoteCharacters: quoteText.length,
      quoteUtf8Bytes: quoteBytes.length,
      quoteSha256: t.sha256Bytes(quoteBytes),
      quoteOccurrenceInRawRevision: "unique"
    },
    quoteText
  };
}

async function readPinnedLedger(index) {
  const pin = t.HISTORICAL_PINS[index];
  const bytes = await readFile(path.join(WORKSPACE_ROOT, ...pin.path.split("/")));
  return { pin, bytes, ledger: t.parseStrictJsonBytes(bytes) };
}

test("current-line capability consumes the exact persisted C private brand and remains zero-instance", async () => {
  const currentParent = await loadBaziBindingCitationLocatorLinkRequirements(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(currentParent), true);
  assert.deepEqual(currentParent.artifact, {
    path: "content/system-admission/bazi-binding-citation-locator-link-requirements.v1.0.0.json",
    bytes: 28463,
    sha256: "4316c708a6d5a2a65c8574208ec6e44d182c5886e4559e87ed2a3c0a6963368b"
  });
  assert.equal(currentParent.ledgerDigest, "2fdc1fcafcb28795823b3cac92db707e88df6325c197f08cb6a59a96fa3f9dc4");

  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability), true);
  assert.equal(capability.currentParent.exactPersistedPrivateBrandConsumed, true);
  assert.equal(capability.currentParent.privateBrandTransferred, false);
  assert.equal(capability.mechanicallyVerifiedScope,
    "zero_instance_current_line_capability_and_fail_closed_contract_only");
  assert.equal(capability.successfulReceiptPathExecuted, false);
  assert.equal(capability.receiptBrandAndRedactionSuccessVerified, false);
  assert.deepEqual(capability.scope.conceptualTopics, 3);
  assert.deepEqual(capability.scope.currentBindings, 2);
  assert.deepEqual(capability.scope.quoteRefs, 4);
  assert.equal(capability.privateVerificationApi.currentReceipts, 0);
  assert.equal(capability.privateVerificationApi.status,
    "candidate_unexecuted_against_fixed_real_body");
  assert.equal(capability.privateVerificationApi.fixedRealBodyProvidedToThisChild, false);
  assert.equal(capability.privateVerificationApi.successfulReceiptPathExecuted, false);
  assert.equal(capability.privateVerificationApi.receiptBrandAndRedactionSuccessVerified, false);
  assert.equal(capability.privateVerificationApi.receiptBrandAndRedactionSuccessUnverified, true);
  assert.equal(capability.counts.bindingCitationLocatorLinks, 0);
  assert.equal(capability.counts.bindingsFrozen, 0);
  assert.equal(capability.authorityBoundary.minimalQuoteSufficiencyEstablished, false);
  assert.equal(capability.authorityBoundary.activeAdmissionEffect, "none");
});

test("builders, clones, same-shape objects, and re-digested receipts cannot forge either private brand", async () => {
  const currentParent = await loadBaziBindingCitationLocatorLinkRequirements(WORKSPACE_ROOT);
  const builtParent = await buildBaziBindingCitationLocatorLinkRequirements(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(currentParent), true);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(builtParent), false);
  assert.equal(isVerifiedBaziBindingCitationLocatorLinkRequirements(structuredClone(currentParent)), false);

  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  const clone = structuredClone(capability);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(clone), false);
  clone.authorityBoundary.publicReleaseAuthorized = true;
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(clone), false);

  const fakeReceipt = {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_RECEIPT_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_integrity_receipt",
    receiptId: "hakimi.bazi.private-exact-quote-smt-v2-current-line/fake",
    receiptDigest: t.sha256Bytes(Buffer.from("self-re-digested-shape", "utf8"))
  };
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt(fakeReceipt), false);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt(structuredClone(fakeReceipt)), false);
  assert.throws(() => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
    capability,
    request: request(),
    sourceBodyBytes: Buffer.from("synthetic bytes are not the fixed real body", "utf8")
  }), errorHasCode("SOURCE_BODY_IDENTITY_MISMATCH"));
});

test("all six stale-chain parents are fixed raw+self observations and never current brands", async () => {
  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  assert.equal(capability.historicalObservations.length, 6);
  for (let index = 0; index < capability.historicalObservations.length; index += 1) {
    const observation = capability.historicalObservations[index];
    const { pin, bytes, ledger } = await readPinnedLedger(index);
    assert.equal(bytes.length, pin.rawBytes);
    assert.equal(t.sha256Bytes(bytes), pin.rawSha256);
    assert.equal(ledger[pin.idField], pin.semanticId);
    assert.equal(ledger[pin.selfField], pin.semanticDigest);
    assert.equal(t.computeHistoricalSelf(ledger, pin), pin.semanticDigest);
    assert.equal(observation.brandCurrent, false);
    assert.equal(observation.loaderInvoked, false);
    assert.equal(observation.authorityEffect, "none");
  }
  assert.equal(capability.counts.staleFullLoadersImported, 0);
  assert.equal(capability.counts.staleFullLoadersInvoked, 0);
});

test("source and rights candidate self-digests are independently checked under their different ledger profiles", async () => {
  const source = await readPinnedLedger(0);
  const rights = await readPinnedLedger(1);
  assert.equal(t.computeHistoricalSelf(source.ledger, source.pin), source.pin.semanticDigest);
  assert.equal(t.computeHistoricalSelf(rights.ledger, rights.pin), rights.pin.semanticDigest);
  for (let index = 0; index < source.ledger.candidates.length; index += 1) {
    const candidate = source.ledger.candidates[index];
    assert.equal(digestCandidate(candidate), candidate.candidateDigest);
  }
  for (let index = 0; index < rights.ledger.candidates.length; index += 1) {
    const candidate = rights.ledger.candidates[index];
    assert.equal(digestCandidate(candidate), candidate.candidateDigest);
  }

  const sourceCandidateDigestOnlyDrift = structuredClone(source.ledger);
  sourceCandidateDigestOnlyDrift.candidates[0].candidateDigest = "0".repeat(64);
  assert.equal(t.computeHistoricalSelf(sourceCandidateDigestOnlyDrift, source.pin), source.pin.semanticDigest);
  assert.notEqual(digestCandidate(sourceCandidateDigestOnlyDrift.candidates[0]), "0".repeat(64));

  const rightsCandidateDigestOnlyDrift = structuredClone(rights.ledger);
  rightsCandidateDigestOnlyDrift.candidates[0].candidateDigest = "0".repeat(64);
  assert.notEqual(t.computeHistoricalSelf(rightsCandidateDigestOnlyDrift, rights.pin), rights.pin.semanticDigest);
});

test("PR10A matching is by exact tuple rather than candidate-array position", async () => {
  const source = (await readPinnedLedger(0)).ledger;
  const rights = (await readPinnedLedger(1)).ledger;
  const smt = (await readPinnedLedger(2)).ledger;
  assert.deepEqual(source.candidates.slice(0, 4).map((candidate) => candidate.candidateId), [
    "smt-siku-v10-wikisource-r761703-candidate-v2",
    "dtt-chanwei-wikisource-r2600158-candidate-v2",
    "smt-v5-wikisource-r2706483-candidate-v1",
    "yhzp-wikisource-r2593607-candidate-v1"
  ]);
  const reorderedSource = structuredClone(source);
  const reorderedRights = structuredClone(rights);
  reorderedSource.candidates.reverse();
  reorderedRights.candidates.reverse();
  assert.doesNotThrow(() => t.assertSourceAndRights(reorderedSource, reorderedRights, smt));

  const duplicate = structuredClone(source);
  duplicate.candidates.push(structuredClone(
    source.candidates.find((candidate) => candidate.candidateId === "dtt-chanwei-wikisource-r2600158-candidate-v2")
  ));
  assert.throws(() => t.assertSourceAndRights(duplicate, rights, smt), errorHasCode("CURRENT_PARENT_SEMANTIC_MISMATCH"));

  const omitted = structuredClone(source);
  omitted.candidates = omitted.candidates.filter(
    (candidate) => candidate.candidateId !== "smt-siku-v10-wikisource-r761703-candidate-v2"
  );
  assert.throws(() => t.assertSourceAndRights(omitted, rights, smt), errorHasCode("CURRENT_PARENT_SEMANTIC_MISMATCH"));
});

test("candidate cross-wiring remains rejected even after a coordinated candidate self re-sign", async () => {
  const source = (await readPinnedLedger(0)).ledger;
  const rights = (await readPinnedLedger(1)).ledger;
  const smt = (await readPinnedLedger(2)).ledger;
  const crossedSource = structuredClone(source);
  const dtt = crossedSource.candidates.find(
    (candidate) => candidate.candidateId === "dtt-chanwei-wikisource-r2600158-candidate-v2"
  );
  dtt.bindingId = "binding:smt-v10:whole-chart";
  dtt.candidateDigest = digestCandidate(dtt);
  assert.throws(
    () => t.assertSourceAndRights(crossedSource, rights, smt),
    errorHasCode("CURRENT_SOURCE_CANDIDATE_MISMATCH")
  );

  const crossedRights = structuredClone(rights);
  const dttRights = crossedRights.candidates.find(
    (candidate) => candidate.rightsCandidateId === "dtt-chanwei-wikisource-r2600158-rights-candidate-v2"
  );
  dttRights.sourceCandidateId = "smt-siku-v10-wikisource-r761703-candidate-v2";
  dttRights.candidateDigest = digestCandidate(dttRights);
  assert.throws(
    () => t.assertSourceAndRights(source, crossedRights, smt),
    errorHasCode("CURRENT_RIGHTS_CANDIDATE_MISMATCH")
  );
});

test("the four PR10A refs pin full UTF-16 locators while rights/carrier observations remain link-only", async () => {
  const source = (await readPinnedLedger(0)).ledger;
  const rights = (await readPinnedLedger(1)).ledger;
  let refs = 0;
  for (let topicIndex = 0; topicIndex < t.EXPECTED_TOPIC_MAP.length; topicIndex += 1) {
    const topic = t.EXPECTED_TOPIC_MAP[topicIndex];
    refs += topic.quoteRefs.length;
    for (let refIndex = 0; refIndex < topic.quoteRefs.length; refIndex += 1) {
      const ref = topic.quoteRefs[refIndex];
      const sourceCandidate = source.candidates.find((candidate) => candidate.candidateId === ref.candidateId);
      const quote = sourceCandidate.quoteCandidates.find(
        (candidateQuote) => candidateQuote.quoteCandidateId === ref.quoteCandidateId
      );
      const rightsCandidate = rights.candidates.find(
        (candidate) => candidate.rightsCandidateId === ref.rightsCandidateId
      );
      const lock = t.SOURCE_LOCKS[ref.candidateId].quotes[ref.quoteCandidateId];
      assert.equal(sourceCandidate.bindingId, ref.bindingId);
      assert.equal(sourceCandidate.evidenceSubjectId, ref.evidenceSubjectId);
      assert.equal(sourceCandidate.candidateDigest, ref.candidateDigest);
      assert.deepEqual({
        heading: quote.heading,
        rawRevisionLineStart: quote.rawRevisionLineStart,
        rawRevisionLineEnd: quote.rawRevisionLineEnd,
        rawCharacterStartZeroBased: quote.rawCharacterStartZeroBased,
        rawCharacterEndExclusive: quote.rawCharacterEndExclusive,
        quoteCharacters: quote.quoteCharacters,
        quoteUtf8Bytes: quote.quoteUtf8Bytes,
        quoteSha256: quote.quoteSha256,
        quoteOccurrenceInRawRevision: quote.quoteOccurrenceInRawRevision,
        quoteTextStored: quote.quoteTextStored
      }, {
        heading: lock.heading,
        rawRevisionLineStart: lock.rawRevisionLineStart,
        rawRevisionLineEnd: lock.rawRevisionLineEnd,
        rawCharacterStartZeroBased: lock.rawCharacterStartZeroBased,
        rawCharacterEndExclusive: lock.rawCharacterEndExclusive,
        quoteCharacters: lock.quoteCharacters,
        quoteUtf8Bytes: lock.quoteUtf8Bytes,
        quoteSha256: lock.quoteSha256,
        quoteOccurrenceInRawRevision: lock.quoteOccurrenceInRawRevision,
        quoteTextStored: false
      });
      assert.equal(rightsCandidate.candidateDigest, ref.rightsCandidateDigest);
      assert.equal(rightsCandidate.transcriptionLayer.rawWikitextSha256,
        sourceCandidate.carrierIdentity.rawWikitextSha256);
      assert.equal(rightsCandidate.decision.distributionPolicy, "link_only");
      assert.equal(rightsCandidate.decision.legalConclusion, "not_established");
    }
  }
  assert.equal(refs, 4);
  assert.equal(t.SOURCE_LOCKS["smt-siku-v10-wikisource-r761703-candidate-v2"]
    .quotes["smt-v10-yueling-minimal-v1"].rawRevisionLineStart, 10);
  assert.equal(t.SOURCE_LOCKS["smt-siku-v10-wikisource-r761703-candidate-v2"]
    .quotes["smt-v10-tougan-minimal-v1"].rawRevisionLineStart, 10);
});

test("facsimile anchors match rights carrier observations without becoming carrier or legal authority", async () => {
  const source = (await readPinnedLedger(0)).ledger;
  const rights = (await readPinnedLedger(1)).ledger;
  for (const candidateId of [
    "dtt-chanwei-wikisource-r2600158-candidate-v2",
    "smt-siku-v10-wikisource-r761703-candidate-v2"
  ]) {
    const sourceCandidate = source.candidates.find((candidate) => candidate.candidateId === candidateId);
    const rightsCandidate = rights.candidates.find(
      (candidate) => candidate.sourceCandidateId === candidateId
    );
    for (let index = 0; index < sourceCandidate.facsimileAnchors.length; index += 1) {
      const anchor = sourceCandidate.facsimileAnchors[index];
      const matches = rightsCandidate.carrierLayers.filter((carrier) => carrier.anchorId === anchor.anchorId);
      assert.equal(matches.length, 1);
      assert.equal(matches[0].carrierSha256, anchor.carrierSha256);
      assert.equal(matches[0].status, "notice_observed_not_cleared");
      assert.equal(anchor.repositoryCarrierFileStored, false);
      assert.equal(anchor.storagePolicy, "link_only");
    }
  }
});

test("the fixed byte gate behind held-handle reads rejects raw drift", async () => {
  const { pin, bytes } = await readPinnedLedger(0);
  const drifted = Buffer.concat([bytes, Buffer.from("\n", "utf8")]);
  assert.throws(
    () => t.validateHistoricalArtifactBytes(drifted, pin),
    errorHasCode("HISTORICAL_RAW_IDENTITY_MISMATCH")
  );
});

test("the fixed byte gate behind held-handle reads rejects coordinated self re-sealing", async () => {
  const { pin: sourcePin, ledger } = await readPinnedLedger(0);
  const resealed = structuredClone(ledger);
  resealed.status = "coordinated_self_reseal_attempt";
  resealed.ledgerDigest = t.computeHistoricalSelf(resealed, sourcePin);
  const bytes = Buffer.from(JSON.stringify(resealed), "utf8");
  const pin = {
    ...sourcePin,
    rawBytes: bytes.length,
    rawSha256: t.sha256Bytes(bytes)
  };
  assert.throws(
    () => t.validateHistoricalArtifactBytes(bytes, pin),
    errorHasCode("HISTORICAL_SELF_DIGEST_MISMATCH")
  );
});

test("explicit-byte capture accepts exact Buffer/Uint8Array values and copies away caller aliasing", () => {
  const originalBuffer = Buffer.from("private bytes", "utf8");
  const bufferCopy = t.captureExplicitBytes(originalBuffer);
  const originalFirst = bufferCopy[0];
  originalBuffer[0] ^= 0xff;
  assert.equal(bufferCopy[0], originalFirst);
  assert.notEqual(bufferCopy.buffer, originalBuffer.buffer);

  const originalUint8 = new Uint8Array([1, 2, 3, 4]);
  const uint8Copy = t.captureExplicitBytes(originalUint8);
  originalUint8[0] = 99;
  assert.deepEqual([...uint8Copy], [1, 2, 3, 4]);
  assert.notEqual(uint8Copy.buffer, originalUint8.buffer);
});

test("explicit-byte capture rejects paths, objects, views, subclasses, proxies, SAB, empty, and oversize values", () => {
  class Uint8Subclass extends Uint8Array {}
  const cases = [
    "C:\\private\\source.txt",
    "private body text",
    { bytes: [1, 2, 3] },
    new ArrayBuffer(4),
    new DataView(new ArrayBuffer(4)),
    new Uint8Subclass([1, 2, 3]),
    new Proxy(Buffer.from([1, 2, 3]), {}),
    Buffer.alloc(0),
    Buffer.alloc(2 * 1024 * 1024 + 1)
  ];
  if (typeof SharedArrayBuffer === "function") {
    cases.push(new Uint8Array(new SharedArrayBuffer(4)));
  }
  for (let index = 0; index < cases.length; index += 1) {
    assert.throws(() => t.captureExplicitBytes(cases[index]), (error) =>
      error?.code === "EXPLICIT_BYTES_REQUIRED" || error?.code === "EXPLICIT_BYTES_ALIAS_REJECTED");
  }
});

test("verification kernel uses UTF-16 character offsets, line coordinates, hashes, and overlapping occurrence identity", () => {
  const fixture = syntheticFixture("α😀\naba\nz", 1, 7);
  const result = t.verifyExternalBytesKernel(fixture.bytes, fixture.carrier, fixture.quote);
  assert.equal(result.sourceBodyUtf16CodeUnits, 9);
  assert.equal(result.rawCharacterStartZeroBased, 1);
  assert.equal(result.rawCharacterEndExclusive, 7);
  assert.equal(result.rawRevisionLineStart, 1);
  assert.equal(result.rawRevisionLineEnd, 2);
  assert.equal(result.quoteUtf16CodeUnits, 6);
  assert.equal(result.quoteUtf8Bytes, 8);
  assert.equal(result.overlappingOccurrenceCount, 1);
  assert.equal(result.uniqueIncludingOverlapsVerified, true);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(fixture.quoteText), false);
  assert.equal(serialized.includes("sourcePath"), false);
  assert.equal(Object.hasOwn(result, "sourcePath"), false);
  assert.equal(Object.hasOwn(result, "quoteText"), false);
  assert.equal(result.quoteTextStoredInResult, false);
});

test("verification kernel rejects wrong source size/hash, quote locator/hash, and line coordinates", () => {
  const fixture = syntheticFixture("α😀\naba\nz", 1, 7);
  assert.throws(() => t.verifyExternalBytesKernel(fixture.bytes, {
    ...fixture.carrier,
    rawWikitextUtf8Bytes: fixture.carrier.rawWikitextUtf8Bytes + 1
  }, fixture.quote), errorHasCode("SOURCE_BODY_IDENTITY_MISMATCH"));
  assert.throws(() => t.verifyExternalBytesKernel(fixture.bytes, {
    ...fixture.carrier,
    rawWikitextSha256: "0".repeat(64)
  }, fixture.quote), errorHasCode("SOURCE_BODY_IDENTITY_MISMATCH"));
  assert.throws(() => t.verifyExternalBytesKernel(fixture.bytes, fixture.carrier, {
    ...fixture.quote,
    rawCharacterStartZeroBased: 2
  }), errorHasCode("QUOTE_HASH_MISMATCH"));
  assert.throws(() => t.verifyExternalBytesKernel(fixture.bytes, fixture.carrier, {
    ...fixture.quote,
    quoteSha256: "0".repeat(64)
  }), errorHasCode("QUOTE_HASH_MISMATCH"));
  assert.throws(() => t.verifyExternalBytesKernel(fixture.bytes, fixture.carrier, {
    ...fixture.quote,
    rawRevisionLineStart: 2
  }), errorHasCode("QUOTE_LINE_MISMATCH"));
});

test("verification kernel rejects BOM, invalid UTF-8, and overlapping quote duplicates", () => {
  const bom = Buffer.from([0xef, 0xbb, 0xbf, 0x61]);
  assert.throws(() => t.verifyExternalBytesKernel(bom, {
    rawWikitextCharacters: 1,
    rawWikitextUtf8Bytes: bom.length,
    rawWikitextSha256: t.sha256Bytes(bom)
  }, {
    rawCharacterStartZeroBased: 0,
    rawCharacterEndExclusive: 1,
    rawRevisionLineStart: 1,
    rawRevisionLineEnd: 1,
    quoteCharacters: 1,
    quoteUtf8Bytes: 1,
    quoteSha256: t.sha256Bytes(Buffer.from("a")),
    quoteOccurrenceInRawRevision: "unique"
  }), errorHasCode("SOURCE_BODY_UTF8_INVALID"));

  const invalid = Buffer.from([0xc3, 0x28]);
  assert.throws(() => t.verifyExternalBytesKernel(invalid, {
    rawWikitextCharacters: 2,
    rawWikitextUtf8Bytes: invalid.length,
    rawWikitextSha256: t.sha256Bytes(invalid)
  }, {
    rawCharacterStartZeroBased: 0,
    rawCharacterEndExclusive: 1,
    rawRevisionLineStart: 1,
    rawRevisionLineEnd: 1,
    quoteCharacters: 1,
    quoteUtf8Bytes: 1,
    quoteSha256: "0".repeat(64),
    quoteOccurrenceInRawRevision: "unique"
  }), errorHasCode("SOURCE_BODY_UTF8_INVALID"));

  const overlap = syntheticFixture("ababa", 0, 3);
  assert.throws(
    () => t.verifyExternalBytesKernel(overlap.bytes, overlap.carrier, overlap.quote),
    errorHasCode("QUOTE_OVERLAP_IDENTITY_MISMATCH")
  );
});

test("public verification accepts no path operand and does not invoke accessors or proxy traps", async () => {
  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  const base = { capability, request: request(), sourceBodyBytes: Buffer.from("not the pinned body") };
  assert.throws(() => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
    ...base,
    sourcePath: "C:\\private\\source.txt"
  }), errorHasCode("INVALID_SCHEMA"));

  let getterCalls = 0;
  const accessorInput = { capability, request: request() };
  Object.defineProperty(accessorInput, "sourceBodyBytes", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return Buffer.from("private");
    }
  });
  assert.throws(
    () => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes(accessorInput),
    errorHasCode("UNSAFE_DECLARATIVE_INPUT")
  );
  assert.equal(getterCalls, 0);

  let proxyCalls = 0;
  const proxied = new Proxy(base, {
    ownKeys() {
      proxyCalls += 1;
      return [];
    }
  });
  assert.throws(
    () => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes(proxied),
    errorHasCode("UNSAFE_DECLARATIVE_INPUT")
  );
  assert.equal(proxyCalls, 0);
});

test("public verification rejects cyclic/aliased declarative requests and unbranded authority promotion", async () => {
  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  const boundary = request().handlingBoundary;
  const aliased = request({ handlingBoundary: boundary, extraAlias: boundary });
  assert.throws(() => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
    capability,
    request: aliased,
    sourceBodyBytes: Buffer.from("x")
  }), errorHasCode("UNSAFE_DECLARATIVE_INPUT"));

  const cyclic = request();
  cyclic.handlingBoundary.cycle = cyclic;
  assert.throws(() => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
    capability,
    request: cyclic,
    sourceBodyBytes: Buffer.from("x")
  }), errorHasCode("UNSAFE_DECLARATIVE_INPUT"));

  const promoted = structuredClone(capability);
  promoted.authorityBoundary.publicReleaseAuthorized = true;
  assert.throws(() => verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
    capability: promoted,
    request: request(),
    sourceBodyBytes: Buffer.from("x")
  }), errorHasCode("CAPABILITY_PRIVATE_BRAND_REQUIRED"));
  assert.throws(
    () => summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(promoted),
    errorHasCode("CAPABILITY_PRIVATE_BRAND_REQUIRED")
  );
});

test("strict historical JSON parsing rejects literal/escaped duplicate keys, trailing data, BOM, and invalid UTF-8", () => {
  assert.throws(
    () => t.parseStrictJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    errorHasCode("STRICT_JSON_DUPLICATE_KEY")
  );
  assert.throws(
    () => t.parseStrictJsonBytes(Buffer.from('{"a":1,"\\u0061":2}', "utf8")),
    errorHasCode("STRICT_JSON_DUPLICATE_KEY")
  );
  assert.throws(
    () => t.parseStrictJsonBytes(Buffer.from('{"a":1} trailing', "utf8")),
    errorHasCode("STRICT_JSON_INVALID")
  );
  assert.throws(
    () => t.parseStrictJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    errorHasCode("STRICT_JSON_INVALID")
  );
  assert.throws(
    () => t.parseStrictJsonBytes(Buffer.from([0x7b, 0x22, 0xc3, 0x28, 0x22, 0x3a, 0x31, 0x7d])),
    errorHasCode("STRICT_JSON_INVALID")
  );
});

test("post-import Array iterator pollution makes the transitive persisted loader fail closed, never falsely green", async () => {
  const original = Object.getOwnPropertyDescriptor(Array.prototype, Symbol.iterator);
  let result;
  let caught;
  Object.defineProperty(Array.prototype, Symbol.iterator, {
    configurable: true,
    enumerable: false,
    writable: true,
    value() {
      throw new Error("poisoned Array iterator");
    }
  });
  try {
    result = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  } catch (error) {
    caught = error;
  } finally {
    Object.defineProperty(Array.prototype, Symbol.iterator, original);
  }
  assert.equal(caught?.code, "CURRENT_PARENT_LOAD_FAILED");
  assert.equal(result, undefined);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(result), false);
  const recovered = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(recovered), true);
});

test("captured intrinsics resist post-import prototype poisoning and WeakSet.has promotion", async () => {
  const preloadedCapability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  const synthetic = syntheticFixture("α😀\naba\nz", 1, 7);
  const pinnedSource = await readPinnedLedger(0);
  const originals = {
    freeze: Object.freeze,
    weakHas: WeakSet.prototype.has,
    arrayMap: Array.prototype.map,
    charCodeAt: String.prototype.charCodeAt,
    split: String.prototype.split,
    startsWith: String.prototype.startsWith,
    regexpTest: RegExp.prototype.test,
    promiseAll: Promise.all
  };
  const poison = () => {
    throw new Error("poisoned intrinsic");
  };
  let summary;
  let kernelResult;
  let heldObservation;
  let caught;
  let forgedBrand;
  let invalidRequestError;
  Object.freeze = poison;
  WeakSet.prototype.has = () => true;
  Array.prototype.map = poison;
  String.prototype.charCodeAt = poison;
  String.prototype.split = poison;
  String.prototype.startsWith = poison;
  RegExp.prototype.test = () => true;
  Promise.all = poison;
  try {
    summary = summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(preloadedCapability);
    kernelResult = t.verifyExternalBytesKernel(synthetic.bytes, synthetic.carrier, synthetic.quote);
    heldObservation = t.validateHistoricalArtifactBytes(pinnedSource.bytes, pinnedSource.pin);
    forgedBrand = isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor({});
    try {
      verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
        capability: preloadedCapability,
        request: request({ requestId: "not-valid" }),
        sourceBodyBytes: Buffer.from("x")
      });
    } catch (error) {
      invalidRequestError = error;
    }
  } catch (error) {
    caught = error;
  } finally {
    Object.freeze = originals.freeze;
    WeakSet.prototype.has = originals.weakHas;
    Array.prototype.map = originals.arrayMap;
    String.prototype.charCodeAt = originals.charCodeAt;
    String.prototype.split = originals.split;
    String.prototype.startsWith = originals.startsWith;
    RegExp.prototype.test = originals.regexpTest;
    Promise.all = originals.promiseAll;
  }
  assert.equal(caught, undefined);
  assert.equal(isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(preloadedCapability), true);
  assert.equal(forgedBrand, false);
  assert.equal(invalidRequestError?.code, "INVALID_REQUEST");
  assert.equal(summary.currentReceipts, 0);
  assert.equal(kernelResult.uniqueIncludingOverlapsVerified, true);
  assert.equal(heldObservation.identity.sha256, t.HISTORICAL_PINS[0].rawSha256);
  assert.equal(Object.isFrozen(preloadedCapability), true);
});

test("library source imports only the current C child and contains no stale full-loader import or call", async () => {
  const source = await readFile(LIBRARY_PATH, "utf8");
  const forbidden = [
    "bazi-source-binding-candidate-lib.mjs",
    "bazi-source-rights-candidate-lib.mjs",
    "bazi-smt-v10-versioned-parent-supersession-lib.mjs",
    "bazi-source-carrier-record-readiness-lib.mjs",
    "bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs",
    "bazi-project-copy-materialization-lib.mjs",
    "bazi-project-copy-materialization-version-aware-candidate-lib.mjs",
    "bazi-pr10bc-scope-reconciliation-lib.mjs",
    "bazi-pr10bc-version-aware-candidate-lib.mjs",
    "loadBaziSourceBindingCandidate",
    "loadBaziSourceRightsCandidate",
    "loadBaziSmtV10VersionedParentSupersession"
  ];
  for (let index = 0; index < forbidden.length; index += 1) {
    assert.equal(source.includes(forbidden[index]), false, forbidden[index]);
  }
  assert.equal(source.includes('from "./bazi-binding-citation-locator-link-requirements-lib.mjs"'), true);
  const verifierSource = source.slice(
    source.indexOf("export function verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes"),
    source.indexOf("export function isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt")
  );
  assert.equal(verifierSource.includes("FS_READ_FILE"), false);
  assert.equal(verifierSource.includes("FS_OPEN"), false);
  assert.equal(verifierSource.includes("workspaceRoot"), false);
  assert.equal(source.includes("const VERIFIED_RECEIPTS = new NATIVE_WEAK_SET()"), true);
  assert.equal(source.includes("WEAK_SET_ADD, VERIFIED_RECEIPTS"), true);
  const testOnlyExports = source.slice(source.indexOf(
    "export const baziPrivateExactQuoteSmtV2CurrentLineSuccessorTestOnly"
  ));
  assert.equal(testOnlyExports.includes("readHeldPinnedArtifact"), false);
  assert.equal(testOnlyExports.includes("VERIFIED_RECEIPTS"), false);
});

test("zero-instance summary keeps rights, carrier, materialization, authority, epoch, atomicity, and ABA gates closed", async () => {
  const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(WORKSPACE_ROOT);
  const summary = summarizeBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(capability);
  assert.equal(summary.mechanicallyVerifiedScope,
    "zero_instance_current_line_capability_and_fail_closed_contract_only");
  assert.equal(summary.privateVerificationApiStatus,
    "candidate_unexecuted_against_fixed_real_body");
  assert.equal(summary.fixedRealBodyProvidedToThisChild, false);
  assert.equal(summary.successfulReceiptPathExecuted, false);
  assert.equal(summary.receiptBrandAndRedactionSuccessVerified, false);
  assert.equal(summary.receiptBrandAndRedactionSuccessUnverified, true);
  assert.deepEqual({
    currentReceipts: summary.currentReceipts,
    formalKnowledgeDocuments: summary.formalKnowledgeDocuments,
    formalSourceRightsRecords: summary.formalSourceRightsRecords,
    formalSourceCarrierRecords: summary.formalSourceCarrierRecords,
    projectCopyMaterializationRecords: summary.projectCopyMaterializationRecords,
    materializationsVerified: summary.materializationsVerified,
    bindingCitationLocatorLinks: summary.bindingCitationLocatorLinks,
    bindingsFrozen: summary.bindingsFrozen
  }, {
    currentReceipts: 0,
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    materializationsVerified: 0,
    bindingCitationLocatorLinks: 0,
    bindingsFrozen: 0
  });
  assert.equal(summary.lawfulMaterialAccessEstablished, false);
  assert.equal(summary.minimalQuoteSufficiencyEstablished, false);
  assert.equal(summary.sourceIdentityAdjudicated, false);
  assert.equal(summary.workEditionCarrierRightsCleared, false);
  assert.equal(summary.contentTruthEstablished, false);
  assert.equal(summary.expertTruthEstablished, false);
  assert.equal(summary.rightsLegalConclusionEstablished, false);
  assert.equal(summary.activeAdmissionEffect, "none");
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.equal(summary.publicReleaseAuthorized, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.mutationEpochAvailable, false);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(summary.abaExcluded, false);
});

test("CLI emits only the zero-instance current-line capability summary", () => {
  const result = runCli();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout.startsWith(`${CLI_OK} `), true);
  const payload = JSON.parse(result.stdout.slice(CLI_OK.length + 1));
  assert.equal(payload.currentLineCapabilityMechanicallyVerified, true);
  assert.equal(payload.mechanicallyVerifiedScope,
    "zero_instance_current_line_capability_and_fail_closed_contract_only");
  assert.equal(payload.privateVerificationApiStatus,
    "candidate_unexecuted_against_fixed_real_body");
  assert.equal(payload.successfulReceiptPathExecuted, false);
  assert.equal(payload.receiptBrandAndRedactionSuccessVerified, false);
  assert.equal(payload.receiptBrandAndRedactionSuccessUnverified, true);
  assert.equal(payload.conceptualTopics, 3);
  assert.equal(payload.currentBindings, 2);
  assert.equal(payload.quoteRefs, 4);
  assert.equal(payload.currentReceipts, 0);
  assert.equal(payload.activeAdmissionEffect, "none");
  assert.equal(payload.releaseReady, false);
  assert.equal(result.stdout.includes("sourcePath"), false);
  assert.equal(result.stdout.includes("privateRoot"), false);
  assert.equal(result.stdout.includes("quoteText"), false);
});

test("CLI rejects every path/body/stdin operand with one fixed non-leaking error", () => {
  const operands = [
    "artifact.json",
    "{}",
    "--path=C:\\private\\source.txt",
    "--body=private-material",
    "-"
  ];
  for (let index = 0; index < operands.length; index += 1) {
    const result = runCli([], { operands: [operands[index]] });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `${CLI_FAILED} CLI_ARGUMENTS_FORBIDDEN\n`);
    assert.equal(result.stderr.includes(operands[index]), false);
  }
});

test("CLI rejects visible NODE_OPTIONS and command-line preloads even when a preload poisons RegExp.test", async (context) => {
  const env = cleanEnv();
  env.NODE_OPTIONS = "--no-warnings";
  const nodeOptions = runCli([], { env });
  assert.equal(nodeOptions.status, 1);
  assert.equal(nodeOptions.stdout, "");
  assert.equal(nodeOptions.stderr, `${CLI_FAILED} VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n`);

  const preload = runCli(["--require", "node:path"]);
  assert.equal(preload.status, 1);
  assert.equal(preload.stdout, "");
  assert.equal(preload.stderr, `${CLI_FAILED} VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n`);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-pr10a-cli-preload-"));
  context.after(async () => rm(tempRoot, { recursive: true, force: true }));
  const poisonPath = path.join(tempRoot, "poison.cjs");
  await writeFile(poisonPath, "RegExp.prototype.test = () => false;\n", "utf8");
  const poisonedPreload = runCli([`--require=${poisonPath}`]);
  assert.equal(poisonedPreload.status, 1);
  assert.equal(poisonedPreload.stdout, "");
  assert.equal(poisonedPreload.stderr, `${CLI_FAILED} VISIBLE_NODE_LOADER_OPTIONS_FORBIDDEN\n`);
});

test("importing the CLI is side-effect free", () => {
  const code = `await import(${JSON.stringify(pathToFileURL(CLI_PATH).href)}); process.stdout.write("IMPORTED_ONLY\\n");`;
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", code], {
    cwd: WORKSPACE_ROOT,
    encoding: "utf8",
    env: cleanEnv(),
    timeout: 30000
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(result.stdout, "IMPORTED_ONLY\n");
});
