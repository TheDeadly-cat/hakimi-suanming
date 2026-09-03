import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, link, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as privateVerifierModule from "./bazi-private-exact-quote-material-verifier-lib.mjs";
import {
  FIRST_THREE_EXACT_QUOTE_TOPIC_MAP,
  assertExactFirstThreeTopicMap,
  parseDuplicateFreeJsonBytes,
  validatePrivateExactQuoteRequest,
  verifyBaziPrivateExactQuoteMaterialFromFiles,
  verifyUtf8QuoteMaterialAgainstLock
} from "./bazi-private-exact-quote-material-verifier-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_FILE_BOUNDARY_TEST_HOOK = Symbol.for("hakimi.private-exact-quote.file-boundary-test-hook");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function runVerifierCli(args) {
  const scriptPath = path.join(workspaceRoot, "scripts", "verify-bazi-private-exact-quote-material.mjs");
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd: workspaceRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (exitCode) => resolve({ exitCode, stdout, stderr }));
  });
}

function makeVerifierImportsAbsolute(source) {
  const scriptsRoot = path.join(workspaceRoot, "scripts");
  return source
    .replace(
      /from "(\.\/[^"\r\n]+)";/gu,
      (_match, specifier) => `from "${pathToFileURL(path.resolve(scriptsRoot, specifier)).href}";`
    )
    .replace(
      'from "@babel/parser";',
      `from "${import.meta.resolve("@babel/parser")}";`
    );
}

async function loadInternalReceiptBuilderForRuntimeTest() {
  const libraryPath = path.join(workspaceRoot, "scripts", "bazi-private-exact-quote-material-verifier-lib.mjs");
  const source = await readFile(libraryPath, "utf8");
  const absoluteImports = makeVerifierImportsAbsolute(source);
  const instrumented = `${absoluteImports}\nexport { buildSanitizedReceipt as buildSanitizedReceiptForRuntimeTest };\n`;
  const temporaryModuleRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-receipt-runtime-test-"));
  const temporaryModulePath = path.join(temporaryModuleRoot, "instrumented-verifier-lib.mjs");
  try {
    await writeFile(temporaryModulePath, instrumented, "utf8");
    const module = await import(pathToFileURL(temporaryModulePath).href);
    return module.buildSanitizedReceiptForRuntimeTest;
  } finally {
    await rm(temporaryModuleRoot, { recursive: true, force: true });
  }
}

async function loadInternalPrivateFileReaderForRuntimeTest() {
  const libraryPath = path.join(workspaceRoot, "scripts", "bazi-private-exact-quote-material-verifier-lib.mjs");
  const source = makeVerifierImportsAbsolute(await readFile(libraryPath, "utf8"));
  const beforeOpenNeedle = "    const beforeLink = await lstat(unresolved, { bigint: true });";
  const afterReadNeedle = "    const handleStatAfterRead = await handle.stat({ bigint: true });";
  const instrumentedSource = source
    .replace(
      beforeOpenNeedle,
      `    await globalThis[Symbol.for("hakimi.private-exact-quote.file-boundary-test-hook")]?.("after_chain_before_open");\n${beforeOpenNeedle}`
    )
    .replace(
      afterReadNeedle,
      `    await globalThis[Symbol.for("hakimi.private-exact-quote.file-boundary-test-hook")]?.("after_held_handle_read");\n${afterReadNeedle}`
    );
  assert.notEqual(instrumentedSource, source);
  const instrumented = `${instrumentedSource}\nexport { readStablePrivateFile as readStablePrivateFileForRuntimeTest };\n`;
  const temporaryModuleRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-file-runtime-test-"));
  const temporaryModulePath = path.join(temporaryModuleRoot, "instrumented-verifier-lib.mjs");
  try {
    await writeFile(temporaryModulePath, instrumented, "utf8");
    const module = await import(pathToFileURL(temporaryModulePath).href);
    return module.readStablePrivateFileForRuntimeTest;
  } finally {
    await rm(temporaryModuleRoot, { recursive: true, force: true });
  }
}

function isDirectoryReplacementUnsupported(error) {
  return error instanceof Error && ["EACCES", "EBUSY", "EINVAL", "ENOSYS", "EPERM"].includes(error.code);
}

