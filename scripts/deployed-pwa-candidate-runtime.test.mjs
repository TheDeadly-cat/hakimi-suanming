import assert from "node:assert/strict";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parse } from "@babel/parser";

import {
  DEPLOYED_PWA_CANDIDATE_ATTACHMENT_ROLES,
  DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR,
  assertDeployedPwaCandidateArtifactIdentityStable,
  assertFreshProfileDirectory,
  deployedPwaCandidateProfileBindingDigest,
  parseDeployedPwaCandidateEnvironment,
  prepareCandidateProjectOutput,
  revalidateDeployedPwaCandidateArtifactIdentity,
  writeDeployedPwaBrowserCandidate
} from "./deployed-pwa-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

const origin = "https://staging.example.com";
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const runId = "candidate-run-0001";
const caseId = "11111111-1111-4111-8111-111111111111";
const revisionId = "22222222-2222-4222-8222-222222222222";
const caseRevisionPath = `/cases/${caseId}/revisions/${revisionId}`;
const unitManifestDocument = Object.freeze({
  name: "Hakimi test",
  id: "/",
  start_url: "/",
  scope: "/",
  display: "standalone"
});

function unitManifestBytes() {
  return Buffer.from(`${JSON.stringify(unitManifestDocument, null, 2)}\n`, "utf8");
}

async function temporaryBindingRoot(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-deployed-pwa-candidate-unit-"));
  await mkdir(path.join(root, "dist", "web"), { recursive: true });
  t.after(async () => rm(root, { recursive: true, force: true }));
  return root;
}

function environmentFor(bindingRoot, overrides = {}) {
  return {
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ORIGIN: origin,
    HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT: path.join(bindingRoot, "tmp", "candidate-output"),
    HAKIMI_DEPLOYED_PWA_CANDIDATE_BINDING_ROOT: bindingRoot,
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_ROOT: path.join(bindingRoot, "dist", "web"),
    HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_LOCK: path.join(bindingRoot, "tmp", "release-artifact-identity.json"),
    HAKIMI_DEPLOYED_PWA_CANDIDATE_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_DEPLOYED_PWA_CANDIDATE_RUN_ID: runId,
    ...overrides
  };
}

