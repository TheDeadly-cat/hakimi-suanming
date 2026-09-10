import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
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

import {
  CURRENT_INDEX_FAMILY_POLICIES,
  CURRENT_INDEX_RELATIVE_PATH,
  CurrentIndexError,
  computeCurrentIndexDigest,
  enumerateFamilyVersions,
  getCurrentIndexSummary,
  isVerifiedCurrentIndex,
  loadCurrentIndex,
  serializeCurrentIndex,
  verifyCurrentIndex,
  currentIndexTestOnly
} from "./current-index-lib.mjs";
import {
  HISTORY_CHECKPOINT_RELATIVE_PATH
} from "./history-checkpoint-lib.mjs";
import { computeExpertReviewPacketDigest } from "./bazi-expert-review-packet-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const INDEX_PATH = path.resolve(ROOT, ...CURRENT_INDEX_RELATIVE_PATH.split("/"));
const CLI = path.resolve(ROOT, "scripts", "verify-current-index.mjs");
const SHA256 = /^[0-9a-f]{64}$/u;

function clone(value) {
  return structuredClone(value);
}

function reseal(value) {
  value.indexDigest = computeCurrentIndexDigest(value);
  return value;
}

async function syntheticExpertSelectionWorkspace(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-expert-selection-contract-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const index = JSON.parse(await readFile(INDEX_PATH, "utf8"));
  const packet = JSON.parse(await readFile(path.join(ROOT, "content", "bazi-strength-expert-review-packet.v1.json"), "utf8"));
  // A temporary structural selection fixture, never a new real review packet.
  packet.packetId = "test-only.synthetic-expert-selection/2.0.0";
  packet.packetDigest = computeExpertReviewPacketDigest(packet);
  const relativePath = "content/bazi-strength-expert-review-packet.v2.0.0.json";
  const bytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`, "utf8");
  await mkdir(path.join(workspace, "content"));
  await writeFile(path.join(workspace, ...relativePath.split("/")), bytes);
  const selections = clone(index.nonVersionedSelections);
  selections.baziExpertReviewPacket.currentAvailable = true;
  selections.baziExpertReviewPacket.selectedCurrent = {
    path: relativePath,
    version: "2.0.0",
    rawBytes: bytes.byteLength,
    rawSha256: createHash("sha256").update(bytes).digest("hex"),
    packetId: packet.packetId,
    packetDigest: packet.packetDigest
  };
  selections.baziExpertReviewPacket.driftReasons = [];
  return { workspace, selections, packet, bytes };
}

test("T3 explicit expert selection reads only the chosen packet and never promotes a newer file", async (t) => {
  const { workspace, selections } = await syntheticExpertSelectionWorkspace(t);
  await writeFile(path.join(workspace, "content", "bazi-strength-expert-review-packet.v99.json"), "not selected and not parsed");
  const result = await currentIndexTestOnly.buildNonVersionedSelections(workspace, selections);
  assert.deepEqual(result, selections);
  assert.equal(result.baziExpertReviewPacket.selectedCurrent.version, "2.0.0");
  assert.equal(result.baziExpertReviewPacket.historicalAnchorVerifiedByCurrentLoad, false);
  assert.equal(isVerifiedCurrentIndex(result), false);
  assert.equal(Object.isFrozen(result), true);
  // The historical packet does not exist in this temporary workspace.
  await assert.rejects(readFile(path.join(workspace, "content", "bazi-strength-expert-review-packet.v1.json")), { code: "ENOENT" });
});

test("T3 absent expert selection stays unavailable without reading an anchor or inventing a current packet", async (t) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-expert-selection-empty-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const index = JSON.parse(await readFile(INDEX_PATH, "utf8"));
  index.nonVersionedSelections.baziExpertReviewPacket.currentAvailable = false;
  index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent = null;
  index.nonVersionedSelections.baziExpertReviewPacket.driftReasons = [{
    code: "current_expert_review_packet_not_selected"
  }];
  assert.deepEqual(
    await currentIndexTestOnly.buildNonVersionedSelections(workspace, index.nonVersionedSelections),
    index.nonVersionedSelections
  );
});

test("T3 explicit expert selection rejects selected-byte drift and preserves the historical anchor", async (t) => {
  const { workspace, selections, bytes } = await syntheticExpertSelectionWorkspace(t);
  const selectedPath = path.join(workspace, ...selections.baziExpertReviewPacket.selectedCurrent.path.split("/"));
  await writeFile(selectedPath, Buffer.concat([bytes, Buffer.from(" ")]));
  await assert.rejects(currentIndexTestOnly.buildNonVersionedSelections(workspace, selections), expectCode("SELECTED_EXPERT_IDENTITY_DRIFT"));
  await writeFile(selectedPath, bytes);
  const changedAnchor = clone(selections);
  changedAnchor.baziExpertReviewPacket.historicalAnchor.rawSha256 = "a".repeat(64);
  await assert.rejects(currentIndexTestOnly.buildNonVersionedSelections(workspace, changedAnchor), expectCode("NON_VERSIONED_SELECTION_MISMATCH"));
});

test("T3 explicit expert selection rejects wrong ID, semantic digest, path, version and availability", async (t) => {
  const { workspace, selections } = await syntheticExpertSelectionWorkspace(t);
  for (const mutate of [
    (value) => { value.selectedCurrent.packetId = "test-only.other-packet"; },
    (value) => { value.selectedCurrent.packetDigest = "a".repeat(64); },
    (value) => { value.selectedCurrent.path = "content/../private-packet.json"; },
    (value) => { value.selectedCurrent.version = "3.0.0"; },
    (value) => { value.currentAvailable = false; },
    (value) => { value.historicalAnchorVerifiedByCurrentLoad = true; },
    (value) => { value.selectedCurrent.qualified = true; }
  ]) {
    const candidate = clone(selections);
    mutate(candidate.baziExpertReviewPacket);
    await assert.rejects(
      currentIndexTestOnly.buildNonVersionedSelections(workspace, candidate),
      expectCode("NON_VERSIONED_SELECTION_MISMATCH", "SELECTED_EXPERT_IDENTITY_DRIFT")
    );
  }
});

function expectCode(...codes) {
  return (error) => {
    let current = error;
    for (let depth = 0; current && depth < 16; depth += 1) {
      if (current instanceof CurrentIndexError && codes.includes(current.code)) return true;
      current = current.cause;
    }
    return false;
  };
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_REPL_EXTERNAL_MODULE"]) {
    if (!(key in extra)) delete environment[key];
  }
  return environment;
}

function collectBoundPaths(value, output = new Set()) {
  if (value === null || typeof value !== "object") return output;
  if (typeof value.path === "string"
    && /^(?:content|packages)\//u.test(value.path)
    && !value.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    output.add(value.path);
  }
  for (const key of Object.keys(value)) collectBoundPaths(value[key], output);
  return output;
}

async function copyRelative(sourceRoot, destinationRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function makeWorkspace(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-index-test-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const text = await readFile(INDEX_PATH, "utf8");
  const index = JSON.parse(text);
  const boundPaths = collectBoundPaths(index);
  boundPaths.add(CURRENT_INDEX_RELATIVE_PATH);
  boundPaths.add(HISTORY_CHECKPOINT_RELATIVE_PATH);
  for (const familyPolicy of Object.values(CURRENT_INDEX_FAMILY_POLICIES)) {
    const members = await enumerateFamilyVersions(ROOT, familyPolicy);
    for (const member of members) boundPaths.add(member.path);
  }
  for (const relativePath of boundPaths) {
    await copyRelative(ROOT, workspace, relativePath);
  }
  return { workspace, index };
}

async function findOlderThanSupersedes(workspaceRoot, index, familyKey = undefined) {
  const policies = Object.values(CURRENT_INDEX_FAMILY_POLICIES);
  for (const familyPolicy of policies) {
    if (familyKey !== undefined && familyPolicy.familyKey !== familyKey) continue;
    const entry = index.entries.find((candidate) =>
      candidate.familyKey === familyPolicy.familyKey);
    assert.ok(entry, familyPolicy.familyKey);
    const currentPaths = new Set([
      entry.head?.path,
      entry.supersedes?.path,
      entry.selectedCurrent?.path
    ].filter((value) => typeof value === "string"));
    const members = await enumerateFamilyVersions(workspaceRoot, familyPolicy);
    const victim = members.find((member) => !currentPaths.has(member.path));
    if (victim !== undefined) return { entry, familyPolicy, victim };
  }
  assert.fail("fixture must contain a member older than direct supersedes");
}

async function replaceIndentationWithoutChangingLength(absolutePath) {
  const before = await readFile(absolutePath);
  const text = before.toString("utf8");
  const changed = text.replace("  \"", " \t\"");
  assert.notEqual(changed, text, absolutePath);
  assert.equal(Buffer.byteLength(changed, "utf8"), before.byteLength, absolutePath);
  assert.doesNotThrow(() => JSON.parse(changed), absolutePath);
  await writeFile(absolutePath, changed, "utf8");
}

async function artifactBinding(relativePath, artifactIdField, semanticDigestField) {
  const absolutePath = path.resolve(ROOT, ...relativePath.split("/"));
  const bytes = await readFile(absolutePath);
  const value = JSON.parse(bytes.toString("utf8"));
  const match = relativePath.match(/\.v([0-9]+)(?:\.([0-9]+))?(?:\.([0-9]+))?\.json$/u);
  assert.ok(match, relativePath);
  return {
    version: `${match[1]}.${match[2] ?? "0"}.${match[3] ?? "0"}`,
    path: relativePath,
    rawBytes: bytes.length,
    rawSha256: createHash("sha256").update(bytes).digest("hex"),
    artifactIdField,
    artifactId: value[artifactIdField],
    semanticDigestField,
    semanticDigest: value[semanticDigestField]
  };
}

test("real workspace loads the exact 25-family slim index with a checkpoint identity brand", async () => {
  const index = await loadCurrentIndex(ROOT);
  const summary = getCurrentIndexSummary(index);
  assert.equal(isVerifiedCurrentIndex(index), true);
  assert.equal(isVerifiedCurrentIndex(clone(index)), false);
  assert.equal(Object.isFrozen(index), true);
  assert.equal(Object.isFrozen(index.entries), true);
  assert.equal(summary.currentIndexMechanicallyVerified, true);
  assert.equal(summary.entryCount, 25);
  assert.deepEqual(summary.selectionCounts, {
    selectedCurrentHead: 16,
    selectedCurrentBelowHead: 0,
    nonformalHeadFormalCurrentIsLower: 0,
    historicalHeadCurrentUnavailable: 8,
    currentObservationOnlyNoCurrentStatus: 1
  });
  assert.equal(summary.selectedCurrentCount, 17);
  assert.equal(summary.currentUnavailableCount, 8);
  assert.equal(index.historyCheckpoint.familyCount, 25);
  assert.equal(index.historyCheckpoint.memberCount, 78);
  assert.equal(summary.historyCheckpointIdentityMechanicallyVerified, true);
  assert.equal(summary.fullHistoryVerifiedByCurrentIndexLoad, false);
  assert.ok(index.entries.every((entry) => !Object.hasOwn(entry, "history")));
});

test("persisted index bytes, raw SHA-256 and semantic digest are exact", async () => {
  const [index, bytes] = await Promise.all([
    loadCurrentIndex(ROOT),
    readFile(INDEX_PATH)
  ]);
  const summary = getCurrentIndexSummary(index);
  assert.equal(bytes.toString("utf8"), serializeCurrentIndex(index));
  assert.equal(bytes.length, summary.artifact.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), summary.artifact.rawSha256);
  assert.match(index.indexDigest, SHA256);
  assert.equal(computeCurrentIndexDigest(index), index.indexDigest);
  assert.deepEqual(currentIndexTestOnly.EXPECTED_PERSISTED, {
    rawBytes: bytes.length,
    rawSha256: summary.artifact.rawSha256,
    indexDigest: index.indexDigest
  });
});

test("every slim family binds only its head, direct predecessor, and selected current", async () => {
  const index = await loadCurrentIndex(ROOT);
  for (const entry of index.entries) {
    assert.deepEqual(Object.keys(entry).sort(), [
      "familyKey", "head", "selectedCurrent", "selectionState", "supersedes"
    ], entry.familyKey);
    assert.equal(Object.hasOwn(entry, "history"), false, entry.familyKey);
    assert.notEqual(entry.head, null, entry.familyKey);
    assert.notEqual(entry.supersedes, null, entry.familyKey);
    const predecessor = currentIndexTestOnly.parseVersion(entry.supersedes.version);
    const head = currentIndexTestOnly.parseVersion(entry.head.version);
    assert.equal(currentIndexTestOnly.compareVersions(predecessor, head) < 0, true,
      entry.familyKey);
  }
  const knowledge = index.entries.find((entry) => entry.familyKey === "content/knowledge/manifest");
  assert.ok(knowledge);
  assert.equal(knowledge.head.path, "content/knowledge/manifest.v2.json");
  assert.equal(knowledge.head.artifactIdField, "schemaVersion");
  assert.equal(knowledge.head.artifactId, "2.0.0");
  assert.equal(knowledge.head.semanticDigestField, null);
  assert.equal(knowledge.head.semanticDigest, null);
});

test("re-sealing cannot hide indexed head SHA, id, or semantic digest tampering", async () => {
  const index = await loadCurrentIndex(ROOT);
  const cases = [
    ["ENTRY_SHA_MISMATCH", (binding) => { binding.rawSha256 = "0".repeat(64); }],
    ["ENTRY_ID_MISMATCH", (binding) => { binding.artifactId += "-forged"; }],
    ["ENTRY_DIGEST_MISMATCH", (binding) => { binding.semanticDigest = "0".repeat(64); }]
  ];
  for (const [code, mutate] of cases) {
    const candidate = clone(index);
    const entry = candidate.entries[0];
    mutate(entry.head);
    if (entry.selectedCurrent?.path === entry.head.path) mutate(entry.selectedCurrent);
    reseal(candidate);
    await assert.rejects(currentIndexTestOnly.verifyValue(ROOT, candidate), expectCode(code));
  }
});

test("an altered index digest fails before a verified result exists", async () => {
  const index = clone(await loadCurrentIndex(ROOT));
  index.indexDigest = "0".repeat(64);
  await assert.rejects(
    currentIndexTestOnly.verifyValue(ROOT, index),
    expectCode("INDEX_DIGEST_MISMATCH")
  );
});

test("public verification cannot mint a brand without the loader's private stable snapshot", async () => {
  const candidate = clone(await loadCurrentIndex(ROOT));
  await assert.rejects(
    verifyCurrentIndex(ROOT, candidate),
    expectCode("INDEX_SNAPSHOT_REQUIRED")
  );
  assert.equal(isVerifiedCurrentIndex(candidate), false);
  const pureResult = await currentIndexTestOnly.verifyValue(ROOT, candidate);
  assert.equal(isVerifiedCurrentIndex(pureResult), false);
  assert.throws(
    () => getCurrentIndexSummary(pureResult),
    expectCode("INDEX_PRIVATE_BRAND_REQUIRED")
  );
});

test("post-import WeakMap and WeakSet prototype pollution cannot forge current-index brands", async () => {
  const verified = await loadCurrentIndex(ROOT);
  const cloneIndex = clone(verified);
  const originals = {
    weakMapGet: WeakMap.prototype.get,
    weakMapHas: WeakMap.prototype.has,
    weakMapSet: WeakMap.prototype.set,
    weakSetAdd: WeakSet.prototype.add,
    weakSetDelete: WeakSet.prototype.delete,
    weakSetHas: WeakSet.prototype.has
  };
  try {
    WeakMap.prototype.get = () => ({ rawBytes: 1, rawSha256: "0".repeat(64) });
    WeakMap.prototype.has = () => true;
    WeakMap.prototype.set = function forgedSet() { return this; };
    WeakSet.prototype.add = function forgedAdd() { return this; };
    WeakSet.prototype.delete = () => true;
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedCurrentIndex(verified), true);
    assert.equal(isVerifiedCurrentIndex(cloneIndex), false);
    assert.equal(getCurrentIndexSummary(verified).entryCount, 25);
    assert.throws(
      () => getCurrentIndexSummary(cloneIndex),
      expectCode("INDEX_PRIVATE_BRAND_REQUIRED")
    );
  } finally {
    WeakMap.prototype.get = originals.weakMapGet;
    WeakMap.prototype.has = originals.weakMapHas;
    WeakMap.prototype.set = originals.weakMapSet;
    WeakSet.prototype.add = originals.weakSetAdd;
    WeakSet.prototype.delete = originals.weakSetDelete;
    WeakSet.prototype.has = originals.weakSetHas;
  }
});

test("post-import Object.freeze pollution cannot produce a mutable branded index", async () => {
  const original = Object.freeze;
  try {
    Object.freeze = (value) => value;
    const index = await loadCurrentIndex(ROOT);
    assert.equal(isVerifiedCurrentIndex(index), true);
    assert.equal(Object.isFrozen(index), true);
    assert.equal(Object.isFrozen(index.entries), true);
    assert.equal(Object.isFrozen(index.entries[0]), true);
    assert.equal(Object.isFrozen(index.entries[0].head), true);
  } finally {
    Object.freeze = original;
  }
});

test("an unindexed higher version in a family directory fails closed", async (t) => {
  const { workspace, index } = await makeWorkspace(t);
  const entry = index.entries.find((candidate) =>
    candidate.familyKey === "content/system-admission/four-system-current-status-observation-child");
  const higherPath = `${entry.familyKey}.v99.0.0.json`;
  await copyRelative(ROOT, workspace, entry.head.path);
  await copyFile(
    path.resolve(workspace, ...entry.head.path.split("/")),
    path.resolve(workspace, ...higherPath.split("/"))
  );
  await assert.rejects(
    loadCurrentIndex(workspace),
    expectCode("UNINDEXED_HIGHER_VERSION")
  );
});

test("an unindexed production knowledge manifest v3 fails closed", async (t) => {
  const { workspace } = await makeWorkspace(t);
  await copyFile(
    path.resolve(workspace, "content", "knowledge", "manifest.v2.json"),
    path.resolve(workspace, "content", "knowledge", "manifest.v3.json")
  );
  await assert.rejects(
    loadCurrentIndex(workspace),
    expectCode("UNINDEXED_HIGHER_VERSION")
  );
});

test("a new two-member version family absent from policy fails closed", async (t) => {
  const { workspace } = await makeWorkspace(t);
  await copyFile(
    path.resolve(workspace, "content", "knowledge", "manifest.v1.json"),
    path.resolve(workspace, "content", "unindexed-family.v1.json")
  );
  await copyFile(
    path.resolve(workspace, "content", "knowledge", "manifest.v2.json"),
    path.resolve(workspace, "content", "unindexed-family.v2.json")
  );
  await assert.rejects(
    loadCurrentIndex(workspace),
    expectCode("UNINDEXED_VERSION_FAMILY")
  );
});

test("a re-sealed index whose declared head is not the numeric family maximum fails", async (t) => {
  const { workspace, index } = await makeWorkspace(t);
  const candidate = clone(index);
  const entry = candidate.entries.find((item) =>
    item.familyKey === "content/bazi-strength-source-binding-candidates");
  const v1Path = "content/bazi-strength-source-binding-candidates.v1.json";
  await copyRelative(ROOT, workspace, v1Path);
  entry.head = clone(entry.supersedes);
  entry.selectedCurrent = clone(entry.head);
  entry.supersedes = await artifactBinding(
    v1Path,
    entry.head.artifactIdField,
    entry.head.semanticDigestField
  );
  reseal(candidate);
  await assert.rejects(
    currentIndexTestOnly.verifyValue(workspace, candidate),
    expectCode("HEAD_NOT_HIGHEST", "UNINDEXED_HIGHER_VERSION")
  );
});

test("removing the direct predecessor fails cheap checkpoint name inventory", async (t) => {
  const { workspace, index } = await makeWorkspace(t);
  const entry = index.entries.find((candidate) =>
    candidate.familyKey === "content/system-admission/four-system-current-status-observation-child");
  await rm(path.resolve(workspace, ...entry.supersedes.path.split("/")));
  await assert.rejects(
    loadCurrentIndex(workspace),
    expectCode("FAMILY_MEMBER_INVENTORY_MISMATCH")
  );
});

test("same-length valid JSON drift older than direct supersedes does not affect cheap current", async (t) => {
  const { workspace, index } = await makeWorkspace(t);
  const { entry, victim } = await findOlderThanSupersedes(workspace, index);
  assert.notEqual(victim.path, entry.head.path);
  assert.notEqual(victim.path, entry.supersedes.path);
  assert.notEqual(victim.path, entry.selectedCurrent?.path);
  await replaceIndentationWithoutChangingLength(
    path.resolve(workspace, ...victim.path.split("/"))
  );
  const verified = await loadCurrentIndex(workspace);
  assert.equal(isVerifiedCurrentIndex(verified), true);
  assert.equal(getCurrentIndexSummary(verified).fullHistoryVerifiedByCurrentIndexLoad, false);
});

test("strict index JSON parsing rejects literal duplicate keys", () => {
  const bytes = Buffer.from(
    '{"schemaVersion":"1.0.0","schemaVersion":"9.9.9"}',
    "utf8"
  );
  assert.throws(
    () => currentIndexTestOnly.parseStrictJsonBytes(bytes),
    expectCode("INDEX_JSON_DUPLICATE_KEY")
  );
});

test("legacy-v13 / 13 / null and every authority boundary are fail-closed", async () => {
  const index = await loadCurrentIndex(ROOT);
  assert.deepEqual(index.projectReleaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.ok(Object.values(index.authorityBoundary).every((value) => value === false));
  assert.deepEqual(index.selectionBoundary, {
    familyHeadMeansHighestPersistedVersionOnly: true,
    selectedCurrentMeansRepositorySelectionOnly: true,
    selectedCurrentDoesNotEstablishFormalAdmission: true,
    latestVersionDoesNotImplyAuthority: true,
    automaticPromotionAllowed: false
  });
  for (const mutate of [
    (value) => { value.projectReleaseGovernance.activeLine = "candidate-v16"; },
    (value) => { value.projectReleaseGovernance.targetSchema = 16; },
    (value) => { value.projectReleaseGovernance.migrationId = "forged"; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; },
    (value) => { value.selectionBoundary.automaticPromotionAllowed = true; }
  ]) {
    const candidate = clone(index);
    mutate(candidate);
    reseal(candidate);
    await assert.rejects(
      currentIndexTestOnly.verifyValue(ROOT, candidate),
      (error) => error instanceof CurrentIndexError
        && ["PROJECT_GOVERNANCE_DRIFT", "AUTHORITY_PROMOTION"].includes(error.code)
    );
  }
});

test("unselected independent and aggregate heads remain unavailable", async () => {
  const index = await loadCurrentIndex(ROOT);
  const unavailable = [
    "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest",
    "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest",
    "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest",
    "content/system-admission/bazi-current-machine-identity-successor",
    "content/system-admission/four-system-current-status-observation-child",
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements",
    "content/system-admission/western-source-binding-requirements",
    "content/system-admission/ziwei-source-binding-requirements"
  ];
  for (const familyKey of unavailable) {
    const entry = index.entries.find((candidate) => candidate.familyKey === familyKey);
    assert.ok(entry, familyKey);
    assert.equal(entry.selectionState, "historical_head_current_unavailable", familyKey);
    assert.equal(entry.selectedCurrent, null, familyKey);
  }
});

test("summary separates selected Bazi engineering inputs from unavailable aggregates", async () => {
  const index = await loadCurrentIndex(ROOT);
  const summary = getCurrentIndexSummary(index);
  assert.equal(summary.currentUnavailableCount, 8);
  assert.equal(summary.currentFourSystemStatusAvailable, false);
  assert.equal(summary.westernCurrentManifestAvailable, false);
  assert.equal(summary.ziweiCurrentManifestAvailable, false);
  assert.equal(summary.vedicCurrentManifestAvailable, false);
  assert.equal(summary.baziCurrentManifestAvailable, true);
  assert.equal(summary.baziCurrentMachineIdentityAvailable, false);
  assert.equal(summary.bundledKnowledgeManifestAvailable, true);
  assert.equal(summary.baziExpertReviewPacketCurrentAvailable, true);
  const packet = index.nonVersionedSelections.baziExpertReviewPacket;
  assert.equal(packet.currentAvailable, true);
  assert.equal(packet.selectedCurrent.path, "content/bazi-strength-expert-review-packet.current.json");
  assert.equal(packet.selectedCurrent.packetId, "hakimi.bazi.strength.expert-review-packet/1.6.0");
  assert.equal(packet.historicalAnchorVerifiedByCurrentLoad, false);
  assert.deepEqual(packet.driftReasons, []);
});

test("missing current index never falls back to the registry, status child, or Markdown", async (t) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-index-missing-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await assert.rejects(loadCurrentIndex(workspace), expectCode("CURRENT_INDEX_MISSING"));
});

test("current-index CLI succeeds without operands and rejects an operand", () => {
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment(),
    timeout: 120_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /currentIndexMechanicallyVerified|CURRENT_INDEX_OK/u);

  const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.notEqual(operand.status, 0);
});

test("current-index CLI invoked through a script symlink still executes main", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-index-cli-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const linkedCli = path.join(directory, "verify-current-index-link.mjs");
  try {
    await symlink(CLI, linkedCli, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  const outcome = spawnSync(process.execPath, [linkedCli], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment(),
    timeout: 120_000
  });
  assert.equal(outcome.status, 0, outcome.stderr);
  assert.match(outcome.stdout, /^CURRENT_INDEX_OK /u);
});
