import { createHash } from "node:crypto";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  computeIndependentDomainManifestDigest
} from "./independent-domain-release-manifest-lib.mjs";
import {
  computeIndependentSourceRequirementsDigest
} from "./independent-source-binding-requirements-lib.mjs";
import {
  computeWesternSourceBindingRequirementsSuccessorDigest
} from "./western-source-binding-requirements-successor-lib.mjs";
import {
  computeWesternSourceBindingRequirementsSuccessorV12Digest
} from "./western-source-binding-requirements-successor-v1.2-lib.mjs";
import {
  isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate,
  loadWesternSourceAndManifestIdentityDriftReceiptCandidate
} from "./western-source-and-manifest-identity-drift-receipt-candidate-lib.mjs";

export const WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH =
  "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v2.json";

const MANIFEST_ID =
  "hakimi.western-astrology.three-package-authored-machine-identity-manifest/2.0.0";
const CREATED_AT = "2026-09-01T10:45:00.000Z";
const MANIFEST_DIGEST_DOMAIN =
  "hakimi.western-astrology.three-package-authored-machine-identity-manifest.v2";
const COMPONENT_DIGEST_DOMAIN =
  "hakimi.western-astrology.three-package-authored-component-closure.v2";
const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/u;

const CONTRACTS_ROOT = "packages/western-astrology-contracts-draft";
const RULES_ROOT = "packages/western-astrology-rules-preview-draft";
const ADAPTER_ROOT = "packages/western-astronomy-engine-adapter-draft";

const PACKAGE_ROOTS = Object.freeze([
  CONTRACTS_ROOT,
  RULES_ROOT,
  ADAPTER_ROOT
]);

const EXCLUDED_RUNTIME_SUBTREES = Object.freeze([
  `${CONTRACTS_ROOT}/.tmp`,
  `${CONTRACTS_ROOT}/dist`,
  `${CONTRACTS_ROOT}/node_modules`,
  `${CONTRACTS_ROOT}/temp`,
  `${CONTRACTS_ROOT}/tmp`,
  `${RULES_ROOT}/.tmp`,
  `${RULES_ROOT}/dist`,
  `${RULES_ROOT}/node_modules`,
  `${RULES_ROOT}/temp`,
  `${RULES_ROOT}/tmp`,
  `${ADAPTER_ROOT}/.tmp`,
  `${ADAPTER_ROOT}/dist`,
  `${ADAPTER_ROOT}/node_modules`,
  `${ADAPTER_ROOT}/temp`,
  `${ADAPTER_ROOT}/tmp`
]);

const COMPONENT_IDS = Object.freeze([
  "execution_rules",
  "interpretation_rules",
  "input_policy",
  "fact_contract",
  "source_bundle",
  "rights_bundle",
  "expert_review_bundle",
  "high_risk_policy",
  "report_contract"
]);

const EXPECTED_AUTHORED_PATHS = Object.freeze([
  "packages/western-astrology-contracts-draft/README.md",
  "packages/western-astrology-contracts-draft/package.json",
  "packages/western-astrology-contracts-draft/src/civil-input.ts",
  "packages/western-astrology-contracts-draft/src/index.test.ts",
  "packages/western-astrology-contracts-draft/src/index.ts",
  "packages/western-astrology-contracts-draft/tsconfig.json",
  "packages/western-astrology-rules-preview-draft/README.md",
  "packages/western-astrology-rules-preview-draft/browser-app/index.html",
  "packages/western-astrology-rules-preview-draft/e2e/rules-preview-browser-gate.spec.ts",
  "packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
  "packages/western-astrology-rules-preview-draft/package.json",
  "packages/western-astrology-rules-preview-draft/playwright.rules-preview.config.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/chart-wheel.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/content-layer.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/content-review-feedback.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/dynamic-content-review-feedback.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/high-risk-expression-egress-policy.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/main.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-app/styles.css",
  "packages/western-astrology-rules-preview-draft/src/browser-client.test.ts",
  "packages/western-astrology-rules-preview-draft/src/browser-client.ts",
  "packages/western-astrology-rules-preview-draft/src/chart-wheel.test.ts",
  "packages/western-astrology-rules-preview-draft/src/content-layer.test.ts",
  "packages/western-astrology-rules-preview-draft/src/content-review-feedback.test.ts",
  "packages/western-astrology-rules-preview-draft/src/dynamic-content-review-feedback.test.ts",
  "packages/western-astrology-rules-preview-draft/src/high-risk-expression-egress-policy.test.ts",
  "packages/western-astrology-rules-preview-draft/src/rule-layer-bridge.ts",
  "packages/western-astrology-rules-preview-draft/tsconfig.browser-app.json",
  "packages/western-astrology-rules-preview-draft/tsconfig.json",
  "packages/western-astrology-rules-preview-draft/vite.rules-preview.config.mjs",
  "packages/western-astronomy-engine-adapter-draft/README.md",
  "packages/western-astronomy-engine-adapter-draft/browser-parity/emit-node-reference.mjs",
  "packages/western-astronomy-engine-adapter-draft/browser-parity/index.html",
  "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
  "packages/western-astronomy-engine-adapter-draft/package.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json",
  "packages/western-astronomy-engine-adapter-draft/src/astronomy-worker-entry.mjs",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/browser-worker.ts",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/generated-node-reference.ts",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/main.ts",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/protocol.ts",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/quantized-projection.ts",
  "packages/western-astronomy-engine-adapter-draft/src/browser-parity/styles.css",
  "packages/western-astronomy-engine-adapter-draft/src/contract-bridge.ts",
  "packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.test.ts",
  "packages/western-astronomy-engine-adapter-draft/src/cross-system-engineering-fact-projection.ts",
  "packages/western-astronomy-engine-adapter-draft/src/delta-t-model-lock.json",
  "packages/western-astronomy-engine-adapter-draft/src/demo.ts",
  "packages/western-astronomy-engine-adapter-draft/src/diagnostic-seed-lock.json",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential.test.ts",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential/demo.ts",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential/differential-report.ts",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential/index.ts",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential/official-response.ts",
  "packages/western-astronomy-engine-adapter-draft/src/horizons-differential/query-manifest.ts",
  "packages/western-astronomy-engine-adapter-draft/src/index.test.ts",
  "packages/western-astronomy-engine-adapter-draft/src/index.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer.test.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/aspects.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/canonical.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/demo.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/houses.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/index.ts",
  "packages/western-astronomy-engine-adapter-draft/src/rule-layer/zodiac.ts",
  "packages/western-astronomy-engine-adapter-draft/src/strict-receipt-draft.test.ts",
  "packages/western-astronomy-engine-adapter-draft/src/strict-receipt-draft.ts",
  "packages/western-astronomy-engine-adapter-draft/tsconfig.browser-parity.json",
  "packages/western-astronomy-engine-adapter-draft/tsconfig.json",
  "packages/western-astronomy-engine-adapter-draft/vite.browser-parity.config.mjs"
]);

