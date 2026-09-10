import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  computeHistoryCheckpointDigest,
  computeHistoryRootDigest,
  getHistoryCheckpointIdentity,
  getHistoryCheckpointSummary,
  HISTORY_CHECKPOINT_RELATIVE_PATH,
  PREVIOUS_HISTORY_CHECKPOINT,
  HISTORICAL_BAZI_EXPERT_REVIEW_PACKET,
  HistoryCheckpointError,
  historyCheckpointTestOnly,
  isVerifiedHistoryCheckpoint,
  isVerifiedHistoryCheckpointIdentity,
  loadHistoryCheckpoint,
  loadHistoryCheckpointIdentity,
  parseStrictHistoryCheckpointBytes,
  serializeHistoryCheckpoint,
  verifyHistoryCheckpointIdentity
} from "./history-checkpoint-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CHECKPOINT_PATH = path.resolve(
  ROOT,
  ...HISTORY_CHECKPOINT_RELATIVE_PATH.split("/")
);
const CLI = path.resolve(ROOT, "scripts", "verify-history-checkpoint.mjs");
const WRITER = path.resolve(ROOT, "scripts", "write-history-checkpoint.mjs");
const SHA256 = /^[0-9a-f]{64}$/u;

function clone(value) {
  return structuredClone(value);
}

function reseal(value) {
  value.historyRootDigest = computeHistoryRootDigest(value.families);
  value.checkpointDigest = computeHistoryCheckpointDigest(value);
  return value;
}

