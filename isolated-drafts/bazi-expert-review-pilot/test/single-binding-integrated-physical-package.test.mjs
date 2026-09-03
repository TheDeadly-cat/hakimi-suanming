import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { request as httpRequest } from "node:http";
import {
  link,
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  unlink,
  writeFile
} from "node:fs/promises";
import { syncBuiltinESMExports } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";

import {
  buildSingleBindingIntegratedPhysicalPairCandidate,
  createSingleBindingIntegratedPhysicalIds
} from "../single-binding-integrated-package-builder.mjs";
import {
  createSingleBindingIntegratedDraft,
  finalizeSingleBindingIntegratedSubmission,
  prepareSingleBindingIntegratedReadback
} from "../single-binding-integrated-contract.js";
import { createSingleBindingIntegratedHandoffArtifacts } from "../single-binding-integrated-handoff.js";
import {
  SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_PHYSICAL_RETURN_WRITE_BOUNDARY,
  SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY,
  closeSingleBindingIntegratedPhysicalSeatInMemoryServer,
  consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer,
  prepareSingleBindingIntegratedPhysicalSeatPackage,
  releaseSingleBindingIntegratedPhysicalCapturedReturnCapability,
  releaseSingleBindingIntegratedPhysicalSeatPackage,
  releaseSingleBindingIntegratedPhysicalServerPayloadCapability,
  startSingleBindingIntegratedPhysicalSeatInMemoryServer,
  writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory
} from "../single-binding-integrated-physical-package.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function createPair(t, label) {
  const canonicalTemp = await realpath(tmpdir());
  const ownedRoot = await mkdtemp(join(canonicalTemp, `hakimi-integrated-physical-${label}-`));
  const canonicalOwned = await realpath(ownedRoot);
  assert.equal(dirname(canonicalOwned).toLowerCase(), canonicalTemp.toLowerCase());
  assert.match(basename(canonicalOwned), new RegExp(`^hakimi-integrated-physical-${label}-`, "u"));
  t.after(async () => {
    const metadata = await lstat(canonicalOwned);
    const observed = await realpath(canonicalOwned);
    assert.equal(metadata.isDirectory(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(observed.toLowerCase(), canonicalOwned.toLowerCase());
    assert.equal(dirname(observed).toLowerCase(), canonicalTemp.toLowerCase());
    await rm(observed, { recursive: true, force: false });
  });
  const ids = createSingleBindingIntegratedPhysicalIds();
  const build = await buildSingleBindingIntegratedPhysicalPairCandidate({
    ...ids,
    outputDirectory: join(canonicalOwned, "pair")
  });
  return { build, ids };
}

function requestFor(build, seatId) {
  const seat = seatId === "A" ? build.seatA : build.seatB;
  return {
    pairRoot: build.outputDirectory,
    expectedPairPrecommitRawSha256: build.pairPrecommitRawSha256,
    expectedPairManifestRawSha256: build.pairManifestRawSha256,
    expectedSeatPackageManifestRawSha256: seat.manifestRawSha256,
    expectedReviewCycleId: build.reviewCycleId,
    expectedPairRunId: build.pairRunId,
    expectedSeatId: seatId,
    expectedSeatSessionNonce: build.runtimeSessionBindings[seatId].seatSessionNonce
  };
}

function rawHttpGet(url, headers = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(url, { method: "GET", headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveRequest({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks)
      }));
    });
    request.once("error", rejectRequest);
    request.end();
  });
}

function rawHttpPost(url, body, headers = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body, "utf8");
  return new Promise((resolveRequest, rejectRequest) => {
    const request = httpRequest(url, {
      method: "POST",
      headers: { ...headers, "Content-Length": String(bytes.byteLength) }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveRequest({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks)
      }));
    });
    request.once("error", rejectRequest);
    request.end(bytes);
  });
}

