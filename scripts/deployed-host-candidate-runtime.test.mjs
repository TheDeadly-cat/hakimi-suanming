import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { link, mkdtemp, mkdir, readFile, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createMockedDeployedHostExpectation,
  createUntrustedDeployedHostCandidatePlan,
  loadDeployedHostExpectation
} from "./deployed-security-headers-lib.mjs";
import {
  DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES,
  DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME,
  DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME,
  captureDeployedHostCandidateObservations,
  evaluateDeployedHostCandidateObservations,
  parseDeployedHostCandidateEnvironment,
  prepareDeployedHostCandidateOutput,
  resolvePublicCandidateDns,
  testOnlyWriteDeployedHostCandidateReceiptWithTerminalCommitFault,
  writeDeployedHostCandidateReceipt
} from "./deployed-host-candidate-runtime.mjs";
import {
  loadVerifiedDeployedHostCandidateOutput,
  parseDeployedHostCandidateLoaderInput,
  parseDeployedHostCandidateLoaderJsonBytes
} from "./deployed-host-candidate-loader.mjs";
import {
  loadVerifiedDeployedPwaCandidateArtifact
} from "./deployed-pwa-candidate-runtime.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://staging.hakimi-bazi.cn";
const platform = "fixture-provider-neutral-host";
const releaseEvidenceId = `hre1-${"a".repeat(32)}`;
const descriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});
const storageManifest = Object.freeze({
  manifestVersion: 1,
  database: descriptor,
  requiredStorageTables: Object.freeze([
    "cases", "revisions", "candidateSets", "researchNotes", "events", "savedViews",
    "knowledgeDocuments", "sourceRights", "citations", "attachments", "researcherProfiles",
    "appSettings", "ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts",
    "birthFingerprints"
  ]),
  requiredStorageIndexes: Object.freeze([])
});
const serializedStorageManifest = JSON.stringify(storageManifest);
const releaseIdentity = Object.freeze({
  descriptor,
  manifestVersion: 1,
  manifestDigest: createHash("sha256").update(serializedStorageManifest).digest("hex"),
  buildVersion: "123456789abc",
  evidenceId: releaseEvidenceId
});

