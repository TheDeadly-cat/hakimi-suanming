import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export const BAZI_ENGINEERING_BINDING_CANDIDATE_LEDGER_RELATIVE_PATH =
  "content/bazi-strength-engineering-binding-candidates.v1.json";

const MAX_LEDGER_BYTES = 1_000_000;
const MAX_ARTIFACT_BYTES = 5_000_000;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ENGINEERING_AUTHORITY_BOUNDARY =
  "engineering_definition_only_no_classical_or_expert_authority";

function artifact(path, stableSymbols) {
  return Object.freeze({ path, stableSymbols: Object.freeze([...stableSymbols]) });
}

function definition(input) {
  return Object.freeze({
    ...input,
    artifactDefinitions: Object.freeze(input.artifactDefinitions.map((entry) => artifact(entry.path, entry.stableSymbols))),
    consumerClaimIds: Object.freeze([...input.consumerClaimIds]),
    forbiddenClaims: Object.freeze([...input.forbiddenClaims])
  });
}

export const BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS = Object.freeze([
  definition({
    candidateId: "hakimi-strength-core-0.1.0-engineering-candidate-v1",
    bindingId: "binding:core:derive-assessment",
    evidenceSubjectId: "bazi.strength.binding.core.derive-assessment.v1",
    order: 1,
    sourceId: "hakimi-strength-core-0.1.0",
    registryLocator: "deriveBaziStrengthAssessment + collectBaziStrengthFactors",
    artifactDefinitions: [artifact("packages/bazi-interpretation/src/strength-assessment-core.ts", [
      "collectBaziStrengthFactors",
      "deriveBaziStrengthAssessment"
    ])],
    consumerClaimIds: [
      "bazi.engineering.strength.day_master_fact_anchor.v1",
      "bazi.engineering.strength.factor_inclusion.v1"
    ],
    definitionSummary: "当前工程从日主、透干、藏干与时柱可靠性派生完整因素账。",
    rationaleDraft: "先形成逐因素、方向与权重均可复演的账，再汇总支持侧与需求侧并派生候选分档，以减少分散实现造成的计算漂移。",
    forbiddenClaims: ["命理真值", "科学有效性", "用户吉凶"]
  }),
  definition({
    candidateId: "hakimi-strength-factor-inclusion-0.1.0-engineering-candidate-v1",
    bindingId: "binding:policy:factor-inclusion",
    evidenceSubjectId: "bazi.strength.binding.policy.factor-inclusion.v1",
    order: 2,
    sourceId: "hakimi-strength-policy-0.1.0",
    registryLocator: "BAZI_STRENGTH_POLICY.factorInclusion",
    artifactDefinitions: [
      artifact("packages/bazi-interpretation/src/strength-policy.ts", ["BAZI_STRENGTH_POLICY", "factorInclusion"]),
      artifact("packages/bazi-interpretation/src/strength-assessment-core.ts", ["collectBaziStrengthFactors"])
    ],
    consumerClaimIds: [
      "bazi.engineering.strength.factor_inclusion.v1",
      "bazi.engineering.strength.unreliable_hour_withheld.v1"
    ],
    definitionSummary: "日主透干排除、月令与首藏分别保留、时辰不可靠时关闭时柱。",
    rationaleDraft: "排除日主自身的重复透干贡献，并在时辰不可靠时关闭全部时柱因素；月令与首藏分别保留为可审计基线，等待后续反例与专家复核。",
    forbiddenClaims: ["传统唯一规则", "所有流派一致"]
  }),
  definition({
    candidateId: "hakimi-strength-direction-map-0.1.0-engineering-candidate-v1",
    bindingId: "binding:policy:direction-map",
    evidenceSubjectId: "bazi.strength.binding.policy.direction-map.v1",
    order: 3,
    sourceId: "hakimi-strength-policy-0.1.0",
    registryLocator: "BAZI_STRENGTH_TEN_GOD_GROUPS + strengthFactorDirectionForTenGod",
    artifactDefinitions: [artifact("packages/bazi-interpretation/src/strength-policy.ts", [
      "BAZI_STRENGTH_TEN_GOD_GROUPS",
      "strengthFactorDirectionForTenGod"
    ])],
    consumerClaimIds: ["bazi.engineering.ten_god.support_demand_grouping.v1"],
    definitionSummary: "比劫与印归支持侧，食伤、财与官杀归需求侧。",
    rationaleDraft: "先把十神压缩为五个工程组，再映射为支持与需求两侧，使同一加总过程可以逐项审计；该二分不承担喜忌或吉凶判断。",
    forbiddenClaims: ["支持即吉", "需求即凶", "用神喜忌"]
  }),
  definition({
    candidateId: "hakimi-strength-weights-0.1.0-engineering-candidate-v1",
    bindingId: "binding:policy:weights",
    evidenceSubjectId: "bazi.strength.binding.policy.weights.v1",
    order: 4,
    sourceId: "hakimi-strength-policy-0.1.0",
    registryLocator: "BAZI_STRENGTH_FACTOR_WEIGHTS",
    artifactDefinitions: [artifact("packages/bazi-interpretation/src/strength-policy.ts", [
      "BAZI_STRENGTH_FACTOR_WEIGHTS",
      "strengthFactorWeight"
    ])],
    consumerClaimIds: ["bazi.engineering.strength.factor_weights_4_2_2_1.v1"],
    definitionSummary: "月令 4、透干 2、首位藏干 2、其余藏干 1 的当前工程候选。",
    rationaleDraft: "采用小整数权重，使月令、透干与藏干的相对差异可复演并可在敏感性场景中扰动；这些数字不表示古籍规定、专家批准或统计校准。",
    forbiddenClaims: ["古籍规定该权重", "专家批准", "统计校准"]
  }),
  definition({
    candidateId: "hakimi-strength-month-duplication-0.1.0-engineering-candidate-v1",
    bindingId: "binding:policy:month-duplication",
    evidenceSubjectId: "bazi.strength.binding.policy.month-duplication.v1",
    order: 5,
    sourceId: "hakimi-strength-policy-0.1.0",
    registryLocator: "BAZI_STRENGTH_POLICY.monthMainDuplication",
    artifactDefinitions: [
      artifact("packages/bazi-interpretation/src/strength-policy.ts", ["BAZI_STRENGTH_POLICY", "monthMainDuplication"]),
      artifact("packages/bazi-interpretation/src/strength-assessment-core.ts", ["collectBaziStrengthFactors"])
    ],
    consumerClaimIds: ["bazi.engineering.strength.month_main_counted_separately.v1"],
    definitionSummary: "月令主气与月支首位藏干在当前基线分别计入。",
    rationaleDraft: "分别计入可把当前模型选择显式暴露，并由去重敏感性场景观察其影响；基线与去重场景都不因此成为命理真值。",
    forbiddenClaims: ["古籍规定合计权重 6", "去重场景必然正确"]
  }),
  definition({
    candidateId: "hakimi-strength-thresholds-0.1.0-engineering-candidate-v1",
    bindingId: "binding:policy:thresholds",
    evidenceSubjectId: "bazi.strength.binding.policy.thresholds.v1",
    order: 6,
    sourceId: "hakimi-strength-policy-0.1.0",
    registryLocator: "BAZI_STRENGTH_BAND_THRESHOLDS + classifyStrengthBand",
    artifactDefinitions: [artifact("packages/bazi-interpretation/src/strength-policy.ts", [
      "BAZI_STRENGTH_BAND_THRESHOLDS",
      "classifyStrengthBand"
    ])],
    consumerClaimIds: ["bazi.engineering.strength.threshold_bands.v1"],
    definitionSummary: "支持比例按 0.25、0.43、0.57、0.75 映射五档。",
    rationaleDraft: "固定阈值使连续支持比例可稳定复演为五个展示档位；当前数值只服务工程候选的一致分类，尚无案例集、专家或统计校准。",
    forbiddenClaims: ["传统分界", "人口统计阈值", "预测准确率"]
  }),
  definition({
    candidateId: "hakimi-strength-sensitivity-0.1.0-engineering-candidate-v1",
    bindingId: "binding:sensitivity:six-scenarios",
    evidenceSubjectId: "bazi.strength.binding.sensitivity.six-scenarios.v1",
    order: 7,
    sourceId: "hakimi-strength-sensitivity-0.1.0",
    registryLocator: "BAZI_STRENGTH_SENSITIVITY_SCENARIOS + buildStrengthSensitivityReview",
    artifactDefinitions: [
      artifact("packages/bazi-interpretation/src/strength-policy.ts", ["BAZI_STRENGTH_SENSITIVITY_SCENARIOS"]),
      artifact("packages/bazi-interpretation/src/strength-sensitivity-review.ts", ["buildStrengthSensitivityReview"])
    ],
    consumerClaimIds: ["bazi.engineering.strength.scenario_sensitivity.v1"],
    definitionSummary: "六个工程扰动场景的权重、排除项、分档与稳定性比较。",
    rationaleDraft: "固定六个基线或扰动场景，用于暴露结论对计权与因素纳入假设的敏感程度；场景集合不代表流派穷尽、专家共识或预测稳健性。",
    forbiddenClaims: ["六大流派", "专家共识", "预测稳健性"]
  })
]);

