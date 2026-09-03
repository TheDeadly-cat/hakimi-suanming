import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_REQUEST_SCHEMA_VERSION,
  CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP,
  assertExactCurrentFirstThreeTopicMap,
  validatePrivateExactQuoteVersionAwareCandidateRequest,
  parsePrivateExactQuoteVersionAwareCandidateRequestBytes,
  verifyCurrentCandidateUtf8QuoteMaterialAgainstLock,
  verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles,
  isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt,
  baziPrivateExactQuoteVersionAwareCandidateTestOnly
} from "./bazi-private-exact-quote-version-aware-candidate-lib.mjs";
import * as candidateModuleNamespace from "./bazi-private-exact-quote-version-aware-candidate-lib.mjs";
import {
  isVerifiedBaziDttVersionedParentSupersession
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  isVerifiedBaziDttNoticeReconciliationV2,
  isVerifiedBaziBindingFreezeRequirementsV17
} from "./bazi-dtt-version-aware-readiness-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const cliPath = path.join(here, "verify-bazi-private-exact-quote-version-aware-candidate.mjs");
const libraryPath = path.join(here, "bazi-private-exact-quote-version-aware-candidate-lib.mjs");
const HISTORICAL_LIBRARY_SHA256 = "ea32d341431d6973421ae665d750225995d02fae5a21a7a72b5441cf27677881";

const FIXTURE_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-source-binding-candidates.v1.6.0.json",
  "content/bazi-strength-source-rights-candidates.v1.2.0.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json",
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/contracts/src/index.ts",
  "packages/knowledge-core/src/index.ts"
]);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function expectCode(code) {
  return (error) => error?.code === code;
}

function validRequest(overrides = {}) {
  const request = {
    schemaVersion: BAZI_PRIVATE_EXACT_QUOTE_VERSION_AWARE_REQUEST_SCHEMA_VERSION,
    recordType: "bazi_private_exact_quote_version_aware_candidate_request",
    requestId: "req-0123456789abcdef0123456789abcdef",
    topicId: "strength.yueling_exact_quote",
    quoteCandidateId: "dtt-yueling-minimal-v1",
    sourceBodyRelativePath: "materials/source.wikitext",
    handlingBoundary: {
      privateRootOutsideWorkspaceRequired: true,
      repositoryStorageAllowed: false,
      materialRedistributionDecision: "not_established",
      quotePublicationDecision: "not_established",
      rightsLegalConclusion: "not_established"
    }
  };
  return {
    ...request,
    ...overrides,
    handlingBoundary: {
      ...request.handlingBoundary,
      ...(overrides.handlingBoundary ?? {})
    }
  };
}

function materialFixture(bodyText = "前言\n甲😀乙\n后记\n", quoteText = "甲😀乙") {
  const bytes = Buffer.from(bodyText, "utf8");
  const start = bodyText.indexOf(quoteText);
  const end = start + quoteText.length;
  const quoteBytes = Buffer.from(quoteText, "utf8");
  const lineAt = (offset) => 1 + [...bodyText.slice(0, offset)].filter((value) => value === "\n").length;
  return {
    bytes,
    carrierLock: {
      rawWikitextSha256: sha256(bytes),
      rawWikitextUtf8Bytes: bytes.byteLength,
      rawWikitextCharacters: bodyText.length
    },
    quoteLock: {
      rawRevisionLineStart: lineAt(start),
      rawRevisionLineEnd: lineAt(end - 1),
      rawCharacterStartZeroBased: start,
      rawCharacterEndExclusive: end,
      quoteCharacters: quoteText.length,
      quoteUtf8Bytes: quoteBytes.byteLength,
      quoteSha256: sha256(quoteBytes),
      quoteOccurrenceInRawRevision: "unique"
    }
  };
}

function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: workspaceRoot,
      env: { ...process.env, NODE_OPTIONS: "" },
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function currentFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-exact-quote-fixture-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of FIXTURE_PATHS) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), target);
  }
  return root;
}

async function privateFixture(t, request = validRequest(), body = "PRIVATE-CURRENT-CANDIDATE-SENTINEL") {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-current-exact-quote-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "materials"), { recursive: true });
  await writeFile(path.join(root, "request.json"), `${JSON.stringify(request)}\n`, "utf8");
  await writeFile(path.join(root, "materials", "source.wikitext"), body, "utf8");
  return root;
}

async function privateFileInventory(root) {
  const entries = [];
  async function visit(relative) {
    const absolute = path.join(root, relative);
    const names = await readdir(absolute, { withFileTypes: true });
    names.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of names) {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) await visit(child);
      else {
        const bytes = await readFile(path.join(root, child));
        entries.push({ path: child.replaceAll("\\", "/"), bytes: bytes.byteLength, sha256: sha256(bytes) });
      }
    }
  }
  await visit("");
  return entries;
}