function normalizedRelative(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function fixtureFiles() {
  const metadata = [
    `<meta name="hakimi-release-database" content="${escapeAttribute(JSON.stringify(descriptor))}">`,
    `<meta name="hakimi-release-storage-manifest" content="${escapeAttribute(serializedStorageManifest)}">`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${releaseIdentity.manifestDigest}">`,
    `<meta name="hakimi-build-version" content="${releaseIdentity.buildVersion}">`,
    `<meta name="hakimi-release-evidence-id" content="${releaseEvidenceId}">`
  ].join("");
  const descriptorLiteral = JSON.stringify(JSON.stringify(descriptor));
  return {
    "_headers": "fixture deployment control",
    "release-evidence.json.sha256": "fixture private sidecar",
    "index.html": `<!doctype html><html><head>${metadata}<link rel="icon" href="/brand.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/app.css"></head><body><img src="/brand.svg" alt=""><script type="module" crossorigin src="/assets/app.js"></script></body></html>`,
    "manifest.webmanifest": JSON.stringify({
      name: "Fixture",
      short_name: "Fixture",
      description: "Host candidate fixture",
      id: "/",
      lang: "zh-CN",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      categories: ["productivity"],
      prefer_related_applications: false,
      icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" }],
      shortcuts: []
    }),
    "sw.js": [
      `const CACHE_VERSION = "${releaseIdentity.buildVersion}";`,
      `const RELEASE_DATABASE = JSON.parse(${descriptorLiteral});`,
      `const LEGACY_BRIDGE_DATABASE = Object.freeze(JSON.parse(${descriptorLiteral}));`,
      "self.addEventListener('fetch', () => {});"
    ].join("\n"),
    "brand.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
    "icon.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    "assets/app.js": "export const release = 'legacy-v13';",
    "assets/app.css": "body{color:#111}"
  };
}

async function checkedPolicy() {
  return JSON.parse(await readFile(path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json"), "utf8"));
}

async function fixturePlan() {
  const policy = await checkedPolicy();
  const mockedExpectation = createMockedDeployedHostExpectation({
    files: fixtureFiles(),
    evidenceBytes: Buffer.from('{"fixture":true}'),
    releaseIdentity
  });
  const canonicalPolicy = canonicalJson(policy);
  const expectation = Object.freeze({
    ...mockedExpectation,
    policyBinding: Object.freeze({
      path: "docs/security/hosting-security-policy.json",
      policyId: policy.policyId,
      sha256: sha256(Buffer.from(JSON.stringify(policy), "utf8")),
      canonicalSha256: sha256(canonicalPolicy),
      canonicalPolicy
    })
  });
  return {
    policy,
    expectation,
    plan: createUntrustedDeployedHostCandidatePlan({
      baseUrl: origin,
      candidatePlatform: platform,
      policy,
      expectation
    })
  };
}

function fixtureIdentityLock(expectation) {
  const unsigned = {
    schemaVersion: 1,
    recordType: "release_artifact_identity_lock",
    channel: "default-v13",
    evidenceId: expectation.evidenceId,
    createdAt: "2026-08-26T00:00:00.000Z",
    artifactRoot: "artifact",
    descriptor: structuredClone(expectation.descriptor),
    manifestDigest: expectation.releaseIdentity.manifestDigest,
    buildVersion: expectation.releaseIdentity.buildVersion,
    fileCount: expectation.artifacts.length,
    artifactSetDigest: expectation.artifactSetDigest,
    files: structuredClone(expectation.artifacts)
  };
  return { ...unsigned, lockDigest: sha256(canonicalJson(unsigned)) };
}

function bindFixtureIdentityLock(expectation, artifactLock) {
  const lock = fixtureIdentityLock(expectation);
  return Object.freeze({
    ...expectation,
    artifactIdentityLockBinding: Object.freeze({
      path: "artifact-lock.json",
      realPath: artifactLock,
      sha256: "c".repeat(64),
      lockDigest: lock.lockDigest,
      artifactSetDigest: expectation.artifactSetDigest
    })
  });
}

function writerCandidate({ root, outputRoot, artifactRoot, artifactLock, runId }) {
  return {
    origin,
    platform,
    bindingRoot: root,
    outputRoot,
    artifactRoot,
    artifactLock,
    releaseEvidenceId,
    runId
  };
}

function fixtureDns() {
  return Object.freeze({
    schemaVersion: 1,
    recordType: "deployed_host_candidate_dns_observation_v1",
    hostname: "staging.hakimi-bazi.cn",
    observedAt: "2026-08-27T00:00:00.000Z",
    allResolvedAddressesPublic: true,
    records: Object.freeze([{ address: "93.184.216.34", family: 4 }]),
    pinnedAddress: Object.freeze({ address: "93.184.216.34", family: 4 }),
    connectionPolicy: "all_records_validated_single_address_pinned_per_request"
  });
}

function tlsSocket(url) {
  const tls = new URL(url).protocol === "https:";
  return {
    remoteAddress: "93.184.216.34",
    remoteFamily: "IPv4",
    pinnedAddress: { address: "93.184.216.34", family: 4 },
    tls,
    tlsAuthorized: tls ? true : null,
    tlsProtocol: tls ? "TLSv1.3" : null,
    alpnProtocol: tls ? "http/1.1" : null,
    peerCertificateFingerprint256: tls ? Array.from({ length: 32 }, () => "AA").join(":") : null
  };
}

function headerPairs(entries) {
  return entries.map(([name, value]) => ({ name, value }));
}

function observationFor(plan, probe, sequence) {
  const requestUrl = probe.probeClass === "redirect"
    ? probe.from
    : probe.probeClass === "non-public"
      ? probe.url
      : new URL(probe.path, `${origin}/`).href;
  const start = new Date(Date.parse("2026-08-27T00:01:00.000Z") + sequence * 2_000).toISOString();
  const completed = new Date(Date.parse(start) + 1_000).toISOString();
  let status;
  let bodySize;
  let bodySha256;
  let headers;
  if (probe.probeClass === "content") {
    status = 200;
    bodySize = probe.size;
    bodySha256 = probe.sha256;
    headers = headerPairs([
      ...Object.entries(plan.securityHeaders),
      ["Cache-Control", probe.cacheControl],
      ["Content-Type", probe.contentTypes[0]],
      ["Content-Length", String(probe.size)]
    ]);
  } else if (probe.probeClass === "redirect") {
    status = 308;
    bodySize = 0;
    bodySha256 = sha256(Buffer.alloc(0));
    headers = headerPairs([["Location", probe.to], ["Content-Length", "0"]]);
  } else {
    status = 404;
    bodySize = 0;
    bodySha256 = sha256(Buffer.alloc(0));
    headers = headerPairs([["Content-Length", "0"]]);
  }
  return {
    schemaVersion: 1,
    recordType: "deployed_host_http_response_observation_v1",
    probeId: probe.id,
    probeKind: probe.probeClass,
    sequence,
    request: {
      method: "GET",
      url: requestUrl,
      headers: [
        { name: "Accept-Encoding", value: "identity" },
        { name: "User-Agent", value: "hakimi-deployed-host-candidate/1" }
      ],
      redirectMode: "manual_no_follow",
      startedAt: start
    },
    response: {
      status,
      statusMessage: status === 200 ? "OK" : status === 308 ? "Permanent Redirect" : "Not Found",
      httpVersion: "1.1",
      messageComplete: true,
      rawHeaders: headers,
      rawTrailers: [],
      body: { size: bodySize, sha256: bodySha256 },
      socket: tlsSocket(requestUrl),
      completedAt: completed
    }
  };
}

function allFixtureObservations(plan) {
  return [...plan.contentProbes, ...plan.redirectProbes, ...plan.nonPublicProbes]
    .map((probe, sequence) => observationFor(plan, probe, sequence));
}

function artifactSnapshot(phase, capturedAt, expectation, verifiedArtifactInput = null) {
  const lockBinding = expectation.artifactIdentityLockBinding;
  const lock = fixtureIdentityLock(expectation);
  const bindingRoot = path.dirname(lockBinding.realPath);
  const artifactRoot = path.join(bindingRoot, lock.artifactRoot);
  const verifiedArtifact = verifiedArtifactInput ?? {
    releaseEvidenceId,
    descriptor: structuredClone(descriptor),
    buildVersion: releaseIdentity.buildVersion,
    artifactSetDigest: expectation.artifactSetDigest,
    pwaManifest: expectation.artifacts.find((entry) => entry.path === "manifest.webmanifest"),
    serviceWorker: expectation.artifacts.find((entry) => entry.path === "sw.js"),
    lockDigest: lockBinding.lockDigest,
    verificationSnapshot: {
      bindingRoot: { realPath: bindingRoot, dev: 1, ino: 2, birthtimeMs: 3 },
      artifactRoot: { realPath: artifactRoot, dev: 1, ino: 4, birthtimeMs: 5 },
      lockFile: { realPath: lockBinding.realPath, dev: 1, ino: 6, birthtimeMs: 7, size: 8, nlink: 1, sha256: lockBinding.sha256 },
      verifierLockFileSha256: lockBinding.sha256,
      lock
    }
  };
  const deployedHostExpectation = {
    expectationKind: expectation.expectationKind,
    evidenceId: expectation.evidenceId,
    artifactSetDigest: expectation.artifactSetDigest,
    descriptor: structuredClone(expectation.descriptor),
    releaseIdentity: structuredClone(expectation.releaseIdentity),
    policyBinding: structuredClone(expectation.policyBinding),
    artifactIdentityLockBinding: structuredClone(expectation.artifactIdentityLockBinding),
    releaseEvidence: structuredClone(expectation.releaseEvidence),
    artifacts: structuredClone(expectation.artifacts),
    lockedBytes: {
      indexHtmlSha256: sha256(expectation.indexBytes),
      manifestSha256: sha256(expectation.manifestBytes),
      serviceWorkerSha256: sha256(expectation.serviceWorkerBytes)
    }
  };
  const core = { verifiedArtifact, deployedHostExpectation };
  return {
    schemaVersion: 1,
    recordType: "deployed_host_candidate_artifact_snapshot_v1",
    phase,
    capturedAt,
    snapshotDigest: sha256(canonicalJson(core)),
    ...core
  };
}

async function createFormalHostWriterFixture(t, { runId = "candidate-run-0001" } = {}) {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "host-candidate-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, "dist", "web");
  const outputRoot = path.join(root, "candidate-output");
  const artifactLock = path.join(root, "private-lock", "release-artifact-identity.json");
  const fixturePolicyPath = path.join(root, "docs", "security", "hosting-security-policy.json");
  const fixtureSchemaPath = path.join(root, "docs", "release", "release-evidence.schema.json");
  const fixtureHostReceiptSchemaPath = path.join(root, "docs", "release", "deployed-host-http-receipt-candidate-v1.schema.json");
  const [policyBytes, schemaBytes, hostReceiptSchemaBytes] = await Promise.all([
    readFile(path.join(workspaceRoot, "docs", "security", "hosting-security-policy.json")),
    readFile(path.join(workspaceRoot, "docs", "release", "release-evidence.schema.json")),
    readFile(path.join(workspaceRoot, "docs", "release", "deployed-host-http-receipt-candidate-v1.schema.json"))
  ]);
  await Promise.all([
    mkdir(artifactRoot, { recursive: true }),
    mkdir(path.dirname(artifactLock), { recursive: true }),
    mkdir(path.dirname(fixturePolicyPath), { recursive: true }),
    mkdir(path.dirname(fixtureSchemaPath), { recursive: true }),
    mkdir(path.dirname(fixtureHostReceiptSchemaPath), { recursive: true })
  ]);
  await Promise.all([
    writeFile(fixturePolicyPath, policyBytes),
    writeFile(fixtureSchemaPath, schemaBytes),
    writeFile(fixtureHostReceiptSchemaPath, hostReceiptSchemaBytes)
  ]);
  const artifactFiles = fixtureFiles();
  delete artifactFiles["release-evidence.json.sha256"];
  for (const [relative, value] of Object.entries(artifactFiles)) {
    const destination = path.join(artifactRoot, relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, value);
  }
  const identityLock = await writeReleaseArtifactIdentityLock({
    cwd: root,
    dist: artifactRoot,
    lockPath: artifactLock,
    channel: "default-v13",
    evidenceId: releaseEvidenceId,
    createdAt: "2026-08-27T00:10:00.000Z"
  });
  const artifactEntries = await collectArtifactEntries(artifactRoot);
  const artifactSetDigest = sha256(canonicalJson(artifactEntries));
  const policyPath = fixturePolicyPath;
  const policy = JSON.parse(policyBytes.toString("utf8"));
  const hashes = Array.from({ length: 8 }, (_, index) => (index + 1).toString(16).padStart(64, "0"));
  const evidence = {
    schemaVersion: 1,
    evidenceType: "engineering_release_evidence",
    evidenceId: releaseEvidenceId,
    generatedAt: "2026-08-27T00:12:00.000Z",
    source: {
      repository: null,
      commit: "b".repeat(40),
      branch: "fixture",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: hashes[0],
      packageLockSha256: hashes[1]
    },
    release: {
      channel: "default-v13",
      candidateLabel: "host-candidate-fixture",
      descriptor: structuredClone(descriptor),
      manifestVersion: 1,
      manifestDigest: releaseIdentity.manifestDigest,
      buildVersion: releaseIdentity.buildVersion,
      builtEvidenceId: releaseEvidenceId,
      evidenceIdBound: true,
      requiredReceiptIds: ["unit"]
    },
    toolchain: {
      node: process.version,
      npm: "11.13.0",
      platform: process.platform,
      arch: process.arch,
      osRelease: "fixture",
      browsers: { edge: "fixture", chrome: "fixture" }
    },
    policyFiles: [
      { path: "docs/release/web-v1-release-decisions.json", sha256: hashes[2] },
      { path: "docs/release/release-generation-history.json", sha256: hashes[3] },
      { path: "docs/security/hosting-security-policy.json", sha256: sha256(policyBytes) },
      { path: "docs/release/release-evidence.schema.json", sha256: hashes[4] }
    ],
    testReceipts: [{
      id: "unit",
      evidenceId: releaseEvidenceId,
      status: "passed",
      exitCode: 0,
      command: ["npm", "test"],
      startedAt: "2026-08-27T00:00:00.000Z",
      completedAt: "2026-08-27T00:01:00.000Z",
      durationMs: 60000,
      browserResultSummary: null,
      path: "tmp/release-evidence-receipts/unit.json",
      sha256: hashes[5]
    }],
    artifacts: {
      root: normalizedRelative(root, artifactRoot),
      count: artifactEntries.length,
      artifactSetDigest,
      identityLock: {
        path: normalizedRelative(root, artifactLock),
        sha256: identityLock.lockFileSha256,
        lockDigest: identityLock.lock.lockDigest,
        artifactSetDigest,
        verified: true
      },
      mutationBoundary: {
        schemaVersion: 1,
        boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
        coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
        endpointSnapshotsMatched: true,
        verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
        mutationEpochCapability: "absent_schema13",
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      },
      components: releaseArtifactComponents(artifactEntries),
      files: artifactEntries
    },
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true,
      releaseHistoryOwnerConfirmed: false,
      hostingSecurityVerified: false,
      publicDeploymentAuthorized: false,
      licenseOwnerSelectionRecorded: false,
      expertClaimsAuthorized: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      codeSignature: false,
      expertSignature: false,
      contentRightsGrant: false,
      publicReleaseAuthorized: false
    }
  };
  const evidencePath = path.join(artifactRoot, "release-evidence.json");
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(evidencePath, evidenceBytes);
  await writeFile(`${evidencePath}.sha256`, `${sha256(evidenceBytes)}  release-evidence.json\n`, "utf8");
  const candidate = writerCandidate({
    root,
    outputRoot,
    artifactRoot,
    artifactLock,
    runId
  });
  const verifiedArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const expectation = await loadDeployedHostExpectation({
    cwd: root,
    artifactRoot,
    evidencePath,
    policy,
    policyPath: "docs/security/hosting-security-policy.json"
  });
  const prepared = await prepareDeployedHostCandidateOutput({
    bindingRoot: root,
    outputRoot,
    artifactRoot
  });
  const plan = createUntrustedDeployedHostCandidatePlan({
    baseUrl: origin,
    candidatePlatform: platform,
    policy,
    expectation
  });
  const dns = fixtureDns();
  const observations = allFixtureObservations(plan);
  const initial = artifactSnapshot(
    "initial",
    "2026-08-27T00:00:00.000Z",
    expectation,
    verifiedArtifact
  );
  const final = artifactSnapshot(
    "final",
    "2026-08-27T00:05:00.000Z",
    expectation,
    verifiedArtifact
  );
  return {
    root,
    cwd: root,
    artifactRoot,
    outputRoot,
    artifactLock,
    policyPath,
    evidencePath,
    policy,
    expectation,
    prepared,
    candidate,
    plan,
    dns,
    observations,
    initial,
    final,
    httpObservations: httpObservationSet({ expectation, plan, dns, observations })
  };
}

function hostLoaderInput(fixture) {
  return {
    bindingRoot: fixture.root,
    outputRoot: fixture.outputRoot,
    receiptPath: path.join(fixture.outputRoot, "host-receipt.json"),
    artifactRoot: fixture.artifactRoot,
    artifactLock: fixture.artifactLock,
    releaseEvidenceId
  };
}

async function writeFixtureHostReceipt(fixture) {
  return writeDeployedHostCandidateReceipt(hostWriterInput(fixture));
}

function hostWriterInput(fixture) {
  return {
    cwd: fixture.cwd,
    preparedOutput: fixture.prepared,
    candidate: fixture.candidate,
    policy: fixture.policy,
    expectation: fixture.expectation,
    initialArtifact: fixture.initial,
    httpObservations: fixture.httpObservations,
    finalArtifact: fixture.final,
    observationSource: "synthetic_injected_test_fixture"
  };
}

async function rewriteAttachmentAndReceipt(fixture, role, mutate, mutateReceipt = () => undefined) {
  const receiptPath = path.join(fixture.outputRoot, "host-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const attachment = receipt.attachments.find((entry) => entry.role === role);
  const attachmentPath = path.join(fixture.root, ...attachment.path.split("/"));
  const document = JSON.parse(await readFile(attachmentPath, "utf8"));
  mutate(document);
  const bytes = Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
  await writeFile(attachmentPath, bytes);
  attachment.size = bytes.byteLength;
  attachment.sha256 = sha256(bytes);
  mutateReceipt(receipt, document);
  receipt.rawAttachmentSetDigest = sha256(canonicalJson(receipt.attachments));
  receipt.receiptDigest = "0".repeat(64);
  const unsigned = structuredClone(receipt);
  delete unsigned.receiptDigest;
  receipt.receiptDigest = sha256(canonicalJson(unsigned));
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  await writeFile(receiptPath, receiptBytes);
  await writeFile(
    path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME),
    `${sha256(receiptBytes)}\n`,
    "utf8"
  );
}

function httpObservationSet({ expectation, plan, dns, observations, observationSource = "synthetic_injected_test_fixture" }) {
  return {
    schemaVersion: 1,
    recordType: "deployed_host_http_observation_set_v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    observationSource,
    candidateScope: { platform, origin },
    checkedPolicy: {
      policyId: "hakimi-web-public-hosting-baseline-v2",
      deploymentPlatform: "unselected",
      canonicalOrigin: null,
      byteSha256: expectation.policyBinding.sha256,
      canonicalSha256: expectation.policyBinding.canonicalSha256
    },
    dns,
    plan,
    planDigest: sha256(canonicalJson(plan)),
    observations,
    evaluation: evaluateDeployedHostCandidateObservations({ plan, dns, observations })
  };
}

test("candidate plan reuses the closed policy matrix without selecting the checked policy", async () => {
  const { policy, plan } = await fixturePlan();
  assert.equal(policy.deploymentPlatform, "unselected");
  assert.equal(policy.canonicalOrigin, null);
  assert.deepEqual(policy.redirectRules, []);
  assert.deepEqual(plan.candidateScope, { platform, origin });
  assert.equal(plan.checkedPolicy.deploymentPlatform, "unselected");
  assert.equal(plan.checkedPolicy.canonicalOrigin, null);
  assert.deepEqual(plan.redirectProbes.map((probe) => probe.allowedStatuses), Array(4).fill([301, 308]));
  assert.ok(plan.redirectProbes.every((probe) => !Object.hasOwn(probe, "status")));
  assert.ok(plan.contentProbes.every((probe) => probe.probeClass === "content"));
  assert.deepEqual(plan.redirectProbes.map((probe) => [probe.probeClass, probe.path, probe.from, probe.to]), [
    ["redirect", "/", "http://staging.hakimi-bazi.cn/", `${origin}/`],
    ["redirect", "/sw.js", "http://staging.hakimi-bazi.cn/sw.js", `${origin}/sw.js`],
    ["redirect", "/release-evidence.json", "http://staging.hakimi-bazi.cn/release-evidence.json", `${origin}/release-evidence.json`],
    ["redirect", "/settings/data", "http://staging.hakimi-bazi.cn/settings/data", `${origin}/settings/data`]
  ]);
  assert.deepEqual(plan.nonPublicProbes.map((probe) => probe.path), ["/_headers", "/release-evidence.json.sha256"]);
  assert.ok(plan.nonPublicProbes.every((probe) => probe.probeClass === "non-public"));
  assert.ok(plan.contentProbes.length > policy.documentRoutes.length);
  assert.equal(plan.claims.realHostVerified, false);
});

test("environment parser requires explicit candidate identity and bidirectional lexical isolation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-host-candidate-env-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const environment = {
    HAKIMI_DEPLOYED_HOST_CANDIDATE_ORIGIN: origin,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_PLATFORM: platform,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_BINDING_ROOT: root,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_OUTPUT_ROOT: path.join(root, "receipts"),
    HAKIMI_DEPLOYED_HOST_CANDIDATE_ARTIFACT_ROOT: path.join(root, "artifact"),
    HAKIMI_DEPLOYED_HOST_CANDIDATE_ARTIFACT_LOCK: path.join(root, "artifact-lock.json"),
    HAKIMI_DEPLOYED_HOST_CANDIDATE_RELEASE_EVIDENCE_ID: releaseEvidenceId,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_RUN_ID: "candidate-run-0001"
  };
  assert.equal(parseDeployedHostCandidateEnvironment(environment).platform, platform);
  assert.throws(() => parseDeployedHostCandidateEnvironment({
    ...environment,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_PLATFORM: "unselected"
  }), /PLATFORM_INVALID/u);
  assert.throws(() => parseDeployedHostCandidateEnvironment({
    ...environment,
    HAKIMI_DEPLOYED_HOST_CANDIDATE_OUTPUT_ROOT: path.join(root, "artifact", "receipts")
  }), /ROOTS_OVERLAP/u);
});

