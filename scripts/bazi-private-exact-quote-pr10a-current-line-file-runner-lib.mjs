import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION,
  isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt,
  loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor,
  parseBaziPrivateExactQuoteSmtV2CurrentLineStrictJsonBytes,
  verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes
} from "./bazi-private-exact-quote-smt-v2-current-line-successor-lib.mjs";

export const BAZI_PR10A_PRIVATE_FILE_RUNNER_VERSION = "1.0.0";
export const BAZI_PR10A_PRIVATE_AUTHORIZATION_SCHEMA_VERSION = "1.0.0";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const FIXED_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, "..");
const AUTHORIZATION_FILENAME = "authorization.json";
const SOURCE_BODY_FILENAME = "source-body.utf8.txt";
const EXPECTED_INVENTORY = Object.freeze([AUTHORIZATION_FILENAME, SOURCE_BODY_FILENAME]);
const MAX_AUTHORIZATION_BYTES = 32 * 1024;
const MAX_SOURCE_BODY_BYTES = 512 * 1024;
const OPEN_READ_ONLY_NO_FOLLOW = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
const AUTHORIZATION_ID = /^auth-[a-f0-9]{32}$/u;
const WINDOWS_LOCAL_DRIVE = /^[A-Za-z]:[\\/]/u;

const NativeWeakSet = WeakSet;
const NativeWeakMap = WeakMap;
const reflectApply = Reflect.apply;
const reflectOwnKeys = Reflect.ownKeys;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;
const weakMapSet = WeakMap.prototype.set;
const weakMapGet = WeakMap.prototype.get;
const weakMapDelete = WeakMap.prototype.delete;
const objectFreeze = Object.freeze;
const objectDefineProperty = Object.defineProperty;
const objectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const objectHasOwn = Object.hasOwn;
const objectGetPrototypeOf = Object.getPrototypeOf;
const objectGetOwnPropertySymbols = Object.getOwnPropertySymbols;
const objectKeys = Object.keys;
const objectPrototype = Object.prototype;
const arrayBufferIsView = ArrayBuffer.isView;
const PRODUCTION_RECEIPTS = new NativeWeakSet();
const FIXTURE_RECEIPTS = new NativeWeakSet();
const PRODUCTION_RECEIPT_MATERIALS = new NativeWeakMap();

function deepFreeze(value, seen = new NativeWeakSet()) {
  if (value === null || typeof value !== "object" || reflectApply(weakSetHas, seen, [value])) return value;
  // Node does not permit freezing non-empty typed arrays. All byte buffers stay
  // inside this module and are copied before the current-line verifier sees them.
  if (reflectApply(arrayBufferIsView, ArrayBuffer, [value])) return value;
  reflectApply(weakSetAdd, seen, [value]);
  for (const key of reflectApply(reflectOwnKeys, Reflect, [value])) {
    const descriptor = reflectApply(objectGetOwnPropertyDescriptor, Object, [value, key]);
    if (descriptor && reflectApply(objectHasOwn, Object, [descriptor, "value"])) {
      deepFreeze(descriptor.value, seen);
    }
  }
  return reflectApply(objectFreeze, Object, [value]);
}

const SOURCE_PROFILES = deepFreeze({
  "dtt-r2600158": {
    profileId: "dtt-r2600158",
    bindingId: "binding:dtt:month-command",
    evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
    sourceCandidateId: "dtt-chanwei-wikisource-r2600158-candidate-v2",
    sourceCandidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
    revisionId: 2600158,
    expectedSourceBodyUtf8Bytes: 401801,
    expectedSourceBodyUtf16CodeUnits: 143701,
    expectedSourceBodySha256: "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d",
    quoteScopes: [
      {
        topicId: "strength.yueling_exact_quote",
        quoteCandidateId: "dtt-yueling-minimal-v1",
        candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
        rawRevisionLineStart: 2391,
        rawRevisionLineEnd: 2391,
        rawCharacterStartZeroBased: 38616,
        rawCharacterEndExclusive: 38628,
        quoteCharacters: 12,
        quoteUtf8Bytes: 36,
        quoteSha256: "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9"
      },
      {
        topicId: "strength.rooting_exact_quote",
        quoteCandidateId: "dtt-rooting-minimal-v1",
        candidateDigest: "2c59ee25081c6e0a88ee7f9da18395be2ea615bb289c28798e324e23befeeb59",
        rightsCandidateId: "dtt-chanwei-wikisource-r2600158-rights-candidate-v2",
        rightsCandidateDigest: "674a0b64179f5fbb0dff331fdad6b6ac93e3093de4a8459abf6ff9bdd6cd418c",
        rawRevisionLineStart: 2451,
        rawRevisionLineEnd: 2451,
        rawCharacterStartZeroBased: 40658,
        rawCharacterEndExclusive: 40675,
        quoteCharacters: 17,
        quoteUtf8Bytes: 51,
        quoteSha256: "201ce34c97841b890910cc311d14290d9cb71228f4fe64d1b0f4a419aff6818b"
      }
    ]
  },
  "smt-r761703": {
    profileId: "smt-r761703",
    bindingId: "binding:smt-v10:whole-chart",
    evidenceSubjectId: "bazi.strength.binding.smt-v10.whole-chart.v1",
    sourceCandidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
    sourceCandidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
    revisionId: 761703,
    expectedSourceBodyUtf8Bytes: 106555,
    expectedSourceBodyUtf16CodeUnits: 38959,
    expectedSourceBodySha256: "0a20dc53a4156211b5c8ba89dbb6a8f07f056fde573e37699e28b021b6d026b6",
    quoteScopes: [
      {
        topicId: "strength.yueling_exact_quote",
        quoteCandidateId: "smt-v10-yueling-minimal-v1",
        candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
        rightsCandidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 236,
        rawCharacterEndExclusive: 252,
        quoteCharacters: 16,
        quoteUtf8Bytes: 48,
        quoteSha256: "b7f2c66c97d311fe3e1b3d1048dddbbcdafd5e71cfd4454f0b40ae89c3d4a53f"
      },
      {
        topicId: "strength.tougan_exact_quote",
        quoteCandidateId: "smt-v10-tougan-minimal-v1",
        candidateDigest: "2465b64080d4a9f0283212c994b1bd78ebe59ece26ed71e41601cc43a67d2d1d",
        rightsCandidateId: "smt-siku-v10-wikisource-r761703-rights-candidate-v2",
        rightsCandidateDigest: "aed5031acb007b74092db96de4338d4148bc8518b4fb392cc59e18a0ba54295d",
        rawRevisionLineStart: 10,
        rawRevisionLineEnd: 10,
        rawCharacterStartZeroBased: 365,
        rawCharacterEndExclusive: 384,
        quoteCharacters: 19,
        quoteUtf8Bytes: 57,
        quoteSha256: "b652a600ae2db57b8035fb95c38c4fc67f45bd6cbf03e5b62ffbd5a6bbbcccee"
      }
    ]
  }
});