async function findProductionConsumerReferences() {
  const hits = [];
  const productionRoots = ["apps", "packages"];
  const readableExtensions = new Set([".cjs", ".js", ".json", ".jsx", ".mjs", ".ts", ".tsx"]);
  const restrictedRelativePath = "apps/web/src/lib/local-user-data-cleanup.ts";
  const target = "bazi-private-exact-quote-version-aware-candidate";
  async function visit(rootName, relative = "") {
    const absolute = path.join(workspaceRoot, rootName, relative);
    const entries = await readdir(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const child = path.join(relative, entry.name);
      const workspaceRelative = path.join(rootName, child).replaceAll("\\", "/");
      if (workspaceRelative === restrictedRelativePath) continue;
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist") await visit(rootName, child);
        continue;
      }
      if (!entry.isFile() || !readableExtensions.has(path.extname(entry.name))) continue;
      const source = await readFile(path.join(workspaceRoot, workspaceRelative), "utf8");
      if (source.includes(target)) hits.push(workspaceRelative);
    }
  }
  for (const rootName of productionRoots) await visit(rootName);
  return hits.sort();
}

test("current-line scope pins exactly 3 topics, 2 bindings and 4 quote refs with DTT v2 and SMT v1", async () => {
  const topics = CURRENT_FIRST_THREE_EXACT_QUOTE_TOPIC_MAP;
  assert.equal(topics.length, 3);
  const refs = topics.flatMap((topic) => topic.quoteRefs.map((ref) => ({ topicId: topic.topicId, ...ref })));
  assert.equal(refs.length, 4);
  assert.deepEqual([...new Set(refs.map((ref) => ref.bindingId))].sort(), [
    "binding:dtt:month-command",
    "binding:smt-v10:whole-chart"
  ]);
  assert.equal(refs.filter((ref) => ref.candidateId.endsWith("candidate-v2")).length, 2);
  assert.equal(refs.filter((ref) => ref.candidateId === "smt-siku-v10-wikisource-r761703-candidate-v1").length, 2);
  assert.equal(refs.filter((ref) => ref.rightsCandidateId.endsWith("rights-candidate-v2")).length, 2);
  assert.equal(refs.filter((ref) => ref.rightsCandidateId === "smt-siku-v10-wikisource-r761703-rights-candidate-v1").length, 2);

  const bundle = await baziPrivateExactQuoteVersionAwareCandidateTestOnly.loadCurrentParentBundle(workspaceRoot);
  assert.deepEqual(assertExactCurrentFirstThreeTopicMap(bundle.source), {
    topics: 3,
    currentBindings: 2,
    quoteReferences: 4
  });
  const dttRequest = validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest());
  const dtt = baziPrivateExactQuoteVersionAwareCandidateTestOnly.resolveCurrentQuoteContext(bundle, dttRequest);
  assert.equal(dtt.candidate.candidateId, "dtt-chanwei-wikisource-r2600158-candidate-v2");
  assert.equal(dtt.rights.rightsCandidateId, "dtt-chanwei-wikisource-r2600158-rights-candidate-v2");
  assert.equal(dtt.candidate.carrierIdentity.rawWikitextUtf8Bytes, 401801);
  assert.equal(dtt.candidate.carrierIdentity.rawWikitextSha256, "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d");
  assert.equal(dtt.quote.quoteSha256, "03df5322e1504e142e673e7d11c2d0ad4e08fa84ddbdea3d5c75532d520cc3b9");

  const smtRequest = validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest({
    topicId: "strength.tougan_exact_quote",
    quoteCandidateId: "smt-v10-tougan-minimal-v1"
  }));
  const smt = baziPrivateExactQuoteVersionAwareCandidateTestOnly.resolveCurrentQuoteContext(bundle, smtRequest);
  assert.equal(smt.candidate.candidateId, "smt-siku-v10-wikisource-r761703-candidate-v1");
  assert.equal(smt.rights.rightsCandidateId, "smt-siku-v10-wikisource-r761703-rights-candidate-v1");
  assert.equal(smt.expectedRef.parentMode, "identity_unchanged_in_current_parent");

  const drifted = structuredClone(bundle.source);
  drifted.candidates.find((entry) => entry.candidateId.includes("dtt-chanwei")).candidateId =
    "dtt-chanwei-wikisource-r2600158-candidate-v1";
  assert.throws(() => assertExactCurrentFirstThreeTopicMap(drifted), expectCode("CURRENT_QUOTE_MAP_DRIFT"));
});