export class BaziEngineeringBindingCandidateError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziEngineeringBindingCandidateError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new BaziEngineeringBindingCandidateError(code, message);
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  fail("NON_CANONICAL_JSON", "工程 Binding 候选账只接受有限规范 JSON 值。");
}

export function canonicalStringifyEngineeringBindingCandidate(value) {
  return JSON.stringify(canonicalValue(value));
}

export function computeEngineeringBindingCandidateDigest(candidate) {
  const { candidateDigest: _candidateDigest, ...unsigned } = candidate;
  return createHash("sha256")
    .update(canonicalStringifyEngineeringBindingCandidate(unsigned), "utf8")
    .digest("hex");
}

export function computeEngineeringBindingCandidateLedgerDigest(ledger) {
  const { ledgerDigest: _ledgerDigest, ...unsigned } = ledger;
  return createHash("sha256")
    .update(canonicalStringifyEngineeringBindingCandidate(unsigned), "utf8")
    .digest("hex");
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (
    typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || relativePath.includes("\0")
    || path.isAbsolute(relativePath)
    || path.win32.isAbsolute(relativePath)
    || relativePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    fail("UNSAFE_PATH", `工程 Binding 候选账路径不安全：${relativePath}`);
  }
  return path.resolve(workspaceRoot, ...relativePath.split("/"));
}

