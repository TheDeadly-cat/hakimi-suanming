import { createHash, randomUUID } from "node:crypto";
import { lstat, realpath, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  abortVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight,
  beginVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight,
  completeVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight,
  verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot
} from "./bazi-private-exact-quote-pr10a-current-line-file-runner-lib.mjs";

export const BAZI_PR10A_LOCAL_PRIVATE_IMPORT_PREFLIGHT_VERSION = "1.0.0";

const MODULE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const FIXED_WORKSPACE_ROOT = path.resolve(MODULE_DIRECTORY, "..");
const PRODUCTION_KNOWLEDGE_CORE_ENTRY = "packages/knowledge-core/src/index.ts";
const RESTRICTED_SOURCE = "apps/web/src/lib/local-user-data-cleanup.ts";
const TEMP_CACHE_PREFIX = "hakimi-pr10a-knowledge-core-ssr-";
const PINNED_WEB_VITE_VERSION = "7.3.6";
const SHA256 = /^[a-f0-9]{64}$/u;

const NativeWeakSet = WeakSet;
const reflectApply = Reflect.apply;
const weakSetAdd = WeakSet.prototype.add;
const weakSetHas = WeakSet.prototype.has;
const objectFreeze = Object.freeze;
const objectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const objectHasOwn = Object.hasOwn;
const reflectOwnKeys = Reflect.ownKeys;
const arrayBufferIsView = ArrayBuffer.isView;
const NativeTextDecoder = TextDecoder;
const NativeTextEncoder = TextEncoder;
const stringIndexOf = String.prototype.indexOf;
const stringSlice = String.prototype.slice;
const stringSplit = String.prototype.split;
const bufferByteLength = Buffer.byteLength;

const PRODUCTION_PREFLIGHT_RECEIPTS = new NativeWeakSet();
const FIXTURE_PREFLIGHT_RECEIPTS = new NativeWeakSet();
const CONSUMER_CAPABILITIES = new NativeWeakSet();

export class BaziPr10aLocalPrivateImportPreflightError extends Error {
  constructor(code) {
    super(code);
    this.name = "BaziPr10aLocalPrivateImportPreflightError";
    Object.defineProperty(this, "code", {
      value: code,
      enumerable: false,
      configurable: false,
      writable: false
    });
  }
}

function fail(code) {
  throw new BaziPr10aLocalPrivateImportPreflightError(code);
}

