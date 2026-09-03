import assert from "node:assert/strict";
import {
  copyFileSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { readVedicInputContractDraft } from "./vedic-input-contract-draft-lib.mjs";
import {
  buildFixedVedicInputStructuralRejectionProbes,
  canonicalStringifyVedicInputStructuralRejectionValue,
  computeVedicInputStructuralDiagnosticReceiptIdentity,
  executeVedicInputStructuralRejectionPrecheck,
  isTrustedVedicInputStructuralDiagnosticReceipt,
  parseVedicInputStructuralPrecheckCandidateJsonBytes,
  vedicInputStructuralRejectionExecutionTestOnly
} from "./vedic-input-structural-rejection-execution-lib.mjs";
import {
  VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH,
  buildCurrentVedicInputStructuralRejectionEvidence,
  canonicalPrettyStringifyVedicInputStructuralRejectionEvidence,
  canonicalStringifyVedicInputStructuralRejectionEvidence,
  computeVedicInputStructuralRejectionEvidenceDigest,
  parseVedicInputStructuralRejectionEvidenceJsonBytes,
  readVedicInputStructuralRejectionEvidence,
  vedicInputStructuralRejectionEvidenceTestOnly,
  verifyVedicInputStructuralRejectionEvidence
} from "./vedic-input-structural-rejection-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readVedicInputContractDraft(workspaceRoot);
const baselineEvidence = await readVedicInputStructuralRejectionEvidence(workspaceRoot);
const CLI_PATH = path.join(workspaceRoot, "scripts", "verify-vedic-input-structural-rejection-execution.mjs");
const RESTRICTED_RELATIVE_PATH = "apps/web/src/lib/local-user-data-cleanup.ts";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function throwsCode(action, code) {
  assert.throws(action, (error) => error?.code === code);
}

function assertDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

function completeProbe() {
  return clone(vedicInputStructuralRejectionExecutionTestOnly.makeCompleteNoPersonProbe());
}

function receiptFor(candidate) {
  return executeVedicInputStructuralRejectionPrecheck(candidate, schema);
}

function resignEvidence(mutator) {
  const candidate = clone(baselineEvidence);
  mutator(candidate);
  candidate.evidenceDigest = computeVedicInputStructuralRejectionEvidenceDigest(candidate);
  return candidate;
}

function createTempWorkspace(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "hakimi-vedic-rejection-"));
  t.after(() => {
    const resolved = path.resolve(root);
    assert.equal(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep), true);
    rmSync(resolved, { force: true, recursive: true });
  });
  const files = [
    "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
    "content/system-admission/vedic-input-contract-requirements.v1.json",
    VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH,
    "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
    "scripts/vedic-input-contract-draft-lib.mjs",
    "scripts/vedic-input-contract-requirements-lib.mjs",
    "scripts/vedic-input-structural-rejection-execution-lib.mjs"
  ];
  for (const relative of files) {
    const target = path.join(root, ...relative.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(workspaceRoot, ...relative.split("/")), target);
  }
  return root;
}

function sanitizedEnvironment(extra = {}) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  return { ...env, ...extra };
}

test("authoritative child is canonical, current, recursively frozen and exactly bounded", async () => {
  const raw = readFileSync(
    path.join(workspaceRoot, ...VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH.split("/"))
  );
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicInputStructuralRejectionEvidence(baselineEvidence));
  const result = await verifyVedicInputStructuralRejectionEvidence(workspaceRoot, baselineEvidence);
  assert.equal(result.fixedProbeSetVerified, true);
  assert.equal(result.probeCoverageComplete, false);
  assert.equal(result.diagnosticProbeExecutions, 4);
  assert.equal(result.acceptedInputs, 0);
  assert.equal(result.inputInstances, 0);
  assert.equal(result.productInputRejectionReceipts, 0);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicDeploymentAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assertDeepFrozen(result.evidence);
});

