import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
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
import { promisify } from "node:util";
import {
  VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH,
  buildCurrentVedicProductizationRequirementsLedger,
  canonicalPrettyStringifyVedicProductizationRequirements,
  canonicalStringifyVedicProductizationRequirements,
  computeVedicProductizationRequirementsDigest,
  parseVedicProductizationRequirementsJsonBytes,
  readVedicProductizationRequirementsLedger,
  verifyVedicProductizationRequirementsLedger
} from "./vedic-independent-productization-requirements-lib.mjs";
import {
  computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
  readVedicSourceBindingAndThreeLayerRightsRequirements,
  verifyVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";
import {
  readVedicRealIndependentExpertReviewPlan,
  verifyVedicRealIndependentExpertReviewPlan
} from "./vedic-real-independent-expert-review-plan-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = process.cwd();
const ADR_PATH = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const INPUT_CONTRACT_DRAFT_PATH =
  "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json";
const INPUT_CONTRACT_REQUIREMENTS_PATH =
  "content/system-admission/vedic-input-contract-requirements.v1.json";
const INPUT_CONTRACT_ARTIFACT_REFS = [INPUT_CONTRACT_DRAFT_PATH, INPUT_CONTRACT_REQUIREMENTS_PATH];
const FACT_CONTRACT_DRAFT_PATH =
  "content/system-admission/vedic-fact-contract-draft.v0.1.0.schema.json";
const FACT_CONTRACT_REQUIREMENTS_PATH =
  "content/system-admission/vedic-fact-contract-requirements.v1.json";
const FACT_CONTRACT_ARTIFACT_REFS = [FACT_CONTRACT_DRAFT_PATH, FACT_CONTRACT_REQUIREMENTS_PATH];
const RULE_CONTRACT_DRAFT_PATH =
  "content/system-admission/vedic-rule-contract-draft.v0.1.0.schema.json";
const RULE_CONTRACT_REQUIREMENTS_PATH =
  "content/system-admission/vedic-rule-contract-requirements.v1.json";
const RUNTIME_PROPOSAL_PATH =
  "content/system-admission/vedic-runtime-and-bundle-size-proposal.v1.json";
const RUNTIME_LICENSE_EVIDENCE_PATH =
  "content/system-admission/vedic-runtime-dependency-license-evidence.v1.json";
const RUNTIME_PROPOSAL_STATUS =
  "complete_quantified_decision_neutral_proposal_runtime_unselected_unimplemented_unvalidated";
const SOURCE_RIGHTS_REQUIREMENTS_PATH =
  "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.json";
const SOURCE_RIGHTS_REQUIREMENTS_STATUS =
  "requirements_only_current_scoped_inventory_38_all_unbound_open_universe_no_sources_bodies_quotes_bindings_or_three_layer_rights_established";
const EXPERT_REVIEW_PLAN_PATH =
  "content/system-admission/vedic-real-independent-expert-review-plan.v1.json";
const EXPERT_REVIEW_PLAN_STATUS =
  "complete_verifiable_material_contract_for_two_vacant_real_independent_expert_seats_zero_expert_instances_review_not_started";
const EXPERT_REVIEW_GATE_PLAN_ONLY_STATUS =
  "review_plan_present_two_seats_defined_zero_verified_real_experts_identity_credentials_independence_original_opinions_expert_review_bundle_absent";
const PARENT_LEDGER_STATUS =
  "input_fact_rule_contract_drafts_runtime_bundle_proposal_source_rights_requirements_only_inventory_and_two_vacant_seat_expert_review_plan_present_open_universe_zero_bindings_zero_expert_instances_research_only_not_admitted";
const SOURCE_RIGHTS_REREVIEW_PARTIAL_STATUS =
  "requirements_only_inventory_present_open_universe_all_38_unbound_no_sources_bindings_or_three_layer_rights_rereview_requirement_incomplete";
const SOURCE_BUNDLE_PARTIAL_ABSENT_STATUS =
  "requirements_inventory_present_all_38_unbound_no_source_candidates_bodies_quotes_locators_or_bindings_source_bundle_absent";
const RIGHTS_BUNDLE_PARTIAL_ABSENT_STATUS =
  "requirements_inventory_present_all_38_unbound_no_work_version_carrier_rights_evidence_rights_bundle_absent";
const RULE_CONTRACT_ARTIFACT_REFS = [RULE_CONTRACT_DRAFT_PATH, RULE_CONTRACT_REQUIREMENTS_PATH];
const INPUT_FACT_AND_RULE_ARTIFACT_REFS = [
  ...INPUT_CONTRACT_ARTIFACT_REFS,
  ...FACT_CONTRACT_ARTIFACT_REFS,
  ...RULE_CONTRACT_ARTIFACT_REFS
];
const SEVEN_LAYER_PATHS = [
  ADR_PATH,
  INPUT_CONTRACT_DRAFT_PATH,
  INPUT_CONTRACT_REQUIREMENTS_PATH,
  FACT_CONTRACT_DRAFT_PATH,
  FACT_CONTRACT_REQUIREMENTS_PATH,
  RULE_CONTRACT_DRAFT_PATH,
  RULE_CONTRACT_REQUIREMENTS_PATH
];
const EIGHT_LAYER_PATHS = [...SEVEN_LAYER_PATHS, RUNTIME_PROPOSAL_PATH];
const SOURCE_RIGHTS_EIGHT_LAYER_PATHS = [...SEVEN_LAYER_PATHS, SOURCE_RIGHTS_REQUIREMENTS_PATH];
const EXPERT_REVIEW_PLAN_NINE_LAYER_PATHS = [
  ...SOURCE_RIGHTS_EIGHT_LAYER_PATHS,
  EXPERT_REVIEW_PLAN_PATH
];
const EXTERNAL_OBSERVATION_PATHS = [
  "docs/GitHub外部参考审计-2026-08-24.md",
  "docs/公开命理网站与五仓库吸收审计-2026-08-25.md"
];
const FIXTURE_PATHS = [
  VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH,
  ADR_PATH,
  INPUT_CONTRACT_DRAFT_PATH,
  INPUT_CONTRACT_REQUIREMENTS_PATH,
  FACT_CONTRACT_DRAFT_PATH,
  FACT_CONTRACT_REQUIREMENTS_PATH,
  RULE_CONTRACT_DRAFT_PATH,
  RULE_CONTRACT_REQUIREMENTS_PATH,
  RUNTIME_PROPOSAL_PATH,
  RUNTIME_LICENSE_EVIDENCE_PATH,
  SOURCE_RIGHTS_REQUIREMENTS_PATH,
  EXPERT_REVIEW_PLAN_PATH,
  ...EXTERNAL_OBSERVATION_PATHS
];

async function currentLedger(root = workspaceRoot) {
  return readVedicProductizationRequirementsLedger(root);
}

function resign(candidate) {
  return {
    ...candidate,
    ledgerDigest: computeVedicProductizationRequirementsDigest(candidate)
  };
}

async function expectRejectedMutation(mutator, expectedCodes) {
  const candidate = structuredClone(await currentLedger());
  mutator(candidate);
  const resigned = resign(candidate);
  const acceptedCodes = new Set(Array.isArray(expectedCodes) ? expectedCodes : [expectedCodes]);
  await assert.rejects(
    () => verifyVedicProductizationRequirementsLedger(workspaceRoot, resigned),
    (error) => acceptedCodes.has(error?.code)
  );
}

async function copyRelativeFile(sourceRoot, targetRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const target = path.resolve(targetRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

async function createFixture(relativePaths = FIXTURE_PATHS) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-requirements-"));
  for (const relativePath of relativePaths) {
    await copyRelativeFile(workspaceRoot, temporaryRoot, relativePath);
  }
  return temporaryRoot;
}

test("current Vedic ledger binds runtime, source-rights and expert-plan children while remaining research-only and not admitted", async () => {
  const ledger = await currentLedger();
  const result = await verifyVedicProductizationRequirementsLedger(workspaceRoot, ledger);
  assert.equal(
    result.status,
    PARENT_LEDGER_STATUS
  );
  assert.equal(result.bindingRequirementsInventoryDefined, true);
  assert.equal(result.bindingRequired, 38);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.requirementsUniverseClosed, false);
  assert.equal(result.sourceBundleComplete, false);
  assert.equal(result.rightsBundleComplete, false);
  assert.equal(result.independentExpertReviewsVerified, 0);
  assert.equal(result.productArtifactsPresent, 3);
  assert.equal(result.admissionGatesSatisfied, 0);
  assert.equal(result.rereviewRequirementsComplete, 3);
  assert.equal(result.rereviewTriggered, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.runtimeProposalStatus, RUNTIME_PROPOSAL_STATUS);
  assert.equal(result.sourceRightsRequirementsStatus, SOURCE_RIGHTS_REQUIREMENTS_STATUS);
  assert.equal(result.expertReviewPlanStatus, EXPERT_REVIEW_PLAN_STATUS);
  assert.equal(result.expertReviewPlanDefined, true);
  assert.equal(result.expertReviewSeatsDefined, 2);
  assert.equal(result.expertReviewSeatsFilled, 0);
  assert.equal(result.expertReviewStarted, false);
  assert.equal(result.ledgerDigest, "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb");
});

test("CLI is green while explicitly reporting three structural draft artifacts and no admission", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["scripts/verify-vedic-independent-productization-requirements.mjs"],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.productizationRequirementsClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(
    output.status,
    PARENT_LEDGER_STATUS
  );
  assert.equal(output.productStatus, "research_only");
  assert.equal(output.productArtifactsPresent, 3);
  assert.equal(output.rereviewRequirementsComplete, 3);
  assert.equal(output.rereviewTriggered, false);
  assert.equal(output.runtimeProposalStatus, RUNTIME_PROPOSAL_STATUS);
  assert.equal(output.sourceRightsRequirementsStatus, SOURCE_RIGHTS_REQUIREMENTS_STATUS);
  assert.equal(output.expertReviewPlanStatus, EXPERT_REVIEW_PLAN_STATUS);
  assert.equal(output.expertReviewPlanDefined, true);
  assert.equal(output.expertReviewSeatsDefined, 2);
  assert.equal(output.expertReviewSeatsFilled, 0);
  assert.equal(output.expertReviewStarted, false);
  for (const forbidden of ["ok", "ready", "admission", "admissionGatesSatisfied"]) {
    assert.equal(Object.hasOwn(output, forbidden), false);
  }
  assert.equal(output.bindingRequirementsInventoryDefined, true);
  assert.equal(output.bindingRequired, 38);
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.requirementsUniverseClosed, false);
  assert.equal(output.sourceBundleComplete, false);
  assert.equal(output.rightsBundleComplete, false);
  assert.equal(output.independentExpertsRequired, 2);
  assert.equal(output.independentExpertReviewsVerified, 0);
  assert.equal(output.baziAuthorityInherited, false);
  assert.equal(output.comparisonIncluded, false);
  assert.equal(output.factReceiptIssued, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
  assert.equal(output.ledgerDigest, "1017f04864428a84d5032aaef5593875e483e2e30ce479127682219ed269cdbb");
});