test("public DNS preflight is injectable offline and rejects a mixed private set", async () => {
  const dns = await resolvePublicCandidateDns({
    origin,
    lookupImpl: async () => [
      { address: "2001:4860:4860::8888", family: 6 },
      { address: "93.184.216.34", family: 4 }
    ]
  });
  assert.equal(dns.allResolvedAddressesPublic, true);
  assert.deepEqual(dns.pinnedAddress, { address: "93.184.216.34", family: 4 });
  await assert.rejects(resolvePublicCandidateDns({
    origin,
    lookupImpl: async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "127.0.0.1", family: 4 }
    ]
  }), /DNS_REJECTED/u);
  for (const address of [
    "64:ff9b::5db8:d822",
    "2001:0:4136:e378:8000:63bf:3fff:fdd2",
    "::c000:201",
    "::ffff:93.184.216.34",
    "0:0:0:0:0:ffff:5db8:d822",
    "fec0::1"
  ]) {
    await assert.rejects(resolvePublicCandidateDns({
      origin,
      lookupImpl: async () => [{ address, family: 6 }]
    }), /DNS_REJECTED/u);
  }
});

test("synthetic transport captures the exact raw matrix and duplicate security headers fail closed", async () => {
  const { plan } = await fixturePlan();
  const dns = fixtureDns();
  const expected = allFixtureObservations(plan);
  const captured = await captureDeployedHostCandidateObservations({
    plan,
    dns,
    observationSource: "synthetic_injected_test_fixture",
    requestImpl: async ({ sequence, pinnedAddress }) => {
      assert.deepEqual(pinnedAddress, dns.pinnedAddress);
      return structuredClone(expected[sequence]);
    }
  });
  assert.equal(captured.evaluation.gates.candidateContractObserved, true);
  assert.equal(captured.evaluation.claims.realHostVerified, false);
  const duplicated = structuredClone(expected);
  duplicated[0].response.rawHeaders.push({
    name: "Referrer-Policy",
    value: plan.securityHeaders["Referrer-Policy"]
  });
  const rejected = evaluateDeployedHostCandidateObservations({ plan, dns, observations: duplicated });
  assert.equal(rejected.gates.candidateContractObserved, false);
  assert.ok(rejected.results[0].errorCodes.includes("SECURITY_HEADERS_MISMATCH"));

  const transferLengthAmbiguity = structuredClone(expected);
  transferLengthAmbiguity[0].response.rawHeaders.push({ name: "Transfer-Encoding", value: "chunked" });
  const transferRejected = evaluateDeployedHostCandidateObservations({ plan, dns, observations: transferLengthAmbiguity });
  assert.equal(transferRejected.gates.candidateContractObserved, false);
  assert.ok(transferRejected.results[0].errorCodes.includes("TRANSFER_ENCODING_CONTENT_LENGTH_AMBIGUITY"));

  const encoded = structuredClone(expected);
  encoded[0].response.rawHeaders.push({ name: "Content-Encoding", value: "gzip" });
  const encodingRejected = evaluateDeployedHostCandidateObservations({ plan, dns, observations: encoded });
  assert.equal(encodingRejected.gates.candidateContractObserved, false);
  assert.ok(encodingRejected.results[0].errorCodes.includes("CONTENT_ENCODING_MISMATCH"));

  const duplicateLocation = structuredClone(expected);
  duplicateLocation[plan.contentProbes.length].response.rawHeaders.push({ name: "Location", value: `${origin}/other` });
  const locationRejected = evaluateDeployedHostCandidateObservations({ plan, dns, observations: duplicateLocation });
  assert.equal(locationRejected.gates.candidateContractObserved, false);
  assert.ok(locationRejected.results[plan.contentProbes.length].errorCodes.includes("REDIRECT_LOCATION_MISMATCH"));

  const unknownProbeClassPlan = structuredClone(plan);
  unknownProbeClassPlan.nonPublicProbes[0].probeClass = "mystery";
  assert.throws(
    () => evaluateDeployedHostCandidateObservations({ plan: unknownProbeClassPlan, dns, observations: expected }),
    /PROBE_CLASS_INVALID/u
  );
});