test("current parent chain is branded raw-pinned unpromoted and explicitly non-atomic", async () => {
  const testOnly = baziPrivateExactQuoteVersionAwareCandidateTestOnly;
  const bundle = await testOnly.loadCurrentParentBundle(workspaceRoot);
  assert.equal(isVerifiedBaziDttVersionedParentSupersession(bundle.supersession), true);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2(bundle.reconciliation), true);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(bundle.readiness), true);
  assert.equal(isVerifiedBaziDttVersionedParentSupersession(structuredClone(bundle.supersession)), false);
  assert.equal(isVerifiedBaziDttNoticeReconciliationV2({ ...bundle.reconciliation }), false);
  assert.equal(isVerifiedBaziBindingFreezeRequirementsV17(Object.freeze({ ...bundle.readiness })), false);

  assert.deepEqual(testOnly.CURRENT_SOURCE, {
    path: "content/bazi-strength-source-binding-candidates.v1.6.0.json",
    rawBytes: 50427,
    rawSha256: "62f6a68b99246a802bcf2055aa09a8ac8113df37a7ede1c55d8a2ea64deaea98",
    ledgerId: "hakimi.bazi.strength.source-binding-candidates/1.6.0",
    ledgerDigest: "6f008058b282613fd131344206b27fccb1d80596bb49789f0554acdd69c1e44c"
  });
  assert.equal(testOnly.CURRENT_RIGHTS.rawSha256, "678632a8875672f58bb5c9f1ec4a299a4f0c6e750b8ff4a02bfe4df889e1243a");
  assert.equal(testOnly.CURRENT_READINESS.rawSha256, "7565a1c1ae51c09c78cf8f906e544bd8ee822020f76587237bc909ef1e6408a2");
  assert.equal(testOnly.CURRENT_RECONCILIATION.rawSha256, "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b");
  assert.equal(testOnly.CURRENT_SUPERSESSION.rawSha256, "aa9e62089990d8ba699c441114914173141e8228f027605b47f5c5e238fac0e3");

  for (const result of [bundle.supersession, bundle.reconciliation, bundle.readiness]) {
    assert.equal(result.crossFileAtomicSnapshot, false);
    assert.equal(result.mutationEpochAvailable, false);
    assert.equal(result.mutationEpochReceipt, null);
    assert.equal(result.intervalMutationExcludedAcrossFiles, false);
    assert.equal(result.abaExcluded, false);
    assert.equal(result.releaseReady, false);
    assert.equal(result.publicDeploymentAuthorized, false);
    assert.equal(result.expertClaimsAuthorized, false);
  }
  assert.equal(bundle.readiness.bindingFrozenVerified, 0);
  assert.equal(bundle.readiness.formalSourceRightsRecordCount, 0);
  assert.equal(bundle.readiness.formalSourceCarrierRecordCount, 0);
});

test("request parser accepts only duplicate-free declarative current-line requests", () => {
  const request = validRequest();
  const parsed = parsePrivateExactQuoteVersionAwareCandidateRequestBytes(Buffer.from(JSON.stringify(request), "utf8"));
  assert.deepEqual(parsed, request);
  assert.equal(Object.isFrozen(parsed), true);
  assert.throws(
    () => parsePrivateExactQuoteVersionAwareCandidateRequestBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(JSON.stringify(request))])
    ),
    expectCode("INVALID_REQUEST_JSON")
  );
  assert.throws(
    () => parsePrivateExactQuoteVersionAwareCandidateRequestBytes(Buffer.from([0xc3, 0x28])),
    expectCode("INVALID_REQUEST_JSON")
  );
  const duplicate = JSON.stringify(request).replace(
    '"topicId":"strength.yueling_exact_quote"',
    '"topicId":"strength.yueling_exact_quote","topicId":"strength.rooting_exact_quote"'
  );
  assert.throws(
    () => parsePrivateExactQuoteVersionAwareCandidateRequestBytes(Buffer.from(duplicate)),
    expectCode("INVALID_REQUEST_JSON")
  );
  const escapedDuplicate = JSON.stringify(request).replace(
    '"topicId":"strength.yueling_exact_quote"',
    '"topicId":"strength.yueling_exact_quote","\\u0074opicId":"strength.rooting_exact_quote"'
  );
  assert.throws(
    () => parsePrivateExactQuoteVersionAwareCandidateRequestBytes(Buffer.from(escapedDuplicate)),
    expectCode("INVALID_REQUEST_JSON")
  );
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest({
      quoteCandidateId: "dtt-legacy-v1-not-current"
    })),
    expectCode("QUOTE_OUTSIDE_CURRENT_FIRST_THREE_SCOPE")
  );
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest({
      handlingBoundary: { quotePublicationDecision: "allowed" }
    })),
    expectCode("HANDLING_BOUNDARY_PROMOTION_FORBIDDEN")
  );
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest({
      requestId: "customer-name"
    })),
    expectCode("INVALID_REQUEST_IDENTITY")
  );

  let getterCalls = 0;
  const accessor = validRequest();
  Object.defineProperty(accessor, "topicId", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "strength.yueling_exact_quote";
    }
  });
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(accessor),
    expectCode("UNSAFE_DECLARATIVE_INPUT")
  );
  assert.equal(getterCalls, 0);
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(new Proxy(validRequest(), {})),
    expectCode("UNSAFE_DECLARATIVE_INPUT")
  );
  const symbol = validRequest();
  symbol[Symbol("sentinel")] = true;
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(symbol),
    expectCode("UNSAFE_DECLARATIVE_INPUT")
  );
  const customPrototype = Object.assign(Object.create({ inherited: true }), validRequest());
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(customPrototype),
    expectCode("UNSAFE_DECLARATIVE_INPUT")
  );
  const cycle = validRequest();
  cycle.cycle = cycle;
  assert.throws(
    () => validatePrivateExactQuoteVersionAwareCandidateRequest(cycle),
    expectCode("UNSAFE_DECLARATIVE_INPUT")
  );
});