const ZERO_COUNTS = deepFreeze({
  formalKnowledgeDocuments: 0,
  formalSourceRightsRecords: 0,
  formalSourceCarrierRecords: 0,
  projectCopyMaterializationRecords: 0,
  materializationsVerified: 0,
  bindingCitationLocatorLinks: 0,
  bindingsFrozen: 0,
  domainExpertReviews: 0,
  rightsLegalReviews: 0
});

const AUTHORITY_BOUNDARY = deepFreeze({
  authorizationAttributionEstablished: false,
  materialProviderIdentityEstablished: false,
  lawfulMaterialAccessEstablished: false,
  lawfulPossessionEstablished: false,
  sourceIdentityAdjudicated: false,
  minimalQuoteSufficiencyEstablished: false,
  workEditionCarrierRightsCleared: false,
  rightsLegalConclusionEstablished: false,
  contentTruthEstablished: false,
  expertTruthEstablished: false,
  bindingCitationLocatorLinked: false,
  bindingFrozen: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false,
  publicReleaseAuthorized: false
});

const RELEASE_GOVERNANCE = deepFreeze({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null,
  mutationEpochBoundaryRequired: true,
  publicDeploymentAuthorized: false,
  expertClaimsAuthorized: false
});

const SUPPORTED_CLOSED_WORLD_SCOPE = deepFreeze({
  supportedSourceProfiles: 2,
  supportedQuoteReferences: 4,
  supportedConceptualTopics: 3,
  supportedCurrentBindings: 2,
  quoteReferencesAreNotBindingCount: true,
  bindingFreezeEffect: "none"
});

const DOES_NOT_ESTABLISH = deepFreeze([
  "authorization_signer_identity_or_attribution",
  "lawful_access_possession_or_legal_clearance",
  "source_work_edition_transcription_or_carrier_identity",
  "minimal_quote_sufficiency_or_content_truth",
  "knowledge_document_source_rights_source_carrier_or_materialization_instance",
  "binding_locator_link_or_freeze",
  "expert_identity_opinion_or_truth",
  "cross_file_atomic_snapshot_mutation_epoch_interval_or_aba_exclusion",
  "replay_exclusion_trusted_time_release_readiness_or_public_authorization"
]);

export class BaziPr10aPrivateFileRunnerError extends Error {
  constructor(code) {
    super(code);
    this.name = "BaziPr10aPrivateFileRunnerError";
    reflectApply(objectDefineProperty, Object, [this, "code", {
      value: code,
      enumerable: false,
      configurable: false,
      writable: false
    }]);
    reflectApply(objectDefineProperty, Object, [this, "safeForCli", {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false
    }]);
  }
}

function fail(code) {
  throw new BaziPr10aPrivateFileRunnerError(code);
}

function canonicalStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) fail("CANONICAL_VALUE_INVALID");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${canonicalStringify(value[key])}`
    )).join(",")}}`;
  }
  fail("CANONICAL_VALUE_INVALID");
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function domainDigest(domain, value) {
  return sha256Bytes(Buffer.from(`${domain}\0${canonicalStringify(value)}`, "utf8"));
}

function exactKeys(value, expected, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || reflectApply(objectGetPrototypeOf, Object, [value]) !== objectPrototype) fail(code);
  const actual = reflectApply(objectKeys, Object, [value]).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) fail(code);
  if (reflectApply(objectGetOwnPropertySymbols, Object, [value]).length !== 0) fail(code);
  for (const key of actual) {
    const descriptor = reflectApply(objectGetOwnPropertyDescriptor, Object, [value, key]);
    if (!descriptor || descriptor.enumerable !== true
      || !reflectApply(objectHasOwn, Object, [descriptor, "value"])) fail(code);
  }
}

function scopeForProfile(profile) {
  return {
    profileId: profile.profileId,
    bindingId: profile.bindingId,
    evidenceSubjectId: profile.evidenceSubjectId,
    sourceCandidateId: profile.sourceCandidateId,
    sourceCandidateDigest: profile.sourceCandidateDigest,
    revisionId: profile.revisionId,
    expectedSourceBodyUtf8Bytes: profile.expectedSourceBodyUtf8Bytes,
    expectedSourceBodyUtf16CodeUnits: profile.expectedSourceBodyUtf16CodeUnits,
    expectedSourceBodySha256: profile.expectedSourceBodySha256,
    quoteScopes: profile.quoteScopes
  };
}

