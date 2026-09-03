import { createHash } from "node:crypto";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

export const BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH =
  "content/domain-release/bazi.single-chart-report.v1.7.0.json";
export const BAZI_V17_FROZEN_GOLDEN_SHA256 =
  "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29";

const MAX_MANIFEST_BYTES = 1_000_000;
const MAX_COMPONENT_FILE_BYTES = 5_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;

export const BAZI_DOMAIN_COMPONENT_SPECS = Object.freeze([
  Object.freeze({
    componentId: "execution_rules",
    version: "ziping-working-default@0.1.0",
    status: "bound",
    files: Object.freeze([
      "packages/contracts/src/index.ts",
      "packages/rule-profiles/src/index.ts"
    ])
  }),
  Object.freeze({
    componentId: "interpretation_rules",
    version: "hakimi-bazi-strength-ten-god-candidate@0.1.0",
    status: "bound",
    files: Object.freeze([
      "packages/bazi-interpretation/src/index.ts",
      "packages/bazi-interpretation/src/strength-assessment-core.ts",
      "packages/bazi-interpretation/src/strength-claim-registry.ts",
      "packages/bazi-interpretation/src/strength-evidence-narrative.ts",
      "packages/bazi-interpretation/src/strength-policy.ts"
    ])
  }),
  Object.freeze({
    componentId: "input_policy",
    version: "hakimi.bazi.input_policy/0.1.0",
    status: "bound",
    files: Object.freeze([
      "packages/contracts/src/index.ts",
      "packages/rule-profiles/src/index.ts"
    ])
  }),
  Object.freeze({
    componentId: "fact_contract",
    version: "hakimi.bazi.current_chart_review_facts/0.1.0",
    status: "bound",
    files: Object.freeze([
      "packages/bazi-core/src/index.ts",
      "packages/bazi-interpretation/src/current-chart-review-snapshot.ts",
      "packages/contracts/src/index.ts"
    ])
  }),
  Object.freeze({
    componentId: "source_bundle",
    version: "hakimi.bazi.strength_claim_registry/0.2.0+content.0.19.0-historical-candidates.4+engineering-candidates.7+freeze-readiness.6",
    status: "incomplete",
    files: Object.freeze([
      "content/bazi-strength-engineering-binding-candidates.v1.json",
      "content/bazi-strength-source-binding-candidates.v1.json",
      "content/system-admission/bazi-binding-freeze-requirements.v1.json",
      "packages/bazi-interpretation/src/strength-claim-registry.ts",
      "packages/knowledge-core/src/index.ts",
      "scripts/audit-bazi-source-binding-candidates-live.ps1",
      "scripts/bazi-binding-freeze-requirements-lib.mjs",
      "scripts/bazi-engineering-binding-candidate-lib.mjs",
      "scripts/bazi-source-binding-candidate-lib.mjs",
      "scripts/verify-bazi-binding-freeze-requirements.mjs",
      "scripts/verify-bazi-engineering-binding-candidates.mjs",
      "scripts/verify-bazi-source-binding-candidates.mjs"
    ])
  }),
  Object.freeze({
    componentId: "rights_bundle",
    version: "source-rights@1.0.0+source-carrier@1.0.0+manifest@2.0.0+rights-candidates.2+source-collation.4+freeze-readiness.6",
    status: "incomplete",
    files: Object.freeze([
      "apps/web/bundled-knowledge-audit.ts",
      "content/bazi-strength-source-binding-candidates.v1.json",
      "content/bazi-strength-source-rights-candidates.v1.json",
      "content/knowledge/manifest.v2.json",
      "content/system-admission/bazi-binding-freeze-requirements.v1.json",
      "package.json",
      "packages/contracts/src/index.ts",
      "packages/knowledge-core/src/index.ts",
      "scripts/audit-bazi-source-rights-candidates-live.ps1",
      "scripts/bazi-binding-freeze-requirements-lib.mjs",
      "scripts/bazi-source-binding-candidate-lib.mjs",
      "scripts/bazi-source-rights-candidate-lib.mjs",
      "scripts/verify-bazi-binding-freeze-requirements.mjs",
      "scripts/verify-bazi-source-rights-candidates.mjs"
    ])
  }),
  Object.freeze({
    componentId: "expert_review_bundle",
    version: "absent/0",
    status: "absent",
    files: Object.freeze([])
  }),
  Object.freeze({
    componentId: "high_risk_policy",
    version: "hakimi.bazi.high_risk_policy/0.2.0+expert-review-packet.6+engineering-candidates.1",
    status: "bound",
    files: Object.freeze([
      "content/bazi-strength-engineering-binding-candidates.v1.json",
      "content/bazi-strength-expert-review-packet.v1.json",
      "packages/bazi-interpretation/src/strength-claim-registry.ts",
      "packages/bazi-interpretation/src/strength-policy.ts",
      "scripts/bazi-engineering-binding-candidate-lib.mjs",
      "scripts/bazi-expert-review-packet-lib.mjs",
      "scripts/verify-bazi-engineering-binding-candidates.mjs",
      "scripts/verify-bazi-expert-review-packet.mjs"
    ])
  }),
  Object.freeze({
    componentId: "report_contract",
    version: "single-chart-report@1.7.0",
    status: "bound",
    files: Object.freeze([
      "packages/research-export/src/golden/single-chart-report.contract.v1.7.json",
      "packages/research-export/src/single-chart-report.ts",
      "scripts/bazi-domain-release-manifest-lib.mjs",
      "scripts/verify-bazi-domain-release-manifest.mjs"
    ])
  })
]);