test("CLI rejects unexpected operands with a stable scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(
      process.execPath,
      ["scripts/verify-vedic-independent-productization-requirements.mjs", "nonexistent.json"],
      { cwd: workspaceRoot, windowsHide: true }
    ),
    (error) => {
      const output = JSON.parse(error.stderr);
      assert.equal(error.code, 2);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.productizationRequirementsClosureVerified, false);
      return true;
    }
  );
});

test("raw JSON rejects BOM invalid UTF-8 duplicate keys and non-canonical materialization", async () => {
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error?.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error?.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}', "utf8")),
    (error) => error?.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error?.code === "JSON_TOO_LARGE"
  );
  const fixtureRoot = await createFixture([VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH]);
  try {
    const ledger = await currentLedger();
    const target = path.resolve(fixtureRoot, ...VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH.split("/"));
    await writeFile(target, JSON.stringify(ledger), "utf8");
    await assert.rejects(
      () => currentLedger(fixtureRoot),
      (error) => error?.code === "JSON_NON_CANONICAL"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("raw parser rejects typed-array Proxy without invoking traps", () => {
  let traps = 0;
  const proxy = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      traps += 1;
      throw new Error("typed-array Proxy trap must not run");
    }
  });
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(proxy),
    (error) => error?.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(traps, 0);
});

test("raw parser uses intrinsic typed-array slots instead of subclass getters", () => {
  let lengthReads = 0;
  let bufferReads = 0;
  let byteOffsetReads = 0;
  let byteLengthReads = 0;
  class HostileBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      throw new Error("length getter must not run");
    }

    get buffer() {
      bufferReads += 1;
      throw new Error("buffer getter must not run");
    }

    get byteOffset() {
      byteOffsetReads += 1;
      throw new Error("byteOffset getter must not run");
    }

    get byteLength() {
      byteLengthReads += 1;
      throw new Error("byteLength getter must not run");
    }
  }
  const hostile = new HostileBytes(Buffer.from("{}", "utf8"));
  assert.deepEqual(parseVedicProductizationRequirementsJsonBytes(hostile), {});
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(hostile, "fixture", 1),
    (error) => error?.code === "JSON_TOO_LARGE"
  );
  assert.deepEqual(
    { bufferReads, byteLengthReads, byteOffsetReads, lengthReads },
    { bufferReads: 0, byteLengthReads: 0, byteOffsetReads: 0, lengthReads: 0 }
  );
});

test("raw parser rejects fake Uint8Array-branded objects", () => {
  const fake = Object.create(Uint8Array.prototype);
  assert.equal(fake instanceof Uint8Array, true);
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(fake),
    (error) => error?.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser rejects SharedArrayBuffer storage", () => {
  if (typeof SharedArrayBuffer !== "function") return;
  const shared = new Uint8Array(new SharedArrayBuffer(2));
  shared.set(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(shared),
    (error) => error?.code === "JSON_SHARED_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects resizable ArrayBuffer storage", () => {
  if (typeof ArrayBuffer.prototype.resize !== "function") return;
  const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
  new Uint8Array(resizable).set(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(new Uint8Array(resizable)),
    (error) => error?.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects detached typed-array storage with one scoped code", () => {
  const detachedBuffer = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachedBuffer);
  structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
  assert.throws(
    () => parseVedicProductizationRequirementsJsonBytes(detachedView),
    (error) => error?.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser returns a private object snapshot after source mutation", () => {
  const source = Buffer.from('{"value":1}', "utf8");
  const parsed = parseVedicProductizationRequirementsJsonBytes(source);
  source.fill(0);
  assert.deepEqual(parsed, { value: 1 });
});

test("ledger raw bytes use deterministic sorted canonical materialization", async () => {
  const raw = await readFile(path.resolve(workspaceRoot, ...VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH.split("/")));
  const ledger = parseVedicProductizationRequirementsJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicProductizationRequirements(ledger));
  assert.equal(raw.byteLength, 25_578);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "c9f0fbb3b25c3ad582dc4c3f5534e7e27cb44e47721dbf806b8085cefb6b26f8"
  );
});

test("object API rejects accessor prototype and Proxy inputs without invoking accessors", async () => {
  const accessorCandidate = await currentLedger();
  let reads = 0;
  Object.defineProperty(accessorCandidate.gateSummary, "releaseReady", {
    configurable: true,
    enumerable: true,
    get() {
      reads += 1;
      return true;
    }
  });
  await assert.rejects(
    () => verifyVedicProductizationRequirementsLedger(workspaceRoot, accessorCandidate),
    (error) => error?.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicProductizationRequirements(accessorCandidate),
    (error) => error?.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const prototypeCandidate = await currentLedger();
  Object.setPrototypeOf(prototypeCandidate.bindingBoundary, null);
  await assert.rejects(
    () => verifyVedicProductizationRequirementsLedger(workspaceRoot, prototypeCandidate),
    (error) => error?.code === "INPUT_PROTOTYPE_INVALID"
  );

  const proxyCandidate = await currentLedger();
  proxyCandidate.gateSummary = new Proxy(proxyCandidate.gateSummary, {});
  await assert.rejects(
    () => verifyVedicProductizationRequirementsLedger(workspaceRoot, proxyCandidate),
    (error) => error?.code === "INPUT_PROXY_FORBIDDEN"
  );
});

test("object API rejects negative zero before canonical JSON can alias it to zero", async () => {
  const candidate = await currentLedger();
  candidate.gateSummary.productArtifactsPresent = -0;
  await assert.rejects(
    () => verifyVedicProductizationRequirementsLedger(workspaceRoot, candidate),
    (error) => error?.code === "INPUT_VALUE_INVALID"
  );
  assert.throws(
    () => canonicalStringifyVedicProductizationRequirements({ value: -0 }),
    (error) => error?.code === "INPUT_VALUE_INVALID"
  );
});

test("current parent builder returns a deeply frozen digest-bearing object", async () => {
  const built = await buildCurrentVedicProductizationRequirementsLedger(workspaceRoot);
  assert.equal(Object.isFrozen(built), true);
  assert.equal(Object.isFrozen(built.authorityBoundary), true);
  assert.equal(Object.isFrozen(built.inputContractDraftClosure), true);
  assert.equal(Object.isFrozen(built.factContractDraftClosure), true);
  assert.equal(Object.isFrozen(built.ruleContractDraftClosure), true);
  assert.equal(Object.isFrozen(built.runtimeAndBundleSizeProposalClosure), true);
  const digest = built.ledgerDigest;
  assert.equal(Reflect.set(built.authorityBoundary, "formalAdmissionAuthorized", true), false);
  assert.equal(built.ledgerDigest, digest);
});

test("successful object verification returns a detached deeply frozen ledger", async () => {
  const candidate = await currentLedger();
  const result = await verifyVedicProductizationRequirementsLedger(workspaceRoot, candidate);
  assert.notEqual(result.ledger, candidate);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.boundaryAdr.semanticIdentity), true);
  assert.equal(Object.isFrozen(result.ledger.externalResearchObservations), true);
  assert.equal(Object.isFrozen(result.ledger.externalResearchObservations[0]), true);
  assert.equal(Object.isFrozen(result.ledger.rereviewRequirements), true);
  assert.equal(Object.isFrozen(result.ledger.admissionGateRequirements), true);
  candidate.authorityBoundary.publicReleaseAuthorized = true;
  assert.equal(result.ledger.authorityBoundary.publicReleaseAuthorized, false);
  assert.equal(Reflect.set(result.ledger.authorityBoundary, "publicReleaseAuthorized", true), false);
});

