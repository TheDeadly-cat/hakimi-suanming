import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import backupArtifactConfig from "../apps/web/playwright.release-backup-artifact.config.ts";
import bootArtifactConfig from "../apps/web/playwright.release-boot-artifact.config.ts";
import pwaCrossBrowserConfig from "../apps/web/playwright.release-pwa-artifact.config.ts";
import crossSchemaV13V16Config from "../apps/web/playwright.cross-schema-v13-v16.config.ts";
import { RELEASE_BROWSER_MATRIX } from "../apps/web/playwright.release-browser-matrix.ts";
import {
  isReleaseBrowserCompletionReceiptId,
  isReleaseBrowserReceiptId,
  REQUIRED_RELEASE_BROWSER_RECEIPT_IDS
} from "../apps/web/playwright.release-browser-result.ts";
import { RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS } from "./release-artifact-identity-lib.mjs";
import swTwoGenerationFixtureConfig from "../apps/web/playwright.sw-upgrade.config.ts";
import webV1CrossBrowserConfig from "../apps/web/playwright.release-web-v1-artifact.config.ts";
import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT
} from "./formal-npm-lifecycle-closure-lib.mjs";
import {
  AUDITED_HOSTING_PLATFORM_IDS,
  REQUIRED_DEPLOYED_PWA_CLAIM_NAMES,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_SCRIPTS,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_AUTHORIZATION_BOUNDARY,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE,
  REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS,
  REQUIRED_DEPLOYED_PWA_GATE_NAMES,
  REQUIRED_MIGRATION_WORKFLOW_COMMANDS,
  REQUIRED_MIGRATION_WORKFLOW_PATHS,
  REQUIRED_QUICK_CI_COMMANDS,
  REQUIRED_QUICK_CI_INDEPENDENT_JOBS,
  REQUIRED_QUICK_CI_JOBS,
  REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS,
  REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND,
  REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256,
  REQUIRED_RELEASE_BROWSER_IDS,
  REQUIRED_RELEASE_BROWSER_MATRIX,
  REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS,
  REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER,
  REQUIRED_RELEASE_BROWSER_SCRIPTS,
  REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND,
  REQUIRED_RELEASE_ARTIFACT_PREVIEW_SCRIPT,
  REQUIRED_RELEASE_FILES,
  REQUIRED_ROLLBACK_EVIDENCE_SCRIPTS,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_LIB_SOURCE_SHA256,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_CANONICAL_SHA256,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_CANONICAL_SHA256,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCRIPTS,
  REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_IDENTITY_MODULE_SHA256,
  REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256,
  REQUIRED_SW_TWO_GENERATION_FIXTURE_SCRIPTS,
  REQUIRED_STORAGE_V13_MATRIX_CANDIDATE_SCRIPTS,
  REQUIRED_STORAGE_V13_MATRIX_GLOBAL_SETUP_SOURCE_SHA256,
  REQUIRED_STORAGE_V13_MATRIX_RUNNER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_SCRIPTS,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROBE_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCRIPTS,
  REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCRIPTS,
  REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCRIPTS,
  REQUIRED_SW_AB_RUNTIME_CHALLENGE_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_SERVICE_WORKER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCRIPTS,
  REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_RAW_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_RAW_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCRIPTS,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_TEST_SOURCE_SHA256,
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_FIXTURE_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_RAW_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_RAW_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TEST_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_VERIFIER_SOURCE_SHA256,
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_WRITER_SOURCE_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_FIXTURE_SOURCE_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_LIB_SOURCE_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_CANONICAL_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_RAW_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_CANONICAL_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_RAW_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_TEST_SOURCE_SHA256,
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_VERIFIER_SOURCE_SHA256,
  verifyMigrationWorkflowGovernance,
  verifyKnownRestrictedBlockerRegistry,
  verifyHostingCspGovernance,
  verifyHostingDecisionPolicyGovernance,
  verifyHostingHeadersSource,
  verifyDeployedPwaEvidenceGovernance,
  verifyDeployedPwaEvidenceSchemaGovernance,
  verifyDeployedPwaEvidenceV2Governance,
  verifyDeployedPwaEvidenceV2SchemaGovernance,
  verifyDeployedPwaEvidenceV3Governance,
  verifyDeployedPwaEvidenceV3SchemaGovernance,
  verifyDeployedPwaV3TestFixtureExtractionGovernance,
  verifyQuickCiGovernance,
  verifyReleaseFailureDiagnosticsUpload,
  verifyReleaseArtifactIdentityChain,
  verifyFormalReleaseVerificationReceipt,
  verifyRollbackEvidenceGovernance,
  verifyRollbackPhaseContractSourceGovernance,
  verifyCandidateReceiptTerminalGateGovernance,
  verifyRollbackProviderSequenceCompositionGovernance,
  verifyReleaseBrowserInstallPrerequisite,
  verifyReleaseBrowserGovernance,
  verifyCrossSchemaV13V16CompletionGovernance,
  verifyReleaseBrowserPlaywrightConfig,
  verifyReleaseReceiptMirror,
  verifySwTwoGenerationFixtureGovernance,
  verifyDefaultV13ReceiptCommandAllowlist,
  verifyFormalReceiptNpmLifecycleClosure,
  verifyFullBackupMandatoryCasBoundaryGovernance,
  verifyStorageV13CrossConnectionCasTestGovernance,
  verifyStorageV13MatrixCandidateGovernance,
  verifySwAbUpdateCandidateGovernance,
  verifySwAbUpdateRuntimeClientCaptureGovernance,
  verifySwAbUpdateRuntimeApiTranscriptGovernance,
  verifySwAbUpdateRuntimeCollectorIssuanceGovernance,
  verifySwAbUpdateCandidateRuntimeClientCaptureCompositionGovernance,
  verifySwAbUpdateFourChainCompositionGovernance,
  verifySwAbRuntimeDerivedEvidenceProducerBridgeGovernance,
  verifySwAbProducerBridgeCompositionGovernance,
  verifyZiweiHkoRestrictedSourcePreReleasePolicy
} from "./verify-release-governance.mjs";
import {
  loadSwTwoGenerationFixtureCriticalSourceIdentity
} from "../apps/web/sw-two-generation-fixture-source-identity.ts";
import {
  buildZiweiHkoRestrictedSourcePreReleasePolicy,
  computeZiweiHkoRestrictedSourcePreReleasePolicyDigest,
  parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes,
  ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS,
  ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS,
  ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH
} from "./ziwei-hko-restricted-source-pre-release-policy-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/migration-ci.yml"),
  "utf8"
);
const decisions = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-decisions.json"),
  "utf8"
));
const packageJson = JSON.parse(await readFile(path.join(workspaceRoot, "package.json"), "utf8"));
const webPackageJson = JSON.parse(await readFile(path.join(workspaceRoot, "apps/web/package.json"), "utf8"));
const releaseWorkflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/release-evidence.yml"),
  "utf8"
);
const quickWorkflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/quick-ci.yml"),
  "utf8"
);
const ziweiHkoRestrictedSourcePreReleasePolicyBytes = await readFile(
  path.join(workspaceRoot, ...ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH.split("/"))
);
const ziweiHkoRestrictedSourcePreReleasePolicy =
  parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes(
    ziweiHkoRestrictedSourcePreReleasePolicyBytes,
    ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH
  );
const ziweiHkoRestrictedSourceImplementationArtifacts = Object.fromEntries(
  await Promise.all(ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS.map(async (spec) => [
    spec.path,
    await readFile(path.join(workspaceRoot, ...spec.path.split("/")))
  ]))
);
const ziweiHkoParentIsolationArtifacts = Object.fromEntries(
  await Promise.all(ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS.map(async (artifactPath) => [
    artifactPath,
    await readFile(path.join(workspaceRoot, ...artifactPath.split("/")))
  ]))
);
const nightlyWorkflow = await readFile(
  path.join(workspaceRoot, ".github/workflows/nightly-heavy.yml"),
  "utf8"
);
const restrictedBlockers = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/known-restricted-blockers.v1.json"),
  "utf8"
));
const rollbackPolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/rollback-evidence-policy.v1.json"),
  "utf8"
));
const deployedPwaPolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence-policy.v1.json"),
  "utf8"
));
const deployedPwaSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence.schema.json"),
  "utf8"
));
const deployedPwaV2Policy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence-policy.v2.json"),
  "utf8"
));
const deployedPwaV2Schema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence-v2.schema.json"),
  "utf8"
));
const deployedPwaV3Policy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence-policy.v3.json"),
  "utf8"
));
const deployedPwaV3Schema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/deployed-pwa-evidence-v3.schema.json"),
  "utf8"
));
const deployedPwaV3TestSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-pwa-evidence-v3.test.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionFixtureSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-pwa-host-provider-composition.test-fixture.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionTestSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-pwa-host-provider-composition.test.mjs"),
  "utf8"
);
const rollbackActorRegistry = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/rollback-actor-trust-registry.v1.json"),
  "utf8"
));
const releaseRunbook = await readFile(
  path.join(workspaceRoot, "docs/release/web-v1-release-and-rollback-runbook.md"),
  "utf8"
);
const hostingPolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/security/hosting-security-policy.json"),
  "utf8"
));
const hostingHeaders = await readFile(
  path.join(workspaceRoot, "apps/web/public/_headers"),
  "utf8"
);
const swTwoGenerationFixtureSource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/service-worker-two-generation.spec.ts"),
  "utf8"
);
const swTwoGenerationFixtureReporterSource = await readFile(
  path.join(workspaceRoot, "apps/web/playwright.sw-two-generation-fixture-reporter.ts"),
  "utf8"
);
const swTwoGenerationFixtureRunnerSource = await readFile(
  path.join(workspaceRoot, "scripts/run-sw-two-generation-fixture.mjs"),
  "utf8"
);
const swTwoGenerationArtifactIdentityModuleSource = await readFile(
  path.join(workspaceRoot, "apps/web/sw-two-generation-artifact-identity.ts"),
  "utf8"
);
const swTwoGenerationFixtureCriticalSourceIdentityModuleSource = await readFile(
  path.join(workspaceRoot, "apps/web/sw-two-generation-fixture-source-identity.ts"),
  "utf8"
);
const swTwoGenerationFixtureCriticalSourceIdentity =
  loadSwTwoGenerationFixtureCriticalSourceIdentity(workspaceRoot);
const storageV13MatrixHistoricalPolicyV1Source = await readFile(
  path.join(workspaceRoot, "docs/release/storage-v13-matrix-candidate-policy.v1.json"),
  "utf8"
);
const storageV13MatrixHistoricalPolicyV1 = JSON.parse(
  storageV13MatrixHistoricalPolicyV1Source
);
const storageV13MatrixHistoricalReceiptSchemaV1Source = await readFile(
  path.join(workspaceRoot, "docs/release/storage-v13-matrix-browser-receipt-candidate-v1.schema.json"),
  "utf8"
);
const storageV13MatrixHistoricalReceiptSchemaV1 = JSON.parse(
  storageV13MatrixHistoricalReceiptSchemaV1Source
);
const storageV13MatrixPolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/storage-v13-matrix-candidate-policy.v2.json"),
  "utf8"
));
const storageV13MatrixReceiptSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json"),
  "utf8"
));
const rootTsconfig = JSON.parse(await readFile(path.join(workspaceRoot, "tsconfig.json"), "utf8"));
const storageV13MatrixTsconfig = JSON.parse(await readFile(
  path.join(workspaceRoot, "apps/web/tsconfig.storage-v13-matrix-candidate.json"),
  "utf8"
));
const storageV13MatrixConfigSource = await readFile(
  path.join(workspaceRoot, "apps/web/playwright.storage-v13-matrix-candidate.config.ts"),
  "utf8"
);
const storageV13MatrixGlobalSetupSource = await readFile(
  path.join(workspaceRoot, "apps/web/playwright.storage-v13-matrix-candidate-global-setup.ts"),
  "utf8"
);
const storageV13MatrixRunnerSource = await readFile(
  path.join(workspaceRoot, "scripts/run-storage-v13-matrix-candidate.mjs"),
  "utf8"
);
const storageV13MatrixReporterSource = await readFile(
  path.join(workspaceRoot, "apps/web/playwright.storage-v13-matrix-candidate-reporter.ts"),
  "utf8"
);
const storageV13MatrixSpecSource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/storage-v13-matrix-candidate.spec.ts"),
  "utf8"
);
const storageV13MatrixNativeReadonlySource = await readFile(
  path.join(workspaceRoot, "apps/web/e2e/storage-v13-native-readonly.ts"),
  "utf8"
);
const storageV13MatrixRuntimeSource = await readFile(
  path.join(workspaceRoot, "scripts/storage-v13-matrix-candidate-runtime.mjs"),
  "utf8"
);
const storageV13MatrixVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-storage-v13-matrix-candidate.mjs"),
  "utf8"
);
const storageV13CrossConnectionCasTestSource = await readFile(
  path.join(workspaceRoot, "packages/backup/src/full-backup-v13-cross-connection.test.ts"),
  "utf8"
);
const fullBackupSource = await readFile(
  path.join(workspaceRoot, "packages/backup/src/index.ts"),
  "utf8"
);
const storageRepositorySource = await readFile(
  path.join(workspaceRoot, "packages/storage/src/index.ts"),
  "utf8"
);
const fullBackupWorkerClientSource = await readFile(
  path.join(workspaceRoot, "apps/web/src/lib/full-backup-worker-client.ts"),
  "utf8"
);
const fullBackupWorkerClientTestSource = await readFile(
  path.join(workspaceRoot, "apps/web/src/lib/full-backup-worker-client.test.ts"),
  "utf8"
);
const swAbUpdateCandidatePolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/sw-ab-update-candidate-policy.v1.json"),
  "utf8"
));
const swAbUpdateCandidateSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/sw-ab-update-candidate-v1.schema.json"),
  "utf8"
));
const swAbUpdateCandidateLibSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-candidate-lib.mjs"),
  "utf8"
);
const swAbUpdateCandidateSchemaLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-candidate-schema.mjs"),
  "utf8"
);
const swAbUpdateCandidateTestSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-candidate.test.mjs"),
  "utf8"
);
const swAbUpdateCandidateVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-sw-ab-update-candidate.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCapturePolicy = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json"),
  "utf8"
));
const swAbUpdateRuntimeClientCaptureSchema = JSON.parse(await readFile(
  path.join(workspaceRoot, "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json"),
  "utf8"
));
const swAbUpdateRuntimeClientCaptureLibSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-client-capture-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-client-capture-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureSchemaLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-client-capture-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureProbeSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-client-capture-probe.mjs"),
  "utf8"
);
const swAbUpdateRuntimeClientCaptureVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-sw-ab-update-runtime-client-capture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptPolicy = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json"
  ),
  "utf8"
));
const swAbUpdateRuntimeApiTranscriptSchema = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json"
  ),
  "utf8"
));
const swAbUpdateRuntimeApiTranscriptLibSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptSchemaSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptWriterSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript-writer.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptFixtureSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript.test-fixture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptTestSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-api-transcript.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeApiTranscriptVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-sw-ab-update-runtime-api-transcript.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuancePolicy = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json"
  ),
  "utf8"
));
const swAbUpdateRuntimeCollectorIssuanceSchema = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json"
  ),
  "utf8"
));
const swAbUpdateRuntimeCollectorIssuanceLibSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance-lib.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceSchemaSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance-schema.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceWriterSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance-writer.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorLiveAdapterSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-live-adapter.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance-loader.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceFixtureSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance.test-fixture.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceTestSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-issuance.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorLiveAdapterTestSource = await readFile(
  path.join(workspaceRoot, "scripts/sw-ab-update-runtime-collector-live-adapter.test.mjs"),
  "utf8"
);
const swAbUpdateRuntimeCollectorIssuanceVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-sw-ab-update-runtime-collector-issuance.mjs"),
  "utf8"
);
const deployedPwaHostProviderCompositionSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-pwa-host-provider-composition.mjs"),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionPolicy = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json"
  ),
  "utf8"
));
const swAbUpdateCandidateRuntimeClientCaptureCompositionSchema = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json"
  ),
  "utf8"
));
const swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs"
  ),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaLoaderSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs"
  ),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionTestSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition.test.mjs"
  ),
  "utf8"
);
const swAbUpdateCandidateRuntimeClientCaptureCompositionVerifierSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionPolicySource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionPolicy = JSON.parse(
  swAbUpdateFourChainCompositionPolicySource
);
const swAbUpdateFourChainCompositionSchemaSource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionSchema = JSON.parse(
  swAbUpdateFourChainCompositionSchemaSource
);
const swAbUpdateFourChainCompositionLibSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionSchemaLoaderSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionTestSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionVerifierSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs"
  ),
  "utf8"
);
const swAbUpdateFourChainCompositionCheckedSourceDocuments = await Promise.all(
  REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES.map(
    async ({ role, path: sourcePath }) => Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.join(workspaceRoot, ...sourcePath.split("/")), "utf8")
    })
  )
);
const swAbRuntimeDerivedEvidenceProducerBridgePolicySource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgePolicy = JSON.parse(
  swAbRuntimeDerivedEvidenceProducerBridgePolicySource
);
const swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeSchema = JSON.parse(
  swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource
);
const swAbRuntimeDerivedEvidenceProducerBridgeCheckedSourceDocuments = await Promise.all(
  REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES.map(
    async ({ role, path: sourcePath }) => Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.join(workspaceRoot, ...sourcePath.split("/")), "utf8")
    })
  )
);
const swAbRuntimeDerivedEvidenceProducerBridgeLibSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeSchemaLoaderSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeWriterSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeFixtureSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test-fixture.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeTestSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs"
  ),
  "utf8"
);
const swAbRuntimeDerivedEvidenceProducerBridgeVerifierSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionPolicySource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionPolicy = JSON.parse(
  swAbProducerBridgeCompositionPolicySource
);
const swAbProducerBridgeCompositionSchemaSource = await readFile(
  path.join(
    workspaceRoot,
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionSchema = JSON.parse(
  swAbProducerBridgeCompositionSchemaSource
);
const swAbProducerBridgeCompositionCheckedSourceDocuments = await Promise.all(
  REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES.map(
    async ({ role, path: sourcePath }) => Object.freeze({
      role,
      path: sourcePath,
      source: await readFile(path.join(workspaceRoot, ...sourcePath.split("/")), "utf8")
    })
  )
);
const swAbProducerBridgeCompositionLibSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionSchemaLoaderSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionFixtureSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test-fixture.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionTestSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs"
  ),
  "utf8"
);
const swAbProducerBridgeCompositionVerifierSource = await readFile(
  path.join(
    workspaceRoot,
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs"
  ),
  "utf8"
);
const rollbackProviderSequenceCompositionPolicy = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/rollback-provider-sequence-composition-policy.v1.json"
  ),
  "utf8"
));
const rollbackProviderSequenceCompositionSchema = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/rollback-provider-sequence-composition-candidate-v1.schema.json"
  ),
  "utf8"
));
const rollbackProviderSequenceCompositionLibSource = await readFile(
  path.join(workspaceRoot, "scripts/rollback-provider-sequence-composition-lib.mjs"),
  "utf8"
);
const rollbackProviderSequenceCompositionSchemaLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/rollback-provider-sequence-composition-schema.mjs"),
  "utf8"
);
const rollbackProviderSequenceCompositionVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-rollback-provider-sequence-composition.mjs"),
  "utf8"
);
const deployedHostCandidateRuntimeSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-host-candidate-runtime.mjs"),
  "utf8"
);
const deployedHostCandidateLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/deployed-host-candidate-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateRuntimeSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-runtime.mjs"),
  "utf8"
);
const providerDeploymentCandidateRuntimeTestSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-runtime.test.mjs"),
  "utf8"
);
const providerDeploymentCandidateLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceSchema = JSON.parse(await readFile(
  path.join(
    workspaceRoot,
    "docs/release/provider-deployment-candidate-sequence-v1.schema.json"
  ),
  "utf8"
));
const providerDeploymentCandidateSequenceLoaderSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-sequence-loader.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-sequence-verifier.mjs"),
  "utf8"
);
const providerDeploymentCandidateSequenceWriterSource = await readFile(
  path.join(workspaceRoot, "scripts/provider-deployment-candidate-sequence-writer.mjs"),
  "utf8"
);
const rollbackEvidenceLibSource = await readFile(
  path.join(workspaceRoot, "scripts/rollback-evidence-lib.mjs"),
  "utf8"
);
const rollbackEvidenceVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-rollback-evidence.mjs"),
  "utf8"
);
const releaseEvidenceLibSource = await readFile(
  path.join(workspaceRoot, "scripts/release-evidence-lib.mjs"),
  "utf8"
);
const releaseEvidenceGeneratorSource = await readFile(
  path.join(workspaceRoot, "scripts/generate-release-evidence.mjs"),
  "utf8"
);
const releaseEvidenceVerifierSource = await readFile(
  path.join(workspaceRoot, "scripts/verify-release-evidence.mjs"),
  "utf8"
);
const serviceWorkerSource = await readFile(
  path.join(workspaceRoot, "apps/web/public/sw.js"),
  "utf8"
);

const currentFormalNpmEmbeddedCommands = Object.freeze([
  backupArtifactConfig.webServer.command,
  bootArtifactConfig.webServer.command,
  pwaCrossBrowserConfig.webServer.command,
  webV1CrossBrowserConfig.webServer.command
]);

function formalNpmClosure(
  rootPackage = packageJson,
  webPackage = webPackageJson,
  embeddedCommands = currentFormalNpmEmbeddedCommands
) {
  return verifyFormalReceiptNpmLifecycleClosure(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
    {
      root: { path: "package.json", packageJson: rootPackage },
      web: { path: "apps/web/package.json", packageJson: webPackage },
      embeddedCommands
    }
  );
}

const currentFormalNpmClosure = formalNpmClosure();

function storageCandidateGovernance(overrides = {}) {
  return verifyStorageV13MatrixCandidateGovernance({
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
    candidateVerifierSource: storageV13MatrixVerifierSource,
    ...overrides
  });
}

function swAbUpdateCandidateGovernance(overrides = {}) {
  return verifySwAbUpdateCandidateGovernance({
    policy: swAbUpdateCandidatePolicy,
    evidenceSchema: swAbUpdateCandidateSchema,
    packageJson,
    libSource: swAbUpdateCandidateLibSource,
    schemaLoaderSource: swAbUpdateCandidateSchemaLoaderSource,
    verifierSource: swAbUpdateCandidateVerifierSource,
    ...overrides
  });
}

function swAbUpdateRuntimeClientCaptureGovernance(overrides = {}) {
  return verifySwAbUpdateRuntimeClientCaptureGovernance({
    policy: swAbUpdateRuntimeClientCapturePolicy,
    evidenceSchema: swAbUpdateRuntimeClientCaptureSchema,
    packageJson,
    libSource: swAbUpdateRuntimeClientCaptureLibSource,
    loaderSource: swAbUpdateRuntimeClientCaptureLoaderSource,
    schemaLoaderSource: swAbUpdateRuntimeClientCaptureSchemaLoaderSource,
    probeSource: swAbUpdateRuntimeClientCaptureProbeSource,
    verifierSource: swAbUpdateRuntimeClientCaptureVerifierSource,
    serviceWorkerSource,
    ...overrides
  });
}

function swAbUpdateRuntimeApiTranscriptGovernance(overrides = {}) {
  return verifySwAbUpdateRuntimeApiTranscriptGovernance({
    policy: swAbUpdateRuntimeApiTranscriptPolicy,
    evidenceSchema: swAbUpdateRuntimeApiTranscriptSchema,
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
    ],
    ...overrides
  });
}

function swAbUpdateRuntimeCollectorIssuanceGovernance(overrides = {}) {
  return verifySwAbUpdateRuntimeCollectorIssuanceGovernance({
    policy: swAbUpdateRuntimeCollectorIssuancePolicy,
    evidenceSchema: swAbUpdateRuntimeCollectorIssuanceSchema,
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
    migrationWorkflow: workflow,
    formalConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ],
    ...overrides
  });
}

function swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance(overrides = {}) {
  return verifySwAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
    policy: swAbUpdateCandidateRuntimeClientCaptureCompositionPolicy,
    evidenceSchema: swAbUpdateCandidateRuntimeClientCaptureCompositionSchema,
    packageJson,
    libSource: swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
    schemaLoaderSource:
      swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaLoaderSource,
    verifierSource:
      swAbUpdateCandidateRuntimeClientCaptureCompositionVerifierSource,
    ...overrides
  });
}

function swAbUpdateFourChainCompositionGovernance(overrides = {}) {
  return verifySwAbUpdateFourChainCompositionGovernance({
    policy: swAbUpdateFourChainCompositionPolicy,
    policySource: swAbUpdateFourChainCompositionPolicySource,
    evidenceSchema: swAbUpdateFourChainCompositionSchema,
    schemaSource: swAbUpdateFourChainCompositionSchemaSource,
    checkedSourceDocuments: swAbUpdateFourChainCompositionCheckedSourceDocuments,
    packageJson,
    libSource: swAbUpdateFourChainCompositionLibSource,
    schemaLoaderSource: swAbUpdateFourChainCompositionSchemaLoaderSource,
    testSource: swAbUpdateFourChainCompositionTestSource,
    verifierSource: swAbUpdateFourChainCompositionVerifierSource,
    migrationWorkflow: workflow,
    formalConsumerSources: [
      releaseWorkflow,
      releaseRunbook,
      releaseEvidenceLibSource,
      releaseEvidenceGeneratorSource,
      releaseEvidenceVerifierSource,
      rollbackEvidenceLibSource,
      swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource,
      deployedPwaHostProviderCompositionSource
    ],
    ...overrides
  });
}

function swAbRuntimeDerivedEvidenceProducerBridgeGovernance(overrides = {}) {
  return verifySwAbRuntimeDerivedEvidenceProducerBridgeGovernance({
    policy: swAbRuntimeDerivedEvidenceProducerBridgePolicy,
    policySource: swAbRuntimeDerivedEvidenceProducerBridgePolicySource,
    evidenceSchema: swAbRuntimeDerivedEvidenceProducerBridgeSchema,
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
    ciWorkflowSources: [workflow, quickWorkflow, nightlyWorkflow, releaseWorkflow],
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
    ],
    ...overrides
  });
}

function swAbProducerBridgeCompositionGovernance(overrides = {}) {
  return verifySwAbProducerBridgeCompositionGovernance({
    policy: swAbProducerBridgeCompositionPolicy,
    policySource: swAbProducerBridgeCompositionPolicySource,
    evidenceSchema: swAbProducerBridgeCompositionSchema,
    schemaSource: swAbProducerBridgeCompositionSchemaSource,
    checkedSourceDocuments: swAbProducerBridgeCompositionCheckedSourceDocuments,
    packageJson,
    libSource: swAbProducerBridgeCompositionLibSource,
    schemaLoaderSource: swAbProducerBridgeCompositionSchemaLoaderSource,
    fixtureSource: swAbProducerBridgeCompositionFixtureSource,
    testSource: swAbProducerBridgeCompositionTestSource,
    verifierSource: swAbProducerBridgeCompositionVerifierSource,
    ciWorkflowSources: [workflow, quickWorkflow, nightlyWorkflow, releaseWorkflow],
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
    ],
    ...overrides
  });
}

function rollbackProviderSequenceCompositionGovernance(overrides = {}) {
  return verifyRollbackProviderSequenceCompositionGovernance({
    policy: rollbackProviderSequenceCompositionPolicy,
    evidenceSchema: rollbackProviderSequenceCompositionSchema,
    packageJson,
    libSource: rollbackProviderSequenceCompositionLibSource,
    schemaLoaderSource: rollbackProviderSequenceCompositionSchemaLoaderSource,
    verifierSource: rollbackProviderSequenceCompositionVerifierSource,
    providerCandidateLoaderSource: providerDeploymentCandidateLoaderSource,
    providerSequenceLoaderSource: providerDeploymentCandidateSequenceLoaderSource,
    providerSequenceVerifierSource: providerDeploymentCandidateSequenceVerifierSource,
    rollbackLibSource: rollbackEvidenceLibSource,
    rollbackVerifierSource: rollbackEvidenceVerifierSource,
    ...overrides
  });
}

function swTwoGenerationFixtureGovernance(overrides = {}) {
  const input = {
    decisions,
    packageJson,
    fixtureConfig: swTwoGenerationFixtureConfig,
    fixtureSource: swTwoGenerationFixtureSource,
    reporterSource: swTwoGenerationFixtureReporterSource,
    runnerSource: swTwoGenerationFixtureRunnerSource,
    artifactIdentityModuleSource: swTwoGenerationArtifactIdentityModuleSource,
    criticalSourceIdentityModuleSource:
      swTwoGenerationFixtureCriticalSourceIdentityModuleSource,
    criticalSourceIdentity: swTwoGenerationFixtureCriticalSourceIdentity,
    ...overrides
  };
  return verifySwTwoGenerationFixtureGovernance(
    input.decisions,
    input.packageJson,
    input.fixtureConfig,
    input.fixtureSource,
    input.reporterSource,
    input.runnerSource,
    input.artifactIdentityModuleSource,
    input.criticalSourceIdentityModuleSource,
    input.criticalSourceIdentity
  );
}

