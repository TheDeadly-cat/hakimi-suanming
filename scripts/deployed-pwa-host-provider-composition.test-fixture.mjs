import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  createUntrustedDeployedHostCandidatePlan,
  loadDeployedHostExpectation
} from "./deployed-security-headers-lib.mjs";
import {
  DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES,
  evaluateDeployedHostCandidateObservations,
  prepareDeployedHostCandidateOutput,
  writeDeployedHostCandidateReceipt
} from "./deployed-host-candidate-runtime.mjs";
import {
  attachDeployedPwaV3DeploymentReceipt,
  cleanupDeployedPwaEvidenceV3TestFixture,
  createDeployedPwaEvidenceV3TestFixture
} from "./deployed-pwa-evidence-v3.test-fixture.mjs";
import { loadVerifiedDeployedPwaCandidateArtifact } from "./deployed-pwa-candidate-runtime.mjs";
import {
  collectProviderDeploymentCandidate,
  createSyntheticProviderDeploymentAdapter
} from "./provider-deployment-candidate-runtime.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

const EXTRA_CHECKED_SOURCES = Object.freeze([
  "docs/release/deployed-pwa-host-provider-composition-candidate-v1.schema.json",
  "docs/release/deployed-host-http-receipt-candidate-v1.schema.json",
  "docs/release/provider-deployment-receipt-candidate-v1.schema.json"
]);
const HOST_INITIAL_AT = "2026-08-26T00:01:40.000Z";
const HOST_DNS_AT = "2026-08-26T00:01:41.000Z";
const HOST_PROBES_AT = "2026-08-26T00:01:42.000Z";
const HOST_FINAL_AT = "2026-08-26T00:02:00.000Z";
const PROVIDER_STARTED_AT = "2026-08-26T00:01:10.000Z";
const PROVIDER_ACCEPTED_AT = "2026-08-26T00:01:20.000Z";
const PROVIDER_COMPLETED_AT = "2026-08-26T00:01:30.000Z";
const PROVIDER_READBACK_AT = "2026-08-26T00:01:35.000Z";
const PROVIDER_DEPLOYMENT_ID = "fixture-deployment-001";
const PROVIDER_IMMUTABLE_ORIGIN = "https://deployment-b.hakimi.test";

function relativePath(workspace, absolute) {
  return path.relative(workspace, absolute).replaceAll("\\", "/");
}

async function writeCheckedSource(workspace, sourceWorkspace, relative) {
  const destination = path.join(workspace, ...relative.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, await readFile(path.join(sourceWorkspace, ...relative.split("/"))));
}

function expectationProjection(expectation) {
  return {
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
}

function artifactSnapshot(phase, capturedAt, verifiedArtifact, expectation) {
  const core = {
    verifiedArtifact: structuredClone(verifiedArtifact),
    deployedHostExpectation: expectationProjection(expectation)
  };
  return {
    schemaVersion: 1,
    recordType: "deployed_host_candidate_artifact_snapshot_v1",
    phase,
    capturedAt,
    snapshotDigest: sha256(canonicalJson(core)),
    ...core
  };
}

function headerPairs(entries) {
  return entries.map(([name, value]) => ({ name, value }));
}

function socketObservation(requestUrl) {
  const tls = new URL(requestUrl).protocol === "https:";
  return {
    remoteAddress: "93.184.216.34",
    remoteFamily: "IPv4",
    pinnedAddress: { address: "93.184.216.34", family: 4 },
    tls,
    tlsAuthorized: tls ? true : null,
    tlsProtocol: tls ? "TLSv1.3" : null,
    alpnProtocol: tls ? "http/1.1" : null,
    peerCertificateFingerprint256: tls
      ? Array.from({ length: 32 }, () => "AA").join(":")
      : null
  };
}

function observationFor({ origin, plan, probe, sequence }) {
  const requestUrl = probe.probeClass === "redirect"
    ? probe.from
    : probe.probeClass === "non-public"
      ? probe.url
      : new URL(probe.path, `${origin}/`).href;
  const startedAt = new Date(Date.parse(HOST_PROBES_AT) + sequence * 300).toISOString();
  const completedAt = new Date(Date.parse(startedAt) + 100).toISOString();
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
      startedAt
    },
    response: {
      status,
      statusMessage: status === 200 ? "OK" : status === 308 ? "Permanent Redirect" : "Not Found",
      httpVersion: "1.1",
      messageComplete: true,
      rawHeaders: headers,
      rawTrailers: [],
      body: { size: bodySize, sha256: bodySha256 },
      socket: socketObservation(requestUrl),
      completedAt
    }
  };
}