test("quote kernel verifies UTF-8 bytes UTF-16 locators lines and overlap identity without retaining material", () => {
  const fixture = materialFixture();
  const result = verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
    fixture.bytes,
    fixture.carrierLock,
    fixture.quoteLock
  );
  assert.equal(result.sourceBodySha256, fixture.carrierLock.rawWikitextSha256);
  assert.equal(result.sourceBodyUtf8Bytes, fixture.bytes.byteLength);
  assert.equal(result.sourceBodyUtf16CodeUnits, "前言\n甲😀乙\n后记\n".length);
  assert.equal(result.quoteUtf16CodeUnits, "甲😀乙".length);
  assert.equal(result.quoteUtf8Bytes, Buffer.byteLength("甲😀乙", "utf8"));
  assert.equal(result.overlappingOccurrenceCount, 1);
  assert.equal(result.sourceBodyStoredInResult, false);
  assert.equal(result.quoteTextStoredInResult, false);
  assert.equal(Object.isFrozen(result), true);
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("甲😀乙"), false);
  assert.equal(serialized.includes("前言"), false);

  const driftCases = [
    ["body hash", { ...fixture.carrierLock, rawWikitextSha256: "0".repeat(64) }, fixture.quoteLock, "SOURCE_BODY_IDENTITY_MISMATCH"],
    ["body bytes", { ...fixture.carrierLock, rawWikitextUtf8Bytes: fixture.bytes.byteLength + 1 }, fixture.quoteLock, "SOURCE_BODY_IDENTITY_MISMATCH"],
    ["body code units", { ...fixture.carrierLock, rawWikitextCharacters: 1 }, fixture.quoteLock, "SOURCE_BODY_IDENTITY_MISMATCH"],
    ["line start", fixture.carrierLock, { ...fixture.quoteLock, rawRevisionLineStart: 1 }, "QUOTE_MATERIAL_MISMATCH"],
    ["range end", fixture.carrierLock, { ...fixture.quoteLock, rawCharacterEndExclusive: fixture.quoteLock.rawCharacterEndExclusive - 1 }, "QUOTE_MATERIAL_MISMATCH"],
    ["quote hash", fixture.carrierLock, { ...fixture.quoteLock, quoteSha256: "0".repeat(64) }, "QUOTE_MATERIAL_MISMATCH"]
  ];
  for (const [label, carrier, quote, code] of driftCases) {
    assert.throws(
      () => verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(fixture.bytes, carrier, quote),
      expectCode(code),
      label
    );
  }
  const overlapping = materialFixture("aaa", "aa");
  assert.throws(
    () => verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
      overlapping.bytes,
      overlapping.carrierLock,
      overlapping.quoteLock
    ),
    expectCode("QUOTE_NOT_UNIQUE")
  );
  assert.throws(
    () => verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
      Buffer.from([0xc3, 0x28]),
      fixture.carrierLock,
      fixture.quoteLock
    ),
    expectCode("INVALID_UTF8")
  );
  assert.throws(
    () => verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
      new Proxy(fixture.bytes, {}),
      fixture.carrierLock,
      fixture.quoteLock
    ),
    expectCode("INVALID_BYTES")
  );
});