function materialFixture(bodyText = "前言\n甲😀乙\n后记\n", quoteText = "甲😀乙") {
  const bytes = Buffer.from(bodyText, "utf8");
  const start = bodyText.indexOf(quoteText);
  const end = start + quoteText.length;
  const quoteBytes = Buffer.from(quoteText, "utf8");
  return {
    bytes,
    carrierLock: {
      rawWikitextSha256: sha256(bytes),
      rawWikitextUtf8Bytes: bytes.byteLength,
      rawWikitextCharacters: bodyText.length
    },
    quoteLock: {
      rawRevisionLineStart: 2,
      rawRevisionLineEnd: 2,
      rawCharacterStartZeroBased: start,
      rawCharacterEndExclusive: end,
      quoteCharacters: quoteText.length,
      quoteUtf8Bytes: quoteBytes.byteLength,
      quoteSha256: sha256(quoteBytes),
      quoteOccurrenceInRawRevision: "unique"
    }
  };
}

function validRequest(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    recordType: "bazi_private_exact_quote_material_verification_request",
    requestId: "local-check-001",
    topicId: "strength.yueling_exact_quote",
    quoteCandidateId: "dtt-yueling-minimal-v1",
    sourceBodyRelativePath: "materials/dtt-r2600158.wikitext",
    handlingBoundary: {
      privateRootOutsideWorkspaceRequired: true,
      repositoryStorageAllowed: false,
      materialRedistributionDecision: "not_established",
      quotePublicationDecision: "not_established",
      rightsLegalConclusion: "not_established"
    },
    ...overrides
  };
}

test("first-three scope remains exactly 3 topics, 2 current bindings and 4 quote candidates", async () => {
  const ledger = JSON.parse(await readFile(
    path.join(workspaceRoot, "content", "bazi-strength-source-binding-candidates.v1.json"),
    "utf8"
  ));
  const result = assertExactFirstThreeTopicMap(ledger);
  assert.deepEqual(result, { topics: 3, currentBindings: 2, quoteCandidates: 4 });
  assert.equal(FIRST_THREE_EXACT_QUOTE_TOPIC_MAP.some((entry) => entry.topicId.startsWith("binding:")), false);
});

test("topic drift or a parallel rooting binding is rejected", async () => {
  const ledger = JSON.parse(await readFile(
    path.join(workspaceRoot, "content", "bazi-strength-source-binding-candidates.v1.json"),
    "utf8"
  ));
  ledger.conceptualTopicMapping[1].currentBindingIds = ["strength.rooting_exact_quote"];
  assert.throws(() => assertExactFirstThreeTopicMap(ledger));
});