function hostObservationSet({ platform, origin, expectation, plan, dns, observations }) {
  return {
    schemaVersion: 1,
    recordType: "deployed_host_http_observation_set_v1",
    trustClass: "untrusted_candidate",
    admissionStatus: "not_admitted",
    observationSource: "synthetic_injected_test_fixture",
    candidateScope: { platform, origin },
    checkedPolicy: {
      policyId: expectation.policyBinding.policyId,
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

async function createHostPackage(fixture) {
  const platform = fixture.evidence.scope.candidateDeploymentPlatform;
  const origin = fixture.evidence.scope.candidateCanonicalOrigin;
  const releaseEvidenceId = fixture.evidence.artifactIdentity.releaseEvidence.evidenceId;
  const outputRoot = path.join(fixture.workspace, "composition", "host-output");
  const prepared = await prepareDeployedHostCandidateOutput({
    bindingRoot: fixture.workspace,
    outputRoot,
    artifactRoot: fixture.artifactRoot
  });
  const policyPath = path.join(fixture.workspace, "docs", "security", "hosting-security-policy.json");
  const policy = JSON.parse(await readFile(policyPath, "utf8"));
  const expectation = await loadDeployedHostExpectation({
    cwd: fixture.workspace,
    artifactRoot: fixture.artifactRoot,
    evidencePath: fixture.releaseEvidencePath,
    policy,
    policyPath: "docs/security/hosting-security-policy.json"
  });
  const candidate = {
    origin,
    platform,
    bindingRoot: fixture.workspace,
    outputRoot,
    artifactRoot: fixture.artifactRoot,
    artifactLock: fixture.artifactLockPath,
    releaseEvidenceId,
    runId: "composition-host-0001"
  };
  const verifiedArtifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const plan = createUntrustedDeployedHostCandidatePlan({
    baseUrl: origin,
    candidatePlatform: platform,
    policy,
    expectation
  });
  const dns = {
    schemaVersion: 1,
    recordType: "deployed_host_candidate_dns_observation_v1",
    hostname: new URL(origin).hostname,
    observedAt: HOST_DNS_AT,
    allResolvedAddressesPublic: true,
    records: [{ address: "93.184.216.34", family: 4 }],
    pinnedAddress: { address: "93.184.216.34", family: 4 },
    connectionPolicy: "all_records_validated_single_address_pinned_per_request"
  };
  const probes = [...plan.contentProbes, ...plan.redirectProbes, ...plan.nonPublicProbes];
  const observations = probes.map((probe, sequence) => observationFor({ origin, plan, probe, sequence }));
  assert.ok(Date.parse(observations.at(-1).response.completedAt) < Date.parse(HOST_FINAL_AT));
  const initialArtifact = artifactSnapshot("initial", HOST_INITIAL_AT, verifiedArtifact, expectation);
  const finalArtifact = artifactSnapshot("final", HOST_FINAL_AT, verifiedArtifact, expectation);
  const httpObservations = hostObservationSet({
    platform,
    origin,
    expectation,
    plan,
    dns,
    observations
  });
  const result = await writeDeployedHostCandidateReceipt({
    cwd: fixture.workspace,
    preparedOutput: prepared,
    candidate,
    policy,
    expectation,
    initialArtifact,
    httpObservations,
    finalArtifact,
    observationSource: "synthetic_injected_test_fixture"
  });
  assert.deepEqual(
    result.document.attachments.map((attachment) => attachment.role),
    DEPLOYED_HOST_CANDIDATE_ATTACHMENT_ROLES
  );
  return { outputRoot, receiptPath: result.receiptPath, result };
}

function providerProjection({ platform, origin }) {
  const common = {
    provider: platform,
    action: "deploy_candidate",
    operationId: "composition-provider-operation-001",
    accountId: "account-1",
    projectId: "project-1",
    environment: "staging",
    origin
  };
  return {
    schemaVersion: 1,
    recordType: "synthetic_provider_deployment_projection_v1",
    provider: platform,
    action: "deploy_candidate",
    actionResponse: {
      ...common,
      beforeActiveDeploymentId: "fixture-deployment-000",
      requestedTargetDeploymentId: null,
      resultActiveDeploymentId: PROVIDER_DEPLOYMENT_ID,
      immutableDeploymentUrl: PROVIDER_IMMUTABLE_ORIGIN,
      resultDerivation: "provider_assigned_new",
      derivedFromDeploymentId: null,
      sequenceEligible: true,
      startedAt: PROVIDER_STARTED_AT,
      acceptedAt: PROVIDER_ACCEPTED_AT,
      completedAt: PROVIDER_COMPLETED_AT,
      credentialMaterialEmbedded: false
    },
    finalReadback: {
      ...common,
      activeDeploymentId: PROVIDER_DEPLOYMENT_ID,
      immutableDeploymentUrl: PROVIDER_IMMUTABLE_ORIGIN,
      providerStatus: "success",
      terminal: true,
      successful: true,
      observedAt: PROVIDER_READBACK_AT,
      credentialMaterialEmbedded: false
    }
  };
}

async function createProviderPackage(fixture) {
  const platform = fixture.evidence.scope.candidateDeploymentPlatform;
  const origin = fixture.evidence.scope.candidateCanonicalOrigin;
  const rawRoot = path.join(fixture.workspace, "composition", "provider-raw");
  const outputRoot = path.join(fixture.workspace, "composition", "provider-output");
  const actionPath = path.join(rawRoot, "action-response.json");
  const readbackPath = path.join(rawRoot, "final-readback.json");
  await mkdir(rawRoot, { recursive: true });
  await writeFile(actionPath, `${JSON.stringify({ kind: "sanitized-action-response", provider: platform })}\n`, "utf8");
  await writeFile(readbackPath, `${JSON.stringify({ kind: "sanitized-final-readback", provider: platform })}\n`, "utf8");
  const projection = providerProjection({ platform, origin });
  const adapter = createSyntheticProviderDeploymentAdapter({
    adapterId: "composition-synthetic-adapter",
    adapterVersion: "1.0.0",
    provider: platform,
    parse: async (input) => {
      assert.equal(input.provider, platform);
      assert.equal(input.action, "deploy_candidate");
      return input.role === "raw-action-response"
        ? projection.actionResponse
        : projection.finalReadback;
    }
  });
  const environment = {
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_PROVIDER: platform,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ACTION: "deploy_candidate",
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_BINDING_ROOT: fixture.workspace,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ROOT: rawRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_OUTPUT_ROOT: outputRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_ACTION_RESPONSE: actionPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RAW_FINAL_READBACK: readbackPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_ROOT: fixture.artifactRoot,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_ARTIFACT_LOCK: fixture.artifactLockPath,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RELEASE_EVIDENCE_ID:
      fixture.evidence.artifactIdentity.releaseEvidence.evidenceId,
    HAKIMI_PROVIDER_DEPLOYMENT_CANDIDATE_RUN_ID: "composition-provider-0001"
  };
  const result = await collectProviderDeploymentCandidate({
    environment,
    adapter,
    cwd: fixture.workspace
  });
  return { rawRoot, outputRoot, receiptPath: result.receiptPath, result };
}

export async function createCompositionCandidateHappyPathFixture({ sourceWorkspace }) {
  const fixture = await createDeployedPwaEvidenceV3TestFixture({
    bindCurrentHostingPolicyInReleaseEvidence: true
  });
  try {
    for (const relative of EXTRA_CHECKED_SOURCES) {
      await writeCheckedSource(fixture.workspace, sourceWorkspace, relative);
    }
    await attachDeployedPwaV3DeploymentReceipt(fixture);
    const host = await createHostPackage(fixture);
    const provider = await createProviderPackage(fixture);
    const input = {
      bindingRoot: fixture.workspace,
      artifactRoot: fixture.artifactRoot,
      artifactLock: fixture.artifactLockPath,
      releaseEvidenceId: fixture.evidence.artifactIdentity.releaseEvidence.evidenceId,
      hostOutputRoot: host.outputRoot,
      hostReceiptPath: host.receiptPath,
      providerOutputRoot: provider.outputRoot,
      providerReceiptPath: provider.receiptPath,
      pwaInputPath: fixture.inputPath,
      pwaReceiptsRoot: fixture.receiptsRoot,
      pwaPrivateRoot: fixture.privateRoot
    };
    return { fixture, host, provider, input };
  } catch (error) {
    await cleanupDeployedPwaEvidenceV3TestFixture(fixture);
    throw error;
  }
}

export async function cleanupCompositionCandidateHappyPathFixture(compositionFixture) {
  await cleanupDeployedPwaEvidenceV3TestFixture(compositionFixture.fixture);
}

export const compositionFixtureContract = Object.freeze({
  providerDeploymentId: PROVIDER_DEPLOYMENT_ID,
  providerImmutableOrigin: PROVIDER_IMMUTABLE_ORIGIN,
  providerOperationCompletedAt: PROVIDER_COMPLETED_AT,
  providerFinalReadbackObservedAt: PROVIDER_READBACK_AT,
  hostStartedAt: HOST_INITIAL_AT,
  hostCompletedAt: HOST_FINAL_AT
});