function routeObservations(projectName) {
  return [
    {
      routeId: "online-root",
      path: "/",
      navigationKind: "online",
      offline: false,
      playwrightFromServiceWorkerRecorded: false,
      cdpFromServiceWorkerRecorded: false,
      cdpRequestId: `${projectName}.request.0`,
      observedAt: "2026-08-27T00:00:01.000Z"
    },
    {
      routeId: "offline-settings-data",
      path: "/settings/data",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}.request.1`,
      observedAt: "2026-08-27T00:00:02.000Z"
    },
    {
      routeId: "offline-case-revision",
      path: caseRevisionPath,
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}.request.2`,
      observedAt: "2026-08-27T00:00:03.000Z"
    },
    {
      routeId: "offline-help-cold-start",
      path: "/help",
      navigationKind: "cold-start",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}.request.3`,
      observedAt: "2026-08-27T00:00:04.000Z"
    },
    {
      routeId: "offline-help-reload",
      path: "/help",
      navigationKind: "reload",
      offline: true,
      playwrightFromServiceWorkerRecorded: true,
      cdpFromServiceWorkerRecorded: true,
      cdpRequestId: `${projectName}.request.4`,
      observedAt: "2026-08-27T00:00:05.000Z"
    }
  ];
}

function projection() {
  return {
    databaseName: "hakimi-bazi-research",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    caseId,
    revisionId,
    caseRecordSha256: sha256("unit case record"),
    revisionRecordSha256: sha256("unit revision record")
  };
}

function capture(projectName, phase, capturedAt) {
  return {
    schemaVersion: 1,
    recordType: "deployed-pwa-case-revision-observation-v1",
    projectName,
    captureId: `${runId}-${projectName}-${phase === "before_offline_cold_start" ? "before" : "after"}`,
    capturePhase: phase,
    capturedAt,
    projection: projection()
  };
}

function verifiedArtifactIdentity(serviceWorkerBytes, pwaManifestBytes = unitManifestBytes()) {
  return {
    releaseEvidenceId,
    descriptor: structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR),
    buildVersion: "abcdef123456",
    artifactSetDigest: sha256("unit artifact set"),
    pwaManifest: {
      path: "manifest.webmanifest",
      size: pwaManifestBytes.byteLength,
      sha256: sha256(pwaManifestBytes)
    },
    serviceWorker: {
      path: "dist/web/sw.js",
      size: serviceWorkerBytes.byteLength,
      sha256: sha256(serviceWorkerBytes)
    },
    lockDigest: sha256("unit lock document"),
    verificationSnapshot: {
      bindingRoot: { realPath: "C:\\binding", dev: 1, ino: 2, birthtimeMs: 3 },
      artifactRoot: { realPath: "C:\\binding\\dist\\web", dev: 1, ino: 4, birthtimeMs: 5 },
      lockFile: {
        realPath: "C:\\binding\\identity.json",
        dev: 1,
        ino: 6,
        birthtimeMs: 7,
        size: 100,
        nlink: 1,
        sha256: sha256("unit lock bytes")
      },
      verifierLockFileSha256: sha256("unit lock bytes"),
      lock: { schemaVersion: 1, evidenceId: releaseEvidenceId }
    }
  };
}

function writerInput({
  preparedOutput,
  serviceWorkerBytes,
  projectName = "msedge",
  pwaManifestBytes = unitManifestBytes()
}) {
  const browserChannel = projectName;
  const actualProduct = projectName === "msedge" ? "Edg/140.0.1.2" : "Chrome/140.0.1.2";
  const installabilityResponse = { installabilityErrors: [] };
  const appManifestResponse = {
    url: `${origin}/manifest.webmanifest`,
    errors: [],
    data: pwaManifestBytes.toString("utf8"),
    manifest: {
      id: `${origin}/`,
      startUrl: `${origin}/`,
      scope: `${origin}/`,
      display: "standalone",
      name: "Hakimi test"
    }
  };
  return {
    preparedOutput,
    runId,
    targetOrigin: origin,
    initialArtifact: verifiedArtifactIdentity(serviceWorkerBytes, pwaManifestBytes),
    finalArtifact: verifiedArtifactIdentity(serviceWorkerBytes, pwaManifestBytes),
    projectName,
    browserChannel,
    actualProduct,
    profileBindingDigest: sha256(`unit ${projectName} profile`),
    initialControllerRuntime: {
      registrationScope: `${origin}/`,
      controllerScriptUrl: `${origin}/sw.js`,
      controllerState: "activated",
      activeScriptUrl: `${origin}/sw.js`,
      activeState: "activated",
      waitingScriptUrl: null,
      installingScriptUrl: null,
      workerMessage: {
        type: "BUILD_VERSION",
        buildVersion: "abcdef123456",
        ...structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR)
      }
    },
    finalControllerRuntime: {
      registrationScope: `${origin}/`,
      controllerScriptUrl: `${origin}/sw.js`,
      controllerState: "activated",
      activeScriptUrl: `${origin}/sw.js`,
      activeState: "activated",
      waitingScriptUrl: null,
      installingScriptUrl: null,
      workerMessage: {
        type: "BUILD_VERSION",
        buildVersion: "abcdef123456",
        ...structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR)
      }
    },
    routeObservations: routeObservations(projectName),
    caseRevisionPath,
    beforeCapture: capture(projectName, "before_offline_cold_start", "2026-08-27T00:00:02.500Z"),
    afterCapture: capture(projectName, "after_offline_cold_start", "2026-08-27T00:00:03.500Z"),
    initialControllerSourceBytes: serviceWorkerBytes,
    finalControllerSourceBytes: serviceWorkerBytes,
    initialRemoteServiceWorkerBytes: serviceWorkerBytes,
    finalRemoteServiceWorkerBytes: serviceWorkerBytes,
    initialInstallabilityResponse: structuredClone(installabilityResponse),
    finalInstallabilityResponse: structuredClone(installabilityResponse),
    initialAppManifestResponse: structuredClone(appManifestResponse),
    finalAppManifestResponse: structuredClone(appManifestResponse),
    initialRemoteManifestBytes: Buffer.from(pwaManifestBytes),
    finalRemoteManifestBytes: Buffer.from(pwaManifestBytes),
    startedAt: "2026-08-27T00:00:00.000Z",
    completedAt: "2026-08-27T00:00:06.000Z",
    unexpectedExternalRequestCount: 0
  };
}

test("environment parser requires canonical public HTTPS and absolute bound paths", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const parsed = parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot));
  assert.equal(parsed.origin, origin);
  assert.equal(parsed.releaseEvidenceId, releaseEvidenceId);
  assert.equal(parsed.runId, runId);
  assert.ok(path.isAbsolute(parsed.outputRoot));

  for (const invalidOrigin of [
    "http://staging.example.com",
    "https://staging.example.com/",
    "https://localhost",
    "https://127.0.0.1"
  ]) {
    assert.throws(
      () => parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
        HAKIMI_DEPLOYED_PWA_CANDIDATE_ORIGIN: invalidOrigin
      })),
      /DEPLOYED_PWA_CANDIDATE_ORIGIN_INVALID/u
    );
  }
  assert.throws(
    () => parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
      HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT: "relative/output"
    })),
    /DEPLOYED_PWA_CANDIDATE_PATH_NOT_ABSOLUTE/u
  );
  assert.throws(
    () => parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
      HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT: path.resolve(bindingRoot, "..", "outside")
    })),
    /DEPLOYED_PWA_CANDIDATE_PATH_OUTSIDE_ROOT/u
  );
  const artifactRoot = path.join(bindingRoot, "dist", "web");
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  for (const [overriddenOutputRoot, overriddenArtifactRoot] of [
    [artifactRoot, artifactRoot],
    [path.join(artifactRoot, "candidate-output"), artifactRoot],
    [outputRoot, path.join(outputRoot, "artifact")]
  ]) {
    assert.throws(
      () => parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
        HAKIMI_DEPLOYED_PWA_CANDIDATE_OUTPUT_ROOT: overriddenOutputRoot,
        HAKIMI_DEPLOYED_PWA_CANDIDATE_ARTIFACT_ROOT: overriddenArtifactRoot
      })),
      /DEPLOYED_PWA_CANDIDATE_ROOTS_OVERLAP/u
    );
  }
});

test("run ids use the same lowercase-hyphen vocabulary in the parser and writer", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const acceptedRunId = "candidate-run-0002";
  assert.equal(
    parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
      HAKIMI_DEPLOYED_PWA_CANDIDATE_RUN_ID: acceptedRunId
    })).runId,
    acceptedRunId
  );

  for (const rejectedRunId of [
    "candidate.run-0002",
    "candidate_run-0002",
    "candidate:run-0002",
    "Candidate-run-0002"
  ]) {
    assert.throws(
      () => parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot, {
        HAKIMI_DEPLOYED_PWA_CANDIDATE_RUN_ID: rejectedRunId
      })),
      /DEPLOYED_PWA_CANDIDATE_RUN_ID_INVALID/u
    );
  }

  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const acceptedWriterInput = writerInput({ preparedOutput, serviceWorkerBytes });
  acceptedWriterInput.runId = acceptedRunId;
  await assert.doesNotReject(writeDeployedPwaBrowserCandidate(acceptedWriterInput));

  const chromeOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "chrome"
  });
  for (const rejectedRunId of ["candidate.run-0002", 12345678]) {
    const rejectedWriterInput = writerInput({
      preparedOutput: chromeOutput,
      serviceWorkerBytes,
      projectName: "chrome"
    });
    rejectedWriterInput.runId = rejectedRunId;
    await assert.rejects(
      writeDeployedPwaBrowserCandidate(rejectedWriterInput),
      /DEPLOYED_PWA_CANDIDATE_RUN_ID_INVALID/u
    );
  }
  assert.deepEqual(await readdir(chromeOutput.projectRoot), []);
});

test("project output guard accepts only a new or empty exact project directory", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const prepared = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  assert.deepEqual(await readdir(prepared.projectRoot), []);
  await writeFile(path.join(prepared.projectRoot, "existing.json"), "{}\n", "utf8");
  await assert.rejects(
    prepareCandidateProjectOutput({
      bindingRoot,
      outputRoot,
      artifactRoot: path.join(bindingRoot, "dist", "web"),
      projectName: "msedge"
    }),
    /DEPLOYED_PWA_CANDIDATE_PROJECT_NOT_EMPTY/u
  );
});

test("project output preparation rechecks real artifact/output isolation", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  await assert.rejects(
    prepareCandidateProjectOutput({
      bindingRoot,
      outputRoot: path.join(bindingRoot, "dist"),
      artifactRoot: path.join(bindingRoot, "dist", "web"),
      projectName: "msedge"
    }),
    /DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND/u
  );
  const notYetCreated = path.join(bindingRoot, "dist", "web", "candidate-output");
  await assert.rejects(
    prepareCandidateProjectOutput({
      bindingRoot,
      outputRoot: notYetCreated,
      artifactRoot: path.join(bindingRoot, "dist", "web"),
      projectName: "msedge"
    }),
    /DEPLOYED_PWA_CANDIDATE_ROOTS_REBOUND/u
  );
  await assert.rejects(lstat(notYetCreated), (error) => error?.code === "ENOENT");
});

test("artifact stability binds semantic fields and the complete physical verification snapshot", () => {
  const artifact = {
    releaseEvidenceId,
    descriptor: structuredClone(DEPLOYED_PWA_CANDIDATE_DEFAULT_DESCRIPTOR),
    buildVersion: "abcdef123456",
    artifactSetDigest: sha256("artifact set"),
    pwaManifest: { path: "manifest.webmanifest", size: 16, sha256: sha256("manifest") },
    serviceWorker: { path: "dist/web/sw.js", size: 16, sha256: sha256("worker") },
    lockDigest: sha256("lock document"),
    verificationSnapshot: {
      bindingRoot: { realPath: "C:\\binding", dev: 1, ino: 2, birthtimeMs: 3 },
      artifactRoot: { realPath: "C:\\binding\\dist\\web", dev: 1, ino: 4, birthtimeMs: 5 },
      lockFile: {
        realPath: "C:\\binding\\identity.json",
        dev: 1,
        ino: 6,
        birthtimeMs: 7,
        size: 100,
        nlink: 1,
        sha256: sha256("lock bytes")
      },
      verifierLockFileSha256: sha256("lock bytes"),
      lock: { schemaVersion: 1, evidenceId: releaseEvidenceId }
    }
  };
  assert.equal(
    assertDeployedPwaCandidateArtifactIdentityStable(artifact, structuredClone(artifact)).lockDigest,
    artifact.lockDigest
  );
  for (const mutate of [
    (value) => { value.releaseEvidenceId = `hre1-${"b".repeat(32)}`; },
    (value) => { value.buildVersion = "fedcba654321"; },
    (value) => { value.artifactSetDigest = sha256("changed artifact set"); },
    (value) => { value.pwaManifest.sha256 = sha256("changed manifest"); },
    (value) => { value.serviceWorker.sha256 = sha256("changed worker"); },
    (value) => { value.descriptor.targetSchema = 14; },
    (value) => { value.lockDigest = sha256("changed lock"); },
    (value) => { value.verificationSnapshot.artifactRoot.ino = 99; },
    (value) => { value.verificationSnapshot.lockFile.sha256 = sha256("replaced lock bytes"); },
    (value) => { value.verificationSnapshot.verifierLockFileSha256 = sha256("changed verifier bytes"); },
    (value) => { value.verificationSnapshot.lockFile.size = 101; },
    (value) => { value.verificationSnapshot.lock.lockVersion = 2; }
  ]) {
    const changed = structuredClone(artifact);
    mutate(changed);
    assert.throws(
      () => assertDeployedPwaCandidateArtifactIdentityStable(artifact, changed),
      /DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND/u
    );
  }
});

test("final artifact verifier failures collapse into the artifact rebound account", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const candidateEnvironment = parseDeployedPwaCandidateEnvironment(environmentFor(bindingRoot));
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot: candidateEnvironment.outputRoot,
    artifactRoot: candidateEnvironment.artifactRoot,
    projectName: "msedge"
  });
  await assert.rejects(
    revalidateDeployedPwaCandidateArtifactIdentity(
      candidateEnvironment,
      verifiedArtifactIdentity(Buffer.from("self.skipWaiting();\n", "utf8"))
    ),
    /DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND/u
  );
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("prepared project lock rejects a same-path physical directory replacement", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  await rm(preparedOutput.projectRoot, { recursive: true });
  await new Promise((resolve) => setTimeout(resolve, 5));
  await mkdir(preparedOutput.projectRoot);
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(writerInput({ preparedOutput, serviceWorkerBytes })),
    /DEPLOYED_PWA_CANDIDATE_ROOT_REBOUND/u
  );
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("output guard rejects a symlink or junction in the candidate tree when the host permits creating one", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const target = path.join(bindingRoot, "real-output");
  const linkedOutput = path.join(bindingRoot, "linked-output");
  await mkdir(target);
  try {
    await symlink(target, linkedOutput, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (error && typeof error === "object" && ["EPERM", "EACCES", "ENOSYS"].includes(error.code)) {
      t.skip(`Host cannot create a directory link: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    prepareCandidateProjectOutput({
      bindingRoot,
      outputRoot: linkedOutput,
      artifactRoot: path.join(bindingRoot, "dist", "web"),
      projectName: "msedge"
    }),
    /DEPLOYED_PWA_CANDIDATE_DIRECTORY_UNSAFE/u
  );
});

