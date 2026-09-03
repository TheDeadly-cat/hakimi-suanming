import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  BAZI_PROJECT_COPY_MATERIALIZATION_REQUIREMENTS_RELATIVE_PATH,
  BaziProjectCopyMaterializationError,
  MAX_BAZI_PROJECT_COPY_BYTES,
  buildCurrentBaziProjectCopyMaterializationRequirementsLedger,
  buildSyntheticBaziProjectCopyMaterializationCandidate,
  canonicalPrettyStringifyBaziProjectCopyMaterialization,
  computeBaziProjectCopyMaterializationCandidateDigest,
  computeBaziProjectCopyMaterializationRequirementsDigest,
  parseBaziProjectCopyMaterializationJsonBytes,
  readBaziProjectCopyMaterializationRequirementsLedger,
  verifyBaziProjectCopyMaterializationRequirementsLedger,
  verifySyntheticBaziProjectCopyMaterializationFromFile
} from "./bazi-project-copy-materialization-lib.mjs";

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, "..");
const VERIFIED_AT = "2026-08-29T01:02:03.000Z";
const DEFAULT_RELATIVE_PATH = "content/knowledge/documents/source.md";
const temporaryRoots = [];

function sha256(bytesOrText) {
  return createHash("sha256").update(bytesOrText).digest("hex");
}

function carrierForContent(content, overrides = {}) {
  const contentDigest = sha256(Buffer.from(content.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n"), "utf8"));
  const timestamp = "2026-08-29T00:00:00.000Z";
  return {
    schemaVersion: "1.0.0",
    recordType: "knowledge_source_carrier",
    carrierId: "22222222-2222-4222-8222-222222222222",
    documentId: "11111111-1111-4111-8111-111111111111",
    documentContentHash: contentDigest,
    carrierType: "private_transcription",
    provider: "synthetic-test-only",
    sourceUrl: null,
    acquiredAt: timestamp,
    accessMethod: "synthetic fixture; no external access",
    contentDigest,
    imageDigest: null,
    ocrDigest: null,
    rights: {
      status: "project_original_verified",
      jurisdiction: null,
      licenseId: null,
      copyrightNotice: "Synthetic test fixture only",
      reproductionAllowed: true,
      quotationAllowed: true,
      redistributionAllowed: true,
      evidenceRefs: ["https://example.invalid/synthetic-test-only"]
    },
    storagePolicy: "public_repo",
    review: {
      status: "double_reviewed",
      attestations: [
        { reviewerId: "synthetic-reviewer-a", reviewedAt: timestamp, note: "fixture only" },
        { reviewerId: "synthetic-reviewer-b", reviewedAt: timestamp, note: "fixture only" }
      ],
      note: "Synthetic schema fixture; not a real rights or reviewer claim."
    },
    editVersion: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

async function workspaceFixture({ bytes = Buffer.from("甲\n乙\n", "utf8"), relativePath = DEFAULT_RELATIVE_PATH } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-"));
  temporaryRoots.push(root);
  const absolute = path.join(root, ...relativePath.split("/"));
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, bytes);
  return { absolute, bytes, relativePath, root };
}

async function candidateFor({
  bytes = Buffer.from("甲\n乙\n", "utf8"),
  materializationId = "test-only.materialization-1",
  relativePath = DEFAULT_RELATIVE_PATH,
  sourceCarrierRecord = carrierForContent("甲\n乙\n")
} = {}) {
  return buildSyntheticBaziProjectCopyMaterializationCandidate({
    materializationId,
    projectCopyBytes: bytes,
    projectCopyRelativePath: relativePath,
    sourceCarrierRecord
  });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function resignCandidate(candidate) {
  candidate.candidateDigest = computeBaziProjectCopyMaterializationCandidateDigest(candidate);
  return candidate;
}

async function rejectCode(promiseOrFunction, code) {
  await assert.rejects(promiseOrFunction, (error) => {
    assert.ok(error instanceof BaziProjectCopyMaterializationError);
    assert.equal(error.code, code);
    return true;
  });
}

test.after(async () => {
  await Promise.all(temporaryRoots.map((root) => rm(root, { recursive: true, force: true })));
});

test("persisted C-M1 ledger is canonical, current and exactly zero-instance", async () => {
  const ledger = await readBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT);
  const verified = await verifyBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT, ledger);
  assert.equal(verified.status, "zero_instance_materialization_requirements_defined");
  assert.equal(verified.formalSourceCarrierRecords, 0);
  assert.equal(verified.projectCopyMaterializationRecords, 0);
  assert.equal(verified.materializationsVerified, 0);
  assert.equal(verified.releaseReady, false);
  assert.equal(verified.publicDeploymentAuthorized, false);
  assert.ok(Object.isFrozen(verified.ledger));
  assert.ok(Object.isFrozen(verified.ledger.basisArtifacts));
  const bytes = await readFile(path.join(WORKSPACE_ROOT, ...BAZI_PROJECT_COPY_MATERIALIZATION_REQUIREMENTS_RELATIVE_PATH.split("/")));
  assert.equal(bytes.toString("utf8"), canonicalPrettyStringifyBaziProjectCopyMaterialization(ledger));
});

test("current builder binds the empty manifest, formal carrier schema, knowledge basis and three C parent ledgers", async () => {
  const ledger = await buildCurrentBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT);
  assert.equal(ledger.basisArtifacts.length, 6);
  assert.deepEqual(ledger.basisArtifacts.map((entry) => entry.role), [
    "current_empty_bundled_knowledge_manifest",
    "formal_source_carrier_schema_basis",
    "knowledge_text_normalization_and_materialization_basis",
    "phase_c_source_candidate_parent_ledger",
    "phase_c_rights_candidate_parent_ledger",
    "phase_c_binding_freeze_parent_ledger"
  ]);
  assert.equal(ledger.currentInventory.bundledManifestEntries, 0);
  assert.equal(ledger.currentInventory.sourceBindingsFrozen, 0);
  assert.equal(ledger.currentInventory.sourceBindingsRequired, 12);
  assert.equal(ledger.ledgerDigest, computeBaziProjectCopyMaterializationRequirementsDigest(ledger));
});

test("ledger cannot promote carrier, materialization, rights, epoch or release state", async () => {
  const current = clone(await buildCurrentBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT));
  for (const mutate of [
    (value) => { value.currentInventory.formalSourceCarrierRecords = 1; },
    (value) => { value.currentInventory.projectCopyMaterializationRecords = 1; },
    (value) => { value.gateSummary.materializationsVerified = 1; },
    (value) => { value.authorityBoundary.rightsEffect = "verified"; },
    (value) => { value.observationBoundary.mutationEpochAvailableForSchema13 = true; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; }
  ]) {
    const forged = clone(current);
    mutate(forged);
    forged.ledgerDigest = computeBaziProjectCopyMaterializationRequirementsDigest(forged);
    await assert.rejects(
      verifyBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT, forged),
      BaziProjectCopyMaterializationError
    );
  }
});

