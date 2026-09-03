import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder } from "node:util";

const CANDIDATE_ID =
  "hakimi.bazi.single-chart-report.component-identity-drift-receipt-candidate/1.0.0";
const RECORD_TYPE =
  "bazi_single_chart_report_component_identity_drift_receipt_candidate";
const DIGEST_DOMAIN =
  "hakimi.bazi.single-chart-report.component-identity-drift-receipt-candidate/1.0.0";
const CREATED_AT = "2026-09-01T04:31:00.000Z";
const MAX_FILE_BYTES = 1_000_000;
const LOWERCASE_SHA256 = /^[a-f0-9]{64}$/u;
const REFLECT_APPLY = Reflect.apply;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const VERIFIED_RECEIPTS = new WeakSet();

export const BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH =
  "content/system-admission/bazi-single-chart-report-component-identity-drift-receipt-candidate.v1.0.0.json";

const EXPECTED_PERSISTED = Object.freeze({
  rawBytes: 5_419,
  rawSha256: "c797aa7851d6f2ff64518abae42d25143307936bc63263e37f5000383511a9cf",
  receiptDigest: "95e5a1b99d0a021a0fabf6c42e1cc8de432b9565459a091e577d57abbcea5fc8"
});

const FORMAL_MANIFEST = Object.freeze({
  path: "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.2.0.json",
  rawBytes: 23_399,
  rawSha256: "6481d5edfa9f9819af035ad9d208ea526fa7b29f12ccd6e072ad31f625e7f86d",
  manifestId: "hakimi.bazi.single-chart-report.domain-release-manifest/2.2.0",
  manifestRevision: "2.2.0",
  manifestDigest: "a95e722674c0b09a2d564b4090396fbfc25fdfc2f5f2fff9aedc92aa2468f68e"
});

const REPORT_SOURCE = Object.freeze({
  path: "packages/research-export/src/single-chart-report.ts",
  persistedRawBytes: 161_365,
  persistedSha256: "215a470e79ea6eb844b41a5aad18867279d1a7ae60fd2b9cf6a364cc2c1b5082",
  currentRawBytes: 164_210,
  currentSha256: "43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc"
});

const FROZEN_GOLDEN = Object.freeze({
  path: "packages/research-export/src/golden/single-chart-report.contract.v1.7.json",
  rawBytes: 60_900,
  sha256: "aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29"
});

const REPORT_COMPONENT = Object.freeze({
  componentId: "report_contract",
  version: "single-chart-report@1.7.0",
  status: "bound_frozen_golden_engineering_contract",
  persistedDigest: "621cb0422729a3e5e12434f5c1c9ff5bf0f06e2d7bd2493deb5b5387f4957268",
  currentObservedDigest: "6dd730cabb3035567694599692439a1b27f48e89ea0ee0970bbb33f5f7ee95f2"
});

export class BaziSingleChartReportComponentIdentityDriftReceiptCandidateError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "BaziSingleChartReportComponentIdentityDriftReceiptCandidateError";
    this.code = code;
  }
}

function fail(code, message, options) {
  throw new BaziSingleChartReportComponentIdentityDriftReceiptCandidateError(code, message, options);
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function canonicalValue(value, state = { active: new Set(), seen: new Set() }) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) return value;
  if (typeof value !== "object") fail("NON_CANONICAL_JSON", "候选收据只接受有限规范 JSON 值。");
  if (state.active.has(value) || state.seen.has(value)) {
    fail("NON_CANONICAL_JSON", "候选收据不接受循环或别名对象。");
  }
  state.active.add(value);
  state.seen.add(value);
  const prototype = Object.getPrototypeOf(value);
  if (Array.isArray(value)) {
    if (prototype !== Array.prototype) fail("NON_CANONICAL_JSON", "候选收据数组原型不合法。");
    const result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) fail("NON_CANONICAL_JSON", "候选收据不接受稀疏数组。");
      result.push(canonicalValue(value[index], state));
    }
    state.active.delete(value);
    return result;
  }
  if (prototype !== Object.prototype) fail("NON_CANONICAL_JSON", "候选收据对象原型不合法。");
  const result = {};
  for (const key of Object.keys(value).sort()) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      fail("NON_CANONICAL_JSON", "候选收据不接受危险对象键。");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      fail("NON_CANONICAL_JSON", "候选收据不接受访问器或隐藏字段。");
    }
    result[key] = canonicalValue(descriptor.value, state);
  }
  if (Reflect.ownKeys(value).length !== Object.keys(value).length) {
    fail("NON_CANONICAL_JSON", "候选收据不接受 symbol 或隐藏字段。");
  }
  state.active.delete(value);
  return result;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalValue(value));
}