async function completeReturnFor(sessionBinding) {
  const draft = createSingleBindingIntegratedDraft(sessionBinding);
  const inner = draft.innerDraft;
  inner.startAcknowledgement.syntheticOnly = true;
  inner.reviewResponse.position = "conditional";
  inner.reviewResponse.rationale = "固定练习材料不足以确认分界有效性。";
  inner.reviewResponse.applicabilityConditions = "需要明确流派口径。";
  inner.reviewResponse.counterexamplesOrNeededEvidence = "需要可靠案例和反例。";
  inner.reviewResponse.highRiskDisposition = "defer";
  inner.reviewResponse.revisionSuggestion = "先陈述材料缺口。";
  inner.captureContext.entryMethod = "expert_self_entered";
  inner.captureContext.coordinatorVerbatimNoSummarySelfDeclared = false;
  inner.captureContext.assistanceCategories = ["none_declared"];
  const readback = await prepareSingleBindingIntegratedReadback(draft);
  for (const key of Object.keys(inner.finalConfirmations)) inner.finalConfirmations[key] = true;
  const submission = await finalizeSingleBindingIntegratedSubmission(draft, readback);
  return createSingleBindingIntegratedHandoffArtifacts(submission);
}

async function captureSyntheticReturn(t, label, seatId = "A") {
  const { build } = await createPair(t, label);
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, seatId));
  const payloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  const server = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(payloadCapability);
  let serverClosed = false;
  try {
    const root = await rawHttpGet(server.entryUrl);
    const token = /name="hakimi-single-binding-return-token" content="([a-f0-9]{64})"/u
      .exec(root.body.toString("utf8"))?.[1];
    const artifacts = await completeReturnFor(build.runtimeSessionBindings[seatId]);
    const accepted = await rawHttpPost(
      `${server.origin}/__complete-return`,
      artifacts.completeReturnText,
      {
        Origin: server.origin,
        "Content-Type": "application/json;charset=utf-8",
        "X-Hakimi-Return-Token": token
      }
    );
    assert.equal(accepted.status, 200);
    const closed = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server);
    serverClosed = true;
    assert.equal(closed.returnCaptured, true);
    return { artifacts, build, captured: closed.returnCaptureCapability };
  } finally {
    if (!serverClosed) {
      try { await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server); } catch { /* primary wins */ }
    }
  }
}