async function readBoundFile(workspaceRoot, relativePath, maxBytes = MAX_ARTIFACT_BYTES) {
  const root = await realpath(path.resolve(workspaceRoot));
  const absolute = safeWorkspaceFile(root, relativePath);
  let actual;
  let metadata;
  try {
    [actual, metadata] = await Promise.all([realpath(absolute), stat(absolute)]);
  } catch (cause) {
    throw new BaziEngineeringBindingCandidateError("ARTIFACT_MISSING", `工程 Binding 候选账文件不存在：${relativePath}`, { cause });
  }
  const relative = path.relative(root, actual);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
    || !metadata.isFile() || metadata.size <= 0 || metadata.size > maxBytes) {
    fail("UNSAFE_PATH", `工程 Binding 候选账目标不是工作区内普通小文件：${relativePath}`);
  }
  return Object.freeze({ bytes: await readFile(actual), metadata });
}

function validateDefinitions() {
  if (BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS.length !== 7) {
    fail("DEFINITION_DRIFT", "工程 Binding 候选定义必须精确包含七条。");
  }
  const candidateIds = new Set();
  const bindingIds = new Set();
  const subjectIds = new Set();
  for (const [index, entry] of BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS.entries()) {
    if (entry.order !== index + 1 || candidateIds.has(entry.candidateId)
      || bindingIds.has(entry.bindingId) || subjectIds.has(entry.evidenceSubjectId)) {
      fail("DEFINITION_DRIFT", "工程 Binding 候选顺序或身份重复。");
    }
    candidateIds.add(entry.candidateId);
    bindingIds.add(entry.bindingId);
    subjectIds.add(entry.evidenceSubjectId);
  }
}

