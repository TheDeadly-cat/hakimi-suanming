import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  copyFile,
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
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
  VedicRuntimeAndBundleSizeProposalError,
  buildCurrentVedicRuntimeAndBundleSizeProposal,
  canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal,
  canonicalStringifyVedicRuntimeAndBundleSizeProposal,
  computeVedicRuntimeAndBundleSizeProposalDigest,
  parseVedicRuntimeAndBundleSizeProposalJsonBytes,
  readVedicRuntimeAndBundleSizeProposal,
  vedicRuntimeAndBundleSizeProposalTestOnly,
  verifyVedicRuntimeAndBundleSizeProposal
} from "./vedic-runtime-and-bundle-size-proposal-lib.mjs";
import {
  VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH
} from "./vedic-runtime-dependency-license-evidence-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-vedic-runtime-and-bundle-size-proposal.mjs"
);
const closurePaths = Object.freeze([
  VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH,
  VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
  ...vedicRuntimeAndBundleSizeProposalTestOnly.CHAIN_ORDER
]);
const expectedStatus =
  "complete_quantified_decision_neutral_proposal_runtime_unselected_unimplemented_unvalidated";
const expectedDigest = "ae9fb180d97e81a30a9157655d168bb4101d993f859f40990db31c2e12954f15";
const pythonEvidenceRef =
  "hakimi.vedic.runtime-license-evidence/python-psf-legal-public-read/2026-08-29";
const swissPinnedEvidenceRef =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-commit-license-public-read/2026-08-29";
const swissDynamicEvidenceRef =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-dynamic-overview-public-read/2026-08-29";
const swissContractEvidenceRef =
  "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-professional-contract-template-public-read/2026-08-29";
const whatwgWorkerEvidenceRef =
  "hakimi.vedic.runtime-license-evidence/whatwg-workers-living-standard-public-read/2026-08-29";
const expectedEvidenceRefMatrix = Object.freeze([
  Object.freeze([pythonEvidenceRef]),
  Object.freeze([swissPinnedEvidenceRef, swissDynamicEvidenceRef, swissContractEvidenceRef]),
  Object.freeze([swissPinnedEvidenceRef, swissDynamicEvidenceRef, swissContractEvidenceRef]),
  Object.freeze([whatwgWorkerEvidenceRef]),
  Object.freeze([])
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectDataObjectGraph(root) {
  const objects = new Set();
  const stack = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null || typeof value !== "object" || objects.has(value)) continue;
    objects.add(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (Object.hasOwn(descriptor, "value")) stack.push(descriptor.value);
    }
  }
  return objects;
}

function assertFullyFrozenAndDetached(input, result) {
  const inputObjects = collectDataObjectGraph(input);
  const resultObjects = collectDataObjectGraph(result);
  for (const value of resultObjects) {
    assert.equal(Object.isFrozen(value), true);
    assert.equal(inputObjects.has(value), false);
  }
  for (const value of inputObjects) assert.equal(Object.isFrozen(value), false);
}

function resign(candidate) {
  candidate.proposalDigest = computeVedicRuntimeAndBundleSizeProposalDigest(candidate);
  return candidate;
}

let currentProposalPromise;

async function currentProposal() {
  currentProposalPromise ??= readVedicRuntimeAndBundleSizeProposal(workspaceRoot);
  return currentProposalPromise;
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentProposal());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, candidate),
    (error) => error instanceof VedicRuntimeAndBundleSizeProposalError && error.code === code
  );
}

async function makeFixture(t, prefix = "hakimi-vedic-runtime-proposal-") {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of closurePaths) {
    const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
    const target = path.resolve(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return root;
}

test("current Vedic runtime proposal is quantified but unselected unimplemented and unvalidated", async () => {
  const proposal = await currentProposal();
  const result = await verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposal);
  assert.equal(result.status, expectedStatus);
  assert.equal(result.artifactRole, "non_product_governance_runtime_and_bundle_size_proposal");
  assert.equal(result.runtimeOptionsProposed, 2);
  assert.equal(result.budgetCeilingsProposed, 18);
  assert.equal(result.selectedRuntimeOptionId, null);
  assert.equal(result.observedMeasurementCount, 0);
  assert.equal(result.buildReceipts, 0);
  assert.equal(result.runtimeReceipts, 0);
  assert.equal(result.browserReceipts, 0);
  assert.equal(result.primarySourceObservationCount, 5);
  assert.equal(result.publicSourceHttpReadsObserved, 10);
  assert.equal(result.stableImmediateReadPairs, 4);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.proposalDigest, expectedDigest);
  assert.equal(proposal.proposalCoverageComplete, true);
  assert.equal(proposal.reviewsComplete, false);
});

test("CLI reports only runtime proposal mechanical closure", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.endsWith("\n"), true);
  assert.equal(stdout.trim().includes("\n"), false);
  const output = JSON.parse(stdout);
  assert.equal(output.runtimeAndBundleSizeProposalClosureVerified, true);
  assert.equal(output.status, expectedStatus);
  assert.equal(output.runtimeOptionsProposed, 2);
  assert.equal(output.budgetCeilingsProposed, 18);
  assert.equal(output.observedMeasurementCount, 0);
  assert.equal(output.selectedRuntimeOptionId, null);
  assert.equal(output.primarySourceObservationCount, 5);
  assert.equal(output.publicSourceHttpReadsObserved, 10);
  assert.equal(output.stableImmediateReadPairs, 4);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
  for (const forbidden of [
    "ok", "ready", "productArtifactsPresent", "admissionGatesSatisfied",
    "rereviewRequirementsComplete", "runtimeSelected", "performanceValidated"
  ]) assert.equal(Object.hasOwn(output, forbidden), false);
});