test("ADR raw identity and semantic identity bind the approved current boundary", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(
    {
      path: ledger.boundaryAdr.path,
      bytes: ledger.boundaryAdr.bytes,
      sha256: ledger.boundaryAdr.sha256
    },
    {
      path: ADR_PATH,
      bytes: 4531,
      sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
    }
  );
  assert.deepEqual(
    ledger.boundaryAdr.semanticIdentity.rereviewRequirementIds,
    ledger.rereviewRequirements.map((entry) => entry.requirementId)
  );
  assert.equal(ledger.boundaryAdr.semanticIdentity.semanticDigest, "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89");
  assert.equal(ledger.boundaryAdr.rawHashAndSemanticInspectionUseSameBuffer, true);
});

test("parent binds the exact eight-layer linear spine and the proposal's transitive license-evidence child", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.inputContractDraftClosure, {
    bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
    childBindsParent: false,
    inputContractDraft: {
      artifactRole: "project_authored_isolated_input_contract_draft",
      bytes: 16_529,
      path: INPUT_CONTRACT_DRAFT_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      schemaSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
      schemaStatus: "isolated_contract_draft",
      sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
    },
    inputContractRequirements: {
      artifactRole: "non_product_governance_requirements_inventory",
      bytes: 15_859,
      inputContractArtifacts: 1,
      inputContractGateSatisfied: false,
      inputInstancesObserved: 0,
      ledgerDigest: "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0",
      path: INPUT_CONTRACT_REQUIREMENTS_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsDraftCovered: 13,
      requirementsResolved: 0,
      sha256: "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59",
      status: "input_contract_draft_present_zero_instances_not_admitted"
    }
  });
  const child = JSON.parse(await readFile(path.resolve(
    workspaceRoot,
    ...INPUT_CONTRACT_REQUIREMENTS_PATH.split("/")
  ), "utf8"));
  assert.equal(child.boundaryBindings.bindingDirection, "requirements_to_draft_and_adr_only");
  assert.equal(
    Object.prototype.hasOwnProperty.call(child.boundaryBindings, "parentProductizationRequirements"),
    false
  );
  assert.deepEqual(ledger.factContractDraftClosure, {
    bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
    childBindsParent: false,
    factContractDraft: {
      artifactRole: "project_authored_isolated_fact_contract_draft",
      bytes: 14_240,
      factContractGateSatisfied: false,
      factFamiliesDefined: 4,
      factInstancesObserved: 0,
      path: FACT_CONTRACT_DRAFT_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsResolved: 0,
      schemaSemanticDigest: "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1",
      schemaStatus: "isolated_contract_draft",
      sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
    },
    factContractRequirements: {
      artifactRole: "non_product_governance_fact_requirements_inventory",
      bytes: 42_634,
      factContractArtifacts: 1,
      factContractGateSatisfied: false,
      factInstancesObserved: 0,
      ledgerDigest: "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8",
      path: FACT_CONTRACT_REQUIREMENTS_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsDefined: 12,
      requirementsDraftCovered: 12,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      sha256: "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38",
      status: "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
    }
  });
  const factChild = JSON.parse(await readFile(path.resolve(
    workspaceRoot,
    ...FACT_CONTRACT_REQUIREMENTS_PATH.split("/")
  ), "utf8"));
  assert.equal(
    factChild.boundaryBindings.bindingDirection,
    "requirements_to_adr_input_draft_input_requirements_and_fact_draft_only"
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(factChild.boundaryBindings, "parentProductizationRequirements"),
    false
  );
  assert.equal(
    JSON.stringify(factChild.boundaryBindings).includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH),
    false
  );
  assert.deepEqual(ledger.ruleContractDraftClosure, {
    bindingDirection: "draft_and_requirements_to_parent_aggregator_only",
    childBindsParent: false,
    ruleContractDraft: {
      artifactRole: "project_authored_isolated_rule_contract_draft",
      blockedPrerequisitesDefined: 13,
      blockedPrerequisitesResolved: 0,
      blockedPrerequisitesUniverseClosed: false,
      bytes: 12_140,
      path: RULE_CONTRACT_DRAFT_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsResolved: 0,
      ruleContractGateSatisfied: false,
      ruleDefinitionsIncluded: 0,
      ruleEvaluationCapability: false,
      ruleInstancesObserved: 0,
      rulesetExecutionCapability: false,
      rulesetInstancesObserved: 0,
      schemaSemanticDigest: "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3",
      schemaStatus: "isolated_contract_draft",
      sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d",
      versionedRulesetGateSatisfied: false
    },
    ruleContractRequirements: {
      artifactRole: "non_product_governance_rule_requirements_inventory",
      bytes: 30_734,
      ledgerDigest: "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f",
      path: RULE_CONTRACT_REQUIREMENTS_PATH,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      requirementsDefined: 13,
      requirementsDraftCovered: 13,
      requirementsResolved: 0,
      requirementsUniverseClosed: false,
      ruleCandidatesObserved: 0,
      ruleContractArtifacts: 1,
      ruleContractGateSatisfied: false,
      ruleDefinitionsObserved: 0,
      ruleEvaluatorInstances: 0,
      ruleFailureReceipts: 0,
      ruleImplementationInstances: 0,
      ruleInstancesObserved: 0,
      ruleReceiptIssued: false,
      ruleReceipts: 0,
      rulesetInstancesObserved: 0,
      sha256: "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94",
      status:
        "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted",
      successReceiptIssued: false,
      successReceipts: 0,
      versionedRulesetGateSatisfied: false
    }
  });
  const ruleChild = JSON.parse(await readFile(path.resolve(
    workspaceRoot,
    ...RULE_CONTRACT_REQUIREMENTS_PATH.split("/")
  ), "utf8"));
  assert.equal(
    ruleChild.boundaryBindings.bindingDirection,
    "requirements_to_adr_input_draft_input_requirements_fact_draft_fact_requirements_and_rule_draft_only"
  );
  assert.deepEqual(
    [...ruleChild.boundaryBindings.chainOrder, RULE_CONTRACT_REQUIREMENTS_PATH],
    SEVEN_LAYER_PATHS
  );
  assert.equal(new Set(SEVEN_LAYER_PATHS).size, 7);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      ruleChild.boundaryBindings,
      "parentProductizationRequirements"
    ),
    false
  );
  const ruleBindingText = JSON.stringify(ruleChild.boundaryBindings);
  assert.equal(ruleBindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH), false);
  assert.equal(ruleBindingText.includes("four-system-admission"), false);
  assert.deepEqual(ledger.runtimeAndBundleSizeProposalClosure, {
    bindingDirection: "proposal_to_parent_aggregator_only",
    childBindsCentralRegistry: false,
    childBindsParent: false,
    runtimeAndBundleSizeProposal: {
      artifactRole: "non_product_governance_runtime_and_bundle_size_proposal",
      browserReceipts: 0,
      browserRunsExecuted: 0,
      budgetCeilingsProposed: 18,
      buildArtifactsObserved: 0,
      buildReceipts: 0,
      bytes: 27_241,
      dependenciesWithObservedRefs: 4,
      dependenciesWithoutObservedRefs: 1,
      implementationArtifactsObserved: 0,
      implementationReceipts: 0,
      legalReviewsComplete: 0,
      loopbackEvidenceRefs: 0,
      measurementReceipts: 0,
      observedMeasurementCount: 0,
      path: RUNTIME_PROPOSAL_PATH,
      performanceMeasurementsObserved: 0,
      primarySourceObservationCount: 5,
      proposalCoverageComplete: true,
      proposalDigest: "ae9fb180d97e81a30a9157655d168bb4101d993f859f40990db31c2e12954f15",
      proposalTargetsApproved: false,
      publicObjectApiVerified: true,
      publicReadApiVerified: true,
      publicReleaseAuthorized: false,
      publicSourceHttpReadsObserved: 10,
      rawHashAndSemanticInspectionUseSameBuffer: true,
      redistributionAuthorizations: 0,
      releaseReady: false,
      reviewsComplete: false,
      runtimeDependencyLicenseEvidenceDigest:
        "cbd459847bd4f57450f8389f127aa76c424298511786811b17c3cb88a856c926",
      runtimeDependencyLicenseEvidenceReleaseReady: false,
      runtimeDependencyLicenseEvidenceSha256:
        "ed51e68438bc3b00613986e082d6064ceea41e9f75dc9992613e1b91449105e1",
      runtimeExecutionsObserved: 0,
      runtimeOptionSelected: false,
      runtimeOptionsProposed: 2,
      runtimeReceipts: 0,
      selectedRuntimeOptionId: null,
      sha256: "e268aa78d6123c34481752cc8e0789e1a185f3f2e2ce9757c45d6227f5bea30e",
      stableImmediateReadPairs: 4,
      status: RUNTIME_PROPOSAL_STATUS,
      successReceipts: 0,
      unstableImmediateReadPairs: 1
    }
  });
  const runtimeProposal = JSON.parse(await readFile(path.resolve(
    workspaceRoot,
    ...RUNTIME_PROPOSAL_PATH.split("/")
  ), "utf8"));
  assert.equal(runtimeProposal.boundaryBindings.proposalBindsParent, false);
  assert.equal(runtimeProposal.boundaryBindings.proposalBindsCentralRegistry, false);
  assert.deepEqual(
    [...runtimeProposal.boundaryBindings.chainOrder, RUNTIME_PROPOSAL_PATH],
    EIGHT_LAYER_PATHS
  );
  assert.equal(new Set(EIGHT_LAYER_PATHS).size, 8);
  assert.equal(
    runtimeProposal.runtimeDependencyLicenseEvidenceClosure.bindingDirection,
    "runtime_dependency_license_evidence_to_runtime_proposal_aggregator_only"
  );
  assert.equal(
    runtimeProposal.runtimeDependencyLicenseEvidenceClosure
      .runtimeDependencyLicenseEvidence.path,
    RUNTIME_LICENSE_EVIDENCE_PATH
  );
  assert.equal(
    EIGHT_LAYER_PATHS.includes(RUNTIME_LICENSE_EVIDENCE_PATH),
    false
  );
  const runtimeBindingText = JSON.stringify(runtimeProposal.boundaryBindings);
  assert.equal(runtimeBindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH), false);
  assert.equal(runtimeBindingText.includes("four-system-admission"), false);
});