test("private held-handle reader rejects escape aliases links and max-plus-one growth", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-reader-current-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "materials"));
  const sourcePath = path.join(root, "materials", "source.txt");
  await writeFile(sourcePath, "stable-private-control", "utf8");
  const read = await baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
    root,
    "materials/source.txt",
    1024,
    "test file"
  );
  assert.equal(read.toString("utf8"), "stable-private-control");
  for (const invalid of ["../source.txt", "materials\\source.txt", "materials/source.txt:stream", "C:/source.txt"] ) {
    await assert.rejects(
      baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
        root,
        invalid,
        1024,
        "test file"
      ),
      expectCode("INVALID_PRIVATE_PATH")
    );
  }
  const aliasPath = path.join(root, "materials", "alias.txt");
  await link(sourcePath, aliasPath);
  await assert.rejects(
    baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
      root,
      "materials/source.txt",
      1024,
      "test file"
    ),
    expectCode("PRIVATE_FILE_ALIAS_FORBIDDEN")
  );
  await rm(aliasPath);

  const terminalAlias = path.join(root, "materials", "terminal-link.txt");
  try {
    await symlink(sourcePath, terminalAlias, process.platform === "win32" ? "file" : undefined);
    await assert.rejects(
      baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
        root,
        "materials/terminal-link.txt",
        1024,
        "test file"
      ),
      (error) => error?.code === "PRIVATE_FILE_NOT_REGULAR"
        || error?.code === "PRIVATE_FILE_CHANGED_DURING_OPEN"
    );
    await rm(terminalAlias);
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EACCES") throw error;
  }

  const targetDirectory = path.join(root, "actual");
  const directoryAlias = path.join(root, "linked");
  await mkdir(targetDirectory);
  await writeFile(path.join(targetDirectory, "source.txt"), "private-link-sentinel", "utf8");
  try {
    await symlink(targetDirectory, directoryAlias, process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(
      baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
        root,
        "linked/source.txt",
        1024,
        "test file"
      ),
      (error) => error?.code === "PRIVATE_DIRECTORY_CHAIN_NOT_REGULAR"
        || error?.code === "PRIVATE_PATH_ESCAPE"
    );
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EACCES") throw error;
  }

  const swappedDirectory = path.join(root, "swap-before-open");
  const displacedDirectory = path.join(root, "swap-before-open-displaced");
  await mkdir(swappedDirectory);
  await writeFile(path.join(swappedDirectory, "source.txt"), "original-parent", "utf8");
  await assert.rejects(
    baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
      root,
      "swap-before-open/source.txt",
      1024,
      "test file",
      {
        afterDirectoryChainBeforeOpen: async () => {
          await rename(swappedDirectory, displacedDirectory);
          await mkdir(swappedDirectory);
          await writeFile(path.join(swappedDirectory, "source.txt"), "replacement-parent", "utf8");
        }
      }
    ),
    (error) => error?.code === "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN"
      || error?.code === "PRIVATE_FILE_CHANGED_DURING_OPEN"
  );

  await writeFile(sourcePath, "same-size-A", "utf8");
  await assert.rejects(
    baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
      root,
      "materials/source.txt",
      1024,
      "test file",
      {
        afterBytesRead: async () => {
          await writeFile(sourcePath, "same-size-B", "utf8");
        }
      }
    ),
    expectCode("PRIVATE_FILE_CHANGED_DURING_READ")
  );

  await writeFile(sourcePath, "small", "utf8");
  await assert.rejects(
    baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(
      root,
      "materials/source.txt",
      8,
      "test file",
      {
        afterOpenBeforeRead: async () => {
          await writeFile(sourcePath, "012345678", "utf8");
        }
      }
    ),
    (error) => error?.code === "PRIVATE_FILE_SIZE_INVALID"
      || error?.code === "PRIVATE_FILE_CHANGED_DURING_READ"
      || error?.code === "PRIVATE_FILE_CHANGED_DURING_OPEN"
  );
});

test("old-new mix and raw drift fail before a missing private source body is read", async (t) => {
  const fixtureRoot = await currentFixture(t);
  const privateRoot = await privateFixture(t, validRequest(), "placeholder");
  await rm(path.join(privateRoot, "materials", "source.wikitext"));
  const currentSourcePath = path.join(fixtureRoot, "content", "bazi-strength-source-binding-candidates.v1.6.0.json");
  const historicalSourcePath = path.join(fixtureRoot, "content", "bazi-strength-source-binding-candidates.v1.json");
  await copyFile(historicalSourcePath, currentSourcePath);
  await assert.rejects(
    verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
      workspaceRoot: fixtureRoot,
      privateRoot,
      requestRelativePath: "request.json"
    }),
    (error) => error?.code === "CURRENT_PARENT_BRAND_LOAD_FAILED"
  );

  const whitespaceFixture = await currentFixture(t);
  const rightsPath = path.join(whitespaceFixture, "content", "bazi-strength-source-rights-candidates.v1.2.0.json");
  const rights = await readFile(rightsPath, "utf8");
  await writeFile(rightsPath, `${rights}\n`, "utf8");
  await assert.rejects(
    baziPrivateExactQuoteVersionAwareCandidateTestOnly.loadCurrentParentBundle(whitespaceFixture),
    expectCode("CURRENT_PARENT_BRAND_LOAD_FAILED")
  );
});

