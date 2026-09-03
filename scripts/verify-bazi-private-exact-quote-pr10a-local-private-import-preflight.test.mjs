import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  baziPr10aLocalPrivateImportPreflightTestOnly,
  isVerifiedBaziPr10aLocalPrivateImportPreflightReceipt,
  preflightVerifiedBaziPr10aPrivateFileRunnerReceipt
} from "./bazi-private-exact-quote-pr10a-local-private-import-preflight-lib.mjs";
import {
  beginVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight,
  baziPr10aPrivateFileRunnerTestOnly,
  isVerifiedBaziPr10aPrivateFileRunnerReceipt
} from "./bazi-private-exact-quote-pr10a-current-line-file-runner-lib.mjs";

const SCRIPTS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const LIBRARY_PATH = path.join(
  SCRIPTS_ROOT,
  "bazi-private-exact-quote-pr10a-local-private-import-preflight-lib.mjs"
);

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("reuses the three production knowledge-core exports without workspace Vite configuration", async () => {
  const before = (await readdir(os.tmpdir())).filter((name) => name.startsWith("hakimi-pr10a-knowledge-core-ssr-"));
  const runtime = await baziPr10aLocalPrivateImportPreflightTestOnly.loadProductionKnowledgeCoreRuntime();
  assert.equal(typeof runtime.normalizeKnowledgeContent, "function");
  assert.equal(typeof runtime.buildKnowledgeContentSnapshot, "function");
  assert.equal(typeof runtime.extractKnowledgeQuote, "function");
  assert.deepEqual(runtime.loaderBoundary, {
    loader: "vite_ssr_module_runner_in_memory",
    viteVersion: "7.3.6",
    configFileLoaded: false,
    workspaceViteConfigOrPluginLoaded: false,
    target: "packages/knowledge-core/src/index.ts",
    productionExportsReused: [
      "normalizeKnowledgeContent",
      "buildKnowledgeContentSnapshot",
      "extractKnowledgeQuote"
    ],
    formalBuildOrBrowserRuntimeEstablished: false
  });
  const snapshot = await runtime.buildKnowledgeContentSnapshot("\uFEFF甲\r\n乙", "text");
  assert.equal(snapshot.content, "甲\n乙");
  assert.equal(runtime.extractKnowledgeQuote(snapshot.content, 2, 2), "乙");
  const after = (await readdir(os.tmpdir())).filter((name) => name.startsWith("hakimi-pr10a-knowledge-core-ssr-"));
  assert.deepEqual(after, before);
});

test("projects CRLF and BOM through production normalization and keeps a long-line substring distinct", async () => {
  const minimal = "月令宜与全局同看";
  const longPrefix = "前".repeat(1_200);
  const longSuffix = "后".repeat(1_300);
  const rawText = `\uFEFF序\r\n${longPrefix}${minimal}${longSuffix}\r\n尾`;
  const result = await baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
    rawText,
    quoteDefinitions: [{
      topicId: "strength.yueling_exact_quote",
      quoteCandidateId: "fixture-yueling",
      quoteText: minimal
    }]
  });

  assert.equal(result.knowledgeDocumentPreview.recordType, "user_knowledge_document");
  assert.equal(result.knowledgeDocumentPreview.format, "text");
  assert.equal(result.knowledgeDocumentPreview.lineCount, 3);
  assert.equal(
    result.knowledgeDocumentPreview.rawSourceBodySha256,
    createHash("sha256").update(Buffer.from(rawText, "utf8")).digest("hex")
  );
  assert.notEqual(
    result.knowledgeDocumentPreview.rawSourceBodySha256,
    result.knowledgeDocumentPreview.normalizedContentHash
  );
  assert.equal(result.knowledgeDocumentPreview.normalizedContentUtf8Bytes < Buffer.byteLength(rawText), true);
  assert.deepEqual(result.citationPreviews[0].locator, {
    sectionId: "section-1",
    startLine: 2,
    endLine: 2
  });
  assert.equal(result.citationPreviews[0].minimalQuoteSha256, sha256(minimal));
  assert.notEqual(result.citationPreviews[0].fullLineQuoteSha256, sha256(minimal));
  assert.equal(result.citationPreviews[0].minimalQuoteContainedExactlyOnceWithinFullLineQuote, true);
  assert.equal(result.citationPreviews[0].minimalQuoteEqualsFullLineQuote, false);
  assert.equal(result.citationPreviews[0].minimalQuoteAndFullLineQuoteAreDistinctEvidenceObjects, true);
  assert.equal(
    result.citationPreviews[0].evidenceObjectDistinctnessMeaning,
    "character_range_minimal_quote_pin_and_production_line_range_citation_quote_are_separate_roles_even_when_text_is_equal"
  );
  assert.equal(result.citationPreviews[0].citationPreviewStatus, "user_candidate");
  assert.equal(result.citationPreviews[0].bindingCitationLocatorLinked, false);
  assert.equal(baziPr10aLocalPrivateImportPreflightTestOnly.isFixturePreflightReceipt(result), true);
  assert.equal(isVerifiedBaziPr10aLocalPrivateImportPreflightReceipt(result), false);
});

