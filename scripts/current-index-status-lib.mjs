import {
  CURRENT_INDEX_RELATIVE_PATH,
  getCurrentIndexSummary,
  isVerifiedCurrentIndex,
  loadCurrentIndex
} from "./current-index-lib.mjs";
import { HISTORICAL_BAZI_EXPERT_REVIEW_PACKET } from "./history-checkpoint-lib.mjs";
import {
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";

const REFLECT_APPLY = Reflect.apply;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const NATIVE_WEAK_SET = WeakSet;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_VALUES = Object.values;
const ARRAY_FILTER = Array.prototype.filter;
const ARRAY_JOIN = Array.prototype.join;
const ARRAY_MAP = Array.prototype.map;
const ARRAY_SOME = Array.prototype.some;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const REGEXP_TEST = RegExp.prototype.test;
const STRING_INCLUDES = String.prototype.includes;
const STRING_SPLIT = String.prototype.split;
const STRING_STARTS_WITH = String.prototype.startsWith;

function weakSetAdd(set, value) {
  return REFLECT_APPLY(WEAK_SET_ADD, set, [value]);
}

function weakSetHas(set, value) {
  return REFLECT_APPLY(WEAK_SET_HAS, set, [value]);
}

function reflectOwnKeys(value) {
  return REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
}

function getOwnPropertyDescriptor(value, key) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
}

function objectValues(value) {
  return REFLECT_APPLY(OBJECT_VALUES, Object, [value]);
}

function arrayFilter(value, predicate) {
  return REFLECT_APPLY(ARRAY_FILTER, value, [predicate]);
}

function arrayMap(value, mapper) {
  return REFLECT_APPLY(ARRAY_MAP, value, [mapper]);
}

function arraySome(value, predicate) {
  return REFLECT_APPLY(ARRAY_SOME, value, [predicate]);
}

function arrayJoin(value, separator) {
  return REFLECT_APPLY(ARRAY_JOIN, value, [separator]);
}

function jsonStringify(value, replacer, space) {
  return REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, replacer, space]);
}

function regexpTest(expression, value) {
  return REFLECT_APPLY(REGEXP_TEST, expression, [value]);
}

function stringIncludes(value, search) {
  return REFLECT_APPLY(STRING_INCLUDES, value, [search]);
}

function stringSplit(value, separator) {
  return REFLECT_APPLY(STRING_SPLIT, value, [separator]);
}

function stringStartsWith(value, search) {
  return REFLECT_APPLY(STRING_STARTS_WITH, value, [search]);
}

export const CURRENT_INDEX_STATUS_RELATIVE_PATH =
  "docs/status/current-index-summary.md";
export const CURRENT_INDEX_README_RELATIVE_PATH = "README.md";

export const CURRENT_INDEX_MACHINE_BLOCK_BEGIN =
  "<!-- CURRENT_INDEX_MACHINE_PROJECTION_V1_BEGIN -->";
export const CURRENT_INDEX_MACHINE_BLOCK_END =
  "<!-- CURRENT_INDEX_MACHINE_PROJECTION_V1_END -->";
export const CURRENT_STATUS_ENTRYPOINT_BLOCK_BEGIN =
  "<!-- CURRENT_STATUS_ENTRYPOINT_V1_BEGIN -->";
export const CURRENT_STATUS_ENTRYPOINT_BLOCK_END =
  "<!-- CURRENT_STATUS_ENTRYPOINT_V1_END -->";

const STATUS_RECORD_TYPE = "current_index_status_projection_v1";
const VERIFIED_STATUS = new NATIVE_WEAK_SET();
const SHA256 = /^[0-9a-f]{64}$/u;
const README_CURRENT_STATUS_ENTRYPOINT_BLOCK = arrayJoin([
  CURRENT_STATUS_ENTRYPOINT_BLOCK_BEGIN,
  "## 当前发布状态入口",
  "",
  "普通 Web/PWA 构建固定为 `legacy-v13 / targetSchema 13 / migrationId null`。Schema 16 仅是独立输出目录中的工程候选，不是默认版本，也没有公开发布授权。当前产品定位是本地优先研究工具和工程预览；工程哈希、迁移矩阵或 Release Evidence 均不代表命理专家真值。",
  "",
  "唯一机器 current 源是 [canonical current-index](./content/system-admission/current-index.v1.json)，人工可读入口是由它精确生成的 [current-index 状态投影](./docs/status/current-index-summary.md)。完整的多版本历史由独立的 [history checkpoint](./content/system-admission/history-checkpoint.v2.json) 校验；普通 current 读取只绑定该检查点身份、版本族名称清单和每族当前端点，不把更旧历史字节装入 current 结果。[当前发布状态历史长账](./docs/status/current-release-status.md) 仅保留历史叙述，不再构成 current 或授权来源；发布边界另见 [Web v1 发布章程](./docs/Web-v1发布章程与兼容范围-v0.1-2026-08-21.md)、[发布代际台账](./docs/release/release-generation-history.json) 和 [发布回滚手册](./docs/release/web-v1-release-and-rollback-runbook.md)。在所有者确认许可证策略前，本项目明确保留全部权利，不声称是开源项目。",
  CURRENT_STATUS_ENTRYPOINT_BLOCK_END
], "\n");

