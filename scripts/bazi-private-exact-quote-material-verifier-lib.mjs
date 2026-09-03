import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";
import {
  canonicalJson,
  verifyBaziSourceBindingCandidateLedger
} from "./bazi-source-binding-candidate-lib.mjs";
import { verifyBaziSourceRightsCandidateLedger } from "./bazi-source-rights-candidate-lib.mjs";
import {
  readBaziBindingFreezeRequirements,
  verifyBaziBindingFreezeRequirements
} from "./bazi-binding-freeze-requirements-lib.mjs";

const SOURCE_LEDGER_RELATIVE_PATH = "content/bazi-strength-source-binding-candidates.v1.json";
const RIGHTS_LEDGER_RELATIVE_PATH = "content/bazi-strength-source-rights-candidates.v1.json";
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_SOURCE_BODY_BYTES = 2 * 1024 * 1024;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const REQUEST_ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;

export const BAZI_PRIVATE_EXACT_QUOTE_REQUEST_SCHEMA_VERSION = "1.0.0";
export const BAZI_PRIVATE_EXACT_QUOTE_RECEIPT_SCHEMA_VERSION = "1.0.0";

export const FIRST_THREE_EXACT_QUOTE_TOPIC_MAP = Object.freeze([
  Object.freeze({
    topicId: "strength.yueling_exact_quote",
    currentBindingIds: Object.freeze([
      "binding:dtt:month-command",
      "binding:smt-v10:whole-chart"
    ]),
    mappingState: "mapped_to_existing_bindings_as_research_candidates",
    quoteRefs: Object.freeze([
      Object.freeze({
        candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-yueling-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1"
      }),
      Object.freeze({
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1"
      })
    ])
  }),
  Object.freeze({
    topicId: "strength.rooting_exact_quote",
    currentBindingIds: Object.freeze(["binding:dtt:month-command"]),
    mappingState: "candidate_quote_located_no_dedicated_current_binding",
    quoteRefs: Object.freeze([
      Object.freeze({
        candidateId: "dtt-chanwei-wikisource-r2600158-candidate-v1",
        bindingId: "binding:dtt:month-command",
        evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
        quoteCandidateId: "dtt-rooting-minimal-v1",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v1"
      })
    ])
  }),
  Object.freeze({
    topicId: "strength.tougan_exact_quote",
    currentBindingIds: Object.freeze(["binding:smt-v10:whole-chart"]),
    mappingState: "candidate_quote_located_no_dedicated_current_binding",
    quoteRefs: Object.freeze([
      Object.freeze({
        candidateId: "smt-siku-v10-wikisource-r761703-candidate-v1",
        bindingId: "binding:smt-v10:whole-chart",
        evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v1"
      })
    ])
  })
]);

const REQUEST_KEYS = Object.freeze([
  "schemaVersion",
  "recordType",
  "requestId",
  "topicId",
  "quoteCandidateId",
  "sourceBodyRelativePath",
  "handlingBoundary"
]);

const HANDLING_BOUNDARY_KEYS = Object.freeze([
  "privateRootOutsideWorkspaceRequired",
  "repositoryStorageAllowed",
  "materialRedistributionDecision",
  "quotePublicationDecision",
  "rightsLegalConclusion"
]);