test("two current rebuilds are byte-identical and bind the exact local execution closure", async () => {
  const first = await buildCurrentVedicInputStructuralRejectionEvidence(workspaceRoot);
  const second = await buildCurrentVedicInputStructuralRejectionEvidence(workspaceRoot);
  assert.equal(
    canonicalStringifyVedicInputStructuralRejectionEvidence(first),
    canonicalStringifyVedicInputStructuralRejectionEvidence(second)
  );
  assert.deepEqual(
    first.localExecutionClosureBindings.map((entry) => entry.path),
    [...vedicInputStructuralRejectionEvidenceTestOnly.localExecutionClosurePaths]
  );
  assert.equal(first.evidenceDigest, baselineEvidence.evidenceDigest);
});

test("fixed probes have exact order, unique identities and calibrated diagnostics", () => {
  const probes = buildFixedVedicInputStructuralRejectionProbes();
  assert.deepEqual(
    probes.map((entry) => entry.probeId),
    [...vedicInputStructuralRejectionExecutionTestOnly.probeIds]
  );
  const receipts = probes.map((entry) => receiptFor(entry.candidate));
  assert.deepEqual(
    receipts.map((entry) => entry.diagnostic.code),
    vedicInputStructuralRejectionEvidenceTestOnly.expectedDiagnostics.map((entry) => entry.code)
  );
  assert.equal(new Set(receipts.map((entry) => entry.candidateIdentity.canonicalDigest)).size, 4);
  for (const receipt of receipts) {
    assert.equal(receipt.inputAccepted, false);
    assert.equal(receipt.inputRejectionCapabilityEstablished, false);
    assert.equal(receipt.countsAsInputInstance, false);
    assert.equal(receipt.countsAsProductInputRejectionReceipt, false);
    assert.equal(receipt.countsTowardAdmission, false);
    assert.equal(Object.values(receipt.artifactOutputs).every((value) => value === false), true);
    assert.equal(Object.values(receipt.authorityBoundary).every((value) => value === false), true);
    assertDeepFrozen(receipt);
  }
});

test("missing-field probe differs from the shape-conforming baseline only at its target", () => {
  const probes = buildFixedVedicInputStructuralRejectionProbes();
  const missing = clone(probes[0].candidate);
  const baseline = completeProbe();
  assert.equal(Object.hasOwn(missing, "civil_calendar_and_date"), false);
  delete baseline.civil_calendar_and_date;
  assert.deepEqual(missing, baseline);
  const receipt = receiptFor(missing);
  assert.equal(receipt.diagnostic.code, "SCHEMA_REQUIRED_PROPERTY_MISSING");
  assert.equal(receipt.diagnostic.jsonPointer, "/civil_calendar_and_date");
  assert.equal(receipt.diagnostic.draftSchemaShapeConforming, false);
});

test("63-character digest has one causal contrast and 64 lowercase hex remains rejected at admission", () => {
  const invalid = completeProbe();
  invalid.ephemeris_identity_version_and_coverage.data_digest_sha256 = "a".repeat(63);
  const invalidReceipt = receiptFor(invalid);
  assert.equal(invalidReceipt.diagnostic.code, "SCHEMA_PATTERN_MISMATCH");
  assert.equal(
    invalidReceipt.diagnostic.jsonPointer,
    "/ephemeris_identity_version_and_coverage/data_digest_sha256"
  );
  const contrast = clone(invalid);
  contrast.ephemeris_identity_version_and_coverage.data_digest_sha256 = "a".repeat(64);
  const contrastReceipt = receiptFor(contrast);
  assert.equal(contrastReceipt.diagnostic.code, "INPUT_CONTRACT_NOT_ADMITTED");
  assert.equal(contrastReceipt.diagnostic.draftSchemaShapeConforming, true);
});

