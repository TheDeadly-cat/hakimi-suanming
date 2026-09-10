import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  compareRepositoryVersions,
  CURRENT_FAMILY_POLICIES,
  CURRENT_FAMILY_POLICY_BY_KEY,
  parseRepositoryVersion,
  VERSIONED_JSON_FILE_PATTERN
} from "./current-family-policies.mjs";

const REFLECT_APPLY = Reflect.apply;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_HAS = WeakMap.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const REGEXP_EXEC = RegExp.prototype.exec;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_HAS_OWN = Object.hasOwn;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const ARRAY_SLICE = Array.prototype.slice;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const NATIVE_SET = Set;
const SET_HAS = Set.prototype.has;
const SET_ADD = Set.prototype.add;
const SET_DELETE = Set.prototype.delete;
const PATH_RESOLVE = path.resolve;
const PATH_RELATIVE = path.relative;
const PATH_IS_ABSOLUTE = path.isAbsolute;

function weakMapGet(map, key) {
  return REFLECT_APPLY(WEAK_MAP_GET, map, [key]);
}

function weakMapSet(map, key, value) {
  return REFLECT_APPLY(WEAK_MAP_SET, map, [key, value]);
}

function weakMapHas(map, key) {
  return REFLECT_APPLY(WEAK_MAP_HAS, map, [key]);
}

function weakSetAdd(set, value) {
  return REFLECT_APPLY(WEAK_SET_ADD, set, [value]);
}

function weakSetHas(set, value) {
  return REFLECT_APPLY(WEAK_SET_HAS, set, [value]);
}

function weakSetDelete(set, value) {
  return REFLECT_APPLY(WEAK_SET_DELETE, set, [value]);
}

function regexExec(expression, value) {
  return REFLECT_APPLY(REGEXP_EXEC, expression, [value]);
}

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function setAdd(set, value) {
  return REFLECT_APPLY(SET_ADD, set, [value]);
}

function setDelete(set, value) {
  return REFLECT_APPLY(SET_DELETE, set, [value]);
}

function objectHasOwn(value, key) {
  return REFLECT_APPLY(OBJECT_HAS_OWN, Object, [value, key]);
}

function objectGetPrototypeOf(value) {
  return REFLECT_APPLY(OBJECT_GET_PROTOTYPE_OF, Object, [value]);
}

function objectGetOwnPropertyDescriptor(value, key) {
  return REFLECT_APPLY(OBJECT_GET_OWN_PROPERTY_DESCRIPTOR, Object, [value, key]);
}

function reflectOwnKeys(value) {
  return REFLECT_APPLY(REFLECT_OWN_KEYS, Reflect, [value]);
}

