import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
  readBaziDomainReleaseManifest,
  verifyBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const manifest = await readBaziDomainReleaseManifest(workspaceRoot);
  const verified = await verifyBaziDomainReleaseManifest(workspaceRoot, manifest);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    manifest: BAZI_DOMAIN_RELEASE_MANIFEST_RELATIVE_PATH,
    manifestDigest: verified.manifestDigest,
    releaseStatus: manifest.releaseStatus,
    bindingFrozenVerified: manifest.gateState.bindingFrozenVerified,
    bindingRequired: manifest.gateState.bindingRequired,
    expertReviewsVerified: manifest.gateState.independentExpertReviewsVerified,
    expertsRequired: manifest.gateState.independentExpertsRequired,
    publicDeploymentAuthorized: manifest.releaseGovernance.publicDeploymentAuthorized,
    expertClaimsAuthorized: manifest.releaseGovernance.expertClaimsAuthorized
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "八字体系 manifest 验证失败。"}\n`);
  process.exitCode = 1;
}