export class CurrentIndexStatusError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "CurrentIndexStatusError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new CurrentIndexStatusError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function deepFreeze(value, seen = new NATIVE_WEAK_SET()) {
  if (value === null || typeof value !== "object" || weakSetHas(seen, value)) return value;
  weakSetAdd(seen, value);
  const keys = reflectOwnKeys(value);
  for (let index = 0; index < keys.length; index += 1) {
    const descriptor = getOwnPropertyDescriptor(value, keys[index]);
    if (!descriptor || !("value" in descriptor)) {
      fail("STATUS_PROJECTION_INVALID", "status projection must contain data properties only");
    }
    deepFreeze(descriptor.value, seen);
  }
  return OBJECT_FREEZE(value);
}

function projectedBinding(binding) {
  if (binding === null) return null;
  return {
    version: binding.version,
    path: binding.path,
    artifactId: binding.artifactId,
    rawSha256: binding.rawSha256,
    semanticDigest: binding.semanticDigest
  };
}

function projectedExpertBinding(binding) {
  if (binding === null) return null;
  return {
    version: binding.version,
    path: binding.path,
    rawBytes: binding.rawBytes,
    rawSha256: binding.rawSha256,
    packetId: binding.packetId,
    packetDigest: binding.packetDigest
  };
}

function requireStatusBoundary(index, summary) {
  if (!isVerifiedCurrentIndex(index)) {
    fail("CURRENT_INDEX_PRIVATE_BRAND_REQUIRED", "status projection requires a verified current index");
  }
  const unavailableEntries = arrayFilter(
    index.entries,
    (entry) => entry.selectedCurrent === null
  );
  if (summary.currentIndexMechanicallyVerified !== true
    || summary.historyCheckpointIdentityMechanicallyVerified !== true
    || summary.fullHistoryVerifiedByCurrentIndexLoad !== false
    || summary.entryCount !== index.entries.length
    || summary.selectedCurrentCount + summary.currentUnavailableCount !== index.entries.length
    || summary.currentUnavailableCount !== unavailableEntries.length
    || summary.baziExpertReviewPacketCurrentAvailable
      !== index.nonVersionedSelections?.baziExpertReviewPacket?.currentAvailable) {
    fail("CURRENT_AVAILABILITY_DRIFT", "current availability summary is not the fixed fail-closed projection");
  }
  const checkpoint = summary.historyCheckpoint;
  if (checkpoint?.path !== "content/system-admission/history-checkpoint.v2.json"
    || checkpoint?.checkpointId !== "hakimi.repository/history-checkpoint/2.0.0"
    || checkpoint?.familyCount !== 25
    || checkpoint?.memberCount !== 78
    || !regexpTest(SHA256, checkpoint?.rawSha256 ?? "")
    || !regexpTest(SHA256, checkpoint?.checkpointDigest ?? "")
    || !regexpTest(SHA256, checkpoint?.familyInventoryDigest ?? "")
    || !regexpTest(SHA256, checkpoint?.historyRootDigest ?? "")) {
    fail("HISTORY_CHECKPOINT_BOUNDARY_DRIFT",
      "status projection requires the exact identity-only history checkpoint boundary");
  }
  const governance = summary.projectReleaseGovernance;
  if (governance?.activeLine !== "legacy-v13"
    || governance?.targetSchema !== 13
    || governance?.migrationId !== null) {
    fail("PROJECT_GOVERNANCE_DRIFT", "status projection may only report legacy-v13 / 13 / null");
  }
  if (!summary.authorityBoundary
    || arraySome(objectValues(summary.authorityBoundary), (value) => value !== false)) {
    fail("AUTHORITY_PROMOTION", "status projection may not promote authority");
  }
  if (summary.snapshotBoundary?.crossFileAtomicSnapshot !== false
    || summary.snapshotBoundary?.mutationEpochAvailableForSchema13 !== false
    || summary.snapshotBoundary?.mutationEpochReceipt !== null
    || summary.snapshotBoundary?.intervalMutationExcludedAcrossFiles !== false
    || summary.snapshotBoundary?.abaExcluded !== false
    || summary.snapshotBoundary?.indexDigestIsDigitalSignature !== false) {
    fail("SNAPSHOT_BOUNDARY_DRIFT", "status projection may not promote snapshot guarantees");
  }
  if (summary.selectionBoundary?.familyHeadMeansHighestPersistedVersionOnly !== true
    || summary.selectionBoundary?.selectedCurrentMeansRepositorySelectionOnly !== true
    || summary.selectionBoundary?.selectedCurrentDoesNotEstablishFormalAdmission !== true
    || summary.selectionBoundary?.latestVersionDoesNotImplyAuthority !== true
    || summary.selectionBoundary?.automaticPromotionAllowed !== false) {
    fail("SELECTION_BOUNDARY_DRIFT", "status projection may not promote repository selection to authority");
  }
  for (const entry of index.entries) {
    if ((entry.selectedCurrent === null)
      !== (entry.selectionState === "historical_head_current_unavailable")) {
      fail("CURRENT_AVAILABILITY_DRIFT", `${entry.familyKey} selection state is inconsistent`);
    }
  }
  requireExpertPacketSelectionBoundary(index.nonVersionedSelections?.baziExpertReviewPacket);
}