function expectCode(...codes) {
  return (error) => {
    let current = error;
    for (let depth = 0; current && depth < 16; depth += 1) {
      if (current instanceof HistoryCheckpointError && codes.includes(current.code)) return true;
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

async function copyRelative(sourceRoot, destinationRoot, relativePath) {
  const source = path.resolve(sourceRoot, ...relativePath.split("/"));
  const destination = path.resolve(destinationRoot, ...relativePath.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function makeIdentityWorkspace(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-history-identity-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await copyRelative(ROOT, workspace, HISTORY_CHECKPOINT_RELATIVE_PATH);
  return workspace;
}

async function makeFullWorkspace(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-history-full-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const inventory = await historyCheckpointTestOnly.readRepositoryFamilyInventory(ROOT);
  await copyRelative(ROOT, workspace, HISTORY_CHECKPOINT_RELATIVE_PATH);
  await copyRelative(ROOT, workspace, PREVIOUS_HISTORY_CHECKPOINT.path);
  await copyRelative(ROOT, workspace, HISTORICAL_BAZI_EXPERT_REVIEW_PACKET.path);
  for (const family of inventory) {
    for (const member of family.members) {
      await copyRelative(ROOT, workspace, member.path);
    }
  }
  return { workspace, inventory };
}

async function loadPersistedValue() {
  return JSON.parse(await readFile(CHECKPOINT_PATH, "utf8"));
}

function replaceAllObjectPaths(value, targetPath, replacementPath) {
  let replacements = 0;
  const seen = new Set();
  const visit = (node) => {
    if (node === null || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (!Array.isArray(node) && node.path === targetPath) {
      node.path = replacementPath;
      replacements += 1;
    }
    for (const key of Object.keys(node)) visit(node[key]);
  };
  visit(value);
  return replacements;
}

test("identity-only loader reads the pinned checkpoint without historical members", async (t) => {
  const workspace = await makeIdentityWorkspace(t);
  const checkpoint = await loadHistoryCheckpointIdentity(workspace);
  const identity = getHistoryCheckpointIdentity(checkpoint);
  assert.equal(isVerifiedHistoryCheckpointIdentity(checkpoint), true);
  assert.equal(isVerifiedHistoryCheckpoint(checkpoint), false);
  assert.equal(identity.path, HISTORY_CHECKPOINT_RELATIVE_PATH);
  assert.equal(identity.rawBytes, historyCheckpointTestOnly.EXPECTED_PERSISTED.rawBytes);
  assert.throws(
    () => getHistoryCheckpointSummary(checkpoint),
    expectCode("CHECKPOINT_FULL_BRAND_REQUIRED")
  );
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("HISTORY_INVENTORY_INVALID", "INDEXED_VERSION_FAMILY_MISSING")
  );
});

test("real workspace obtains distinct identity-only and full-history private brands", async () => {
  const checkpoint = await loadHistoryCheckpoint(ROOT);
  const summary = getHistoryCheckpointSummary(checkpoint);
  assert.equal(isVerifiedHistoryCheckpointIdentity(checkpoint), true);
  assert.equal(isVerifiedHistoryCheckpoint(checkpoint), true);
  assert.equal(isVerifiedHistoryCheckpointIdentity(clone(checkpoint)), false);
  assert.equal(isVerifiedHistoryCheckpoint(clone(checkpoint)), false);
  assert.equal(Object.isFrozen(checkpoint), true);
  assert.equal(Object.isFrozen(checkpoint.families), true);
  assert.equal(summary.familyCount, 25);
  assert.equal(summary.memberCount, 78);
  assert.equal(summary.artifactLineageFamilyCount, 24);
  assert.equal(summary.indexOnlyLegacyFamilyCount, 1);
  assert.equal(summary.previousCheckpointMechanicallyVerified, true);
  assert.equal(summary.previousHistoryMembersPreserved, 77);
});

test("successor full history retains the exact previous checkpoint bytes", async () => {
  const bytes = await readFile(path.join(ROOT, PREVIOUS_HISTORY_CHECKPOINT.path));
  assert.equal(bytes.length, PREVIOUS_HISTORY_CHECKPOINT.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), PREVIOUS_HISTORY_CHECKPOINT.rawSha256);
  const summary = getHistoryCheckpointSummary(await loadHistoryCheckpoint(ROOT));
  assert.equal(summary.previousCheckpointPath, PREVIOUS_HISTORY_CHECKPOINT.path);
  assert.equal(summary.previousHistoryMembersPreserved, 77);
  assert.equal(summary.authorityBoundary.formalAdmissionAuthorized, false);
});

test("successor full history rejects changed or missing previous checkpoint bytes", async (t) => {
  const { workspace } = await makeFullWorkspace(t);
  const target = path.join(workspace, PREVIOUS_HISTORY_CHECKPOINT.path);
  const original = await readFile(target);
  await writeFile(target, Buffer.concat([original, Buffer.from("\n")]));
  await assert.rejects(loadHistoryCheckpoint(workspace), expectCode("PREVIOUS_CHECKPOINT_DRIFT"));
  await unlink(target);
  await assert.rejects(loadHistoryCheckpoint(workspace), expectCode("PREVIOUS_CHECKPOINT_UNAVAILABLE"));
});

test("persisted raw identity and all four digest layers are pinned", async () => {
  const bytes = await readFile(CHECKPOINT_PATH);
  const value = JSON.parse(bytes.toString("utf8"));
  const pin = historyCheckpointTestOnly.EXPECTED_PERSISTED;
  assert.equal(bytes.length, pin.rawBytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), pin.rawSha256);
  assert.equal(value.historyRootDigest, pin.historyRootDigest);
  assert.equal(value.checkpointDigest, pin.checkpointDigest);
  assert.equal(computeHistoryRootDigest(value.families), value.historyRootDigest);
  assert.equal(computeHistoryCheckpointDigest(value), value.checkpointDigest);
  assert.equal(serializeHistoryCheckpoint(value), bytes.toString("utf8"));
  assert.match(value.familyInventoryDigest, SHA256);
  for (const family of value.families) {
    assert.match(family.memberInventoryDigest, SHA256);
    assert.match(family.orderedHistoryDigest, SHA256);
  }
});

test("knowledge manifest is the unique index_only_legacy family", async () => {
  const value = await loadPersistedValue();
  const legacy = value.families.filter((family) => family.lineageMode === "index_only_legacy");
  assert.deepEqual(legacy.map((family) => family.familyKey), ["content/knowledge/manifest"]);
  assert.equal(value.families.filter((family) => family.lineageMode === "artifact").length, 24);
});

test("numeric version ordering places 2.10 after 2.9", async () => {
  const inventory = await historyCheckpointTestOnly.readRepositoryFamilyInventory(ROOT);
  const family = inventory.find(
    (entry) => entry.familyKey
      === "content/system-admission/four-system-current-status-observation-child"
  );
  assert.ok(family);
  assert.equal(family.members.length, 14);
  assert.equal(family.members[8].version, "2.9.0");
  assert.equal(family.members[9].version, "2.10.0");
  assert.equal(family.members.at(-1).version, "2.14.0");
});

test("pure identity verification cannot mint either production brand", async () => {
  const value = await loadPersistedValue();
  const verified = historyCheckpointTestOnly.verifyIdentityValue(value);
  assert.equal(isVerifiedHistoryCheckpointIdentity(verified), false);
  assert.equal(isVerifiedHistoryCheckpoint(verified), false);
  await assert.rejects(
    verifyHistoryCheckpointIdentity(ROOT, value),
    expectCode("CHECKPOINT_SNAPSHOT_REQUIRED")
  );
});

test("checkpoint duplicate keys, self digest drift and authority promotion fail closed", async () => {
  const bytes = await readFile(CHECKPOINT_PATH);
  const text = bytes.toString("utf8");
  const duplicate = text.replace(
    '  "schemaVersion": "1.0.0",',
    '  "schemaVersion": "1.0.0",\n  "schemaVersion": "1.0.0",'
  );
  assert.throws(
    () => parseStrictHistoryCheckpointBytes(Buffer.from(duplicate, "utf8")),
    expectCode("CHECKPOINT_JSON_DUPLICATE_KEY")
  );

  const digestDrift = JSON.parse(text);
  digestDrift.checkpointDigest = "0".repeat(64);
  assert.throws(
    () => historyCheckpointTestOnly.verifyIdentityValue(digestDrift),
    expectCode("CHECKPOINT_DIGEST_MISMATCH")
  );

  const promoted = JSON.parse(text);
  promoted.authorityBoundary.releaseReady = true;
  reseal(promoted);
  assert.throws(
    () => historyCheckpointTestOnly.verifyIdentityValue(promoted),
    expectCode("AUTHORITY_PROMOTION")
  );
});

test("a semantically self-consistent rewritten checkpoint still fails the production raw pin", async (t) => {
  const workspace = await makeIdentityWorkspace(t);
  const target = path.resolve(workspace, ...HISTORY_CHECKPOINT_RELATIVE_PATH.split("/"));
  const value = JSON.parse(await readFile(target, "utf8"));
  value.families[0].orderedHistoryDigest = "0".repeat(64);
  reseal(value);
  await writeFile(target, serializeHistoryCheckpoint(value));
  await assert.rejects(
    loadHistoryCheckpointIdentity(workspace),
    expectCode("CHECKPOINT_RAW_DRIFT")
  );
});

test("deleting an old member fails the checkpoint inventory before history reads", async (t) => {
  const { workspace, inventory } = await makeFullWorkspace(t);
  const family = inventory.find((entry) => entry.members.length > 3);
  assert.ok(family);
  await unlink(path.resolve(workspace, ...family.members[0].path.split("/")));
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("FAMILY_MEMBER_INVENTORY_MISMATCH")
  );
});

test("an uncheckpointed higher version fails by name without parsing its bytes", async (t) => {
  const { workspace, inventory } = await makeFullWorkspace(t);
  const family = inventory.find((entry) => entry.members.length > 3);
  assert.ok(family);
  const policy = historyCheckpointTestOnly.CURRENT_FAMILY_POLICIES.find(
    (entry) => entry.familyKey === family.familyKey
  );
  const target = path.resolve(
    workspace,
    ...policy.directory.split("/"),
    `${policy.stem}.v99.0.0.json`
  );
  await writeFile(target, "not json\n", "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("UNINDEXED_HIGHER_VERSION")
  );
});

test("an unknown two-member versioned JSON family fails closed", async (t) => {
  const { workspace } = await makeFullWorkspace(t);
  await writeFile(path.resolve(workspace, "content", "unknown-history.v1.json"), "{}\n");
  await writeFile(path.resolve(workspace, "content", "unknown-history.v2.json"), "{}\n");
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("UNINDEXED_VERSION_FAMILY")
  );
});

test("raw drift in a non-endpoint historical member is detected by ordered history digest", async (t) => {
  const { workspace, inventory } = await makeFullWorkspace(t);
  const family = inventory.find((entry) => entry.members.length > 4);
  assert.ok(family);
  const victim = family.members[2];
  const target = path.resolve(workspace, ...victim.path.split("/"));
  const text = await readFile(target, "utf8");
  const changed = text.replace("  \"", "\t\"");
  assert.notEqual(changed, text);
  await writeFile(target, changed, "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("PREDECESSOR_IDENTITY_MISMATCH", "ORDERED_HISTORY_DIGEST_MISMATCH")
  );
});

test("a broken historical direct-predecessor path fails the lineage gate", async (t) => {
  const { workspace, inventory } = await makeFullWorkspace(t);
  const family = inventory.find((entry) => entry.members.length > 4);
  assert.ok(family);
  const predecessor = family.members.at(-2);
  const current = family.members.at(-1);
  const target = path.resolve(workspace, ...current.path.split("/"));
  const value = JSON.parse(await readFile(target, "utf8"));
  const replacementPath = predecessor.path.replace(
    /\.v[0-9]+(?:\.[0-9]+){0,2}\.json$/u,
    ".v99.0.0.json"
  );
  assert.notEqual(replacementPath, predecessor.path);
  assert.ok(
    replaceAllObjectPaths(value, predecessor.path, replacementPath) > 0,
    `${current.path} predecessor reference`
  );
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("PREDECESSOR_CHAIN_BROKEN")
  );
});

