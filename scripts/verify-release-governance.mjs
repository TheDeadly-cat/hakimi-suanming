import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { devices } from "@playwright/test";
import backupArtifactConfig from "../apps/web/playwright.release-backup-artifact.config.ts";
import bootArtifactConfig from "../apps/web/playwright.release-boot-artifact.config.ts";
import crossSchemaV13V16Config from "../apps/web/playwright.cross-schema-v13-v16.config.ts";
import pwaCrossBrowserConfig from "../apps/web/playwright.release-pwa-artifact.config.ts";
import {
  DEFAULT_V13_RELEASE_BROWSER_IDENTITY,
  RELEASE_BROWSER_MATRIX,
  releaseBrowserNativeDeviceOptions
} from "../apps/web/playwright.release-browser-matrix.ts";
import {
  CROSS_SCHEMA_V13_V16_RECEIPT_ID,
  CROSS_SCHEMA_V13_V16_SPEC_PATH,
  CROSS_SCHEMA_V13_V16_TEST_TITLES,
  REQUIRED_RELEASE_BROWSER_RECEIPT_IDS,
  REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT
} from "../apps/web/playwright.release-browser-result.ts";
import swTwoGenerationFixtureConfig from "../apps/web/playwright.sw-upgrade.config.ts";
import {
  assertStrictSwTwoGenerationFixtureSummary,
  buildSwTwoGenerationFixtureSummary,
  SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
  SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT,
  SW_TWO_GENERATION_FIXTURE_NON_CLAIMS,
  SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES,
  SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION,
  SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS
} from "../apps/web/playwright.sw-two-generation-fixture-result.ts";
import {
  createSwTwoGenerationArtifactSetIdentity,
  createSwTwoGenerationGenerationArtifactIdentity,
  SW_TWO_GENERATION_ARTIFACT_GENERATIONS
} from "../apps/web/sw-two-generation-artifact-identity.ts";
import {
  assertSwTwoGenerationFixtureCriticalSourceIdentity,
  loadSwTwoGenerationFixtureCriticalSourceIdentity,
  SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256
} from "../apps/web/sw-two-generation-fixture-source-identity.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.release-web-v1-artifact.config.ts";
import {
  validateDeployedPwaEvidencePolicy,
  validateDeployedPwaGovernanceState
} from "./deployed-pwa-evidence-lib.mjs";
import { loadDeployedPwaEvidenceSchemaValidator } from "./deployed-pwa-evidence-schema.mjs";
import {
  DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS,
  DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES,
  validateDeployedPwaEvidenceV2GovernanceState,
  validateDeployedPwaEvidenceV2Policy
} from "./deployed-pwa-evidence-v2-lib.mjs";
import { loadDeployedPwaEvidenceV2SchemaValidator } from "./deployed-pwa-evidence-v2-schema.mjs";
import {
  DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES,
  DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS,
  DEPLOYED_PWA_EVIDENCE_V3_ROUTE_IDS,
  DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
  validateDeployedPwaEvidenceV3GovernanceState,
  validateDeployedPwaEvidenceV3Policy
} from "./deployed-pwa-evidence-v3-lib.mjs";
import { loadDeployedPwaEvidenceV3SchemaValidator } from "./deployed-pwa-evidence-v3-schema.mjs";
import {
  SW_AB_UPDATE_CANDIDATE_AUTHORITY,
  SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS,
  SW_AB_UPDATE_CANDIDATE_CAPABILITIES,
  SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES,
  SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY,
  SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES,
  SW_AB_UPDATE_CANDIDATE_TIMELINE,
  validateSwAbUpdateCandidatePolicy
} from "./sw-ab-update-candidate-lib.mjs";
import { loadSwAbUpdateCandidateSchemaValidator } from "./sw-ab-update-candidate-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS,
  SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES,
  validateSwAbUpdateRuntimeClientCapturePolicy
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  loadSwAbUpdateRuntimeClientCaptureSchemaValidator
} from "./sw-ab-update-runtime-client-capture-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS,
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES,
  validateSwAbUpdateRuntimeApiTranscriptPolicy
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  loadSwAbUpdateRuntimeApiTranscriptSchemaValidator
} from "./sw-ab-update-runtime-api-transcript-schema.mjs";
import {
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
  SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
  validateSwAbRuntimeCollectorIssuancePolicy
} from "./sw-ab-update-runtime-collector-issuance-lib.mjs";
import {
  loadSwAbUpdateRuntimeCollectorIssuanceSchemaValidator
} from "./sw-ab-update-runtime-collector-issuance-schema.mjs";
import {
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs";
import {
  SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS,
  validateSwAbFourChainCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  loadSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchemaValidator
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs";
import {
  SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS,
  validateSwAbProducerBridgeCompositionPolicy
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs";
import {
  loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchemaValidator
} from "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs";
import {
  validateRollbackProviderSequenceCompositionPolicy
} from "./rollback-provider-sequence-composition-lib.mjs";
import {
  loadRollbackProviderSequenceCompositionSchemaValidator
} from "./rollback-provider-sequence-composition-schema.mjs";
import { validateHostingSecurityPolicy } from "./deployed-security-headers-lib.mjs";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import { resolveFormalNpmLifecycleClosure } from "./formal-npm-lifecycle-closure-lib.mjs";
import { loadReleaseEvidenceSchemaValidator } from "./release-evidence-schema.mjs";
import { loadRollbackEvidenceSchemaValidator } from "./rollback-evidence-schema.mjs";
import {
  parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes,
  verifyZiweiHkoRestrictedSourcePreReleasePolicy,
  ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS,
  ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS,
  ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH
} from "./ziwei-hko-restricted-source-pre-release-policy-lib.mjs";

export { verifyZiweiHkoRestrictedSourcePreReleasePolicy };

export const REQUIRED_MIGRATION_WORKFLOW_COMMANDS = Object.freeze([
  "node --test scripts/verify-release-governance.test.mjs",
  "npm run test:e2e:cross-schema-upgrade",
  "npm run test:e2e:cross-schema-v13-v15",
  "npm run test:e2e:cross-schema-v14-v15",
  "npm run test:e2e:cross-schema-v13-v16",
  "npm run test:e2e:orphaned-v13-recovery"
]);

export const REQUIRED_MIGRATION_WORKFLOW_PATHS = Object.freeze([
  ".gitattributes",
  ".node-version",
  ".npmrc",
  "package.json",
  "package-lock.json",
  "apps/web/package.json",
  "apps/web/index.html",
  "apps/web/pwa-build.ts",
  "apps/web/public/sw.js",
  "apps/web/release-protocol.ts",
  "apps/web/src/bootstrap.ts",
  "apps/web/src/recovery-main.tsx",
  "apps/web/src/main.tsx",
  "apps/web/src/lib/app-boot-*",
  "apps/web/src/lib/app-version.ts",
  "apps/web/src/lib/current-release.ts",
  "apps/web/src/lib/full-backup-worker-client.ts",
  "apps/web/src/lib/full-backup-worker-client.test.ts",
  "apps/web/src/lib/full-backup-worker-protocol.ts",
  "apps/web/src/lib/orphaned-v13-rescue.ts",
  "apps/web/src/lib/preboot-database-inventory.ts",
  "apps/web/src/lib/release-database-coordinator.ts",
  "apps/web/src/lib/release-database-coordinator.test.ts",
  "apps/web/src/lib/release-controller-takeover-write-fence.ts",
  "apps/web/src/lib/release-controller-takeover-write-fence.test.ts",
  "apps/web/src/lib/release-integrity-cache.ts",
  "apps/web/src/lib/service-worker-*",
  "apps/web/src/lib/storage-capacity-gate.ts",
  "apps/web/src/pages/case-library-page.tsx",
  "apps/web/src/pages/case-library-page.test.tsx",
  "apps/web/src/pages/orphaned-v13-recovery-page.tsx",
  "apps/web/src/pwa-build.test.ts",
  "apps/web/src/pwa-files.test.ts",
  "apps/web/src/sw-lifecycle.test.ts",
  "apps/web/playwright.sw-two-generation-fixture-result.ts",
  "apps/web/playwright.sw-two-generation-fixture-reporter.ts",
  "apps/web/sw-two-generation-artifact-identity.ts",
  "apps/web/sw-two-generation-fixture-source-identity.ts",
  "apps/web/e2e/**",
  "apps/web/playwright.release-browser-*.ts",
  "apps/web/playwright*.config.ts",
  "apps/web/vite*.ts",
  "packages/backup/**",
  "packages/contracts/**",
  "packages/integrity/**",
  "packages/storage/**",
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
  "docs/release/PR6采集器临时签发候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
  "docs/release/PR6四链离线组合候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
  "docs/release/PR6运行时派生证据生产桥接候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
  "docs/release/PR6生产桥接四链组合候选边界-v2-2026-08-28.md",
  "scripts/**",
  ".github/workflows/migration-ci.yml"
]);

export const REQUIRED_QUICK_CI_JOBS = Object.freeze([
  "ci-contracts",
  "node-release-evidence",
  "node-package-artifacts",
  "toolchain-and-boundaries",
  "history-checkpoint-governance",
  "current-index-governance",
  "bazi-current-semantics",
  "full-typecheck",
  "full-vitest",
  "default-v13-web-build",
  "artifact-manifest-verification",
  "release-gate-aggregate"
]);

export const REQUIRED_QUICK_CI_INDEPENDENT_JOBS = Object.freeze([
  "ci-contracts",
  "node-release-evidence",
  "node-package-artifacts",
  "toolchain-and-boundaries",
  "history-checkpoint-governance",
  "current-index-governance",
  "bazi-current-semantics",
  "full-typecheck",
  "full-vitest",
  "default-v13-web-build"
]);

export const REQUIRED_QUICK_CI_COMMANDS = Object.freeze({
  "ci-contracts": Object.freeze(["npm run check:node-test-groups", "npm run test:ci-contracts"]),
  "node-release-evidence": Object.freeze(["npm run test:node-release-evidence"]),
  "node-package-artifacts": Object.freeze(["npm run test:node-package-artifacts"]),
  "bazi-current-semantics": Object.freeze([
    "npm run check:bazi-domain-release-manifest",
    "npm run check:bazi-expert-review-packet"
  ]),
  "toolchain-and-boundaries": Object.freeze([
    "npm run check:ziwei-iztro-isolated-build-license-notices",
    "npm run test:ziwei-iztro-isolated-build-license-notices",
    "npm run check:system-contract-draft-boundaries",
    "npm run check:independent-source-inventory",
    "npm run check:bazi-engineering-binding-candidates",
    "npm run check:bazi-binding-freeze-requirements",
    "npm run check:independent-domain-inventory",
    "npm run check:web-storage-import-boundary",
    "npm run check:release-governance",
    "npm run check:historical-natal-source-lock",
    "npm run check:historical-natal-runtime-closure",
    "npm run check:historical-natal-build-attestation",
    "npm run test:release-evidence"
  ]),
  "history-checkpoint-governance": Object.freeze([
    "npm run check:history-checkpoint",
    "npm run test:history-checkpoint"
  ]),
  "current-index-governance": Object.freeze([
    "npm run check:current-index",
    "npm run test:current-index"
  ]),
  "full-typecheck": Object.freeze(["npm run diagnose:typecheck"]),
  "full-vitest": Object.freeze(["npm run diagnose:vitest"]),
  "default-v13-web-build": Object.freeze(["npm run diagnose:build"]),
  "artifact-manifest-verification": Object.freeze(["npm run verify:built-release-storage-manifest"])
});
const REQUIRED_QUICK_CI_WORKFLOW_BYTES = 13245;
const REQUIRED_QUICK_CI_WORKFLOW_SHA256 =
  "a3623c93a6ba36477303d09981dd06addbf35010b4234ea94500c8f8a1e2c437";

export const REQUIRED_RELEASE_BROWSER_MATRIX = Object.freeze([
  Object.freeze({
    policyId: "desktop-edge",
    projectName: "msedge",
    channel: "msedge",
    deviceName: "Desktop Edge"
  }),
  Object.freeze({
    policyId: "desktop-chrome",
    projectName: "chrome",
    channel: "chrome",
    deviceName: "Desktop Chrome"
  })
]);

export const REQUIRED_RELEASE_BROWSER_IDS = Object.freeze(
  REQUIRED_RELEASE_BROWSER_MATRIX.map((browser) => browser.policyId).sort()
);

export const REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS = Object.freeze([
  "androidReleaseClaimAuthorized",
  "firefoxReleaseClaimAuthorized",
  "safariReleaseClaimAuthorized"
]);

export const REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS = Object.freeze({
  backup: Object.freeze(["npm", "run", "test:release:backup-artifact"]),
  boot: Object.freeze(["npm", "run", "test:release:boot-artifact"]),
  pwa: Object.freeze(["npm", "run", "test:release:pwa-artifact"]),
  "web-v1-flow": Object.freeze(["npm", "run", "test:release:web-v1-artifact"])
});

export const REQUIRED_RELEASE_BROWSER_SCRIPTS = Object.freeze({
  "test:release:backup-artifact": "playwright test --config apps/web/playwright.release-backup-artifact.config.ts",
  "test:release:boot-artifact": "playwright test --config apps/web/playwright.release-boot-artifact.config.ts",
  "test:release:pwa-artifact": "playwright test --config apps/web/playwright.release-pwa-artifact.config.ts",
  "test:release:web-v1-artifact": "playwright test --config apps/web/playwright.release-web-v1-artifact.config.ts"
});
export const REQUIRED_RELEASE_ARTIFACT_PREVIEW_SCRIPT =
  "node ../../scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json && vite preview --config vite.release-artifact-preview.config.ts --configLoader runner";
export const REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND =
  "npx playwright install chrome msedge";
const REQUIRED_SW_TWO_GENERATION_REPORTER_PATH = fileURLToPath(new URL(
  "../apps/web/playwright.sw-two-generation-fixture-reporter.ts",
  import.meta.url
));
export const REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND =
  "node scripts/verify-release-evidence.mjs --input dist/web/release-evidence.json --receipts tmp/release-evidence-receipts --output tmp/release-evidence-receipts/formal-verification.json";
export const AUDITED_HOSTING_PLATFORM_IDS = Object.freeze([]);
export const REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND =
  "node --test scripts/release-evidence.test.mjs scripts/verify-deployed-security-headers.test.mjs scripts/rollback-evidence.test.mjs scripts/deployed-pwa-evidence.test.mjs scripts/deployed-pwa-evidence-v2.test.mjs scripts/deployed-pwa-evidence-v3.test.mjs";
export const REQUIRED_ROLLBACK_EVIDENCE_SCRIPTS = Object.freeze({
  "test:rollback-evidence": "node --test scripts/rollback-evidence.test.mjs",
  "verify:rollback-evidence": "node scripts/verify-rollback-evidence.mjs",
  "test:release-evidence": REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
});
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_SCRIPTS = Object.freeze({
  "test:deployed-pwa-evidence": "node --test scripts/deployed-pwa-evidence.test.mjs",
  "verify:deployed-pwa-evidence": "node scripts/verify-deployed-pwa-evidence.mjs",
  "test:release-evidence": REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
});
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS = Object.freeze({
  "test:deployed-pwa-evidence-v2": "node --test scripts/deployed-pwa-evidence-v2.test.mjs",
  "verify:deployed-pwa-evidence-v2": "node scripts/verify-deployed-pwa-evidence-v2.mjs",
  "test:release-evidence": REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
});
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS = Object.freeze({
  "test:deployed-pwa-evidence-v3": "node --test scripts/deployed-pwa-evidence-v3.test.mjs",
  "verify:deployed-pwa-evidence-v3": "node scripts/verify-deployed-pwa-evidence-v3.mjs",
  "test:release-evidence": REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
});
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES = Object.freeze([
  "browser-version",
  "profile-preflight",
  "browser-manifest-audit",
  "remote-pwa-manifest-body",
  "network-events",
  "controller-script-meta",
  "controller-source",
  "remote-service-worker-body",
  "case-revision-before",
  "case-revision-after"
]);
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE =
  "pwaInstallabilityAndManifestCandidateConsistent";
export const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_AUTHORIZATION_BOUNDARY = Object.freeze({
  externalDeploymentExecutionAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  authorizationMayNotBeDerivedFromEngineeringEvidence: true
});
export const REQUIRED_DEPLOYED_PWA_GATE_NAMES = Object.freeze([
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
export const REQUIRED_DEPLOYED_PWA_CLAIM_NAMES = Object.freeze([
  "engineeringEvidenceOnly",
  "sourceAndArtifactCurrentVerified",
  "realHostVerified",
  "pwaBrowserRuntimeVerified",
  "deploymentOperationObserved",
  "externalDeploymentExecutionAuthorized",
  "publicDeploymentAuthorized",
  "publicReleaseAuthorized",
  "releaseReady",
  "contentTruthAuthorized",
  "expertClaimsAuthorized",
  "rightsLegalConclusionAuthorized"
]);
export const REQUIRED_SW_TWO_GENERATION_FIXTURE_SCRIPTS = Object.freeze({
  "test:e2e:sw-upgrade": "node scripts/run-sw-two-generation-fixture.mjs",
  "test:sw-two-generation-fixture-contract": "node --test scripts/sw-two-generation-fixture-contract.test.mjs"
});
export const REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_IDENTITY_MODULE_SHA256 =
  "069f5809d3b9df1e5c9e83c5879c98de69c9d2d062ab72ce89c4453fca9c612b";
export const REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256 =
  "8582c897eb6c95e40f2209ef80cd575440910b0d30163344c7272bd5063572c6";

export const REQUIRED_STORAGE_V13_MATRIX_CANDIDATE_SCRIPTS = Object.freeze({
  "test:storage-v13-matrix-candidate":
    "node --test scripts/storage-v13-matrix-candidate-runtime.test.mjs scripts/storage-v13-matrix-candidate-reporter.test.mjs scripts/verify-storage-v13-matrix-candidate.test.mjs",
  "typecheck:storage-v13-matrix-candidate":
    "tsc --noEmit -p apps/web/tsconfig.storage-v13-matrix-candidate.json",
  "capture:storage-v13-matrix-candidate":
    "node scripts/run-storage-v13-matrix-candidate.mjs",
  "verify:storage-v13-matrix-candidate":
    "node scripts/verify-storage-v13-matrix-candidate.mjs"
});
export const REQUIRED_STORAGE_V13_MATRIX_POLICY_CANONICAL_SHA256 =
  "aace648c0cc479e2c12ccd70e5ab5dc7349fed36c0082f492270ab31842c3b50";
export const REQUIRED_STORAGE_V13_MATRIX_SCHEMA_CANONICAL_SHA256 =
  "1a67adbb0c4a0f63002c4973a532d152fd49297da7d229b1797fa3902144c3af";
export const REQUIRED_STORAGE_V13_MATRIX_V1_POLICY_CANONICAL_SHA256 =
  "0a19ce1a0b1cd1d42972d67551331fd572f54b7ffb80950a50bab27492d66258";
export const REQUIRED_STORAGE_V13_MATRIX_V1_SCHEMA_CANONICAL_SHA256 =
  "0cd4fe44d79d14aa3d2385f1e3f55af7d9b5f320ca8286de6f41059c7d72d8cc";
export const REQUIRED_STORAGE_V13_MATRIX_V1_POLICY_RAW_SHA256 =
  "06ab2907ccfb4a1445df2c9f448e087ac570682728fd0280a58f75476e566b8d";
export const REQUIRED_STORAGE_V13_MATRIX_V1_SCHEMA_RAW_SHA256 =
  "f929bb4cf4d2f609b748afa389373b8eb9cc540158d08d45df841f6309d5efe2";
export const REQUIRED_STORAGE_V13_MATRIX_RUNNER_SOURCE_SHA256 =
  "82795e5d49f98e6bee333d066079d045852e45567c9a66ff780f536f35c3d31e";
export const REQUIRED_STORAGE_V13_MATRIX_GLOBAL_SETUP_SOURCE_SHA256 =
  "72f54f7bfe752421e73f4c8bbe319051d6316731a51ffaaf94f1b3f0156c88df";
export const REQUIRED_STORAGE_V13_MATRIX_REPORTER_SOURCE_SHA256 =
  "89b7b130f3adc40b321ceac84cb0781de12affceb19faf905e42facd263842ed";
export const REQUIRED_STORAGE_V13_MATRIX_SPEC_SOURCE_SHA256 =
  "b4b477fc17f2e8c3605e66b5d412784e67bf216bbdddf1f1fbb9370a41e0a553";
export const REQUIRED_STORAGE_V13_MATRIX_NATIVE_READONLY_SOURCE_SHA256 =
  "9852404a24f107ee73e0edf36ed658ec07f008e27dd02d9df981f352e777f861";
export const REQUIRED_STORAGE_V13_MATRIX_RUNTIME_SOURCE_SHA256 =
  "8ddfff74c0f71b6e12fa54674d479aa76a11a4d12bf34ccdb529446fbccbc436";
export const REQUIRED_STORAGE_V13_MATRIX_VERIFIER_SOURCE_SHA256 =
  "4c9b10fd92c4e74445df6fe6d1edb93056c9cae07c8134c2d355bf15b50430b3";
export const REQUIRED_STORAGE_V13_MATRIX_ROOT_TSCONFIG_EXCLUDES = Object.freeze([
  "apps/web/e2e/storage-v13-matrix-candidate.spec.ts",
  "apps/web/e2e/storage-v13-native-readonly.ts"
]);
export const REQUIRED_STORAGE_V13_MATRIX_TSCONFIG_INCLUDES = Object.freeze([
  "playwright.storage-v13-matrix-candidate.config.ts",
  "playwright.storage-v13-matrix-candidate-global-setup.ts",
  "playwright.storage-v13-matrix-candidate-reporter.ts",
  "playwright.release-browser-matrix.ts",
  "e2e/storage-v13-matrix-candidate.spec.ts",
  "e2e/storage-v13-native-readonly.ts",
  "e2e/full-backup-helpers.ts",
  "e2e/cross-schema-upgrade-helpers.ts",
  "e2e/release-browser-persistent-context.ts",
  "../../scripts/deployed-pwa-candidate-runtime.d.mts",
  "../../scripts/storage-v13-matrix-candidate-runtime.d.mts"
]);

export const REQUIRED_SW_AB_UPDATE_CANDIDATE_SCRIPTS = Object.freeze({
  "test:sw-ab-update-candidate":
    "node --test scripts/sw-ab-update-candidate.test.mjs",
  "verify:sw-ab-update-candidate":
    "node scripts/verify-sw-ab-update-candidate.mjs"
});
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_POLICY_CANONICAL_SHA256 =
  "948b9ef237f5aec6dddfb9945e300de3cdf69f322b267e4fe08cce6d70842127";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_CANONICAL_SHA256 =
  "a09461d8d6efc6fcd8c7f2767ad625834ef0443e52ff2fb1be02c03d16411cea";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_LIB_SOURCE_SHA256 =
  "feb9bc3ee034cfd5c34f20a0d1fe8f179b56e3ab367f9c62927d29f6581b0256";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_LOADER_SOURCE_SHA256 =
  "8db89a345a08bf5f7396ecff7a7431dcc5cd653412f16213d3c7bbfd293a9d60";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_VERIFIER_SOURCE_SHA256 =
  "af458892806c21231a939f619e4ddbb317a0ce4b310dc9d064bdf729bbd90555";

export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCRIPTS = Object.freeze({
  "test:sw-ab-update-runtime-client-capture":
    "node --test scripts/sw-ab-update-runtime-client-capture.test.mjs",
  "verify:sw-ab-update-runtime-client-capture":
    "node scripts/verify-sw-ab-update-runtime-client-capture.mjs"
});
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_CANONICAL_SHA256 =
  "36a54cd3172d2d67ae731f67ae3881fda13753700f77f27c7e9783213e22fcdd";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_CANONICAL_SHA256 =
  "7bf2fe26b30f6cf82993ca6765d92ed7c9ecb651e594ec25dc4a48df85909cb5";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LIB_SOURCE_SHA256 =
  "0c4f2aafd42310c9ebc910c7ddd78813b97b163916a6558f0e05d401d428d07a";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_LOADER_SOURCE_SHA256 =
  "552e6258b4ed12e4b0ebb2f024d8c10e5f2d6a4bfd31388cc1a380ffd01f5feb";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROBE_SOURCE_SHA256 =
  "9ac9b4c7a4a845231a4e02ea4ecfa43ff3f05e2fe2e2053a746072cb34292136";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_VERIFIER_SOURCE_SHA256 =
  "bd058e6ebcbcd62a3e32d2d9afd87891debf9bb3f1eaf87e4aa1e697b6edb5fb";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LOADER_SOURCE_SHA256 =
  "65a63baec308a4e75498850587ae1d723793caf2d47d3ebd16afe48dca067245";
export const REQUIRED_SW_AB_RUNTIME_CHALLENGE_SOURCE_SHA256 =
  "87b53d749ee0fc64c4d4f9375edba4a0e72101db75445648859f687db0986fce";
export const REQUIRED_SW_AB_RUNTIME_SERVICE_WORKER_SOURCE_SHA256 =
  "7de3e51d953c6618bed8f10394624acbd405a3de274f11500495357072da2699";

export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCRIPTS = Object.freeze({
  "test:sw-ab-update-runtime-api-transcript":
    "node --test scripts/sw-ab-update-runtime-api-transcript.test.mjs",
  "verify:sw-ab-update-runtime-api-transcript":
    "node scripts/verify-sw-ab-update-runtime-api-transcript.mjs"
});
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_CANONICAL_SHA256 =
  "147135e001dfedf19bed33b2472deab3d0d453607ffaa653d5003fbb6ab1b441";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_CANONICAL_SHA256 =
  "007b8b1aea555c839fffb5bb21d826addbc4f77b36a90bf7f813f81770575415";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_LIB_SOURCE_SHA256 =
  "a2c8b05e715f8abe6fc836cac1c48f2d2695b2aa9f42575706453eb87bb71c87";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_SOURCE_SHA256 =
  "5d42a7c3a35acc317f7ca926c65d96a45e8e5de5f8b5809bc2bb37c2d2be192f";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_WRITER_SOURCE_SHA256 =
  "bcd2301d7aaa7485cfece92a33dfc1aedca1562184ce8afd83cae41b5df0e75b";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_LOADER_SOURCE_SHA256 =
  "9257ee214f851792cba1e586c519d6e6d73e4c30032e6c86f371a6882c9c2a22";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_FIXTURE_SOURCE_SHA256 =
  "ddcb24c3469ad9600f524a5f76371652c8907e94fc4f055d60c5162880011e75";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TEST_SOURCE_SHA256 =
  "8002d79f17a3a53f22e53ff85ebfa162147712f01990915bedbb9cb481389154";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_VERIFIER_SOURCE_SHA256 =
  "4ca9df96eb1a0349775c8bc7d1721bab5d5d57ee7e05c3c4641b30649fccfe13";

export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCRIPTS = Object.freeze({
  "test:sw-ab-update-runtime-collector-issuance":
    "node --test scripts/sw-ab-update-runtime-collector-issuance.test.mjs scripts/sw-ab-update-runtime-collector-live-adapter.test.mjs",
  "verify:sw-ab-update-runtime-collector-issuance":
    "node scripts/verify-sw-ab-update-runtime-collector-issuance.mjs"
});
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_POLICY_CANONICAL_SHA256 =
  "02967d8d285eda7bd4380e3caa3d98b05b2f67ccfc7d58001a82cdc800039c95";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_CANONICAL_SHA256 =
  "672de3bd13c598318ce8f319671ec60746576f609a3167b17727458ff8d340a5";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_LIB_SOURCE_SHA256 =
  "b8de0bcdd3735ed509aae3a0c59012ed1ef40650a3ba6bf0656a2a340da47f34";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_SOURCE_SHA256 =
  "ab8af5c8475001ce0a990ab4253e14ab0a7e509806a98de36200ee2c0b459610";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_WRITER_SOURCE_SHA256 =
  "2f765f83f9da43a04b4fa2fd4aea30a84718ca44c57d5c0b00f0ac2668ab4106";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_LOADER_SOURCE_SHA256 =
  "844457717536f65470a5ec8fb6abbe90c7dacac4b1296da11556884acde47862";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_FIXTURE_SOURCE_SHA256 =
  "66c2e3dd0d36587e894fdba2153173324d10c53ae62758065e67cb4cd66c80e0";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_TEST_SOURCE_SHA256 =
  "2fb16a33665d1e46dfc8a08c9a6914eac14d42b88fc868b8e293f88d0c37ea21";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_VERIFIER_SOURCE_SHA256 =
  "7376c79a6605c8422d9958c486f0c433e340446320e711e49f941b6ba88d8e57";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_LIVE_ADAPTER_SOURCE_SHA256 =
  "f14db56efd63740dc6879b4a052429763a920b383460c6e1d57a0c57fed0baff";
export const REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_LIVE_ADAPTER_TEST_SOURCE_SHA256 =
  "12554d7887a4fdb649323cc891ea4197ddb99c802c9a1f6b0598d0f33d5ab961";

export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCRIPTS =
  Object.freeze({
    "test:sw-ab-update-candidate-runtime-client-capture-composition":
      "node --test scripts/sw-ab-update-candidate-runtime-client-capture-composition.test.mjs",
    "verify:sw-ab-update-candidate-runtime-client-capture-composition":
      "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
  });
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_CANONICAL_SHA256 =
  "d800f826e5591269c3f341c9c4fd1daffee0869a5e165f64b77fc8e9ba43a95c";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_CANONICAL_SHA256 =
  "c70868b4b7ba5a5a7156cd707b1e2417fe39ca10b6eb9144abe09295b0eccf40";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_LIB_SOURCE_SHA256 =
  "c78126c296114c6e183de6a1fd9282e7b3cbc211cc964e39a278510f9facdea6";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256 =
  "57d83d6cb28f4b252cda8aa0123188b816f7d00d27074cb2caee8a6f1a67dbdf";
export const REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_VERIFIER_SOURCE_SHA256 =
  "2a469e01739eebb4190f0b68400b96bb05ef8f9e98bac808e20871c2aee2020f";

export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCRIPTS = Object.freeze({
  "test:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition":
    "node --test scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs",
  "verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition":
    "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs"
});
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_RAW_SHA256 =
  "8ad3465627f61a6fd1c9e4a5a6faed8d30a31196f53b2556bdac62e19e395d1a";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_CANONICAL_SHA256 =
  "fad60ef096f336d8d464eb273888dd0b1d66500a3dfd2ed3aed1cd6dd9c47a84";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_RAW_SHA256 =
  "d2e40f68565f910eddbc96a46ca840800eaa196965104031c4a51255d0be5917";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_CANONICAL_SHA256 =
  "a86fd1ea4ee2a7b71e33a2f496b3157d69631c465a01db6afaf4dffc669297a9";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_LIB_SOURCE_SHA256 =
  "d69302c92f97e037d2e714bb627cac46602311057d637309fa6920c291358667";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256 =
  "12078a0ec87ae15342200494b7c0a4aad64eee867855ca29b92b10673b9c2deb";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_TEST_SOURCE_SHA256 =
  "0a84a1cbb6f116356d2d0c65ddd575dad8073e446e90d75a2c75dedd0b27545f";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_VERIFIER_SOURCE_SHA256 =
  "6606fc82c9592771188bb176bf858e3d54572a14a6d0782131cb6dacfce71c24";
export const REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES = Object.freeze([
  Object.freeze({
    role: "four-chain-composition-policy",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
    rawSha256: "8ad3465627f61a6fd1c9e4a5a6faed8d30a31196f53b2556bdac62e19e395d1a",
    canonicalSha256: "fad60ef096f336d8d464eb273888dd0b1d66500a3dfd2ed3aed1cd6dd9c47a84"
  }),
  Object.freeze({
    role: "four-chain-composition-schema",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
    rawSha256: "d2e40f68565f910eddbc96a46ca840800eaa196965104031c4a51255d0be5917",
    canonicalSha256: "a86fd1ea4ee2a7b71e33a2f496b3157d69631c465a01db6afaf4dffc669297a9"
  }),
  Object.freeze({
    role: "two-chain-composition-policy",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json",
    rawSha256: "f8777499dcc11ff97b62acb848f8a2b195850e0f200f1bfefb4e88986e933abf",
    canonicalSha256: "d800f826e5591269c3f341c9c4fd1daffee0869a5e165f64b77fc8e9ba43a95c"
  }),
  Object.freeze({
    role: "two-chain-composition-schema",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json",
    rawSha256: "44582b99a2406740c715a1706ed7f8b04017016690897b22d544dbd7c3e82bf8",
    canonicalSha256: "c70868b4b7ba5a5a7156cd707b1e2417fe39ca10b6eb9144abe09295b0eccf40"
  }),
  Object.freeze({
    role: "sw-ab-update-candidate-policy",
    path: "docs/release/sw-ab-update-candidate-policy.v1.json",
    rawSha256: "94e687c798ff462d011c9b4d46bd2a4394a140dbf63ad964922c335bc9b098dc",
    canonicalSha256: "948b9ef237f5aec6dddfb9945e300de3cdf69f322b267e4fe08cce6d70842127"
  }),
  Object.freeze({
    role: "sw-ab-update-candidate-schema",
    path: "docs/release/sw-ab-update-candidate-v1.schema.json",
    rawSha256: "301fe177827bd6faee56dc9f9d9566c1d1b30251ecd8f77ba265cd8c7078a548",
    canonicalSha256: "a09461d8d6efc6fcd8c7f2767ad625834ef0443e52ff2fb1be02c03d16411cea"
  }),
  Object.freeze({
    role: "runtime-client-capture-policy",
    path: "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
    rawSha256: "d636a0e4e0dbb5cda21da47f14589892eb4d0e7f13936f674d7160dd4e2a0c18",
    canonicalSha256: "36a54cd3172d2d67ae731f67ae3881fda13753700f77f27c7e9783213e22fcdd"
  }),
  Object.freeze({
    role: "runtime-client-capture-schema",
    path: "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
    rawSha256: "080f964fb2e9a6f47621e718a861b0102debf74200d350a7f1024e45ed9a4b8d",
    canonicalSha256: "7bf2fe26b30f6cf82993ca6765d92ed7c9ecb651e594ec25dc4a48df85909cb5"
  }),
  Object.freeze({
    role: "runtime-api-transcript-policy",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
    rawSha256: "aae483a840d4a4e7ce3e8f3f70fa6e8950025d8559723dbff3e1f35a85e89616",
    canonicalSha256: "147135e001dfedf19bed33b2472deab3d0d453607ffaa653d5003fbb6ab1b441"
  }),
  Object.freeze({
    role: "runtime-api-transcript-schema",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
    rawSha256: "495be93f7ee9c72de13e0927d40dcf5c2728d952321015da958f878767f2cffc",
    canonicalSha256: "007b8b1aea555c839fffb5bb21d826addbc4f77b36a90bf7f813f81770575415"
  }),
  Object.freeze({
    role: "runtime-collector-issuance-policy",
    path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
    rawSha256: "03c4117f1488c96b86bb7557eac65a0dcca66d2823e3ba21965ef66ac3091270",
    canonicalSha256: "02967d8d285eda7bd4380e3caa3d98b05b2f67ccfc7d58001a82cdc800039c95"
  }),
  Object.freeze({
    role: "runtime-collector-issuance-schema",
    path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
    rawSha256: "0a48554caced250a0616cb76a5becf9475b63aa907f2909fb2ed0ec1ad96075b",
    canonicalSha256: "672de3bd13c598318ce8f319671ec60746576f609a3167b17727458ff8d340a5"
  })
]);

export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS =
  Object.freeze({
    "test:sw-ab-update-runtime-derived-evidence-producer-bridge":
      "node --test scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs",
    "verify:sw-ab-update-runtime-derived-evidence-producer-bridge":
      "node scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs"
  });
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_RAW_SHA256 =
  "5d4343b79e9079a323b896150ec0f063996c3e73eb6dce5521e5056bbe9829de";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_CANONICAL_SHA256 =
  "ffe06345d525c35239f1c10b95b10fa3b5151ad79c092fbe1a65942e6052c490";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_RAW_SHA256 =
  "dfbd32d2363591c00866085988ae3bd3f3d9bd3dbce6d3f0df7b06e34c3ef6e1";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_CANONICAL_SHA256 =
  "77579a9a88e182ebe7d036dc39504a34e9989b7e724bcf2488c224dea7ee3d98";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LIB_SOURCE_SHA256 =
  "33819325faecb2dda97d552f85360d75b008998f9518425f9458903cc8625640";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_LOADER_SOURCE_SHA256 =
  "93d7df42611b2c216f577418c8dfbbd0c93eed02cfc449ecaadfef00a12b03ed";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_WRITER_SOURCE_SHA256 =
  "e15a83fedcabf90a93ba045b6474c204da950bd1f4da8dd5d7c972f7c1e21454";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LOADER_SOURCE_SHA256 =
  "c7b521eed9aa34d196c4e557e1892bb3aff95efc1e0d13ce5b736f21ac32b209";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_FIXTURE_SOURCE_SHA256 =
  "30488464096155db7ad53b12ff2d9597652d641c5879715521ea64a3ff976b7e";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TEST_SOURCE_SHA256 =
  "85223e83e26731dd972a77232ca9d39108fc1d20c9dc3e18327f27443721fd6a";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_VERIFIER_SOURCE_SHA256 =
  "3c1302edb4f4d12847cda9d9f38e73e150da85f17c74812f1fc769c1ada33a25";
export const REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES =
  Object.freeze([
    Object.freeze({
      role: "producer-bridge-policy",
      path: "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
      rawSha256: "5d4343b79e9079a323b896150ec0f063996c3e73eb6dce5521e5056bbe9829de",
      canonicalSha256: "ffe06345d525c35239f1c10b95b10fa3b5151ad79c092fbe1a65942e6052c490"
    }),
    Object.freeze({
      role: "producer-bridge-schema",
      path: "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
      rawSha256: "dfbd32d2363591c00866085988ae3bd3f3d9bd3dbce6d3f0df7b06e34c3ef6e1",
      canonicalSha256: "77579a9a88e182ebe7d036dc39504a34e9989b7e724bcf2488c224dea7ee3d98"
    }),
    Object.freeze({
      role: "runtime-capture-policy",
      path: "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
      rawSha256: "d636a0e4e0dbb5cda21da47f14589892eb4d0e7f13936f674d7160dd4e2a0c18",
      canonicalSha256: "36a54cd3172d2d67ae731f67ae3881fda13753700f77f27c7e9783213e22fcdd"
    }),
    Object.freeze({
      role: "runtime-capture-schema",
      path: "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
      rawSha256: "080f964fb2e9a6f47621e718a861b0102debf74200d350a7f1024e45ed9a4b8d",
      canonicalSha256: "7bf2fe26b30f6cf82993ca6765d92ed7c9ecb651e594ec25dc4a48df85909cb5"
    }),
    Object.freeze({
      role: "api-transcript-policy",
      path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
      rawSha256: "aae483a840d4a4e7ce3e8f3f70fa6e8950025d8559723dbff3e1f35a85e89616",
      canonicalSha256: "147135e001dfedf19bed33b2472deab3d0d453607ffaa653d5003fbb6ab1b441"
    }),
    Object.freeze({
      role: "api-transcript-schema",
      path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
      rawSha256: "495be93f7ee9c72de13e0927d40dcf5c2728d952321015da958f878767f2cffc",
      canonicalSha256: "007b8b1aea555c839fffb5bb21d826addbc4f77b36a90bf7f813f81770575415"
    }),
    Object.freeze({
      role: "collector-issuance-policy",
      path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
      rawSha256: "03c4117f1488c96b86bb7557eac65a0dcca66d2823e3ba21965ef66ac3091270",
      canonicalSha256: "02967d8d285eda7bd4380e3caa3d98b05b2f67ccfc7d58001a82cdc800039c95"
    }),
    Object.freeze({
      role: "collector-issuance-schema",
      path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
      rawSha256: "0a48554caced250a0616cb76a5becf9475b63aa907f2909fb2ed0ec1ad96075b",
      canonicalSha256: "672de3bd13c598318ce8f319671ec60746576f609a3167b17727458ff8d340a5"
    })
  ]);

export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS = Object.freeze({
  "test:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition":
    "node --test scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs",
  "verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition":
    "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs"
});
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_RAW_SHA256 =
  "cda0a2a644b36ee3b000364f94cff4fc064b85631157dc9acfdb47e960f0da4b";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_CANONICAL_SHA256 =
  "28e96dcd05706acbdcd4136a2e3a8ef4041be4dd718a8d90018c2585fc562ec2";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_RAW_SHA256 =
  "85e42c8940acd1810be1ea0c366545976152aeffe7bb1226a878f56d042b2191";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_CANONICAL_SHA256 =
  "b664bece412db323023cb6fe615359635aa66447f70b3b51450fdabdd6fca161";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_LIB_SOURCE_SHA256 =
  "d5e8098570c542c9ea7e951a3de28b33cfa94bfd38f409c823cf64b8272b6e84";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256 =
  "650f7825a5d87be8f4f0a4007e1a3af294395e65e29eec52f7185866604b4611";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_FIXTURE_SOURCE_SHA256 =
  "b5055fc4588a547ddab2e2486ce45c11302e4a4f386d7e0e3bc04096f50d0c9b";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_TEST_SOURCE_SHA256 =
  "3b8252e1a9de88538761265823c1cdb253bd68653e4b1f91a441316404d44624";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_VERIFIER_SOURCE_SHA256 =
  "0124b99764b135da04cf53a3a76bb3ee42539e552fe0d64f8eade7f23f1df59f";
export const REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES = Object.freeze([
  Object.freeze({
    role: "producer-bridge-composition-v2-policy",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
    rawSha256: "cda0a2a644b36ee3b000364f94cff4fc064b85631157dc9acfdb47e960f0da4b",
    canonicalSha256: "28e96dcd05706acbdcd4136a2e3a8ef4041be4dd718a8d90018c2585fc562ec2"
  }),
  Object.freeze({
    role: "producer-bridge-composition-v2-schema",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
    rawSha256: "85e42c8940acd1810be1ea0c366545976152aeffe7bb1226a878f56d042b2191",
    canonicalSha256: "b664bece412db323023cb6fe615359635aa66447f70b3b51450fdabdd6fca161"
  }),
  Object.freeze({
    role: "two-chain-composition-policy",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json",
    rawSha256: "f8777499dcc11ff97b62acb848f8a2b195850e0f200f1bfefb4e88986e933abf",
    canonicalSha256: "d800f826e5591269c3f341c9c4fd1daffee0869a5e165f64b77fc8e9ba43a95c"
  }),
  Object.freeze({
    role: "two-chain-composition-schema",
    path: "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json",
    rawSha256: "44582b99a2406740c715a1706ed7f8b04017016690897b22d544dbd7c3e82bf8",
    canonicalSha256: "c70868b4b7ba5a5a7156cd707b1e2417fe39ca10b6eb9144abe09295b0eccf40"
  }),
  Object.freeze({
    role: "sw-ab-update-candidate-policy",
    path: "docs/release/sw-ab-update-candidate-policy.v1.json",
    rawSha256: "94e687c798ff462d011c9b4d46bd2a4394a140dbf63ad964922c335bc9b098dc",
    canonicalSha256: "948b9ef237f5aec6dddfb9945e300de3cdf69f322b267e4fe08cce6d70842127"
  }),
  Object.freeze({
    role: "sw-ab-update-candidate-schema",
    path: "docs/release/sw-ab-update-candidate-v1.schema.json",
    rawSha256: "301fe177827bd6faee56dc9f9d9566c1d1b30251ecd8f77ba265cd8c7078a548",
    canonicalSha256: "a09461d8d6efc6fcd8c7f2767ad625834ef0443e52ff2fb1be02c03d16411cea"
  }),
  Object.freeze({
    role: "runtime-client-capture-policy",
    path: "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
    rawSha256: "d636a0e4e0dbb5cda21da47f14589892eb4d0e7f13936f674d7160dd4e2a0c18",
    canonicalSha256: "36a54cd3172d2d67ae731f67ae3881fda13753700f77f27c7e9783213e22fcdd"
  }),
  Object.freeze({
    role: "runtime-client-capture-schema",
    path: "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
    rawSha256: "080f964fb2e9a6f47621e718a861b0102debf74200d350a7f1024e45ed9a4b8d",
    canonicalSha256: "7bf2fe26b30f6cf82993ca6765d92ed7c9ecb651e594ec25dc4a48df85909cb5"
  }),
  Object.freeze({
    role: "runtime-api-transcript-policy",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
    rawSha256: "aae483a840d4a4e7ce3e8f3f70fa6e8950025d8559723dbff3e1f35a85e89616",
    canonicalSha256: "147135e001dfedf19bed33b2472deab3d0d453607ffaa653d5003fbb6ab1b441"
  }),
  Object.freeze({
    role: "runtime-api-transcript-schema",
    path: "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
    rawSha256: "495be93f7ee9c72de13e0927d40dcf5c2728d952321015da958f878767f2cffc",
    canonicalSha256: "007b8b1aea555c839fffb5bb21d826addbc4f77b36a90bf7f813f81770575415"
  }),
  Object.freeze({
    role: "runtime-collector-issuance-policy",
    path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
    rawSha256: "03c4117f1488c96b86bb7557eac65a0dcca66d2823e3ba21965ef66ac3091270",
    canonicalSha256: "02967d8d285eda7bd4380e3caa3d98b05b2f67ccfc7d58001a82cdc800039c95"
  }),
  Object.freeze({
    role: "runtime-collector-issuance-schema",
    path: "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
    rawSha256: "0a48554caced250a0616cb76a5becf9475b63aa907f2909fb2ed0ec1ad96075b",
    canonicalSha256: "672de3bd13c598318ce8f319671ec60746576f609a3167b17727458ff8d340a5"
  }),
  Object.freeze({
    role: "runtime-derived-evidence-producer-bridge-policy",
    path: "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
    rawSha256: "5d4343b79e9079a323b896150ec0f063996c3e73eb6dce5521e5056bbe9829de",
    canonicalSha256: "ffe06345d525c35239f1c10b95b10fa3b5151ad79c092fbe1a65942e6052c490"
  }),
  Object.freeze({
    role: "runtime-derived-evidence-producer-bridge-schema",
    path: "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
    rawSha256: "dfbd32d2363591c00866085988ae3bd3f3d9bd3dbce6d3f0df7b06e34c3ef6e1",
    canonicalSha256: "77579a9a88e182ebe7d036dc39504a34e9989b7e724bcf2488c224dea7ee3d98"
  })
]);

export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCRIPTS = Object.freeze({
  "test:rollback-provider-sequence-composition-candidate":
    "node --test scripts/rollback-provider-sequence-composition.test.mjs",
  "verify:rollback-provider-sequence-composition-candidate":
    "node scripts/verify-rollback-provider-sequence-composition.mjs"
});
export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_CANONICAL_SHA256 =
  "adb2762821853d35d39d5de0dbb62303d5e512ca0d1a4410dd72d193b2ec996d";
export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_CANONICAL_SHA256 =
  "8fecb337ddac34ce35276b12db70de699aaa3e09e1ccf37ca9e1f06fe6e23cca";
export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_LIB_SOURCE_SHA256 =
  "9bfd38f3988b38b0a916864ecc472f2761b88da7e92acb328a28fa4ad2500b8b";
export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256 =
  "7a18097abe247e69197cb8833608a4b13a2d10f1c9e4ef5398453c9f2e8e5662";
export const REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_VERIFIER_SOURCE_SHA256 =
  "906409b83bf5b3700306a31f42f345439ae12184740af60cfaf37bad50d0f40b";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SOURCE_SHA256 =
  "350b2aa769812834814da33e108604e73c39300e45a86cb17c05d0e9df19858e";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_RUNTIME_TEST_SOURCE_SHA256 =
  "46a726abfbf9c816b8f6df84fd0cd0ff9e48d5d61e61b315313f310934a6e8a9";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_CANONICAL_SHA256 =
  "2618467edd96c2d35826b09646beaf7ade9c3cdd8afb66c6b3376c24fe4cda2f";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_LOADER_SOURCE_SHA256 =
  "70cb099d5f6a77120053ae3692b4ec757b09aba54277a13603ba745f3fbef613";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_SOURCE_SHA256 =
  "791f76ea310f1d10c93efa91a962c1dd82d421f5fecdcd44f0fdbb43bd17224e";
export const REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_SOURCE_SHA256 =
  "2126c75e826cd49f5c233945d064fb9cde8ca03ea7b7d836bb9921a1d076988c";

export const REQUIRED_RELEASE_FILES = Object.freeze([
  ".github/workflows/quick-ci.yml",
  ".github/workflows/migration-ci.yml",
  ".github/workflows/nightly-heavy.yml",
  ".github/workflows/release-evidence.yml",
  ".github/CODEOWNERS",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/release-charter.yml",
  ".github/ISSUE_TEMPLATE/release-gate.yml",
  "docs/status/current-release-status.md",
  ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH,
  "docs/Web-v1发布章程与兼容范围-v0.1-2026-08-21.md",
  "docs/release/web-v1-release-and-rollback-runbook.md",
  "docs/release/release-evidence.schema.json",
  "docs/release/deployed-pwa-evidence.schema.json",
  "docs/release/deployed-pwa-evidence-policy.v1.json",
  "docs/release/deployed-pwa-evidence-v2.schema.json",
  "docs/release/deployed-pwa-evidence-policy.v2.json",
  "docs/release/deployed-pwa-evidence-v3.schema.json",
  "docs/release/deployed-pwa-evidence-policy.v3.json",
  "docs/release/deployed-host-http-receipt-candidate-v1.schema.json",
  "docs/release/独立v13公网HTTP主机候选回执采集器-v1-2026-08-27.md",
  "docs/release/B阶段正式证据与候选回执终点复验补强-2026-08-27.md",
  "docs/release/deployed-pwa-host-provider-composition-candidate-v1.schema.json",
  "docs/release/B阶段v1候选与PWA-v3组合边界-2026-08-27.md",
  "docs/release/storage-v13-matrix-candidate-policy.v1.json",
  "docs/release/storage-v13-matrix-browser-receipt-candidate-v1.schema.json",
  "docs/release/storage-v13-matrix-candidate-policy.v2.json",
  "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json",
  "docs/release/默认v13正式仓储语义见证候选矩阵-v2-2026-08-28.md",
  "docs/release/sw-ab-update-candidate-policy.v1.json",
  "docs/release/sw-ab-update-candidate-v1.schema.json",
  "docs/release/独立SW-A到B更新候选证据机械门-v1-2026-08-27.md",
  "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
  "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
  "docs/release/PR6运行时客户端原始采集候选-v1-2026-08-27.md",
  "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
  "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
  "docs/release/PR6运行时已解码API-transcript候选边界-v1-2026-08-27.md",
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
  "docs/release/PR6采集器临时签发候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json",
  "docs/release/SW-A到B候选与运行时客户端采集组合边界-v1-2026-08-27.md",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
  "docs/release/PR6四链离线组合候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
  "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
  "docs/release/PR6运行时派生证据生产桥接候选边界-v1-2026-08-28.md",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test-fixture.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs",
  "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs",
  "docs/release/PR6生产桥接四链组合候选边界-v2-2026-08-28.md",
  "docs/release/rollback-evidence.schema.json",
  "docs/release/rollback-evidence-policy.v1.json",
  "docs/release/rollback-actor-trust-registry.v1.json",
  "docs/release/provider-deployment-receipt-candidate-v1.schema.json",
  "docs/release/provider-deployment-candidate-sequence-v1.schema.json",
  "docs/release/rollback-provider-sequence-composition-policy.v1.json",
  "docs/release/rollback-provider-sequence-composition-candidate-v1.schema.json",
  "docs/release/B阶段rollback与provider序列投影组合边界-v1-2026-08-27.md",
  "docs/release/B阶段formal-rollback-phase哈希链合同验证-v1-2026-08-27.md",
  "docs/release/B阶段正式完整恢复CAS运行时边界修复-2026-08-28.md",
  "docs/release/独立v13真实回滚证据机械门-v1-2026-08-26.md",
  "docs/release/独立v13真实HTTPS-PWA证据机械门-v1-2026-08-26.md",
  "docs/release/独立v13真实HTTPS-PWA离线语义候选门-v2-2026-08-26.md",
  "docs/release/known-restricted-blockers.v1.json",
  "apps/web/playwright.release-browser-matrix.ts",
  "apps/web/playwright.release-browser-result.ts",
  "apps/web/playwright.release-browser-strict-reporter.ts",
  "apps/web/playwright.release-backup-artifact.config.ts",
  "apps/web/playwright.release-boot-artifact.config.ts",
  "apps/web/playwright.pwa-cross-browser.config.ts",
  "apps/web/playwright.web-v1-cross-browser.config.ts",
  "apps/web/playwright.release-pwa-artifact.config.ts",
  "apps/web/playwright.release-web-v1-artifact.config.ts",
  "apps/web/playwright.sw-upgrade.config.ts",
  "apps/web/playwright.sw-two-generation-fixture-result.ts",
  "apps/web/playwright.sw-two-generation-fixture-reporter.ts",
  "apps/web/sw-two-generation-artifact-identity.ts",
  "apps/web/sw-two-generation-fixture-source-identity.ts",
  "apps/web/playwright.storage-v13-matrix-candidate.config.ts",
  "apps/web/playwright.storage-v13-matrix-candidate-global-setup.ts",
  "apps/web/playwright.storage-v13-matrix-candidate-reporter.ts",
  "apps/web/tsconfig.storage-v13-matrix-candidate.json",
  "apps/web/vite.e2e.config.ts",
  "apps/web/vite.release-artifact-preview.config.ts",
  "apps/web/e2e/cross-schema-upgrade-helpers.ts",
  "apps/web/e2e/boot-fail-closed.spec.ts",
  "apps/web/e2e/database-v8-v9-upgrade.spec.ts",
  "apps/web/e2e/database-v9-v10-upgrade.spec.ts",
  "apps/web/e2e/database-v10-v11-upgrade.spec.ts",
  "apps/web/e2e/offline-full-backup.spec.ts",
  "apps/web/e2e/full-backup-worker-capacity.spec.ts",
  "apps/web/e2e/full-backup-cross-browser.spec.ts",
  "apps/web/e2e/release-browser-persistent-context.ts",
  "apps/web/e2e/pwa-install-and-offline-cold-start.spec.ts",
  "apps/web/e2e/service-worker-two-generation.spec.ts",
  "apps/web/e2e/storage-v13-matrix-candidate.spec.ts",
  "apps/web/e2e/storage-v13-native-readonly.ts",
  "apps/web/e2e/web-v1-continuous-flow.spec.ts",
  "apps/web/src/lib/release-controller-takeover-write-fence.ts",
  "apps/web/src/lib/release-controller-takeover-write-fence.test.ts",
  "apps/web/src/lib/release-database-coordinator.test.ts",
  "apps/web/src/pages/case-library-page.tsx",
  "apps/web/src/pages/case-library-page.test.tsx",
  "apps/web/src/pwa-files.test.ts",
  "apps/web/src/sw-lifecycle.test.ts",
  "apps/web/vite.sw-upgrade.config.ts",
  "packages/backup/src/index.ts",
  "packages/storage/src/index.ts",
  "packages/backup/src/full-backup-v13-cross-connection.test.ts",
  "packages/storage/src/local-user-data.test.ts",
  "apps/web/src/lib/full-backup-worker-client.ts",
  "apps/web/src/lib/full-backup-worker-client.test.ts",
  "packages/storage/src/release-write-lock.test.ts",
  "scripts/compute-release-evidence-id.mjs",
  "scripts/deployed-pwa-evidence-lib.mjs",
  "scripts/deployed-pwa-evidence-schema.mjs",
  "scripts/deployed-pwa-evidence.test.mjs",
  "scripts/deployed-pwa-evidence-v2-lib.mjs",
  "scripts/deployed-pwa-evidence-v2-schema.mjs",
  "scripts/deployed-pwa-evidence-v2.test.mjs",
  "scripts/deployed-pwa-evidence-v3-lib.mjs",
  "scripts/deployed-pwa-evidence-v3-schema.mjs",
  "scripts/deployed-pwa-evidence-v3.test-fixture.mjs",
  "scripts/deployed-pwa-evidence-v3.test.mjs",
  "scripts/deployed-host-candidate-runtime.mjs",
  "scripts/deployed-host-candidate-runtime.test.mjs",
  "scripts/deployed-host-candidate-loader.mjs",
  "scripts/deployed-pwa-host-provider-composition.mjs",
  "scripts/deployed-pwa-host-provider-composition.test-fixture.mjs",
  "scripts/deployed-pwa-host-provider-composition.test.mjs",
  "scripts/deployed-security-headers-lib.mjs",
  "scripts/generate-release-evidence.mjs",
  "scripts/release-artifact-identity-lib.mjs",
  "scripts/release-artifact-identity.mjs",
  "scripts/release-browser-result-evidence.mjs",
  "scripts/release-evidence-lib.mjs",
  "scripts/release-evidence-schema.mjs",
  "scripts/release-evidence.test.mjs",
  "scripts/storage-v13-matrix-candidate-runtime.mjs",
  "scripts/storage-v13-matrix-candidate-runtime.d.mts",
  "scripts/storage-v13-matrix-candidate-runtime.test.mjs",
  "scripts/storage-v13-matrix-candidate-reporter.test.mjs",
  "scripts/sw-ab-update-candidate-lib.mjs",
  "scripts/sw-ab-update-candidate-schema.mjs",
  "scripts/sw-ab-update-candidate-fixture.mjs",
  "scripts/sw-ab-update-candidate.test.mjs",
  "scripts/sw-ab-update-runtime-client-capture-lib.mjs",
  "scripts/sw-ab-update-runtime-client-capture-loader.mjs",
  "scripts/sw-ab-update-runtime-client-capture-schema.mjs",
  "scripts/sw-ab-update-runtime-client-capture-probe.mjs",
  "scripts/sw-ab-update-runtime-client-capture.test.mjs",
  "scripts/sw-ab-update-runtime-api-transcript-lib.mjs",
  "scripts/sw-ab-update-runtime-api-transcript-schema.mjs",
  "scripts/sw-ab-update-runtime-api-transcript-writer.mjs",
  "scripts/sw-ab-update-runtime-api-transcript-loader.mjs",
  "scripts/sw-ab-update-runtime-api-transcript.test-fixture.mjs",
  "scripts/sw-ab-update-runtime-api-transcript.test.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance-lib.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance-schema.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance-writer.mjs",
  "scripts/sw-ab-update-runtime-collector-live-adapter.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance-loader.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance.test-fixture.mjs",
  "scripts/sw-ab-update-runtime-collector-issuance.test.mjs",
  "scripts/sw-ab-update-runtime-collector-live-adapter.test.mjs",
  "scripts/verify-sw-ab-update-runtime-collector-issuance.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-composition.test.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs",
  "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test-fixture.mjs",
  "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs",
  "scripts/run-storage-v13-matrix-candidate.mjs",
  "scripts/rollback-evidence-lib.mjs",
  "scripts/rollback-evidence-schema.mjs",
  "scripts/rollback-evidence.test.mjs",
  "scripts/provider-deployment-candidate-runtime.mjs",
  "scripts/provider-deployment-candidate-runtime.test.mjs",
  "scripts/provider-deployment-candidate-loader.mjs",
  "scripts/provider-deployment-candidate-loader.test.mjs",
  "scripts/provider-deployment-candidate-sequence-loader.mjs",
  "scripts/provider-deployment-candidate-sequence-writer.mjs",
  "scripts/provider-deployment-candidate-sequence-verifier.mjs",
  "scripts/provider-deployment-candidate-sequence.test-fixture.mjs",
  "scripts/provider-deployment-candidate-sequence-loader.test.mjs",
  "scripts/rollback-provider-sequence-composition-lib.mjs",
  "scripts/rollback-provider-sequence-composition-schema.mjs",
  "scripts/verify-rollback-provider-sequence-composition.mjs",
  "scripts/rollback-provider-sequence-composition.test-fixture.mjs",
  "scripts/rollback-provider-sequence-composition.test.mjs",
  "scripts/run-release-evidence-command.mjs",
  "scripts/run-sw-two-generation-fixture.mjs",
  "scripts/sw-two-generation-fixture-contract.test.mjs",
  "scripts/verify-built-release-storage-manifest.mjs",
  "scripts/verify-deployed-security-headers.mjs",
  "scripts/verify-deployed-security-headers.test.mjs",
  "scripts/verify-deployed-pwa-evidence.mjs",
  "scripts/verify-deployed-pwa-evidence-v2.mjs",
  "scripts/verify-deployed-pwa-evidence-v3.mjs",
  "scripts/verify-release-evidence.mjs",
  "scripts/verify-storage-v13-matrix-candidate.mjs",
  "scripts/verify-storage-v13-matrix-candidate.d.mts",
  "scripts/verify-storage-v13-matrix-candidate.test.mjs",
  "scripts/verify-sw-ab-update-candidate.mjs",
  "scripts/verify-sw-ab-update-runtime-client-capture.mjs",
  "scripts/verify-sw-ab-update-runtime-api-transcript.mjs",
  "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs",
  "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs",
  "scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs",
  "scripts/verify-rollback-evidence.mjs",
  "scripts/verify-release-governance.test.mjs",
  "docs/release/SW两代本地夹具证据边界-v1-2026-08-26.md",
  "docs/release/SW两代本地夹具证据边界-v2-2026-08-27.md",
  "docs/release/B阶段同Schema控制器接管写栅栏本地实现证据-2026-08-27.md"
]);

const RELEASE_BROWSER_CONFIG_KEYS = Object.freeze([
  "testDir",
  "testMatch",
  "outputDir",
  "timeout",
  "expect",
  "fullyParallel",
  "forbidOnly",
  "workers",
  "reporter",
  "use",
  "projects",
  "webServer"
]);
const RELEASE_BROWSER_PROJECT_KEYS = Object.freeze(["name", "metadata", "use"]);
const RELEASE_BROWSER_PROJECT_METADATA_KEYS = Object.freeze([
  "releaseBrowserId",
  "browserChannel",
  "releaseIdentity"
]);
const RELEASE_BROWSER_PROJECT_USE_KEYS = Object.freeze([
  "viewport",
  "screen",
  "deviceScaleFactor",
  "isMobile",
  "hasTouch",
  "channel"
]);
const RELEASE_BROWSER_ROOT_USE_KEYS = Object.freeze([
  "baseURL",
  "acceptDownloads",
  "serviceWorkers",
  "trace",
  "screenshot",
  "video"
]);
const RELEASE_BROWSER_WEB_SERVER_KEYS = Object.freeze([
  "command",
  "url",
  "reuseExistingServer",
  "timeout",
  "stdout",
  "stderr"
]);
const moduleWorkspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER = Object.freeze([
  "governance",
  "evidence-tooling",
  "typecheck",
  "unit",
  "build",
  "boot",
  "backup",
  "pwa",
  "web-v1-flow",
  "cross-schema-v13-v16",
  "orphaned-v13-recovery",
  "artifact-stability",
  "built-contract"
]);
export const REQUIRED_DEFAULT_V13_RECEIPT_COMMANDS = Object.freeze({
  backup: Object.freeze(["npm", "run", "test:release:backup-artifact"]),
  "artifact-stability": Object.freeze([
    "node",
    "scripts/release-artifact-identity.mjs",
    "--verify",
    "--dist",
    "dist/web",
    "--lock",
    "tmp/release-artifact-identity.json"
  ]),
  boot: Object.freeze(["npm", "run", "test:release:boot-artifact"]),
  build: Object.freeze(["npm", "run", "build"]),
  "built-contract": Object.freeze(["npm", "run", "verify:built-release-storage-manifest"]),
  "cross-schema-v13-v16": Object.freeze(["npm", "run", "test:e2e:cross-schema-v13-v16"]),
  "evidence-tooling": Object.freeze(["npm", "run", "test:release-evidence"]),
  governance: Object.freeze(["npm", "run", "check:release-governance"]),
  "orphaned-v13-recovery": Object.freeze(["npm", "run", "test:e2e:orphaned-v13-recovery"]),
  pwa: Object.freeze(["npm", "run", "test:release:pwa-artifact"]),
  typecheck: Object.freeze(["npm", "run", "typecheck"]),
  unit: Object.freeze(["npm", "test"]),
  "web-v1-flow": Object.freeze(["npm", "run", "test:release:web-v1-artifact"])
});
export const REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256 =
  "011ab7a7220451856bc558ee73054a329268d4efb63bf921d2fa27b8d1d47cd1";

function leadingSpaces(line) {
  return line.length - line.trimStart().length;
}

function exactKeys(value, expectedKeys) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expectedKeys].sort());
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sourceSha256(source) {
  return typeof source === "string"
    ? sha256(source.replace(/\r\n?/gu, "\n"))
    : null;
}

function delimitedSourceSha256(source, startMarker, endMarker) {
  if (typeof source !== "string") return null;
  const normalized = source.replace(/\r\n?/gu, "\n");
  const start = normalized.indexOf(startMarker);
  const end = normalized.indexOf(endMarker, start + startMarker.length);
  if (
    start < 0
    || end < 0
    || normalized.indexOf(startMarker, start + startMarker.length) !== -1
    || normalized.indexOf(endMarker, end + endMarker.length) !== -1
  ) return null;
  return sha256(normalized.slice(start, end + endMarker.length));
}

export function verifyHostingDecisionPolicyGovernance(
  hostingDecision,
  securityPolicy,
  auditedPlatformIds = AUDITED_HOSTING_PLATFORM_IDS
) {
  if (!exactKeys(hostingDecision, [
    "platform",
    "publicDeploymentAuthorized",
    "securityHeadersVerified"
  ])) {
    throw new Error("Hosting decision keys are not exact.");
  }
  validateHostingSecurityPolicy(securityPolicy);
  if (!Array.isArray(auditedPlatformIds)
    || auditedPlatformIds.some((platformId) =>
      typeof platformId !== "string" || platformId.trim() !== platformId
      || platformId.length === 0 || platformId === "unselected"
    )
    || new Set(auditedPlatformIds).size !== auditedPlatformIds.length) {
    throw new Error("Audited hosting platform profile allowlist is invalid.");
  }
  if (hostingDecision.platform !== securityPolicy.deploymentPlatform) {
    throw new Error("Hosting decision platform does not match the mechanical hosting policy.");
  }
  if (hostingDecision.securityHeadersVerified
    !== securityPolicy.publicReleaseGate.realHostHeadersVerified) {
    throw new Error("Hosting header verification ledgers have diverged.");
  }
  if (hostingDecision.publicDeploymentAuthorized !== false) {
    throw new Error("Engineering hosting evidence cannot authorize public deployment.");
  }
  if (securityPolicy.publicReleaseGate.cspBlockingModeVerified === true
    && securityPolicy.cspEnforcementStatus !== "blocking_header_candidate") {
    throw new Error("Blocking CSP cannot be verified while the policy remains report-only.");
  }
  if (hostingDecision.platform === "unselected") {
    if (securityPolicy.canonicalOrigin !== null
      || securityPolicy.cspEnforcementStatus !== "report_only_until_real_host_validation"
      || securityPolicy.publicReleaseGate.realHostHeadersVerified !== false
      || securityPolicy.publicReleaseGate.cspBlockingModeVerified !== false
      || securityPolicy.redirectRules.length !== 0) {
      throw new Error("Unselected hosting must remain origin-free, report-only, unverified, and without redirect claims.");
    }
    return Object.freeze({
      platform: "unselected",
      auditedPlatformProfile: null,
      securityHeadersVerified: false,
      publicDeploymentAuthorized: false
    });
  }
  if (!auditedPlatformIds.includes(hostingDecision.platform)) {
    throw new Error("Selected hosting platform has no audited platform profile.");
  }
  return Object.freeze({
    platform: hostingDecision.platform,
    auditedPlatformProfile: hostingDecision.platform,
    securityHeadersVerified: hostingDecision.securityHeadersVerified,
    publicDeploymentAuthorized: false
  });
}

export function verifyHostingCspGovernance(policy) {
  validateHostingSecurityPolicy(policy);
  const headerName = policy.cspEnforcementStatus === "report_only_until_real_host_validation"
    ? "Content-Security-Policy-Report-Only"
    : policy.cspEnforcementStatus === "blocking_header_candidate"
      ? "Content-Security-Policy"
      : null;
  if (headerName === null) throw new Error("Hosting CSP enforcement status is unsupported.");
  const csp = policy.headers[headerName];
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "script-src 'self'",
    "worker-src 'self' blob:"
  ]) {
    if (!csp?.includes(directive)) throw new Error(`Hosting CSP is missing ${directive}.`);
  }
  if (csp.includes("unsafe-eval") || /https?:\/\//u.test(csp)) {
    throw new Error("Hosting CSP weakens the local-first boundary.");
  }
  return Object.freeze({
    headerName,
    cspEnforcementStatus: policy.cspEnforcementStatus
  });
}

export function verifyHostingHeadersSource(policy, source) {
  if (typeof source !== "string" || source.trim().length === 0) {
    throw new Error("Hosting _headers source is empty.");
  }
  const routes = new Map();
  let currentRoute = null;
  for (const [index, line] of source.split(/\r?\n/u).entries()) {
    if (line.trim().length === 0) continue;
    if (!/^\s/u.test(line)) {
      const route = line.trim();
      if (!route.startsWith("/") || routes.has(route)) {
        throw new Error(`Hosting _headers route is invalid or duplicated at line ${index + 1}.`);
      }
      currentRoute = route;
      routes.set(route, new Map());
      continue;
    }
    if (currentRoute === null) {
      throw new Error(`Hosting _headers header has no route at line ${index + 1}.`);
    }
    const match = line.match(/^\s+([^:\s][^:]*):\s*(.*?)\s*$/u);
    if (!match || match[2].length === 0) {
      throw new Error(`Hosting _headers entry is malformed at line ${index + 1}.`);
    }
    const name = match[1].trim().toLowerCase();
    const routeHeaders = routes.get(currentRoute);
    if (routeHeaders.has(name)) {
      throw new Error(`Hosting _headers duplicates ${match[1].trim()} on ${currentRoute}.`);
    }
    routeHeaders.set(name, match[2]);
  }

  const expectedRoutes = Object.keys(policy?.cacheRules ?? {}).sort();
  if (!sameJson([...routes.keys()].sort(), expectedRoutes)) {
    throw new Error("Hosting _headers route set does not exactly match cache policy.");
  }
  const globalHeaders = routes.get("/*");
  if (!globalHeaders) throw new Error("Hosting _headers is missing the global /* route.");
  const expectedGlobal = new Map(
    Object.entries(policy.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])
  );
  expectedGlobal.set("cache-control", policy.cacheRules["/*"]);
  if (globalHeaders.size !== expectedGlobal.size) {
    throw new Error("Hosting _headers global header set is not exact.");
  }
  for (const [name, expected] of expectedGlobal) {
    if (globalHeaders.get(name) !== expected) {
      throw new Error(`Hosting _headers global ${name} does not match policy.`);
    }
  }
  for (const [route, expected] of Object.entries(policy.cacheRules)) {
    const routeHeaders = routes.get(route);
    const expectedSize = route === "/*" ? expectedGlobal.size : 1;
    if (routeHeaders?.size !== expectedSize || routeHeaders.get("cache-control") !== expected) {
      throw new Error(`Hosting _headers does not exactly implement cache rule ${route}.`);
    }
  }
  return Object.freeze({ routeCount: routes.size, globalHeaderCount: globalHeaders.size });
}

export function verifyReleaseBrowserPlaywrightConfig(
  config,
  { receiptId, testMatch, outputDirectoryName, timeout, expectedTestsPerProject }
) {
  if (!exactKeys(config, RELEASE_BROWSER_CONFIG_KEYS)) {
    throw new Error(`Release browser config shape mismatch: ${receiptId}.`);
  }
  if (
    config.testDir !== "./e2e"
    || !sameJson(config.testMatch, testMatch)
    || config.outputDir !== path.join(os.tmpdir(), outputDirectoryName)
    || config.timeout !== timeout
    || !sameJson(config.expect, { timeout: 15_000 })
    || config.fullyParallel !== false
    || config.forbidOnly !== true
    || config.workers !== 1
  ) {
    throw new Error(`Release browser config execution policy mismatch: ${receiptId}.`);
  }
  if (
    !Array.isArray(config.reporter)
    || config.reporter.length !== 2
    || !sameJson(config.reporter[0], ["line"])
    || !Array.isArray(config.reporter[1])
    || config.reporter[1].length !== 2
    || config.reporter[1][0] !== path.join(
      moduleWorkspaceRoot,
      "apps/web/playwright.release-browser-strict-reporter.ts"
    )
    || !sameJson(config.reporter[1][1], { receiptId, expectedTestsPerProject })
  ) {
    throw new Error(`Release browser strict reporter mismatch: ${receiptId}.`);
  }
  if (
    !exactKeys(config.use, RELEASE_BROWSER_ROOT_USE_KEYS)
    || !sameJson(config.use, {
      baseURL: "http://127.0.0.1:4197",
      acceptDownloads: true,
      serviceWorkers: "allow",
      trace: "retain-on-failure",
      screenshot: "only-on-failure",
      video: "off"
    })
  ) {
    throw new Error(`Release browser root context policy mismatch: ${receiptId}.`);
  }
  if (
    !exactKeys(config.webServer, RELEASE_BROWSER_WEB_SERVER_KEYS)
    || !sameJson(config.webServer, {
      command: "npm run preview:release-artifact --workspace @hakimi/web",
      url: "http://127.0.0.1:4197/",
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe"
    })
  ) {
    throw new Error(`Release browser webServer policy mismatch: ${receiptId}.`);
  }
  if (!Array.isArray(config.projects) || config.projects.length !== RELEASE_BROWSER_MATRIX.length) {
    throw new Error(`Release browser project count mismatch: ${receiptId}.`);
  }
  for (let index = 0; index < RELEASE_BROWSER_MATRIX.length; index += 1) {
    const browser = RELEASE_BROWSER_MATRIX[index];
    const project = config.projects[index];
    if (
      !exactKeys(project, RELEASE_BROWSER_PROJECT_KEYS)
      || project.name !== browser.projectName
      || !exactKeys(project.metadata, RELEASE_BROWSER_PROJECT_METADATA_KEYS)
      || !sameJson(project.metadata, {
        releaseBrowserId: browser.policyId,
        browserChannel: browser.channel,
        releaseIdentity: DEFAULT_V13_RELEASE_BROWSER_IDENTITY
      })
      || !exactKeys(project.use, RELEASE_BROWSER_PROJECT_USE_KEYS)
      || !sameJson(project.use, {
        ...releaseBrowserNativeDeviceOptions(browser),
        channel: browser.channel
      })
    ) {
      throw new Error(`Release browser project policy mismatch: ${receiptId}/${browser.projectName}.`);
    }
  }
}

function unquoteYamlScalar(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) return value.slice(1, -1);
  return value;
}

function migrationPullRequestPaths(workflow) {
  const lines = workflow.split(/\r?\n/u);
  const pullRequestIndex = lines.findIndex((line) => /^\s{2}pull_request:\s*(?:#.*)?$/u.test(line));
  if (pullRequestIndex < 0) throw new Error("Migration CI must define an explicit pull_request trigger.");

  let pathsIndex = -1;
  for (let index = pullRequestIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() && leadingSpaces(line) <= 2) break;
    if (/^\s{4}paths:\s*(?:#.*)?$/u.test(line)) {
      pathsIndex = index;
      break;
    }
  }
  if (pathsIndex < 0) throw new Error("Migration CI pull_request trigger must define paths.");

  const paths = [];
  for (let index = pathsIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/u.test(line)) continue;
    if (leadingSpaces(line) <= 4) break;
    const item = line.match(/^\s{6}-\s+(.+?)\s*$/u);
    if (!item) continue;
    const scalar = item[1].replace(/\s+#.*$/u, "").trim();
    paths.push(unquoteYamlScalar(scalar));
  }
  return paths;
}

function migrationRunCommands(workflow) {
  const lines = workflow.split(/\r?\n/u);
  const commands = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(?:-\s+)?run:\s*(.*?)\s*$/u);
    if (!match) continue;
    const indentation = match[1].length;
    const scalar = match[2];
    if (!/^[>|][+-]?$/u.test(scalar)) {
      if (scalar.length > 0) commands.push(unquoteYamlScalar(scalar));
      continue;
    }
    const block = [];
    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1];
      if (nextLine.trim().length === 0) {
        block.push("");
        index += 1;
        continue;
      }
      const nextIndentation = nextLine.match(/^\s*/u)[0].length;
      if (nextIndentation <= indentation) break;
      block.push(nextLine.slice(indentation + 1).trimStart());
      index += 1;
    }
    commands.push(scalar.startsWith(">") ? block.join(" ") : block.join("\n"));
  }
  return commands;
}

export function verifyMigrationWorkflowGovernance(migrationWorkflow) {
  const commands = new Set(migrationRunCommands(migrationWorkflow));
  for (const command of REQUIRED_MIGRATION_WORKFLOW_COMMANDS) {
    if (!commands.has(command)) throw new Error(`Migration CI is missing ${command}.`);
  }

  const pullRequestPaths = new Set(migrationPullRequestPaths(migrationWorkflow));
  for (const requiredPath of REQUIRED_MIGRATION_WORKFLOW_PATHS) {
    if (!pullRequestPaths.has(requiredPath)) {
      throw new Error(`Migration CI pull_request.paths is missing ${requiredPath}.`);
    }
  }
}

function workflowJobBlock(workflow, jobId) {
  const lines = workflow.split(/\r?\n/u);
  const start = lines.findIndex((line) => line === `  ${jobId}:`);
  if (start < 0) throw new Error(`Quick CI is missing job ${jobId}.`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s{2}[A-Za-z0-9_-]+:\s*(?:#.*)?$/u.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end);
}

function workflowJobNeeds(block) {
  const inline = block.find((line) => /^\s{4}needs:\s+\S/u.test(line));
  if (inline) return [unquoteYamlScalar(inline.replace(/^\s{4}needs:\s+/u, "").trim())];
  const needsIndex = block.findIndex((line) => /^\s{4}needs:\s*(?:#.*)?$/u.test(line));
  if (needsIndex < 0) return [];
  const needs = [];
  for (let index = needsIndex + 1; index < block.length; index += 1) {
    const line = block[index];
    if (!line.trim() || /^\s*#/u.test(line)) continue;
    if (leadingSpaces(line) <= 4) break;
    const item = line.match(/^\s{6}-\s+([A-Za-z0-9_-]+)\s*$/u);
    if (item) needs.push(item[1]);
  }
  return needs;
}

function exactTrimmedLineCount(lines, exactLine) {
  return lines.filter((line) => line.trim() === exactLine).length;
}

function workflowRunCommandCount(lines, command) {
  return lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed === `run: ${command}` || trimmed === `- run: ${command}`;
  }).length;
}

export function verifyQuickCiGovernance(quickWorkflow, packageJson) {
  const workflowLines = quickWorkflow.split(/\r?\n/u);
  const blocks = Object.fromEntries(
    REQUIRED_QUICK_CI_JOBS.map((jobId) => [jobId, workflowJobBlock(quickWorkflow, jobId)])
  );
  for (const [jobId, block] of Object.entries(blocks)) {
    if (block.some((line) => /^\s*continue-on-error:\s*true\s*$/u.test(line))) {
      throw new Error(`Quick CI job ${jobId} cannot continue on error.`);
    }
  }
  for (const jobId of REQUIRED_QUICK_CI_INDEPENDENT_JOBS) {
    if (workflowJobNeeds(blocks[jobId]).length !== 0) {
      throw new Error(`Quick CI evidence job ${jobId} must remain independently runnable.`);
    }
  }
  if (!sameJson(workflowJobNeeds(blocks["artifact-manifest-verification"]), ["default-v13-web-build"])) {
    throw new Error("Quick CI artifact verification must depend only on the exact default v13 build.");
  }
  const aggregateNeeds = REQUIRED_QUICK_CI_JOBS.filter((jobId) => jobId !== "release-gate-aggregate");
  if (!sameJson(workflowJobNeeds(blocks["release-gate-aggregate"]), aggregateNeeds)) {
    throw new Error("Quick CI aggregate gate must require every evidence job.");
  }

  for (const [jobId, commands] of Object.entries(REQUIRED_QUICK_CI_COMMANDS)) {
    for (const command of commands) {
      if (workflowRunCommandCount(blocks[jobId], command) !== 1) {
        throw new Error(`Quick CI job ${jobId} must run exactly once: ${command}.`);
      }
    }
  }
  const independentlyPinnedGovernanceJobs = [
    "ci-contracts",
    "node-release-evidence",
    "node-package-artifacts",
    "bazi-current-semantics",
    "history-checkpoint-governance",
    "current-index-governance"
  ];
  for (const jobId of independentlyPinnedGovernanceJobs) {
    const block = blocks[jobId];
    for (const exactLine of [
      "uses: actions/checkout@v5",
      "uses: actions/setup-node@v5",
      "node-version-file: .node-version",
      "cache: npm"
    ]) {
      if (exactTrimmedLineCount(block, exactLine) !== 1) {
        throw new Error(
          `Quick CI job ${jobId} must independently pin its setup exactly once: ${exactLine}.`
        );
      }
    }
    for (const setupCommand of ["npm install --global npm@11.13.0", "npm ci"]) {
      if (workflowRunCommandCount(block, setupCommand) !== 1) {
        throw new Error(
          `Quick CI job ${jobId} must run its independent setup exactly once: ${setupCommand}.`
        );
      }
    }
    for (const command of REQUIRED_QUICK_CI_COMMANDS[jobId]) {
      if (workflowRunCommandCount(workflowLines, command) !== 1
        || workflowRunCommandCount(blocks["toolchain-and-boundaries"], command) !== 0) {
        throw new Error(
          `Quick CI governance evidence command must appear exactly once and only in ${jobId}: ${command}.`
        );
      }
    }
  }
  if (packageJson.scripts?.typecheck !== "node scripts/run-diagnostic-stage.mjs lifecycle typecheck"
    || packageJson.scripts?.pretypecheck !== undefined
    || packageJson.scripts?.posttypecheck !== undefined) {
    throw new Error("Full workspace typecheck command must not exclude or suppress production files.");
  }
  const baziSemanticBlock = blocks["bazi-current-semantics"];
  for (const [jobId, scriptName, group] of [
    ["ci-contracts", "test:ci-contracts", "ci-contracts"],
    ["node-release-evidence", "test:node-release-evidence", "release-evidence"],
    ["node-package-artifacts", "test:node-package-artifacts", "package-artifacts"]
  ]) {
    if (packageJson.scripts?.[scriptName] !== `node scripts/run-node-test-group.mjs ${group}`
      || packageJson.scripts?.[`pre${scriptName}`] || packageJson.scripts?.[`post${scriptName}`]) {
      throw new Error(`Node group must execute its whole registered group without hidden lifecycle prerequisites: ${group}.`);
    }
    for (const line of ["if: ${{ always() }}", "uses: actions/upload-artifact@v4",
      "path: test-results/node-groups/", "if-no-files-found: error"]) {
      if (exactTrimmedLineCount(blocks[jobId], line) !== 1) {
        throw new Error(`Node group ${group} must preserve execution identities and failures: ${line}.`);
      }
    }
  }
  if (exactTrimmedLineCount(baziSemanticBlock, "id: install") !== 1
    || exactTrimmedLineCount(baziSemanticBlock,
      "if: ${{ !cancelled() && steps.install.outcome == 'success' }}") !== 2) {
    throw new Error("Both Bazi semantic checks must report after dependency setup even when the other check fails.");
  }
  // Default Bazi checks inventory identity; independent eligibility remains a separate strict command.
  for (const [name, command] of [
    ["check:independent-source-inventory", "node scripts/verify-current-independent-source-inventory.mjs"],
    ["check:independent-domain-inventory", "node scripts/verify-current-independent-domain-inventory.mjs"],
    ["check:independent-source-binding-requirements", "node scripts/verify-current-independent-source-requirements.mjs"],
    ["check:independent-domain-release-manifests", "node scripts/verify-current-independent-domain-manifests.mjs"]
  ]) {
    if (packageJson.scripts?.[name] !== command
      || packageJson.scripts?.[`pre${name}`] || packageJson.scripts?.[`post${name}`]) {
      throw new Error(`Independent inventory and strict current commands must retain their separate fixed scopes: ${name}.`);
    }
  }
  const boundaryCommands = packageJson.scripts?.["check:current-boundaries"]?.split(" && ");
  const explicitCiCommands = new Set(Object.values(REQUIRED_QUICK_CI_COMMANDS).flat());
  if (!boundaryCommands?.length || boundaryCommands.some((command) => !explicitCiCommands.has(command))) {
    throw new Error("Quick CI must explicitly retain every current-boundaries obligation when program diagnostics are independent.");
  }
  for (const stage of ["typecheck", "vitest", "build"]) {
    const name = `diagnose:${stage}`;
    if (packageJson.scripts?.[name] !== `node scripts/run-diagnostic-stage.mjs ${stage}`
      || packageJson.scripts?.[`pre${name}`] || packageJson.scripts?.[`post${name}`]) {
      throw new Error(`Diagnostic stage must use its explicit restricted-graph guard without lifecycle coupling: ${name}.`);
    }
  }
  if (quickWorkflow.includes("--ignore-scripts")) {
    throw new Error("Quick CI must use explicit diagnostic stages, not disable lifecycle scripts.");
  }

  const artifactName = "quick-ci-default-v13-${{ github.run_id }}-${{ github.run_attempt }}";
  if (exactTrimmedLineCount(quickWorkflow.split(/\r?\n/u), `name: ${artifactName}`) !== 2
    || exactTrimmedLineCount(blocks["default-v13-web-build"], "path: dist/web") !== 1
    || exactTrimmedLineCount(blocks["artifact-manifest-verification"], "path: dist/web") !== 1
    || !blocks["default-v13-web-build"].some((line) => line.includes("uses: actions/upload-artifact@v4"))
    || !blocks["artifact-manifest-verification"].some((line) => line.includes("uses: actions/download-artifact@v4"))
    || workflowRunCommandCount(blocks["artifact-manifest-verification"], "npm run build") !== 0) {
    throw new Error("Quick CI must upload, download and verify the same default v13 artifact without rebuilding it.");
  }

  const aggregateBlock = blocks["release-gate-aggregate"];
  const aggregate = aggregateBlock.join("\n");
  if (!aggregate.includes("    if: ${{ always() }}")
    || !aggregate.includes("if [ \"$gate_result\" != \"success\" ]; then")
    || !aggregate.includes("exit 1")) {
    throw new Error("Quick CI aggregate gate must run always and fail closed on every non-success result.");
  }
  for (const jobId of aggregateNeeds) {
    const resultEnv = jobId.toUpperCase().replaceAll("-", "_");
    const resultBinding = `${resultEnv}: \${{ needs.${jobId}.result }}`;
    const loopEntry = `"${jobId}=$${resultEnv}"`;
    const loopEntryCount = aggregateBlock.filter((line) => {
      const trimmed = line.trim();
      return trimmed === loopEntry || trimmed === `${loopEntry} \\`;
    }).length;
    if (exactTrimmedLineCount(aggregateBlock, resultBinding) !== 1) {
      throw new Error(`Quick CI aggregate gate must bind the exact result environment for ${jobId}.`);
    }
    if (loopEntryCount !== 1) {
      throw new Error(`Quick CI aggregate gate failure loop must inspect ${jobId}.`);
    }
  }
  const rawWorkflowBytes = Buffer.from(quickWorkflow, "utf8");
  if (rawWorkflowBytes.byteLength !== REQUIRED_QUICK_CI_WORKFLOW_BYTES
    || sha256(rawWorkflowBytes) !== REQUIRED_QUICK_CI_WORKFLOW_SHA256) {
    throw new Error("Quick CI reviewed raw workflow identity drifted.");
  }
}

export function verifyKnownRestrictedBlockerRegistry(registry) {
  if (!exactKeys(registry, [
    "schemaVersion", "recordType", "updatedAt", "releaseGovernance", "blockers",
    "quickCiObservability", "currentEvidenceLedger", "doesNotEstablish"
  ]) || registry.schemaVersion !== "1.0.0"
    || registry.recordType !== "known_restricted_blocker_registry"
    || Number.isNaN(Date.parse(registry.updatedAt))) {
    throw new Error("Known restricted blocker registry identity is invalid.");
  }
  if (!sameJson(registry.releaseGovernance, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundary: "preserved",
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  })) throw new Error("Known restricted blocker registry cannot change release governance.");
  if (!Array.isArray(registry.blockers) || registry.blockers.length !== 1) {
    throw new Error("Known restricted blocker registry must contain exactly the declared blocker.");
  }
  const blocker = registry.blockers[0];
  if (!exactKeys(blocker, [
    "blockerId", "status", "affectedGates", "aggregateImpact", "restrictedPaths",
    "previouslyRestrictedPaths", "authorization", "allowedActions", "forbiddenActions", "observation"
  ]) || blocker.blockerId !== "known-restricted-full-workspace-typecheck/1"
    || blocker.status !== "source-access-authorized"
    || !sameJson(blocker.affectedGates, ["full-workspace-typecheck"])
    || !sameJson(blocker.aggregateImpact, ["default-legacy-v13-aggregate-gate"])
    || !sameJson(blocker.restrictedPaths, [])
    || !sameJson(blocker.previouslyRestrictedPaths, ["apps/web/src/lib/local-user-data-cleanup.ts"])
    || !sameJson(blocker.allowedActions, [
      "record_status", "improve_ci_observability", "read_source", "necessary_source_fix",
      "full_typecheck", "full_vitest", "full_build", "isolated_browser_validation"
    ])
    || !sameJson(blocker.forbiddenActions, [
      "exclude_from_typecheck", "suppress_error", "xfail"
    ])) {
    throw new Error("Known restricted blocker boundary has drifted.");
  }
  if (!sameJson(blocker.authorization, {
    source: "explicit_user_instruction",
    recordedAt: "2026-09-05T07:37:37.000Z",
    scope: ["read_source", "necessary_source_fix", "full_typecheck", "full_vitest", "full_build", "isolated_browser_validation"],
    doesNotAuthorize: ["expert_claims", "source_rights_admission", "public_deployment"]
  })) throw new Error("Known source access authorization must retain the explicit user scope without granting release authority.");
  if (!sameJson(blocker.observation, {
    state: "prior_quick_ci_failure_reported_not_reverified_in_this_registry",
    source: "user_supplied_handoff_and_second_round_audit",
    observedAt: null,
    gitSha: null,
    sourceReadOrBugInferencePerformed: false
  })) throw new Error("Known restricted blocker observation must not invent source details or a current Git identity.");

  if (!sameJson(registry.quickCiObservability, {
    workflow: ".github/workflows/quick-ci.yml",
    parallelEvidenceJobs: REQUIRED_QUICK_CI_INDEPENDENT_JOBS,
    artifactVerificationDependsOnlyOn: ["default-v13-web-build"],
    aggregateGate: "release-gate-aggregate",
    aggregateFailClosed: true,
    parallelJobsDoNotDependOnFullTypecheck: true
  })) throw new Error("Known restricted blocker Quick CI observability statement has drifted.");
  if (!sameJson(registry.currentEvidenceLedger, {
    fullWorkspaceTypecheck: "failed_known_restricted_prior_run",
    currentCommitFullVitest: "not_established_by_this_registry",
    currentCommitDefaultBuild: "not_established_by_this_registry",
    currentCommitArtifactManifest: "not_established_by_this_registry",
    completeReleaseEvidence: "not_established"
  })) throw new Error("Known restricted blocker evidence ledger cannot promote unobserved gates.");
  if (!sameJson(registry.doesNotEstablish, [
    "restricted_source_contents",
    "restricted_source_root_cause",
    "current_commit_full_vitest_result",
    "current_commit_default_build_result",
    "current_commit_artifact_manifest_result",
    "release_readiness",
    "public_release_authorization"
  ])) throw new Error("Known restricted blocker non-claims have drifted.");
}

function normalizedDocumentCommandLine(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("- run: ")) return trimmed.slice("- run: ".length);
  if (trimmed.startsWith("run: ")) return trimmed.slice("run: ".length);
  return trimmed;
}

function releaseReceiptTuples(document, documentLabel) {
  const runnerPrefix = "node scripts/run-release-evidence-command.mjs ";
  const tuples = [];
  for (const line of document.split(/\r?\n/u)) {
    const commandLine = normalizedDocumentCommandLine(line);
    if (!commandLine.startsWith(runnerPrefix)) continue;
    const match = commandLine.match(
      /^node scripts\/run-release-evidence-command\.mjs --id ([a-z0-9][a-z0-9-]*) --output \S+ -- (.+)$/u
    );
    if (!match) throw new Error(`${documentLabel} contains a malformed release receipt invocation.`);
    tuples.push(Object.freeze({ id: match[1], command: match[2] }));
  }
  return tuples;
}

export function verifyReleaseBrowserInstallPrerequisite(document, documentLabel) {
  const commandLines = document
    .split(/\r?\n/u)
    .map(normalizedDocumentCommandLine);
  const installIndexes = commandLines
    .map((commandLine, index) => commandLine === REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND ? index : -1)
    .filter((index) => index >= 0);
  if (installIndexes.length !== 1) {
    throw new Error(`${documentLabel} must contain exactly one branded browser install prerequisite.`);
  }
  const firstBrowserReceiptIndex = commandLines.findIndex((commandLine) =>
    commandLine.startsWith("node scripts/run-release-evidence-command.mjs --id boot ")
  );
  if (firstBrowserReceiptIndex < 0 || installIndexes[0] > firstBrowserReceiptIndex) {
    throw new Error(`${documentLabel} must install branded browsers before browser receipts.`);
  }
}

export function verifyDefaultV13ReceiptCommandAllowlist(requiredReceiptCommands) {
  if (!sameJson(requiredReceiptCommands, REQUIRED_DEFAULT_V13_RECEIPT_COMMANDS)) {
    throw new Error("Default v13 receipt commands do not match the exact audited allowlist.");
  }
  return requiredReceiptCommands;
}

const DEPLOYED_PWA_VERSIONED_CANDIDATE_PATTERN =
  /(?:^|[^a-z0-9])(?:hpwa[23]|pwa[-_ ]v[23]|deployed[-_ ]pwa[-_ ]evidence(?:[-_ /]v)[23])(?:[^a-z0-9]|$)/u;
const NPM_RUN_ALIAS_PATTERN = /\bnpm(?:\.cmd)?\s+run\s+(?:--(?:if-present|silent)\s+)*([a-z0-9:_-]+)\b/giu;

function referencedNpmScripts(commandText) {
  return [...commandText.matchAll(NPM_RUN_ALIAS_PATTERN)].map((match) => match[1]);
}

function deployedPwaCandidateAliasError(receiptId) {
  return new Error(
    "Deployed-PWA v2/v3 candidate tooling must remain outside formal pre-deployment "
      + `receipts, including direct and indirect package-script aliases: ${receiptId}.`
  );
}

function assertNoDeployedPwaCandidateScriptAlias({
  packageScripts,
  receiptId,
  scriptName,
  visited
}) {
  if (visited.has(scriptName)) return;
  visited.add(scriptName);
  if (DEPLOYED_PWA_VERSIONED_CANDIDATE_PATTERN.test(scriptName.toLowerCase())) {
    throw deployedPwaCandidateAliasError(receiptId);
  }
  const scriptCommand = packageScripts?.[scriptName];
  if (typeof scriptCommand !== "string") return;
  if (DEPLOYED_PWA_VERSIONED_CANDIDATE_PATTERN.test(scriptCommand.toLowerCase())) {
    throw deployedPwaCandidateAliasError(receiptId);
  }
  for (const referencedScript of referencedNpmScripts(scriptCommand)) {
    assertNoDeployedPwaCandidateScriptAlias({
      packageScripts,
      receiptId,
      scriptName: referencedScript,
      visited
    });
  }
}

export function verifyDeployedPwaCandidateReceiptIsolation(predeploymentReceipts, packageJson) {
  if (!predeploymentReceipts
    || typeof predeploymentReceipts !== "object"
    || Array.isArray(predeploymentReceipts)) {
    throw new Error("Default v13 pre-deployment receipt policy is missing.");
  }
  for (const [receiptId, command] of Object.entries(predeploymentReceipts)) {
    if (!Array.isArray(command) || command.some((part) => typeof part !== "string")) {
      throw new Error(`Default v13 pre-deployment receipt command is malformed: ${receiptId}.`);
    }
    const isCanonicalEvidenceToolingReceipt = receiptId === "evidence-tooling"
      && sameJson(command, REQUIRED_DEFAULT_V13_RECEIPT_COMMANDS["evidence-tooling"])
      && packageJson.scripts?.["test:release-evidence"] === REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND;
    if (isCanonicalEvidenceToolingReceipt) continue;

    const receiptCommandText = [receiptId, ...command].join(" ").toLowerCase();
    if (DEPLOYED_PWA_VERSIONED_CANDIDATE_PATTERN.test(receiptCommandText)) {
      throw deployedPwaCandidateAliasError(receiptId);
    }
    for (const referencedScript of referencedNpmScripts(receiptCommandText)) {
      assertNoDeployedPwaCandidateScriptAlias({
        packageScripts: packageJson.scripts,
        receiptId,
        scriptName: referencedScript,
        visited: new Set()
      });
    }
  }
  return predeploymentReceipts;
}

const STORAGE_V13_MATRIX_CANDIDATE_PATTERN =
  /(?:storage[-_ ]v13[-_ ]matrix(?:[-_ ]candidate)?|storage[-_ ]v13[-_ ]native[-_ ]readonly|storage_v13_browser_matrix_receipt_candidate_v[12]|hakimi_storage_v13_matrix)/iu;
const SW_AB_UPDATE_CANDIDATE_PATTERN =
  /(?:sw[-_ ]a[-_ ]?b[-_ ]update(?:[-_ ]candidate)?|sw_ab_update_candidate_v1|hakimi[-_ ]sw[-_ ]ab|swabrc1)/iu;
const SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PATTERN =
  /(?:sw[-_ ]ab[-_ ]update[-_ ]runtime[-_ ]derived[-_ ]evidence[-_ ]producer[-_ ]bridge|sw_ab_update_runtime_derived_evidence_producer_bridge|swabpb1)/iu;
const SW_AB_PRODUCER_BRIDGE_COMPOSITION_PATTERN =
  /(?:sw[-_ ]ab[-_ ]update[-_ ]candidate[-_ ]runtime[-_ ]client[-_ ]capture[-_ ]collector[-_ ]issuance[-_ ]producer[-_ ]bridge[-_ ]composition|sw_ab_update_candidate_runtime_client_capture_collector_issuance_producer_bridge_composition|swab4pb2)/iu;
const DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_CANDIDATE_PATTERN =
  /(?:deployed[-_ ]pwa[-_ ]host[-_ ]provider[-_ ]composition(?:[-_ ]candidate)?|host[-_ ]provider[-_ ]composition(?:[-_ ]candidate)?|hakimi_deployed_pwa_host_provider_composition_candidate_v1|hpcomp1)/iu;
const PROVIDER_SEQUENCE_ROLLBACK_COMPOSITION_CANDIDATE_PATTERN =
  /(?:provider[-_ ]deployment[-_ ]candidate[-_ ]sequence|provider[-_ ]candidate[-_ ]sequence|rollback[-_ ]provider[-_ ]sequence[-_ ]composition(?:[-_ ]candidate)?|rollback_provider_sequence_composition_candidate_v1|provider-sequence-[a-f0-9]|rollback-provider-composition-[a-f0-9])/iu;

function storageV13CandidateClosureError(label) {
  return new Error(
    "Storage-v13 matrix candidate tooling must remain outside the complete formal npm/lifecycle/workspace closure: "
      + `${label}.`
  );
}

function swAbUpdateCandidateClosureError(label) {
  return new Error(
    "SW A-to-B update candidate tooling must remain outside the complete formal npm/lifecycle/workspace closure: "
      + `${label}.`
  );
}

function containsSwAbRuntimeDerivedEvidenceProducerBridge(value) {
  if (typeof value !== "string") return false;
  const compact = value.toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PATTERN.test(value)
    || compact.includes("swabupdateruntimederivedevidenceproducerbridge")
    || compact.includes("swabpb1");
}

function containsSwAbProducerBridgeComposition(value) {
  if (typeof value !== "string") return false;
  const compact = value.toLowerCase().replace(/[^a-z0-9]+/gu, "");
  return SW_AB_PRODUCER_BRIDGE_COMPOSITION_PATTERN.test(value)
    || compact.includes(
      "swabupdatecandidateruntimeclientcapturecollectorissuanceproducerbridgecomposition"
    )
    || compact.includes("swabproducerbridgecomposition")
    || compact.includes("swabupdateproducerbridgecomposition")
    || compact.includes("producerbridgecompositionv2")
    || compact.includes("fourchainproducerbridgecomposition")
    || compact.includes("swab4pb2");
}

function deployedPwaHostProviderCompositionCandidateClosureError(label) {
  return new Error(
    "Deployed-PWA host/provider composition candidate tooling must remain outside the complete formal "
      + `npm/lifecycle/workspace closure: ${label}.`
  );
}

function providerSequenceRollbackCompositionCandidateClosureError(label) {
  return new Error(
    "Provider sequence and rollback/provider composition candidate tooling must remain outside the complete "
      + `formal npm/lifecycle/workspace closure: ${label}.`
  );
}

export function verifyFormalReceiptNpmLifecycleClosure(
  requiredReceiptCommands,
  { root, web, embeddedCommands = [] }
) {
  const resolved = resolveFormalNpmLifecycleClosure(
    requiredReceiptCommands,
    { root, web, embeddedCommands }
  );
  for (const reference of resolved.observedReferences) {
    const { label, value } = reference;
    if (STORAGE_V13_MATRIX_CANDIDATE_PATTERN.test(value)) {
      throw storageV13CandidateClosureError(label);
    }
    if (SW_AB_UPDATE_CANDIDATE_PATTERN.test(value)
      || containsSwAbRuntimeDerivedEvidenceProducerBridge(value)
      || containsSwAbProducerBridgeComposition(value)) {
      throw swAbUpdateCandidateClosureError(label);
    }
    if (DEPLOYED_PWA_HOST_PROVIDER_COMPOSITION_CANDIDATE_PATTERN.test(value)) {
      throw deployedPwaHostProviderCompositionCandidateClosureError(label);
    }
    if (PROVIDER_SEQUENCE_ROLLBACK_COMPOSITION_CANDIDATE_PATTERN.test(value)) {
      throw providerSequenceRollbackCompositionCandidateClosureError(label);
    }
  }
  if (resolved.unmodeledTerminalCommands.length > 0) {
    const [terminal] = resolved.unmodeledTerminalCommands;
    const error = new Error(
      `Formal npm closure refuses an opaque or dynamic terminal command: ${terminal.label}.`
    );
    error.code = "FORMAL_NPM_OPAQUE_TERMINAL_COMMAND";
    throw error;
  }
  const { reachableScriptTuples } = resolved;
  const closureCanonicalSha256 = sha256(canonicalJson(reachableScriptTuples));
  if (
    closureCanonicalSha256
      !== REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256
  ) {
    throw new Error(
      "Formal npm/lifecycle/workspace closure canonical digest drifted: "
        + `expected ${REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256}, `
        + `received ${closureCanonicalSha256}.`
    );
  }
  return Object.freeze({
    visitedScripts: resolved.visitedScripts,
    reachableScriptTuples,
    reachableScriptCount: reachableScriptTuples.length,
    closureCanonicalSha256,
    embeddedCommandCount: resolved.embeddedCommandCount
  });
}

const REQUIRED_STORAGE_V13_CROSS_CONNECTION_TEST_FRAGMENTS = Object.freeze([
  "new ResearchDatabase(name, { targetSchema: 13 })",
  "new CaseRepository(database)",
  "createFullBackup(",
  "prepareFullBackupImport(",
  "verifyPreparedFullBackup(",
  "applyVerifiedFullBackup(",
  "FullBackupError",
  'code: "CURRENT_DATA_CHANGED"',
  'not.toContain("mutationState")',
  'not.toContain("revisionCalculationReceipts")',
  "database.readMutationState()",
  'code: "SCHEMA_UNSUPPORTED"',
  "expect(reopenedSnapshot).toEqual(postConcurrentWrite)",
  "expect(reopenedSnapshot).toEqual(incoming.payload)",
  'code: "VERIFIED_REPLACEMENT_INVALID"',
  'name: "missing current-payload digest"',
  'name: "explicit undefined current-payload digest"',
  'name: "accessor-backed current-payload digest"',
  'name: "extra root key"',
  'name: "custom root prototype"',
  "expect(getterCalls).toBe(0)"
]);

export function verifyStorageV13CrossConnectionCasTestGovernance(source) {
  if (
    typeof source !== "string"
    || REQUIRED_STORAGE_V13_CROSS_CONNECTION_TEST_FRAGMENTS.some(
      (fragment) => !source.includes(fragment)
    )
    || /\bindexedDB\b|\bIDB(?:Database|Factory|ObjectStore|Transaction)\b/u.test(source)
    || /from\s+["'](?:dexie|fake-indexeddb(?:\/[^"']*)?)["']/u.test(source)
    || /\.transaction\s*\(/u.test(source)
    || /database\.(?:appSettings|attachments|birthFingerprints|candidateSets|cases|citations|eventTimeMigrationReceipts|events|knowledgeDocuments|researchNotes|researcherProfiles|revisions|ruleRegistry|savedViews|sourceRights|tzdbMigrationReceipts)\.(?:add|put|bulkAdd|bulkPut|clear|delete)\s*\(/u.test(source)
    || /\bepoch\s*:/u.test(source)
  ) {
    throw new Error(
      "Exact-v13 cross-connection backup CAS test must use only the formal repository and backup APIs."
    );
  }
  return Object.freeze({
    targetSchema: 13,
    mutationEpochCapability: "absent_schema13",
    productionRepositoryWritePathBound: true,
    formalBackupPrepareVerifyApplyPathBound: true,
    rawIndexedDbMutationForbidden: true,
    malformedVerifiedReplacementCasBypassCovered: true
  });
}

export function verifyFullBackupMandatoryCasBoundaryGovernance({
  backupSource,
  storageSource,
  workerClientSource,
  crossConnectionTestSource,
  workerClientTestSource
}) {
  if (
    [
      backupSource,
      storageSource,
      workerClientSource,
      crossConnectionTestSource,
      workerClientTestSource
    ].some((source) => typeof source !== "string")
  ) {
    throw new Error("Full-backup mandatory CAS governance requires every checked source.");
  }

  const applyStart = backupSource.indexOf("export async function applyVerifiedFullBackup(");
  const applyEnd = backupSource.indexOf("export async function applyPreparedFullBackup(", applyStart);
  const applyBlock = applyStart >= 0 && applyEnd > applyStart
    ? backupSource.slice(applyStart, applyEnd)
    : "";
  const storageCaptureStart = storageSource.indexOf("function captureExpectedCurrentPayloadDigest(");
  const storageCaptureEnd = storageSource.indexOf("function assertFullDataUniqueIds(", storageCaptureStart);
  const storageCaptureBlock = storageCaptureStart >= 0 && storageCaptureEnd > storageCaptureStart
    ? storageSource.slice(storageCaptureStart, storageCaptureEnd)
    : "";
  const workerVerifiedStart = workerClientSource.indexOf('case "verified_ready":');
  const workerVerifiedEnd = workerClientSource.indexOf('case "snapshot_verified":', workerVerifiedStart);
  const workerVerifiedBlock = workerVerifiedStart >= 0 && workerVerifiedEnd > workerVerifiedStart
    ? workerClientSource.slice(workerVerifiedStart, workerVerifiedEnd)
    : "";

  const requiredBackupFragments = [
    '"VERIFIED_REPLACEMENT_INVALID"',
    "export function captureVerifiedFullBackupReplacement(",
    "VERIFIED_FULL_BACKUP_REPLACEMENT_KEYS",
    "FULL_BACKUP_PREFLIGHT_RESULT_KEYS",
    "Reflect.ownKeys(input)",
    "Object.getOwnPropertyDescriptor(input, key)",
    "CANONICAL_FULL_BACKUP_SHA256.test(root.expectedCurrentPayloadDigest)"
  ];
  const requiredCrossConnectionFragments = [
    'code: "VERIFIED_REPLACEMENT_INVALID"',
    'name: "missing current-payload digest"',
    'name: "explicit undefined current-payload digest"',
    'name: "accessor-backed current-payload digest"',
    'name: "extra root key"',
    'name: "custom root prototype"',
    "expect(getterCalls).toBe(0)",
    "expect(reopenedSnapshot).toEqual(postConcurrentWrite)"
  ];
  const requiredWorkerTestFragments = [
    'name: "missing CAS digest"',
    'name: "undefined CAS digest"',
    'name: "accessor CAS digest"',
    'code: "BACKUP_WORKER_RESULT_INVALID"',
    "expect(getterCalls).toBe(0)",
    "verifyPreparedFullBackupOffMainThread("
  ];

  if (
    requiredBackupFragments.some((fragment) => !backupSource.includes(fragment))
    || !applyBlock.includes(
      "const capturedVerified = captureVerifiedFullBackupReplacement(verified);"
    )
    || !applyBlock.includes("capturedVerified.incoming.payload")
    || !applyBlock.includes("capturedVerified.expectedCurrentPayloadDigest")
    || applyBlock.includes("verified.incoming.payload")
    || applyBlock.includes("verified.expectedCurrentPayloadDigest")
    || !storageCaptureBlock.includes("if (!descriptor) return undefined;")
    || !storageCaptureBlock.includes('typeof expectedCurrentPayloadDigest !== "string"')
    || !storageCaptureBlock.includes("!LOWERCASE_SHA256.test(expectedCurrentPayloadDigest)")
    || storageCaptureBlock.includes("expectedCurrentPayloadDigest !== undefined")
    || !workerVerifiedBlock.includes(
      'Object.getOwnPropertyDescriptor(message, "verified")'
    )
    || !workerVerifiedBlock.includes(
      "captureVerifiedFullBackupReplacement(verifiedDescriptor.value)"
    )
    || workerVerifiedBlock.includes("isRecord(message.verified)")
    || requiredCrossConnectionFragments.some(
      (fragment) => !crossConnectionTestSource.includes(fragment)
    )
    || requiredWorkerTestFragments.some(
      (fragment) => !workerClientTestSource.includes(fragment)
    )
  ) {
    throw new Error(
      "Full-backup restore CAS must remain mandatory across backup, storage, Worker, and exact-v13 tests."
    );
  }

  return Object.freeze({
    mandatoryCasDigestAtBackupBoundary: true,
    explicitUndefinedRejectedByStorage: true,
    workerVerifiedReadyValidated: true,
    accessorInvocationForbidden: true,
    mutationEpochCapability: "absent_schema13"
  });
}

export function verifyStorageV13MatrixCandidateGovernance({
  historicalPolicyV1,
  historicalReceiptSchemaV1,
  historicalPolicyV1Source,
  historicalReceiptSchemaV1Source,
  policy,
  receiptSchema,
  packageJson,
  rootTsconfig,
  candidateTsconfig,
  candidateConfigSource,
  candidateRunnerSource,
  candidateGlobalSetupSource,
  candidateReporterSource,
  candidateSpecSource,
  candidateNativeReadonlySource,
  candidateRuntimeSource,
  candidateVerifierSource
}) {
  if (
    typeof historicalPolicyV1Source !== "string"
    || sha256(historicalPolicyV1Source) !== REQUIRED_STORAGE_V13_MATRIX_V1_POLICY_RAW_SHA256
    || typeof historicalReceiptSchemaV1Source !== "string"
    || sha256(historicalReceiptSchemaV1Source) !== REQUIRED_STORAGE_V13_MATRIX_V1_SCHEMA_RAW_SHA256
    || sha256(canonicalJson(historicalPolicyV1))
      !== REQUIRED_STORAGE_V13_MATRIX_V1_POLICY_CANONICAL_SHA256
    || historicalPolicyV1?.policyId !== "storage-v13-matrix-candidate-policy-v1"
    || sha256(canonicalJson(historicalReceiptSchemaV1))
      !== REQUIRED_STORAGE_V13_MATRIX_V1_SCHEMA_CANONICAL_SHA256
    || historicalReceiptSchemaV1?.$id
      !== "https://hakimi.invalid/schemas/storage-v13-matrix-browser-receipt-candidate-v1.json"
  ) {
    throw new Error("Historical storage-v13 v1 candidate contract drifted or was rewritten in place.");
  }
  if (
    sha256(canonicalJson(policy)) !== REQUIRED_STORAGE_V13_MATRIX_POLICY_CANONICAL_SHA256
    || policy?.releaseIdentity?.dbGeneration !== "legacy-v13"
    || policy?.releaseIdentity?.targetSchema !== 13
    || policy?.releaseIdentity?.migrationId !== null
    || !sameJson(policy?.capabilities, {
      calculationReceiptCapability: "absent_schema13",
      mutationEpochCapability: "absent_schema13",
      epoch: null
    })
    || !sameJson(policy?.terminalState, {
      trustClass: "untrusted_candidate",
      status: "not_admitted",
      executionAdmission: "closed_deferred_boundaries",
      matrixComplete: false,
      strictGatePassed: false
    })
    || !Array.isArray(policy?.observedOperations)
    || !sameJson(policy.observedOperations.map((entry) => entry.operationId), [
      "create", "edit", "delete", "export", "restore", "cancel"
    ])
    || policy?.schemaVersion !== 2
    || policy?.policyId !== "storage-v13-matrix-candidate-policy-v2"
    || policy?.logicalBackup?.sharedPartitionContentDigestAlgorithm
      !== "sha256_canonical_json_multiset_v1"
    || !sameJson(policy?.logicalBackup?.sharedPhysicalPartitionNames, [
      "appSettings", "attachments", "candidateSets", "cases", "citations",
      "eventTimeMigrationReceipts", "events", "knowledgeDocuments", "researchNotes",
      "researcherProfiles", "revisions", "ruleRegistry", "savedViews", "sourceRights",
      "tzdbMigrationReceipts"
    ])
    || !sameJson(policy?.semanticWitness, {
      witnessType: "bounded_hashed_case_revision_relationships_v1",
      maximumEntriesPerCollection: 4096,
      inventoryScope: "all_cases_revisions_and_revision_fingerprints",
      identifierDisclosure: "sha256_only",
      recordDisclosure: "sha256_only"
    })
    || policy.observedOperations[2]?.capturePhases?.length !== 3
    || policy.observedOperations[3]?.relationship
      !== "logical_backup_shared_counts_and_content_digests_equal_after_ui_read_snapshot"
    || !Array.isArray(policy?.deferredBoundaries)
    || !sameJson(policy.deferredBoundaries, [
      {
        boundaryId: "two-tab",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "DEDICATED_MULTI_TAB_WRITE_COORDINATION_MATRIX_REQUIRED"
      },
      {
        boundaryId: "transaction-failure",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "STORAGE_TRANSACTION_ABORT_RUNTIME_MATRIX_REQUIRED"
      },
      {
        boundaryId: "read-only-recovery",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "REAL_OLD_V13_ARTIFACT_RECOVERY_REQUIRED"
      },
      {
        boundaryId: "cross-schema-no-backwrite",
        status: "deferred_not_executed",
        satisfied: false,
        evidence: null,
        reasonCode: "V13_TO_V16_SHADOW_AND_NO_REVERSE_MIGRATION_RUNTIME_MATRIX_REQUIRED"
      }
    ])
    || Object.values(policy?.authority ?? {}).length !== 15
    || policy?.authority?.crossSchemaNoBackwriteVerified !== false
    || Object.values(policy.authority).some((value) => value !== false)
  ) {
    throw new Error("Storage-v13 matrix candidate policy drifted from the exact closed contract.");
  }
  if (
    sha256(canonicalJson(receiptSchema)) !== REQUIRED_STORAGE_V13_MATRIX_SCHEMA_CANONICAL_SHA256
    || receiptSchema?.$id
      !== "https://hakimi.invalid/schemas/storage-v13-matrix-browser-receipt-candidate-v2.json"
    || receiptSchema?.properties?.receiptType?.const
      !== "storage_v13_browser_matrix_receipt_candidate_v2"
    || receiptSchema?.$defs?.OperationObservation?.properties?.observationMethod?.const
      !== "native_indexeddb_readonly_v2"
    || receiptSchema?.properties?.trustClass?.const !== "untrusted_candidate"
    || receiptSchema?.properties?.status?.const !== "not_admitted"
    || receiptSchema?.properties?.executionAdmission?.const !== "closed_deferred_boundaries"
    || receiptSchema?.properties?.matrixComplete?.const !== false
    || receiptSchema?.properties?.strictGatePassed?.const !== false
    || Object.values(receiptSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error("Storage-v13 matrix candidate receipt Schema drifted from the closed contract.");
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_STORAGE_V13_MATRIX_CANDIDATE_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Storage-v13 matrix candidate package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`Storage-v13 matrix candidate lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  if (
    !Array.isArray(rootTsconfig?.include)
    || !rootTsconfig.include.includes("apps/web/e2e")
    || !sameJson(rootTsconfig?.exclude, REQUIRED_STORAGE_V13_MATRIX_ROOT_TSCONFIG_EXCLUDES)
    || candidateTsconfig?.extends !== "../../tsconfig.base.json"
    || !sameJson(candidateTsconfig?.include, REQUIRED_STORAGE_V13_MATRIX_TSCONFIG_INCLUDES)
  ) {
    throw new Error("Storage-v13 matrix candidate TypeScript isolation has drifted.");
  }
  const requiredConfigFragments = [
    'testMatch: "storage-v13-matrix-candidate.spec.ts"',
    'globalSetup: "./playwright.storage-v13-matrix-candidate-global-setup.ts"',
    "fullyParallel: false",
    "forbidOnly: true",
    "retries: 0",
    "repeatEach: 1",
    "workers: 1",
    '["./playwright.storage-v13-matrix-candidate-reporter.ts"]',
    "formalReleaseEvidenceReceipt: false",
    "untrusted_storage_v13_matrix_candidate_v2"
  ];
  const requiredRunnerFragments = [
    'const ATTEMPT_ENVIRONMENT_KEY = "HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID"',
    "process.argv.length !== 2",
    'path.join(workspaceRoot, "node_modules", "playwright", "cli.js")',
    'const exactArguments = [playwrightCli, "test", "--config", candidateConfig]',
    "spawn(process.execPath, exactArguments",
    "[ATTEMPT_ENVIRONMENT_KEY]: attemptId",
    "process.exitCode = outcome.code ?? 1"
  ];
  const requiredReporterFragments = [
    "storage_v13_matrix_playwright_candidate_summary_v2",
    "candidateCaptureComplete",
    "strictGatePassed: false",
    "browser-receipt.json",
    "rootPublicationSetValid",
    "publishStorageV13MatrixCandidateSummary({",
    "const committedLogLine =",
    "const committedResult = Object.freeze({",
    "await closeHeldRegularFilesBestEffort(heldReceipts)",
    "writeStdoutBestEffort(committedLogLine)",
    "return committedResult"
  ];
  const requiredRuntimeFragments = [
    'const parentSegments = ["tmp", "storage-v13-matrix-candidate"]',
    "await mkdir(nextPath, { recursive: false })",
    "sameExactFilesystemIdentity(nextAfterStep, nextIdentity)",
    "export async function publishStorageV13MatrixCandidateSummary(input)",
    "storageV13MatrixTerminalCommitBytes(summaryBytes)",
    "await rename(pendingSummaryPath, finalSummaryPath)",
    "pendingAfterRename",
    "heldFinal = await openHeldStorageV13MatrixCandidateSummary(",
    "assertStorageV13MatrixCandidateAttemptMarkerStable(markerBefore, markerReady)",
    "STORAGE_V13_MATRIX_SUMMARY_FINAL_IDENTITY_INVALID",
    "await heldPendingTerminalCommit.handle.close()",
    "heldPendingTerminalCommit = undefined",
    "testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault",
    'testOnlyTerminalCommitFault === "create_target_directory_collision"',
    "await mkdir(terminalCommitPath, { recursive: false })",
    "await rename(pendingTerminalCommitPath, terminalCommitPath)",
    "closeStorageV13MatrixHandleBestEffort(heldFinal?.handle)",
    "STORAGE_V13_MATRIX_EXPORT_BACKUP_CONTENT_MISMATCH",
    "STORAGE_V13_MATRIX_EDIT_SEMANTIC_RELATION_INVALID",
    "cross-schema-no-backwrite"
  ];
  const requiredVerifierFragments = [
    "STORAGE_V13_MATRIX_TERMINAL_COMMIT_FILE_NAME",
    "validateTerminalCommitMarker({",
    "terminalCommitMarkerVerified: true",
    "terminalGateBinding",
    "terminalGateBinding: result.terminalGateBinding",
    "STORAGE_V13_MATRIX_VERIFIER_EXPORT_BACKUP_CONTENT_MISMATCH",
    "STORAGE_V13_MATRIX_VERIFIER_EDIT_SEMANTIC_RELATION_INVALID"
  ];
  const requiredCanonicalMultisetSpecFragments = [
    "const canonicalEntries = values.map((value) => canonicalJson(value)).sort();",
    "sha256(new TextEncoder().encode(canonicalJson(canonicalEntries)))",
    "assertCanonicalMultisetConformance();",
    "21b981965002c9b2658e08a8b9906de26963d9409f63e26ad11e6f3c4b7e70a6",
    "899793e09b1db200cde7180f3e52dcb63aadfc97c090734c2b0bad6648e9b4e2",
    "if (!Object.hasOwn(payload, name) || !Array.isArray(payload[name]))"
  ];
  const requiredCanonicalMultisetNativeFragments = [
    "const canonicalEntries = values.map((value) => canonicalJson(value)).sort(compareText);",
    "hexDigest(new TextEncoder().encode(canonicalJson(canonicalEntries)))",
    "Native snapshot canonical-multiset-v1 conformance failed.",
    "Native snapshot UTF-16 ordinal conformance failed.",
    "21b981965002c9b2658e08a8b9906de26963d9409f63e26ad11e6f3c4b7e70a6",
    "899793e09b1db200cde7180f3e52dcb63aadfc97c090734c2b0bad6648e9b4e2",
    "logicalContentDigest: rawStore.storeName === \"birthFingerprints\""
  ];
  if (
    typeof candidateConfigSource !== "string"
    || requiredConfigFragments.some((fragment) => !candidateConfigSource.includes(fragment))
    || /\bwebServer\b/u.test(candidateConfigSource)
    || /(?:npm\s+run\s+build|vite\s+build|release-browser-strict-reporter)/iu.test(candidateConfigSource)
    || sourceSha256(candidateRunnerSource) !== REQUIRED_STORAGE_V13_MATRIX_RUNNER_SOURCE_SHA256
    || requiredRunnerFragments.some((fragment) => !candidateRunnerSource.includes(fragment))
    || /(?:shell:\s*true|playwright\s+test\s+--config)/iu.test(candidateRunnerSource)
    || typeof candidateGlobalSetupSource !== "string"
    || sourceSha256(candidateGlobalSetupSource)
      !== REQUIRED_STORAGE_V13_MATRIX_GLOBAL_SETUP_SOURCE_SHA256
    || !candidateGlobalSetupSource.includes("loadVerifiedDeployedPwaCandidateArtifact(candidate)")
    || !candidateGlobalSetupSource.includes("prepareFreshStorageV13MatrixCandidateRun(candidate)")
    || !candidateGlobalSetupSource.includes("createStorageV13MatrixCandidateAttemptMarker(candidate)")
    || !candidateGlobalSetupSource.includes('process.argv.includes("--list")')
    || /(?:webServer|npm\s+run\s+build|vite\s+build|release-browser-strict-reporter)/iu
      .test(candidateGlobalSetupSource)
    || typeof candidateReporterSource !== "string"
    || sourceSha256(candidateReporterSource)
      !== REQUIRED_STORAGE_V13_MATRIX_REPORTER_SOURCE_SHA256
    || requiredReporterFragments.some((fragment) => !candidateReporterSource.includes(fragment))
    || candidateReporterSource.includes(
      "testOnlyPublishStorageV13MatrixCandidateSummaryWithTerminalCommitFault"
    )
    || /release_browser_test_summary|ReleaseBrowserStrictReporter/u.test(candidateReporterSource)
    || typeof candidateSpecSource !== "string"
    || sourceSha256(candidateSpecSource) !== REQUIRED_STORAGE_V13_MATRIX_SPEC_SOURCE_SHA256
    || requiredCanonicalMultisetSpecFragments.some(
      (fragment) => !candidateSpecSource.includes(fragment)
    )
    || typeof candidateNativeReadonlySource !== "string"
    || sourceSha256(candidateNativeReadonlySource)
      !== REQUIRED_STORAGE_V13_MATRIX_NATIVE_READONLY_SOURCE_SHA256
    || requiredCanonicalMultisetNativeFragments.some(
      (fragment) => !candidateNativeReadonlySource.includes(fragment)
    )
    || typeof candidateRuntimeSource !== "string"
    || sourceSha256(candidateRuntimeSource) !== REQUIRED_STORAGE_V13_MATRIX_RUNTIME_SOURCE_SHA256
    || requiredRuntimeFragments.some((fragment) => !candidateRuntimeSource.includes(fragment))
    || candidateRuntimeSource.includes("rollbackStorageV13MatrixCandidateSummaryPublication")
    || candidateRuntimeSource.includes("persistStorageV13MatrixCandidateSummaryPublicationInvalidation")
    || candidateRuntimeSource.includes("STORAGE_V13_MATRIX_SUMMARY_PUBLICATION_FAIL_CLOSED_UNCERTAIN")
    || candidateRuntimeSource.includes("beforeTerminalCommit")
    || candidateRuntimeSource.includes("testOnlyBeforeTerminalCommit")
    || typeof candidateVerifierSource !== "string"
    || sourceSha256(candidateVerifierSource)
      !== REQUIRED_STORAGE_V13_MATRIX_VERIFIER_SOURCE_SHA256
    || requiredVerifierFragments.some((fragment) => !candidateVerifierSource.includes(fragment))
    || candidateVerifierSource.includes("assertStorageV13MatrixSummaryPublicationNotInvalidated")
  ) {
    throw new Error("Storage-v13 matrix candidate browser collector is not strictly isolated.");
  }
  return Object.freeze({
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    observedOperationCount: 6,
    deferredBoundaryCount: 4,
    formalReleaseEvidenceReceipt: false,
    rootTypecheckExcluded: true,
    dedicatedTypecheckIncluded: true
  });
}

export function verifySwAbUpdateCandidateGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  schemaLoaderSource,
  verifierSource
}) {
  validateSwAbUpdateCandidatePolicy(policy);
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_POLICY_CANONICAL_SHA256
    || !sameJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
    || !sameJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
    || !sameJson(policy.requiredBrowserProjects, SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS)
    || !sameJson(policy.requiredTimeline, SW_AB_UPDATE_CANDIDATE_TIMELINE)
    || !sameJson(
      policy.requiredSharedAttachmentRoles,
      SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES
    )
    || !sameJson(
      policy.requiredPerBrowserAttachmentRoles,
      SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES
    )
    || !sameJson(policy.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY)
    || policy.formalReleaseEvidenceReceipt !== false
  ) {
    throw new Error("SW A-to-B update candidate policy drifted from the exact closed contract.");
  }
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-candidate-v1.json"
    || evidenceSchema?.properties?.evidenceType?.const !== "sw_ab_update_candidate_v1"
    || evidenceSchema?.properties?.trustClass?.const !== "untrusted_candidate"
    || evidenceSchema?.properties?.status?.const !== "not_admitted"
    || evidenceSchema?.properties?.executionAdmission?.const !== "closed_missing_https_origin"
    || evidenceSchema?.properties?.strictGatePassed?.const !== false
    || evidenceSchema?.properties?.attachments?.minItems !== 38
    || evidenceSchema?.properties?.attachments?.maxItems !== 38
    || evidenceSchema?.properties?.browserReceipts?.minItems !== 2
    || evidenceSchema?.properties?.browserReceipts?.maxItems !== 2
    || evidenceSchema?.$defs?.BrowserReceipt?.properties?.receiptType?.const
      !== "sw_ab_update_browser_receipt_candidate_v1"
    || evidenceSchema?.$defs?.Profile?.properties?.offlineBeforeFirstNavigation?.const !== true
    || evidenceSchema?.$defs?.DataIntegrity?.properties?.intervalNoMutationVerified?.const !== false
    || evidenceSchema?.$defs?.DataIntegrity?.properties?.abaResistance?.const
      !== "absent_schema13"
    || evidenceSchema?.$defs?.StaleAWrite?.properties?.errorInstanceOf?.const
      !== true
    || evidenceSchema?.$defs?.StaleAWrite?.properties?.databaseAreReleaseWritesLocked?.const
      !== true
    || Object.values(evidenceSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error("SW A-to-B update candidate Schema drifted from the exact closed contract.");
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_CANDIDATE_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW A-to-B update candidate package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`SW A-to-B update candidate lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  if (
    packageJson?.scripts?.["test:release-evidence"]?.includes("sw-ab-update")
    || sourceSha256(libSource) !== REQUIRED_SW_AB_UPDATE_CANDIDATE_LIB_SOURCE_SHA256
    || sourceSha256(schemaLoaderSource)
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_LOADER_SOURCE_SHA256
    || sourceSha256(verifierSource)
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_VERIFIER_SOURCE_SHA256
    || !libSource.includes("for (const held of heldFiles) await revalidateHeldFile(held)")
    || !libSource.includes("governance.releaseEvidenceSchemaValidator")
    || !libSource.includes("validateBrowserAttachmentPayloads(receipt, evidence, attachments.envelopesByTuple)")
    || !libSource.includes("SW_AB_UPDATE_OFFLINE_RESPONSE_BODY_MISMATCH")
    || !libSource.includes("SW_AB_UPDATE_DEPLOYMENT_RECEIPT_PROJECTION_INVALID")
    || !libSource.includes("computeSwAbUpdateCandidateClientChallengeResponseDigest")
    || !libSource.includes("ReleaseDatabaseWriteLockedError")
    || !libSource.includes("intervalNoMutationVerified === false")
    || !verifierSource.includes("process.exitCode = 1")
  ) {
    throw new Error("SW A-to-B update candidate sources are not exactly frozen or formally isolated.");
  }
  return Object.freeze({
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: SW_AB_UPDATE_CANDIDATE_BROWSER_PROJECTS.length,
    sharedAttachmentRoles: SW_AB_UPDATE_CANDIDATE_SHARED_ATTACHMENT_ROLES.length,
    perBrowserAttachmentRoles: SW_AB_UPDATE_CANDIDATE_PER_BROWSER_ATTACHMENT_ROLES.length,
    formalReleaseEvidenceReceipt: false,
    strictGatePassed: false
  });
}

export function verifySwAbUpdateRuntimeClientCaptureGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  loaderSource,
  schemaLoaderSource,
  probeSource,
  verifierSource,
  serviceWorkerSource
}) {
  validateSwAbUpdateRuntimeClientCapturePolicy(policy);
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_CANONICAL_SHA256
    || !sameJson(
      policy.releaseIdentity,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY
    )
    || !sameJson(policy.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
    || !sameJson(policy.requiredBrowserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
    || !sameJson(policy.requiredPhases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
    || !sameJson(policy.requiredSlots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
    || !sameJson(
      policy.requiredObservationTuples,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES
    )
    || !sameJson(
      policy.implementedObservationScopes,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES
    )
    || !sameJson(
      policy.deferredObservationScopes,
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES
    )
    || !sameJson(policy.provenance, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROVENANCE)
    || !sameJson(policy.authority, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_AUTHORITY)
  ) {
    throw new Error("SW A-to-B runtime client capture policy drifted from the exact partial contract.");
  }
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-runtime-client-capture-v1.json"
    || evidenceSchema?.properties?.evidenceType?.const
      !== "sw_ab_update_runtime_client_capture_candidate_v1"
    || evidenceSchema?.properties?.trustClass?.const
      !== "untrusted_raw_capture_candidate"
    || evidenceSchema?.properties?.status?.const !== "capture_incomplete"
    || evidenceSchema?.properties?.executionAdmission?.const
      !== "closed_missing_https_origin"
    || evidenceSchema?.properties?.usableForCandidateAssembly?.const !== false
    || evidenceSchema?.properties?.observations?.minItems !== 8
    || evidenceSchema?.properties?.observations?.maxItems !== 8
    || Object.values(evidenceSchema?.$defs?.Provenance?.properties ?? {})
      .some((entry) => entry?.const !== false)
    || Object.values(evidenceSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error("SW A-to-B runtime client capture Schema drifted from the exact partial contract.");
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW A-to-B runtime client capture package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`SW A-to-B runtime client capture lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  if (
    packageJson?.scripts?.["test:release-evidence"]?.includes("runtime-client-capture")
    || sourceSha256(libSource)
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LIB_SOURCE_SHA256
    || sourceSha256(loaderSource)
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LOADER_SOURCE_SHA256
    || sourceSha256(schemaLoaderSource)
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_LOADER_SOURCE_SHA256
    || sourceSha256(probeSource)
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROBE_SOURCE_SHA256
    || sourceSha256(verifierSource)
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_VERIFIER_SOURCE_SHA256
    || !probeSource.includes("const untrustedProbeIssuedCaptures = new WeakSet()")
    || !probeSource.includes("randomBytes(32)")
    || !probeSource.includes('session.send("Target.getTargetInfo")')
    || !probeSource.includes("preChallengeResponseProjection")
    || !probeSource.includes("postChallengeResponseProjection")
    || !probeSource.includes('sourceTrust: "caller_supplied_page_adapter_untrusted"')
    || !probeSource.includes('realm: "page_main_world_untrusted"')
    || !probeSource.includes("untrustedProbeIssuedCaptures.has(capture)")
    || !loaderSource.includes("loadVerifiedSwAbUpdateRuntimeClientCapture")
    || !loaderSource.includes("compileSwAbUpdateRuntimeClientCaptureSchema(schema)")
    || !loaderSource.includes("endpointFingerprint")
    || !verifierSource.includes("loadVerifiedSwAbUpdateRuntimeClientCapture")
    || !verifierSource.includes("process.exitCode = 1")
    || delimitedSourceSha256(
      serviceWorkerSource,
      "// BEGIN SW_AB_RUNTIME_CHALLENGE_V1_READ_ONLY",
      "// END SW_AB_RUNTIME_CHALLENGE_V1_READ_ONLY"
    ) !== REQUIRED_SW_AB_RUNTIME_CHALLENGE_SOURCE_SHA256
    || sourceSha256(serviceWorkerSource)
      !== REQUIRED_SW_AB_RUNTIME_SERVICE_WORKER_SOURCE_SHA256
    || !serviceWorkerSource.includes('message?.type === "SW_AB_RUNTIME_CHALLENGE_V1"')
    || !serviceWorkerSource.includes('type: "SW_AB_RUNTIME_CHALLENGE_RESULT_V1"')
    || !serviceWorkerSource.includes("sourceClientId")
    || !serviceWorkerSource.includes('message?.type === "REQUEST_INSTALLED_GENERATION_ACTIVATION_V1"')
    || !serviceWorkerSource.includes('message?.type === "PREPARE_INSTALLED_GENERATION_ACTIVATION_V1"')
    || !serviceWorkerSource.includes('message?.type === "COMMIT_INSTALLED_GENERATION_ACTIVATION_V1"')
    || !serviceWorkerSource.includes('freeze: "FREEZE_RELEASE_CONTROLLER_TAKEOVER_WRITES_V1"')
    || !serviceWorkerSource.includes("type: session.protocol.freeze")
    || !serviceWorkerSource.includes("freezeAllControllerTakeoverClients")
    || !serviceWorkerSource.includes("controllerTakeoverHoldingResponse")
    || !serviceWorkerSource.includes("persistControllerTakeoverNavigationHold")
    || !serviceWorkerSource.includes("finalizeControllerTakeoverSafeNavigation")
    || !serviceWorkerSource.includes('session.state = "activation_outcome_unknown"')
    || !serviceWorkerSource.includes('knownRejected.name = "WaitingCommitKnownRejectedError"')
    || !serviceWorkerSource.includes("await session.holdPersistencePromise")
    || !serviceWorkerSource.includes("releaseControllerTakeoverHoldingDocuments")
    || !serviceWorkerSource.includes("RELEASE_CONTROLLER_TAKEOVER_HOLDING_DOCUMENT_V1")
    || !serviceWorkerSource.includes(
      "event.waitUntil(prepareInstalledGenerationActivation(event, message))"
    )
    || !serviceWorkerSource.includes("event.source !== pending.sourceWorker")
    || !serviceWorkerSource.includes("return descriptorsEqual(source, target);")
    || !serviceWorkerSource.includes(
      'matchAll({ type: "window", includeUncontrolled: true })'
    )
    || (serviceWorkerSource.match(/self\.skipWaiting\(\)/gu) ?? []).length !== 1
  ) {
    throw new Error(
      "SW A-to-B runtime client capture sources are not exactly frozen or fail-closed."
    );
  }
  return Object.freeze({
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS.length,
    observations: 8,
    implementedObservationScopes:
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_IMPLEMENTED_SCOPES.length,
    deferredObservationScopes:
      SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_DEFERRED_SCOPES.length,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false
  });
}

export function verifySwAbUpdateRuntimeApiTranscriptGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  schemaSource,
  writerSource,
  loaderSource,
  fixtureSource,
  testSource,
  verifierSource,
  formalConsumerSources = []
}) {
  validateSwAbUpdateRuntimeApiTranscriptPolicy(policy);
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_POLICY_CANONICAL_SHA256
    || !sameJson(policy.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
    || !sameJson(policy.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
    || !sameJson(policy.requiredObservationTuples, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES)
    || !sameJson(policy.requiredTupleFiles, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TUPLE_FILES)
    || !sameJson(
      policy.requiredSourceBindings,
      SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SOURCE_REQUIREMENTS
    )
    || !sameJson(policy.captureSurface, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_CAPTURE_SURFACE)
    || !sameJson(policy.provenance, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_PROVENANCE)
    || !sameJson(policy.authority, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_AUTHORITY)
    || policy.mutationBoundary?.overlappingFileHandleEpochEstablished !== false
    || policy.mutationBoundary?.intervalMutationExcluded !== false
    || policy.mutationBoundary?.abaExcluded !== false
    || policy.terminalState?.decodedApiObjectProjectionDerivationVerified !== true
    || policy.terminalState?.usableForRuntimeEvidence !== false
    || policy.terminalState?.usableForCandidateAssembly !== false
    || policy.terminalState?.formalReleaseEvidenceReceipt !== false
    || policy.terminalState?.cliExitCode !== 1
  ) {
    throw new Error(
      "SW runtime decoded-API transcript policy drifted from the exact closed contract."
    );
  }
  const manifestSchema = evidenceSchema?.$defs?.Manifest;
  const tupleSchema = evidenceSchema?.$defs?.TupleRecord;
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-runtime-api-transcript-candidate-v1.json"
    || evidenceSchema?.oneOf?.length !== 2
    || evidenceSchema.oneOf[0]?.$ref !== "#/$defs/Manifest"
    || evidenceSchema.oneOf[1]?.$ref !== "#/$defs/TupleRecord"
    || manifestSchema?.additionalProperties !== false
    || manifestSchema?.properties?.recordType?.const
      !== "sw_ab_update_runtime_api_transcript_bundle_candidate_v1"
    || manifestSchema?.properties?.trustClass?.const
      !== "untrusted_decoded_browser_api_transcript_candidate"
    || manifestSchema?.properties?.status?.const !== "capture_incomplete"
    || manifestSchema?.properties?.executionAdmission?.const
      !== "closed_missing_selected_https_origin"
    || manifestSchema?.properties?.usableForRuntimeEvidence?.const !== false
    || manifestSchema?.properties?.usableForCandidateAssembly?.const !== false
    || manifestSchema?.properties?.formalReleaseEvidenceReceipt?.const !== false
    || manifestSchema?.properties?.tupleBindings?.minItems !== 8
    || manifestSchema?.properties?.tupleBindings?.maxItems !== 8
    || manifestSchema?.properties?.sourceBindings?.minItems !== 4
    || manifestSchema?.properties?.sourceBindings?.maxItems !== 4
    || tupleSchema?.additionalProperties !== false
    || tupleSchema?.properties?.recordType?.const
      !== "sw_ab_update_runtime_api_transcript_tuple_candidate_v1"
    || Object.values(evidenceSchema?.$defs?.Provenance?.properties ?? {})
      .some((entry) => entry?.const !== false)
    || Object.values(evidenceSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error(
      "SW runtime decoded-API transcript Schema drifted from the exact closed contract."
    );
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW runtime API transcript package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`SW runtime API transcript lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  const familyScriptNames = Object.keys(packageJson?.scripts ?? {}).filter((scriptName) =>
    scriptName.includes("sw-ab-update-runtime-api-transcript")
  );
  if (
    !sameJson(
      familyScriptNames.sort(),
      Object.keys(REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCRIPTS).sort()
    )
    || packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
    || packageJson.scripts["test:release-evidence"].includes("runtime-api-transcript")
  ) {
    throw new Error(
      "SW runtime API transcript must remain reachable only through two standalone closed scripts."
    );
  }
  const expectedSourceHashes = [
    [libSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_LIB_SOURCE_SHA256],
    [schemaSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_SOURCE_SHA256],
    [writerSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_WRITER_SOURCE_SHA256],
    [loaderSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_LOADER_SOURCE_SHA256],
    [fixtureSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_FIXTURE_SOURCE_SHA256],
    [testSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_TEST_SOURCE_SHA256],
    [verifierSource, REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_VERIFIER_SOURCE_SHA256]
  ];
  if (expectedSourceHashes.some(([source, expected]) => sourceSha256(source) !== expected)) {
    throw new Error("SW runtime API transcript source lock drifted.");
  }
  const forbiddenFormalTokens = [
    "dist/web/release-evidence.json",
    "tmp/release-evidence-receipts",
    "formal-verification.json",
    "verifyRollbackEvidence",
    "assertRollbackExecutionAdmission",
    "generateReleaseEvidence"
  ];
  const executionSources = [libSource, writerSource, loaderSource, verifierSource].join("\n");
  if (
    forbiddenFormalTokens.some((token) => executionSources.includes(token))
    || !libSource.includes("deriveSwAbUpdateRuntimeClientCaptureFromApiTranscript")
    || !libSource.includes("verifySwAbUpdateRuntimeClientCapture({")
    || !libSource.includes("cdpWireBytesCaptured: false")
    || !libSource.includes("overlappingFileHandleEpochEstablished: false")
    || !libSource.includes("intervalMutationExcluded: false")
    || !libSource.includes("abaExcluded: false")
    || !writerSource.includes("SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE")
    || writerSource.indexOf("SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_MANIFEST_FILE")
      >= writerSource.lastIndexOf("await writeExclusiveFile(")
    || !loaderSource.includes("assertExactBundleFileSet")
    || !loaderSource.includes("terminalEndpointSnapshotsMatched: true")
    || !loaderSource.includes("SW_AB_RUNTIME_API_TRANSCRIPT_TERMINAL_FILE_SET_CHANGED")
    || !verifierSource.includes("loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle")
    || !verifierSource.includes("process.exitCode = 1")
    || formalConsumerSources.some((source) =>
      /sw-ab-update-runtime-api-transcript|sw_ab_update_runtime_api_transcript/iu.test(source)
    )
  ) {
    throw new Error(
      "SW runtime decoded-API transcript sources are not isolated from formal admission."
    );
  }
  return Object.freeze({
    status: "capture_incomplete",
    executionAdmission: "closed_missing_selected_https_origin",
    trustClass: "untrusted_decoded_browser_api_transcript_candidate",
    tupleFiles: 8,
    sourceBindings: 4,
    decodedApiObjectProjectionDerivationVerified: true,
    cdpWireBytesCaptured: false,
    browserTransportAuthenticityVerified: false,
    terminalEndpointSnapshotsOnly: true,
    overlappingFileHandleEpochEstablished: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function verifySwAbUpdateRuntimeCollectorIssuanceGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  schemaSource,
  writerSource,
  liveAdapterSource,
  loaderSource,
  fixtureSource,
  testSource,
  liveAdapterTestSource,
  verifierSource,
  migrationWorkflow = "",
  formalConsumerSources = []
}) {
  validateSwAbRuntimeCollectorIssuancePolicy(policy);
  const expectedRootLayout = {
    attemptMarkerFile: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MARKER_FILE,
    transcriptDirectory: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRANSCRIPT_DIRECTORY,
    terminalIssuanceFile: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_RECEIPT_FILE
  };
  const expectedTerminalState = {
    ...SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MECHANICAL_CHECKS,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1
  };
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_POLICY_CANONICAL_SHA256
    || policy.trustClass !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
    || policy.status !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
    || policy.executionAdmission !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
    || !sameJson(policy.releaseIdentity, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_RELEASE_IDENTITY)
    || !sameJson(policy.capabilities, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_CAPABILITIES)
    || !sameJson(policy.requiredBrowserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
    || !sameJson(policy.requiredPhases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
    || !sameJson(policy.requiredSlots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
    || !sameJson(policy.rootLayout, expectedRootLayout)
    || policy.requiredTupleIssuances?.length !== 8
    || !sameJson(policy.requiredSourceBindings, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SOURCE_REQUIREMENTS)
    || !sameJson(policy.signatureBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SIGNATURE_BOUNDARY)
    || !sameJson(policy.terminalState, expectedTerminalState)
    || !sameJson(policy.mutationBoundary, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_MUTATION_BOUNDARY)
    || !sameJson(policy.provenance, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_PROVENANCE)
    || !sameJson(policy.authority, SW_AB_RUNTIME_COLLECTOR_ISSUANCE_AUTHORITY)
  ) {
    throw new Error(
      "SW runtime collector issuance policy drifted from the exact v13 self-signature boundary."
    );
  }

  const markerSchema = evidenceSchema?.$defs?.AttemptMarker;
  const receiptSchema = evidenceSchema?.$defs?.CollectorIssuanceReceipt;
  const capabilitiesSchema = evidenceSchema?.$defs?.Capabilities;
  const releaseIdentitySchema = evidenceSchema?.$defs?.ReleaseIdentity;
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-runtime-collector-issuance-candidate-v1.json"
    || evidenceSchema?.oneOf?.length !== 2
    || evidenceSchema.oneOf[0]?.$ref !== "#/$defs/AttemptMarker"
    || evidenceSchema.oneOf[1]?.$ref !== "#/$defs/CollectorIssuanceReceipt"
    || markerSchema?.additionalProperties !== false
    || markerSchema?.properties?.recordType?.const
      !== "sw_ab_update_runtime_collector_attempt_marker_candidate_v1"
    || markerSchema?.properties?.trustClass?.const !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
    || markerSchema?.properties?.status?.const !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
    || markerSchema?.properties?.executionAdmission?.const
      !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
    || markerSchema?.properties?.sourceBindings?.minItems !== 6
    || markerSchema?.properties?.sourceBindings?.maxItems !== 6
    || receiptSchema?.additionalProperties !== false
    || receiptSchema?.properties?.recordType?.const
      !== "sw_ab_update_runtime_collector_issuance_candidate_v1"
    || receiptSchema?.properties?.trustClass?.const !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS
    || receiptSchema?.properties?.status?.const !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS
    || receiptSchema?.properties?.executionAdmission?.const
      !== SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION
    || receiptSchema?.properties?.usableForRuntimeEvidence?.const !== false
    || receiptSchema?.properties?.usableForCandidateAssembly?.const !== false
    || receiptSchema?.properties?.formalReleaseEvidenceReceipt?.const !== false
    || receiptSchema?.properties?.cliExitCode?.const !== 1
    || receiptSchema?.properties?.tupleIssuances?.minItems !== 8
    || receiptSchema?.properties?.tupleIssuances?.maxItems !== 8
    || receiptSchema?.properties?.sourceBindings?.minItems !== 6
    || receiptSchema?.properties?.sourceBindings?.maxItems !== 6
    || releaseIdentitySchema?.properties?.targetSchema?.const !== 13
    || releaseIdentitySchema?.properties?.migrationId?.type !== "null"
    || capabilitiesSchema?.properties?.mutationEpochCapability?.const !== "absent_schema13"
    || capabilitiesSchema?.properties?.epoch?.type !== "null"
    || Object.values(evidenceSchema?.$defs?.Provenance?.properties ?? {})
      .some((entry) => entry?.const !== false)
    || Object.values(evidenceSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error(
      "SW runtime collector issuance Schema drifted from the exact closed contract."
    );
  }

  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW runtime collector issuance package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(
        `SW runtime collector issuance lifecycle aliases are forbidden: ${scriptName}.`
      );
    }
  }
  const collectorIssuancePattern =
    /(?:sw[-_ ]ab[-_ ]update[-_ ]runtime[-_ ]collector[-_ ]issuance|sw_ab_update_runtime_collector_issuance)/iu;
  const collectorLiveAdapterPattern =
    /(?:sw[-_ ]ab[-_ ]update[-_ ]runtime[-_ ]collector[-_ ]live[-_ ]adapter|sw_ab_update_runtime_collector_live_adapter)/iu;
  const collectorFamilyCommandMatches = (value) => typeof value === "string"
    && (collectorIssuancePattern.test(value) || collectorLiveAdapterPattern.test(value));
  const expectedFamilyScriptNames = Object.keys(
    REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCRIPTS
  );
  const expectedFamilyScriptNameSet = new Set(expectedFamilyScriptNames);
  const familyScriptNames = Object.keys(packageJson?.scripts ?? {}).filter((scriptName) =>
    collectorIssuancePattern.test(scriptName)
  );
  const genericAliases = Object.entries(packageJson?.scripts ?? {}).filter(
    ([scriptName, command]) => !expectedFamilyScriptNameSet.has(scriptName)
      && collectorFamilyCommandMatches(command)
  );
  if (
    !sameJson(
      familyScriptNames.sort(),
      expectedFamilyScriptNames.sort()
    )
    || genericAliases.length !== 0
    || packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
    || collectorFamilyCommandMatches(packageJson.scripts["test:release-evidence"])
  ) {
    throw new Error(
      "SW runtime collector issuance must remain reachable only through two standalone closed scripts."
    );
  }

  const expectedSourceHashes = [
    [libSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_LIB_SOURCE_SHA256],
    [schemaSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_SOURCE_SHA256],
    [writerSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_WRITER_SOURCE_SHA256],
    [liveAdapterSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_LIVE_ADAPTER_SOURCE_SHA256],
    [loaderSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_LOADER_SOURCE_SHA256],
    [fixtureSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_FIXTURE_SOURCE_SHA256],
    [testSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_TEST_SOURCE_SHA256],
    [liveAdapterTestSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_LIVE_ADAPTER_TEST_SOURCE_SHA256],
    [verifierSource, REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_VERIFIER_SOURCE_SHA256]
  ];
  if (expectedSourceHashes.some(([source, expected]) => sourceSha256(source) !== expected)) {
    throw new Error("SW runtime collector issuance source lock drifted.");
  }

  const forbiddenFormalTokens = [
    "dist/web/release-evidence.json",
    "tmp/release-evidence-receipts",
    "formal-verification.json",
    "verifyRollbackEvidence",
    "assertRollbackExecutionAdmission",
    "generateReleaseEvidence"
  ];
  const executionSources = [
    libSource,
    writerSource,
    liveAdapterSource,
    loaderSource,
    verifierSource
  ].join("\n");
  const markerPublishOffset = writerSource.indexOf(
    "markerHeld = await writeHeldExclusiveFile(markerPath"
  );
  const receiptPublishOffset = writerSource.indexOf(
    "state.receiptHeld = await writeHeldExclusiveFile("
  );
  const liveEntryStart = writerSource.indexOf(
    "export async function collectNextSwAbUpdateRuntimeCollectorTupleFromPage"
  );
  const liveEntryEnd = writerSource.indexOf(
    "\nasync function readPublishedTranscript",
    liveEntryStart
  );
  const liveEntrySource = liveEntryStart >= 0 && liveEntryEnd > liveEntryStart
    ? writerSource.slice(liveEntryStart, liveEntryEnd)
    : "";
  const forbiddenLowLevelWriterExport =
    /(?:\bexport\s+(?:(?:async\s+)?function|const|let|var|class)\s+(?:testOnlyReserveNext|reserveNext|testOnlyComplete|complete)SwAbUpdateRuntimeCollectorTuple\b|\bexport\s*\{[^}]*\b(?:testOnlyReserveNext|reserveNext|testOnlyComplete|complete)SwAbUpdateRuntimeCollectorTuple\b[^}]*\})/u;
  const forbiddenAdapterIdentityGeneration =
    /\b(?:randomBytes|randomUUID|randomIdentifier)\b|Math\.random\s*\(|crypto\.getRandomValues\s*\(|performance\.now\s*\(/u;
  const adapterCaptureEntryStart = liveAdapterSource.indexOf(
    "export async function captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage"
  );
  const adapterCaptureEntrySource = adapterCaptureEntryStart >= 0
    ? liveAdapterSource.slice(adapterCaptureEntryStart)
    : "";
  const adapterConsumeEntryStart = liveAdapterSource.indexOf(
    "export function consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope"
  );
  const adapterConsumeEntryEnd = liveAdapterSource.indexOf(
    "\nexport async function captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage",
    adapterConsumeEntryStart
  );
  const adapterConsumeEntrySource =
    adapterConsumeEntryStart >= 0 && adapterConsumeEntryEnd > adapterConsumeEntryStart
      ? liveAdapterSource.slice(adapterConsumeEntryStart, adapterConsumeEntryEnd)
      : "";
  const targetInfoSendCount = [
    ...liveAdapterSource.matchAll(/cdpSession\.send\("Target\.getTargetInfo"\)/gu)
  ].length;
  const cdpSessionCreationCount = [
    ...liveAdapterSource.matchAll(/context\.newCDPSession\(page\)/gu)
  ].length;
  const adapterTimelineBoundaryAssignments = [
    "const startedAt = canonicalTimestamp()",
    "const sessionCreatedAt = canonicalTimestamp()",
    "const preRequestStartedAt = canonicalTimestamp()",
    "const preResponseReceivedAt = canonicalTimestamp()",
    "const challengeRequestStartedAt = canonicalTimestamp()",
    "const challengeResponseReceivedAt = canonicalTimestamp()",
    "const postRequestStartedAt = canonicalTimestamp()",
    "const postResponseReceivedAt = canonicalTimestamp()",
    "timeline.sessionDetachedAt = canonicalTimestamp()",
    "timeline.completedAt = canonicalTimestamp()"
  ];
  const adapterDeadlineFragments = [
    "cdpSessionMilliseconds: 10_000",
    "cdpRequestMilliseconds: 10_000",
    "challengeMilliseconds: 7_500",
    "detachMilliseconds: 5_000"
  ];
  const fixtureAndTestsUseOnlyLiveEntry = [fixtureSource, testSource, liveAdapterTestSource]
    .every((source) =>
      source.includes("collectNextSwAbUpdateRuntimeCollectorTupleFromPage")
      && !/\b(?:testOnlyReserveNext|testOnlyComplete)SwAbUpdateRuntimeCollectorTuple\s*\(/u
        .test(source)
    );
  if (
    forbiddenFormalTokens.some((token) => executionSources.includes(token))
    || markerPublishOffset < 0
    || receiptPublishOffset <= markerPublishOffset
    || !writerSource.includes('generateKeyPairSync("ed25519")')
    || !writerSource.includes("const SESSION_STATES = new WeakMap()")
    || !writerSource.includes("const ACTIVE_SESSIONS = new WeakSet()")
    || !writerSource.includes("activeOperation")
    || forbiddenLowLevelWriterExport.test(writerSource)
    || !writerSource.includes('from "./sw-ab-update-runtime-collector-live-adapter.mjs"')
    || liveEntrySource.length === 0
    || !/\[\s*"session"\s*,\s*"page"\s*\]/u.test(liveEntrySource)
    || /\[\s*"session"\s*,\s*"page"\s*,/u.test(liveEntrySource)
    || !liveEntrySource.includes("captureSwAbUpdateRuntimeCollectorDecodedObservationFromPage")
    || !liveEntrySource.includes("consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope")
    || !liveEntrySource.includes("completeSwAbUpdateRuntimeCollectorTupleInternal")
    || liveEntrySource.includes("testOnly")
    || adapterCaptureEntrySource.length === 0
    || !/\[\s*"page"\s*,\s*"reservation"\s*\]/u.test(adapterCaptureEntrySource)
    || /\[\s*"page"\s*,\s*"reservation"\s*,/u.test(adapterCaptureEntrySource)
    || !liveAdapterSource.includes("challengeNonceFromReservation(reservation)")
    || !liveAdapterSource.includes("page.evaluate")
    || !liveAdapterSource.includes("new MessageChannel()")
    || cdpSessionCreationCount !== 1
    || targetInfoSendCount !== 2
    || !liveAdapterSource.includes("() => cdpSession.detach()")
    || !liveAdapterSource.includes("const LIVE_CAPTURE_ENVELOPES = new WeakSet()")
    || !liveAdapterSource.includes("let lastCaptureTimestampMilliseconds = Date.now() - 1")
    || /\bexport\s+function\s+canonicalTimestamp\b/u.test(liveAdapterSource)
    || !liveAdapterSource.includes("function canonicalTimestamp()")
    || !adapterTimelineBoundaryAssignments.every((fragment) => liveAdapterSource.includes(fragment))
    || !adapterDeadlineFragments.every((fragment) => liveAdapterSource.includes(fragment))
    || !liveAdapterSource.includes("return await Promise.race([")
    || !liveAdapterSource.includes("timeout = setTimeout(() => {")
    || !liveAdapterSource.includes("function scheduleLateCdpSessionDetach(cdpSessionPromise)")
    || !liveAdapterSource.includes("scheduleLateCdpSessionDetach(cdpSessionPromise)")
    || !liveAdapterSource.includes('error?.code === "CDP_SESSION_TIMEOUT"')
    || !liveAdapterSource.includes("controller.postMessage({")
    || !liveAdapterSource.includes("finish(reject, error)")
    || adapterConsumeEntrySource.length === 0
    || !adapterConsumeEntrySource.includes("LIVE_CAPTURE_ENVELOPES.has(captureEnvelope)")
    || !adapterConsumeEntrySource.includes("LIVE_CAPTURE_ENVELOPES.delete(captureEnvelope)")
    || !liveAdapterSource.includes("LIVE_CAPTURE_ENVELOPES.add(captureEnvelope)")
    || forbiddenAdapterIdentityGeneration.test(liveAdapterSource)
    || /from\s+["'][^"']*sw-ab-update-runtime-collector-issuance-writer\.mjs["']/u
      .test(liveAdapterSource)
    || liveAdapterSource.includes("testOnly")
    || !liveAdapterTestSource.includes("evaluateDelayMilliseconds: 30")
    || !liveAdapterTestSource.includes("challengeCompleted - challengeStarted >= 20")
    || !liveAdapterTestSource.includes("Object.keys(writer).sort()")
    || !liveAdapterTestSource.includes("consumeSwAbUpdateRuntimeCollectorLiveCaptureEnvelope")
    || ![
      "neverResolveNewSession: true",
      "neverResolvePre: true",
      "neverResolveEvaluate: true",
      "neverResolvePost: true",
      "neverResolveDetach: true",
      "resolveNewSessionAfterMilliseconds: 50"
    ].every((fragment) => liveAdapterTestSource.includes(fragment))
    || !fixtureAndTestsUseOnlyLiveEntry
    || !loaderSource.includes("assertExactRootSet")
    || !loaderSource.includes("assertHeldFileStable")
    || !loaderSource.includes("loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle")
    || !verifierSource.includes("loadVerifiedSwAbUpdateRuntimeCollectorIssuance")
    || !verifierSource.includes("process.exitCode = 1")
    || formalConsumerSources.some((source) =>
      collectorFamilyCommandMatches(source)
      || /\b(?:testOnlyReserveNext|testOnlyComplete)SwAbUpdateRuntimeCollectorTuple\b/u
        .test(source)
    )
    || migrationRunCommands(migrationWorkflow).some((command) =>
      collectorFamilyCommandMatches(command)
    )
  ) {
    throw new Error(
      "SW runtime collector issuance sources are not isolated from formal admission."
    );
  }
  return Object.freeze({
    status: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_STATUS,
    executionAdmission: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_EXECUTION_ADMISSION,
    trustClass: SW_AB_RUNTIME_COLLECTOR_ISSUANCE_TRUST_CLASS,
    logicalIssuanceRecords: 10,
    physicalJsonFiles: 11,
    sourceFamilyFiles: 12,
    tupleIssuances: 8,
    sourceBindings: 6,
    livePageAdapterSourceBound: true,
    callerDecodedObservationProductionEntryAbsent: true,
    browserObjectAuthenticityVerified: false,
    cdpWireBytesCaptured: false,
    realBrowserExecutionVerified: false,
    ephemeralSelfSignatureChainVerified: true,
    attemptMarkerHandleHeldAcrossIssuance: true,
    allEvidenceFilesContinuouslyHeldAcrossIssuance: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    attemptFreshnessExternallyVerified: false,
    bundleReplayResistanceVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function verifySwAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  schemaLoaderSource,
  verifierSource
}) {
  validateSwAbUpdateCandidateRuntimeClientCaptureCompositionPolicy(policy);
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_CANONICAL_SHA256
    || !sameJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
    || !sameJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
    || !sameJson(policy.requiredBrowserProjects, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS)
    || !sameJson(policy.requiredPhases, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PHASES)
    || !sameJson(policy.requiredSlots, SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SLOTS)
    || policy.terminalState?.status !== "not_admitted"
    || policy.terminalState?.strictGatePassed !== false
    || policy.terminalState?.usableForCandidateAssembly !== false
    || policy.terminalState?.usableForAdmission !== false
    || policy.terminalState?.formalReleaseEvidenceReceipt !== false
    || policy.terminalState?.cliExitCode !== 1
    || Object.values(policy.provenance ?? {}).some((value) => value !== false)
    || Object.values(policy.authority ?? {}).some((value) => value !== false)
  ) {
    throw new Error(
      "SW A-to-B candidate/runtime capture composition policy drifted from the exact closed contract."
    );
  }
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-composition-v1.json"
    || evidenceSchema?.properties?.recordType?.const
      !== "sw_ab_update_candidate_runtime_client_capture_composition_v1"
    || evidenceSchema?.properties?.trustClass?.const !== "untrusted_candidate_composition"
    || evidenceSchema?.properties?.status?.const !== "not_admitted"
    || evidenceSchema?.properties?.executionAdmission?.const !== "closed_missing_https_origin"
    || evidenceSchema?.properties?.strictGatePassed?.const !== false
    || evidenceSchema?.properties?.usableForCandidateAssembly?.const !== false
    || evidenceSchema?.properties?.usableForAdmission?.const !== false
    || evidenceSchema?.properties?.formalReleaseEvidenceReceipt?.const !== false
    || evidenceSchema?.properties?.cliExitCode?.const !== 1
    || evidenceSchema?.properties?.clientMappings?.minItems !== 8
    || evidenceSchema?.properties?.clientMappings?.maxItems !== 8
    || evidenceSchema?.properties?.sourceBindings?.minItems !== 6
    || evidenceSchema?.properties?.sourceBindings?.maxItems !== 6
    || evidenceSchema?.properties?.mutationBoundary?.properties?.intervalMutationExcluded?.const
      !== false
    || evidenceSchema?.properties?.mutationBoundary?.properties?.abaExcluded?.const !== false
    || evidenceSchema?.$defs?.FalseLedger?.properties
      ?.defaultV13ReceiptAllowlistMember?.const !== false
    || Object.values(evidenceSchema?.$defs?.FalseLedger?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error(
      "SW A-to-B candidate/runtime capture composition Schema drifted from the exact closed contract."
    );
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW A-to-B composition package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`SW A-to-B composition lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  if (
    packageJson?.scripts?.["test:release-evidence"]?.includes(
      "candidate-runtime-client-capture-composition"
    )
    || sourceSha256(libSource)
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_LIB_SOURCE_SHA256
    || sourceSha256(schemaLoaderSource)
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
    || sourceSha256(verifierSource)
      !== REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_VERIFIER_SOURCE_SHA256
    || !libSource.includes("candidateByTuple")
    || !libSource.includes("runtimeByTuple")
    || !libSource.includes("SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES")
    || !libSource.includes("runtimeObservedAt")
    || !libSource.includes("validateCompositionDocumentChronology")
    || !libSource.includes("intervalMutationExcluded: false")
    || !libSource.includes("abaExcluded: false")
    || !libSource.includes("publicDeploymentAuthorized: false")
    || !libSource.includes("expertClaimsAuthorized: false")
    || !verifierSource.includes("process.exitCode = 1")
  ) {
    throw new Error(
      "SW A-to-B candidate/runtime capture composition sources are not exactly frozen or fail-closed."
    );
  }
  return Object.freeze({
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROJECTS.length,
    clientMappings: SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_TUPLES.length,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false
  });
}

export function verifySwAbUpdateFourChainCompositionGovernance({
  policy,
  policySource,
  evidenceSchema,
  schemaSource,
  checkedSourceDocuments,
  packageJson,
  libSource,
  schemaLoaderSource,
  testSource,
  verifierSource,
  migrationWorkflow = "",
  formalConsumerSources = []
}) {
  validateSwAbFourChainCompositionPolicy(policy);
  const expectedTerminalState = {
    trustClass: "untrusted_four_chain_composition_candidate",
    status: "not_admitted",
    strictGatePassed: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1
  };
  const expectedMutationBoundary = {
    candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true,
    issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true,
    allEvidenceFilesContinuouslyHeldAcrossComposition: false,
    continuousMutationEpochVerified: false,
    samePermissionMutationExcluded: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null
  };
  const expectedAttempts = {
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    rollbackAttempted: false,
    gitAttempted: false
  };
  if (
    typeof policySource !== "string"
    || sha256(policySource) !== REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_RAW_SHA256
    || sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_CANONICAL_SHA256
    || policy.policyId
      !== "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition/v1"
    || policy.evidenceClass !== "offline_untrusted_four_chain_composition_candidate"
    || policy.producerBridgeStatus !== "producer_bridge_absent"
    || !sameJson(policy.releaseIdentity, SW_AB_UPDATE_CANDIDATE_RELEASE_IDENTITY)
    || !sameJson(policy.capabilities, SW_AB_UPDATE_CANDIDATE_CAPABILITIES)
    || !sameJson(policy.requiredSourceBindings, SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS)
    || policy.requiredSourceBindings.length !== 12
    || new Set(policy.requiredSourceBindings.map(({ role }) => role)).size !== 12
    || new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size !== 12
    || policy.requiredCrossBindings?.length !== 9
    || policy.executionAdmission !== "closed_missing_selected_https_origin"
    || !sameJson(policy.terminalState, expectedTerminalState)
    || !sameJson(policy.mutationBoundary, expectedMutationBoundary)
    || !sameJson(policy.attempts, expectedAttempts)
    || !sameJson(policy.authority, SW_AB_UPDATE_CANDIDATE_AUTHORITY)
    || Object.values(policy.authority).some((value) => value !== false)
  ) {
    throw new Error("SW A-to-B four-chain composition policy drifted from the exact closed contract.");
  }

  let actualSourceHashes;
  try {
    actualSourceHashes = checkedSourceDocuments.map((document, index) => {
      const expected = REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES[index];
      const spec = SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS[index];
      if (
        !exactKeys(document, ["role", "path", "source"])
        || document.role !== expected.role
        || document.path !== expected.path
        || spec.role !== expected.role
        || spec.path !== expected.path
        || typeof document.source !== "string"
      ) throw new Error("source identity drifted");
      const parsed = JSON.parse(document.source);
      return Object.freeze({
        role: document.role,
        path: document.path,
        rawSha256: sha256(document.source),
        canonicalSha256: sha256(canonicalJson(parsed))
      });
    });
  } catch (cause) {
    throw new Error(
      "SW A-to-B four-chain composition checked-source inventory is invalid.",
      { cause }
    );
  }
  if (
    !Array.isArray(checkedSourceDocuments)
    || checkedSourceDocuments.length !== 12
    || REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES.length !== 12
    || SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS.length !== 12
    || !sameJson(
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES.map(({ role, path: sourcePath }) => ({
        role,
        path: sourcePath
      })),
      SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS
    )
    || !sameJson(actualSourceHashes, REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES)
    || checkedSourceDocuments[0].source !== policySource
    || checkedSourceDocuments[1].source !== schemaSource
  ) {
    throw new Error(
      "SW A-to-B four-chain composition checked-source raw or canonical hash drifted."
    );
  }

  const schemaProperties = evidenceSchema?.properties;
  const schemaClaims = schemaProperties?.provenanceAndClaims?.properties;
  const schemaMechanicalChecks = schemaProperties?.mechanicalChecks?.properties;
  const schemaMutation = schemaProperties?.mutationBoundary?.properties;
  const schemaAttempts = schemaProperties?.attempts?.properties;
  const schemaAuthority = evidenceSchema?.$defs?.Authority?.properties;
  if (
    typeof schemaSource !== "string"
    || sha256(schemaSource) !== REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_RAW_SHA256
    || sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_CANONICAL_SHA256
    || !exactKeys(evidenceSchema, [
      "$schema",
      "$id",
      "title",
      "$defs",
      "type",
      "additionalProperties",
      "required",
      "properties"
    ])
    || evidenceSchema.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.json"
    || evidenceSchema.type !== "object"
    || evidenceSchema.additionalProperties !== false
    || !Array.isArray(evidenceSchema.required)
    || !exactKeys(schemaProperties, evidenceSchema.required)
    || schemaProperties?.policyId?.const !== policy.policyId
    || schemaProperties?.evidenceClass?.const !== policy.evidenceClass
    || schemaProperties?.producerBridgeStatus?.const !== "producer_bridge_absent"
    || schemaProperties?.recordType?.const
      !== "sw_ab_update_candidate_runtime_client_capture_collector_issuance_composition_v1"
    || schemaProperties?.verificationKind?.const
      !== "offline_four_chain_primary_input_and_issuance_overlap_v1"
    || schemaProperties?.trustClass?.const !== expectedTerminalState.trustClass
    || schemaProperties?.status?.const !== "not_admitted"
    || schemaProperties?.executionAdmission?.const !== "closed_missing_selected_https_origin"
    || schemaProperties?.strictGatePassed?.const !== false
    || schemaProperties?.runtimeAdmissionPassed?.const !== false
    || schemaProperties?.admissionPassed?.const !== false
    || schemaProperties?.usableForRuntimeEvidence?.const !== false
    || schemaProperties?.usableForCandidateAssembly?.const !== false
    || schemaProperties?.usableForAdmission?.const !== false
    || schemaProperties?.formalReleaseEvidenceReceipt?.const !== false
    || schemaProperties?.cliExitCode?.const !== 1
    || schemaProperties?.sourceBindings?.minItems !== 12
    || schemaProperties?.sourceBindings?.maxItems !== 12
    || schemaProperties?.runtimeTupleBindings?.minItems !== 8
    || schemaProperties?.runtimeTupleBindings?.maxItems !== 8
    || schemaProperties?.clientMappings?.minItems !== 8
    || schemaProperties?.clientMappings?.maxItems !== 8
    || evidenceSchema?.$defs?.ReleaseIdentity?.properties?.targetSchema?.const !== 13
    || evidenceSchema?.$defs?.ReleaseIdentity?.properties?.migrationId?.const !== null
    || evidenceSchema?.$defs?.Capabilities?.properties?.mutationEpochCapability?.const
      !== "absent_schema13"
    || evidenceSchema?.$defs?.Capabilities?.properties?.epoch?.const !== null
    || !schemaMechanicalChecks
    || schemaMechanicalChecks?.allEvidenceFilesContinuouslyHeldAcrossComposition?.const !== false
    || Object.entries(schemaMechanicalChecks).some(([key, entry]) =>
      key !== "allEvidenceFilesContinuouslyHeldAcrossComposition" && entry?.const !== true
    )
    || schemaMutation?.candidateAndRuntimePrimaryInputsHeldAcrossIssuance?.const !== true
    || schemaMutation?.issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification?.const
      !== true
    || schemaMutation?.allEvidenceFilesContinuouslyHeldAcrossComposition?.const !== false
    || schemaMutation?.endpointStabilityVerified?.const !== true
    || Object.entries(schemaMutation ?? {}).some(([key, entry]) =>
      ![
        "candidateAndRuntimePrimaryInputsHeldAcrossIssuance",
        "issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification",
        "allEvidenceFilesContinuouslyHeldAcrossComposition",
        "endpointStabilityVerified",
        "mutationEpochCapability",
        "epoch"
      ].includes(key)
        && entry?.const !== false
    )
    || schemaMutation?.mutationEpochCapability?.const !== "absent_schema13"
    || schemaMutation?.epoch?.const !== null
    || Object.values(schemaAttempts ?? {}).some((entry) => entry?.const !== false)
    || Object.values(schemaClaims ?? {}).some((entry) => entry?.const !== false)
    || Object.values(schemaAuthority ?? {}).some((entry) => entry?.const !== false)
  ) {
    throw new Error("SW A-to-B four-chain composition Schema drifted from the exact closed contract.");
  }

  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW A-to-B four-chain composition package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(
        `SW A-to-B four-chain composition lifecycle aliases are forbidden: ${scriptName}.`
      );
    }
  }
  const familyPattern =
    /(?:sw[-_ ]ab[-_ ]update[-_ ]candidate[-_ ]runtime[-_ ]client[-_ ]capture[-_ ]collector[-_ ]issuance[-_ ]composition|sw_ab_update_candidate_runtime_client_capture_collector_issuance_composition)/iu;
  const expectedScriptNames = Object.keys(REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCRIPTS);
  const expectedScriptNameSet = new Set(expectedScriptNames);
  const familyScriptNames = Object.keys(packageJson?.scripts ?? {}).filter((scriptName) =>
    familyPattern.test(scriptName)
  );
  const genericAliases = Object.entries(packageJson?.scripts ?? {}).filter(
    ([scriptName, command]) => !expectedScriptNameSet.has(scriptName)
      && typeof command === "string"
      && familyPattern.test(command)
  );
  if (
    !sameJson(familyScriptNames.sort(), expectedScriptNames.sort())
    || genericAliases.length !== 0
    || packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
    || packageJson.scripts["test:release-evidence"].includes(
      "client-capture-collector-issuance-composition"
    )
  ) {
    throw new Error(
      "SW A-to-B four-chain composition must remain reachable only through two standalone closed scripts."
    );
  }

  const expectedSourceHashes = [
    [libSource, REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_LIB_SOURCE_SHA256],
    [
      schemaLoaderSource,
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
    ],
    [testSource, REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_TEST_SOURCE_SHA256],
    [verifierSource, REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_VERIFIER_SOURCE_SHA256]
  ];
  const executionSources = [libSource, verifierSource].join("\n");
  const forbiddenFormalTokens = [
    "dist/web/release-evidence.json",
    "tmp/release-evidence-receipts",
    "formal-verification.json",
    "verifyRollbackEvidence",
    "assertRollbackExecutionAdmission",
    "generateReleaseEvidence"
  ];
  if (
    expectedSourceHashes.some(([source, expected]) => sourceSha256(source) !== expected)
    || forbiddenFormalTokens.some((token) => executionSources.includes(token))
    || !libSource.includes("SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS")
    || !libSource.includes("composeSwAbUpdateCandidateRuntimeClientCapture")
    || !libSource.includes("loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle")
    || !libSource.includes("loadVerifiedSwAbUpdateRuntimeCollectorIssuance")
    || !libSource.includes("onHeldEpochCheckpoint")
    || !libSource.includes("candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true")
    || !libSource.includes(
      "issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true"
    )
    || !libSource.includes("allEvidenceFilesContinuouslyHeldAcrossComposition: false")
    || !libSource.includes("continuousMutationEpochVerified: false")
    || !libSource.includes("publicDeploymentAuthorized: false")
    || !libSource.includes("expertClaimsAuthorized: false")
    || !verifierSource.includes("process.exitCode = 1")
    || formalConsumerSources.some((source) => familyPattern.test(source))
    || migrationRunCommands(migrationWorkflow).some((command) => familyPattern.test(command))
  ) {
    throw new Error(
      "SW A-to-B four-chain composition sources are not exactly frozen or isolated from formal admission."
    );
  }

  return Object.freeze({
    status: "not_admitted",
    executionAdmission: "closed_missing_selected_https_origin",
    trustClass: "untrusted_four_chain_composition_candidate",
    producerBridgeStatus: "producer_bridge_absent",
    checkedSourceBindings: 12,
    checkedSourceRawAndCanonicalHashes: 12,
    runtimeTupleBindings: 8,
    clientMappings: 8,
    candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true,
    issuanceFilesHeldAcrossOldCompositionAndTranscriptReverification: true,
    allEvidenceFilesContinuouslyHeldAcrossComposition: false,
    continuousMutationEpochVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function verifySwAbRuntimeDerivedEvidenceProducerBridgeGovernance({
  policy,
  policySource,
  evidenceSchema,
  schemaSource,
  checkedSourceDocuments,
  packageJson,
  libSource,
  schemaLoaderSource,
  writerSource,
  loaderSource,
  fixtureSource,
  testSource,
  verifierSource,
  ciWorkflowSources = [],
  forbiddenConsumerSources = []
}) {
  validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy(policy);
  const expectedOutputLayout = {
    derivedEvidenceFile: "01-derived-runtime-client-capture.json",
    terminalPublicationFile: "99-producer-bridge-publication.json",
    pendingCommitMarkerFile: ".producer-bridge-publication-pending",
    terminalCommitMarkerFile: "100-producer-bridge-publication-commit.sha256",
    terminalCommitMarkerEncoding: "lowercase_publication_digest_hex_plus_lf",
    exactFileCount: 3,
    artifactOutputCount: 2,
    publicationDocumentWrittenBeforeTerminalCommit: true,
    terminalCommitMarkerPublishedLast: true,
    existingFinalRootReuseAllowed: false
  };
  const expectedTerminalState = {
    trustClass: "untrusted_derived_evidence_producer_bridge_candidate",
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1
  };
  if (
    typeof policySource !== "string"
    || sha256(policySource)
      !== REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_RAW_SHA256
    || sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_CANONICAL_SHA256
    || policy.policyId !== "sw-ab-update-runtime-derived-evidence-producer-bridge-policy-v1"
    || policy.producerBridgeStatus !== "producer_bridge_present_mechanically_untrusted"
    || policy.evidenceClass
      !== "offline_untrusted_runtime_derived_evidence_producer_bridge_candidate"
    || policy.status !== "bridge_candidate_not_admitted"
    || policy.executionAdmission !== "closed_missing_selected_https_origin"
    || !sameJson(
      policy.releaseIdentity,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY
    )
    || !sameJson(
      policy.capabilities,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES
    )
    || !sameJson(
      policy.requiredSourceBindings,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
    )
    || policy.requiredSourceBindings.length !== 8
    || new Set(policy.requiredSourceBindings.map(({ role }) => role)).size !== 8
    || new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size !== 8
    || !sameJson(policy.outputLayout, expectedOutputLayout)
    || !sameJson(
      policy.publicationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY
    )
    || !sameJson(
      policy.mutationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY
    )
    || !sameJson(
      policy.provenance,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE
    )
    || !sameJson(
      policy.authority,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY
    )
    || !sameJson(
      policy.attempts,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS
    )
    || !sameJson(policy.terminalState, expectedTerminalState)
    || Object.values(policy.provenance).some((value) => value !== false)
    || Object.values(policy.authority).some((value) => value !== false)
    || Object.values(policy.attempts).some((value) => value !== false)
  ) {
    throw new Error(
      "SW runtime derived-evidence producer bridge policy drifted from the exact closed contract."
    );
  }

  if (!Array.isArray(checkedSourceDocuments) || checkedSourceDocuments.length !== 8) {
    throw new Error(
      "SW runtime derived-evidence producer bridge checked-source inventory is invalid."
    );
  }
  let actualSourceHashes;
  try {
    actualSourceHashes = checkedSourceDocuments.map((document, index) => {
      const expected =
        REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES[index];
      const requirement =
        SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS[index];
      if (
        !exactKeys(document, ["role", "path", "source"])
        || document.role !== expected.role
        || document.path !== expected.path
        || requirement.role !== expected.role
        || requirement.path !== expected.path
        || typeof document.source !== "string"
      ) throw new Error("source identity drifted");
      const value = JSON.parse(document.source);
      return Object.freeze({
        role: document.role,
        path: document.path,
        rawSha256: sha256(document.source),
        canonicalSha256: sha256(canonicalJson(value))
      });
    });
  } catch (cause) {
    throw new Error(
      "SW runtime derived-evidence producer bridge checked-source inventory is invalid.",
      { cause }
    );
  }
  if (
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES.length !== 8
    || SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.length !== 8
    || !sameJson(
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES.map(
        ({ role, path: sourcePath }) => ({ role, path: sourcePath })
      ),
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
    )
    || !sameJson(
      actualSourceHashes,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES
    )
    || checkedSourceDocuments[0].source !== policySource
    || checkedSourceDocuments[1].source !== schemaSource
  ) {
    throw new Error(
      "SW runtime derived-evidence producer bridge checked-source raw or canonical hash drifted."
    );
  }

  const constObjectMatches = (definition, expected) =>
    exactKeys(definition, ["type", "additionalProperties", "required", "properties"])
    && definition.type === "object"
    && definition.additionalProperties === false
    && sameJson(definition.required, Object.keys(expected))
    && exactKeys(definition.properties, Object.keys(expected))
    && Object.entries(expected).every(([key, value]) =>
      value === null
        ? definition.properties[key]?.type === "null"
          && !Object.hasOwn(definition.properties[key], "const")
        : definition.properties[key]?.const === value
    );
  const schemaProperties = evidenceSchema?.properties;
  if (
    typeof schemaSource !== "string"
    || sha256(schemaSource)
      !== REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_RAW_SHA256
    || sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.json"
    || evidenceSchema?.type !== "object"
    || evidenceSchema?.additionalProperties !== false
    || !Array.isArray(evidenceSchema?.required)
    || !exactKeys(schemaProperties, evidenceSchema.required)
    || schemaProperties?.recordType?.const
      !== "sw_ab_update_runtime_derived_evidence_producer_bridge_publication_v1"
    || schemaProperties?.producerBridgeStatus?.const
      !== "producer_bridge_present_mechanically_untrusted"
    || schemaProperties?.evidenceClass?.const
      !== "offline_untrusted_runtime_derived_evidence_producer_bridge_candidate"
    || schemaProperties?.trustClass?.const !== expectedTerminalState.trustClass
    || schemaProperties?.status?.const !== "bridge_candidate_not_admitted"
    || schemaProperties?.executionAdmission?.const !== "closed_missing_selected_https_origin"
    || schemaProperties?.strictGatePassed?.const !== false
    || schemaProperties?.runtimeAdmissionPassed?.const !== false
    || schemaProperties?.admissionPassed?.const !== false
    || schemaProperties?.usableForRuntimeEvidence?.const !== false
    || schemaProperties?.usableForCandidateAssembly?.const !== false
    || schemaProperties?.usableForAdmission?.const !== false
    || schemaProperties?.formalReleaseEvidenceReceipt?.const !== false
    || schemaProperties?.cliExitCode?.const !== 1
    || schemaProperties?.sourceBindings?.minItems !== 8
    || schemaProperties?.sourceBindings?.maxItems !== 8
    || !constObjectMatches(
      evidenceSchema?.$defs?.ReleaseIdentity,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_RELEASE_IDENTITY
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.Capabilities,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_CAPABILITIES
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.PublicationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_BOUNDARY
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.MutationBoundary,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_MUTATION_BOUNDARY
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.Provenance,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PROVENANCE
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.Authority,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY
    )
    || !constObjectMatches(
      evidenceSchema?.$defs?.Attempts,
      SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_ATTEMPTS
    )
  ) {
    throw new Error(
      "SW runtime derived-evidence producer bridge Schema drifted from the exact closed contract."
    );
  }

  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW runtime derived-evidence producer bridge package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(
        `SW runtime derived-evidence producer bridge lifecycle aliases are forbidden: ${scriptName}.`
      );
    }
  }
  const expectedScriptNames = Object.keys(
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS
  );
  const expectedScriptNameSet = new Set(expectedScriptNames);
  const familyScriptNames = Object.keys(packageJson?.scripts ?? {}).filter((scriptName) =>
    containsSwAbRuntimeDerivedEvidenceProducerBridge(scriptName)
  );
  const genericAliases = Object.entries(packageJson?.scripts ?? {}).filter(
    ([scriptName, command]) => !expectedScriptNameSet.has(scriptName)
      && containsSwAbRuntimeDerivedEvidenceProducerBridge(command)
  );
  if (
    !sameJson(familyScriptNames.sort(), expectedScriptNames.sort())
    || genericAliases.length !== 0
    || packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
  ) {
    throw new Error(
      "SW runtime derived-evidence producer bridge must remain reachable only through two standalone closed scripts."
    );
  }

  const expectedSourceHashes = [
    [libSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LIB_SOURCE_SHA256],
    [
      schemaLoaderSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_LOADER_SOURCE_SHA256
    ],
    [writerSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_WRITER_SOURCE_SHA256],
    [loaderSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LOADER_SOURCE_SHA256],
    [fixtureSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_FIXTURE_SOURCE_SHA256],
    [testSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TEST_SOURCE_SHA256],
    [verifierSource, REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_VERIFIER_SOURCE_SHA256]
  ];
  const executionSources = [libSource, writerSource, loaderSource, verifierSource].join("\n");
  const forbiddenFormalTokens = [
    "dist/web/release-evidence.json",
    "tmp/release-evidence-receipts",
    "formal-verification.json",
    "verifyRollbackEvidence",
    "assertRollbackExecutionAdmission",
    "generateReleaseEvidence"
  ];
  if (
    expectedSourceHashes.some(([source, expected]) => sourceSha256(source) !== expected)
    || forbiddenFormalTokens.some((token) => executionSources.includes(token))
    || !libSource.includes("SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS")
    || !libSource.includes('".producer-bridge-publication-pending"')
    || !libSource.includes('"100-producer-bridge-publication-commit.sha256"')
    || !libSource.includes("return Buffer.from(`${publicationDigest}\\n`, \"utf8\")")
    || !libSource.includes("assertExactSwAbRuntimeDerivedEvidenceProducerBridgePendingFileSet")
    || !writerSource.includes("await dependencies.rename(stagingRoot, resolved.bridgeRoot)")
    || !writerSource.includes("await rename(pendingCommitPath, terminalCommitPath)")
    || writerSource.includes("await dependencies.rename(pendingCommitPath, terminalCommitPath)")
    || !writerSource.includes("beforeTerminalCommit")
    || !writerSource.includes("await handle.sync()")
    || !writerSource.includes("onHeldEpochCheckpoint")
    || !loaderSource.includes("loadVerifiedSwAbUpdateRuntimeCollectorIssuance")
    || !loaderSource.includes("loadVerifiedSwAbUpdateRuntimeApiTranscriptBundle")
    || !loaderSource.includes("assertExactSwAbRuntimeDerivedEvidenceProducerBridgeFileSet")
    || !loaderSource.includes("terminalGate: terminalCommitHeld[0].identity")
    || !verifierSource.includes("process.exitCode = 1")
    || fixtureSource.includes("sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs")
    || forbiddenConsumerSources.some((source) =>
      containsSwAbRuntimeDerivedEvidenceProducerBridge(source)
    )
    || ciWorkflowSources.some((workflowSource) =>
      migrationRunCommands(workflowSource).some((command) =>
        containsSwAbRuntimeDerivedEvidenceProducerBridge(command)
      )
    )
  ) {
    throw new Error(
      "SW runtime derived-evidence producer bridge sources are not exactly frozen or isolated from formal admission."
    );
  }

  return Object.freeze({
    producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
    status: "bridge_candidate_not_admitted",
    executionAdmission: "closed_missing_selected_https_origin",
    trustClass: "untrusted_derived_evidence_producer_bridge_candidate",
    checkedSourceBindings: 8,
    checkedSourceRawAndCanonicalHashes: 8,
    exactCommittedFileCount: 3,
    artifactOutputCount: 2,
    completePendingSetVerifiedBeforeRootRename: true,
    sameParentPendingRootRenameCompleted: true,
    finalPendingSetVerifiedBeforeTerminalCommit: true,
    terminalCommitMarkerBoundToPublicationDigest: true,
    terminalCommitMarkerPublishedLastBySameDirectoryRename: true,
    publicLoaderRequiresTerminalCommitMarker: true,
    businessOutputHandlesHeldAcrossTerminalCommit: true,
    pendingCommitMarkerHandleHeldAcrossRename: false,
    postTerminalCommitThrowingWorkAbsent: true,
    nativeTerminalCommitRenameNotOverridableByTestSeam: true,
    issuanceFilesHeldAcrossTerminalCommit: false,
    allEightContractSourcesHeldAcrossTerminalCommit: false,
    allEvidenceFilesContinuouslyHeldAcrossCaptureAndPublication: false,
    crashDurabilityVerified: false,
    concurrentReaderSnapshotIsolationVerified: false,
    continuousMutationEpochVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function verifySwAbProducerBridgeCompositionGovernance({
  policy,
  policySource,
  evidenceSchema,
  schemaSource,
  checkedSourceDocuments,
  packageJson,
  libSource,
  schemaLoaderSource,
  fixtureSource,
  testSource,
  verifierSource,
  ciWorkflowSources = [],
  forbiddenConsumerSources = []
}) {
  validateSwAbProducerBridgeCompositionPolicy(policy);
  const expectedReleaseIdentity = {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  };
  const expectedCapabilities = {
    mutationEpochCapability: "absent_schema13",
    epoch: null
  };
  const expectedRunAttemptBoundary = {
    runAttemptIdentifiersMatched: true,
    runAttemptCoordinationStatus: "run_attempt_coordination_absent",
    runAttemptCoordinationVerified: false,
    candidateProducerBoundToIssuanceAttempt: false
  };
  const expectedMutationBoundary = {
    candidateAndBridgePrimaryInputsHeldAcrossIssuance: true,
    issuanceFilesHeldAcrossCompositionBranches: true,
    allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition: false,
    continuousMutationEpochVerified: false,
    samePermissionMutationExcluded: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    mutationEpochCapability: "absent_schema13",
    epoch: null
  };
  const expectedAttempts = {
    networkAttempted: false,
    browserAttempted: false,
    deploymentAttempted: false,
    rollbackAttempted: false,
    gitAttempted: false
  };
  const expectedProvenance = {
    candidateProducerProvenanceVerified: false,
    trustedProducerBridgeVerified: false,
    runtimeCollectorProvenanceVerified: false,
    callerSuppliedObservationAuthenticityVerified: false,
    browserObjectIssuanceAuthenticityVerified: false,
    browserBinaryProvenanceVerified: false,
    browserRuntimeProvenanceVerified: false,
    browserTransportAuthenticityVerified: false,
    realBrowserExecutionVerified: false,
    realHttpsHostVerified: false,
    externalAttemptFreshnessVerified: false,
    bundleReplayResistanceVerified: false,
    deploymentExecutionVerified: false,
    rollbackExecutionVerified: false,
    releaseReadinessVerified: false,
    contentTruthVerified: false,
    expertClaimsVerified: false,
    rightsLegalConclusionVerified: false
  };
  const expectedAuthority = {
    defaultV13ReceiptAllowlistMember: false,
    formalReleaseEvidenceReceipt: false,
    trustedProviderVerified: false,
    trustedHostVerified: false,
    trustedBrowserRuntimeVerified: false,
    deploymentReady: false,
    releaseReady: false,
    externalDeploymentExecutionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    contentTruthAuthorized: false,
    expertClaimsAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    schemaPromotionAuthorized: false
  };
  const expectedTerminalState = {
    trustClass: "untrusted_four_chain_producer_bridge_composition_candidate",
    status: "not_admitted",
    strictGatePassed: false,
    runtimeAdmissionPassed: false,
    admissionPassed: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    cliExitCode: 1
  };
  if (
    typeof policySource !== "string"
    || sha256(policySource) !== REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_RAW_SHA256
    || sha256(canonicalJson(policy))
      !== REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_CANONICAL_SHA256
    || policy.schemaVersion !== 2
    || policy.policyId
      !== "hakimi.web-v1.sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition/v2"
    || policy.evidenceClass !== "offline_untrusted_four_chain_producer_bridge_composition_candidate"
    || policy.producerBridgeStatus !== "producer_bridge_present_mechanically_untrusted"
    || policy.candidateBridgeArtifactPresent !== true
    || policy.trustedProducerBridgeVerified !== false
    || policy.runAttemptCoordinationStatus !== "run_attempt_coordination_absent"
    || policy.executionAdmission !== "closed_missing_selected_https_origin"
    || !sameJson(policy.releaseIdentity, expectedReleaseIdentity)
    || !sameJson(policy.capabilities, expectedCapabilities)
    || !sameJson(policy.requiredSourceBindings, SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS)
    || policy.requiredSourceBindings.length !== 14
    || new Set(policy.requiredSourceBindings.map(({ role }) => role)).size !== 14
    || new Set(policy.requiredSourceBindings.map(({ path: sourcePath }) => sourcePath)).size !== 14
    || !Array.isArray(policy.requiredCrossBindings)
    || policy.requiredCrossBindings.length !== 12
    || !sameJson(policy.terminalState, expectedTerminalState)
    || !sameJson(policy.runAttemptBoundary, expectedRunAttemptBoundary)
    || !sameJson(policy.mutationBoundary, expectedMutationBoundary)
    || !sameJson(policy.attempts, expectedAttempts)
    || !sameJson(policy.provenance, expectedProvenance)
    || !sameJson(policy.authority, expectedAuthority)
    || !Array.isArray(policy.limitations)
    || policy.limitations.length !== 6
  ) {
    throw new Error(
      "SW producer-bridge composition policy drifted from the exact closed v2 contract."
    );
  }

  if (!Array.isArray(checkedSourceDocuments) || checkedSourceDocuments.length !== 14) {
    throw new Error("SW producer-bridge composition checked-source inventory is invalid.");
  }
  let actualSourceHashes;
  try {
    actualSourceHashes = checkedSourceDocuments.map((document, index) => {
      const expected = REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES[index];
      const requirement = SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS[index];
      if (
        !exactKeys(document, ["role", "path", "source"])
        || document.role !== expected.role
        || document.path !== expected.path
        || requirement.role !== expected.role
        || requirement.path !== expected.path
        || typeof document.source !== "string"
        || document.source.startsWith("\uFEFF")
      ) throw new Error("source identity drifted");
      const value = JSON.parse(document.source);
      return Object.freeze({
        role: document.role,
        path: document.path,
        rawSha256: sha256(document.source),
        canonicalSha256: sha256(canonicalJson(value))
      });
    });
  } catch (cause) {
    throw new Error("SW producer-bridge composition checked-source inventory is invalid.", {
      cause
    });
  }
  if (
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES.length !== 14
    || SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.length !== 14
    || !sameJson(
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES.map(
        ({ role, path: sourcePath }) => ({ role, path: sourcePath })
      ),
      SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS
    )
    || !sameJson(actualSourceHashes, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES)
    || checkedSourceDocuments[0].source !== policySource
    || checkedSourceDocuments[1].source !== schemaSource
  ) {
    throw new Error(
      "SW producer-bridge composition checked-source raw or canonical hash drifted."
    );
  }

  const constObjectMatches = (definition, expected) =>
    definition?.type === "object"
    && definition.additionalProperties === false
    && sameJson(definition.required, Object.keys(expected))
    && exactKeys(definition.properties, Object.keys(expected))
    && Object.entries(expected).every(([key, value]) =>
      Object.hasOwn(definition.properties[key] ?? {}, "const")
      && definition.properties[key].const === value
    );
  const schemaProperties = evidenceSchema?.properties;
  if (
    typeof schemaSource !== "string"
    || sha256(schemaSource) !== REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_RAW_SHA256
    || sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.json"
    || evidenceSchema?.type !== "object"
    || evidenceSchema?.additionalProperties !== false
    || !Array.isArray(evidenceSchema?.required)
    || evidenceSchema.required.length !== 44
    || !exactKeys(schemaProperties, evidenceSchema.required)
    || schemaProperties?.schemaVersion?.const !== 2
    || schemaProperties?.producerBridgeStatus?.const
      !== "producer_bridge_present_mechanically_untrusted"
    || schemaProperties?.candidateBridgeArtifactPresent?.const !== true
    || schemaProperties?.trustedProducerBridgeVerified?.const !== false
    || schemaProperties?.runAttemptIdentifiersMatched?.const !== true
    || schemaProperties?.runAttemptCoordinationStatus?.const !== "run_attempt_coordination_absent"
    || schemaProperties?.runAttemptCoordinationVerified?.const !== false
    || schemaProperties?.candidateProducerBoundToIssuanceAttempt?.const !== false
    || schemaProperties?.trustClass?.const !== expectedTerminalState.trustClass
    || schemaProperties?.status?.const !== "not_admitted"
    || schemaProperties?.executionAdmission?.const !== "closed_missing_selected_https_origin"
    || schemaProperties?.strictGatePassed?.const !== false
    || schemaProperties?.runtimeAdmissionPassed?.const !== false
    || schemaProperties?.admissionPassed?.const !== false
    || schemaProperties?.usableForRuntimeEvidence?.const !== false
    || schemaProperties?.usableForCandidateAssembly?.const !== false
    || schemaProperties?.usableForAdmission?.const !== false
    || schemaProperties?.formalReleaseEvidenceReceipt?.const !== false
    || schemaProperties?.cliExitCode?.const !== 1
    || schemaProperties?.sourceBindings?.minItems !== 14
    || schemaProperties?.sourceBindings?.maxItems !== 14
    || !constObjectMatches(evidenceSchema?.$defs?.ReleaseIdentity, expectedReleaseIdentity)
    || !constObjectMatches(evidenceSchema?.$defs?.Capabilities, expectedCapabilities)
    || !constObjectMatches(evidenceSchema?.$defs?.Attempts, expectedAttempts)
    || !constObjectMatches(evidenceSchema?.$defs?.Provenance, expectedProvenance)
    || !constObjectMatches(evidenceSchema?.$defs?.Authority, expectedAuthority)
    || !constObjectMatches(schemaProperties?.runAttemptBoundary, expectedRunAttemptBoundary)
    || !constObjectMatches(schemaProperties?.mutationBoundary, expectedMutationBoundary)
  ) {
    throw new Error(
      "SW producer-bridge composition Schema drifted from the exact closed v2 contract."
    );
  }

  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW producer-bridge composition package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(`SW producer-bridge composition lifecycle aliases are forbidden: ${scriptName}.`);
    }
  }
  const expectedScriptNames = Object.keys(REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS);
  const expectedScriptNameSet = new Set(expectedScriptNames);
  const familyScriptNames = Object.keys(packageJson?.scripts ?? {}).filter((scriptName) =>
    containsSwAbProducerBridgeComposition(scriptName)
  );
  const genericAliases = Object.entries(packageJson?.scripts ?? {}).filter(
    ([scriptName, command]) => !expectedScriptNameSet.has(scriptName)
      && containsSwAbProducerBridgeComposition(command)
  );
  if (
    !sameJson(familyScriptNames.sort(), expectedScriptNames.sort())
    || genericAliases.length !== 0
    || packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND
  ) {
    throw new Error(
      "SW producer-bridge composition must remain reachable only through two standalone closed scripts."
    );
  }

  const expectedSourceHashes = [
    [libSource, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_LIB_SOURCE_SHA256],
    [schemaLoaderSource, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256],
    [fixtureSource, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_FIXTURE_SOURCE_SHA256],
    [testSource, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_TEST_SOURCE_SHA256],
    [verifierSource, REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_VERIFIER_SOURCE_SHA256]
  ];
  const executionSources = [libSource, verifierSource].join("\n");
  const forbiddenFormalTokens = [
    "dist/web/release-evidence.json",
    "tmp/release-evidence-receipts",
    "formal-verification.json",
    "verifyRollbackEvidence",
    "assertRollbackExecutionAdmission",
    "generateReleaseEvidence"
  ];
  if (
    expectedSourceHashes.some(([source, expected]) => sourceSha256(source) !== expected)
    || forbiddenFormalTokens.some((token) => executionSources.includes(token))
    || !libSource.includes("SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS")
    || !libSource.includes("Promise.allSettled")
    || !libSource.includes("SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE")
    || !libSource.includes("SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE")
    || !libSource.includes("&& isRecord(bridgeLoaded.endpointFingerprint.terminalGate)")
    || !libSource.includes("identity: bridgeLoaded.endpointFingerprint.terminalGate")
    || !libSource.includes("return assertSwAbProducerBridgeCompositionPhysicalIdentities")
    || !libSource.includes("run_attempt_coordination_absent")
    || !fixtureSource.includes("terminalGate: terminalGateIdentity")
    || !testSource.includes("delete args.bridgeLoaded.endpointFingerprint.terminalGate")
    || !testSource.includes("bridge terminal gate physically aliased to another input")
    || !verifierSource.includes("process.exitCode = 1")
    || fixtureSource.includes(
      "sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs"
    )
    || forbiddenConsumerSources.some((source) => containsSwAbProducerBridgeComposition(source))
    || ciWorkflowSources.some((workflowSource) =>
      migrationRunCommands(workflowSource).some((command) =>
        containsSwAbProducerBridgeComposition(command)
      )
    )
  ) {
    throw new Error(
      "SW producer-bridge composition sources are not exactly frozen or isolated from formal admission."
    );
  }

  return Object.freeze({
    producerBridgeStatus: "producer_bridge_present_mechanically_untrusted",
    status: "not_admitted",
    executionAdmission: "closed_missing_selected_https_origin",
    trustClass: "untrusted_four_chain_producer_bridge_composition_candidate",
    checkedSourceBindings: 14,
    checkedSourceRawAndCanonicalHashes: 14,
    bridgeTerminalGateShapeVerified: true,
    bridgeTerminalGatePhysicalInclusionVerified: true,
    runAttemptIdentifiersMatched: true,
    runAttemptCoordinationStatus: "run_attempt_coordination_absent",
    runAttemptCoordinationVerified: false,
    candidateProducerBoundToIssuanceAttempt: false,
    candidateAndBridgePrimaryInputsHeldAcrossIssuance: true,
    issuanceFilesHeldAcrossCompositionBranches: true,
    allEvidenceFilesContinuouslyHeldAcrossCaptureAndComposition: false,
    continuousMutationEpochVerified: false,
    usableForRuntimeEvidence: false,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
}

export function verifyCandidateReceiptTerminalGateGovernance({
  hostRuntimeSource,
  hostLoaderSource,
  providerRuntimeSource,
  providerRuntimeTestSource,
  providerLoaderSource,
  compositionSource,
  providerSequenceSchema,
  providerSequenceLoaderSource,
  providerSequenceVerifierSource,
  providerSequenceWriterSource
}) {
  const sources = {
    hostRuntimeSource,
    hostLoaderSource,
    providerRuntimeSource,
    providerRuntimeTestSource,
    providerLoaderSource,
    compositionSource,
    providerSequenceLoaderSource,
    providerSequenceVerifierSource,
    providerSequenceWriterSource
  };
  if (Object.values(sources).some((source) => typeof source !== "string" || source.length === 0)) {
    throw new Error("Candidate receipt terminal-gate governance sources are incomplete.");
  }
  const sequenceTerminalGateBinding = providerSequenceSchema?.$defs?.TerminalGateBinding;
  const sequenceFixedFiles = providerSequenceSchema?.$defs?.FixedFiles;
  if (
    !isRecord(providerSequenceSchema)
    || sha256(canonicalJson(providerSequenceSchema))
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_SCHEMA_CANONICAL_SHA256
    || providerSequenceSchema.$id
      !== "https://hakimi.invalid/schemas/provider-deployment-candidate-sequence-v1.json"
    || providerSequenceSchema.additionalProperties !== false
    || sequenceTerminalGateBinding?.additionalProperties !== false
    || JSON.stringify([...(sequenceTerminalGateBinding?.required ?? [])].sort())
      !== JSON.stringify(["path", "size", "sha256", "commitsReceiptSha256"].sort())
    || sequenceTerminalGateBinding?.properties?.path?.$ref !== "#/$defs/RelativePath"
    || sequenceTerminalGateBinding?.properties?.size?.const !== 65
    || sequenceTerminalGateBinding?.properties?.sha256?.$ref !== "#/$defs/Sha256"
    || sequenceTerminalGateBinding?.properties?.commitsReceiptSha256?.$ref
      !== "#/$defs/Sha256"
    || sequenceFixedFiles?.additionalProperties !== false
    || !sequenceFixedFiles?.required?.includes("terminal-commit")
    || sequenceFixedFiles?.properties?.["terminal-commit"]?.$ref
      !== "#/$defs/TerminalGateBinding"
  ) {
    throw new Error(
      "Provider sequence Schema drifted from the frozen exact four-field terminal commitment."
    );
  }
  const requireFragments = (label, source, fragments) => {
    for (const fragment of fragments) {
      if (!source.includes(fragment)) {
        throw new Error(`${label} terminal-gate governance fragment is missing: ${fragment}.`);
      }
    }
  };
  requireFragments("Host writer", hostRuntimeSource, [
    '".host-receipt-publication-pending"',
    '"host-receipt-publication-commit.sha256"',
    "commitsReceiptSha256: writtenReceipt.binding.sha256",
    "await rename(pendingCommitPath, terminalCommitPath);"
  ]);
  requireFragments("Host loader", hostLoaderSource, [
    '"host-receipt-publication-commit.sha256"',
    "TERMINAL_COMMIT_MARKER_BYTES = 65",
    "commitsReceiptSha256: receiptSnapshot.binding.sha256",
    "terminalCommitMarkerVerified: true"
  ]);
  requireFragments("Provider writer", providerRuntimeSource, [
    '".provider-deployment-candidate-receipt-publication-pending"',
    '"provider-deployment-candidate-receipt-commit.sha256"',
    "commitsReceiptSha256: writtenReceipt.binding.sha256",
    "await rename(writtenPendingTerminalCommit.filePath, terminalCommitPath);"
  ]);
  if (
    !/await rename\(pendingCommitPath, terminalCommitPath\);\r?\n\s*return result;/u.test(hostRuntimeSource)
    || !/await rename\(writtenPendingTerminalCommit\.filePath, terminalCommitPath\);\r?\n\s*return completedResult;/u.test(providerRuntimeSource)
  ) {
    throw new Error("Candidate receipt terminal rename must be followed only by its preconstructed synchronous return.");
  }
  requireFragments("Provider loader", providerLoaderSource, [
    '"provider-deployment-candidate-receipt-commit.sha256"',
    "TERMINAL_COMMIT_MARKER_BYTES = 65",
    "commitsReceiptSha256: receiptSnapshot.binding.sha256",
    "terminalCommitMarkerVerified: true"
  ]);
  for (const [label, source] of [
    ["Host writer", hostRuntimeSource],
    ["Provider writer", providerRuntimeSource]
  ]) {
    if (
      /onReceiptPublishedCheckpoint|onDestinationPublished/u.test(source)
      || /publishDiscardTombstone|DISCARD_TOMBSTONE|receiptDestinationPublished/u.test(source)
    ) {
      throw new Error(`${label} restored an arbitrary callback or compensation-tombstone publication seam.`);
    }
  }
  requireFragments("Host/provider composition", compositionSource, [
    '"host-receipt-publication-commit.sha256"',
    '"provider-deployment-candidate-receipt-commit.sha256"',
    '"terminalGateBinding"',
    "terminalCommitMarkerVerified: true"
  ]);
  requireFragments("Provider sequence loader", providerSequenceLoaderSource, [
    '"terminal-commit": "provider-deployment-candidate-receipt-commit.sha256"',
    "commitsReceiptSha256 !== receipt.sha256",
    "terminalCommitMarkerVerified: true"
  ]);
  requireFragments("Provider sequence verifier", providerSequenceVerifierSource, [
    'terminalCommit.sha256 !== sha256(`${receipt.sha256}\\n`)',
    "checkpoint.heldFileIdentities.length !== 17",
    "expectedPaths.size !== 17",
    "physically distinct from all 17 composer inputs"
  ]);
  requireFragments("Provider sequence CLI", providerSequenceWriterSource, [
    "candidatePublicationCompleted: true",
    "sequenceCandidateWritten: true",
    "stdoutPresentationCompleted: true",
    "publicVerifierRequiredAfterWriterReturn: true",
    "sequenceCandidateWritten: candidatePublicationCompleted",
    "stdoutPresentationCompleted: false",
    "publicVerifierRequiredAfterWriterReturn: candidatePublicationCompleted",
    "outputDiscardRequired,",
    "cliFailureLedger(error, undefined)",
    "cliFailureLedger(error, result)",
    "await stdoutWrite("
  ]);
  const normalizedSequenceWriterSource = providerSequenceWriterSource.replace(/\r\n?/gu, "\n");
  const cliRunnerStart = normalizedSequenceWriterSource.indexOf(
    "export async function runProviderDeploymentCandidateSequenceWriterCli(options = {}) {"
  );
  const cliRunnerEnd = normalizedSequenceWriterSource.indexOf(
    "\n}\n\nif (process.argv[1]",
    cliRunnerStart
  );
  const cliRunnerSource = cliRunnerStart >= 0 && cliRunnerEnd > cliRunnerStart
    ? normalizedSequenceWriterSource.slice(cliRunnerStart, cliRunnerEnd + 2)
    : "";
  if (
    cliRunnerSource.length === 0
    || !/let result;\n\s*try \{[\s\S]*?result = await writeProviderDeploymentCandidateSequenceCandidate\([\s\S]*?\} catch \(error\) \{[\s\S]*?cliFailureLedger\(error, undefined\)[\s\S]*?return 1;\n\s*\}\n\s*try \{\n\s*await stdoutWrite\([\s\S]*?\} catch \(error\) \{[\s\S]*?cliFailureLedger\(error, result\)[\s\S]*?return 1;/u.test(
      cliRunnerSource
    )
  ) {
    throw new Error(
      "Provider sequence CLI must keep candidate publication and awaited stdout presentation in separate ledgers."
    );
  }

  const normalizedProviderRuntimeTestSource = providerRuntimeTestSource.replace(/\r\n?/gu, "\n");
  const integrationTestStartMarker =
    'test("production runtime commits deploy and restore exact-7 packages consumed by sequence loader and verifier"';
  const integrationTestEndMarker =
    '\ntest("unbranded adapters fail before any output is created"';
  const integrationTestStart = normalizedProviderRuntimeTestSource.indexOf(integrationTestStartMarker);
  const integrationTestEnd = normalizedProviderRuntimeTestSource.indexOf(
    integrationTestEndMarker,
    integrationTestStart
  );
  const integrationTestSource = integrationTestStart >= 0 && integrationTestEnd > integrationTestStart
    ? normalizedProviderRuntimeTestSource.slice(integrationTestStart, integrationTestEnd)
    : "";
  requireFragments("Production Provider-to-sequence integration test", integrationTestSource, [
    "const deployCollected = await collectProviderDeploymentCandidate({",
    "const restoreCollected = await collectProviderDeploymentCandidate({",
    "deployReceiptPath: deployCollected.receiptPath",
    "restoreReceiptPath: restoreCollected.receiptPath",
    "const sequence = await loadVerifiedProviderDeploymentCandidateSequence(sequenceInput);",
    "const written = await writeProviderDeploymentCandidateSequenceCandidate({",
    "const verified = await verifyPersistedProviderDeploymentCandidateSequence({",
    'fixedFiles["terminal-commit"]',
    "candidate.collected.terminalGateBinding.commitsReceiptSha256"
  ]);
  if (
    (integrationTestSource.match(/await collectProviderDeploymentCandidate\(\{/gu) ?? []).length !== 2
    || /createValidPair|createCandidatePackage|writeFile\s*\(/u.test(integrationTestSource)
  ) {
    throw new Error(
      "Production Provider-to-sequence integration must use exactly two production collectors and must not handwrite candidate packages or markers."
    );
  }
  if (
    sourceSha256(providerSequenceWriterSource)
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_WRITER_SOURCE_SHA256
    || sourceSha256(providerRuntimeTestSource)
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_RUNTIME_TEST_SOURCE_SHA256
  ) {
    throw new Error(
      "Provider sequence CLI or production Provider-to-sequence integration test drifted from its normalized source binding."
    );
  }
  return Object.freeze({
    hostPreparedFileCount: 5,
    hostCommittedFileCount: 5,
    providerPreparedFileCount: 7,
    providerCommittedFileCount: 7,
    markerBytes: 65,
    arbitraryPublicationCallbackAbsent: true,
    compensationTombstoneAbsent: true,
    downstreamMarkerIdentityBound: true,
    providerSequenceSchemaTerminalCommitmentFrozen: true,
    sequenceCliPublicationPresentationLedgerSeparated: true,
    sequenceCliPresentationAwaited: true,
    productionProviderCollectorCalls: 2,
    productionProviderSequenceIntegrationBound: true,
    authorityPromoted: false
  });
}

export function verifyRollbackProviderSequenceCompositionGovernance({
  policy,
  evidenceSchema,
  packageJson,
  libSource,
  schemaLoaderSource,
  verifierSource,
  providerCandidateLoaderSource,
  providerSequenceLoaderSource,
  providerSequenceVerifierSource,
  rollbackLibSource,
  rollbackVerifierSource
}) {
  validateRollbackProviderSequenceCompositionPolicy(policy);
  if (
    sha256(canonicalJson(policy))
      !== REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_CANONICAL_SHA256
    || policy.releaseIdentity?.channel !== "default-v13"
    || policy.releaseIdentity?.dbGeneration !== "legacy-v13"
    || policy.releaseIdentity?.targetSchema !== 13
    || policy.releaseIdentity?.migrationId !== null
    || policy.capabilities?.mutationEpochCapability !== "absent_schema13"
    || policy.capabilities?.epoch !== null
    || policy.capabilities?.rawIndexedDbBypassAllowed !== false
    || policy.capabilities?.mutationEpochBypassAllowed !== false
    || policy.formalBoundary?.formalRollbackEvidenceVerified !== false
    || policy.formalBoundary?.formalRollbackDownstreamReached !== false
    || policy.formalBoundary?.samePolicyEpochFormalCompositionAvailable !== false
    || policy.formalBoundary?.formalRollbackAdmissionMayNotBeBypassed !== true
    || policy.terminalState?.trustClass !== "untrusted_candidate_composition"
    || policy.terminalState?.status !== "not_admitted"
    || policy.terminalState?.admissionStatus !== "not_admitted"
    || policy.terminalState?.usableForAdmission !== false
    || policy.terminalState?.cliExitCode !== 1
    || Object.values(policy.attempts ?? {}).some((value) => value !== false)
    || Object.values(policy.authority ?? {}).some((value) => value !== false)
  ) {
    throw new Error(
      "Rollback/provider sequence composition policy drifted from the exact closed contract."
    );
  }
  const schemaProperties = evidenceSchema?.properties;
  const terminalGateBinding = evidenceSchema?.$defs?.TerminalGateBinding;
  const providerTerminalGates = evidenceSchema?.$defs?.ProviderTerminalGates;
  const providerSequenceSchema = schemaProperties?.providerSequence;
  if (
    sha256(canonicalJson(evidenceSchema))
      !== REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_CANONICAL_SHA256
    || evidenceSchema?.$id
      !== "https://hakimi.invalid/schemas/rollback-provider-sequence-composition-candidate-v1.json"
    || evidenceSchema?.additionalProperties !== false
    || schemaProperties?.recordType?.const
      !== "rollback_provider_sequence_composition_candidate_v1"
    || schemaProperties?.verificationKind?.const
      !== "offline-projection-only-overlapping-persisted-provider-sequence-v1"
    || schemaProperties?.trustClass?.const !== "untrusted_candidate_composition"
    || schemaProperties?.status?.const !== "not_admitted"
    || schemaProperties?.admissionStatus?.const !== "not_admitted"
    || schemaProperties?.usableForAdmission?.const !== false
    || schemaProperties?.formalRollbackEvidenceVerified?.const !== false
    || schemaProperties?.formalRollbackDownstreamReached?.const !== false
    || schemaProperties?.samePolicyEpochFormalCompositionAvailable?.const !== false
    || schemaProperties?.releaseIdentity?.properties?.channel?.const !== "default-v13"
    || schemaProperties?.releaseIdentity?.properties?.mutationEpochCapability?.const
      !== "absent_schema13"
    || schemaProperties?.releaseIdentity?.properties?.epoch?.const !== null
    || evidenceSchema?.$defs?.Descriptor?.properties?.targetSchema?.const !== 13
    || evidenceSchema?.$defs?.Descriptor?.properties?.migrationId?.const !== null
    || evidenceSchema?.$defs?.DeploymentReceiptProjection?.additionalProperties !== false
    || terminalGateBinding?.additionalProperties !== false
    || JSON.stringify([...(terminalGateBinding?.required ?? [])].sort())
      !== JSON.stringify(["path", "size", "sha256", "commitsReceiptSha256"].sort())
    || terminalGateBinding?.properties?.size?.const !== 65
    || terminalGateBinding?.properties?.commitsReceiptSha256?.$ref !== "#/$defs/Sha256"
    || providerTerminalGates?.additionalProperties !== false
    || JSON.stringify([...(providerTerminalGates?.required ?? [])].sort())
      !== JSON.stringify(["deploy", "restore"])
    || providerTerminalGates?.properties?.deploy?.$ref !== "#/$defs/TerminalGateBinding"
    || providerTerminalGates?.properties?.restore?.$ref !== "#/$defs/TerminalGateBinding"
    || !providerSequenceSchema?.required?.includes("terminalGates")
    || providerSequenceSchema?.properties?.terminalGates?.$ref
      !== "#/$defs/ProviderTerminalGates"
    || Object.values(evidenceSchema?.$defs?.Attempts?.properties ?? {})
      .some((entry) => entry?.const !== false)
    || Object.values(evidenceSchema?.$defs?.Claims?.properties ?? {})
      .some((entry) => entry?.const !== false)
    || Object.values(evidenceSchema?.$defs?.Authority?.properties ?? {})
      .some((entry) => entry?.const !== false)
  ) {
    throw new Error(
      "Rollback/provider sequence composition Schema drifted from the exact closed contract."
    );
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCRIPTS
  )) {
    if (packageJson?.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Rollback/provider sequence composition package script mismatch: ${scriptName}.`);
    }
    if (
      Object.hasOwn(packageJson.scripts, `pre${scriptName}`)
      || Object.hasOwn(packageJson.scripts, `post${scriptName}`)
    ) {
      throw new Error(
        `Rollback/provider sequence composition lifecycle aliases are forbidden: ${scriptName}.`
      );
    }
  }
  const forbiddenDirectCompositionDependencies = [
    "./provider-deployment-candidate-loader.mjs",
    "./provider-deployment-candidate-sequence-loader.mjs",
    "./provider-deployment-candidate-sequence-writer.mjs",
    ".test.mjs",
    "allowClosed",
    "skipAdmission",
    "assertRollbackExecutionAdmission",
    "verifyRollbackEvidence("
  ];
  if (
    packageJson?.scripts?.["test:release-evidence"]?.includes(
      "rollback-provider-sequence-composition"
    )
    || packageJson?.scripts?.["test:release-evidence"]?.includes(
      "provider-deployment-candidate-sequence"
    )
    || sourceSha256(libSource)
      !== REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_LIB_SOURCE_SHA256
    || sourceSha256(schemaLoaderSource)
      !== REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
    || sourceSha256(verifierSource)
      !== REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_VERIFIER_SOURCE_SHA256
    || sourceSha256(providerCandidateLoaderSource)
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_LOADER_SOURCE_SHA256
    || sourceSha256(providerSequenceLoaderSource)
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_LOADER_SOURCE_SHA256
    || sourceSha256(providerSequenceVerifierSource)
      !== REQUIRED_PROVIDER_DEPLOYMENT_CANDIDATE_SEQUENCE_VERIFIER_SOURCE_SHA256
    || !libSource.includes('from "./provider-deployment-candidate-sequence-verifier.mjs"')
    || !libSource.includes("verifyPersistedProviderDeploymentCandidateSequence")
    || !libSource.includes('from "./rollback-evidence-lib.mjs"')
    || !libSource.includes("validateRollbackDeploymentReceiptProjectionForContract")
    || !libSource.includes("result.pendingSequenceCandidateIntegrityVerified === false")
    || !libSource.includes("result.outputFinalization.finalOutputSetVerified === true")
    || !libSource.includes("terminalCommit.commitsReceiptSha256 === receipt.sha256")
    || !libSource.includes("terminalGates: providerTerminalGates")
    || forbiddenDirectCompositionDependencies.some((fragment) => libSource.includes(fragment))
    || !providerSequenceVerifierSource.includes(
      "verifyPersistedProviderDeploymentCandidateSequence"
    )
    || !verifierSource.includes("process.exitCode = 1")
    || [rollbackLibSource, rollbackVerifierSource].some((source) =>
      source.includes("rollback-provider-sequence-composition")
        || source.includes("provider-deployment-candidate-sequence"))
  ) {
    throw new Error(
      "Rollback/provider sequence composition sources are not exactly frozen or formally isolated."
    );
  }
  return Object.freeze({
    status: "not_admitted",
    trustClass: "untrusted_candidate_composition",
    admissionStatus: "not_admitted",
    usableForAdmission: false,
    formalRollbackEvidenceVerified: false,
    formalRollbackDownstreamReached: false,
    samePolicyEpochFormalCompositionAvailable: false,
    cliExitCode: 1,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
}

export function verifyReleaseReceiptMirror(requiredReceiptCommands, document, documentLabel) {
  if (!requiredReceiptCommands || typeof requiredReceiptCommands !== "object" || Array.isArray(requiredReceiptCommands)) {
    throw new Error("Default v13 release evidence receipt policy is missing.");
  }
  verifyDefaultV13ReceiptCommandAllowlist(requiredReceiptCommands);
  const requiredReceiptIds = Object.keys(requiredReceiptCommands).sort();
  if (
    JSON.stringify([...REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER].sort()) !==
    JSON.stringify(requiredReceiptIds)
  ) {
    throw new Error("Default v13 receipt policy does not match the canonical execution order.");
  }

  const tuples = releaseReceiptTuples(document, documentLabel);
  for (const id of requiredReceiptIds) {
    const matches = tuples.filter((tuple) => tuple.id === id);
    if (matches.length === 0) throw new Error(`${documentLabel} is missing receipt ${id}.`);
    if (matches.length > 1) throw new Error(`${documentLabel} contains duplicate receipt ${id}.`);
  }
  const unexpectedTuple = tuples.find((tuple) => !requiredReceiptIds.includes(tuple.id));
  if (unexpectedTuple) {
    throw new Error(`${documentLabel} contains unexpected receipt ${unexpectedTuple.id}.`);
  }
  for (let index = 0; index < REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER.length; index += 1) {
    const expectedId = REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER[index];
    const tuple = tuples[index];
    if (tuple?.id !== expectedId) {
      throw new Error(
        `${documentLabel} receipt order mismatch at position ${index + 1}: expected ${expectedId}, got ${tuple?.id ?? "none"}.`
      );
    }
    const expectedCommand = requiredReceiptCommands[expectedId].join(" ");
    if (tuple.command !== expectedCommand) {
      throw new Error(`${documentLabel} command for ${expectedId} does not match policy.`);
    }
  }

  const requiredListMatches = [...document.matchAll(
    /--require-receipts\s+([a-z0-9][a-z0-9,-]*)(?=\s|$)/gu
  )];
  if (
    requiredListMatches.length !== 1 ||
    requiredListMatches[0][1] !== requiredReceiptIds.join(",")
  ) {
    throw new Error(`${documentLabel} does not require the complete canonical receipt set.`);
  }
}

export function verifyReleaseFailureDiagnosticsUpload(document, documentLabel) {
  const lines = document.split(/\r?\n/u);
  const marker = "      - name: Upload failed Release Evidence diagnostics";
  const markerIndexes = lines
    .map((line, index) => line === marker ? index : -1)
    .filter((index) => index >= 0);
  if (markerIndexes.length !== 1) {
    throw new Error(`${documentLabel} must define exactly one failed-evidence diagnostics upload.`);
  }
  const start = markerIndexes[0];
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^      - /u.test(lines[index])) {
      end = index;
      break;
    }
  }
  const block = lines.slice(start, end);
  for (const requiredLine of [
    "        if: ${{ failure() }}",
    "        uses: actions/upload-artifact@v4",
    "          name: hakimi-default-v13-failure-diagnostics-${{ github.run_id }}-${{ github.sha }}",
    "          path: tmp/release-evidence-receipts",
    "          if-no-files-found: warn",
    "          retention-days: 30"
  ]) {
    if (!block.includes(requiredLine)) {
      throw new Error(`${documentLabel} failed-evidence diagnostics upload is missing: ${requiredLine.trim()}.`);
    }
  }
  if (block.some((line) => line.trim() === "dist/web")) {
    throw new Error(`${documentLabel} must not archive a partial build as failed-evidence diagnostics.`);
  }
}

export function verifyReleaseArtifactIdentityChain(document, documentLabel) {
  const lines = document.split(/\r?\n/u).map((line) => normalizedDocumentCommandLine(line));
  const buildIndex = lines.findIndex((line) => line.includes("--id build ") && line.endsWith("-- npm run build"));
  const lockIndex = lines.indexOf(
    "node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json"
  );
  const bootIndex = lines.findIndex((line) => line.includes("--id boot "));
  const backupIndex = lines.findIndex((line) => line.includes("--id backup "));
  const pwaIndex = lines.findIndex((line) => line.includes("--id pwa "));
  const webV1Index = lines.findIndex((line) => line.includes("--id web-v1-flow "));
  const stabilityIndex = lines.findIndex((line) => line.includes("--id artifact-stability ")
    && line.endsWith("-- node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json"));
  const generatorIndex = lines.findIndex((line) => line.includes("node scripts/generate-release-evidence.mjs"));
  if (!(buildIndex >= 0 && lockIndex > buildIndex && bootIndex > lockIndex
    && backupIndex > bootIndex && pwaIndex > backupIndex && webV1Index > pwaIndex
    && stabilityIndex > webV1Index && generatorIndex > stabilityIndex)) {
    throw new Error(`${documentLabel} release artifact identity sequence is incomplete or out of order.`);
  }
  if (!document.includes("--artifact-lock tmp/release-artifact-identity.json")) {
    throw new Error(`${documentLabel} evidence generator is not bound to the release artifact identity lock.`);
  }
}

export function verifyFormalReleaseVerificationReceipt(document, documentLabel) {
  if (typeof document !== "string" || document.length === 0) {
    throw new Error(`${documentLabel} is empty.`);
  }
  const commandLines = document
    .split(/\r?\n/u)
    .map((line) => normalizedDocumentCommandLine(line));
  const receiptIndexes = commandLines
    .map((line, index) => line === REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND ? index : -1)
    .filter((index) => index >= 0);
  if (receiptIndexes.length !== 1) {
    throw new Error(`${documentLabel} must write exactly one formal Release Evidence verification receipt.`);
  }
  const generatorIndex = commandLines.findIndex((line) =>
    line.includes("node scripts/generate-release-evidence.mjs")
  );
  if (generatorIndex < 0 || receiptIndexes[0] <= generatorIndex) {
    throw new Error(`${documentLabel} must write the formal verification receipt after evidence generation.`);
  }
}

export function verifyRollbackEvidenceGovernance(
  rollbackPolicy,
  actorRegistry,
  decisions,
  packageJson
) {
  if (!exactKeys(rollbackPolicy, [
    "schemaVersion",
    "policyId",
    "status",
    "executionAdmission",
    "evidenceType",
    "releaseIdentity",
    "evidenceVisibility",
    "requiredPhases",
    "requiredBrowserProjects",
    "requiredHostVerificationKind",
    "requiredDataCopyClasses",
    "mutationEpochCapability",
    "requiredPolicyBindings",
    "signaturePolicy",
    "authorizationGates",
    "doesNotEstablish"
  ])) throw new Error("Rollback evidence policy keys have drifted.");
  if (
    rollbackPolicy.schemaVersion !== 1
    || rollbackPolicy.policyId !== "hakimi.web-v1.rollback-evidence/v1"
    || rollbackPolicy.status !== "contract_only_not_executed"
    || rollbackPolicy.evidenceType !== "engineering_rollback_execution_evidence"
    || rollbackPolicy.evidenceVisibility !== "private_non_public_artifact"
  ) throw new Error("Rollback evidence policy identity has drifted.");
  if (!sameJson(rollbackPolicy.executionAdmission, {
    status: "closed_missing_trusted_raw_evidence",
    formalReleaseSemanticReplayVerified: false,
    hostRawProbeReceiptParserVerified: false,
    browserCdpControllerReceiptParserVerified: false,
    providerDeploymentReceiptParserVerified: false,
    dataFingerprintRecomputationVerified: false,
    actorRegistryGovernanceSignatureVerified: false,
    phaseCheckpointFreezeVerified: false,
    offlineRollbackObservationVerified: false
  })) throw new Error("Rollback execution admission must remain closed until trusted raw evidence is implemented.");
  if (!sameJson(rollbackPolicy.releaseIdentity, {
    channel: "default-v13",
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  })) throw new Error("Rollback evidence policy must preserve the frozen default v13 identity.");
  if (!sameJson(rollbackPolicy.requiredPhases, [
    "baseline_observed",
    "candidate_deployed",
    "rollback_restored"
  ])) throw new Error("Rollback evidence phase order has drifted.");
  if (!sameJson(rollbackPolicy.requiredBrowserProjects, ["msedge", "chrome"])) {
    throw new Error("Rollback evidence browser set must be exactly msedge and chrome.");
  }
  if (
    rollbackPolicy.requiredHostVerificationKind !== "real-network"
    || rollbackPolicy.mutationEpochCapability !== "absent_schema13"
    || !sameJson(rollbackPolicy.requiredDataCopyClasses, [
      "owner_approved_read_only_v13_copy",
      "approved_deidentified_v13_copy"
    ])
  ) throw new Error("Rollback host or private data-copy boundary has drifted.");
  if (!sameJson(rollbackPolicy.requiredPolicyBindings, [
    { role: "release-decisions", path: "docs/release/web-v1-release-decisions.json" },
    { role: "hosting-security-policy", path: "docs/security/hosting-security-policy.json" },
    { role: "release-and-rollback-runbook", path: "docs/release/web-v1-release-and-rollback-runbook.md" },
    { role: "release-evidence-schema", path: "docs/release/release-evidence.schema.json" },
    { role: "rollback-evidence-schema", path: "docs/release/rollback-evidence.schema.json" },
    { role: "rollback-evidence-policy", path: "docs/release/rollback-evidence-policy.v1.json" },
    { role: "rollback-actor-trust-registry", path: "docs/release/rollback-actor-trust-registry.v1.json" }
  ])) throw new Error("Rollback evidence policy bindings have drifted.");
  if (!sameJson(rollbackPolicy.signaturePolicy, {
    algorithm: "ed25519",
    operatorAndAcceptorMustDiffer: true,
    trustedOperatorRequired: true,
    trustedAcceptorRequired: true,
    acceptanceDecisionRequired: "accept"
  })) throw new Error("Rollback evidence signature policy has drifted.");
  if (!sameJson(rollbackPolicy.authorizationGates, {
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    contentTruthAuthorized: false,
    rightsLegalConclusionAuthorized: false,
    releaseReady: false
  })) throw new Error("Rollback engineering policy cannot authorize release, expert, content, or rights claims.");
  if (!sameJson(rollbackPolicy.doesNotEstablish, [
    "real_rollback_without_a_verified_evidence_instance",
    "real_actor_identity_or_independence",
    "data_owner_consent_truth",
    "content_truth",
    "expert_truth",
    "rights_or_legal_conclusion",
    "release_readiness",
    "public_release_authorization"
  ])) throw new Error("Rollback evidence policy non-claims have drifted.");

  if (!sameJson(actorRegistry, {
    schemaVersion: 1,
    registryType: "rollback_actor_trust_registry",
    registryId: "hakimi.web-v1.rollback-actors/v1",
    status: "unconfigured_no_trusted_actors",
    actors: [],
    gateSummary: {
      trustedOperators: 0,
      trustedAcceptors: 0,
      realIdentityRecordsBound: 0,
      rollbackAcceptanceAuthorized: false
    },
    claims: {
      engineeringRegistryOnly: true,
      realIdentityVerified: false,
      realIndependenceVerified: false,
      publicDeploymentAuthorized: false,
      releaseReady: false
    }
  })) throw new Error("Rollback actor registry must remain explicitly unconfigured until real actors are approved.");
  if (
    decisions.defaultRelease?.dbGeneration !== "legacy-v13"
    || decisions.defaultRelease?.targetSchema !== 13
    || decisions.defaultRelease?.migrationId !== null
    || decisions.hosting?.publicDeploymentAuthorized !== false
    || decisions.domainClaims?.expertValidatedClaimAuthorized !== false
  ) throw new Error("Rollback tooling cannot promote the frozen release or authorization ledgers.");
  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_ROLLBACK_EVIDENCE_SCRIPTS)) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Rollback evidence package script mismatch: ${scriptName}.`);
    }
  }
  const predeploymentReceipts = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  if (
    !predeploymentReceipts
    || Object.entries(predeploymentReceipts).some(([id, command]) =>
      id.includes("rollback") || (Array.isArray(command) && command.some((part) => String(part).includes("rollback")))
    )
  ) throw new Error("Post-deployment rollback evidence must remain outside the pre-deployment receipt set.");
}

export function verifyRollbackPhaseContractSourceGovernance({
  rollbackLibSource,
  rollbackVerifierSource,
  rollbackProviderSequenceCompositionLibSource,
  packageJson
}) {
  for (const [source, label] of [
    [rollbackLibSource, "Rollback Evidence library"],
    [rollbackVerifierSource, "Rollback Evidence CLI"],
    [rollbackProviderSequenceCompositionLibSource, "Rollback/provider candidate composition"]
  ]) {
    if (typeof source !== "string" || source.length === 0) {
      throw new Error(`${label} source is unavailable for phase-contract governance.`);
    }
  }
  if (packageJson?.scripts?.["test:release-evidence"] !== REQUIRED_RELEASE_EVIDENCE_TEST_COMMAND) {
    throw new Error("Rollback phase-contract tests must remain inside the exact Release Evidence tooling aggregate.");
  }

  const helperDeclaration =
    "export function validateRollbackPhaseReceiptProjectionForContract({";
  const helperStart = rollbackLibSource.indexOf(helperDeclaration);
  const wrapperStart = rollbackLibSource.indexOf("async function verifyPhaseReceipt({");
  const helperEnd = wrapperStart;
  const wrapperEnd = rollbackLibSource.indexOf("function parseCanonicalBase64(", wrapperStart);
  if (
    helperStart < 0
    || rollbackLibSource.indexOf(helperDeclaration, helperStart + helperDeclaration.length) >= 0
    || wrapperStart <= helperStart
    || wrapperEnd <= wrapperStart
  ) {
    throw new Error("Rollback phase-contract helper or its private file wrapper is not uniquely ordered.");
  }
  const helperSource = rollbackLibSource.slice(helperStart, helperEnd);
  const wrapperSource = rollbackLibSource.slice(wrapperStart, wrapperEnd);
  const requiredHelperFragments = [
    "assertDefaultV13Identity(expectedIdentity",
    "ROLLBACK_PHASE_IDS.includes(phaseId)",
    "exactKeys(phase, phaseKeys)",
    "exactKeys(envelope, envelopeKeys)",
    "exactKeys(receiptDigests.browsers, ROLLBACK_BROWSER_PROJECTS)",
    "previousEvidenceDigest === null",
    "normalizedUnsignedDocument(envelope, [\"evidenceDigest\"])",
    "return immutableJsonSnapshot({"
  ];
  const forbiddenHelperFragments = [
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "releaseReady",
    "usableForAdmission",
    "rollbackEngineeringGatePassed",
    "rollbackEvidenceVerified",
    "claims:",
    "gates:",
    "epoch"
  ];
  if (
    requiredHelperFragments.some((fragment) => !helperSource.includes(fragment))
    || forbiddenHelperFragments.some((fragment) => helperSource.includes(fragment))
  ) {
    throw new Error("Rollback phase-contract projection drifted from its default-v13 authority-free hash-chain boundary.");
  }
  const requiredWrapperFragments = [
    "readBindingFile({",
    "parseJsonBytes(file.bytes",
    "return validateRollbackPhaseReceiptProjectionForContract({",
    "host: hostReceipt.binding.sha256",
    "browserReceipts.get(project).binding.sha256",
    "deployment: deploymentReceipt?.binding.sha256 ?? null"
  ];
  if (requiredWrapperFragments.some((fragment) => !wrapperSource.includes(fragment))) {
    throw new Error("Formal rollback phase wrapper no longer derives the pure contract input from verified receipt wrappers.");
  }

  const formalStart = rollbackLibSource.indexOf("export async function verifyRollbackEvidence({");
  if (formalStart < 0) throw new Error("Formal rollback verifier entry is unavailable.");
  const formalSource = rollbackLibSource.slice(formalStart);
  const admissionMarker = "assertRollbackExecutionAdmission(policyResult.rollbackPolicy);";
  const admissionIndex = formalSource.indexOf(admissionMarker);
  const downstreamMarkers = [
    "await verifyArtifactIdentity({",
    "await verifyHostReceipt({",
    "await verifyBrowserReceipt({",
    "await verifyDeploymentReceipt({",
    "await verifyPhaseReceipt({"
  ];
  if (
    admissionIndex < 0
    || formalSource.indexOf(admissionMarker, admissionIndex + admissionMarker.length) >= 0
    || downstreamMarkers.some((marker) => {
      const index = formalSource.indexOf(marker);
      return index < 0 || index <= admissionIndex;
    })
  ) {
    throw new Error("Formal rollback admission must remain unique and precede every downstream receipt path.");
  }
  const forbiddenAdmissionBypasses = [
    /\ballowClosed\b/u,
    /\bskipAdmission\b/u,
    /\bbypassAdmission\b/u,
    /\bignoreAdmission\b/u
  ];
  if (
    forbiddenAdmissionBypasses.some((pattern) =>
      pattern.test(rollbackLibSource) || pattern.test(rollbackVerifierSource))
    || rollbackProviderSequenceCompositionLibSource.includes(
      "validateRollbackPhaseReceiptProjectionForContract"
    )
  ) {
    throw new Error("Rollback phase-contract validation cannot create an admission bypass or enter candidate composition.");
  }
  return Object.freeze({
    status: "contract_only_no_admission",
    formalAdmissionBeforeDownstream: true,
    authorityFreeProjection: true,
    candidateCompositionReachable: false
  });
}

export function verifyDeployedPwaEvidenceGovernance(
  deployedPwaPolicy,
  decisions,
  hostingPolicy,
  packageJson
) {
  validateDeployedPwaEvidencePolicy(deployedPwaPolicy);
  validateDeployedPwaGovernanceState({
    policy: deployedPwaPolicy,
    hostingPolicy,
    decisions
  });

  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_SCRIPTS
  )) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Deployed-PWA Evidence package script mismatch: ${scriptName}.`);
    }
  }

  const predeploymentReceipts = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  if (!predeploymentReceipts
    || typeof predeploymentReceipts !== "object"
    || Array.isArray(predeploymentReceipts)) {
    throw new Error("Default v13 pre-deployment receipt policy is missing.");
  }
  const forbiddenReceiptFragments = [
    "deployed-pwa",
    "deployed_pwa",
    "deployed pwa",
    "verify:deployed-pwa-evidence",
    "verify-deployed-pwa-evidence",
    "real-host",
    "real_host",
    "provider-deployment",
    "provider_deployment",
    "deployment-receipt",
    "deployment_receipt"
  ];
  for (const [receiptId, command] of Object.entries(predeploymentReceipts)) {
    if (!Array.isArray(command) || command.some((part) => typeof part !== "string")) {
      throw new Error(`Default v13 pre-deployment receipt command is malformed: ${receiptId}.`);
    }
    const receiptText = [receiptId, ...command].join(" ").toLowerCase();
    if (forbiddenReceiptFragments.some((fragment) => receiptText.includes(fragment))) {
      throw new Error(
        "Real-host deployed-PWA evidence must remain outside the pre-deployment Release Evidence receipt set."
      );
    }
  }

  return Object.freeze({
    status: deployedPwaPolicy.status,
    executionAdmission: deployedPwaPolicy.executionAdmission.status,
    requiredBrowserProjects: Object.freeze([...deployedPwaPolicy.requiredBrowserProjects]),
    requiredHostVerificationKind: deployedPwaPolicy.requiredHostVerificationKind
  });
}

export function verifyDeployedPwaEvidenceSchemaGovernance(schema) {
  const definitions = schema?.$defs;
  const rootProperties = schema?.properties;
  if (
    schema?.$id !== "https://hakimi.invalid/schemas/deployed-pwa-evidence-v1.json"
    || schema?.type !== "object"
    || schema?.additionalProperties !== false
    || rootProperties?.schemaVersion?.const !== 1
    || rootProperties?.evidenceType?.const !== "deployed_pwa_engineering_evidence"
    || rootProperties?.evidenceId?.pattern !== "^hpwa1-[a-f0-9]{32}$"
    || !sameJson(rootProperties?.status?.enum, ["passed", "failed"])
    || rootProperties?.scope?.$ref !== "#/$defs/Scope"
    || rootProperties?.artifactIdentity?.$ref !== "#/$defs/ArtifactIdentity"
    || rootProperties?.receipts?.$ref !== "#/$defs/Receipts"
    || rootProperties?.gates?.$ref !== "#/$defs/Gates"
    || rootProperties?.claims?.$ref !== "#/$defs/Claims"
  ) {
    throw new Error("Deployed-PWA Evidence Schema root identity or binding has drifted.");
  }

  if (!sameJson(definitions?.ReleaseIdentity, {
    type: "object",
    additionalProperties: false,
    required: ["channel", "dbGeneration", "targetSchema", "migrationId"],
    properties: {
      channel: { const: "default-v13" },
      dbGeneration: { const: "legacy-v13" },
      targetSchema: { const: 13 },
      migrationId: { const: null }
    }
  })) {
    throw new Error("Deployed-PWA Evidence Schema must preserve the frozen default-v13 identity.");
  }
  const descriptor = definitions?.ReleaseDescriptor;
  if (
    descriptor?.additionalProperties !== false
    || !sameJson(descriptor?.required, [
      "protocolVersion",
      "dbGeneration",
      "databaseName",
      "targetSchema",
      "minReadableSchema",
      "maxReadableSchema",
      "migrationId",
      "acceptedCommittedMigrationIds",
      "sourceGeneration",
      "sourceDatabaseName",
      "sourceSchema"
    ])
    || descriptor?.properties?.protocolVersion?.const !== 1
    || descriptor?.properties?.dbGeneration?.const !== "legacy-v13"
    || descriptor?.properties?.databaseName?.const !== "hakimi-bazi-research"
    || descriptor?.properties?.targetSchema?.const !== 13
    || descriptor?.properties?.minReadableSchema?.const !== 13
    || descriptor?.properties?.maxReadableSchema?.const !== 13
    || descriptor?.properties?.migrationId?.const !== null
    || !sameJson(descriptor?.properties?.acceptedCommittedMigrationIds, {
      type: "array",
      items: { const: null },
      minItems: 1,
      maxItems: 1,
      uniqueItems: true
    })
    || descriptor?.properties?.sourceGeneration?.const !== null
    || descriptor?.properties?.sourceDatabaseName?.const !== null
    || descriptor?.properties?.sourceSchema?.const !== null
  ) {
    throw new Error("Deployed-PWA Evidence Schema release descriptor has drifted from Schema 13.");
  }

  const expectedGateProperties = Object.fromEntries(
    REQUIRED_DEPLOYED_PWA_GATE_NAMES.map((name) => [name, { type: "boolean" }])
  );
  if (!sameJson(definitions?.Gates, {
    type: "object",
    additionalProperties: false,
    required: REQUIRED_DEPLOYED_PWA_GATE_NAMES,
    properties: expectedGateProperties
  })) {
    throw new Error("Deployed-PWA Evidence Schema engineering gate set has drifted.");
  }
  if (!sameJson(definitions?.Claims, {
    type: "object",
    additionalProperties: false,
    required: REQUIRED_DEPLOYED_PWA_CLAIM_NAMES,
    properties: {
      engineeringEvidenceOnly: { const: true },
      sourceAndArtifactCurrentVerified: { type: "boolean" },
      realHostVerified: { type: "boolean" },
      pwaBrowserRuntimeVerified: { type: "boolean" },
      deploymentOperationObserved: { type: "boolean" },
      externalDeploymentExecutionAuthorized: { const: false },
      publicDeploymentAuthorized: { const: false },
      publicReleaseAuthorized: { const: false },
      releaseReady: { const: false },
      contentTruthAuthorized: { const: false },
      expertClaimsAuthorized: { const: false },
      rightsLegalConclusionAuthorized: { const: false }
    }
  })) {
    throw new Error("Deployed-PWA Evidence Schema has promoted an authorization or adjacent truth claim.");
  }

  if (!sameJson(definitions?.Scope, {
    type: "object",
    additionalProperties: false,
    required: [
      "deploymentPlatform",
      "canonicalOrigin",
      "hostVerificationKind",
      "browserProjects",
      "releaseIdentity"
    ],
    properties: {
      deploymentPlatform: { $ref: "#/$defs/PlatformId" },
      canonicalOrigin: { $ref: "#/$defs/HttpsOrigin" },
      hostVerificationKind: { const: "real-network" },
      browserProjects: {
        type: "array",
        items: { enum: ["msedge", "chrome"] },
        minItems: 2,
        maxItems: 2,
        uniqueItems: true
      },
      releaseIdentity: { $ref: "#/$defs/ReleaseIdentity" }
    }
  }) || definitions?.PlatformId?.pattern
    !== "^(?!unselected$)[a-z0-9][a-z0-9._-]{0,63}$") {
    throw new Error("Deployed-PWA Evidence Schema host or browser scope has drifted.");
  }

  const browserReceipt = definitions?.BrowserRuntimeReceiptBinding;
  const expectedBrowserFields = [
    "path",
    "sha256",
    "receiptId",
    "projectName",
    "browserChannel",
    "actualProduct",
    "targetOrigin",
    "releaseEvidenceId",
    "artifactSetDigest",
    "profileBindingDigest",
    "profileDirectoryExistedBeforeRun",
    "profileCreatedByRunner",
    "registrationScope",
    "controllerPresent",
    "controllerScriptUrl",
    "controllerState",
    "activeScriptUrl",
    "activeState",
    "waitingScriptUrl",
    "installingScriptUrl",
    "controllerBuildVersion",
    "controllerDescriptor",
    "remoteServiceWorkerSha256",
    "controllerSourceSha256",
    "controllerSourceEvidenceMethod",
    "attemptCount",
    "retryCount",
    "skippedCount",
    "flakyCount",
    "onlineRootVerified",
    "offlineSettingsDataFromServiceWorkerVerified",
    "offlineCaseRevisionFromServiceWorkerVerified",
    "offlineHelpColdStartFromServiceWorkerVerified",
    "offlineHelpReloadFromServiceWorkerVerified",
    "playwrightFromServiceWorkerVerified",
    "cdpFromServiceWorkerVerified",
    "caseRevisionPath",
    "caseRevisionFingerprintBefore",
    "caseRevisionFingerprintAfter",
    "unexpectedExternalRequestCount",
    "rawAttachmentSetDigest",
    "strictGatePassed",
    "startedAt",
    "completedAt"
  ];
  const browserProperties = browserReceipt?.properties;
  if (
    browserReceipt?.additionalProperties !== false
    || !sameJson(browserReceipt?.required, expectedBrowserFields)
    || !sameJson(browserProperties?.projectName?.enum, ["msedge", "chrome"])
    || !sameJson(browserProperties?.browserChannel?.enum, ["msedge", "chrome"])
    || browserProperties?.actualProduct?.pattern
      !== "^(?:Edg|Chrome)/[0-9]+(?:\\.[0-9]+){1,3}$"
    || browserProperties?.profileDirectoryExistedBeforeRun?.const !== false
    || browserProperties?.profileCreatedByRunner?.const !== true
    || browserProperties?.controllerPresent?.const !== true
    || browserProperties?.controllerState?.const !== "activated"
    || browserProperties?.activeState?.const !== "activated"
    || browserProperties?.waitingScriptUrl?.const !== null
    || browserProperties?.installingScriptUrl?.const !== null
    || browserProperties?.controllerSourceEvidenceMethod?.const
      !== "cdp_debugger_get_script_source_v1"
    || browserProperties?.attemptCount?.const !== 1
    || browserProperties?.retryCount?.const !== 0
    || browserProperties?.skippedCount?.const !== 0
    || browserProperties?.flakyCount?.const !== 0
    || browserProperties?.onlineRootVerified?.const !== true
    || browserProperties?.offlineSettingsDataFromServiceWorkerVerified?.const !== true
    || browserProperties?.offlineCaseRevisionFromServiceWorkerVerified?.const !== true
    || browserProperties?.offlineHelpColdStartFromServiceWorkerVerified?.const !== true
    || browserProperties?.offlineHelpReloadFromServiceWorkerVerified?.const !== true
    || browserProperties?.playwrightFromServiceWorkerVerified?.const !== true
    || browserProperties?.cdpFromServiceWorkerVerified?.const !== true
    || browserProperties?.caseRevisionPath?.pattern
      !== "^/cases/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/revisions/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
    || browserProperties?.unexpectedExternalRequestCount?.const !== 0
    || browserProperties?.strictGatePassed?.const !== true
  ) {
    throw new Error("Deployed-PWA Evidence Schema browser runtime receipt contract has drifted.");
  }
  if (!sameJson(definitions?.Receipts?.properties?.browsers, {
    type: "array",
    items: { $ref: "#/$defs/BrowserRuntimeReceiptBinding" },
    minItems: 2,
    maxItems: 2,
    uniqueItems: true
  })) {
    throw new Error("Deployed-PWA Evidence Schema browser receipt cardinality has drifted.");
  }
  const hostProperties = definitions?.HostReceiptBinding?.properties;
  if (
    hostProperties?.summaryType?.const !== "deployed_host_verification_v1"
    || hostProperties?.verificationKind?.const !== "real-network"
    || hostProperties?.networkCompleted?.const !== true
    || hostProperties?.strictGatePassed?.const !== true
    || hostProperties?.realHostVerified?.const !== true
    || hostProperties?.publicDeploymentAuthorized?.const !== false
  ) {
    throw new Error("Deployed-PWA Evidence Schema real-host receipt contract has drifted.");
  }

  return Object.freeze({
    schemaId: schema.$id,
    gateNames: Object.freeze([...REQUIRED_DEPLOYED_PWA_GATE_NAMES]),
    claimNames: Object.freeze([...REQUIRED_DEPLOYED_PWA_CLAIM_NAMES])
  });
}

export function verifyDeployedPwaEvidenceV2Governance(
  deployedPwaPolicy,
  decisions,
  hostingPolicy,
  packageJson
) {
  validateDeployedPwaEvidenceV2Policy(deployedPwaPolicy);
  validateDeployedPwaEvidenceV2GovernanceState({
    policy: deployedPwaPolicy,
    hostingPolicy,
    decisions
  });
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS
  )) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Deployed-PWA v2 package script mismatch: ${scriptName}.`);
    }
  }
  const predeploymentReceipts = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  verifyDeployedPwaCandidateReceiptIsolation(predeploymentReceipts, packageJson);
  verifyDefaultV13ReceiptCommandAllowlist(predeploymentReceipts);
  return Object.freeze({
    status: deployedPwaPolicy.status,
    executionAdmission: deployedPwaPolicy.executionAdmission.status,
    verificationKind: deployedPwaPolicy.semanticVerification.verificationKind,
    resultClass: deployedPwaPolicy.semanticVerification.resultClass,
    receiptTrustClass: deployedPwaPolicy.semanticVerification.receiptTrustClass,
    requiredBrowserProjects: Object.freeze([...deployedPwaPolicy.requiredBrowserProjects])
  });
}

export function verifyDeployedPwaEvidenceV2SchemaGovernance(schema) {
  const definitions = schema?.$defs;
  const properties = schema?.properties;
  if (
    schema?.$id !== "https://hakimi.invalid/schemas/deployed-pwa-evidence-v2.json"
    || schema?.type !== "object"
    || schema?.additionalProperties !== false
    || properties?.schemaVersion?.const !== 2
    || properties?.evidenceType?.const !== "deployed_pwa_semantic_candidate"
    || properties?.evidenceId?.pattern !== "^hpwa2-[a-f0-9]{32}$"
    || properties?.verificationKind?.const !== "offline-no-git-no-network-no-browser-no-deployment"
    || properties?.status?.const !== "not_admitted"
    || properties?.executionAdmission?.const !== "closed_missing_https_origin"
    || properties?.scope?.$ref !== "#/$defs/Scope"
    || properties?.semanticGates?.$ref !== "#/$defs/SemanticGates"
    || properties?.admissionGates?.$ref !== "#/$defs/AdmissionGates"
    || properties?.claims?.$ref !== "#/$defs/Claims"
  ) {
    throw new Error("Deployed-PWA v2 Schema root must remain offline-only and not admitted.");
  }
  if (!sameJson(definitions?.ReleaseIdentity, {
    type: "object",
    additionalProperties: false,
    required: ["channel", "dbGeneration", "targetSchema", "migrationId"],
    properties: {
      channel: { const: "default-v13" },
      dbGeneration: { const: "legacy-v13" },
      targetSchema: { const: 13 },
      migrationId: { const: null }
    }
  })) {
    throw new Error("Deployed-PWA v2 Schema release identity drifted from legacy-v13/13/null.");
  }
  const formalReceiptBinding = definitions?.FormalReceiptBinding;
  if (
    formalReceiptBinding?.type !== "object"
    || formalReceiptBinding?.additionalProperties !== false
    || !sameJson(formalReceiptBinding?.required, [
      "path",
      "size",
      "sha256",
      "schemaVersion",
      "receiptType",
      "receiptId",
      "releaseEvidenceId",
      "status",
      "verifiedAt"
    ])
    || formalReceiptBinding?.properties?.schemaVersion?.const !== 1
    || formalReceiptBinding?.properties?.receiptType?.const
      !== "formal_release_evidence_verification"
    || formalReceiptBinding?.properties?.receiptId?.pattern
      !== "^formal-hre1-[a-f0-9]{32}$"
    || formalReceiptBinding?.properties?.releaseEvidenceId?.$ref
      !== "#/$defs/ReleaseEvidenceId"
    || formalReceiptBinding?.properties?.status?.const !== "passed"
  ) {
    throw new Error("Deployed-PWA v2 formal receipt binding contract drifted.");
  }
  if (!sameJson(definitions?.Scope, {
    type: "object",
    additionalProperties: false,
    required: [
      "candidateDeploymentPlatform",
      "candidateCanonicalOrigin",
      "hostVerificationKind",
      "browserProjects",
      "releaseIdentity"
    ],
    properties: {
      candidateDeploymentPlatform: { $ref: "#/$defs/PlatformId" },
      candidateCanonicalOrigin: { $ref: "#/$defs/HttpsOrigin" },
      hostVerificationKind: { const: "real-network" },
      browserProjects: {
        type: "array",
        items: { enum: ["msedge", "chrome"] },
        minItems: 2,
        maxItems: 2,
        uniqueItems: true
      },
      releaseIdentity: { $ref: "#/$defs/ReleaseIdentity" }
    }
  })) {
    throw new Error("Deployed-PWA v2 Schema candidate scope or Edge/Chrome tuple drifted.");
  }
  const semanticProperties = Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES.map((name) => [name, { type: "boolean" }])
  );
  if (!sameJson(definitions?.SemanticGates, {
    type: "object",
    additionalProperties: false,
    required: DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES,
    properties: semanticProperties
  })) {
    throw new Error("Deployed-PWA v2 untrusted candidate consistency gate set drifted.");
  }
  const admissionProperties = Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES.map((name) => [name, { const: false }])
  );
  if (!sameJson(definitions?.AdmissionGates, {
    type: "object",
    additionalProperties: false,
    required: DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES,
    properties: admissionProperties
  })) {
    throw new Error("Deployed-PWA v2 admission gates must remain exact false constants.");
  }
  const claimProperties = Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES.map((name) => [name, { const: false }])
  );
  if (!sameJson(definitions?.Claims, {
    type: "object",
    additionalProperties: false,
    required: DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES,
    properties: claimProperties
  })) {
    throw new Error("Deployed-PWA v2 claims must remain exact false constants.");
  }
  if (!sameJson(definitions?.AttachmentBinding?.properties?.role?.enum,
    DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES)
    || definitions?.ArtifactPath?.pattern
      !== "^(?!/)(?!\\.{1,2}(?:/|$))(?!.*//)(?!.*\/\\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$"
    || !sameJson(definitions?.RouteObservation?.properties?.routeId?.enum,
      DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS)
    || definitions?.CaseRevisionFingerprintBinding?.properties?.projectionVersion?.const
      !== "deployed-pwa-case-revision-observation-v1"
    || definitions?.EdgeBrowserReceipt?.properties?.projectName?.const !== "msedge"
    || definitions?.EdgeBrowserReceipt?.properties?.browserChannel?.const !== "msedge"
    || definitions?.ChromeBrowserReceipt?.properties?.projectName?.const !== "chrome"
    || definitions?.ChromeBrowserReceipt?.properties?.browserChannel?.const !== "chrome") {
    throw new Error("Deployed-PWA v2 route, attachment, case, or browser vocabulary drifted.");
  }
  return Object.freeze({
    schemaId: schema.$id,
    status: properties.status.const,
    semanticGateNames: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V2_SEMANTIC_GATE_NAMES]),
    admissionGateNames: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V2_ADMISSION_GATE_NAMES]),
    claimNames: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V2_CLAIM_NAMES]),
    routeIds: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V2_ROUTE_IDS]),
    attachmentRoles: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V2_ATTACHMENT_ROLES])
  });
}

const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES = Object.freeze([
  "policyBindingsVerified",
  "releaseIdentityVerified",
  "artifactIdentityVerified",
  "untrustedFormalReceiptEnvelopeConsistent",
  "untrustedHostReceiptEnvelopeConsistent",
  "untrustedEdgeBrowserEnvelopeConsistent",
  "untrustedChromeBrowserEnvelopeConsistent",
  "serviceWorkerCandidateBytesConsistent",
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE,
  "routeAndCaseRevisionCandidateBytesConsistent",
  "evidenceDigestVerified",
  "semanticConsistencyVerified"
]);
const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS = Object.freeze([
  Object.freeze({
    role: "release-decisions",
    path: "docs/release/web-v1-release-decisions.json"
  }),
  Object.freeze({
    role: "hosting-security-policy",
    path: "docs/security/hosting-security-policy.json"
  }),
  Object.freeze({
    role: "release-evidence-schema",
    path: "docs/release/release-evidence.schema.json"
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-schema",
    path: "docs/release/deployed-pwa-evidence-v3.schema.json"
  }),
  Object.freeze({
    role: "deployed-pwa-evidence-policy",
    path: "docs/release/deployed-pwa-evidence-policy.v3.json"
  })
]);
const REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_TERMINAL_BOUNDARY = Object.freeze({
  status: "not_admitted",
  executionAdmission: "closed_missing_https_origin",
  strictGatePassed: false,
  deployedPwaEngineeringVerified: false,
  cliExitCode: 1,
  futureOpeningRequiresNewPolicyVersion: true
});

export function verifyDeployedPwaEvidenceV3Governance(
  deployedPwaPolicy,
  decisions,
  hostingPolicy,
  packageJson
) {
  validateDeployedPwaEvidenceV3Policy(deployedPwaPolicy);
  validateDeployedPwaEvidenceV3GovernanceState({
    policy: deployedPwaPolicy,
    hostingPolicy,
    decisions
  });
  if (
    deployedPwaPolicy.policyId !== "hakimi.web-v1.deployed-pwa-evidence/v3"
    || deployedPwaPolicy.status !== "offline_semantic_verifier_only_not_admitted"
    || deployedPwaPolicy.executionAdmission?.status !== "closed_missing_https_origin"
    || deployedPwaPolicy.semanticVerification?.verificationKind
      !== "offline-no-git-no-network-no-browser-no-deployment"
    || deployedPwaPolicy.semanticVerification?.resultClass
      !== "candidate_internal_consistency_only"
    || deployedPwaPolicy.semanticVerification?.receiptTrustClass
      !== "untrusted_candidate_envelopes"
  ) {
    throw new Error("Deployed-PWA v3 policy identity or offline-only status drifted.");
  }
  if (!sameJson(DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS,
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS)
    || !sameJson(deployedPwaPolicy.requiredPolicyBindings,
      REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_POLICY_BINDINGS)) {
    throw new Error("Deployed-PWA v3 policy binding set drifted.");
  }
  if (!sameJson(DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES)
    || !sameJson(deployedPwaPolicy.requiredBrowserAttachmentRoles,
      REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES)) {
    throw new Error("Deployed-PWA v3 browser attachment roles drifted from the exact 10-role set.");
  }
  if (!sameJson(deployedPwaPolicy.authorizationBoundary,
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_AUTHORIZATION_BOUNDARY)
    || !sameJson(deployedPwaPolicy.terminalBoundary,
      REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_TERMINAL_BOUNDARY)) {
    throw new Error("Deployed-PWA v3 authority must remain closed and not admitted.");
  }
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS
  )) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Deployed-PWA v3 package script mismatch: ${scriptName}.`);
    }
  }
  const predeploymentReceipts = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  verifyDeployedPwaCandidateReceiptIsolation(predeploymentReceipts, packageJson);
  verifyDefaultV13ReceiptCommandAllowlist(predeploymentReceipts);
  return Object.freeze({
    policyId: deployedPwaPolicy.policyId,
    status: deployedPwaPolicy.status,
    executionAdmission: deployedPwaPolicy.executionAdmission.status,
    verificationKind: deployedPwaPolicy.semanticVerification.verificationKind,
    resultClass: deployedPwaPolicy.semanticVerification.resultClass,
    receiptTrustClass: deployedPwaPolicy.semanticVerification.receiptTrustClass,
    requiredBrowserProjects: Object.freeze([...deployedPwaPolicy.requiredBrowserProjects]),
    requiredAttachmentRoles: Object.freeze([...REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES]),
    manifestSemanticGate: REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE,
    authorizationBoundary: Object.freeze({
      ...REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_AUTHORIZATION_BOUNDARY
    }),
    terminalBoundary: Object.freeze({ ...REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_TERMINAL_BOUNDARY })
  });
}

const DEPLOYED_PWA_V3_TEST_FIXTURE_IMPORT =
  /from\s+["']\.\/deployed-pwa-evidence-v3\.test-fixture\.mjs["']/u;
const DEPLOYED_PWA_V3_TEST_MODULE_REFERENCE =
  /["']\.\/deployed-pwa-evidence-v3\.test\.mjs["']/u;

export function verifyDeployedPwaV3TestFixtureExtractionGovernance({
  deployedPwaV3TestSource,
  compositionFixtureSource,
  compositionTestSource
}) {
  const consumers = [
    ["deployed-PWA v3 test", deployedPwaV3TestSource],
    ["deployed-PWA host/provider composition fixture", compositionFixtureSource],
    ["deployed-PWA host/provider composition test", compositionTestSource]
  ];
  for (const [label, source] of consumers) {
    if (typeof source !== "string" || !DEPLOYED_PWA_V3_TEST_FIXTURE_IMPORT.test(source)) {
      throw new Error(`${label} must import the independent deployed-PWA v3 test fixture module.`);
    }
    if (DEPLOYED_PWA_V3_TEST_MODULE_REFERENCE.test(source)) {
      throw new Error(`${label} must not import the deployed-PWA v3 test module.`);
    }
  }
  if (/\bpathToFileURL\b|\bprocess\.argv\b/u.test(deployedPwaV3TestSource)) {
    throw new Error("Deployed-PWA v3 tests must register unconditionally without a direct-entry guard.");
  }
  return Object.freeze({
    fixtureModule: "scripts/deployed-pwa-evidence-v3.test-fixture.mjs",
    consumers: Object.freeze(consumers.map(([label]) => label)),
    directEntryGuardAbsent: true,
    testModuleImportsAbsent: true
  });
}

export function verifyDeployedPwaEvidenceV3SchemaGovernance(schema) {
  const definitions = schema?.$defs;
  const properties = schema?.properties;
  if (
    schema?.$id !== "https://hakimi.invalid/schemas/deployed-pwa-evidence-v3.json"
    || schema?.type !== "object"
    || schema?.additionalProperties !== false
    || properties?.schemaVersion?.const !== 3
    || properties?.evidenceType?.const !== "deployed_pwa_semantic_candidate"
    || properties?.evidenceId?.pattern !== "^hpwa3-[a-f0-9]{32}$"
    || properties?.verificationKind?.const !== "offline-no-git-no-network-no-browser-no-deployment"
    || properties?.status?.const !== "not_admitted"
    || properties?.executionAdmission?.const !== "closed_missing_https_origin"
    || properties?.scope?.$ref !== "#/$defs/Scope"
    || properties?.semanticGates?.$ref !== "#/$defs/SemanticGates"
    || properties?.admissionGates?.$ref !== "#/$defs/AdmissionGates"
    || properties?.claims?.$ref !== "#/$defs/Claims"
  ) {
    throw new Error("Deployed-PWA v3 Schema root must remain offline-only and not admitted.");
  }
  if (!sameJson(definitions?.ReleaseIdentity, {
    type: "object",
    additionalProperties: false,
    required: ["channel", "dbGeneration", "targetSchema", "migrationId"],
    properties: {
      channel: { const: "default-v13" },
      dbGeneration: { const: "legacy-v13" },
      targetSchema: { const: 13 },
      migrationId: { const: null }
    }
  })) {
    throw new Error("Deployed-PWA v3 Schema release identity drifted from legacy-v13/13/null.");
  }
  const formalReceiptBinding = definitions?.FormalReceiptBinding;
  if (
    formalReceiptBinding?.type !== "object"
    || formalReceiptBinding?.additionalProperties !== false
    || !sameJson(formalReceiptBinding?.required, [
      "path",
      "size",
      "sha256",
      "schemaVersion",
      "receiptType",
      "receiptId",
      "releaseEvidenceId",
      "status",
      "verifiedAt"
    ])
    || formalReceiptBinding?.properties?.schemaVersion?.const !== 1
    || formalReceiptBinding?.properties?.receiptType?.const
      !== "formal_release_evidence_verification"
    || formalReceiptBinding?.properties?.receiptId?.pattern
      !== "^formal-hre1-[a-f0-9]{32}$"
    || formalReceiptBinding?.properties?.releaseEvidenceId?.$ref
      !== "#/$defs/ReleaseEvidenceId"
    || formalReceiptBinding?.properties?.status?.const !== "passed"
  ) {
    throw new Error("Deployed-PWA v3 formal receipt binding contract drifted.");
  }
  if (!sameJson(definitions?.Scope, {
    type: "object",
    additionalProperties: false,
    required: [
      "candidateDeploymentPlatform",
      "candidateCanonicalOrigin",
      "hostVerificationKind",
      "browserProjects",
      "releaseIdentity"
    ],
    properties: {
      candidateDeploymentPlatform: { $ref: "#/$defs/PlatformId" },
      candidateCanonicalOrigin: { $ref: "#/$defs/HttpsOrigin" },
      hostVerificationKind: { const: "real-network" },
      browserProjects: {
        type: "array",
        items: { enum: ["msedge", "chrome"] },
        minItems: 2,
        maxItems: 2,
        uniqueItems: true
      },
      releaseIdentity: { $ref: "#/$defs/ReleaseIdentity" }
    }
  })) {
    throw new Error("Deployed-PWA v3 Schema candidate scope or Edge/Chrome tuple drifted.");
  }
  if (!sameJson(DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES)) {
    throw new Error("Deployed-PWA v3 semantic gate constants drifted.");
  }
  const semanticProperties = Object.fromEntries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES.map(
      (name) => [name, { type: "boolean" }]
    )
  );
  if (!sameJson(definitions?.SemanticGates, {
    type: "object",
    additionalProperties: false,
    required: REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES,
    properties: semanticProperties
  })) {
    throw new Error("Deployed-PWA v3 manifest-aware candidate consistency gates drifted.");
  }
  const admissionProperties = Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES.map((name) => [name, { const: false }])
  );
  if (!sameJson(definitions?.AdmissionGates, {
    type: "object",
    additionalProperties: false,
    required: DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES,
    properties: admissionProperties
  })) {
    throw new Error("Deployed-PWA v3 admission gates must remain exact false constants.");
  }
  const claimProperties = Object.fromEntries(
    DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES.map((name) => [name, { const: false }])
  );
  if (!sameJson(definitions?.Claims, {
    type: "object",
    additionalProperties: false,
    required: DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES,
    properties: claimProperties
  })) {
    throw new Error("Deployed-PWA v3 claims must remain exact false constants.");
  }
  if (!sameJson(definitions?.AttachmentBinding?.properties?.role?.enum,
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES)
    || !sameJson(DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
      REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES)
    || definitions?.ArtifactPath?.pattern
      !== "^(?!/)(?!\\.{1,2}(?:/|$))(?!.*//)(?!.*/\\.{1,2}(?:/|$))[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)*$"
    || !sameJson(definitions?.RouteObservation?.properties?.routeId?.enum,
      DEPLOYED_PWA_EVIDENCE_V3_ROUTE_IDS)
    || definitions?.CaseRevisionFingerprintBinding?.properties?.projectionVersion?.const
      !== "deployed-pwa-case-revision-observation-v1"
    || definitions?.EdgeBrowserReceipt?.properties?.projectName?.const !== "msedge"
    || definitions?.EdgeBrowserReceipt?.properties?.browserChannel?.const !== "msedge"
    || definitions?.ChromeBrowserReceipt?.properties?.projectName?.const !== "chrome"
    || definitions?.ChromeBrowserReceipt?.properties?.browserChannel?.const !== "chrome") {
    throw new Error("Deployed-PWA v3 route, attachment, case, or browser vocabulary drifted.");
  }
  if (!sameJson(definitions?.BrowserManifestIdentity, {
    type: "object",
    additionalProperties: false,
    required: [
      "manifestUrl",
      "installabilityEvidenceMethod",
      "processedManifestEvidenceMethod",
      "remoteManifestEvidenceMethod",
      "installabilityErrorCount",
      "manifestParseErrorCount",
      "browserManifestContentSha256",
      "manifestSemanticProjectionSha256",
      "remoteManifestSha256"
    ],
    properties: {
      manifestUrl: { $ref: "#/$defs/HttpsUrl" },
      installabilityEvidenceMethod: { const: "cdp_page_get_installability_errors_v1" },
      processedManifestEvidenceMethod: { const: "cdp_page_get_app_manifest_v1" },
      remoteManifestEvidenceMethod: { const: "browser_context_request_identity_v1" },
      installabilityErrorCount: { const: 0 },
      manifestParseErrorCount: { const: 0 },
      browserManifestContentSha256: { $ref: "#/$defs/Sha256" },
      manifestSemanticProjectionSha256: { $ref: "#/$defs/Sha256" },
      remoteManifestSha256: { $ref: "#/$defs/Sha256" }
    }
  })) {
    throw new Error("Deployed-PWA v3 manifest identity contract drifted.");
  }
  const browserCoreProperties = definitions?.BrowserRuntimeReceiptCore?.properties;
  if (browserCoreProperties?.manifest?.$ref !== "#/$defs/BrowserManifestIdentity"
    || browserCoreProperties?.routeObservations?.minItems !== 5
    || browserCoreProperties?.routeObservations?.maxItems !== 5
    || browserCoreProperties?.attachments?.minItems !== 10
    || browserCoreProperties?.attachments?.maxItems !== 10) {
    throw new Error("Deployed-PWA v3 manifest, route, or 10-attachment cardinality drifted.");
  }
  return Object.freeze({
    schemaId: schema.$id,
    status: properties.status.const,
    manifestSemanticGate: REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE,
    semanticGateNames: Object.freeze([
      ...REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SEMANTIC_GATE_NAMES
    ]),
    admissionGateNames: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V3_ADMISSION_GATE_NAMES]),
    claimNames: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V3_CLAIM_NAMES]),
    routeIds: Object.freeze([...DEPLOYED_PWA_EVIDENCE_V3_ROUTE_IDS]),
    attachmentRoles: Object.freeze([...REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES])
  });
}

function buildSyntheticSwTwoGenerationArtifactSetIdentity() {
  const digestSeeds = [
    Object.freeze({ build: "1", route: "2", marker: "3", index: "4", worker: "5" }),
    Object.freeze({ build: "6", route: "7", marker: "8", index: "9", worker: "a" }),
    Object.freeze({ build: "b", route: "c", marker: "d", index: "e", worker: "f" })
  ];
  const generations = SW_TWO_GENERATION_ARTIFACT_GENERATIONS.map((generation, index) => {
    const seeds = digestSeeds[index];
    if (!seeds) throw new Error("Synthetic SW fixture artifact seed is missing.");
    return createSwTwoGenerationGenerationArtifactIdentity({
      generationName: generation.generationName,
      fault: generation.fault,
      buildVersion: seeds.build.repeat(12),
      releaseDescriptorSha256: "d".repeat(64),
      releaseStorageManifestSha256: "e".repeat(64),
      files: [
        {
          path: `assets/research-query-page-${generation.generationName}.js`,
          size: 1,
          sha256: seeds.route.repeat(64)
        },
        {
          path: `e2e-sw-generation-${generation.generationName}.txt`,
          size: 2,
          sha256: seeds.marker.repeat(64)
        },
        { path: "index.html", size: 3, sha256: seeds.index.repeat(64) },
        { path: "sw.js", size: 4, sha256: seeds.worker.repeat(64) }
      ]
    });
  });
  return createSwTwoGenerationArtifactSetIdentity(generations);
}

export function verifySwTwoGenerationFixtureGovernance(
  decisions,
  packageJson,
  fixtureConfig,
  fixtureSource,
  reporterSource,
  runnerSource,
  artifactIdentityModuleSource,
  criticalSourceIdentityModuleSource,
  criticalSourceIdentity
) {
  for (const [scriptName, expectedCommand] of Object.entries(
    REQUIRED_SW_TWO_GENERATION_FIXTURE_SCRIPTS
  )) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`SW two-generation fixture package script mismatch: ${scriptName}.`);
    }
  }

  const expectedConfigKeys = [
    "testDir",
    "testMatch",
    "outputDir",
    "timeout",
    "expect",
    "fullyParallel",
    "forbidOnly",
    "failOnFlakyTests",
    "retries",
    "repeatEach",
    "workers",
    "reporter",
    "use",
    "projects"
  ];
  const expectedProjectKeys = ["name", "metadata", "use"];
  const expectedProjectUseKeys = [
    "viewport",
    "screen",
    "deviceScaleFactor",
    "isMobile",
    "hasTouch",
    "channel"
  ];
  const projects = fixtureConfig.projects?.map((project) => ({
    name: project.name,
    channel: project.use?.channel,
    metadata: project.metadata
  }));
  if (
    !exactKeys(fixtureConfig, expectedConfigKeys)
    || fixtureConfig.testDir !== "./e2e"
    || fixtureConfig.testMatch !== "service-worker-two-generation.spec.ts"
    || path.resolve(String(fixtureConfig.outputDir))
      !== path.resolve(os.tmpdir(), "hakimi-bazi-sw-upgrade-results")
    || fixtureConfig.timeout !== 300_000
    || !sameJson(fixtureConfig.expect, { timeout: 20_000 })
    || fixtureConfig.fullyParallel !== false
    || fixtureConfig.forbidOnly !== true
    || fixtureConfig.failOnFlakyTests !== true
    || fixtureConfig.retries !== 0
    || fixtureConfig.repeatEach !== 1
    || fixtureConfig.workers !== 1
    || !sameJson(fixtureConfig.use, {
      serviceWorkers: "allow",
      video: "off"
    })
    || !Array.isArray(fixtureConfig.projects)
    || fixtureConfig.projects.some((project) =>
      !exactKeys(project, expectedProjectKeys)
      || !exactKeys(project.use, expectedProjectUseKeys)
      || "executablePath" in project.use
      || "userAgent" in project.use
    )
    || !sameJson(projects, [
      {
        name: "msedge",
        channel: "msedge",
        metadata: {
          fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
          evidenceClass: "local_synthetic_fixture_only",
          artifactBinding: "shared_runner_owned_artifact_set_v1",
          browserChannel: "msedge"
        }
      },
      {
        name: "chrome",
        channel: "chrome",
        metadata: {
          fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
          evidenceClass: "local_synthetic_fixture_only",
          artifactBinding: "shared_runner_owned_artifact_set_v1",
          browserChannel: "chrome"
        }
      }
    ])
    || !Array.isArray(fixtureConfig.reporter)
    || fixtureConfig.reporter.length !== 2
    || fixtureConfig.reporter[0]?.[0] !== "line"
    || path.resolve(String(fixtureConfig.reporter[1]?.[0]))
      !== path.resolve(REQUIRED_SW_TWO_GENERATION_REPORTER_PATH)
    || !sameJson(fixtureConfig.reporter[1]?.[1], {})
  ) {
    throw new Error("SW two-generation fixture config must remain the exact serial Edge/Chrome contract.");
  }
  if (!sameJson(SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES, ["msedge", "chrome"])) {
    throw new Error("SW two-generation fixture project anchor has drifted.");
  }
  if (!sameJson(SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS, [
    "healthy_b_controlled_takeover_with_research_db_write_fence",
    "old_shell_cache_fallback_under_b_controller",
    "candidate_install_failure_keeps_a_active"
  ]) || SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT !== 3) {
    throw new Error("SW two-generation fixture scenario anchor has drifted.");
  }
  if (!sameJson(REQUIRED_RELEASE_BROWSER_RECEIPT_IDS, [
    "backup", "boot", "pwa", "web-v1-flow"
  ])) {
    throw new Error("Formal release browser receipt allowlist has drifted.");
  }
  if (
    typeof artifactIdentityModuleSource !== "string"
    || !artifactIdentityModuleSource.includes(
      "const artifactSnapshotStates = new WeakMap<object, ArtifactSnapshotState>();"
    )
    || !artifactIdentityModuleSource.includes(
      "export async function snapshotSwTwoGenerationArtifactSetDirectory("
    )
    || !artifactIdentityModuleSource.includes(
      "export function readSwTwoGenerationArtifactSnapshot("
    )
    || !artifactIdentityModuleSource.includes("if (entry.isSymbolicLink())")
    || !artifactIdentityModuleSource.includes("!isContainedPath(realRoot, realPath)")
    || !artifactIdentityModuleSource.includes("!sameNativePath(realPath, expectedRealPath)")
    || !artifactIdentityModuleSource.includes('releaseEvidenceId !== "unbound-local-build"')
    || !artifactIdentityModuleSource.includes(
      "new Set(generations.map((entry) => entry.buildVersion)).size !== generations.length"
    )
    || !artifactIdentityModuleSource.includes(
      "new Set(generations.map((entry) => entry.artifactInventorySha256)).size !== generations.length"
    )
  ) {
    throw new Error(
      "SW two-generation fixture artifact identity module no longer provides hardened branded byte snapshots."
    );
  }
  if (
    typeof fixtureSource !== "string"
    || !fixtureSource.includes("const projectName = testInfo.project.name;")
    || !fixtureSource.includes("releasePersistentContextOptionsForProject(projectName)")
    || !fixtureSource.includes('session.send("Browser.getVersion")')
    || !fixtureSource.includes("requireReleaseBrowserRuntimeProduct(projectName, version.product)")
    || !fixtureSource.includes("requireFixtureProfileAbsent(profilePath)")
    || !fixtureSource.includes('const profileRoot = await mkdtemp(path.join(tmpdir(), "hb-sw-"));')
    || !fixtureSource.includes('const profilePath = path.join(profileRoot, "profile");')
    || !fixtureSource.includes('testInfo.attach("isolated-browser-profile"')
    || !fixtureSource.includes("SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.runtimeProduct")
    || !fixtureSource.includes("SW_TWO_GENERATION_FIXTURE_ANNOTATIONS.freshProfileVerified")
    || !fixtureSource.includes(
      "const artifactRoot = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT;"
    )
    || !fixtureSource.includes(
      "const expectedArtifactSetSha256 = process.env.HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256;"
    )
    || !fixtureSource.includes(
      "const artifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);"
    )
    || !fixtureSource.includes(
      "artifactSet.identity.canonicalSha256 !== expectedArtifactSetSha256"
    )
    || !fixtureSource.includes(
      "let bytes = readSwTwoGenerationArtifactSnapshot(generation, artifactPath);"
    )
    || !fixtureSource.includes('response.end(method === "HEAD" ? undefined : bytes);')
    || (fixtureSource.match(/SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS\[[0-2]\]/gu) ?? []).length !== 3
    || /channel:\s*["']msedge["']/u.test(fixtureSource)
    || /\b(?:execFile|spawn|mkdtemp|rm)\s*\(/u.test(fixtureSource.replace(
      'const profileRoot = await mkdtemp(path.join(tmpdir(), "hb-sw-"));',
      ""
    ))
    || /\b(?:readFile|readFileSync|createReadStream)\s*\(/u.test(fixtureSource)
    || fixtureSource.includes("HAKIMI_SW_UPGRADE_OUT_DIR")
    || fixtureSource.includes("vite build")
    || fixtureSource.includes("runtime-rollback-profile")
    || fixtureSource.includes("broken-b-rollback-a")
  ) {
    throw new Error(
      "SW two-generation fixture must consume the runner-owned branded snapshot without building or reading response bytes from disk."
    );
  }
  if (
    typeof reporterSource !== "string"
    || !reporterSource.includes("config.workers !== 1")
    || !reporterSource.includes("project.retries !== 0")
    || !reporterSource.includes("project.repeatEach !== 1")
    || !reporterSource.includes("path.resolve(project.outputDir)")
    || !reporterSource.includes("hakimi-bazi-sw-upgrade-results")
    || !reporterSource.includes("path.resolve(project.testDir)")
    || !reporterSource.includes("path.resolve(test.location.file)")
    || !reporterSource.includes("assertSwTwoGenerationFixtureCriticalSourceIdentity")
    || !reporterSource.includes("loadSwTwoGenerationFixtureCriticalSourceIdentity")
    || !reporterSource.includes("closingIdentity")
    || !reporterSource.includes("critical source identity changed during execution")
    || !reporterSource.includes("HAKIMI_SW_TWO_GENERATION_FIXTURE_ATTEMPT_ID")
    || !reporterSource.includes("SW fixture attempt id changed during execution")
    || !reporterSource.includes(
      'path.join(path.dirname(this.outputPath), "artifact-builds")'
    )
    || !reporterSource.includes(
      "snapshotSwTwoGenerationArtifactSetDirectory(this.artifactRoot)"
    )
    || !reporterSource.includes(
      "closingArtifactSet.identity.canonicalSha256 !== this.artifactSetSha256"
    )
    || !reporterSource.includes("artifactSetIdentity,")
    || !reporterSource.includes('flag: "wx"')
    || !reporterSource.includes("Exclusive fixture summary write failed")
  ) {
    throw new Error("SW two-generation fixture reporter no longer enforces the effective run and exclusive summary contract.");
  }
  if (
    typeof runnerSource !== "string"
    || !runnerSource.includes("process.argv.length !== 2")
    || !runnerSource.includes("assertCanonicalPlaywrightOutputDir()")
    || !runnerSource.includes("swUpgradeConfig.outputDir")
    || !runnerSource.includes('[playwrightCli, "test", "--config", fixtureConfig]')
    || !runnerSource.includes("HAKIMI_SW_TWO_GENERATION_FIXTURE_RESULT_OUTPUT: resultPath")
    || !runnerSource.includes("assertStrictSwTwoGenerationFixtureSummary(summary)")
    || !runnerSource.includes("startingCriticalSourceIdentity")
    || !runnerSource.includes("endingCriticalSourceIdentity")
    || !runnerSource.includes("summary.criticalSourceIdentity")
    || !runnerSource.includes(
      'const artifactRoot = path.join(temporaryRoot, "artifact-builds");'
    )
    || !runnerSource.includes(
      "const startingArtifactSetIdentity = (await buildSharedArtifactSet(artifactRoot)).identity;"
    )
    || !runnerSource.includes("for (const generation of SW_TWO_GENERATION_ARTIFACT_GENERATIONS)")
    || !runnerSource.includes("HAKIMI_SW_TWO_GENERATION_ARTIFACT_ROOT: artifactRoot")
    || !runnerSource.includes(
      "HAKIMI_SW_TWO_GENERATION_ARTIFACT_SET_SHA256: artifactSetSha256"
    )
    || !runnerSource.includes(
      "const endingArtifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(artifactRoot);"
    )
    || !runnerSource.includes(
      "JSON.stringify(startingArtifactSetIdentity) !== JSON.stringify(endingArtifactSet.identity)"
    )
    || !runnerSource.includes(
      "JSON.stringify(summary.artifactSetIdentity) !== JSON.stringify(endingArtifactSet.identity)"
    )
    || (runnerSource.match(/await buildSharedArtifactSet\(artifactRoot\)/gu) ?? []).length !== 1
    || runnerSource.indexOf(
      "const startingArtifactSetIdentity = (await buildSharedArtifactSet(artifactRoot)).identity;"
    )
      > runnerSource.indexOf("const execution = await runCanonicalPlaywright(")
    || !runnerSource.includes("randomBytes(32)")
    || !runnerSource.includes("summary.attemptId !== attemptId")
  ) {
    throw new Error(
      "SW two-generation fixture wrapper no longer owns one shared artifact build and its strict summary binding."
    );
  }

  if (
    sourceSha256(criticalSourceIdentityModuleSource)
      !== REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_IDENTITY_MODULE_SHA256
  ) {
    throw new Error("SW two-generation fixture critical source identity module drifted.");
  }
  try {
    assertSwTwoGenerationFixtureCriticalSourceIdentity(criticalSourceIdentity);
  } catch (error) {
    throw new Error(
      `SW two-generation fixture critical source set drifted: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
  if (
    SW_TWO_GENERATION_FIXTURE_EXPECTED_CRITICAL_SOURCE_SET_SHA256
      !== REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256
    || criticalSourceIdentity.canonicalSha256
      !== REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256
  ) {
    throw new Error("SW two-generation fixture critical source set is not governance-frozen.");
  }
  const passedCriticalSources = [
    ["apps/web/e2e/service-worker-two-generation.spec.ts", fixtureSource],
    ["apps/web/playwright.sw-two-generation-fixture-reporter.ts", reporterSource],
    ["apps/web/sw-two-generation-artifact-identity.ts", artifactIdentityModuleSource],
    ["scripts/run-sw-two-generation-fixture.mjs", runnerSource]
  ];
  for (const [sourcePath, source] of passedCriticalSources) {
    const bound = criticalSourceIdentity.files.find((entry) => entry.path === sourcePath);
    if (!bound || bound.normalizedSha256 !== sourceSha256(source)) {
      throw new Error(`SW two-generation fixture checked source input is not byte-bound: ${sourcePath}.`);
    }
  }

  const passingObservations = SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES.flatMap((projectName) =>
    SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS.map((scenarioId) => ({
      projectName,
      scenarioId,
      runtimeProduct: projectName === "msedge"
        ? "Edg/140.0.3485.94"
        : "Chrome/140.0.7339.82",
      freshProfileVerified: true,
      sourceFileVerified: true,
      expectedStatus: "passed",
      outcome: "expected",
      resultStatuses: ["passed"]
    }))
  );
  const artifactSetIdentity = buildSyntheticSwTwoGenerationArtifactSetIdentity();
  const fixtureSummary = buildSwTwoGenerationFixtureSummary({
    attemptId: "a".repeat(64),
    fullResultStatus: "passed",
    observations: passingObservations,
    criticalSourceIdentity,
    artifactSetIdentity
  });
  assertStrictSwTwoGenerationFixtureSummary(fixtureSummary);
  if (
    fixtureSummary.schemaVersion !== SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION
    || SW_TWO_GENERATION_FIXTURE_SCHEMA_VERSION !== 3
    || fixtureSummary.fixtureContractId !== SW_TWO_GENERATION_FIXTURE_CONTRACT_ID
    || fixtureSummary.evidenceClass !== "local_synthetic_fixture_only"
    || fixtureSummary.strictGatePassed !== true
    || fixtureSummary.artifactSetIdentity?.canonicalSha256
      !== artifactSetIdentity.canonicalSha256
    || fixtureSummary.projects.some((project) =>
      project.artifactSetCanonicalSha256 !== artifactSetIdentity.canonicalSha256
    )
    || !sameJson(fixtureSummary.claims, {
      localSyntheticFixtureVerified: true,
      localFixtureArtifactSetBoundToAttempt: true,
      realHttpsHostVerified: false,
      deployedArtifactVerified: false,
      providerDeploymentVerified: false,
      rollbackVerified: false,
      releaseEvidenceVerified: false,
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false,
      publicReleaseAuthorized: false
    })
    || !sameJson(SW_TWO_GENERATION_FIXTURE_NON_CLAIMS, [
      "complete_transitive_source_closure_verified",
      "browser_consumed_every_artifact_file_verified",
      "real_https_response_bytes_verified",
      "real_https_host_verified",
      "deployed_artifact_verified",
      "provider_deployment_verified",
      "actual_os_pwa_install_verified",
      "real_v13_user_data_verified",
      "a_to_b_to_a_rollback_verified",
      "v13_to_v16_shadow_to_v13_rollback_verified",
      "release_evidence_verified",
      "release_ready",
      "public_deployment_authorized",
      "expert_claims_authorized",
      "public_release_authorized"
    ])
    || !sameJson(fixtureSummary.doesNotEstablish, SW_TWO_GENERATION_FIXTURE_NON_CLAIMS)
  ) {
    throw new Error("SW two-generation fixture summary has promoted an adjacent evidence or authorization claim.");
  }

  const predeploymentReceipts = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  if (!predeploymentReceipts
    || typeof predeploymentReceipts !== "object"
    || Array.isArray(predeploymentReceipts)) {
    throw new Error("Default v13 pre-deployment receipt policy is missing.");
  }
  const serializedReceipts = JSON.stringify(predeploymentReceipts).toLowerCase();
  for (const fragment of [
    "sw-upgrade",
    "two-generation",
    "fixture-contract",
    "sw_two_generation"
  ]) {
    if (serializedReceipts.includes(fragment)) {
      throw new Error(
        "Local synthetic SW two-generation fixture must remain outside formal Release Evidence receipts."
      );
    }
  }

  return Object.freeze({
    fixtureContractId: SW_TWO_GENERATION_FIXTURE_CONTRACT_ID,
    status: "static_contract_only_not_executed",
    expectedProjectNames: Object.freeze([...SW_TWO_GENERATION_FIXTURE_PROJECT_NAMES]),
    expectedScenarioIds: Object.freeze([...SW_TWO_GENERATION_FIXTURE_SCENARIO_IDS]),
    expectedTestsPerProject: SW_TWO_GENERATION_FIXTURE_EXPECTED_TESTS_PER_PROJECT,
    criticalSourceScope: SW_TWO_GENERATION_FIXTURE_CRITICAL_SOURCE_SCOPE,
    artifactIdentityType: artifactSetIdentity.identityType,
    artifactGenerationNames: Object.freeze(
      artifactSetIdentity.generations.map((generation) => generation.generationName)
    ),
    sharedArtifactSetRunnerOwned: true,
    criticalSourceFilesBound: criticalSourceIdentity.files.length,
    productSourceFilesBound: criticalSourceIdentity.files.filter(
      (entry) => entry.role.startsWith("product_")
    ).length,
    criticalSourceSetCanonicalSha256: criticalSourceIdentity.canonicalSha256,
    formalReleaseReceipt: false,
    rollbackEvidence: false
  });
}

function releaseBrowserTuple(browser) {
  return {
    policyId: browser?.policyId,
    projectName: browser?.projectName,
    channel: browser?.channel,
    deviceName: browser?.deviceName
  };
}

export function verifyCrossSchemaV13V16CompletionGovernance(config = crossSchemaV13V16Config) {
  const receiptId = "cross-schema-v13-v16";
  if (CROSS_SCHEMA_V13_V16_RECEIPT_ID !== receiptId
    || CROSS_SCHEMA_V13_V16_SPEC_PATH !== "apps/web/e2e/service-worker-cross-schema-v13-v16.spec.ts"
    || CROSS_SCHEMA_V13_V16_TEST_TITLES.length !== 13
    || new Set(CROSS_SCHEMA_V13_V16_TEST_TITLES).size !== 13
    || !sameJson(REQUIRED_RELEASE_BROWSER_COMPLETION_TESTS_PER_PROJECT, {
      backup: 4, boot: 6, pwa: 1, "web-v1-flow": 1, [receiptId]: 13
    })) {
    throw new Error("Cross-Schema completion inventory does not match the full release test scope.");
  }
  if (!exactKeys(config, [
    "testDir", "testMatch", "outputDir", "timeout", "expect", "fullyParallel",
    "forbidOnly", "failOnFlakyTests", "retries", "workers", "reporter", "use", "projects"
  ]) || config.testDir !== "./e2e"
    || config.testMatch !== "service-worker-cross-schema-v13-v16.spec.ts"
    || config.outputDir !== path.join(os.tmpdir(), "hakimi-bazi-cross-schema-v13-v16-results")
    || config.timeout !== 300_000 || !sameJson(config.expect, { timeout: 25_000 })
    || config.fullyParallel !== false || config.forbidOnly !== true
    || config.failOnFlakyTests !== true || config.retries !== 0 || config.workers !== 1) {
    throw new Error("Cross-Schema completion config must retain the full serial matrix without selectors.");
  }
  if (!sameJson(config.reporter, [
    ["line"],
    [path.join(moduleWorkspaceRoot, "apps/web/playwright.release-browser-strict-reporter.ts"), {
      receiptId, expectedTestsPerProject: 13
    }]
  ])) {
    throw new Error("Cross-Schema completion requires the existing strict reporter and thirteen tests per project.");
  }
  if (!sameJson(config.use, {
    serviceWorkers: "allow", trace: "retain-on-failure", screenshot: "only-on-failure", video: "off"
  }) || !Array.isArray(config.projects) || config.projects.length !== RELEASE_BROWSER_MATRIX.length) {
    throw new Error("Cross-Schema completion context or browser matrix changed.");
  }
  for (let index = 0; index < RELEASE_BROWSER_MATRIX.length; index += 1) {
    const browser = RELEASE_BROWSER_MATRIX[index];
    const project = config.projects[index];
    if (!exactKeys(project, ["name", "use"]) || project.name !== browser.projectName
      || !sameJson(project.use, { ...devices[browser.deviceName], channel: browser.channel })) {
      throw new Error(`Cross-Schema completion browser project changed: ${browser.projectName}.`);
    }
  }
}

export function verifyReleaseBrowserGovernance(
  decisions,
  packageJson,
  releaseBrowserMatrix = RELEASE_BROWSER_MATRIX,
  browserConfigs = {
    backup: backupArtifactConfig,
    boot: bootArtifactConfig,
    pwa: pwaCrossBrowserConfig,
    "web-v1-flow": webV1CrossBrowserConfig
  },
  webPackageJson = null
) {
  const actualBrowserMatrix = Array.isArray(releaseBrowserMatrix)
    ? releaseBrowserMatrix.map(releaseBrowserTuple)
    : null;
  if (
    actualBrowserMatrix === null ||
    JSON.stringify(actualBrowserMatrix) !== JSON.stringify(REQUIRED_RELEASE_BROWSER_MATRIX)
  ) {
    throw new Error("Web v1 release browser project/channel/device matrix does not match policy.");
  }

  const actualBrowserIds = decisions.browserSupport?.supportedEngineeringMatrix;
  const canonicalActualBrowserIds = Array.isArray(actualBrowserIds)
    && actualBrowserIds.every((value) => typeof value === "string")
    && new Set(actualBrowserIds).size === actualBrowserIds.length
    ? [...actualBrowserIds].sort()
    : null;
  if (
    canonicalActualBrowserIds === null ||
    JSON.stringify(canonicalActualBrowserIds) !== JSON.stringify(REQUIRED_RELEASE_BROWSER_IDS)
  ) {
    throw new Error("Web v1 release browser matrix must be exactly desktop-chrome, desktop-edge.");
  }

  for (const claimField of REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS) {
    if (decisions.browserSupport?.[claimField] !== false) {
      throw new Error(`Unsupported release browser claim must remain false: ${claimField}.`);
    }
  }

  const receiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
  for (const [id, expectedCommand] of Object.entries(REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS)) {
    if (JSON.stringify(receiptCommands?.[id]) !== JSON.stringify(expectedCommand)) {
      throw new Error(`Release browser receipt policy mismatch: ${id}.`);
    }
  }

  for (const [scriptName, expectedCommand] of Object.entries(REQUIRED_RELEASE_BROWSER_SCRIPTS)) {
    if (packageJson.scripts?.[scriptName] !== expectedCommand) {
      throw new Error(`Release browser package script mismatch: ${scriptName}.`);
    }
  }
  if (webPackageJson !== null
    && webPackageJson.scripts?.["preview:release-artifact"] !== REQUIRED_RELEASE_ARTIFACT_PREVIEW_SCRIPT) {
    throw new Error("Release artifact preview script must verify and serve dist/web without rebuilding.");
  }

  verifyReleaseBrowserPlaywrightConfig(browserConfigs.backup, {
    receiptId: "backup",
    testMatch: [
      "database-v9-v10-upgrade.spec.ts",
      "database-v10-v11-upgrade.spec.ts",
      "offline-full-backup.spec.ts",
      "full-backup-worker-capacity.spec.ts"
    ],
    outputDirectoryName: "hakimi-bazi-backup-cross-browser-results",
    timeout: 180_000,
    expectedTestsPerProject: 4
  });
  verifyReleaseBrowserPlaywrightConfig(browserConfigs.boot, {
    receiptId: "boot",
    testMatch: [
      "boot-fail-closed.spec.ts",
      "database-v8-v9-upgrade.spec.ts"
    ],
    outputDirectoryName: "hakimi-bazi-boot-cross-browser-results",
    timeout: 120_000,
    expectedTestsPerProject: 6
  });
  verifyReleaseBrowserPlaywrightConfig(browserConfigs.pwa, {
    receiptId: "pwa",
    testMatch: "pwa-install-and-offline-cold-start.spec.ts",
    outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
    timeout: 120_000,
    expectedTestsPerProject: 1
  });
  verifyReleaseBrowserPlaywrightConfig(browserConfigs["web-v1-flow"], {
    receiptId: "web-v1-flow",
    testMatch: "web-v1-continuous-flow.spec.ts",
    outputDirectoryName: "hakimi-bazi-web-v1-cross-browser-results",
    timeout: 360_000,
    expectedTestsPerProject: 1
  });
}

const cwd = process.cwd();
const releaseEvidenceSchemaValidator = await loadReleaseEvidenceSchemaValidator(cwd);
const rollbackEvidenceSchemaValidator = await loadRollbackEvidenceSchemaValidator(cwd);
const deployedPwaEvidenceSchemaValidator = await loadDeployedPwaEvidenceSchemaValidator(cwd);
const deployedPwaEvidenceV2SchemaValidator = await loadDeployedPwaEvidenceV2SchemaValidator(cwd);
const deployedPwaEvidenceV3SchemaValidator = await loadDeployedPwaEvidenceV3SchemaValidator(cwd);
const swAbUpdateCandidateSchemaValidator = await loadSwAbUpdateCandidateSchemaValidator(cwd);
const swAbUpdateRuntimeClientCaptureSchemaValidator =
  await loadSwAbUpdateRuntimeClientCaptureSchemaValidator(cwd);
const swAbUpdateRuntimeApiTranscriptSchemaValidator =
  await loadSwAbUpdateRuntimeApiTranscriptSchemaValidator(cwd);
const swAbUpdateRuntimeCollectorIssuanceSchemaValidator =
  await loadSwAbUpdateRuntimeCollectorIssuanceSchemaValidator(cwd);
const swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator =
  await loadSwAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator(cwd);
const swAbUpdateFourChainCompositionSchemaValidator =
  await loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceCompositionSchemaValidator(cwd);
const swAbRuntimeDerivedEvidenceProducerBridgeSchemaValidator =
  await loadSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchemaValidator(cwd);
const swAbProducerBridgeCompositionSchemaValidator =
  await loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchemaValidator(
    cwd
  );
const rollbackProviderSequenceCompositionSchemaValidator =
  await loadRollbackProviderSequenceCompositionSchemaValidator(cwd);
const readJson = async (filePath) => JSON.parse(await readFile(path.resolve(cwd, filePath), "utf8"));
const providerDeploymentCandidateSequenceSchema = await readJson(
  "docs/release/provider-deployment-candidate-sequence-v1.schema.json"
);
const decisions = await readJson("docs/release/web-v1-release-decisions.json");
const packageJson = await readJson("package.json");
const webPackageJson = await readJson("apps/web/package.json");
const history = await readJson("docs/release/release-generation-history.json");
const security = await readJson("docs/security/hosting-security-policy.json");
const license = await readFile(path.resolve(cwd, "LICENSE"), "utf8");
const headersFile = await readFile(path.resolve(cwd, "apps/web/public/_headers"), "utf8");
const releaseWorkflow = await readFile(path.resolve(cwd, ".github/workflows/release-evidence.yml"), "utf8");
const quickWorkflow = await readFile(path.resolve(cwd, ".github/workflows/quick-ci.yml"), "utf8");
const ziweiHkoRestrictedSourcePreReleasePolicy =
  parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes(
    await readFile(path.resolve(cwd, ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH)),
    ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH
  );
const ziweiHkoRestrictedSourceImplementationArtifacts = Object.fromEntries(
  await Promise.all(ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS.map(async (spec) => [
    spec.path,
    await readFile(path.resolve(cwd, ...spec.path.split("/")))
  ]))
);
const ziweiHkoParentIsolationArtifacts = Object.fromEntries(
  await Promise.all(ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS.map(async (artifactPath) => [
    artifactPath,
    await readFile(path.resolve(cwd, ...artifactPath.split("/")))
  ]))
);
const nightlyWorkflow = await readFile(
  path.resolve(cwd, ".github/workflows/nightly-heavy.yml"),
  "utf8"
);
const restrictedBlockers = await readJson("docs/release/known-restricted-blockers.v1.json");
const rollbackPolicy = await readJson("docs/release/rollback-evidence-policy.v1.json");
const deployedPwaPolicy = await readJson("docs/release/deployed-pwa-evidence-policy.v1.json");
const deployedPwaV2Policy = await readJson("docs/release/deployed-pwa-evidence-policy.v2.json");
const deployedPwaV3Policy = await readJson("docs/release/deployed-pwa-evidence-policy.v3.json");
const deployedPwaV3TestSource = await readFile(
  path.resolve(cwd, "scripts/deployed-pwa-evidence-v3.test.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionFixtureSource = await readFile(
  path.resolve(cwd, "scripts/deployed-pwa-host-provider-composition.test-fixture.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionTestSource = await readFile(
  path.resolve(cwd, "scripts/deployed-pwa-host-provider-composition.test.mjs"),
  "utf8"
);
const storageV13MatrixHistoricalPolicyV1Source = await readFile(
  path.resolve(cwd, "docs/release/storage-v13-matrix-candidate-policy.v1.json"),
  "utf8"
);
const storageV13MatrixHistoricalPolicyV1 = JSON.parse(storageV13MatrixHistoricalPolicyV1Source);
const storageV13MatrixHistoricalReceiptSchemaV1Source = await readFile(
  path.resolve(cwd, "docs/release/storage-v13-matrix-browser-receipt-candidate-v1.schema.json"),
  "utf8"
);
const storageV13MatrixHistoricalReceiptSchemaV1 = JSON.parse(
  storageV13MatrixHistoricalReceiptSchemaV1Source
);
const storageV13MatrixPolicy = await readJson(
  "docs/release/storage-v13-matrix-candidate-policy.v2.json"
);
const storageV13MatrixReceiptSchema = await readJson(
  "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json"
);
const swAbUpdateCandidatePolicy = await readJson(
  "docs/release/sw-ab-update-candidate-policy.v1.json"
);
const swAbUpdateRuntimeClientCapturePolicy = await readJson(
  "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json"
);
const swAbUpdateRuntimeApiTranscriptPolicy = await readJson(
  "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json"
);
const swAbUpdateRuntimeCollectorIssuancePolicy = await readJson(
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionPolicy = await readJson(
  "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json"
);
const swAbUpdateFourChainCompositionPolicySource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionPolicy = JSON.parse(
  swAbUpdateFourChainCompositionPolicySource
);
const swAbUpdateFourChainCompositionSchemaSource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionCheckedSourceDocuments = await Promise.all(
  SW_AB_FOUR_CHAIN_COMPOSITION_SOURCE_SPECS.map(async ({ role, path: sourcePath }) =>
    Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.resolve(cwd, ...sourcePath.split("/")), "utf8")
    })
  )
);
const swAbRuntimeDerivedEvidenceProducerBridgePolicySource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgePolicy = JSON.parse(
  swAbRuntimeDerivedEvidenceProducerBridgePolicySource
);
const swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeCheckedSourceDocuments = await Promise.all(
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS.map(
    async ({ role, path: sourcePath }) => Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.resolve(cwd, ...sourcePath.split("/")), "utf8")
    })
  )
);
const swAbProducerBridgeCompositionPolicySource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionPolicy = JSON.parse(
  swAbProducerBridgeCompositionPolicySource
);
const swAbProducerBridgeCompositionSchemaSource = await readFile(
  path.resolve(
    cwd,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionCheckedSourceDocuments = await Promise.all(
  SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_SPECS.map(
    async ({ role, path: sourcePath }) => Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.resolve(cwd, ...sourcePath.split("/")), "utf8")
    })
  )
);
const rollbackProviderSequenceCompositionPolicy = await readJson(
  "docs/release/rollback-provider-sequence-composition-policy.v1.json"
);
const rootTsconfig = await readJson("tsconfig.json");
const storageV13MatrixTsconfig = await readJson(
  "apps/web/tsconfig.storage-v13-matrix-candidate.json"
);
const rollbackActorRegistry = await readJson("docs/release/rollback-actor-trust-registry.v1.json");
const releaseRunbook = await readFile(path.resolve(cwd, "docs/release/web-v1-release-and-rollback-runbook.md"), "utf8");
const migrationWorkflow = await readFile(path.resolve(cwd, ".github/workflows/migration-ci.yml"), "utf8");
const swTwoGenerationFixtureSource = await readFile(
  path.resolve(cwd, "apps/web/e2e/service-worker-two-generation.spec.ts"),
  "utf8"
);
const swTwoGenerationFixtureReporterSource = await readFile(
  path.resolve(cwd, "apps/web/playwright.sw-two-generation-fixture-reporter.ts"),
  "utf8"
);
const swTwoGenerationFixtureRunnerSource = await readFile(
  path.resolve(cwd, "scripts/run-sw-two-generation-fixture.mjs"),
  "utf8"
);
const swTwoGenerationArtifactIdentityModuleSource = await readFile(
  path.resolve(cwd, "apps/web/sw-two-generation-artifact-identity.ts"),
  "utf8"
);
const swTwoGenerationFixtureCriticalSourceIdentityModuleSource = await readFile(
  path.resolve(cwd, "apps/web/sw-two-generation-fixture-source-identity.ts"),
  "utf8"
);
const swTwoGenerationFixtureCriticalSourceIdentity =
  loadSwTwoGenerationFixtureCriticalSourceIdentity(cwd);
const storageV13MatrixConfigSource = await readFile(
  path.resolve(cwd, "apps/web/playwright.storage-v13-matrix-candidate.config.ts"),
  "utf8"
);
const storageV13MatrixGlobalSetupSource = await readFile(
  path.resolve(cwd, "apps/web/playwright.storage-v13-matrix-candidate-global-setup.ts"),
  "utf8"
);
const storageV13MatrixRunnerSource = await readFile(
  path.resolve(cwd, "scripts/run-storage-v13-matrix-candidate.mjs"),
  "utf8"
);
const storageV13MatrixReporterSource = await readFile(
  path.resolve(cwd, "apps/web/playwright.storage-v13-matrix-candidate-reporter.ts"),
  "utf8"
);
const storageV13MatrixSpecSource = await readFile(
  path.resolve(cwd, "apps/web/e2e/storage-v13-matrix-candidate.spec.ts"),
  "utf8"
);
const storageV13MatrixNativeReadonlySource = await readFile(
  path.resolve(cwd, "apps/web/e2e/storage-v13-native-readonly.ts"),
  "utf8"
);
const storageV13MatrixRuntimeSource = await readFile(
  path.resolve(cwd, "scripts/storage-v13-matrix-candidate-runtime.mjs"),
  "utf8"
);
const storageV13MatrixVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-storage-v13-matrix-candidate.mjs"),
  "utf8"
);
const storageV13CrossConnectionCasTestSource = await readFile(
  path.resolve(cwd, "packages/backup/src/full-backup-v13-cross-connection.test.ts"),
  "utf8"
);
const fullBackupSource = await readFile(
  path.resolve(cwd, "packages/backup/src/index.ts"),
  "utf8"
);
const storageRepositorySource = await readFile(
  path.resolve(cwd, "packages/storage/src/index.ts"),
  "utf8"
);
const fullBackupWorkerClientSource = await readFile(
  path.resolve(cwd, "apps/web/src/lib/full-backup-worker-client.ts"),
  "utf8"
);
const fullBackupWorkerClientTestSource = await readFile(
  path.resolve(cwd, "apps/web/src/lib/full-backup-worker-client.test.ts"),
  "utf8"
);
const swAbUpdateCandidateLibSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-candidate-lib.mjs"),
  "utf8"
);
const swAbUpdateCandidateSchemaLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-candidate-schema.mjs"),
  "utf8"
);
const swAbUpdateCandidateVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-sw-ab-update-candidate.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureLibSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-client-capture-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-client-capture-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureSchemaLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-client-capture-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureProbeSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-client-capture-probe.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-sw-ab-update-runtime-client-capture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptLibSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptSchemaSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptWriterSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript-writer.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptFixtureSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript.test-fixture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptTestSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-api-transcript.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-sw-ab-update-runtime-api-transcript.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceLibSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceSchemaSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceWriterSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance-writer.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorLiveAdapterSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-live-adapter.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceFixtureSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance.test-fixture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceTestSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-issuance.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorLiveAdapterTestSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-collector-live-adapter.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-sw-ab-update-runtime-collector-issuance.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionSource = await readFile(
  path.resolve(cwd, "scripts/deployed-pwa-host-provider-composition.mjs"),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs"
  ),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaLoaderSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs"
  ),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionVerifierSource = await readFile(
  path.resolve(
    cwd,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionLibSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionSchemaLoaderSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionTestSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionVerifierSource = await readFile(
  path.resolve(
    cwd,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeLibSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs"),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeSchemaLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs"),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeWriterSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs"),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs"),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeFixtureSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test-fixture.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeTestSource = await readFile(
  path.resolve(cwd, "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs"),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeVerifierSource = await readFile(
  path.resolve(
    cwd,
    "scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionLibSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionSchemaLoaderSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionFixtureSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test-fixture.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionTestSource = await readFile(
  path.resolve(
    cwd,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionVerifierSource = await readFile(
  path.resolve(
    cwd,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs"
  ),
  "utf8"
);
const rollbackProviderSequenceCompositionLibSource = await readFile(
  path.resolve(cwd, "scripts/rollback-provider-sequence-composition-lib.mjs"),
  "utf8"
);
const rollbackProviderSequenceCompositionSchemaLoaderSource = await readFile(
  path.resolve(cwd, "scripts/rollback-provider-sequence-composition-schema.mjs"),
  "utf8"
);
const rollbackProviderSequenceCompositionVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-rollback-provider-sequence-composition.mjs"),
  "utf8"
);
const deployedHostCandidateRuntimeSource = await readFile(
  path.resolve(cwd, "scripts/deployed-host-candidate-runtime.mjs"),
  "utf8"
);
const deployedHostCandidateLoaderSource = await readFile(
  path.resolve(cwd, "scripts/deployed-host-candidate-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateRuntimeSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-runtime.mjs"),
  "utf8"
);
const providerDeploymentCandidateRuntimeTestSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-runtime.test.mjs"),
  "utf8"
);
const providerDeploymentCandidateLoaderSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceLoaderSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-sequence-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceVerifierSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-sequence-verifier.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceWriterSource = await readFile(
  path.resolve(cwd, "scripts/provider-deployment-candidate-sequence-writer.mjs"),
  "utf8"
);
const rollbackEvidenceLibSource = await readFile(
  path.resolve(cwd, "scripts/rollback-evidence-lib.mjs"),
  "utf8"
);
const rollbackEvidenceVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-rollback-evidence.mjs"),
  "utf8"
);
const releaseEvidenceLibSource = await readFile(
  path.resolve(cwd, "scripts/release-evidence-lib.mjs"),
  "utf8"
);
const releaseEvidenceGeneratorSource = await readFile(
  path.resolve(cwd, "scripts/generate-release-evidence.mjs"),
  "utf8"
);
const releaseEvidenceVerifierSource = await readFile(
  path.resolve(cwd, "scripts/verify-release-evidence.mjs"),
  "utf8"
);
const serviceWorkerSource = await readFile(
  path.resolve(cwd, "apps/web/public/sw.js"),
  "utf8"
);

if (
  decisions.defaultRelease.dbGeneration !== "legacy-v13" ||
  decisions.defaultRelease.targetSchema !== 13 ||
  decisions.defaultRelease.migrationId !== null ||
  decisions.defaultRelease.schema16PromotionAuthorized !== false
) throw new Error("Web v1 decisions do not preserve the frozen default v13 identity.");
if (decisions.domainClaims.expertValidatedClaimAuthorized !== false) {
  throw new Error("Engineering governance cannot authorize expert-validated claims.");
}
if (decisions.domainClaims.verifiedGoldCaseCount !== 0) throw new Error("Verified gold count was fabricated.");
if (decisions.licensing.openSourceClaimAuthorized !== false) throw new Error("Open-source claim is not authorized.");
const hostingGovernance = verifyHostingDecisionPolicyGovernance(decisions.hosting, security);
if (packageJson.scripts?.["test:deployed-security-headers"]
  !== "node --test scripts/verify-deployed-security-headers.test.mjs") {
  throw new Error("Deployed-host verifier tests are not closed into the Release Evidence tooling receipt.");
}
if (packageJson.scripts?.["verify:release-evidence"] !== REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND) {
  throw new Error("Formal Release Evidence package verification must write the independent receipt.");
}
verifyRollbackEvidenceGovernance(rollbackPolicy, rollbackActorRegistry, decisions, packageJson);
const rollbackPhaseContractGovernance = verifyRollbackPhaseContractSourceGovernance({
  rollbackLibSource: rollbackEvidenceLibSource,
  rollbackVerifierSource: rollbackEvidenceVerifierSource,
  rollbackProviderSequenceCompositionLibSource,
  packageJson
});
const deployedPwaGovernance = verifyDeployedPwaEvidenceGovernance(
  deployedPwaPolicy,
  decisions,
  security,
  packageJson
);
verifyDeployedPwaEvidenceSchemaGovernance(deployedPwaEvidenceSchemaValidator.schema);
const deployedPwaV2Governance = verifyDeployedPwaEvidenceV2Governance(
  deployedPwaV2Policy,
  decisions,
  security,
  packageJson
);
verifyDeployedPwaEvidenceV2SchemaGovernance(deployedPwaEvidenceV2SchemaValidator.schema);
const deployedPwaV3Governance = verifyDeployedPwaEvidenceV3Governance(
  deployedPwaV3Policy,
  decisions,
  security,
  packageJson
);
const deployedPwaV3SchemaGovernance = verifyDeployedPwaEvidenceV3SchemaGovernance(
  deployedPwaEvidenceV3SchemaValidator.schema
);
verifyDeployedPwaV3TestFixtureExtractionGovernance({
  deployedPwaV3TestSource,
  compositionFixtureSource: deployedPwaHostProviderCompositionFixtureSource,
  compositionTestSource: deployedPwaHostProviderCompositionTestSource
});
const swTwoGenerationFixtureGovernance = verifySwTwoGenerationFixtureGovernance(
  decisions,
  packageJson,
  swTwoGenerationFixtureConfig,
  swTwoGenerationFixtureSource,
  swTwoGenerationFixtureReporterSource,
  swTwoGenerationFixtureRunnerSource,
  swTwoGenerationArtifactIdentityModuleSource,
  swTwoGenerationFixtureCriticalSourceIdentityModuleSource,
  swTwoGenerationFixtureCriticalSourceIdentity
);
verifyReleaseBrowserGovernance(decisions, packageJson, RELEASE_BROWSER_MATRIX, undefined, webPackageJson);
verifyCrossSchemaV13V16CompletionGovernance();
const requiredReceiptCommands = decisions.releaseEvidence?.defaultV13RequiredReceiptCommands;
if (!requiredReceiptCommands || typeof requiredReceiptCommands !== "object" || Array.isArray(requiredReceiptCommands)) {
  throw new Error("Default v13 release evidence receipt policy is missing.");
}
verifyDefaultV13ReceiptCommandAllowlist(requiredReceiptCommands);
const storageV13MatrixGovernance = verifyStorageV13MatrixCandidateGovernance({
  historicalPolicyV1: storageV13MatrixHistoricalPolicyV1,
  historicalReceiptSchemaV1: storageV13MatrixHistoricalReceiptSchemaV1,
  historicalPolicyV1Source: storageV13MatrixHistoricalPolicyV1Source,
  historicalReceiptSchemaV1Source: storageV13MatrixHistoricalReceiptSchemaV1Source,
  policy: storageV13MatrixPolicy,
  receiptSchema: storageV13MatrixReceiptSchema,
  packageJson,
  rootTsconfig,
  candidateTsconfig: storageV13MatrixTsconfig,
  candidateConfigSource: storageV13MatrixConfigSource,
  candidateRunnerSource: storageV13MatrixRunnerSource,
  candidateGlobalSetupSource: storageV13MatrixGlobalSetupSource,
  candidateReporterSource: storageV13MatrixReporterSource,
  candidateSpecSource: storageV13MatrixSpecSource,
  candidateNativeReadonlySource: storageV13MatrixNativeReadonlySource,
  candidateRuntimeSource: storageV13MatrixRuntimeSource,
  candidateVerifierSource: storageV13MatrixVerifierSource
});
verifyStorageV13CrossConnectionCasTestGovernance(storageV13CrossConnectionCasTestSource);
const fullBackupMandatoryCasGovernance =
  verifyFullBackupMandatoryCasBoundaryGovernance({
    backupSource: fullBackupSource,
    storageSource: storageRepositorySource,
    workerClientSource: fullBackupWorkerClientSource,
    crossConnectionTestSource: storageV13CrossConnectionCasTestSource,
    workerClientTestSource: fullBackupWorkerClientTestSource
  });
const swAbUpdateCandidateGovernance = verifySwAbUpdateCandidateGovernance({
  policy: swAbUpdateCandidatePolicy,
  evidenceSchema: swAbUpdateCandidateSchemaValidator.schema,
  packageJson,
  libSource: swAbUpdateCandidateLibSource,
  schemaLoaderSource: swAbUpdateCandidateSchemaLoaderSource,
  verifierSource: swAbUpdateCandidateVerifierSource
});
const swAbUpdateRuntimeClientCaptureGovernance =
  verifySwAbUpdateRuntimeClientCaptureGovernance({
    policy: swAbUpdateRuntimeClientCapturePolicy,
    evidenceSchema: swAbUpdateRuntimeClientCaptureSchemaValidator.schema,
    packageJson,
    libSource: swAbUpdateRuntimeClientCaptureLibSource,
    loaderSource: swAbUpdateRuntimeClientCaptureLoaderSource,
    schemaLoaderSource: swAbUpdateRuntimeClientCaptureSchemaLoaderSource,
    probeSource: swAbUpdateRuntimeClientCaptureProbeSource,
    verifierSource: swAbUpdateRuntimeClientCaptureVerifierSource,
    serviceWorkerSource
  });
const swAbUpdateRuntimeApiTranscriptGovernance =
  verifySwAbUpdateRuntimeApiTranscriptGovernance({
    policy: swAbUpdateRuntimeApiTranscriptPolicy,
    evidenceSchema: swAbUpdateRuntimeApiTranscriptSchemaValidator.schema,
    packageJson,
    libSource: swAbUpdateRuntimeApiTranscriptLibSource,
    schemaSource: swAbUpdateRuntimeApiTranscriptSchemaSource,
    writerSource: swAbUpdateRuntimeApiTranscriptWriterSource,
    loaderSource: swAbUpdateRuntimeApiTranscriptLoaderSource,
    fixtureSource: swAbUpdateRuntimeApiTranscriptFixtureSource,
    testSource: swAbUpdateRuntimeApiTranscriptTestSource,
    verifierSource: swAbUpdateRuntimeApiTranscriptVerifierSource,
    formalConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ]
  });
const swAbUpdateRuntimeCollectorIssuanceGovernance =
  verifySwAbUpdateRuntimeCollectorIssuanceGovernance({
    policy: swAbUpdateRuntimeCollectorIssuancePolicy,
    evidenceSchema: swAbUpdateRuntimeCollectorIssuanceSchemaValidator.schema,
    packageJson,
    libSource: swAbUpdateRuntimeCollectorIssuanceLibSource,
    schemaSource: swAbUpdateRuntimeCollectorIssuanceSchemaSource,
    writerSource: swAbUpdateRuntimeCollectorIssuanceWriterSource,
    liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource,
    loaderSource: swAbUpdateRuntimeCollectorIssuanceLoaderSource,
    fixtureSource: swAbUpdateRuntimeCollectorIssuanceFixtureSource,
    testSource: swAbUpdateRuntimeCollectorIssuanceTestSource,
    liveAdapterTestSource: swAbUpdateRuntimeCollectorLiveAdapterTestSource,
    verifierSource: swAbUpdateRuntimeCollectorIssuanceVerifierSource,
    migrationWorkflow,
    formalConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ]
  });
const swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance =
  verifySwAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
    policy: swAbUpdateCandidateRuntimeClientCaptureCompositionPolicy,
    evidenceSchema:
      swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaValidator.schema,
    packageJson,
    libSource: swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
    schemaLoaderSource:
      swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaLoaderSource,
    verifierSource:
      swAbUpdateCandidateRuntimeClientCaptureCompositionVerifierSource
  });
const swAbUpdateFourChainCompositionGovernance =
  verifySwAbUpdateFourChainCompositionGovernance({
    policy: swAbUpdateFourChainCompositionPolicy,
    policySource: swAbUpdateFourChainCompositionPolicySource,
    evidenceSchema: swAbUpdateFourChainCompositionSchemaValidator.schema,
    schemaSource: swAbUpdateFourChainCompositionSchemaSource,
    checkedSourceDocuments: swAbUpdateFourChainCompositionCheckedSourceDocuments,
    packageJson,
    libSource: swAbUpdateFourChainCompositionLibSource,
    schemaLoaderSource: swAbUpdateFourChainCompositionSchemaLoaderSource,
    testSource: swAbUpdateFourChainCompositionTestSource,
    verifierSource: swAbUpdateFourChainCompositionVerifierSource,
    migrationWorkflow,
    formalConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ]
  });
const swAbRuntimeDerivedEvidenceProducerBridgeGovernance =
  verifySwAbRuntimeDerivedEvidenceProducerBridgeGovernance({
    policy: swAbRuntimeDerivedEvidenceProducerBridgePolicy,
    policySource: swAbRuntimeDerivedEvidenceProducerBridgePolicySource,
    evidenceSchema: swAbRuntimeDerivedEvidenceProducerBridgeSchemaValidator.schema,
    schemaSource: swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource,
    checkedSourceDocuments:
      swAbRuntimeDerivedEvidenceProducerBridgeCheckedSourceDocuments,
    packageJson,
    libSource: swAbRuntimeDerivedEvidenceProducerBridgeLibSource,
    schemaLoaderSource: swAbRuntimeDerivedEvidenceProducerBridgeSchemaLoaderSource,
    writerSource: swAbRuntimeDerivedEvidenceProducerBridgeWriterSource,
    loaderSource: swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource,
    fixtureSource: swAbRuntimeDerivedEvidenceProducerBridgeFixtureSource,
    testSource: swAbRuntimeDerivedEvidenceProducerBridgeTestSource,
    verifierSource: swAbRuntimeDerivedEvidenceProducerBridgeVerifierSource,
    ciWorkflowSources: [migrationWorkflow, quickWorkflow, nightlyWorkflow, releaseWorkflow],
    forbiddenConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      swAbUpdateFourChainCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ]
  });
const swAbProducerBridgeCompositionGovernance =
  verifySwAbProducerBridgeCompositionGovernance({
    policy: swAbProducerBridgeCompositionPolicy,
    policySource: swAbProducerBridgeCompositionPolicySource,
    evidenceSchema: swAbProducerBridgeCompositionSchemaValidator.schema,
    schemaSource: swAbProducerBridgeCompositionSchemaSource,
    checkedSourceDocuments: swAbProducerBridgeCompositionCheckedSourceDocuments,
    packageJson,
    libSource: swAbProducerBridgeCompositionLibSource,
    schemaLoaderSource: swAbProducerBridgeCompositionSchemaLoaderSource,
    fixtureSource: swAbProducerBridgeCompositionFixtureSource,
    testSource: swAbProducerBridgeCompositionTestSource,
    verifierSource: swAbProducerBridgeCompositionVerifierSource,
    ciWorkflowSources: [migrationWorkflow, quickWorkflow, nightlyWorkflow, releaseWorkflow],
    forbiddenConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      swAbUpdateFourChainCompositionLibSource,
      swAbRuntimeDerivedEvidenceProducerBridgeLibSource,
      deployedPwaHostProviderCompositionSource
    ]
  });
const candidateReceiptTerminalGateGovernance =
  verifyCandidateReceiptTerminalGateGovernance({
    hostRuntimeSource: deployedHostCandidateRuntimeSource,
    hostLoaderSource: deployedHostCandidateLoaderSource,
    providerRuntimeSource: providerDeploymentCandidateRuntimeSource,
    providerRuntimeTestSource: providerDeploymentCandidateRuntimeTestSource,
    providerLoaderSource: providerDeploymentCandidateLoaderSource,
    compositionSource: deployedPwaHostProviderCompositionSource,
    providerSequenceSchema: providerDeploymentCandidateSequenceSchema,
    providerSequenceLoaderSource: providerDeploymentCandidateSequenceLoaderSource,
    providerSequenceVerifierSource: providerDeploymentCandidateSequenceVerifierSource,
    providerSequenceWriterSource: providerDeploymentCandidateSequenceWriterSource
  });
const rollbackProviderSequenceCompositionGovernance =
  verifyRollbackProviderSequenceCompositionGovernance({
    policy: rollbackProviderSequenceCompositionPolicy,
    evidenceSchema: rollbackProviderSequenceCompositionSchemaValidator.schema,
    packageJson,
    libSource: rollbackProviderSequenceCompositionLibSource,
    schemaLoaderSource: rollbackProviderSequenceCompositionSchemaLoaderSource,
    verifierSource: rollbackProviderSequenceCompositionVerifierSource,
    providerCandidateLoaderSource: providerDeploymentCandidateLoaderSource,
    providerSequenceLoaderSource: providerDeploymentCandidateSequenceLoaderSource,
    providerSequenceVerifierSource: providerDeploymentCandidateSequenceVerifierSource,
    rollbackLibSource: rollbackEvidenceLibSource,
    rollbackVerifierSource: rollbackEvidenceVerifierSource
  });
const formalNpmEmbeddedCommands = [
  backupArtifactConfig.webServer?.command,
  bootArtifactConfig.webServer?.command,
  pwaCrossBrowserConfig.webServer?.command,
  webV1CrossBrowserConfig.webServer?.command
];
const formalNpmClosure = verifyFormalReceiptNpmLifecycleClosure(requiredReceiptCommands, {
  root: { path: "package.json", packageJson },
  web: { path: "apps/web/package.json", packageJson: webPackageJson },
  embeddedCommands: formalNpmEmbeddedCommands
});
verifyReleaseBrowserInstallPrerequisite(releaseWorkflow, "Release workflow");
verifyReleaseBrowserInstallPrerequisite(releaseRunbook, "Release runbook");
verifyReleaseReceiptMirror(requiredReceiptCommands, releaseWorkflow, "Release workflow");
verifyReleaseReceiptMirror(requiredReceiptCommands, releaseRunbook, "Release runbook");
verifyReleaseFailureDiagnosticsUpload(releaseWorkflow, "Release workflow");
verifyReleaseArtifactIdentityChain(releaseWorkflow, "Release workflow");
verifyReleaseArtifactIdentityChain(releaseRunbook, "Release runbook");
verifyFormalReleaseVerificationReceipt(releaseWorkflow, "Release workflow");
verifyFormalReleaseVerificationReceipt(releaseRunbook, "Release runbook");
const ziweiHkoRestrictedSourcePreReleaseGovernance =
  verifyZiweiHkoRestrictedSourcePreReleasePolicy({
    policy: ziweiHkoRestrictedSourcePreReleasePolicy,
    packageJson,
    quickWorkflow,
    implementationArtifacts: ziweiHkoRestrictedSourceImplementationArtifacts,
    defaultV13RequiredReceiptCommands:
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
    webPackageJson,
    formalNpmEmbeddedCommands,
    parentIsolationArtifacts: ziweiHkoParentIsolationArtifacts
  });
verifyQuickCiGovernance(quickWorkflow, packageJson);
verifyKnownRestrictedBlockerRegistry(restrictedBlockers);
if (releaseWorkflow.includes("--allow-dirty") || releaseWorkflow.includes("--allow-unbound")) {
  throw new Error("Formal Release workflow weakens source or artifact binding.");
}
verifyMigrationWorkflowGovernance(migrationWorkflow);

const allowedSources = history.allowedMigrationSources;
if (!Array.isArray(allowedSources) || allowedSources.length !== 1) throw new Error("Release history must admit exactly one fail-closed source by default.");
if (allowedSources[0].dbGeneration !== "legacy-v13" || allowedSources[0].targetSchema !== 13) {
  throw new Error("The only default migration source must be legacy-v13 Schema 13.");
}
const defaultGenerations = history.generations.filter((entry) => entry.defaultBuild === true);
if (defaultGenerations.length !== 1 || defaultGenerations[0].dbGeneration !== "legacy-v13") {
  throw new Error("Release history has an unauthorized default generation.");
}
if (history.generations.some((entry) => [14, 15, 16].includes(entry.targetSchema) && entry.defaultBuild === true)) {
  throw new Error("A candidate Schema was promoted by governance data.");
}

if (!license.includes("All rights reserved") || !license.includes("No license is granted")) {
  throw new Error("The conservative rights-reserved notice is incomplete.");
}
const cspGovernance = verifyHostingCspGovernance(security);
verifyHostingHeadersSource(security, headersFile);

for (const filePath of REQUIRED_RELEASE_FILES) {
  await readFile(path.resolve(cwd, filePath), "utf8");
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  process.stdout.write(`${JSON.stringify({
    defaultRelease: decisions.defaultRelease,
    admittedMigrationSources: allowedSources.length,
    quickCiEvidenceJobs: REQUIRED_QUICK_CI_JOBS.length - 1,
    knownRestrictedBlockers: restrictedBlockers.blockers.filter((blocker) => blocker.restrictedPaths.length > 0).length,
    releaseEvidenceSchemaValidated: releaseEvidenceSchemaValidator.schema.$id,
    rollbackEvidenceSchemaValidated: rollbackEvidenceSchemaValidator.schema.$id,
    deployedPwaEvidenceSchemaValidated: deployedPwaEvidenceSchemaValidator.schema.$id,
    deployedPwaEvidenceV2SchemaValidated: deployedPwaEvidenceV2SchemaValidator.schema.$id,
    deployedPwaEvidenceV3SchemaValidated: deployedPwaEvidenceV3SchemaValidator.schema.$id,
    rollbackEvidenceStatus: rollbackPolicy.status,
    rollbackPhaseReceiptContractStatus: rollbackPhaseContractGovernance.status,
    rollbackPhaseReceiptContractFormalAdmissionBeforeDownstream:
      rollbackPhaseContractGovernance.formalAdmissionBeforeDownstream,
    rollbackPhaseReceiptContractAuthorityFreeProjection:
      rollbackPhaseContractGovernance.authorityFreeProjection,
    deployedPwaEvidenceStatus: deployedPwaGovernance.status,
    deployedPwaExecutionAdmission: deployedPwaGovernance.executionAdmission,
    deployedPwaV2Status: deployedPwaV2Governance.status,
    deployedPwaV2ReceiptTrustClass: deployedPwaV2Governance.receiptTrustClass,
    deployedPwaV3Status: deployedPwaV3Governance.status,
    deployedPwaV3ReceiptTrustClass: deployedPwaV3Governance.receiptTrustClass,
    deployedPwaV3ManifestSemanticGate: deployedPwaV3SchemaGovernance.manifestSemanticGate,
    deployedPwaV3AttachmentRoles: deployedPwaV3SchemaGovernance.attachmentRoles,
    deployedPwaV3AuthorizationBoundary: deployedPwaV3Governance.authorizationBoundary,
    swTwoGenerationFixtureStatus: swTwoGenerationFixtureGovernance.status,
    swTwoGenerationCriticalSourceSetCanonicalSha256:
      swTwoGenerationFixtureGovernance.criticalSourceSetCanonicalSha256,
    trustedRollbackActors: rollbackActorRegistry.actors.length,
    cspMode: security.cspEnforcementStatus,
    cspHeaderName: cspGovernance.headerName,
    hostingPlatform: hostingGovernance.platform,
    auditedHostingPlatformProfile: hostingGovernance.auditedPlatformProfile,
    hostingSecurityHeadersVerified: hostingGovernance.securityHeadersVerified,
    formalNpmLifecycleScriptsVisited: formalNpmClosure.visitedScripts.length,
    formalNpmLifecycleClosureCanonicalSha256: formalNpmClosure.closureCanonicalSha256,
    ziweiHkoRestrictedSourcePreReleasePolicyId:
      ziweiHkoRestrictedSourcePreReleaseGovernance.policyId,
    ziweiHkoRestrictedSourcePreReleasePolicyStatus:
      ziweiHkoRestrictedSourcePreReleaseGovernance.status,
    ziweiHkoStaticMandatoryLiveCheckPolicyBound:
      ziweiHkoRestrictedSourcePreReleaseGovernance.staticMandatoryLiveCheckPolicyBound,
    ziweiHkoModeledStaticNpmLifecycleIsolationBound:
      ziweiHkoRestrictedSourcePreReleaseGovernance.modeledStaticNpmLifecycleIsolationBound,
    ziweiHkoEffectiveNpmRuntimeClosureEstablished:
      ziweiHkoRestrictedSourcePreReleaseGovernance.effectiveNpmRuntimeClosureEstablished,
    ziweiHkoAmbientNpmConfigNeutralized:
      ziweiHkoRestrictedSourcePreReleaseGovernance.ambientNpmConfigNeutralized,
    ziweiHkoPreLifecycleCannotBeSkippedEstablished:
      ziweiHkoRestrictedSourcePreReleaseGovernance.preLifecycleCannotBeSkippedEstablished,
    ziweiHkoTransitiveModuleConfigOrWrapperExecutionAbsenceEstablished:
      ziweiHkoRestrictedSourcePreReleaseGovernance
        .transitiveModuleConfigOrWrapperExecutionAbsenceEstablished,
    ziweiHkoLiveExecutionPerformedByGovernance:
      ziweiHkoRestrictedSourcePreReleaseGovernance.liveExecutionPerformedByGovernance,
    ziweiHkoPointInTimePassPersisted:
      ziweiHkoRestrictedSourcePreReleaseGovernance.pointInTimePassPersisted,
    ziweiHkoOutputAbsenceEstablishedByGovernance:
      ziweiHkoRestrictedSourcePreReleaseGovernance.outputAbsenceEstablishedByGovernance,
    ziweiHkoFormalReleaseEvidenceReceipt:
      ziweiHkoRestrictedSourcePreReleaseGovernance.formalReleaseEvidenceReceipt,
    ziweiHkoRightsLegalConclusionEstablished:
      ziweiHkoRestrictedSourcePreReleaseGovernance.rightsLegalConclusionEstablished,
    ziweiHkoReleaseReady:
      ziweiHkoRestrictedSourcePreReleaseGovernance.releaseReady,
    ziweiHkoPublicBuildInclusionAuthorized:
      ziweiHkoRestrictedSourcePreReleaseGovernance.publicBuildInclusionAuthorized,
    ziweiHkoPublicDeploymentAuthorized:
      ziweiHkoRestrictedSourcePreReleaseGovernance.publicDeploymentAuthorized,
    ziweiHkoPublicReleaseAuthorized:
      ziweiHkoRestrictedSourcePreReleaseGovernance.publicReleaseAuthorized,
    storageV13MatrixCandidateStatus: storageV13MatrixGovernance.status,
    fullBackupMandatoryCasDigestAtBackupBoundary:
      fullBackupMandatoryCasGovernance.mandatoryCasDigestAtBackupBoundary,
    fullBackupExplicitUndefinedRejectedByStorage:
      fullBackupMandatoryCasGovernance.explicitUndefinedRejectedByStorage,
    fullBackupWorkerVerifiedReadyValidated:
      fullBackupMandatoryCasGovernance.workerVerifiedReadyValidated,
    swAbUpdateCandidateStatus: swAbUpdateCandidateGovernance.status,
    swAbUpdateCandidateExecutionAdmission:
      swAbUpdateCandidateGovernance.executionAdmission,
    swAbUpdateRuntimeClientCaptureStatus:
      swAbUpdateRuntimeClientCaptureGovernance.status,
    swAbUpdateRuntimeClientCaptureExecutionAdmission:
      swAbUpdateRuntimeClientCaptureGovernance.executionAdmission,
    swAbUpdateRuntimeClientCaptureUsableForCandidateAssembly:
      swAbUpdateRuntimeClientCaptureGovernance.usableForCandidateAssembly,
    swAbUpdateRuntimeApiTranscriptStatus:
      swAbUpdateRuntimeApiTranscriptGovernance.status,
    swAbUpdateRuntimeApiTranscriptTrustClass:
      swAbUpdateRuntimeApiTranscriptGovernance.trustClass,
    swAbUpdateRuntimeApiTranscriptCdpWireBytesCaptured:
      swAbUpdateRuntimeApiTranscriptGovernance.cdpWireBytesCaptured,
    swAbUpdateRuntimeApiTranscriptUsableForRuntimeEvidence:
      swAbUpdateRuntimeApiTranscriptGovernance.usableForRuntimeEvidence,
    swAbUpdateRuntimeCollectorIssuanceStatus:
      swAbUpdateRuntimeCollectorIssuanceGovernance.status,
    swAbUpdateRuntimeCollectorIssuanceTrustClass:
      swAbUpdateRuntimeCollectorIssuanceGovernance.trustClass,
    swAbUpdateRuntimeCollectorIssuanceLogicalRecords:
      swAbUpdateRuntimeCollectorIssuanceGovernance.logicalIssuanceRecords,
    swAbUpdateRuntimeCollectorIssuancePhysicalJsonFiles:
      swAbUpdateRuntimeCollectorIssuanceGovernance.physicalJsonFiles,
    swAbUpdateRuntimeCollectorIssuanceLivePageAdapterSourceBound:
      swAbUpdateRuntimeCollectorIssuanceGovernance.livePageAdapterSourceBound,
    swAbUpdateRuntimeCollectorIssuanceCallerDecodedObservationProductionEntryAbsent:
      swAbUpdateRuntimeCollectorIssuanceGovernance
        .callerDecodedObservationProductionEntryAbsent,
    swAbUpdateRuntimeCollectorIssuanceReplayResistanceVerified:
      swAbUpdateRuntimeCollectorIssuanceGovernance.bundleReplayResistanceVerified,
    swAbUpdateRuntimeCollectorIssuanceUsableForRuntimeEvidence:
      swAbUpdateRuntimeCollectorIssuanceGovernance.usableForRuntimeEvidence,
    swAbUpdateCandidateRuntimeClientCaptureCompositionStatus:
      swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance.status,
    swAbUpdateCandidateRuntimeClientCaptureCompositionUsableForCandidateAssembly:
      swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance
        .usableForCandidateAssembly,
    swAbUpdateFourChainCompositionStatus:
      swAbUpdateFourChainCompositionGovernance.status,
    swAbUpdateFourChainCompositionProducerBridgeStatus:
      swAbUpdateFourChainCompositionGovernance.producerBridgeStatus,
    swAbUpdateFourChainCompositionCheckedSources:
      swAbUpdateFourChainCompositionGovernance.checkedSourceBindings,
    swAbUpdateFourChainCompositionUsableForRuntimeEvidence:
      swAbUpdateFourChainCompositionGovernance.usableForRuntimeEvidence,
    swAbRuntimeDerivedEvidenceProducerBridgeStatus:
      swAbRuntimeDerivedEvidenceProducerBridgeGovernance.status,
    swAbRuntimeDerivedEvidenceProducerBridgeTrustClass:
      swAbRuntimeDerivedEvidenceProducerBridgeGovernance.trustClass,
    swAbRuntimeDerivedEvidenceProducerBridgeCheckedSources:
      swAbRuntimeDerivedEvidenceProducerBridgeGovernance.checkedSourceBindings,
    swAbRuntimeDerivedEvidenceProducerBridgeUsableForRuntimeEvidence:
      swAbRuntimeDerivedEvidenceProducerBridgeGovernance.usableForRuntimeEvidence,
    swAbProducerBridgeCompositionStatus:
      swAbProducerBridgeCompositionGovernance.status,
    swAbProducerBridgeCompositionProducerBridgeStatus:
      swAbProducerBridgeCompositionGovernance.producerBridgeStatus,
    swAbProducerBridgeCompositionRunAttemptCoordinationStatus:
      swAbProducerBridgeCompositionGovernance.runAttemptCoordinationStatus,
    swAbProducerBridgeCompositionCheckedSources:
      swAbProducerBridgeCompositionGovernance.checkedSourceBindings,
    swAbProducerBridgeCompositionUsableForRuntimeEvidence:
      swAbProducerBridgeCompositionGovernance.usableForRuntimeEvidence,
    candidateReceiptTerminalGateMarkerBytes:
      candidateReceiptTerminalGateGovernance.markerBytes,
    candidateReceiptTerminalGateDownstreamIdentityBound:
      candidateReceiptTerminalGateGovernance.downstreamMarkerIdentityBound,
    candidateReceiptTerminalGateSequenceSchemaFrozen:
      candidateReceiptTerminalGateGovernance.providerSequenceSchemaTerminalCommitmentFrozen,
    candidateReceiptTerminalGateSequenceCliLedgerSeparated:
      candidateReceiptTerminalGateGovernance.sequenceCliPublicationPresentationLedgerSeparated,
    candidateReceiptTerminalGateProductionProviderSequenceIntegrationBound:
      candidateReceiptTerminalGateGovernance.productionProviderSequenceIntegrationBound,
    candidateReceiptTerminalGateAuthorityPromoted:
      candidateReceiptTerminalGateGovernance.authorityPromoted,
    rollbackProviderSequenceCompositionStatus:
      rollbackProviderSequenceCompositionGovernance.status,
    rollbackProviderSequenceCompositionAdmissionStatus:
      rollbackProviderSequenceCompositionGovernance.admissionStatus,
    rollbackProviderSequenceCompositionUsableForAdmission:
      rollbackProviderSequenceCompositionGovernance.usableForAdmission,
    licensePolicy: decisions.licensing.status,
    publicDeploymentAuthorized: hostingGovernance.publicDeploymentAuthorized,
    expertClaimsAuthorized: false
  }, null, 2)}\n`);
}