function requireExpertPacketSelectionBoundary(packet) {
  const historicalAnchor = HISTORICAL_BAZI_EXPERT_REVIEW_PACKET;
  if (packet?.historicalAnchorVerifiedByCurrentLoad !== false
    || packet?.historicalAnchor?.path !== historicalAnchor.path
    || packet?.historicalAnchor?.rawBytes !== historicalAnchor.rawBytes
    || packet?.historicalAnchor?.rawSha256 !== historicalAnchor.rawSha256
    || packet?.historicalAnchor?.packetId !== historicalAnchor.packetId
    || packet?.historicalAnchor?.packetDigest !== historicalAnchor.packetDigest) {
    fail("NON_VERSIONED_SELECTION_DRIFT", "Bazi expert history must retain its original identity without a fresh historical verification claim");
  }
  const selected = packet.selectedCurrent;
  if (selected === null) {
    if (packet.currentAvailable !== false
      || packet.driftReasons?.length !== 1
      || packet.driftReasons[0]?.code !== "current_expert_review_packet_not_selected") {
      fail("NON_VERSIONED_SELECTION_DRIFT", "an unselected Bazi expert packet must remain explicitly unavailable");
    }
  } else if (packet.currentAvailable !== true
    || packet.driftReasons?.length !== 0
    || selected?.path !== "content/bazi-strength-expert-review-packet.current.json"
    || selected?.version !== "1.6.0"
    || selected?.packetId !== "hakimi.bazi.strength.expert-review-packet/1.6.0"
    || !NUMBER_IS_SAFE_INTEGER(selected?.rawBytes)
    || selected.rawBytes <= 0
    || !regexpTest(SHA256, selected?.rawSha256 ?? "")
    || !regexpTest(SHA256, selected?.packetDigest ?? "")) {
    fail("NON_VERSIONED_SELECTION_DRIFT", "Bazi expert current must retain the exact verified engineering packet binding");
  }
}