function componentDigest(component) {
  return sha256Text(canonicalStringify({
    componentId: component.componentId,
    version: component.version,
    status: component.status,
    files: component.files
  }));
}

export function computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(value) {
  const canonical = canonicalValue(value);
  const { receiptDigest: _receiptDigest, ...unsigned } = canonical;
  return sha256Text(`${DIGEST_DOMAIN}\0${canonicalStringify(unsigned)}`);
}

export function serializeBaziSingleChartReportComponentIdentityDriftReceiptCandidate(value) {
  return `${JSON.stringify(canonicalValue(value), null, 2)}\n`;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

function exactJson(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function safeAbsolutePath(workspaceRoot, relativePath) {
  if (typeof workspaceRoot !== "string" || workspaceRoot.length === 0) {
    fail("WORKSPACE_ROOT_INVALID", "workspace root 必须是非空字符串。");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,299}$/u.test(relativePath)
    || relativePath.includes("..")
    || relativePath.startsWith("/")
    || relativePath.includes("\\")) {
    fail("UNSAFE_PATH", "候选收据固定路径不安全。");
  }
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...relativePath.split("/"));
  if (!absolute.startsWith(`${root}${path.sep}`)) fail("UNSAFE_PATH", "候选收据固定路径越界。");
  return { root, absolute };
}

async function readStableFile(workspaceRoot, relativePath) {
  const { root, absolute } = safeAbsolutePath(workspaceRoot, relativePath);
  let rootReal;
  let before;
  let resolved;
  let bytes;
  let after;
  try {
    [rootReal, before, resolved] = await Promise.all([
      realpath(root),
      lstat(absolute),
      realpath(absolute)
    ]);
    if (!before.isFile() || before.isSymbolicLink()) fail("FILE_TYPE_INVALID", "候选收据输入必须是普通文件。");
    if (!resolved.startsWith(`${rootReal}${path.sep}`)) fail("UNSAFE_PATH", "候选收据文件真实路径越界。");
    if (before.size > MAX_FILE_BYTES) fail("FILE_TOO_LARGE", "候选收据输入超过固定容量。");
    bytes = await readFile(absolute);
    after = await lstat(absolute);
  } catch (error) {
    if (error instanceof BaziSingleChartReportComponentIdentityDriftReceiptCandidateError) throw error;
    fail("FILE_READ_FAILED", "候选收据固定输入不可读。", { cause: error });
  }
  if (!after.isFile() || after.isSymbolicLink()
    || before.dev !== after.dev
    || before.ino !== after.ino
    || before.size !== after.size
    || before.mtimeMs !== after.mtimeMs
    || bytes.length !== before.size) {
    fail("INTERVAL_MUTATION_DETECTED", "候选收据读取区间内文件发生变化。");
  }
  return Object.freeze({
    path: relativePath,
    rawBytes: bytes.length,
    rawSha256: sha256Bytes(bytes),
    bytes
  });
}

function parseStrictJson(snapshot, label) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
  } catch (error) {
    fail("INVALID_UTF8", `${label} 不是严格 UTF-8。`, { cause: error });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail("INVALID_JSON", `${label} 不是有效 JSON。`, { cause: error });
  }
}

function assertSnapshot(snapshot, expected, code) {
  if (snapshot.rawBytes !== expected.rawBytes || snapshot.rawSha256 !== expected.rawSha256) {
    fail(code, "固定工程身份与候选观察不一致。");
  }
}