export class BaziDomainReleaseManifestError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "BaziDomainReleaseManifestError";
    this.code = code;
  }
}

function canonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]));
  }
  throw new BaziDomainReleaseManifestError("NON_CANONICAL_JSON", "体系 manifest 只接受有限规范 JSON 值。");
}

export function canonicalStringifyDomainManifest(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sha256DomainManifestValue(value) {
  const input = typeof value === "string" ? value : canonicalStringifyDomainManifest(value);
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeDomainReleaseComponentDigest(component) {
  return sha256DomainManifestValue({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  });
}

export function computeDomainReleaseManifestDigest(manifest) {
  const { manifestDigest: _manifestDigest, ...unsigned } = manifest;
  return sha256DomainManifestValue(unsigned);
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/u.test(relativePath)
    || relativePath.includes("..")
    || relativePath.startsWith("/")
    || relativePath.includes("\\")) {
    throw new BaziDomainReleaseManifestError("UNSAFE_COMPONENT_PATH", `体系组件路径不安全：${relativePath}`);
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  if (!absolute.startsWith(`${root}${path.sep}`)) {
    throw new BaziDomainReleaseManifestError("UNSAFE_COMPONENT_PATH", `体系组件路径越界：${relativePath}`);
  }
  return absolute;
}

async function fileEvidence(workspaceRoot, relativePath) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  let actual;
  let metadata;
  try {
    [actual, metadata] = await Promise.all([realpath(absolute), stat(absolute)]);
  } catch (cause) {
    throw new BaziDomainReleaseManifestError("COMPONENT_FILE_MISSING", `体系组件文件不存在：${relativePath}`, { cause });
  }
  const root = await realpath(path.resolve(workspaceRoot));
  if (!actual.startsWith(`${root}${path.sep}`) || !metadata.isFile()) {
    throw new BaziDomainReleaseManifestError("UNSAFE_COMPONENT_PATH", `体系组件不是工作区内普通文件：${relativePath}`);
  }
  if (metadata.size > MAX_COMPONENT_FILE_BYTES) {
    throw new BaziDomainReleaseManifestError("COMPONENT_FILE_TOO_LARGE", `体系组件文件超过上限：${relativePath}`);
  }
  const bytes = await readFile(actual);
  return { path: relativePath, sha256: createHash("sha256").update(bytes).digest("hex") };
}

export async function buildCurrentBaziDomainReleaseManifest(workspaceRoot, options = {}) {
  const createdAt = options.createdAt ?? "2026-08-25T14:30:00.000Z";
  if (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))) {
    throw new BaziDomainReleaseManifestError("CREATED_AT_INVALID", "体系 manifest createdAt 必须是有效时间戳。");
  }
  const components = [];
  for (const spec of BAZI_DOMAIN_COMPONENT_SPECS) {
    const files = [];
    for (const relativePath of spec.files) files.push(await fileEvidence(workspaceRoot, relativePath));
    const component = {
      componentId: spec.componentId,
      version: spec.version,
      status: spec.status,
      files
    };
    components.push({ ...component, digest: computeDomainReleaseComponentDigest(component) });
  }
  const reportGolden = components
    .find((component) => component.componentId === "report_contract")
    ?.files.find((file) => file.path.endsWith("single-chart-report.contract.v1.7.json"));
  if (reportGolden?.sha256 !== BAZI_V17_FROZEN_GOLDEN_SHA256) {
    throw new BaziDomainReleaseManifestError("V17_GOLDEN_DRIFT", "单盘报告 v1.7 frozen golden 已漂移；不得沿用 v1.7 机器身份。");
  }

  const unsigned = {
    schemaVersion: "1.0.0",
    recordType: "system_domain_release_manifest",
    systemId: "bazi",
    surface: {
      surfaceId: "single-chart-report",
      surfaceVersion: "1.7.0",
      versionMeaning: "product_surface_contract_not_database_schema_or_domain_authority"
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      mutationEpochBoundary: "preserved",
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    },
    components,
    gateState: {
      bindingRequired: 12,
      engineeringBindingCandidatesMechanicallyVerified: 7,
      engineeringRationalesFrozen: 0,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: true,
      releaseEvidenceComplete: false
    },
    evidenceLedger: {
      engineeringIdentity: "component_digests_verified",
      browserRuntimeEvidence: "not_assessed_in_domain_manifest",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    releaseStatus: "engineering_candidate",
    createdAt
  };
  return { ...unsigned, manifestDigest: computeDomainReleaseManifestDigest(unsigned) };
}

function requireManifestObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BaziDomainReleaseManifestError("MANIFEST_INVALID", "八字体系 manifest 必须是 JSON 对象。");
  }
  return value;
}

export async function readBaziDomainReleaseManifest(workspaceRoot, relativePath = BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH) {
  const absolute = safeWorkspaceFile(workspaceRoot, relativePath);
  const metadata = await stat(absolute);
  if (!metadata.isFile() || metadata.size > MAX_MANIFEST_BYTES) {
    throw new BaziDomainReleaseManifestError("MANIFEST_INVALID", "八字体系 manifest 缺失或超过输入上限。");
  }
  try {
    return requireManifestObject(JSON.parse(await readFile(absolute, "utf8")));
  } catch (cause) {
    if (cause instanceof BaziDomainReleaseManifestError) throw cause;
    throw new BaziDomainReleaseManifestError("MANIFEST_INVALID", "八字体系 manifest 不是有效 JSON。", { cause });
  }
}

export async function verifyBaziDomainReleaseManifest(workspaceRoot, manifestInput) {
  const manifest = requireManifestObject(manifestInput);
  if (typeof manifest.createdAt !== "string" || !LOWERCASE_SHA256.test(manifest.manifestDigest ?? "")) {
    throw new BaziDomainReleaseManifestError("MANIFEST_INVALID", "八字体系 manifest 时间或摘要字段无效。");
  }
  const expected = await buildCurrentBaziDomainReleaseManifest(workspaceRoot, { createdAt: manifest.createdAt });
  if (canonicalStringifyDomainManifest(manifest) !== canonicalStringifyDomainManifest(expected)) {
    throw new BaziDomainReleaseManifestError(
      "MANIFEST_MISMATCH",
      "八字体系 manifest 与当前组件、失败关闭门或证据分账不一致。"
    );
  }
  return Object.freeze({
    manifest,
    manifestDigest: manifest.manifestDigest,
    componentDigests: Object.freeze(Object.fromEntries(
      manifest.components.map((component) => [component.componentId, component.digest])
    ))
  });
}
