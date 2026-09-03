import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { linkSync, unlinkSync } from "node:fs";
import {
  link, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, unlink, writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

import {
  buildFinalArtifacts,
  canonicalStringify,
  createPilotDraft,
  serializeUtf8Json
} from "../contract.js";
import { buildSeatPackage } from "../package-builder.mjs";
import {
  PilotReturnVerificationError,
  removePilotSessionProfileIfExact,
  verifyPilotReturnDirectory
} from "../return-verifier.mjs";

const CYCLE_A = `pilot-review-cycle.${"1".repeat(64)}`;
const CYCLE_B = `pilot-review-cycle.${"2".repeat(64)}`;

function completeDraft(draft) {
  for (const key of Object.keys(draft.acknowledgements)) draft.acknowledgements[key] = true;
  draft.reviewerSelfDescription.selfDescribedTradition = "子平旺衰，仅为无代码试填。";
  draft.reviewerSelfDescription.selfDescribedScope = "只复核当前四题、合成场景和风险边界。";
  for (const response of Object.values(draft.caseResponses)) {
    Object.assign(response, {
      factAssessment: "insufficient_information",
      rulePosition: "conditional",
      reason: "仅按人工构造场景判断。",
      applicabilityConditions: "只适用于题面条件。",
      counterexamples: "特殊结构可能推翻。",
      invalidationStructures: ["无法判断"],
      highRiskDisposition: "defer",
      revisionSuggestion: "保留候选标签。"
    });
  }
  for (const response of Object.values(draft.overallResponses)) {
    Object.assign(response, {
      position: "conditional",
      expertOriginalText: "只形成试填反馈。",
      rationale: "当前材料不足以建立真值。",
      uncertainties: "来源、权利和正式准入均未闭合。"
    });
  }
  Object.assign(draft.usabilityFeedback, {
    clarityRating: "4",
    difficultTerms: "无",
    workflowComments: "流程可继续测试。"
  });
  return draft;
}

function digestRecord(record, domain) {
  const { integrity: _integrity, ...unsigned } = record;
  record.integrity.recordDigest = createHash("sha256")
    .update(`${domain}\0${canonicalStringify(unsigned)}`, "utf8")
    .digest("hex");
}

async function prepareReturn(t, {
  packageSeat = "A",
  packageCycle = CYCLE_A,
  submissionSeat = packageSeat,
  submissionCycle = packageCycle
} = {}) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-return-verifier-test-"));
  t.after(async () => {
    const canonical = resolve(temporaryRoot);
    assert.ok(canonical.startsWith(resolve(tmpdir())));
    await rm(canonical, { recursive: true, force: true });
  });
  const packageRoot = join(temporaryRoot, "package");
  const built = await buildSeatPackage({
    seatId: packageSeat,
    reviewCycleId: packageCycle,
    outputDirectory: packageRoot
  });
  const returnedRoot = join(packageRoot, "returned-materials");
  const returnDirectory = join(returnedRoot, `seat-${packageSeat.toLowerCase()}-run`);
  await mkdir(returnedRoot);
  await mkdir(returnDirectory);
  const draft = completeDraft(await createPilotDraft(submissionSeat, {
    reviewCycleId: submissionCycle,
    packageManifestRawSha256: built.packageManifestRawSha256
  }));
  const artifacts = await buildFinalArtifacts(draft, new Date("2030-01-02T03:04:05.000Z"));
  const expectedFilename = `hakimi-bazi-pilot-seat-${packageSeat.toLowerCase()}-complete-submission.json`;
  const submissionPath = join(returnDirectory, expectedFilename);
  await writeFile(submissionPath, artifacts.completePackageText, { encoding: "utf8", flag: "wx" });
  return {
    artifacts,
    built,
    expectedFilename,
    packageRoot,
    returnDirectory,
    submissionPath,
    temporaryRoot
  };
}