test("duplicate keys in a historical member fail strict JSON parsing", async (t) => {
  const { workspace, inventory } = await makeFullWorkspace(t);
  const victim = inventory[0].members[0];
  const target = path.resolve(workspace, ...victim.path.split("/"));
  await writeFile(target, '{"ledgerId":"a","ledgerId":"b"}\n', "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(workspace),
    expectCode("HISTORICAL_MEMBER_JSON_DUPLICATE_KEY")
  );
});

test("historical artifact ID and declared semantic digest are validated from bytes", async (t) => {
  const idFixture = await makeFullWorkspace(t);
  const idFamily = idFixture.inventory[0];
  const idPolicy = historyCheckpointTestOnly.CURRENT_FAMILY_POLICIES[0];
  const idVictim = idFamily.members.at(-1);
  const idTarget = path.resolve(idFixture.workspace, ...idVictim.path.split("/"));
  const idValue = JSON.parse(await readFile(idTarget, "utf8"));
  idValue[idPolicy.idField] = "wrong-id/99.0.0";
  await writeFile(idTarget, `${JSON.stringify(idValue, null, 2)}\n`, "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(idFixture.workspace),
    expectCode("HISTORICAL_MEMBER_ID_VERSION_MISMATCH")
  );

  const digestFixture = await makeFullWorkspace(t);
  const digestFamily = digestFixture.inventory[1];
  const digestPolicy = historyCheckpointTestOnly.CURRENT_FAMILY_POLICIES[1];
  const digestVictim = digestFamily.members.at(-1);
  const digestTarget = path.resolve(
    digestFixture.workspace,
    ...digestVictim.path.split("/")
  );
  const digestValue = JSON.parse(await readFile(digestTarget, "utf8"));
  digestValue[digestPolicy.memberDigestFields[0]] = "not-a-sha256";
  await writeFile(digestTarget, `${JSON.stringify(digestValue, null, 2)}\n`, "utf8");
  await assert.rejects(
    loadHistoryCheckpoint(digestFixture.workspace),
    expectCode("HISTORICAL_MEMBER_DIGEST_MISMATCH")
  );
});