const DRIFT_RECEIPT = Object.freeze({
  path: "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v1.0.0.json",
  rawBytes: 12_537,
  rawSha256: "09feb585528a6d390afda19a10d967ff2356714cbb00d4eef3462fe267d01c26",
  semanticDigest: "f422b6b1bd61e97631b5ce5719877d0e17525b18cdfd7cc7d1c3257e85884097",
  semanticDigestField: "receiptDigest"
});

const HISTORICAL_CONTEXTS = Object.freeze([
  Object.freeze({
    role: "historical_formal_source_requirements_v1_raw_and_self_only",
    kind: "source_v1",
    path: "content/system-admission/western-source-binding-requirements.v1.json",
    rawBytes: 25_909,
    rawSha256: "3f22c78279022a70d3a3a21e5a80a33b321a99793c033eb0a72c5171628107c9",
    semanticId: "hakimi.western-astrology.source-binding-requirements/1.0.0",
    semanticIdField: "ledgerId",
    semanticDigest: "2bb52306841098ee5e83906bffda400ad07efd706c7c294ee4d07115854849bd",
    semanticDigestField: "ledgerDigest",
    currentFullLoader: false,
    currentFullLoaderFailureClass: "LEDGER_MISMATCH"
  }),
  Object.freeze({
    role: "historical_nonformal_source_successor_v1_1_raw_and_self_only",
    kind: "source_v1_1",
    path: "content/system-admission/western-source-binding-requirements.v1.1.0.json",
    rawBytes: 34_338,
    rawSha256: "7f50fd5a7fd09647d1a91fc1c663e30acc56828962b98624aeeb73e985dba0fc",
    semanticId: "hakimi.western-astrology.source-binding-requirements/1.1.0",
    semanticIdField: "ledgerId",
    semanticDigest: "254fbc561d3a82a4b9dfaf969b472de7dfcbb9543299b4f69cc9a9944e6994db",
    semanticDigestField: "ledgerDigest",
    currentFullLoader: false,
    currentFullLoaderFailureClass: "LEDGER_MISMATCH"
  }),
  Object.freeze({
    role: "historical_nonformal_source_successor_v1_2_raw_and_self_only",
    kind: "source_v1_2",
    path: "content/system-admission/western-source-binding-requirements.v1.2.0.json",
    rawBytes: 40_667,
    rawSha256: "e9894ce51541d284a58aa59b1d175a121746dbd1d6521b16a700cf64c05c63c1",
    semanticId: "hakimi.western-astrology.source-binding-requirements/1.2.0",
    semanticIdField: "ledgerId",
    semanticDigest: "91708bf49785148eede41872717104949fa9725732e661c25a115788a983dd58",
    semanticDigestField: "ledgerDigest",
    currentFullLoader: false,
    currentFullLoaderFailureClass: "LEDGER_MISMATCH"
  }),
  Object.freeze({
    role: "historical_formal_engineering_manifest_v0_1_raw_and_self_only",
    kind: "manifest_v1",
    path: "content/domain-release/western-astrology.engineering-draft.v0.1.0.json",
    rawBytes: 10_832,
    rawSha256: "c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398",
    semanticId: "western-isolated-rules-preview-draft",
    semanticIdField: "surface.surfaceId",
    semanticDigest: "5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e",
    semanticDigestField: "manifestDigest",
    currentFullLoader: false,
    currentFullLoaderFailureClass: "MANIFEST_MISMATCH"
  })
]);

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 72_472,
  rawSha256: "a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27",
  manifestDigest: "4ed66eeae3d0f7a45dcb850a67dfb6407b695a2f6ecb58eac8b0dd1748db632d"
});

const VERIFIED_RESULTS = new WeakSet();