function readOwnJsonDataProperty(value, key, label) {
  const descriptor = objectGetOwnPropertyDescriptor(value, key);
  if (descriptor === undefined
    || !objectHasOwn(descriptor, "value")
    || descriptor.enumerable !== true) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label} 必须是 enumerable own data property。`);
  }
  return descriptor.value;
}

export const HISTORY_CHECKPOINT_RELATIVE_PATH =
  "content/system-admission/history-checkpoint.v2.json";

export const PREVIOUS_HISTORY_CHECKPOINT = OBJECT_FREEZE({
  path: "content/system-admission/history-checkpoint.v1.json",
  rawBytes: 36_579,
  rawSha256: "65dceb6bccbe90b5526980f42edc78670587eef5cb27be90780a96c94e9f35ee",
  checkpointId: "hakimi.repository/history-checkpoint/1.0.0",
  checkpointDigest: "2314e8865513bfb852fb40068acb8c1964025f8e3a60528cc84bda65690c3b8a",
  memberCount: 77
});

// The original checkpoint covers multi-version families only. Keep this
// existing single-file historical anchor separate, without rewriting that
// checkpoint or presenting its identity-only load as a fresh packet check.
export const HISTORICAL_BAZI_EXPERT_REVIEW_PACKET = OBJECT_FREEZE({
  path: "content/bazi-strength-expert-review-packet.v1.json",
  rawBytes: 12_684,
  rawSha256: "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
  packetId: "hakimi.bazi.strength.expert-review-packet/1.5.0",
  packetDigest: "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f"
});

const SCHEMA_VERSION = "1.0.0";
const RECORD_TYPE = "canonical_repository_history_checkpoint_v1";
const CHECKPOINT_ID = "hakimi.repository/history-checkpoint/2.0.0";
const EXPECTED_FAMILY_COUNT = 25;
const EXPECTED_MEMBER_COUNT = 78;
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const FAMILY_HISTORY_DOMAIN = "hakimi.repository.history-checkpoint.v1/family-history";
const MEMBER_INVENTORY_DOMAIN = "hakimi.repository.history-checkpoint.v1/member-inventory";
const FAMILY_INVENTORY_DOMAIN = "hakimi.repository.history-checkpoint.v1/family-inventory";
const HISTORY_ROOT_DOMAIN = "hakimi.repository.history-checkpoint.v1/history-root";
const CHECKPOINT_DOMAIN = "hakimi.repository.history-checkpoint.v1/checkpoint";

const SCOPE = OBJECT_FREEZE({
  root: "content",
  familyClassification: "versioned_json_family_with_at_least_two_members",
  familyCount: EXPECTED_FAMILY_COUNT,
  memberCount: EXPECTED_MEMBER_COUNT
});

const AUTHORITY_BOUNDARY = OBJECT_FREEZE({
  formalAdmissionAuthorized: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false,
  historicalArtifactImmutabilityEstablished: false
});

const SNAPSHOT_BOUNDARY = OBJECT_FREEZE({
  crossFileAtomicSnapshot: false,
  mutationEpochAvailableForSchema13: false,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false,
  historyRootDigestIsDigitalSignature: false,
  checkpointDigestIsDigitalSignature: false
});

// The checkpoint cannot contain its own raw identity. Production identity
// loading therefore requires this verifier-local, out-of-band pin.
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 36579,
  rawSha256: "e1eba8f4d7a7ed7ffbe343cf8cc4c7dd2a453cba27a8d0b090da9b6cfb67c7ff",
  historyRootDigest: "aa4aa5ea9a1774202c6bc1064e26d37119ed1e2af5bc22c013bd0fc4404debb5",
  checkpointDigest: "4b245ecf7f3493edf7654e882eb9735116a2b5d8ea0fcdb289ed8271720187e7"
});

const VERIFIED_IDENTITIES = new WeakMap();
const VERIFIED_FULL_CHECKPOINTS = new WeakMap();
const STABLE_CHECKPOINT_SNAPSHOTS = new WeakSet();

export class HistoryCheckpointError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "HistoryCheckpointError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new HistoryCheckpointError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizePath(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function insideRoot(root, candidate) {
  const relative = PATH_RELATIVE(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !PATH_IS_ABSOLUTE(relative));
}

function sameDirectoryIdentity(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function hasCauseCode(error, code) {
  let current = error;
  for (let depth = 0; current && depth < 16; depth += 1) {
    if (current.code === code) return true;
    current = current.cause;
  }
  return false;
}

function deepFreeze(value, seen = new NATIVE_SET()) {
  if (value === null || typeof value !== "object" || setHas(seen, value)) return value;
  setAdd(seen, value);
  for (const key of OBJECT_KEYS(value)) deepFreeze(value[key], seen);
  return OBJECT_FREEZE(value);
}

function cloneJson(value) {
  const active = new NATIVE_SET();
  let nodes = 0;
  const clone = (node, depth) => {
    nodes += 1;
    if (nodes > 1_000_000 || depth > 128) {
      fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 结构超限。");
    }
    if (node === null || typeof node === "boolean" || typeof node === "string") {
      return node;
    }
    if (typeof node === "number") {
      if (!NUMBER_IS_FINITE(node) || OBJECT_IS(node, -0)) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 包含非 canonical JSON 数值。");
      }
      return node;
    }
    if (typeof node !== "object" || setHas(active, node)) {
      fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 不是无循环 JSON 数据。");
    }
    setAdd(active, node);
    let copy;
    if (ARRAY_IS_ARRAY(node)) {
      if (reflectOwnKeys(node).length !== node.length + 1) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 数组不得包含额外属性。");
      }
      copy = [];
      for (let index = 0; index < node.length; index += 1) {
        OBJECT_DEFINE_PROPERTY(copy, String(index), {
          value: clone(
            readOwnJsonDataProperty(node, String(index), `checkpoint clone[${index}]`),
            depth + 1
          ),
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
    } else {
      const prototype = objectGetPrototypeOf(node);
      if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 对象原型无效。");
      }
      const keys = OBJECT_KEYS(node);
      if (reflectOwnKeys(node).length !== keys.length) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint clone 对象不得包含额外属性。");
      }
      copy = OBJECT_CREATE(prototype);
      for (const key of keys) {
        OBJECT_DEFINE_PROPERTY(copy, key, {
          value: clone(
            readOwnJsonDataProperty(node, key, `checkpoint clone.${key}`),
            depth + 1
          ),
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
    }
    setDelete(active, node);
    return copy;
  };
  return clone(value, 0);
}

function canonicalStringify(value) {
  const seen = new NATIVE_SET();
  let nodes = 0;
  const render = (node, depth) => {
    nodes += 1;
    if (nodes > 1_000_000 || depth > 128) {
      fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 结构超限。");
    }
    if (node === null || typeof node === "boolean" || typeof node === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [node]);
    }
    if (typeof node === "number") {
      if (!NUMBER_IS_FINITE(node) || OBJECT_IS(node, -0)) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 数值不是 canonical JSON 数值。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [node]);
    }
    if (typeof node !== "object" || setHas(seen, node)) {
      fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 不是无别名 JSON 数据。");
    }
    setAdd(seen, node);
    let rendered;
    if (ARRAY_IS_ARRAY(node)) {
      if (reflectOwnKeys(node).length !== node.length + 1) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 数组不得包含额外属性。");
      }
      rendered = "[";
      for (let index = 0; index < node.length; index += 1) {
        if (index > 0) rendered += ",";
        rendered += render(
          readOwnJsonDataProperty(node, String(index), `checkpoint[${index}]`),
          depth + 1
        );
      }
      rendered += "]";
    } else {
      const prototype = objectGetPrototypeOf(node);
      if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 对象原型无效。");
      }
      const keys = OBJECT_KEYS(node);
      if (reflectOwnKeys(node).length !== keys.length) {
        fail("CHECKPOINT_SHAPE_INVALID", "checkpoint 对象不得包含额外属性。");
      }
      REFLECT_APPLY(ARRAY_SORT, keys, []);
      rendered = "{";
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (index > 0) rendered += ",";
        rendered += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${render(
          readOwnJsonDataProperty(node, key, `checkpoint.${key}`),
          depth + 1
        )}`;
      }
      rendered += "}";
    }
    setDelete(seen, node);
    return rendered;
  };
  return render(value, 0);
}

function digest(domain, value) {
  return sha256(Buffer.from(`${domain}\0${canonicalStringify(value)}`, "utf8"));
}