function withoutExactLine(source, exactLine) {
  const lines = source.split(/\r?\n/u);
  const index = lines.indexOf(exactLine);
  assert.notEqual(index, -1, `Fixture line is missing: ${exactLine}`);
  lines.splice(index, 1);
  return lines.join("\n");
}

// Mutate a named CI job, independent of changing human-readable step labels.
function withAdditionalJobCommand(source, jobId, command) {
  const lines = source.split(/\r?\n/u);
  const start = lines.indexOf(`  ${jobId}:`);
  assert.notEqual(start, -1, `Fixture job is missing: ${jobId}`);
  let end = start + 1;
  while (end < lines.length && !/^  [a-z][a-z0-9-]*:$/u.test(lines[end])) end += 1;
  const steps = lines.indexOf("    steps:", start);
  assert(steps > start && steps < end, `Fixture steps are missing: ${jobId}`);
  lines.splice(steps + 1, 0, "      - name: Inject a duplicate evidence command", `        run: ${command}`);
  return lines.join("\n");
}

// Coordinated root hooks are forbidden before closure traversal begins. Auxiliary
// hooks below still exercise actual traversal and candidate-specific rejection.
function expectedRootHookRejection(hookName, candidateError) {
  const coordinated = /^(?:pre|post)(typecheck|test|build)$/u.exec(hookName);
  return coordinated
    ? { message: `Default lifecycle command or root pre/post hook changed: ${coordinated[1]}.` }
    : candidateError;
}

function receiptLine(document, id) {
  const line = document.split(/\r?\n/u).find((candidate) => candidate.includes(`--id ${id} `));
  assert.ok(line, `Receipt fixture is missing: ${id}`);
  return line;
}

function swapExactLines(source, firstLine, secondLine) {
  const lines = source.split(/\r?\n/u);
  const firstIndex = lines.indexOf(firstLine);
  const secondIndex = lines.indexOf(secondLine);
  assert.notEqual(firstIndex, -1, `Fixture line is missing: ${firstLine}`);
  assert.notEqual(secondIndex, -1, `Fixture line is missing: ${secondLine}`);
  [lines[firstIndex], lines[secondIndex]] = [lines[secondIndex], lines[firstIndex]];
  return lines.join("\n");
}

function verifyCurrentZiweiHkoPreReleasePolicy(overrides = {}) {
  return verifyZiweiHkoRestrictedSourcePreReleasePolicy({
    policy: overrides.policy ?? ziweiHkoRestrictedSourcePreReleasePolicy,
    packageJson: overrides.packageJson ?? packageJson,
    quickWorkflow: overrides.quickWorkflow ?? quickWorkflow,
    implementationArtifacts:
      overrides.implementationArtifacts ?? ziweiHkoRestrictedSourceImplementationArtifacts,
    defaultV13RequiredReceiptCommands:
      overrides.defaultV13RequiredReceiptCommands
        ?? decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
    webPackageJson: overrides.webPackageJson ?? webPackageJson,
    formalNpmEmbeddedCommands:
      overrides.formalNpmEmbeddedCommands ?? currentFormalNpmEmbeddedCommands,
    parentIsolationArtifacts:
      overrides.parentIsolationArtifacts ?? ziweiHkoParentIsolationArtifacts,
    ...(Object.hasOwn(overrides, "formalNpmClosure")
      ? { formalNpmClosure: overrides.formalNpmClosure }
      : {})
  });
}

function resealZiweiHkoPreReleasePolicy(mutator) {
  const policy = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
  mutator(policy);
  policy.policyDigest = computeZiweiHkoRestrictedSourcePreReleasePolicyDigest(policy);
  return policy;
}

test("accepts the checked-in migration workflow trigger and command closure", () => {
  assert.doesNotThrow(() => verifyMigrationWorkflowGovernance(workflow));
});

test("accepts the split Quick CI evidence jobs and fail-closed aggregate", () => {
  assert.doesNotThrow(() => verifyQuickCiGovernance(quickWorkflow, packageJson));
  assert.deepEqual(REQUIRED_QUICK_CI_JOBS, [
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
  assert.deepEqual(REQUIRED_QUICK_CI_INDEPENDENT_JOBS, [
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
});

test("models the 30 scoped inventory and Bazi semantic terminals without retaining superseded verifiers", () => {
  assert.equal(FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT, 30);
  assert.equal(
    currentFormalNpmClosure.closureCanonicalSha256,
    REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256
  );
  const reachableCommands = new Set(
    currentFormalNpmClosure.reachableScriptTuples.map((entry) => entry.command)
  );
  for (const command of [
    "node scripts/verify-history-checkpoint.mjs",
    "node scripts/verify-current-independent-source-inventory.mjs",
    "node scripts/verify-current-independent-domain-inventory.mjs",
    "node scripts/resolve-bazi-current-domain-manifest.mjs",
    "node scripts/resolve-bazi-current-expert-review-packet.mjs"
  ]) {
    assert.equal(reachableCommands.has(command), true, command);
  }
  for (const command of [
    "node scripts/verify-independent-source-binding-requirements.mjs",
    "node scripts/verify-independent-domain-release-manifests.mjs",
    "node scripts/verify-bazi-domain-release-manifest.mjs",
    "node scripts/verify-bazi-expert-review-packet.mjs"
  ]) {
    assert.equal(reachableCommands.has(command), false, command);
  }

  for (const [scriptName, supersededCommand] of [
    [
      "check:independent-source-inventory",
      "node scripts/verify-independent-source-binding-requirements.mjs"
    ],
    [
      "check:independent-domain-inventory",
      "node scripts/verify-independent-domain-release-manifests.mjs"
    ],
    ["check:bazi-domain-release-manifest", "node scripts/verify-bazi-domain-release-manifest.mjs"],
    ["check:bazi-expert-review-packet", "node scripts/verify-bazi-expert-review-packet.mjs"]
  ]) {
    const supersededPackage = structuredClone(packageJson);
    supersededPackage.scripts[scriptName] = supersededCommand;
    assert.throws(
      () => formalNpmClosure(supersededPackage),
      /refuses an opaque or dynamic terminal command/u,
      supersededCommand
    );
  }
});

test("binds the Ziwei HKO live gate as a non-persisted independent pre-release obligation", () => {
  assert.deepEqual(
    ziweiHkoRestrictedSourcePreReleasePolicy,
    buildZiweiHkoRestrictedSourcePreReleasePolicy()
  );
  assert.equal(
    REQUIRED_RELEASE_FILES.includes(ZIWEI_HKO_RESTRICTED_SOURCE_PRE_RELEASE_POLICY_PATH),
    true
  );
  assert.deepEqual(
    REQUIRED_QUICK_CI_COMMANDS["toolchain-and-boundaries"].slice(0, 2),
    [
      "npm run check:ziwei-iztro-isolated-build-license-notices",
      "npm run test:ziwei-iztro-isolated-build-license-notices"
    ]
  );
  assert.equal(FORMAL_NPM_STATIC_TERMINAL_COMMAND_COUNT, 30);
  assert.equal(
    ziweiHkoRestrictedSourcePreReleasePolicy.parentBindingBoundary
      .defaultV13FormalNpmClosureIsolation.allowedTerminalCommandCount,
    30
  );
  assert.deepEqual(verifyCurrentZiweiHkoPreReleasePolicy(), {
    policyId: "hakimi.ziwei.hko-restricted-source-pre-release/1.0.0",
    status: "mandatory_live_check_policy_no_persisted_pass_receipt",
    staticMandatoryLiveCheckPolicyBound: true,
    modeledStaticNpmLifecycleIsolationBound: true,
    effectiveNpmRuntimeClosureEstablished: false,
    ambientNpmConfigNeutralized: false,
    preLifecycleCannotBeSkippedEstablished: false,
    transitiveModuleConfigOrWrapperExecutionAbsenceEstablished: false,
    liveExecutionPerformedByGovernance: false,
    pointInTimePassPersisted: false,
    outputAbsenceEstablishedByGovernance: false,
    formalReleaseEvidenceReceipt: false,
    rightsLegalConclusionEstablished: false,
    releaseReady: false,
    publicBuildInclusionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false
  });
});

test("strictly parses the persisted Ziwei HKO policy before semantic verification", () => {
  const source = ziweiHkoRestrictedSourcePreReleasePolicyBytes.toString("utf8");
  const statusLine =
    '  "status": "mandatory_live_check_policy_no_persisted_pass_receipt",';
  const cases = [
    [
      Buffer.from(source.replace(statusLine, `  "status": "shadowed",\n${statusLine}`)),
      /POLICY_JSON_DUPLICATE_KEY/u
    ],
    [
      Buffer.from(source.replace(statusLine, `  "\\u0073tatus": "shadowed",\n${statusLine}`)),
      /POLICY_JSON_DUPLICATE_KEY/u
    ],
    [
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), ziweiHkoRestrictedSourcePreReleasePolicyBytes]),
      /POLICY_JSON_BOM_FORBIDDEN/u
    ],
    [
      Buffer.concat([
        ziweiHkoRestrictedSourcePreReleasePolicyBytes.subarray(0, 1),
        Buffer.from([0xff]),
        ziweiHkoRestrictedSourcePreReleasePolicyBytes.subarray(1)
      ]),
      /POLICY_JSON_UTF8_INVALID/u
    ],
    [{}, /POLICY_JSON_BYTES_INVALID/u],
    [
      new Proxy(ziweiHkoRestrictedSourcePreReleasePolicyBytes, {
        get(target, key) {
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        }
      }),
      /POLICY_JSON_BYTES_INVALID/u
    ]
  ];
  for (const [bytes, expected] of cases) {
    assert.throws(
      () => parseZiweiHkoRestrictedSourcePreReleasePolicyJsonBytes(bytes),
      expected
    );
  }
});

test("rejects Proxy, accessor, prototype, cycle and hidden proto-key policy inputs", () => {
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      policy: new Proxy(ziweiHkoRestrictedSourcePreReleasePolicy, {})
    }),
    /POLICY_VALUE_INVALID/u
  );

  const accessor = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
  Object.defineProperty(accessor, "status", {
    enumerable: true,
    get: () => "mandatory_live_check_policy_no_persisted_pass_receipt"
  });
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: accessor }),
    /POLICY_VALUE_INVALID/u
  );

  const nonExactArray = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
  Object.setPrototypeOf(nonExactArray.requiredLiveCheck.surfaces, null);
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: nonExactArray }),
    /POLICY_VALUE_INVALID/u
  );

  const cyclic = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
  cyclic.cycle = cyclic;
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: cyclic }),
    /POLICY_VALUE_INVALID/u
  );

  for (const section of [null, "authorityBoundary"]) {
    const hidden = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
    const target = section === null ? hidden : hidden[section];
    Object.defineProperty(target, "__proto__", {
      value: null,
      enumerable: true,
      configurable: true
    });
    hidden.policyDigest = computeZiweiHkoRestrictedSourcePreReleasePolicyDigest(hidden);
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: hidden }),
      /POLICY_SEMANTIC_DRIFT/u
    );
  }
});

test("rejects Ziwei HKO policy digest drift and every re-sealed authority promotion", () => {
  const digestDrift = structuredClone(ziweiHkoRestrictedSourcePreReleasePolicy);
  digestDrift.policyDigest = "0".repeat(64);
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: digestDrift }),
    /POLICY_DIGEST_MISMATCH/u
  );

  const promotions = [
    ["persistenceBoundary", "latestPassPersisted"],
    ["persistenceBoundary", "outputAbsenceProofPersisted"],
    ["persistenceBoundary", "formalReleaseEvidenceReceipt"],
    ["observationBoundary", "universalTranscodingAbsenceEstablished"],
    ["observationBoundary", "linkOnlyStorageEstablished"],
    ["observationBoundary", "crossFileAtomicityEstablished"],
    ["observationBoundary", "intervalIntegrityEstablished"],
    ["observationBoundary", "abaResistanceEstablished"],
    ["observationBoundary", "mutationEpochEstablished"],
    ["authorityBoundary", "sourceBindingFrozen"],
    ["authorityBoundary", "rightsLegalConclusionEstablished"],
    ["authorityBoundary", "expertClaimsAuthorized"],
    ["authorityBoundary", "releaseEvidenceComplete"],
    ["authorityBoundary", "releaseReady"],
    ["authorityBoundary", "publicBuildInclusionAuthorized"],
    ["authorityBoundary", "publicDeploymentAuthorized"],
    ["authorityBoundary", "publicReleaseAuthorized"],
    ["parentBindingBoundary", "bindsIndependentZiweiManifest"],
    ["parentBindingBoundary", "bindsFourSystemRegistry"],
    ["parentBindingBoundary", "bindsDefaultV13FormalReceiptAllowlist"]
  ];
  for (const [section, key] of promotions) {
    const promoted = resealZiweiHkoPreReleasePolicy((policy) => {
      policy[section][key] = true;
    });
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: promoted }),
      /POLICY_SEMANTIC_DRIFT/u,
      `${section}.${key}`
    );
  }
});

test("rejects re-sealed HKO material, representation, freshness and extra receipt claims", () => {
  const mutators = [
    (policy) => { policy.sourceMaterialScope.annualBodyCount = 5; },
    (policy) => { policy.sourceMaterialScope.years[5] = 2029; },
    (policy) => { policy.sourceMaterialScope.rawSnapshotFixtureArtifact.sha256 = "a".repeat(64); },
    (policy) => { policy.requiredLiveCheck.representationClasses.pop(); },
    (policy) => { policy.requiredLiveCheck.mustExecuteFresh = false; },
    (policy) => { policy.requiredLiveCheck.historicalPassMaySatisfy = true; },
    (policy) => { policy.requiredLiveCheck.preLifecycleCannotBeSkippedEstablished = true; },
    (policy) => {
      policy.parentBindingBoundary.defaultV13FormalNpmClosureIsolation
        .effectiveNpmRuntimeClosureEstablished = true;
    },
    (policy) => {
      policy.parentBindingBoundary.defaultV13FormalNpmClosureIsolation
        .ambientNpmConfigNeutralized = true;
    },
    (policy) => {
      policy.parentBindingBoundary.defaultV13FormalNpmClosureIsolation
        .preLifecycleCannotBeSkippedEstablished = true;
    },
    (policy) => {
      policy.parentBindingBoundary.defaultV13FormalNpmClosureIsolation
        .transitiveModuleConfigOrWrapperExecutionAbsenceEstablished = true;
    },
    (policy) => { policy.latestPass = { observedAt: "2026-08-30T00:00:00.000Z" }; },
    (policy) => { delete policy.persistenceBoundary.latestPassPersisted; }
  ];
  for (const mutate of mutators) {
    const changed = resealZiweiHkoPreReleasePolicy(mutate);
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ policy: changed }),
      /POLICY_SEMANTIC_DRIFT/u
    );
  }
});

test("rejects Ziwei HKO implementation identity drift", () => {
  for (const spec of ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS) {
    const artifacts = { ...ziweiHkoRestrictedSourceImplementationArtifacts };
    artifacts[spec.path] = Buffer.concat([artifacts[spec.path], Buffer.from("\n")]);
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ implementationArtifacts: artifacts }),
      /IMPLEMENTATION_IDENTITY_DRIFT/u,
      spec.path
    );
  }
});

test("requires an exact data-only implementation artifact map", () => {
  const extra = { ...ziweiHkoRestrictedSourceImplementationArtifacts, extra: Buffer.from("extra") };
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ implementationArtifacts: extra }),
    /IMPLEMENTATION_ARTIFACTS_INVALID/u
  );
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      implementationArtifacts: new Proxy(ziweiHkoRestrictedSourceImplementationArtifacts, {})
    }),
    /IMPLEMENTATION_ARTIFACTS_INVALID/u
  );
  const getterBacked = { ...ziweiHkoRestrictedSourceImplementationArtifacts };
  const [firstSpec] = ZIWEI_HKO_RESTRICTED_SOURCE_IMPLEMENTATION_SPECS;
  Object.defineProperty(getterBacked, firstSpec.path, {
    enumerable: true,
    get: () => ziweiHkoRestrictedSourceImplementationArtifacts[firstSpec.path]
  });
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ implementationArtifacts: getterBacked }),
    /IMPLEMENTATION_ARTIFACTS_INVALID/u
  );
  const symbolExtra = { ...ziweiHkoRestrictedSourceImplementationArtifacts };
  symbolExtra[Symbol("extra")] = Buffer.from("extra");
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ implementationArtifacts: symbolExtra }),
    /IMPLEMENTATION_ARTIFACTS_INVALID/u
  );
  const proxiedValue = { ...ziweiHkoRestrictedSourceImplementationArtifacts };
  proxiedValue[firstSpec.path] = new Proxy(proxiedValue[firstSpec.path], {
    get(target, key) {
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({ implementationArtifacts: proxiedValue }),
    /IMPLEMENTATION_IDENTITY_DRIFT/u
  );
});

test("rejects missing, reordered or unregistered Ziwei npm lifecycle gates", () => {
  const cases = [
    (candidate) => { delete candidate.scripts["prebuild:ziwei-browser-preview"]; },
    (candidate) => {
      candidate.scripts["prebuild:ziwei-browser-preview"] =
        "npm run check:system-contract-draft-boundaries && npm run check:ziwei-iztro-isolated-build-license-notices";
    },
    (candidate) => {
      candidate.scripts["prebuild:ziwei-browser-workspace"] += " || true";
    },
    (candidate) => {
      candidate.scripts["prepreview:ziwei-browser-preview"] =
        candidate.scripts["preview:ziwei-browser-preview"];
    },
    (candidate) => {
      candidate.scripts["build:ziwei-browser-preview"] = "node unsafe-unscanned-builder.mjs";
    },
    (candidate) => {
      candidate.scripts["preview:ziwei-browser-workspace"] = "node unsafe-preview.mjs";
    },
    (candidate) => { candidate.scripts["build:ziwei-unregistered"] = "node never.mjs"; },
    (candidate) => { candidate.scripts["preview:ziwei-unregistered"] = "node never.mjs"; },
    (candidate) => { candidate.scripts["build:release-ziwei"] = "node never.mjs"; },
    (candidate) => {
      candidate.scripts["release:draft"] = "npm run build:ziwei-browser-preview";
    },
    (candidate) => {
      candidate.scripts["release:isolated"] =
        candidate.scripts["build:ziwei-browser-workspace"];
    }
  ];
  for (const mutate of cases) {
    const candidate = structuredClone(packageJson);
    mutate(candidate);
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ packageJson: candidate }),
      /LIVE_SCRIPT_DRIFT|LIFECYCLE_BINDING_DRIFT|UNREGISTERED_ZIWEI_LIFECYCLE/u
    );
  }
});

test("rejects missing, duplicated, reordered or fail-open Ziwei Quick CI gates", () => {
  const checkLine = "        run: npm run check:ziwei-iztro-isolated-build-license-notices";
  const testLine = "        run: npm run test:ziwei-iztro-isolated-build-license-notices";
  const blockScalarBypassCommands = [
    "npm run check:ziwei-iztro-isolated-build-license-notices",
    "npm run test:ziwei-iztro-isolated-build-license-notices",
    "npm run check:system-contract-draft-boundaries",
    "npm run check:independent-source-inventory",
    "npm run check:independent-domain-inventory",
    "npm run check:release-governance"
  ];
  let blockScalarBypass = quickWorkflow;
  for (const [index, command] of blockScalarBypassCommands.entries()) {
    blockScalarBypass = blockScalarBypass.replace(
      `        run: ${command}`,
      `        run: echo bypassed-${index}`
    );
  }
  const fakeRunText = [
    "      - name: Shell text that is not a command step",
    "        run: |",
    "          function run() { true; }",
    ...blockScalarBypassCommands.map((command) => `          run: ${command}`)
  ].join("\n");
  blockScalarBypass = blockScalarBypass.replace(
    "\n  current-index-governance:",
    `\n${fakeRunText}\n\n  current-index-governance:`
  );
  const cases = [
    withoutExactLine(quickWorkflow, checkLine),
    quickWorkflow.replace(checkLine, `${checkLine}\n${checkLine}`),
    swapExactLines(quickWorkflow, checkLine, testLine),
    quickWorkflow.replace(checkLine, `${checkLine}\n        continue-on-error: true`),
    quickWorkflow.replace(checkLine, `${checkLine}\n        continue-on-error: \${{ true }}`),
    quickWorkflow.replace(checkLine, `${checkLine}\n        if: \${{ false }}`),
    quickWorkflow.replace(checkLine, `${checkLine}\n        working-directory: fixtures/pass`),
    quickWorkflow.replace(checkLine, `${checkLine}\n        shell: echo {0}`),
    quickWorkflow.replace(checkLine, `${checkLine}\n        env:\n          PATH: fixtures/pass`),
    `defaults:\n  run:\n    shell: echo {0}\n${quickWorkflow}`,
    `${quickWorkflow}\n  toolchain-and-boundaries:\n`,
    blockScalarBypass
  ];
  for (const candidate of cases) {
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({ quickWorkflow: candidate }),
      /QUICK_CI_COMMAND_COUNT|QUICK_CI_COMMAND_ORDER|QUICK_CI_EXECUTION_BYPASS|QUICK_CI_JOB_DUPLICATE|QUICK_CI_WORKFLOW_IDENTITY_DRIFT/u
    );
  }
  assert.throws(
    () => verifyQuickCiGovernance(blockScalarBypass, packageJson),
    /must run exactly once: npm run check:ziwei-iztro-isolated-build-license-notices/u
  );
});

test("keeps the Ziwei HKO gate out of the default-v13 formal receipt allowlist", () => {
  const receipts = structuredClone(decisions.releaseEvidence.defaultV13RequiredReceiptCommands);
  receipts["ziwei-hko"] = ["npm", "run", "check:ziwei-iztro-isolated-build-license-notices"];
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      defaultV13RequiredReceiptCommands: receipts
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  const aliasPackage = structuredClone(packageJson);
  aliasPackage.scripts["formal:hko-alias"] =
    "npm run --silent check:ziwei-iztro-isolated-build-license-notices";
  const aliasReceipts = structuredClone(decisions.releaseEvidence.defaultV13RequiredReceiptCommands);
  aliasReceipts["hko-alias"] = ["npm", "run", "formal:hko-alias"];
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      packageJson: aliasPackage,
      defaultV13RequiredReceiptCommands: aliasReceipts,
      formalNpmClosure: Object.freeze({
        visitedScripts: Object.freeze([]),
        reachableScriptTuples: Object.freeze([]),
        reachableScriptCount: 0,
        closureCanonicalSha256: sha256(canonicalJson([])),
        embeddedCommandCount: 0
      })
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  const webAliasPackage = structuredClone(webPackageJson);
  webAliasPackage.scripts["formal:hko-web-alias"] =
    "npm run --silent check:ziwei-iztro-isolated-build-license-notices";
  webAliasPackage.scripts["check:ziwei-iztro-isolated-build-license-notices"] =
    "node harmless-web-hko-gate-fixture.mjs";
  const webAliasReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  webAliasReceipts["hko-web-alias"] = [
    "npm",
    "--prefix",
    "apps/web",
    "run",
    "formal:hko-web-alias"
  ];
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      webPackageJson: webAliasPackage,
      defaultV13RequiredReceiptCommands: webAliasReceipts
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      formalNpmEmbeddedCommands: [
        ...currentFormalNpmEmbeddedCommands,
        "npm run --silent check:ziwei-iztro-isolated-build-license-notices"
      ]
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  const splitDynamicHkoImport =
    "node -e \"import('./scripts/' + 'verify'.slice(0) + '-ziwei-iztro-isolated-build-license-notices.mjs')\"";
  const dynamicRootPackage = structuredClone(packageJson);
  dynamicRootPackage.scripts["formal:opaque-extension"] = splitDynamicHkoImport;
  const dynamicRootReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  dynamicRootReceipts["opaque-extension"] = [
    "npm",
    "run",
    "formal:opaque-extension"
  ];
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      packageJson: dynamicRootPackage,
      defaultV13RequiredReceiptCommands: dynamicRootReceipts
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  const dynamicWebPackage = structuredClone(webPackageJson);
  dynamicWebPackage.scripts["formal:opaque-extension"] = splitDynamicHkoImport;
  for (const selector of [
    ["--workspace", webPackageJson.name],
    ["--prefix", "apps/web"]
  ]) {
    const dynamicWebReceipts = structuredClone(
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands
    );
    dynamicWebReceipts["opaque-web-extension"] = [
      "npm",
      ...selector,
      "run",
      "formal:opaque-extension"
    ];
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({
        webPackageJson: dynamicWebPackage,
        defaultV13RequiredReceiptCommands: dynamicWebReceipts
      }),
      /DEFAULT_V13_SCOPE_VIOLATION/u
    );
  }

  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      formalNpmEmbeddedCommands: [
        ...currentFormalNpmEmbeddedCommands,
        splitDynamicHkoImport
      ]
    }),
    /DEFAULT_V13_SCOPE_VIOLATION/u
  );

  for (const opaqueTerminalCommand of [
    "node scripts/neutral-wrapper.mjs",
    "node --test --import=./scripts/neutral-wrapper.mjs scripts/safe.test.mjs",
    "node --test --loader=./scripts/neutral-wrapper.mjs scripts/safe.test.mjs",
    "vite build --config neutral.config.mjs",
    "playwright test --config neutral.config.mjs",
    "vitest run --config neutral.config.mjs",
    "npm test -- --config=neutral.config.mjs",
    "npm run test -- --config=neutral.config.mjs",
    "npm test -- --runInBand $DYNAMIC"
  ]) {
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({
        formalNpmEmbeddedCommands: [
          ...currentFormalNpmEmbeddedCommands,
          opaqueTerminalCommand
        ]
      }),
      /DEFAULT_V13_SCOPE_VIOLATION/u,
      opaqueTerminalCommand
    );
  }

  const missingOptionalLifecyclePackage = structuredClone(packageJson);
  missingOptionalLifecyclePackage.scripts["formal:optional-first"] =
    "node scripts/verify-release-governance.mjs";
  const missingOptionalLifecycleReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  missingOptionalLifecycleReceipts["optional-first"] = [
    "npm",
    "run",
    "formal:optional-first"
  ];
  missingOptionalLifecycleReceipts["missing-required-pre"] = [
    "npm",
    "run",
    "preformal:optional-first"
  ];
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      packageJson: missingOptionalLifecyclePackage,
      defaultV13RequiredReceiptCommands: missingOptionalLifecycleReceipts
    }),
    /Formal npm closure required script is missing/u
  );
});

test("keeps the HKO policy absent from independent parent artifacts", () => {
  for (const artifactPath of ZIWEI_HKO_PARENT_ISOLATION_ARTIFACT_PATHS) {
    const candidateArtifacts = { ...ziweiHkoParentIsolationArtifacts };
    const parsed = JSON.parse(candidateArtifacts[artifactPath].toString("utf8"));
    parsed.hkoPolicyReference =
      artifactPath.includes("four-system")
        ? "HAKIMI.ZIWEI.HKO-RESTRICTED-SOURCE-PRE-RELEASE/1.0.0"
        : ".\\content\\system-admission\\ZIWEI-HKO-RESTRICTED-SOURCE-PRE-RELEASE-POLICY.V1.JSON";
    candidateArtifacts[artifactPath] = Buffer.from(JSON.stringify(parsed));
    assert.throws(
      () => verifyCurrentZiweiHkoPreReleasePolicy({
        parentIsolationArtifacts: candidateArtifacts
      }),
      /PARENT_SCOPE_VIOLATION/u,
      artifactPath
    );
  }
  assert.throws(
    () => verifyCurrentZiweiHkoPreReleasePolicy({
      parentIsolationArtifacts: new Proxy(ziweiHkoParentIsolationArtifacts, {})
    }),
    /PARENT_ISOLATION_ARTIFACTS_INVALID/u
  );
});

test("hosting _headers exactly mirrors the closed path and header policy", () => {
  assert.deepEqual(verifyHostingHeadersSource(hostingPolicy, hostingHeaders), {
    routeCount: 4,
    globalHeaderCount: 8
  });
});