test("strict JSON rejects duplicate keys, BOM and invalid UTF-8", () => {
  assert.throws(
    () => parseBaziProjectCopyMaterializationJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseBaziProjectCopyMaterializationJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseBaziProjectCopyMaterializationJsonBytes(Buffer.from([0xc3, 0x28]), "private-path-and-content-sentinel"),
    (error) => {
      assert.equal(error.code, "JSON_UTF8_INVALID");
      assert.equal(error.message.includes("private-path-and-content-sentinel"), false);
      assert.equal("cause" in error, false);
      return true;
    }
  );
});

test("descriptor-safe capture rejects Proxy, accessor, Symbol, sparse arrays, cycles and excessive depth", async () => {
  const current = await buildCurrentBaziProjectCopyMaterializationRequirementsLedger(WORKSPACE_ROOT);
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(new Proxy(current, {})),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
  let getterInvoked = false;
  const accessor = clone(current);
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    get() {
      getterInvoked = true;
      return current.status;
    }
  });
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(getterInvoked, false);
  const symbol = clone(current);
  symbol[Symbol("hidden")] = true;
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );
  const sparse = clone(current);
  sparse.doesNotEstablish = new Array(2);
  sparse.doesNotEstablish[1] = "x";
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );
  const cycle = clone(current);
  cycle.self = cycle;
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(cycle),
    (error) => error.code === "INPUT_CYCLE_FORBIDDEN"
  );
  let deep = {};
  const root = deep;
  for (let index = 0; index < 70; index += 1) {
    deep.next = {};
    deep = deep.next;
  }
  assert.throws(
    () => computeBaziProjectCopyMaterializationRequirementsDigest(root),
    (error) => error.code === "INPUT_DEPTH_EXCEEDED"
  );
});