test("CLI rejects every operand with one scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      assert.equal(error.stderr.endsWith("\n"), true);
      assert.equal(error.stderr.trim().includes("\n"), false);
      const output = JSON.parse(error.stderr);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.runtimeAndBundleSizeProposalClosureVerified, false);
      assert.equal(Object.hasOwn(output, "ok"), false);
      return true;
    }
  );
});

test("proposal bytes are one exact canonical materialization", async () => {
  const absolute = path.resolve(
    workspaceRoot,
    ...VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH.split("/")
  );
  const raw = await readFile(absolute);
  const proposal = parseVedicRuntimeAndBundleSizeProposalJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicRuntimeAndBundleSizeProposal(proposal));
  assert.equal(raw.byteLength, 27_241);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "e268aa78d6123c34481752cc8e0789e1a185f3f2e2ce9757c45d6227f5bea30e"
  );
  assert.equal(computeVedicRuntimeAndBundleSizeProposalDigest(proposal), expectedDigest);
});

test("raw parser rejects malformed JSON and uses intrinsic typed-array slots", () => {
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(new ArrayBuffer(2)),
    (error) => error.code === "JSON_BYTES_INVALID"
  );
  let proxyTraps = 0;
  const proxy = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      proxyTraps += 1;
      throw new Error("typed-array proxy trap must not run");
    }
  });
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(proxy),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(proxyTraps, 0);
  let lengthReads = 0;
  let bufferReads = 0;
  class HostileBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      throw new Error("length getter must not run");
    }

    get buffer() {
      bufferReads += 1;
      throw new Error("buffer getter must not run");
    }
  }
  const hostile = new HostileBytes(2);
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(hostile, "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);
  assert.equal(bufferReads, 0);
});

test("raw parser rejects shared resizable and detached storage and returns a private snapshot", () => {
  if (typeof SharedArrayBuffer === "function") {
    assert.throws(
      () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(new Uint8Array(new SharedArrayBuffer(2))),
      (error) => error.code === "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  if (typeof ArrayBuffer.prototype.resize === "function") {
    const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
    assert.throws(
      () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(new Uint8Array(resizable)),
      (error) => error.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
    );
  }
  const detachedBuffer = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachedBuffer);
  structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
  assert.throws(
    () => parseVedicRuntimeAndBundleSizeProposalJsonBytes(detachedView),
    (error) => error.code === "JSON_INVALID" || error.code === "JSON_BYTES_INVALID"
  );
  const source = Buffer.from('{"value":1}', "utf8");
  const parsed = parseVedicRuntimeAndBundleSizeProposalJsonBytes(source);
  source.fill(0);
  assert.deepEqual(parsed, { value: 1 });
});

test("proposal reader rejects semantically equal non-canonical bytes", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH.split("/")
  );
  await writeFile(target, JSON.stringify(JSON.parse(await readFile(target, "utf8"))), "utf8");
  await assert.rejects(
    () => readVedicRuntimeAndBundleSizeProposal(root),
    (error) => error.code === "JSON_NON_CANONICAL"
  );
});

test("object API passively rejects accessors Proxy Symbol prototypes sparse arrays aliases and -0", async () => {
  const accessor = clone(await currentProposal());
  let reads = 0;
  Object.defineProperty(accessor.runtimeOptions[0].candidateCeilings[0], "observedValue", {
    enumerable: true,
    get() {
      reads += 1;
      return null;
    }
  });
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicRuntimeAndBundleSizeProposal(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const proxy = clone(await currentProposal());
  proxy.measurementPlan = new Proxy(proxy.measurementPlan, {});
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proxy),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
  const symbol = clone(await currentProposal());
  symbol[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );
  const prototype = clone(await currentProposal());
  Object.setPrototypeOf(prototype.productBoundary, null);
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, prototype),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );
  const sparse = clone(await currentProposal());
  delete sparse.runtimeOptions[1];
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );
  const alias = clone(await currentProposal());
  alias.runtimeOptions[1] = alias.runtimeOptions[0];
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, alias),
    (error) => error.code === "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
  const cycle = clone(await currentProposal());
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
  const invalidNumber = clone(await currentProposal());
  invalidNumber.evidenceBoundary.runtimeReceipts = Number.NaN;
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, invalidNumber),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
  const negativeZero = clone(await currentProposal());
  negativeZero.evidenceBoundary.runtimeReceipts = -0;
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("own __proto__ keys cannot alias canonical identity digest or exact-key verification", async () => {
  const ordinary = JSON.parse('{"safe":1}');
  const protoKey = JSON.parse('{"__proto__":{"polluted":true},"safe":1}');
  assert.equal(Object.hasOwn(protoKey, "__proto__"), true);
  assert.notEqual(
    canonicalStringifyVedicRuntimeAndBundleSizeProposal(ordinary),
    canonicalStringifyVedicRuntimeAndBundleSizeProposal(protoKey)
  );
  assert.notEqual(
    computeVedicRuntimeAndBundleSizeProposalDigest(ordinary),
    computeVedicRuntimeAndBundleSizeProposalDigest(protoKey)
  );
  const raw = parseVedicRuntimeAndBundleSizeProposalJsonBytes(
    Buffer.from('{"__proto__":{"polluted":true},"safe":1}', "utf8")
  );
  assert.equal(Object.hasOwn(raw, "__proto__"), true);
  assert.equal(
    canonicalStringifyVedicRuntimeAndBundleSizeProposal(raw).includes('"__proto__"'),
    true
  );
  const candidate = clone(await currentProposal());
  Object.defineProperty(candidate, "__proto__", {
    configurable: true,
    enumerable: true,
    value: { polluted: true },
    writable: true
  });
  resign(candidate);
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, candidate),
    (error) => error.code === "PROPOSAL_INVALID"
  );
});

