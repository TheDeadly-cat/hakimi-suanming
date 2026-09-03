import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyAllIndependentSourceRequirements } from "./independent-source-binding-requirements-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const verified = await verifyAllIndependentSourceRequirements(workspaceRoot);
  process.stdout.write(`${JSON.stringify({
    ok: true,
    ledgers: verified.map((entry) => ({
      productSystemId: entry.productSystemId,
      bindingRequired: entry.bindingRequired,
      bindingFrozenVerified: entry.bindingFrozenVerified,
      ledgerDigest: entry.ledgerDigest,
      sourceBundleComplete: entry.ledger.gateSummary.sourceBundleComplete,
      rightsBundleComplete: entry.ledger.gateSummary.rightsBundleComplete,
      expertReviewBundleComplete: entry.ledger.gateSummary.expertReviewBundleComplete
    }))
  })}\n`);
} catch (reason) {
  process.stderr.write(`${reason instanceof Error ? reason.message : "独立体系来源 requirements 验证失败。"}\n`);
  process.exitCode = 1;
}