test("fresh profile guard rejects an existing profile and binds the absolute path", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const profile = path.join(bindingRoot, "fresh-profile");
  await assert.doesNotReject(assertFreshProfileDirectory(profile));
  const first = deployedPwaCandidateProfileBindingDigest({ projectName: "msedge", userDataDir: profile });
  const second = deployedPwaCandidateProfileBindingDigest({ projectName: "msedge", userDataDir: profile });
  const samePathOtherBrowser = deployedPwaCandidateProfileBindingDigest({
    projectName: "chrome",
    userDataDir: profile
  });
  const otherPath = deployedPwaCandidateProfileBindingDigest({
    projectName: "chrome",
    userDataDir: path.join(bindingRoot, "other-fresh-profile")
  });
  assert.match(first, /^[a-f0-9]{64}$/u);
  assert.equal(first, second);
  assert.equal(first, samePathOtherBrowser);
  assert.notEqual(first, otherPath);
  await mkdir(profile);
  await assert.rejects(assertFreshProfileDirectory(profile), /DEPLOYED_PWA_CANDIDATE_PROFILE_NOT_FRESH/u);
});

test("atomic writer emits only the ten v3 attachments and an untrusted candidate receipt", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.addEventListener('fetch', () => undefined);\n", "utf8");
  const result = await writeDeployedPwaBrowserCandidate(
    writerInput({ preparedOutput, serviceWorkerBytes })
  );
  const entries = (await readdir(preparedOutput.projectRoot)).sort();
  assert.deepEqual(entries, [
    "browser-manifest-audit.json",
    "browser-receipt.json",
    "browser-version.json",
    "case-revision-after.json",
    "case-revision-before.json",
    "controller-script-meta.json",
    "controller-source.js",
    "network-events.json",
    "profile-preflight.json",
    "remote-pwa-manifest-body.webmanifest",
    "remote-service-worker-body.js"
  ]);
  assert.equal(result.document.schemaVersion, 3);
  assert.equal(result.document.receiptType, "deployed_pwa_browser_runtime_receipt_candidate_v3");
  assert.equal(result.document.projectName, "msedge");
  assert.equal(result.document.attemptCount, 1);
  assert.equal(result.document.retryCount, 0);
  assert.equal(result.document.skippedCount, 0);
  assert.equal(result.document.flakyCount, 0);
  assert.equal(result.document.unexpectedExternalRequestCount, 0);
  assert.deepEqual(result.document.manifest, {
    manifestUrl: `${origin}/manifest.webmanifest`,
    installabilityEvidenceMethod: "cdp_page_get_installability_errors_v1",
    processedManifestEvidenceMethod: "cdp_page_get_app_manifest_v1",
    remoteManifestEvidenceMethod: "browser_context_request_identity_v1",
    installabilityErrorCount: 0,
    manifestParseErrorCount: 0,
    browserManifestContentSha256: sha256(unitManifestBytes()),
    manifestSemanticProjectionSha256: sha256(canonicalJson({
      id: `${origin}/`,
      startUrl: `${origin}/`,
      scope: `${origin}/`,
      display: "standalone"
    })),
    remoteManifestSha256: sha256(unitManifestBytes())
  });
  assert.deepEqual(
    result.document.attachments.map((attachment) => attachment.role),
    DEPLOYED_PWA_CANDIDATE_ATTACHMENT_ROLES
  );
  assert.equal(new Set(result.document.attachments.map((attachment) => attachment.path)).size, 10);
  assert.equal("strictGatePassed" in result.document, false);
  assert.equal("trusted" in result.document, false);
  const manifestAudit = JSON.parse(await readFile(
    path.join(preparedOutput.projectRoot, "browser-manifest-audit.json"),
    "utf8"
  ));
  assert.deepEqual(manifestAudit, {
    schemaVersion: 1,
    recordType: "deployed_pwa_browser_manifest_audit_v1",
    projectName: "msedge",
    browserChannel: "msedge",
    actualProduct: "Edg/140.0.1.2",
    installability: {
      method: "cdp_page_get_installability_errors_v1",
      installabilityErrors: []
    },
    processedManifest: {
      method: "cdp_page_get_app_manifest_v1",
      url: `${origin}/manifest.webmanifest`,
      errors: [],
      data: unitManifestBytes().toString("utf8"),
      manifest: {
        id: `${origin}/`,
        startUrl: `${origin}/`,
        scope: `${origin}/`,
        display: "standalone",
        name: "Hakimi test"
      }
    }
  });
  assert.deepEqual(
    await readFile(path.join(preparedOutput.projectRoot, "remote-pwa-manifest-body.webmanifest")),
    unitManifestBytes()
  );
  const deployedPwaSchema = JSON.parse(await readFile(
    path.resolve("docs/release/deployed-pwa-evidence-v3.schema.json"),
    "utf8"
  ));
  const receiptSchemaId = "https://hakimi.invalid/schemas/deployed-pwa-browser-candidate-unit.json";
  const receiptSchema = {
    $schema: deployedPwaSchema.$schema,
    $id: receiptSchemaId,
    title: "Browser candidate receipt unit projection",
    $defs: deployedPwaSchema.$defs,
    ...deployedPwaSchema.$defs.EdgeBrowserReceipt
  };
  const receiptValidator = compileEvidenceSchemaForId(receiptSchema, receiptSchemaId);
  assert.doesNotThrow(() => receiptValidator.assert(result.envelope));
  const persisted = JSON.parse(await readFile(result.receiptPath, "utf8"));
  assert.equal(canonicalJson(persisted), canonicalJson(result.document));
  for (const entry of entries) {
    const metadata = await lstat(path.join(preparedOutput.projectRoot, entry));
    assert.equal(metadata.isFile(), true);
    assert.equal(metadata.isSymbolicLink(), false);
    assert.equal(metadata.nlink, 1);
  }
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(writerInput({ preparedOutput, serviceWorkerBytes })),
    /DEPLOYED_PWA_CANDIDATE_OVERWRITE_REFUSED/u
  );
});