test("verified and built proposals are detached and deeply frozen", async () => {
  const input = clone(await currentProposal());
  const result = await verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, input);
  assertFullyFrozenAndDetached(input, result.ledger);
  assert.equal(Object.isFrozen(result), true);
  const built = await buildCurrentVedicRuntimeAndBundleSizeProposal(workspaceRoot);
  for (const value of collectDataObjectGraph(built)) assert.equal(Object.isFrozen(value), true);
  assert.equal(computeVedicRuntimeAndBundleSizeProposalDigest(built), built.proposalDigest);
});

test("proposal binds the exact seven-layer Vedic chain without a parent or registry backlink", async () => {
  const proposal = await currentProposal();
  const bindings = proposal.boundaryBindings;
  assert.equal(
    bindings.bindingDirection,
    "proposal_to_adr_input_fact_and_rule_drafts_and_requirements_only"
  );
  assert.deepEqual(bindings.chainOrder, vedicRuntimeAndBundleSizeProposalTestOnly.CHAIN_ORDER);
  assert.equal(new Set(bindings.chainOrder).size, 7);
  assert.equal(bindings.proposalBindsParent, false);
  assert.equal(bindings.proposalBindsCentralRegistry, false);
  assert.deepEqual(
    bindings.upstreamArtifacts.map((entry) => entry.path),
    bindings.chainOrder
  );
  const expectedRaw = [
    [4_531, "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"],
    [16_529, "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"],
    [15_859, "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"],
    [14_240, "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"],
    [42_634, "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"],
    [12_140, "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"],
    [30_734, "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"]
  ];
  for (let index = 0; index < expectedRaw.length; index += 1) {
    const artifact = bindings.upstreamArtifacts[index];
    assert.equal(artifact.bytes, expectedRaw[index][0]);
    assert.equal(artifact.sha256, expectedRaw[index][1]);
    assert.equal(artifact.rawHashAndInspectionUseSameReadBuffer, true);
  }
  assert.equal(
    bindings.upstreamArtifacts[0].semanticDigest,
    "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89"
  );
  assert.equal(
    bindings.upstreamArtifacts[1].semanticDigest,
    "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08"
  );
  assert.equal(
    bindings.upstreamArtifacts[2].ledgerDigest,
    "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0"
  );
  assert.equal(
    bindings.upstreamArtifacts[3].semanticDigest,
    "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1"
  );
  assert.equal(
    bindings.upstreamArtifacts[4].ledgerDigest,
    "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8"
  );
  assert.equal(
    bindings.upstreamArtifacts[5].semanticDigest,
    "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3"
  );
  assert.equal(
    bindings.upstreamArtifacts[6].ledgerDigest,
    "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f"
  );
  assert.equal(
    bindings.upstreamArtifacts[2].status,
    "input_contract_draft_present_zero_instances_not_admitted"
  );
  assert.equal(
    bindings.upstreamArtifacts[4].status,
    "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
  );
  assert.equal(
    bindings.upstreamArtifacts[6].status,
    "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
  );
  const serialized = canonicalStringifyVedicRuntimeAndBundleSizeProposal(proposal);
  assert.equal(serialized.includes("vedic-independent-productization-requirements"), false);
  assert.equal(serialized.includes("four-system-admission"), false);
  assert.equal(serialized.includes("productArtifactsPresent"), false);
});

test("all eighteen numerical values are explicitly unapproved ceilings and never observations", async () => {
  const proposal = await currentProposal();
  assert.deepEqual(
    proposal.runtimeOptions.map((option) => option.optionId),
    ["browser_embedded", "loopback_local_service"]
  );
  assert.deepEqual(
    proposal.runtimeOptions.map((option) => option.candidateCeilings.map((metric) => metric.proposedCeiling)),
    [
      [6_000_000, 20_000_000, 100_000_000, 8_000, 5_000, 20_000_000, 2_000, 268_435_456, 50_000_000],
      [250_000_000, 150_000_000, 750_000_000, 15_000, 10_000, 150_000_000, 1_500, 536_870_912, 100_000_000]
    ]
  );
  for (const option of proposal.runtimeOptions) {
    assert.equal(option.decisionStatus, "candidate_unselected_unimplemented");
    assert.equal(option.preferenceRank, null);
    for (const metric of option.candidateCeilings) {
      assert.equal(Number.isSafeInteger(metric.proposedCeiling), true);
      assert.equal(metric.proposedCeiling > 0, true);
      assert.equal(metric.approvalStatus, "unapproved_candidate");
      assert.equal(metric.comparator, "less_than_or_equal");
      assert.equal(metric.observedValue, null);
      assert.equal(metric.measurementStatus, "not_measured");
      assert.deepEqual(metric.evidenceRefs, []);
    }
  }
  assert.equal(proposal.evidenceBoundary.proposalTargetsQuantified, true);
  assert.equal(proposal.evidenceBoundary.proposalTargetsApproved, false);
  assert.equal(proposal.evidenceBoundary.candidateCeilingsAreMeasurements, false);
  assert.equal(proposal.evidenceBoundary.performanceMeasurementsObserved, 0);
});