test("hosting owner decision and mechanical policy remain fail-closed and aligned", () => {
  assert.deepEqual(AUDITED_HOSTING_PLATFORM_IDS, []);
  assert.deepEqual(
    verifyHostingDecisionPolicyGovernance(decisions.hosting, hostingPolicy),
    {
      platform: "unselected",
      auditedPlatformProfile: null,
      securityHeadersVerified: false,
      publicDeploymentAuthorized: false
    }
  );

  const divergentDecision = structuredClone(decisions.hosting);
  divergentDecision.platform = "fixture-host";
  assert.throws(
    () => verifyHostingDecisionPolicyGovernance(divergentDecision, hostingPolicy),
    /does not match the mechanical hosting policy/u
  );

  const selectedDecision = structuredClone(decisions.hosting);
  selectedDecision.platform = "fixture-host";
  const selectedPolicy = structuredClone(hostingPolicy);
  selectedPolicy.deploymentPlatform = "fixture-host";
  selectedPolicy.canonicalOrigin = "https://staging.example.test";
  assert.throws(
    () => verifyHostingDecisionPolicyGovernance(selectedDecision, selectedPolicy),
    /no audited platform profile/u
  );
  assert.deepEqual(
    verifyHostingDecisionPolicyGovernance(selectedDecision, selectedPolicy, ["fixture-host"]),
    {
      platform: "fixture-host",
      auditedPlatformProfile: "fixture-host",
      securityHeadersVerified: false,
      publicDeploymentAuthorized: false
    }
  );

  for (const invalidAllowlist of [["unselected"], ["fixture-host", "fixture-host"], [""]]) {
    assert.throws(
      () => verifyHostingDecisionPolicyGovernance(selectedDecision, selectedPolicy, invalidAllowlist),
      /allowlist is invalid/u
    );
  }

  const decisionClaimsHeaders = structuredClone(decisions.hosting);
  decisionClaimsHeaders.securityHeadersVerified = true;
  assert.throws(
    () => verifyHostingDecisionPolicyGovernance(decisionClaimsHeaders, hostingPolicy),
    /ledgers have diverged/u
  );

  const policyClaimsHeaders = structuredClone(hostingPolicy);
  policyClaimsHeaders.publicReleaseGate.realHostHeadersVerified = true;
  assert.throws(
    () => verifyHostingDecisionPolicyGovernance(decisions.hosting, policyClaimsHeaders),
    /ledgers have diverged/u
  );

  const unauthorized = structuredClone(selectedDecision);
  unauthorized.publicDeploymentAuthorized = true;
  selectedPolicy.publicReleaseGate.realHostHeadersVerified = true;
  selectedPolicy.publicReleaseGate.cspBlockingModeVerified = true;
  selectedPolicy.cspEnforcementStatus = "blocking_header_candidate";
  selectedPolicy.headers["Content-Security-Policy"] =
    selectedPolicy.headers["Content-Security-Policy-Report-Only"];
  delete selectedPolicy.headers["Content-Security-Policy-Report-Only"];
  unauthorized.securityHeadersVerified = true;
  assert.throws(
    () => verifyHostingDecisionPolicyGovernance(unauthorized, selectedPolicy, ["fixture-host"]),
    /cannot authorize public deployment/u
  );
});

test("hosting CSP governance accepts exact report-only and blocking modes without conflating them", () => {
  assert.deepEqual(verifyHostingCspGovernance(hostingPolicy), {
    headerName: "Content-Security-Policy-Report-Only",
    cspEnforcementStatus: "report_only_until_real_host_validation"
  });

  const blockingPolicy = structuredClone(hostingPolicy);
  blockingPolicy.cspEnforcementStatus = "blocking_header_candidate";
  blockingPolicy.headers["Content-Security-Policy"] =
    blockingPolicy.headers["Content-Security-Policy-Report-Only"];
  delete blockingPolicy.headers["Content-Security-Policy-Report-Only"];
  const blockingHeaders = hostingHeaders.replace(
    "Content-Security-Policy-Report-Only:",
    "Content-Security-Policy:"
  );
  assert.deepEqual(verifyHostingCspGovernance(blockingPolicy), {
    headerName: "Content-Security-Policy",
    cspEnforcementStatus: "blocking_header_candidate"
  });
  assert.doesNotThrow(() => verifyHostingHeadersSource(blockingPolicy, blockingHeaders));

  const mixedPolicy = structuredClone(blockingPolicy);
  mixedPolicy.headers["Content-Security-Policy-Report-Only"] = mixedPolicy.headers["Content-Security-Policy"];
  assert.throws(() => verifyHostingCspGovernance(mixedPolicy), /headers are incomplete|policy shape is invalid/u);

  for (const basePolicy of [hostingPolicy, blockingPolicy]) {
    const weakened = structuredClone(basePolicy);
    const headerName = weakened.cspEnforcementStatus === "blocking_header_candidate"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only";
    weakened.headers[headerName] = `${weakened.headers[headerName]}; script-src 'self' 'unsafe-eval'`;
    assert.throws(() => verifyHostingCspGovernance(weakened), /CSP .*policy shape|local-first boundary/u);
  }
});

test("hosting _headers source rejects duplicate and substring-only cache evidence", () => {
  assert.throws(
    () => verifyHostingHeadersSource(hostingPolicy, `${hostingHeaders}\n/index.html\n  Cache-Control: no-cache, no-store, must-revalidate\n`),
    /invalid or duplicated/u
  );
  assert.throws(
    () => verifyHostingHeadersSource(hostingPolicy, hostingHeaders.replace(
      "/sw.js\n  Cache-Control: no-cache, no-store, must-revalidate",
      "/sw.js\n  X-Note: Cache-Control: no-cache, no-store, must-revalidate"
    )),
    /exactly implement cache rule \/sw\.js/u
  );
});

test("rejects Quick CI when typecheck regains control over independent evidence jobs", () => {
  const weakenedWorkflow = quickWorkflow.replace(
    "  full-vitest:\n    name: Full Vitest suite",
    "  full-vitest:\n    needs: full-typecheck\n    name: Full Vitest suite"
  );
  assert.notEqual(weakenedWorkflow, quickWorkflow);
  assert.throws(
    () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
    /must remain independently runnable/u
  );
});

test("keeps history-checkpoint and current-index governance independently runnable with pinned setup", () => {
  for (const [jobId, jobName] of [
    ["history-checkpoint-governance", "History checkpoint governance"],
    ["current-index-governance", "Current index governance"]
  ]) {
    const dependentWorkflow = quickWorkflow.replace(
      `  ${jobId}:\n    name: ${jobName}`,
      `  ${jobId}:\n    needs: toolchain-and-boundaries\n    name: ${jobName}`
    );
    assert.notEqual(dependentWorkflow, quickWorkflow, jobId);
    assert.throws(
      () => verifyQuickCiGovernance(dependentWorkflow, packageJson),
      new RegExp(`${jobId} must remain independently runnable`, "u")
    );

    const jobPrefix = [
      `  ${jobId}:`,
      `    name: ${jobName}`,
      "    runs-on: ubuntu-latest",
      "    timeout-minutes: 20",
      "",
      "    steps:",
      "      - name: Check out repository",
      "        uses: actions/checkout@v5",
      "",
      "      - name: Set up pinned Node.js",
      "        uses: actions/setup-node@v5",
      "        with:",
      "          node-version-file: .node-version",
      "          cache: npm",
      "",
      "      - name: Set up pinned npm",
      "        run: npm install --global npm@11.13.0",
      "",
      "      - name: Install locked dependencies",
      "        run: npm ci"
    ].join("\n");
    assert.equal(quickWorkflow.includes(jobPrefix), true, jobId);
    for (const [required, replacement] of [
      ["uses: actions/checkout@v5", "uses: actions/checkout@v4"],
      ["uses: actions/setup-node@v5", "uses: actions/setup-node@v4"],
      ["node-version-file: .node-version", "node-version: latest"],
      ["cache: npm", "cache: yarn"],
      ["run: npm install --global npm@11.13.0", "run: npm install --global npm@latest"],
      ["run: npm ci", "run: npm install"]
    ]) {
      const weakenedPrefix = jobPrefix.replace(required, replacement);
      assert.notEqual(weakenedPrefix, jobPrefix, required);
      const weakenedWorkflow = quickWorkflow.replace(jobPrefix, weakenedPrefix);
      assert.notEqual(weakenedWorkflow, quickWorkflow, required);
      assert.throws(
        () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
        new RegExp(
          `${jobId} must (?:independently pin its setup|run its independent setup) exactly once`,
          "u"
        ),
        required
      );
    }
  }
});

test("rejects Quick CI when either independent history-checkpoint command is omitted", () => {
  for (const command of [
    "npm run check:history-checkpoint",
    "npm run test:history-checkpoint"
  ]) {
    const weakenedWorkflow = withoutExactLine(quickWorkflow, `        run: ${command}`);
    assert.throws(
      () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
      new RegExp(`must run exactly once: ${command}`, "u"),
      command
    );
  }
});

test("runs history-checkpoint evidence exactly once and only in its independent job", () => {
  const duplicatedInToolchain = withAdditionalJobCommand(quickWorkflow, "toolchain-and-boundaries", "npm run check:history-checkpoint");
  assert.notEqual(duplicatedInToolchain, quickWorkflow);
  assert.throws(
    () => verifyQuickCiGovernance(duplicatedInToolchain, packageJson),
    /must appear exactly once and only in history-checkpoint-governance/u
  );
});

test("rejects Quick CI when the unique current-index gate is omitted", () => {
  const weakenedWorkflow = withoutExactLine(
    quickWorkflow,
    "        run: npm run check:current-index"
  );
  assert.throws(
    () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
    /must run exactly once: npm run check:current-index/u
  );
});

test("runs current-index evidence exactly once and only in its independent job", () => {
  const duplicatedInToolchain = withAdditionalJobCommand(quickWorkflow, "toolchain-and-boundaries", "npm run check:current-index");
  assert.notEqual(duplicatedInToolchain, quickWorkflow);
  assert.throws(
    () => verifyQuickCiGovernance(duplicatedInToolchain, packageJson),
    /must appear exactly once and only in current-index-governance/u
  );
});

test("rejects Quick CI when current-index tests or current Bazi semantic gates are omitted", () => {
  for (const command of [
    "npm run test:current-index",
    "npm run check:bazi-engineering-binding-candidates",
    "npm run check:bazi-binding-freeze-requirements"
  ]) {
    const weakenedWorkflow = withoutExactLine(quickWorkflow, `        run: ${command}`);
    assert.throws(
      () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
      (error) => error instanceof Error
        && error.message.includes(`must run exactly once: ${command}.`),
      command
    );
  }
});

test("rejects Quick CI when independent domain inventories are omitted", () => {
  const weakenedWorkflow = withoutExactLine(
    quickWorkflow,
    "        run: npm run check:independent-domain-inventory"
  );
  assert.throws(
    () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
    /must run exactly once: npm run check:independent-domain-inventory/u
  );
});

test("rejects Quick CI when independent source-binding requirement inventories are omitted", () => {
  const weakenedWorkflow = withoutExactLine(
    quickWorkflow,
    "        run: npm run check:independent-source-inventory"
  );
  assert.throws(
    () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
    /must run exactly once: npm run check:independent-source-inventory/u
  );
});

test("rejects Quick CI continue-on-error and aggregate omissions", () => {
  const continueOnError = quickWorkflow.replace(
    "    timeout-minutes: 30\n\n    steps:",
    "    timeout-minutes: 30\n    continue-on-error: true\n\n    steps:"
  );
  assert.notEqual(continueOnError, quickWorkflow);
  assert.throws(() => verifyQuickCiGovernance(continueOnError, packageJson), /cannot continue on error/u);

  const missingAggregateNeed = withoutExactLine(
    quickWorkflow,
    "      - full-typecheck"
  );
  assert.throws(
    () => verifyQuickCiGovernance(missingAggregateNeed, packageJson),
    /must require every evidence job/u
  );
});

test("aggregate explicitly binds and failure-checks both history and current governance", () => {
  for (const [jobId, resultEnv] of [
    ["history-checkpoint-governance", "HISTORY_CHECKPOINT_GOVERNANCE"],
    ["current-index-governance", "CURRENT_INDEX_GOVERNANCE"]
  ]) {
    const missingNeed = withoutExactLine(quickWorkflow, `      - ${jobId}`);
    assert.throws(
      () => verifyQuickCiGovernance(missingNeed, packageJson),
      /must require every evidence job/u
    );

    const missingResultBinding = withoutExactLine(
      quickWorkflow,
      `          ${resultEnv}: \${{ needs.${jobId}.result }}`
    );
    assert.throws(
      () => verifyQuickCiGovernance(missingResultBinding, packageJson),
      new RegExp(`must bind the exact result environment for ${jobId}`, "u")
    );

    const missingFailureLoopEntry = withoutExactLine(
      quickWorkflow,
      `            \"${jobId}=$${resultEnv}\" \\`
    );
    assert.throws(
      () => verifyQuickCiGovernance(missingFailureLoopEntry, packageJson),
      new RegExp(`failure loop must inspect ${jobId}`, "u")
    );
  }
});

test("requires independent Quick CI heavy jobs to use explicit diagnostic stages", () => {
  for (const [required, weakened] of [
    ["npm run diagnose:typecheck", "npm run typecheck"],
    ["npm run diagnose:vitest", "npm test"],
    ["npm run diagnose:build", "npm run build"]
  ]) {
    const weakenedWorkflow = quickWorkflow.replace(`        run: ${required}`, `        run: ${weakened}`);
    assert.notEqual(weakenedWorkflow, quickWorkflow, required);
    assert.throws(
      () => verifyQuickCiGovernance(weakenedWorkflow, packageJson),
      (error) => error instanceof Error
        && error.message.includes(`must run exactly once: ${required}.`),
      required
    );
  }
});

test("rejects rebuilding inside artifact verification or weakening full typecheck scope", () => {
  const rebuild = quickWorkflow.replace(
    "      - name: Verify built release storage manifest",
    "      - run: npm run build\n\n      - name: Verify built release storage manifest"
  );
  assert.notEqual(rebuild, quickWorkflow);
  assert.throws(() => verifyQuickCiGovernance(rebuild, packageJson), /without rebuilding/u);

  const weakenedPackage = structuredClone(packageJson);
  weakenedPackage.scripts.typecheck = "tsc --noEmit -p tsconfig.json --exclude restricted.ts";
  assert.throws(
    () => verifyQuickCiGovernance(quickWorkflow, weakenedPackage),
    /must not exclude or suppress/u
  );
});

test("the default typecheck coordinator cannot acquire a hidden root pre or post hook", () => {
  assert.equal(packageJson.scripts.typecheck, "node scripts/run-diagnostic-stage.mjs lifecycle typecheck");
  verifyQuickCiGovernance(quickWorkflow, packageJson);
  for (const hook of ["pretypecheck", "posttypecheck"]) {
    const changed = structuredClone(packageJson);
    changed.scripts[hook] = "npm run check:current-governance";
    assert.throws(() => verifyQuickCiGovernance(quickWorkflow, changed), /must not exclude or suppress/u);
  }
});

test("diagnostic stages cannot acquire hidden prerequisites or lose their permission guard", () => {
  for (const stage of ["typecheck", "vitest", "build"]) {
    for (const change of ["pre", "post", "body"]) {
      const changed = structuredClone(packageJson);
      const script = `diagnose:${stage}`;
      if (change === "body") changed.scripts[script] = "node arbitrary-runner.mjs";
      else changed.scripts[`${change}${script}`] = "npm run check:current-governance";
      assert.throws(() => verifyQuickCiGovernance(quickWorkflow, changed), /restricted-graph guard/);
    }
  }
});

test("independent program diagnostics retain both Bazi semantic obligations in the aggregate", () => {
  for (const command of ["npm run check:bazi-domain-release-manifest", "npm run check:bazi-expert-review-packet"]) {
    const changed = quickWorkflow.replace(`        run: ${command}`, "        run: echo omitted");
    assert.throws(() => verifyQuickCiGovernance(changed, packageJson), /must run exactly once/);
  }
  const hidden = structuredClone(packageJson);
  hidden.scripts["check:current-boundaries"] += " && npm run check:new-obligation";
  assert.throws(() => verifyQuickCiGovernance(quickWorkflow, hidden), /retain every current-boundaries obligation/);
});

test("a Bazi semantic failure cannot hide the other semantic result", () => {
  const changed = quickWorkflow.replace(
    "        if: ${{ !cancelled() && steps.install.outcome == 'success' }}",
    "        if: ${{ success() }}"
  );
  assert.throws(() => verifyQuickCiGovernance(changed, packageJson), /Both Bazi semantic checks/);
});

test("complete Node group execution and retained failure reports cannot be silently reduced", () => {
  const changed = structuredClone(packageJson);
  changed.scripts["test:node-release-evidence"] = "node --test scripts/release-evidence.test.mjs";
  assert.throws(() => verifyQuickCiGovernance(quickWorkflow, changed), /whole registered group/);
  const omittedReport = quickWorkflow.replace("          path: test-results/node-groups/", "          path: dist/web");
  assert.throws(() => verifyQuickCiGovernance(omittedReport, packageJson), /preserve execution identities/);
});

test("accepts explicit source access authorization while preserving the prior failure and unobserved results", () => {
  assert.doesNotThrow(() => verifyKnownRestrictedBlockerRegistry(restrictedBlockers));
  assert.deepEqual(restrictedBlockers.blockers[0].restrictedPaths, []);
  assert.deepEqual(restrictedBlockers.blockers[0].previouslyRestrictedPaths, ["apps/web/src/lib/local-user-data-cleanup.ts"]);
  assert.equal(restrictedBlockers.blockers[0].authorization.source, "explicit_user_instruction");
  assert.equal(restrictedBlockers.blockers[0].observation.state, "prior_quick_ci_failure_reported_not_reverified_in_this_registry");
  assert.equal(restrictedBlockers.currentEvidenceLedger.currentCommitDefaultBuild, "not_established_by_this_registry");
});

test("rejects removing the retained no-suppression boundary or promoting unobserved gates", () => {
  const pathWeakened = structuredClone(restrictedBlockers);
  pathWeakened.blockers[0].forbiddenActions = pathWeakened.blockers[0].forbiddenActions.filter(
    (action) => action !== "exclude_from_typecheck"
  );
  assert.throws(() => verifyKnownRestrictedBlockerRegistry(pathWeakened), /boundary has drifted/u);

  const promoted = structuredClone(restrictedBlockers);
  promoted.currentEvidenceLedger.currentCommitDefaultBuild = "passed";
  assert.throws(() => verifyKnownRestrictedBlockerRegistry(promoted), /cannot promote unobserved gates/u);
});

test("source access requires the recorded user scope and grants no expert, rights or deployment authority", () => {
  for (const mutate of [
    (record) => { record.blockers[0].authorization.source = "model_inference"; },
    (record) => { record.blockers[0].authorization.doesNotAuthorize = []; },
    (record) => { delete record.blockers[0].authorization; }
  ]) {
    const changed = structuredClone(restrictedBlockers);
    mutate(changed);
    assert.throws(() => verifyKnownRestrictedBlockerRegistry(changed), /authorization|boundary has drifted/u);
  }
  const promoted = structuredClone(restrictedBlockers);
  promoted.releaseGovernance.publicDeploymentAuthorized = true;
  assert.throws(() => verifyKnownRestrictedBlockerRegistry(promoted), /cannot change release governance/u);
});

for (const command of REQUIRED_MIGRATION_WORKFLOW_COMMANDS) {
  test(`rejects migration workflow when command is missing: ${command}`, () => {
    const weakenedWorkflow = withoutExactLine(workflow, `      - run: ${command}`);
    assert.throws(
      () => verifyMigrationWorkflowGovernance(weakenedWorkflow),
      (error) => error instanceof Error && error.message === `Migration CI is missing ${command}.`
    );
  });
}

for (const requiredPath of REQUIRED_MIGRATION_WORKFLOW_PATHS) {
  test(`rejects migration workflow when pull_request path is missing: ${requiredPath}`, () => {
    const weakenedWorkflow = withoutExactLine(workflow, `      - "${requiredPath}"`);
    assert.throws(
      () => verifyMigrationWorkflowGovernance(weakenedWorkflow),
      (error) => error instanceof Error &&
        error.message === `Migration CI pull_request.paths is missing ${requiredPath}.`
    );
  });
}

test("accepts the checked-in Chrome and Edge release evidence matrix", () => {
  assert.doesNotThrow(() => verifyReleaseBrowserGovernance(decisions, packageJson));
});

test("required release files include the browser result and evidence command closure", () => {
  for (const requiredFile of [
    "apps/web/playwright.release-browser-result.ts",
    "apps/web/playwright.release-browser-strict-reporter.ts",
    "apps/web/playwright.release-backup-artifact.config.ts",
    "apps/web/playwright.release-boot-artifact.config.ts",
    "apps/web/playwright.web-v1-cross-browser.config.ts",
    "apps/web/e2e/web-v1-continuous-flow.spec.ts",
    "apps/web/e2e/service-worker-two-generation.spec.ts",
    "apps/web/playwright.sw-upgrade.config.ts",
    "apps/web/playwright.sw-two-generation-fixture-result.ts",
    "apps/web/playwright.sw-two-generation-fixture-reporter.ts",
    "apps/web/sw-two-generation-artifact-identity.ts",
    "apps/web/sw-two-generation-fixture-source-identity.ts",
    "apps/web/src/lib/release-controller-takeover-write-fence.ts",
    "apps/web/src/lib/release-controller-takeover-write-fence.test.ts",
    "apps/web/src/lib/release-database-coordinator.test.ts",
    "apps/web/src/pages/case-library-page.tsx",
    "apps/web/src/pages/case-library-page.test.tsx",
    "apps/web/src/pwa-files.test.ts",
    "apps/web/src/sw-lifecycle.test.ts",
    "apps/web/vite.sw-upgrade.config.ts",
    "packages/storage/src/index.ts",
    "packages/storage/src/release-write-lock.test.ts",
    "scripts/generate-release-evidence.mjs",
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
    "scripts/deployed-security-headers-lib.mjs",
    "scripts/release-browser-result-evidence.mjs",
    "scripts/rollback-evidence-lib.mjs",
    "scripts/rollback-evidence-schema.mjs",
    "scripts/rollback-evidence.test.mjs",
    "scripts/run-release-evidence-command.mjs",
    "scripts/run-sw-two-generation-fixture.mjs",
    "scripts/sw-two-generation-fixture-contract.test.mjs",
    "scripts/verify-deployed-security-headers.mjs",
    "scripts/verify-deployed-security-headers.test.mjs",
    "scripts/verify-deployed-pwa-evidence.mjs",
    "scripts/verify-deployed-pwa-evidence-v2.mjs",
    "scripts/verify-deployed-pwa-evidence-v3.mjs",
    "scripts/verify-release-evidence.mjs",
    "scripts/verify-rollback-evidence.mjs",
    "docs/release/rollback-evidence.schema.json",
    "docs/release/deployed-pwa-evidence.schema.json",
    "docs/release/deployed-pwa-evidence-policy.v1.json",
    "docs/release/deployed-pwa-evidence-v2.schema.json",
    "docs/release/deployed-pwa-evidence-policy.v2.json",
    "docs/release/deployed-pwa-evidence-v3.schema.json",
    "docs/release/deployed-pwa-evidence-policy.v3.json",
    "docs/release/rollback-evidence-policy.v1.json",
    "docs/release/rollback-actor-trust-registry.v1.json",
    "docs/release/独立v13真实回滚证据机械门-v1-2026-08-26.md",
    "docs/release/独立v13真实HTTPS-PWA证据机械门-v1-2026-08-26.md",
    "docs/release/独立v13真实HTTPS-PWA离线语义候选门-v2-2026-08-26.md",
    "docs/release/SW两代本地夹具证据边界-v1-2026-08-26.md",
    "docs/release/SW两代本地夹具证据边界-v2-2026-08-27.md",
    "docs/release/B阶段同Schema控制器接管写栅栏本地实现证据-2026-08-27.md"
  ]) {
    assert.equal(REQUIRED_RELEASE_FILES.includes(requiredFile), true, requiredFile);
  }
});