function deepFreeze(value, seen = new NativeWeakSet()) {
  if (value === null || typeof value !== "object" || reflectApply(weakSetHas, seen, [value])) return value;
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

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalPath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function pathIsSameOrWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function moduleIdToAbsolutePath(id) {
  if (typeof id !== "string" || id.length === 0 || id.startsWith("\0")) return null;
  const withoutQuery = id.split("?", 1)[0];
  if (withoutQuery.startsWith("/packages/") || withoutQuery.startsWith("/apps/")) {
    return path.resolve(FIXED_WORKSPACE_ROOT, withoutQuery.slice(1));
  }
  if (withoutQuery.startsWith("file://")) {
    try {
      return fileURLToPath(withoutQuery);
    } catch {
      return null;
    }
  }
  return path.isAbsolute(withoutQuery) ? path.resolve(withoutQuery) : null;
}

function assertAllowedWorkspaceModule(id) {
  const absolute = moduleIdToAbsolutePath(id);
  if (!absolute) return;
  const workspace = canonicalPath(FIXED_WORKSPACE_ROOT);
  const candidate = canonicalPath(absolute);
  if (!pathIsSameOrWithin(workspace, candidate)) return;
  if (candidate === canonicalPath(path.join(workspace, ...RESTRICTED_SOURCE.split("/")))) {
    fail("RESTRICTED_SOURCE_LOAD_FORBIDDEN");
  }
  if (candidate === canonicalPath(path.join(workspace, "index.html"))) return;
  const allowedRoots = [
    path.join(workspace, "packages", "knowledge-core"),
    path.join(workspace, "packages", "contracts"),
    path.join(workspace, "packages", "integrity"),
    path.join(workspace, "packages", "tzdb-core"),
    path.join(workspace, "node_modules")
  ];
  if (!allowedRoots.some((root) => pathIsSameOrWithin(root, candidate))) {
    fail("PRODUCTION_KNOWLEDGE_CORE_MODULE_GRAPH_ESCAPED");
  }
}

function assertWorkspaceLoadTarget(id) {
  const absolute = moduleIdToAbsolutePath(id);
  if (absolute
    && canonicalPath(absolute) === canonicalPath(path.join(FIXED_WORKSPACE_ROOT, "index.html"))) {
    fail("WORKSPACE_ENTRY_LOAD_FORBIDDEN");
  }
  assertAllowedWorkspaceModule(id);
}

async function cleanupControlledTempCache(cacheDirectory, removeDirectory = rm) {
  const resolvedTempRoot = path.resolve(os.tmpdir());
  const resolvedCache = path.resolve(cacheDirectory);
  const leaf = path.basename(resolvedCache);
  if (canonicalPath(path.dirname(resolvedCache)) !== canonicalPath(resolvedTempRoot)
    || !new RegExp(`^${TEMP_CACHE_PREFIX}[a-f0-9-]{36}$`, "u").test(leaf)) {
    fail("TEMP_CACHE_BOUNDARY_INVALID");
  }
  let entry;
  try {
    entry = await lstat(resolvedCache);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    fail("TEMP_CACHE_INSPECTION_FAILED");
  }
  if (!entry.isDirectory() || entry.isSymbolicLink()) fail("TEMP_CACHE_ENDPOINT_INVALID");
  let actual;
  try {
    actual = await realpath(resolvedCache);
  } catch {
    fail("TEMP_CACHE_ENDPOINT_INVALID");
  }
  if (canonicalPath(actual) !== canonicalPath(resolvedCache)
    || canonicalPath(path.dirname(actual)) !== canonicalPath(resolvedTempRoot)) {
    fail("TEMP_CACHE_ENDPOINT_INVALID");
  }
  try {
    await removeDirectory(resolvedCache, { recursive: true, force: false });
  } catch {
    fail("TEMP_CACHE_CLEANUP_FAILED");
  }
}

function assertProductionKnowledgeCoreExports(module) {
  for (const name of [
    "normalizeKnowledgeContent",
    "buildKnowledgeContentSnapshot",
    "extractKnowledgeQuote"
  ]) {
    if (typeof module?.[name] !== "function") fail("PRODUCTION_KNOWLEDGE_CORE_EXPORT_MISSING");
  }
}

async function loadProductionKnowledgeCoreRuntimeOnce(
  serverFactory,
  removeDirectory = rm,
  viteModuleLoader = () => import("../apps/web/node_modules/vite/dist/node/index.js")
) {
  let selectedServerFactory = serverFactory;
  let selectedViteVersion = "test-double";
  if (selectedServerFactory === undefined) {
    let viteModule;
    try {
      viteModule = await viteModuleLoader();
    } catch {
      fail("PRODUCTION_KNOWLEDGE_CORE_LOAD_FAILED");
    }
    if (typeof viteModule?.createServer !== "function") {
      fail("PRODUCTION_KNOWLEDGE_CORE_LOAD_FAILED");
    }
    if (viteModule.version !== PINNED_WEB_VITE_VERSION) {
      fail("PINNED_WEB_VITE_VERSION_MISMATCH");
    }
    selectedServerFactory = viteModule.createServer;
    selectedViteVersion = viteModule.version;
  }
  const cacheDirectory = path.join(os.tmpdir(), `${TEMP_CACHE_PREFIX}${randomUUID()}`);
  let server;
  let closeFailed = false;
  try {
    server = await selectedServerFactory({
      root: FIXED_WORKSPACE_ROOT,
      configFile: false,
      cacheDir: cacheDirectory,
      logLevel: "silent",
      clearScreen: false,
      appType: "custom",
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null
      },
      optimizeDeps: {
        noDiscovery: true,
        include: []
      },
      plugins: [{
        name: "hakimi-pr10a-production-knowledge-core-read-boundary",
        enforce: "pre",
        resolveId(source, importer) {
          assertAllowedWorkspaceModule(source);
          assertAllowedWorkspaceModule(importer);
          return null;
        },
        load(id) {
          assertWorkspaceLoadTarget(id);
          return null;
        }
      }]
    });
    if (server.config.configFile !== undefined && server.config.configFile !== false) {
      fail("WORKSPACE_VITE_CONFIG_LOADED");
    }
    const runtime = await server.ssrLoadModule(`/${PRODUCTION_KNOWLEDGE_CORE_ENTRY}`);
    assertProductionKnowledgeCoreExports(runtime);
    for (const moduleNode of server.moduleGraph.idToModuleMap.values()) {
      assertAllowedWorkspaceModule(moduleNode.id);
      assertAllowedWorkspaceModule(moduleNode.file);
    }
    return objectFreeze({
      normalizeKnowledgeContent: runtime.normalizeKnowledgeContent,
      buildKnowledgeContentSnapshot: runtime.buildKnowledgeContentSnapshot,
      extractKnowledgeQuote: runtime.extractKnowledgeQuote,
      loaderBoundary: objectFreeze({
        loader: "vite_ssr_module_runner_in_memory",
        viteVersion: selectedViteVersion,
        configFileLoaded: false,
        workspaceViteConfigOrPluginLoaded: false,
        target: PRODUCTION_KNOWLEDGE_CORE_ENTRY,
        productionExportsReused: objectFreeze([
          "normalizeKnowledgeContent",
          "buildKnowledgeContentSnapshot",
          "extractKnowledgeQuote"
        ]),
        formalBuildOrBrowserRuntimeEstablished: false
      })
    });
  } catch (error) {
    if (error instanceof BaziPr10aLocalPrivateImportPreflightError) throw error;
    fail("PRODUCTION_KNOWLEDGE_CORE_LOAD_FAILED");
  } finally {
    if (server) {
      try {
        await server.close();
      } catch {
        closeFailed = true;
      }
    }
    await cleanupControlledTempCache(cacheDirectory, removeDirectory);
    if (closeFailed) fail("PRODUCTION_KNOWLEDGE_CORE_SERVER_CLOSE_FAILED");
  }
}