test("synthetic private material verifies UTF-16 locators, UTF-8 bytes and hashes without returning text", () => {
  const fixture = materialFixture();
  const result = verifyUtf8QuoteMaterialAgainstLock(
    fixture.bytes,
    fixture.carrierLock,
    fixture.quoteLock
  );
  assert.equal(result.sourceBodySha256, fixture.carrierLock.rawWikitextSha256);
  assert.equal(result.quoteSha256, fixture.quoteLock.quoteSha256);
  assert.equal(result.quoteUtf16CodeUnits, 4);
  assert.equal(result.quoteUtf8Bytes, 10);
  assert.equal(result.overlappingOccurrenceCount, 1);
  assert.equal(result.sourceBodyStoredInResult, false);
  assert.equal(result.quoteTextStoredInResult, false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(JSON.stringify(result).includes("甲😀乙"), false);
  assert.equal(JSON.stringify(result).includes("前言"), false);
});

test("overlapping duplicate quotes are rejected by searching again from start plus one", () => {
  const fixture = materialFixture("aaa", "aa");
  fixture.quoteLock.rawRevisionLineStart = 1;
  fixture.quoteLock.rawRevisionLineEnd = 1;
  assert.throws(
    () => verifyUtf8QuoteMaterialAgainstLock(fixture.bytes, fixture.carrierLock, fixture.quoteLock),
    /QUOTE_NOT_UNIQUE/u
  );
});

test("the existing live source auditor also searches for overlapping repeats from start plus one", async () => {
  const source = await readFile(
    path.join(workspaceRoot, "scripts", "audit-bazi-source-binding-candidates-live.ps1"),
    "utf8"
  );
  const blockStart = source.indexOf("$secondOccurrence = $body.IndexOf(");
  const blockEnd = source.indexOf("if ($quoteText.Length", blockStart);
  assert.ok(blockStart >= 0 && blockEnd > blockStart);
  const block = source.slice(blockStart, blockEnd);
  assert.match(block, /\$start \+ 1/u);
  assert.doesNotMatch(block, /rawCharacterEndExclusive/u);
});

test("body identity, locator, line and quote digest drift fail closed", () => {
  const fixture = materialFixture();
  const wrongBodyLock = { ...fixture.carrierLock, rawWikitextSha256: "0".repeat(64) };
  assert.throws(
    () => verifyUtf8QuoteMaterialAgainstLock(fixture.bytes, wrongBodyLock, fixture.quoteLock),
    /SOURCE_BODY_IDENTITY_MISMATCH/u
  );

  for (const mutate of [
    (lock) => { lock.rawRevisionLineStart = 1; },
    (lock) => { lock.rawCharacterStartZeroBased += 1; },
    (lock) => { lock.quoteUtf8Bytes += 1; },
    (lock) => { lock.quoteSha256 = "f".repeat(64); }
  ]) {
    const quoteLock = structuredClone(fixture.quoteLock);
    mutate(quoteLock);
    assert.throws(
      () => verifyUtf8QuoteMaterialAgainstLock(fixture.bytes, fixture.carrierLock, quoteLock),
      /QUOTE_/u
    );
  }
});

test("request bytes reject BOM, invalid UTF-8 and duplicate keys before JSON semantics", () => {
  const json = JSON.stringify(validRequest());
  assert.throws(
    () => parseDuplicateFreeJsonBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)])),
    /UTF8_BOM_FORBIDDEN/u
  );
  assert.throws(
    () => parseDuplicateFreeJsonBytes(Buffer.from([0xc3, 0x28])),
    /INVALID_UTF8/u
  );
  assert.throws(
    () => parseDuplicateFreeJsonBytes(Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8")),
    /DUPLICATE_JSON_KEY/u
  );
});

test("malformed private JSON diagnostics do not echo parser fragments or caller labels", () => {
  const sentinel = "PRIVATE-MALFORMED-JSON-SENTINEL";
  let caught;
  try {
    parseDuplicateFreeJsonBytes(
      Buffer.from(`{"request":"${sentinel}"`, "utf8"),
      `private-label-${sentinel}`
    );
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof Error);
  assert.match(caught.message, /INVALID_JSON/u);
  assert.equal(caught.safeForCli, true);
  assert.equal(caught.message.includes(sentinel), false);
});