test("source-rights requirements child exact projection and public read/object APIs remain one-way and all-unbound", async () => {
  const ledger = await currentLedger();
  const closure = ledger.sourceRightsRequirementsClosure;
  assert.equal(closure.bindingDirection, "source_rights_requirements_to_parent_aggregator_only");
  assert.equal(closure.childBindsParent, false);
  assert.equal(closure.childBindsCentralRegistry, false);
  assert.equal(closure.childBindsRuntimeProposal, false);
  assert.deepEqual(closure.sourceRightsRequirements, {
    artifactRole: "non_product_governance_source_binding_and_three_layer_rights_requirements_inventory",
    bindingFrozenVerified: 0,
    bindingRequired: 38,
    bindingRequirementsInventoryDefined: true,
    bytes: 85752,
    carrierRightsEstablished: 0,
    exactLocatorsEstablished: 0,
    exactQuotesBound: 0,
    ledgerDigest: "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e",
    licenseEstablished: false,
    path: SOURCE_RIGHTS_REQUIREMENTS_PATH,
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: false,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    releaseReady: false,
    requirementsUniverseClosed: false,
    rightsBundleComplete: false,
    rightsEstablished: false,
    rightsLegalConclusionEstablished: false,
    sha256: "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9",
    sourceBindingEstablished: false,
    sourceBodiesBound: 0,
    sourceBundleComplete: false,
    sourceCandidatesAttached: 0,
    status: SOURCE_RIGHTS_REQUIREMENTS_STATUS,
    subjectCount: 38,
    versionRightsEstablished: 0,
    workRightsEstablished: 0
  });

  const child = await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  const childResult = await verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, child);
  assert.deepEqual(childResult.ledger, child);
  assert.equal(childResult.bindingRequirementsInventoryDefined, true);
  assert.equal(childResult.bindingRequired, 38);
  assert.equal(childResult.bindingFrozenVerified, 0);
  assert.equal(childResult.requirementsUniverseClosed, false);
  assert.equal(childResult.sourceBundleComplete, false);
  assert.equal(childResult.rightsBundleComplete, false);
  assert.equal(childResult.subjectCount, 38);
  assert.deepEqual(
    [...child.boundaryBindings.chainOrder, SOURCE_RIGHTS_REQUIREMENTS_PATH],
    SOURCE_RIGHTS_EIGHT_LAYER_PATHS
  );
  assert.equal(new Set(SOURCE_RIGHTS_EIGHT_LAYER_PATHS).size, 8);
  assert.deepEqual(child.boundaryBindings.upstreamArtifacts.map((entry) => entry.path), SEVEN_LAYER_PATHS);
  assert.equal(child.boundaryBindings.upstreamArtifacts.every(
    (entry) => entry.rawHashAndInspectionUseSameReadBuffer === true
  ), true);
  const childBindingText = JSON.stringify(child.boundaryBindings);
  assert.equal(childBindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH), false);
  assert.equal(childBindingText.includes("four-system-admission"), false);
  assert.equal(childBindingText.includes(RUNTIME_PROPOSAL_PATH), false);
});

test("expert-review plan exact projection remains one-way, two-seat vacant and zero-instance", async () => {
  const ledger = await currentLedger();
  const closure = ledger.realIndependentExpertReviewPlanClosure;
  assert.equal(
    closure.bindingDirection,
    "real_independent_expert_review_plan_to_parent_aggregator_only"
  );
  assert.equal(closure.childBindsParent, false);
  assert.equal(closure.childBindsCentralRegistry, false);
  assert.equal(closure.childBindsRuntimeProposal, false);
  assert.equal(closure.childBindsSourceRightsRequirements, true);
  assert.deepEqual(closure.realIndependentExpertReviewPlan, {
    artifactRole: "non_product_governance_real_independent_expert_review_plan",
    bytes: 37131,
    expertReviewBundleComplete: false,
    independentExpertReviewsVerified: 0,
    path: EXPERT_REVIEW_PLAN_PATH,
    planCoverageComplete: true,
    planCoverageMeaning:
      "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance",
    planDigest: "2eb4dc9c037403e47f332cc105755bfb86aa8ad6dc0b95dbaf29e80d7bdfd1af",
    publicObjectApiVerified: true,
    publicReadApiVerified: true,
    publicReleaseAuthorized: false,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    releaseReady: false,
    reviewStarted: false,
    reviewerSlotsDefined: 2,
    reviewerSlotsOccupied: 0,
    sha256: "9bcbff519dd38d40f26dfba1ccabe1c2987700200cf3a7f6eb7bf68254d7cf89",
    status: EXPERT_REVIEW_PLAN_STATUS
  });
  const child = await readVedicRealIndependentExpertReviewPlan(workspaceRoot);
  const childResult = await verifyVedicRealIndependentExpertReviewPlan(workspaceRoot, child);
  assert.deepEqual(childResult.plan, child);
  assert.equal(childResult.planCoverageComplete, true);
  assert.equal(
    childResult.planCoverageMeaning,
    "material_contract_coverage_only_no_reviewer_eligibility_identity_independence_opinion_truth_or_gate_instance"
  );
  assert.equal(childResult.reviewerSlotsDefined, 2);
  assert.equal(childResult.reviewerSlotsOccupied, 0);
  assert.equal(childResult.reviewStarted, false);
  assert.equal(childResult.independentExpertReviewsVerified, 0);
  assert.equal(childResult.expertReviewBundleComplete, false);
  assert.equal(child.reviewStartPrerequisites.required, 16);
  assert.equal(child.reviewStartPrerequisites.satisfied, 0);
  assert.equal(child.reviewStartPrerequisites.states.length, 16);
  assert.equal(child.reviewStartPrerequisites.states.every((entry) =>
    entry.currentState === false && entry.requiredState === true), true);
  assert.equal(child.expertEligibilityAndVerificationPlan.verifierMustBeDistinctFromReviewer, true);
  assert.equal(child.expertEligibilityAndVerificationPlan.verifierMustBeOutsideBothReviewerSeats, true);
  assert.equal(child.expertEligibilityAndVerificationPlan.reviewerSeatsMayVerifyEachOther, false);
  assert.equal(
    child.expertEligibilityAndVerificationPlan.primaryAndCorroboratingEvidenceRefsMustBeDistinctRecords,
    true
  );
  assert.equal(
    child.expertEligibilityAndVerificationPlan.corroboratingEvidenceMustHaveIndependentProvenanceFromPrimary,
    true
  );
  assert.equal(child.expertEligibilityAndVerificationPlan.requiredVedicScopeCoverageCount, 5);
  assert.equal(child.expertEligibilityAndVerificationPlan.requiredVedicScopeCoverageRoleMappings.length, 5);
  assert.equal(child.reviewQuestions.every((question) =>
    question.assignedReviewerRoleId === "vedic_domain_expert"), true);
  assert.equal(child.reviewPacketContract.currentReviewPacketId, null);
  assert.equal(child.reviewPacketContract.reviewPacketInstances.length, 0);
  assert.equal(child.zeroInstanceReceipt.scopeFitsVerified, 0);
  assert.deepEqual(
    [...child.boundaryBindings.chainOrder, EXPERT_REVIEW_PLAN_PATH],
    EXPERT_REVIEW_PLAN_NINE_LAYER_PATHS
  );
  assert.equal(new Set(EXPERT_REVIEW_PLAN_NINE_LAYER_PATHS).size, 9);
  const bindingText = JSON.stringify(child.boundaryBindings);
  assert.equal(bindingText.includes(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH), false);
  assert.equal(bindingText.includes("four-system-admission"), false);
  assert.equal(bindingText.includes(RUNTIME_PROPOSAL_PATH), false);
});