test("prepares A/B independently, copies only selected-seat plus coordinator bytes, and consumes once", async (t) => {
  const { build } = await createPair(t, "success");
  const capabilityA = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "A"));
  const capabilityB = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "B"));
  assert.equal(Object.isFrozen(capabilityA), true);
  assert.equal(capabilityA.checks.oppositeSeatPayloadVerified, false);
  assert.equal(capabilityA.checks.packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess, false);
  assert.deepEqual(capabilityA.boundary, SINGLE_BINDING_INTEGRATED_PHYSICAL_PREPARE_BOUNDARY);
  assert.equal(capabilityA.boundary.physicalExpertSurfaceReady, false);
  assert.equal(capabilityA.boundary.inMemoryVerifiedPayloadServerImplemented, false);
  assert.equal(capabilityA.boundary.distributionAuthorized, false);
  assert.equal(capabilityA.boundary.formalAdmissionAllowed, false);
  assert.equal(capabilityA.boundary.publicDeploymentAuthorized, false);
  assert.equal(capabilityA.boundary.expertClaimsAuthorized, false);

  const clone = JSON.parse(JSON.stringify(capabilityA));
  await assert.rejects(
    () => consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(clone),
    (error) => error?.code === "CAPABILITY_INVALID"
  );

  const consumedA = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capabilityA);
  const consumedB = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capabilityB);
  for (const [seatId, consumed] of [["A", consumedA], ["B", consumedB]]) {
    assert.equal(consumed.sessionBinding.bindingMode, "physical_synthetic_single_binding_pair");
    assert.equal(consumed.sessionBinding.seatId, seatId);
    assert.equal(consumed.sessionBinding.pairPrecommitRawSha256, build.pairPrecommitRawSha256);
    assert.equal(consumed.sessionBinding.pairManifestRawSha256, build.pairManifestRawSha256);
    assert.equal(consumed.checks.heldHandlesReassertedBeforeCopy, true);
    assert.equal(consumed.checks.inMemoryVerifiedPayloadServerImplemented, false);
    assert.equal(consumed.checks.oppositeSeatPayloadVerified, false);
    assert.equal(consumed.boundary.physicalExpertSurfaceReady, false);
    assert.equal(Object.hasOwn(consumed, "verifiedPackageBytesByPairRelativePath"), false);
    assert.equal(consumed.payloadByteDescriptors.length, 24);
    const paths = consumed.payloadByteDescriptors.map((descriptor) => descriptor.path);
    assert.equal(paths.some((path) => path.startsWith(`seat-${seatId === "A" ? "b" : "a"}/`)), false);
    assert.equal(paths.some((path) => path.startsWith(`seat-${seatId.toLowerCase()}/`)), true);
    assert.equal(paths.some((path) => path.startsWith("coordinator/")), true);
    for (const descriptor of consumed.payloadByteDescriptors) {
      const diskBytes = await readFile(join(build.outputDirectory, ...descriptor.path.split("/")));
      assert.equal(descriptor.byteLength, diskBytes.byteLength, descriptor.path);
      assert.equal(descriptor.rawSha256, sha256(diskBytes), descriptor.path);
    }
  }
  assert.notEqual(
    consumedA.sessionBinding.seatPackageManifestRawSha256,
    consumedB.sessionBinding.seatPackageManifestRawSha256
  );
  for (const consumed of [consumedA, consumedB]) {
    const released = releaseSingleBindingIntegratedPhysicalServerPayloadCapability(consumed);
    assert.equal(released.referencesCleared, true);
    assert.equal(released.physicalErasureEstablished, false);
    assert.throws(
      () => releaseSingleBindingIntegratedPhysicalServerPayloadCapability(consumed),
      (error) => error?.code === "CAPABILITY_INVALID"
    );
  }
  await assert.rejects(
    () => consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capabilityA),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("releases an unconsumed prepared package and prevents later consume", async (t) => {
  const { build } = await createPair(t, "release");
  const capability = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "B"));
  const released = await releaseSingleBindingIntegratedPhysicalSeatPackage(capability);
  assert.equal(released.released, true);
  assert.equal(released.serverPayloadCapabilityCreated, false);
  await assert.rejects(
    () => consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  await assert.rejects(
    () => releaseSingleBindingIntegratedPhysicalSeatPackage(capability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("starts a source-owned random-loopback server from private verified bytes only", async (t) => {
  const { build } = await createPair(t, "memory-server");
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "A"));
  const serverPayloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  const originalScriptDescriptor = serverPayloadCapability.payloadByteDescriptors.find(
    (entry) => entry.path === "seat-a/single-binding-integrated.js"
  );
  assert.ok(originalScriptDescriptor);
  await writeFile(
    join(build.outputDirectory, "seat-a", "single-binding-integrated.js"),
    Buffer.from("throw new Error('package path must not be reread or imported');\n", "utf8")
  );

  const serverCapability = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(serverPayloadCapability);
  let closed = false;
  t.after(async () => {
    if (!closed) {
      try { await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(serverCapability); } catch { /* test reports primary */ }
    }
  });
  assert.match(serverCapability.origin, /^http:\/\/127\.0\.0\.1:\d+$/u);
  assert.equal(serverCapability.seatId, "A");
  assert.equal(serverCapability.checks.selectedSeatOnlyServedFromPrivateVerifiedMemory, true);
  assert.equal(serverCapability.checks.packagePathReadAfterServerStart, false);
  assert.equal(
    serverCapability.checks.packageLocalJavaScriptImportedOrEvaluatedBySourceCoordinatorProcess,
    false
  );
  assert.equal(serverCapability.checks.singleUseReturnCaptureImplemented, true);
  assert.equal(serverCapability.checks.returnCapturedAtServerStart, false);
  assert.deepEqual(serverCapability.boundary, SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY);
  assert.equal(serverCapability.boundary.inMemoryVerifiedPayloadServerImplemented, true);
  assert.equal(serverCapability.boundary.physicalExpertSurfaceReady, false);
  assert.equal(serverCapability.boundary.isolatedBrowserProfileLaunchImplemented, false);
  assert.equal(serverCapability.boundary.distributionAuthorized, false);

  const rootResponse = await rawHttpGet(serverCapability.entryUrl);
  assert.equal(rootResponse.status, 200);
  assert.equal(rootResponse.headers["cache-control"], "no-store, max-age=0");
  const html = rootResponse.body.toString("utf8");
  assert.doesNotMatch(html, /__HAKIMI_SINGLE_BINDING_SESSION_BINDING_JSON__/u);
  assert.match(html, /physical_synthetic_single_binding_pair/u);

  const scriptResponse = await rawHttpGet(`${serverCapability.origin}/single-binding-integrated.js`);
  assert.equal(scriptResponse.status, 200);
  assert.equal(sha256(scriptResponse.body), originalScriptDescriptor.rawSha256);
  assert.doesNotMatch(scriptResponse.body.toString("utf8"), /package path must not be reread/u);
  for (const path of [
    "/single-binding-integrated-b.html",
    "/package.json",
    "/START-PILOT.cmd",
    "/coordinator/single-binding-integrated-pair.html"
  ]) {
    assert.equal((await rawHttpGet(`${serverCapability.origin}${path}`)).status, 404, path);
  }
  assert.equal((await rawHttpGet(serverCapability.entryUrl, { Host: "attacker.invalid" })).status, 421);

  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalSeatInMemoryServer(serverPayloadCapability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalSeatInMemoryServer(
      JSON.parse(JSON.stringify(serverPayloadCapability))
    ),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  const closeResult = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(serverCapability);
  closed = true;
  assert.equal(closeResult.serverClosed, true);
  assert.equal(closeResult.returnCaptured, false);
  assert.equal(closeResult.returnCaptureCapability, null);
  assert.equal(closeResult.browserClosureEstablished, false);
  assert.equal(closeResult.physicalErasureEstablished, false);
  await assert.rejects(
    () => closeSingleBindingIntegratedPhysicalSeatInMemoryServer(serverCapability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("releases a future-server payload capability without starting a server", async (t) => {
  const { build } = await createPair(t, "server-release");
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "B"));
  const serverPayloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  const released = releaseSingleBindingIntegratedPhysicalServerPayloadCapability(serverPayloadCapability);
  assert.equal(released.released, true);
  assert.equal(released.referencesCleared, true);
  assert.equal(released.physicalErasureEstablished, false);
  assert.equal(released.sourceServerStarted, false);
  await assert.rejects(
    () => startSingleBindingIntegratedPhysicalSeatInMemoryServer(serverPayloadCapability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("captures one strict same-origin return, rejects bad token/body and returns an opaque capture", async (t) => {
  const { build } = await createPair(t, "return-capture");
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "A"));
  const payloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  const server = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(payloadCapability);
  let closeResult = null;
  try {
    const root = await rawHttpGet(server.entryUrl);
    const token = /name="hakimi-single-binding-return-token" content="([a-f0-9]{64})"/u
      .exec(root.body.toString("utf8"))?.[1];
    assert.match(token, /^[a-f0-9]{64}$/u);
    const artifacts = await completeReturnFor(build.runtimeSessionBindings.A);
    const headers = {
      Origin: server.origin,
      "Content-Type": "application/json;charset=utf-8",
      "X-Hakimi-Return-Token": token
    };
    assert.equal((await rawHttpPost(`${server.origin}/__complete-return`, "{}", {
      ...headers,
      "X-Hakimi-Return-Token": "0".repeat(64)
    })).status, 400);
    assert.equal((await rawHttpPost(`${server.origin}/__complete-return`, "{}", headers)).status, 400);
    const accepted = await rawHttpPost(
      `${server.origin}/__complete-return`,
      artifacts.completeReturnText,
      headers
    );
    assert.equal(accepted.status, 200);
    assert.deepEqual(JSON.parse(accepted.body.toString("utf8")), {
      accepted: true,
      duplicate: false,
      rawSha256: artifacts.completeReturnRawSha256,
      byteLength: Buffer.byteLength(artifacts.completeReturnText, "utf8")
    });
    const duplicate = await rawHttpPost(
      `${server.origin}/__complete-return`,
      artifacts.completeReturnText,
      headers
    );
    assert.equal(duplicate.status, 200);
    assert.deepEqual(JSON.parse(duplicate.body.toString("utf8")), {
      accepted: true,
      duplicate: true,
      rawSha256: artifacts.completeReturnRawSha256,
      byteLength: Buffer.byteLength(artifacts.completeReturnText, "utf8")
    });
    assert.equal((await rawHttpPost(
      `${server.origin}/__complete-return`,
      `${artifacts.completeReturnText} `,
      headers
    )).status, 409);
    closeResult = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server);
    assert.equal(closeResult.returnCaptured, true);
    assert.equal(closeResult.returnCaptureCapability.completeReturnRawSha256, artifacts.completeReturnRawSha256);
    assert.equal(closeResult.returnCaptureCapability.completeReturnByteLength,
      Buffer.byteLength(artifacts.completeReturnText, "utf8"));
    assert.equal(Object.hasOwn(closeResult.returnCaptureCapability, "bytes"), false);
    const released = releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(
      closeResult.returnCaptureCapability
    );
    assert.equal(released.externalReturnWritten, false);
    assert.equal(released.physicalErasureEstablished, false);
  } finally {
    if (closeResult === null) {
      try { await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server); } catch { /* primary assertion wins */ }
    }
  }
});

test("writes one captured synthetic return and sidecar to a new external exact directory", async (t) => {
  const { build } = await createPair(t, "return-write");
  const prepared = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "B"));
  const payloadCapability = await consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(prepared);
  const server = await startSingleBindingIntegratedPhysicalSeatInMemoryServer(payloadCapability);
  let serverClosed = false;
  try {
    const root = await rawHttpGet(server.entryUrl);
    const token = /name="hakimi-single-binding-return-token" content="([a-f0-9]{64})"/u
      .exec(root.body.toString("utf8"))?.[1];
    const artifacts = await completeReturnFor(build.runtimeSessionBindings.B);
    const accepted = await rawHttpPost(
      `${server.origin}/__complete-return`,
      artifacts.completeReturnText,
      {
        Origin: server.origin,
        "Content-Type": "application/json;charset=utf-8",
        "X-Hakimi-Return-Token": token
      }
    );
    assert.equal(accepted.status, 200);
    const closed = await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server);
    serverClosed = true;
    const captured = closed.returnCaptureCapability;
    const outputDirectory = join(dirname(build.outputDirectory), "external-return-b");
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
        outputDirectory,
        expectedCompleteReturnRawSha256: "f".repeat(64)
      }),
      (error) => error?.code === "PIN_MISMATCH"
    );
    await assert.rejects(() => lstat(outputDirectory), (error) => error?.code === "ENOENT");
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(
        JSON.parse(JSON.stringify(captured)),
        {
          outputDirectory,
          expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
        }
      ),
      (error) => error?.code === "CAPABILITY_INVALID"
    );
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
        outputDirectory: build.outputDirectory,
        expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
      }),
      (error) => error?.code === "OUTPUT_DIRECTORY_INVALID"
    );

    const existingExternalDirectory = join(dirname(build.outputDirectory), "existing-external-return");
    await mkdir(existingExternalDirectory);
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
        outputDirectory: existingExternalDirectory,
        expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
      }),
      (error) => error?.code === "OUTPUT_DIRECTORY_EXISTS"
    );

    const receipt = await writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
      outputDirectory,
      expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
    });
    assert.deepEqual(receipt.boundary, SINGLE_BINDING_INTEGRATED_PHYSICAL_RETURN_WRITE_BOUNDARY);
    assert.equal(receipt.boundary.returnExternalWriteImplemented, true);
    assert.equal(receipt.boundary.returnDirectoryVerificationImplemented, true);
    assert.equal(SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY.returnHeldInSourceProcessMemoryOnly, true);
    assert.equal(SINGLE_BINDING_INTEGRATED_PHYSICAL_SERVER_BOUNDARY.returnExternalWriteImplemented, false);
    assert.equal(receipt.boundary.returnHeldInSourceProcessMemoryOnly, false);
    assert.equal(receipt.boundary.returnWasHeldInSourceProcessMemoryBeforeExternalWrite, true);
    assert.equal(receipt.boundary.outputFileAclPrivacyEstablished, false);
    assert.equal(receipt.boundary.atomicTwoFileCommitEstablished, false);
    assert.equal(receipt.boundary.partialOutputMayRemainOnFailure, true);
    assert.equal(receipt.boundary.partialOutputCleanupImplemented, false);
    assert.equal(receipt.boundary.partialOutputMayContainSensitiveReturnBytes, true);
    assert.equal(receipt.boundary.samePermissionMutationExcluded, false);
    assert.equal(receipt.boundary.capturedReturnRecoverableAfterWriteFailure, false);
    assert.equal(receipt.boundary.capturedReturnRecoverableAfterWriteFailureWhenHandleCleanupConfirmed, true);
    assert.equal(receipt.boundary.handleCleanupFailureRemainsFailClosed, true);
    assert.equal(receipt.boundary.capabilityConsumedOnlyAfterVerifiedWriteSuccess, true);
    assert.equal(receipt.boundary.physicalExpertSurfaceReady, false);
    assert.deepEqual((await readdir(outputDirectory)).sort(), [
      receipt.completeReturn.filename,
      receipt.sidecar.filename
    ].sort());
    const completeBytes = await readFile(join(outputDirectory, receipt.completeReturn.filename));
    const sidecarBytes = await readFile(join(outputDirectory, receipt.sidecar.filename));
    assert.equal(sha256(completeBytes), artifacts.completeReturnRawSha256);
    assert.equal(receipt.completeReturn.rawSha256, artifacts.completeReturnRawSha256);
    assert.equal(sidecarBytes.toString("utf8"),
      `${artifacts.completeReturnRawSha256}  ${receipt.completeReturn.filename}\n`);
    assert.equal(receipt.sidecar.rawSha256, sha256(sidecarBytes));
    assert.throws(
      () => releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured),
      (error) => error?.code === "CAPABILITY_INVALID"
    );
  } finally {
    if (!serverClosed) {
      try { await closeSingleBindingIntegratedPhysicalSeatInMemoryServer(server); } catch { /* primary wins */ }
    }
  }
});