function findExactReportComponent(manifest) {
  if (manifest?.manifestId !== FORMAL_MANIFEST.manifestId
    || manifest?.manifestRevision !== FORMAL_MANIFEST.manifestRevision
    || manifest?.manifestDigest !== FORMAL_MANIFEST.manifestDigest
    || manifest?.releaseStatus !== "engineering_candidate"
    || manifest?.releaseGovernance?.releaseIdentity !== "legacy-v13"
    || manifest?.releaseGovernance?.targetSchema !== 13
    || manifest?.releaseGovernance?.migrationId !== null
    || manifest?.releaseGovernance?.publicDeploymentAuthorized !== false
    || manifest?.releaseGovernance?.expertClaimsAuthorized !== false
    || manifest?.authorityBoundary?.releaseReady !== false
    || manifest?.authorityBoundary?.rightsLegalConclusionEstablished !== false
    || manifest?.authorityBoundary?.expertTruthEstablished !== false
    || manifest?.gateState?.bindingRequired !== 12
    || manifest?.gateState?.bindingFrozenVerified !== 0
    || manifest?.gateState?.independentExpertsRequired !== 2
    || manifest?.gateState?.independentExpertReviewsVerified !== 0
    || manifest?.gateState?.sourceBundleComplete !== false
    || manifest?.gateState?.rightsBundleComplete !== false
    || manifest?.gateState?.expertReviewBundleComplete !== false
    || manifest?.gateState?.releaseEvidenceComplete !== false) {
    fail("FORMAL_MANIFEST_SEMANTIC_DRIFT", "正式 v2.2 历史清单身份或红门语义漂移。");
  }
  const matches = Array.isArray(manifest.components)
    ? manifest.components.filter((component) => component?.componentId === REPORT_COMPONENT.componentId)
    : [];
  if (matches.length !== 1) fail("FORMAL_REPORT_COMPONENT_DRIFT", "正式清单的 report component 不是唯一项。");
  const component = matches[0];
  if (component.version !== REPORT_COMPONENT.version
    || component.status !== REPORT_COMPONENT.status
    || component.digest !== REPORT_COMPONENT.persistedDigest
    || !Array.isArray(component.files)
    || component.files.length !== 2) {
    fail("FORMAL_REPORT_COMPONENT_DRIFT", "正式清单的 report component 身份漂移。");
  }
  const golden = component.files.find((file) => file?.path === FROZEN_GOLDEN.path);
  const source = component.files.find((file) => file?.path === REPORT_SOURCE.path);
  if (!golden || !source
    || golden.rawBytes !== FROZEN_GOLDEN.rawBytes
    || golden.sha256 !== FROZEN_GOLDEN.sha256
    || source.rawBytes !== REPORT_SOURCE.persistedRawBytes
    || source.sha256 !== REPORT_SOURCE.persistedSha256
    || componentDigest(component) !== REPORT_COMPONENT.persistedDigest) {
    fail("FORMAL_REPORT_COMPONENT_DRIFT", "正式清单的 report component 文件闭包漂移。");
  }
  return component;
}