test("receipt runtime preserves research-candidate authority, exact fields and redaction", async () => {
  assert.equal("buildSanitizedReceipt" in privateVerifierModule, false);
  assert.equal("buildBaziPrivateExactQuoteIntegrityReceipt" in privateVerifierModule, false);
  await assert.rejects(
    access(path.join(workspaceRoot, "scripts", "bazi-private-exact-quote-material-receipt-lib.mjs")),
    (error) => error instanceof Error && error.code === "ENOENT"
  );
  const buildReceipt = await loadInternalReceiptBuilderForRuntimeTest();
  const privateSentinel = "PRIVATE-RECEIPT-BODY-AND-PATH-SENTINEL";
  const request = {
    requestId: "local-check-public-001",
    sourceBodyRelativePath: `private/${privateSentinel}.wikitext`,
    privateBodyForNegativeAssertion: privateSentinel
  };
  const baseContext = {
    topic: { topicId: "strength.yueling_exact_quote" },
    candidate: {
      bindingId: "binding:dtt:month-command",
      evidenceSubjectId: "bazi.strength.binding.dtt.month-command.v1",
      candidateId: "candidate-test-v1",
      sourceId: "source-test-v1",
      carrierIdentity: { revisionId: "revision-test-v1" }
    },
    quote: { quoteCandidateId: "quote-test-v1" },
    rights: { rightsCandidateId: "rights-test-v1" },
    anchorRefs: [],
    collationRefs: [],
    privateTextForNegativeAssertion: privateSentinel
  };
  const integrity = {
    sourceBodySha256: "a".repeat(64),
    sourceBodyUtf8Bytes: 23,
    sourceBodyUtf16CodeUnits: 23,
    rawRevisionLineStart: 1,
    rawRevisionLineEnd: 1,
    rawCharacterStartZeroBased: 3,
    rawCharacterEndExclusive: 8,
    quoteUtf16CodeUnits: 5,
    quoteUtf8Bytes: 5,
    quoteSha256: "b".repeat(64),
    overlappingOccurrenceCount: 1,
    privateQuoteForNegativeAssertion: privateSentinel
  };
  const expectedTopicScopeKeys = [
    "bindingModelReviewState",
    "evidenceSubjectId",
    "mappingState",
    "parallelBindingCreated",
    "sourceCandidateBindingId",
    "topicId",
    "topicIsCurrentBindingId",
    "topicMappingAuthority"
  ];
  const cases = [
    [
      "mapped_to_existing_bindings_as_research_candidates",
      "research_candidate_mapping_only_no_binding_freeze"
    ],
    [
      "candidate_quote_located_no_dedicated_current_binding",
      "pending_domain_model_review_no_parallel_binding"
    ]
  ];
  for (const [mappingState, expectedReviewState] of cases) {
    const receipt = buildReceipt(
      request,
      { ...baseContext, topic: { ...baseContext.topic, mappingState } },
      integrity,
      "2026-08-28T00:00:00.000Z"
    );
    assert.deepEqual(Object.keys(receipt.topicScope).sort(), expectedTopicScopeKeys);
    assert.equal(receipt.topicScope.mappingState, mappingState);
    assert.equal(receipt.topicScope.topicMappingAuthority, "research_candidate_only");
    assert.equal(receipt.topicScope.sourceCandidateBindingId, "binding:dtt:month-command");
    assert.equal(receipt.topicScope.bindingModelReviewState, expectedReviewState);
    assert.equal(receipt.topicScope.parallelBindingCreated, false);
    assert.equal("currentBindingId" in receipt.topicScope, false);
    assert.equal("currentBindingIds" in receipt.topicScope, false);
    assert.equal(receipt.doesNotEstablish.includes("cross_file_atomic_snapshot"), true);
    assert.equal(receipt.doesNotEstablish.includes("mutation_epoch"), true);
    assert.equal(receipt.doesNotEstablish.includes("interval_mutation_or_aba_exclusion"), true);
    assert.equal(JSON.stringify(receipt).includes(privateSentinel), false);
    assert.equal(Object.isFrozen(receipt), true);
    assert.equal(Object.isFrozen(receipt.topicScope), true);
  }
  assert.throws(
    () => buildReceipt(
      request,
      { ...baseContext, topic: { ...baseContext.topic, mappingState: "unexpected_mapping_state" } },
      integrity,
      "2026-08-28T00:00:00.000Z"
    ),
    /UNSUPPORTED_TOPIC_MAPPING_STATE/u
  );
});

test("object API rejects accessors, proxies, symbols and sparse arrays without invoking getters", () => {
  let getterInvoked = false;
  const withGetter = validRequest();
  Object.defineProperty(withGetter, "topicId", {
    enumerable: true,
    get() {
      getterInvoked = true;
      return "strength.yueling_exact_quote";
    }
  });
  assert.throws(() => validatePrivateExactQuoteRequest(withGetter), /UNSAFE_DECLARATIVE_INPUT/u);
  assert.equal(getterInvoked, false);

  assert.throws(
    () => validatePrivateExactQuoteRequest(new Proxy(validRequest(), {})),
    /UNSAFE_DECLARATIVE_INPUT/u
  );

  const withSymbol = validRequest();
  withSymbol[Symbol("hidden")] = true;
  assert.throws(() => validatePrivateExactQuoteRequest(withSymbol), /UNSAFE_DECLARATIVE_INPUT/u);

  const withSparse = validRequest({ extra: new Array(1) });
  assert.throws(() => validatePrivateExactQuoteRequest(withSparse), /UNSAFE_DECLARATIVE_INPUT/u);

  const fixture = materialFixture();
  let lockGetterInvoked = false;
  const carrierWithGetter = { ...fixture.carrierLock };
  Object.defineProperty(carrierWithGetter, "rawWikitextSha256", {
    enumerable: true,
    get() {
      lockGetterInvoked = true;
      return fixture.carrierLock.rawWikitextSha256;
    }
  });
  assert.throws(
    () => verifyUtf8QuoteMaterialAgainstLock(fixture.bytes, carrierWithGetter, fixture.quoteLock),
    /UNSAFE_DECLARATIVE_INPUT/u
  );
  assert.equal(lockGetterInvoked, false);
  assert.throws(
    () => verifyUtf8QuoteMaterialAgainstLock(new Proxy(fixture.bytes, {}), fixture.carrierLock, fixture.quoteLock),
    /INVALID_BYTES/u
  );
});