test("writer stops before creating files when controller, remote, and locked SW bytes differ", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "chrome"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const input = writerInput({ preparedOutput, serviceWorkerBytes, projectName: "chrome" });
  input.initialControllerSourceBytes = Buffer.from("self.clients.claim();\n", "utf8");
  input.finalControllerSourceBytes = input.initialControllerSourceBytes;
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(input),
    /DEPLOYED_PWA_CANDIDATE_SERVICE_WORKER_BYTES_MISMATCH/u
  );
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("receipt publication failure removes the owned final marker and leaves only discardable attachments", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot: path.join(bindingRoot, "tmp", "candidate-output"),
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const input = writerInput({ preparedOutput, serviceWorkerBytes });
  input.afterReceiptPublishForTest = async () => {
    throw new Error("injected post-link receipt failure");
  };
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(input),
    /injected post-link receipt failure/u
  );
  const entries = (await readdir(preparedOutput.projectRoot)).sort();
  assert.equal(entries.includes("browser-receipt.json"), false);
  assert.equal(entries.some((entry) => entry.startsWith(".candidate-")), false);
  assert.deepEqual(entries, [
    "browser-manifest-audit.json",
    "browser-version.json",
    "case-revision-after.json",
    "case-revision-before.json",
    "controller-script-meta.json",
    "controller-source.js",
    "network-events.json",
    "profile-preflight.json",
    "remote-pwa-manifest-body.webmanifest",
    "remote-service-worker-body.js"
  ]);
});