test("security privacy and reproducibility tradeoffs are exact decision-neutral requirements", async () => {
  const proposal = await currentProposal();
  function dimension(identifiedRiskIds, requiredControlIds) {
    return { identifiedRiskIds, requiredControlIds, validationStatus: "required_not_performed" };
  }
  assert.deepEqual(proposal.securityPrivacyReproducibilityTradeoffMatrix, [
    {
      optionId: "browser_embedded",
      preferenceClaimed: false,
      privacy: dimension([
        "browser_storage_extension_and_profile_exposure_unvalidated",
        "browser_network_egress_behavior_unvalidated"
      ], [
        "offline_no_egress_browser_test_plan",
        "separate_vedic_browser_storage_namespace_plan",
        "sensitive_field_retention_and_export_policy_plan"
      ]),
      reproducibility: dimension([
        "browser_engine_device_and_cache_variance_unvalidated",
        "browser_ephemeris_data_version_drift_unvalidated"
      ], [
        "edge_chrome_fixed_device_matrix_plan",
        "browser_runtime_data_and_rule_digest_capture_plan"
      ]),
      security: dimension([
        "browser_supply_chain_and_cached_asset_integrity_unvalidated",
        "browser_main_thread_and_worker_isolation_unvalidated"
      ], [
        "browser_content_security_and_asset_integrity_plan",
        "worker_boundary_and_message_schema_plan",
        "browser_release_artifact_identity_plan"
      ])
    },
    {
      optionId: "loopback_local_service",
      preferenceClaimed: false,
      privacy: dimension([
        "loopback_payload_and_local_log_exposure_unvalidated",
        "local_service_network_egress_behavior_unvalidated"
      ], [
        "loopback_payload_minimization_and_log_redaction_plan",
        "offline_no_egress_service_test_plan",
        "separate_vedic_service_storage_namespace_plan"
      ]),
      reproducibility: dimension([
        "python_native_library_and_platform_variance_unvalidated",
        "service_data_file_and_environment_drift_unvalidated"
      ], [
        "runtime_native_dependency_and_data_digest_capture_plan",
        "fixed_service_environment_replay_matrix_plan"
      ]),
      security: dimension([
        "loopback_origin_authentication_and_port_exposure_unvalidated",
        "local_service_process_and_update_integrity_unvalidated"
      ], [
        "loopback_bind_scope_authentication_and_request_origin_plan",
        "service_binary_and_update_digest_plan",
        "least_privilege_service_process_boundary_plan"
      ])
    }
  ]);
});

test("dependency license matrix maps observed refs 1/3/3/1/0 while every review stays unanswered", async () => {
  const proposal = await currentProposal();
  assert.deepEqual(
    proposal.dependencyLicenseQuestionMatrix.map((entry) => entry.dependencyId),
    [
      "python_runtime",
      "swiss_ephemeris_code",
      "ephemeris_data_files",
      "dedicated_worker",
      "loopback_local_service"
    ]
  );
  assert.deepEqual(
    proposal.dependencyLicenseQuestionMatrix.map((entry) => entry.reviewQuestionIds),
    [
      [
        "python_runtime_exact_version_and_license_identity_question",
        "python_runtime_packaging_and_redistribution_terms_question",
        "python_runtime_security_update_and_support_window_question"
      ],
      [
        "swiss_ephemeris_code_exact_version_and_license_identity_question",
        "swiss_ephemeris_binding_and_distribution_terms_question",
        "swiss_ephemeris_code_update_and_provenance_question"
      ],
      [
        "ephemeris_data_file_set_version_and_provenance_question",
        "ephemeris_data_file_use_and_redistribution_rights_question",
        "ephemeris_data_file_update_integrity_question"
      ],
      [
        "dedicated_worker_platform_support_question",
        "dedicated_worker_isolation_and_message_boundary_question",
        "dedicated_worker_packaging_dependency_license_question"
      ],
      [
        "loopback_service_process_distribution_question",
        "loopback_service_port_origin_and_authentication_review_question",
        "loopback_service_runtime_dependency_license_question"
      ]
    ]
  );
  assert.deepEqual(
    proposal.dependencyLicenseQuestionMatrix.map((entry) => entry.evidenceRefs),
    expectedEvidenceRefMatrix
  );
  for (const entry of proposal.dependencyLicenseQuestionMatrix) {
    assert.equal(entry.selection, "undecided_not_selected");
    assert.equal(entry.reviewQuestionIds.length > 0, true);
    assert.equal(entry.reviewComplete, false);
    assert.equal(entry.redistributionAuthorized, false);
    assert.equal(entry.legalConclusionEstablished, false);
  }
});

