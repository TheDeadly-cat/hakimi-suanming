import { createHash } from "node:crypto";
import { lstat, readdir, realpath } from "node:fs/promises";
import path from "node:path";

import {
  parseBaziDttStrictJsonArtifact,
  readBaziDttStableWorkspaceArtifact
} from "./bazi-dtt-versioned-parent-supersession-lib.mjs";
import {
  HISTORY_CHECKPOINT_RELATIVE_PATH,
  HISTORICAL_BAZI_EXPERT_REVIEW_PACKET,
  getHistoryCheckpointIdentity,
  loadHistoryCheckpointIdentity,
  verifyHistoryCheckpointInventory
} from "./history-checkpoint-lib.mjs";
import { CURRENT_FAMILY_POLICIES } from "./current-family-policies.mjs";
import { computeExpertReviewPacketDigest } from "./bazi-expert-review-packet-lib.mjs";

const REFLECT_APPLY = Reflect.apply;
const WEAK_MAP_GET = WeakMap.prototype.get;
const WEAK_MAP_SET = WeakMap.prototype.set;
const WEAK_MAP_HAS = WeakMap.prototype.has;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;
const WEAK_SET_DELETE = WeakSet.prototype.delete;
const PATH_RESOLVE = path.resolve;
const PATH_RELATIVE = path.relative;
const PATH_IS_ABSOLUTE = path.isAbsolute;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const OBJECT_GET_PROTOTYPE_OF = Object.getPrototypeOf;
const OBJECT_GET_OWN_PROPERTY_DESCRIPTOR = Object.getOwnPropertyDescriptor;
const OBJECT_CREATE = Object.create;
const OBJECT_DEFINE_PROPERTY = Object.defineProperty;
const OBJECT_HAS_OWN = Object.hasOwn;
const NUMBER_IS_SAFE_INTEGER = Number.isSafeInteger;
const OBJECT_IS = Object.is;
const OBJECT_PROTOTYPE = Object.prototype;
const REFLECT_OWN_KEYS = Reflect.ownKeys;
const ARRAY_IS_ARRAY = Array.isArray;
const ARRAY_SORT = Array.prototype.sort;
const JSON_STRINGIFY = JSON.stringify;
const NUMBER_IS_FINITE = Number.isFinite;
const REGEXP_EXEC = RegExp.prototype.exec;
const REGEXP_TEST = RegExp.prototype.test;
const NATIVE_SET = Set;
const SET_HAS = Set.prototype.has;
const SET_ADD = Set.prototype.add;
const SET_DELETE = Set.prototype.delete;

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

function setHas(set, value) {
  return REFLECT_APPLY(SET_HAS, set, [value]);
}

function setAdd(set, value) {
  return REFLECT_APPLY(SET_ADD, set, [value]);
}

function setDelete(set, value) {
  return REFLECT_APPLY(SET_DELETE, set, [value]);
}

function regexExec(expression, value) {
  return REFLECT_APPLY(REGEXP_EXEC, expression, [value]);
}

function regexTest(expression, value) {
  return REFLECT_APPLY(REGEXP_TEST, expression, [value]);
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
    fail("INDEX_SHAPE_INVALID", `${label} 必须是 enumerable own data property。`);
  }
  return descriptor.value;
}

export const CURRENT_INDEX_RELATIVE_PATH =
  "content/system-admission/current-index.v1.json";

const DIGEST_DOMAIN = "hakimi.repository.current-index.v1";
const SCHEMA_VERSION = "1.0.0";
const RECORD_TYPE = "canonical_repository_current_index_v1";
const INDEX_ID = "hakimi.repository/current-index/1.0.0";
const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const VERSION_PATTERN = /^(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?(?:\.(0|[1-9][0-9]*))?$/u;
const VERSIONED_JSON_FILE_PATTERN = /^(.+)\.v(0|[1-9][0-9]*(?:\.(?:0|[1-9][0-9]*)){0,2})\.json$/u;
const SELECTION_STATES = OBJECT_FREEZE({
  selected: "selected_current_head",
  selectedBelowHead: "selected_current_below_head",
  nonformal: "nonformal_head_formal_current_is_lower",
  unavailable: "historical_head_current_unavailable",
  observation: "current_observation_only_no_current_status"
});
const PROJECT_RELEASE_GOVERNANCE = OBJECT_FREEZE({
  activeLine: "legacy-v13",
  targetSchema: 13,
  migrationId: null
});
const AUTHORITY_BOUNDARY = OBJECT_FREEZE({
  formalAdmissionAuthorized: false,
  releaseReady: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  expertClaimsAuthorized: false
});
const SNAPSHOT_BOUNDARY = OBJECT_FREEZE({
  crossFileAtomicSnapshot: false,
  mutationEpochAvailableForSchema13: false,
  mutationEpochReceipt: null,
  intervalMutationExcludedAcrossFiles: false,
  abaExcluded: false,
  indexDigestIsDigitalSignature: false
});
const SELECTION_BOUNDARY = OBJECT_FREEZE({
  familyHeadMeansHighestPersistedVersionOnly: true,
  selectedCurrentMeansRepositorySelectionOnly: true,
  selectedCurrentDoesNotEstablishFormalAdmission: true,
  latestVersionDoesNotImplyAuthority: true,
  automaticPromotionAllowed: false
});

// The current index cannot contain its own raw hash without a self-reference,
// so its persisted raw identity is pinned out of band by this verifier.
const EXPECTED_PERSISTED = OBJECT_FREEZE({
  rawBytes: 42740,
  rawSha256: "df7e9ac217d480ea84acb02d0f3484d8684fbcc6426eef9d0dbc7d8d358f326a",
  indexDigest: "63e71d0c36e2f216711ac6c0b8ae0051c7f3ccd98d5b4a55cfdce8560180520e"
});

const BAZI_EXPERT_REVIEW_PACKET = HISTORICAL_BAZI_EXPERT_REVIEW_PACKET;

const VERIFIED_INDEXES = new WeakMap();
const STABLE_INDEX_SNAPSHOTS = new WeakSet();

export class CurrentIndexError extends Error {
  constructor(code, message, options) {
    super(`${code}: ${message}`, options);
    this.name = "CurrentIndexError";
    this.code = code;
  }
}

function fail(code, message, cause) {
  throw new CurrentIndexError(
    code,
    message,
    cause === undefined ? undefined : { cause }
  );
}

function selectionForFamily(familyKey, registeredEntries) {
  const matches = registeredEntries.filter((entry) => entry.familyKey === familyKey);
  if (matches.length !== 1) fail("ENTRY_SET_MISMATCH", familyKey);
  const entry = matches[0];
  if (entry.selectedCurrent === null) {
    if (entry.selectionState !== SELECTION_STATES.unavailable) {
      fail("CURRENT_SELECTION_INVALID", familyKey);
    }
    return OBJECT_FREEZE({
      selectionState: entry.selectionState,
      selectedCurrentVersion: null
    });
  }
  if (![SELECTION_STATES.selected, SELECTION_STATES.selectedBelowHead,
    SELECTION_STATES.nonformal, SELECTION_STATES.observation].includes(entry.selectionState)) {
    fail("CURRENT_SELECTION_INVALID", familyKey);
  }
  const version = parseVersion(entry.selectedCurrent?.version, "CURRENT_SELECTION_INVALID");
  return OBJECT_FREEZE({
    selectionState: entry.selectionState,
    selectedCurrentVersion: version.normalized
  });
}

const FAMILY_POLICIES = CURRENT_FAMILY_POLICIES;

export const CURRENT_INDEX_FAMILY_POLICIES = OBJECT_FREEZE(
  Object.fromEntries(FAMILY_POLICIES.map((entry) => [entry.familyKey, entry]))
);

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

function parseVersion(raw, code = "INDEX_SHAPE_INVALID") {
  const match = regexExec(VERSION_PATTERN, raw);
  if (!match) fail(code, `非法数字版本：${String(raw)}`);
  const tuple = [match[1], match[2] ?? "0", match[3] ?? "0"].map((part) => {
    const number = Number(part);
    if (!Number.isSafeInteger(number)) fail(code, `版本分量越界：${raw}`);
    return number;
  });
  return OBJECT_FREEZE({
    raw,
    tuple: OBJECT_FREEZE(tuple),
    normalized: tuple.join(".")
  });
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.tuple[index] !== right.tuple[index]) {
      return left.tuple[index] - right.tuple[index];
    }
  }
  return 0;
}