test("declared DST gap is rejected without claiming tzdb or nonexistent-wall-time truth", () => {
  const gap = completeProbe();
  gap.dst_gap_overlap_resolution = {
    classification: "gap",
    rejection_code: "nonexistent_local_wall_time",
    resolution_policy_id: "probe-unselected",
    resolution_policy_version: "probe-unselected"
  };
  const receipt = receiptFor(gap);
  assert.equal(receipt.diagnostic.code, "DECLARED_DST_GAP_REJECTED");
  assert.equal(receipt.diagnostic.draftSchemaShapeConforming, true);
  assert.equal(receipt.diagnostic.dstClassificationVerified, false);
  assert.equal(receipt.diagnostic.ianaTimeZoneResolved, false);
  assert.equal(receipt.diagnostic.nonexistentWallTimeEstablished, false);
  assert.equal(receipt.diagnostic.timeResolutionPerformed, false);
  assert.equal(receipt.artifactOutputs.timeResolutionReceiptIssued, false);
});

test("shape-conforming impossible calendar date is not promoted to calendar validity", () => {
  const candidate = completeProbe();
  candidate.civil_calendar_and_date = {
    ...candidate.civil_calendar_and_date,
    day: 31,
    month: 2,
    year: 2026
  };
  const receipt = receiptFor(candidate);
  assert.equal(receipt.diagnostic.code, "INPUT_CONTRACT_NOT_ADMITTED");
  assert.equal(receipt.diagnostic.draftSchemaShapeConforming, true);
  assert.equal(baselineEvidence.semanticValidationBoundary.calendarValidityEstablished, false);
  assert.equal(baselineEvidence.semanticValidationBoundary.semanticValidationPerformed, false);
});

test("unknown field, wrong contract, oneOf mismatch, duplicate candidates and empty candidates reject deterministically", () => {
  const unknown = completeProbe();
  unknown.cross_system_fallback = {};
  const unknownReceipt = receiptFor(unknown);
  assert.equal(unknownReceipt.diagnostic.code, "SCHEMA_ADDITIONAL_PROPERTY_FORBIDDEN");
  assert.equal(unknownReceipt.diagnostic.jsonPointer, "");
  assert.equal(
    canonicalStringifyVedicInputStructuralRejectionValue(unknownReceipt)
      .includes("cross_system_fallback"),
    false
  );

  const wrongContract = completeProbe();
  wrongContract.contractVersion = "hakimi.vedic.input/1";
  assert.equal(receiptFor(wrongContract).diagnostic.code, "SCHEMA_CONST_MISMATCH");

  const wrongBranch = completeProbe();
  wrongBranch.birth_time_uncertainty_interval_or_candidates.representation = "invented";
  assert.equal(receiptFor(wrongBranch).diagnostic.code, "SCHEMA_ONE_OF_MISMATCH");

  const duplicate = completeProbe();
  duplicate.birth_time_perturbation_candidates_and_transition_points.candidate_instants =
    ["same", "same"];
  assert.equal(receiptFor(duplicate).diagnostic.code, "SCHEMA_UNIQUE_ITEMS_MISMATCH");

  const empty = completeProbe();
  empty.birth_time_perturbation_candidates_and_transition_points.candidate_instants = [];
  assert.equal(receiptFor(empty).diagnostic.code, "SCHEMA_MIN_ITEMS_MISMATCH");
});

test("runtime receipt brand is private, non-serializable and module-instance scoped", async () => {
  const receipt = receiptFor(completeProbe());
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt(receipt), true);
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt({ ...receipt }), false);
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt(clone(receipt)), false);
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt(structuredClone(receipt)), false);
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt(Object.create(receipt)), false);

  const isolated = await import("./vedic-input-structural-rejection-execution-lib.mjs?isolated_receipt_registry=1");
  assert.equal(isolated.isTrustedVedicInputStructuralDiagnosticReceipt(receipt), false);
  assert.equal(
    isTrustedVedicInputStructuralDiagnosticReceipt(
      isolated.executeVedicInputStructuralRejectionPrecheck(completeProbe(), schema)
    ),
    false
  );
  assert.equal(baselineEvidence.receiptBoundary.runtimeReceiptRegistrationNotSerializable, true);
  assert.equal(
    baselineEvidence.probeExecution.probeResults.every(
      (entry) => entry.savedEvidenceReceiptIsRuntimeReceipt === false
    ),
    true
  );
});