export class WesternIndependentEngineeringManifestV2Error extends Error {
  constructor(code, message, cause = undefined) {
    super(`${code}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "WesternIndependentEngineeringManifestV2Error";
    this.code = code;
  }
}

function fail(code, message, cause = undefined) {
  throw new WesternIndependentEngineeringManifestV2Error(code, message, cause);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

function normalizedJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) fail("NON_JSON_VALUE", "manifest 不能包含循环引用。");
  seen.add(value);
  if (Array.isArray(value)) {
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("SPARSE_ARRAY", "manifest 数组必须 dense。");
      output.push(normalizedJson(value[index], seen));
    }
    seen.delete(value);
    return output;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype
    && Object.getPrototypeOf(value) !== null) {
    fail("NON_PLAIN_OBJECT", "manifest 只接受 plain JSON object。");
  }
  const output = Object.create(null);
  const keys = Object.keys(value).sort(compareCodeUnits);
  for (const key of keys) output[key] = normalizedJson(value[key], seen);
  seen.delete(value);
  return output;
}

function canonicalStringify(value) {
  return JSON.stringify(normalizedJson(value));
}

export function canonicalPrettyStringifyWesternIndependentEngineeringManifestV2(value) {
  return `${JSON.stringify(normalizedJson(value), null, 2)}\n`;
}

function domainDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update("\0", "utf8")
    .update(canonicalStringify(value), "utf8")
    .digest("hex");
}

export function computeWesternIndependentEngineeringManifestV2Digest(value) {
  const unsigned = cloneJson(value);
  delete unsigned.manifestDigest;
  return domainDigest(MANIFEST_DIGEST_DOMAIN, unsigned);
}

function componentClosureDigest(componentId, files) {
  return domainDigest(COMPONENT_DIGEST_DOMAIN, { componentId, files });
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function expectedDirectorySet() {
  const directories = new Set(PACKAGE_ROOTS);
  for (const filePath of EXPECTED_AUTHORED_PATHS) {
    let current = path.posix.dirname(filePath);
    while (current !== "." && !directories.has(current)) {
      directories.add(current);
      current = path.posix.dirname(current);
    }
  }
  return directories;
}

const EXPECTED_DIRECTORIES = expectedDirectorySet();
const EXCLUDED_RUNTIME_SUBTREE_SET = new Set(EXCLUDED_RUNTIME_SUBTREES);

function isExcludedRuntimeSubtree(relativePath) {
  return EXCLUDED_RUNTIME_SUBTREE_SET.has(relativePath);
}

function assertExpectedPathConstants() {
  if (PACKAGE_ROOTS.length !== 3 || EXPECTED_AUTHORED_PATHS.length !== 70
    || COMPONENT_IDS.length !== 9 || EXCLUDED_RUNTIME_SUBTREES.length !== 15) {
    fail("EXPECTED_CLOSURE_INVALID", "Western package closure 常量计数漂移。");
  }
  assertDenseSortedUniqueStrings(PACKAGE_ROOTS, "package roots");
  assertDenseSortedUniqueStrings(EXCLUDED_RUNTIME_SUBTREES, "excluded runtime subtrees");
  for (const subtree of EXCLUDED_RUNTIME_SUBTREES) {
    const root = PACKAGE_ROOTS.find((candidate) => subtree.startsWith(`${candidate}/`));
    const suffix = root === undefined ? "" : subtree.slice(root.length + 1);
    if (root === undefined || suffix.includes("/")
      || ![".tmp", "dist", "node_modules", "temp", "tmp"].includes(suffix)) {
      fail("EXPECTED_CLOSURE_INVALID", "runtime 排除项必须是 package-root 直属精确路径。");
    }
  }
  const paths = new Set();
  let previous = "";
  for (const filePath of EXPECTED_AUTHORED_PATHS) {
    if (typeof filePath !== "string" || filePath === "" || filePath.includes("\\")
      || filePath <= previous || paths.has(filePath)) {
      fail("EXPECTED_CLOSURE_INVALID", "Western expected authored path 必须严格排序且唯一。");
    }
    previous = filePath;
    paths.add(filePath);
    if (EXCLUDED_RUNTIME_SUBTREES.some((subtree) => filePath.startsWith(`${subtree}/`))) {
      fail("EXPECTED_CLOSURE_INVALID", "expected authored path 不得位于排除目录。");
    }
  }
}

function appendComponentId(output, componentId) {
  if (!COMPONENT_IDS.includes(componentId)) {
    fail("COMPONENT_ID_INVALID", `未知组件 ${componentId}。`);
  }
  if (!output.includes(componentId)) output.push(componentId);
}

function classifyAuthoredPath(filePath) {
  const componentIds = [];
  const adapter = filePath.startsWith(`${ADAPTER_ROOT}/`);
  const contracts = filePath.startsWith(`${CONTRACTS_ROOT}/`);
  const rules = filePath.startsWith(`${RULES_ROOT}/`);
  const lower = filePath.toLowerCase();

  if (adapter) {
    appendComponentId(componentIds, "execution_rules");
    if (lower.includes("rule-layer")) appendComponentId(componentIds, "interpretation_rules");
    if (lower.includes("contract") || lower.includes("projection")
      || lower.includes("browser-parity") || lower.endsWith("/src/index.ts")
      || lower.endsWith("/src/index.test.ts")) appendComponentId(componentIds, "fact_contract");
    if (lower.includes("horizons") || lower.includes("source-lock")
      || lower.includes("delta-t") || lower.endsWith("/readme.md")) {
      appendComponentId(componentIds, "source_bundle");
    }
    if (lower.includes("license") || lower.endsWith("/package.json")
      || lower.includes("source-lock") || lower.endsWith("/readme.md")) {
      appendComponentId(componentIds, "rights_bundle");
    }
    if (lower.includes("strict-receipt")) appendComponentId(componentIds, "high_risk_policy");
    if (lower.includes("browser-parity") || lower.includes("vite.browser-parity")
      || lower.endsWith(".css")) appendComponentId(componentIds, "report_contract");
  } else if (contracts) {
    appendComponentId(componentIds, "input_policy");
    appendComponentId(componentIds, "fact_contract");
    if (lower.endsWith("/readme.md")) {
      appendComponentId(componentIds, "source_bundle");
      appendComponentId(componentIds, "rights_bundle");
    }
    if (lower.endsWith("/package.json")) appendComponentId(componentIds, "rights_bundle");
    if (lower.endsWith("/src/index.ts")) {
      appendComponentId(componentIds, "execution_rules");
      appendComponentId(componentIds, "interpretation_rules");
      appendComponentId(componentIds, "high_risk_policy");
      appendComponentId(componentIds, "report_contract");
    }
  } else if (rules) {
    appendComponentId(componentIds, "report_contract");
    if (lower.includes("rule-layer") || lower.includes("content-layer")
      || lower.includes("chart-wheel")) appendComponentId(componentIds, "interpretation_rules");
    if (lower.includes("browser-client") || lower.endsWith("/src/browser-app/main.ts")) {
      appendComponentId(componentIds, "execution_rules");
      appendComponentId(componentIds, "fact_contract");
    }
    if (lower.includes("review-feedback")) appendComponentId(componentIds, "expert_review_bundle");
    if (lower.includes("high-risk") || lower.endsWith("/src/browser-app/main.ts")) {
      appendComponentId(componentIds, "high_risk_policy");
    }
    if (lower.endsWith("/readme.md")) {
      appendComponentId(componentIds, "source_bundle");
      appendComponentId(componentIds, "rights_bundle");
    }
    if (lower.includes("license") || lower.endsWith("/package.json")) {
      appendComponentId(componentIds, "rights_bundle");
    }
  }
  componentIds.sort((left, right) => COMPONENT_IDS.indexOf(left) - COMPONENT_IDS.indexOf(right));
  if (componentIds.length === 0) fail("UNCLASSIFIED_AUTHORED_FILE", filePath);
  return componentIds;
}

async function enumerateAuthoredPaths(workspaceRoot) {
  assertExpectedPathConstants();
  const discovered = [];

  async function walk(relativeDirectory) {
    let entries;
    try {
      entries = await readdir(path.resolve(workspaceRoot, relativeDirectory), {
        withFileTypes: true
      });
    } catch (cause) {
      fail("PACKAGE_ROOT_READ_FAILED", relativeDirectory, cause);
    }
    entries.sort((left, right) => compareCodeUnits(left.name, right.name));
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`.replaceAll("\\", "/");
      let stats;
      try {
        stats = await lstat(path.resolve(workspaceRoot, relativePath), { bigint: true });
      } catch (cause) {
        fail("AUTHORED_ENDPOINT_CHANGED", relativePath, cause);
      }
      if (stats.isSymbolicLink() || entry.isSymbolicLink()) {
        fail("AUTHORED_REPARSE_OR_SYMLINK_FORBIDDEN", relativePath);
      }
      if (entry.isDirectory() && stats.isDirectory()) {
        if (isExcludedRuntimeSubtree(relativePath)) continue;
        if (!EXPECTED_DIRECTORIES.has(relativePath)) {
          fail("AUTHORED_CLOSURE_EXTRA_DIRECTORY", relativePath);
        }
        await walk(relativePath);
      } else if (entry.isFile() && stats.isFile()) {
        discovered.push(relativePath);
      } else {
        fail("AUTHORED_ENDPOINT_TYPE_FORBIDDEN", relativePath);
      }
    }
  }