function parseAuthorization(bytes) {
  let value;
  try {
    value = parseBaziPrivateExactQuoteSmtV2CurrentLineStrictJsonBytes(bytes);
  } catch {
    fail("AUTHORIZATION_JSON_INVALID");
  }
  exactKeys(value, ["schemaVersion", "recordType", "authorizationId", "scope", "authorization"],
    "AUTHORIZATION_SHAPE_INVALID");
  exactKeys(value.scope, [
    "profileId", "bindingId", "evidenceSubjectId", "sourceCandidateId", "sourceCandidateDigest",
    "revisionId", "expectedSourceBodyUtf8Bytes", "expectedSourceBodyUtf16CodeUnits",
    "expectedSourceBodySha256", "quoteScopes"
  ], "AUTHORIZATION_SCOPE_INVALID");
  exactKeys(value.authorization, [
    "materialProviderAffirmsLawfulPossession",
    "localMachinePrivateVerificationAuthorized",
    "repositoryStorageAuthorized",
    "redistributionAuthorized",
    "quotePublicationAuthorized",
    "rightsLegalConclusion"
  ], "AUTHORIZATION_BOUNDARY_INVALID");
  if (value.schemaVersion !== BAZI_PR10A_PRIVATE_AUTHORIZATION_SCHEMA_VERSION
    || value.recordType !== "bazi_pr10a_local_private_verification_authorization"
    || typeof value.authorizationId !== "string" || !AUTHORIZATION_ID.test(value.authorizationId)
    || new Set(value.authorizationId.slice(5)).size < 2
    || typeof value.scope.profileId !== "string") {
    fail("AUTHORIZATION_SHAPE_INVALID");
  }
  const profile = SOURCE_PROFILES[value.scope.profileId];
  if (!profile || canonicalStringify(value.scope) !== canonicalStringify(scopeForProfile(profile))) {
    fail("AUTHORIZATION_SCOPE_INVALID");
  }
  const boundary = value.authorization;
  if (boundary.materialProviderAffirmsLawfulPossession !== true
    || boundary.localMachinePrivateVerificationAuthorized !== true
    || boundary.repositoryStorageAuthorized !== false
    || boundary.redistributionAuthorized !== false
    || boundary.quotePublicationAuthorized !== false
    || boundary.rightsLegalConclusion !== "not_established") {
    fail("AUTHORIZATION_BOUNDARY_INVALID");
  }
  return deepFreeze({ value, profile });
}

function pathIsSameOrWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function normalizedPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function statIdentity(statValue) {
  return {
    dev: statValue.dev,
    ino: statValue.ino,
    mode: statValue.mode,
    nlink: statValue.nlink,
    size: statValue.size,
    mtimeNs: statValue.mtimeNs,
    ctimeNs: statValue.ctimeNs
  };
}

function identitiesEqual(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.mode === right.mode
    && left.nlink === right.nlink && left.size === right.size
    && left.mtimeNs === right.mtimeNs && left.ctimeNs === right.ctimeNs;
}

function assertOrdinarySingleLinkFile(statValue, code) {
  if (!statValue.isFile() || statValue.isSymbolicLink() || statValue.nlink !== 1n
    || statValue.ino <= 0n || statValue.size < 0n) fail(code);
}

async function captureRootIdentity(rootPath, code) {
  try {
    const value = await lstat(rootPath, { bigint: true });
    if (!value.isDirectory() || value.isSymbolicLink() || value.ino <= 0n || value.nlink <= 0n) fail(code);
    return statIdentity(value);
  } catch (error) {
    if (error instanceof BaziPr10aPrivateFileRunnerError) throw error;
    fail(code);
  }
}

async function assertNoLinkedDirectoryComponent(absoluteDirectory) {
  const parsed = path.parse(absoluteDirectory);
  const relative = path.relative(parsed.root, absoluteDirectory);
  const segments = relative === "" ? [] : relative.split(path.sep);
  let cursor = parsed.root;
  try {
    for (const segment of segments) {
      cursor = path.join(cursor, segment);
      const entry = await lstat(cursor, { bigint: true });
      if (!entry.isDirectory() || entry.isSymbolicLink()) fail("PRIVATE_ROOT_ALIAS_REJECTED");
    }
  } catch (error) {
    if (error instanceof BaziPr10aPrivateFileRunnerError) throw error;
    fail("PRIVATE_ROOT_INVALID");
  }
}

async function assertExactInventory(privateRoot) {
  let entries;
  try {
    entries = await readdir(privateRoot, { withFileTypes: true });
  } catch {
    fail("PRIVATE_INVENTORY_INVALID");
  }
  const names = entries.map((entry) => entry.name).sort();
  if (names.length !== EXPECTED_INVENTORY.length
    || names.some((name, index) => name !== EXPECTED_INVENTORY[index])) {
    fail("PRIVATE_INVENTORY_INVALID");
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) fail("PRIVATE_INVENTORY_INVALID");
  }
}

async function readBoundedFile(handle, maxBytes) {
  const target = Buffer.allocUnsafe(maxBytes + 1);
  let length = 0;
  while (length < target.length) {
    const result = await handle.read(target, length, target.length - length, length);
    if (result.bytesRead === 0) break;
    length += result.bytesRead;
  }
  if (length > maxBytes) fail("PRIVATE_FILE_TOO_LARGE");
  return Buffer.from(target.subarray(0, length));
}