test("synthetic candidate binds carrier ID, edit version, canonical digest, document and both project identities", async () => {
  const candidate = await candidateFor();
  assert.equal(candidate.sourceCarrierRef.carrierId, "22222222-2222-4222-8222-222222222222");
  assert.equal(candidate.sourceCarrierRef.editVersion, 1);
  assert.equal(candidate.sourceCarrierRef.contentDigest, candidate.projectCopy.normalizedContentSha256);
  assert.match(candidate.sourceCarrierRef.canonicalRecordSha256, /^[a-f0-9]{64}$/u);
  assert.equal(candidate.projectCopy.rawBytes, Buffer.byteLength("甲\n乙\n"));
  assert.equal(candidate.authorityBoundary.rightsEffect, "none");
  assert.equal(candidate.authorityBoundary.legalConclusion, "not_established");
  assert.ok(Object.isFrozen(candidate));
  assert.ok(Object.isFrozen(candidate.sourceCarrierRef));
  assert.equal(candidate.candidateDigest, computeBaziProjectCopyMaterializationCandidateDigest(candidate));
});

test("file preflight uses the candidate project file and returns only a deep-frozen redacted receipt", async () => {
  const fixture = await workspaceFixture();
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ bytes: fixture.bytes, sourceCarrierRecord: carrier });
  const receipt = await verifySyntheticBaziProjectCopyMaterializationFromFile({
    candidate,
    sourceCarrierRecord: carrier,
    verifiedAt: VERIFIED_AT,
    workspaceRoot: fixture.root
  });
  assert.equal(receipt.gateSummary.candidateMaterializationPreflightVerified, true);
  assert.equal(receipt.gateSummary.formalMaterializationVerified, false);
  assert.equal(receipt.gateSummary.materializationsVerifiedEffect, 0);
  assert.equal(receipt.authorityBoundary.rightsEffect, "none");
  assert.equal(receipt.observationBoundary.rawHashUtf8DecodeAndNormalizationUseSameBuffer, true);
  assert.equal(receipt.redactionBoundary.absolutePathStored, false);
  assert.equal(receipt.redactionBoundary.projectCopyBytesStored, false);
  assert.equal("content" in receipt, false);
  assert.equal("bytes" in receipt, false);
  assert.ok(Object.isFrozen(receipt));
  assert.ok(Object.isFrozen(receipt.projectCopyIdentity));
});

test("LF, CRLF and BOM variants share normalized hash but retain different raw identities", async () => {
  const lf = Buffer.from("甲\n乙\n", "utf8");
  const crlf = Buffer.from("甲\r\n乙\r\n", "utf8");
  const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), lf]);
  const carrier = carrierForContent("甲\n乙\n");
  const candidates = [];
  for (const [index, bytes] of [lf, crlf, bom].entries()) {
    candidates.push(await candidateFor({
      bytes,
      materializationId: `test-only.variant-${index}`,
      sourceCarrierRecord: carrier
    }));
  }
  assert.equal(new Set(candidates.map((entry) => entry.projectCopy.normalizedContentSha256)).size, 1);
  assert.equal(new Set(candidates.map((entry) => entry.projectCopy.rawSha256)).size, 3);
  const fixture = await workspaceFixture({ bytes: crlf });
  await rejectCode(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate: candidates[0],
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    "PROJECT_COPY_RAW_IDENTITY_MISMATCH"
  );
  for (const [index, bytes] of [lf, crlf, bom].entries()) {
    await writeFile(fixture.absolute, bytes);
    const receipt = await verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate: candidates[index],
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    });
    assert.equal(receipt.projectCopyIdentity.rawSha256, candidates[index].projectCopy.rawSha256);
  }
});