  for (const root of PACKAGE_ROOTS) {
    let rootStats;
    try {
      rootStats = await lstat(path.resolve(workspaceRoot, root), { bigint: true });
    } catch (cause) {
      fail("PACKAGE_ROOT_MISSING", root, cause);
    }
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      fail("PACKAGE_ROOT_ENDPOINT_INVALID", root);
    }
    await walk(root);
  }
  discovered.sort(compareCodeUnits);
  const unique = new Set();
  const caseFolded = new Set();
  for (const filePath of discovered) {
    if (unique.has(filePath)) fail("AUTHORED_CLOSURE_DUPLICATE", filePath);
    const folded = filePath.toLocaleLowerCase("en-US");
    if (caseFolded.has(folded)) fail("AUTHORED_CASE_FOLD_ALIAS", filePath);
    unique.add(filePath);
    caseFolded.add(folded);
  }
  if (!exactJson(discovered, EXPECTED_AUTHORED_PATHS)) {
    fail("AUTHORED_CLOSURE_PATH_SET_MISMATCH", "Western authored package file set 漂移。");
  }
  return discovered;
}

async function collectAuthoredPackageClosure(workspaceRoot) {
  const paths = await enumerateAuthoredPaths(workspaceRoot);
  const files = [];
  for (const filePath of paths) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, filePath);
    files.push({
      path: filePath,
      bytes: snapshot.rawBytes,
      sha256: snapshot.rawSha256,
      componentIds: classifyAuthoredPath(filePath)
    });
  }
  const afterPaths = await enumerateAuthoredPaths(workspaceRoot);
  if (!exactJson(paths, afterPaths)) {
    fail("AUTHORED_CLOSURE_INTERVAL_DRIFT", "Western package directory inventory 在读取窗口内改变。");
  }
  return files;
}

function computeHistoricalSelfDigest(kind, value) {
  if (kind === "source_v1") return computeIndependentSourceRequirementsDigest(value);
  if (kind === "source_v1_1") {
    return computeWesternSourceBindingRequirementsSuccessorDigest(value);
  }
  if (kind === "source_v1_2") {
    return computeWesternSourceBindingRequirementsSuccessorV12Digest(value);
  }
  if (kind === "manifest_v1") return computeIndependentDomainManifestDigest(value);
  fail("HISTORICAL_CONTEXT_KIND_INVALID", kind);
}

function nestedField(value, fieldPath) {
  let current = value;
  for (const segment of fieldPath.split(".")) current = current?.[segment];
  return current;
}

async function verifyHistoricalContexts(workspaceRoot) {
  const contexts = [];
  for (const expected of HISTORICAL_CONTEXTS) {
    const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, expected.path);
    if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
      fail("HISTORICAL_CONTEXT_RAW_DRIFT", expected.path);
    }
    const parsed = parseBaziDttStrictJsonArtifact(snapshot);
    if (nestedField(parsed, expected.semanticIdField) !== expected.semanticId
      || parsed[expected.semanticDigestField] !== expected.semanticDigest
      || computeHistoricalSelfDigest(expected.kind, parsed) !== expected.semanticDigest) {
      fail("HISTORICAL_CONTEXT_SELF_DIGEST_DRIFT", expected.path);
    }
    contexts.push({
      role: expected.role,
      path: expected.path,
      rawBytes: expected.rawBytes,
      rawSha256: expected.rawSha256,
      semanticId: expected.semanticId,
      semanticIdField: expected.semanticIdField,
      semanticDigest: expected.semanticDigest,
      semanticDigestField: expected.semanticDigestField,
      rawAndSelfDigestVerified: true,
      privateBrandConsumed: false,
      currentFullLoader: false,
      currentFullLoaderFailureClass: expected.currentFullLoaderFailureClass,
      rebindOrResignPerformed: false
    });
  }
  return contexts;
}

function requireDriftReceiptBrand(receipt) {
  if (!isVerifiedWesternSourceAndManifestIdentityDriftReceiptCandidate(receipt)) {
    fail("DRIFT_RECEIPT_PRIVATE_BRAND_REQUIRED", "只接受 fixed-path full loader 私有品牌。");
  }
  if (receipt.candidateId
      !== "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/1.0.0"
    || receipt.receiptDigest !== DRIFT_RECEIPT.semanticDigest
    || receipt.activeAdmissionEffect !== "none"
    || receipt.formalSourceDrift?.currentV12LoaderMechanicallyCurrent !== false
    || receipt.formalSourceDrift?.currentV12LoaderFailureClass !== "LEDGER_MISMATCH"
    || receipt.formalManifestDrift?.historicalManifestMechanicallyCurrent !== false
    || receipt.formalManifestDrift?.currentLoaderFailureClass !== "MANIFEST_MISMATCH"
    || receipt.oldDefinitionCoverageBoundary?.currentEngineeringManifestComplete !== false
    || receipt.gateSummary?.bindingFrozenVerified !== 0
    || receipt.gateSummary?.bindingRequired !== 28
    || receipt.gateSummary?.independentExpertReviewsVerified !== 0
    || receipt.gateSummary?.independentExpertsRequired !== 2) {
    fail("DRIFT_RECEIPT_BOUNDARY_MISMATCH", "Western drift receipt 身份或红线漂移。");
  }
  return receipt;
}

async function collectCurrentInputs(workspaceRoot) {
  const receipt = requireDriftReceiptBrand(
    await loadWesternSourceAndManifestIdentityDriftReceiptCandidate(workspaceRoot)
  );
  const receiptSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    DRIFT_RECEIPT.path
  );
  if (receiptSnapshot.rawBytes !== DRIFT_RECEIPT.rawBytes
    || receiptSnapshot.rawSha256 !== DRIFT_RECEIPT.rawSha256) {
    fail("DRIFT_RECEIPT_RAW_DRIFT", "branded receipt 与固定 raw identity 不一致。");
  }
  const historicalContexts = await verifyHistoricalContexts(workspaceRoot);
  const authoredFiles = await collectAuthoredPackageClosure(workspaceRoot);
  return { receipt, historicalContexts, authoredFiles };
}

function componentStatus(componentId) {
  const statuses = {
    execution_rules: "current_machine_identity_closed_domain_truth_not_established",
    interpretation_rules: "current_machine_identity_closed_expert_truth_not_established",
    input_policy: "current_machine_identity_closed_formal_input_not_admitted",
    fact_contract: "current_machine_identity_closed_astronomical_truth_not_established",
    source_bundle: "current_authored_machine_identity_closed_source_bindings_incomplete",
    rights_bundle: "current_authored_machine_identity_closed_rights_legal_conclusion_incomplete",
    expert_review_bundle: "current_review_template_machine_identity_closed_real_expert_bundle_absent",
    high_risk_policy: "current_lexical_gate_machine_identity_closed_formal_semantic_policy_incomplete",
    report_contract: "current_isolated_preview_machine_identity_closed_not_formal_product_report"
  };
  return statuses[componentId];
}