test("verifies one exact physical return and writes only an authority-none off-repository observation", async (t) => {
  const fixture = await prepareReturn(t);
  const result = await verifyPilotReturnDirectory({
    packageRoot: fixture.packageRoot,
    returnDirectory: fixture.returnDirectory,
    observationClock: new Date("2030-01-02T04:00:00.000Z")
  });
  assert.equal(result.accepted, true);
  assert.equal(result.countsTowardFormal2of2, false);
  assert.equal(result.countsTowardExpertGate, false);
  assert.equal(result.formalConversionAllowed, false);
  assert.equal(result.safeToPublish, false);
  const observationText = await readFile(join(fixture.returnDirectory, result.observationFilename), "utf8");
  const observation = JSON.parse(observationText);
  assert.equal(observation.reviewCycleId, CYCLE_A);
  assert.equal(observation.seatId, "A");
  assert.equal(observation.formalBoundary.formalRecordTypesEmitted.length, 0);
  assert.equal(observation.formalBoundary.identityVerified, false);
  assert.equal(observation.formalBoundary.credentialVerified, false);
  assert.equal(observation.formalBoundary.pairwiseIndependenceEstablished, false);
  assert.equal(observation.authenticityBoundary.authenticityEstablished, false);
  assert.equal(observation.authenticityBoundary.custodyEstablished, false);
  assert.equal(observation.authenticityBoundary.trustedTimeEstablished, false);
  assert.equal(observation.authenticityBoundary.trustedBootstrapEstablished, false);
  assert.equal(observation.authenticityBoundary.packageAuthenticityEstablished, false);
  assert.equal(observation.authenticityBoundary.pinProvenanceVerified, false);
  assert.equal(observation.authenticityBoundary.signature, false);
  assert.equal(observation.privacyBoundary.personDataPresenceAssessed, false);
  assert.equal(observation.privacyBoundary.personDerivedDigestExcluded, false);
  assert.equal(observation.formalBoundary.realPersonDistributionReady, false);
  assert.equal(observation.observationBoundary.alternateDataStreamsEnumerated, false);
  assert.equal(observation.observationBoundary.alternateDataStreamsExcluded, false);
  assert.equal(observation.observationBoundary.sameCycleReplayExcluded, false);
  assert.equal(observation.observationBoundary.samePrivilegeIntervalMutationExcluded, false);
  assert.equal(observation.observationBoundary.atomicObservationWriteEstablished, false);
  assert.equal(observation.observationBoundary.atomicSessionCleanupEstablished, false);
  assert.equal(observation.safeToPublish, false);
  assert.doesNotMatch(observationText, /只形成试填反馈|子平旺衰/u);
  assert.deepEqual((await readdir(fixture.returnDirectory)).sort(), [
    fixture.expectedFilename,
    result.observationFilename
  ].sort());

  const replayDirectory = join(fixture.packageRoot, "returned-materials", "seat-a-replay");
  await mkdir(replayDirectory);
  await writeFile(join(replayDirectory, fixture.expectedFilename), fixture.artifacts.completePackageText, "utf8");
  const replay = await verifyPilotReturnDirectory({
    packageRoot: fixture.packageRoot,
    returnDirectory: replayDirectory,
    observationClock: new Date("2030-01-03T04:00:00.000Z")
  });
  assert.equal(replay.accepted, true);
  assert.equal(replay.observation.submissionArtifact.rawSha256, observation.submissionArtifact.rawSha256);
  assert.equal(replay.observation.observationBoundary.replayExcluded, false);
  assert.equal(replay.observation.observationBoundary.sameCycleReplayExcluded, false);
});

test("rejects duplicate JSON keys and preserves the original return without an observation", async (t) => {
  const fixture = await prepareReturn(t);
  const raw = await readFile(fixture.submissionPath, "utf8");
  await writeFile(fixture.submissionPath, raw.replace("{\n", '{\n  "seatId": "A",\n'), "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: fixture.packageRoot, returnDirectory: fixture.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "RETURN_VERIFICATION_FAILED"
  );
  assert.deepEqual(await readdir(fixture.returnDirectory), [fixture.expectedFilename]);
});

test("rejects a fully re-digested opinion whose seal still binds the prior bytes", async (t) => {
  const fixture = await prepareReturn(t);
  const complete = structuredClone(fixture.artifacts.completePackageRecord);
  const opinion = JSON.parse(complete.embeddedFiles[0].exactUtf8Text);
  opinion.caseResponses[0].reason = "改动后的无敏感测试文字。";
  digestRecord(opinion, "hakimi/bazi-expert-pilot/opinion-record/v1");
  const opinionText = serializeUtf8Json(opinion);
  complete.embeddedFiles[0].exactUtf8Text = opinionText;
  complete.embeddedFiles[0].rawSha256 = createHash("sha256").update(opinionText, "utf8").digest("hex");
  digestRecord(complete, "hakimi/bazi-expert-pilot/complete-submission-package/v1");
  await writeFile(fixture.submissionPath, serializeUtf8Json(complete), "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: fixture.packageRoot, returnDirectory: fixture.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "RETURN_VERIFICATION_FAILED"
  );
  assert.deepEqual(await readdir(fixture.returnDirectory), [fixture.expectedFilename]);
});