test("accepts the exact release browser configs and install prerequisites", () => {
  assert.doesNotThrow(() => verifyReleaseBrowserPlaywrightConfig(
    backupArtifactConfig,
    {
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
    }
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserPlaywrightConfig(
    bootArtifactConfig,
    {
      receiptId: "boot",
      testMatch: ["boot-fail-closed.spec.ts", "database-v8-v9-upgrade.spec.ts"],
      outputDirectoryName: "hakimi-bazi-boot-cross-browser-results",
      timeout: 120_000,
      expectedTestsPerProject: 6
    }
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserPlaywrightConfig(
    pwaCrossBrowserConfig,
    {
      receiptId: "pwa",
      testMatch: "pwa-install-and-offline-cold-start.spec.ts",
      outputDirectoryName: "hakimi-bazi-pwa-cross-browser-results",
      timeout: 120_000,
      expectedTestsPerProject: 1
    }
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserInstallPrerequisite(
    releaseWorkflow,
    "Release workflow"
  ));
  assert.doesNotThrow(() => verifyReleaseBrowserInstallPrerequisite(
    releaseRunbook,
    "Release runbook"
  ));
});

test("cross-schema completion governance accepts the complete checked-in config", () => {
  assert.doesNotThrow(() => verifyCrossSchemaV13V16CompletionGovernance());
  assert.doesNotThrow(() => verifyCrossSchemaV13V16CompletionGovernance(crossSchemaV13V16Config));
});

test("cross-schema completion governance rejects missing reporter or reduced count", () => {
  for (const mutate of [
    (config) => { config.reporter = [["line"]]; },
    (config) => { config.reporter[1][1].expectedTestsPerProject = 12; }
  ]) {
    const config = structuredClone(crossSchemaV13V16Config);
    mutate(config);
    assert.throws(
      () => verifyCrossSchemaV13V16CompletionGovernance(config),
      /Cross-Schema completion requires the existing strict reporter/u
    );
  }
});

test("cross-schema completion governance rejects selectors and repetition fields", () => {
  for (const [key, value] of [
    ["grep", /only-one-title/u],
    ["grepInvert", /omit-one-title/u],
    ["shard", { current: 1, total: 2 }],
    ["repeatEach", 2]
  ]) {
    const config = { ...structuredClone(crossSchemaV13V16Config), [key]: value };
    assert.throws(
      () => verifyCrossSchemaV13V16CompletionGovernance(config),
      /Cross-Schema completion config must retain the full serial matrix/u,
      key
    );
  }
});

test("cross-schema completion governance rejects brand project and execution-policy drift", () => {
  for (const [label, mutate] of [
    ["brand", (config) => { config.projects[0].use.channel = "chrome"; }],
    ["project name", (config) => { config.projects[0].name = "chromium"; }],
    ["missing project", (config) => { config.projects.pop(); }],
    ["project order", (config) => { config.projects.reverse(); }],
    ["retries", (config) => { config.retries = 1; }],
    ["per-project retries", (config) => { config.projects[0].retries = 1; }],
    ["forbidOnly", (config) => { config.forbidOnly = false; }],
    ["failOnFlakyTests", (config) => { config.failOnFlakyTests = false; }]
  ]) {
    const config = structuredClone(crossSchemaV13V16Config);
    mutate(config);
    assert.throws(
      () => verifyCrossSchemaV13V16CompletionGovernance(config),
      /Cross-Schema completion/u,
      label
    );
  }
});

test("cross-schema completion governance preserves the four artifact-bound receipt ids", () => {
  const artifactReceiptIds = ["backup", "boot", "pwa", "web-v1-flow"];
  assert.deepEqual(REQUIRED_RELEASE_BROWSER_RECEIPT_IDS, artifactReceiptIds);
  assert.deepEqual(RELEASE_ARTIFACT_MUTATION_BOUNDARY_RECEIPT_IDS, artifactReceiptIds);
  assert.equal(isReleaseBrowserReceiptId("cross-schema-v13-v16"), false);
  assert.equal(isReleaseBrowserCompletionReceiptId("cross-schema-v13-v16"), true);
});

test("release browser evidence verifies and previews the locked dist/web without rebuilding", () => {
  assert.equal(webPackageJson.scripts["preview:release-artifact"], REQUIRED_RELEASE_ARTIFACT_PREVIEW_SCRIPT);
  assert.doesNotThrow(() => verifyReleaseBrowserGovernance(
    decisions,
    packageJson,
    undefined,
    undefined,
    webPackageJson
  ));
  for (const config of [
    backupArtifactConfig,
    bootArtifactConfig,
    pwaCrossBrowserConfig,
    webV1CrossBrowserConfig
  ]) {
    assert.equal(config.webServer.command, "npm run preview:release-artifact --workspace @hakimi/web");
    assert.equal(config.webServer.command.includes("build"), false);
  }
});

test("accepts the build-lock-browser-stability-generator artifact identity chain", () => {
  assert.doesNotThrow(() => verifyReleaseArtifactIdentityChain(releaseWorkflow, "Release workflow"));
  assert.doesNotThrow(() => verifyReleaseArtifactIdentityChain(releaseRunbook, "Release runbook"));
});

test("requires one non-overwriting formal Release Evidence verification receipt", () => {
  assert.equal(
    REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND,
    "node scripts/verify-release-evidence.mjs --input dist/web/release-evidence.json --receipts tmp/release-evidence-receipts --output tmp/release-evidence-receipts/formal-verification.json"
  );
  assert.equal(
    packageJson.scripts["verify:release-evidence"],
    REQUIRED_FORMAL_RELEASE_VERIFICATION_COMMAND
  );
  assert.doesNotThrow(() => verifyFormalReleaseVerificationReceipt(
    releaseWorkflow,
    "Release workflow"
  ));
  assert.doesNotThrow(() => verifyFormalReleaseVerificationReceipt(
    releaseRunbook,
    "Release runbook"
  ));
  const weakened = releaseWorkflow.replace(
    " --output tmp/release-evidence-receipts/formal-verification.json",
    ""
  );
  assert.notEqual(weakened, releaseWorkflow);
  assert.throws(
    () => verifyFormalReleaseVerificationReceipt(weakened, "Release workflow"),
    /must write exactly one formal Release Evidence verification receipt/u
  );
});

test("accepts the independent rollback policy without adding a pre-deployment receipt", () => {
  assert.doesNotThrow(() => verifyRollbackEvidenceGovernance(
    rollbackPolicy,
    rollbackActorRegistry,
    decisions,
    packageJson
  ));
  for (const [scriptName, command] of Object.entries(REQUIRED_ROLLBACK_EVIDENCE_SCRIPTS)) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
  assert.equal(
    Object.keys(decisions.releaseEvidence.defaultV13RequiredReceiptCommands).some((id) =>
      id.includes("rollback")
    ),
    false
  );
});

test("accepts the closed deployed-PWA contract without adding a pre-deployment receipt", () => {
  assert.deepEqual(
    verifyDeployedPwaEvidenceGovernance(
      deployedPwaPolicy,
      decisions,
      hostingPolicy,
      packageJson
    ),
    {
      status: "contract_only_not_executed",
      executionAdmission: "closed_missing_https_origin",
      requiredBrowserProjects: ["msedge", "chrome"],
      requiredHostVerificationKind: "real-network"
    }
  );
  for (const [scriptName, command] of Object.entries(REQUIRED_DEPLOYED_PWA_EVIDENCE_SCRIPTS)) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
  assert.equal(
    Object.entries(decisions.releaseEvidence.defaultV13RequiredReceiptCommands).some(
      ([id, command]) => [id, ...command].join(" ").includes("deployed-pwa")
    ),
    false
  );
});

test("independently anchors deployed-PWA Schema identity, gates, claims, host, and browser receipts", () => {
  assert.deepEqual(
    verifyDeployedPwaEvidenceSchemaGovernance(deployedPwaSchema),
    {
      schemaId: "https://hakimi.invalid/schemas/deployed-pwa-evidence-v1.json",
      gateNames: [
        "policyBindingsVerified",
        "releaseIdentityVerified",
        "artifactIdentityVerified",
        "formalReleaseEvidenceVerified",
        "realHostReceiptVerified",
        "edgePwaRuntimeReceiptVerified",
        "chromePwaRuntimeReceiptVerified",
        "deploymentReceiptVerified",
        "deployedPwaEngineeringVerified"
      ],
      claimNames: [
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
      ]
    }
  );
  assert.deepEqual(
    REQUIRED_DEPLOYED_PWA_GATE_NAMES,
    deployedPwaSchema.$defs.Gates.required
  );
  assert.deepEqual(
    REQUIRED_DEPLOYED_PWA_CLAIM_NAMES,
    deployedPwaSchema.$defs.Claims.required
  );
});

test("rejects independent deployed-PWA Schema security anchor weakening", () => {
  const mutations = [
    (schema) => { schema.properties.evidenceId.pattern = "^.+$"; },
    (schema) => { schema.$defs.ReleaseIdentity.properties.targetSchema.const = 14; },
    (schema) => { schema.$defs.ReleaseDescriptor.properties.acceptedCommittedMigrationIds.items = { type: "integer" }; },
    (schema) => { schema.$defs.Gates.required.pop(); },
    (schema) => { schema.$defs.Claims.properties.publicReleaseAuthorized = { type: "boolean" }; },
    (schema) => { schema.$defs.Scope.properties.hostVerificationKind.const = "mocked-contract"; },
    (schema) => { schema.$defs.PlatformId.pattern = "^[a-z0-9._-]+$"; },
    (schema) => { schema.$defs.BrowserRuntimeReceiptBinding.properties.controllerSourceEvidenceMethod.const = "remote_fetch"; },
    (schema) => { schema.$defs.BrowserRuntimeReceiptBinding.properties.profileDirectoryExistedBeforeRun = { type: "boolean" }; },
    (schema) => { schema.$defs.BrowserRuntimeReceiptBinding.properties.caseRevisionPath.pattern = "^/cases/.+$"; },
    (schema) => { schema.$defs.HostReceiptBinding.properties.publicDeploymentAuthorized = { type: "boolean" }; }
  ];
  for (const mutate of mutations) {
    const weakened = structuredClone(deployedPwaSchema);
    mutate(weakened);
    assert.throws(() => verifyDeployedPwaEvidenceSchemaGovernance(weakened));
  }
});

test("rejects deployed-PWA promotion, hosting selection, script drift, and pre-deployment aliasing", () => {
  const promotedPolicy = structuredClone(deployedPwaPolicy);
  promotedPolicy.authorizationBoundary.publicReleaseAuthorized = true;
  assert.throws(
    () => verifyDeployedPwaEvidenceGovernance(
      promotedPolicy,
      decisions,
      hostingPolicy,
      packageJson
    ),
    (error) => error?.code === "DEPLOYED_PWA_POLICY_INVALID"
  );

  const selectedPolicy = structuredClone(hostingPolicy);
  selectedPolicy.deploymentPlatform = "fixture-host";
  selectedPolicy.canonicalOrigin = "https://staging.hakimi.dev";
  assert.throws(
    () => verifyDeployedPwaEvidenceGovernance(
      deployedPwaPolicy,
      decisions,
      selectedPolicy,
      packageJson
    ),
    (error) => [
      "DEPLOYED_PWA_HOSTING_POLICY_INVALID",
      "DEPLOYED_PWA_LEDGER_DIVERGENCE"
    ].includes(error?.code)
  );

  const weakenedPackage = structuredClone(packageJson);
  weakenedPackage.scripts["verify:deployed-pwa-evidence"] = "node -e \"process.exit(0)\"";
  assert.throws(
    () => verifyDeployedPwaEvidenceGovernance(
      deployedPwaPolicy,
      decisions,
      hostingPolicy,
      weakenedPackage
    ),
    /package script mismatch/u
  );

  const aliasedDecisions = structuredClone(decisions);
  aliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["real-host"] = [
    "npm",
    "run",
    "verify:deployed-pwa-evidence"
  ];
  assert.throws(
    () => verifyDeployedPwaEvidenceGovernance(
      deployedPwaPolicy,
      aliasedDecisions,
      hostingPolicy,
      packageJson
    ),
    /must remain outside/u
  );
});

test("accepts the offline-only deployed-PWA v2 governance contract outside pre-deployment receipts", () => {
  assert.deepEqual(
    verifyDeployedPwaEvidenceV2Governance(
      deployedPwaV2Policy,
      decisions,
      hostingPolicy,
      packageJson
    ),
    {
      status: "offline_semantic_verifier_only_not_admitted",
      executionAdmission: "closed_missing_https_origin",
      verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
      resultClass: "candidate_internal_consistency_only",
      receiptTrustClass: "untrusted_candidate_envelopes",
      requiredBrowserProjects: ["msedge", "chrome"]
    }
  );
  assert.equal(deployedPwaV2Policy.terminalBoundary.status, "not_admitted");
  assert.equal(deployedPwaV2Policy.terminalBoundary.cliExitCode, 1);
  assert.deepEqual(REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS, {
    "test:deployed-pwa-evidence-v2": "node --test scripts/deployed-pwa-evidence-v2.test.mjs",
    "verify:deployed-pwa-evidence-v2": "node scripts/verify-deployed-pwa-evidence-v2.mjs",
    "test:release-evidence":
      "node --test scripts/release-evidence.test.mjs scripts/verify-deployed-security-headers.test.mjs scripts/rollback-evidence.test.mjs scripts/deployed-pwa-evidence.test.mjs scripts/deployed-pwa-evidence-v2.test.mjs scripts/deployed-pwa-evidence-v3.test.mjs"
  });
  for (const [scriptName, command] of Object.entries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS
  )) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
  assert.equal(
    Object.entries(decisions.releaseEvidence.defaultV13RequiredReceiptCommands).some(
      ([id, command]) => /deployed[-_ ]pwa|hpwa2|pwa[-_]v2/u.test(
        [id, ...command].join(" ").toLowerCase()
      )
    ),
    false
  );
});

test("anchors deployed-PWA v2 fixed-v13, Edge/Chrome, route, attachment, and gate Schema", () => {
  const governance = verifyDeployedPwaEvidenceV2SchemaGovernance(deployedPwaV2Schema);
  assert.deepEqual(governance, {
    schemaId: "https://hakimi.invalid/schemas/deployed-pwa-evidence-v2.json",
    status: "not_admitted",
    semanticGateNames: [
      "policyBindingsVerified",
      "releaseIdentityVerified",
      "artifactIdentityVerified",
      "untrustedFormalReceiptEnvelopeConsistent",
      "untrustedHostReceiptEnvelopeConsistent",
      "untrustedEdgeBrowserEnvelopeConsistent",
      "untrustedChromeBrowserEnvelopeConsistent",
      "serviceWorkerCandidateBytesConsistent",
      "routeAndCaseRevisionCandidateBytesConsistent",
      "evidenceDigestVerified",
      "semanticConsistencyVerified"
    ],
    admissionGateNames: [
      "auditedHostingPlatformSelected",
      "canonicalHttpsOriginConfigured",
      "formalArtifactIdentityPackageAvailable",
      "trustedRealHostReceiptWriterVerified",
      "trustedRealHostReceiptParserVerified",
      "trustedPwaRuntimeReceiptWriterVerified",
      "trustedPwaRuntimeReceiptParserVerified",
      "trustedProviderDeploymentReceiptParserVerified",
      "externalDeploymentExecutionAuthorized",
      "executionAdmissionOpen",
      "deployedPwaEngineeringVerified",
      "strictGatePassed"
    ],
    claimNames: [
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
    ],
    routeIds: [
      "online-root",
      "offline-settings-data",
      "offline-case-revision",
      "offline-help-cold-start",
      "offline-help-reload"
    ],
    attachmentRoles: [
      "browser-version",
      "profile-preflight",
      "network-events",
      "controller-script-meta",
      "controller-source",
      "remote-service-worker-body",
      "case-revision-before",
      "case-revision-after"
    ]
  });

  assert.deepEqual(deployedPwaV2Schema.$defs.ReleaseIdentity, {
    type: "object",
    additionalProperties: false,
    required: ["channel", "dbGeneration", "targetSchema", "migrationId"],
    properties: {
      channel: { const: "default-v13" },
      dbGeneration: { const: "legacy-v13" },
      targetSchema: { const: 13 },
      migrationId: { const: null }
    }
  });
  const descriptorProperties = deployedPwaV2Schema.$defs.ReleaseDescriptor.properties;
  assert.deepEqual(
    {
      protocolVersion: descriptorProperties.protocolVersion.const,
      dbGeneration: descriptorProperties.dbGeneration.const,
      databaseName: descriptorProperties.databaseName.const,
      targetSchema: descriptorProperties.targetSchema.const,
      minReadableSchema: descriptorProperties.minReadableSchema.const,
      maxReadableSchema: descriptorProperties.maxReadableSchema.const,
      migrationId: descriptorProperties.migrationId.const,
      acceptedCommittedMigrationIds: descriptorProperties.acceptedCommittedMigrationIds,
      sourceGeneration: descriptorProperties.sourceGeneration.const,
      sourceDatabaseName: descriptorProperties.sourceDatabaseName.const,
      sourceSchema: descriptorProperties.sourceSchema.const
    },
    {
      protocolVersion: 1,
      dbGeneration: "legacy-v13",
      databaseName: "hakimi-bazi-research",
      targetSchema: 13,
      minReadableSchema: 13,
      maxReadableSchema: 13,
      migrationId: null,
      acceptedCommittedMigrationIds: {
        type: "array",
        items: { const: null },
        minItems: 1,
        maxItems: 1,
        uniqueItems: true
      },
      sourceGeneration: null,
      sourceDatabaseName: null,
      sourceSchema: null
    }
  );

  assert.deepEqual(
    {
      browserProjects: deployedPwaV2Schema.$defs.Scope.properties.browserProjects,
      edgeProject: deployedPwaV2Schema.$defs.EdgeBrowserReceipt.properties.projectName,
      edgeChannel: deployedPwaV2Schema.$defs.EdgeBrowserReceipt.properties.browserChannel,
      chromeProject: deployedPwaV2Schema.$defs.ChromeBrowserReceipt.properties.projectName,
      chromeChannel: deployedPwaV2Schema.$defs.ChromeBrowserReceipt.properties.browserChannel
    },
    {
      browserProjects: {
        type: "array",
        items: { enum: ["msedge", "chrome"] },
        minItems: 2,
        maxItems: 2,
        uniqueItems: true
      },
      edgeProject: { const: "msedge" },
      edgeChannel: { const: "msedge" },
      chromeProject: { const: "chrome" },
      chromeChannel: { const: "chrome" }
    }
  );
  assert.deepEqual(
    deployedPwaV2Schema.$defs.SemanticGates.properties,
    Object.fromEntries(governance.semanticGateNames.map((name) => [name, { type: "boolean" }]))
  );
  assert.deepEqual(
    deployedPwaV2Schema.$defs.AdmissionGates.properties,
    Object.fromEntries(governance.admissionGateNames.map((name) => [name, { const: false }]))
  );
  assert.deepEqual(
    deployedPwaV2Schema.$defs.Claims.properties,
    Object.fromEntries(governance.claimNames.map((name) => [name, { const: false }]))
  );
  assert.deepEqual(
    deployedPwaV2Schema.$defs.RouteObservation.properties.routeId.enum,
    governance.routeIds
  );
  assert.deepEqual(
    deployedPwaV2Schema.$defs.AttachmentBinding.properties.role.enum,
    governance.attachmentRoles
  );
  assert.deepEqual(
    {
      routesMin: deployedPwaV2Schema.$defs.BrowserRuntimeReceiptCore
        .properties.routeObservations.minItems,
      routesMax: deployedPwaV2Schema.$defs.BrowserRuntimeReceiptCore
        .properties.routeObservations.maxItems,
      attachmentsMin: deployedPwaV2Schema.$defs.BrowserRuntimeReceiptCore
        .properties.attachments.minItems,
      attachmentsMax: deployedPwaV2Schema.$defs.BrowserRuntimeReceiptCore
        .properties.attachments.maxItems
    },
    { routesMin: 5, routesMax: 5, attachmentsMin: 8, attachmentsMax: 8 }
  );
});

test("rejects deployed-PWA v2 Schema admission, claim, vocabulary, and status promotion", () => {
  const mutations = [
    (schema) => { schema.properties.status.const = "passed"; },
    (schema) => { schema.properties.executionAdmission.const = "open"; },
    (schema) => { schema.$defs.ReleaseIdentity.properties.targetSchema.const = 14; },
    (schema) => { schema.$defs.FormalReceiptBinding.properties.status.const = "failed"; },
    (schema) => { schema.$defs.Scope.properties.browserProjects.items.enum.reverse(); },
    (schema) => { schema.$defs.EdgeBrowserReceipt.properties.projectName.const = "chrome"; },
    (schema) => { schema.$defs.ArtifactPath.pattern = "^[A-Za-z0-9._/-]+$"; },
    (schema) => { schema.$defs.RouteObservation.properties.routeId.enum.pop(); },
    (schema) => { schema.$defs.AttachmentBinding.properties.role.enum.pop(); },
    (schema) => { schema.$defs.SemanticGates.required.pop(); },
    (schema) => { schema.$defs.AdmissionGates.properties.executionAdmissionOpen.const = true; },
    (schema) => { schema.$defs.Claims.properties.publicReleaseAuthorized.const = true; }
  ];
  for (const mutate of mutations) {
    const weakened = structuredClone(deployedPwaV2Schema);
    mutate(weakened);
    assert.throws(() => verifyDeployedPwaEvidenceV2SchemaGovernance(weakened));
  }
});

test("rejects deployed-PWA v2 policy promotion and execution admission opening", () => {
  const mutations = [
    (policy) => { policy.status = "passed"; },
    (policy) => { policy.executionAdmission.status = "open"; },
    (policy) => { policy.semanticVerification.canOpenExecutionAdmission = true; },
    (policy) => { policy.authorizationBoundary.publicReleaseAuthorized = true; },
    (policy) => { policy.terminalBoundary.status = "passed"; },
    (policy) => { policy.terminalBoundary.strictGatePassed = true; }
  ];
  for (const mutate of mutations) {
    const promoted = structuredClone(deployedPwaV2Policy);
    mutate(promoted);
    assert.throws(
      () => verifyDeployedPwaEvidenceV2Governance(
        promoted,
        decisions,
        hostingPolicy,
        packageJson
      ),
      (error) => error?.code === "DEPLOYED_PWA_V2_POLICY_INVALID"
    );
  }
});

test("rejects deployed-PWA v2 exit-zero script drift and pre-deployment receipt admission", () => {
  for (const scriptName of Object.keys(REQUIRED_DEPLOYED_PWA_EVIDENCE_V2_SCRIPTS)) {
    const weakenedPackage = structuredClone(packageJson);
    weakenedPackage.scripts[scriptName] = "node -e \"process.exit(0)\"";
    assert.throws(
      () => verifyDeployedPwaEvidenceV2Governance(
        deployedPwaV2Policy,
        decisions,
        hostingPolicy,
        weakenedPackage
      ),
      (error) => error instanceof Error
        && error.message === `Deployed-PWA v2 package script mismatch: ${scriptName}.`
    );
  }

  const aliasedDecisions = structuredClone(decisions);
  aliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["candidate-consistency"] = [
    "npm",
    "run",
    "verify:deployed-pwa-evidence-v2"
  ];
  assert.throws(
    () => verifyDeployedPwaEvidenceV2Governance(
      deployedPwaV2Policy,
      aliasedDecisions,
      hostingPolicy,
      packageJson
    ),
    /exact audited allowlist|must remain outside formal pre-deployment receipts/u
  );

  const indirectlyAliasedDecisions = structuredClone(decisions);
  indirectlyAliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["evidence-tooling"] = [
    "npm",
    "run",
    "check:candidate"
  ];
  assert.throws(
    () => verifyDeployedPwaEvidenceV2Governance(
      deployedPwaV2Policy,
      indirectlyAliasedDecisions,
      hostingPolicy,
      packageJson
    ),
    /exact audited allowlist/u
  );
});

test("accepts and freezes the offline-only deployed-PWA v3 governance contract", () => {
  assert.deepEqual(
    verifyDeployedPwaEvidenceV3Governance(
      deployedPwaV3Policy,
      decisions,
      hostingPolicy,
      packageJson
    ),
    {
      policyId: "hakimi.web-v1.deployed-pwa-evidence/v3",
      status: "offline_semantic_verifier_only_not_admitted",
      executionAdmission: "closed_missing_https_origin",
      verificationKind: "offline-no-git-no-network-no-browser-no-deployment",
      resultClass: "candidate_internal_consistency_only",
      receiptTrustClass: "untrusted_candidate_envelopes",
      requiredBrowserProjects: ["msedge", "chrome"],
      requiredAttachmentRoles: [
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
      ],
      manifestSemanticGate: "pwaInstallabilityAndManifestCandidateConsistent",
      authorizationBoundary: {
        externalDeploymentExecutionAuthorized: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        authorizationMayNotBeDerivedFromEngineeringEvidence: true
      },
      terminalBoundary: {
        status: "not_admitted",
        executionAdmission: "closed_missing_https_origin",
        strictGatePassed: false,
        deployedPwaEngineeringVerified: false,
        cliExitCode: 1,
        futureOpeningRequiresNewPolicyVersion: true
      }
    }
  );
  assert.equal(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_MANIFEST_SEMANTIC_GATE,
    "pwaInstallabilityAndManifestCandidateConsistent"
  );
  assert.deepEqual(REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_ATTACHMENT_ROLES, [
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
  assert.deepEqual(REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_AUTHORIZATION_BOUNDARY, {
    externalDeploymentExecutionAuthorized: false,
    publicDeploymentAuthorized: false,
    publicReleaseAuthorized: false,
    authorizationMayNotBeDerivedFromEngineeringEvidence: true
  });
  assert.deepEqual(REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS, {
    "test:deployed-pwa-evidence-v3": "node --test scripts/deployed-pwa-evidence-v3.test.mjs",
    "verify:deployed-pwa-evidence-v3": "node scripts/verify-deployed-pwa-evidence-v3.mjs",
    "test:release-evidence":
      "node --test scripts/release-evidence.test.mjs scripts/verify-deployed-security-headers.test.mjs scripts/rollback-evidence.test.mjs scripts/deployed-pwa-evidence.test.mjs scripts/deployed-pwa-evidence-v2.test.mjs scripts/deployed-pwa-evidence-v3.test.mjs"
  });
  for (const [scriptName, command] of Object.entries(
    REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS
  )) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
  const fixtureExtractionSources = {
    deployedPwaV3TestSource,
    compositionFixtureSource: deployedPwaHostProviderCompositionFixtureSource,
    compositionTestSource: deployedPwaHostProviderCompositionTestSource
  };
  assert.deepEqual(
    verifyDeployedPwaV3TestFixtureExtractionGovernance(fixtureExtractionSources),
    {
      fixtureModule: "scripts/deployed-pwa-evidence-v3.test-fixture.mjs",
      consumers: [
        "deployed-PWA v3 test",
        "deployed-PWA host/provider composition fixture",
        "deployed-PWA host/provider composition test"
      ],
      directEntryGuardAbsent: true,
      testModuleImportsAbsent: true
    }
  );
  for (const sourceKey of Object.keys(fixtureExtractionSources)) {
    assert.throws(
      () => verifyDeployedPwaV3TestFixtureExtractionGovernance({
        ...fixtureExtractionSources,
        [sourceKey]: fixtureExtractionSources[sourceKey].replace(
          "./deployed-pwa-evidence-v3.test-fixture.mjs",
          "./missing-deployed-pwa-evidence-v3.test-fixture.mjs"
        )
      }),
      /must import the independent deployed-PWA v3 test fixture module/u,
      sourceKey
    );
    assert.throws(
      () => verifyDeployedPwaV3TestFixtureExtractionGovernance({
        ...fixtureExtractionSources,
        [sourceKey]: `${fixtureExtractionSources[sourceKey]}\nimport "./deployed-pwa-evidence-v3.test.mjs";\n`
      }),
      /must not import the deployed-PWA v3 test module/u,
      sourceKey
    );
  }
  assert.throws(
    () => verifyDeployedPwaV3TestFixtureExtractionGovernance({
      ...fixtureExtractionSources,
      deployedPwaV3TestSource:
        `${deployedPwaV3TestSource}\nif (process.argv[1]) pathToFileURL(process.argv[1]);\n`
    }),
    /must register unconditionally without a direct-entry guard/u
  );
});

test("anchors deployed-PWA v3 manifest, 10-role, fixed-v13, and closed Schema", () => {
  const governance = verifyDeployedPwaEvidenceV3SchemaGovernance(deployedPwaV3Schema);
  assert.deepEqual(governance, {
    schemaId: "https://hakimi.invalid/schemas/deployed-pwa-evidence-v3.json",
    status: "not_admitted",
    manifestSemanticGate: "pwaInstallabilityAndManifestCandidateConsistent",
    semanticGateNames: [
      "policyBindingsVerified",
      "releaseIdentityVerified",
      "artifactIdentityVerified",
      "untrustedFormalReceiptEnvelopeConsistent",
      "untrustedHostReceiptEnvelopeConsistent",
      "untrustedEdgeBrowserEnvelopeConsistent",
      "untrustedChromeBrowserEnvelopeConsistent",
      "serviceWorkerCandidateBytesConsistent",
      "pwaInstallabilityAndManifestCandidateConsistent",
      "routeAndCaseRevisionCandidateBytesConsistent",
      "evidenceDigestVerified",
      "semanticConsistencyVerified"
    ],
    admissionGateNames: [
      "auditedHostingPlatformSelected",
      "canonicalHttpsOriginConfigured",
      "formalArtifactIdentityPackageAvailable",
      "trustedRealHostReceiptWriterVerified",
      "trustedRealHostReceiptParserVerified",
      "trustedPwaRuntimeReceiptWriterVerified",
      "trustedPwaRuntimeReceiptParserVerified",
      "trustedProviderDeploymentReceiptParserVerified",
      "externalDeploymentExecutionAuthorized",
      "executionAdmissionOpen",
      "deployedPwaEngineeringVerified",
      "strictGatePassed"
    ],
    claimNames: [
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
    ],
    routeIds: [
      "online-root",
      "offline-settings-data",
      "offline-case-revision",
      "offline-help-cold-start",
      "offline-help-reload"
    ],
    attachmentRoles: [
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
    ]
  });
  assert.deepEqual(deployedPwaV3Schema.$defs.BrowserManifestIdentity.properties, {
    manifestUrl: { $ref: "#/$defs/HttpsUrl" },
    installabilityEvidenceMethod: { const: "cdp_page_get_installability_errors_v1" },
    processedManifestEvidenceMethod: { const: "cdp_page_get_app_manifest_v1" },
    remoteManifestEvidenceMethod: { const: "browser_context_request_identity_v1" },
    installabilityErrorCount: { const: 0 },
    manifestParseErrorCount: { const: 0 },
    browserManifestContentSha256: { $ref: "#/$defs/Sha256" },
    manifestSemanticProjectionSha256: { $ref: "#/$defs/Sha256" },
    remoteManifestSha256: { $ref: "#/$defs/Sha256" }
  });
  assert.deepEqual(
    deployedPwaV3Schema.$defs.AdmissionGates.properties,
    Object.fromEntries(governance.admissionGateNames.map((name) => [name, { const: false }]))
  );
  assert.deepEqual(
    deployedPwaV3Schema.$defs.Claims.properties,
    Object.fromEntries(governance.claimNames.map((name) => [name, { const: false }]))
  );
  assert.deepEqual(
    {
      manifestRef: deployedPwaV3Schema.$defs.BrowserRuntimeReceiptCore.properties.manifest.$ref,
      routesMin: deployedPwaV3Schema.$defs.BrowserRuntimeReceiptCore
        .properties.routeObservations.minItems,
      routesMax: deployedPwaV3Schema.$defs.BrowserRuntimeReceiptCore
        .properties.routeObservations.maxItems,
      attachmentsMin: deployedPwaV3Schema.$defs.BrowserRuntimeReceiptCore
        .properties.attachments.minItems,
      attachmentsMax: deployedPwaV3Schema.$defs.BrowserRuntimeReceiptCore
        .properties.attachments.maxItems
    },
    {
      manifestRef: "#/$defs/BrowserManifestIdentity",
      routesMin: 5,
      routesMax: 5,
      attachmentsMin: 10,
      attachmentsMax: 10
    }
  );
});

test("rejects deployed-PWA v3 policy, Schema, and package-script promotion", () => {
  const policyMutations = [
    (policy) => { policy.status = "passed"; },
    (policy) => { policy.executionAdmission.status = "open"; },
    (policy) => { policy.requiredBrowserAttachmentRoles.pop(); },
    (policy) => { policy.authorizationBoundary.publicReleaseAuthorized = true; },
    (policy) => { policy.terminalBoundary.strictGatePassed = true; }
  ];
  for (const mutate of policyMutations) {
    const promoted = structuredClone(deployedPwaV3Policy);
    mutate(promoted);
    assert.throws(
      () => verifyDeployedPwaEvidenceV3Governance(
        promoted,
        decisions,
        hostingPolicy,
        packageJson
      ),
      (error) => error?.code === "DEPLOYED_PWA_V3_POLICY_INVALID"
    );
  }

  const schemaMutations = [
    (schema) => { schema.properties.status.const = "passed"; },
    (schema) => { schema.$defs.SemanticGates.required.splice(8, 1); },
    (schema) => { schema.$defs.AdmissionGates.properties.executionAdmissionOpen.const = true; },
    (schema) => { schema.$defs.Claims.properties.publicReleaseAuthorized.const = true; },
    (schema) => { schema.$defs.AttachmentBinding.properties.role.enum.pop(); },
    (schema) => { schema.$defs.BrowserManifestIdentity.properties.installabilityErrorCount.const = 1; },
    (schema) => { schema.$defs.BrowserRuntimeReceiptCore.properties.attachments.maxItems = 9; }
  ];
  for (const mutate of schemaMutations) {
    const weakened = structuredClone(deployedPwaV3Schema);
    mutate(weakened);
    assert.throws(() => verifyDeployedPwaEvidenceV3SchemaGovernance(weakened));
  }

  for (const scriptName of Object.keys(REQUIRED_DEPLOYED_PWA_EVIDENCE_V3_SCRIPTS)) {
    const weakenedPackage = structuredClone(packageJson);
    weakenedPackage.scripts[scriptName] = "node -e \"process.exit(0)\"";
    assert.throws(
      () => verifyDeployedPwaEvidenceV3Governance(
        deployedPwaV3Policy,
        decisions,
        hostingPolicy,
        weakenedPackage
      ),
      (error) => error instanceof Error
        && error.message === `Deployed-PWA v3 package script mismatch: ${scriptName}.`
    );
  }
});

test("rejects direct and recursive v2/v3 candidate aliases in formal receipts", () => {
  const variants = [
    {
      version: "v2",
      policy: deployedPwaV2Policy,
      verify: verifyDeployedPwaEvidenceV2Governance,
      verifierScript: "verify:deployed-pwa-evidence-v2"
    },
    {
      version: "v3",
      policy: deployedPwaV3Policy,
      verify: verifyDeployedPwaEvidenceV3Governance,
      verifierScript: "verify:deployed-pwa-evidence-v3"
    }
  ];
  for (const variant of variants) {
    const directReceiptId = `candidate-${variant.version}`;
    const directlyAliasedDecisions = structuredClone(decisions);
    directlyAliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands[directReceiptId] = [
      "npm",
      "run",
      variant.verifierScript
    ];
    assert.throws(
      () => variant.verify(
        variant.policy,
        directlyAliasedDecisions,
        hostingPolicy,
        packageJson
      ),
      (error) => error instanceof Error && error.message
        === "Deployed-PWA v2/v3 candidate tooling must remain outside formal pre-deployment "
          + `receipts, including direct and indirect package-script aliases: ${directReceiptId}.`
    );

    const indirectlyAliasedPackage = structuredClone(packageJson);
    indirectlyAliasedPackage.scripts[`check:candidate-${variant.version}`] =
      `npm run check:candidate-inner-${variant.version}`;
    indirectlyAliasedPackage.scripts[`check:candidate-inner-${variant.version}`] =
      `npm run ${variant.verifierScript}`;
    const indirectlyAliasedDecisions = structuredClone(decisions);
    indirectlyAliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["evidence-tooling"] = [
      "npm",
      "run",
      `check:candidate-${variant.version}`
    ];
    assert.throws(
      () => variant.verify(
        variant.policy,
        indirectlyAliasedDecisions,
        hostingPolicy,
        indirectlyAliasedPackage
      ),
      (error) => error instanceof Error && error.message
        === "Deployed-PWA v2/v3 candidate tooling must remain outside formal pre-deployment "
          + "receipts, including direct and indirect package-script aliases: evidence-tooling."
    );
  }
});

test("accepts the independent Edge/Chrome SW two-generation fixture contract", () => {
  assert.deepEqual(
    swTwoGenerationFixtureGovernance(),
    {
      fixtureContractId: "sw_two_generation_fixture_contract_v3",
      status: "static_contract_only_not_executed",
      expectedProjectNames: ["msedge", "chrome"],
      expectedScenarioIds: [
        "healthy_b_controlled_takeover_with_research_db_write_fence",
        "old_shell_cache_fallback_under_b_controller",
        "candidate_install_failure_keeps_a_active"
      ],
      expectedTestsPerProject: 3,
      criticalSourceScope: "bounded_critical_source_set_not_transitive_closure",
      artifactIdentityType: "sw_two_generation_local_fixture_artifact_set",
      artifactGenerationNames: ["stable-a", "healthy-b", "broken-b"],
      sharedArtifactSetRunnerOwned: true,
      criticalSourceFilesBound: 21,
      productSourceFilesBound: 9,
      criticalSourceSetCanonicalSha256:
        REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256,
      formalReleaseReceipt: false,
      rollbackEvidence: false
    }
  );
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_TWO_GENERATION_FIXTURE_SCRIPTS
  )) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
});

test("rejects SW fixture matrix weakening, script drift, and formal receipt aliasing", () => {
  const missingChrome = structuredClone(swTwoGenerationFixtureConfig);
  missingChrome.projects = missingChrome.projects.filter((project) => project.name !== "chrome");
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureConfig: missingChrome }),
    /exact serial Edge\/Chrome contract/u
  );

  const retriesEnabled = structuredClone(swTwoGenerationFixtureConfig);
  retriesEnabled.retries = 1;
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureConfig: retriesEnabled }),
    /exact serial Edge\/Chrome contract/u
  );

  const driftedTestDir = structuredClone(swTwoGenerationFixtureConfig);
  driftedTestDir.testDir = "./other-e2e";
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureConfig: driftedTestDir }),
    /exact serial Edge\/Chrome contract/u
  );

  const driftedOutputDir = structuredClone(swTwoGenerationFixtureConfig);
  driftedOutputDir.outputDir = path.join(workspaceRoot, "tmp", "sw-fixture-results");
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureConfig: driftedOutputDir }),
    /exact serial Edge\/Chrome contract/u
  );

  const sameBasenameReporter = structuredClone(swTwoGenerationFixtureConfig);
  sameBasenameReporter.reporter[1][0] = path.join(
    workspaceRoot,
    "tmp",
    "playwright.sw-two-generation-fixture-reporter.ts"
  );
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureConfig: sameBasenameReporter }),
    /exact serial Edge\/Chrome contract/u
  );

  const weakenedPackage = structuredClone(packageJson);
  weakenedPackage.scripts["test:sw-two-generation-fixture-contract"] =
    "node -e \"process.exit(0)\"";
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ packageJson: weakenedPackage }),
    /package script mismatch/u
  );

  const aliasedDecisions = structuredClone(decisions);
  aliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands["sw-upgrade"] = [
    "npm",
    "run",
    "test:e2e:sw-upgrade"
  ];
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ decisions: aliasedDecisions }),
    /must remain outside/u
  );

  const hardcodedEdgeSource = swTwoGenerationFixtureSource.replace(
    "releasePersistentContextOptionsForProject(projectName)",
    '{ channel: "msedge" }'
  );
  assert.notEqual(hardcodedEdgeSource, swTwoGenerationFixtureSource);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureSource: hardcodedEdgeSource }),
    /runner-owned branded snapshot/u
  );
});

