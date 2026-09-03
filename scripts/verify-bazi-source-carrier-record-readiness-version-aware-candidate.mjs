#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary,
  isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate,
  loadBaziSourceCarrierRecordReadinessVersionAwareCandidate
} from "./bazi-source-carrier-record-readiness-version-aware-candidate-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const result = await loadBaziSourceCarrierRecordReadinessVersionAwareCandidate(workspaceRoot);

if (!isVerifiedBaziSourceCarrierRecordReadinessVersionAwareCandidate(result)) {
  throw new Error("version-aware carrier readiness loader did not return its private WeakSet brand");
}

console.log(JSON.stringify({
  ok: true,
  ...getBaziSourceCarrierRecordReadinessVersionAwareCandidateSummary(result)
}));