function buildComponents(authoredFiles) {
  const components = [];
  let componentFileReferences = 0;
  for (const componentId of COMPONENT_IDS) {
    const files = [];
    for (const file of authoredFiles) {
      if (file.componentIds.includes(componentId)) {
        files.push({ path: file.path, bytes: file.bytes, sha256: file.sha256 });
      }
    }
    componentFileReferences += files.length;
    components.push({
      componentId,
      status: componentStatus(componentId),
      machineIdentityClosed: true,
      files,
      closureDigest: componentClosureDigest(componentId, files)
    });
  }
  return { components, componentFileReferences };
}

function falseAuthorityBoundary() {
  return {
    contentTruthEstablished: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    expertIdentityQualificationIndependenceEstablished: false,
    expertTruthEstablished: false,
    formalAdmissionAuthorized: false,
    highRiskClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    redistributionAuthorized: false,
    releaseEvidenceComplete: false,
    releaseReady: false,
    rightsLegalConclusionEstablished: false,
    safeToPublish: false
  };
}

function buildProjection(inputs) {
  const { components, componentFileReferences } = buildComponents(inputs.authoredFiles);
  const rootCounts = {};
  for (const root of PACKAGE_ROOTS) rootCounts[root] = 0;
  for (const file of inputs.authoredFiles) {
    const root = PACKAGE_ROOTS.find((candidate) => file.path.startsWith(`${candidate}/`));
    rootCounts[root] += 1;
  }
  const unsigned = {
    schemaVersion: "2.0.0",
    recordType: "western_three_package_authored_machine_identity_manifest",
    manifestId: MANIFEST_ID,
    status: "current_three_package_authored_file_machine_identity_zero_admission_effect",
    createdAt: CREATED_AT,
    activeAdmissionEffect: "none",
    systemIdentity: {
      contractSystemId: "western",
      productSystemId: "western-astrology",
      productType: "three_package_authored_machine_identity_boundary"
    },
    productBoundary: {
      productIdentity: null,
      releaseIdentity: null,
      targetSchema: null,
      migrationId: null,
      runtimeOption: "unselected",
      storageBackend: "unselected",
      mainApplicationIntegrated: false,
      formalProductSurface: "absent",
      centralRegistryIntegration: "absent"
    },
    projectReleaseGovernanceContext: {
      activeLine: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      projectContextOnly: true,
      inheritedByWesternProductIdentity: false,
      mutationEpochBoundaryRequired: true,
      expertClaimsAuthorized: false,
      publicDeploymentAuthorized: false
    },
    artifactBindings: [
      {
        role: "current_source_and_manifest_identity_drift_receipt_branded_parent",
        path: DRIFT_RECEIPT.path,
        rawBytes: DRIFT_RECEIPT.rawBytes,
        rawSha256: DRIFT_RECEIPT.rawSha256,
        semanticDigest: DRIFT_RECEIPT.semanticDigest,
        semanticDigestField: DRIFT_RECEIPT.semanticDigestField,
        privateBrandConsumed: true,
        currentFullLoaderVerified: true
      },
      ...cloneJson(inputs.historicalContexts)
    ],
    threePackageAuthoredFileClosure: {
      scopeClass: "three_selected_package_roots_exact_not_entire_western_engineering_closure",
      threeSelectedPackageRootsExact: true,
      entireWesternEngineeringClosureEstablished: false,
      packageRootCount: PACKAGE_ROOTS.length,
      packageRoots: [...PACKAGE_ROOTS],
      expectedUniquePhysicalPaths: 70,
      observedUniquePhysicalPaths: inputs.authoredFiles.length,
      rootFileCounts: rootCounts,
      files: cloneJson(inputs.authoredFiles),
      recursiveEnumerationPerformed: true,
      canonicalPathSortApplied: true,
      duplicatePhysicalMembershipRejected: true,
      unexpectedNonExcludedFileRejected: true,
      unexpectedNonExcludedDirectoryRejected: true,
      reparseOrSymlinkRejectedWithinVisitedAuthorityTree: true,
      excludedRuntimeSubtrees: [...EXCLUDED_RUNTIME_SUBTREES],
      excludedRuntimeSubtreesNotInspectedOrAuthoritative: true,
      ordinaryFilesOnly: true,
      explicitlyOutsideThisClosure: [
        {
          path: "isolated-drafts/western-civil-time-fact-browser-draft",
          enumeratedByThisManifest: false,
          identityVerifiedByThisManifest: false
        },
        {
          path: "packages/western-civil-time-input-adapter-draft",
          enumeratedByThisManifest: false,
          identityVerifiedByThisManifest: false
        }
      ]
    },
    componentAccounting: {
      componentCount: COMPONENT_IDS.length,
      componentIds: [...COMPONENT_IDS],
      componentFileReferences,
      uniquePhysicalPaths: inputs.authoredFiles.length
    },
    componentClassificationBoundary: {
      pathNameHeuristicRoutingOnly: true,
      semanticDependencyOrCallgraphEstablished: false,
      componentMembershipEstablishesDomainTruth: false,
      componentReferenceFanoutEqualsIndependentSemanticChanges: false
    },
    components,
    currentnessBoundary: {
      driftReceiptPrivateBrandVerified: true,
      upstreamPrivateBrandCount: 1,
      currentThreePackageAuthoredMachineIdentityManifestMechanicallyVerified: true,
      currentFullDomainManifest: false,
      currentFullDomainManifestMechanicallyVerified: false,
      formalOrCurrentSourceRequirements: false,
      formalSourceRequirementsMechanicallyCurrent: false,
      nonformalSourceSuccessorsMechanicallyCurrent: false,
      historicalSourceAndManifestRawAndSelfDigestContextOnly: true,
      historicalSourceOrManifestReboundOrResigned: false,
      ownerPromotionDecisionReceipt: null,
      browserRuntimeEvidence: false,
      browserRuntimeEvidenceEstablished: false,
      browserRuntimeReverifiedByThisManifest: false,
      strictReceiptIssued: false,
      strictReceiptSuccessfulIssuancePathEstablished: false,
      productIdentityEstablished: false,
      entireWesternEngineeringClosureEstablished: false
    },
    strictReceiptBoundary: {
      currentReceiptSchemaVersion: "western-calculation-receipt/0.1-draft",
      issued: false,
      officialHorizonsCandidateBodiesPersisted: 0,
      officialPublisherAuthenticityEstablished: false,
      officialNetworkProvenanceEstablished: false,
      officialEvidenceRightsCleared: false,
      realDomainReviewReceiptBound: false,
      externalInputsAloneCanIssueCurrentContract: false,
      implementationSuccessorRequiredBeforeIssuance: true
    },
    gateState: {
      admissionGatesRequired: 8,
      admissionGatesSatisfied: 0,
      bindingRequired: 28,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      highRiskPolicyBound: false,
      releaseEvidenceComplete: false
    },
    observationBoundary: {
      heldHandlePerFileSnapshots: true,
      crossFileAtomicSnapshot: false,
      mutationEpochAvailable: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false,
      manifestDigestIsDigitalSignature: false,
      rawIdentitiesAreDigitalSignatures: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    evidenceLedger: {
      engineeringEvidence: "current_exact_three_package_authored_file_machine_identity",
      browserAndRuntimeEvidence: "not_reverified_by_this_manifest",
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsAndLegalJudgment: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    },
    authorityBoundary: falseAuthorityBoundary(),
    doesNotEstablish: [
      "formal_or_current_source_requirements_loader_closure",
      "entire_western_engineering_or_product_file_closure",
      "current_full_domain_manifest_or_formal_admission",
      "source_body_exact_quote_frozen_binding_or_three_layer_rights",
      "astronomical_content_or_interpretation_truth",
      "real_expert_identity_qualification_independence_opinion_or_truth",
      "semantic_complete_high_risk_policy_or_high_risk_claims_authority",
      "browser_chrome_edge_pwa_service_worker_public_host_or_product_runtime_evidence",
      "product_release_schema_migration_runtime_storage_or_central_registry_identity",
      "cross_file_atomicity_mutation_epoch_interval_integrity_or_aba_exclusion",
      "release_evidence_release_readiness_deployment_rollback_or_public_release_authorization",
      "legacy_v13_or_bazi_authority_inheritance"
    ]
  };
  return {
    ...unsigned,
    manifestDigest: computeWesternIndependentEngineeringManifestV2Digest(unsigned)
  };
}

function requireAllFalse(record, label) {
  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    fail("RED_BOUNDARY_MISMATCH", `${label} 必须是 object。`);
  }
  for (const [key, value] of Object.entries(record)) {
    if (value !== false) fail("RED_BOUNDARY_MISMATCH", `${label}.${key} 必须为 false。`);
  }
}