async function readStablePrivateFile(privateRoot, filename, maxBytes) {
  const absolutePath = path.join(privateRoot, filename);
  if (path.dirname(absolutePath) !== privateRoot) fail("PRIVATE_PATH_INVALID");
  let handle;
  let primaryError;
  try {
    const pathBefore = await lstat(absolutePath, { bigint: true });
    assertOrdinarySingleLinkFile(pathBefore, "PRIVATE_FILE_ENDPOINT_INVALID");
    const resolvedBefore = await realpath(absolutePath);
    if (!pathIsSameOrWithin(privateRoot, resolvedBefore)) fail("PRIVATE_PATH_ESCAPE");
    const resolvedBeforeStat = await lstat(resolvedBefore, { bigint: true });
    assertOrdinarySingleLinkFile(resolvedBeforeStat, "PRIVATE_FILE_ENDPOINT_INVALID");
    if (!identitiesEqual(statIdentity(pathBefore), statIdentity(resolvedBeforeStat))) {
      fail("PRIVATE_FILE_ENDPOINT_CHANGED");
    }
    handle = await open(absolutePath, OPEN_READ_ONLY_NO_FOLLOW);
    const handleBefore = await handle.stat({ bigint: true });
    assertOrdinarySingleLinkFile(handleBefore, "PRIVATE_FILE_ENDPOINT_INVALID");
    if (!identitiesEqual(statIdentity(pathBefore), statIdentity(handleBefore))) {
      fail("PRIVATE_FILE_ENDPOINT_CHANGED");
    }
    const bytes = await readBoundedFile(handle, maxBytes);
    const handleAfter = await handle.stat({ bigint: true });
    const pathAfter = await lstat(absolutePath, { bigint: true });
    const resolvedAfter = await realpath(absolutePath);
    if (!identitiesEqual(statIdentity(handleBefore), statIdentity(handleAfter))
      || !identitiesEqual(statIdentity(handleAfter), statIdentity(pathAfter))
      || normalizedPath(resolvedBefore) !== normalizedPath(resolvedAfter)
      || bytes.length !== Number(handleAfter.size)) {
      fail("PRIVATE_FILE_ENDPOINT_CHANGED");
    }
    return deepFreeze({ bytes, bytesLength: bytes.length, sha256: sha256Bytes(bytes) });
  } catch (error) {
    primaryError = error instanceof BaziPr10aPrivateFileRunnerError
      ? error
      : new BaziPr10aPrivateFileRunnerError("PRIVATE_FILE_READ_FAILED");
    throw primaryError;
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch {
        if (!primaryError) fail("PRIVATE_FILE_CLOSE_FAILED");
      }
    }
  }
}

async function resolvePrivateRoot(privateRoot) {
  if (typeof privateRoot !== "string" || privateRoot.length === 0 || !path.isAbsolute(privateRoot)) {
    fail("PRIVATE_ROOT_INVALID");
  }
  if (process.platform === "win32"
    && (!WINDOWS_LOCAL_DRIVE.test(privateRoot) || privateRoot.startsWith("\\\\")
      || privateRoot.startsWith("\\\\?\\") || privateRoot.startsWith("\\\\.\\"))) {
    fail("PRIVATE_ROOT_INVALID");
  }
  try {
    const workspaceReal = await realpath(FIXED_WORKSPACE_ROOT);
    const unresolved = path.resolve(privateRoot);
    await assertNoLinkedDirectoryComponent(unresolved);
    const rootBefore = await captureRootIdentity(unresolved, "PRIVATE_ROOT_INVALID");
    const privateReal = await realpath(unresolved);
    const resolvedIdentity = await captureRootIdentity(privateReal, "PRIVATE_ROOT_INVALID");
    if (!identitiesEqual(rootBefore, resolvedIdentity)) fail("PRIVATE_ROOT_ALIAS_REJECTED");
    if (pathIsSameOrWithin(workspaceReal, privateReal) || pathIsSameOrWithin(privateReal, workspaceReal)) {
      fail("PRIVATE_ROOT_OVERLAPS_WORKSPACE");
    }
    return deepFreeze({ workspaceReal, privateReal, unresolvedRoot: unresolved, rootIdentity: rootBefore });
  } catch (error) {
    if (error instanceof BaziPr10aPrivateFileRunnerError) throw error;
    fail("PRIVATE_ROOT_INVALID");
  }
}

function snapshotsEqual(left, right) {
  return left.bytesLength === right.bytesLength && left.sha256 === right.sha256;
}

function fixedCurrentLineRequest(profile, quoteScope) {
  const requestDigest = domainDigest("hakimi.bazi.pr10a.private-file-runner.request.v1", {
    profileId: profile.profileId,
    topicId: quoteScope.topicId,
    quoteCandidateId: quoteScope.quoteCandidateId
  });
  return {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_request",
    requestId: `req-${requestDigest.slice(0, 32)}`,
    topicId: quoteScope.topicId,
    quoteCandidateId: quoteScope.quoteCandidateId,
    handlingBoundary: {
      bytesProvidedDirectlyByCaller: true,
      sourcePathAccepted: false,
      repositoryReadAllowed: false,
      repositoryStorageAllowed: false,
      materialRedistributionDecision: "not_established",
      quotePublicationDecision: "not_established",
      rightsLegalConclusion: "not_established"
    }
  };
}