test("self-resigned source-rights child backlinks and cycles to runtime parent or registry fail closed", async () => {
  const child = await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  for (const mutate of [
    (value) => { value.boundaryBindings.childBindsParent = true; },
    (value) => { value.boundaryBindings.childBindsRuntimeProposal = true; },
    (value) => { value.boundaryBindings.childBindsCentralRegistry = true; },
    (value) => { value.boundaryBindings.chainOrder.push(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH); },
    (value) => { value.boundaryBindings.chainOrder.push(RUNTIME_PROPOSAL_PATH); },
    (value) => { value.boundaryBindings.chainOrder.push("content/system-admission/four-system-admission.v1.json"); }
  ]) {
    const candidate = structuredClone(child);
    mutate(candidate);
    candidate.ledgerDigest = computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(candidate);
    await assert.rejects(
      () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
      (error) => error?.code === "BOUNDARY_BACKLINK_FORBIDDEN"
    );
  }
});

test("self-resigning cannot forge the approved draft-child closure or reintroduce a cycle", async () => {
  const attacks = [
    [
      (value) => { value.inputContractDraftClosure.childBindsParent = true; },
      "INPUT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.inputContractDraftClosure.inputContractDraft.sha256 = "0".repeat(64); },
      "INPUT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.inputContractDraftClosure.inputContractRequirements.ledgerDigest = "0".repeat(64);
      },
      "INPUT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.factContractDraftClosure.childBindsParent = true; },
      "FACT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.factContractDraftClosure.factContractDraft.sha256 = "0".repeat(64); },
      "FACT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.factContractDraftClosure.factContractRequirements.ledgerDigest = "0".repeat(64);
      },
      "FACT_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.ruleContractDraftClosure.childBindsParent = true; },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.ruleContractDraftClosure.ruleContractDraft.sha256 = "0".repeat(64); },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.ruleContractDraftClosure.ruleContractDraft.schemaSemanticDigest = "0".repeat(64);
      },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.ruleContractDraftClosure.ruleContractRequirements.ledgerDigest = "0".repeat(64);
      },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.ruleContractDraftClosure.ruleContractRequirements.status = "ready"; },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.ruleContractDraftClosure.ruleContractRequirements.ruleEvaluatorInstances = 1;
      },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.ruleContractDraftClosure.ruleContractRequirements.rulesetInstancesObserved = 1;
      },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.ruleContractDraftClosure.ruleContractRequirements.ruleReceiptIssued = true;
      },
      "RULE_CONTRACT_DRAFT_CLOSURE_INVALID"
    ],
    [
      (value) => { value.runtimeAndBundleSizeProposalClosure.childBindsParent = true; },
      "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    ],
    [
      (value) => { value.runtimeAndBundleSizeProposalClosure.childBindsCentralRegistry = true; },
      "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.sha256 =
          "0".repeat(64);
      },
      "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.proposalDigest =
          "0".repeat(64);
      },
      "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.status = "ready";
      },
      "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    ],
    [
      (value) => { value.realIndependentExpertReviewPlanClosure.childBindsParent = true; },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.childBindsCentralRegistry = true;
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.childBindsRuntimeProposal = true;
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.childBindsSourceRightsRequirements = false;
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.realIndependentExpertReviewPlan.sha256 =
          "0".repeat(64);
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.realIndependentExpertReviewPlan.planDigest =
          "0".repeat(64);
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.realIndependentExpertReviewPlan.status =
          "review_complete";
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.realIndependentExpertReviewPlan
          .reviewerSlotsOccupied = 1;
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.realIndependentExpertReviewPlanClosure.realIndependentExpertReviewPlan
          .reviewStarted = true;
      },
      "EXPERT_REVIEW_PLAN_CLOSURE_INVALID"
    ],
    [
      (value) => { value.sourceRightsRequirementsClosure.childBindsParent = true; },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => { value.sourceRightsRequirementsClosure.childBindsCentralRegistry = true; },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => { value.sourceRightsRequirementsClosure.childBindsRuntimeProposal = true; },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.sourceRightsRequirementsClosure.sourceRightsRequirements.sha256 = "0".repeat(64);
      },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.sourceRightsRequirementsClosure.sourceRightsRequirements.ledgerDigest = "0".repeat(64);
      },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => { value.sourceRightsRequirementsClosure.sourceRightsRequirements.status = "ready"; },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.sourceRightsRequirementsClosure.sourceRightsRequirements.bindingRequired = 0;
      },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ],
    [
      (value) => {
        value.sourceRightsRequirementsClosure.sourceRightsRequirements.requirementsUniverseClosed = true;
      },
      "SOURCE_RIGHTS_REQUIREMENTS_CLOSURE_INVALID"
    ]
  ];
  for (const [attack, expectedCode] of attacks) {
    await expectRejectedMutation(attack, expectedCode);
  }
});

test("self-resigning cannot promote runtime proposal material into measurements selection reviews or receipts", async () => {
  const projectionMutations = [
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .performanceMeasurementsObserved = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .observedMeasurementCount = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .runtimeExecutionsObserved = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .buildArtifactsObserved = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .browserRunsExecuted = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.runtimeReceipts = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .proposalTargetsApproved = true;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.runtimeOptionSelected = true;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal.reviewsComplete = true;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .selectedRuntimeOptionId = "browser_embedded";
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .dependenciesWithObservedRefs = 5;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .legalReviewsComplete = 1;
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .runtimeDependencyLicenseEvidenceDigest = "0".repeat(64);
    },
    (value) => {
      value.runtimeAndBundleSizeProposalClosure.runtimeAndBundleSizeProposal
        .runtimeDependencyLicenseEvidenceReleaseReady = true;
    }
  ];
  for (const mutation of projectionMutations) {
    await expectRejectedMutation(mutation, "RUNTIME_PROPOSAL_CLOSURE_INVALID");
  }
  for (const [key, forged] of [
    ["performanceMeasurementsObserved", 1],
    ["runtimeExecutionsObserved", 1],
    ["buildArtifactsObserved", 1],
    ["browserRunsExecuted", 1],
    ["runtimeReceipts", 1],
    ["proposalTargetsApproved", true],
    ["runtimeOptionSelected", true],
    ["reviewsComplete", true]
  ]) {
    await expectRejectedMutation(
      (value) => { value.evidenceLedger[key] = forged; },
      "EVIDENCE_BOUNDARY_PROMOTED"
    );
  }
});

