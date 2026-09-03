import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
  buildCurrentFourSystemObservationRegistryV2,
  serializeFourSystemCurrentObservationRegistryV2
} from "./four-system-current-observation-registry-v2-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = await buildCurrentFourSystemObservationRegistryV2(workspaceRoot);
const serialized = serializeFourSystemCurrentObservationRegistryV2(registry);
const absolutePath = path.resolve(
  workspaceRoot,
  ...FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH.split("/")
);

let handle;
try {
  handle = await open(absolutePath, "wx");
  await handle.writeFile(serialized, "utf8");
  await handle.sync();
} finally {
  await handle?.close();
}

process.stdout.write(`${JSON.stringify({
  path: FOUR_SYSTEM_CURRENT_OBSERVATION_REGISTRY_V2_RELATIVE_PATH,
  rawBytes: Buffer.byteLength(serialized),
  rawSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
  registryDigest: registry.registryDigest
})}\n`);
