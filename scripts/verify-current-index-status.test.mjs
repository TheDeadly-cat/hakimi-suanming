import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import test from "node:test";
import { pathToFileURL } from "node:url";

import {
  CURRENT_INDEX_FAMILY_POLICIES,
  computeCurrentIndexDigest,
  enumerateFamilyVersions,
  loadCurrentIndex,
  serializeCurrentIndex
} from "./current-index-lib.mjs";
import {
  HISTORICAL_BAZI_EXPERT_REVIEW_PACKET,
  HISTORY_CHECKPOINT_RELATIVE_PATH
} from "./history-checkpoint-lib.mjs";
import {
  CURRENT_INDEX_MACHINE_BLOCK_BEGIN,
  CURRENT_INDEX_MACHINE_BLOCK_END,
  CURRENT_INDEX_README_RELATIVE_PATH,
  CURRENT_INDEX_STATUS_RELATIVE_PATH,
  CURRENT_STATUS_ENTRYPOINT_BLOCK_BEGIN,
  CURRENT_STATUS_ENTRYPOINT_BLOCK_END,
  CurrentIndexStatusError,
  assertCurrentIndexStatusText,
  assertReadmeCurrentStatusEntrypointText,
  buildCurrentIndexStatusProjection,
  currentIndexStatusTestOnly,
  getCurrentIndexStatusSummary,
  isVerifiedCurrentIndexStatus,
  loadCurrentIndexStatus,
  renderReadmeCurrentStatusEntrypointBlock,
  renderCurrentIndexStatusDocument,
  renderCurrentIndexStatusMachineBlock
} from "./current-index-status-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const STATUS_PATH = path.resolve(
  ROOT,
  ...CURRENT_INDEX_STATUS_RELATIVE_PATH.split("/")
);
const README_PATH = path.resolve(ROOT, CURRENT_INDEX_README_RELATIVE_PATH);
const CLI = path.resolve(ROOT, "scripts", "verify-current-index-status.mjs");
const EXPERT_CURRENT_PATH = "content/bazi-strength-expert-review-packet.current.json";

function collectFixturePaths(value, output = new Set()) {
  if (value === null || typeof value !== "object") return output;
  if (typeof value.path === "string"
    && /^(?:content|packages)\//u.test(value.path)
    && !value.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    output.add(value.path);
  }
  for (const key of Object.keys(value)) collectFixturePaths(value[key], output);
  return output;
}

async function copyRelative(sourceRoot, destinationRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function makeWorkspaceWithoutStatus(t, { omitExpertCurrent = false, omitExpertHistory = false } = {}) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-status-test-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const indexPath = path.resolve(ROOT, "content", "system-admission", "current-index.v1.json");
  const index = JSON.parse(await readFile(indexPath, "utf8"));
  const paths = collectFixturePaths(index);
  paths.add("content/system-admission/current-index.v1.json");
  paths.add(HISTORY_CHECKPOINT_RELATIVE_PATH);
  paths.add(CURRENT_INDEX_README_RELATIVE_PATH);
  for (const familyPolicy of Object.values(CURRENT_INDEX_FAMILY_POLICIES)) {
    const members = await enumerateFamilyVersions(ROOT, familyPolicy);
    for (const member of members) paths.add(member.path);
  }
  if (omitExpertCurrent) paths.delete(EXPERT_CURRENT_PATH);
  if (omitExpertHistory) paths.delete(HISTORICAL_BAZI_EXPERT_REVIEW_PACKET.path);
  for (const relativePath of paths) await copyRelative(ROOT, workspace, relativePath);
  await mkdir(path.resolve(workspace, "docs", "status"), { recursive: true });
  return workspace;
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env, ...extra };
  for (const key of ["NODE_OPTIONS", "NODE_PATH", "NODE_DEBUG", "NODE_REPL_EXTERNAL_MODULE"]) {
    if (!(key in extra)) delete environment[key];
  }
  return environment;
}

test("real workspace status file is the exact machine projection of the verified index", async () => {
  const [index, status, text] = await Promise.all([
    loadCurrentIndex(ROOT),
    loadCurrentIndexStatus(ROOT),
    readFile(STATUS_PATH, "utf8")
  ]);
  assert.equal(text, renderCurrentIndexStatusDocument(index));
  assert.equal(isVerifiedCurrentIndexStatus(status), true);
  assert.equal(isVerifiedCurrentIndexStatus(structuredClone(status)), false);
  assert.equal(Object.isFrozen(status), true);
  assert.equal(Object.isFrozen(status.projection.entries), true);
});