function createResettableRuntimeLoader(loadOnce) {
  let runtimePromise;
  return function loadRuntime() {
    if (!runtimePromise) {
      const pending = Promise.resolve().then(loadOnce);
      runtimePromise = pending;
      pending.catch(() => {
        if (runtimePromise === pending) runtimePromise = undefined;
      });
    }
    return runtimePromise;
  }
}

const loadProductionKnowledgeCoreRuntime = createResettableRuntimeLoader(
  loadProductionKnowledgeCoreRuntimeOnce
);

export function isVerifiedBaziPr10aLocalPrivateImportPreflightConsumerCapability(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, CONSUMER_CAPABILITIES, [value]);
}

function normalizedPrefixLineNumber(runtime, rawPrefix) {
  const normalized = runtime.normalizeKnowledgeContent(`${rawPrefix}X`);
  return reflectApply(stringSplit, normalized, ["\n"]).length;
}

function exactCurrentLineScope(receipt, profile, rawBodySha256) {
  if (receipt?.fixedSourceScope?.profileId !== profile?.profileId
    || receipt.fixedSourceScope.bindingId !== profile.bindingId
    || receipt.fixedSourceScope.evidenceSubjectId !== profile.evidenceSubjectId
    || receipt.fixedSourceScope.sourceCandidateId !== profile.sourceCandidateId
    || receipt.privateMaterialIntegrity?.sourceBodySha256 !== profile.expectedSourceBodySha256
    || receipt.privateMaterialIntegrity?.sourceBodySha256 !== rawBodySha256
    || receipt.privateMaterialIntegrity?.sourceBodyUtf8Bytes !== profile.expectedSourceBodyUtf8Bytes
    || !SHA256.test(receipt.receiptDigest ?? "")) {
    fail("RUNNER_RECEIPT_SCOPE_MISMATCH");
  }
}