test("runtime proposal aggregates the evidence child one way without adding it to the seven-node chain", async () => {
  const proposal = await currentProposal();
  const closure = proposal.runtimeDependencyLicenseEvidenceClosure;
  assert.equal(
    closure.bindingDirection,
    "runtime_dependency_license_evidence_to_runtime_proposal_aggregator_only"
  );
  assert.equal(closure.childBindsProposal, false);
  assert.equal(closure.childBindsParent, false);
  assert.equal(closure.childBindsCentralRegistry, false);
  assert.equal(
    proposal.boundaryBindings.chainOrder.includes(
      VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH
    ),
    false
  );
  assert.deepEqual(closure.runtimeDependencyLicenseEvidence, {
    artifactRole: "authoritative_project_record_of_public_runtime_dependency_license_observations",
    bytes: 23_919,
    dependenciesWithObservedRefs: 4,
    dependenciesWithoutObservedRefs: 1,
    evidenceDigest: "cbd459847bd4f57450f8389f127aa76c424298511786811b17c3cb88a856c926",
    legalReviewsComplete: 0,
    loopbackEvidenceRefs: 0,
    path: VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
    publicHttpReadsObserved: 10,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: false,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    redistributionAuthorizations: 0,
    releaseReady: false,
    sha256: "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1",
    sourceObservationCount: 5,
    stableImmediateReadPairs: 4,
    status:
      "five_claimed_publisher_or_maintainer_public_endpoints_ten_read_receipts_observed_four_of_five_dependencies_have_refs_loopback_zero_link_only_unreviewed_unsigned_no_legal_conclusion_redistribution_or_selection",
    unstableImmediateReadPairs: 1
  });
  const closureText = JSON.stringify(closure);
  assert.equal(closureText.includes("vedic-independent-productization-requirements"), false);
  assert.equal(closureText.includes("four-system-admission"), false);
});

test("runtime dependencies licenses browser runs and separate redesign work remain undecided or absent", async () => {
  const proposal = await currentProposal();
  assert.deepEqual(new Set(Object.values(proposal.dependencyDecisionBoundary)), new Set([
    "undecided_not_selected"
  ]));
  assert.equal(proposal.licenseRightsBoundary.codeLicenseReviewed, false);
  assert.equal(proposal.licenseRightsBoundary.ephemerisDataLicenseReviewed, false);
  assert.equal(proposal.licenseRightsBoundary.legalReviewComplete, false);
  assert.equal(proposal.licenseRightsBoundary.observedEvidenceIsLegalConclusion, false);
  assert.equal(proposal.licenseRightsBoundary.rightsLegalConclusionEstablished, false);
  assert.equal(proposal.licenseRightsBoundary.redistributionAuthorized, false);
  assert.deepEqual(proposal.licenseRightsBoundary.codeLicenseEvidenceRefs, [
    pythonEvidenceRef,
    swissPinnedEvidenceRef,
    swissDynamicEvidenceRef,
    swissContractEvidenceRef
  ]);
  assert.deepEqual(proposal.licenseRightsBoundary.ephemerisDataLicenseEvidenceRefs, [
    swissPinnedEvidenceRef,
    swissDynamicEvidenceRef,
    swissContractEvidenceRef
  ]);
  assert.deepEqual(proposal.licenseRightsBoundary.redistributionConditionRefs, []);
  assert.deepEqual(
    proposal.measurementPlan.browserMatrix.map((entry) => entry.browserId),
    ["microsoft_edge", "google_chrome"]
  );
  for (const entry of proposal.measurementPlan.browserMatrix) {
    assert.equal(entry.plannedRuns, 3);
    assert.equal(entry.executedRuns, 0);
    assert.equal(entry.executionStatus, "planned_not_executed");
    assert.deepEqual(entry.evidenceRefs, []);
  }
  for (const requirement of Object.values(proposal.deferredIndependentDesignRequirements)) {
    assert.equal(
      requirement.requirementState,
      "separate_rereview_requirement_plan_only_not_satisfied"
    );
    assert.equal(requirement.designArtifactsObserved, 0);
    assert.deepEqual(requirement.artifactRefs, []);
  }
  assert.deepEqual(
    proposal.deferredIndependentDesignRequirements
      .storageBackupRecoveryMutationEpochCapacityRollback.interfaceRequirementIds,
    [
      "separate_vedic_storage_namespace_interface",
      "storage_capacity_budget_interface",
      "mutation_epoch_receipt_interface",
      "backup_interface",
      "recovery_interface",
      "rollback_interface"
    ]
  );
  assert.deepEqual(
    proposal.deferredIndependentDesignRequirements
      .storageBackupRecoveryMutationEpochCapacityRollback.quantitativePlanRefs,
    [
      "#/runtimeOptions/0/candidateCeilings/2/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/2/proposedCeiling",
      "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
    ]
  );
  assert.deepEqual(
    proposal.deferredIndependentDesignRequirements
      .browserGateAndReleaseEvidence.interfaceRequirementIds,
    [
      "microsoft_edge_browser_receipt_interface",
      "google_chrome_browser_receipt_interface",
      "artifact_identity_receipt_interface",
      "build_receipt_interface",
      "runtime_execution_receipt_interface",
      "deployment_receipt_interface",
      "rollback_receipt_interface",
      "evidence_retention_receipt_interface"
    ]
  );
  assert.deepEqual(
    proposal.deferredIndependentDesignRequirements
      .browserGateAndReleaseEvidence.quantitativePlanRefs,
    [
      "#/measurementPlan/browserMatrix/0/plannedRuns",
      "#/measurementPlan/browserMatrix/1/plannedRuns",
      "#/runtimeOptions/0/candidateCeilings/8/proposedCeiling",
      "#/runtimeOptions/1/candidateCeilings/8/proposedCeiling"
    ]
  );
});

