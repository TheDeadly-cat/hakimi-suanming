import { execFile } from "node:child_process";
import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs";

const execFileAsync = promisify(execFile);

export async function prepareSwAbRuntimeDerivedEvidenceProducerBridgeWorkspace({
  sourceWorkspaceRoot,
  workspaceRoot
}) {
  await mkdir(path.join(workspaceRoot, "docs", "release"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "tmp"), { recursive: true });
  for (const requirement of SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS) {
    const source = path.join(sourceWorkspaceRoot, ...requirement.path.split("/"));
    const destination = path.join(workspaceRoot, ...requirement.path.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { force: false, errorOnExist: true });
  }
  return Object.freeze({ workspaceRoot });
}

export async function writeSwAbRuntimeDerivedEvidenceProducerBridgeIssuanceFixture({
  sourceWorkspaceRoot,
  workspaceRoot,
  runRoot
}) {
  await prepareSwAbRuntimeDerivedEvidenceProducerBridgeWorkspace({
    sourceWorkspaceRoot,
    workspaceRoot
  });
  const fixtureModuleUrl = pathToFileURL(path.join(
    sourceWorkspaceRoot,
    "scripts/sw-ab-update-runtime-collector-issuance.test-fixture.mjs"
  )).href;
  const program = [
    `import { writeCollectorIssuanceFixture } from ${JSON.stringify(fixtureModuleUrl)};`,
    `await writeCollectorIssuanceFixture({ workspaceRoot: ${JSON.stringify(workspaceRoot)}, runRoot: ${JSON.stringify(runRoot)} });`
  ].join("\n");
  await execFileAsync(process.execPath, ["--input-type=module", "--eval", program], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  return Object.freeze({ workspaceRoot, runRoot });
}

export async function writeSwAbRuntimeDerivedEvidenceProducerBridgeFixture({
  sourceWorkspaceRoot,
  workspaceRoot,
  runRoot,
  bridgeRoot
}) {
  const issuance = await writeSwAbRuntimeDerivedEvidenceProducerBridgeIssuanceFixture({
    sourceWorkspaceRoot,
    workspaceRoot,
    runRoot
  });
  const bridge = await publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge({
    cwd: workspaceRoot,
    bindingRoot: workspaceRoot,
    issuanceRunRoot: runRoot,
    bridgeRoot
  });
  return Object.freeze({ ...issuance, bridgeRoot, bridge });
}