export function buildCurrentIndexStatusProjection(index) {
  const summary = getCurrentIndexSummary(index);
  requireStatusBoundary(index, summary);
  const unavailableFamilyKeys = index.entries
    .filter((entry) => entry.selectedCurrent === null)
    .map((entry) => entry.familyKey);
  const projection = {
    schemaVersion: "1.0.0",
    recordType: STATUS_RECORD_TYPE,
    source: {
      path: CURRENT_INDEX_RELATIVE_PATH,
      indexId: summary.indexId,
      indexDigest: summary.indexDigest,
      rawBytes: summary.artifact.rawBytes,
      rawSha256: summary.artifact.rawSha256,
      machineSourceOnly: true,
      humanDocumentIsAuthority: false
    },
    historyCheckpoint: {
      ...summary.historyCheckpoint,
      identityMechanicallyVerified:
        summary.historyCheckpointIdentityMechanicallyVerified,
      fullHistoryVerifiedByCurrentIndexLoad:
        summary.fullHistoryVerifiedByCurrentIndexLoad
    },
    currentAvailability: {
      state: unavailableFamilyKeys.length === 0 ? "available" : "unavailable",
      unavailableFamilyCount: summary.currentUnavailableCount,
      unavailableFamilyKeys,
      baziCurrentManifestAvailable: summary.baziCurrentManifestAvailable,
      baziCurrentMachineIdentityAvailable:
        summary.baziCurrentMachineIdentityAvailable,
      baziExpertReviewPacketCurrentAvailable:
        summary.baziExpertReviewPacketCurrentAvailable,
      currentFourSystemStatusAvailable: summary.currentFourSystemStatusAvailable,
      westernCurrentManifestAvailable: summary.westernCurrentManifestAvailable,
      ziweiCurrentManifestAvailable: summary.ziweiCurrentManifestAvailable,
      vedicCurrentManifestAvailable: summary.vedicCurrentManifestAvailable,
      bundledKnowledgeManifestAvailable: summary.bundledKnowledgeManifestAvailable,
      latestPersistedArtifactDoesNotImplyCurrent: true
    },
    selectionCounts: { ...summary.selectionCounts },
    projectReleaseGovernance: { ...summary.projectReleaseGovernance },
    authorityBoundary: { ...summary.authorityBoundary },
    snapshotBoundary: { ...summary.snapshotBoundary },
    selectionBoundary: { ...summary.selectionBoundary },
    nonVersionedSelections: {
      baziExpertReviewPacket: {
        currentAvailable: index.nonVersionedSelections.baziExpertReviewPacket.currentAvailable,
        selectedCurrent: projectedExpertBinding(
          index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent
        ),
        historicalAnchorVerifiedByCurrentLoad: false,
        historicalAnchor: {
          ...index.nonVersionedSelections.baziExpertReviewPacket.historicalAnchor
        },
        driftReasons: index.nonVersionedSelections.baziExpertReviewPacket.driftReasons.map(
          (reason) => ({ ...reason })
        )
      }
    },
    entries: index.entries.map((entry) => ({
      familyKey: entry.familyKey,
      selectionState: entry.selectionState,
      head: projectedBinding(entry.head),
      selectedCurrent: projectedBinding(entry.selectedCurrent)
    }))
  };
  if (!SHA256.test(projection.source.indexDigest)
    || !SHA256.test(projection.source.rawSha256)) {
    fail("STATUS_SOURCE_IDENTITY_INVALID", "status source identity is not lowercase SHA-256");
  }
  return deepFreeze(projection);
}

export function renderCurrentIndexStatusMachineBlock(index) {
  const projection = buildCurrentIndexStatusProjection(index);
  return [
    CURRENT_INDEX_MACHINE_BLOCK_BEGIN,
    "```json",
    JSON.stringify(projection, null, 2),
    "```",
    CURRENT_INDEX_MACHINE_BLOCK_END
  ].join("\n");
}

export function renderCurrentIndexStatusDocument(index) {
  return [
    "# Canonical Current Index 状态投影",
    "",
    `本页是 \`${CURRENT_INDEX_RELATIVE_PATH}\` 的机器投影，不是独立的 current、正式准入或发布授权来源。`,
    "人工叙述、历史状态文档、最高版本号和 SHA-256 均不得单独提升任何 current 或 authority 状态。",
    "",
    renderCurrentIndexStatusMachineBlock(index),
    ""
  ].join("\n");
}

function countToken(text, token) {
  return text.split(token).length - 1;
}

export function renderReadmeCurrentStatusEntrypointBlock() {
  return README_CURRENT_STATUS_ENTRYPOINT_BLOCK;
}

export function assertReadmeCurrentStatusEntrypointText(text) {
  if (typeof text !== "string" || text.startsWith("\uFEFF")) {
    fail("README_ENTRYPOINT_INVALID", "README must be UTF-8 text without BOM");
  }
  if (countToken(text, CURRENT_STATUS_ENTRYPOINT_BLOCK_BEGIN) !== 1
    || countToken(text, CURRENT_STATUS_ENTRYPOINT_BLOCK_END) !== 1
    || !text.includes(README_CURRENT_STATUS_ENTRYPOINT_BLOCK)) {
    fail("README_ENTRYPOINT_MISMATCH", "README does not expose the exact canonical current entrypoint block");
  }
  return true;
}