test("keeps the two evidence roles distinct even when their text happens to be equal", async () => {
  const exactLine = "精确整行";
  const result = await baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
    rawText: exactLine,
    quoteDefinitions: [{ quoteText: exactLine }]
  });
  assert.equal(result.citationPreviews[0].minimalQuoteEqualsFullLineQuote, true);
  assert.equal(result.citationPreviews[0].minimalQuoteAndFullLineQuoteAreDistinctEvidenceObjects, true);
  assert.equal(
    result.citationPreviews[0].evidenceObjectDistinctnessMeaning,
    "character_range_minimal_quote_pin_and_production_line_range_citation_quote_are_separate_roles_even_when_text_is_equal"
  );
});

test("fails closed when the in-memory production module runner cannot close", async () => {
  await assert.rejects(
    baziPr10aLocalPrivateImportPreflightTestOnly.loadProductionKnowledgeCoreRuntimeOnce(async () => ({
      config: { configFile: false },
      moduleGraph: { idToModuleMap: new Map() },
      async ssrLoadModule() {
        return {
          normalizeKnowledgeContent() {},
          async buildKnowledgeContentSnapshot() {},
          extractKnowledgeQuote() {}
        };
      },
      async close() {
        throw new Error("synthetic close failure");
      }
    })),
    (error) => error?.code === "PRODUCTION_KNOWLEDGE_CORE_SERVER_CLOSE_FAILED"
  );
});

test("lazy pinned Vite loading converts loader details to one stable path-free error", async () => {
  const syntheticWorkspacePath = path.join(SCRIPTS_ROOT, "missing-vite-entry.js");
  await assert.rejects(
    baziPr10aLocalPrivateImportPreflightTestOnly.loadProductionKnowledgeCoreRuntimeOnce(
      undefined,
      rm,
      async () => {
        const error = new Error(`cannot import ${syntheticWorkspacePath}`);
        error.path = syntheticWorkspacePath;
        throw error;
      }
    ),
    (error) => error?.code === "PRODUCTION_KNOWLEDGE_CORE_LOAD_FAILED"
      && error.path === undefined
      && !error.message.includes(syntheticWorkspacePath)
  );
});

test("runtime single-flight clears only a rejected attempt and then caches success", async () => {
  let calls = 0;
  const expected = Object.freeze({ runtime: "fixture-only" });
  const load = baziPr10aLocalPrivateImportPreflightTestOnly.createResettableRuntimeLoader(async () => {
    calls += 1;
    if (calls === 1) throw new Error("synthetic first-attempt failure");
    return expected;
  });
  const first = load();
  assert.strictEqual(load(), first);
  await assert.rejects(first, /synthetic first-attempt failure/u);
  const second = load();
  assert.notStrictEqual(second, first);
  assert.strictEqual(await second, expected);
  assert.strictEqual(load(), second);
  assert.equal(calls, 2);
});

test("converts controlled temp cleanup failures to a stable path-free error", async () => {
  const cacheDirectory = path.join(
    os.tmpdir(),
    `hakimi-pr10a-knowledge-core-ssr-${randomUUID()}`
  );
  await mkdir(cacheDirectory);
  try {
    await assert.rejects(
      baziPr10aLocalPrivateImportPreflightTestOnly.cleanupControlledTempCache(
        cacheDirectory,
        async () => {
          const error = new Error(`cannot remove ${cacheDirectory}`);
          error.path = cacheDirectory;
          throw error;
        }
      ),
      (error) => error?.code === "TEMP_CACHE_CLEANUP_FAILED"
        && error.path === undefined
        && !error.message.includes(cacheDirectory)
    );
  } finally {
    await rm(cacheDirectory, { recursive: true, force: true });
  }
});

test("rejects quote hash and line-locator drift before issuing a fixture receipt", async () => {
  const rawText = "序\r\n前缀根气原句后缀\r\n尾";
  await assert.rejects(
    baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
      rawText,
      quoteDefinitions: [{ quoteText: "根气原句" }],
      mutateProfile(profile) {
        profile.quoteScopes[0].quoteSha256 = "f".repeat(64);
      }
    }),
    (error) => error?.code === "MINIMAL_QUOTE_IDENTITY_MISMATCH"
  );
  await assert.rejects(
    baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
      rawText,
      quoteDefinitions: [{ quoteText: "根气原句" }],
      mutateProfile(profile) {
        profile.quoteScopes[0].rawRevisionLineStart = 1;
      }
    }),
    (error) => error?.code === "MINIMAL_QUOTE_LINE_LOCATOR_MISMATCH"
  );
});