test("arbitrary caller schemas cannot mint trusted receipts and receipt identity binds the approved schema", () => {
  const candidate = {
    person_name: "Alice",
    secret: "sentinel"
  };
  throwsCode(
    () => executeVedicInputStructuralRejectionPrecheck(candidate, {}),
    "SCHEMA_IDENTITY_INVALID"
  );
  const realSchemaReceipt = executeVedicInputStructuralRejectionPrecheck(candidate, schema);
  const clonedSchemaReceipt = executeVedicInputStructuralRejectionPrecheck(candidate, clone(schema));
  assert.equal(isTrustedVedicInputStructuralDiagnosticReceipt(realSchemaReceipt), true);
  assert.equal(realSchemaReceipt.receiptId, clonedSchemaReceipt.receiptId);
  assert.deepEqual(
    realSchemaReceipt.schemaIdentity,
    vedicInputStructuralRejectionExecutionTestOnly.expectedSchemaIdentity
  );
  assert.equal(realSchemaReceipt.receiptIdentity.bindsCandidateSchemaAndDiagnostic, true);
  assert.equal(
    computeVedicInputStructuralDiagnosticReceiptIdentity(realSchemaReceipt),
    realSchemaReceipt.receiptIdentity.digest
  );
  assert.equal(
    realSchemaReceipt.receiptId,
    "hakimi.vedic.structural-precheck-diagnostic/" + realSchemaReceipt.receiptIdentity.digest
  );
  assert.equal(Object.hasOwn(realSchemaReceipt.candidateIdentity, "containsPersonIdentity"), false);
  assert.equal(realSchemaReceipt.candidateIdentity.personalDataPresenceAssessed, false);
  assert.equal(realSchemaReceipt.candidateIdentity.digestIsAnonymous, false);
  assert.equal(realSchemaReceipt.candidateIdentity.digestIsSafeToPublish, false);
});

test("object API rejects accessors without invocation plus Proxy, Symbol, custom prototype, sparse, cycle, alias and -0", () => {
  let getterCalls = 0;
  const accessor = completeProbe();
  Object.defineProperty(accessor, "civil_calendar_and_date", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return {};
    }
  });
  throwsCode(() => receiptFor(accessor), "INPUT_ACCESSOR_FORBIDDEN");
  assert.equal(getterCalls, 0);

  throwsCode(() => receiptFor(new Proxy(completeProbe(), {})), "INPUT_PROXY_FORBIDDEN");

  const symbol = completeProbe();
  symbol[Symbol("forbidden")] = true;
  throwsCode(() => receiptFor(symbol), "INPUT_SYMBOL_FORBIDDEN");

  const custom = completeProbe();
  custom.civil_calendar_and_date = Object.assign(Object.create(null), custom.civil_calendar_and_date);
  throwsCode(() => receiptFor(custom), "INPUT_PROTOTYPE_INVALID");

  const sparse = completeProbe();
  sparse.birth_time_perturbation_candidates_and_transition_points.candidate_instants = new Array(1);
  throwsCode(() => receiptFor(sparse), "INPUT_ARRAY_INVALID");

  const cycle = completeProbe();
  cycle.loop = cycle;
  throwsCode(() => receiptFor(cycle), "INPUT_CYCLE_FORBIDDEN");

  const alias = completeProbe();
  const shared = { probe: true };
  alias.alias_a = shared;
  alias.alias_b = shared;
  throwsCode(() => receiptFor(alias), "INPUT_ALIAS_FORBIDDEN");

  const negativeZero = completeProbe();
  negativeZero.place_coordinates_and_precision.latitude_degrees = -0;
  throwsCode(() => receiptFor(negativeZero), "INPUT_VALUE_INVALID");
});