test("rejects SW fixture shared-artifact ownership or byte-snapshot weakening", () => {
  const runnerBuildsAfterBrowserStart = swTwoGenerationFixtureRunnerSource.replace(
    "const startingArtifactSetIdentity = (await buildSharedArtifactSet(artifactRoot)).identity;",
    "const startingArtifactSetIdentity = null;"
  );
  assert.notEqual(runnerBuildsAfterBrowserStart, swTwoGenerationFixtureRunnerSource);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ runnerSource: runnerBuildsAfterBrowserStart }),
    /one shared artifact build/u
  );

  const specBuildsItsOwnArtifact = `${swTwoGenerationFixtureSource}\nexecFile(viteCli, [\"build\"]);`;
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureSource: specBuildsItsOwnArtifact }),
    /without building or reading response bytes from disk/u
  );

  for (const fixtureSource of [
    `${swTwoGenerationFixtureSource}\nmkdtemp(artifactRoot);`,
    swTwoGenerationFixtureSource.replace(
      'const profileRoot = await mkdtemp(path.join(tmpdir(), "hb-sw-"));',
      'const profileRoot = await mkdtemp(path.join(artifactRoot, "hb-sw-"));'
    )
  ]) {
    assert.notEqual(fixtureSource, swTwoGenerationFixtureSource);
    assert.throws(
      () => swTwoGenerationFixtureGovernance({ fixtureSource }),
      /without building or reading response bytes from disk/u
    );
  }

  const specReadsResponseFromDisk = swTwoGenerationFixtureSource.replace(
    "let bytes = readSwTwoGenerationArtifactSnapshot(generation, artifactPath);",
    "let bytes = readFile(artifactPath);"
  );
  assert.notEqual(specReadsResponseFromDisk, swTwoGenerationFixtureSource);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ fixtureSource: specReadsResponseFromDisk }),
    /without building or reading response bytes from disk/u
  );

  const unbrandedArtifactSnapshots = swTwoGenerationArtifactIdentityModuleSource.replace(
    "const artifactSnapshotStates = new WeakMap<object, ArtifactSnapshotState>();",
    "const artifactSnapshotStates = new Map<object, ArtifactSnapshotState>();"
  );
  assert.notEqual(unbrandedArtifactSnapshots, swTwoGenerationArtifactIdentityModuleSource);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({
      artifactIdentityModuleSource: unbrandedArtifactSnapshots
    }),
    /hardened branded byte snapshots/u
  );

  const reporterTrustsOnlyTheEnvironmentDigest = swTwoGenerationFixtureReporterSource.replace(
    "const closingArtifactSet = await snapshotSwTwoGenerationArtifactSetDirectory(this.artifactRoot);",
    "const closingArtifactSet = { identity: { canonicalSha256: this.artifactSetSha256 } };"
  );
  assert.notEqual(reporterTrustsOnlyTheEnvironmentDigest, swTwoGenerationFixtureReporterSource);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ reporterSource: reporterTrustsOnlyTheEnvironmentDigest }),
    /reporter no longer enforces/u
  );
});

test("rejects SW fixture source-byte, identity-module, and critical-set rebinding", () => {
  assert.equal(
    sha256(swTwoGenerationFixtureCriticalSourceIdentityModuleSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_IDENTITY_MODULE_SHA256
  );
  assert.equal(
    swTwoGenerationFixtureCriticalSourceIdentity.canonicalSha256,
    REQUIRED_SW_TWO_GENERATION_CRITICAL_SOURCE_SET_SHA256
  );
  for (const [field, source] of [
    ["fixtureSource", swTwoGenerationFixtureSource],
    ["reporterSource", swTwoGenerationFixtureReporterSource],
    ["artifactIdentityModuleSource", swTwoGenerationArtifactIdentityModuleSource],
    ["runnerSource", swTwoGenerationFixtureRunnerSource]
  ]) {
    assert.throws(
      () => swTwoGenerationFixtureGovernance({ [field]: `${source}\n// retained-token byte drift` }),
      /not byte-bound/u,
      field
    );
  }
  assert.throws(
    () => swTwoGenerationFixtureGovernance({
      criticalSourceIdentityModuleSource:
        `${swTwoGenerationFixtureCriticalSourceIdentityModuleSource}\n// identity drift`
    }),
    /identity module drifted/u
  );
  const driftedIdentity = structuredClone(swTwoGenerationFixtureCriticalSourceIdentity);
  driftedIdentity.files.find((entry) =>
    entry.path === "apps/web/src/lib/release-controller-takeover-write-fence.ts"
  ).rawSha256 = "0".repeat(64);
  assert.throws(
    () => swTwoGenerationFixtureGovernance({ criticalSourceIdentity: driftedIdentity }),
    /critical source set drifted/u
  );
});

test("rejects rollback policy promotion, actor invention, script drift, and pre-deployment aliasing", () => {
  const promotedPolicy = structuredClone(rollbackPolicy);
  promotedPolicy.authorizationGates.releaseReady = true;
  assert.throws(
    () => verifyRollbackEvidenceGovernance(promotedPolicy, rollbackActorRegistry, decisions, packageJson),
    /cannot authorize/u
  );

  const openedExecution = structuredClone(rollbackPolicy);
  openedExecution.executionAdmission.status = "open";
  openedExecution.executionAdmission.browserCdpControllerReceiptParserVerified = true;
  assert.throws(
    () => verifyRollbackEvidenceGovernance(openedExecution, rollbackActorRegistry, decisions, packageJson),
    /must remain closed/u
  );

  const inventedActors = structuredClone(rollbackActorRegistry);
  inventedActors.actors.push({ actorId: "invented" });
  assert.throws(
    () => verifyRollbackEvidenceGovernance(rollbackPolicy, inventedActors, decisions, packageJson),
    /must remain explicitly unconfigured/u
  );

  const weakenedPackage = structuredClone(packageJson);
  weakenedPackage.scripts["test:rollback-evidence"] = "node -e \"process.exit(0)\"";
  assert.throws(
    () => verifyRollbackEvidenceGovernance(rollbackPolicy, rollbackActorRegistry, decisions, weakenedPackage),
    /package script mismatch/u
  );

  const aliasedDecisions = structuredClone(decisions);
  aliasedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands.rollback = [
    "node",
    "scripts/verify-rollback-evidence.mjs"
  ];
  assert.throws(
    () => verifyRollbackEvidenceGovernance(rollbackPolicy, rollbackActorRegistry, aliasedDecisions, packageJson),
    /must remain outside/u
  );
});

test("freezes the authority-free rollback phase hash-chain helper behind formal admission", () => {
  const inputs = {
    rollbackLibSource: rollbackEvidenceLibSource,
    rollbackVerifierSource: rollbackEvidenceVerifierSource,
    rollbackProviderSequenceCompositionLibSource,
    packageJson
  };
  assert.deepEqual(verifyRollbackPhaseContractSourceGovernance(inputs), {
    status: "contract_only_no_admission",
    formalAdmissionBeforeDownstream: true,
    authorityFreeProjection: true,
    candidateCompositionReachable: false
  });

  const admissionRemoved = rollbackEvidenceLibSource.replace(
    "  assertRollbackExecutionAdmission(policyResult.rollbackPolicy);\n",
    ""
  );
  assert.notEqual(admissionRemoved, rollbackEvidenceLibSource);
  assert.throws(
    () => verifyRollbackPhaseContractSourceGovernance({
      ...inputs,
      rollbackLibSource: admissionRemoved
    }),
    /admission must remain unique and precede/u
  );

  const wrapperDetached = rollbackEvidenceLibSource.replace(
    "  return validateRollbackPhaseReceiptProjectionForContract({\n",
    "  return Object.freeze({\n"
  );
  assert.notEqual(wrapperDetached, rollbackEvidenceLibSource);
  assert.throws(
    () => verifyRollbackPhaseContractSourceGovernance({
      ...inputs,
      rollbackLibSource: wrapperDetached
    }),
    /wrapper no longer derives/u
  );

  const helperStart = rollbackEvidenceLibSource.indexOf(
    "export function validateRollbackPhaseReceiptProjectionForContract({"
  );
  assert.ok(helperStart >= 0);
  const authorityInjected = `${rollbackEvidenceLibSource.slice(0, helperStart)}${
    rollbackEvidenceLibSource.slice(helperStart).replace(
      "    status: envelope.status,\n",
      "    status: envelope.status,\n    publicDeploymentAuthorized: false,\n"
    )
  }`;
  assert.notEqual(authorityInjected, rollbackEvidenceLibSource);
  assert.throws(
    () => verifyRollbackPhaseContractSourceGovernance({
      ...inputs,
      rollbackLibSource: authorityInjected
    }),
    /authority-free hash-chain boundary/u
  );

  assert.throws(
    () => verifyRollbackPhaseContractSourceGovernance({
      ...inputs,
      rollbackVerifierSource: `${rollbackEvidenceVerifierSource}\nconst skipAdmission = true;\n`
    }),
    /cannot create an admission bypass/u
  );
  assert.throws(
    () => verifyRollbackPhaseContractSourceGovernance({
      ...inputs,
      rollbackProviderSequenceCompositionLibSource:
        `${rollbackProviderSequenceCompositionLibSource}\nvalidateRollbackPhaseReceiptProjectionForContract();\n`
    }),
    /cannot create an admission bypass/u
  );
});

test("rejects release evidence when artifact lock creation, stability verification or generator binding is missing", () => {
  const mutations = [
    releaseWorkflow.replace(
      "        run: node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json",
      "        run: node -e \"process.exit(0)\""
    ),
    withoutExactLine(
      releaseWorkflow,
      "      - run: node scripts/run-release-evidence-command.mjs --id artifact-stability --output tmp/release-evidence-receipts/artifact-stability.json -- node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json"
    ),
    releaseWorkflow.replace("          --artifact-lock tmp/release-artifact-identity.json", "          --artifact-lock tmp/wrong.json")
  ];
  for (const weakened of mutations) {
    assert.notEqual(weakened, releaseWorkflow);
    assert.throws(
      () => verifyReleaseArtifactIdentityChain(weakened, "Release workflow"),
      /artifact identity|not bound/u
    );
  }
});

test("accepts the fail-closed partial receipt diagnostics upload", () => {
  assert.doesNotThrow(() => verifyReleaseFailureDiagnosticsUpload(
    releaseWorkflow,
    "Release workflow"
  ));
});

for (const [label, weakenedWorkflow] of [
  [
    "success-only condition",
    releaseWorkflow.replace("        if: ${{ failure() }}", "        if: ${{ success() }}")
  ],
  [
    "partial dist archive",
    releaseWorkflow.replace(
      "          path: tmp/release-evidence-receipts",
      "          path: |\n            tmp/release-evidence-receipts\n            dist/web"
    )
  ],
  [
    "missing receipt path",
    withoutExactLine(releaseWorkflow, "          path: tmp/release-evidence-receipts")
  ]
]) {
  test(`rejects weakened failed-evidence diagnostics upload: ${label}`, () => {
    assert.throws(
      () => verifyReleaseFailureDiagnosticsUpload(weakenedWorkflow, "Release workflow"),
      /failed-evidence diagnostics/u
    );
  });
}

for (const [label, mutate] of [
  ["executablePath override", (config) => {
    config.projects[0].use.launchOptions = { executablePath: "C:/wrong/chrome.exe" };
  }],
  ["synthetic userAgent", (config) => {
    config.projects[0].use.userAgent = "synthetic";
  }],
  ["webServer drift", (config) => {
    config.webServer.command = "node wrong-server.mjs";
  }],
  ["release identity drift", (config) => {
    config.projects[0].metadata.releaseIdentity.targetSchema = 16;
  }],
  ["focused test permission", (config) => {
    config.forbidOnly = false;
  }],
  ["hidden test filter", (config) => {
    config.testIgnore = "**/*";
  }]
]) {
  test(`rejects release browser config drift: ${label}`, () => {
    const pwa = structuredClone(pwaCrossBrowserConfig);
    mutate(pwa);
    assert.throws(
      () => verifyReleaseBrowserGovernance(
        decisions,
        packageJson,
        RELEASE_BROWSER_MATRIX,
        {
          backup: backupArtifactConfig,
          boot: bootArtifactConfig,
          pwa,
          "web-v1-flow": webV1CrossBrowserConfig
        }
      ),
      /Release browser/u
    );
  });
}

for (const [documentLabel, document, exactLine] of [
  [
    "Release workflow",
    releaseWorkflow,
    `      - run: ${REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND}`
  ],
  ["Release runbook", releaseRunbook, REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND]
]) {
  test(`rejects ${documentLabel} without the branded browser install prerequisite`, () => {
    assert.throws(
      () => verifyReleaseBrowserInstallPrerequisite(
        withoutExactLine(document, exactLine),
        documentLabel
      ),
      /exactly one branded browser install prerequisite/u
    );
  });

  test(`rejects ${documentLabel} with duplicate browser install prerequisites`, () => {
    assert.throws(
      () => verifyReleaseBrowserInstallPrerequisite(
        `${document}\n${REQUIRED_RELEASE_BROWSER_INSTALL_COMMAND}\n`,
        documentLabel
      ),
      /exactly one branded browser install prerequisite/u
    );
  });
}

for (const [field, driftedValue] of Object.entries({
  policyId: "desktop-edge-drifted",
  projectName: "edge-alias",
  channel: "chrome",
  deviceName: "Desktop Chrome"
})) {
  test(`rejects release governance when the fixed browser tuple drifts: ${field}`, () => {
    const weakenedMatrix = structuredClone(RELEASE_BROWSER_MATRIX);
    weakenedMatrix[0][field] = driftedValue;
    assert.throws(
      () => verifyReleaseBrowserGovernance(decisions, packageJson, weakenedMatrix),
      /project\/channel\/device matrix does not match policy/u
    );
  });
}

for (const [documentLabel, document] of [
  ["Release workflow", releaseWorkflow],
  ["Release runbook", releaseRunbook]
]) {
  test(`accepts the checked-in canonical receipt mirror: ${documentLabel}`, () => {
    assert.doesNotThrow(() => verifyReleaseReceiptMirror(
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
      document,
      documentLabel
    ));
  });

  test(`rejects ${documentLabel} when the Web v1 browser receipt is missing`, () => {
    const webV1ReceiptLine = receiptLine(document, "web-v1-flow");
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        withoutExactLine(document, webV1ReceiptLine),
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} is missing receipt web-v1-flow.`
    );
  });

  test(`rejects ${documentLabel} when receipt commands are swapped between IDs`, () => {
    const pwaCommand = decisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa.join(" ");
    const webV1Command = decisions.releaseEvidence.defaultV13RequiredReceiptCommands["web-v1-flow"].join(" ");
    const weakenedDocument = document
      .replace(`-- ${pwaCommand}`, "-- __PWA_COMMAND_PLACEHOLDER__")
      .replace(`-- ${webV1Command}`, `-- ${pwaCommand}`)
      .replace("-- __PWA_COMMAND_PLACEHOLDER__", `-- ${webV1Command}`);
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} command for pwa does not match policy.`
    );
  });

  test(`rejects ${documentLabel} when a receipt command only has the canonical prefix`, () => {
    const pwaCommand = decisions.releaseEvidence.defaultV13RequiredReceiptCommands.pwa.join(" ");
    const weakenedDocument = document.replace(`-- ${pwaCommand}`, `-- ${pwaCommand}:drifted`);
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      (error) => error instanceof Error &&
        error.message === `${documentLabel} command for pwa does not match policy.`
    );
  });

  test(`rejects ${documentLabel} when canonical receipt execution order drifts`, () => {
    const weakenedDocument = swapExactLines(
      document,
      receiptLine(document, "pwa"),
      receiptLine(document, "web-v1-flow")
    );
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      /receipt order mismatch/u
    );
  });

  test(`rejects ${documentLabel} when the required receipt ID list is not sorted`, () => {
    const canonicalIds = Object.keys(
      decisions.releaseEvidence.defaultV13RequiredReceiptCommands
    ).sort();
    const unsortedIds = [...canonicalIds];
    [unsortedIds[0], unsortedIds[1]] = [unsortedIds[1], unsortedIds[0]];
    const weakenedDocument = document.replace(
      `--require-receipts ${canonicalIds.join(",")}`,
      `--require-receipts ${unsortedIds.join(",")}`
    );
    assert.throws(
      () => verifyReleaseReceiptMirror(
        decisions.releaseEvidence.defaultV13RequiredReceiptCommands,
        weakenedDocument,
        documentLabel
      ),
      /does not require the complete canonical receipt set/u
    );
  });
}

test("keeps the canonical release receipt execution order explicit", () => {
  assert.deepEqual(
    REQUIRED_RELEASE_RECEIPT_EXECUTION_ORDER,
    [
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
    ]
  );
});

for (const browserId of REQUIRED_RELEASE_BROWSER_IDS) {
  test(`rejects release governance when browser support is missing: ${browserId}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    weakenedDecisions.browserSupport.supportedEngineeringMatrix =
      weakenedDecisions.browserSupport.supportedEngineeringMatrix.filter((value) => value !== browserId);
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      /release browser matrix must be exactly/u
    );
  });
}

for (const claimField of REQUIRED_DISABLED_RELEASE_BROWSER_CLAIMS) {
  test(`rejects release governance when an unsupported browser claim is authorized: ${claimField}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    weakenedDecisions.browserSupport[claimField] = true;
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      (error) => error instanceof Error &&
        error.message === `Unsupported release browser claim must remain false: ${claimField}.`
    );
  });
}

test("keeps the fixed release browser tuple anchor independent of the runtime matrix", () => {
  assert.deepEqual(
    RELEASE_BROWSER_MATRIX.map((browser) => ({ ...browser })),
    REQUIRED_RELEASE_BROWSER_MATRIX
  );
});

for (const receiptId of Object.keys(REQUIRED_RELEASE_BROWSER_RECEIPT_COMMANDS)) {
  test(`rejects release governance when browser receipt policy drifts: ${receiptId}`, () => {
    const weakenedDecisions = structuredClone(decisions);
    delete weakenedDecisions.releaseEvidence.defaultV13RequiredReceiptCommands[receiptId];
    assert.throws(
      () => verifyReleaseBrowserGovernance(weakenedDecisions, packageJson),
      (error) => error instanceof Error &&
        error.message === `Release browser receipt policy mismatch: ${receiptId}.`
    );
  });
}

for (const scriptName of Object.keys(REQUIRED_RELEASE_BROWSER_SCRIPTS)) {
  test(`rejects release governance when browser script drifts: ${scriptName}`, () => {
    const weakenedPackageJson = structuredClone(packageJson);
    weakenedPackageJson.scripts[scriptName] = "playwright test --config apps/web/playwright.config.ts";
    assert.throws(
      () => verifyReleaseBrowserGovernance(decisions, weakenedPackageJson),
      (error) => error instanceof Error &&
        error.message === `Release browser package script mismatch: ${scriptName}.`
    );
  });
}

