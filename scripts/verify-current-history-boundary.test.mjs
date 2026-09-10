import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CURRENT_INDEX_FAMILY_POLICIES,
  CURRENT_INDEX_RELATIVE_PATH,
  computeCurrentIndexDigest,
  currentIndexTestOnly,
  enumerateFamilyVersions,
  loadCurrentIndex
} from "./current-index-lib.mjs";
import {
  HISTORY_CHECKPOINT_RELATIVE_PATH,
  PREVIOUS_HISTORY_CHECKPOINT,
  HISTORICAL_BAZI_EXPERT_REVIEW_PACKET,
  loadHistoryCheckpoint,
  loadHistoryCheckpointIdentity
} from "./history-checkpoint-lib.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_FAMILY = "content/bazi-strength-source-binding-candidates";

async function copyRelative(workspace, relativePath) {
  const destination = path.resolve(workspace, ...relativePath.split("/"));
  assert.equal(path.relative(workspace, destination).startsWith(".."), false);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.resolve(ROOT, ...relativePath.split("/")), destination);
}

async function makeContentWorkspace(t) {
  const temporaryRoot = await realpath(os.tmpdir());
  const workspace = await mkdtemp(path.join(temporaryRoot, "hakimi-current-history-boundary-"));
  t.after(async () => {
    assert.equal(path.dirname(await realpath(workspace)), temporaryRoot);
    await rm(workspace, { recursive: true, force: true });
  });
  await copyRelative(workspace, CURRENT_INDEX_RELATIVE_PATH);
  await copyRelative(workspace, HISTORY_CHECKPOINT_RELATIVE_PATH);
  await copyRelative(workspace, PREVIOUS_HISTORY_CHECKPOINT.path);
  const currentIndex = JSON.parse(await readFile(path.resolve(ROOT, CURRENT_INDEX_RELATIVE_PATH), "utf8"));
  await copyRelative(workspace, currentIndex.nonVersionedSelections.baziExpertReviewPacket.selectedCurrent.path);
  for (const policy of Object.values(CURRENT_INDEX_FAMILY_POLICIES)) {
    for (const member of await enumerateFamilyVersions(ROOT, policy)) {
      await copyRelative(workspace, member.path);
    }
  }
  return workspace;
}

test("registered current version remains selected when a newer family member exists", async () => {
  const index = await loadCurrentIndex(ROOT);
  const entry = index.entries.find((candidate) => candidate.familyKey === SOURCE_FAMILY);
  const registeredEntries = structuredClone(index.entries);
  const registered = registeredEntries.find((candidate) => candidate.familyKey === SOURCE_FAMILY);
  registered.selectedCurrent = structuredClone(entry.supersedes);
  const expected = await currentIndexTestOnly.expectedCurrentEntry(
    ROOT,
    CURRENT_INDEX_FAMILY_POLICIES[SOURCE_FAMILY],
    await loadHistoryCheckpointIdentity(ROOT),
    registeredEntries
  );
  assert.equal(expected.head.path, entry.head.path);
  assert.equal(expected.selectedCurrent.path, entry.supersedes.path);
  assert.equal(expected.selectionState, "selected_current_below_head");

  const candidateIndex = structuredClone(index);
  candidateIndex.entries[candidateIndex.entries.findIndex(
    (candidate) => candidate.familyKey === SOURCE_FAMILY
  )] = expected;
  candidateIndex.indexDigest = computeCurrentIndexDigest(candidateIndex);
  const checked = await currentIndexTestOnly.verifyValue(ROOT, candidateIndex);
  assert.equal(checked.authorityBoundary.formalAdmissionAuthorized, false);
  assert.equal(checked.entries[0].selectedCurrent.path, entry.supersedes.path);
});

test("current selection requires an explicit family and concrete version", () => {
  assert.throws(() => currentIndexTestOnly.selectionForFamily(SOURCE_FAMILY, []),
    (error) => error.code === "ENTRY_SET_MISMATCH");
  assert.throws(() => currentIndexTestOnly.selectionForFamily(SOURCE_FAMILY, [{
    familyKey: SOURCE_FAMILY,
    selectionState: "selected_current_head",
    selectedCurrent: { version: "head" }
  }]), (error) => error.code === "CURRENT_SELECTION_INVALID");
});

test("cheap current works without historical expert bytes or live source files while full history requires the packet", async (t) => {
  const workspace = await makeContentWorkspace(t);
  const current = await loadCurrentIndex(workspace);
  assert.equal(current.nonVersionedSelections.baziExpertReviewPacket.currentAvailable, true);
  assert.equal(current.nonVersionedSelections.baziExpertReviewPacket.historicalAnchorVerifiedByCurrentLoad, false);
  await assert.rejects(loadHistoryCheckpoint(workspace),
    (error) => error.code === "HISTORICAL_EXPERT_PACKET_UNAVAILABLE");
});

test("full history checks the unchanged expert packet independently of current selection", async (t) => {
  const workspace = await makeContentWorkspace(t);
  const relativePath = HISTORICAL_BAZI_EXPERT_REVIEW_PACKET.path;
  await copyRelative(workspace, relativePath);
  await loadHistoryCheckpoint(workspace);
  const target = path.resolve(workspace, ...relativePath.split("/"));
  await writeFile(target, `${await readFile(target, "utf8")}\n`, "utf8");
  await loadCurrentIndex(workspace);
  await assert.rejects(loadHistoryCheckpoint(workspace),
    (error) => error.code === "HISTORICAL_EXPERT_PACKET_DRIFT");
});

test("a selected artifact changed without updating its binding fails current verification", async (t) => {
  const workspace = await makeContentWorkspace(t);
  const index = await loadCurrentIndex(workspace);
  const selected = index.entries.find((entry) => entry.familyKey === SOURCE_FAMILY).selectedCurrent;
  const target = path.resolve(workspace, ...selected.path.split("/"));
  await writeFile(target, `${await readFile(target, "utf8")}\n`, "utf8");
  await assert.rejects(loadCurrentIndex(workspace));
});