async function projectLocalPrivateImport(material, runtime, fixtureOnly) {
  const { bodyBytes, profile, runnerReceipt } = material;
  if (!Buffer.isBuffer(bodyBytes) || Object.getPrototypeOf(bodyBytes) !== Buffer.prototype) {
    fail("PRIVATE_BODY_BUFFER_INVALID");
  }
  const rawBodySha256 = sha256Bytes(bodyBytes);
  if (!fixtureOnly) exactCurrentLineScope(runnerReceipt, profile, rawBodySha256);

  let rawText;
  try {
    rawText = new NativeTextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bodyBytes);
  } catch {
    fail("PRIVATE_BODY_UTF8_INVALID");
  }
  const snapshot = await runtime.buildKnowledgeContentSnapshot(rawText, "text");
  if (!snapshot || typeof snapshot.content !== "string" || !SHA256.test(snapshot.contentHash)
    || snapshot.sections?.length !== 1 || snapshot.sections[0]?.id !== "section-1"
    || snapshot.sections[0]?.startLine !== 1 || snapshot.sections[0]?.endLine !== snapshot.lineCount) {
    fail("PRODUCTION_KNOWLEDGE_SNAPSHOT_INVALID");
  }

  const citations = [];
  for (const quoteScope of profile.quoteScopes) {
    const rawQuote = reflectApply(stringSlice, rawText, [
      quoteScope.rawCharacterStartZeroBased,
      quoteScope.rawCharacterEndExclusive
    ]);
    const quoteBytes = new NativeTextEncoder().encode(rawQuote);
    if (rawQuote.length !== quoteScope.quoteCharacters
      || quoteBytes.byteLength !== quoteScope.quoteUtf8Bytes
      || sha256Text(rawQuote) !== quoteScope.quoteSha256) {
      fail("MINIMAL_QUOTE_IDENTITY_MISMATCH");
    }
    const computedStartLine = normalizedPrefixLineNumber(
      runtime,
      reflectApply(stringSlice, rawText, [0, quoteScope.rawCharacterStartZeroBased])
    );
    const computedEndLine = normalizedPrefixLineNumber(
      runtime,
      reflectApply(stringSlice, rawText, [0, quoteScope.rawCharacterEndExclusive - 1])
    );
    if (computedStartLine !== quoteScope.rawRevisionLineStart
      || computedEndLine !== quoteScope.rawRevisionLineEnd) {
      fail("MINIMAL_QUOTE_LINE_LOCATOR_MISMATCH");
    }

    const normalizedMinimalQuote = runtime.normalizeKnowledgeContent(rawQuote);
    const fullLineQuote = runtime.extractKnowledgeQuote(
      snapshot.content,
      quoteScope.rawRevisionLineStart,
      quoteScope.rawRevisionLineEnd
    );
    const firstOffset = reflectApply(stringIndexOf, fullLineQuote, [normalizedMinimalQuote]);
    const secondOffset = firstOffset < 0
      ? -1
      : reflectApply(stringIndexOf, fullLineQuote, [normalizedMinimalQuote, firstOffset + 1]);
    if (firstOffset < 0 || secondOffset >= 0) fail("MINIMAL_QUOTE_FULL_LINE_CONTAINMENT_MISMATCH");

    citations.push({
      topicId: quoteScope.topicId,
      quoteCandidateId: quoteScope.quoteCandidateId,
      rightsCandidateId: quoteScope.rightsCandidateId,
      evidenceSubjectId: profile.evidenceSubjectId,
      locator: {
        sectionId: "section-1",
        startLine: quoteScope.rawRevisionLineStart,
        endLine: quoteScope.rawRevisionLineEnd
      },
      minimalQuoteSha256: quoteScope.quoteSha256,
      minimalQuoteUtf8Bytes: quoteScope.quoteUtf8Bytes,
      fullLineQuoteSha256: sha256Text(fullLineQuote),
      fullLineQuoteUtf8Bytes: reflectApply(bufferByteLength, Buffer, [fullLineQuote, "utf8"]),
      minimalQuoteContainedExactlyOnceWithinFullLineQuote: true,
      minimalQuoteEqualsFullLineQuote: normalizedMinimalQuote === fullLineQuote,
      minimalQuoteAndFullLineQuoteAreDistinctEvidenceObjects: true,
      evidenceObjectDistinctnessMeaning:
        "character_range_minimal_quote_pin_and_production_line_range_citation_quote_are_separate_roles_even_when_text_is_equal",
      citationPreviewStatus: "user_candidate",
      quoteTextReturned: false,
      bindingCitationLocatorLinked: false
    });
  }

  const seed = {
    schemaVersion: BAZI_PR10A_LOCAL_PRIVATE_IMPORT_PREFLIGHT_VERSION,
    recordType: fixtureOnly
      ? "bazi_pr10a_local_private_import_preflight_fixture_receipt"
      : "bazi_pr10a_local_private_import_preflight_receipt",
    sourceVerificationReceiptDigest: fixtureOnly ? null : runnerReceipt.receiptDigest,
    profileId: profile.profileId,
    bindingId: profile.bindingId,
    evidenceSubjectId: profile.evidenceSubjectId,
    sourceCandidateId: profile.sourceCandidateId,
    knowledgeDocumentPreview: {
      recordType: "user_knowledge_document",
      format: "text",
      rawSourceBodySha256: rawBodySha256,
      rawSourceBodyUtf8Bytes: bodyBytes.byteLength,
      normalizedContentHash: snapshot.contentHash,
      normalizedContentUtf8Bytes: reflectApply(bufferByteLength, Buffer, [snapshot.content, "utf8"]),
      lineCount: snapshot.lineCount,
      sectionCount: snapshot.sections.length,
      sections: snapshot.sections.map((section) => ({
        id: section.id,
        level: section.level,
        startLine: section.startLine,
        endLine: section.endLine
      })),
      contentReturned: false,
      documentRecordCreated: false
    },
    sourceRightsPreview: {
      origin: "user_import",
      status: "user_unverified",
      workStatus: "unknown",
      editionStatus: "unknown",
      basis: "user_declaration",
      distributionPolicy: "local_private_only",
      reviewStatus: "unreviewed",
      formalSourceRightsRecordCreated: false,
      rightsLegalConclusionEstablished: false
    },
    citationPreviews: citations,
    runnerInputBoundary: {
      sameProcessProductionRunnerReceiptBrandConsumed: !fixtureOnly,
      sameHeldBufferFromRunnerConsumed: !fixtureOnly,
      privateInputRevalidatedAfterProjection: !fixtureOnly,
      fixtureMaySatisfyProductionBoundary: false,
      serializedOrClonedReceiptAccepted: false
    },
    productionKnowledgeCoreReuse: runtime.loaderBoundary,
    redactionBoundary: {
      sourceBodyReturned: false,
      minimalQuoteTextReturned: false,
      fullLineQuoteTextReturned: false,
      privateRootReturned: false,
      sourcePathReturned: false,
      authorizationIdReturned: false,
      authorizationRawDigestReturned: false
    },
    counts: {
      formalKnowledgeDocuments: 0,
      verifiedCitations: 0,
      bindingCitationLocatorLinks: 0,
      bindingsFrozen: 0,
      formalSourceRightsRecords: 0,
      formalSourceCarrierRecords: 0,
      projectCopyMaterializationRecords: 0,
      rightsLegalReviews: 0,
      domainExpertReviews: 0
    },
    authorityBoundary: {
      formalDocumentCreated: false,
      verifiedCitationCreated: false,
      bindingCitationLocatorLinked: false,
      bindingFrozen: false,
      sourceIdentityAdjudicated: false,
      rightsLegalConclusionEstablished: false,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    },
    mutationBoundary: {
      repositoryWritePerformed: false,
      privateRootWritePerformed: false,
      storageWritePerformed: false,
      schema13MutationPerformed: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      crossFileAtomicSnapshot: false,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    formalAdmissionEligible: false,
    safeToPublish: false
  };
  const preflightDigest = sha256Text(
    `hakimi.bazi.pr10a.local-private-import-preflight.v1\0${JSON.stringify(seed)}`
  );
  return deepFreeze({
    ...seed,
    preflightDigest
  });
}