test("output preparation uses physical isolation and writer terminally commits the exact package", async (t) => {
  const fixture = await createFormalHostWriterFixture(t);
  const result = await writeDeployedHostCandidateReceipt({
    cwd: fixture.cwd,
    preparedOutput: fixture.prepared,
    candidate: fixture.candidate,
    policy: fixture.policy,
    expectation: fixture.expectation,
    initialArtifact: fixture.initial,
    httpObservations: fixture.httpObservations,
    finalArtifact: fixture.final,
    observationSource: "synthetic_injected_test_fixture"
  });
  assert.deepEqual((await readdir(fixture.outputRoot)).sort(), [
    "artifact-final.json",
    "artifact-initial.json",
    "host-receipt.json",
    DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME,
    "http-observations.json"
  ].sort());
  const receiptBytes = await readFile(result.receiptPath);
  const terminalCommitBytes = await readFile(path.join(
    fixture.outputRoot,
    DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME
  ));
  assert.equal(terminalCommitBytes.byteLength, 65);
  assert.equal(terminalCommitBytes.toString("utf8"), `${sha256(receiptBytes)}\n`);
  assert.deepEqual(result.terminalGateBinding, {
    path: path.relative(
      fixture.cwd,
      path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME)
    ).replaceAll("\\", "/"),
    size: 65,
    sha256: sha256(terminalCommitBytes),
    commitsReceiptSha256: sha256(receiptBytes)
  });
  assert.deepEqual(result.document.attachments.map((entry) => entry.role), DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES);
  assert.equal(result.document.status, "not_admitted");
  assert.equal(result.document.trustClass, "untrusted_candidate");
  assert.equal(result.document.verificationKind, "synthetic-offline-candidate-contract");
  assert.equal(result.document.networkCompleted, false);
  assert.equal(result.document.candidateContractObserved, false);
  assert.equal(result.document.syntheticContractMatched, true);
  assert.equal(result.document.claims.realHostVerified, false);
  assert.equal(result.document.authorizationBoundary.publicDeploymentAuthorized, false);
  assert.equal(result.document.authorizationBoundary.publicReleaseAuthorized, false);
  assert.equal(Object.isFrozen(result.document), true);
  assert.equal(Object.isFrozen(result.document.claims), true);
  assert.equal(result.document.receiptDigest, (() => {
    const unsigned = structuredClone(result.document);
    delete unsigned.receiptDigest;
    return sha256(canonicalJson(unsigned));
  })());
  const loaded = await loadVerifiedDeployedHostCandidateOutput({
    ...hostLoaderInput(fixture),
    cwd: fixture.cwd
  });
  assert.equal(loaded.candidateOutputIntegrityVerified, true);
  assert.equal(loaded.trustClass, "untrusted_candidate");
  assert.equal(loaded.admissionStatus, "not_admitted");
  assert.equal(loaded.gates.schemaValidated, true);
  assert.equal(loaded.gates.terminalCommitMarkerVerified, true);
  assert.deepEqual(loaded.terminalGateBinding, result.terminalGateBinding);
  assert.equal(loaded.gates.httpPlanAndEvaluationRecomputed, true);
  assert.equal(loaded.gates.realNetworkTransportProvenanceVerified, false);
  assert.equal(loaded.mutationBoundary.mutationEpochCapability, "absent_schema13");
  assert.equal(loaded.mutationBoundary.intervalMutationExclusionClaimed, false);
  assert.equal(loaded.claims.realHostVerified, false);
  assert.equal(loaded.claims.publicReleaseAuthorized, false);
  assert.equal(loaded.currentArtifactProjection.releaseIdentity.manifestVersion, 1);
  assert.equal(
    loaded.currentArtifactProjection.releaseIdentity.manifestDigest,
    fixture.expectation.releaseIdentity.manifestDigest
  );
  assert.equal(
    loaded.currentArtifactProjection.artifactIdentityLockBinding.sha256,
    fixture.expectation.artifactIdentityLockBinding.sha256
  );
  assert.equal(
    loaded.currentArtifactProjection.artifactIdentityLockBinding.lockDigest,
    fixture.expectation.artifactIdentityLockBinding.lockDigest
  );
  assert.deepEqual(
    loaded.currentArtifactProjection.releaseEvidence,
    fixture.expectation.releaseEvidence
  );
  assert.deepEqual(loaded.currentArtifactProjection.lockedBytes, {
    indexHtmlSha256: sha256(fixture.expectation.indexBytes),
    manifestSha256: sha256(fixture.expectation.manifestBytes),
    serviceWorkerSha256: sha256(fixture.expectation.serviceWorkerBytes)
  });
  assert.deepEqual(loaded.currentArtifactProjection.artifacts, fixture.expectation.artifacts);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.releaseIdentity), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.releaseIdentity.descriptor), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.artifactIdentityLockBinding), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.releaseEvidence), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.lockedBytes), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.artifacts), true);
  assert.equal(Object.isFrozen(loaded.currentArtifactProjection.artifacts[0]), true);
  assert.equal(Object.isFrozen(loaded.document), true);
});