test("candidate mutation after capture cannot alter the frozen receipt", () => {
  const candidate = completeProbe();
  const receipt = receiptFor(candidate);
  const before = canonicalStringifyVedicInputStructuralRejectionValue(receipt);
  candidate.contractVersion = "mutated";
  candidate.place_coordinates_and_precision.latitude_degrees = 90;
  assert.equal(canonicalStringifyVedicInputStructuralRejectionValue(receipt), before);
  assert.equal(receipt.diagnostic.code, "INPUT_CONTRACT_NOT_ADMITTED");
});

test("raw candidate parser rejects duplicate keys, BOM, invalid UTF-8, non-object roots and oversize", () => {
  throwsCode(
    () => parseVedicInputStructuralPrecheckCandidateJsonBytes(
      Buffer.from('{"contractVersion":"a","contractVersion":"b"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  throwsCode(
    () => parseVedicInputStructuralPrecheckCandidateJsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}", "utf8")])
    ),
    "JSON_BOM_FORBIDDEN"
  );
  throwsCode(
    () => parseVedicInputStructuralPrecheckCandidateJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  throwsCode(
    () => parseVedicInputStructuralPrecheckCandidateJsonBytes(Buffer.from("[]", "utf8")),
    "JSON_INVALID"
  );
  throwsCode(
    () => parseVedicInputStructuralPrecheckCandidateJsonBytes(
      Buffer.alloc(vedicInputStructuralRejectionExecutionTestOnly.maxCandidateBytes + 1, 0x20)
    ),
    "JSON_TOO_LARGE"
  );
});

test("evidence parser rejects duplicate keys, BOM and invalid UTF-8", () => {
  throwsCode(
    () => parseVedicInputStructuralRejectionEvidenceJsonBytes(
      Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  throwsCode(
    () => parseVedicInputStructuralRejectionEvidenceJsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}", "utf8")])
    ),
    "JSON_BOM_FORBIDDEN"
  );
  throwsCode(
    () => parseVedicInputStructuralRejectionEvidenceJsonBytes(Buffer.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
});

test("saved evidence contains no raw probe sentinels or person-like payload", () => {
  const raw = readFileSync(
    path.join(workspaceRoot, ...VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH.split("/")),
    "utf8"
  );
  for (const forbidden of [
    "probe-unselected",
    "probe-unbound",
    "probe-instant",
    '"wall_time_text"',
    '"latitude_degrees"',
    '"longitude_degrees"'
  ]) {
    assert.equal(raw.includes(forbidden), false);
  }
});

test("self-resigning authority, coverage, product, epoch, count, status and unknown-field mutations stay rejected", async () => {
  const attacks = [
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.probeCoverageBoundary.probeCoverageComplete = true; },
    (value) => { value.productBoundary.releaseIdentity = "vedic-v1"; },
    (value) => { value.observationBoundary.mutationEpochAvailable = true; },
    (value) => { value.executionBoundary.productInputRejectionReceipts = 4; },
    (value) => { value.status = "validated"; },
    (value) => { value.unexpectedPromotion = true; }
  ];
  for (const attack of attacks) {
    await assert.rejects(
      verifyVedicInputStructuralRejectionEvidence(workspaceRoot, resignEvidence(attack))
    );
  }
});

test("self-resigning receipt, probe order, digest reuse and diagnostic promotion stay rejected", async () => {
  const attacks = [
    (value) => { value.probeExecution.probeResults[0].runtimeReceiptProjection.inputAccepted = true; },
    (value) => { value.probeExecution.probeResults.reverse(); },
    (value) => {
      value.probeExecution.probeResults[1].candidateIdentity.canonicalDigest =
        value.probeExecution.probeResults[0].candidateIdentity.canonicalDigest;
    },
    (value) => {
      value.probeExecution.probeResults[2].diagnostic.nonexistentWallTimeEstablished = true;
    },
    (value) => {
      const result = value.probeExecution.probeResults[2];
      result.diagnostic.timeResolutionPerformed = true;
      result.runtimeReceiptProjection.diagnostic.timeResolutionPerformed = true;
      result.runtimeReceiptProjection.receiptIdentity.digest =
        computeVedicInputStructuralDiagnosticReceiptIdentity(result.runtimeReceiptProjection);
      result.runtimeReceiptProjection.receiptId =
        "hakimi.vedic.structural-precheck-diagnostic/"
        + result.runtimeReceiptProjection.receiptIdentity.digest;
    },
    (value) => { value.probeExecution.fixedProbeCount = 5; }
  ];
  for (const attack of attacks) {
    await assert.rejects(
      verifyVedicInputStructuralRejectionEvidence(workspaceRoot, resignEvidence(attack))
    );
  }
});

test("upstream draft, requirements and local execution-closure drift remain fail-closed", async (t) => {
  const cases = [
    "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
    "content/system-admission/vedic-input-contract-requirements.v1.json",
    "scripts/vedic-input-structural-rejection-execution-lib.mjs",
    "scripts/vedic-input-contract-draft-lib.mjs",
    "scripts/vedic-input-contract-requirements-lib.mjs"
  ];
  for (const relative of cases) {
    await t.test(relative, async (child) => {
      const root = createTempWorkspace(child);
      const target = path.join(root, ...relative.split("/"));
      writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from("\n", "utf8")]));
      await assert.rejects(verifyVedicInputStructuralRejectionEvidence(root, baselineEvidence));
    });
  }
});