function assertCurrentLineReceipt(receipt, profile, quoteScope, bodySnapshot) {
  if (!isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt(receipt)
    || receipt.request?.topicId !== quoteScope.topicId
    || receipt.request?.quoteCandidateId !== quoteScope.quoteCandidateId
    || receipt.exactCurrentChain?.bindingId !== profile.bindingId
    || receipt.exactCurrentChain?.evidenceSubjectId !== profile.evidenceSubjectId
    || receipt.exactCurrentChain?.sourceCandidateId !== profile.sourceCandidateId
    || receipt.exactCurrentChain?.sourceCandidateDigest !== profile.sourceCandidateDigest
    || receipt.exactCurrentChain?.rightsCandidateId !== quoteScope.rightsCandidateId
    || receipt.exactCurrentChain?.rightsCandidateDigest !== quoteScope.rightsCandidateDigest
    || receipt.materialIntegrity?.sourceBodySha256 !== bodySnapshot.sha256
    || receipt.materialIntegrity?.sourceBodyUtf8Bytes !== bodySnapshot.bytesLength
    || receipt.materialIntegrity?.sourceBodyUtf16CodeUnits !== profile.expectedSourceBodyUtf16CodeUnits
    || receipt.materialIntegrity?.rawRevisionLineStart !== quoteScope.rawRevisionLineStart
    || receipt.materialIntegrity?.rawRevisionLineEnd !== quoteScope.rawRevisionLineEnd
    || receipt.materialIntegrity?.rawCharacterStartZeroBased !== quoteScope.rawCharacterStartZeroBased
    || receipt.materialIntegrity?.rawCharacterEndExclusive !== quoteScope.rawCharacterEndExclusive
    || receipt.materialIntegrity?.quoteUtf16CodeUnits !== quoteScope.quoteCharacters
    || receipt.materialIntegrity?.quoteUtf8Bytes !== quoteScope.quoteUtf8Bytes
    || receipt.materialIntegrity?.quoteSha256 !== quoteScope.quoteSha256
    || receipt.materialIntegrity?.overlappingOccurrenceCount !== 1
    || receipt.materialIntegrity?.uniqueIncludingOverlapsVerified !== true) {
    fail("CURRENT_LINE_RECEIPT_MISMATCH");
  }
}

function projectCurrentLineReceipt(receipt, fixtureOnly) {
  if (fixtureOnly) {
    return {
      receiptId: null,
      receiptDigest: null,
      requestId: null,
      topicId: receipt.topicId,
      quoteCandidateId: receipt.quoteCandidateId,
      rightsCandidateId: receipt.rightsCandidateId,
      quoteSha256: null,
      currentLineProductionBrandConsumed: false
    };
  }
  return {
    receiptId: receipt.receiptId,
    receiptDigest: receipt.receiptDigest,
    requestId: receipt.request.requestId,
    topicId: receipt.request.topicId,
    quoteCandidateId: receipt.request.quoteCandidateId,
    rightsCandidateId: receipt.exactCurrentChain.rightsCandidateId,
    quoteSha256: receipt.materialIntegrity.quoteSha256,
    currentLineProductionBrandConsumed: true
  };
}