test("rejects a cross-cycle or opposite-seat submission without echoing text or private paths", async (t) => {
  const crossCycle = await prepareReturn(t, { submissionCycle: CYCLE_B });
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: crossCycle.packageRoot, returnDirectory: crossCycle.returnDirectory }),
    (error) => {
      assert.ok(error instanceof PilotReturnVerificationError);
      assert.doesNotMatch(String(error), new RegExp(crossCycle.temporaryRoot.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
      assert.doesNotMatch(String(error), /只形成试填反馈/u);
      return true;
    }
  );

  const opposite = await prepareReturn(t, { submissionSeat: "B" });
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: opposite.packageRoot, returnDirectory: opposite.returnDirectory }),
    PilotReturnVerificationError
  );
  assert.equal((await readdir(opposite.returnDirectory)).includes("hakimi-bazi-pilot-seat-a-handoff-observation.json"), false);
});

test("captures the Date intrinsic before file verification so a custom clock callback cannot swap the return", async (t) => {
  const fixture = await prepareReturn(t);
  const replacement = join(fixture.temporaryRoot, "replacement-submission.json");
  await writeFile(replacement, `${fixture.artifacts.completePackageText} `, "utf8");
  let callbackInvoked = false;
  const clock = new Date("2030-01-02T04:00:00.000Z");
  clock.toISOString = () => {
    callbackInvoked = true;
    unlinkSync(fixture.submissionPath);
    linkSync(replacement, fixture.submissionPath);
    return "2030-01-02T04:00:00.000Z";
  };
  const result = await verifyPilotReturnDirectory({
    packageRoot: fixture.packageRoot,
    returnDirectory: fixture.returnDirectory,
    observationClock: clock
  });
  const currentBytes = await readFile(fixture.submissionPath);
  const currentMetadata = await lstat(fixture.submissionPath, { bigint: true });
  assert.equal(callbackInvoked, false);
  assert.equal(result.accepted, true);
  assert.equal(currentMetadata.nlink, 1n);
  assert.equal(result.observation.submissionArtifact.rawSha256, createHash("sha256").update(currentBytes).digest("hex"));
});

test("rejects partial or multiple downloads and preserves every return file", async (t) => {
  const partial = await prepareReturn(t);
  await writeFile(join(partial.returnDirectory, `${partial.expectedFilename}.crdownload`), "partial", "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: partial.packageRoot, returnDirectory: partial.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "PARTIAL_RETURN"
  );
  assert.equal((await readdir(partial.returnDirectory)).length, 2);

  const multiple = await prepareReturn(t);
  await writeFile(join(multiple.returnDirectory, "unexpected.json"), "{}\n", "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: multiple.packageRoot, returnDirectory: multiple.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "RETURN_FILE_SET_INVALID"
  );
  assert.equal((await readdir(multiple.returnDirectory)).length, 2);
});

test("rejects a hardlinked return file", async (t) => {
  const fixture = await prepareReturn(t);
  const bytes = await readFile(fixture.submissionPath);
  await unlink(fixture.submissionPath);
  const external = join(fixture.temporaryRoot, "external-submission.json");
  await writeFile(external, bytes, { flag: "wx" });
  await link(external, fixture.submissionPath);
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: fixture.packageRoot, returnDirectory: fixture.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "FILE_ENDPOINT_INVALID"
  );
});

test("refuses recursive session cleanup after the original dev and ino are replaced or shutdown is unconfirmed", async (t) => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "hakimi-bazi-session-cleanup-test-"));
  t.after(async () => {
    const canonical = resolve(temporaryRoot);
    assert.ok(canonical.startsWith(resolve(tmpdir())));
    await rm(canonical, { recursive: true, force: true });
  });
  const canonicalTempRoot = await realpath(temporaryRoot);
  const sessionRoot = join(canonicalTempRoot, "session");
  await mkdir(sessionRoot);
  const initial = await lstat(sessionRoot, { bigint: true });
  const originalMovedAside = join(canonicalTempRoot, "original-session");
  await rename(sessionRoot, originalMovedAside);
  await mkdir(sessionRoot);
  const valuable = join(sessionRoot, "must-survive.txt");
  await writeFile(valuable, "valuable", "utf8");
  const replaced = await removePilotSessionProfileIfExact({
    canonicalTempRoot,
    canonicalSessionRoot: sessionRoot,
    initialSessionIdentity: { dev: initial.dev, ino: initial.ino },
    browserClosed: true,
    serverClosed: true
  });
  assert.equal(replaced.removed, false);
  assert.equal(replaced.reason, "endpoint_identity_changed");
  assert.equal(await readFile(valuable, "utf8"), "valuable");
  assert.equal(replaced.boundary.atomicRecursiveDeleteEstablished, false);

  const exactSession = join(canonicalTempRoot, "unclosed-session");
  await mkdir(exactSession);
  const exactInitial = await lstat(exactSession, { bigint: true });
  const unclosed = await removePilotSessionProfileIfExact({
    canonicalTempRoot,
    canonicalSessionRoot: exactSession,
    initialSessionIdentity: { dev: exactInitial.dev, ino: exactInitial.ino },
    browserClosed: false,
    serverClosed: true
  });
  assert.equal(unclosed.removed, false);
  assert.equal(unclosed.reason, "process_shutdown_unconfirmed");
  assert.equal((await lstat(exactSession)).isDirectory(), true);
  const closed = await removePilotSessionProfileIfExact({
    canonicalTempRoot,
    canonicalSessionRoot: exactSession,
    initialSessionIdentity: { dev: exactInitial.dev, ino: exactInitial.ino },
    browserClosed: true,
    serverClosed: true
  });
  assert.equal(closed.removed, true);
  assert.equal(closed.reason, "exact_initial_endpoint_removed");
  await assert.rejects(() => lstat(exactSession), (error) => error?.code === "ENOENT");
});