test("no unverified success receipt projection or brand mutator is exposed", async () => {
  const testOnly = baziPrivateExactQuoteVersionAwareCandidateTestOnly;
  const bundle = await testOnly.loadCurrentParentBundle(workspaceRoot);
  const request = validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest());
  const context = testOnly.resolveCurrentQuoteContext(bundle, request);
  const fabricatedIntegrity = Object.freeze({
    sourceBodySha256: context.candidate.carrierIdentity.rawWikitextSha256,
    sourceBodyUtf8Bytes: context.candidate.carrierIdentity.rawWikitextUtf8Bytes,
    sourceBodyUtf16CodeUnits: context.candidate.carrierIdentity.rawWikitextCharacters,
    rawRevisionLineStart: context.quote.rawRevisionLineStart,
    rawRevisionLineEnd: context.quote.rawRevisionLineEnd,
    rawCharacterStartZeroBased: context.quote.rawCharacterStartZeroBased,
    rawCharacterEndExclusive: context.quote.rawCharacterEndExclusive,
    quoteUtf16CodeUnits: context.quote.quoteCharacters,
    quoteUtf8Bytes: context.quote.quoteUtf8Bytes,
    quoteSha256: context.quote.quoteSha256,
    overlappingOccurrenceCount: 1,
    sourceBodyStoredInResult: false,
    quoteTextStoredInResult: false
  });
  assert.equal("buildSanitizedCandidateReceipt" in testOnly, false);
  assert.equal("buildSanitizedCandidateReceipt" in candidateModuleNamespace, false);
  assert.equal("brandReceipt" in testOnly, false);
  assert.equal("brandReceipt" in candidateModuleNamespace, false);
  assert.equal(isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt(fabricatedIntegrity), false);
  assert.equal(isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt(structuredClone(fabricatedIntegrity)), false);
  assert.equal(isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt(Object.freeze({ ...fabricatedIntegrity })), false);

  const synthetic = materialFixture();
  const syntheticIntegrity = verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(
    synthetic.bytes,
    synthetic.carrierLock,
    synthetic.quoteLock
  );
  assert.equal(isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt(syntheticIntegrity), false);

  const source = await readFile(libraryPath, "utf8");
  for (const requiredBoundary of [
    'classification: "private_material_integrity_verified"',
    'currentCandidateDistributionBoundary: "link_only_no_redistribution_clearance"',
    "publicDomainEstablished: false",
    "redistributionLicenseEstablished: false",
    "attributionObligationsSatisfied: false",
    "crossFileAtomicSnapshot: false",
    "mutationEpochAvailable: false",
    "intervalMutationExcludedAcrossFiles: false",
    "abaExcluded: false",
    "contentTruthEstablished: false",
    "expertTruthEstablished: false",
    "rightsLegalConclusionEstablished: false",
    "releaseReady: false",
    "publicDeploymentAuthorized: false",
    "expertClaimsAuthorized: false"
  ]) assert.equal(source.includes(requiredBoundary), true, requiredBoundary);
});