const DOES_NOT_ESTABLISH = Object.freeze([
  "lawful_material_access",
  "edition_identity",
  "carrier_identity_for_freeze",
  "minimal_quote_sufficiency",
  "independent_human_collation",
  "cross_file_atomic_snapshot",
  "mutation_epoch",
  "interval_mutation_or_aba_exclusion",
  "content_truth",
  "expert_truth",
  "rights_legal_conclusion",
  "binding_freeze",
  "release_readiness",
  "public_release_authorization"
]);

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  Object.defineProperties(error, {
    code: { value: code, enumerable: false, writable: false, configurable: false },
    safeForCli: { value: true, enumerable: false, writable: false, configurable: false }
  });
  throw error;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function assertExactKeys(value, expectedKeys, label) {
  if (!isRecord(value)) fail("INVALID_DECLARATIVE_SHAPE", `${label} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("INVALID_DECLARATIVE_SHAPE", `${label} keys must match the exact schema`);
  }
}

function snapshotDeclarativeOwnData(
  input,
  label,
  pathLabel = label,
  depth = 0,
  ancestors = new WeakSet(),
  budget = { nodes: 0, text: 0 }
) {
  if (depth > 32) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the maximum depth`);
  budget.nodes += 1;
  if (budget.nodes > 10_000) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the value-node budget`);
  if (typeof input === "string") {
    budget.text += input.length;
    if (budget.text > 2_000_000) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the text budget`);
    return input;
  }
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) fail("UNSAFE_DECLARATIVE_INPUT", `${label} contains a non-finite number`);
    return input;
  }
  if (typeof input !== "object") {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} must contain only declarative JSON data`);
  }
  if (utilTypes.isProxy(input)) fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot be a Proxy`);
  if (Object.getOwnPropertySymbols(input).length > 0) {
    fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain Symbol properties`);
  }
  if (ancestors.has(input)) fail("UNSAFE_DECLARATIVE_INPUT", `${label} cannot contain a cycle`);

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} must use the ordinary Array prototype`);
      }
      const lengthDescriptor = Object.getOwnPropertyDescriptor(input, "length");
      if (!lengthDescriptor || !("value" in lengthDescriptor) || !Number.isSafeInteger(lengthDescriptor.value)) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} array length must be an own data property`);
      }
      const length = lengthDescriptor.value;
      if (Object.getOwnPropertyNames(input).length !== length + 1) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} arrays must be dense and cannot contain custom properties`);
      }
      const output = new Array(length);
      for (let index = 0; index < length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          fail("UNSAFE_DECLARATIVE_INPUT", `${label} array items must be enumerable own data properties`);
        }
        output[index] = snapshotDeclarativeOwnData(
          descriptor.value,
          label,
          `${pathLabel}[${index}]`,
          depth + 1,
          ancestors,
          budget
        );
      }
      return output;
    }

    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) {
      fail("UNSAFE_DECLARATIVE_INPUT", `${label} must use an ordinary object prototype`);
    }
    const output = Object.create(null);
    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("UNSAFE_DECLARATIVE_INPUT", `${label} properties must be enumerable own data properties`);
      }
      budget.text += key.length;
      if (budget.text > 2_000_000) fail("UNSAFE_DECLARATIVE_INPUT", `${label} exceeds the text budget`);
      output[key] = snapshotDeclarativeOwnData(
        descriptor.value,
        label,
        `${pathLabel}.${key}`,
        depth + 1,
        ancestors,
        budget
      );
    }
    return output;
  } finally {
    ancestors.delete(input);
  }
}

function deepFreezeDeclarativeValue(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) deepFreezeDeclarativeValue(descriptor.value, seen);
  }
  return Object.freeze(value);
}

function walkAst(root, visitor) {
  const stack = [root];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const node = stack.pop();
    if (node === null || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visitor(node);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
      } else if (value !== null && typeof value === "object") {
        stack.push(value);
      }
    }
  }
}

function decodeStrictUtf8(bytes, label) {
  if (!(bytes instanceof Uint8Array)) fail("INVALID_BYTES", "input must be a Uint8Array");
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", "input must not contain a UTF-8 BOM");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("INVALID_UTF8", "input is not valid UTF-8");
  }
}

export function parseDuplicateFreeJsonBytes(bytes, label = "request") {
  const source = decodeStrictUtf8(bytes, label);
  if (!source.trim()) fail("INVALID_JSON", "JSON input is empty");
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      sourceFilename: "declarative-input.json",
      sourceType: "script",
      errorRecovery: false,
      attachComment: false
    });
  } catch {
    fail("INVALID_JSON", "JSON input cannot be inspected as strict JSON");
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty" || property.computed || property.key?.type !== "StringLiteral") {
        fail("INVALID_JSON", "JSON input contains a non-JSON object property");
      }
      if (keys.has(property.key.value)) {
        fail("DUPLICATE_JSON_KEY", "JSON input contains a duplicate object key");
      }
      keys.add(property.key.value);
    }
  });
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    fail("INVALID_JSON", "JSON input is not valid JSON");
  }
  return snapshotDeclarativeOwnData(value, "parsed JSON");
}