test("fixture, clone and serialized runner receipts cannot consume production private material", async (t) => {
  const profile = baziPr10aPrivateFileRunnerTestOnly.SOURCE_PROFILES["smt-r761703"];
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-pr10a-preflight-fixture-"));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  const authorization = {
    schemaVersion: "1.0.0",
    recordType: "bazi_pr10a_local_private_verification_authorization",
    authorizationId: "auth-0123456789abcdef0123456789abcdef",
    scope: clone(baziPr10aPrivateFileRunnerTestOnly.scopeForProfile(profile)),
    authorization: {
      materialProviderAffirmsLawfulPossession: true,
      localMachinePrivateVerificationAuthorized: true,
      repositoryStorageAuthorized: false,
      redistributionAuthorized: false,
      quotePublicationAuthorized: false,
      rightsLegalConclusion: "not_established"
    }
  };
  await writeFile(path.join(root, "authorization.json"), JSON.stringify(authorization));
  await writeFile(path.join(root, "source-body.utf8.txt"), Buffer.alloc(profile.expectedSourceBodyUtf8Bytes, 0x53));
  const fixtureReceipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(root);
  assert.equal(baziPr10aPrivateFileRunnerTestOnly.isFixtureOnlyReceipt(fixtureReceipt), true);
  for (const candidate of [fixtureReceipt, clone(fixtureReceipt), JSON.parse(JSON.stringify(fixtureReceipt))]) {
    await assert.rejects(
      preflightVerifiedBaziPr10aPrivateFileRunnerReceipt(candidate),
      (error) => error?.code === "RUNNER_RECEIPT_BRAND_REQUIRED"
    );
  }
  await assert.rejects(
    beginVerifiedBaziPr10aPrivateFileRunnerMaterialPreflight(fixtureReceipt, {}),
    (error) => error?.code === "PRIVATE_IMPORT_PREFLIGHT_CAPABILITY_REQUIRED"
  );
});

test("isolated runner lease uses the exact held Buffer, rejects a concurrent begin, and permits abort retry", async () => {
  const heldBuffer = Buffer.from("same-held-buffer-fixture", "utf8");
  let revalidations = 0;
  const harness = baziPr10aPrivateFileRunnerTestOnly.createIsolatedMaterialPreflightStateMachineFixture({
    bodyBytes: heldBuffer,
    revalidate: async () => { revalidations += 1; }
  });
  assert.equal(baziPr10aPrivateFileRunnerTestOnly.isFixtureOnlyReceipt(harness.fixtureReceipt), true);
  assert.equal(isVerifiedBaziPr10aPrivateFileRunnerReceipt(harness.fixtureReceipt), false);

  const attempts = await Promise.allSettled([harness.begin(), harness.begin()]);
  const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
  const rejected = attempts.filter((attempt) => attempt.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.strictEqual(fulfilled[0].value.bodyBytes, heldBuffer);
  assert.strictEqual(fulfilled[0].value.bodyBytes, harness.heldBuffer);
  assert.strictEqual(fulfilled[0].value.runnerReceipt, harness.fixtureReceipt);
  assert.equal(rejected[0].reason?.code, "PRIVATE_IMPORT_PREFLIGHT_MATERIAL_UNAVAILABLE");

  assert.equal(harness.abort(), true);
  const retried = await harness.begin();
  assert.strictEqual(retried.bodyBytes, heldBuffer);
  await harness.complete();
  assert.equal(revalidations, 1);
  assert.equal(harness.hasMaterial(), false);
  assert.equal(harness.abort(), false);
  await assert.rejects(
    harness.begin(),
    (error) => error?.code === "PRIVATE_IMPORT_PREFLIGHT_MATERIAL_UNAVAILABLE"
  );
});

test("post-projection revalidation enters completing and destroys a drifted lease without receipt recovery", async () => {
  let signalEntered;
  const entered = new Promise((resolve) => { signalEntered = resolve; });
  let releaseRevalidation;
  const revalidationGate = new Promise((resolve) => { releaseRevalidation = resolve; });
  const drift = new Error("PRIVATE_INPUT_CHANGED");
  drift.code = "PRIVATE_INPUT_CHANGED";
  const harness = baziPr10aPrivateFileRunnerTestOnly.createIsolatedMaterialPreflightStateMachineFixture({
    revalidate: async () => {
      signalEntered();
      await revalidationGate;
      throw drift;
    }
  });
  await harness.begin();
  const completing = harness.complete();
  await entered;
  assert.equal(harness.abort(), false);
  releaseRevalidation();
  await assert.rejects(completing, (error) => error === drift);
  assert.equal(harness.hasMaterial(), false);
  await assert.rejects(
    harness.begin(),
    (error) => error?.code === "PRIVATE_IMPORT_PREFLIGHT_MATERIAL_UNAVAILABLE"
  );
});

test("redacted projection leaks no body, minimal quote, full line, path or authorization material", async () => {
  const authorizationCanary = "auth-fedcba9876543210fedcba9876543210";
  const pathCanary = "C:\\private-canary\\source-body.utf8.txt";
  const minimal = "透干私密引文鹰哨";
  const prefix = "完整行前缀鹰哨";
  const suffix = "完整行后缀鹰哨";
  const fullLine = `${prefix}${minimal}${suffix}`;
  const result = await baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
    rawText: `序\n${fullLine}\n尾`,
    quoteDefinitions: [{ quoteText: minimal }]
  });
  const serialized = JSON.stringify(result);
  for (const forbidden of [authorizationCanary, pathCanary, minimal, fullLine, prefix, suffix]) {
    assert.equal(serialized.includes(forbidden), false);
  }
  assert.deepEqual(result.redactionBoundary, {
    sourceBodyReturned: false,
    minimalQuoteTextReturned: false,
    fullLineQuoteTextReturned: false,
    privateRootReturned: false,
    sourcePathReturned: false,
    authorizationIdReturned: false,
    authorizationRawDigestReturned: false
  });
  assert.equal(Object.hasOwn(result.knowledgeDocumentPreview, "content"), false);
  assert.equal(Object.hasOwn(result.citationPreviews[0], "quote"), false);
});