function exactKeys(value, expected, code, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(code, `${label} 必须是对象。`);
  }
  const actual = OBJECT_KEYS(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} 字段集合不匹配。`);
  }
}

function exactValue(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function parseCheckpointSnapshot(snapshot) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    if (hasCauseCode(cause, "JSON_DUPLICATE_KEY")) {
      fail("CHECKPOINT_JSON_DUPLICATE_KEY", snapshot.path, cause);
    }
    fail("CHECKPOINT_JSON_INVALID", snapshot.path, cause);
  }
}

function parseMemberSnapshot(snapshot) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    if (hasCauseCode(cause, "JSON_DUPLICATE_KEY")) {
      fail("HISTORICAL_MEMBER_JSON_DUPLICATE_KEY", snapshot.path, cause);
    }
    fail("HISTORICAL_MEMBER_JSON_INVALID", snapshot.path, cause);
  }
}

function parseVersion(raw, code = "FAMILY_VERSION_INVALID") {
  try {
    return parseRepositoryVersion(raw);
  } catch (cause) {
    fail(code, String(raw), cause);
  }
}

function bindingInventoryProjection(binding) {
  return { version: binding.version, path: binding.path };
}

export function computeMemberInventoryDigest(familyKey, members) {
  return digest(MEMBER_INVENTORY_DOMAIN, {
    familyKey,
    members: members.map(bindingInventoryProjection)
  });
}

export function computeOrderedHistoryDigest(familyKey, lineageMode, members) {
  return digest(FAMILY_HISTORY_DOMAIN, { familyKey, lineageMode, members });
}

export function computeFamilyInventoryDigest(families) {
  return digest(FAMILY_INVENTORY_DOMAIN, families.map((family) => ({
    familyKey: family.familyKey,
    members: family.members.map(bindingInventoryProjection)
  })));
}

export function computeHistoryRootDigest(families) {
  return digest(HISTORY_ROOT_DOMAIN, families);
}

export function computeHistoryCheckpointDigest(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail("CHECKPOINT_SHAPE_INVALID", "history checkpoint 必须是对象。");
  }
  const unsigned = {};
  for (const key of OBJECT_KEYS(value)) {
    if (key !== "checkpointDigest") unsigned[key] = value[key];
  }
  return digest(CHECKPOINT_DOMAIN, unsigned);
}

export function serializeHistoryCheckpoint(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

async function readRepositoryFamilyInventory(workspaceRoot) {
  const requestedRoot = PATH_RESOLVE(workspaceRoot);
  const requestedContentRoot = PATH_RESOLVE(requestedRoot, "content");
  let rootReal;
  let contentRootReal;
  try {
    [rootReal, contentRootReal] = await Promise.all([
      realpath(requestedRoot),
      realpath(requestedContentRoot)
    ]);
  } catch (cause) {
    fail("HISTORY_INVENTORY_INVALID", "无法解析 content 历史 inventory。", cause);
  }
  if (normalizePath(rootReal) !== normalizePath(requestedRoot)
    || normalizePath(contentRootReal) !== normalizePath(requestedContentRoot)
    || !insideRoot(rootReal, contentRootReal)) {
    fail("HISTORY_INVENTORY_INVALID", "content 历史 inventory 根路径不安全。");
  }

  const versionedMembers = [];
  const walk = async (absoluteDirectory, relativeDirectory) => {
    let before;
    let directoryReal;
    let entries;
    try {
      [before, directoryReal, entries] = await Promise.all([
        lstat(absoluteDirectory, { bigint: true }),
        realpath(absoluteDirectory),
        readdir(absoluteDirectory, { withFileTypes: true })
      ]);
    } catch (cause) {
      fail("HISTORY_INVENTORY_INVALID", relativeDirectory, cause);
    }
    if (!before.isDirectory()
      || before.isSymbolicLink()
      || normalizePath(directoryReal) !== normalizePath(absoluteDirectory)
      || !insideRoot(contentRootReal, directoryReal)) {
      fail("HISTORY_INVENTORY_INVALID", relativeDirectory);
    }

    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolute = PATH_RESOLVE(absoluteDirectory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      if (!insideRoot(contentRootReal, absolute)) {
        fail("HISTORY_INVENTORY_INVALID", relative);
      }
      let metadata;
      try {
        metadata = await lstat(absolute, { bigint: true });
      } catch (cause) {
        fail("HISTORY_INVENTORY_INVALID", relative, cause);
      }
      if (metadata.isSymbolicLink() || entry.isSymbolicLink()) {
        fail("HISTORY_INVENTORY_INVALID", `${relative} 拒绝链接端点。`);
      }
      if (metadata.isDirectory() && entry.isDirectory()) {
        await walk(absolute, relative);
        continue;
      }
      const match = regexExec(VERSIONED_JSON_FILE_PATTERN, entry.name);
      if (match === null) continue;
      if (!metadata.isFile() || !entry.isFile() || metadata.nlink !== 1n) {
        fail("HISTORY_INVENTORY_INVALID", `${relative} 不是单链普通文件。`);
      }
      // Checkpoints describe the content inventory; they are not members of it.
      // Both fixed checkpoint endpoints are validated by their own raw identities.
      if (relative === HISTORY_CHECKPOINT_RELATIVE_PATH
        || relative === PREVIOUS_HISTORY_CHECKPOINT.path) continue;
      versionedMembers.push({
        familyKey: `${relativeDirectory}/${match[1]}`,
        path: relative,
        parsedVersion: parseVersion(match[2])
      });
    }

    let after;
    let afterReal;
    try {
      [after, afterReal] = await Promise.all([
        lstat(absoluteDirectory, { bigint: true }),
        realpath(absoluteDirectory)
      ]);
    } catch (cause) {
      fail("HISTORY_INVENTORY_INVALID", relativeDirectory, cause);
    }
    if (!sameDirectoryIdentity(before, after)
      || normalizePath(afterReal) !== normalizePath(directoryReal)) {
      fail("HISTORY_INVENTORY_CHANGED", relativeDirectory);
    }
  };

  await walk(requestedContentRoot, "content");
  const grouped = new Map();
  for (const member of versionedMembers) {
    const members = grouped.get(member.familyKey) ?? [];
    members.push(member);
    grouped.set(member.familyKey, members);
  }

  const observedFamilies = [];
  for (const [familyKey, members] of grouped) {
    if (members.length < 2) continue;
    members.sort((left, right) => (
      compareRepositoryVersions(left.parsedVersion, right.parsedVersion)
    ));
    for (let index = 1; index < members.length; index += 1) {
      if (compareRepositoryVersions(
        members[index - 1].parsedVersion,
        members[index].parsedVersion
      ) === 0) {
        fail("FAMILY_VERSION_COLLISION", familyKey);
      }
    }
    observedFamilies.push({
      familyKey,
      members: members.map((member) => OBJECT_FREEZE({
        version: member.parsedVersion.normalized,
        path: member.path
      }))
    });
  }
  observedFamilies.sort((left, right) => left.familyKey.localeCompare(right.familyKey, "en"));

  const expectedKeys = CURRENT_FAMILY_POLICIES
    .map((entry) => entry.familyKey)
    .sort((left, right) => left.localeCompare(right, "en"));
  const actualKeys = observedFamilies.map((entry) => entry.familyKey);
  const extras = actualKeys.filter((key) => !expectedKeys.includes(key));
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
  if (extras.length > 0) fail("UNINDEXED_VERSION_FAMILY", extras.join(", "));
  if (missing.length > 0) fail("INDEXED_VERSION_FAMILY_MISSING", missing.join(", "));

  const byKey = new Map(observedFamilies.map((entry) => [entry.familyKey, entry]));
  return deepFreeze(CURRENT_FAMILY_POLICIES.map((policy) => ({
    familyKey: policy.familyKey,
    members: byKey.get(policy.familyKey).members
  })));
}

function memberIdentity(value, policy, snapshot, inventoryMember) {
  const artifactId = value?.[policy.idField];
  const semanticDigestField = policy.memberDigestFields.find(
    (field) => typeof value?.[field] === "string"
  );
  const semanticDigest = semanticDigestField === undefined
    ? null
    : value[semanticDigestField];
  if (typeof artifactId !== "string" || artifactId.length === 0) {
    fail("HISTORICAL_MEMBER_ID_MISMATCH", `${snapshot.path} 缺少 ${policy.idField}。`);
  }
  if (policy.memberDigestFields.length > 0
    && (typeof semanticDigest !== "string"
      || regexExec(SHA256_PATTERN, semanticDigest) === null)) {
    fail("HISTORICAL_MEMBER_DIGEST_MISMATCH",
      `${snapshot.path} 缺少合法 ${policy.memberDigestFields.join("/")}。`);
  }
  return OBJECT_FREEZE({
    version: inventoryMember.version,
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    artifactIdField: policy.idField,
    artifactId,
    semanticDigestField: semanticDigestField ?? null,
    semanticDigest
  });
}

async function loadHistoricalMember(workspaceRoot, policy, inventoryMember) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, inventoryMember.path);
  } catch (cause) {
    fail("HISTORICAL_MEMBER_UNREADABLE", inventoryMember.path, cause);
  }
  const value = parseMemberSnapshot(snapshot);
  return OBJECT_FREEZE({
    value,
    binding: memberIdentity(value, policy, snapshot, inventoryMember)
  });
}

function referenceDigest(reference, digestField) {
  if (digestField === null) return null;
  if (typeof reference[digestField] === "string") return reference[digestField];
  if (reference.semanticDigestField === digestField
    && typeof reference.semanticDigest === "string") return reference.semanticDigest;
  if (digestField === "manifestDigest"
    && typeof reference.persistedManifestDigest === "string") {
    return reference.persistedManifestDigest;
  }
  return null;
}

function referenceId(reference, idField) {
  if (typeof reference[idField] === "string") return reference[idField];
  if (reference.artifactIdField === idField
    && typeof reference.artifactId === "string") return reference.artifactId;
  if (typeof reference.id === "string") return reference.id;
  return null;
}

function referenceMatches(reference, predecessor, policy) {
  if (reference.path !== predecessor.binding.path
    || reference.rawBytes !== predecessor.binding.rawBytes) return false;
  const referencedSha = typeof reference.rawSha256 === "string"
    ? reference.rawSha256
    : reference.sha256;
  if (referencedSha !== predecessor.binding.rawSha256) return false;
  const id = referenceId(reference, predecessor.binding.artifactIdField);
  if (id !== null && id !== predecessor.binding.artifactId) return false;
  const semanticDigest = referenceDigest(
    reference,
    predecessor.binding.semanticDigestField
  );
  if (semanticDigest !== null && semanticDigest !== predecessor.binding.semanticDigest) {
    return false;
  }
  return true;
}

function verifyArtifactLineage(current, predecessor, policy) {
  const familyReferences = policy.lineageExtractor(current.value, policy);
  if (familyReferences.length === 0) {
    fail("PREDECESSOR_MISSING", `${current.binding.path} 没有 family predecessor。`);
  }
  const directReferences = familyReferences.filter(
    (reference) => reference.path === predecessor.binding.path
  );
  if (directReferences.length === 0) {
    fail("PREDECESSOR_CHAIN_BROKEN",
      `${current.binding.path} 未指向直接较低版本 ${predecessor.binding.path}。`);
  }
  if (!directReferences.some((reference) => referenceMatches(reference, predecessor, policy))) {
    fail("PREDECESSOR_IDENTITY_MISMATCH",
      `${current.binding.path} 的直接 predecessor 身份不匹配。`);
  }
}

async function readFullHistory(workspaceRoot, inventory) {
  const histories = [];
  for (const inventoryFamily of inventory) {
    const policy = CURRENT_FAMILY_POLICY_BY_KEY[inventoryFamily.familyKey];
    const loadedMembers = [];
    for (const inventoryMember of inventoryFamily.members) {
      loadedMembers.push(await loadHistoricalMember(workspaceRoot, policy, inventoryMember));
    }
    for (let index = 1; index < loadedMembers.length; index += 1) {
      const member = loadedMembers[index];
      const idMatchesVersion = policy.artifactIdVersionMode === "exact"
        ? member.binding.artifactId === member.binding.version
        : member.binding.artifactId.endsWith(`/${member.binding.version}`);
      if (!idMatchesVersion) {
        fail("HISTORICAL_MEMBER_ID_VERSION_MISMATCH", member.binding.path);
      }
      if (policy.lineageMode === "artifact") {
        verifyArtifactLineage(member, loadedMembers[index - 1], policy);
      } else if (policy.lineageMode !== "index_only_legacy") {
        fail("HISTORY_POLICY_INVALID", policy.familyKey);
      }
    }
    histories.push(OBJECT_FREEZE({
      familyKey: policy.familyKey,
      lineageMode: policy.lineageMode,
      members: OBJECT_FREEZE(loadedMembers.map((entry) => entry.binding))
    }));
  }
  return OBJECT_FREEZE(histories);
}

function familyRecord(history) {
  return OBJECT_FREEZE({
    familyKey: history.familyKey,
    lineageMode: history.lineageMode,
    memberCount: history.members.length,
    first: history.members[0],
    head: history.members.at(-1),
    memberInventoryDigest: computeMemberInventoryDigest(history.familyKey, history.members),
    orderedHistoryDigest: computeOrderedHistoryDigest(
      history.familyKey,
      history.lineageMode,
      history.members
    )
  });
}

async function verifyPreviousCheckpointPrefix(workspaceRoot, histories) {
  const pin = PREVIOUS_HISTORY_CHECKPOINT;
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, pin.path);
  } catch (cause) {
    fail("PREVIOUS_CHECKPOINT_UNAVAILABLE", pin.path, cause);
  }
  if (snapshot.rawBytes !== pin.rawBytes || snapshot.rawSha256 !== pin.rawSha256) {
    fail("PREVIOUS_CHECKPOINT_DRIFT", pin.path);
  }
  const previous = parseCheckpointSnapshot(snapshot);
  if (previous.checkpointId !== pin.checkpointId
    || previous.checkpointDigest !== pin.checkpointDigest
    || computeHistoryCheckpointDigest(previous) !== pin.checkpointDigest
    || previous.families.length !== histories.length) {
    fail("PREVIOUS_CHECKPOINT_DRIFT", pin.path);
  }
  let preservedMembers = 0;
  for (let index = 0; index < previous.families.length; index += 1) {
    const previousFamily = previous.families[index];
    const currentFamily = histories[index];
    if (!currentFamily || currentFamily.familyKey !== previousFamily.familyKey
      || currentFamily.members.length < previousFamily.memberCount) {
      fail("PREVIOUS_HISTORY_PREFIX_DRIFT", previousFamily.familyKey);
    }
    const prefix = familyRecord({
      familyKey: currentFamily.familyKey,
      lineageMode: currentFamily.lineageMode,
      members: REFLECT_APPLY(ARRAY_SLICE, currentFamily.members, [0, previousFamily.memberCount])
    });
    if (!exactValue(prefix, previousFamily)) {
      fail("PREVIOUS_HISTORY_PREFIX_DRIFT", previousFamily.familyKey);
    }
    preservedMembers += previousFamily.memberCount;
  }
  if (preservedMembers !== pin.memberCount) {
    fail("PREVIOUS_HISTORY_PREFIX_DRIFT", "previous member count changed");
  }
  return OBJECT_FREEZE({
    previousCheckpointMechanicallyVerified: true,
    previousCheckpointPath: pin.path,
    previousCheckpointRawSha256: pin.rawSha256,
    previousHistoryMembersPreserved: preservedMembers
  });
}

function checkpointFromHistory(inventory, histories, enforceFixedScope) {
  const memberCount = histories.reduce((count, family) => count + family.members.length, 0);
  if (enforceFixedScope
    && (histories.length !== EXPECTED_FAMILY_COUNT || memberCount !== EXPECTED_MEMBER_COUNT)) {
    fail("HISTORY_SCOPE_MISMATCH",
      `期望 ${EXPECTED_FAMILY_COUNT} families/${EXPECTED_MEMBER_COUNT} members，实际 ${histories.length}/${memberCount}。`);
  }
  const families = OBJECT_FREEZE(histories.map(familyRecord));
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    recordType: RECORD_TYPE,
    checkpointId: CHECKPOINT_ID,
    scope: SCOPE,
    families,
    familyInventoryDigest: computeFamilyInventoryDigest(inventory),
    historyRootDigest: computeHistoryRootDigest(families),
    authorityBoundary: AUTHORITY_BOUNDARY,
    snapshotBoundary: SNAPSHOT_BOUNDARY
  };
  return deepFreeze({
    ...unsigned,
    checkpointDigest: computeHistoryCheckpointDigest(unsigned)
  });
}

export async function buildExpectedHistoryCheckpoint(workspaceRoot = process.cwd()) {
  const inventoryBefore = await readRepositoryFamilyInventory(workspaceRoot);
  const histories = await readFullHistory(workspaceRoot, inventoryBefore);
  const inventoryAfter = await readRepositoryFamilyInventory(workspaceRoot);
  if (!exactValue(inventoryBefore, inventoryAfter)) {
    fail("HISTORY_INVENTORY_CHANGED", "content inventory 在 full history 读取期间变化。");
  }
  await verifyPreviousCheckpointPrefix(workspaceRoot, histories);
  return checkpointFromHistory(inventoryBefore, histories, true);
}

async function verifyHistoricalExpertReviewPacket(workspaceRoot) {
  const anchor = HISTORICAL_BAZI_EXPERT_REVIEW_PACKET;
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, anchor.path);
  } catch (cause) {
    fail("HISTORICAL_EXPERT_PACKET_UNAVAILABLE", anchor.path, cause);
  }
  if (snapshot.rawBytes !== anchor.rawBytes || snapshot.rawSha256 !== anchor.rawSha256) {
    fail("HISTORICAL_EXPERT_PACKET_DRIFT", anchor.path);
  }
  const packet = parseMemberSnapshot(snapshot);
  if (packet.packetId !== anchor.packetId || packet.packetDigest !== anchor.packetDigest) {
    fail("HISTORICAL_EXPERT_PACKET_DRIFT", anchor.path);
  }
  return anchor;
}

function assertDigest(value, code, label) {
  if (typeof value !== "string" || regexExec(SHA256_PATTERN, value) === null) {
    fail(code, `${label} 不是合法 SHA-256。`);
  }
}

function assertBindingShape(binding, policy, label, requireVersionedId) {
  exactKeys(binding, [
    "version", "path", "rawBytes", "rawSha256", "artifactIdField", "artifactId",
    "semanticDigestField", "semanticDigest"
  ], "CHECKPOINT_SHAPE_INVALID", label);
  const parsedVersion = parseVersion(binding.version, "CHECKPOINT_SHAPE_INVALID");
  if (parsedVersion.normalized !== binding.version
    || typeof binding.path !== "string"
    || !Number.isSafeInteger(binding.rawBytes)
    || binding.rawBytes <= 0) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label} 基础身份无效。`);
  }
  const pathMatch = regexExec(policy.relativePathPattern, binding.path);
  if (pathMatch === null
    || parseVersion(pathMatch[1], "CHECKPOINT_SHAPE_INVALID").normalized !== binding.version) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label} 路径版本不匹配。`);
  }
  assertDigest(binding.rawSha256, "CHECKPOINT_SHAPE_INVALID", `${label}.rawSha256`);
  if (binding.artifactIdField !== policy.idField
    || typeof binding.artifactId !== "string"
    || binding.artifactId.length === 0) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label} artifact ID 无效。`);
  }
  if (requireVersionedId) {
    const matches = policy.artifactIdVersionMode === "exact"
      ? binding.artifactId === binding.version
      : binding.artifactId.endsWith(`/${binding.version}`);
    if (!matches) fail("CHECKPOINT_SHAPE_INVALID", `${label} artifact ID 版本不匹配。`);
  }
  if (policy.memberDigestFields.length === 0) {
    if (binding.semanticDigestField !== null || binding.semanticDigest !== null) {
      fail("CHECKPOINT_SHAPE_INVALID", `${label} 不得伪造 semantic digest。`);
    }
  } else {
    if (!policy.memberDigestFields.includes(binding.semanticDigestField)) {
      fail("CHECKPOINT_SHAPE_INVALID", `${label} semantic digest field 无效。`);
    }
    assertDigest(binding.semanticDigest, "CHECKPOINT_SHAPE_INVALID",
      `${label}.semanticDigest`);
  }
}