async function validateRegistryConsumers(workspaceRoot) {
  const registry = (await readBoundFile(
    workspaceRoot,
    "packages/bazi-interpretation/src/strength-claim-registry.ts"
  )).bytes.toString("utf8");
  const subjects = (await readBoundFile(
    workspaceRoot,
    "packages/knowledge-core/src/index.ts"
  )).bytes.toString("utf8");

  for (const [index, entry] of BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS.entries()) {
    const bindingStart = registry.indexOf(`bindingId: "${entry.bindingId}"`);
    const nextDefinition = BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS[index + 1];
    const bindingEnd = nextDefinition
      ? registry.indexOf(`bindingId: "${nextDefinition.bindingId}"`, bindingStart + 1)
      : registry.indexOf('bindingId: "binding:dtt:month-command"', bindingStart + 1);
    if (bindingStart < 0 || bindingEnd <= bindingStart) {
      fail("REGISTRY_DRIFT", `来源注册表缺少工程 Binding：${entry.bindingId}`);
    }
    const bindingBlock = registry.slice(bindingStart, bindingEnd);
    for (const expected of [
      `sourceId: "${entry.sourceId}"`,
      'sourceType: "engineering_contract"',
      'evidenceRole: "defines_engineering_candidate"',
      `value: "${entry.registryLocator}"`,
      'verificationStatus: "verified"',
      `supports: "${entry.definitionSummary}"`
    ]) {
      if (!bindingBlock.includes(expected)) fail("REGISTRY_DRIFT", `${entry.bindingId} 注册表字段漂移：${expected}`);
    }
    for (const forbiddenClaim of entry.forbiddenClaims) {
      if (!bindingBlock.includes(`"${forbiddenClaim}"`)) {
        fail("REGISTRY_DRIFT", `${entry.bindingId} 禁止主张漂移：${forbiddenClaim}`);
      }
    }
    if (!subjects.includes(`"${entry.bindingId}": "${entry.evidenceSubjectId}"`)) {
      fail("SUBJECT_DRIFT", `${entry.bindingId} evidence subject 已漂移。`);
    }

    for (const claimId of entry.consumerClaimIds) {
      const claimStart = registry.indexOf(`claimId: "${claimId}"`);
      const nextClaimStart = registry.indexOf("claimId: ", claimStart + 1);
      const claimBlock = registry.slice(claimStart, nextClaimStart < 0 ? registry.length : nextClaimStart);
      if (claimStart < 0 || !claimBlock.includes(`"${entry.bindingId}"`)) {
        fail("CLAIM_CONSUMER_DRIFT", `${entry.bindingId} 未绑定既有 consumer claim：${claimId}`);
      }
    }
  }
}

async function buildArtifactLock(workspaceRoot, artifactDefinition) {
  const file = await readBoundFile(workspaceRoot, artifactDefinition.path);
  const source = file.bytes.toString("utf8");
  for (const stableSymbol of artifactDefinition.stableSymbols) {
    if (!source.includes(stableSymbol)) {
      fail("STABLE_SYMBOL_DRIFT", `${artifactDefinition.path} 缺少稳定符号：${stableSymbol}`);
    }
  }
  return Object.freeze({
    path: artifactDefinition.path,
    bytes: file.metadata.size,
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    stableSymbols: Object.freeze([...artifactDefinition.stableSymbols])
  });
}

async function buildCandidate(workspaceRoot, entry) {
  const artifactLocks = await Promise.all(
    entry.artifactDefinitions.map((artifactDefinition) => buildArtifactLock(workspaceRoot, artifactDefinition))
  );
  const unsigned = {
    candidateId: entry.candidateId,
    bindingId: entry.bindingId,
    evidenceSubjectId: entry.evidenceSubjectId,
    order: entry.order,
    sourceId: entry.sourceId,
    originType: "project_engineering_heuristic",
    evidenceRole: "defines_engineering_candidate",
    authorityBoundary: ENGINEERING_AUTHORITY_BOUNDARY,
    registryLocator: {
      kind: "stable_symbol",
      value: entry.registryLocator,
      verificationStatus: "mechanically_observed_not_freeze_established"
    },
    artifactLocks,
    consumerClaimIds: [...entry.consumerClaimIds],
    definitionSummary: entry.definitionSummary,
    rationaleDraft: entry.rationaleDraft,
    forbiddenClaims: [...entry.forbiddenClaims],
    repositoryStorageObservation: {
      repositoryArtifactsAlreadyStored: true,
      separateSourceBodyCopied: false,
      exactQuoteTextStored: false
    },
    rightsState: {
      repositoryProvenanceObserved: true,
      firstPartyAuthorshipLegallyEstablished: false,
      formalSourceRightsRecordId: null,
      legalReviewVerified: false,
      redistributionClearanceEstablished: false,
      distributionBoundary: "local_repository_only_no_distribution_clearance"
    },
    reviewState: {
      engineeringReviewIds: [],
      independentDomainReviewIds: [],
      engineeringRationaleFrozen: false,
      bindingFreezeAuthorized: false,
      bindingFreezeEffect: "none"
    },
    authorityClaims: {
      classicalAuthorityClaimed: false,
      expertAuthorityClaimed: false,
      scientificValidityClaimed: false,
      predictiveValidityClaimed: false
    }
  };
  return Object.freeze({
    ...unsigned,
    candidateDigest: computeEngineeringBindingCandidateDigest(unsigned)
  });
}