test("preview and every formal, authority, rights, release and epoch gate remain fail-closed", async () => {
  const result = await baziPr10aLocalPrivateImportPreflightTestOnly.projectSyntheticFixture({
    rawText: "前缀阈值观察后缀",
    quoteDefinitions: [{ quoteText: "阈值观察" }]
  });
  assert.deepEqual(result.sourceRightsPreview, {
    origin: "user_import",
    status: "user_unverified",
    workStatus: "unknown",
    editionStatus: "unknown",
    basis: "user_declaration",
    distributionPolicy: "local_private_only",
    reviewStatus: "unreviewed",
    formalSourceRightsRecordCreated: false,
    rightsLegalConclusionEstablished: false
  });
  assert.deepEqual(result.counts, {
    formalKnowledgeDocuments: 0,
    verifiedCitations: 0,
    bindingCitationLocatorLinks: 0,
    bindingsFrozen: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    rightsLegalReviews: 0,
    domainExpertReviews: 0
  });
  assert.equal(Object.values(result.authorityBoundary).includes(true), false);
  assert.equal(result.mutationBoundary.mutationEpochReceipt, null);
  assert.equal(Object.values(result.mutationBoundary).some((value) => value === true), false);
  assert.deepEqual(result.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(result.formalAdmissionEligible, false);
  assert.equal(result.safeToPublish, false);
  assert.deepEqual(result.runnerInputBoundary, {
    sameProcessProductionRunnerReceiptBrandConsumed: false,
    sameHeldBufferFromRunnerConsumed: false,
    privateInputRevalidatedAfterProjection: false,
    fixtureMaySatisfyProductionBoundary: false,
    serializedOrClonedReceiptAccepted: false
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.authorityBoundary), true);
  assert.throws(() => { result.authorityBoundary.bindingFrozen = true; }, TypeError);
  assert.equal(baziPr10aLocalPrivateImportPreflightTestOnly.isFixturePreflightReceipt(clone(result)), false);
  assert.equal(isVerifiedBaziPr10aLocalPrivateImportPreflightReceipt(clone(result)), false);
});

test("implementation has no storage/private-root/repository write primitive and only permits guarded temp cleanup", async () => {
  const source = await readFile(LIBRARY_PATH, "utf8");
  for (const primitive of ["writeFile", "appendFile", "rename", "unlink", "copyFile", "indexedDB", "localStorage"] ) {
    assert.equal(source.includes(primitive), false);
  }
  assert.equal(source.includes("configFile: false"), true);
  assert.equal(source.includes("middlewareMode: true"), true);
  assert.equal(source.includes('appType: "custom"'), true);
  assert.equal(source.includes("cleanupControlledTempCache"), true);
  assert.equal(source.includes("RESTRICTED_SOURCE"), true);
});