test("post-import WeakSet prototype pollution cannot forge status brands", async () => {
  const status = await loadCurrentIndexStatus(ROOT);
  const clone = structuredClone(status);
  const originals = {
    add: WeakSet.prototype.add,
    has: WeakSet.prototype.has
  };
  try {
    WeakSet.prototype.add = function forgedAdd() { return this; };
    WeakSet.prototype.has = () => true;
    assert.equal(isVerifiedCurrentIndexStatus(status), true);
    assert.equal(isVerifiedCurrentIndexStatus(clone), false);
    assert.equal(getCurrentIndexStatusSummary(status).familyCount, 25);
    assert.throws(
      () => getCurrentIndexStatusSummary(clone),
      (error) => error?.code === "CURRENT_INDEX_STATUS_PRIVATE_BRAND_REQUIRED"
    );
  } finally {
    WeakSet.prototype.add = originals.add;
    WeakSet.prototype.has = originals.has;
  }
});

test("post-import Object.freeze pollution cannot produce a mutable branded status", async () => {
  const original = Object.freeze;
  try {
    Object.freeze = (value) => value;
    const status = await loadCurrentIndexStatus(ROOT);
    assert.equal(isVerifiedCurrentIndexStatus(status), true);
    assert.equal(Object.isFrozen(status), true);
    assert.equal(Object.isFrozen(status.projection), true);
    assert.equal(Object.isFrozen(status.projection.entries), true);
  } finally {
    Object.freeze = original;
  }
});

test("machine block occurs exactly once and contains the exact source identity projection", async () => {
  const index = await loadCurrentIndex(ROOT);
  const text = await readFile(STATUS_PATH, "utf8");
  const block = renderCurrentIndexStatusMachineBlock(index);
  assert.equal(text.split(CURRENT_INDEX_MACHINE_BLOCK_BEGIN).length - 1, 1);
  assert.equal(text.split(CURRENT_INDEX_MACHINE_BLOCK_END).length - 1, 1);
  assert.equal(text.includes(block), true);
  const projection = assertCurrentIndexStatusText(index, text);
  assert.equal(projection.source.indexId, index.indexId);
  assert.equal(projection.source.indexDigest, index.indexDigest);
  assert.equal(projection.source.machineSourceOnly, true);
  assert.equal(projection.source.humanDocumentIsAuthority, false);
});

test("README exposes exactly one guarded canonical current entrypoint block", async () => {
  const text = await readFile(README_PATH, "utf8");
  assert.equal(text.split(CURRENT_STATUS_ENTRYPOINT_BLOCK_BEGIN).length - 1, 1);
  assert.equal(text.split(CURRENT_STATUS_ENTRYPOINT_BLOCK_END).length - 1, 1);
  assert.equal(text.includes(renderReadmeCurrentStatusEntrypointBlock()), true);
  assert.equal(assertReadmeCurrentStatusEntrypointText(text), true);
  assert.throws(
    () => assertReadmeCurrentStatusEntrypointText(text.replace(
      "唯一机器 current 源",
      "另一个人工权威源"
    )),
    (error) => error?.code === "README_ENTRYPOINT_MISMATCH"
  );
});