test("evidence reader rejects noncanonical materialization and hard-linked endpoint", async (t) => {
  await t.test("noncanonical materialization", async (child) => {
    const root = createTempWorkspace(child);
    const target = path.join(root, ...VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH.split("/"));
    writeFileSync(target, readFileSync(target, "utf8") + "\n", "utf8");
    await assert.rejects(
      readVedicInputStructuralRejectionEvidence(root),
      (error) => error?.code === "EVIDENCE_MATERIALIZATION_MISMATCH"
    );
  });

  await t.test("hard link", async (child) => {
    const root = createTempWorkspace(child);
    const target = path.join(root, ...VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH.split("/"));
    const source = path.join(root, "hardlink-source.json");
    copyFileSync(target, source);
    rmSync(target);
    linkSync(source, target);
    assert.equal(lstatSync(target, { bigint: true }).nlink > 1n, true);
    await assert.rejects(
      readVedicInputStructuralRejectionEvidence(root),
      (error) => error?.code === "EVIDENCE_ENDPOINT_INVALID"
    );
  });
});

test("evidence reader rejects a symbolic-link endpoint when the host permits creating one", async (t) => {
  const root = createTempWorkspace(t);
  const target = path.join(root, ...VEDIC_INPUT_STRUCTURAL_REJECTION_EVIDENCE_RELATIVE_PATH.split("/"));
  const source = path.join(root, "symlink-source.json");
  copyFileSync(target, source);
  rmSync(target);
  try {
    symlinkSync(source, target, "file");
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("Windows host does not permit symlink creation.");
      return;
    }
    throw error;
  }
  await assert.rejects(
    readVedicInputStructuralRejectionEvidence(root),
    (error) => error?.code === "EVIDENCE_ENDPOINT_INVALID"
  );
});

test("safe path helper rejects traversal, absolute paths, ADS and backslashes", () => {
  const safe = vedicInputStructuralRejectionEvidenceTestOnly.safeWorkspaceFile;
  for (const candidate of [
    "../outside.json",
    "/absolute.json",
    "C:/outside.json",
    "content/file.json:stream",
    "content\\file.json",
    "content/./file.json"
  ]) {
    throwsCode(() => safe(workspaceRoot, candidate), "UNSAFE_ARTIFACT_PATH");
  }
});