function buildReceipt({ bodySnapshot, profile, currentLineReceipts, fixtureOnly }) {
  const fixedPublicScopeSha256 = domainDigest(
    "hakimi.bazi.pr10a.private-file-runner.authorization-scope.v1",
    scopeForProfile(profile)
  );
  const projectedReceipts = currentLineReceipts.map((receipt) => projectCurrentLineReceipt(receipt, fixtureOnly));
  const seed = {
    runnerVersion: BAZI_PR10A_PRIVATE_FILE_RUNNER_VERSION,
    fixedPublicScopeSha256,
    fixedSourceScope: scopeForProfile(profile),
    sourceBodySha256: bodySnapshot.sha256,
    sourceBodyUtf8Bytes: bodySnapshot.bytesLength,
    currentLineReceipts: projectedReceipts,
    fixtureOnly
  };
  const digest = domainDigest("hakimi.bazi.pr10a.private-file-runner.receipt.v1", seed);
  const thisReceiptObservation = {
    sourceBodiesObserved: 1,
    quoteReferencesObserved: profile.quoteScopes.length,
    conceptualTopicsObserved: new Set(profile.quoteScopes.map((quote) => quote.topicId)).size,
    currentBindingsObserved: 1,
    allSupportedProfilesVerifiedByThisReceipt: false,
    bindingFreezeEffect: "none"
  };
  return deepFreeze({
    schemaVersion: BAZI_PR10A_PRIVATE_FILE_RUNNER_VERSION,
    recordType: fixtureOnly
      ? "bazi_pr10a_private_file_runner_single_profile_fixture_only_batch_receipt"
      : "bazi_pr10a_private_file_runner_single_profile_redacted_batch_receipt",
    receiptId: `hakimi.bazi.pr10a.private-file-runner/${digest}`,
    verificationScope: fixtureOnly
      ? "synthetic_file_boundary_and_closed_world_dispatch_fixture_only"
      : "fixed_pr10a_private_body_integrity_and_self_asserted_local_authorization_only",
    productionRunnerReceipt: !fixtureOnly,
    formalAdmissionEligible: false,
    safeToPublish: false,
    anonymousReceipt: false,
    supportedClosedWorldScope: SUPPORTED_CLOSED_WORLD_SCOPE,
    thisReceiptObservation,
    fixedSourceScope: scopeForProfile(profile),
    authorizationEvidence: {
      fixedPublicScopeSha256,
      authorizationRecordClassification: "private_off_repository_person_derived_input",
      authorizationRawDigestStored: false,
      authorizationUtf8BytesStored: false,
      requestIdentifiersDerivedFromAuthorizationBytes: false,
      materialProviderLawfulPossessionAffirmationCaptured: true,
      localMachinePrivateVerificationAuthorizationCaptured: true,
      authorizationIsSelfAssertionOnly: true,
      authorizationSignerIdentityEstablished: false,
      authorizationAttributionEstablished: false,
      lawfulPossessionEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    privateMaterialIntegrity: {
      sourceBodySha256: bodySnapshot.sha256,
      expectedSourceBodySha256: profile.expectedSourceBodySha256,
      sourceBodyIdentityMatchedFixedProfile: !fixtureOnly,
      sourceBodyUtf8Bytes: bodySnapshot.bytesLength,
      expectedSourceBodyUtf8Bytes: profile.expectedSourceBodyUtf8Bytes,
      expectedSourceBodyUtf16CodeUnits: profile.expectedSourceBodyUtf16CodeUnits,
      sourceBodyUtf16CodeUnits: fixtureOnly
        ? null
        : currentLineReceipts[0].materialIntegrity.sourceBodyUtf16CodeUnits,
      oneBodyReadSharedAcrossExpectedQuotes: true,
      expectedQuoteCount: profile.quoteScopes.length,
      currentLineReceipts: projectedReceipts,
      fixtureFilesystemAndClosedWorldVerified: fixtureOnly,
      allExpectedQuoteIntegrityVerified: !fixtureOnly,
      allExpectedCurrentLineProductionBrandsConsumed: !fixtureOnly
    },
    filesystemBoundary: {
      fixedWorkspaceRootUsed: true,
      privateRootOutsideWorkspaceVerified: true,
      expectedSingleLevelFileInventory: EXPECTED_INVENTORY.length,
      exactInventoryVerifiedBeforeAndAfter: true,
      privateRootDirectoryComponentsChecked: true,
      ordinarySingleLinkFilesRequired: true,
      heldHandleBoundedReadUsed: true,
      endpointIdentityRechecked: true,
      filesReopenedAndDigestRecheckedAfterVerification: true,
      observedFileAndDirectorySymlinkOrJunctionRejected: true,
      genericNtfsReparseTagEnumerated: false,
      allReparseClassesExcluded: false,
      alternateDataStreamsEnumerated: false,
      alternateDataStreamsExcluded: false,
      samePrivilegeIntervalMutationExcluded: false
    },
    executionTrustBoundary: {
      fixedCliRejectsVisibleNodeInjectionStateByContract: true,
      receiptProvesFixedCliWasUsed: false,
      visibleNodeInjectionStateRejectedForThisReceipt: false,
      preEntryCodeExecutionExcluded: false,
      nodeRuntimeAuthenticityEstablished: false,
      cliSourceAuthenticityEstablished: false,
      librarySourceAuthenticityEstablished: false,
      mappedNetworkDriveExcluded: false,
      remoteOrNetworkFilesystemExcluded: false,
      localPhysicalDiskEstablished: false
    },
    serializationBoundary: {
      processLocalBrandRequiredBeforeCliSerializationByContract: true,
      receiptProvesCliSerializationOccurred: false,
      processLocalBrandSurvivesSerialization: false,
      stdoutJsonAuthenticityEstablished: false,
      receiptDigestIsDigitalSignature: false,
      rehydrationRestoresProcessLocalBrand: false
    },
    redactionBoundary: {
      authorizationIdStored: false,
      privateRootStored: false,
      sourcePathStored: false,
      sourceBodyStored: false,
      quoteTextStored: false,
      authorizationBodyStored: false,
      authorizationRawDigestStored: false,
      authorizationByteLengthStored: false,
      requestIdDerivedFromAuthorizationBytes: false,
      privateBytesZeroizedAfterUse: false,
      processMemoryClearingEstablished: false
    },
    counts: ZERO_COUNTS,
    authorityBoundary: AUTHORITY_BOUNDARY,
    releaseGovernance: RELEASE_GOVERNANCE,
    mutationBoundary: {
      processLocalReceiptBrandRegistryMutationPerformed: true,
      repositoryWritePerformed: false,
      privateRootWritePerformed: false,
      persistentOrUserStateMutationPerformed: false,
      schema13MutationPerformed: false,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      replayExcluded: false,
      trustedTimeEstablished: false
    },
    doesNotEstablish: DOES_NOT_ESTABLISH,
    receiptDigest: digest
  });
}

async function readAndValidatePrivateInputs(privateRoot) {
  const root = await resolvePrivateRoot(privateRoot);
  await assertExactInventory(root.privateReal);
  const authorizationSnapshot = await readStablePrivateFile(
    root.privateReal,
    AUTHORIZATION_FILENAME,
    MAX_AUTHORIZATION_BYTES
  );
  const parsedAuthorization = parseAuthorization(authorizationSnapshot.bytes);
  const bodySnapshot = await readStablePrivateFile(
    root.privateReal,
    SOURCE_BODY_FILENAME,
    Math.min(MAX_SOURCE_BODY_BYTES, parsedAuthorization.profile.expectedSourceBodyUtf8Bytes)
  );
  if (bodySnapshot.bytesLength !== parsedAuthorization.profile.expectedSourceBodyUtf8Bytes) {
    fail("SOURCE_BODY_SIZE_MISMATCH");
  }
  return { root, authorizationSnapshot, bodySnapshot, profile: parsedAuthorization.profile };
}

async function revalidatePrivateInputs(initial) {
  await assertNoLinkedDirectoryComponent(initial.root.unresolvedRoot);
  await assertExactInventory(initial.root.privateReal);
  const authorizationAfter = await readStablePrivateFile(
    initial.root.privateReal,
    AUTHORIZATION_FILENAME,
    MAX_AUTHORIZATION_BYTES
  );
  const parsedAfter = parseAuthorization(authorizationAfter.bytes);
  const bodyAfter = await readStablePrivateFile(
    initial.root.privateReal,
    SOURCE_BODY_FILENAME,
    Math.min(MAX_SOURCE_BODY_BYTES, parsedAfter.profile.expectedSourceBodyUtf8Bytes)
  );
  const rootAfter = await captureRootIdentity(initial.root.privateReal, "PRIVATE_ROOT_CHANGED");
  if (!identitiesEqual(initial.root.rootIdentity, rootAfter)
    || !snapshotsEqual(initial.authorizationSnapshot, authorizationAfter)
    || !snapshotsEqual(initial.bodySnapshot, bodyAfter)
    || parsedAfter.profile.profileId !== initial.profile.profileId
    || bodyAfter.bytesLength !== initial.profile.expectedSourceBodyUtf8Bytes) {
    fail("PRIVATE_INPUT_CHANGED");
  }
  await assertExactInventory(initial.root.privateReal);
}

export async function verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot(privateRoot) {
  const inputs = await readAndValidatePrivateInputs(privateRoot);
  if (inputs.bodySnapshot.sha256 !== inputs.profile.expectedSourceBodySha256) {
    fail("SOURCE_BODY_IDENTITY_MISMATCH");
  }
  const currentLineReceipts = [];
  try {
    const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(FIXED_WORKSPACE_ROOT);
    for (let index = 0; index < inputs.profile.quoteScopes.length; index += 1) {
      const quoteScope = inputs.profile.quoteScopes[index];
      const receipt = verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
        capability,
        request: fixedCurrentLineRequest(
          inputs.profile,
          quoteScope
        ),
        sourceBodyBytes: inputs.bodySnapshot.bytes
      });
      assertCurrentLineReceipt(receipt, inputs.profile, quoteScope, inputs.bodySnapshot);
      currentLineReceipts.push(receipt);
    }
  } catch {
    fail("CURRENT_LINE_VERIFICATION_FAILED");
  }
  if (currentLineReceipts.length !== inputs.profile.quoteScopes.length
    || new Set(currentLineReceipts.map((receipt) => receipt.receiptId)).size !== currentLineReceipts.length) {
    fail("CURRENT_LINE_RECEIPT_SET_MISMATCH");
  }
  await revalidatePrivateInputs(inputs);
  const receipt = buildReceipt({
    bodySnapshot: inputs.bodySnapshot,
    profile: inputs.profile,
    currentLineReceipts,
    fixtureOnly: false
  });
  reflectApply(weakSetAdd, PRODUCTION_RECEIPTS, [receipt]);
  reflectApply(weakMapSet, PRODUCTION_RECEIPT_MATERIALS, [receipt, {
    bodyBytes: inputs.bodySnapshot.bytes,
    profile: inputs.profile,
    runnerReceipt: receipt,
    inputs,
    phase: "available",
    activeCapability: null
  }]);
  return receipt;
}