test("reserves one captured return across concurrent writers and creates only the winner directory", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-race", "A");
  const parent = dirname(build.outputDirectory);
  const outputOne = join(parent, "external-return-one");
  const outputTwo = join(parent, "external-return-two");
  const request = (outputDirectory) => ({
    outputDirectory,
    expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
  });
  const outcomes = await Promise.allSettled([
    writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, request(outputOne)),
    writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, request(outputTwo))
  ]);
  const fulfilledIndexes = outcomes.flatMap((outcome, index) => outcome.status === "fulfilled" ? [index] : []);
  const rejectedIndexes = outcomes.flatMap((outcome, index) => outcome.status === "rejected" ? [index] : []);
  assert.deepEqual(fulfilledIndexes.length, 1);
  assert.deepEqual(rejectedIndexes.length, 1);
  assert.equal(outcomes[rejectedIndexes[0]].reason?.code, "CAPABILITY_INVALID");
  const outputs = [outputOne, outputTwo];
  const winnerOutput = outputs[fulfilledIndexes[0]];
  const loserOutput = outputs[rejectedIndexes[0]];
  assert.equal((await readdir(winnerOutput)).length, 2);
  await assert.rejects(() => lstat(loserOutput), (error) => error?.code === "ENOENT");
  assert.throws(
    () => releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("blocks synchronous release while an external writer owns the captured return reservation", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-release-race", "B");
  const outputDirectory = join(dirname(build.outputDirectory), "external-return");
  const writePromise = writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
    outputDirectory,
    expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
  });
  assert.throws(
    () => releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  const receipt = await writePromise;
  assert.equal(receipt.outputDirectory.toLowerCase(), outputDirectory.toLowerCase());
  assert.equal((await readdir(outputDirectory)).length, 2);
});

