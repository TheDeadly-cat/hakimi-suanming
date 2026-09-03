import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import {
  readBaziDomainReleaseManifest,
  verifyBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";

export const SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH =
  "content/system-admission/four-system-admission.v1.json";

const MAX_REGISTRY_BYTES = 1_000_000;
const MAX_ARTIFACT_BYTES = 5_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

const SYSTEM_ARTIFACT_SPECS = Object.freeze({
  bazi: Object.freeze([
    Object.freeze({
      role: "current_domain_release_manifest",
      path: "content/domain-release/bazi.single-chart-report.v1.7.0.json"
    }),
    Object.freeze({
      role: "source_binding_freeze_requirements_inventory",
      path: "content/system-admission/bazi-binding-freeze-requirements.v1.json"
    }),
    Object.freeze({
      role: "engineering_binding_candidate_ledger",
      path: "content/bazi-strength-engineering-binding-candidates.v1.json"
    }),
    Object.freeze({
      role: "expert_review_candidate_packet",
      path: "content/bazi-strength-expert-review-packet.v1.json"
    }),
    Object.freeze({
      role: "release_evidence_schema",
      path: "docs/release/release-evidence.schema.json"
    })
  ]),
  "ziwei-doushu": Object.freeze([
    Object.freeze({
      role: "independent_domain_release_manifest_draft",
      path: "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json"
    }),
    Object.freeze({
      role: "source_binding_requirements_inventory",
      path: "content/system-admission/ziwei-source-binding-requirements.v1.json"
    }),
    Object.freeze({
      role: "isolated_contract_draft",
      path: "packages/ziwei-doushu-contracts-draft/src/index.ts"
    }),
    Object.freeze({
      role: "isolated_iztro_lock_closure",
      path: "packages/ziwei-iztro-adapter-draft/src/iztro-2.5.8-lock-closure.json"
    }),
    Object.freeze({
      role: "isolated_workspace_artifact_draft",
      path: "packages/ziwei-workspace-artifact-draft/src/index.ts"
    }),
    Object.freeze({
      role: "source_and_rights_research_notes",
      path: "docs/紫微斗数契约草案与来源门-v0.1.md"
    })
  ]),
  "western-astrology": Object.freeze([
    Object.freeze({
      role: "independent_domain_release_manifest_draft",
      path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json"
    }),
    Object.freeze({
      role: "source_binding_requirements_inventory",
      path: "content/system-admission/western-source-binding-requirements.v1.json"
    }),
    Object.freeze({
      role: "isolated_contract_draft",
      path: "packages/western-astrology-contracts-draft/src/index.ts"
    }),
    Object.freeze({
      role: "isolated_astronomy_engine_lock_closure",
      path: "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json"
    }),
    Object.freeze({
      role: "isolated_rule_layer_bridge_draft",
      path: "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts"
    }),
    Object.freeze({
      role: "source_and_rights_research_notes",
      path: "docs/西洋星盘契约草案与来源门-v0.1.md"
    })
  ]),
  "vedic-astrology": Object.freeze([
    Object.freeze({
      role: "independent_product_boundary_adr",
      path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md"
    }),
    Object.freeze({
      role: "external_repository_research_audit",
      path: "docs/GitHub外部参考审计-2026-08-24.md"
    }),
    Object.freeze({
      role: "public_site_and_repository_research_audit",
      path: "docs/公开命理网站与五仓库吸收审计-2026-08-25.md"
    })
  ])
});

const CROSS_SYSTEM_ARTIFACT_SPEC = Object.freeze({
  role: "isolated_readonly_comparison_draft",
  path: "packages/cross-system-comparison-draft/src/index.ts"
});

export class SystemAdmissionRegistryError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "SystemAdmissionRegistryError";
    this.code = code;
  }
}