test("implementation product authority receipt and mutation observation boundaries stay fail-closed", async () => {
  const proposal = await currentProposal();
  for (const key of [
    "browserReceipts", "browserRunsExecuted", "buildArtifactsObserved", "buildReceipts",
    "implementationArtifactsObserved", "implementationReceipts", "measurementReceipts",
    "performanceMeasurementsObserved", "runtimeExecutionsObserved", "runtimeReceipts", "successReceipts"
  ]) assert.equal(proposal.evidenceBoundary[key], 0);
  for (const value of Object.values(proposal.authorityBoundary)) assert.equal(value, false);
  assert.equal(proposal.productBoundary.releaseIdentity, null);
  assert.equal(proposal.productBoundary.targetSchema, null);
  assert.equal(proposal.productBoundary.migrationId, null);
  assert.equal(proposal.productBoundary.legacyV13Inherited, false);
  assert.equal(proposal.productBoundary.schema13Inherited, false);
  assert.equal(proposal.productBoundary.implementation, "absent");
  assert.equal(proposal.productBoundary.buildArtifact, "absent");
  assert.equal(proposal.productBoundary.centralRegistryIntegration, "absent");
  assert.equal(proposal.observationBoundary.mutationEpochAvailable, false);
  assert.equal(proposal.observationBoundary.mutationEpochReceipt, null);
  assert.equal(proposal.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(proposal.observationBoundary.parentAndChildrenAtomicSnapshot, false);
  assert.equal(proposal.observationBoundary.intervalMutationExcluded, false);
  assert.equal(proposal.observationBoundary.abaExcluded, false);
  assert.equal(proposal.observationBoundary.heldFileHandleReads, true);
  assert.equal(proposal.observationBoundary.proposalHashAndParseUseSameReadBuffer, true);
  assert.equal(proposal.observationBoundary.boundArtifactHashAndInspectionUseSameReadBuffer, true);
});

test("self-resigning cannot convert an unapproved ceiling into a measurement or approved budget", async () => {
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[0].candidateCeilings[0].observedValue = 5_500_000;
  }, "MEASUREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[0].candidateCeilings[1].measurementStatus = "measured";
  }, "MEASUREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[0].candidateCeilings[2].evidenceRefs.push("fake-browser-receipt");
  }, "MEASUREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[1].candidateCeilings[0].approvalStatus = "approved";
  }, "BUDGET_PROPOSAL_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[1].candidateCeilings[7].proposedCeiling += 1;
  }, "BUDGET_PROPOSAL_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[1].candidateCeilings.pop();
  }, "BUDGET_PROPOSAL_INVALID");
});

test("self-resigning cannot delete tradeoffs claim preference or forge validation", async () => {
  await expectResignedFailure((proposal) => {
    proposal.securityPrivacyReproducibilityTradeoffMatrix[0]
      .security.identifiedRiskIds.pop();
  }, "TRADEOFF_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.securityPrivacyReproducibilityTradeoffMatrix[0]
      .privacy.requiredControlIds.pop();
  }, "TRADEOFF_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.securityPrivacyReproducibilityTradeoffMatrix[1]
      .reproducibility.validationStatus = "performed";
  }, "TRADEOFF_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.securityPrivacyReproducibilityTradeoffMatrix[1].preferenceClaimed = true;
  }, "TRADEOFF_MATRIX_INVALID");
});

test("self-resigning cannot answer dependency license questions or forge review and rights", async () => {
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[0].evidenceRefs.push("fake-license-evidence");
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[1].reviewComplete = true;
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[2].redistributionAuthorized = true;
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[3].legalConclusionEstablished = true;
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[4].selection = "selected";
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[0].reviewQuestionIds.pop();
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[0].evidenceRefs[0] = swissPinnedEvidenceRef;
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyLicenseQuestionMatrix[4].evidenceRefs.push(pythonEvidenceRef);
  }, "DEPENDENCY_LICENSE_MATRIX_INVALID");
});

test("self-resigning cannot drift promote or backlink the runtime license evidence closure", async () => {
  await expectResignedFailure((proposal) => {
    proposal.runtimeDependencyLicenseEvidenceClosure
      .runtimeDependencyLicenseEvidence.evidenceDigest = "0".repeat(64);
  }, "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeDependencyLicenseEvidenceClosure
      .runtimeDependencyLicenseEvidence.dependenciesWithObservedRefs = 5;
  }, "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeDependencyLicenseEvidenceClosure
      .runtimeDependencyLicenseEvidence.legalReviewsComplete = 1;
  }, "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeDependencyLicenseEvidenceClosure.childBindsParent = true;
  }, "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.runtimeDependencyLicenseEvidenceClosure.bindingDirection =
      "runtime_dependency_license_evidence_to_parent";
  }, "RUNTIME_LICENSE_EVIDENCE_CLOSURE_INVALID");
});

test("proposal material coverage cannot be confused with completed reviews", async () => {
  await expectResignedFailure((proposal) => {
    proposal.proposalCoverageComplete = false;
  }, "PROPOSAL_COVERAGE_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.reviewsComplete = true;
  }, "PROPOSAL_COVERAGE_INVALID");
});