test("keeps a failing writer reserved until its rejection settles, then permits explicit release", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-failure-release-race", "A");
  const existingOutputDirectory = join(dirname(build.outputDirectory), "already-exists");
  await mkdir(existingOutputDirectory);
  const writePromise = writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
    outputDirectory: existingOutputDirectory,
    expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
  });
  assert.throws(
    () => releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  await assert.rejects(writePromise, (error) => error?.code === "OUTPUT_DIRECTORY_EXISTS");
  const released = releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured);
  assert.equal(released.released, true);
  assert.equal(released.externalReturnWritten, false);
});

test("fails closed when a raw write handle close cannot be confirmed", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-close-unconfirmed", "B");
  const owner = dirname(build.outputDirectory);
  const outputDirectory = join(owner, "external-return");
  const originalOpen = fs.promises.open;
  let restored = false;
  let injectedCloseRejection = false;
  const restoreOpen = () => {
    if (restored) return;
    fs.promises.open = originalOpen;
    syncBuiltinESMExports();
    restored = true;
  };
  t.after(restoreOpen);
  fs.promises.open = async (...args) => {
    const handle = await Reflect.apply(originalOpen, fs.promises, args);
    const target = typeof args[0] === "string" ? args[0] : "";
    const flags = args[1];
    if (!injectedCloseRejection
      && typeof flags === "number"
      && (flags & fs.constants.O_WRONLY) === fs.constants.O_WRONLY
      && dirname(target).toLowerCase() === outputDirectory.toLowerCase()) {
      return {
        write: (...methodArgs) => handle.write(...methodArgs),
        sync: (...methodArgs) => handle.sync(...methodArgs),
        async close(...methodArgs) {
          injectedCloseRejection = true;
          await handle.close(...methodArgs);
          const error = new Error("synthetic post-close rejection");
          error.code = "SYNTHETIC_POST_CLOSE_REJECTION";
          throw error;
        }
      };
    }
    return handle;
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
        outputDirectory,
        expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
      }),
      (error) => error?.code === "HANDLE_CLOSE_FAILED"
        && error?.cleanupUnconfirmed === true
        && error?.primaryCode === null
    );
  } finally {
    restoreOpen();
  }
  assert.equal(injectedCloseRejection, true);
  assert.throws(
    () => releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
  await assert.rejects(
    () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
      outputDirectory: join(owner, "retry-must-remain-blocked"),
      expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
    }),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("rejects return destinations inside every physical package directory and preserves retry", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-inside-package", "A");
  const illegalOutputs = [
    join(build.outputDirectory, "seat-a", "return-x"),
    join(build.outputDirectory, "seat-b", "return-x"),
    join(build.outputDirectory, "coordinator", "return-x")
  ];
  for (const outputDirectory of illegalOutputs) {
    await assert.rejects(
      () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
        outputDirectory,
        expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
      }),
      (error) => error?.code === "OUTPUT_DIRECTORY_INVALID"
    );
    await assert.rejects(() => lstat(outputDirectory), (error) => error?.code === "ENOENT");
  }
  const legalOutput = join(dirname(build.outputDirectory), "external-return");
  const receipt = await writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
    outputDirectory: legalOutput,
    expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
  });
  assert.equal(receipt.outputDirectory.toLowerCase(), legalOutput.toLowerCase());
});

