import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBaziSourceCarrierRecordReadinessSummary,
  isVerifiedBaziSourceCarrierRecordReadiness,
  loadBaziSourceCarrierRecordReadiness
} from "./bazi-source-carrier-record-readiness-lib.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const capability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);

if (!isVerifiedBaziSourceCarrierRecordReadiness(capability)) {
  throw new Error("carrier readiness loader did not return its private verification brand");
}
const summary = getBaziSourceCarrierRecordReadinessSummary(capability);

console.log(JSON.stringify({
  ok: true,
  ...summary
}));