async function readRepositoryVersionFamilyInventory(workspaceRoot) {
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
    fail("REPOSITORY_INVENTORY_INVALID", "无法解析 content 版本族 inventory。", cause);
  }
  if (normalizePath(rootReal) !== normalizePath(requestedRoot)
    || normalizePath(contentRootReal) !== normalizePath(requestedContentRoot)
    || !insideRoot(rootReal, contentRootReal)) {
    fail("REPOSITORY_INVENTORY_INVALID", "content 版本族 inventory 根路径不安全。");
  }

  const versionedMembers = [];
  const walk = async (absoluteDirectory, relativeDirectory) => {
    let before;
    let actualDirectory;
    let entries;
    try {
      [before, actualDirectory, entries] = await Promise.all([
        lstat(absoluteDirectory, { bigint: true }),
        realpath(absoluteDirectory),
        readdir(absoluteDirectory, { withFileTypes: true })
      ]);
    } catch (cause) {
      fail("REPOSITORY_INVENTORY_INVALID", relativeDirectory, cause);
    }
    if (!before.isDirectory()
      || before.isSymbolicLink()
      || normalizePath(actualDirectory) !== normalizePath(absoluteDirectory)
      || !insideRoot(contentRootReal, actualDirectory)) {
      fail("REPOSITORY_INVENTORY_INVALID", relativeDirectory);
    }

    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const absolute = PATH_RESOLVE(absoluteDirectory, entry.name);
      const relative = `${relativeDirectory}/${entry.name}`;
      let metadata;
      try {
        metadata = await lstat(absolute, { bigint: true });
      } catch (cause) {
        fail("REPOSITORY_INVENTORY_INVALID", relative, cause);
      }
      if (metadata.isSymbolicLink() || entry.isSymbolicLink()) {
        fail("REPOSITORY_INVENTORY_INVALID", `${relative} 拒绝链接端点。`);
      }
      if (metadata.isDirectory() && entry.isDirectory()) {
        await walk(absolute, relative);
        continue;
      }
      const match = regexExec(VERSIONED_JSON_FILE_PATTERN, entry.name);
      if (!match) continue;
      if (!metadata.isFile() || !entry.isFile()) {
        fail("REPOSITORY_INVENTORY_INVALID", `${relative} 不是普通文件。`);
      }
      versionedMembers.push(OBJECT_FREEZE({
        familyKey: `${relativeDirectory}/${match[1]}`,
        path: relative,
        version: parseVersion(match[2], "FAMILY_VERSION_INVALID")
      }));
    }

    let after;
    let afterReal;
    try {
      [after, afterReal] = await Promise.all([
        lstat(absoluteDirectory, { bigint: true }),
        realpath(absoluteDirectory)
      ]);
    } catch (cause) {
      fail("REPOSITORY_INVENTORY_INVALID", relativeDirectory, cause);
    }
    if (!sameDirectoryIdentity(before, after)
      || normalizePath(afterReal) !== normalizePath(actualDirectory)) {
      fail("REPOSITORY_INVENTORY_CHANGED", relativeDirectory);
    }
  };

  await walk(requestedContentRoot, "content");
  const grouped = new Map();
  for (const member of versionedMembers) {
    const members = grouped.get(member.familyKey) ?? [];
    members.push(member);
    grouped.set(member.familyKey, members);
  }
  const families = [];
  for (const [familyKey, members] of grouped) {
    if (members.length < 2) continue;
    members.sort((left, right) => compareVersions(left.version, right.version));
    for (let index = 1; index < members.length; index += 1) {
      if (compareVersions(members[index - 1].version, members[index].version) === 0) {
        fail("FAMILY_VERSION_COLLISION", familyKey);
      }
    }
    families.push(OBJECT_FREEZE({
      familyKey,
      members: OBJECT_FREEZE(members.map((member) => member.path))
    }));
  }
  families.sort((left, right) => left.familyKey.localeCompare(right.familyKey, "en"));
  return OBJECT_FREEZE(families);
}

function assertRepositoryVersionFamilyInventory(families) {
  const actualKeys = families.map((entry) => entry.familyKey);
  const expectedKeys = FAMILY_POLICIES
    .map((entry) => entry.familyKey)
    .sort((left, right) => left.localeCompare(right, "en"));
  const extras = actualKeys.filter((key) => !expectedKeys.includes(key));
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
  if (extras.length > 0) {
    fail("UNINDEXED_VERSION_FAMILY", extras.join(", "));
  }
  if (missing.length > 0) {
    fail("INDEXED_VERSION_FAMILY_MISSING", missing.join(", "));
  }
}

