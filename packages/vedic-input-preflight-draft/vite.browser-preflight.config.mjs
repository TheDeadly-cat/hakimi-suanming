import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const browserRoot = path.join(packageRoot, "browser-app");
const schemaPath = path.resolve(
  packageRoot,
  "../../content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json"
);
const virtualSchemaId = "virtual:vedic-input-draft-schema";
const resolvedVirtualSchemaId = `\0${virtualSchemaId}`;
const expectedSchemaFileIdentity = Object.freeze({
  path: "content/system-admission/vedic-input-contract-draft.v0.1.0.schema.json",
  bytes: 16529,
  sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69",
  canonicalBytes: 9766,
  canonicalSha256: "03afcae3e276ce7d84b1be321185431ea4e8d95fcba02063ecb29a42e10d6a1f",
  schemaSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08"
});

function readPinnedSchemaSource() {
  const bytes = readFileSync(schemaPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== expectedSchemaFileIdentity.bytes
    || sha256 !== expectedSchemaFileIdentity.sha256) {
    throw new Error("Vedic input preflight schema source identity drifted");
  }
  const source = bytes.toString("utf8");
  if (source.charCodeAt(0) === 0xfeff) {
    throw new Error("Vedic input preflight schema source must not contain a BOM");
  }
  const schema = JSON.parse(source);
  return Object.freeze({
    schema,
    schemaIdentity: Object.freeze({
      canonicalBytes: expectedSchemaFileIdentity.canonicalBytes,
      canonicalSha256: expectedSchemaFileIdentity.canonicalSha256,
      schemaSemanticDigest: expectedSchemaFileIdentity.schemaSemanticDigest
    })
  });
}

function pinnedVedicInputSchemaPlugin() {
  let heldModuleSource;
  let served = false;
  return {
    name: "hakimi-vedic-pinned-input-draft-schema",
    enforce: "pre",
    buildStart() {
      const held = readPinnedSchemaSource();
      heldModuleSource = [
        `export const vedicInputDraftSchema = Object.freeze(${JSON.stringify(held.schema)});`,
        `export const vedicInputDraftSchemaIdentity = Object.freeze(${JSON.stringify(held.schemaIdentity)});`,
        "export default vedicInputDraftSchema;"
      ].join("\n");
      served = false;
    },
    resolveId(id) {
      return id === virtualSchemaId ? resolvedVirtualSchemaId : null;
    },
    load(id) {
      if (id !== resolvedVirtualSchemaId) return null;
      if (typeof heldModuleSource !== "string") {
        throw new Error("Pinned Vedic input schema was not held at build start");
      }
      served = true;
      return heldModuleSource;
    },
    generateBundle() {
      if (!served) {
        throw new Error("Vedic input preflight Worker did not consume the pinned schema source");
      }
    }
  };
}

export default {
  root: browserRoot,
  base: "./",
  publicDir: false,
  cacheDir: path.join(packageRoot, "node_modules", ".vite-vedic-input-preflight"),
  worker: {
    plugins: () => [pinnedVedicInputSchemaPlugin()]
  },
  build: {
    outDir: path.join(packageRoot, "dist", "browser-app"),
    emptyOutDir: true,
    sourcemap: true,
    target: "es2022"
  },
  server: {
    host: "127.0.0.1",
    strictPort: true
  },
  preview: {
    host: "127.0.0.1",
    strictPort: true
  }
};