export async function buildCurrentBaziEngineeringBindingCandidateLedger(workspaceRoot, options = {}) {
  validateDefinitions();
  await validateRegistryConsumers(workspaceRoot);
  const candidates = await Promise.all(
    BAZI_ENGINEERING_BINDING_CANDIDATE_DEFINITIONS.map((entry) => buildCandidate(workspaceRoot, entry))
  );
  const uniqueArtifacts = new Set(candidates.flatMap((candidate) => candidate.artifactLocks.map((lock) => lock.path)));
  const consumerLinks = candidates.reduce((sum, candidate) => sum + candidate.consumerClaimIds.length, 0);
  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "bazi_strength_engineering_binding_candidate_ledger",
    ledgerId: "hakimi.bazi.strength.engineering-binding-candidates/1.0.0",
    status: "mechanically_bound_unreviewed_unfrozen_engineering_candidates",
    createdAt: options.createdAt ?? new Date().toISOString(),
    releaseGovernance: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundaryRequired: true,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    candidates,
    gateSummary: {
      engineeringBindingsRequired: 7,
      candidateEnvelopesMechanicallyVerified: 7,
      candidatesWithArtifactIdentityLocks: 7,
      uniqueRepositoryArtifactsLocked: uniqueArtifacts.size,
      consumerClaimBindingLinksMechanicallyVerified: consumerLinks,
      rationaleDraftsPresent: 7,
      engineeringRationalesFrozen: 0,
      engineeringReviewsVerified: 0,
      independentDomainReviewsVerified: 0,
      formalSourceRightsRecordsCreated: 0,
      redistributionClearancesEstablished: 0,
      bindingsFrozen: 0,
      classicalAuthorityClaims: 0,
      expertAuthorityClaims: 0,
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    evidenceLedger: {
      engineeringEvidence: "current_repository_artifact_hashes_stable_symbols_and_existing_claim_consumers_mechanically_bound",
      browserRuntimeEvidence: "not_assessed_in_engineering_candidate_ledger",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    doesNotEstablish: [
      "engineering_rationale_frozen",
      "binding_frozen_verification",
      "classical_or_traditional_authority",
      "content_truth",
      "expert_truth",
      "rights_or_legal_conclusion",
      "redistribution_clearance",
      "browser_or_runtime_validation",
      "release_readiness",
      "public_release_authorization"
    ]
  };
  return Object.freeze({
    ...unsigned,
    ledgerDigest: computeEngineeringBindingCandidateLedgerDigest(unsigned)
  });
}

function requireLedgerObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("LEDGER_INVALID", "工程 Binding 候选账必须是 JSON 对象。");
  }
  return value;
}

export async function readBaziEngineeringBindingCandidateLedger(
  workspaceRoot,
  relativePath = BAZI_ENGINEERING_BINDING_CANDIDATE_LEDGER_RELATIVE_PATH
) {
  const file = await readBoundFile(workspaceRoot, relativePath, MAX_LEDGER_BYTES);
  try {
    return requireLedgerObject(JSON.parse(file.bytes.toString("utf8")));
  } catch (cause) {
    if (cause instanceof BaziEngineeringBindingCandidateError) throw cause;
    throw new BaziEngineeringBindingCandidateError("LEDGER_INVALID", "工程 Binding 候选账不是有效 JSON。", { cause });
  }
}

export async function verifyBaziEngineeringBindingCandidateLedger(workspaceRoot, ledgerInput) {
  const ledger = requireLedgerObject(ledgerInput);
  if (typeof ledger.createdAt !== "string" || !Number.isFinite(Date.parse(ledger.createdAt))
    || !SHA256_PATTERN.test(ledger.ledgerDigest ?? "")) {
    fail("LEDGER_INVALID", "工程 Binding 候选账时间或摘要无效。");
  }
  const expected = await buildCurrentBaziEngineeringBindingCandidateLedger(workspaceRoot, {
    createdAt: ledger.createdAt
  });
  if (canonicalStringifyEngineeringBindingCandidate(ledger)
    !== canonicalStringifyEngineeringBindingCandidate(expected)) {
    fail("LEDGER_MISMATCH", "工程 Binding 候选账与当前七条注册表、代码身份、claim 消费者或失败关闭状态不一致。");
  }
  return Object.freeze({
    ledger,
    ledgerDigest: ledger.ledgerDigest,
    candidatesVerified: ledger.gateSummary.candidateEnvelopesMechanicallyVerified,
    bindingsFrozen: ledger.gateSummary.bindingsFrozen
  });
}