test("independent host loader keeps a self-consistent synthetic-to-real relabel closed", async (t) => {
  const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-real-label" });
  await writeFixtureHostReceipt(fixture);
  const receiptPath = path.join(fixture.outputRoot, "host-receipt.json");
  const originalReceipt = JSON.parse(await readFile(receiptPath, "utf8"));
  const httpAttachment = originalReceipt.attachments.find((entry) => entry.role === "http-observations");
  const httpAttachmentPath = path.join(fixture.root, ...httpAttachment.path.split("/"));
  const originalHttpDocument = JSON.parse(await readFile(httpAttachmentPath, "utf8"));
  assert.equal(originalReceipt.observationSource, "synthetic_injected_test_fixture");
  assert.equal(originalReceipt.verificationKind, "synthetic-offline-candidate-contract");
  assert.equal(originalReceipt.networkCompleted, false);
  assert.equal(originalReceipt.candidateContractObserved, false);
  assert.equal(originalReceipt.syntheticContractMatched, true);
  assert.equal(originalHttpDocument.evaluation.observationMatrixCompleted, true);
  assert.equal(originalHttpDocument.evaluation.gates.candidateContractObserved, true);

  await rewriteAttachmentAndReceipt(
    fixture,
    "http-observations",
    (document) => {
      document.observationSource = "node_http_pinned_real_network_v1";
    },
    (receipt, document) => {
      receipt.observationSource = document.observationSource;
      receipt.verificationKind = "real-network-candidate-observation";
      receipt.networkCompleted = document.evaluation.observationMatrixCompleted;
      receipt.candidateContractObserved = document.evaluation.gates.candidateContractObserved;
      receipt.syntheticContractMatched = false;
    }
  );

  const relabeledReceiptBytes = await readFile(receiptPath);
  const relabeledReceipt = JSON.parse(relabeledReceiptBytes.toString("utf8"));
  const relabeledHttpBytes = await readFile(httpAttachmentPath);
  const relabeledHttpDocument = JSON.parse(relabeledHttpBytes.toString("utf8"));
  const relabeledHttpAttachment = relabeledReceipt.attachments.find(
    (entry) => entry.role === "http-observations"
  );
  assert.equal(relabeledHttpDocument.observationSource, "node_http_pinned_real_network_v1");
  assert.equal(relabeledReceipt.observationSource, "node_http_pinned_real_network_v1");
  assert.equal(relabeledReceipt.verificationKind, "real-network-candidate-observation");
  assert.equal(relabeledReceipt.networkCompleted, true);
  assert.equal(relabeledReceipt.candidateContractObserved, true);
  assert.equal(relabeledReceipt.syntheticContractMatched, false);
  assert.equal(relabeledHttpAttachment.size, relabeledHttpBytes.byteLength);
  assert.equal(relabeledHttpAttachment.sha256, sha256(relabeledHttpBytes));
  assert.equal(relabeledReceipt.rawAttachmentSetDigest, sha256(canonicalJson(relabeledReceipt.attachments)));
  assert.equal(relabeledReceipt.receiptDigest, (() => {
    const unsigned = structuredClone(relabeledReceipt);
    delete unsigned.receiptDigest;
    return sha256(canonicalJson(unsigned));
  })());

  const loaded = await loadVerifiedDeployedHostCandidateOutput({
    ...hostLoaderInput(fixture),
    cwd: fixture.cwd
  });
  assert.equal(loaded.observationLabel, "node_http_pinned_real_network_v1");
  assert.equal(loaded.recomputedCandidateContractMatched, true);
  assert.equal(loaded.document.verificationKind, "real-network-candidate-observation");
  assert.equal(loaded.document.networkCompleted, true);
  assert.equal(loaded.document.candidateContractObserved, true);
  assert.equal(loaded.document.syntheticContractMatched, false);
  assert.equal(loaded.gates.semanticEvaluatorImplementationIndependent, false);
  assert.equal(loaded.gates.realNetworkTransportProvenanceVerified, false);
  assert.equal(loaded.claims.realHostVerified, false);
  assert.equal(Object.values(loaded.claims).every((value) => value === false), true);
  const {
    authorizationMayNotBeDerivedFromCandidateEvidence,
    ...positiveAuthorizations
  } = loaded.authorizationBoundary;
  assert.equal(authorizationMayNotBeDerivedFromCandidateEvidence, true);
  assert.equal(Object.values(positiveAuthorizations).every((value) => value === false), true);
  assert.equal(loaded.usableForAdmission, false);
});