function assertFamilyRecordShape(record, policy, index) {
  const label = `families[${index}]`;
  exactKeys(record, [
    "familyKey", "lineageMode", "memberCount", "first", "head",
    "memberInventoryDigest", "orderedHistoryDigest"
  ], "CHECKPOINT_SHAPE_INVALID", label);
  if (record.familyKey !== policy.familyKey || record.lineageMode !== policy.lineageMode) {
    fail("CHECKPOINT_FAMILY_SET_MISMATCH", policy.familyKey);
  }
  if (!Number.isSafeInteger(record.memberCount) || record.memberCount < 2) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label}.memberCount`);
  }
  assertBindingShape(record.first, policy, `${label}.first`, false);
  assertBindingShape(record.head, policy, `${label}.head`, true);
  const firstVersion = parseVersion(record.first.version, "CHECKPOINT_SHAPE_INVALID");
  const headVersion = parseVersion(record.head.version, "CHECKPOINT_SHAPE_INVALID");
  if (compareRepositoryVersions(firstVersion, headVersion) >= 0) {
    fail("CHECKPOINT_SHAPE_INVALID", `${label} first/head 数字版本顺序无效。`);
  }
  assertDigest(record.memberInventoryDigest, "CHECKPOINT_SHAPE_INVALID",
    `${label}.memberInventoryDigest`);
  assertDigest(record.orderedHistoryDigest, "CHECKPOINT_SHAPE_INVALID",
    `${label}.orderedHistoryDigest`);
}

function verifyIdentityValue(value) {
  exactKeys(value, [
    "schemaVersion", "recordType", "checkpointId", "scope", "families",
    "familyInventoryDigest", "historyRootDigest", "authorityBoundary",
    "snapshotBoundary", "checkpointDigest"
  ], "CHECKPOINT_SHAPE_INVALID", "history checkpoint");
  if (value.schemaVersion !== SCHEMA_VERSION
    || value.recordType !== RECORD_TYPE
    || value.checkpointId !== CHECKPOINT_ID
    || !Array.isArray(value.families)
    || value.families.length !== EXPECTED_FAMILY_COUNT) {
    fail("CHECKPOINT_SHAPE_INVALID", "history checkpoint 固定身份或 family 数量漂移。");
  }
  if (!exactValue(value.scope, SCOPE)) {
    fail("HISTORY_SCOPE_MISMATCH", "history checkpoint scope 漂移。");
  }
  if (!exactValue(value.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION", "history checkpoint 不得提升 authority。");
  }
  if (!exactValue(value.snapshotBoundary, SNAPSHOT_BOUNDARY)) {
    fail("SNAPSHOT_CLAIM_PROMOTION", "history checkpoint 不得提升 snapshot 声明。");
  }
  for (let index = 0; index < CURRENT_FAMILY_POLICIES.length; index += 1) {
    assertFamilyRecordShape(value.families[index], CURRENT_FAMILY_POLICIES[index], index);
  }
  const legacyFamilies = value.families.filter(
    (family) => family.lineageMode === "index_only_legacy"
  );
  if (legacyFamilies.length !== 1
    || legacyFamilies[0].familyKey !== "content/knowledge/manifest") {
    fail("HISTORY_POLICY_INVALID", "knowledge manifest 必须是唯一 index_only_legacy family。");
  }
  assertDigest(value.familyInventoryDigest, "CHECKPOINT_SHAPE_INVALID",
    "familyInventoryDigest");
  assertDigest(value.historyRootDigest, "CHECKPOINT_SHAPE_INVALID", "historyRootDigest");
  assertDigest(value.checkpointDigest, "CHECKPOINT_SHAPE_INVALID", "checkpointDigest");
  if (computeHistoryRootDigest(value.families) !== value.historyRootDigest) {
    fail("HISTORY_ROOT_DIGEST_MISMATCH", "history root 与 family records 不一致。");
  }
  if (computeHistoryCheckpointDigest(value) !== value.checkpointDigest) {
    fail("CHECKPOINT_DIGEST_MISMATCH", "history checkpoint self digest 漂移。");
  }
  return deepFreeze(cloneJson(value));
}

function compareBinding(actual, expected, label) {
  if (!exactValue(actual, expected)) {
    fail("HISTORICAL_MEMBER_IDENTITY_DRIFT", label);
  }
}

function compareFullProjection(actual, expected) {
  if (actual.familyInventoryDigest !== expected.familyInventoryDigest) {
    fail("FAMILY_INVENTORY_DIGEST_MISMATCH", "checkpoint 与当前 family inventory 不一致。");
  }
  for (let index = 0; index < expected.families.length; index += 1) {
    const actualFamily = actual.families[index];
    const expectedFamily = expected.families[index];
    if (actualFamily.familyKey !== expectedFamily.familyKey
      || actualFamily.lineageMode !== expectedFamily.lineageMode
      || actualFamily.memberCount !== expectedFamily.memberCount
      || actualFamily.memberInventoryDigest !== expectedFamily.memberInventoryDigest) {
      fail("FAMILY_MEMBER_INVENTORY_MISMATCH", expectedFamily.familyKey);
    }
    compareBinding(actualFamily.first, expectedFamily.first, `${expectedFamily.familyKey}.first`);
    compareBinding(actualFamily.head, expectedFamily.head, `${expectedFamily.familyKey}.head`);
    if (actualFamily.orderedHistoryDigest !== expectedFamily.orderedHistoryDigest) {
      fail("ORDERED_HISTORY_DIGEST_MISMATCH", expectedFamily.familyKey);
    }
  }
  if (actual.historyRootDigest !== expected.historyRootDigest) {
    fail("HISTORY_ROOT_DIGEST_MISMATCH", "full history root 与 checkpoint 不一致。");
  }
}

function checkpointFamilyByKey(checkpoint, familyKey) {
  return checkpoint.families.find((family) => family.familyKey === familyKey);
}

function assertInventoryMatchesCheckpoint(checkpoint, inventory) {
  for (const family of inventory) {
    const recorded = checkpointFamilyByKey(checkpoint, family.familyKey);
    if (recorded === undefined) fail("UNINDEXED_VERSION_FAMILY", family.familyKey);
    const actualHead = family.members.at(-1);
    const recordedHeadVersion = parseVersion(recorded.head.version, "CHECKPOINT_SHAPE_INVALID");
    const actualHeadVersion = parseVersion(actualHead.version);
    if (compareRepositoryVersions(actualHeadVersion, recordedHeadVersion) > 0) {
      fail("UNINDEXED_HIGHER_VERSION", family.familyKey);
    }
    const memberInventoryDigest = computeMemberInventoryDigest(
      family.familyKey,
      family.members
    );
    if (recorded.memberCount !== family.members.length
      || recorded.memberInventoryDigest !== memberInventoryDigest) {
      fail("FAMILY_MEMBER_INVENTORY_MISMATCH", family.familyKey);
    }
  }
  const memberCount = inventory.reduce((count, family) => count + family.members.length, 0);
  if (inventory.length !== checkpoint.scope.familyCount
    || memberCount !== checkpoint.scope.memberCount
    || computeFamilyInventoryDigest(inventory) !== checkpoint.familyInventoryDigest) {
    fail("FAMILY_INVENTORY_DIGEST_MISMATCH", "global family inventory 与 checkpoint 不一致。");
  }
}

export async function verifyHistoryCheckpointIdentity(
  workspaceRoot,
  value,
  snapshot = undefined
) {
  void workspaceRoot;
  if (snapshot === undefined || !weakSetHas(STABLE_CHECKPOINT_SNAPSHOTS, snapshot)) {
    fail("CHECKPOINT_SNAPSHOT_REQUIRED",
      "生产 identity brand 只能由 loadHistoryCheckpointIdentity 的稳定快照签发。");
  }
  const verified = verifyIdentityValue(value);
  const persistedText = Buffer.from(snapshot.bytes).toString("utf8");
  if (snapshot.path !== HISTORY_CHECKPOINT_RELATIVE_PATH
    || persistedText !== serializeHistoryCheckpoint(value)) {
    fail("CHECKPOINT_RAW_DRIFT", "checkpoint 必须是唯一 pretty JSON + LF materialization。");
  }
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || value.historyRootDigest !== EXPECTED_PERSISTED.historyRootDigest
    || value.checkpointDigest !== EXPECTED_PERSISTED.checkpointDigest) {
    fail("CHECKPOINT_RAW_DRIFT", "history checkpoint out-of-band pin 漂移。");
  }
  weakMapSet(VERIFIED_IDENTITIES, verified, OBJECT_FREEZE({
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  }));
  return verified;
}

export async function loadHistoryCheckpointIdentity(workspaceRoot = process.cwd()) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      HISTORY_CHECKPOINT_RELATIVE_PATH
    );
  } catch (cause) {
    if (hasCauseCode(cause, "ENOENT")) {
      fail("HISTORY_CHECKPOINT_MISSING", HISTORY_CHECKPOINT_RELATIVE_PATH, cause);
    }
    fail("CHECKPOINT_RAW_DRIFT",
      `无法稳定读取 ${HISTORY_CHECKPOINT_RELATIVE_PATH}。`, cause);
  }
  const parsed = parseCheckpointSnapshot(snapshot);
  weakSetAdd(STABLE_CHECKPOINT_SNAPSHOTS, snapshot);
  try {
    return await verifyHistoryCheckpointIdentity(workspaceRoot, parsed, snapshot);
  } finally {
    weakSetDelete(STABLE_CHECKPOINT_SNAPSHOTS, snapshot);
  }
}

export function isVerifiedHistoryCheckpointIdentity(value) {
  return value !== null && typeof value === "object" && weakMapHas(VERIFIED_IDENTITIES, value);
}

export async function verifyHistoryCheckpointInventory(workspaceRoot, checkpoint) {
  if (!isVerifiedHistoryCheckpointIdentity(checkpoint)) {
    fail("CHECKPOINT_IDENTITY_BRAND_REQUIRED",
      "inventory 校验需要 identity-only 私有品牌。");
  }
  const inventory = await readRepositoryFamilyInventory(workspaceRoot);
  assertInventoryMatchesCheckpoint(checkpoint, inventory);
  return deepFreeze({
    familyCount: inventory.length,
    memberCount: inventory.reduce((count, family) => count + family.members.length, 0),
    familyInventoryDigest: computeFamilyInventoryDigest(inventory)
  });
}

export async function loadHistoryCheckpoint(workspaceRoot = process.cwd()) {
  const checkpoint = await loadHistoryCheckpointIdentity(workspaceRoot);
  const inventoryBefore = await readRepositoryFamilyInventory(workspaceRoot);
  assertInventoryMatchesCheckpoint(checkpoint, inventoryBefore);
  const histories = await readFullHistory(workspaceRoot, inventoryBefore);
  const inventoryAfter = await readRepositoryFamilyInventory(workspaceRoot);
  if (!exactValue(inventoryBefore, inventoryAfter)) {
    fail("HISTORY_INVENTORY_CHANGED", "content inventory 在 full history 读取期间变化。");
  }
  assertInventoryMatchesCheckpoint(checkpoint, inventoryAfter);
  const expected = checkpointFromHistory(inventoryAfter, histories, true);
  compareFullProjection(checkpoint, expected);
  await verifyHistoricalExpertReviewPacket(workspaceRoot);
  const previous = await verifyPreviousCheckpointPrefix(workspaceRoot, histories);
  weakMapSet(VERIFIED_FULL_CHECKPOINTS, checkpoint, OBJECT_FREEZE({
    ...previous,
    historicalExpertPacketMechanicallyVerified: true,
    familyCount: histories.length,
    memberCount: histories.reduce((count, family) => count + family.members.length, 0),
    artifactLineageFamilyCount: histories.filter(
      (family) => family.lineageMode === "artifact"
    ).length,
    indexOnlyLegacyFamilyCount: histories.filter(
      (family) => family.lineageMode === "index_only_legacy"
    ).length
  }));
  return checkpoint;
}

export function isVerifiedHistoryCheckpoint(value) {
  return value !== null
    && typeof value === "object"
    && weakMapHas(VERIFIED_FULL_CHECKPOINTS, value);
}

export function getHistoryCheckpointIdentity(value) {
  const metadata = weakMapGet(VERIFIED_IDENTITIES, value);
  if (metadata === undefined) {
    fail("CHECKPOINT_IDENTITY_BRAND_REQUIRED", "checkpoint 缺少 identity-only 私有品牌。");
  }
  return deepFreeze({
    path: HISTORY_CHECKPOINT_RELATIVE_PATH,
    rawBytes: metadata.rawBytes,
    rawSha256: metadata.rawSha256,
    checkpointId: value.checkpointId,
    familyInventoryDigest: value.familyInventoryDigest,
    historyRootDigest: value.historyRootDigest,
    checkpointDigest: value.checkpointDigest
  });
}

export function getHistoryCheckpointSummary(value) {
  const fullMetadata = weakMapGet(VERIFIED_FULL_CHECKPOINTS, value);
  if (fullMetadata === undefined) {
    fail("CHECKPOINT_FULL_BRAND_REQUIRED", "checkpoint 缺少 full-history 私有品牌。");
  }
  return deepFreeze({
    historyCheckpointMechanicallyVerified: true,
    ...getHistoryCheckpointIdentity(value),
    ...fullMetadata,
    scope: value.scope,
    authorityBoundary: value.authorityBoundary,
    snapshotBoundary: value.snapshotBoundary
  });
}

export function parseStrictHistoryCheckpointBytes(
  bytes,
  label = HISTORY_CHECKPOINT_RELATIVE_PATH
) {
  const captured = Buffer.from(bytes);
  return parseCheckpointSnapshot(OBJECT_FREEZE({
    path: label,
    bytes: captured,
    rawBytes: captured.byteLength,
    rawSha256: sha256(captured)
  }));
}

async function verifyFullValue(workspaceRoot, value) {
  const verified = verifyIdentityValue(value);
  const inventoryBefore = await readRepositoryFamilyInventory(workspaceRoot);
  assertInventoryMatchesCheckpoint(verified, inventoryBefore);
  const histories = await readFullHistory(workspaceRoot, inventoryBefore);
  const inventoryAfter = await readRepositoryFamilyInventory(workspaceRoot);
  if (!exactValue(inventoryBefore, inventoryAfter)) {
    fail("HISTORY_INVENTORY_CHANGED", "content inventory 在 full history 读取期间变化。");
  }
  const expected = checkpointFromHistory(inventoryAfter, histories, true);
  compareFullProjection(verified, expected);
  await verifyHistoricalExpertReviewPacket(workspaceRoot);
  await verifyPreviousCheckpointPrefix(workspaceRoot, histories);
  return verified;
}

export const historyCheckpointTestOnly = OBJECT_FREEZE({
  SCHEMA_VERSION,
  RECORD_TYPE,
  CHECKPOINT_ID,
  SCOPE,
  AUTHORITY_BOUNDARY,
  SNAPSHOT_BOUNDARY,
  EXPECTED_PERSISTED,
  CURRENT_FAMILY_POLICIES,
  readRepositoryFamilyInventory,
  readFullHistory,
  verifyHistoricalExpertReviewPacket,
  verifyIdentityValue,
  verifyFullValue,
  canonicalStringify,
  parseVersion
});