test("writer fails closed before publication for installability and manifest drift", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const cases = [
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_INSTALLABILITY_INVALID/u,
      mutate(input) {
        input.initialInstallabilityResponse.installabilityErrors.push({ errorId: "not-installable" });
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_APP_MANIFEST_INVALID/u,
      mutate(input) {
        input.finalAppManifestResponse.errors.push({ message: "parse error", critical: 1, line: 1, column: 1 });
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_APP_MANIFEST_INVALID/u,
      mutate(input) {
        input.initialAppManifestResponse.url = "https://other.example.com/manifest.webmanifest";
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_MANIFEST_REBOUND/u,
      mutate(input) {
        input.finalRemoteManifestBytes = Buffer.from("{}\n", "utf8");
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_MANIFEST_BYTES_MISMATCH/u,
      mutate(input) {
        const changed = Buffer.from('{"id":"/","start_url":"/","scope":"/","display":"standalone","changed":true}\n');
        input.initialRemoteManifestBytes = changed;
        input.finalRemoteManifestBytes = changed;
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_MANIFEST_SEMANTICS_MISMATCH/u,
      mutate(input) {
        const changed = `${JSON.stringify({ ...unitManifestDocument, name: "different" }, null, 2)}\n`;
        input.initialAppManifestResponse.data = changed;
        input.finalAppManifestResponse.data = changed;
      }
    },
    {
      pattern: /DEPLOYED_PWA_CANDIDATE_PROCESSED_MANIFEST_MISMATCH/u,
      mutate(input) {
        input.initialAppManifestResponse.manifest.id = `${origin}/other`;
        input.finalAppManifestResponse.manifest.id = `${origin}/other`;
      }
    }
  ];
  for (const { pattern, mutate } of cases) {
    const input = writerInput({ preparedOutput, serviceWorkerBytes });
    mutate(input);
    await assert.rejects(writeDeployedPwaBrowserCandidate(input), pattern);
    assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
  }

  const duplicateManifestBytes = Buffer.from(
    '{"name":"Hakimi test","id":"/","id":"/","start_url":"/","scope":"/","display":"standalone"}\n',
    "utf8"
  );
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(writerInput({
      preparedOutput,
      serviceWorkerBytes,
      pwaManifestBytes: duplicateManifestBytes
    })),
    /DEPLOYED_PWA_CANDIDATE_MANIFEST_JSON_DUPLICATE_KEY/u
  );
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("writer rejects Service Worker rebound and non-exact external ledger counts before writing", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const rebound = writerInput({ preparedOutput, serviceWorkerBytes });
  rebound.finalControllerSourceBytes = Buffer.from("self.clients.claim();\n", "utf8");
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(rebound),
    /DEPLOYED_PWA_CANDIDATE_SERVICE_WORKER_REBOUND/u
  );
  const artifactRebound = writerInput({ preparedOutput, serviceWorkerBytes });
  artifactRebound.finalArtifact.verificationSnapshot.artifactRoot.ino = 999;
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(artifactRebound),
    /DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND/u
  );
  const manifestArtifactRebound = writerInput({ preparedOutput, serviceWorkerBytes });
  manifestArtifactRebound.finalArtifact.pwaManifest.sha256 = sha256("changed manifest artifact");
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(manifestArtifactRebound),
    /DEPLOYED_PWA_CANDIDATE_ARTIFACT_IDENTITY_REBOUND/u
  );
  for (const invalidCount of [1, "0", -0, 0.5, Number.NaN]) {
    const input = writerInput({ preparedOutput, serviceWorkerBytes });
    input.unexpectedExternalRequestCount = invalidCount;
    await assert.rejects(
      writeDeployedPwaBrowserCandidate(input),
      /DEPLOYED_PWA_CANDIDATE_EXTERNAL_REQUEST_COUNT_INVALID/u
    );
  }
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("writer rejects duplicate CDP request ids and non-canonical timestamps before writing", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");

  const edgeOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const duplicateRequest = writerInput({ preparedOutput: edgeOutput, serviceWorkerBytes });
  duplicateRequest.routeObservations[4].cdpRequestId = duplicateRequest.routeObservations[0].cdpRequestId;
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(duplicateRequest),
    /DEPLOYED_PWA_CANDIDATE_ROUTE_ORDER_INVALID/u
  );
  assert.deepEqual(await readdir(edgeOutput.projectRoot), []);

  const chromeOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "chrome"
  });
  const nonCanonicalTime = writerInput({
    preparedOutput: chromeOutput,
    serviceWorkerBytes,
    projectName: "chrome"
  });
  nonCanonicalTime.routeObservations[1].observedAt = "2026-08-27T00:00:02+00:00";
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(nonCanonicalTime),
    /DEPLOYED_PWA_CANDIDATE_TIME_INVALID/u
  );
  assert.deepEqual(await readdir(chromeOutput.projectRoot), []);
});