test("rejects a redirected return parent and preserves the captured return for a legal retry", async (t) => {
  const { build, captured } = await captureSyntheticReturn(t, "writer-redirected-parent", "B");
  const owner = dirname(build.outputDirectory);
  const actualParent = join(owner, "actual-parent");
  const redirectedParent = join(owner, "redirected-parent");
  await mkdir(actualParent);
  try {
    await symlink(actualParent, redirectedParent, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    releaseSingleBindingIntegratedPhysicalCapturedReturnCapability(captured);
    if (error?.code === "EPERM" || error?.code === "EACCES" || error?.code === "ENOTSUP") {
      t.skip(`directory redirect unsupported: ${error.code}`);
      return;
    }
    throw error;
  }
  const redirectedOutput = join(redirectedParent, "return-x");
  await assert.rejects(
    () => writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
      outputDirectory: redirectedOutput,
      expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
    }),
    (error) => error?.code === "OUTPUT_DIRECTORY_INVALID"
  );
  await assert.rejects(() => lstat(join(actualParent, "return-x")), (error) => error?.code === "ENOENT");
  const legalOutput = join(owner, "external-return");
  const receipt = await writeSingleBindingIntegratedPhysicalCapturedReturnToExternalDirectory(captured, {
    outputDirectory: legalOutput,
    expectedCompleteReturnRawSha256: captured.completeReturnRawSha256
  });
  assert.equal(receipt.outputDirectory.toLowerCase(), legalOutput.toLowerCase());
});