function validatePrivateRelativePath(value, label) {
  if (typeof value !== "string" || !value || value.length > 240
    || value.includes("\\") || value.includes("\0") || value.includes(":")) {
    fail("INVALID_PRIVATE_PATH", `${label} must be a short forward-slash relative path`);
  }
  if (path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || /^[a-zA-Z]:/u.test(value)) {
    fail("INVALID_PRIVATE_PATH", `${label} must not be absolute`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    fail("INVALID_PRIVATE_PATH", `${label} must not contain empty, dot, or parent segments`);
  }
  if (path.posix.normalize(value) !== value) fail("INVALID_PRIVATE_PATH", `${label} must be normalized`);
  return value;
}

export function validatePrivateExactQuoteRequest(input) {
  const request = snapshotDeclarativeOwnData(input, "private exact-quote request");
  assertExactKeys(request, REQUEST_KEYS, "request");
  assertExactKeys(request.handlingBoundary, HANDLING_BOUNDARY_KEYS, "request.handlingBoundary");
  if (request.schemaVersion !== BAZI_PRIVATE_EXACT_QUOTE_REQUEST_SCHEMA_VERSION
    || request.recordType !== "bazi_private_exact_quote_material_verification_request") {
    fail("INVALID_REQUEST_IDENTITY", "request schemaVersion or recordType is not supported");
  }
  if (typeof request.requestId !== "string" || !REQUEST_ID_PATTERN.test(request.requestId)) {
    fail("INVALID_REQUEST_IDENTITY", "requestId must be a non-sensitive stable ASCII identifier");
  }
  const topic = FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.find((entry) => entry.topicId === request.topicId);
  if (!topic || !topic.quoteRefs.some((entry) => entry.quoteCandidateId === request.quoteCandidateId)) {
    fail("QUOTE_OUTSIDE_FIRST_THREE_SCOPE", "topicId and quoteCandidateId are not an exact first-three mapping");
  }
  validatePrivateRelativePath(request.sourceBodyRelativePath, "request.sourceBodyRelativePath");
  const boundary = request.handlingBoundary;
  if (boundary.privateRootOutsideWorkspaceRequired !== true
    || boundary.repositoryStorageAllowed !== false
    || boundary.materialRedistributionDecision !== "not_established"
    || boundary.quotePublicationDecision !== "not_established"
    || boundary.rightsLegalConclusion !== "not_established") {
    fail("HANDLING_BOUNDARY_PROMOTION_FORBIDDEN", "request must keep private material and all rights decisions fail-closed");
  }
  return request;
}

function expectedTopicProjection() {
  return FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.map((topic) => ({
    topicId: topic.topicId,
    currentBindingIds: [...topic.currentBindingIds],
    mappingState: topic.mappingState
  }));
}

export function assertExactFirstThreeTopicMap(sourceLedger) {
  verifyBaziSourceBindingCandidateLedger(sourceLedger);
  const actualProjection = sourceLedger.conceptualTopicMapping.map((topic) => ({
    topicId: topic.topicId,
    currentBindingIds: topic.currentBindingIds,
    mappingState: topic.mappingState
  }));
  if (canonicalJson(actualProjection) !== canonicalJson(expectedTopicProjection())) {
    fail("FIRST_THREE_TOPIC_MAP_DRIFT", "the current three-topic to two-binding map has drifted");
  }
  const expectedQuoteRefs = FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.flatMap((topic) =>
    topic.quoteRefs.map((quoteRef) => ({ ...quoteRef, topicId: topic.topicId }))
  );
  const observed = [];
  for (const candidate of sourceLedger.candidates) {
    for (const quote of candidate.quoteCandidates) {
      for (const topicId of quote.conceptualTopics) {
        if (!FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.some((topic) => topic.topicId === topicId)) continue;
        observed.push({
          candidateId: candidate.candidateId,
          bindingId: candidate.bindingId,
          evidenceSubjectId: candidate.evidenceSubjectId,
          quoteCandidateId: quote.quoteCandidateId,
          rightsCandidateId: expectedQuoteRefs.find((entry) => entry.quoteCandidateId === quote.quoteCandidateId)?.rightsCandidateId,
          topicId
        });
      }
    }
  }
  const sortQuoteRefs = (entries) => [...entries].sort((left, right) =>
    `${left.topicId}\u0000${left.quoteCandidateId}`.localeCompare(`${right.topicId}\u0000${right.quoteCandidateId}`)
  );
  if (canonicalJson(sortQuoteRefs(observed)) !== canonicalJson(sortQuoteRefs(expectedQuoteRefs))) {
    fail("FIRST_THREE_QUOTE_MAP_DRIFT", "the first-three scope must remain exactly 3 topics, 2 bindings and 4 quote candidates");
  }
  const bindingIds = new Set(sourceLedger.candidates.map((candidate) => candidate.bindingId));
  if (FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.some((topic) => bindingIds.has(topic.topicId))) {
    fail("PARALLEL_TOPIC_BINDING_FORBIDDEN", "an audit topic cannot be promoted into a parallel binding ID");
  }
  return Object.freeze({
    topics: FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.length,
    currentBindings: new Set(expectedQuoteRefs.map((entry) => entry.bindingId)).size,
    quoteCandidates: expectedQuoteRefs.length
  });
}

function resolveQuoteContext(sourceLedger, rightsLedger, freezeLedger, request) {
  assertExactFirstThreeTopicMap(sourceLedger);
  verifyBaziSourceRightsCandidateLedger(rightsLedger, sourceLedger);
  const topic = FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.find((entry) => entry.topicId === request.topicId);
  const expectedRef = topic.quoteRefs.find((entry) => entry.quoteCandidateId === request.quoteCandidateId);
  const candidate = sourceLedger.candidates.find((entry) => entry.candidateId === expectedRef.candidateId);
  const quote = candidate?.quoteCandidates.find((entry) => entry.quoteCandidateId === expectedRef.quoteCandidateId);
  const rights = rightsLedger.candidates.find((entry) => entry.rightsCandidateId === expectedRef.rightsCandidateId);
  const freeze = freezeLedger.bindings.find((entry) => entry.bindingId === expectedRef.bindingId);
  if (!candidate || !quote || !rights || !freeze
    || candidate.bindingId !== expectedRef.bindingId
    || candidate.evidenceSubjectId !== expectedRef.evidenceSubjectId
    || rights.sourceCandidateId !== expectedRef.candidateId
    || rights.bindingId !== expectedRef.bindingId
    || !quote.conceptualTopics.includes(topic.topicId)) {
    fail("UPSTREAM_BINDING_MISMATCH", "source, rights, freeze, topic and quote identities do not form one exact candidate chain");
  }
  if (rights.decision.distributionPolicy !== "link_only"
    || rights.decision.legalConclusion !== "not_established"
    || rights.decision.formalSourceRightsRecordCreated !== false
    || rights.decision.formalSourceCarrierRecordCreated !== false
    || rights.decision.reviewAttestations.length !== 0
    || freeze.freezeState !== "candidate_only_unbound"
    || freeze.sourceRightsRecordId !== null
    || freeze.sourceCarrierRecordId !== null
    || freeze.independentSourceRightsReviewerIds.length !== 0
    || freeze.independentDomainReviewIds.length !== 0) {
    fail("UPSTREAM_AUTHORITY_PROMOTION_FORBIDDEN", "upstream evidence must remain link-only, unreviewed and unfrozen");
  }
  const anchorRefs = candidate.facsimileAnchors.flatMap((anchor) =>
    anchor.pageRefs
      .filter((pageRef) => pageRef.quoteCandidateIds.includes(quote.quoteCandidateId))
      .map((pageRef) => ({
        anchorId: anchor.anchorId,
        carrierSha256: anchor.carrierSha256,
        pageRefId: pageRef.pageRefId
      }))
  );
  const collationRefs = candidate.facsimileCollationCandidates
    .filter((entry) => entry.quoteCandidateId === quote.quoteCandidateId)
    .map((entry) => ({
      collationCandidateId: entry.collationCandidateId,
      result: entry.result,
      observerClass: entry.observerClass
    }));
  if (anchorRefs.length === 0 || collationRefs.length === 0
    || collationRefs.some((entry) => entry.observerClass !== "automated_agent_nonexpert_visual_inspection")) {
    fail("FACSIMILE_CANDIDATE_CHAIN_MISMATCH", "the quote must retain nonexpert facsimile candidate provenance without promotion");
  }
  return { topic, expectedRef, candidate, quote, rights, freeze, anchorRefs, collationRefs };
}

function lineNumberAtOffset(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 0x0a) line += 1;
  }
  return line;
}