test("writer uses the verifier-compatible lowercase-hyphen capture id vocabulary", async (t) => {
  const bindingRoot = await temporaryBindingRoot(t);
  const outputRoot = path.join(bindingRoot, "tmp", "candidate-output");
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot,
    outputRoot,
    artifactRoot: path.join(bindingRoot, "dist", "web"),
    projectName: "msedge"
  });
  const serviceWorkerBytes = Buffer.from("self.skipWaiting();\n", "utf8");
  const input = writerInput({ preparedOutput, serviceWorkerBytes });
  input.beforeCapture.captureId = "candidate_bad_capture_id";
  await assert.rejects(
    writeDeployedPwaBrowserCandidate(input),
    /DEPLOYED_PWA_CANDIDATE_CASE_CAPTURE_INVALID/u
  );
  assert.deepEqual(await readdir(preparedOutput.projectRoot), []);
});

test("external Playwright config is fail-closed and contains no server or build hook", async () => {
  const source = await readFile(
    path.resolve("apps/web/playwright.deployed-pwa-candidate.config.ts"),
    "utf8"
  );
  assert.match(source, /parseDeployedPwaCandidateEnvironment\(process\.env\)/u);
  assert.match(source, /forbidOnly:\s*true/u);
  assert.match(source, /retries:\s*0/u);
  assert.match(source, /workers:\s*1/u);
  assert.match(source, /RELEASE_BROWSER_MATRIX\.map/u);
  assert.match(source, /evidenceClass:\s*"untrusted_deployed_pwa_candidate_v3"/u);
  assert.doesNotMatch(source, /untrusted_deployed_pwa_candidate_v2/u);
  assert.doesNotMatch(source, /\bwebServer\s*:/u);
  assert.doesNotMatch(source, /\bcommand\s*:/u);
});

