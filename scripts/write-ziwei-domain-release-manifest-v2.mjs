import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  buildCurrentIndependentDomainManifest,
  serializeIndependentDomainManifest
} from "./independent-domain-release-manifest-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const definition = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
  (entry) => entry.productSystemId === "ziwei-doushu"
);

if (!definition || definition.manifestSchemaVersion !== "2.0.0") {
  throw new Error("紫微 Manifest v2 固定定义不存在。");
}

const manifest = await buildCurrentIndependentDomainManifest(workspaceRoot, definition, {
  createdAt: "2026-08-31T06:00:00.000Z"
});
const serialized = serializeIndependentDomainManifest(manifest);
const absolutePath = path.resolve(
  workspaceRoot,
  ...definition.manifestPath.split("/")
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
  path: definition.manifestPath,
  rawBytes: Buffer.byteLength(serialized),
  rawSha256: createHash("sha256").update(serialized, "utf8").digest("hex"),
  manifestDigest: manifest.manifestDigest
})}\n`);