export function assertCurrentIndexStatusText(index, text) {
  if (typeof text !== "string" || text.startsWith("\uFEFF")) {
    fail("STATUS_DOCUMENT_INVALID", "status document must be UTF-8 text without BOM");
  }
  if (countToken(text, CURRENT_INDEX_MACHINE_BLOCK_BEGIN) !== 1
    || countToken(text, CURRENT_INDEX_MACHINE_BLOCK_END) !== 1) {
    fail("MACHINE_BLOCK_COUNT_INVALID", "status document must contain exactly one machine block");
  }
  const expected = renderCurrentIndexStatusDocument(index);
  if (text !== expected) {
    fail("STATUS_DOCUMENT_MISMATCH", "status document is not the exact current-index projection");
  }
  return buildCurrentIndexStatusProjection(index);
}

export async function loadCurrentIndexStatus(workspaceRoot = process.cwd()) {
  const index = await loadCurrentIndex(workspaceRoot);
  let snapshot;
  let readmeSnapshot;
  try {
    [snapshot, readmeSnapshot] = await Promise.all([
      readBaziDttStableWorkspaceArtifact(
        workspaceRoot,
        CURRENT_INDEX_STATUS_RELATIVE_PATH
      ),
      readBaziDttStableWorkspaceArtifact(
        workspaceRoot,
        CURRENT_INDEX_README_RELATIVE_PATH
      )
    ]);
  } catch (cause) {
    fail(
      "CURRENT_INDEX_STATUS_ENDPOINT_INVALID",
      "current-index status projection is missing, aliased, linked, or unstable",
      cause
    );
  }
  const text = Buffer.from(snapshot.bytes).toString("utf8");
  const readmeText = Buffer.from(readmeSnapshot.bytes).toString("utf8");
  const projection = assertCurrentIndexStatusText(index, text);
  assertReadmeCurrentStatusEntrypointText(readmeText);
  const result = deepFreeze({
    path: CURRENT_INDEX_STATUS_RELATIVE_PATH,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    readmeEntrypoint: {
      path: CURRENT_INDEX_README_RELATIVE_PATH,
      rawBytes: readmeSnapshot.rawBytes,
      rawSha256: readmeSnapshot.rawSha256
    },
    projection
  });
  weakSetAdd(VERIFIED_STATUS, result);
  return result;
}

export const verifyCurrentIndexStatus = loadCurrentIndexStatus;

export function isVerifiedCurrentIndexStatus(value) {
  return value !== null && typeof value === "object" && weakSetHas(VERIFIED_STATUS, value);
}

export function getCurrentIndexStatusSummary(value) {
  if (!isVerifiedCurrentIndexStatus(value)) {
    fail("CURRENT_INDEX_STATUS_PRIVATE_BRAND_REQUIRED", "verified status projection required");
  }
  const projection = value.projection;
  return deepFreeze({
    currentIndexStatusMechanicallyVerified: true,
    source: { ...projection.source },
    historyCheckpoint: { ...projection.historyCheckpoint },
    currentAvailability: { ...projection.currentAvailability },
    selectionCounts: { ...projection.selectionCounts },
    projectReleaseGovernance: { ...projection.projectReleaseGovernance },
    authorityBoundary: { ...projection.authorityBoundary },
    snapshotBoundary: { ...projection.snapshotBoundary },
    selectionBoundary: { ...projection.selectionBoundary },
    nonVersionedSelections: {
      baziExpertReviewPacket: {
        currentAvailable:
          projection.nonVersionedSelections.baziExpertReviewPacket.currentAvailable,
        selectedCurrent: projectedExpertBinding(
          projection.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent
        ),
        historicalAnchorVerifiedByCurrentLoad: false,
        historicalAnchor: {
          ...projection.nonVersionedSelections.baziExpertReviewPacket.historicalAnchor
        },
        driftReasons: projection.nonVersionedSelections.baziExpertReviewPacket.driftReasons.map(
          (reason) => ({ ...reason })
        )
      }
    },
    familyCount: projection.entries.length,
    artifact: {
      path: value.path,
      rawBytes: value.rawBytes,
      rawSha256: value.rawSha256
    },
    readmeEntrypoint: { ...value.readmeEntrypoint }
  });
}

export const currentIndexStatusTestOnly = OBJECT_FREEZE({
  README_CURRENT_STATUS_ENTRYPOINT_BLOCK,
  STATUS_RECORD_TYPE,
  deepFreeze,
  requireExpertPacketSelectionBoundary,
  requireStatusBoundary
});