test("accepts the isolated storage-v13 matrix candidate governance and full formal npm closure", () => {
  const candidate = storageCandidateGovernance();
  assert.deepEqual(candidate, {
    status: "not_admitted",
    executionAdmission: "closed_deferred_boundaries",
    observedOperationCount: 6,
    deferredBoundaryCount: 4,
    formalReleaseEvidenceReceipt: false,
    rootTypecheckExcluded: true,
    dedicatedTypecheckIncluded: true
  });
  const closure = formalNpmClosure();
  assert.equal(closure.reachableScriptCount, 32);
  assert.equal(
    closure.closureCanonicalSha256,
    REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256
  );
  assert.ok(closure.visitedScripts.includes("package.json\u0000test"));
  assert.ok(closure.visitedScripts.includes("apps/web/package.json\u0000build"));
  assert.ok(closure.visitedScripts.includes("apps/web/package.json\u0000preview:release-artifact"));
  assert.equal(closure.visitedScripts.includes("apps/web/package.json\u0000serve:e2e"), false);
  assert.equal(closure.visitedScripts.includes("apps/web/package.json\u0000build:e2e"), false);
  assert.equal(closure.visitedScripts.includes("apps/web/package.json\u0000preview:e2e"), false);
  for (const filePath of [
    "docs/release/storage-v13-matrix-candidate-policy.v1.json",
    "docs/release/storage-v13-matrix-browser-receipt-candidate-v1.schema.json",
    "docs/release/storage-v13-matrix-candidate-policy.v2.json",
    "docs/release/storage-v13-matrix-browser-receipt-candidate-v2.schema.json",
    "docs/release/默认v13正式仓储语义见证候选矩阵-v2-2026-08-28.md",
    "apps/web/playwright.storage-v13-matrix-candidate-reporter.ts",
    "apps/web/src/lib/full-backup-worker-client.ts",
    "apps/web/src/lib/full-backup-worker-client.test.ts",
    "packages/backup/src/index.ts",
    "packages/backup/src/full-backup-v13-cross-connection.test.ts",
    "packages/storage/src/local-user-data.test.ts",
    "scripts/run-storage-v13-matrix-candidate.mjs",
    "scripts/verify-storage-v13-matrix-candidate.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  assert.deepEqual(
    verifyStorageV13CrossConnectionCasTestGovernance(storageV13CrossConnectionCasTestSource),
    {
      targetSchema: 13,
      mutationEpochCapability: "absent_schema13",
      productionRepositoryWritePathBound: true,
      formalBackupPrepareVerifyApplyPathBound: true,
      rawIndexedDbMutationForbidden: true,
      malformedVerifiedReplacementCasBypassCovered: true
    }
  );
  assert.deepEqual(
    verifyFullBackupMandatoryCasBoundaryGovernance({
      backupSource: fullBackupSource,
      storageSource: storageRepositorySource,
      workerClientSource: fullBackupWorkerClientSource,
      crossConnectionTestSource: storageV13CrossConnectionCasTestSource,
      workerClientTestSource: fullBackupWorkerClientTestSource
    }),
    {
      mandatoryCasDigestAtBackupBoundary: true,
      explicitUndefinedRejectedByStorage: true,
      workerVerifiedReadyValidated: true,
      accessorInvocationForbidden: true,
      mutationEpochCapability: "absent_schema13"
    }
  );
  assert.throws(
    () => verifyStorageV13CrossConnectionCasTestGovernance(
      storageV13CrossConnectionCasTestSource.replace("targetSchema: 13", "targetSchema: 14")
    ),
    /must use only the formal repository and backup APIs/u
  );
  assert.throws(
    () => verifyStorageV13CrossConnectionCasTestGovernance(
      `${storageV13CrossConnectionCasTestSource}\nindexedDB.open("bypass");\n`
    ),
    /must use only the formal repository and backup APIs/u
  );
  assert.throws(
    () => verifyFullBackupMandatoryCasBoundaryGovernance({
      backupSource: fullBackupSource.replace(
        "const capturedVerified = captureVerifiedFullBackupReplacement(verified);",
        "const capturedVerified = verified;"
      ),
      storageSource: storageRepositorySource,
      workerClientSource: fullBackupWorkerClientSource,
      crossConnectionTestSource: storageV13CrossConnectionCasTestSource,
      workerClientTestSource: fullBackupWorkerClientTestSource
    }),
    /restore CAS must remain mandatory/u
  );
  assert.throws(
    () => verifyFullBackupMandatoryCasBoundaryGovernance({
      backupSource: fullBackupSource,
      storageSource: storageRepositorySource.replace(
        "if (!descriptor) return undefined;",
        "if (!descriptor || descriptor.value === undefined) return undefined;"
      ),
      workerClientSource: fullBackupWorkerClientSource,
      crossConnectionTestSource: storageV13CrossConnectionCasTestSource,
      workerClientTestSource: fullBackupWorkerClientTestSource
    }),
    /restore CAS must remain mandatory/u
  );
  assert.throws(
    () => verifyFullBackupMandatoryCasBoundaryGovernance({
      backupSource: fullBackupSource,
      storageSource: storageRepositorySource,
      workerClientSource: fullBackupWorkerClientSource.replace(
        "captureVerifiedFullBackupReplacement(verifiedDescriptor.value);",
        "isRecord(verifiedDescriptor.value);"
      ),
      crossConnectionTestSource: storageV13CrossConnectionCasTestSource,
      workerClientTestSource: fullBackupWorkerClientTestSource
    }),
    /restore CAS must remain mandatory/u
  );
  for (const [scriptName, command] of Object.entries(REQUIRED_STORAGE_V13_MATRIX_CANDIDATE_SCRIPTS)) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
});

test("storage-v13 canonical-multiset-v1 implementations share one frozen known vector", () => {
  const expected = "21b981965002c9b2658e08a8b9906de26963d9409f63e26ad11e6f3c4b7e70a6";
  const canonicalEntries = [
    '{"a":"alpha","z":1}',
    '{"a":[3,{"x":null,"y":true}],"b":0}'
  ].sort();
  assert.equal(sha256(JSON.stringify(canonicalEntries)), expected);
  assert.match(storageV13MatrixSpecSource, new RegExp(expected, "u"));
  assert.match(storageV13MatrixNativeReadonlySource, new RegExp(expected, "u"));
  const utf16OrdinalValues = ["\u{10000}", "\uE000"];
  const utf16OrdinalExpected =
    "899793e09b1db200cde7180f3e52dcb63aadfc97c090734c2b0bad6648e9b4e2";
  assert.deepEqual([...utf16OrdinalValues].sort(), utf16OrdinalValues);
  assert.equal(
    sha256(JSON.stringify(utf16OrdinalValues.map((value) => JSON.stringify(value)).sort())),
    utf16OrdinalExpected
  );
  assert.match(storageV13MatrixSpecSource, new RegExp(utf16OrdinalExpected, "u"));
  assert.match(storageV13MatrixNativeReadonlySource, new RegExp(utf16OrdinalExpected, "u"));
  assert.doesNotThrow(() => storageCandidateGovernance());
  assert.throws(
    () => storageCandidateGovernance({
      candidateSpecSource: storageV13MatrixSpecSource.replace(
        "canonicalJson(canonicalEntries)",
        '`[${canonicalEntries.join(",")}]`'
      )
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateNativeReadonlySource: storageV13MatrixNativeReadonlySource.replace(
        "canonicalJson(canonicalEntries)",
        '`[${canonicalEntries.join(",")}]`'
      )
    }),
    /browser collector is not strictly isolated/u
  );
});

test("storage-v13 candidate freezes the no-argument wrapper and attempt-marker global setup sources", () => {
  assert.doesNotThrow(() => storageCandidateGovernance());
  assert.equal(
    sha256(storageV13MatrixRunnerSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_STORAGE_V13_MATRIX_RUNNER_SOURCE_SHA256
  );
  assert.equal(
    sha256(storageV13MatrixGlobalSetupSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_STORAGE_V13_MATRIX_GLOBAL_SETUP_SOURCE_SHA256
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateRunnerSource: storageV13MatrixRunnerSource.replace(
        "HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID",
        "HAKIMI_STORAGE_V13_MATRIX_ATTEMPT_ID_DRIFTED"
      )
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateGlobalSetupSource: storageV13MatrixGlobalSetupSource.replace(
        "createStorageV13MatrixCandidateAttemptMarker(candidate)",
        "Promise.resolve(candidate)"
      )
    }),
    /browser collector is not strictly isolated/u
  );
  const directPlaywright = structuredClone(packageJson);
  directPlaywright.scripts["capture:storage-v13-matrix-candidate"] =
    "playwright test --config apps/web/playwright.storage-v13-matrix-candidate.config.ts";
  assert.throws(
    () => storageCandidateGovernance({ packageJson: directPlaywright }),
    /package script mismatch/u
  );
});

test("accepts and freezes the isolated SW A-to-B update candidate contract", () => {
  assert.deepEqual(swAbUpdateCandidateGovernance(), {
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: 2,
    sharedAttachmentRoles: 6,
    perBrowserAttachmentRoles: 16,
    formalReleaseEvidenceReceipt: false,
    strictGatePassed: false
  });
  assert.equal(
    sha256(swAbUpdateCandidateLibSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_LIB_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateCandidateSchemaLoaderSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_LOADER_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateCandidateVerifierSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_VERIFIER_SOURCE_SHA256
  );
  assert.match(REQUIRED_SW_AB_UPDATE_CANDIDATE_POLICY_CANONICAL_SHA256, /^[a-f0-9]{64}$/u);
  assert.match(REQUIRED_SW_AB_UPDATE_CANDIDATE_SCHEMA_CANONICAL_SHA256, /^[a-f0-9]{64}$/u);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-policy.v1.json",
    "docs/release/sw-ab-update-candidate-v1.schema.json",
    "docs/release/独立SW-A到B更新候选证据机械门-v1-2026-08-27.md",
    "scripts/sw-ab-update-candidate-lib.mjs",
    "scripts/sw-ab-update-candidate-schema.mjs",
    "scripts/sw-ab-update-candidate-fixture.mjs",
    "scripts/sw-ab-update-candidate.test.mjs",
    "scripts/verify-sw-ab-update-candidate.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  assert.match(
    swAbUpdateCandidateTestSource,
    /from\s+["']\.\/sw-ab-update-candidate-fixture\.mjs["']/u
  );
  assert.doesNotMatch(swAbUpdateCandidateTestSource, /\bfileURLToPath\b/u);
  assert.doesNotMatch(swAbUpdateCandidateTestSource, /\bisDirectRun\b|process\.argv\[1\]/u);
  for (const [scriptName, command] of Object.entries(REQUIRED_SW_AB_UPDATE_CANDIDATE_SCRIPTS)) {
    assert.equal(packageJson.scripts[scriptName], command, scriptName);
  }
});

test("SW A-to-B governance rejects policy, Schema, source, script, and lifecycle promotion", () => {
  const promotedPolicy = structuredClone(swAbUpdateCandidatePolicy);
  promotedPolicy.terminalState.strictGatePassed = true;
  assert.throws(
    () => swAbUpdateCandidateGovernance({ policy: promotedPolicy }),
    /policy drifted|closed v1 contract/u
  );
  const promotedSchema = structuredClone(swAbUpdateCandidateSchema);
  promotedSchema.properties.strictGatePassed.const = true;
  assert.throws(
    () => swAbUpdateCandidateGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  const promotedPackage = structuredClone(packageJson);
  promotedPackage.scripts["verify:sw-ab-update-candidate"] =
    "node scripts/verify-sw-ab-update-candidate.mjs && exit 0";
  assert.throws(
    () => swAbUpdateCandidateGovernance({ packageJson: promotedPackage }),
    /package script mismatch/u
  );
  const aliasedPackage = structuredClone(packageJson);
  aliasedPackage.scripts["posttest:sw-ab-update-candidate"] = "node -e ok";
  assert.throws(
    () => swAbUpdateCandidateGovernance({ packageJson: aliasedPackage }),
    /lifecycle aliases are forbidden/u
  );
  assert.throws(
    () => swAbUpdateCandidateGovernance({
      libSource: swAbUpdateCandidateLibSource.replace(
        "ReleaseDatabaseWriteLockedError",
        "GenericUiError"
      )
    }),
    /sources are not exactly frozen/u
  );
});

test("accepts and freezes the independent partial SW runtime client capture family", () => {
  assert.deepEqual(swAbUpdateRuntimeClientCaptureGovernance(), {
    status: "capture_incomplete",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: 2,
    observations: 8,
    implementedObservationScopes: 2,
    deferredObservationScopes: 8,
    usableForCandidateAssembly: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false
  });
  assert.equal(
    sha256(swAbUpdateRuntimeClientCaptureLibSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LIB_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateRuntimeClientCaptureLoaderSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_LOADER_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateRuntimeClientCaptureSchemaLoaderSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_LOADER_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateRuntimeClientCaptureProbeSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_PROBE_SOURCE_SHA256
  );
  assert.equal(
    sha256(swAbUpdateRuntimeClientCaptureVerifierSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_VERIFIER_SOURCE_SHA256
  );
  assert.match(
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_POLICY_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  assert.match(
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCHEMA_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  assert.match(REQUIRED_SW_AB_RUNTIME_CHALLENGE_SOURCE_SHA256, /^[a-f0-9]{64}$/u);
  assert.equal(
    sha256(serviceWorkerSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_RUNTIME_SERVICE_WORKER_SOURCE_SHA256
  );
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_CLIENT_CAPTURE_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json",
    "docs/release/sw-ab-update-runtime-client-capture-v1.schema.json",
    "docs/release/PR6运行时客户端原始采集候选-v1-2026-08-27.md",
    "scripts/sw-ab-update-runtime-client-capture-lib.mjs",
    "scripts/sw-ab-update-runtime-client-capture-loader.mjs",
    "scripts/sw-ab-update-runtime-client-capture-schema.mjs",
    "scripts/sw-ab-update-runtime-client-capture-probe.mjs",
    "scripts/sw-ab-update-runtime-client-capture.test.mjs",
    "scripts/verify-sw-ab-update-runtime-client-capture.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
});

test("accepts the isolated decoded-browser-API transcript bundle family", () => {
  assert.deepEqual(swAbUpdateRuntimeApiTranscriptGovernance(), {
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
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  assert.equal(
    packageJson.scripts["test:release-evidence"],
    "node --test scripts/release-evidence.test.mjs scripts/verify-deployed-security-headers.test.mjs scripts/rollback-evidence.test.mjs scripts/deployed-pwa-evidence.test.mjs scripts/deployed-pwa-evidence-v2.test.mjs scripts/deployed-pwa-evidence-v3.test.mjs"
  );
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-policy.v1.json",
    "docs/release/sw-ab-update-runtime-api-transcript-candidate-v1.schema.json",
    "docs/release/PR6运行时已解码API-transcript候选边界-v1-2026-08-27.md",
    "scripts/sw-ab-update-runtime-api-transcript-lib.mjs",
    "scripts/sw-ab-update-runtime-api-transcript-schema.mjs",
    "scripts/sw-ab-update-runtime-api-transcript-writer.mjs",
    "scripts/sw-ab-update-runtime-api-transcript-loader.mjs",
    "scripts/sw-ab-update-runtime-api-transcript.test-fixture.mjs",
    "scripts/sw-ab-update-runtime-api-transcript.test.mjs",
    "scripts/verify-sw-ab-update-runtime-api-transcript.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
});

test("decoded-API transcript governance rejects promotion, aliases, formal reachability, and source drift", () => {
  const promotedPolicy = structuredClone(swAbUpdateRuntimeApiTranscriptPolicy);
  promotedPolicy.terminalState.usableForRuntimeEvidence = true;
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({ policy: promotedPolicy }),
    /policy drifted|fail-closed contract/u
  );
  const promotedSchema = structuredClone(swAbUpdateRuntimeApiTranscriptSchema);
  promotedSchema.$defs.Authority.properties.publicDeploymentAuthorized.const = true;
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  const captureAlias = structuredClone(packageJson);
  captureAlias.scripts["capture:sw-ab-update-runtime-api-transcript"] = "node -e ok";
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({ packageJson: captureAlias }),
    /two standalone closed scripts/u
  );
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts["postverify:sw-ab-update-runtime-api-transcript"] = "node -e ok";
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden|two standalone closed scripts/u
  );
  const formalAggregate = structuredClone(packageJson);
  formalAggregate.scripts["test:release-evidence"] +=
    " scripts/sw-ab-update-runtime-api-transcript.test.mjs";
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({ packageJson: formalAggregate }),
    /two standalone closed scripts/u
  );
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({
      libSource: swAbUpdateRuntimeApiTranscriptLibSource.replace(
        "cdpWireBytesCaptured: false",
        "cdpWireBytesCaptured: true"
      )
    }),
    /source lock drifted/u
  );
  assert.throws(
    () => swAbUpdateRuntimeApiTranscriptGovernance({
      formalConsumerSources: [
        'import "./sw-ab-update-runtime-api-transcript-loader.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );
});

test("accepts and freezes the collector-owned ephemeral issuance candidate family", () => {
  assert.deepEqual(swAbUpdateRuntimeCollectorIssuanceGovernance(), {
    status: "issuance_incomplete",
    executionAdmission: "closed_missing_selected_https_origin",
    trustClass: "untrusted_ephemeral_self_signed_collector_issuance_candidate",
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
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
    "docs/release/PR6采集器临时签发候选边界-v1-2026-08-28.md",
    "scripts/sw-ab-update-runtime-collector-issuance-lib.mjs",
    "scripts/sw-ab-update-runtime-collector-issuance-schema.mjs",
    "scripts/sw-ab-update-runtime-collector-issuance-writer.mjs",
    "scripts/sw-ab-update-runtime-collector-live-adapter.mjs",
    "scripts/sw-ab-update-runtime-collector-issuance-loader.mjs",
    "scripts/sw-ab-update-runtime-collector-issuance.test-fixture.mjs",
    "scripts/sw-ab-update-runtime-collector-issuance.test.mjs",
    "scripts/sw-ab-update-runtime-collector-live-adapter.test.mjs",
    "scripts/verify-sw-ab-update-runtime-collector-issuance.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-policy.v1.json",
    "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json",
    "docs/release/PR6采集器临时签发候选边界-v1-2026-08-28.md"
  ]) assert.ok(REQUIRED_MIGRATION_WORKFLOW_PATHS.includes(filePath), filePath);
});

test("collector issuance governance rejects promotion, aliases, formal reachability, CI execution, and source drift", () => {
  const promotedPolicy = structuredClone(swAbUpdateRuntimeCollectorIssuancePolicy);
  promotedPolicy.authority.publicDeploymentAuthorized = true;
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({ policy: promotedPolicy }),
    /AUTHORITY_PROMOTION|policy drifted/u
  );
  const promotedSchema = structuredClone(swAbUpdateRuntimeCollectorIssuanceSchema);
  promotedSchema.$defs.Authority.properties.publicDeploymentAuthorized.const = true;
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  const genericAlias = structuredClone(packageJson);
  genericAlias.scripts["collector-bridge"] =
    "node scripts/verify-sw-ab-update-runtime-collector-issuance.mjs";
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({ packageJson: genericAlias }),
    /two standalone closed scripts/u
  );
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts["postverify:sw-ab-update-runtime-collector-issuance"] = "node -e ok";
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden|two standalone closed scripts/u
  );
  const formalAggregate = structuredClone(packageJson);
  formalAggregate.scripts["test:release-evidence"] +=
    " scripts/sw-ab-update-runtime-collector-issuance.test.mjs";
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({ packageJson: formalAggregate }),
    /two standalone closed scripts/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      loaderSource: swAbUpdateRuntimeCollectorIssuanceLoaderSource.replace(
        "assertHeldFileStable",
        "assertHeldFileStableDrifted"
      )
    }),
    /source lock drifted/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "new MessageChannel()",
        "new MessageChannelDrifted()"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterTestSource: `${swAbUpdateRuntimeCollectorLiveAdapterTestSource}\n// drift`
    }),
    /source lock drifted/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      writerSource: swAbUpdateRuntimeCollectorIssuanceWriterSource.replace(
        "async function completeSwAbUpdateRuntimeCollectorTupleInternal(",
        "export async function completeSwAbUpdateRuntimeCollectorTuple("
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      writerSource: swAbUpdateRuntimeCollectorIssuanceWriterSource.replace(
        "return await completeSwAbUpdateRuntimeCollectorTupleInternal(",
        "return await testOnlyCompleteSwAbUpdateRuntimeCollectorTuple("
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      writerSource: swAbUpdateRuntimeCollectorIssuanceWriterSource.replace(
        '["session", "page"]',
        '["session", "page", "decodedObservation"]'
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: `${swAbUpdateRuntimeCollectorLiveAdapterSource}\nconst injected = randomUUID();`
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "const LIVE_CAPTURE_ENVELOPES = new WeakSet()",
        "const LIVE_CAPTURE_ENVELOPES = new Set()"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "LIVE_CAPTURE_ENVELOPES.delete(captureEnvelope)",
        "LIVE_CAPTURE_ENVELOPES.has(captureEnvelope)"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "cdpRequestMilliseconds: 10_000",
        "cdpRequestMilliseconds: 0"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "function canonicalTimestamp()",
        "export function canonicalTimestamp()"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        '["page", "reservation"]',
        '["page", "reservation", "startedAt"]'
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: swAbUpdateRuntimeCollectorLiveAdapterSource.replace(
        "() => cdpSession.detach()",
        "() => Promise.resolve()"
      )
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      liveAdapterSource: `${swAbUpdateRuntimeCollectorLiveAdapterSource}\nimport "./sw-ab-update-runtime-collector-issuance-writer.mjs";`
    }),
    /source lock drifted|isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      formalConsumerSources: [
        'import "./sw-ab-update-runtime-collector-issuance-loader.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      formalConsumerSources: [
        'import "./sw-ab-update-runtime-collector-live-adapter.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      formalConsumerSources: [
        "testOnlyCompleteSwAbUpdateRuntimeCollectorTuple(session, reservation, observation);"
      ]
    }),
    /isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateRuntimeCollectorIssuanceGovernance({
      migrationWorkflow: `${workflow}\n      - run: npm run verify:sw-ab-update-runtime-collector-issuance`
    }),
    /isolated from formal admission/u
  );
});

test("accepts and freezes the non-admissible SW candidate/runtime composition gate", () => {
  assert.deepEqual(swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance(), {
    status: "not_admitted",
    executionAdmission: "closed_missing_https_origin",
    browserProjects: 2,
    clientMappings: 8,
    usableForCandidateAssembly: false,
    usableForAdmission: false,
    formalReleaseEvidenceReceipt: false,
    publicDeploymentAuthorized: false
  });
  assert.equal(
    sha256(swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_LIB_SOURCE_SHA256
  );
  assert.equal(
    sha256(
      swAbUpdateCandidateRuntimeClientCaptureCompositionSchemaLoaderSource
        .replace(/\r\n?/gu, "\n")
    ),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
  );
  assert.equal(
    sha256(
      swAbUpdateCandidateRuntimeClientCaptureCompositionVerifierSource
        .replace(/\r\n?/gu, "\n")
    ),
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_VERIFIER_SOURCE_SHA256
  );
  assert.match(
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_POLICY_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  assert.match(
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCHEMA_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COMPOSITION_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-composition-v1.schema.json",
    "docs/release/SW-A到B候选与运行时客户端采集组合边界-v1-2026-08-27.md",
    "scripts/sw-ab-update-candidate-fixture.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-lib.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition-schema.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-composition.test.mjs",
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-composition.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  assert.match(
    swAbUpdateCandidateRuntimeClientCaptureCompositionTestSource,
    /from\s+["']\.\/sw-ab-update-candidate-fixture\.mjs["']/u
  );
  assert.doesNotMatch(
    swAbUpdateCandidateRuntimeClientCaptureCompositionTestSource,
    /from\s+["']\.\/sw-ab-update-candidate\.test\.mjs["']/u
  );
});

test("SW candidate/runtime composition governance rejects promotion, drift, and lifecycle aliases", () => {
  const promotedPolicy = structuredClone(
    swAbUpdateCandidateRuntimeClientCaptureCompositionPolicy
  );
  promotedPolicy.terminalState.usableForCandidateAssembly = true;
  assert.throws(
    () => swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
      policy: promotedPolicy
    }),
    /policy drifted|closed legacy-v13 boundary/u
  );
  const promotedSchema = structuredClone(
    swAbUpdateCandidateRuntimeClientCaptureCompositionSchema
  );
  promotedSchema.properties.usableForCandidateAssembly.const = true;
  assert.throws(
    () => swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
      evidenceSchema: promotedSchema
    }),
    /Schema drifted/u
  );
  const aliasedPackage = structuredClone(packageJson);
  aliasedPackage.scripts[
    "postverify:sw-ab-update-candidate-runtime-client-capture-composition"
  ] = "node -e ok";
  assert.throws(
    () => swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
      packageJson: aliasedPackage
    }),
    /lifecycle aliases are forbidden/u
  );
  assert.throws(
    () => swAbUpdateCandidateRuntimeClientCaptureCompositionGovernance({
      libSource: swAbUpdateCandidateRuntimeClientCaptureCompositionLibSource.replace(
        "candidateByTuple",
        "candidateArray"
      )
    }),
    /sources are not exactly frozen/u
  );
});

test("accepts and freezes the standalone SW four-chain composition candidate family", () => {
  assert.deepEqual(swAbUpdateFourChainCompositionGovernance(), {
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
  assert.equal(
    sha256(swAbUpdateFourChainCompositionPolicySource),
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbUpdateFourChainCompositionPolicy)),
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_POLICY_CANONICAL_SHA256
  );
  assert.equal(
    sha256(swAbUpdateFourChainCompositionSchemaSource),
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbUpdateFourChainCompositionSchema)),
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_CANONICAL_SHA256
  );
  assert.equal(REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SOURCE_HASHES.length, 12);
  for (const [source, expected] of [
    [
      swAbUpdateFourChainCompositionLibSource,
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_LIB_SOURCE_SHA256
    ],
    [
      swAbUpdateFourChainCompositionSchemaLoaderSource,
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
    ],
    [
      swAbUpdateFourChainCompositionTestSource,
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_TEST_SOURCE_SHA256
    ],
    [
      swAbUpdateFourChainCompositionVerifierSource,
      REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_VERIFIER_SOURCE_SHA256
    ]
  ]) assert.equal(sha256(source.replace(/\r\n?/gu, "\n")), expected);
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_UPDATE_FOUR_CHAIN_COMPOSITION_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
    "docs/release/PR6四链离线组合候选边界-v1-2026-08-28.md",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-schema.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs",
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-policy.v1.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-v1.schema.json",
    "docs/release/PR6四链离线组合候选边界-v1-2026-08-28.md"
  ]) assert.ok(REQUIRED_MIGRATION_WORKFLOW_PATHS.includes(filePath), filePath);
});

test("SW four-chain composition governance rejects promotion, aliases, formal reachability, CI execution, raw drift, and source drift", () => {
  const promotedPolicy = structuredClone(swAbUpdateFourChainCompositionPolicy);
  promotedPolicy.authority.publicDeploymentAuthorized = true;
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ policy: promotedPolicy }),
    /AUTHORITY_PROMOTION|policy drifted|closed contract/u
  );
  const promotedSchema = structuredClone(swAbUpdateFourChainCompositionSchema);
  promotedSchema.$defs.Authority.properties.publicDeploymentAuthorized.const = true;
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted|checked-source raw or canonical hash drifted/u
  );
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      policySource: `${swAbUpdateFourChainCompositionPolicySource} `
    }),
    /policy drifted/u
  );
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      schemaSource: `${swAbUpdateFourChainCompositionSchemaSource} `
    }),
    /Schema drifted|checked-source raw or canonical hash drifted/u
  );
  const whitespaceDrift = structuredClone(swAbUpdateFourChainCompositionCheckedSourceDocuments);
  whitespaceDrift[2].source += "\n";
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      checkedSourceDocuments: whitespaceDrift
    }),
    /checked-source raw or canonical hash drifted/u
  );
  const bomDrift = structuredClone(swAbUpdateFourChainCompositionCheckedSourceDocuments);
  bomDrift[3].source = `\ufeff${bomDrift[3].source}`;
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      checkedSourceDocuments: bomDrift
    }),
    /checked-source inventory is invalid|checked-source raw or canonical hash drifted/u
  );

  const genericAlias = structuredClone(packageJson);
  genericAlias.scripts["four-chain-composition-bridge"] =
    "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs";
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ packageJson: genericAlias }),
    /two standalone closed scripts/u
  );
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts[
    "postverify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition"
  ] = "node -e ok";
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden|two standalone closed scripts/u
  );
  const promotedCli = structuredClone(packageJson);
  promotedCli.scripts[
    "verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition"
  ] += " && exit 0";
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ packageJson: promotedCli }),
    /package script mismatch/u
  );
  const formalAggregate = structuredClone(packageJson);
  formalAggregate.scripts["test:release-evidence"] +=
    " scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.test.mjs";
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({ packageJson: formalAggregate }),
    /two standalone closed scripts/u
  );

  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      libSource: swAbUpdateFourChainCompositionLibSource.replace(
        "candidateAndRuntimePrimaryInputsHeldAcrossIssuance: true",
        "candidateAndRuntimePrimaryInputsHeldAcrossIssuance: false"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      verifierSource: swAbUpdateFourChainCompositionVerifierSource.replace(
        "process.exitCode = 1",
        "process.exitCode = 0"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      formalConsumerSources: [
        'import "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );
  assert.throws(
    () => swAbUpdateFourChainCompositionGovernance({
      migrationWorkflow: `${workflow}\n      - run: npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition`
    }),
    /isolated from formal admission/u
  );
});

test("formal npm closure rejects direct and multihop SW four-chain composition injection", () => {
  const direct = structuredClone(packageJson);
  direct.scripts["postcheck:release-governance"] =
    "npm run test:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition";
  assert.throws(
    () => formalNpmClosure(direct),
    /SW A-to-B update candidate tooling must remain outside/u
  );

  const multihop = structuredClone(packageJson);
  multihop.scripts["postcheck:release-governance"] = "npm run neutral-four-chain-bridge-a";
  multihop.scripts["neutral-four-chain-bridge-a"] = "npm run neutral-four-chain-bridge-b";
  multihop.scripts["neutral-four-chain-bridge-b"] =
    "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition";
  assert.throws(
    () => formalNpmClosure(multihop),
    /SW A-to-B update candidate tooling must remain outside/u
  );

  const workspaceRootPackage = structuredClone(packageJson);
  const workspaceWebPackage = structuredClone(webPackageJson);
  workspaceWebPackage.scripts["postpreview:release-artifact"] = "npm --prefix ../.. run neutral-four-chain-workspace-bridge";
  workspaceRootPackage.scripts["neutral-four-chain-workspace-bridge"] =
    "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition";
  assert.throws(
    () => formalNpmClosure(workspaceRootPackage, workspaceWebPackage),
    /SW A-to-B update candidate tooling must remain outside/u
  );

  for (const embeddedCommand of [
    "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition.mjs",
    "node -e \"import('./scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-composition-lib.mjs')\""
  ]) {
    assert.throws(
      () => formalNpmClosure(packageJson, webPackageJson, [embeddedCommand]),
      /SW A-to-B update candidate tooling must remain outside|Formal npm closure refuses an opaque or dynamic terminal command/u,
      embeddedCommand
    );
  }
});

test("accepts and freezes the standalone runtime derived-evidence producer bridge family", () => {
  assert.deepEqual(swAbRuntimeDerivedEvidenceProducerBridgeGovernance(), {
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
  assert.equal(
    sha256(swAbRuntimeDerivedEvidenceProducerBridgePolicySource),
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbRuntimeDerivedEvidenceProducerBridgePolicy)),
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_CANONICAL_SHA256
  );
  assert.equal(
    sha256(swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource),
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbRuntimeDerivedEvidenceProducerBridgeSchema)),
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_CANONICAL_SHA256
  );
  assert.equal(
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_HASHES.length,
    8
  );
  for (const [source, expected] of [
    [
      swAbRuntimeDerivedEvidenceProducerBridgeLibSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LIB_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeSchemaLoaderSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_LOADER_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeWriterSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_WRITER_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_LOADER_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeFixtureSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_FIXTURE_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeTestSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TEST_SOURCE_SHA256
    ],
    [
      swAbRuntimeDerivedEvidenceProducerBridgeVerifierSource,
      REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_VERIFIER_SOURCE_SHA256
    ]
  ]) assert.equal(sha256(source.replace(/\r\n?/gu, "\n")), expected);
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
    "docs/release/PR6运行时派生证据生产桥接候选边界-v1-2026-08-28.md",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test-fixture.mjs",
    "scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs",
    "scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  for (const filePath of [
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-policy.v1.json",
    "docs/release/sw-ab-update-runtime-derived-evidence-producer-bridge-v1.schema.json",
    "docs/release/PR6运行时派生证据生产桥接候选边界-v1-2026-08-28.md"
  ]) assert.ok(REQUIRED_MIGRATION_WORKFLOW_PATHS.includes(filePath), filePath);
  const closure = formalNpmClosure();
  assert.equal(closure.reachableScriptCount, 32);
  assert.equal(closure.visitedScripts.length, 92);
  assert.equal(
    closure.closureCanonicalSha256,
    REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256
  );
  for (const scriptName of Object.keys(
    REQUIRED_SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCRIPTS
  )) assert.equal(closure.visitedScripts.includes(`package.json\u0000${scriptName}`), false);
});