test("captured primordials survive post-import poisoning without forging a receipt", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-poisoning-test-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  const scriptPath = path.join(root, "poisoning.mjs");
  const moduleUrl = pathToFileURL(libraryPath).href;
  const sourceLedgerPath = path.join(workspaceRoot, "content", "bazi-strength-source-binding-candidates.v1.6.0.json");
  const script = `
    import assert from "node:assert/strict";
    import { createHash } from "node:crypto";
    import { mkdir, open, readFile, writeFile } from "node:fs/promises";
    import os from "node:os";
    import path from "node:path";
    import { mkdtemp } from "node:fs/promises";
    const m = await import(${JSON.stringify(moduleUrl)});
    const sourceLedger = JSON.parse(await readFile(${JSON.stringify(sourceLedgerPath)}, "utf8"));
    const fixtureText = "前\\n甲😀乙\\n后\\n";
    const quote = "甲😀乙";
    const bytes = Buffer.from(fixtureText, "utf8");
    const start = fixtureText.indexOf(quote);
    const hash = (value) => createHash("sha256").update(value).digest("hex");
    const carrier = { rawWikitextSha256: hash(bytes), rawWikitextUtf8Bytes: bytes.byteLength, rawWikitextCharacters: fixtureText.length };
    const quoteBytes = Buffer.from(quote, "utf8");
    const lock = { rawRevisionLineStart: 2, rawRevisionLineEnd: 2, rawCharacterStartZeroBased: start, rawCharacterEndExclusive: start + quote.length, quoteCharacters: quote.length, quoteUtf8Bytes: quoteBytes.byteLength, quoteSha256: hash(quoteBytes), quoteOccurrenceInRawRevision: "unique" };
    const temp = await mkdtemp(path.join(os.tmpdir(), "hakimi-reader-poison-"));
    await mkdir(path.join(temp, "materials"));
    await writeFile(path.join(temp, "materials", "source.txt"), "stable", "utf8");
    const probe = await open(path.join(temp, "materials", "source.txt"), "r");
    const fileHandlePrototype = Object.getPrototypeOf(probe);
    await probe.close();
    const originals = {
      defineProperty: Object.defineProperty,
      globalStringDescriptor: Object.getOwnPropertyDescriptor(globalThis, "String"),
      globalObjectDescriptor: Object.getOwnPropertyDescriptor(globalThis, "Object"),
      globalReflectDescriptor: Object.getOwnPropertyDescriptor(globalThis, "Reflect"),
      globalJsonDescriptor: Object.getOwnPropertyDescriptor(globalThis, "JSON"),
      freeze: Object.freeze,
      descriptor: Object.getOwnPropertyDescriptor,
      descriptors: Object.getOwnPropertyDescriptors,
      ownKeys: Reflect.ownKeys,
      push: Array.prototype.push,
      iterator: Array.prototype[Symbol.iterator],
      weakHas: WeakSet.prototype.has,
      weakAdd: WeakSet.prototype.add,
      weakDelete: WeakSet.prototype.delete,
      fileRead: fileHandlePrototype.read,
      fileStat: fileHandlePrototype.stat,
      errorName: Object.getOwnPropertyDescriptor(Error.prototype, "name"),
      objectToJson: Object.getOwnPropertyDescriptor(Object.prototype, "toJSON"),
      arrayToJson: Object.getOwnPropertyDescriptor(Array.prototype, "toJSON"),
      pathPosix: path.posix,
      pathWin32: path.win32
    };
    let numericSetterCalls = 0;
    let descriptorGetterCalls = 0;
    let errorNameSetterCalls = 0;
    let inheritedToJsonCalls = 0;
    let liveGlobalReads = 0;
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      set() { numericSetterCalls += 1; }
    });
    Object.defineProperty(Object.prototype, "0", {
      configurable: true,
      get() { descriptorGetterCalls += 1; throw new Error("poison descriptor table index"); }
    });
    Object.defineProperty(Error.prototype, "name", {
      configurable: true,
      set() { errorNameSetterCalls += 1; throw new Error("poison error name"); }
    });
    Object.defineProperty(Object.prototype, "toJSON", {
      configurable: true,
      writable: true,
      value() { inheritedToJsonCalls += 1; throw new Error("poison object toJSON"); }
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      configurable: true,
      writable: true,
      value() { inheritedToJsonCalls += 1; throw new Error("poison array toJSON"); }
    });
    path.posix = null;
    path.win32 = null;
    Object.freeze = () => { throw new Error("poison freeze"); };
    Object.getOwnPropertyDescriptor = () => { throw new Error("poison descriptor"); };
    Object.getOwnPropertyDescriptors = () => { throw new Error("poison descriptors"); };
    Reflect.ownKeys = () => { throw new Error("poison ownKeys"); };
    Array.prototype.push = () => { throw new Error("poison push"); };
    Array.prototype[Symbol.iterator] = () => { throw new Error("poison iterator"); };
    WeakSet.prototype.has = () => true;
    WeakSet.prototype.add = () => { throw new Error("poison weak add"); };
    WeakSet.prototype.delete = () => { throw new Error("poison weak delete"); };
    fileHandlePrototype.read = () => { throw new Error("poison read"); };
    fileHandlePrototype.stat = () => { throw new Error("poison stat"); };
    const validRequest = {
      schemaVersion: "1.1.0",
      recordType: "bazi_private_exact_quote_version_aware_candidate_request",
      requestId: "req-0123456789abcdef0123456789abcdef",
      topicId: "strength.yueling_exact_quote",
      quoteCandidateId: "dtt-yueling-minimal-v1",
      sourceBodyRelativePath: "materials/source.wikitext",
      handlingBoundary: {
        privateRootOutsideWorkspaceRequired: true,
        repositoryStorageAllowed: false,
        materialRedistributionDecision: "not_established",
        quotePublicationDecision: "not_established",
        rightsLegalConclusion: "not_established"
      }
    };
    const sparse = [];
    sparse.length = 1;
    sparse.custom = true;
    let sparseRejected = false;
    let invalidRequestRejected = false;
    let result;
    let plainObjectReceiptAccepted;
    let file;
    const poisonGlobal = (name) => ({
      configurable: true,
      get() { liveGlobalReads += 1; throw new Error(\`poison live global \${name}\`); }
    });
    try {
      originals.defineProperty(globalThis, "String", poisonGlobal("String"));
      originals.defineProperty(globalThis, "Object", poisonGlobal("Object"));
      originals.defineProperty(globalThis, "Reflect", poisonGlobal("Reflect"));
      originals.defineProperty(globalThis, "JSON", poisonGlobal("JSON"));
      m.validatePrivateExactQuoteVersionAwareCandidateRequest(validRequest);
      m.assertExactCurrentFirstThreeTopicMap(sourceLedger);
      try {
        m.validatePrivateExactQuoteVersionAwareCandidateRequest({ ...validRequest, attack: sparse });
      } catch (error) {
        sparseRejected = error?.code === "UNSAFE_DECLARATIVE_INPUT";
      }
      try {
        m.validatePrivateExactQuoteVersionAwareCandidateRequest({ ...validRequest, requestId: "invalid" });
      } catch (error) {
        invalidRequestRejected = error?.code === "INVALID_REQUEST_IDENTITY";
      }
      result = m.verifyCurrentCandidateUtf8QuoteMaterialAgainstLock(bytes, carrier, lock);
      plainObjectReceiptAccepted = m.isVerifiedBaziPrivateExactQuoteVersionAwareCandidateReceipt({});
    } finally {
      originals.defineProperty(globalThis, "String", originals.globalStringDescriptor);
      originals.defineProperty(globalThis, "Object", originals.globalObjectDescriptor);
      originals.defineProperty(globalThis, "Reflect", originals.globalReflectDescriptor);
      originals.defineProperty(globalThis, "JSON", originals.globalJsonDescriptor);
    }
    if (!sparseRejected) throw new Error("sparse descriptor attack was not rejected");
    if (!invalidRequestRejected) throw new Error("invalid request was not rejected safely");
    assert.equal(result.quoteSha256, lock.quoteSha256);
    assert.equal(plainObjectReceiptAccepted, false);
    Object.freeze = originals.freeze;
    Object.getOwnPropertyDescriptor = originals.descriptor;
    Object.getOwnPropertyDescriptors = originals.descriptors;
    Reflect.ownKeys = originals.ownKeys;
    Array.prototype.push = originals.push;
    Array.prototype[Symbol.iterator] = originals.iterator;
    WeakSet.prototype.has = originals.weakHas;
    WeakSet.prototype.add = originals.weakAdd;
    WeakSet.prototype.delete = originals.weakDelete;
    delete Array.prototype["0"];
    delete Object.prototype["0"];
    Object.defineProperty(Error.prototype, "name", originals.errorName);
    if (originals.objectToJson) Object.defineProperty(Object.prototype, "toJSON", originals.objectToJson);
    else delete Object.prototype.toJSON;
    if (originals.arrayToJson) Object.defineProperty(Array.prototype, "toJSON", originals.arrayToJson);
    else delete Array.prototype.toJSON;
    path.posix = originals.pathPosix;
    path.win32 = originals.pathWin32;
    file = await m.baziPrivateExactQuoteVersionAwareCandidateTestOnly.readStablePrivateFile(temp, "materials/source.txt", 64, "test file");
    assert.equal(numericSetterCalls, 0);
    assert.equal(descriptorGetterCalls, 0);
    assert.equal(errorNameSetterCalls, 0);
    assert.equal(inheritedToJsonCalls, 0);
    assert.equal(liveGlobalReads, 0);
    assert.equal(Buffer.from(file).toString("utf8"), "stable");
    process.stdout.write("POISONING_OK\\n");
  `;
  await writeFile(scriptPath, script, "utf8");
  const result = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: workspaceRoot,
      env: { ...process.env, NODE_OPTIONS: "" },
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "POISONING_OK\n");
});