async function readDirectoryState(workspaceRoot, policyEntry) {
  const requestedRoot = PATH_RESOLVE(workspaceRoot);
  let rootReal;
  let directoryReal;
  let before;
  let names;
  const directoryPath = PATH_RESOLVE(requestedRoot, ...policyEntry.directory.split("/"));
  try {
    rootReal = await realpath(requestedRoot);
    directoryReal = await realpath(directoryPath);
    before = await lstat(directoryPath, { bigint: true });
    names = await readdir(directoryPath, { withFileTypes: true });
  } catch (cause) {
    fail("FAMILY_DIRECTORY_INVALID", policyEntry.familyKey, cause);
  }
  if (normalizePath(rootReal) !== normalizePath(requestedRoot)
    || !insideRoot(rootReal, directoryReal)
    || normalizePath(directoryReal) !== normalizePath(directoryPath)
    || before.isSymbolicLink()
    || !before.isDirectory()) {
    fail("FAMILY_DIRECTORY_INVALID", policyEntry.familyKey);
  }
  const matched = [];
  for (const entry of names) {
    const match = regexExec(policyEntry.fileNamePattern, entry.name);
    if (!match) continue;
    if (!entry.isFile() || entry.isSymbolicLink()) {
      fail("FAMILY_DIRECTORY_INVALID", `${policyEntry.familyKey}/${entry.name}`);
    }
    const version = parseVersion(match[1], "FAMILY_VERSION_INVALID");
    matched.push(OBJECT_FREEZE({
      version,
      name: entry.name,
      path: `${policyEntry.directory}/${entry.name}`
    }));
  }
  let after;
  let afterReal;
  try {
    after = await lstat(directoryPath, { bigint: true });
    afterReal = await realpath(directoryPath);
  } catch (cause) {
    fail("FAMILY_DIRECTORY_INVALID", policyEntry.familyKey, cause);
  }
  if (!sameDirectoryIdentity(before, after)
    || normalizePath(afterReal) !== normalizePath(directoryReal)) {
    fail("FAMILY_DIRECTORY_CHANGED", policyEntry.familyKey);
  }
  matched.sort((left, right) => compareVersions(left.version, right.version));
  if (matched.length === 0) fail("ENTRY_SET_MISMATCH", `family 缺少成员：${policyEntry.familyKey}`);
  for (let index = 1; index < matched.length; index += 1) {
    if (compareVersions(matched[index - 1].version, matched[index].version) === 0) {
      fail("FAMILY_VERSION_COLLISION", policyEntry.familyKey);
    }
  }
  return OBJECT_FREEZE(matched);
}

export async function enumerateFamilyVersions(
  workspaceRoot,
  familyPolicy
) {
  const resolvedPolicy = typeof familyPolicy === "string"
    ? CURRENT_INDEX_FAMILY_POLICIES[familyPolicy]
    : familyPolicy;
  if (!resolvedPolicy || CURRENT_INDEX_FAMILY_POLICIES[resolvedPolicy.familyKey] !== resolvedPolicy) {
    fail("ENTRY_SET_MISMATCH", "未知 current-index family policy。");
  }
  return readDirectoryState(workspaceRoot, resolvedPolicy);
}

function hasCauseCode(error, code) {
  let current = error;
  for (let depth = 0; current && depth < 16; depth += 1) {
    if (current.code === code) return true;
    current = current.cause;
  }
  return false;
}

function parseSnapshot(snapshot, scope) {
  try {
    return parseBaziDttStrictJsonArtifact(snapshot);
  } catch (cause) {
    if (hasCauseCode(cause, "JSON_DUPLICATE_KEY")) {
      fail(scope === "index" ? "INDEX_JSON_DUPLICATE_KEY" : "ENTRY_JSON_INVALID",
        snapshot.path, cause);
    }
    fail(scope === "index" ? "INDEX_JSON_INVALID" : "ENTRY_JSON_INVALID",
      snapshot.path, cause);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function readIdentity(value, policyEntry, snapshot, version) {
  const artifactId = value?.[policyEntry.idField];
  const semanticDigestField = policyEntry.memberDigestFields.find(
    (field) => typeof value?.[field] === "string"
  );
  const semanticDigest = semanticDigestField === undefined
    ? null
    : value[semanticDigestField];
  if (typeof artifactId !== "string" || artifactId.length === 0) {
    fail("ENTRY_ID_MISMATCH", `${snapshot.path} 缺少 ${policyEntry.idField}`);
  }
  if (policyEntry.memberDigestFields.length > 0
    && (typeof semanticDigest !== "string" || !regexTest(SHA256_PATTERN, semanticDigest))) {
    fail("ENTRY_DIGEST_MISMATCH",
      `${snapshot.path} 缺少合法 ${policyEntry.memberDigestFields.join("/")}`);
  }
  return OBJECT_FREEZE({
    version: version.normalized,
    path: snapshot.path,
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256,
    artifactIdField: policyEntry.idField,
    artifactId,
    semanticDigestField: semanticDigestField ?? null,
    semanticDigest
  });
}

async function loadFamilyMember(workspaceRoot, policyEntry, member) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, member.path);
  } catch (cause) {
    fail("ENTRY_PATH_MISMATCH", member.path, cause);
  }
  const value = parseSnapshot(snapshot, "entry");
  return OBJECT_FREEZE({
    member,
    snapshot,
    value,
    binding: readIdentity(value, policyEntry, snapshot, member.version)
  });
}