function countOverlappingOccurrences(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while (offset <= text.length - needle.length) {
    const found = text.indexOf(needle, offset);
    if (found < 0) break;
    count += 1;
    offset = found + 1;
  }
  return count;
}

export function verifyUtf8QuoteMaterialAgainstLock(sourceBytes, carrierLock, quoteLock) {
  if (utilTypes.isProxy(sourceBytes) || !(sourceBytes instanceof Uint8Array)) {
    fail("INVALID_BYTES", "sourceBytes must be a non-Proxy Uint8Array");
  }
  const safeBytes = Buffer.from(sourceBytes);
  const safeCarrierLock = snapshotDeclarativeOwnData(carrierLock, "carrierLock");
  const safeQuoteLock = snapshotDeclarativeOwnData(quoteLock, "quoteLock");
  if (!isRecord(safeCarrierLock) || !isRecord(safeQuoteLock)) {
    fail("INVALID_MATERIAL_LOCK", "carrierLock and quoteLock must be objects");
  }
  const text = decodeStrictUtf8(safeBytes, "private source body");
  const bodyDigest = sha256Bytes(safeBytes);
  if (!SHA256_PATTERN.test(safeCarrierLock.rawWikitextSha256)
    || bodyDigest !== safeCarrierLock.rawWikitextSha256
    || safeBytes.byteLength !== safeCarrierLock.rawWikitextUtf8Bytes
    || text.length !== safeCarrierLock.rawWikitextCharacters) {
    fail("SOURCE_BODY_IDENTITY_MISMATCH", "private source bytes do not match the pinned revision identity");
  }
  const start = safeQuoteLock.rawCharacterStartZeroBased;
  const end = safeQuoteLock.rawCharacterEndExclusive;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end <= start || end > text.length) {
    fail("QUOTE_LOCATOR_MISMATCH", "quote UTF-16 range is invalid for the private source body");
  }
  const quoteText = text.slice(start, end);
  const quoteBytes = Buffer.from(quoteText, "utf8");
  const occurrenceCount = countOverlappingOccurrences(text, quoteText);
  const actual = {
    rawRevisionLineStart: lineNumberAtOffset(text, start),
    rawRevisionLineEnd: lineNumberAtOffset(text, end - 1),
    rawCharacterStartZeroBased: start,
    rawCharacterEndExclusive: end,
    quoteCharacters: quoteText.length,
    quoteUtf8Bytes: quoteBytes.byteLength,
    quoteSha256: sha256Bytes(quoteBytes),
    quoteOccurrenceInRawRevision: occurrenceCount === 1 ? "unique" : "not_unique"
  };
  if (occurrenceCount !== 1) {
    fail("QUOTE_NOT_UNIQUE", "quote uniqueness must count overlapping occurrences from start + 1");
  }
  for (const key of Object.keys(actual)) {
    if (actual[key] !== safeQuoteLock[key]) {
      fail("QUOTE_MATERIAL_MISMATCH", `${key} does not match the pinned quote candidate`);
    }
  }
  return deepFreezeDeclarativeValue({
    sourceBodySha256: bodyDigest,
    sourceBodyUtf8Bytes: safeBytes.byteLength,
    sourceBodyUtf16CodeUnits: text.length,
    rawRevisionLineStart: actual.rawRevisionLineStart,
    rawRevisionLineEnd: actual.rawRevisionLineEnd,
    rawCharacterStartZeroBased: start,
    rawCharacterEndExclusive: end,
    quoteUtf16CodeUnits: quoteText.length,
    quoteUtf8Bytes: quoteBytes.byteLength,
    quoteSha256: actual.quoteSha256,
    overlappingOccurrenceCount: occurrenceCount,
    sourceBodyStoredInResult: false,
    quoteTextStoredInResult: false
  });
}

function pathIsSameOrWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function normalizeResolvedPath(value) {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isSameResolvedPath(left, right) {
  return normalizeResolvedPath(left) === normalizeResolvedPath(right);
}

function isSafeFailure(error) {
  if (!utilTypes.isNativeError(error)) return false;
  const descriptor = Object.getOwnPropertyDescriptor(error, "safeForCli");
  return descriptor !== undefined && "value" in descriptor && descriptor.value === true;
}

function assertPrivateDirectoryStat(directoryStat, label, failureCode) {
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) {
    fail(failureCode, `${label} parent chain must contain only ordinary directories`);
  }
  for (const field of ["dev", "ino", "nlink", "mtimeNs", "ctimeNs"]) {
    if (typeof directoryStat[field] !== "bigint") {
      fail(failureCode, `${label} parent chain metadata cannot be verified`);
    }
  }
  if (directoryStat.ino <= 0n || directoryStat.nlink <= 0n) {
    fail(failureCode, `${label} parent chain identity cannot be verified`);
  }
}

function privateDirectoryEndpoint(absolutePath, resolvedPath, directoryStat) {
  return Object.freeze({
    absolutePath,
    resolvedPath,
    dev: directoryStat.dev,
    ino: directoryStat.ino,
    nlink: directoryStat.nlink,
    mtimeNs: directoryStat.mtimeNs,
    ctimeNs: directoryStat.ctimeNs
  });
}

async function capturePrivateDirectoryChain(privateRoot, absolutePath, label, failureCode) {
  try {
    const root = path.resolve(privateRoot);
    const targetDirectory = path.dirname(path.resolve(absolutePath));
    if (!pathIsSameOrWithin(targetDirectory, root)) {
      fail("PRIVATE_PATH_ESCAPE", `${label} parent chain escapes privateRoot`);
    }
    const relative = path.relative(root, targetDirectory);
    const segments = relative === "" ? [] : relative.split(path.sep);
    const endpoints = [];
    let cursor = root;
    for (const segment of [null, ...segments]) {
      if (segment !== null) cursor = path.join(cursor, segment);
      const directoryStat = await lstat(cursor, { bigint: true });
      assertPrivateDirectoryStat(directoryStat, label, failureCode);
      const resolvedPath = await realpath(cursor);
      if (endpoints.length === 0) {
        if (!isSameResolvedPath(resolvedPath, root)) {
          fail(failureCode, `${label} privateRoot identity changed`);
        }
      } else if (!pathIsSameOrWithin(resolvedPath, endpoints[0].resolvedPath)) {
        fail("PRIVATE_PATH_ESCAPE", `${label} parent chain resolves outside privateRoot`);
      }
      endpoints.push(privateDirectoryEndpoint(cursor, resolvedPath, directoryStat));
    }
    return Object.freeze(endpoints);
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail(failureCode, `${label} parent chain could not be verified safely`);
  }
}