test("file API and CLI fail closed redact private data write nothing and remain outside active consumers", async (t) => {
  const privateRoot = await privateFixture(t);
  const before = await privateFileInventory(privateRoot);
  let caught;
  try {
    await verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
      workspaceRoot,
      privateRoot,
      requestRelativePath: "request.json"
    });
  } catch (error) {
    caught = error;
  }
  assert.equal(caught?.code, "SOURCE_BODY_IDENTITY_MISMATCH");
  assert.equal(caught.message.includes(privateRoot), false);
  assert.equal(caught.message.includes("PRIVATE-CURRENT-CANDIDATE-SENTINEL"), false);
  const after = await privateFileInventory(privateRoot);
  assert.deepEqual(after, before);

  const cli = await runCli(["--private-root", privateRoot, "--request", "request.json"]);
  assert.equal(cli.code, 1);
  assert.equal(cli.stdout, "");
  assert.equal(cli.stderr, "SOURCE_BODY_IDENTITY_MISMATCH: verification failed closed\n");
  assert.equal(cli.stderr.includes(privateRoot), false);
  assert.equal(cli.stderr.includes("PRIVATE-CURRENT-CANDIDATE-SENTINEL"), false);
  assert.deepEqual(await privateFileInventory(privateRoot), before);

  await assert.rejects(
    verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
      workspaceRoot,
      privateRoot: workspaceRoot,
      requestRelativePath: "request.json"
    }),
    expectCode("PRIVATE_ROOT_OVERLAPS_WORKSPACE")
  );
  await assert.rejects(
    verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
      workspaceRoot,
      privateRoot,
      requestRelativePath: "request.json",
      verifiedAt: "2000-01-01T00:00:00.000Z"
    }),
    expectCode("INVALID_FILE_API_OPTIONS")
  );
  if (process.platform === "win32") {
    const caseAliasRoot = await privateFixture(t, validRequest({
      sourceBodyRelativePath: "REQUEST.JSON"
    }));
    await assert.rejects(
      verifyBaziPrivateExactQuoteVersionAwareCandidateFromFiles({
        workspaceRoot,
        privateRoot: caseAliasRoot,
        requestRelativePath: "request.json"
      }),
      expectCode("PRIVATE_REQUEST_BODY_ALIAS_FORBIDDEN")
    );
  }

  const source = await readFile(libraryPath, "utf8");
  assert.equal(source.includes("bazi-private-exact-quote-material-verifier-lib.mjs"), false);
  assert.equal(/\b(writeFile|appendFile|mkdir|rename|unlink|rm)\b/u.test(source), false);
  const historicalBytes = await readFile(path.join(here, "bazi-private-exact-quote-material-verifier-lib.mjs"));
  assert.equal(sha256(historicalBytes), HISTORICAL_LIBRARY_SHA256);
  for (const relativePath of [
    "package.json",
    "scripts/bazi-domain-release-manifest-lib.mjs",
    "scripts/system-admission-registry-lib.mjs"
  ]) {
    const text = await readFile(path.join(workspaceRoot, relativePath), "utf8");
    assert.equal(text.includes("bazi-private-exact-quote-version-aware-candidate"), false, relativePath);
  }
  assert.deepEqual(await findProductionConsumerReferences(), []);
});
