import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isVerifiedIndependentDomainManifestFullLoad,
  verifyAllIndependentDomainManifests
} from "./independent-domain-release-manifest-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const verified = await verifyAllIndependentDomainManifests(workspaceRoot);
  if (!verified.every(isVerifiedIndependentDomainManifestFullLoad)) {
    throw new Error("独立体系 manifest full-load 结果缺少内部验证品牌。");
  }
  process.stdout.write(`${JSON.stringify({
    offlineIndependentDraftClosureMechanicallyVerified: true,
    formalAdmissionAuthorized: false,
    domainAuthorityAuthorized: false,
    expertClaimsAuthorized: false,
    publicDeploymentAuthorized: false,
    releaseReady: false,
    publicReleaseAuthorized: false,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    crossFileAtomicSnapshot: false,
    intervalMutationExcluded: false,
    abaExcluded: false,
    manifests: verified.map((entry) => ({
      productSystemId: entry.productSystemId,
      manifestId: entry.manifest.manifestId ?? null,
      manifestSchemaVersion: entry.manifest.schemaVersion,
      manifestDigest: entry.manifestDigest,
      artifact: entry.artifact,
      releaseStatus: entry.manifest.releaseStatus,
      releaseIdentity: entry.manifest.releaseGovernance.releaseIdentity,
      targetSchema: entry.manifest.releaseGovernance.targetSchema,
      migrationId: entry.manifest.releaseGovernance.migrationId,
      bindingRequired: entry.manifest.gateState.bindingRequired,
      bindingFrozenVerified: entry.manifest.gateState.bindingFrozenVerified,
      independentExpertReviewsVerified:
        entry.manifest.gateState.independentExpertReviewsVerified,
      expertClaimsAuthorized:
        entry.manifest.releaseGovernance.expertClaimsAuthorized,
      publicDeploymentAuthorized:
        entry.manifest.releaseGovernance.publicDeploymentAuthorized,
      sourceBundleComplete: entry.manifest.gateState.sourceBundleComplete,
      rightsBundleComplete: entry.manifest.gateState.rightsBundleComplete,
      expertReviewBundleComplete: entry.manifest.gateState.expertReviewBundleComplete,
      releaseEvidenceComplete: entry.manifest.gateState.releaseEvidenceComplete
    }))
  })}\n`);
} catch (reason) {
  process.stderr.write(`${JSON.stringify({
    offlineIndependentDraftClosureMechanicallyVerified: false,
    errorCode: typeof reason?.code === "string" ? reason.code : "UNEXPECTED_ERROR",
    message: reason instanceof Error ? reason.message : "独立体系 manifest 验证失败。"
  })}\n`);
  process.exitCode = 1;
}