test("source-rights item stays partial while the two-seat expert plan raises material count to exactly three", async () => {
  const ledger = await currentLedger();
  assert.equal(ledger.rereviewRequirements.length, 7);
  assert.equal(ledger.admissionGateRequirements.length, 8);
  assert.equal(
    ledger.rereviewRequirements[0].requirementState,
    "complete_structural_drafts_present_research_only_not_admitted"
  );
  assert.deepEqual(
    ledger.rereviewRequirements[0].artifactRefs,
    INPUT_FACT_AND_RULE_ARTIFACT_REFS
  );
  assert.equal(ledger.rereviewRequirements[1].requirementId, "runtime_and_bundle_size_proposal");
  assert.equal(ledger.rereviewRequirements[1].requirementState, RUNTIME_PROPOSAL_STATUS);
  assert.deepEqual(ledger.rereviewRequirements[1].artifactRefs, [RUNTIME_PROPOSAL_PATH]);
  assert.deepEqual(ledger.rereviewRequirements[2], {
    artifactRefs: [SOURCE_RIGHTS_REQUIREMENTS_PATH],
    requirementId: "three_layer_source_rights_ledger",
    requirementState: SOURCE_RIGHTS_REREVIEW_PARTIAL_STATUS,
    title: "作品、版本、载体三层来源权利账"
  });
  assert.deepEqual(ledger.rereviewRequirements[3], {
    artifactRefs: [EXPERT_REVIEW_PLAN_PATH],
    requirementId: "two_independent_real_expert_review_plan",
    requirementState: EXPERT_REVIEW_PLAN_STATUS,
    title: "至少两名目标范围现实专家的可核验审阅计划"
  });
  assert.equal(ledger.rereviewRequirements.slice(4).every(
    (entry) => entry.requirementState === "required_absent" && entry.artifactRefs.length === 0
  ), true);
  assert.equal(
    ledger.admissionGateRequirements[0].requirementState,
    "draft_present_formal_input_contract_not_admitted"
  );
  assert.deepEqual(ledger.admissionGateRequirements[0].artifactRefs, INPUT_CONTRACT_ARTIFACT_REFS);
  assert.equal(
    ledger.admissionGateRequirements[1].requirementState,
    "fact_contract_draft_present_producer_and_fact_instances_absent"
  );
  assert.deepEqual(ledger.admissionGateRequirements[1].artifactRefs, FACT_CONTRACT_ARTIFACT_REFS);
  assert.equal(
    ledger.admissionGateRequirements[2].requirementState,
    "rule_contract_draft_present_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
  );
  assert.deepEqual(ledger.admissionGateRequirements[2].artifactRefs, RULE_CONTRACT_ARTIFACT_REFS);
  assert.deepEqual(ledger.admissionGateRequirements[3], {
    artifactRefs: [SOURCE_RIGHTS_REQUIREMENTS_PATH],
    gateId: "source_bundle",
    requirementState: SOURCE_BUNDLE_PARTIAL_ABSENT_STATUS
  });
  assert.deepEqual(ledger.admissionGateRequirements[4], {
    artifactRefs: [SOURCE_RIGHTS_REQUIREMENTS_PATH],
    gateId: "rights_bundle",
    requirementState: RIGHTS_BUNDLE_PARTIAL_ABSENT_STATUS
  });
  assert.deepEqual(ledger.admissionGateRequirements[5], {
    artifactRefs: [EXPERT_REVIEW_PLAN_PATH],
    gateId: "expert_review_bundle",
    requirementState: EXPERT_REVIEW_GATE_PLAN_ONLY_STATUS
  });
  assert.equal(ledger.admissionGateRequirements.slice(6).every(
    (entry) => entry.requirementState === "required_absent" && entry.artifactRefs.length === 0
  ), true);
  assert.equal(ledger.gateSummary.rereviewRequirementsComplete, 3);
  assert.equal(ledger.gateSummary.rereviewRequirementsRequired, 7);
  assert.equal(ledger.gateSummary.rereviewTriggered, false);
  assert.equal(ledger.gateSummary.admissionGatesSatisfied, 0);
  assert.equal(ledger.gateSummary.admissionGatesRequired, 8);
  assert.equal(ledger.gateSummary.productArtifactsPresent, 3);
  assert.equal(ledger.gateSummary.bindingRequirementsInventoryDefined, true);
  assert.equal(ledger.gateSummary.bindingRequired, 38);
  assert.equal(ledger.gateSummary.bindingFrozenVerified, 0);
  assert.equal(ledger.gateSummary.requirementsUniverseClosed, false);
  assert.equal(ledger.gateSummary.sourceBindingEstablished, false);
  assert.equal(ledger.gateSummary.rightsEstablished, false);
});

test("runtime proposal does not create a runtime selection implementation or product identity", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.productBoundary, {
    domainManifest: "absent",
    factContract: "isolated_contract_draft",
    factProducer: "absent",
    inputContract: "isolated_contract_draft",
    migrationId: null,
    mutationEpochCapability: "absent_no_admitted_product_schema",
    productSurface: "absent",
    projector: "absent",
    releaseIdentity: null,
    ruleContract: "isolated_contract_draft",
    ruleEvaluator: "absent",
    runtimeImplementation: "absent",
    runtimeOption: "unselected",
    runtimeProposal: "quantified_governance_proposal_unselected_unimplemented_unvalidated",
    sourceBindingLedger: "requirements_only_open_universe_all_unbound",
    targetSchema: null,
    versionedRuleset: "absent"
  });
  assert.equal(ledger.bindingBoundary.bindingRequirementsInventoryDefined, true);
  assert.equal(ledger.bindingBoundary.bindingRequired, 38);
  assert.equal(ledger.bindingBoundary.requirementsUniverseClosed, false);
  assert.equal(ledger.bindingBoundary.bindingFrozenVerified, 0);
  await expectRejectedMutation(
    (value) => {
      value.bindingBoundary.bindingRequired = 0;
      value.gateSummary.bindingRequired = 0;
    },
    "BINDING_REQUIREMENTS_INVENTORY_INVALID"
  );
  for (const mutation of [
    (value) => {
      value.bindingBoundary.bindingRequirementsInventoryDefined = false;
      value.gateSummary.bindingRequirementsInventoryDefined = false;
    },
    (value) => {
      value.bindingBoundary.bindingRequired = null;
      value.gateSummary.bindingRequired = null;
    },
    (value) => {
      value.bindingBoundary.requirementsUniverseClosed = true;
      value.gateSummary.requirementsUniverseClosed = true;
    }
  ]) {
    await expectRejectedMutation(mutation, "BINDING_REQUIREMENTS_INVENTORY_INVALID");
  }
});

test("external observations cannot be self-resigned into source binding license rights expert or authenticity evidence", async () => {
  const mutations = [
    (value) => { value.externalResearchObservations[0].role = "source_bundle"; },
    (value) => { value.externalResearchObservations[0].bindingEstablished = true; },
    (value) => { value.externalResearchObservations[0].sourceBodyBound = true; },
    (value) => { value.externalResearchObservations[0].exactQuoteBound = true; },
    (value) => { value.externalResearchObservations[0].exactLocatorEstablished = true; },
    (value) => { value.externalResearchObservations[0].licenseEstablished = true; },
    (value) => { value.externalResearchObservations[0].rightsEstablished = true; },
    (value) => { value.externalResearchObservations[0].expertEvidenceEstablished = true; },
    (value) => { value.externalResearchObservations[0].authenticityEstablished = true; }
  ];
  for (const mutation of mutations) await expectRejectedMutation(mutation, "EXTERNAL_OBSERVATION_PROMOTED");
});

test("source quote locator binding license and rights arrays cannot be populated after re-digest", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.bindingBoundary.versionRightsEvidenceRefs, []);
  assert.equal(Object.hasOwn(ledger.bindingBoundary, "editionRightsEvidenceRefs"), false);
  const mutations = [
    (value) => { value.bindingBoundary.sourceCandidateIds.push("invented-source"); },
    (value) => { value.bindingBoundary.sourceBodyRefs.push("invented-body"); },
    (value) => { value.bindingBoundary.exactQuoteRefs.push("invented-quote"); },
    (value) => { value.bindingBoundary.exactLocatorRefs.push("invented-locator"); },
    (value) => { value.bindingBoundary.frozenBindingIds.push("invented-binding"); },
    (value) => { value.bindingBoundary.licenseEvidenceRefs.push("invented-license"); },
    (value) => { value.bindingBoundary.workRightsEvidenceRefs.push("invented-right"); },
    (value) => { value.bindingBoundary.versionRightsEvidenceRefs.push("invented-right"); },
    (value) => { value.bindingBoundary.carrierRightsEvidenceRefs.push("invented-right"); },
    (value) => { value.bindingBoundary.sourceBindingEstablished = true; }
  ];
  for (const mutation of mutations) await expectRejectedMutation(mutation, "BINDING_BOUNDARY_PROMOTED");
});

