import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  validateHostingSecurityPolicy
} from "./deployed-security-headers-lib.mjs";
import {
  compileDeployedPwaEvidenceSchema,
  DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH
} from "./deployed-pwa-evidence-schema.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";

export const DEPLOYED_PWA_EVIDENCE_POLICY_PATH =
  "docs/release/deployed-pwa-evidence-policy.v1.json";
export const DEPLOYED_PWA_HOSTING_POLICY_PATH =
  "docs/security/hosting-security-policy.json";
export const DEPLOYED_PWA_RELEASE_DECISIONS_PATH =
  "docs/release/web-v1-release-decisions.json";

export const DEPLOYED_PWA_GATE_NAMES = Object.freeze([
  "policyBindingsVerified",
  "releaseIdentityVerified",
  "artifactIdentityVerified",
  "formalReleaseEvidenceVerified",
  "realHostReceiptVerified",
  "edgePwaRuntimeReceiptVerified",
  "chromePwaRuntimeReceiptVerified",
  "deploymentReceiptVerified",
  "deployedPwaEngineeringVerified"
]);

const POLICY_KEYS = Object.freeze([
  "schemaVersion",
  "policyId",
  "status",
  "executionAdmission",
  "blockingReasons",
  "releaseIdentity",
  "requiredBrowserProjects",
  "requiredHostVerificationKind",
  "requiredPolicyBindings",
  "authorizationBoundary"
]);

const EXPECTED_EXECUTION_ADMISSION = Object.freeze({
  status: "closed_missing_https_origin",
  auditedHostingPlatformSelected: false,
  canonicalHttpsOriginConfigured: false,
  formalArtifactIdentityPackageAvailable: false,
  trustedRealHostReceiptWriterVerified: false,
  trustedRealHostReceiptParserVerified: false,
  trustedPwaRuntimeReceiptWriterVerified: false,
  trustedPwaRuntimeReceiptParserVerified: false,
  trustedProviderDeploymentReceiptParserVerified: false
});

const EXPECTED_BLOCKING_REASONS = Object.freeze([
  "hosting_platform_unselected",
  "canonical_https_origin_null",
  "current_formal_artifact_absent",
  "trusted_real_host_receipt_writer_absent",
  "trusted_real_host_receipt_parser_absent",
  "trusted_pwa_runtime_receipt_writer_absent",
  "trusted_pwa_runtime_receipt_parser_absent",
  "trusted_provider_deployment_receipt_parser_absent",
  "external_deployment_execution_authorization_absent"
]);

const EXPECTED_RELEASE_IDENTITY = Object.freeze({
  channel: "default-v13",
  dbGeneration: "legacy-v13",
  targetSchema: 13,
  migrationId: null
});

const EXPECTED_POLICY_BINDINGS = Object.freeze([
  Object.freeze({
    role: "release-decisions",
    path: DEPLOYED_PWA_RELEASE_DECISIONS_PATH
  }),
  Object.freeze({
    role: "hosting-security-policy",
    path: DEPLOYED_PWA_HOSTING_POLICY_PATH
  }),
  Object.freeze({
    role: "release-evidence-schema",
    path: "docs/release/release-evidence.schema.json"
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-schema",
    path: DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-policy",
    path: DEPLOYED_PWA_EVIDENCE_POLICY_PATH
  })
]);

const EXPECTED_AUTHORIZATION_BOUNDARY = Object.freeze({
  externalDeploymentExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  authorizationMayNotBeDerivedFromEngineeringEvidence: true
});

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && canonicalJson(Object.keys(value).sort()) === canonicalJson([...keys].sort());
}

function exactJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

export class DeployedPwaEvidenceVerificationError extends Error {
  constructor(stage, code, message, cause) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "DeployedPwaEvidenceVerificationError";
    this.stage = stage;
    this.code = code;
  }
}

function fail(stage, code, message, cause) {
  throw new DeployedPwaEvidenceVerificationError(stage, code, message, cause);
}

function requireCondition(condition, stage, code, message) {
  if (!condition) fail(stage, code, message);
}