test("request cannot escape the private root or promote rights and publication state", () => {
  for (const sourceBodyRelativePath of ["../secret.txt", "C:/secret.txt", "materials\\secret.txt", "/secret.txt"]) {
    assert.throws(
      () => validatePrivateExactQuoteRequest(validRequest({ sourceBodyRelativePath })),
      /INVALID_PRIVATE_PATH/u
    );
  }
  assert.throws(
    () => validatePrivateExactQuoteRequest(validRequest({
      handlingBoundary: {
        ...validRequest().handlingBoundary,
        quotePublicationDecision: "public_minimal_quote"
      }
    })),
    /HANDLING_BOUNDARY_PROMOTION_FORBIDDEN/u
  );
  assert.throws(
    () => validatePrivateExactQuoteRequest(validRequest({
      topicId: "strength.rooting_exact_quote",
      quoteCandidateId: "smt-v10-tougan-minimal-v1"
    })),
    /QUOTE_OUTSIDE_FIRST_THREE_SCOPE/u
  );
});

test("request path rejects terminal and intermediate Windows ADS colon forms", () => {
  for (const sourceBodyRelativePath of [
    "materials/source.wikitext:private-stream",
    "materials:private-stream/source.wikitext"
  ]) {
    assert.throws(
      () => validatePrivateExactQuoteRequest(validRequest({ sourceBodyRelativePath })),
      /INVALID_PRIVATE_PATH/u
    );
  }
});