function compareKeys(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => compareKeys(left, right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`;
}

export function canonicalStringifySystemAdmissionRegistry(value) {
  return stableStringify(value);
}

export function computeSystemAdmissionRegistryDigest(unsignedRegistry) {
  return createHash("sha256")
    .update(canonicalStringifySystemAdmissionRegistry(unsignedRegistry), "utf8")
    .digest("hex");
}

function safeWorkspacePath(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.posix.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new SystemAdmissionRegistryError(
      "ARTIFACT_PATH_INVALID",
      `四体系准入证据路径无效：${String(relativePath)}`
    );
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function hashBoundArtifact(workspaceRoot, spec) {
  const rootRealPath = await realpath(workspaceRoot);
  const absolutePath = safeWorkspacePath(rootRealPath, spec.path);
  const artifactRealPath = await realpath(absolutePath);
  const relativeToRoot = path.relative(rootRealPath, artifactRealPath);
  if (
    relativeToRoot === ""
    || relativeToRoot.startsWith(`..${path.sep}`)
    || relativeToRoot === ".."
    || path.isAbsolute(relativeToRoot)
  ) {
    throw new SystemAdmissionRegistryError(
      "ARTIFACT_PATH_ESCAPE",
      `四体系准入证据越出工作区：${spec.path}`
    );
  }
  const metadata = await stat(artifactRealPath);
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_ARTIFACT_BYTES) {
    throw new SystemAdmissionRegistryError(
      "ARTIFACT_INVALID",
      `四体系准入证据缺失、为空或超过输入上限：${spec.path}`
    );
  }
  const bytes = await readFile(artifactRealPath);
  return Object.freeze({
    role: spec.role,
    path: spec.path,
    bytes: metadata.size,
    sha256: createHash("sha256").update(bytes).digest("hex")
  });
}

async function verifyCurrentBaziManifestIdentity(workspaceRoot) {
  const manifest = await readBaziDomainReleaseManifest(workspaceRoot);
  const verified = await verifyBaziDomainReleaseManifest(workspaceRoot, manifest);
  return verified.manifestDigest;
}

function gate(engineeringState, closureState) {
  return Object.freeze({
    engineeringState,
    closureState,
    formalGateSatisfied: false
  });
}

function authorityBoundary() {
  return Object.freeze({
    formalAdmissionAuthorized: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false
  });
}

function evidenceLedger(engineeringIdentity) {
  return Object.freeze({
    engineeringIdentity,
    browserRuntimeEvidence: "not_assessed_in_this_registry",
    contentTruth: "not_established",
    expertTruth: "not_established",
    rightsLegalConclusion: "not_established",
    releaseReadiness: "not_ready",
    publicReleaseAuthorization: "not_authorized"
  });
}

function baziSystem(artifacts) {
  return Object.freeze({
    productSystemId: "bazi",
    contractSystemId: "bazi",
    productStatus: "existing_research_surface_engineering_candidate",
    integrationBoundary: Object.freeze({
      surface: "existing_bazi_research_surface",
      schema: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      isolatedFromOtherSystems: true
    }),
    admissionGates: Object.freeze({
      inputContract: gate("bound_current_surface", "not_independently_closed_for_product_admission"),
      deterministicFacts: gate("bound_current_surface", "not_independently_closed_for_product_admission"),
      ruleset: gate("versioned_engineering_candidate", "source_and_expert_closure_missing"),
      sourceBundle: gate("historical_and_engineering_candidate_mechanics_present", "binding_frozen_0_of_12"),
      rightsBundle: gate("candidate_mechanics_present", "redistributable_closure_not_established"),
      expertReviewBundle: gate("candidate_packet_present", "verified_independent_experts_0_of_2"),
      highRiskPolicy: gate("bound_current_surface", "not_expert_authorized"),
      releaseEvidence: gate("same_artifact_mechanics_present", "formal_run_not_complete")
    }),
    authorityBoundary: authorityBoundary(),
    evidenceLedger: evidenceLedger("selected_current_artifact_digests_verified"),
    artifacts
  });
}

function ziweiSystem(artifacts) {
  return Object.freeze({
    productSystemId: "ziwei-doushu",
    contractSystemId: "ziwei",
    productStatus: "isolated_engineering_draft",
    integrationBoundary: Object.freeze({
      surface: "isolated_preview_only",
      schema: "no_main_app_schema",
      targetSchema: null,
      migrationId: null,
      isolatedFromOtherSystems: true
    }),
    admissionGates: Object.freeze({
      inputContract: gate("isolated_contract_draft", "formal_input_contract_not_admitted"),
      deterministicFacts: gate("isolated_adapter_and_workspace_draft", "fact_bundle_not_admitted"),
      ruleset: gate("isolated_rule_snapshot_draft", "rule_version_not_expert_admitted"),
      sourceBundle: gate("binding_requirements_inventory_27_present", "binding_frozen_0_of_27"),
      rightsBundle: gate("license_research_notes_present", "product_rights_closure_not_established"),
      expertReviewBundle: gate("no_verified_review_bundle", "verified_independent_experts_0_of_2"),
      highRiskPolicy: gate("draft_fail_closed_boundary", "system_specific_policy_not_admitted"),
      releaseEvidence: gate("isolated_test_evidence_only", "formal_release_evidence_absent")
    }),
    authorityBoundary: authorityBoundary(),
    evidenceLedger: evidenceLedger("isolated_draft_artifact_digests_verified"),
    artifacts
  });
}

function westernSystem(artifacts) {
  return Object.freeze({
    productSystemId: "western-astrology",
    contractSystemId: "western",
    productStatus: "isolated_engineering_draft",
    integrationBoundary: Object.freeze({
      surface: "isolated_preview_only",
      schema: "no_main_app_schema",
      targetSchema: null,
      migrationId: null,
      isolatedFromOtherSystems: true
    }),
    admissionGates: Object.freeze({
      inputContract: gate("isolated_contract_draft", "formal_input_contract_not_admitted"),
      deterministicFacts: gate("isolated_astronomy_adapter_draft", "fact_bundle_not_admitted"),
      ruleset: gate("isolated_rule_preview_draft", "rule_version_not_expert_admitted"),
      sourceBundle: gate("binding_requirements_inventory_28_present", "binding_frozen_0_of_28"),
      rightsBundle: gate("license_research_notes_present", "product_rights_closure_not_established"),
      expertReviewBundle: gate("no_verified_review_bundle", "verified_independent_experts_0_of_2"),
      highRiskPolicy: gate("draft_fail_closed_boundary", "system_specific_policy_not_admitted"),
      releaseEvidence: gate("isolated_test_evidence_only", "formal_release_evidence_absent")
    }),
    authorityBoundary: authorityBoundary(),
    evidenceLedger: evidenceLedger("isolated_draft_artifact_digests_verified"),
    artifacts
  });
}

function vedicSystem(artifacts) {
  return Object.freeze({
    productSystemId: "vedic-astrology",
    contractSystemId: "vedic",
    productStatus: "research_only_not_integrated",
    integrationBoundary: Object.freeze({
      surface: "no_product_surface",
      schema: "no_product_schema",
      targetSchema: null,
      migrationId: null,
      isolatedFromOtherSystems: true
    }),
    admissionGates: Object.freeze({
      inputContract: gate("absent", "formal_input_contract_absent"),
      deterministicFacts: gate("absent", "fact_bundle_absent"),
      ruleset: gate("absent", "versioned_ruleset_absent"),
      sourceBundle: gate("external_research_observation_only", "frozen_source_bundle_absent"),
      rightsBundle: gate("external_restrictions_observed", "product_rights_closure_not_established"),
      expertReviewBundle: gate("no_verified_review_bundle", "verified_independent_experts_0_of_2"),
      highRiskPolicy: gate("adr_boundary_only", "system_specific_policy_not_admitted"),
      releaseEvidence: gate("absent", "formal_release_evidence_absent")
    }),
    authorityBoundary: authorityBoundary(),
    evidenceLedger: evidenceLedger("adr_and_research_note_digests_verified_not_product_artifacts"),
    artifacts
  });
}

export async function buildCurrentSystemAdmissionRegistry(workspaceRoot, options = {}) {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const [baziManifestDigest, rawBaziArtifacts, ziweiArtifacts, westernArtifacts, vedicArtifacts, crossSystemArtifact] =
    await Promise.all([
      verifyCurrentBaziManifestIdentity(workspaceRoot),
      Promise.all(SYSTEM_ARTIFACT_SPECS.bazi.map((spec) => hashBoundArtifact(workspaceRoot, spec))),
      Promise.all(SYSTEM_ARTIFACT_SPECS["ziwei-doushu"].map((spec) => hashBoundArtifact(workspaceRoot, spec))),
      Promise.all(SYSTEM_ARTIFACT_SPECS["western-astrology"].map((spec) => hashBoundArtifact(workspaceRoot, spec))),
      Promise.all(SYSTEM_ARTIFACT_SPECS["vedic-astrology"].map((spec) => hashBoundArtifact(workspaceRoot, spec))),
      hashBoundArtifact(workspaceRoot, CROSS_SYSTEM_ARTIFACT_SPEC)
    ]);
  const baziArtifacts = rawBaziArtifacts.map((artifact) => artifact.role === "current_domain_release_manifest"
    ? Object.freeze({ ...artifact, semanticManifestDigest: baziManifestDigest })
    : artifact);

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "four_system_independent_admission_registry",
    registryId: "hakimi.system-admission/four-system/1.0.0",
    registryStatus: "fail_closed_independent_admission_registry",
    createdAt,
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    systemIdVocabulary: [
      { productSystemId: "bazi", contractSystemId: "bazi" },
      { productSystemId: "ziwei-doushu", contractSystemId: "ziwei" },
      { productSystemId: "western-astrology", contractSystemId: "western" },
      { productSystemId: "vedic-astrology", contractSystemId: "vedic" }
    ],
    systems: [
      baziSystem(baziArtifacts),
      ziweiSystem(ziweiArtifacts),
      westernSystem(westernArtifacts),
      vedicSystem(vedicArtifacts)
    ],
    crossSystemPolicy: {
      mode: "isolated_readonly_facts_only",
      artifact: crossSystemArtifact,
      currentDraftSystemIds: ["bazi", "ziwei-doushu", "western-astrology"],
      excludedUntilIndependentAdmission: ["vedic-astrology"],
      factsFrozenRequired: true,
      scoringAllowed: false,
      weightingAllowed: false,
      majorityVoteAllowed: false,
      generatedModelWinnerSelectionAllowed: false,
      autoPersonMergeAllowed: false,
      authorityInheritanceAllowed: false,
      conceptEquivalenceInferenceAllowed: false,
      formalComparisonAuthorized: false,
      nonEquivalentConceptExamples: [
        { productSystemId: "bazi", conceptId: "bazi.wealth_star", label: "财星" },
        { productSystemId: "ziwei-doushu", conceptId: "ziwei.wealth_palace", label: "财帛宫" },
        { productSystemId: "western-astrology", conceptId: "western.house_2", label: "第二宫" },
        { productSystemId: "vedic-astrology", conceptId: "vedic.d2_hora", label: "D2/Hora" }
      ]
    },
    gateSummary: {
      systemsRequired: 4,
      systemsRegistered: 4,
      systemsFormallyAdmitted: 0,
      systemsDomainAuthorityAuthorized: 0,
      systemsReleaseReady: 0,
      systemsPublicReleaseAuthorized: 0,
      formalCrossSystemComparisonAuthorized: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    doesNotEstablish: [
      "browser_or_runtime_validation",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "release_readiness",
      "public_release_authorization",
      "cross_system_concept_equivalence"
    ]
  };
  return Object.freeze({
    ...unsigned,
    registryDigest: computeSystemAdmissionRegistryDigest(unsigned)
  });
}

function requireRegistryObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SystemAdmissionRegistryError(
      "REGISTRY_INVALID",
      "四体系独立准入登记必须是 JSON 对象。"
    );
  }
  return value;
}

export async function readSystemAdmissionRegistry(
  workspaceRoot,
  relativePath = SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH
) {
  const absolutePath = safeWorkspacePath(workspaceRoot, relativePath);
  const metadata = await stat(absolutePath);
  if (!metadata.isFile() || metadata.size <= 0 || metadata.size > MAX_REGISTRY_BYTES) {
    throw new SystemAdmissionRegistryError(
      "REGISTRY_INVALID",
      "四体系独立准入登记缺失、为空或超过输入上限。"
    );
  }
  try {
    return requireRegistryObject(JSON.parse(await readFile(absolutePath, "utf8")));
  } catch (cause) {
    if (cause instanceof SystemAdmissionRegistryError) throw cause;
    throw new SystemAdmissionRegistryError(
      "REGISTRY_INVALID",
      "四体系独立准入登记不是有效 JSON。",
      { cause }
    );
  }
}

export async function verifySystemAdmissionRegistry(workspaceRoot, registryInput) {
  const registry = requireRegistryObject(registryInput);
  if (
    typeof registry.createdAt !== "string"
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(registry.createdAt)
    || !LOWERCASE_SHA256.test(registry.registryDigest ?? "")
  ) {
    throw new SystemAdmissionRegistryError(
      "REGISTRY_INVALID",
      "四体系独立准入登记的时间或摘要字段无效。"
    );
  }
  const expected = await buildCurrentSystemAdmissionRegistry(workspaceRoot, {
    createdAt: registry.createdAt
  });
  if (
    canonicalStringifySystemAdmissionRegistry(registry)
    !== canonicalStringifySystemAdmissionRegistry(expected)
  ) {
    throw new SystemAdmissionRegistryError(
      "REGISTRY_MISMATCH",
      "四体系独立准入登记与当前证据闭包、独立准入门或失败关闭边界不一致。"
    );
  }
  return Object.freeze({
    registry,
    registryDigest: registry.registryDigest,
    systemsRegistered: registry.gateSummary.systemsRegistered,
    systemsFormallyAdmitted: registry.gateSummary.systemsFormallyAdmitted
  });
}
