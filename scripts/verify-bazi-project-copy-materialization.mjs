#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";
import {
  BaziProjectCopyMaterializationError,
  readBaziProjectCopyMaterializationRequirementsLedger,
  verifyBaziProjectCopyMaterializationRequirementsLedger
} from "./bazi-project-copy-materialization-lib.mjs";

export async function runBaziProjectCopyMaterializationVerification(workspaceRoot = process.cwd()) {
  const ledger = await readBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot);
  return verifyBaziProjectCopyMaterializationRequirementsLedger(workspaceRoot, ledger);
}

const invokedDirectly = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (invokedDirectly) {
  try {
    const result = await runBaziProjectCopyMaterializationVerification();
    process.stdout.write(`${JSON.stringify({
      ok: true,
      status: result.status,
      ledgerDigest: result.ledgerDigest,
      formalSourceCarrierRecords: result.formalSourceCarrierRecords,
      projectCopyMaterializationRecords: result.projectCopyMaterializationRecords,
      materializationsVerified: result.materializationsVerified,
      releaseReady: result.releaseReady,
      publicDeploymentAuthorized: result.publicDeploymentAuthorized,
      observationBoundary: result.ledger.observationBoundary
    })}\n`);
  } catch (error) {
    const code = error instanceof BaziProjectCopyMaterializationError
      ? error.code
      : "UNEXPECTED_FAILURE";
    process.stderr.write(`${JSON.stringify({ ok: false, code })}\n`);
    process.exitCode = 1;
  }
}