test("file API rejects terminal and intermediate ADS forms in requestRelativePath", async () => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-request-ads-"));
  try {
    for (const requestRelativePath of [
      "request.json:private-stream",
      "requests:private-stream/request.json"
    ]) {
      let caught;
      try {
        await verifyBaziPrivateExactQuoteMaterialFromFiles({
          workspaceRoot,
          privateRoot,
          requestRelativePath,
          verifiedAt: "2026-08-28T00:00:00.000Z"
        });
      } catch (error) {
        caught = error;
      }
      assert.ok(caught instanceof Error);
      assert.match(caught.message, /INVALID_PRIVATE_PATH/u);
      assert.equal(caught.safeForCli, true);
      assert.equal(caught.message.includes(requestRelativePath), false);
      assert.equal(caught.message.includes(privateRoot), false);
    }
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private file reader rejects an intermediate directory symlink or junction without leaking its path", async (t) => {
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-chain-link-"));
  const actualDirectory = path.join(privateRoot, "actual-materials");
  const aliasDirectory = path.join(privateRoot, "aliased-materials");
  try {
    await mkdir(actualDirectory);
    await writeFile(path.join(actualDirectory, "request.json"), JSON.stringify(validRequest()), "utf8");
    try {
      await symlink(
        actualDirectory,
        aliasDirectory,
        process.platform === "win32" ? "junction" : "dir"
      );
    } catch (error) {
      if (isDirectoryReplacementUnsupported(error)) {
        t.skip(`directory alias creation is unavailable on this platform: ${error.code}`);
        return;
      }
      throw error;
    }

    let caught;
    try {
      await verifyBaziPrivateExactQuoteMaterialFromFiles({
        workspaceRoot,
        privateRoot,
        requestRelativePath: "aliased-materials/request.json",
        verifiedAt: "2026-08-28T00:00:00.000Z"
      });
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof Error);
    assert.match(caught.message, /PRIVATE_DIRECTORY_CHAIN_NOT_REGULAR/u);
    assert.equal(caught.safeForCli, true);
    assert.equal(caught.message.includes(privateRoot), false);
    assert.equal(caught.message.includes(actualDirectory), false);
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private file reader detects parent-chain replacement before open and after held-handle read", async (t) => {
  const readStablePrivateFile = await loadInternalPrivateFileReaderForRuntimeTest();

  await t.test("ordinary nested directories remain readable", async () => {
    const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-chain-control-"));
    try {
      await mkdir(path.join(privateRoot, "materials"));
      await writeFile(path.join(privateRoot, "materials", "source.txt"), "stable-private-control", "utf8");
      const bytes = await readStablePrivateFile(
        privateRoot,
        "materials/source.txt",
        1024,
        "private-test-file"
      );
      assert.equal(bytes.toString("utf8"), "stable-private-control");
    } finally {
      await rm(privateRoot, { recursive: true, force: true });
    }
  });

  for (const scenario of [
    ["after_chain_before_open", "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_OPEN"],
    ["after_held_handle_read", "PRIVATE_DIRECTORY_CHAIN_CHANGED_DURING_READ"]
  ]) {
    const [hookPhase, expectedCode] = scenario;
    await t.test(hookPhase, async (subtest) => {
      const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-chain-replace-"));
      const liveDirectory = path.join(privateRoot, "materials");
      const displacedDirectory = path.join(privateRoot, "materials-displaced");
      let usedMetadataMutationFallback = false;
      try {
        await mkdir(liveDirectory);
        await writeFile(path.join(liveDirectory, "source.txt"), "stable-private-control", "utf8");
        globalThis[PRIVATE_FILE_BOUNDARY_TEST_HOOK] = async (phase) => {
          if (phase !== hookPhase) return;
          try {
            await rename(liveDirectory, displacedDirectory);
          } catch (error) {
            if (isDirectoryReplacementUnsupported(error)) {
              usedMetadataMutationFallback = true;
              await writeFile(path.join(liveDirectory, "chain-mutation-sentinel.txt"), "changed", "utf8");
              return;
            }
            throw error;
          }
          await mkdir(liveDirectory);
          await writeFile(path.join(liveDirectory, "source.txt"), "stable-private-control", "utf8");
        };

        let caught;
        try {
          await readStablePrivateFile(
            privateRoot,
            "materials/source.txt",
            1024,
            "private-test-file"
          );
        } catch (error) {
          caught = error;
        } finally {
          delete globalThis[PRIVATE_FILE_BOUNDARY_TEST_HOOK];
        }
        assert.ok(caught instanceof Error);
        assert.match(caught.message, new RegExp(expectedCode, "u"));
        assert.equal(caught.safeForCli, true);
        assert.equal(caught.message.includes(privateRoot), false);
        if (usedMetadataMutationFallback) {
          subtest.diagnostic("open-handle parent replacement was unavailable; same-phase directory metadata mutation was detected");
        }
      } finally {
        delete globalThis[PRIVATE_FILE_BOUNDARY_TEST_HOOK];
        await rm(privateRoot, { recursive: true, force: true });
      }
    });
  }
});

test("file workflow keeps private root outside the workspace and does not leak mismatching material", async () => {
  await assert.rejects(
    verifyBaziPrivateExactQuoteMaterialFromFiles({
      workspaceRoot,
      privateRoot: workspaceRoot,
      requestRelativePath: "content/bazi-strength-source-binding-candidates.v1.json",
      verifiedAt: "2026-08-28T00:00:00.000Z"
    }),
    /PRIVATE_ROOT_OVERLAPS_WORKSPACE/u
  );

  const privateRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-private-quote-"));
  try {
    const request = validRequest({ sourceBodyRelativePath: "source.wikitext" });
    await writeFile(path.join(privateRoot, "request.json"), JSON.stringify(request), "utf8");
    await writeFile(path.join(privateRoot, "source.wikitext"), "PRIVATE-SENTINEL-QUOTE", "utf8");
    await link(path.join(privateRoot, "request.json"), path.join(privateRoot, "request-hardlink.json"));
    await assert.rejects(
      verifyBaziPrivateExactQuoteMaterialFromFiles({
        workspaceRoot,
        privateRoot,
        requestRelativePath: "request-hardlink.json",
        verifiedAt: "2026-08-28T00:00:00.000Z"
      }),
      /PRIVATE_FILE_ALIAS_FORBIDDEN/u
    );
    await rm(path.join(privateRoot, "request-hardlink.json"));
    let caught;
    try {
      await verifyBaziPrivateExactQuoteMaterialFromFiles({
        workspaceRoot,
        privateRoot,
        requestRelativePath: "request.json",
        verifiedAt: "2026-08-28T00:00:00.000Z"
      });
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof Error);
    assert.match(caught.message, /SOURCE_BODY_IDENTITY_MISMATCH/u);
    assert.equal(caught.message.includes("PRIVATE-SENTINEL-QUOTE"), false);

    const cli = await runVerifierCli([
      "--private-root",
      privateRoot,
      "--request",
      "request.json"
    ]);
    assert.equal(cli.exitCode, 1);
    assert.equal(cli.stdout, "");
    assert.match(cli.stderr, /SOURCE_BODY_IDENTITY_MISMATCH/u);
    assert.equal(cli.stderr.includes("PRIVATE-SENTINEL-QUOTE"), false);
    assert.equal(cli.stderr.includes(privateRoot), false);
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});

test("private filesystem and CLI failures redact paths and enforce the request byte ceiling", async () => {
  const sentinel = "PRIVATE-PATH-SENTINEL";
  const privateRoot = await mkdtemp(path.join(os.tmpdir(), `${sentinel}-`));
  const missingRequest = `missing-${sentinel}.json`;
  try {
    let caught;
    try {
      await verifyBaziPrivateExactQuoteMaterialFromFiles({
        workspaceRoot,
        privateRoot,
        requestRelativePath: missingRequest,
        verifiedAt: "2026-08-28T00:00:00.000Z"
      });
    } catch (error) {
      caught = error;
    }
    assert.ok(caught instanceof Error);
    assert.match(caught.message, /PRIVATE_FILE_READ_FAILED/u);
    assert.equal(caught.safeForCli, true);
    assert.equal(caught.message.includes(sentinel), false);
    assert.equal(caught.message.includes(privateRoot), false);

    const cli = await runVerifierCli([
      "--private-root",
      privateRoot,
      "--request",
      missingRequest
    ]);
    assert.equal(cli.exitCode, 1);
    assert.equal(cli.stdout, "");
    assert.match(cli.stderr, /PRIVATE_FILE_READ_FAILED/u);
    assert.equal(cli.stderr.includes(sentinel), false);
    assert.equal(cli.stderr.includes(privateRoot), false);

    const malformedSentinel = "PRIVATE-CLI-MALFORMED-SENTINEL";
    await writeFile(
      path.join(privateRoot, "malformed-request.json"),
      `{"request":"${malformedSentinel}"`,
      "utf8"
    );
    const malformedCli = await runVerifierCli([
      "--private-root",
      privateRoot,
      "--request",
      "malformed-request.json"
    ]);
    assert.equal(malformedCli.exitCode, 1);
    assert.match(malformedCli.stderr, /INVALID_JSON/u);
    assert.equal(malformedCli.stderr.includes(malformedSentinel), false);
    assert.equal(malformedCli.stderr.includes(privateRoot), false);

    await writeFile(path.join(privateRoot, "invalid-utf8-request.json"), Buffer.from([0xc3, 0x28]));
    const invalidUtf8Cli = await runVerifierCli([
      "--private-root",
      privateRoot,
      "--request",
      "invalid-utf8-request.json"
    ]);
    assert.equal(invalidUtf8Cli.exitCode, 1);
    assert.match(invalidUtf8Cli.stderr, /INVALID_UTF8/u);
    assert.equal(invalidUtf8Cli.stderr.includes(privateRoot), false);

    await writeFile(path.join(privateRoot, "oversized-request.json"), Buffer.alloc((64 * 1024) + 1, 0x61));
    await assert.rejects(
      verifyBaziPrivateExactQuoteMaterialFromFiles({
        workspaceRoot,
        privateRoot,
        requestRelativePath: "oversized-request.json",
        verifiedAt: "2026-08-28T00:00:00.000Z"
      }),
      /PRIVATE_FILE_SIZE_INVALID/u
    );
  } finally {
    await rm(privateRoot, { recursive: true, force: true });
  }
});