test("legacy-v13 Schema 13 product artifacts experts and all authority projections cannot be borrowed or promoted", async () => {
  const productMutations = [
    (value) => { value.productBoundary.releaseIdentity = "legacy-v13"; },
    (value) => { value.productBoundary.targetSchema = 13; },
    (value) => { value.productBoundary.migrationId = "borrowed"; },
    (value) => { value.productBoundary.mutationEpochCapability = "present"; },
    (value) => { value.productBoundary.productSurface = "bazi-web"; },
    (value) => { value.productBoundary.factContract = "formally_admitted"; },
    (value) => { value.productBoundary.factProducer = "bazi-core"; },
    (value) => { value.productBoundary.projector = "bazi-projector"; },
    (value) => { value.productBoundary.inputContract = "formally_admitted"; },
    (value) => { value.productBoundary.domainManifest = "present"; },
    (value) => { value.productBoundary.ruleContract = "formally_admitted"; },
    (value) => { value.productBoundary.ruleEvaluator = "present"; },
    (value) => { value.productBoundary.runtimeProposal = "approved_runtime"; },
    (value) => { value.productBoundary.runtimeOption = "browser_embedded"; },
    (value) => { value.productBoundary.runtimeImplementation = "present"; },
    (value) => { value.productBoundary.versionedRuleset = "present"; }
  ];
  for (const mutation of productMutations) await expectRejectedMutation(mutation, "PRODUCT_BOUNDARY_PROMOTION");

  await expectRejectedMutation(
    (value) => { value.expertBoundary.identitiesVerified = 1; },
    "EXPERT_BOUNDARY_PROMOTED"
  );
  assert.equal((await currentLedger()).expertBoundary.expertReviewPlanDefined, true);
  for (const mutation of [
    (value) => { value.expertBoundary.expertReviewPlanDefined = false; },
    (value) => { value.expertBoundary.expertReviewSeatsDefined = 1; },
    (value) => { value.expertBoundary.expertReviewSeatsFilled = 1; },
    (value) => { value.expertBoundary.expertReviewStarted = true; },
    (value) => { value.expertBoundary.credentialsVerified = 1; },
    (value) => { value.expertBoundary.independentExpertReviewsVerified = 1; },
    (value) => { value.expertBoundary.opinionsVerified = 1; },
    (value) => { value.expertBoundary.expertReviewBundle = "complete"; },
    (value) => { value.expertBoundary.expertTruthEstablished = true; }
  ]) {
    await expectRejectedMutation(mutation, "EXPERT_BOUNDARY_PROMOTED");
  }
  for (const key of [
    "baziAuthorityInherited", "comparisonIncluded", "domainAuthorityAuthorized", "expertClaimsAuthorized",
    "factReceiptIssued", "formalAdmissionAuthorized", "publicDeploymentAuthorized", "publicReleaseAuthorized",
    "releaseReady", "ruleContractGateSatisfied", "ruleEvaluationAuthorized", "ruleReceiptIssued",
    "rulesetExecutionAuthorized", "successReceiptIssued", "versionedRulesetGateSatisfied"
  ]) {
    await expectRejectedMutation((value) => { value.authorityBoundary[key] = true; }, "AUTHORITY_PROMOTED");
  }
});

test("self-resigning cannot forge rule evaluator ruleset receipts or admission summaries", async () => {
  for (const mutation of [
    (value) => { value.gateSummary.ruleContractGateSatisfied = true; },
    (value) => { value.gateSummary.ruleEvaluatorInstances = 1; },
    (value) => { value.gateSummary.ruleInstancesObserved = 1; },
    (value) => { value.gateSummary.rulesetInstancesObserved = 1; },
    (value) => { value.gateSummary.ruleReceiptIssued = true; },
    (value) => { value.gateSummary.ruleReceipts = 1; },
    (value) => { value.gateSummary.successReceiptIssued = true; },
    (value) => { value.gateSummary.successReceipts = 1; },
    (value) => { value.gateSummary.versionedRulesetGateSatisfied = true; },
    (value) => { value.gateSummary.admissionGatesSatisfied = 1; },
    (value) => { value.gateSummary.productArtifactsPresent = 4; },
    (value) => { value.gateSummary.rereviewRequirementsComplete = 2; },
    (value) => { value.gateSummary.rereviewRequirementsComplete = 4; },
    (value) => { value.gateSummary.rereviewRequirementsComplete = 7; },
    (value) => { value.gateSummary.rereviewTriggered = true; }
  ]) {
    await expectRejectedMutation(mutation, "GATE_SUMMARY_PROMOTED");
  }
});

test("runtime, source-rights or expert-plan material cannot promote partial or remaining rereview items", async () => {
  for (const index of [2, 4, 5, 6]) {
    await expectRejectedMutation((value) => {
      value.rereviewRequirements[index].requirementState = "complete";
      value.rereviewRequirements[index].artifactRefs = [RUNTIME_PROPOSAL_PATH];
    }, "REREVIEW_REQUIREMENTS_PROMOTED");
  }
  await expectRejectedMutation((value) => {
    value.rereviewRequirements[1].requirementState = "approved_runtime";
  }, "REREVIEW_REQUIREMENTS_PROMOTED");
  await expectRejectedMutation((value) => {
    value.rereviewRequirements[2].requirementState = "complete";
  }, "REREVIEW_REQUIREMENTS_PROMOTED");
  await expectRejectedMutation((value) => {
    value.rereviewRequirements[2].artifactRefs = [
      SOURCE_RIGHTS_REQUIREMENTS_PATH,
      RUNTIME_PROPOSAL_PATH
    ];
  }, "REREVIEW_REQUIREMENTS_PROMOTED");
  await expectRejectedMutation((value) => {
    value.rereviewRequirements[3].artifactRefs = [RUNTIME_PROPOSAL_PATH];
  }, "REREVIEW_REQUIREMENTS_PROMOTED");
  await expectRejectedMutation((value) => {
    value.rereviewRequirements[3].requirementState = "expert_reviews_complete";
  }, "REREVIEW_REQUIREMENTS_PROMOTED");
});

test("evidence ledger records both sibling identities but zero source-rights or runtime execution evidence", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.evidenceLedger, {
    artifactAuthenticity: "not_established",
    browserReceipts: 0,
    browserRunsExecuted: 0,
    browserRuntimeEvidence: "not_assessed",
    buildArtifactsObserved: 0,
    buildReceipts: 0,
    contentTruth: "not_established",
    engineeringIdentity:
      "adr_input_fact_rule_draft_requirements_runtime_bundle_proposal_source_rights_requirements_expert_review_plan_and_non_product_observation_raw_identities_verified",
    expertTruth: "not_established",
    implementationArtifactsObserved: 0,
    implementationReceipts: 0,
    measurementReceipts: 0,
    performanceMeasurementsObserved: 0,
    proposalCoverageComplete: true,
    proposalTargetsApproved: false,
    publicReleaseAuthorization: "not_authorized",
    releaseReadiness: "not_ready",
    reviewsComplete: false,
    rightsLegalConclusion: "not_established",
    ruleEvaluatorEvidence: "absent",
    ruleInstanceEvidence: "zero_observed",
    ruleReceiptEvidence: "zero_observed",
    rulesetEvidence: "zero_instances_versioned_ruleset_absent",
    runtimeExecutionsObserved: 0,
    runtimeOptionSelected: false,
    runtimeReceipts: 0,
    successReceipts: 0
  });
  assert.deepEqual(ledger.doesNotEstablish, [
    "formally_admitted_or_semantically_selected_vedic_input_contract",
    "vedic_fact_producer_or_deterministic_facts",
    "formally_admitted_or_semantically_selected_vedic_rule_contract",
    "vedic_rule_definition_body_instance_evaluation_or_method_truth",
    "vedic_rule_evaluator_implementation_or_versioned_ruleset",
    "vedic_rule_failure_rule_or_success_receipt_instance",
    "vedic_versioned_ruleset",
    "source_candidate_identity_or_source_body",
    "exact_quote_or_locator",
    "closed_or_exhaustive_source_rights_requirements_universe",
    "source_binding_or_frozen_binding",
    "license_or_three_layer_rights_conclusion",
    "expert_identity_credentials_independence_opinion_or_truth",
    "expert_review_plan_material_as_expert_instance_review_execution_review_bundle_or_expert_truth",
    "artifact_authenticity_or_digital_signature",
    "bazi_authority_inheritance",
    "cross_system_comparison_or_concept_equivalence",
    "browser_or_runtime_validation",
    "runtime_option_selection_implementation_build_or_execution",
    "runtime_performance_measurement_or_browser_build_runtime_receipt_evidence",
    "proposal_material_coverage_as_review_storage_or_release_evidence_design_completion",
    "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion",
    "formal_admission_or_release_readiness",
    "public_release_authorization"
  ]);
  for (const mutation of [
    (value) => { value.evidenceLedger.engineeringIdentity = "rules_verified"; },
    (value) => { value.evidenceLedger.ruleEvaluatorEvidence = "present"; },
    (value) => { value.evidenceLedger.ruleInstanceEvidence = "observed"; },
    (value) => { value.evidenceLedger.ruleReceiptEvidence = "issued"; },
    (value) => { value.evidenceLedger.rulesetEvidence = "versioned_ruleset_present"; }
  ]) {
    await expectRejectedMutation(mutation, "EVIDENCE_BOUNDARY_PROMOTED");
  }
});