export function isVerifiedBaziPr10aPrivateFileRunnerReceipt(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, PRODUCTION_RECEIPTS, [value]);
}

function beginMaterialPreflightState({
  receipt,
  consumerCapability,
  receiptIsTrusted,
  capabilityIsTrusted,
  materialStates
}) {
  if (!receiptIsTrusted(receipt) || !capabilityIsTrusted(consumerCapability)) {
    fail("PRIVATE_IMPORT_PREFLIGHT_CAPABILITY_REQUIRED");
  }
  const state = reflectApply(weakMapGet, materialStates, [receipt]);
  if (!state || state.phase !== "available") fail("PRIVATE_IMPORT_PREFLIGHT_MATERIAL_UNAVAILABLE");
  state.phase = "leased";
  state.activeCapability = consumerCapability;
  return {
    bodyBytes: state.bodyBytes,
    profile: state.profile,
    runnerReceipt: state.runnerReceipt
  };
}

async function completeMaterialPreflightState({
  receipt,
  consumerCapability,
  materialStates,
  revalidate
}) {
  const state = reflectApply(weakMapGet, materialStates, [receipt]);
  if (!state || state.phase !== "leased" || state.activeCapability !== consumerCapability) {
    fail("PRIVATE_IMPORT_PREFLIGHT_CAPABILITY_REQUIRED");
  }
  state.phase = "completing";
  try {
    await revalidate(state.inputs);
  } catch (error) {
    reflectApply(weakMapDelete, materialStates, [receipt]);
    throw error;
  }
  reflectApply(weakMapDelete, materialStates, [receipt]);
}

function abortMaterialPreflightState({ receipt, consumerCapability, materialStates }) {
  const state = reflectApply(weakMapGet, materialStates, [receipt]);
  if (!state || state.phase !== "leased" || state.activeCapability !== consumerCapability) return false;
  state.phase = "available";
  state.activeCapability = null;
  return true;
}