function buildReceipt(formalManifestSnapshot, currentSourceSnapshot, frozenGoldenSnapshot, persistedComponent) {
  const currentComponent = {
    componentId: persistedComponent.componentId,
    version: persistedComponent.version,
    status: persistedComponent.status,
    files: persistedComponent.files.map((file) => file.path === REPORT_SOURCE.path
      ? {
          path: REPORT_SOURCE.path,
          rawBytes: currentSourceSnapshot.rawBytes,
          sha256: currentSourceSnapshot.rawSha256
        }
      : canonicalValue(file))
  };
  const currentComponentDigest = componentDigest(currentComponent);
  if (currentComponentDigest !== REPORT_COMPONENT.currentObservedDigest) {
    fail("CURRENT_COMPONENT_DIGEST_CHANGED", "当前 report component 候选摘要已改变。");
  }
  const receipt = {
    schemaVersion: "1.0.0",
    recordType: RECORD_TYPE,
    candidateId: CANDIDATE_ID,
    candidateStatus: "candidate_only_component_drift_observation_no_manifest_authority",
    createdAt: CREATED_AT,
    scope: {
      systemId: "bazi",
      productVersion: "1.7",
      surfaceId: "single-chart-report",
      surfaceVersion: "1.7.0",
      formalManifest: {
        path: FORMAL_MANIFEST.path,
        manifestId: FORMAL_MANIFEST.manifestId,
        manifestRevision: FORMAL_MANIFEST.manifestRevision,
        manifestDigest: FORMAL_MANIFEST.manifestDigest,
        rawBytes: formalManifestSnapshot.rawBytes,
        rawSha256: formalManifestSnapshot.rawSha256,
        currentAfterComponentChange: false,
        privateBrandCurrent: false,
        fullLoaderReplayPerformed: false
      },
      reportComponent: {
        componentId: REPORT_COMPONENT.componentId,
        version: REPORT_COMPONENT.version,
        status: REPORT_COMPONENT.status,
        persistedDigest: REPORT_COMPONENT.persistedDigest,
        currentObservedDigest: currentComponentDigest,
        digestChanged: true,
        driftEntries: [{
          path: REPORT_SOURCE.path,
          persistedRawBytes: REPORT_SOURCE.persistedRawBytes,
          persistedSha256: REPORT_SOURCE.persistedSha256,
          currentRawBytes: currentSourceSnapshot.rawBytes,
          currentSha256: currentSourceSnapshot.rawSha256,
          failureCode: "COMPONENT_FILE_IDENTITY_DRIFT"
        }]
      },
      frozenGolden: {
        path: FROZEN_GOLDEN.path,
        expectedRawBytes: FROZEN_GOLDEN.rawBytes,
        expectedSha256: FROZEN_GOLDEN.sha256,
        currentRawBytes: frozenGoldenSnapshot.rawBytes,
        currentSha256: frozenGoldenSnapshot.rawSha256,
        unchanged: true
      }
    },
    blockingRelationship: {
      code: "COMPONENT_FILE_IDENTITY_DRIFT",
      path: REPORT_SOURCE.path,
      blocksCurrentReportComponentIdentityClosure: true,
      blocksCallingFormalV22Current: true,
      uniqueBlockerClaimed: false,
      otherFormalComponentIdentitiesAssessedByThisReceipt: false
    },
    gateSummary: {
      basis: "formal-v2.2-historical-baseline-not-current-admission-replay",
      currentAdmissionReplayPerformedByThisReceipt: false,
      bindingRequired: 12,
      bindingFrozenVerified: 0,
      independentExpertsRequired: 2,
      independentExpertReviewsVerified: 0,
      sourceBundleComplete: false,
      rightsBundleComplete: false,
      expertReviewBundleComplete: false,
      releaseEvidenceComplete: false
    },
    observationBoundary: {
      engineeringObservationEstablished: true,
      formalHistoricalManifestBytesVerified: true,
      currentReportSourceBytesVerified: true,
      frozenGoldenBytesVerified: true,
      sameHeldBufferPerFile: true,
      endpointObservationOnly: true,
      currentFullDomainManifestEstablished: false,
      currentFullComponentSetObserved: false,
      persistedAsDomainManifest: false,
      activeAdmissionEffect: "none",
      crossFileAtomicSnapshot: false,
      mutationEpochAvailableForSchema13: false,
      mutationEpochReceipt: null,
      intervalMutationExcludedAcrossFiles: false,
      abaExcluded: false
    },
    ownerDecisionBoundary: {
      ownerDecisionsRecorded: 0,
      ownerAcceptanceVerified: false,
      ownerAttributionVerified: false,
      manifestRebindAuthorized: false,
      manifestResignAuthorized: false,
      releaseCandidateFreezeAuthorized: false
    },
    authorityBoundary: {
      contentTruthEstablished: false,
      expertTruthEstablished: false,
      rightsLegalConclusionEstablished: false,
      browserRuntimeEvidenceEstablished: false,
      releaseEvidenceComplete: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      safeToPublish: false,
      crossSystemAuthorityInheritanceAllowed: false
    },
    runtimeTrustBoundary: {
      hiddenPreloadExcluded: false,
      nodeRuntimeIdentityEstablished: false,
      loaderIdentityEstablished: false,
      runtimeLauncherIdentityEstablished: false,
      cliOutputTrustedAttestation: false,
      visiblePreloadGuardIsSecurityBoundary: false,
      mechanicalResultAssumesNoArbitraryPreEvaluationCodeExecution: true
    },
    releaseGovernance: {
      releaseIdentity: "legacy-v13",
      targetSchema: 13,
      migrationId: null
    },
    doesNotEstablish: [
      "current-full-domain-manifest",
      "manifest-rebind-or-resign-authorization",
      "binding-freeze",
      "source-or-rights-completeness",
      "expert-review-completeness",
      "content-truth",
      "expert-truth",
      "rights-legal-conclusion",
      "browser-or-runtime-evidence",
      "release-readiness",
      "public-deployment-authorization",
      "cross-system-authority"
    ]
  };
  receipt.receiptDigest = computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(receipt);
  return receipt;
}