test("SHA-256 cannot be relabeled as a signature authenticity or signer identity", async () => {
  const mutations = [
    (value) => { value.integrityBoundary.digestIsDigitalSignature = true; },
    (value) => { value.integrityBoundary.authenticityEstablished = true; },
    (value) => { value.integrityBoundary.digitalSignature = "invented"; },
    (value) => { value.integrityBoundary.signerIdentity = "invented"; }
  ];
  for (const mutation of mutations) await expectRejectedMutation(mutation, "INTEGRITY_BOUNDARY_PROMOTED");
});

test("strict canonical UTC unknown fields and semantic self-resigning fail closed", async () => {
  await expectRejectedMutation((value) => { value.createdAt = "2026-08-29T00:00:00Z"; }, "UTC_INVALID");
  await expectRejectedMutation((value) => { value.ownerAuthorized = true; }, "LEDGER_INVALID");
  await expectRejectedMutation(
    (value) => { value.externalResearchObservations[0].licenseName = "invented"; },
    "LEDGER_MISMATCH"
  );
  await expectRejectedMutation((value) => { value.doesNotEstablish.pop(); }, "EVIDENCE_BOUNDARY_PROMOTED");
  await expectRejectedMutation(
    (value) => { value.boundaryAdr.semanticIdentity.productStatus = "production"; },
    "LEDGER_MISMATCH"
  );
  await expectRejectedMutation(
    (value) => { value.boundaryAdr.sha256 = "0".repeat(64); },
    "LEDGER_MISMATCH"
  );
});

test("approved ADR input fact rule runtime source-rights expert-plan or external observation byte drift invalidates the ledger", async () => {
  for (const relativePath of [
    ADR_PATH,
    INPUT_CONTRACT_DRAFT_PATH,
    INPUT_CONTRACT_REQUIREMENTS_PATH,
    FACT_CONTRACT_DRAFT_PATH,
    FACT_CONTRACT_REQUIREMENTS_PATH,
    RULE_CONTRACT_DRAFT_PATH,
    RULE_CONTRACT_REQUIREMENTS_PATH,
    RUNTIME_PROPOSAL_PATH,
    SOURCE_RIGHTS_REQUIREMENTS_PATH,
    EXPERT_REVIEW_PLAN_PATH,
    EXTERNAL_OBSERVATION_PATHS[0]
  ]) {
    const fixtureRoot = await createFixture();
    try {
      const target = path.resolve(fixtureRoot, ...relativePath.split("/"));
      const original = await readFile(target);
      await writeFile(target, Buffer.concat([original, Buffer.from("\nfixture-drift\n", "utf8")]));
      const fixtureLedger = await currentLedger(fixtureRoot);
      await assert.rejects(
        () => verifyVedicProductizationRequirementsLedger(fixtureRoot, fixtureLedger),
        (error) => error?.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  }
});

test("runtime license evidence child drift reaches the parent only through runtime proposal closure", async () => {
  const fixtureRoot = await createFixture();
  try {
    const target = path.resolve(fixtureRoot, ...RUNTIME_LICENSE_EVIDENCE_PATH.split("/"));
    const original = await readFile(target);
    await writeFile(target, Buffer.concat([original, Buffer.from("\nfixture-drift\n", "utf8")]));
    const fixtureLedger = await currentLedger(fixtureRoot);
    await assert.rejects(
      () => verifyVedicProductizationRequirementsLedger(fixtureRoot, fixtureLedger),
      (error) => error?.code === "RUNTIME_PROPOSAL_CLOSURE_INVALID"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("hard-linked source-rights requirements child endpoint is rejected by the parent builder", async () => {
  const fixtureRoot = await createFixture();
  try {
    const target = path.resolve(fixtureRoot, ...SOURCE_RIGHTS_REQUIREMENTS_PATH.split("/"));
    const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
    await copyFile(target, seed);
    await rm(target);
    await link(seed, target);
    await assert.rejects(
      () => buildCurrentVedicProductizationRequirementsLedger(fixtureRoot),
      (error) => error?.code === "SOURCE_RIGHTS_REQUIREMENTS_ENDPOINT_INVALID"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("hard-linked expert-review plan endpoint is rejected by the parent builder", async () => {
  const fixtureRoot = await createFixture();
  try {
    const target = path.resolve(fixtureRoot, ...EXPERT_REVIEW_PLAN_PATH.split("/"));
    const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
    await copyFile(target, seed);
    await rm(target);
    await link(seed, target);
    await assert.rejects(
      () => buildCurrentVedicProductizationRequirementsLedger(fixtureRoot),
      (error) => error?.code === "EXPERT_REVIEW_PLAN_ENDPOINT_INVALID"
    );
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("source-rights child reader rejects a junction in its content directory chain", async (t) => {
  const realRoot = await createFixture();
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-parent-source-rights-junction-"));
  try {
    await mkdir(path.join(linkedRoot, "docs"), { recursive: true });
    await copyFile(
      path.resolve(realRoot, ...ADR_PATH.split("/")),
      path.resolve(linkedRoot, ...ADR_PATH.split("/"))
    );
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
      () => readVedicSourceBindingAndThreeLayerRightsRequirements(linkedRoot),
      (error) => error?.code === "LEDGER_ENDPOINT_INVALID"
    );
  } finally {
    await rm(realRoot, { recursive: true, force: true });
    await rm(linkedRoot, { recursive: true, force: true });
  }
});

test("ledger reader and bound artifact reader reject junction directory chains", async () => {
  const ledgerFixture = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-ledger-junction-"));
  try {
    const materialized = path.join(ledgerFixture, "materialized-content", "system-admission");
    await mkdir(materialized, { recursive: true });
    await copyFile(
      path.resolve(workspaceRoot, ...VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH.split("/")),
      path.join(materialized, path.basename(VEDIC_PRODUCTIZATION_REQUIREMENTS_RELATIVE_PATH))
    );
    await symlink(
      path.join(ledgerFixture, "materialized-content"),
      path.join(ledgerFixture, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
    await assert.rejects(
      () => currentLedger(ledgerFixture),
      (error) => error?.code === "LEDGER_ENDPOINT_INVALID"
    );
  } finally {
    await rm(ledgerFixture, { recursive: true, force: true });
  }

  const artifactFixture = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-artifact-junction-"));
  try {
    for (const relativePath of [
      INPUT_CONTRACT_DRAFT_PATH,
      INPUT_CONTRACT_REQUIREMENTS_PATH,
      FACT_CONTRACT_DRAFT_PATH,
      FACT_CONTRACT_REQUIREMENTS_PATH,
      RULE_CONTRACT_DRAFT_PATH,
      RULE_CONTRACT_REQUIREMENTS_PATH,
      RUNTIME_PROPOSAL_PATH,
      RUNTIME_LICENSE_EVIDENCE_PATH,
      SOURCE_RIGHTS_REQUIREMENTS_PATH,
      EXPERT_REVIEW_PLAN_PATH
    ]) {
      await copyRelativeFile(workspaceRoot, artifactFixture, relativePath);
    }
    const materializedDocs = path.join(artifactFixture, "materialized-docs");
    await mkdir(materializedDocs, { recursive: true });
    for (const relativePath of [ADR_PATH, ...EXTERNAL_OBSERVATION_PATHS]) {
      await copyFile(
        path.resolve(workspaceRoot, ...relativePath.split("/")),
        path.join(materializedDocs, path.basename(relativePath))
      );
    }
    await symlink(
      materializedDocs,
      path.join(artifactFixture, "docs"),
      process.platform === "win32" ? "junction" : "dir"
    );
    await assert.rejects(
      () => buildCurrentVedicProductizationRequirementsLedger(artifactFixture),
      (error) => new Set([
        "ADR_ENDPOINT_INVALID",
        "EXTERNAL_OBSERVATION_ENDPOINT_INVALID"
      ]).has(error?.code)
    );
  } finally {
    await rm(artifactFixture, { recursive: true, force: true });
  }
});

test("observation boundary records held handles and same-buffer inspection without claiming atomicity or ABA exclusion", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    parentAndChildrenAtomicSnapshot: false,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true
  });
  assert.equal(
    ledger.doesNotEstablish.includes(
      "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion"
    ),
    true
  );
  for (const mutate of [
    (value) => { value.observationBoundary.mutationEpochAvailable = true; },
    (value) => { value.observationBoundary.mutationEpochReceipt = "invented"; },
    (value) => { value.observationBoundary.parentAndChildrenAtomicSnapshot = true; },
    (value) => { value.observationBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.observationBoundary.intervalMutationExcluded = true; },
    (value) => { value.observationBoundary.abaExcluded = true; }
  ]) {
    await expectRejectedMutation(mutate, "OBSERVATION_BOUNDARY_PROMOTED");
  }
});