test("checkpoint symlink and hardlink endpoints cannot obtain an identity brand", async (t) => {
  const symlinkWorkspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-history-symlink-"));
  const hardlinkWorkspace = await mkdtemp(path.join(os.tmpdir(), "hakimi-history-hardlink-"));
  t.after(() => rm(symlinkWorkspace, { recursive: true, force: true }));
  t.after(() => rm(hardlinkWorkspace, { recursive: true, force: true }));
  const symlinkTarget = path.resolve(
    symlinkWorkspace,
    ...HISTORY_CHECKPOINT_RELATIVE_PATH.split("/")
  );
  await mkdir(path.dirname(symlinkTarget), { recursive: true });
  try {
    await symlink(CHECKPOINT_PATH, symlinkTarget, "file");
    await assert.rejects(
      loadHistoryCheckpointIdentity(symlinkWorkspace),
      expectCode("CHECKPOINT_RAW_DRIFT")
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) throw error;
  }

  const hardlinkTarget = path.resolve(
    hardlinkWorkspace,
    ...HISTORY_CHECKPOINT_RELATIVE_PATH.split("/")
  );
  const hardlinkPeer = path.resolve(hardlinkWorkspace, "checkpoint-peer.json");
  await mkdir(path.dirname(hardlinkTarget), { recursive: true });
  try {
    await copyFile(CHECKPOINT_PATH, hardlinkTarget);
    await link(hardlinkTarget, hardlinkPeer);
    await assert.rejects(
      loadHistoryCheckpointIdentity(hardlinkWorkspace),
      expectCode("CHECKPOINT_RAW_DRIFT")
    );
  } catch (error) {
    if (!["EPERM", "EACCES", "ENOTSUP", "UNKNOWN"].includes(error?.code)) throw error;
  }
});

test("fixed verifier CLI succeeds without operands and rejects operands and preload env", () => {
  const normal = spawnSync(process.execPath, [CLI], {
    cwd: os.tmpdir(),
    encoding: "utf8",
    env: cleanEnvironment(),
    timeout: 120_000
  });
  assert.equal(normal.status, 0, normal.stderr);
  assert.match(normal.stdout, /^HISTORY_CHECKPOINT_OK /u);

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

test("verifier CLI invoked through a script symlink still executes main", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-history-cli-link-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const linkedCli = path.join(directory, "verify-history-checkpoint-link.mjs");
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
  assert.match(outcome.stdout, /^HISTORY_CHECKPOINT_OK /u);
});

test("writer refuses to run without the exact --write confirmation", () => {
  const outcome = spawnSync(process.execPath, [WRITER], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.notEqual(outcome.status, 0);
  assert.match(outcome.stderr, /WRITE_CONFIRMATION_REQUIRED/u);
});