test("browser capture spec is syntactically valid and keeps UI writes separate from readonly fingerprint capture", async () => {
  const source = await readFile(
    path.resolve("apps/web/e2e/deployed-pwa-candidate.spec.ts"),
    "utf8"
  );
  assert.doesNotThrow(() => parse(source, {
    sourceType: "module",
    plugins: ["typescript"]
  }));
  assert.match(source, /loadVerifiedDeployedPwaCandidateArtifact\(candidate\)/u);
  assert.match(source, /await createDemoCase\(page\)/u);
  assert.match(source, /database\.transaction\(\["cases", "revisions"\], "readonly"\)/u);
  assert.match(source, /Debugger\.getScriptSource/u);
  assert.match(source, /Page\.getInstallabilityErrors/u);
  assert.match(source, /Page\.getAppManifest/u);
  assert.match(source, /fetchRemotePwaManifestBytes/u);
  assert.match(source, /application\/manifest\+json/u);
  assert.match(source, /"accept-encoding": "identity"/u);
  assert.match(source, /contentEncoding && contentEncoding !== "identity"/u);
  assert.match(source, /maxRedirects:\s*0/u);
  assert.match(source, /maxRetries:\s*0/u);
  assert.match(source, /navigator\.serviceWorker\.getRegistrations\(\)/u);
  assert.match(source, /browser\s*\?\s*await browser\.newBrowserCDPSession\(\)\s*:\s*await context\.newCDPSession\(page\)/u);
  assert.match(source, /writeDeployedPwaBrowserCandidate/u);
  assert.match(source, /未受信 v3 浏览器候选回执/u);
  assert.doesNotMatch(source, /未受信 v2 浏览器候选回执/u);
  assert.match(source, /page\.on\("websocket"/u);
  assert.match(source, /\["http:", "https:", "ws:", "wss:"\]/u);
  assert.match(source, /revalidateDeployedPwaCandidateArtifactIdentity\(candidate, artifact\)/u);
  assert.match(source, /unexpectedExternalRequestCount\s*=\s*frozenUnexpectedNetworkLedger\.length/u);
  assert.doesNotMatch(source, /unexpectedExternalRequestCount:\s*0/u);
  assert.doesNotMatch(source, /testInfo\.attach/u);
  assert.ok(
    source.lastIndexOf("await context.close()")
      < source.lastIndexOf("await writeDeployedPwaBrowserCandidate")
  );
  assert.ok((source.match(/captureControllerSourceViaCdp\(/gu) ?? []).length >= 3);
  assert.ok((source.match(/fetchRemoteServiceWorkerBytes\(/gu) ?? []).length >= 3);
  assert.ok((source.match(/Page\.getInstallabilityErrors/gu) ?? []).length >= 2);
  assert.ok((source.match(/Page\.getAppManifest/gu) ?? []).length >= 2);
  assert.ok((source.match(/fetchRemotePwaManifestBytes\(/gu) ?? []).length >= 3);
  for (const routeId of [
    "online-root",
    "offline-settings-data",
    "offline-case-revision",
    "offline-help-cold-start",
    "offline-help-reload"
  ]) {
    assert.match(source, new RegExp(`routeId: "${routeId}"`, "u"));
  }
  assert.doesNotMatch(source, /objectStore\([^)]*\)\.(?:add|put|delete|clear)\s*\(/u);
  assert.doesNotMatch(source, /controllerSourceBytes\s*=\s*remoteServiceWorkerBytes/u);
  assert.doesNotMatch(source, /AppManifestResponse\.data\s*=\s*.*RemoteManifestBytes/u);
});