function samePrivateDirectoryChain(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const other = right[index];
    return other !== undefined
      && isSameResolvedPath(entry.absolutePath, other.absolutePath)
      && isSameResolvedPath(entry.resolvedPath, other.resolvedPath)
      && entry.dev === other.dev
      && entry.ino === other.ino
      && entry.nlink === other.nlink
      && entry.mtimeNs === other.mtimeNs
      && entry.ctimeNs === other.ctimeNs;
  });
}

function sameFileIdentity(left, right) {
  return left.isFile()
    && right.isFile()
    && typeof left.dev === "bigint"
    && typeof left.ino === "bigint"
    && left.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino;
}

function sameStableFileMetadata(left, right) {
  return sameFileIdentity(left, right)
    && left.size === right.size
    && left.nlink === right.nlink
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertPrivateFileStat(fileStat, maxBytes, label) {
  if (!fileStat.isFile()) {
    fail("PRIVATE_FILE_NOT_REGULAR", `${label} must be a regular non-symlink file`);
  }
  if (fileStat.nlink !== 1n) {
    fail("PRIVATE_FILE_ALIAS_FORBIDDEN", `${label} must not be a hard-linked alias`);
  }
  if (fileStat.size <= 0n || fileStat.size > BigInt(maxBytes)) {
    fail("PRIVATE_FILE_SIZE_INVALID", `${label} must be non-empty and no larger than ${maxBytes} bytes`);
  }
}

async function readBoundedHandle(handle, maxBytes, label) {
  const buffer = Buffer.allocUnsafe(maxBytes + 1);
  let total = 0;
  while (total < buffer.length) {
    const { bytesRead } = await handle.read(buffer, total, buffer.length - total, total);
    if (bytesRead === 0) break;
    total += bytesRead;
  }
  if (total <= 0 || total > maxBytes) {
    fail("PRIVATE_FILE_SIZE_INVALID", `${label} must be non-empty and no larger than ${maxBytes} bytes`);
  }
  return Buffer.from(buffer.subarray(0, total));
}

async function resolvePrivateRoot(workspaceRoot, privateRoot) {
  if (typeof privateRoot !== "string" || !path.isAbsolute(privateRoot)) {
    fail("INVALID_PRIVATE_ROOT", "privateRoot must be an explicit absolute path");
  }
  try {
    const [workspaceReal, privateReal] = await Promise.all([realpath(workspaceRoot), realpath(privateRoot)]);
    const privateStat = await stat(privateReal, { bigint: true });
    if (!privateStat.isDirectory()) fail("INVALID_PRIVATE_ROOT", "privateRoot must be a directory");
    if (pathIsSameOrWithin(privateReal, workspaceReal) || pathIsSameOrWithin(workspaceReal, privateReal)) {
      fail("PRIVATE_ROOT_OVERLAPS_WORKSPACE", "privateRoot must be outside and must not contain the workspace");
    }
    return privateReal;
  } catch (error) {
    if (isSafeFailure(error)) throw error;
    fail("PRIVATE_ROOT_RESOLUTION_FAILED", "privateRoot could not be resolved safely");
  }
}

async function readStablePrivateFile(privateRoot, relativePath, maxBytes, label) {
  validatePrivateRelativePath(relativePath, label);
  const unresolved = path.resolve(privateRoot, ...relativePath.split("/"));
  if (!pathIsSameOrWithin(unresolved, privateRoot)) fail("PRIVATE_PATH_ESCAPE", `${label} escapes privateRoot`);
  let handle = null;
  try {
    const directoryChainBeforeOpen = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_NOT_REGULAR"
    );
    const beforeLink = await lstat(unresolved, { bigint: true });
    if (beforeLink.isSymbolicLink()) {
      fail("PRIVATE_FILE_NOT_REGULAR", `${label} must be a regular non-symlink file`);
    }
    assertPrivateFileStat(beforeLink, maxBytes, label);

    const resolvedBeforeOpen = await realpath(unresolved);
    if (!pathIsSameOrWithin(resolvedBeforeOpen, privateRoot)) {
      fail("PRIVATE_PATH_ESCAPE", `${label} resolves outside privateRoot`);
    }
    const pathStatBeforeOpen = await stat(resolvedBeforeOpen, { bigint: true });
    assertPrivateFileStat(pathStatBeforeOpen, maxBytes, label);
    if (!sameFileIdentity(beforeLink, pathStatBeforeOpen)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }

    const noFollowFlag = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await open(unresolved, fsConstants.O_RDONLY | noFollowFlag);
    const handleStatBeforeRead = await handle.stat({ bigint: true });
    assertPrivateFileStat(handleStatBeforeRead, maxBytes, label);
    if (!sameFileIdentity(pathStatBeforeOpen, handleStatBeforeRead)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }

    const directoryChainAfterOpen = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN"
    );
    if (!samePrivateDirectoryChain(directoryChainBeforeOpen, directoryChainAfterOpen)) {
      fail("PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN", `${label} parent chain changed while the file was being opened`);
    }

    const linkAfterOpen = await lstat(unresolved, { bigint: true });
    if (linkAfterOpen.isSymbolicLink()) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    assertPrivateFileStat(linkAfterOpen, maxBytes, label);
    const resolvedAfterOpen = await realpath(unresolved);
    if (!pathIsSameOrWithin(resolvedAfterOpen, privateRoot)
      || !isSameResolvedPath(resolvedBeforeOpen, resolvedAfterOpen)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }
    const pathStatAfterOpen = await stat(resolvedAfterOpen, { bigint: true });
    assertPrivateFileStat(pathStatAfterOpen, maxBytes, label);
    if (!sameFileIdentity(handleStatBeforeRead, linkAfterOpen)
      || !sameFileIdentity(handleStatBeforeRead, pathStatAfterOpen)) {
      fail("PRIVATE_FILE_CHANGED_DURING_OPEN", `${label} changed while it was being opened`);
    }

    const bytes = await readBoundedHandle(handle, maxBytes, label);
    const handleStatAfterRead = await handle.stat({ bigint: true });
    if (!sameStableFileMetadata(handleStatBeforeRead, handleStatAfterRead)
      || BigInt(bytes.byteLength) !== handleStatAfterRead.size) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }

    const directoryChainAfterRead = await capturePrivateDirectoryChain(
      privateRoot,
      unresolved,
      label,
      "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_READ"
    );
    if (!samePrivateDirectoryChain(directoryChainBeforeOpen, directoryChainAfterRead)) {
      fail("PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_READ", `${label} parent chain changed while the file was being read`);
    }

    const linkAfterRead = await lstat(unresolved, { bigint: true });
    if (linkAfterRead.isSymbolicLink()) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }
    assertPrivateFileStat(linkAfterRead, maxBytes, label);
    const resolvedAfterRead = await realpath(unresolved);
    if (!pathIsSameOrWithin(resolvedAfterRead, privateRoot)
      || !isSameResolvedPath(resolvedBeforeOpen, resolvedAfterRead)) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }
    const pathStatAfterRead = await stat(resolvedAfterRead, { bigint: true });
    assertPrivateFileStat(pathStatAfterRead, maxBytes, label);
    if (!sameFileIdentity(handleStatAfterRead, linkAfterRead)
      || !sameFileIdentity(handleStatAfterRead, pathStatAfterRead)) {
      fail("PRIVATE_FILE_CHANGED_DURING_READ", `${label} changed while it was being read`);
    }

    await handle.close();
    handle = null;
    return bytes;
  } catch (error) {
    if (handle !== null) {
      try {
        await handle.close();
      } catch {
        // The verification already fails closed; never replace it with a path-bearing close error.
      }
    }
    if (isSafeFailure(error)) throw error;
    fail("PRIVATE_FILE_READ_FAILED", `${label} could not be read safely`);
  }
}