test("independent host loader input and strict JSON parser fail closed", async (t) => {
  const fixture = await createFormalHostWriterFixture(t);
  const input = hostLoaderInput(fixture);
  assert.deepEqual(parseDeployedHostCandidateLoaderInput(input), input);
  assert.throws(() => parseDeployedHostCandidateLoaderInput({ ...input, extra: true }), /INPUT_INVALID/u);
  assert.throws(
    () => parseDeployedHostCandidateLoaderJsonBytes(Buffer.from('{"same":1,"same":2}\n'), "duplicate fixture"),
    /DUPLICATE_KEY/u
  );
});

test("independent host loader rejects closed-claim promotion and recomputed HTTP-envelope forgery", async (t) => {
  await t.test("receipt claim promotion despite a locally relaxed candidate Schema", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-claim" });
    await writeFixtureHostReceipt(fixture);
    const schemaPath = path.join(
      fixture.root,
      "docs",
      "release",
      "deployed-host-http-receipt-candidate-v1.schema.json"
    );
    const schema = JSON.parse(await readFile(schemaPath, "utf8"));
    schema.$defs.Claims.properties.realHostVerified = { type: "boolean" };
    await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
    const receiptPath = path.join(fixture.outputRoot, "host-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
    receipt.claims.realHostVerified = true;
    receipt.receiptDigest = "0".repeat(64);
    const unsigned = structuredClone(receipt);
    delete unsigned.receiptDigest;
    receipt.receiptDigest = sha256(canonicalJson(unsigned));
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    await writeFile(receiptPath, receiptBytes);
    await writeFile(
      path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME),
      `${sha256(receiptBytes)}\n`,
      "utf8"
    );
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /RECEIPT_CLOSURE_INVALID/u
    );
  });

  await t.test("HTTP evaluation forgery with refreshed attachment and receipt digests", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-http" });
    await writeFixtureHostReceipt(fixture);
    await rewriteAttachmentAndReceipt(fixture, "http-observations", (document) => {
      document.evaluation.gates.candidateContractObserved = false;
    });
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /HTTP_RECOMPUTATION_MISMATCH/u
    );
  });
});

test("independent host loader rejects incomplete, aliased, and source-rebound candidate packages", async (t) => {
  await t.test("extra output name", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-extra" });
    await writeFixtureHostReceipt(fixture);
    await writeFile(path.join(fixture.outputRoot, "unexpected.json"), "{}\n", "utf8");
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /OUTPUT_SET_INVALID/u
    );
  });

  await t.test("missing attachment", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-missing" });
    await writeFixtureHostReceipt(fixture);
    await unlink(path.join(fixture.outputRoot, "artifact-initial.json"));
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /OUTPUT_SET_INVALID/u
    );
  });

  await t.test("hard-linked attachment identity", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-link" });
    await writeFixtureHostReceipt(fixture);
    const initialPath = path.join(fixture.outputRoot, "artifact-initial.json");
    await unlink(initialPath);
    await link(path.join(fixture.outputRoot, "artifact-final.json"), initialPath);
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /FILE_UNSAFE|FILE_IDENTITY_REUSED/u
    );
  });

  await t.test("current artifact rebound", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-artifact" });
    await writeFixtureHostReceipt(fixture);
    await writeFile(path.join(fixture.artifactRoot, "sw.js"), "self.skipWaiting();\n", "utf8");
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /artifact|LOCK|MISMATCH/iu
    );
  });

  await t.test("current checked policy rebound", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-policy" });
    await writeFixtureHostReceipt(fixture);
    await writeFile(fixture.policyPath, "{}\n", "utf8");
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /policy|Policy|POLICY/u
    );
  });
});