test("carrier ID, editVersion, canonical record digest, contentDigest and documentId cannot be rebound", async () => {
  const fixture = await workspaceFixture();
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  const carrierMutations = [
    { ...carrier, carrierId: "33333333-3333-4333-8333-333333333333" },
    { ...carrier, editVersion: 2 },
    { ...carrier, documentId: "44444444-4444-4444-8444-444444444444" },
    { ...carrier, provider: "changed-but-schema-valid" }
  ];
  for (const forgedCarrier of carrierMutations) {
    await rejectCode(
      verifySyntheticBaziProjectCopyMaterializationFromFile({
        candidate,
        sourceCarrierRecord: forgedCarrier,
        verifiedAt: VERIFIED_AT,
        workspaceRoot: fixture.root
      }),
      "CARRIER_PROJECT_COPY_BINDING_MISMATCH"
    );
  }
  const forgedCandidate = clone(candidate);
  forgedCandidate.sourceCarrierRef.contentDigest = "f".repeat(64);
  resignCandidate(forgedCandidate);
  await rejectCode(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate: forgedCandidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    "CARRIER_PROJECT_COPY_BINDING_MISMATCH"
  );
});

test("raw SHA and byte count are independently required", async () => {
  const fixture = await workspaceFixture();
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  for (const mutate of [
    (value) => { value.projectCopy.rawSha256 = "f".repeat(64); },
    (value) => { value.projectCopy.rawBytes += 1; }
  ]) {
    const forged = clone(candidate);
    mutate(forged);
    resignCandidate(forged);
    await rejectCode(
      verifySyntheticBaziProjectCopyMaterializationFromFile({
        candidate: forged,
        sourceCarrierRecord: carrier,
        verifiedAt: VERIFIED_AT,
        workspaceRoot: fixture.root
      }),
      "PROJECT_COPY_RAW_IDENTITY_MISMATCH"
    );
  }
});

test("normalization profile drift and OCR, transcription, collation or authority promotion fail closed", async () => {
  const fixture = await workspaceFixture();
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  const cases = [
    (value) => { value.normalizationProfile.profileId = "other-profile"; },
    (value) => { value.transformationBoundary.ocrPerformed = true; },
    (value) => { value.transformationBoundary.transcriptionPerformed = true; },
    (value) => { value.transformationBoundary.collationPerformed = true; },
    (value) => { value.transformationBoundary.humanAccuracyReviewed = true; },
    (value) => { value.authorityBoundary.legalConclusion = "established"; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; }
  ];
  for (const mutate of cases) {
    const forged = clone(candidate);
    mutate(forged);
    resignCandidate(forged);
    await assert.rejects(
      verifySyntheticBaziProjectCopyMaterializationFromFile({
        candidate: forged,
        sourceCarrierRecord: carrier,
        verifiedAt: VERIFIED_AT,
        workspaceRoot: fixture.root
      }),
      BaziProjectCopyMaterializationError
    );
  }
});

test("path escape, absolute, backslash, terminal or intermediate ADS and wrong prefix are rejected", async () => {
  const bytes = Buffer.from("甲\n乙\n", "utf8");
  const carrier = carrierForContent("甲\n乙\n");
  const invalidPaths = [
    "../source.md",
    "/content/knowledge/documents/source.md",
    "C:/content/knowledge/documents/source.md",
    "content\\knowledge\\documents\\source.md",
    "content/knowledge/documents/source.md:stream",
    "content/knowledge/documents:stream/source.md",
    "content/knowledge/source.md",
    "content/knowledge/documents/source.json"
  ];
  for (const projectCopyRelativePath of invalidPaths) {
    await assert.rejects(
      buildSyntheticBaziProjectCopyMaterializationCandidate({
        materializationId: "test-only.invalid-path",
        projectCopyBytes: bytes,
        projectCopyRelativePath,
        sourceCarrierRecord: carrier
      }),
      BaziProjectCopyMaterializationError
    );
  }
});

test("nested directory junction or symlink is rejected", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-link-root-"));
  const external = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-link-external-"));
  temporaryRoots.push(root, external);
  const alias = path.join(root, "content", "knowledge", "documents");
  await mkdir(path.dirname(alias), { recursive: true });
  await writeFile(path.join(external, "source.md"), "甲\n乙\n", "utf8");
  try {
    await symlink(external, alias, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    context.skip(`directory alias unavailable: ${error.code ?? "unknown"}`);
    return;
  }
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  await assert.rejects(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: root
    }),
    BaziProjectCopyMaterializationError
  );
});