test("status projection keeps legacy-v13 / 13 / null and all authority false", async () => {
  const projection = buildCurrentIndexStatusProjection(await loadCurrentIndex(ROOT));
  assert.deepEqual(projection.projectReleaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  assert.ok(Object.values(projection.authorityBoundary).every((value) => value === false));
  assert.equal(projection.snapshotBoundary.crossFileAtomicSnapshot, false);
  assert.equal(projection.snapshotBoundary.mutationEpochAvailableForSchema13, false);
  assert.equal(projection.snapshotBoundary.mutationEpochReceipt, null);
  assert.equal(projection.snapshotBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(projection.snapshotBoundary.abaExcluded, false);
  assert.equal(projection.snapshotBoundary.indexDigestIsDigitalSignature, false);
  assert.deepEqual(projection.selectionBoundary, {
    familyHeadMeansHighestPersistedVersionOnly: true,
    selectedCurrentMeansRepositorySelectionOnly: true,
    selectedCurrentDoesNotEstablishFormalAdmission: true,
    latestVersionDoesNotImplyAuthority: true,
    automaticPromotionAllowed: false
  });
});

test("status projection derives every unavailable family and no stale fallback", async () => {
  const projection = buildCurrentIndexStatusProjection(await loadCurrentIndex(ROOT));
  assert.equal(projection.currentAvailability.state, "unavailable");
  assert.equal(projection.currentAvailability.unavailableFamilyCount, 8);
  assert.equal(projection.entries.filter((entry) => entry.selectedCurrent !== null).length, 17);
  assert.equal(projection.currentAvailability.baziCurrentManifestAvailable, true);
  assert.equal(projection.currentAvailability.baziCurrentMachineIdentityAvailable, false);
  assert.equal(projection.currentAvailability.baziExpertReviewPacketCurrentAvailable, true);
  assert.equal(projection.currentAvailability.westernCurrentManifestAvailable, false);
  assert.equal(projection.currentAvailability.ziweiCurrentManifestAvailable, false);
  assert.equal(projection.currentAvailability.vedicCurrentManifestAvailable, false);
  assert.equal(projection.currentAvailability.bundledKnowledgeManifestAvailable, true);
  assert.equal(projection.currentAvailability.currentFourSystemStatusAvailable, false);
  assert.equal(projection.currentAvailability.latestPersistedArtifactDoesNotImplyCurrent, true);
  assert.deepEqual(
    projection.currentAvailability.unavailableFamilyKeys,
    projection.entries
      .filter((entry) => entry.selectedCurrent === null)
      .map((entry) => entry.familyKey)
  );
  for (const familyKey of projection.currentAvailability.unavailableFamilyKeys) {
    const entry = projection.entries.find((candidate) => candidate.familyKey === familyKey);
    assert.ok(entry, familyKey);
    assert.equal(entry.selectionState, "historical_head_current_unavailable", familyKey);
    assert.equal(entry.selectedCurrent, null, familyKey);
  }
});

test("full status loader rejects a drifted README current entrypoint", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t);
  await copyFile(STATUS_PATH, path.resolve(workspace, ...CURRENT_INDEX_STATUS_RELATIVE_PATH.split("/")));
  const readmePath = path.resolve(workspace, CURRENT_INDEX_README_RELATIVE_PATH);
  const text = await readFile(readmePath, "utf8");
  await writeFile(readmePath, text.replace("唯一机器 current 源", "人工文档 current 源"), "utf8");
  await assert.rejects(
    loadCurrentIndexStatus(workspace),
    (error) => error?.code === "README_ENTRYPOINT_MISMATCH"
  );
});

test("non-versioned Bazi expert packet projects its verified current binding without authority or a fresh historical assessment", async () => {
  const index = await loadCurrentIndex(ROOT);
  const projection = buildCurrentIndexStatusProjection(index);
  const packet = projection.nonVersionedSelections.baziExpertReviewPacket;
  assert.equal(packet.currentAvailable, true);
  assert.deepEqual(packet.selectedCurrent, index.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent);
  assert.equal(packet.selectedCurrent.path, EXPERT_CURRENT_PATH);
  assert.equal(packet.selectedCurrent.version, "1.6.0");
  assert.equal(packet.selectedCurrent.packetId, "hakimi.bazi.strength.expert-review-packet/1.6.0");
  assert.equal(Object.isFrozen(packet.selectedCurrent), true);
  assert.equal(packet.historicalAnchorVerifiedByCurrentLoad, false);
  assert.deepEqual(packet.historicalAnchor, HISTORICAL_BAZI_EXPERT_REVIEW_PACKET);
  assert.deepEqual(packet.driftReasons, []);
  assert.equal(projection.historyCheckpoint.path, "content/system-admission/history-checkpoint.v2.json");
  assert.equal(projection.historyCheckpoint.checkpointId, "hakimi.repository/history-checkpoint/2.0.0");
  assert.equal(projection.historyCheckpoint.familyCount, 25);
  assert.equal(projection.historyCheckpoint.memberCount, 78);
  assert.equal(projection.historyCheckpoint.fullHistoryVerifiedByCurrentIndexLoad, false);
  assert.ok(Object.values(projection.authorityBoundary).every((value) => value === false));
});