async function readWorkspaceJson(workspaceRoot, relativePath) {
  const bytes = await readFile(path.resolve(workspaceRoot, ...relativePath.split("/")));
  return parseDuplicateFreeJsonBytes(bytes, relativePath);
}

function buildSanitizedReceipt(request, context, integrity, verifiedAt) {
  let bindingModelReviewState;
  switch (context.topic.mappingState) {
    case "mapped_to_existing_bindings_as_research_candidates":
      bindingModelReviewState = "research_candidate_mapping_only_no_binding_freeze";
      break;
    case "candidate_quote_located_no_dedicated_current_binding":
      bindingModelReviewState = "pending_domain_model_review_no_parallel_binding";
      break;
    default:
      fail("UNSUPPORTED_TOPIC_MAPPING_STATE", "topic mapping state is not supported for a private integrity receipt");
  }
  const unsigned = {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_RECEIPT_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_material_integrity_receipt",
    receiptId: `${request.requestId}/${context.quote.quoteCandidateId}`,
    verifiedAt,
    verificationScope: "engineering_private_material_integrity_only",
    requestId: request.requestId,
    topicScope: {
      topicId: context.topic.topicId,
      topicIsCurrentBindingId: false,
      mappingState: context.topic.mappingState,
      topicMappingAuthority: "research_candidate_only",
      sourceCandidateBindingId: context.candidate.bindingId,
      evidenceSubjectId: context.candidate.evidenceSubjectId,
      bindingModelReviewState,
      parallelBindingCreated: false
    },
    sourceCandidate: {
      candidateId: context.candidate.candidateId,
      sourceId: context.candidate.sourceId,
      quoteCandidateId: context.quote.quoteCandidateId,
      rightsCandidateId: context.rights.rightsCandidateId,
      revisionId: context.candidate.carrierIdentity.revisionId,
      sourceBodySha256: integrity.sourceBodySha256,
      sourceBodyUtf8Bytes: integrity.sourceBodyUtf8Bytes,
      sourceBodyUtf16CodeUnits: integrity.sourceBodyUtf16CodeUnits
    },
    quoteIntegrity: {
      rawRevisionLineStart: integrity.rawRevisionLineStart,
      rawRevisionLineEnd: integrity.rawRevisionLineEnd,
      rawCharacterStartZeroBased: integrity.rawCharacterStartZeroBased,
      rawCharacterEndExclusive: integrity.rawCharacterEndExclusive,
      quoteUtf16CodeUnits: integrity.quoteUtf16CodeUnits,
      quoteUtf8Bytes: integrity.quoteUtf8Bytes,
      quoteSha256: integrity.quoteSha256,
      overlappingOccurrenceCount: integrity.overlappingOccurrenceCount,
      uniqueIncludingOverlapsVerified: true
    },
    facsimileCandidateProvenance: {
      anchorRefs: context.anchorRefs,
      collationRefs: context.collationRefs,
      independentHumanCollationsVerified: 0,
      effectOnEditionIdentity: "none",
      effectOnBindingFreeze: "none"
    },
    rightsBoundary: {
      upstreamDistributionPolicy: "link_only",
      formalSourceRightsRecordId: null,
      formalSourceCarrierRecordId: null,
      independentSourceRightsReviewerIds: [],
      legalConclusion: "not_established",
      quotePublicationDecision: "not_established"
    },
    redactionBoundary: {
      privateRootStoredInReceipt: false,
      sourceBodyPathStoredInReceipt: false,
      sourceBodyStoredInReceipt: false,
      quoteTextStoredInReceipt: false,
      carrierBytesStoredInReceipt: false,
      pageImagesStoredInReceipt: false,
      ocrTextStoredInReceipt: false
    },
    gateSummary: {
      privateMaterialIntegrityVerified: true,
      lawfulMaterialAccessEstablished: false,
      editionIdentityEstablished: false,
      carrierIdentityEstablishedForFreeze: false,
      minimalSufficiencyHumanReviewed: false,
      independentHumanCollationVerified: false,
      independentSourceRightsReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      bindingFrozenVerified: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [...DOES_NOT_ESTABLISH]
  };
  return deepFreezeDeclarativeValue({
    ...unsigned,
    receiptDigest: sha256Text(canonicalJson(unsigned))
  });
}

function validateVerifiedAt(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || !value.endsWith("Z")) {
    fail("INVALID_VERIFICATION_TIME", "verifiedAt must be an ISO-8601 UTC timestamp");
  }
  return value;
}