export async function preflightVerifiedBaziPr10aPrivateFileRunnerReceipt(receipt) {
  const runtime = await loadProductionKnowledgeCoreRuntime();
  const capability = objectFreeze({});
  reflectApply(weakSetAdd, CONSUMER_CAPABILITIES, [capability]);
  let material;
  try {
    material = await beginVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(receipt, capability);
  } catch {
    fail("RUNNER_RECEIPT_BRAND_REQUIRED");
  }
  let result;
  try {
    result = await projectLocalPrivateImport(material, runtime, false);
    await completeVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(receipt, capability);
  } catch (error) {
    abortVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(receipt, capability);
    throw error;
  }
  reflectApply(weakSetAdd, PRODUCTION_PREFLIGHT_RECEIPTS, [result]);
  return result;
}

export async function verifyBaziPr10aLocalPrivateImportPreflightFromFixedPrivateRoot(privateRoot) {
  const receipt = await verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot(privateRoot);
  return preflightVerifiedBaziPr10aPrivateFileRunnerReceipt(receipt);
}

export function isVerifiedBaziPr10aLocalPrivateImportPreflightReceipt(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, PRODUCTION_PREFLIGHT_RECEIPTS, [value]);
}

function buildFixtureProfile(rawText, quoteDefinitions, runtime) {
  const quoteScopes = quoteDefinitions.map((definition, index) => {
    const start = reflectApply(stringIndexOf, rawText, [definition.quoteText]);
    const second = start < 0 ? -1 : reflectApply(stringIndexOf, rawText, [definition.quoteText, start + 1]);
    if (start < 0 || second >= 0) fail("FIXTURE_QUOTE_NOT_UNIQUE");
    const prefix = reflectApply(stringSlice, rawText, [0, start]);
    const rawLine = normalizedPrefixLineNumber(runtime, prefix);
    return {
      topicId: definition.topicId ?? `fixture.topic.${index + 1}`,
      quoteCandidateId: definition.quoteCandidateId ?? `fixture-quote-${index + 1}`,
      rightsCandidateId: definition.rightsCandidateId ?? `fixture-rights-${index + 1}`,
      rawRevisionLineStart: rawLine,
      rawRevisionLineEnd: rawLine,
      rawCharacterStartZeroBased: start,
      rawCharacterEndExclusive: start + definition.quoteText.length,
      quoteCharacters: definition.quoteText.length,
      quoteUtf8Bytes: reflectApply(bufferByteLength, Buffer, [definition.quoteText, "utf8"]),
      quoteSha256: sha256Text(definition.quoteText)
    };
  });
  return {
    profileId: "fixture-profile",
    bindingId: "binding:fixture:private-import-preflight",
    evidenceSubjectId: "bazi.strength.binding.fixture.private-import-preflight.v1",
    sourceCandidateId: "fixture-source-candidate",
    expectedSourceBodyUtf8Bytes: reflectApply(bufferByteLength, Buffer, [rawText, "utf8"]),
    expectedSourceBodySha256: sha256Text(rawText),
    quoteScopes
  };
}

async function projectSyntheticFixture({ rawText, quoteDefinitions, mutateProfile }) {
  const runtime = await loadProductionKnowledgeCoreRuntime();
  const profile = buildFixtureProfile(rawText, quoteDefinitions, runtime);
  if (mutateProfile) mutateProfile(profile);
  const result = await projectLocalPrivateImport({
    bodyBytes: Buffer.from(rawText, "utf8"),
    profile,
    runnerReceipt: null
  }, runtime, true);
  reflectApply(weakSetAdd, FIXTURE_PREFLIGHT_RECEIPTS, [result]);
  return result;
}

function isFixturePreflightReceipt(value) {
  return value !== null && typeof value === "object"
    && reflectApply(weakSetHas, FIXTURE_PREFLIGHT_RECEIPTS, [value]);
}

export const baziPr10aLocalPrivateImportPreflightTestOnly = objectFreeze({
  projectSyntheticFixture,
  isFixturePreflightReceipt,
  createResettableRuntimeLoader,
  loadProductionKnowledgeCoreRuntime,
  loadProductionKnowledgeCoreRuntimeOnce,
  cleanupControlledTempCache,
  PRODUCTION_KNOWLEDGE_CORE_ENTRY,
  RESTRICTED_SOURCE
});