test("hard-link project copy is rejected", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-hardlink-root-"));
  const external = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-hardlink-external-"));
  temporaryRoots.push(root, external);
  const target = path.join(root, ...DEFAULT_RELATIVE_PATH.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  const original = path.join(external, "source.md");
  await writeFile(original, "甲\n乙\n", "utf8");
  await link(original, target);
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  await rejectCode(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: root
    }),
    "HARD_LINK_FORBIDDEN"
  );
});

test("directory or other special endpoint cannot stand in for a project file", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-special-"));
  temporaryRoots.push(root);
  const target = path.join(root, ...DEFAULT_RELATIVE_PATH.split("/"));
  await mkdir(target, { recursive: true });
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  await assert.rejects(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: root
    }),
    BaziProjectCopyMaterializationError
  );
});

test("oversized project bytes fail both candidate and filesystem preflight", async () => {
  const carrier = carrierForContent("甲\n乙\n");
  const oversized = Buffer.alloc(MAX_BAZI_PROJECT_COPY_BYTES + 1, 0x61);
  await rejectCode(
    buildSyntheticBaziProjectCopyMaterializationCandidate({
      materializationId: "test-only.oversized",
      projectCopyBytes: oversized,
      projectCopyRelativePath: DEFAULT_RELATIVE_PATH,
      sourceCarrierRecord: carrier
    }),
    "FILE_SIZE_INVALID"
  );
  const fixture = await workspaceFixture();
  const candidate = await candidateFor({ sourceCarrierRecord: carrier });
  await writeFile(fixture.absolute, oversized);
  await rejectCode(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    "FILE_SIZE_INVALID"
  );
});

test("byte APIs use exact TypedArray slots and reject subclasses without invoking hostile accessors", async () => {
  let accessorCalls = 0;
  class HostileBytes extends Uint8Array {
    get buffer() {
      accessorCalls += 1;
      return new ArrayBuffer(0);
    }

    get byteLength() {
      accessorCalls += 1;
      return 1;
    }

    get byteOffset() {
      accessorCalls += 1;
      return 0;
    }

    get length() {
      accessorCalls += 1;
      return 1;
    }
  }

  const hostileJson = new HostileBytes(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseBaziProjectCopyMaterializationJsonBytes(hostileJson),
    (error) => error instanceof BaziProjectCopyMaterializationError
      && error.code === "JSON_TOO_LARGE"
  );
  await rejectCode(
    buildSyntheticBaziProjectCopyMaterializationCandidate({
      materializationId: "test-only.hostile-byte-subclass",
      projectCopyBytes: new HostileBytes(Buffer.from("甲\n乙\n", "utf8")),
      projectCopyRelativePath: DEFAULT_RELATIVE_PATH,
      sourceCarrierRecord: carrierForContent("甲\n乙\n")
    }),
    "FILE_SIZE_INVALID"
  );
  assert.equal(accessorCalls, 0);

  const oversizedExactBytes = new Uint8Array(MAX_BAZI_PROJECT_COPY_BYTES + 1);
  for (const property of ["buffer", "byteLength", "byteOffset", "length"]) {
    Object.defineProperty(oversizedExactBytes, property, {
      configurable: true,
      get() {
        accessorCalls += 1;
        return property === "buffer" ? new ArrayBuffer(1) : 1;
      }
    });
  }
  await rejectCode(
    buildSyntheticBaziProjectCopyMaterializationCandidate({
      materializationId: "test-only.forged-small-byte-view",
      projectCopyBytes: oversizedExactBytes,
      projectCopyRelativePath: DEFAULT_RELATIVE_PATH,
      sourceCarrierRecord: carrierForContent("甲\n乙\n")
    }),
    "FILE_SIZE_INVALID"
  );
  assert.equal(accessorCalls, 0);

  const exactBytes = new Uint8Array(Buffer.from("甲\n乙\n", "utf8"));
  for (const property of ["buffer", "byteLength", "byteOffset", "length"]) {
    Object.defineProperty(exactBytes, property, {
      configurable: true,
      get() {
        accessorCalls += 1;
        throw new Error("hostile byte metadata getter must not run");
      }
    });
  }
  const candidate = await candidateFor({ bytes: exactBytes });
  assert.equal(candidate.projectCopy.rawBytes, Buffer.byteLength("甲\n乙\n", "utf8"));
  assert.equal(accessorCalls, 0);
});