test("unselected expert packet data is valid but cannot replace the pinned current index", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t, { omitExpertCurrent: true });
  const indexPath = path.resolve(workspace, "content", "system-admission", "current-index.v1.json");
  const registered = JSON.parse(await readFile(indexPath, "utf8"));
  const packet = {
    currentAvailable: false,
    selectedCurrent: null,
    historicalAnchor: { ...HISTORICAL_BAZI_EXPERT_REVIEW_PACKET },
    historicalAnchorVerifiedByCurrentLoad: false,
    driftReasons: [{ code: "current_expert_review_packet_not_selected" }]
  };
  assert.doesNotThrow(() => currentIndexStatusTestOnly.requireExpertPacketSelectionBoundary(packet));
  assert.equal(packet.currentAvailable, false);
  assert.equal(packet.selectedCurrent, null);
  assert.equal(packet.historicalAnchorVerifiedByCurrentLoad, false);
  assert.deepEqual(packet.historicalAnchor, HISTORICAL_BAZI_EXPERT_REVIEW_PACKET);
  for (const invalid of [
    { ...packet, currentAvailable: true },
    { ...packet, driftReasons: [] },
    { ...packet, historicalAnchorVerifiedByCurrentLoad: true }
  ]) {
    assert.throws(
      () => currentIndexStatusTestOnly.requireExpertPacketSelectionBoundary(invalid),
      (error) => error?.code === "NON_VERSIONED_SELECTION_DRIFT"
    );
  }
  registered.nonVersionedSelections.baziExpertReviewPacket = packet;
  registered.indexDigest = computeCurrentIndexDigest(registered);
  await writeFile(indexPath, serializeCurrentIndex(registered), "utf8");
  await assert.rejects(
    loadCurrentIndex(workspace),
    (error) => error?.code === "INDEX_RAW_DRIFT"
  );
});

test("current expert projection does not read the historical packet anchor bytes", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t, { omitExpertHistory: true });
  await assert.rejects(
    readFile(path.resolve(workspace, ...HISTORICAL_BAZI_EXPERT_REVIEW_PACKET.path.split("/"))),
    (error) => error?.code === "ENOENT"
  );
  const projection = buildCurrentIndexStatusProjection(await loadCurrentIndex(workspace));
  assert.equal(projection.currentAvailability.baziExpertReviewPacketCurrentAvailable, true);
  assert.deepEqual(projection.nonVersionedSelections.baziExpertReviewPacket.historicalAnchor,
    HISTORICAL_BAZI_EXPERT_REVIEW_PACKET);
  assert.equal(projection.nonVersionedSelections.baziExpertReviewPacket.historicalAnchorVerifiedByCurrentLoad, false);
  assert.equal(projection.historyCheckpoint.fullHistoryVerifiedByCurrentIndexLoad, false);
});

test("a missing explicitly selected expert current packet fails closed without historical fallback", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t, { omitExpertCurrent: true });
  await assert.rejects(
    loadCurrentIndexStatus(workspace),
    (error) => error?.code === "ARTIFACT_UNREADABLE" && error.message.includes(EXPERT_CURRENT_PATH)
  );
});

test("invalid expert selection data cannot obtain a verified status projection", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t);
  const indexPath = path.resolve(workspace, "content", "system-admission", "current-index.v1.json");
  const original = JSON.parse(await readFile(indexPath, "utf8"));
  const cases = [
    ["availability disagrees with selection", (packet) => { packet.currentAvailable = false; }],
    ["unapproved current path", (packet) => { packet.selectedCurrent.path = "content/another-expert-packet.current.json"; }],
    ["unapproved current version", (packet) => { packet.selectedCurrent.version = "1.7.0"; }],
    ["unapproved current packet identity", (packet) => { packet.selectedCurrent.packetId = "hakimi.bazi.strength.expert-review-packet/1.7.0"; }],
    ["invalid byte count", (packet) => { packet.selectedCurrent.rawBytes = 0; }],
    ["rewritten historical anchor", (packet) => { packet.historicalAnchor.rawSha256 = "0".repeat(64); }],
    ["current read claims historical verification", (packet) => { packet.historicalAnchorVerifiedByCurrentLoad = true; }]
  ];
  for (const [label, mutate] of cases) {
    const candidate = structuredClone(original);
    mutate(candidate.nonVersionedSelections.baziExpertReviewPacket);
    candidate.indexDigest = computeCurrentIndexDigest(candidate);
    await writeFile(indexPath, serializeCurrentIndex(candidate), "utf8");
    await assert.rejects(
      loadCurrentIndexStatus(workspace),
      (error) => error?.code === "NON_VERSIONED_SELECTION_MISMATCH",
      label
    );
  }
});