function assertDenseSortedUniqueStrings(values, label, expected = undefined) {
  if (!Array.isArray(values)) fail("ARRAY_BOUNDARY_INVALID", `${label} 必须是数组。`);
  const seen = new Set();
  for (let index = 0; index < values.length; index += 1) {
    if (!Object.hasOwn(values, index) || typeof values[index] !== "string"
      || values[index] === "" || seen.has(values[index])) {
      fail("ARRAY_BOUNDARY_INVALID", `${label} 必须 dense、非空且唯一。`);
    }
    if (index > 0 && compareCodeUnits(values[index - 1], values[index]) >= 0) {
      fail("ARRAY_BOUNDARY_INVALID", `${label} 必须按 code unit 严格排序。`);
    }
    seen.add(values[index]);
  }
  if (expected !== undefined && !exactJson(values, expected)) {
    fail("ARRAY_BOUNDARY_INVALID", `${label} exact set 漂移。`);
  }
}

function assertComponentIds(values, label) {
  if (!Array.isArray(values) || values.length === 0) {
    fail("ARRAY_BOUNDARY_INVALID", `${label} 必须是非空数组。`);
  }
  const seen = new Set();
  let previousIndex = -1;
  for (let index = 0; index < values.length; index += 1) {
    if (!Object.hasOwn(values, index) || typeof values[index] !== "string"
      || values[index] === "" || seen.has(values[index])) {
      fail("ARRAY_BOUNDARY_INVALID", `${label} 必须 dense 且唯一。`);
    }
    const componentIndex = COMPONENT_IDS.indexOf(values[index]);
    if (componentIndex < 0 || componentIndex <= previousIndex) {
      fail("ARRAY_BOUNDARY_INVALID", `${label} 必须按固定 component order 严格排序。`);
    }
    previousIndex = componentIndex;
    seen.add(values[index]);
  }
}

