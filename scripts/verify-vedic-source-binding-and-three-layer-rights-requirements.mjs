import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  readVedicSourceBindingAndThreeLayerRightsRequirements,
  verifyVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

if (process.argv.length !== 2) {
  process.stderr.write(`${JSON.stringify({
    errorCode: "CLI_ARGUMENTS_FORBIDDEN",
    message: "该 CLI 只验证固定项目内的吠陀来源与三层权利要求账，不接受位置参数。",
    sourceRightsRequirementsClosureVerified: false
  })}\n`);
  process.exitCode = 2;
} else {
  try {
    const ledger = await readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
    const result = await verifyVedicSourceBindingAndThreeLayerRightsRequirements(
      workspaceRoot,
      ledger
    );
    process.stdout.write(`${JSON.stringify({
      bindingFrozenVerified: result.bindingFrozenVerified,
      bindingRequired: result.bindingRequired,
      bindingRequirementsInventoryDefined: result.bindingRequirementsInventoryDefined,
      ledger: VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
      ledgerDigest: result.ledgerDigest,
      publicReleaseAuthorized: result.publicReleaseAuthorized,
      releaseReady: result.releaseReady,
      requirementsUniverseClosed: result.requirementsUniverseClosed,
      rightsBundleComplete: result.rightsBundleComplete,
      sourceBundleComplete: result.sourceBundleComplete,
      sourceRightsRequirementsClosureVerified: true,
      status: result.status,
      subjectCount: result.subjectCount
    })}\n`);
  } catch (cause) {
    process.stderr.write(`${JSON.stringify({
      errorCode: typeof cause?.code === "string" ? cause.code : "UNEXPECTED_ERROR",
      message: cause instanceof Error ? cause.message : String(cause),
      sourceRightsRequirementsClosureVerified: false
    })}\n`);
    process.exitCode = 1;
  }
}