function referenceDigest(reference, digestField) {
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

function referenceMatches(reference, predecessor, policyEntry) {
  if (reference.path !== predecessor.binding.path
    || reference.rawBytes !== predecessor.binding.rawBytes) return false;
  const referencedSha = typeof reference.rawSha256 === "string"
    ? reference.rawSha256
    : reference.sha256;
  if (referencedSha !== predecessor.binding.rawSha256) return false;
  const id = referenceId(reference, predecessor.binding.artifactIdField);
  if (id !== null && id !== predecessor.binding.artifactId) return false;
  const digest = referenceDigest(reference, predecessor.binding.semanticDigestField);
  if (digest !== null && digest !== predecessor.binding.semanticDigest) return false;
  return true;
}

function extractFamilyReferences(value, policyEntry) {
  const references = [];
  const seen = new NATIVE_SET();
  let nodes = 0;
  const visit = (node, depth) => {
    if (node === null || typeof node !== "object") return;
    nodes += 1;
    if (nodes > 1_000_000 || depth > 128) {
      fail("INDEX_SHAPE_INVALID", "family lineage 结构超限。");
    }
    if (setHas(seen, node)) return;
    setAdd(seen, node);
    if (!ARRAY_IS_ARRAY(node)
      && typeof node.path === "string"
      && regexExec(policyEntry.relativePathPattern, node.path) !== null) {
      references[references.length] = node;
    }
    if (ARRAY_IS_ARRAY(node)) {
      for (let index = 0; index < node.length; index += 1) {
        visit(node[index], depth + 1);
      }
      return;
    }
    for (const key of OBJECT_KEYS(node)) visit(node[key], depth + 1);
  };
  visit(value, 0);
  return references;
}

function verifyPredecessor(current, predecessor, policyEntry) {
  const allFamilyReferences = extractFamilyReferences(current.value, policyEntry);
  if (allFamilyReferences.length === 0) {
    fail("PREDECESSOR_MISSING", `${current.binding.path} 没有 family predecessor。`);
  }
  const directReferences = allFamilyReferences.filter(
    (reference) => reference.path === predecessor.binding.path
  );
  if (directReferences.length === 0) {
    fail("PREDECESSOR_CHAIN_BROKEN",
      `${current.binding.path} 未指向直接较低版本 ${predecessor.binding.path}。`);
  }
  if (!directReferences.some(
    (reference) => referenceMatches(reference, predecessor, policyEntry)
  )) {
    fail("PREDECESSOR_IDENTITY_MISMATCH",
      `${current.binding.path} 的直接 predecessor 身份不匹配。`);
  }
}

function exactKeys(value, expected, code, label) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail(code, `${label} 必须是对象。`);
  }
  const actual = OBJECT_KEYS(value);
  const wanted = [...expected];
  REFLECT_APPLY(ARRAY_SORT, actual, []);
  REFLECT_APPLY(ARRAY_SORT, wanted, []);
  if (actual.length !== wanted.length
    || actual.some((key, index) => key !== wanted[index])) {
    fail(code, `${label} 字段集合不匹配。`);
  }
}

function exactValue(left, right) {
  return canonicalStringify(left) === canonicalStringify(right);
}

function compareBinding(actual, expected, label) {
  exactKeys(actual, [
    "version", "path", "rawBytes", "rawSha256", "artifactIdField", "artifactId",
    "semanticDigestField", "semanticDigest"
  ], "INDEX_SHAPE_INVALID", label);
  if (actual.path !== expected.path || actual.version !== expected.version) {
    fail("ENTRY_PATH_MISMATCH", label);
  }
  if (actual.rawBytes !== expected.rawBytes || actual.rawSha256 !== expected.rawSha256) {
    fail("ENTRY_SHA_MISMATCH", label);
  }
  if (actual.artifactIdField !== expected.artifactIdField
    || actual.artifactId !== expected.artifactId) fail("ENTRY_ID_MISMATCH", label);
  if (actual.semanticDigestField !== expected.semanticDigestField
    || actual.semanticDigest !== expected.semanticDigest) {
    fail("ENTRY_DIGEST_MISMATCH", label);
  }
}

