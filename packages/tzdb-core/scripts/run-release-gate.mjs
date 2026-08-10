import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyTzdbArtifact } from "./verify-artifact.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "../../..");
console.log(JSON.stringify(verifyTzdbArtifact(), null, 2));

const vitest = path.resolve(workspaceRoot, "node_modules/vitest/vitest.mjs");
const result = spawnSync(process.execPath, [
  vitest,
  "run",
  "--config",
  "apps/web/vitest.config.ts",
  "packages/tzdb-core/src/index.test.ts",
  "packages/time-core/src/index.test.ts"
], { cwd: workspaceRoot, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