function assertManifestBoundary(manifest) {
  if (manifest?.schemaVersion !== "2.0.0" || manifest?.manifestId !== MANIFEST_ID
    || manifest?.recordType
      !== "western_three_package_authored_machine_identity_manifest"
    || manifest?.activeAdmissionEffect !== "none"
    || manifest?.status
      !== "current_three_package_authored_file_machine_identity_zero_admission_effect") {
    fail("MANIFEST_BOUNDARY_MISMATCH", "Western Manifest v2 身份或状态漂移。");
  }
  const closure = manifest.threePackageAuthoredFileClosure;
  if (closure?.scopeClass
      !== "three_selected_package_roots_exact_not_entire_western_engineering_closure"
    || closure?.threeSelectedPackageRootsExact !== true
    || closure?.entireWesternEngineeringClosureEstablished !== false
    || closure?.packageRootCount !== 3
    || closure?.expectedUniquePhysicalPaths !== 70
    || closure?.observedUniquePhysicalPaths !== 70
    || closure?.files?.length !== 70
    || closure?.recursiveEnumerationPerformed !== true
    || closure?.canonicalPathSortApplied !== true
    || closure?.duplicatePhysicalMembershipRejected !== true
    || closure?.unexpectedNonExcludedFileRejected !== true
    || closure?.unexpectedNonExcludedDirectoryRejected !== true
    || closure?.reparseOrSymlinkRejectedWithinVisitedAuthorityTree !== true
    || closure?.excludedRuntimeSubtreesNotInspectedOrAuthoritative !== true
    || closure?.ordinaryFilesOnly !== true
    || !exactJson(closure.packageRoots, PACKAGE_ROOTS)
    || !exactJson(closure.excludedRuntimeSubtrees, EXCLUDED_RUNTIME_SUBTREES)
    || !exactJson(closure.rootFileCounts, {
      "packages/western-astronomy-engine-adapter-draft": 40,
      "packages/western-astrology-contracts-draft": 6,
      "packages/western-astrology-rules-preview-draft": 24
    })
    || !exactJson(closure.explicitlyOutsideThisClosure, [
      {
        path: "isolated-drafts/western-civil-time-fact-browser-draft",
        enumeratedByThisManifest: false,
        identityVerifiedByThisManifest: false
      },
      {
        path: "packages/western-civil-time-input-adapter-draft",
        enumeratedByThisManifest: false,
        identityVerifiedByThisManifest: false
      }
    ])) {
    fail("AUTHORED_CLOSURE_BOUNDARY_MISMATCH", "Western authored closure 边界漂移。");
  }
  const paths = [];
  for (let index = 0; index < closure.files.length; index += 1) {
    if (!Object.hasOwn(closure.files, index)) fail("SPARSE_ARRAY", "files 必须 dense。");
    const file = closure.files[index];
    if (typeof file?.path !== "string" || !Number.isSafeInteger(file?.bytes)
      || file.bytes <= 0 || !LOWERCASE_SHA256.test(file?.sha256 ?? "")) {
      fail("AUTHORED_FILE_IDENTITY_INVALID", `files[${index}] identity 无效。`);
    }
    assertComponentIds(file.componentIds, `files[${index}].componentIds`);
    for (const componentId of file.componentIds) {
      if (!COMPONENT_IDS.includes(componentId)) {
        fail("COMPONENT_ID_INVALID", `${file.path} 包含未知 componentId。`);
      }
    }
    paths.push(file.path);
  }
  assertDenseSortedUniqueStrings(paths, "authored file paths", EXPECTED_AUTHORED_PATHS);
  if (manifest.componentAccounting?.componentCount !== 9
    || manifest.componentAccounting?.uniquePhysicalPaths !== 70
    || !exactJson(manifest.componentAccounting?.componentIds, COMPONENT_IDS)
    || manifest.components?.length !== 9) {
    fail("COMPONENT_ACCOUNTING_MISMATCH", "Western component accounting 漂移。");
  }
  if (!exactJson(manifest.componentClassificationBoundary, {
    pathNameHeuristicRoutingOnly: true,
    semanticDependencyOrCallgraphEstablished: false,
    componentMembershipEstablishesDomainTruth: false,
    componentReferenceFanoutEqualsIndependentSemanticChanges: false
  })) {
    fail("COMPONENT_CLASSIFICATION_BOUNDARY_MISMATCH", "组件映射只能是路径名启发式路由。");
  }
  let referenceCount = 0;
  for (let index = 0; index < manifest.components.length; index += 1) {
    if (!Object.hasOwn(manifest.components, index)) fail("SPARSE_ARRAY", "components 必须 dense。");
    const component = manifest.components[index];
    if (component.componentId !== COMPONENT_IDS[index]
      || component.machineIdentityClosed !== true || !Array.isArray(component.files)
      || component.files.length === 0
      || component.closureDigest
        !== componentClosureDigest(component.componentId, component.files)) {
      fail("COMPONENT_CLOSURE_MISMATCH", `组件 ${COMPONENT_IDS[index]} 漂移。`);
    }
    const componentPaths = component.files.map((file) => file.path);
    assertDenseSortedUniqueStrings(componentPaths, `${component.componentId}.files`);
    for (const file of component.files) {
      const physical = closure.files.find((entry) => entry.path === file.path);
      if (!physical || !physical.componentIds.includes(component.componentId)
        || physical.bytes !== file.bytes || physical.sha256 !== file.sha256) {
        fail("COMPONENT_PHYSICAL_MEMBERSHIP_MISMATCH", file.path);
      }
    }
    referenceCount += component.files.length;
  }
  for (const physical of closure.files) {
    for (const componentId of physical.componentIds) {
      const component = manifest.components.find((entry) => entry.componentId === componentId);
      const references = component.files.filter((entry) => entry.path === physical.path);
      if (references.length !== 1) {
        fail("COMPONENT_PHYSICAL_MEMBERSHIP_MISMATCH", physical.path);
      }
    }
  }
  if (referenceCount !== manifest.componentAccounting.componentFileReferences) {
    fail("COMPONENT_ACCOUNTING_MISMATCH", "component reference count 漂移。");
  }
  if (manifest.artifactBindings?.length !== 5
    || manifest.artifactBindings[0]?.path !== DRIFT_RECEIPT.path
    || manifest.artifactBindings[0]?.privateBrandConsumed !== true
    || manifest.artifactBindings[0]?.currentFullLoaderVerified !== true
    || manifest.currentnessBoundary?.driftReceiptPrivateBrandVerified !== true
    || manifest.currentnessBoundary?.upstreamPrivateBrandCount !== 1
    || manifest.currentnessBoundary
      ?.currentThreePackageAuthoredMachineIdentityManifestMechanicallyVerified !== true
    || manifest.currentnessBoundary?.currentFullDomainManifest !== false
    || manifest.currentnessBoundary?.currentFullDomainManifestMechanicallyVerified !== false
    || manifest.currentnessBoundary?.formalOrCurrentSourceRequirements !== false
    || manifest.currentnessBoundary?.formalSourceRequirementsMechanicallyCurrent !== false
    || manifest.currentnessBoundary?.nonformalSourceSuccessorsMechanicallyCurrent !== false
    || manifest.currentnessBoundary?.browserRuntimeEvidence !== false
    || manifest.currentnessBoundary?.browserRuntimeEvidenceEstablished !== false
    || manifest.currentnessBoundary?.browserRuntimeReverifiedByThisManifest !== false
    || manifest.currentnessBoundary?.strictReceiptIssued !== false
    || manifest.currentnessBoundary?.productIdentityEstablished !== false
    || manifest.currentnessBoundary?.entireWesternEngineeringClosureEstablished !== false) {
    fail("UPSTREAM_CURRENTNESS_MISMATCH", "Western upstream/currentness 边界漂移。");
  }
  for (let index = 1; index < manifest.artifactBindings.length; index += 1) {
    const context = manifest.artifactBindings[index];
    if (context.rawAndSelfDigestVerified !== true || context.privateBrandConsumed !== false
      || context.currentFullLoader !== false || context.rebindOrResignPerformed !== false) {
      fail("HISTORICAL_CONTEXT_PROMOTION_FORBIDDEN", context.path);
    }
  }
  if (manifest.productBoundary?.productIdentity !== null
    || manifest.productBoundary?.releaseIdentity !== null
    || manifest.productBoundary?.targetSchema !== null
    || manifest.productBoundary?.migrationId !== null
    || manifest.productBoundary?.mainApplicationIntegrated !== false
    || manifest.projectReleaseGovernanceContext?.activeLine !== "legacy-v13"
    || manifest.projectReleaseGovernanceContext?.targetSchema !== 13
    || manifest.projectReleaseGovernanceContext?.migrationId !== null
    || manifest.projectReleaseGovernanceContext?.inheritedByWesternProductIdentity !== false) {
    fail("PRODUCT_PROMOTION_FORBIDDEN", "Western product/release/schema/migration 必须保持隔离 null。");
  }
  const gate = manifest.gateState;
  if (gate?.admissionGatesRequired !== 8 || gate?.admissionGatesSatisfied !== 0
    || gate?.bindingRequired !== 28 || gate?.bindingFrozenVerified !== 0
    || gate?.independentExpertsRequired !== 2
    || gate?.independentExpertReviewsVerified !== 0
    || gate?.sourceBundleComplete !== false || gate?.rightsBundleComplete !== false
    || gate?.expertReviewBundleComplete !== false || gate?.highRiskPolicyBound !== false
    || gate?.releaseEvidenceComplete !== false) {
    fail("GATE_PROMOTION_FORBIDDEN", "Western gates 必须保持 0/8、0/28、0/2。");
  }
  requireAllFalse(manifest.authorityBoundary, "authorityBoundary");
  if (manifest.observationBoundary?.crossFileAtomicSnapshot !== false
    || manifest.observationBoundary?.mutationEpochAvailable !== false
    || manifest.observationBoundary?.mutationEpochReceipt !== null
    || manifest.observationBoundary?.intervalMutationExcludedAcrossFiles !== false
    || manifest.observationBoundary?.abaExcluded !== false) {
    fail("MUTATION_BOUNDARY_PROMOTION_FORBIDDEN", "epoch/atomic/interval/ABA 必须保持红线。");
  }
  if (!LOWERCASE_SHA256.test(manifest.manifestDigest ?? "")
    || computeWesternIndependentEngineeringManifestV2Digest(manifest)
      !== manifest.manifestDigest) {
    fail("MANIFEST_DIGEST_MISMATCH", "Western Manifest v2 self digest 漂移。");
  }
  return manifest;
}