test("self-resigning cannot select a runtime dependency license or browser execution", async () => {
  await expectResignedFailure((proposal) => {
    proposal.selectedRuntimeOptionId = "browser_embedded";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.runtimeOptions[0].preferenceRank = 1;
  }, "BUDGET_PROPOSAL_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.dependencyDecisionBoundary.pythonRuntime = "selected";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.dependencyDecisionBoundary.swissEphemeris = "accepted";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.dependencyDecisionBoundary.ephemerisDataFiles = "bundled";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.dependencyDecisionBoundary.dedicatedWorker = "selected";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.dependencyDecisionBoundary.loopbackLocalService = "selected";
  }, "RUNTIME_SELECTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.licenseRightsBoundary.codeLicenseReviewed = true;
  }, "LICENSE_RIGHTS_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.licenseRightsBoundary.ephemerisDataLicenseEvidenceRefs.push("fake-license");
  }, "LICENSE_RIGHTS_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.licenseRightsBoundary.legalReviewComplete = true;
  }, "LICENSE_RIGHTS_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.measurementPlan.browserMatrix[0].executedRuns = 1;
  }, "BROWSER_EXECUTION_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.measurementPlan.browserMatrix[1].evidenceRefs.push("fake-edge-or-chrome-receipt");
  }, "BROWSER_EXECUTION_PROMOTED");
});

test("self-resigning cannot create implementation receipts separate design completion or product identity", async () => {
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.implementationArtifactsObserved = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.implementationReceipts = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.buildReceipts = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.runtimeReceipts = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.browserReceipts = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.measurementPlan.observedMeasurementCount = 1;
  }, "MEASUREMENT_PLAN_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.evidenceBoundary.successReceipts = 1;
  }, "IMPLEMENTATION_OR_EVIDENCE_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.deferredIndependentDesignRequirements
      .storageBackupRecoveryMutationEpochCapacityRollback.designArtifactsObserved = 1;
  }, "DEFERRED_REQUIREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.deferredIndependentDesignRequirements
      .browserGateAndReleaseEvidence.requirementState = "complete";
  }, "DEFERRED_REQUIREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.deferredIndependentDesignRequirements
      .storageBackupRecoveryMutationEpochCapacityRollback.interfaceRequirementIds.pop();
  }, "DEFERRED_REQUIREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.deferredIndependentDesignRequirements
      .browserGateAndReleaseEvidence.quantitativePlanRefs[0] = "fake-measurement";
  }, "DEFERRED_REQUIREMENT_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.productBoundary.releaseIdentity = "legacy-v13";
  }, "PRODUCT_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.productBoundary.targetSchema = 13;
  }, "PRODUCT_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.productBoundary.migrationId = "fake";
  }, "PRODUCT_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.productBoundary.centralRegistryIntegration = "present";
  }, "PRODUCT_BOUNDARY_PROMOTED");
});

test("self-resigning cannot promote epoch atomicity authority or remove explicit non-claims", async () => {
  await expectResignedFailure((proposal) => {
    proposal.observationBoundary.mutationEpochAvailable = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.observationBoundary.mutationEpochReceipt = "fake";
  }, "OBSERVATION_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.observationBoundary.crossFileAtomicSnapshot = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.observationBoundary.intervalMutationExcluded = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.observationBoundary.abaExcluded = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.authorityBoundary.runtimeOptionSelected = true;
  }, "AUTHORITY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.authorityBoundary.formalAdmissionAuthorized = true;
  }, "AUTHORITY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.authorityBoundary.publicReleaseAuthorized = true;
  }, "AUTHORITY_PROMOTED");
  await expectResignedFailure((proposal) => {
    proposal.doesNotEstablish.pop();
  }, "EVIDENCE_BOUNDARY_PROMOTED");
});

test("self-resigning cannot add a parent registry backlink or a product-artifact count", async () => {
  await expectResignedFailure((proposal) => {
    proposal.boundaryBindings.proposalBindsParent = true;
  }, "BOUNDARY_BACKLINK_FORBIDDEN");
  await expectResignedFailure((proposal) => {
    proposal.boundaryBindings.upstreamArtifacts[0].path =
      "content/system-admission/vedic-independent-productization-requirements.v1.json";
  }, "BOUNDARY_BACKLINK_FORBIDDEN");
  await expectResignedFailure((proposal) => {
    proposal.boundaryBindings.upstreamArtifacts[0].path =
      "content/system-admission/four-system-admission.v1.json";
  }, "BOUNDARY_BACKLINK_FORBIDDEN");
  await expectResignedFailure((proposal) => {
    proposal.productArtifactsPresent = 4;
  }, "PROPOSAL_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.boundaryBindings.chainOrder.reverse();
  }, "BOUND_ARTIFACT_CLOSURE_INVALID");
});