test("stale, duplicated, missing, or independently edited machine blocks fail closed", async () => {
  const index = await loadCurrentIndex(ROOT);
  const text = renderCurrentIndexStatusDocument(index);
  const cases = [
    text.replace(index.indexDigest, "0".repeat(64)),
    text.replace(CURRENT_INDEX_MACHINE_BLOCK_BEGIN, ""),
    `${text}${CURRENT_INDEX_MACHINE_BLOCK_BEGIN}\n${CURRENT_INDEX_MACHINE_BLOCK_END}\n`,
    `${text}\n人工补充：current=true\n`
  ];
  for (const candidate of cases) {
    assert.throws(
      () => assertCurrentIndexStatusText(index, candidate),
      (error) => error instanceof CurrentIndexStatusError
        && ["MACHINE_BLOCK_COUNT_INVALID", "STATUS_DOCUMENT_MISMATCH"].includes(error.code)
    );
  }
});

test("status loader rejects a hard-linked machine projection endpoint", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t);
  const source = path.resolve(workspace, "status-source.md");
  const target = path.resolve(workspace, "docs", "status", "current-index-summary.md");
  await copyFile(STATUS_PATH, source);
  try {
    await link(source, target);
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
      t.skip(`hard links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    loadCurrentIndexStatus(workspace),
    (error) => error?.code === "CURRENT_INDEX_STATUS_ENDPOINT_INVALID"
  );
});

test("status loader rejects a symbolic-link machine projection endpoint", async (t) => {
  const workspace = await makeWorkspaceWithoutStatus(t);
  const source = path.resolve(workspace, "status-source.md");
  const target = path.resolve(workspace, "docs", "status", "current-index-summary.md");
  await copyFile(STATUS_PATH, source);
  try {
    await symlink(source, target, "file");
  } catch (error) {
    if (["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) {
      t.skip(`symbolic links unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    loadCurrentIndexStatus(workspace),
    (error) => error?.code === "CURRENT_INDEX_STATUS_ENDPOINT_INVALID"
  );
});

test("branded status summary is bounded and preserves unavailable state", async () => {
  const status = await loadCurrentIndexStatus(ROOT);
  const summary = getCurrentIndexStatusSummary(status);
  assert.equal(summary.currentIndexStatusMechanicallyVerified, true);
  assert.equal(summary.familyCount, 25);
  assert.equal(summary.currentAvailability.state, "unavailable");
  assert.equal(summary.currentAvailability.unavailableFamilyCount, 8);
  assert.equal(summary.source.humanDocumentIsAuthority, false);
  assert.equal(summary.nonVersionedSelections.baziExpertReviewPacket.currentAvailable, true);
  assert.deepEqual(summary.nonVersionedSelections.baziExpertReviewPacket,
    status.projection.nonVersionedSelections.baziExpertReviewPacket);
  assert.equal(Object.isFrozen(summary.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent), true);
  assert.throws(
    () => getCurrentIndexStatusSummary(structuredClone(status)),
    (error) => error?.code === "CURRENT_INDEX_STATUS_PRIVATE_BRAND_REQUIRED"
  );
});

test("CLI succeeds with no operands and rejects operands or visible loader injection", () => {
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment(),
    timeout: 120_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /^CURRENT_INDEX_STATUS_OK /u);
  const summary = JSON.parse(normal.stdout.slice("CURRENT_INDEX_STATUS_OK ".length));
  assert.equal(summary.currentAvailability.state, "unavailable");
  assert.equal(summary.currentAvailability.unavailableFamilyCount, 8);

  const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.notEqual(operand.status, 0);
  assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);

  const preload = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment({ NODE_OPTIONS: "--no-warnings" })
  });
  assert.notEqual(preload.status, 0);
  assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
});

test("status CLI invoked through a script symlink still executes main", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-current-status-cli-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const linkedCli = path.join(directory, "verify-current-index-status-link.mjs");
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
  assert.match(outcome.stdout, /^CURRENT_INDEX_STATUS_OK /u);
});

test("status CLI fails closed when its invoked entrypoint cannot be realpathed", () => {
  const missing = path.join(
    os.tmpdir(),
    `missing-current-index-status-entry-${process.pid}-${Date.now()}.mjs`
  );
  const script = [
    `process.argv[1] = ${JSON.stringify(missing)};`,
    `await import(${JSON.stringify(pathToFileURL(CLI).href)});`
  ].join("\n");
  const outcome = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", script],
    {
      cwd: os.tmpdir(),
      encoding: "utf8",
      env: cleanEnvironment()
    }
  );
  assert.notEqual(outcome.status, 0);
  assert.match(outcome.stderr, /^CURRENT_INDEX_STATUS_FAILED ENTRYPOINT_REALPATH_FAILED\n$/u);
  assert.equal(outcome.stdout, "");
});
