import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH,
  readSystemAdmissionRegistry,
  verifySystemAdmissionRegistry
} from "./system-admission-registry-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const verified = await verifySystemAdmissionRegistry(workspaceRoot, registry);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    registry: SYSTEM_ADMISSION_REGISTRY_RELATIVE_PATH,
    registryDigest: verified.registryDigest,
    systemsRegistered: verified.systemsRegistered,
    systemsFormallyAdmitted: verified.systemsFormallyAdmitted,
    systemsDomainAuthorityAuthorized: registry.gateSummary.systemsDomainAuthorityAuthorized,
    systemsReleaseReady: registry.gateSummary.systemsReleaseReady,
    formalCrossSystemComparisonAuthorized:
      registry.gateSummary.formalCrossSystemComparisonAuthorized,
    publicDeploymentAuthorized: registry.releaseGovernance.publicDeploymentAuthorized,
    expertClaimsAuthorized: registry.releaseGovernance.expertClaimsAuthorized
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "四体系独立准入登记验证失败。"}\n`);
  process.exitCode = 1;
}