test("producer bridge governance rejects promotion, byte drift, and implementation drift", () => {
  const promotedPolicy = structuredClone(swAbRuntimeDerivedEvidenceProducerBridgePolicy);
  promotedPolicy.authority.publicDeploymentAuthorized = true;
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ policy: promotedPolicy }),
    /AUTHORITY|policy drifted|frozen v1 boundary/u
  );
  const promotedSchema = structuredClone(swAbRuntimeDerivedEvidenceProducerBridgeSchema);
  promotedSchema.$defs.Provenance.properties.realBrowserExecutionVerified.const = true;
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      policySource: `${swAbRuntimeDerivedEvidenceProducerBridgePolicySource} `
    }),
    /policy drifted/u
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      schemaSource: `${swAbRuntimeDerivedEvidenceProducerBridgeSchemaSource} `
    }),
    /Schema drifted|checked-source raw or canonical hash drifted/u
  );
  const whitespaceDrift = structuredClone(
    swAbRuntimeDerivedEvidenceProducerBridgeCheckedSourceDocuments
  );
  whitespaceDrift[2].source += "\n";
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      checkedSourceDocuments: whitespaceDrift
    }),
    /checked-source raw or canonical hash drifted/u
  );
  const bomDrift = structuredClone(
    swAbRuntimeDerivedEvidenceProducerBridgeCheckedSourceDocuments
  );
  bomDrift[3].source = `\ufeff${bomDrift[3].source}`;
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      checkedSourceDocuments: bomDrift
    }),
    /checked-source inventory is invalid|checked-source raw or canonical hash drifted/u
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      writerSource: swAbRuntimeDerivedEvidenceProducerBridgeWriterSource.replace(
        "await dependencies.rename(stagingRoot, resolved.bridgeRoot)",
        "await dependencies.rename(resolved.bridgeRoot, stagingRoot)"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      verifierSource: swAbRuntimeDerivedEvidenceProducerBridgeVerifierSource.replace(
        "process.exitCode = 1",
        "process.exitCode = 0"
      )
    }),
    /sources are not exactly frozen/u
  );
});

test("producer bridge governance freezes the exact three-file terminal gate and native commit rename", () => {
  const twoFilePolicy = structuredClone(swAbRuntimeDerivedEvidenceProducerBridgePolicy);
  twoFilePolicy.outputLayout.exactFileCount = 2;
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ policy: twoFilePolicy }),
    /policy drifted|OUTPUT_LAYOUT/u
  );
  const markerOptionalSchema = structuredClone(swAbRuntimeDerivedEvidenceProducerBridgeSchema);
  markerOptionalSchema.$defs.PublicationBoundary.properties
    .publicLoaderRequiresTerminalCommitMarker.const = false;
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      evidenceSchema: markerOptionalSchema
    }),
    /Schema drifted/u
  );
  const markerNameDrift = swAbRuntimeDerivedEvidenceProducerBridgeLibSource.replace(
    '"100-producer-bridge-publication-commit.sha256"',
    '"100-producer-bridge-publication-commit.json"'
  );
  assert.notEqual(markerNameDrift, swAbRuntimeDerivedEvidenceProducerBridgeLibSource);
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ libSource: markerNameDrift }),
    /sources are not exactly frozen/u
  );
  const seamControlledTerminalRename =
    swAbRuntimeDerivedEvidenceProducerBridgeWriterSource.replace(
      "await rename(pendingCommitPath, terminalCommitPath)",
      "await dependencies.rename(pendingCommitPath, terminalCommitPath)"
    );
  assert.notEqual(
    seamControlledTerminalRename,
    swAbRuntimeDerivedEvidenceProducerBridgeWriterSource
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      writerSource: seamControlledTerminalRename
    }),
    /sources are not exactly frozen/u
  );
  const loaderWithoutTerminalGate = swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource.replace(
    "terminalGate: terminalCommitHeld[0].identity",
    "terminalGate: outputHeld[0].identity"
  );
  assert.notEqual(loaderWithoutTerminalGate, swAbRuntimeDerivedEvidenceProducerBridgeLoaderSource);
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      loaderSource: loaderWithoutTerminalGate
    }),
    /sources are not exactly frozen/u
  );
});

test("producer bridge governance rejects package aliases, formal consumers, and CI execution", () => {
  const writerAlias = structuredClone(packageJson);
  writerAlias.scripts["produce:bridge-candidate"] =
    "node scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs";
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ packageJson: writerAlias }),
    /two standalone closed scripts/u
  );
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts[
    "postverify:sw-ab-update-runtime-derived-evidence-producer-bridge"
  ] = "node -e ok";
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden|two standalone closed scripts/u
  );
  const formalAggregate = structuredClone(packageJson);
  formalAggregate.scripts["test:release-evidence"] +=
    " scripts/sw-ab-update-runtime-derived-evidence-producer-bridge.test.mjs";
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({ packageJson: formalAggregate }),
    /two standalone closed scripts/u
  );
  assert.throws(
    () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
      forbiddenConsumerSources: [
        'import "./sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );
  for (const workflowSource of [workflow, quickWorkflow, nightlyWorkflow, releaseWorkflow]) {
    assert.throws(
      () => swAbRuntimeDerivedEvidenceProducerBridgeGovernance({
        ciWorkflowSources: [
          `${workflowSource}\n      - run: npm run verify:sw-ab-update-runtime-derived-evidence-producer-bridge`
        ]
      }),
      /isolated from formal admission/u
    );
  }
});

test("formal receipts and every root lifecycle reject producer bridge reachability", () => {
  const directReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  directReceipts["producer-bridge"] = [
    "npm",
    "run",
    "verify:sw-ab-update-runtime-derived-evidence-producer-bridge"
  ];
  assert.throws(
    () => verifyDefaultV13ReceiptCommandAllowlist(directReceipts),
    /exact audited allowlist/u
  );
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(directReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const recursiveReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  recursiveReceipts["evidence-tooling"] = ["npm", "run", "neutral-bridge-a"];
  const recursivePackage = structuredClone(packageJson);
  recursivePackage.scripts["neutral-bridge-a"] = "npm run neutral-bridge-b";
  recursivePackage.scripts["neutral-bridge-b"] =
    "npm run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(recursiveReceipts, {
      root: { path: "package.json", packageJson: recursivePackage },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  for (const rootScript of [
    "check:release-governance",
    "test:release-evidence",
    "typecheck",
    "test",
    "build",
    "test:release:boot-artifact",
    "test:release:backup-artifact",
    "test:release:pwa-artifact",
    "test:release:web-v1-artifact",
    "test:e2e:cross-schema-v13-v16",
    "test:e2e:orphaned-v13-recovery",
    "verify:built-release-storage-manifest"
  ]) {
    const injected = structuredClone(packageJson);
    injected.scripts[`pre${rootScript}`] =
      "npm run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
    assert.throws(
      () => formalNpmClosure(injected),
      expectedRootHookRejection(`pre${rootScript}`, /SW A-to-B update candidate tooling must remain outside/u),
      rootScript
    );
  }
});

test("formal closure rejects direct, multihop, workspace, prefix, workspace flag, and npm.cmd bridge injection", () => {
  const direct = structuredClone(packageJson);
  direct.scripts["postcheck:release-governance"] =
    "npm run test:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => formalNpmClosure(direct),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const multihop = structuredClone(packageJson);
  multihop.scripts["postcheck:release-governance"] = "npm run neutral-producer-hop-a";
  multihop.scripts["neutral-producer-hop-a"] = "npm run neutral-producer-hop-b";
  multihop.scripts["neutral-producer-hop-b"] =
    "npm run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => formalNpmClosure(multihop),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const prefixRoot = structuredClone(packageJson);
  const prefixWeb = structuredClone(webPackageJson);
  prefixWeb.scripts["postpreview:release-artifact"] = "npm --prefix ../.. run neutral-producer-prefix";
  prefixRoot.scripts["neutral-producer-prefix"] =
    "npm run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => formalNpmClosure(prefixRoot, prefixWeb),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const workspaceRootPackage = structuredClone(packageJson);
  const workspaceWebPackage = structuredClone(webPackageJson);
  workspaceRootPackage.scripts["postcheck:release-governance"] =
    "npm run neutral-producer-workspace --workspace @hakimi/web";
  workspaceWebPackage.scripts["neutral-producer-workspace"] =
    "npm.cmd --prefix ../.. run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => formalNpmClosure(workspaceRootPackage, workspaceWebPackage),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const npmCmd = structuredClone(packageJson);
  npmCmd.scripts["postcheck:release-governance"] =
    "npm.cmd run verify:sw-ab-update-runtime-derived-evidence-producer-bridge";
  assert.throws(
    () => formalNpmClosure(npmCmd),
    /SW A-to-B update candidate tooling must remain outside/u
  );
});

test("formal closure rejects embedded shell, direct Node, node -e, split dynamic import, and cycles", () => {
  for (const embeddedCommand of [
    "node scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs",
    "powershell -Command node scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs",
    "node -e \"import('./scripts/sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs')\"",
    "node -e \"import('./scripts/' + ['sw','ab','update','runtime','derived','evidence','producer','bridge','lib.mjs'].join('-'))\""
  ]) {
    assert.throws(
      () => formalNpmClosure(packageJson, webPackageJson, [embeddedCommand]),
      /SW A-to-B update candidate tooling must remain outside|Formal npm closure refuses an opaque or dynamic terminal command/u,
      embeddedCommand
    );
  }
  const cyclic = structuredClone(packageJson);
  cyclic.scripts["postcheck:release-governance"] = "npm run producer-cycle-a";
  cyclic.scripts["producer-cycle-a"] = "npm run producer-cycle-b";
  cyclic.scripts["producer-cycle-b"] =
    "npm run producer-cycle-a && node -e \"import('./scripts/' + ['sw','ab','update','runtime','derived','evidence','producer','bridge','lib.mjs'].join('-'))\"";
  assert.throws(
    () => formalNpmClosure(cyclic),
    /SW A-to-B update candidate tooling must remain outside|Formal npm closure refuses an opaque or dynamic terminal command/u
  );
});

test("accepts and freezes the standalone producer-bridge four-chain composition v2 family", () => {
  assert.deepEqual(swAbProducerBridgeCompositionGovernance(), {
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
  assert.equal(
    sha256(swAbProducerBridgeCompositionPolicySource),
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbProducerBridgeCompositionPolicy)),
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_POLICY_CANONICAL_SHA256
  );
  assert.equal(
    sha256(swAbProducerBridgeCompositionSchemaSource),
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_RAW_SHA256
  );
  assert.equal(
    sha256(canonicalJson(swAbProducerBridgeCompositionSchema)),
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_CANONICAL_SHA256
  );
  assert.equal(REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SOURCE_HASHES.length, 14);
  for (const [source, expected] of [
    [
      swAbProducerBridgeCompositionLibSource,
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_LIB_SOURCE_SHA256
    ],
    [
      swAbProducerBridgeCompositionSchemaLoaderSource,
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
    ],
    [
      swAbProducerBridgeCompositionFixtureSource,
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_FIXTURE_SOURCE_SHA256
    ],
    [
      swAbProducerBridgeCompositionTestSource,
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_TEST_SOURCE_SHA256
    ],
    [
      swAbProducerBridgeCompositionVerifierSource,
      REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_VERIFIER_SOURCE_SHA256
    ]
  ]) assert.equal(sha256(source.replace(/\r\n?/gu, "\n")), expected);
  for (const [scriptName, command] of Object.entries(
    REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command, scriptName);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-schema.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test-fixture.mjs",
    "scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs",
    "scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs",
    "docs/release/PR6生产桥接四链组合候选边界-v2-2026-08-28.md"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(filePath), filePath);
  for (const filePath of [
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-policy.v2.json",
    "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json",
    "docs/release/PR6生产桥接四链组合候选边界-v2-2026-08-28.md"
  ]) assert.ok(REQUIRED_MIGRATION_WORKFLOW_PATHS.includes(filePath), filePath);
  assert.equal(
    swAbUpdateFourChainCompositionPolicy.producerBridgeStatus,
    "producer_bridge_absent"
  );
  const closure = formalNpmClosure();
  assert.equal(closure.reachableScriptCount, 32);
  assert.equal(closure.visitedScripts.length, 92);
  assert.equal(
    closure.closureCanonicalSha256,
    REQUIRED_FORMAL_RECEIPT_NPM_LIFECYCLE_CLOSURE_CANONICAL_SHA256
  );
  for (const scriptName of Object.keys(REQUIRED_SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCRIPTS)) {
    assert.equal(closure.visitedScripts.includes(`package.json\u0000${scriptName}`), false);
  }
});

test("producer-bridge composition v2 rejects policy, Schema, all source, and implementation drift", () => {
  const promotedPolicy = structuredClone(swAbProducerBridgeCompositionPolicy);
  promotedPolicy.authority.publicDeploymentAuthorized = true;
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ policy: promotedPolicy }),
    /policy drifted|AUTHORITY|closed v2 contract/u
  );
  const coordinatedPolicy = structuredClone(swAbProducerBridgeCompositionPolicy);
  coordinatedPolicy.runAttemptBoundary.runAttemptCoordinationVerified = true;
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ policy: coordinatedPolicy }),
    /policy drifted|RUN_ATTEMPT|closed v2 contract/u
  );
  const promotedSchema = structuredClone(swAbProducerBridgeCompositionSchema);
  promotedSchema.properties.runAttemptCoordinationVerified.const = true;
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({
      policySource: `${swAbProducerBridgeCompositionPolicySource} `
    }),
    /policy drifted/u
  );
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({
      schemaSource: `${swAbProducerBridgeCompositionSchemaSource} `
    }),
    /Schema drifted|checked-source raw or canonical hash drifted/u
  );
  for (let index = 0; index < 14; index += 1) {
    const whitespaceDrift = structuredClone(swAbProducerBridgeCompositionCheckedSourceDocuments);
    whitespaceDrift[index].source += "\n";
    assert.throws(
      () => swAbProducerBridgeCompositionGovernance({
        checkedSourceDocuments: whitespaceDrift
      }),
      /checked-source raw or canonical hash drifted/u,
      `whitespace source ${index}`
    );
    const bomDrift = structuredClone(swAbProducerBridgeCompositionCheckedSourceDocuments);
    bomDrift[index].source = `\ufeff${bomDrift[index].source}`;
    assert.throws(
      () => swAbProducerBridgeCompositionGovernance({ checkedSourceDocuments: bomDrift }),
      /checked-source inventory is invalid|checked-source raw or canonical hash drifted/u,
      `BOM source ${index}`
    );
    const canonicalDrift = structuredClone(swAbProducerBridgeCompositionCheckedSourceDocuments);
    const changed = JSON.parse(canonicalDrift[index].source);
    changed.__governanceDrift = true;
    canonicalDrift[index].source = JSON.stringify(changed);
    assert.throws(
      () => swAbProducerBridgeCompositionGovernance({
        checkedSourceDocuments: canonicalDrift
      }),
      /checked-source raw or canonical hash drifted/u,
      `canonical source ${index}`
    );
  }
  for (const [overrideName, source] of [
    ["libSource", swAbProducerBridgeCompositionLibSource],
    ["schemaLoaderSource", swAbProducerBridgeCompositionSchemaLoaderSource],
    ["fixtureSource", swAbProducerBridgeCompositionFixtureSource],
    ["testSource", swAbProducerBridgeCompositionTestSource],
    ["verifierSource", swAbProducerBridgeCompositionVerifierSource]
  ]) {
    assert.throws(
      () => swAbProducerBridgeCompositionGovernance({
        [overrideName]: `${source}\n// governance drift`
      }),
      /sources are not exactly frozen/u,
      overrideName
    );
  }
});

test("producer-bridge composition v2 freezes terminal-gate shape and physical inclusion", () => {
  const missingGateShape = swAbProducerBridgeCompositionLibSource.replace(
    "&& isRecord(bridgeLoaded.endpointFingerprint.terminalGate)",
    "&& true"
  );
  assert.notEqual(missingGateShape, swAbProducerBridgeCompositionLibSource);
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ libSource: missingGateShape }),
    /sources are not exactly frozen/u
  );
  const missingPhysicalGate = swAbProducerBridgeCompositionLibSource.replace(
    "identity: bridgeLoaded.endpointFingerprint.terminalGate",
    "identity: publicationIdentity"
  );
  assert.notEqual(missingPhysicalGate, swAbProducerBridgeCompositionLibSource);
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ libSource: missingPhysicalGate }),
    /sources are not exactly frozen/u
  );
  const fixtureWithoutGate = swAbProducerBridgeCompositionFixtureSource.replace(
    "terminalGate: terminalGateIdentity",
    "terminalGate: publicationIdentity"
  );
  assert.notEqual(fixtureWithoutGate, swAbProducerBridgeCompositionFixtureSource);
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ fixtureSource: fixtureWithoutGate }),
    /sources are not exactly frozen/u
  );
  const testWithoutAliasRejection = swAbProducerBridgeCompositionTestSource.replace(
    "bridge terminal gate physically aliased to another input",
    "bridge terminal gate identity omitted from alias checks"
  );
  assert.notEqual(testWithoutAliasRejection, swAbProducerBridgeCompositionTestSource);
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ testSource: testWithoutAliasRejection }),
    /sources are not exactly frozen/u
  );
});

test("producer-bridge composition v2 rejects aliases, formal consumers, and every CI run form", () => {
  const exactCommandDrift = structuredClone(packageJson);
  exactCommandDrift.scripts[
    "verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition"
  ] += " && exit 0";
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ packageJson: exactCommandDrift }),
    /package script mismatch/u
  );
  for (const [scriptName, command] of [
    [
      "produce:bridge-composition",
      "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs"
    ],
    [
      "neutral-symbol-alias",
      "node -e \"console.log('SW_AB_PRODUCER_BRIDGE_COMPOSITION_STATUS')\""
    ],
    ["neutral-id-alias", "node -e \"console.log('swab4pb2-deadbeef')\""]
  ]) {
    const aliased = structuredClone(packageJson);
    aliased.scripts[scriptName] = command;
    assert.throws(
      () => swAbProducerBridgeCompositionGovernance({ packageJson: aliased }),
      /two standalone closed scripts/u,
      scriptName
    );
  }
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts[
    "preverify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition"
  ] = "node -e ok";
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden|two standalone closed scripts/u
  );
  const formalAggregate = structuredClone(packageJson);
  formalAggregate.scripts["test:release-evidence"] +=
    " scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.test.mjs";
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({ packageJson: formalAggregate }),
    /two standalone closed scripts/u
  );
  assert.throws(
    () => swAbProducerBridgeCompositionGovernance({
      forbiddenConsumerSources: [
        'import "./sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs";'
      ]
    }),
    /isolated from formal admission/u
  );

  const command =
    "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
  const injections = [
    `      - run: ${command}`,
    `      - name: injected v2\n        run: ${command}`,
    `      - name: injected literal v2\n        run: |\n          ${command}`,
    `      - name: injected folded v2\n        run: >-\n          ${command}`
  ];
  for (const [workflowIndex, workflowSource] of [
    workflow,
    quickWorkflow,
    nightlyWorkflow,
    releaseWorkflow
  ].entries()) {
    for (const injection of injections) {
      assert.throws(
        () => swAbProducerBridgeCompositionGovernance({
          ciWorkflowSources: [`${workflowSource}\n${injection}`]
        }),
        /isolated from formal admission/u,
        `workflow ${workflowIndex}: ${injection}`
      );
    }
  }
});

test("formal receipts and every root lifecycle reject producer-bridge composition v2", () => {
  const directReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  directReceipts["producer-bridge-composition-v2"] = [
    "npm",
    "run",
    "verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition"
  ];
  assert.throws(
    () => verifyDefaultV13ReceiptCommandAllowlist(directReceipts),
    /exact audited allowlist/u
  );
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(directReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const recursiveReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  recursiveReceipts["evidence-tooling"] = ["npm", "run", "neutral-v2-a"];
  const recursivePackage = structuredClone(packageJson);
  recursivePackage.scripts["neutral-v2-a"] = "npm run neutral-v2-b";
  recursivePackage.scripts["neutral-v2-b"] =
    "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(recursiveReceipts, {
      root: { path: "package.json", packageJson: recursivePackage },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  for (const rootScript of [
    "check:release-governance",
    "test:release-evidence",
    "typecheck",
    "test",
    "build",
    "test:release:boot-artifact",
    "test:release:backup-artifact",
    "test:release:pwa-artifact",
    "test:release:web-v1-artifact",
    "test:e2e:cross-schema-v13-v16",
    "test:e2e:orphaned-v13-recovery",
    "verify:built-release-storage-manifest"
  ]) {
    const injected = structuredClone(packageJson);
    injected.scripts[`pre${rootScript}`] =
      "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
    assert.throws(
      () => formalNpmClosure(injected),
      expectedRootHookRejection(`pre${rootScript}`, /SW A-to-B update candidate tooling must remain outside/u),
      rootScript
    );
  }
});

test("formal closure rejects direct, multihop, prefix, workspace, npm.cmd, and run-script v2 injection", () => {
  const direct = structuredClone(packageJson);
  direct.scripts["postcheck:release-governance"] =
    "npm run test:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
  assert.throws(
    () => formalNpmClosure(direct),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const multihop = structuredClone(packageJson);
  multihop.scripts["postcheck:release-governance"] = "npm run neutral-v2-hop-a";
  multihop.scripts["neutral-v2-hop-a"] = "npm run neutral-v2-hop-b";
  multihop.scripts["neutral-v2-hop-b"] =
    "npm run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
  assert.throws(
    () => formalNpmClosure(multihop),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  for (const prefixFlag of ["--prefix ../..", "--prefix=../.."]) {
    const prefixRoot = structuredClone(packageJson);
    const prefixWeb = structuredClone(webPackageJson);
    prefixWeb.scripts["postpreview:release-artifact"] = `npm ${prefixFlag} run neutral-v2-prefix`;
    prefixRoot.scripts["neutral-v2-prefix"] =
      "npm run-script verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
    assert.throws(
      () => formalNpmClosure(prefixRoot, prefixWeb),
      /SW A-to-B update candidate tooling must remain outside/u,
      prefixFlag
    );
  }
  for (const workspaceFlag of [
    "--workspace @hakimi/web",
    "--workspace=@hakimi/web",
    "-w @hakimi/web"
  ]) {
    const workspaceRootPackage = structuredClone(packageJson);
    const workspaceWebPackage = structuredClone(webPackageJson);
    workspaceRootPackage.scripts["postcheck:release-governance"] = `npm run neutral-v2-workspace ${workspaceFlag}`;
    workspaceWebPackage.scripts["neutral-v2-workspace"] =
      "npm.cmd --prefix ../.. run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
    assert.throws(
      () => formalNpmClosure(workspaceRootPackage, workspaceWebPackage),
      /SW A-to-B update candidate tooling must remain outside/u,
      workspaceFlag
    );
  }
  const npmCmd = structuredClone(packageJson);
  npmCmd.scripts["postcheck:release-governance"] =
    "npm.cmd run verify:sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition";
  assert.throws(
    () => formalNpmClosure(npmCmd),
    /SW A-to-B update candidate tooling must remain outside/u
  );
});

test("formal closure rejects embedded shell, direct Node, node -e, split identities, and v2 cycles", () => {
  for (const embeddedCommand of [
    "node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs",
    "powershell -Command node scripts/verify-sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition.mjs",
    "node -e \"import('./scripts/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-lib.mjs')\"",
    "node -e \"import('./scripts/' + ['sw','ab','update','candidate','runtime','client','capture','collector','issuance','producer','bridge','composition','lib.mjs'].join('-'))\"",
    "node -e \"console.log(['SW','AB','PRODUCER','BRIDGE','COMPOSITION','STATUS'].join('_'))\"",
    "node -e \"console.log(['four','chain','producer','bridge','composition'].join('_'))\"",
    "node -e \"console.log('swab4pb2-deadbeef')\""
  ]) {
    assert.throws(
      () => formalNpmClosure(packageJson, webPackageJson, [embeddedCommand]),
      /SW A-to-B update candidate tooling must remain outside|Formal npm closure refuses an opaque or dynamic terminal command/u,
      embeddedCommand
    );
  }
  const cyclic = structuredClone(packageJson);
  cyclic.scripts["postcheck:release-governance"] = "npm run v2-cycle-a";
  cyclic.scripts["v2-cycle-a"] = "npm run v2-cycle-b";
  cyclic.scripts["v2-cycle-b"] =
    "npm run v2-cycle-a && node -e \"import('./scripts/' + ['sw','ab','producer','bridge','composition','lib.mjs'].join('-'))\"";
  assert.throws(
    () => formalNpmClosure(cyclic),
    /SW A-to-B update candidate tooling must remain outside|Formal npm closure refuses an opaque or dynamic terminal command/u
  );
});

test("partial SW runtime capture governance rejects promotion and producer-path weakening", () => {
  const promotedPolicy = structuredClone(swAbUpdateRuntimeClientCapturePolicy);
  promotedPolicy.terminalState.usableForCandidateAssembly = true;
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({ policy: promotedPolicy }),
    /policy drifted|fail-closed contract/u
  );
  const reorderedPolicy = structuredClone(swAbUpdateRuntimeClientCapturePolicy);
  [
    reorderedPolicy.requiredObservationTuples[2],
    reorderedPolicy.requiredObservationTuples[4]
  ] = [
    reorderedPolicy.requiredObservationTuples[4],
    reorderedPolicy.requiredObservationTuples[2]
  ];
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({ policy: reorderedPolicy }),
    /policy drifted|partial contract/u
  );
  const promotedSchema = structuredClone(swAbUpdateRuntimeClientCaptureSchema);
  promotedSchema.properties.usableForCandidateAssembly.const = true;
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  const aliasedPackage = structuredClone(packageJson);
  aliasedPackage.scripts["postverify:sw-ab-update-runtime-client-capture"] = "node -e ok";
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({ packageJson: aliasedPackage }),
    /lifecycle aliases are forbidden/u
  );
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({
      probeSource: swAbUpdateRuntimeClientCaptureProbeSource.replace(
        "const untrustedProbeIssuedCaptures = new WeakSet()",
        "const untrustedProbeIssuedCaptures = new Set()"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({
      serviceWorkerSource: serviceWorkerSource.replace(
        "SW_AB_RUNTIME_CHALLENGE_RESULT_V1",
        "UNBOUND_RUNTIME_RESULT"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({
      serviceWorkerSource: serviceWorkerSource.replace(
        "    responsePort.postMessage({",
        "    self.skipWaiting();\n    responsePort.postMessage({"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => swAbUpdateRuntimeClientCaptureGovernance({
      serviceWorkerSource: serviceWorkerSource.replace(
        "  // BEGIN SW_AB_RUNTIME_CHALLENGE_V1_READ_ONLY",
        "  if (message?.type === \"SW_AB_RUNTIME_CHALLENGE_V1\") void self.skipWaiting();\n  // BEGIN SW_AB_RUNTIME_CHALLENGE_V1_READ_ONLY"
      )
    }),
    /sources are not exactly frozen/u
  );
});

function candidateReceiptTerminalGateGovernance(overrides = {}) {
  return verifyCandidateReceiptTerminalGateGovernance({
    hostRuntimeSource: deployedHostCandidateRuntimeSource,
    hostLoaderSource: deployedHostCandidateLoaderSource,
    providerRuntimeSource: providerDeploymentCandidateRuntimeSource,
    providerRuntimeTestSource: providerDeploymentCandidateRuntimeTestSource,
    providerLoaderSource: providerDeploymentCandidateLoaderSource,
    compositionSource: deployedPwaHostProviderCompositionSource,
    providerSequenceSchema: providerDeploymentCandidateSequenceSchema,
    providerSequenceLoaderSource: providerDeploymentCandidateSequenceLoaderSource,
    providerSequenceVerifierSource: providerDeploymentCandidateSequenceVerifierSource,
    providerSequenceWriterSource: providerDeploymentCandidateSequenceWriterSource,
    ...overrides
  });
}

test("host/provider candidate terminal-gate governance fixes the committed package boundary", () => {
  assert.deepEqual(candidateReceiptTerminalGateGovernance(), {
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
  for (const requiredFile of [
    "docs/release/deployed-host-http-receipt-candidate-v1.schema.json",
    "docs/release/独立v13公网HTTP主机候选回执采集器-v1-2026-08-27.md",
    "scripts/deployed-host-candidate-runtime.mjs",
    "scripts/deployed-host-candidate-runtime.test.mjs",
    "scripts/deployed-host-candidate-loader.mjs",
    "scripts/provider-deployment-candidate-runtime.test.mjs",
    "scripts/provider-deployment-candidate-sequence-writer.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(requiredFile), requiredFile);
});

test("host/provider candidate terminal-gate governance rejects seam or downstream binding regression", () => {
  const weakenedSequenceSchema = structuredClone(providerDeploymentCandidateSequenceSchema);
  weakenedSequenceSchema.$defs.TerminalGateBinding.additionalProperties = true;
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerSequenceSchema: weakenedSequenceSchema
    }),
    /Provider sequence Schema drifted/u
  );
  const wrongSizeSequenceSchema = structuredClone(providerDeploymentCandidateSequenceSchema);
  wrongSizeSequenceSchema.$defs.TerminalGateBinding.properties.size.const = 64;
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerSequenceSchema: wrongSizeSequenceSchema
    }),
    /Provider sequence Schema drifted/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      hostRuntimeSource: deployedHostCandidateRuntimeSource.replace(
        "await rename(pendingCommitPath, terminalCommitPath);",
        "await Promise.resolve();"
      )
    }),
    /terminal-gate governance fragment|terminal rename/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerRuntimeSource: `${providerDeploymentCandidateRuntimeSource}\n// onReceiptPublishedCheckpoint\n`
    }),
    /arbitrary callback/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      hostLoaderSource: deployedHostCandidateLoaderSource.replace(
        "commitsReceiptSha256: receiptSnapshot.binding.sha256",
        "commitsReceiptSha256: null"
      )
    }),
    /terminal-gate governance fragment/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerSequenceVerifierSource: providerDeploymentCandidateSequenceVerifierSource.replace(
        "checkpoint.heldFileIdentities.length !== 17",
        "checkpoint.heldFileIdentities.length !== 15"
      )
    }),
    /terminal-gate governance fragment/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerSequenceWriterSource: providerDeploymentCandidateSequenceWriterSource.replace(
        "await stdoutWrite(",
        "stdoutWrite("
      )
    }),
    /terminal-gate governance fragment|separate ledgers/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerSequenceWriterSource: providerDeploymentCandidateSequenceWriterSource.replace(
        "cliFailureLedger(error, result)",
        "cliFailureLedger(error, undefined)"
      )
    }),
    /terminal-gate governance fragment|separate ledgers/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerRuntimeTestSource: providerDeploymentCandidateRuntimeTestSource.replace(
        "const restoreCollected = await collectProviderDeploymentCandidate({",
        "const restoreCollected = await Promise.resolve({"
      )
    }),
    /terminal-gate governance fragment|exactly two production collectors/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerRuntimeTestSource: providerDeploymentCandidateRuntimeTestSource.replace(
        "const sequence = await loadVerifiedProviderDeploymentCandidateSequence(sequenceInput);",
        "const sequence = await Promise.resolve(sequenceInput);"
      )
    }),
    /terminal-gate governance fragment/u
  );
  assert.throws(
    () => candidateReceiptTerminalGateGovernance({
      providerRuntimeTestSource: providerDeploymentCandidateRuntimeTestSource.replace(
        "const sequenceOutputRoot = path.join(deployFixture.root, \"runtime-sequence-output\");",
        "await writeFile(terminalCommitFileName, Buffer.alloc(65));\n  const sequenceOutputRoot = path.join(deployFixture.root, \"runtime-sequence-output\");"
      )
    }),
    /must not handwrite/u
  );
});