export async function verifyBaziPrivateExactQuoteMaterialFromFiles({
  workspaceRoot,
  privateRoot,
  requestRelativePath,
  verifiedAt = new Date().toISOString()
}) {
  validateVerifiedAt(verifiedAt);
  const privateReal = await resolvePrivateRoot(workspaceRoot, privateRoot);
  const requestBytes = await readStablePrivateFile(
    privateReal,
    requestRelativePath,
    MAX_REQUEST_BYTES,
    "requestRelativePath"
  );
  const request = validatePrivateExactQuoteRequest(
    parseDuplicateFreeJsonBytes(requestBytes, "private exact-quote request")
  );
  const [sourceLedger, rightsLedger, freezeLedger] = await Promise.all([
    readWorkspaceJson(workspaceRoot, SOURCE_LEDGER_RELATIVE_PATH),
    readWorkspaceJson(workspaceRoot, RIGHTS_LEDGER_RELATIVE_PATH),
    readBaziBindingFreezeRequirements(workspaceRoot)
  ]);
  await verifyBaziBindingFreezeRequirements(workspaceRoot, freezeLedger);
  const context = resolveQuoteContext(sourceLedger, rightsLedger, freezeLedger, request);
  const sourceBytes = await readStablePrivateFile(
    privateReal,
    request.sourceBodyRelativePath,
    MAX_SOURCE_BODY_BYTES,
    "request.sourceBodyRelativePath"
  );
  const integrity = verifyUtf8QuoteMaterialAgainstLock(
    sourceBytes,
    context.candidate.carrierIdentity,
    context.quote
  );
  return buildSanitizedReceipt(request, context, integrity, verifiedAt);
}