test("execution library is one-way and does not read the evidence child or production runtime", () => {
  const source = readFileSync(
    path.join(workspaceRoot, "scripts", "vedic-input-structural-rejection-execution-lib.mjs"),
    "utf8"
  );
  for (const forbidden of [
    "structural-rejection-execution-evidence",
    "node:fs",
    "node:path",
    "import(",
    "require(",
    "apps/",
    "packages/",
    "EXPECTED_EVIDENCE_DIGEST"
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
});

test("apps and packages do not import the new Node-only rejection evidence tooling", () => {
  const needles = [
    "vedic-input-structural-rejection-execution-lib",
    "vedic-input-structural-rejection-evidence-lib",
    "vedic-input-structural-rejection-execution-evidence"
  ];
  const extensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".html"]);
  const violations = [];
  function walk(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(workspaceRoot, absolute).replaceAll(path.sep, "/");
      if (relative === RESTRICTED_RELATIVE_PATH) continue;
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
        const source = readFileSync(absolute, "utf8");
        if (needles.some((needle) => source.includes(needle))) violations.push(relative);
      }
    }
  }
  walk(path.join(workspaceRoot, "apps"));
  walk(path.join(workspaceRoot, "packages"));
  assert.deepEqual(violations, []);
});

test("CLI reports only fixed-probe evidence and preserves every authority boundary", () => {
  const result = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment()
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const output = JSON.parse(result.stdout);
  assert.equal(output.fixedProbeRejectionEvidenceVerified, true);
  assert.equal(output.fixedProbeSetVerified, true);
  assert.equal(output.probeCoverageComplete, false);
  assert.equal(output.loadedModuleByteIdentityVerified, false);
  assert.equal(output.nodeLoaderIntegrityVerified, false);
  assert.equal(output.runtimeLauncherIdentityVerified, false);
  assert.equal(output.historicalExecutionAttested, false);
  assert.equal(output.acceptedInputs, 0);
  assert.equal(output.productInputRejectionReceipts, 0);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicDeploymentAuthorized, false);
  assert.equal(output.publicReleaseAuthorized, false);
  for (const forbidden of ["ok", "validInput", "validatorComplete", "admissionPassed"]) {
    assert.equal(Object.hasOwn(output, forbidden), false);
  }
});

test("CLI rejects visible Node launch hints and preserves false loader identity after preload trace erasure", () => {
  const argument = spawnSync(process.execPath, [CLI_PATH, "--print"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment()
  });
  assert.equal(argument.status, 2);
  assert.equal(JSON.parse(argument.stdout).errorCode, "CLI_ARGUMENTS_FORBIDDEN");

  const nodeOptions = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment({ NODE_OPTIONS: "--no-warnings" })
  });
  assert.equal(nodeOptions.status, 2);
  assert.equal(JSON.parse(nodeOptions.stdout).errorCode, "NODE_LAUNCH_STATE_FORBIDDEN");

  const nodePath = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment({ NODE_PATH: path.join(workspaceRoot, "node_modules") })
  });
  assert.equal(nodePath.status, 2);
  assert.equal(JSON.parse(nodePath.stdout).errorCode, "NODE_LAUNCH_STATE_FORBIDDEN");

  const execArgv = spawnSync(process.execPath, ["--no-warnings", CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment()
  });
  assert.equal(execArgv.status, 2);
  assert.equal(JSON.parse(execArgv.stdout).errorCode, "NODE_LAUNCH_STATE_FORBIDDEN");

  const erasedPreloadTrace = spawnSync(process.execPath, [CLI_PATH], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: sanitizedEnvironment({
      NODE_OPTIONS: "--import=data:text/javascript,delete%20process.env.NODE_OPTIONS"
    })
  });
  assert.equal(erasedPreloadTrace.status, 0, erasedPreloadTrace.stderr || erasedPreloadTrace.stdout);
  const erasedOutput = JSON.parse(erasedPreloadTrace.stdout);
  assert.equal(erasedOutput.fixedProbeRejectionEvidenceVerified, true);
  assert.equal(erasedOutput.nodeLoaderIntegrityVerified, false);
  assert.equal(erasedOutput.runtimeLauncherIdentityVerified, false);
  assert.equal(erasedOutput.historicalExecutionAttested, false);
});