test("writer rejects lock divergence, double-snapshot identity forgery, source spoofing, and malformed documents before publishing", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-host-candidate-writer-negative-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, "artifact");
  const outputRoot = path.join(root, "receipts");
  const artifactLock = path.join(root, "artifact-lock.json");
  await mkdir(artifactRoot, { recursive: true });
  const prepared = await prepareDeployedHostCandidateOutput({ bindingRoot: root, outputRoot, artifactRoot });
  const fixture = await fixturePlan();
  const { policy, plan } = fixture;
  const expectation = bindFixtureIdentityLock(fixture.expectation, artifactLock);
  const dns = fixtureDns();
  const observations = allFixtureObservations(plan);
  const initial = artifactSnapshot("initial", "2026-08-27T00:00:00.000Z", expectation);
  const final = artifactSnapshot("final", "2026-08-27T00:05:00.000Z", expectation);
  const candidate = writerCandidate({ root, outputRoot, artifactRoot, artifactLock, runId: "candidate-run-0003" });
  const baseHttp = httpObservationSet({ expectation, plan, dns, observations });

  await assert.rejects(writeDeployedHostCandidateReceipt({
    cwd: workspaceRoot,
    preparedOutput: prepared,
    candidate: { ...candidate, outputRoot: path.join(root, "different-output") },
    policy,
    expectation,
    initialArtifact: initial,
    httpObservations: baseHttp,
    finalArtifact: final,
    observationSource: "synthetic_injected_test_fixture"
  }), /ROOT_REBOUND/u);

  for (const mutatePolicyBinding of [
    (binding) => {
      binding.canonicalPolicy = "{}";
      binding.canonicalSha256 = sha256(binding.canonicalPolicy);
    },
    (binding) => { binding.canonicalSha256 = "d".repeat(64); }
  ]) {
    const forgedExpectation = structuredClone(expectation);
    mutatePolicyBinding(forgedExpectation.policyBinding);
    await assert.rejects(writeDeployedHostCandidateReceipt({
      cwd: workspaceRoot,
      preparedOutput: prepared,
      candidate,
      policy,
      expectation: forgedExpectation,
      initialArtifact: initial,
      httpObservations: baseHttp,
      finalArtifact: final,
      observationSource: "synthetic_injected_test_fixture"
    }), /policy binding/iu);
  }

  for (const mutateLockBinding of [
    (snapshot) => { snapshot.verifiedArtifact.verificationSnapshot.lockFile.realPath = path.join(root, "different-lock.json"); },
    (snapshot) => {
      snapshot.verifiedArtifact.verificationSnapshot.lockFile.sha256 = "d".repeat(64);
      snapshot.verifiedArtifact.verificationSnapshot.verifierLockFileSha256 = "d".repeat(64);
    },
    (snapshot) => {
      snapshot.verifiedArtifact.lockDigest = "d".repeat(64);
      snapshot.verifiedArtifact.verificationSnapshot.lock.lockDigest = "d".repeat(64);
    },
    (snapshot) => {
      snapshot.verifiedArtifact.artifactSetDigest = "d".repeat(64);
      snapshot.verifiedArtifact.verificationSnapshot.lock.artifactSetDigest = "d".repeat(64);
    }
  ]) {
    const lockDivergedInitial = structuredClone(initial);
    const lockDivergedFinal = structuredClone(final);
    for (const snapshot of [lockDivergedInitial, lockDivergedFinal]) {
      mutateLockBinding(snapshot);
      snapshot.snapshotDigest = sha256(canonicalJson({
        verifiedArtifact: snapshot.verifiedArtifact,
        deployedHostExpectation: snapshot.deployedHostExpectation
      }));
    }
    await assert.rejects(writeDeployedHostCandidateReceipt({
      cwd: workspaceRoot,
      preparedOutput: prepared,
      candidate,
      policy,
      expectation,
      initialArtifact: lockDivergedInitial,
      httpObservations: baseHttp,
      finalArtifact: lockDivergedFinal,
      observationSource: "synthetic_injected_test_fixture"
    }), /ARTIFACT_IDENTITY_LOCK_MISMATCH/u);
  }

  for (const mutateArtifactIdentity of [
    (snapshot) => { snapshot.verifiedArtifact.buildVersion = "f".repeat(12); },
    (snapshot) => { snapshot.verifiedArtifact.descriptor.targetSchema = 12; },
    (snapshot) => { snapshot.verifiedArtifact.serviceWorker.path = "assets/sw.js"; },
    (snapshot) => { snapshot.verifiedArtifact.serviceWorker.size += 1; },
    (snapshot) => { snapshot.verifiedArtifact.serviceWorker.sha256 = "d".repeat(64); }
  ]) {
    const forgedInitial = structuredClone(initial);
    const forgedFinal = structuredClone(final);
    for (const snapshot of [forgedInitial, forgedFinal]) {
      mutateArtifactIdentity(snapshot);
      snapshot.snapshotDigest = sha256(canonicalJson({
        verifiedArtifact: snapshot.verifiedArtifact,
        deployedHostExpectation: snapshot.deployedHostExpectation
      }));
    }
    await assert.rejects(writeDeployedHostCandidateReceipt({
      cwd: workspaceRoot,
      preparedOutput: prepared,
      candidate,
      policy,
      expectation,
      initialArtifact: forgedInitial,
      httpObservations: baseHttp,
      finalArtifact: forgedFinal,
      observationSource: "synthetic_injected_test_fixture"
    }), /ARTIFACT_(?:IDENTITY_LOCK|EXPECTATION)_MISMATCH/u);
  }

  for (const mutateNestedLock of [
    (lock) => { lock.evidenceId = `hre1-${"f".repeat(32)}`; },
    (lock) => { lock.descriptor.targetSchema = 12; },
    (lock) => {
      lock.files[0].size += 1;
      lock.artifactSetDigest = sha256(canonicalJson(lock.files));
    }
  ]) {
    const forgedInitial = structuredClone(initial);
    const forgedFinal = structuredClone(final);
    for (const snapshot of [forgedInitial, forgedFinal]) {
      const nestedLock = snapshot.verifiedArtifact.verificationSnapshot.lock;
      mutateNestedLock(nestedLock);
      const unsignedLock = structuredClone(nestedLock);
      delete unsignedLock.lockDigest;
      nestedLock.lockDigest = sha256(canonicalJson(unsignedLock));
      snapshot.verifiedArtifact.lockDigest = nestedLock.lockDigest;
      snapshot.snapshotDigest = sha256(canonicalJson({
        verifiedArtifact: snapshot.verifiedArtifact,
        deployedHostExpectation: snapshot.deployedHostExpectation
      }));
    }
    await assert.rejects(writeDeployedHostCandidateReceipt({
      cwd: workspaceRoot,
      preparedOutput: prepared,
      candidate,
      policy,
      expectation,
      initialArtifact: forgedInitial,
      httpObservations: baseHttp,
      finalArtifact: forgedFinal,
      observationSource: "synthetic_injected_test_fixture"
    }), /ARTIFACT_IDENTITY_LOCK_MISMATCH/u);
  }

  await assert.rejects(writeDeployedHostCandidateReceipt({
    cwd: workspaceRoot,
    preparedOutput: prepared,
    candidate,
    policy,
    expectation,
    initialArtifact: initial,
    httpObservations: { ...baseHttp, unexpected: true },
    finalArtifact: final,
    observationSource: "synthetic_injected_test_fixture"
  }), /HTTP_DOCUMENT_INVALID/u);

  const malformedPlanHttp = structuredClone(baseHttp);
  malformedPlanHttp.plan.contentProbes = null;
  malformedPlanHttp.planDigest = sha256(canonicalJson(malformedPlanHttp.plan));
  await assert.rejects(writeDeployedHostCandidateReceipt({
    cwd: workspaceRoot,
    preparedOutput: prepared,
    candidate,
    policy,
    expectation,
    initialArtifact: initial,
    httpObservations: malformedPlanHttp,
    finalArtifact: final,
    observationSource: "synthetic_injected_test_fixture"
  }), /HTTP_DOCUMENT_INVALID/u);

  const spoofedRealHttp = { ...baseHttp, observationSource: "node_http_pinned_real_network_v1" };
  await assert.rejects(writeDeployedHostCandidateReceipt({
    cwd: workspaceRoot,
    preparedOutput: prepared,
    candidate,
    policy,
    expectation,
    initialArtifact: initial,
    httpObservations: spoofedRealHttp,
    finalArtifact: final,
    observationSource: "node_http_pinned_real_network_v1"
  }), /TRANSPORT_PROVENANCE_INVALID/u);
  assert.deepEqual(await readdir(outputRoot), []);
});