test("rollback/provider sequence composition governance freezes the closed candidate contract", () => {
  assert.deepEqual(rollbackProviderSequenceCompositionGovernance(), {
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
  for (const [scriptName, command] of Object.entries(
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCRIPTS
  )) assert.equal(packageJson.scripts[scriptName], command);
  assert.equal(
    sha256(rollbackProviderSequenceCompositionLibSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_LIB_SOURCE_SHA256
  );
  assert.equal(
    sha256(rollbackProviderSequenceCompositionSchemaLoaderSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_LOADER_SOURCE_SHA256
  );
  assert.equal(
    sha256(rollbackProviderSequenceCompositionVerifierSource.replace(/\r\n?/gu, "\n")),
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_VERIFIER_SOURCE_SHA256
  );
  assert.match(
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_POLICY_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  assert.match(
    REQUIRED_ROLLBACK_PROVIDER_SEQUENCE_COMPOSITION_SCHEMA_CANONICAL_SHA256,
    /^[a-f0-9]{64}$/u
  );
  for (const requiredFile of [
    "docs/release/provider-deployment-receipt-candidate-v1.schema.json",
    "docs/release/provider-deployment-candidate-sequence-v1.schema.json",
    "scripts/provider-deployment-candidate-runtime.mjs",
    "scripts/provider-deployment-candidate-loader.mjs",
    "scripts/provider-deployment-candidate-sequence-loader.mjs",
    "scripts/provider-deployment-candidate-sequence-writer.mjs",
    "scripts/provider-deployment-candidate-sequence-verifier.mjs",
    "scripts/provider-deployment-candidate-sequence.test-fixture.mjs",
    "scripts/provider-deployment-candidate-sequence-loader.test.mjs",
    "docs/release/rollback-provider-sequence-composition-policy.v1.json",
    "docs/release/rollback-provider-sequence-composition-candidate-v1.schema.json",
    "docs/release/B阶段rollback与provider序列投影组合边界-v1-2026-08-27.md",
    "scripts/rollback-provider-sequence-composition-lib.mjs",
    "scripts/rollback-provider-sequence-composition-schema.mjs",
    "scripts/verify-rollback-provider-sequence-composition.mjs",
    "scripts/rollback-provider-sequence-composition.test-fixture.mjs",
    "scripts/rollback-provider-sequence-composition.test.mjs"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(requiredFile), requiredFile);
  assert.doesNotMatch(
    packageJson.scripts["test:release-evidence"],
    /(?:provider-deployment-candidate-sequence|rollback-provider-sequence-composition)/u
  );
});

test("rollback/provider sequence composition governance rejects policy or Schema promotion", () => {
  const promotedPolicy = structuredClone(rollbackProviderSequenceCompositionPolicy);
  promotedPolicy.terminalState.usableForAdmission = true;
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({ policy: promotedPolicy }),
    /policy|closed contract/u
  );
  const promotedSchema = structuredClone(rollbackProviderSequenceCompositionSchema);
  promotedSchema.properties.usableForAdmission.const = true;
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({ evidenceSchema: promotedSchema }),
    /Schema drifted/u
  );
  const weakenedTerminalGateSchema = structuredClone(
    rollbackProviderSequenceCompositionSchema
  );
  delete weakenedTerminalGateSchema.$defs.TerminalGateBinding.properties.commitsReceiptSha256;
  weakenedTerminalGateSchema.$defs.TerminalGateBinding.required = [
    "path", "size", "sha256"
  ];
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({
      evidenceSchema: weakenedTerminalGateSchema
    }),
    /Schema drifted/u
  );
});

test("rollback/provider sequence composition governance rejects lifecycle and import-direction bypasses", () => {
  const lifecycleAlias = structuredClone(packageJson);
  lifecycleAlias.scripts[
    "preverify:rollback-provider-sequence-composition-candidate"
  ] = "node -e ok";
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({ packageJson: lifecycleAlias }),
    /lifecycle aliases are forbidden/u
  );
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({
      libSource: rollbackProviderSequenceCompositionLibSource.replace(
        "./provider-deployment-candidate-sequence-verifier.mjs",
        "./provider-deployment-candidate-sequence-loader.mjs"
      )
    }),
    /sources are not exactly frozen/u
  );
  assert.throws(
    () => rollbackProviderSequenceCompositionGovernance({
      rollbackLibSource:
        `${rollbackEvidenceLibSource}\nimport "./rollback-provider-sequence-composition-lib.mjs";\n`
    }),
    /sources are not exactly frozen/u
  );
});

test("formal npm closure isolates provider sequences and rollback/provider compositions on every reachable path", () => {
  const injectedReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  injectedReceipts["provider-sequence"] = [
    "npm",
    "run",
    "test:provider-deployment-candidate-sequence"
  ];
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(injectedReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );

  const lifecycle = structuredClone(packageJson);
  lifecycle.scripts["postcheck:release-governance"] = "npm run test:provider-deployment-candidate-sequence";
  assert.throws(
    () => formalNpmClosure(lifecycle),
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );

  const multihop = structuredClone(packageJson);
  multihop.scripts["postcheck:release-governance"] = "npm run rollback-provider-bridge-a";
  multihop.scripts["rollback-provider-bridge-a"] = "npm run rollback-provider-bridge-b";
  multihop.scripts["rollback-provider-bridge-b"] =
    "node scripts/verify-rollback-provider-sequence-composition.mjs";
  assert.throws(
    () => formalNpmClosure(multihop),
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );

  const workspaceRootPackage = structuredClone(packageJson);
  const workspaceWebPackage = structuredClone(webPackageJson);
  workspaceWebPackage.scripts["postpreview:release-artifact"] = "npm --prefix ../.. run provider-sequence-bridge";
  workspaceRootPackage.scripts["provider-sequence-bridge"] =
    "node scripts/provider-deployment-candidate-sequence-verifier.mjs";
  assert.throws(
    () => formalNpmClosure(workspaceRootPackage, workspaceWebPackage),
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );

  assert.throws(
    () => formalNpmClosure(packageJson, webPackageJson, [
      "npm run test:rollback-provider-sequence-composition-candidate"
    ]),
    /Provider sequence and rollback\/provider composition candidate tooling must remain outside/u
  );

  const unreachable = structuredClone(packageJson);
  unreachable.scripts["standalone-provider-sequence-candidate"] =
    "node scripts/provider-deployment-candidate-sequence-verifier.mjs";
  unreachable.scripts["standalone-rollback-provider-composition"] =
    "node scripts/verify-rollback-provider-sequence-composition.mjs";
  assert.doesNotThrow(() => formalNpmClosure(unreachable));
});

test("formal allowlist and complete npm closure reject SW A-to-B candidate injection", () => {
  const injectedReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  injectedReceipts["sw-ab-update"] = ["npm", "run", "test:sw-ab-update-candidate"];
  assert.throws(
    () => verifyDefaultV13ReceiptCommandAllowlist(injectedReceipts),
    /exact audited allowlist/u
  );
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(injectedReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  for (const scriptName of [
    "pretest",
    "posttest",
    "pretypecheck",
    "posttypecheck",
    "prebuild",
    "postbuild",
    "pretest:release-evidence",
    "posttest:release-evidence"
  ]) {
    const injectedPackage = structuredClone(packageJson);
    injectedPackage.scripts[scriptName] = "npm run test:sw-ab-update-candidate";
    assert.throws(
      () => formalNpmClosure(injectedPackage),
      expectedRootHookRejection(scriptName, /SW A-to-B update candidate tooling must remain outside/u),
      scriptName
    );
  }
  const compositionInjectedPackage = structuredClone(packageJson);
  compositionInjectedPackage.scripts["postcheck:release-governance"] =
    "npm run test:sw-ab-update-candidate-runtime-client-capture-composition";
  assert.throws(
    () => formalNpmClosure(compositionInjectedPackage),
    /SW A-to-B update candidate tooling must remain outside/u
  );
  const neutralIdReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  neutralIdReceipts.swabrc1 = ["node", "scripts/neutral-wrapper.mjs"];
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(neutralIdReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /SW A-to-B update candidate tooling must remain outside/u
  );
});

test("formal allowlist and complete npm closure reject deployed PWA host/provider composition injection", () => {
  for (const requiredFile of [
    "scripts/deployed-pwa-host-provider-composition.mjs",
    "scripts/deployed-pwa-host-provider-composition.test-fixture.mjs",
    "scripts/deployed-pwa-host-provider-composition.test.mjs",
    "docs/release/deployed-pwa-host-provider-composition-candidate-v1.schema.json",
    "docs/release/B阶段v1候选与PWA-v3组合边界-2026-08-27.md"
  ]) assert.ok(REQUIRED_RELEASE_FILES.includes(requiredFile), requiredFile);

  const injectedReceipts = structuredClone(
    decisions.releaseEvidence.defaultV13RequiredReceiptCommands
  );
  injectedReceipts["host-provider-composition"] = [
    "npm",
    "run",
    "test:deployed-pwa-host-provider-composition-candidate"
  ];
  assert.throws(
    () => verifyDefaultV13ReceiptCommandAllowlist(injectedReceipts),
    /exact audited allowlist/u
  );
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(injectedReceipts, {
      root: { path: "package.json", packageJson },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /Deployed-PWA host\/provider composition candidate tooling must remain outside/u
  );

  for (const scriptName of [
    "pretest",
    "posttest",
    "pretypecheck",
    "posttypecheck",
    "prebuild",
    "postbuild",
    "pretest:release-evidence",
    "posttest:release-evidence"
  ]) {
    const injectedPackage = structuredClone(packageJson);
    injectedPackage.scripts[scriptName] =
      "npm run test:deployed-pwa-host-provider-composition-candidate";
    assert.throws(
      () => formalNpmClosure(injectedPackage),
      expectedRootHookRejection(scriptName, /Deployed-PWA host\/provider composition candidate tooling must remain outside/u),
      scriptName
    );
  }

  const unreachable = structuredClone(packageJson);
  unreachable.scripts["unreachable-host-provider-composition"] =
    "node scripts/deployed-pwa-host-provider-composition.mjs";
  assert.doesNotThrow(() => formalNpmClosure(unreachable));
});

test("formal npm closure follows aliases, workspace prefixes, and embedded composition commands", () => {
  const multihop = structuredClone(packageJson);
  multihop.scripts["postcheck:release-governance"] = "npm run composition-bridge-a";
  multihop.scripts["composition-bridge-a"] = "npm run composition-bridge-b";
  multihop.scripts["composition-bridge-b"] =
    "node scripts/deployed-pwa-host-provider-composition.mjs";
  assert.throws(
    () => formalNpmClosure(multihop),
    /Deployed-PWA host\/provider composition candidate tooling must remain outside/u
  );

  const workspaceBridge = structuredClone(packageJson);
  const workspaceWeb = structuredClone(webPackageJson);
  workspaceWeb.scripts["postpreview:release-artifact"] = "npm --prefix ../.. run composition-bridge";
  workspaceBridge.scripts["composition-bridge"] =
    "node scripts/deployed-pwa-host-provider-composition.mjs";
  assert.throws(
    () => formalNpmClosure(workspaceBridge, workspaceWeb),
    /Deployed-PWA host\/provider composition candidate tooling must remain outside/u
  );

  assert.throws(
    () => formalNpmClosure(packageJson, webPackageJson, [
      "npm run test:deployed-pwa-host-provider-composition-candidate"
    ]),
    /Deployed-PWA host\/provider composition candidate tooling must remain outside/u
  );
});

test("formal npm closure rejects candidate injection through every root lifecycle", () => {
  for (const scriptName of [
    "pretest",
    "posttest",
    "pretypecheck",
    "posttypecheck",
    "prebuild",
    "postbuild",
    "pretest:release-evidence",
    "posttest:release-evidence"
  ]) {
    const weakened = structuredClone(packageJson);
    weakened.scripts[scriptName] = "npm run test:storage-v13-matrix-candidate";
    assert.throws(
      () => formalNpmClosure(weakened),
      expectedRootHookRejection(scriptName, /Storage-v13 matrix candidate tooling must remain outside/u),
      scriptName
    );
  }
});

test("formal npm closure follows multihop cycles without scanning unreachable candidate scripts", () => {
  const unreachable = structuredClone(packageJson);
  unreachable.scripts["unreachable-storage-v13-matrix-candidate"] =
    "node scripts/storage-v13-matrix-candidate-runtime.mjs";
  assert.doesNotThrow(() => formalNpmClosure(unreachable));

  const cyclic = structuredClone(packageJson);
  cyclic.scripts["postcheck:release-governance"] = "npm run closure-a";
  cyclic.scripts["closure-a"] = "npm run closure-b";
  cyclic.scripts["closure-b"] = "npm run closure-a";
  assert.throws(
    () => formalNpmClosure(cyclic),
    /Formal npm\/lifecycle\/workspace closure canonical digest drifted/u
  );
  cyclic.scripts["closure-b"] =
    "npm run closure-a && node scripts/storage-v13-matrix-candidate-runtime.mjs";
  assert.throws(
    () => formalNpmClosure(cyclic),
    /Storage-v13 matrix candidate tooling must remain outside/u
  );
});

test("formal npm closure rejects neutral root and workspace lifecycle wrappers", () => {
  const neutralRootWrapper = "node scripts/formal-evidence-extension.mjs";
  assert.doesNotMatch(neutralRootWrapper, /storage[-_ ]v13[-_ ]matrix/iu);
  const rootLifecycle = structuredClone(packageJson);
  rootLifecycle.scripts["postcheck:release-governance"] = neutralRootWrapper;
  assert.throws(
    () => formalNpmClosure(rootLifecycle),
    /Formal npm\/lifecycle\/workspace closure canonical digest drifted|Formal npm closure refuses an opaque or dynamic terminal command/u
  );

  const splitCandidateImport =
    "node -e \"import('./scripts/' + ['storage','v13','matrix','candidate-runtime.mjs'].join('-'))\"";
  assert.doesNotMatch(splitCandidateImport, /storage[-_ ]v13[-_ ]matrix/iu);
  const workspaceLifecycle = structuredClone(webPackageJson);
  workspaceLifecycle.scripts["postpreview:release-artifact"] = splitCandidateImport;
  assert.throws(
    () => formalNpmClosure(packageJson, workspaceLifecycle),
    /Formal npm\/lifecycle\/workspace closure canonical digest drifted|Formal npm closure refuses an opaque or dynamic terminal command/u
  );
});

test("formal npm closure follows workspace, prefix, and embedded Playwright lifecycle roots", () => {
  const workspaceBridge = structuredClone(packageJson);
  const workspaceWeb = structuredClone(webPackageJson);
  workspaceWeb.scripts["postpreview:release-artifact"] = "npm --prefix ../.. run closure-bridge";
  workspaceBridge.scripts["closure-bridge"] =
    "node scripts/storage-v13-matrix-candidate-runtime.mjs";
  assert.throws(
    () => formalNpmClosure(workspaceBridge, workspaceWeb),
    /Storage-v13 matrix candidate tooling must remain outside/u
  );

  const previewWeb = structuredClone(webPackageJson);
  previewWeb.scripts["postpreview:release-artifact"] =
    "npm --prefix ../.. run test:storage-v13-matrix-candidate";
  assert.throws(
    () => formalNpmClosure(packageJson, previewWeb),
    /Storage-v13 matrix candidate tooling must remain outside/u
  );

  const serveWeb = structuredClone(webPackageJson);
  serveWeb.scripts["postserve:e2e"] =
    "npm --prefix ../.. run test:storage-v13-matrix-candidate";
  assert.doesNotThrow(() => formalNpmClosure(packageJson, serveWeb));
});

test("formal npm closure parses npm.cmd flags and rejects unknown selectors or grammar", () => {
  const receipts = structuredClone(decisions.releaseEvidence.defaultV13RequiredReceiptCommands);
  receipts.unit = ["npm.cmd", "--silent", "test"];
  const weakened = structuredClone(packageJson);
  weakened.scripts["postcheck:release-governance"] = "node scripts/storage-v13-matrix-candidate-runtime.mjs";
  assert.throws(
    () => verifyFormalReceiptNpmLifecycleClosure(receipts, {
      root: { path: "package.json", packageJson: weakened },
      web: { path: "apps/web/package.json", packageJson: webPackageJson },
      embeddedCommands: []
    }),
    /Storage-v13 matrix candidate tooling must remain outside/u
  );
  for (const command of [
    "npm run build --workspace @unknown/web",
    "npm --prefix ../missing run build",
    "npm --workspaces run build",
    "cross-env FLAG=1 npm run build"
  ]) {
    assert.throws(
      () => formalNpmClosure(packageJson, webPackageJson, [command]),
      /Formal npm closure/u,
      command
    );
  }
});

test("storage-v13 candidate governance rejects policy, Schema, script, and TypeScript promotion", () => {
  assert.throws(
    () => storageCandidateGovernance({
      historicalPolicyV1Source: `${storageV13MatrixHistoricalPolicyV1Source}\n`
    }),
    /Historical storage-v13 v1 candidate contract drifted/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      historicalReceiptSchemaV1Source: `${storageV13MatrixHistoricalReceiptSchemaV1Source} `
    }),
    /Historical storage-v13 v1 candidate contract drifted/u
  );
  const rewrittenHistoricalPolicy = structuredClone(storageV13MatrixHistoricalPolicyV1);
  rewrittenHistoricalPolicy.policyId = "storage-v13-matrix-candidate-policy-v1-rewritten";
  assert.throws(
    () => storageCandidateGovernance({ historicalPolicyV1: rewrittenHistoricalPolicy }),
    /Historical storage-v13 v1 candidate contract drifted/u
  );
  const rewrittenHistoricalSchema = structuredClone(storageV13MatrixHistoricalReceiptSchemaV1);
  rewrittenHistoricalSchema.title = `${rewrittenHistoricalSchema.title} rewritten`;
  assert.throws(
    () => storageCandidateGovernance({ historicalReceiptSchemaV1: rewrittenHistoricalSchema }),
    /Historical storage-v13 v1 candidate contract drifted/u
  );
  const weakenedPolicy = structuredClone(storageV13MatrixPolicy);
  weakenedPolicy.observedOperations[0].countDeltas.cases = 2;
  assert.throws(
    () => storageCandidateGovernance({ policy: weakenedPolicy }),
    /policy drifted/u
  );
  const weakenedExportBinding = structuredClone(storageV13MatrixPolicy);
  delete weakenedExportBinding.observedOperations[3].relationship;
  assert.throws(
    () => storageCandidateGovernance({ policy: weakenedExportBinding }),
    /policy drifted/u
  );
  const promotedPolicy = structuredClone(storageV13MatrixPolicy);
  Object.assign(promotedPolicy.deferredBoundaries[3], {
    status: "observed_pass",
    satisfied: true,
    evidence: { invented: true },
    reasonCode: "NONE"
  });
  assert.throws(
    () => storageCandidateGovernance({ policy: promotedPolicy }),
    /policy drifted/u
  );
  const legacyRollbackPolicy = structuredClone(storageV13MatrixPolicy);
  Object.assign(legacyRollbackPolicy.deferredBoundaries[3], {
    boundaryId: "rollback",
    reasonCode: "NO_POST_MUTATION_ABORT_HOOK"
  });
  assert.throws(
    () => storageCandidateGovernance({ policy: legacyRollbackPolicy }),
    /policy drifted/u
  );
  const legacyAuthorityPolicy = structuredClone(storageV13MatrixPolicy);
  delete legacyAuthorityPolicy.authority.crossSchemaNoBackwriteVerified;
  assert.throws(
    () => storageCandidateGovernance({ policy: legacyAuthorityPolicy }),
    /policy drifted/u
  );
  const promotedNoBackwriteAuthority = structuredClone(storageV13MatrixPolicy);
  promotedNoBackwriteAuthority.authority.crossSchemaNoBackwriteVerified = true;
  assert.throws(
    () => storageCandidateGovernance({ policy: promotedNoBackwriteAuthority }),
    /policy drifted/u
  );
  const runtimeWithoutEditSemanticCheck = storageV13MatrixRuntimeSource.replace(
    'if (operationId === "edit") requireEditSemanticRelationship(captures[0], captures[1]);',
    'if (operationId === "edit") { /* error-code declarations remain, validation removed */ }'
  );
  assert.notEqual(runtimeWithoutEditSemanticCheck, storageV13MatrixRuntimeSource);
  assert.throws(
    () => storageCandidateGovernance({
      candidateRuntimeSource: runtimeWithoutEditSemanticCheck
    }),
    /browser collector is not strictly isolated/u
  );
  const promotedSchema = structuredClone(storageV13MatrixReceiptSchema);
  promotedSchema.properties.strictGatePassed.const = true;
  assert.throws(
    () => storageCandidateGovernance({ receiptSchema: promotedSchema }),
    /Schema drifted/u
  );
  const scriptedLifecycle = structuredClone(packageJson);
  scriptedLifecycle.scripts["precapture:storage-v13-matrix-candidate"] = "npm run build";
  assert.throws(
    () => storageCandidateGovernance({ packageJson: scriptedLifecycle }),
    /lifecycle aliases are forbidden/u
  );
  const leakedRootTypecheck = structuredClone(rootTsconfig);
  leakedRootTypecheck.exclude = leakedRootTypecheck.exclude.slice(1);
  assert.throws(
    () => storageCandidateGovernance({ rootTsconfig: leakedRootTypecheck }),
    /TypeScript isolation has drifted/u
  );
  const weakenedCandidateTypecheck = structuredClone(storageV13MatrixTsconfig);
  weakenedCandidateTypecheck.include = weakenedCandidateTypecheck.include.filter(
    (entry) => entry !== "e2e/storage-v13-native-readonly.ts"
  );
  assert.throws(
    () => storageCandidateGovernance({ candidateTsconfig: weakenedCandidateTypecheck }),
    /TypeScript isolation has drifted/u
  );
});

test("storage-v13 candidate collector rejects build/server/formal-reporter coupling", () => {
  assert.throws(
    () => storageCandidateGovernance({
      candidateConfigSource: `${storageV13MatrixConfigSource}\nwebServer: { command: "npm run build" }`
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateGlobalSetupSource: storageV13MatrixGlobalSetupSource
        .replace("prepareFreshStorageV13MatrixCandidateRun(candidate)", "Promise.resolve()")
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateReporterSource: storageV13MatrixReporterSource
        .replace("strictGatePassed: false", "strictGatePassed: true")
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateReporterSource: storageV13MatrixReporterSource
        .replace(
          "publishStorageV13MatrixCandidateSummary({",
          "Promise.resolve({ published: true }); void ({"
        )
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateRuntimeSource: storageV13MatrixRuntimeSource.replace(
        "await rename(pendingTerminalCommitPath, terminalCommitPath)",
        "await Promise.resolve()"
      )
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateVerifierSource: storageV13MatrixVerifierSource.replace(
        "const terminalGateBinding = validateTerminalCommitMarker({",
        "const terminalGateBinding = Object.freeze({"
      )
    }),
    /browser collector is not strictly isolated/u
  );
  assert.throws(
    () => storageCandidateGovernance({
      candidateRuntimeSource: storageV13MatrixRuntimeSource.replace(
        'testOnlyTerminalCommitFault === "create_target_directory_collision"',
        'typeof testOnlyTerminalCommitFault === "function"'
      )
    }),
    /browser collector is not strictly isolated/u
  );
});

test("default Bazi inventory obligations cannot replace strict independent eligibility commands", () => {
  const pairs = [
    ["check:independent-source-inventory", "check:independent-source-binding-requirements"],
    ["check:independent-domain-inventory", "check:independent-domain-release-manifests"]
  ];
  const reachable = new Set(currentFormalNpmClosure.reachableScriptTuples.map((entry) => entry.command));
  for (const [inventory, strict] of pairs) {
    assert.equal(reachable.has(packageJson.scripts[inventory]), true);
    assert.equal(reachable.has(packageJson.scripts[strict]), false);
    for (const [target, replacement] of [[inventory, strict], [strict, inventory]]) {
      const changed = structuredClone(packageJson);
      changed.scripts[target] = changed.scripts[replacement];
      assert.throws(() => verifyQuickCiGovernance(quickWorkflow, changed), /separate fixed scopes/);
    }
    const coupled = structuredClone(packageJson);
    coupled.scripts[`pre${inventory}`] = `npm run ${strict}`;
    assert.throws(() => verifyQuickCiGovernance(quickWorkflow, coupled), /separate fixed scopes/);
  }
});