test("a byte drift in any of the seven upstream artifacts invalidates the proposal", async (t) => {
  for (const relativePath of vedicRuntimeAndBundleSizeProposalTestOnly.CHAIN_ORDER) {
    await t.test(relativePath, async (subtest) => {
      const root = await makeFixture(subtest);
      await appendFile(path.resolve(root, ...relativePath.split("/")), "\n", "utf8");
      await assert.rejects(
        () => readVedicRuntimeAndBundleSizeProposal(root),
        (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
      );
    });
  }
});

test("a byte drift in the orthogonal runtime license evidence child invalidates the proposal", async (t) => {
  const root = await makeFixture(t);
  await appendFile(
    path.resolve(root, ...VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH.split("/")),
    "\n",
    "utf8"
  );
  await assert.rejects(
    () => readVedicRuntimeAndBundleSizeProposal(root),
    (error) => error.code === "RUNTIME_LICENSE_EVIDENCE_IDENTITY_MISMATCH"
  );
});

test("ADS traversal backslash absolute and dot-segment paths are rejected", () => {
  for (const relativePath of [
    "content/system-admission/proposal.json:stream",
    "content:stream/system-admission/proposal.json",
    "content/system-admission:stream/proposal.json",
    "../proposal.json",
    "content/../proposal.json",
    "content\\system-admission\\proposal.json",
    path.resolve(workspaceRoot, "content", "proposal.json")
  ]) {
    assert.throws(
      () => vedicRuntimeAndBundleSizeProposalTestOnly.safeWorkspaceFile(
        workspaceRoot,
        relativePath
      ),
      (error) => error.code === "PATH_INVALID"
    );
  }
});

test("hard-linked proposal, evidence child and every seven-node endpoint are rejected", async (t) => {
  const cases = [
    [VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH, "PROPOSAL_ENDPOINT_INVALID", "read"],
    [
      VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
      "RUNTIME_LICENSE_EVIDENCE_ENDPOINT_INVALID",
      "build"
    ],
    ...vedicRuntimeAndBundleSizeProposalTestOnly.CHAIN_ORDER.map((relativePath) => [
      relativePath,
      "BOUND_ARTIFACT_ENDPOINT_INVALID",
      "build"
    ])
  ];
  for (const [relativePath, code, operation] of cases) {
    await t.test(relativePath, async (subtest) => {
      const root = await makeFixture(subtest);
      const target = path.resolve(root, ...relativePath.split("/"));
      const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
      await copyFile(target, seed);
      await rm(target);
      await link(seed, target);
      const action = operation === "read"
        ? () => readVedicRuntimeAndBundleSizeProposal(root)
        : () => buildCurrentVedicRuntimeAndBundleSizeProposal(root);
      await assert.rejects(action, (error) => error.code === code);
    });
  }
});

test("empty or oversized proposal and upstream files are rejected before parsing", async (t) => {
  await t.test("proposal", async (subtest) => {
    const root = await makeFixture(subtest);
    const target = path.resolve(
      root,
      ...VEDIC_RUNTIME_AND_BUNDLE_SIZE_PROPOSAL_RELATIVE_PATH.split("/")
    );
    await writeFile(target, Buffer.alloc(vedicRuntimeAndBundleSizeProposalTestOnly.MAX_PROPOSAL_BYTES + 1));
    await assert.rejects(
      () => readVedicRuntimeAndBundleSizeProposal(root),
      (error) => error.code === "PROPOSAL_ENDPOINT_INVALID"
    );
  });
  await t.test("upstream", async (subtest) => {
    const root = await makeFixture(subtest);
    const target = path.resolve(
      root,
      ...vedicRuntimeAndBundleSizeProposalTestOnly.CHAIN_ORDER[0].split("/")
    );
    await writeFile(
      target,
      Buffer.alloc(vedicRuntimeAndBundleSizeProposalTestOnly.MAX_BOUND_ARTIFACT_BYTES + 1)
    );
    await assert.rejects(
      () => buildCurrentVedicRuntimeAndBundleSizeProposal(root),
      (error) => error.code === "BOUND_ARTIFACT_ENDPOINT_INVALID"
    );
  });
  await t.test("runtime license evidence child", async (subtest) => {
    const root = await makeFixture(subtest);
    const target = path.resolve(
      root,
      ...VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH.split("/")
    );
    await writeFile(
      target,
      Buffer.alloc(vedicRuntimeAndBundleSizeProposalTestOnly.MAX_BOUND_ARTIFACT_BYTES + 1)
    );
    await assert.rejects(
      () => buildCurrentVedicRuntimeAndBundleSizeProposal(root),
      (error) => error.code === "RUNTIME_LICENSE_EVIDENCE_ENDPOINT_INVALID"
    );
  });
});

test("junction or directory symlink in the proposal chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-runtime-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-runtime-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  try {
    await symlink(
      path.join(realRoot, "content"),
      path.join(linkedRoot, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("platform does not permit a junction or directory symlink");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readVedicRuntimeAndBundleSizeProposal(linkedRoot),
    (error) => error.code === "PROPOSAL_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in the ADR chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-runtime-docs-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-runtime-docs-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  for (const relativePath of closurePaths.filter((entry) => !entry.startsWith("docs/"))) {
    const target = path.resolve(linkedRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.resolve(realRoot, ...relativePath.split("/")), target);
  }
  try {
    await symlink(
      path.join(realRoot, "docs"),
      path.join(linkedRoot, "docs"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("platform does not permit a junction or directory symlink");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => buildCurrentVedicRuntimeAndBundleSizeProposal(linkedRoot),
    (error) => error.code === "BOUND_ARTIFACT_ENDPOINT_INVALID"
  );
});

test("unknown fields altered identity and stale digest reuse cannot enter current closure", async () => {
  await expectResignedFailure((proposal) => {
    proposal.unexpected = true;
  }, "PROPOSAL_INVALID");
  await expectResignedFailure((proposal) => {
    proposal.createdAt = "2026-08-29T00:00:00Z";
  }, "PROPOSAL_INVALID");
  const proposal = clone(await currentProposal());
  proposal.status = "ready";
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, proposal),
    (error) => error.code === "PROPOSAL_INVALID"
  );
  const staleDigest = clone(await currentProposal());
  staleDigest.runtimeOptions[0].candidateCeilings[0].proposedCeiling += 1;
  await assert.rejects(
    () => verifyVedicRuntimeAndBundleSizeProposal(workspaceRoot, staleDigest),
    (error) => error.code === "BUDGET_PROPOSAL_INVALID"
  );
});