export async function buildCurrentWesternIndependentEngineeringManifestV2(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  return deepFreeze(assertManifestBoundary(buildProjection(inputs)));
}

export async function loadWesternIndependentEngineeringManifestV2(
  workspaceRoot = process.cwd()
) {
  const inputs = await collectCurrentInputs(workspaceRoot);
  const snapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot,
    WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH
  );
  const persisted = parseBaziDttStrictJsonArtifact(snapshot);
  if (EXPECTED_PERSISTED.rawBytes > 0
    && (snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
      || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
      || persisted.manifestDigest !== EXPECTED_PERSISTED.manifestDigest)) {
    fail("PERSISTED_IDENTITY_MISMATCH", "Western Manifest v2 raw/semantic identity 漂移。");
  }
  if (Buffer.from(snapshot.bytes).toString("utf8")
      !== canonicalPrettyStringifyWesternIndependentEngineeringManifestV2(persisted)) {
    fail("MANIFEST_MATERIALIZATION_MISMATCH", "Western Manifest v2 必须 canonical LF materialization。");
  }
  assertManifestBoundary(persisted);
  const expected = assertManifestBoundary(buildProjection(inputs));
  if (!exactJson(persisted, expected)) {
    fail("CURRENT_MANIFEST_MISMATCH", "persisted Manifest v2 不等于当前 package closure。");
  }
  const result = deepFreeze({
    artifact: {
      path: WESTERN_INDEPENDENT_ENGINEERING_MANIFEST_V2_RELATIVE_PATH,
      rawBytes: snapshot.rawBytes,
      rawSha256: snapshot.rawSha256
    },
    manifest: cloneJson(persisted)
  });
  VERIFIED_RESULTS.add(result);
  return result;
}

export function isVerifiedWesternIndependentEngineeringManifestV2(value) {
  return value !== null && typeof value === "object" && VERIFIED_RESULTS.has(value)
    && Object.isFrozen(value);
}

export function getWesternIndependentEngineeringManifestV2Summary(value) {
  if (!isVerifiedWesternIndependentEngineeringManifestV2(value)) {
    fail("VERIFIED_BRAND_REQUIRED", "summary 只接受 fixed-path full-loader 私有品牌。");
  }
  const manifest = value.manifest;
  return deepFreeze({
    artifact: cloneJson(value.artifact),
    manifestId: manifest.manifestId,
    manifestDigest: manifest.manifestDigest,
    componentCount: manifest.componentAccounting.componentCount,
    componentFileReferences: manifest.componentAccounting.componentFileReferences,
    componentReferencesArePathNameHeuristicRoutingOnly:
      manifest.componentClassificationBoundary.pathNameHeuristicRoutingOnly,
    componentReferenceFanoutEqualsIndependentSemanticChanges:
      manifest.componentClassificationBoundary
        .componentReferenceFanoutEqualsIndependentSemanticChanges,
    uniquePhysicalPaths: manifest.componentAccounting.uniquePhysicalPaths,
    threeSelectedPackageRootsExact:
      manifest.threePackageAuthoredFileClosure.threeSelectedPackageRootsExact,
    entireWesternEngineeringClosureEstablished:
      manifest.threePackageAuthoredFileClosure.entireWesternEngineeringClosureEstablished,
    currentThreePackageAuthoredMachineIdentityManifestMechanicallyVerified:
      manifest.currentnessBoundary
        .currentThreePackageAuthoredMachineIdentityManifestMechanicallyVerified,
    currentFullDomainManifestMechanicallyVerified:
      manifest.currentnessBoundary.currentFullDomainManifestMechanicallyVerified,
    browserRuntimeEvidenceEstablished:
      manifest.currentnessBoundary.browserRuntimeEvidenceEstablished,
    admissionGatesSatisfied: manifest.gateState.admissionGatesSatisfied,
    admissionGatesRequired: manifest.gateState.admissionGatesRequired,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    independentExpertReviewsVerified:
      manifest.gateState.independentExpertReviewsVerified,
    independentExpertsRequired: manifest.gateState.independentExpertsRequired,
    productIdentity: manifest.productBoundary.productIdentity,
    releaseIdentity: manifest.productBoundary.releaseIdentity,
    targetSchema: manifest.productBoundary.targetSchema,
    migrationId: manifest.productBoundary.migrationId,
    releaseReady: manifest.authorityBoundary.releaseReady,
    publicDeploymentAuthorized: manifest.authorityBoundary.publicDeploymentAuthorized,
    publicReleaseAuthorized: manifest.authorityBoundary.publicReleaseAuthorized,
    expertClaimsAuthorized: manifest.authorityBoundary.expertClaimsAuthorized
  });
}

export const westernIndependentEngineeringManifestV2TestOnly = Object.freeze({
  PACKAGE_ROOTS,
  EXCLUDED_RUNTIME_SUBTREES,
  COMPONENT_IDS,
  EXPECTED_AUTHORED_PATHS,
  EXPECTED_PERSISTED,
  DRIFT_RECEIPT,
  HISTORICAL_CONTEXTS,
  enumerateAuthoredPaths,
  collectAuthoredPackageClosure,
  classifyAuthoredPath,
  assertManifestBoundary,
  requireDriftReceiptBrand
});