export async function beginVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(
  receipt,
  consumerCapability
) {
  const {
    isVerifiedBaziPr10aLocalPrivateImportPreflightConsumerCapability
  } = await import("./bazi-private-exact-quote-pr10a-local-private-import-preflight-lib.mjs");
  return beginMaterialPreflightState({
    receipt,
    consumerCapability,
    receiptIsTrusted: isVerifiedBaziPr10aPrivateFileRunnerReceipt,
    capabilityIsTrusted: isVerifiedBaziPr10aLocalPrivateImportPreflightConsumerCapability,
    materialStates: PRODUCTION_RECEIPT_MATERIALS
  });
}

export async function completeVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(
  receipt,
  consumerCapability
) {
  return completeMaterialPreflightState({
    receipt,
    consumerCapability,
    materialStates: PRODUCTION_RECEIPT_MATERIALS,
    revalidate: revalidatePrivateInputs
  });
}

export function abortVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(
  receipt,
  consumerCapability
) {
  return abortMaterialPreflightState({
    receipt,
    consumerCapability,
    materialStates: PRODUCTION_RECEIPT_MATERIALS
  });
}

export function safeBaziPr10aPrivateFileRunnerCliCode(error) {
  if (!(error instanceof BaziPr10aPrivateFileRunnerError)) return "VERIFICATION_FAILED";
  const descriptor = reflectApply(objectGetOwnPropertyDescriptor, Object, [error, "code"]);
  const safe = reflectApply(objectGetOwnPropertyDescriptor, Object, [error, "safeForCli"]);
  return typeof descriptor?.value === "string" && /^[A-Z0-9_]+$/u.test(descriptor.value)
    && safe?.value === true ? descriptor.value : "VERIFICATION_FAILED";
}

async function verifyFixtureOnlyWithHook(privateRoot, afterInitialRead) {
  const inputs = await readAndValidatePrivateInputs(privateRoot);
  if (afterInitialRead !== undefined) {
    if (typeof afterInitialRead !== "function") fail("TEST_HOOK_INVALID");
    await afterInitialRead();
  }
  await revalidatePrivateInputs(inputs);
  const fixtureQuoteReceipts = inputs.profile.quoteScopes.map((quoteScope) => ({
    topicId: quoteScope.topicId,
    quoteCandidateId: quoteScope.quoteCandidateId,
    rightsCandidateId: quoteScope.rightsCandidateId
  }));
  const receipt = buildReceipt({
    bodySnapshot: inputs.bodySnapshot,
    profile: inputs.profile,
    currentLineReceipts: fixtureQuoteReceipts,
    fixtureOnly: true
  });
  reflectApply(weakSetAdd, FIXTURE_RECEIPTS, [receipt]);
  return receipt;
}

async function verifyFixtureOnly(privateRoot) {
  return verifyFixtureOnlyWithHook(privateRoot, undefined);
}

function isFixtureOnlyReceipt(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, FIXTURE_RECEIPTS, [value]);
}

function createIsolatedMaterialPreflightStateMachineFixture({
  bodyBytes = Buffer.from("isolated-material-preflight-fixture", "utf8"),
  profile = objectFreeze({ profileId: "isolated-material-preflight-fixture" }),
  revalidate = async () => {}
} = {}) {
  if (!Buffer.isBuffer(bodyBytes) || typeof revalidate !== "function") fail("TEST_HOOK_INVALID");
  const receipt = objectFreeze({ fixtureOnly: true });
  const capability = objectFreeze({ fixtureOnly: true });
  const receiptBrands = new NativeWeakSet();
  const capabilityBrands = new NativeWeakSet();
  const materialStates = new NativeWeakMap();
  reflectApply(weakSetAdd, receiptBrands, [receipt]);
  reflectApply(weakSetAdd, FIXTURE_RECEIPTS, [receipt]);
  reflectApply(weakSetAdd, capabilityBrands, [capability]);
  reflectApply(weakMapSet, materialStates, [receipt, {
    bodyBytes,
    profile,
    runnerReceipt: receipt,
    inputs: objectFreeze({ fixtureOnly: true }),
    phase: "available",
    activeCapability: null
  }]);
  const receiptIsTrusted = (candidate) => reflectApply(weakSetHas, receiptBrands, [candidate]);
  const capabilityIsTrusted = (candidate) => reflectApply(weakSetHas, capabilityBrands, [candidate]);
  return objectFreeze({
    fixtureReceipt: receipt,
    heldBuffer: bodyBytes,
    async begin() {
      return beginMaterialPreflightState({
        receipt,
        consumerCapability: capability,
        receiptIsTrusted,
        capabilityIsTrusted,
        materialStates
      });
    },
    complete() {
      return completeMaterialPreflightState({
        receipt,
        consumerCapability: capability,
        materialStates,
        revalidate
      });
    },
    abort() {
      return abortMaterialPreflightState({
        receipt,
        consumerCapability: capability,
        materialStates
      });
    },
    hasMaterial() {
      return reflectApply(weakMapGet, materialStates, [receipt]) !== undefined;
    }
  });
}

export const baziPr10aPrivateFileRunnerTestOnly = deepFreeze({
  AUTHORIZATION_FILENAME,
  SOURCE_BODY_FILENAME,
  EXPECTED_INVENTORY,
  SOURCE_PROFILES,
  MAX_AUTHORIZATION_BYTES,
  MAX_SOURCE_BODY_BYTES,
  SUPPORTED_CLOSED_WORLD_SCOPE,
  scopeForProfile,
  verifyFixtureOnly,
  verifyFixtureOnlyWithHook,
  isFixtureOnlyReceipt,
  createIsolatedMaterialPreflightStateMachineFixture,
  parseAuthorization,
  readStablePrivateFile,
  resolvePrivateRoot,
  canonicalStringify,
  sha256Bytes
});