function parseJsonBytes(bytes, label) {
  try {
    return JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch (error) {
    fail("policy", "DEPLOYED_PWA_POLICY_JSON_INVALID", `${label} is not valid UTF-8 JSON.`, error);
  }
}

export function validateDeployedPwaEvidencePolicy(policy) {
  requireCondition(
    exactKeys(policy, POLICY_KEYS)
      && policy.schemaVersion === 1
      && policy.policyId === "hakimi.web-v1.deployed-pwa-evidence/v1"
      && policy.status === "contract_only_not_executed"
      && exactJson(policy.executionAdmission, EXPECTED_EXECUTION_ADMISSION)
      && exactJson(policy.blockingReasons, EXPECTED_BLOCKING_REASONS)
      && exactJson(policy.releaseIdentity, EXPECTED_RELEASE_IDENTITY)
      && exactJson(policy.requiredBrowserProjects, ["msedge", "chrome"])
      && policy.requiredHostVerificationKind === "real-network"
      && exactJson(policy.requiredPolicyBindings, EXPECTED_POLICY_BINDINGS)
      && exactJson(policy.authorizationBoundary, EXPECTED_AUTHORIZATION_BOUNDARY),
    "policy",
    "DEPLOYED_PWA_POLICY_INVALID",
    "Deployed-PWA Evidence policy is not the exact fail-closed v1 contract."
  );
  return policy;
}

export function validateDeployedPwaGovernanceState({ policy, hostingPolicy, decisions }) {
  validateDeployedPwaEvidencePolicy(policy);
  try {
    validateHostingSecurityPolicy(hostingPolicy);
  } catch (error) {
    fail(
      "hosting_preflight",
      "DEPLOYED_PWA_HOSTING_POLICY_INVALID",
      "Hosting policy failed its checked v2 contract.",
      error
    );
  }
  requireCondition(
    exactJson(decisions?.defaultRelease, {
      dbGeneration: "legacy-v13",
      targetSchema: 13,
      migrationId: null,
      schema16PromotionAuthorized: false
    }),
    "governance",
    "DEPLOYED_PWA_RELEASE_IDENTITY_DRIFT",
    "Deployed-PWA governance must preserve the frozen default-v13 identity."
  );
  requireCondition(
    exactKeys(decisions?.hosting, [
      "platform",
      "publicDeploymentAuthorized",
      "securityHeadersVerified"
    ])
      && decisions.hosting.platform === hostingPolicy.deploymentPlatform
      && decisions.hosting.securityHeadersVerified
        === hostingPolicy.publicReleaseGate.realHostHeadersVerified
      && hostingPolicy.deploymentPlatform === "unselected"
      && hostingPolicy.canonicalOrigin === null
      && hostingPolicy.cspEnforcementStatus === "report_only_until_real_host_validation"
      && exactJson(hostingPolicy.publicReleaseGate, {
        httpsRequired: true,
        realHostHeadersVerified: false,
        cspBlockingModeVerified: false,
        unnecessaryThirdPartyScriptsAllowed: false
      })
      && decisions.hosting.platform === "unselected"
      && decisions.hosting.securityHeadersVerified === false
      && decisions.hosting.publicDeploymentAuthorized === false
      && decisions.domainClaims?.expertValidatedClaimAuthorized === false
      && policy.authorizationBoundary.externalDeploymentExecutionAuthorized === false
      && policy.authorizationBoundary.publicDeploymentAuthorized === false
      && policy.authorizationBoundary.publicReleaseAuthorized === false,
    "governance",
    "DEPLOYED_PWA_LEDGER_DIVERGENCE",
    "Deployed-PWA, hosting, expert, or authorization ledgers have diverged."
  );
  return Object.freeze({ policy, hostingPolicy, decisions });
}

function assertExecutionAdmissionClosed(policy) {
  validateDeployedPwaEvidencePolicy(policy);
  fail(
    "execution_admission",
    "DEPLOYED_PWA_EXECUTION_ADMISSION_CLOSED",
    "Deployed-PWA execution is contract-only until a new policy version admits a selected audited host, a formal artifact package, and independently reviewed raw host and browser receipt writers and parsers."
  );
}

async function readCheckedJson({ workspace, relativePath, label, readFileImpl }) {
  const absolutePath = path.resolve(workspace, relativePath);
  let bytes;
  try {
    bytes = await readFileImpl(absolutePath);
  } catch (error) {
    fail("policy", "DEPLOYED_PWA_POLICY_READ_FAILED", `${label} could not be read.`, error);
  }
  return parseJsonBytes(bytes, label);
}

export async function verifyDeployedPwaEvidence({
  cwd = process.cwd(),
  inputPath = null,
  readFileImpl = readFile
} = {}) {
  const workspace = path.resolve(cwd);
  let schema;
  try {
    schema = await readCheckedJson({
      workspace,
      relativePath: DEPLOYED_PWA_EVIDENCE_SCHEMA_PATH,
      label: "Deployed-PWA Evidence Schema",
      readFileImpl
    });
    compileDeployedPwaEvidenceSchema(schema);
  } catch (error) {
    if (error instanceof DeployedPwaEvidenceVerificationError) throw error;
    fail(
      "schema",
      "DEPLOYED_PWA_SCHEMA_INVALID",
      "Deployed-PWA Evidence Schema could not be audited and compiled.",
      error
    );
  }

  const [policy, hostingPolicy, decisions] = await Promise.all([
    readCheckedJson({
      workspace,
      relativePath: DEPLOYED_PWA_EVIDENCE_POLICY_PATH,
      label: "Deployed-PWA Evidence policy",
      readFileImpl
    }),
    readCheckedJson({
      workspace,
      relativePath: DEPLOYED_PWA_HOSTING_POLICY_PATH,
      label: "Hosting security policy",
      readFileImpl
    }),
    readCheckedJson({
      workspace,
      relativePath: DEPLOYED_PWA_RELEASE_DECISIONS_PATH,
      label: "Web v1 release decisions",
      readFileImpl
    })
  ]);
  validateDeployedPwaGovernanceState({ policy, hostingPolicy, decisions });
  assertExecutionAdmissionClosed(policy);

  // v1 deliberately has no evidence-instance read path. `inputPath` is retained
  // only so the stable failure ledger can state whether the caller supplied one.
  void inputPath;
}

export function buildDeployedPwaVerificationFailure({ inputPath = null, error }) {
  const known = error instanceof DeployedPwaEvidenceVerificationError;
  const code = known ? error.code : "DEPLOYED_PWA_EVIDENCE_VERIFICATION_FAILED";
  const stage = known ? error.stage : "internal";
  const message = error instanceof Error ? error.message : String(error);
  const executionAdmission = known
    && error.code === "DEPLOYED_PWA_EXECUTION_ADMISSION_CLOSED"
    ? "closed_missing_https_origin"
    : "unverified";
  return Object.freeze({
    schemaVersion: 1,
    summaryType: "deployed_pwa_evidence_verification_v1",
    verificationKind: "offline-contract-preflight",
    status: "failed",
    executionAdmission,
    inputProvided: typeof inputPath === "string" && inputPath.length > 0,
    artifactReadAttempted: false,
    formalVerifierAttempted: false,
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    strictGatePassed: false,
    gates: Object.freeze(Object.fromEntries(
      DEPLOYED_PWA_GATE_NAMES.map((name) => [name, false])
    )),
    claims: Object.freeze({
      engineeringEvidenceOnly: true,
      sourceAndArtifactCurrentVerified: false,
      realHostVerified: false,
      pwaBrowserRuntimeVerified: false,
      deploymentOperationObserved: false,
      externalDeploymentExecutionAuthorized: false,
      publicDeploymentAuthorized: false,
      publicReleaseAuthorized: false,
      releaseReady: false,
      contentTruthAuthorized: false,
      expertClaimsAuthorized: false,
      rightsLegalConclusionAuthorized: false
    }),
    errors: Object.freeze([Object.freeze({
      stage,
      code,
      messageDigest: sha256(message)
    })])
  });
}
