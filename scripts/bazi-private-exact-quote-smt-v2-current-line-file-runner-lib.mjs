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

export const BAZI_SMT_V2_PRIVATE_FILE_RUNNER_VERSION = "1.0.0";
export const BAZI_SMT_V2_PRIVATE_AUTHORIZATION_SCHEMA_VERSION = "1.0.0";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const FIXED_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, "..");
const AUTHORIZATION_FILENAME = "authorization.json";
const SOURCE_BODY_FILENAME = "source-body.utf8.txt";
const EXPECTED_INVENTORY = Object.freeze([AUTHORIZATION_FILENAME, SOURCE_BODY_FILENAME]);
const MAX_AUTHORIZATION_BYTES = 16 * 1024;
const MAX_SOURCE_BODY_BYTES = 128 * 1024;
const OPEN_READ_ONLY_NO_FOLLOW = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
const AUTHORIZATION_ID = /^auth-[a-f0-9]{32}$/u;
const WINDOWS_LOCAL_DRIVE = /^[A-Za-z]:[\\/]/u;
const NativeWeakSet = WeakSet;
const reflectApply = Reflect.apply;
const reflectOwnKeys = Reflect.ownKeys;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;
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

const FIXED_SCOPE = deepFreeze({
  bindingId: "binding:smt-v10:whole-chart",
  sourceCandidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
  revisionId: 761703,
  topicId: "strength.yueling_exact_quote",
  quoteCandidateId: "smt-v10-yueling-minimal-v1"
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

export class BaziSmtV2PrivateFileRunnerError extends Error {
  constructor(code) {
    super(code);
    this.name = "BaziSmtV2PrivateFileRunnerError";
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
  throw new BaziSmtV2PrivateFileRunnerError(code);
}

function deepFreeze(value, seen = new NativeWeakSet()) {
  if (value === null || typeof value !== "object" || reflectApply(weakSetHas, seen, [value])) return value;
  // Node does not permit freezing non-empty typed-array views. Private byte
  // buffers never escape the production receipt and are copied at read time.
  if (reflectApply(arrayBufferIsView, ArrayBuffer, [value])) return value;
  reflectApply(weakSetAdd, seen, [value]);
  for (const key of reflectApply(reflectOwnKeys, Reflect, [value])) {
    const descriptor = reflectApply(objectGetOwnPropertyDescriptor, Object, [value, key]);
    if (descriptor && reflectApply(objectHasOwn, Object, [descriptor, "value"])) deepFreeze(descriptor.value, seen);
  }
  return reflectApply(objectFreeze, Object, [value]);
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

function parseAuthorization(bytes) {
  let value;
  try {
    value = parseBaziPrivateExactQuoteSmtV2CurrentLineStrictJsonBytes(bytes);
  } catch {
    fail("AUTHORIZATION_JSON_INVALID");
  }
  exactKeys(value, ["schemaVersion", "recordType", "authorizationId", "scope", "authorization"],
    "AUTHORIZATION_SHAPE_INVALID");
  exactKeys(value.scope, ["bindingId", "sourceCandidateId", "revisionId", "topicId", "quoteCandidateId"],
    "AUTHORIZATION_SCOPE_INVALID");
  exactKeys(value.authorization, [
    "materialProviderAffirmsLawfulPossession",
    "localMachinePrivateVerificationAuthorized",
    "repositoryStorageAuthorized",
    "redistributionAuthorized",
    "quotePublicationAuthorized",
    "rightsLegalConclusion"
  ], "AUTHORIZATION_BOUNDARY_INVALID");
  if (value.schemaVersion !== BAZI_SMT_V2_PRIVATE_AUTHORIZATION_SCHEMA_VERSION
    || value.recordType !== "bazi_smt_v2_local_private_verification_authorization"
    || typeof value.authorizationId !== "string" || !AUTHORIZATION_ID.test(value.authorizationId)
    || new Set(value.authorizationId.slice(5)).size < 2) {
    fail("AUTHORIZATION_SHAPE_INVALID");
  }
  if (canonicalStringify(value.scope) !== canonicalStringify(FIXED_SCOPE)) {
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
  return deepFreeze(value);
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
    if (error instanceof BaziSmtV2PrivateFileRunnerError) throw error;
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
    if (error instanceof BaziSmtV2PrivateFileRunnerError) throw error;
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
    primaryError = error instanceof BaziSmtV2PrivateFileRunnerError
      ? error
      : new BaziSmtV2PrivateFileRunnerError("PRIVATE_FILE_READ_FAILED");
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
    if (error instanceof BaziSmtV2PrivateFileRunnerError) throw error;
    fail("PRIVATE_ROOT_INVALID");
  }
}

function snapshotsEqual(left, right) {
  return left.bytesLength === right.bytesLength && left.sha256 === right.sha256;
}

function fixedCurrentLineRequest(authorizationSha256) {
  return {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_SMT_V2_REQUEST_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_smt_v2_current_line_request",
    requestId: `req-${authorizationSha256.slice(0, 32)}`,
    topicId: FIXED_SCOPE.topicId,
    quoteCandidateId: FIXED_SCOPE.quoteCandidateId,
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

function buildReceipt({ authorizationSnapshot, bodySnapshot, currentLineReceipt, fixtureOnly }) {
  const authorizationScopeSha256 = domainDigest(
    "hakimi.bazi.smt-v2.private-file-runner.authorization-scope.v1",
    FIXED_SCOPE
  );
  const currentLine = fixtureOnly ? {
    receiptId: null,
    receiptDigest: null,
    sourceBodySha256: bodySnapshot.sha256,
    sourceBodyUtf8Bytes: bodySnapshot.bytesLength,
    quoteSha256: null,
    currentLineProductionBrandConsumed: false
  } : {
    receiptId: currentLineReceipt.receiptId,
    receiptDigest: currentLineReceipt.receiptDigest,
    sourceBodySha256: currentLineReceipt.materialIntegrity.sourceBodySha256,
    sourceBodyUtf8Bytes: currentLineReceipt.materialIntegrity.sourceBodyUtf8Bytes,
    quoteSha256: currentLineReceipt.materialIntegrity.quoteSha256,
    currentLineProductionBrandConsumed: true
  };
  const seed = {
    runnerVersion: BAZI_SMT_V2_PRIVATE_FILE_RUNNER_VERSION,
    authorizationRawSha256: authorizationSnapshot.sha256,
    authorizationUtf8Bytes: authorizationSnapshot.bytesLength,
    authorizationScopeSha256,
    fixedScope: FIXED_SCOPE,
    currentLine,
    fixtureOnly
  };
  const digest = domainDigest("hakimi.bazi.smt-v2.private-file-runner.receipt.v1", seed);
  return deepFreeze({
    schemaVersion: BAZI_SMT_V2_PRIVATE_FILE_RUNNER_VERSION,
    recordType: fixtureOnly
      ? "bazi_smt_v2_private_file_runner_fixture_only_receipt"
      : "bazi_smt_v2_private_file_runner_redacted_receipt",
    receiptId: `hakimi.bazi.smt-v2.private-file-runner/${digest}`,
    verificationScope: fixtureOnly
      ? "synthetic_file_boundary_fixture_only"
      : "fixed_private_body_integrity_and_self_asserted_local_authorization_only",
    productionRunnerReceipt: !fixtureOnly,
    formalAdmissionEligible: false,
    fixedScope: FIXED_SCOPE,
    authorizationEvidence: {
      authorizationRawSha256: authorizationSnapshot.sha256,
      authorizationUtf8Bytes: authorizationSnapshot.bytesLength,
      authorizationScopeSha256,
      materialProviderLawfulPossessionAffirmationCaptured: true,
      localMachinePrivateVerificationAuthorizationCaptured: true,
      authorizationIsSelfAssertionOnly: true,
      authorizationSignerIdentityEstablished: false,
      authorizationAttributionEstablished: false,
      lawfulPossessionEstablished: false,
      rightsLegalConclusionEstablished: false
    },
    privateMaterialIntegrity: currentLine,
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
  const [authorizationSnapshot, bodySnapshot] = await Promise.all([
    readStablePrivateFile(root.privateReal, AUTHORIZATION_FILENAME, MAX_AUTHORIZATION_BYTES),
    readStablePrivateFile(root.privateReal, SOURCE_BODY_FILENAME, MAX_SOURCE_BODY_BYTES)
  ]);
  parseAuthorization(authorizationSnapshot.bytes);
  return { root, authorizationSnapshot, bodySnapshot };
}

async function revalidatePrivateInputs(initial) {
  await assertNoLinkedDirectoryComponent(initial.root.unresolvedRoot);
  await assertExactInventory(initial.root.privateReal);
  const [authorizationAfter, bodyAfter] = await Promise.all([
    readStablePrivateFile(initial.root.privateReal, AUTHORIZATION_FILENAME, MAX_AUTHORIZATION_BYTES),
    readStablePrivateFile(initial.root.privateReal, SOURCE_BODY_FILENAME, MAX_SOURCE_BODY_BYTES)
  ]);
  const rootAfter = await captureRootIdentity(initial.root.privateReal, "PRIVATE_ROOT_CHANGED");
  if (!identitiesEqual(initial.root.rootIdentity, rootAfter)
    || !snapshotsEqual(initial.authorizationSnapshot, authorizationAfter)
    || !snapshotsEqual(initial.bodySnapshot, bodyAfter)) {
    fail("PRIVATE_INPUT_CHANGED");
  }
  await assertExactInventory(initial.root.privateReal);
}

export async function verifyBaziSmtV2PrivateExactQuoteFromFixedPrivateRoot(privateRoot) {
  const inputs = await readAndValidatePrivateInputs(privateRoot);
  let currentLineReceipt;
  try {
    const capability = await loadBaziPrivateExactQuoteSmtV2CurrentLineSuccessor(FIXED_WORKSPACE_ROOT);
    currentLineReceipt = verifyBaziPrivateExactQuoteSmtV2CurrentLineBytes({
      capability,
      request: fixedCurrentLineRequest(inputs.authorizationSnapshot.sha256),
      sourceBodyBytes: inputs.bodySnapshot.bytes
    });
  } catch {
    fail("CURRENT_LINE_VERIFICATION_FAILED");
  }
  if (!isVerifiedBaziPrivateExactQuoteSmtV2CurrentLineReceipt(currentLineReceipt)) {
    fail("CURRENT_LINE_BRAND_REQUIRED");
  }
  await revalidatePrivateInputs(inputs);
  const receipt = buildReceipt({
    authorizationSnapshot: inputs.authorizationSnapshot,
    bodySnapshot: inputs.bodySnapshot,
    currentLineReceipt,
    fixtureOnly: false
  });
  reflectApply(weakSetAdd, PRODUCTION_RECEIPTS, [receipt]);
  return receipt;
}

export function isVerifiedBaziSmtV2PrivateFileRunnerReceipt(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, PRODUCTION_RECEIPTS, [value]);
}

export function safeBaziSmtV2PrivateFileRunnerCliCode(error) {
  if (!(error instanceof BaziSmtV2PrivateFileRunnerError)) return "VERIFICATION_FAILED";
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
  const receipt = buildReceipt({
    authorizationSnapshot: inputs.authorizationSnapshot,
    bodySnapshot: inputs.bodySnapshot,
    currentLineReceipt: null,
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

export const baziSmtV2PrivateFileRunnerTestOnly = deepFreeze({
  AUTHORIZATION_FILENAME,
  SOURCE_BODY_FILENAME,
  EXPECTED_INVENTORY,
  FIXED_SCOPE,
  MAX_AUTHORIZATION_BYTES,
  MAX_SOURCE_BODY_BYTES,
  verifyFixtureOnly,
  verifyFixtureOnlyWithHook,
  isFixtureOnlyReceipt,
  parseAuthorization,
  readStablePrivateFile,
  resolvePrivateRoot,
  canonicalStringify,
  sha256Bytes
});