test("does not claim that a real NTFS alternate data stream was enumerated or excluded", {
  skip: process.platform !== "win32"
}, async (t) => {
  const fixture = await prepareReturn(t);
  const adsPath = `${fixture.submissionPath}:redteam`;
  await writeFile(adsPath, "PRIVATE-ADS-SENTINEL", "utf8");
  assert.deepEqual(await readdir(fixture.returnDirectory), [fixture.expectedFilename]);
  const result = await verifyPilotReturnDirectory({
    packageRoot: fixture.packageRoot,
    returnDirectory: fixture.returnDirectory,
    observationClock: new Date("2030-01-02T04:00:00.000Z")
  });
  assert.equal(result.accepted, true);
  assert.equal(result.observation.observationBoundary.alternateDataStreamsEnumerated, false);
  assert.equal(result.observation.observationBoundary.alternateDataStreamsExcluded, false);
  assert.equal(await readFile(adsPath, "utf8"), "PRIVATE-ADS-SENTINEL");
});

test("rejects a symlinked file or junctioned run directory", async (t) => {
  const linkedFile = await prepareReturn(t);
  const bytes = await readFile(linkedFile.submissionPath);
  await unlink(linkedFile.submissionPath);
  const externalFile = join(linkedFile.temporaryRoot, "external-file.json");
  await writeFile(externalFile, bytes, { flag: "wx" });
  await symlink(externalFile, linkedFile.submissionPath, "file");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: linkedFile.packageRoot, returnDirectory: linkedFile.returnDirectory }),
    PilotReturnVerificationError
  );

  const junction = await prepareReturn(t);
  const externalDirectory = join(junction.temporaryRoot, "external-return");
  await mkdir(externalDirectory);
  const junctionPath = join(junction.packageRoot, "returned-materials", "junction-run");
  await symlink(externalDirectory, junctionPath, "junction");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: junction.packageRoot, returnDirectory: junctionPath }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "DIRECTORY_ENDPOINT_INVALID"
  );
});

test("rejects package payload drift and colon-shaped manifest paths without claiming real ADS enumeration", async (t) => {
  const drift = await prepareReturn(t);
  await writeFile(join(drift.packageRoot, "styles.css"), "drift", "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: drift.packageRoot, returnDirectory: drift.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "PACKAGE_PAYLOAD_DRIFT"
  );

  const ads = await prepareReturn(t);
  const manifestPath = join(ads.packageRoot, "package-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.payloads[0].path = "app.js:alternate-stream";
  await writeFile(manifestPath, serializeUtf8Json(manifest), "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: ads.packageRoot, returnDirectory: ads.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "PATH_INVALID"
  );

  const order = await prepareReturn(t);
  const orderManifestPath = join(order.packageRoot, "package-manifest.json");
  const orderManifest = JSON.parse(await readFile(orderManifestPath, "utf8"));
  orderManifest.selectedOrder.reverse();
  await writeFile(orderManifestPath, serializeUtf8Json(orderManifest), "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: order.packageRoot, returnDirectory: order.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "PACKAGE_MANIFEST_INVALID"
  );

  const oppositeEntry = await prepareReturn(t);
  await writeFile(join(oppositeEntry.packageRoot, "seat-b.html"), "opposite seat", "utf8");
  await assert.rejects(
    () => verifyPilotReturnDirectory({ packageRoot: oppositeEntry.packageRoot, returnDirectory: oppositeEntry.returnDirectory }),
    (error) => error instanceof PilotReturnVerificationError && error.code === "PACKAGE_ENDPOINT_SET_INVALID"
  );
});