test("parent directory mutation after initial chain capture fails closed", async () => {
  const relativePath = "content/knowledge/documents/nested/source.md";
  const fixture = await workspaceFixture({ relativePath });
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ relativePath, sourceCarrierRecord: carrier });
  const parent = path.dirname(fixture.absolute);
  await assert.rejects(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      testHooks: {
        afterDirectoryChainBeforeOpen: async () => writeFile(path.join(parent, "mutation-marker"), "x", "utf8")
      },
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    BaziProjectCopyMaterializationError
  );
});

test("parent directory mutation after held-handle read fails closed", async () => {
  const relativePath = "content/knowledge/documents/nested/source.md";
  const fixture = await workspaceFixture({ relativePath });
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ relativePath, sourceCarrierRecord: carrier });
  const parent = path.dirname(fixture.absolute);
  await assert.rejects(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      testHooks: {
        afterHeldHandleRead: async () => writeFile(path.join(parent, "mutation-marker"), "x", "utf8")
      },
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    BaziProjectCopyMaterializationError
  );
});

test("strict project UTF-8 is required even when forged raw identity matches", async () => {
  const invalidBytes = Buffer.from([0xc3, 0x28]);
  const fixture = await workspaceFixture({ bytes: invalidBytes });
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = clone(await candidateFor({ sourceCarrierRecord: carrier }));
  candidate.projectCopy.rawBytes = invalidBytes.byteLength;
  candidate.projectCopy.rawSha256 = sha256(invalidBytes);
  resignCandidate(candidate);
  await rejectCode(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: fixture.root
    }),
    "PROJECT_COPY_UTF8_INVALID"
  );
});

test("NUL and empty normalized content cannot become candidates", async () => {
  const carrier = carrierForContent("甲\n乙\n");
  for (const bytes of [Buffer.from("甲\0乙", "utf8"), Buffer.from(" \r\n ", "utf8")]) {
    await rejectCode(
      buildSyntheticBaziProjectCopyMaterializationCandidate({
        materializationId: "test-only.invalid-content",
        projectCopyBytes: bytes,
        projectCopyRelativePath: DEFAULT_RELATIVE_PATH,
        sourceCarrierRecord: carrier
      }),
      "PROJECT_COPY_NORMALIZATION_FAILED"
    );
  }
});

test("filesystem failures redact workspace, relative path and source content", async () => {
  const relativePath = "content/knowledge/documents/private-sentinel-source.md";
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-c-m1-redaction-"));
  temporaryRoots.push(root);
  await mkdir(path.join(root, "content", "knowledge", "documents"), { recursive: true });
  const carrier = carrierForContent("甲\n乙\n");
  const candidate = await candidateFor({ relativePath, sourceCarrierRecord: carrier });
  await assert.rejects(
    verifySyntheticBaziProjectCopyMaterializationFromFile({
      candidate,
      sourceCarrierRecord: carrier,
      verifiedAt: VERIFIED_AT,
      workspaceRoot: root
    }),
    (error) => {
      assert.ok(error instanceof BaziProjectCopyMaterializationError);
      assert.equal(error.message.includes(root), false);
      assert.equal(error.message.includes("private-sentinel-source.md"), false);
      assert.equal(error.message.includes("甲"), false);
      return true;
    }
  );
});

test("candidate JSON round-trip remains strict, detached and digest-stable", async () => {
  const candidate = await candidateFor();
  const parsed = parseBaziProjectCopyMaterializationJsonBytes(
    Buffer.from(canonicalPrettyStringifyBaziProjectCopyMaterialization(candidate), "utf8"),
    "candidate JSON"
  );
  assert.notEqual(parsed, candidate);
  assert.deepEqual(parsed, candidate);
  assert.equal(parsed.candidateDigest, computeBaziProjectCopyMaterializationCandidateDigest(parsed));
});