export async function buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot) {
  const formalManifestSnapshot = await readStableFile(workspaceRoot, FORMAL_MANIFEST.path);
  const currentSourceSnapshot = await readStableFile(workspaceRoot, REPORT_SOURCE.path);
  const frozenGoldenSnapshot = await readStableFile(workspaceRoot, FROZEN_GOLDEN.path);
  assertSnapshot(formalManifestSnapshot, FORMAL_MANIFEST, "FORMAL_MANIFEST_RAW_DRIFT");
  assertSnapshot(currentSourceSnapshot, {
    rawBytes: REPORT_SOURCE.currentRawBytes,
    rawSha256: REPORT_SOURCE.currentSha256
  }, "CURRENT_REPORT_SOURCE_CHANGED");
  assertSnapshot(frozenGoldenSnapshot, {
    rawBytes: FROZEN_GOLDEN.rawBytes,
    rawSha256: FROZEN_GOLDEN.sha256
  }, "FROZEN_GOLDEN_DRIFT");
  const formalManifest = parseStrictJson(formalManifestSnapshot, "formal manifest");
  const persistedComponent = findExactReportComponent(formalManifest);
  const receipt = deepFreeze(buildReceipt(
    formalManifestSnapshot,
    currentSourceSnapshot,
    frozenGoldenSnapshot,
    persistedComponent
  ));
  return receipt;
}

export async function loadBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot) {
  const expected = await buildBaziSingleChartReportComponentIdentityDriftReceiptCandidate(workspaceRoot);
  const snapshot = await readStableFile(
    workspaceRoot,
    BAZI_SINGLE_CHART_REPORT_COMPONENT_IDENTITY_DRIFT_RECEIPT_CANDIDATE_RELATIVE_PATH
  );
  assertSnapshot(snapshot, EXPECTED_PERSISTED, "RECEIPT_RAW_DRIFT");
  const parsed = parseStrictJson(snapshot, "component identity drift receipt candidate");
  if (parsed?.candidateId !== CANDIDATE_ID
    || parsed?.recordType !== RECORD_TYPE
    || typeof parsed?.receiptDigest !== "string"
    || !LOWERCASE_SHA256.test(parsed.receiptDigest)
    || parsed.receiptDigest !== EXPECTED_PERSISTED.receiptDigest
    || computeBaziSingleChartReportComponentIdentityDriftReceiptCandidateDigest(parsed) !== parsed.receiptDigest) {
    fail("RECEIPT_IDENTITY_INVALID", "候选收据身份或自摘要无效。");
  }
  const serialized = serializeBaziSingleChartReportComponentIdentityDriftReceiptCandidate(parsed);
  if (snapshot.bytes.toString("utf8") !== serialized) {
    fail("RECEIPT_SERIALIZATION_DRIFT", "候选收据不是确定性序列化字节。");
  }
  if (!exactJson(parsed, expected)) fail("RECEIPT_CURRENT_MISMATCH", "候选收据不等于当前窄观察结果。");
  const verified = deepFreeze(parsed);
  REFLECT_APPLY(WEAK_SET_ADD, VERIFIED_RECEIPTS, [verified]);
  return verified;
}

export function isVerifiedBaziSingleChartReportComponentIdentityDriftReceiptCandidate(value) {
  return value !== null
    && typeof value === "object"
    && REFLECT_APPLY(WEAK_SET_HAS, VERIFIED_RECEIPTS, [value]);
}

export const baziSingleChartReportComponentIdentityDriftReceiptCandidateTestOnly = Object.freeze({
  CANDIDATE_ID,
  RECORD_TYPE,
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED,
  FORMAL_MANIFEST,
  REPORT_SOURCE,
  FROZEN_GOLDEN,
  REPORT_COMPONENT,
  componentDigest,
  canonicalStringify
});