test("rejects wrong external P/PM/S and selected identity values", async (t) => {
  const { build } = await createPair(t, "pins");
  const base = requestFor(build, "A");
  const cases = [
    { ...base, expectedPairPrecommitRawSha256: "a".repeat(64) },
    { ...base, expectedPairManifestRawSha256: "b".repeat(64) },
    { ...base, expectedSeatPackageManifestRawSha256: build.seatB.manifestRawSha256 },
    { ...base, expectedReviewCycleId: `single-binding-synthetic-review-cycle.${"c".repeat(64)}` },
    { ...base, expectedPairRunId: `single-binding-synthetic-pair-run.${"d".repeat(64)}` },
    { ...base, expectedSeatSessionNonce: build.runtimeSessionBindings.B.seatSessionNonce }
  ];
  for (const request of cases) {
    await assert.rejects(() => prepareSingleBindingIntegratedPhysicalSeatPackage(request));
  }
});

test("rejects selected payload tamper and a hardlinked selected payload", async (t) => {
  const first = await createPair(t, "tamper");
  const cssPath = join(first.build.outputDirectory, "seat-a", "single-binding-integrated.css");
  await writeFile(cssPath, Buffer.from("tampered\n", "utf8"));
  await assert.rejects(
    () => prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(first.build, "A")),
    (error) => ["PAYLOAD_MISMATCH", "FILE_IDENTITY_CHANGED"].includes(error?.code)
  );

  const second = await createPair(t, "hardlink");
  const scriptPath = join(second.build.outputDirectory, "seat-a", "single-binding-integrated.js");
  const savedPath = join(second.build.outputDirectory, "seat-a", "saved-script.js");
  await rename(scriptPath, savedPath);
  await link(savedPath, scriptPath);
  await unlink(savedPath);
  const linkPeer = join(second.build.outputDirectory, "seat-b", "hardlink-peer.js");
  await link(scriptPath, linkPeer);
  await assert.rejects(
    () => prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(second.build, "A")),
    (error) => ["FILE_ENDPOINT_INVALID", "ENDPOINT_SET_INVALID"].includes(error?.code)
  );
});