function canonicalStringify(value) {
  const seen = new NATIVE_SET();
  let nodes = 0;
  const render = (node, depth) => {
    nodes += 1;
    if (nodes > 1_000_000 || depth > 128) fail("INDEX_SHAPE_INVALID", "index 结构超限。");
    if (node === null || typeof node === "boolean" || typeof node === "string") {
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [node]);
    }
    if (typeof node === "number") {
      if (!NUMBER_IS_FINITE(node) || OBJECT_IS(node, -0)) {
        fail("INDEX_SHAPE_INVALID", "index 数值不是 canonical JSON 数值。");
      }
      return REFLECT_APPLY(JSON_STRINGIFY, JSON, [node]);
    }
    if (typeof node !== "object" || setHas(seen, node)) {
      fail("INDEX_SHAPE_INVALID", "index 不是无别名 JSON 数据。");
    }
    setAdd(seen, node);
    let rendered;
    if (ARRAY_IS_ARRAY(node)) {
      if (reflectOwnKeys(node).length !== node.length + 1) {
        fail("INDEX_SHAPE_INVALID", "index 数组不得包含额外属性。");
      }
      rendered = "[";
      for (let index = 0; index < node.length; index += 1) {
        if (index > 0) rendered += ",";
        rendered += render(
          readOwnJsonDataProperty(node, String(index), `index[${index}]`),
          depth + 1
        );
      }
      rendered += "]";
    } else {
      const prototype = objectGetPrototypeOf(node);
      if (prototype !== OBJECT_PROTOTYPE && prototype !== null) {
        fail("INDEX_SHAPE_INVALID", "index 对象原型无效。");
      }
      const keys = OBJECT_KEYS(node);
      if (reflectOwnKeys(node).length !== keys.length) {
        fail("INDEX_SHAPE_INVALID", "index 对象不得包含 symbol 或 non-enumerable 属性。");
      }
      REFLECT_APPLY(ARRAY_SORT, keys, []);
      rendered = "{";
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        if (index > 0) rendered += ",";
        rendered += `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [key])}:${render(
          readOwnJsonDataProperty(node, key, `index.${key}`),
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

export function computeCurrentIndexDigest(value) {
  if (value === null || typeof value !== "object" || ARRAY_IS_ARRAY(value)) {
    fail("INDEX_SHAPE_INVALID", "current index 必须是对象。");
  }
  const unsigned = {};
  for (const key of OBJECT_KEYS(value)) {
    if (key !== "indexDigest") unsigned[key] = value[key];
  }
  return sha256(Buffer.from(`${DIGEST_DOMAIN}\0${canonicalStringify(unsigned)}`, "utf8"));
}

export function serializeCurrentIndex(value) {
  return `${REFLECT_APPLY(JSON_STRINGIFY, JSON, [value, null, 2])}\n`;
}

function assertFixedBoundaries(index) {
  if (!exactValue(index.projectReleaseGovernance, PROJECT_RELEASE_GOVERNANCE)) {
    fail("PROJECT_GOVERNANCE_DRIFT", "current index 项目发布治理漂移。");
  }
  if (!exactValue(index.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION", "current index 不得提升 authority。 ");
  }
  if (!exactValue(index.snapshotBoundary, SNAPSHOT_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION", "current index 不得提升 snapshot/epoch 声明。 ");
  }
  if (!exactValue(index.selectionBoundary, SELECTION_BOUNDARY)) {
    fail("AUTHORITY_PROMOTION", "current index 不得提升 selection 的语义边界。 ");
  }
}

function checkpointBinding(checkpoint) {
  const identity = getHistoryCheckpointIdentity(checkpoint);
  return OBJECT_FREEZE({
    path: identity.path,
    checkpointId: identity.checkpointId,
    rawBytes: identity.rawBytes,
    rawSha256: identity.rawSha256,
    checkpointDigest: identity.checkpointDigest,
    familyCount: checkpoint.scope.familyCount,
    memberCount: checkpoint.scope.memberCount,
    familyInventoryDigest: identity.familyInventoryDigest,
    historyRootDigest: identity.historyRootDigest
  });
}

function checkpointFamily(checkpoint, familyKey) {
  const matches = checkpoint.families.filter((family) => family.familyKey === familyKey);
  if (matches.length !== 1) {
    fail("HISTORY_CHECKPOINT_FAMILY_MISMATCH", familyKey);
  }
  return matches[0];
}

async function expectedCurrentEntry(workspaceRoot, policyEntry, checkpoint, registeredEntries) {
  const selection = selectionForFamily(policyEntry.familyKey, registeredEntries);
  const members = await enumerateFamilyVersions(workspaceRoot, policyEntry);
  const recorded = checkpointFamily(checkpoint, policyEntry.familyKey);
  if (members.length !== recorded.memberCount
    || members[0].path !== recorded.first.path
    || members.at(-1).path !== recorded.head.path) {
    fail("HISTORY_CHECKPOINT_FAMILY_MISMATCH", policyEntry.familyKey);
  }
  const headMember = members.at(-1);
  const predecessorMember = members.length > 1 ? members.at(-2) : null;
  const headLoaded = await loadFamilyMember(workspaceRoot, policyEntry, headMember);
  const predecessorLoaded = predecessorMember === null
    ? null
    : await loadFamilyMember(workspaceRoot, policyEntry, predecessorMember);
  compareBinding(recorded.head, headLoaded.binding,
    `${policyEntry.familyKey}.checkpointHead`);
  if (predecessorLoaded !== null && policyEntry.lineageMode === "artifact") {
    verifyPredecessor(headLoaded, predecessorLoaded, policyEntry);
  } else if (policyEntry.lineageMode !== "artifact"
    && policyEntry.lineageMode !== "index_only_legacy") {
    fail("INDEX_SHAPE_INVALID", `${policyEntry.familyKey} lineage mode 无效。`);
  }
  const head = headLoaded.binding;
  const supersedes = predecessorLoaded?.binding ?? null;
  let selectedCurrent;
  if (selection.selectedCurrentVersion === null) {
    selectedCurrent = null;
  } else {
    const selectedMember = members.find(
      (member) => member.version.normalized === selection.selectedCurrentVersion
    );
    if (selectedMember === undefined) {
      fail("CURRENT_UNAVAILABLE_REQUIRED", policyEntry.familyKey);
    }
    if (selectedMember.path === headMember.path) selectedCurrent = head;
    else if (selectedMember.path === predecessorMember?.path) selectedCurrent = supersedes;
    else selectedCurrent = (await loadFamilyMember(
      workspaceRoot,
      policyEntry,
      selectedMember
    )).binding;
  }
  return OBJECT_FREEZE({
    familyKey: policyEntry.familyKey,
    head,
    selectionState: selectionStateForBinding(selection, selectedCurrent, head),
    selectedCurrent,
    supersedes
  });
}

function selectionStateForBinding(selection, selectedCurrent, head) {
  if (selection.selectionState === SELECTION_STATES.selected
    || selection.selectionState === SELECTION_STATES.selectedBelowHead) {
    return selectedCurrent.path === head.path
      ? SELECTION_STATES.selected
      : SELECTION_STATES.selectedBelowHead;
  }
  return selection.selectionState;
}

async function buildEntries(workspaceRoot, checkpoint, registeredEntries) {
  let inventoryBefore;
  try {
    inventoryBefore = await verifyHistoryCheckpointInventory(workspaceRoot, checkpoint);
  } catch (cause) {
    fail(cause?.code ?? "HISTORY_CHECKPOINT_INVENTORY_INVALID",
      "history checkpoint name inventory 与当前仓库不一致。", cause);
  }
  const entries = [];
  for (const policyEntry of FAMILY_POLICIES) {
    entries.push(await expectedCurrentEntry(
      workspaceRoot, policyEntry, checkpoint, registeredEntries
    ));
  }
  let inventoryAfter;
  try {
    inventoryAfter = await verifyHistoryCheckpointInventory(workspaceRoot, checkpoint);
  } catch (cause) {
    fail(cause?.code ?? "HISTORY_CHECKPOINT_INVENTORY_INVALID",
      "history checkpoint name inventory 在 current endpoint 读取后不一致。", cause);
  }
  if (!exactValue(inventoryBefore, inventoryAfter)) {
    fail("REPOSITORY_INVENTORY_CHANGED", "content 版本族 inventory 在读取期间变化。");
  }
  return OBJECT_FREEZE(entries);
}

async function buildNonVersionedSelections(workspaceRoot, registeredSelections) {
  // This is a persisted historical anchor, not a fresh assessment of the old
  // packet against today's source. Only the full-history gate reads its bytes.
  const unavailable = {
    baziExpertReviewPacket: {
      currentAvailable: false,
      selectedCurrent: null,
      historicalAnchor: { ...BAZI_EXPERT_REVIEW_PACKET },
      historicalAnchorVerifiedByCurrentLoad: false,
      driftReasons: [
        {
          code: "current_expert_review_packet_not_selected"
        }
      ]
    }
  };
  const selections = cloneJson(registeredSelections);
  exactKeys(selections, ["baziExpertReviewPacket"], "NON_VERSIONED_SELECTION_MISMATCH", "non-versioned selections");
  const selection = selections.baziExpertReviewPacket;
  exactKeys(selection, [
    "currentAvailable", "selectedCurrent", "historicalAnchor", "historicalAnchorVerifiedByCurrentLoad", "driftReasons"
  ], "NON_VERSIONED_SELECTION_MISMATCH", "expert packet selection");
  if (!exactValue(selection.historicalAnchor, unavailable.baziExpertReviewPacket.historicalAnchor)
    || selection.historicalAnchorVerifiedByCurrentLoad !== false) {
    fail("NON_VERSIONED_SELECTION_MISMATCH", "expert selection 不得改写历史锚或宣称 current 重验历史。");
  }
  if (selection.selectedCurrent === null) {
    if (!exactValue(selections, unavailable)) {
      fail("NON_VERSIONED_SELECTION_MISMATCH", "未选择 expert current 时必须明确不可用及其原因。");
    }
    return deepFreeze(unavailable);
  }
  if (selection.currentAvailable !== true || !exactValue(selection.driftReasons, [])) {
    fail("NON_VERSIONED_SELECTION_MISMATCH", "显式 expert current 与可用状态不一致。");
  }
  const selected = selection.selectedCurrent;
  const keys = ["path", "rawBytes", "rawSha256", "packetId", "packetDigest"];
  if (OBJECT_HAS_OWN(selected, "version")) keys.push("version");
  exactKeys(selected, keys, "NON_VERSIONED_SELECTION_MISMATCH", "selected expert packet");
  const fixedCurrentPacket = selected.path === "content/bazi-strength-expert-review-packet.current.json";
  const match = typeof selected.path === "string"
    ? regexExec(/^content\/bazi-strength-expert-review-packet\.v([0-9]+(?:\.[0-9]+){0,2})\.json$/u, selected.path)
    : null;
  if ((!match && !fixedCurrentPacket) || !NUMBER_IS_SAFE_INTEGER(selected.rawBytes) || selected.rawBytes <= 0
    || typeof selected.rawSha256 !== "string" || !regexTest(SHA256_PATTERN, selected.rawSha256)
    || typeof selected.packetId !== "string" || selected.packetId.trim() !== selected.packetId || selected.packetId.length === 0
    || typeof selected.packetDigest !== "string" || !regexTest(SHA256_PATTERN, selected.packetDigest)) {
    fail("NON_VERSIONED_SELECTION_MISMATCH", "显式 expert current 的路径、字节或身份无效。");
  }
  if (fixedCurrentPacket && (selected.version !== "1.6.0"
    || selected.packetId !== "hakimi.bazi.strength.expert-review-packet/1.6.0")) {
    fail("NON_VERSIONED_SELECTION_MISMATCH", "固定当前审阅任务包必须绑定明确的 1.6.0 工程身份。");
  }
  if (!fixedCurrentPacket && OBJECT_HAS_OWN(selected, "version")
    && parseVersion(selected.version, "NON_VERSIONED_SELECTION_MISMATCH").normalized
      !== parseVersion(match[1], "NON_VERSIONED_SELECTION_MISMATCH").normalized) {
    fail("NON_VERSIONED_SELECTION_MISMATCH", "expert current 版本与显式文件路径不一致。");
  }
  const snapshot = await readBaziDttStableWorkspaceArtifact(workspaceRoot, selected.path);
  if (snapshot.rawBytes !== selected.rawBytes || snapshot.rawSha256 !== selected.rawSha256) {
    fail("SELECTED_EXPERT_IDENTITY_DRIFT", "显式 expert current 的原始字节身份漂移。");
  }
  const packet = parseSnapshot(snapshot, "selected expert packet");
  if (packet.packetId !== selected.packetId || packet.packetDigest !== selected.packetDigest
    || computeExpertReviewPacketDigest(packet) !== selected.packetDigest) {
    fail("SELECTED_EXPERT_IDENTITY_DRIFT", "显式 expert current 的 packet 身份或摘要漂移。");
  }
  // This is repository selection only. No vacancy, qualification, or release
  // decision is derived from a packet's historical fields or from its digest.
  return deepFreeze(selections);
}

export async function buildExpectedIndex(workspaceRoot = process.cwd()) {
  // The registered index is the selection authority. A rebuild may refresh
  // identities, but must never interpret the newest filename as a selection.
  const selectionSnapshot = await readBaziDttStableWorkspaceArtifact(
    workspaceRoot, CURRENT_INDEX_RELATIVE_PATH
  );
  const registeredIndex = parseSnapshot(selectionSnapshot, "index");
  if (selectionSnapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || selectionSnapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || registeredIndex.indexDigest !== EXPECTED_PERSISTED.indexDigest
    || computeCurrentIndexDigest(registeredIndex) !== registeredIndex.indexDigest) {
    fail("INDEX_RAW_DRIFT", "重建必须沿用已登记并固定身份的 current 选择。");
  }
  let checkpoint;
  try {
    checkpoint = await loadHistoryCheckpointIdentity(workspaceRoot);
  } catch (cause) {
    fail(cause?.code ?? "HISTORY_CHECKPOINT_INVALID",
      "current index 无法取得经过 identity-only 验证的 history checkpoint。", cause);
  }
  const entries = await buildEntries(workspaceRoot, checkpoint, registeredIndex.entries);
  const nonVersionedSelections = await buildNonVersionedSelections(workspaceRoot, registeredIndex.nonVersionedSelections);
  const unsigned = {
    schemaVersion: SCHEMA_VERSION,
    recordType: RECORD_TYPE,
    indexId: INDEX_ID,
    projectReleaseGovernance: PROJECT_RELEASE_GOVERNANCE,
    historyCheckpoint: checkpointBinding(checkpoint),
    entries,
    nonVersionedSelections,
    authorityBoundary: AUTHORITY_BOUNDARY,
    snapshotBoundary: SNAPSHOT_BOUNDARY,
    selectionBoundary: SELECTION_BOUNDARY
  };
  return deepFreeze({
    ...unsigned,
    indexDigest: computeCurrentIndexDigest(unsigned)
  });
}

function verifyEntry(actual, expected, policyEntry) {
  exactKeys(actual, [
    "familyKey", "head", "selectionState", "selectedCurrent", "supersedes"
  ],
    "INDEX_SHAPE_INVALID", `entry ${policyEntry.familyKey}`);
  if (actual.familyKey !== policyEntry.familyKey) {
    fail("ENTRY_SET_MISMATCH", policyEntry.familyKey);
  }
  if (actual.head?.path !== expected.head.path) {
    const actualVersion = typeof actual.head?.version === "string"
      ? parseVersion(actual.head.version, "INDEX_SHAPE_INVALID")
      : null;
    const expectedVersion = parseVersion(expected.head.version);
    if (actualVersion && compareVersions(actualVersion, expectedVersion) < 0) {
      fail("UNINDEXED_HIGHER_VERSION", policyEntry.familyKey);
    }
    fail("HEAD_NOT_HIGHEST", policyEntry.familyKey);
  }
  compareBinding(actual.head, expected.head, `${policyEntry.familyKey}.head`);
  if (actual.selectionState !== expected.selectionState) {
    fail("ENTRY_SET_MISMATCH", policyEntry.familyKey);
  }
  if (expected.supersedes === null) {
    if (actual.supersedes !== null) fail("PREDECESSOR_CHAIN_BROKEN", policyEntry.familyKey);
  } else {
    compareBinding(actual.supersedes, expected.supersedes,
      `${policyEntry.familyKey}.supersedes`);
  }
  if (expected.selectedCurrent === null) {
    if (actual.selectedCurrent !== null) {
      fail("CURRENT_UNAVAILABLE_REQUIRED", policyEntry.familyKey);
    }
  } else {
    if (actual.selectedCurrent === null) {
      fail("CURRENT_UNAVAILABLE_REQUIRED", policyEntry.familyKey);
    }
    compareBinding(actual.selectedCurrent, expected.selectedCurrent,
      `${policyEntry.familyKey}.selectedCurrent`);
  }
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
      fail("INDEX_SHAPE_INVALID", "index clone 结构超限。");
    }
    if (node === null || typeof node === "boolean" || typeof node === "string") {
      return node;
    }
    if (typeof node === "number") {
      if (!NUMBER_IS_FINITE(node) || OBJECT_IS(node, -0)) {
        fail("INDEX_SHAPE_INVALID", "index clone 包含非 canonical JSON 数值。");
      }
      return node;
    }
    if (typeof node !== "object" || setHas(active, node)) {
      fail("INDEX_SHAPE_INVALID", "index clone 不是无循环 JSON 数据。");
    }
    setAdd(active, node);
    let copy;
    if (ARRAY_IS_ARRAY(node)) {
      if (reflectOwnKeys(node).length !== node.length + 1) {
        fail("INDEX_SHAPE_INVALID", "index clone 数组不得包含额外属性。");
      }
      copy = [];
      for (let index = 0; index < node.length; index += 1) {
        OBJECT_DEFINE_PROPERTY(copy, String(index), {
          value: clone(
            readOwnJsonDataProperty(node, String(index), `index clone[${index}]`),
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
        fail("INDEX_SHAPE_INVALID", "index clone 对象原型无效。");
      }
      const keys = OBJECT_KEYS(node);
      if (reflectOwnKeys(node).length !== keys.length) {
        fail("INDEX_SHAPE_INVALID", "index clone 对象不得包含额外属性。");
      }
      copy = OBJECT_CREATE(prototype);
      for (const key of keys) {
        OBJECT_DEFINE_PROPERTY(copy, key, {
          value: clone(readOwnJsonDataProperty(node, key, `index clone.${key}`), depth + 1),
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

async function verifyCurrentIndexValue(workspaceRoot, value) {
  exactKeys(value, [
    "schemaVersion", "recordType", "indexId", "projectReleaseGovernance", "entries",
    "historyCheckpoint", "nonVersionedSelections", "authorityBoundary", "snapshotBoundary",
    "selectionBoundary", "indexDigest"
  ], "INDEX_SHAPE_INVALID", "current index");
  if (value.schemaVersion !== SCHEMA_VERSION
    || value.recordType !== RECORD_TYPE
    || value.indexId !== INDEX_ID
    || !ARRAY_IS_ARRAY(value.entries)
    || value.entries.length !== FAMILY_POLICIES.length) {
    fail("INDEX_SHAPE_INVALID", "current index 固定身份或 entry 数量漂移。");
  }
  assertFixedBoundaries(value);
  if (typeof value.indexDigest !== "string" || !regexTest(SHA256_PATTERN, value.indexDigest)
    || computeCurrentIndexDigest(value) !== value.indexDigest) {
    fail("INDEX_DIGEST_MISMATCH", "current index self digest 漂移。");
  }
  let checkpoint;
  try {
    checkpoint = await loadHistoryCheckpointIdentity(workspaceRoot);
  } catch (cause) {
    fail(cause?.code ?? "HISTORY_CHECKPOINT_INVALID",
      "current index 无法取得经过 identity-only 验证的 history checkpoint。", cause);
  }
  const expectedCheckpointBinding = checkpointBinding(checkpoint);
  if (!exactValue(value.historyCheckpoint, expectedCheckpointBinding)) {
    fail("HISTORY_CHECKPOINT_BINDING_MISMATCH",
      "current index 的 historyCheckpoint identity 绑定漂移。");
  }
  const expectedEntries = await buildEntries(workspaceRoot, checkpoint, value.entries);
  for (let index = 0; index < FAMILY_POLICIES.length; index += 1) {
    verifyEntry(value.entries[index], expectedEntries[index], FAMILY_POLICIES[index]);
  }
  const expectedNonVersionedSelections = await buildNonVersionedSelections(workspaceRoot, value.nonVersionedSelections);
  if (!exactValue(value.nonVersionedSelections, expectedNonVersionedSelections)) {
    fail("NON_VERSIONED_SELECTION_MISMATCH",
      "nonVersionedSelections 与当前仓库投影不一致。");
  }
  return deepFreeze(cloneJson(value));
}

export async function verifyCurrentIndex(
  workspaceRoot,
  value,
  snapshot = undefined
) {
  if (snapshot === undefined || !weakSetHas(STABLE_INDEX_SNAPSHOTS, snapshot)) {
    fail("INDEX_SNAPSHOT_REQUIRED",
      "生产 current-index 品牌只能由 loadCurrentIndex 的稳定持久快照签发。");
  }
  const verified = await verifyCurrentIndexValue(workspaceRoot, value);
  const persistedText = Buffer.from(snapshot.bytes).toString("utf8");
  if (snapshot.path !== CURRENT_INDEX_RELATIVE_PATH
    || persistedText !== serializeCurrentIndex(value)) {
    fail("INDEX_RAW_DRIFT", "current index 必须是唯一 pretty JSON + LF materialization。");
  }
  if (EXPECTED_PERSISTED.rawBytes <= 0
    || snapshot.rawBytes !== EXPECTED_PERSISTED.rawBytes
    || snapshot.rawSha256 !== EXPECTED_PERSISTED.rawSha256
    || value.indexDigest !== EXPECTED_PERSISTED.indexDigest) {
    fail("INDEX_RAW_DRIFT", "current index out-of-band pin 漂移。");
  }
  weakMapSet(VERIFIED_INDEXES, verified, OBJECT_FREEZE({
    rawBytes: snapshot.rawBytes,
    rawSha256: snapshot.rawSha256
  }));
  return verified;
}

export const assertCurrentIndex = verifyCurrentIndex;

export async function loadCurrentIndex(workspaceRoot = process.cwd()) {
  let snapshot;
  try {
    snapshot = await readBaziDttStableWorkspaceArtifact(
      workspaceRoot,
      CURRENT_INDEX_RELATIVE_PATH
    );
  } catch (cause) {
    if (hasCauseCode(cause, "ENOENT")) {
      fail("CURRENT_INDEX_MISSING", CURRENT_INDEX_RELATIVE_PATH, cause);
    }
    fail("INDEX_RAW_DRIFT", `无法稳定读取 ${CURRENT_INDEX_RELATIVE_PATH}。`, cause);
  }
  const parsed = parseSnapshot(snapshot, "index");
  weakSetAdd(STABLE_INDEX_SNAPSHOTS, snapshot);
  try {
    return await verifyCurrentIndex(workspaceRoot, parsed, snapshot);
  } finally {
    weakSetDelete(STABLE_INDEX_SNAPSHOTS, snapshot);
  }
}

export function isVerifiedCurrentIndex(value) {
  return value !== null && typeof value === "object" && weakMapHas(VERIFIED_INDEXES, value);
}

export function getCurrentIndexSummary(value) {
  const metadata = weakMapGet(VERIFIED_INDEXES, value);
  if (!metadata) fail("INDEX_PRIVATE_BRAND_REQUIRED", "current index 缺少私有验证品牌。");
  const counts = {
    selectedCurrentHead: 0,
    selectedCurrentBelowHead: 0,
    nonformalHeadFormalCurrentIsLower: 0,
    historicalHeadCurrentUnavailable: 0,
    currentObservationOnlyNoCurrentStatus: 0
  };
  for (const entry of value.entries) {
    if (entry.selectionState === SELECTION_STATES.selected) counts.selectedCurrentHead += 1;
    else if (entry.selectionState === SELECTION_STATES.selectedBelowHead) {
      counts.selectedCurrentBelowHead += 1;
    }
    else if (entry.selectionState === SELECTION_STATES.nonformal) {
      counts.nonformalHeadFormalCurrentIsLower += 1;
    } else if (entry.selectionState === SELECTION_STATES.unavailable) {
      counts.historicalHeadCurrentUnavailable += 1;
    } else if (entry.selectionState === SELECTION_STATES.observation) {
      counts.currentObservationOnlyNoCurrentStatus += 1;
    }
  }
  const familyCurrentAvailable = (familyKey) => value.entries.some(
    (entry) => entry.familyKey === familyKey && entry.selectedCurrent !== null
  );
  const summary = {
    currentIndexMechanicallyVerified: true,
    indexId: value.indexId,
    indexDigest: value.indexDigest,
    historyCheckpoint: value.historyCheckpoint,
    historyCheckpointIdentityMechanicallyVerified: true,
    fullHistoryVerifiedByCurrentIndexLoad: false,
    artifact: {
      path: CURRENT_INDEX_RELATIVE_PATH,
      rawBytes: metadata.rawBytes,
      rawSha256: metadata.rawSha256
    },
    entryCount: value.entries.length,
    selectionCounts: counts,
    selectedCurrentCount: value.entries.filter((entry) => entry.selectedCurrent !== null).length,
    currentUnavailableCount: value.entries.filter((entry) => entry.selectedCurrent === null).length,
    currentFourSystemStatusAvailable: familyCurrentAvailable(
      "content/system-admission/four-system-current-status-observation-child"
    ),
    westernCurrentManifestAvailable: familyCurrentAvailable(
      "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest"
    ),
    ziweiCurrentManifestAvailable: familyCurrentAvailable(
      "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest"
    ),
    vedicCurrentManifestAvailable: familyCurrentAvailable(
      "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest"
    ),
    baziCurrentManifestAvailable: familyCurrentAvailable(
      "content/domain-release/bazi.single-chart-report.v1.7.0.manifest"
    ),
    baziCurrentMachineIdentityAvailable: familyCurrentAvailable(
      "content/system-admission/bazi-current-machine-identity-successor"
    ),
    bundledKnowledgeManifestAvailable: familyCurrentAvailable(
      "content/knowledge/manifest"
    ),
    baziExpertReviewPacketCurrentAvailable:
      value.nonVersionedSelections.baziExpertReviewPacket.currentAvailable,
    projectReleaseGovernance: value.projectReleaseGovernance,
    authorityBoundary: value.authorityBoundary,
    snapshotBoundary: value.snapshotBoundary,
    selectionBoundary: value.selectionBoundary
  };
  return deepFreeze(summary);
}

export function parseStrictJsonBytes(bytes, label = CURRENT_INDEX_RELATIVE_PATH) {
  const captured = Buffer.from(bytes);
  return parseSnapshot(OBJECT_FREEZE({
    path: label,
    bytes: captured,
    rawBytes: captured.byteLength,
    rawSha256: sha256(captured)
  }), "index");
}

export const currentIndexTestOnly = OBJECT_FREEZE({
  DIGEST_DOMAIN,
  EXPECTED_PERSISTED,
  BAZI_EXPERT_REVIEW_PACKET,
  SELECTION_BOUNDARY,
  FAMILY_POLICIES,
  SELECTION_STATES,
  selectionForFamily,
  selectionStateForBinding,
  expectedCurrentEntry,
  parseStrictJsonBytes,
  enumerateFamilyVersions,
  buildExpectedIndex,
  buildNonVersionedSelections,
  verifyValue: verifyCurrentIndexValue,
  assertIndex: verifyCurrentIndexValue,
  parseVersion,
  compareVersions,
  canonicalStringify
});