test("artifact rebound fails before any attachment is published", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-host-candidate-rebound-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const artifactRoot = path.join(root, "artifact");
  const outputRoot = path.join(root, "receipts");
  const artifactLock = path.join(root, "artifact-lock.json");
  await mkdir(artifactRoot, { recursive: true });
  const prepared = await prepareDeployedHostCandidateOutput({ bindingRoot: root, outputRoot, artifactRoot });
  const fixture = await fixturePlan();
  const { policy, plan } = fixture;
  const expectation = bindFixtureIdentityLock(fixture.expectation, artifactLock);
  const dns = fixtureDns();
  const observations = allFixtureObservations(plan);
  const evaluation = evaluateDeployedHostCandidateObservations({ plan, dns, observations });
  const initial = artifactSnapshot("initial", "2026-08-27T00:00:00.000Z", expectation);
  const final = artifactSnapshot("final", "2026-08-27T00:05:00.000Z", expectation);
  final.verifiedArtifact.verificationSnapshot.bindingRoot.ino = 999;
  final.snapshotDigest = sha256(canonicalJson({
    verifiedArtifact: final.verifiedArtifact,
    deployedHostExpectation: final.deployedHostExpectation
  }));
  await assert.rejects(writeDeployedHostCandidateReceipt({
    cwd: workspaceRoot,
    preparedOutput: prepared,
    candidate: writerCandidate({ root, outputRoot, artifactRoot, artifactLock, runId: "candidate-run-0002" }),
    policy,
    expectation,
    initialArtifact: initial,
    httpObservations: {
      recordType: "deployed_host_http_observation_set_v1",
      trustClass: "untrusted_candidate",
      admissionStatus: "not_admitted",
      candidateScope: { platform, origin },
      evaluation,
      checkedPolicy: { policyId: "fixture", byteSha256: "d".repeat(64), canonicalSha256: "e".repeat(64) }
    },
    finalArtifact: final,
    observationSource: "synthetic_injected_test_fixture"
  }), /ARTIFACT_REBOUND/u);
  assert.deepEqual(await readdir(outputRoot), []);
});

test("terminal rename failure leaves only a PREPARED loader-rejected root", async (t) => {
  const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-0099" });
  await assert.rejects(testOnlyWriteDeployedHostCandidateReceiptWithTerminalCommitFault({
    ...hostWriterInput(fixture),
    terminalCommitFault: "create_target_directory_collision"
  }));
  const names = (await readdir(fixture.outputRoot)).sort();
  assert.ok(names.includes(DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME));
  assert.ok(names.includes(DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME));
  await assert.rejects(
    loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
    /DEPLOYED_HOST_CANDIDATE_LOADER_OUTPUT_SET_INVALID/u
  );
});

test("public writer rejects the removed arbitrary publication checkpoint", async (t) => {
  const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-0100" });
  await assert.rejects(writeDeployedHostCandidateReceipt({
    ...hostWriterInput(fixture),
    onReceiptPublishedCheckpoint: async () => undefined
  }), /DEPLOYED_HOST_CANDIDATE_WRITER_INPUT_INVALID/u);
  assert.deepEqual(await readdir(fixture.outputRoot), []);
});

test("loader rejects every legacy, pending, malformed, aliased, or extra terminal state", async (t) => {
  await t.test("legacy exact-four without marker", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-0101" });
    await writeFixtureHostReceipt(fixture);
    await unlink(path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME));
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /DEPLOYED_HOST_CANDIDATE_LOADER_OUTPUT_SET_INVALID/u
    );
  });

  await t.test("pending marker", async (t) => {
    const fixture = await createFormalHostWriterFixture(t, { runId: "candidate-run-0102" });
    await writeFixtureHostReceipt(fixture);
    await rename(
      path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME),
      path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_PENDING_COMMIT_MARKER_FILE_NAME)
    );
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /DEPLOYED_HOST_CANDIDATE_LOADER_OUTPUT_SET_INVALID/u
    );
  });

  for (const [label, bytes] of [
    ["wrong digest", `${"0".repeat(64)}\n`],
    ["uppercase digest", `${"A".repeat(64)}\n`],
    ["short marker", `${"0".repeat(63)}\n`],
    ["CRLF marker", `${"0".repeat(64)}\r\n`]
  ]) {
    await t.test(label, async (t) => {
      const fixture = await createFormalHostWriterFixture(t);
      await writeFixtureHostReceipt(fixture);
      await writeFile(
        path.join(fixture.outputRoot, DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME),
        bytes,
        "utf8"
      );
      await assert.rejects(
        loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
        /DEPLOYED_HOST_CANDIDATE_LOADER_TERMINAL_COMMIT_INVALID/u
      );
    });
  }

  await t.test("hard-linked marker", async (t) => {
    const fixture = await createFormalHostWriterFixture(t);
    await writeFixtureHostReceipt(fixture);
    const markerPath = path.join(
      fixture.outputRoot,
      DEPLOYED_HOST_CANDIDATE_TERMINAL_COMMIT_MARKER_FILE_NAME
    );
    await unlink(markerPath);
    await link(path.join(fixture.outputRoot, "host-receipt.json"), markerPath);
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /DEPLOYED_HOST_CANDIDATE_LOADER_FILE_UNSAFE|FILE_IDENTITY_REUSED/u
    );
  });

  await t.test("legacy tombstone extra", async (t) => {
    const fixture = await createFormalHostWriterFixture(t);
    await writeFixtureHostReceipt(fixture);
    await writeFile(path.join(fixture.outputRoot, "output-discard-required.json"), "{}\n", "utf8");
    await assert.rejects(
      loadVerifiedDeployedHostCandidateOutput({ ...hostLoaderInput(fixture), cwd: fixture.cwd }),
      /DEPLOYED_HOST_CANDIDATE_LOADER_OUTPUT_SET_INVALID/u
    );
  });
});

test("collector source remains standalone and is absent from formal release aggregates", async () => {
  const [runtimeSource, loaderSource, schemaSource, packageJson] = await Promise.all([
    readFile(path.join(workspaceRoot, "scripts", "deployed-host-candidate-runtime.mjs"), "utf8"),
    readFile(path.join(workspaceRoot, "scripts", "deployed-host-candidate-loader.mjs"), "utf8"),
    readFile(path.join(workspaceRoot, "docs", "release", "deployed-host-http-receipt-candidate-v1.schema.json"), "utf8"),
    readFile(path.join(workspaceRoot, "package.json"), "utf8")
  ]);
  assert.match(runtimeSource, /host-receipt\.json/u);
  assert.match(
    runtimeSource,
    /writtenReceipt\s*=\s*await atomicWriteExclusive\(\s*preparedOutput,\s*RECEIPT_FILE_NAME,\s*receiptBytes\s*\)/u
  );
  assert.match(runtimeSource, /\.host-receipt-publication-pending/u);
  assert.match(runtimeSource, /host-receipt-publication-commit\.sha256/u);
  assert.match(runtimeSource, /await rename\(pendingCommitPath, terminalCommitPath\);\s*return result;/u);
  assert.doesNotMatch(runtimeSource, /onReceiptPublishedCheckpoint|onDestinationPublished/u);
  assert.doesNotMatch(runtimeSource, /receiptDestinationPublished|publishDiscardTombstone|DISCARD_TOMBSTONE/u);
  assert.doesNotMatch(runtimeSource, /deployed-pwa-evidence-policy\.v2\.json/u);
  assert.doesNotMatch(runtimeSource, /deployed-pwa-evidence-v2\.schema\.json/u);
  assert.match(loaderSource, /offline-independent-deployed-host-candidate-output-v1/u);
  assert.match(loaderSource, /terminalCommitMarkerVerified:\s*true/u);
  assert.match(loaderSource, /commitsReceiptSha256/u);
  assert.match(loaderSource, /realNetworkTransportProvenanceVerified:\s*false/u);
  assert.equal(
    JSON.parse(schemaSource).$id,
    "https://hakimi.invalid/schemas/deployed-host-http-receipt-candidate-v1.json"
  );
  const scripts = JSON.parse(packageJson).scripts;
  assert.equal(scripts["verify:deployed-host-candidate"], "node scripts/deployed-host-candidate-loader.mjs");
  assert.doesNotMatch(scripts["test:release-evidence"], /host-candidate/u);
});