test("reasserts held bytes at consume time and burns the capability on failed consume", async (t) => {
  const { build } = await createPair(t, "consume-race");
  const capability = await prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "A"));
  await writeFile(
    join(build.outputDirectory, "coordinator", "single-binding-integrated-pair.css"),
    Buffer.from("changed after prepare\n", "utf8")
  );
  await assert.rejects(
    () => consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capability),
    (error) => ["FILE_IDENTITY_CHANGED", "ENDPOINT_SET_INVALID"].includes(error?.code)
  );
  await assert.rejects(
    () => consumeSingleBindingIntegratedPhysicalSeatPackageForInMemoryServer(capability),
    (error) => error?.code === "CAPABILITY_INVALID"
  );
});

test("rejects extra root, selected-seat, or coordinator endpoints", async (t) => {
  for (const [label, relativePath] of [
    ["extra-root", ["extra.txt"]],
    ["extra-seat", ["seat-a", "extra.txt"]],
    ["extra-coordinator", ["coordinator", "extra.txt"]]
  ]) {
    await t.test(label, async (subtest) => {
      const { build } = await createPair(subtest, label);
      await writeFile(join(build.outputDirectory, ...relativePath), Buffer.from("extra\n", "utf8"));
      await assert.rejects(
        () => prepareSingleBindingIntegratedPhysicalSeatPackage(requestFor(build, "A")),
        (error) => error?.code === "ENDPOINT_SET_INVALID"
      );
    });
  }
});

test("rejects an opposite-seat manifest substituted into the selected seat", async (t) => {
  const { build } = await createPair(t, "opposite");
  const oppositeBytes = await readFile(join(build.outputDirectory, "seat-b", "package-manifest.json"));
  await writeFile(join(build.outputDirectory, "seat-a", "package-manifest.json"), oppositeBytes);
  await assert.rejects(
    () => prepareSingleBindingIntegratedPhysicalSeatPackage({
      ...requestFor(build, "A"),
      expectedSeatPackageManifestRawSha256: sha256(oppositeBytes)
    }),
    (error) => ["PIN_MISMATCH", "MANIFEST_INVALID", "IDENTITY_MISMATCH"].includes(error?.code)
  );
});

test("rejects duplicate-key JSON even when the caller supplies its new raw PM pin", async (t) => {
  const { build } = await createPair(t, "duplicate-json");
  const pairManifestPath = join(build.outputDirectory, "pair-manifest.json");
  const original = await readFile(pairManifestPath, "utf8");
  const duplicate = Buffer.from(original.replace(
    /\{\r?\n/u,
    `{\n  "schemaVersion": "1.0.0",\n`
  ), "utf8");
  await writeFile(pairManifestPath, duplicate);
  await assert.rejects(
    () => prepareSingleBindingIntegratedPhysicalSeatPackage({
      ...requestFor(build, "A"),
      expectedPairManifestRawSha256: sha256(duplicate)
    }),
    (error) => error?.code === "JSON_INVALID"
  );
});

test("rejects a case-differing symlink root on a case-sensitive platform", {
  skip: process.platform !== "linux"
}, async (t) => {
  const { build } = await createPair(t, "case-symlink");
  const alias = join(dirname(build.outputDirectory), "PAIR");
  await symlink("pair", alias, "dir");
  await assert.rejects(
    () => prepareSingleBindingIntegratedPhysicalSeatPackage({
      ...requestFor(build, "A"),
      pairRoot: alias
    }),
    (error) => error?.code === "PACKAGE_ROOT_INVALID"
  );
});
