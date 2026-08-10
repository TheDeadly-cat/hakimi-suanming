import { createHash } from "node:crypto";

export type OfflineBundleEntry =
  | { type: "chunk"; code: string }
  | { type: "asset"; source: string | Uint8Array };

export type OfflineCacheVersionInput = {
  bundle: Record<string, OfflineBundleEntry>;
  publicAssets: Record<string, string | Uint8Array>;
  workerTemplate: string;
  /**
   * The final Vite-transformed index document before the build-version meta is
   * injected. It is kept separate because Vite does not expose index.html in
   * the Rollup output bundle on every build.
   */
  htmlDocument: string;
};

function updateHashPart(
  hash: ReturnType<typeof createHash>,
  label: string,
  content: string | Uint8Array
) {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  hash.update(`${label.length}:${label}:${bytes.byteLength}:`);
  hash.update(bytes);
}

/**
 * The service-worker generation must change for content-only edits to files
 * whose public names stay stable (index.html, manifest, icons and brand art).
 */
export function computeOfflineCacheVersion({
  bundle,
  publicAssets,
  workerTemplate,
  htmlDocument
}: OfflineCacheVersionInput): string {
  const hash = createHash("sha256");
  updateHashPart(hash, "worker-template", workerTemplate);
  updateHashPart(hash, "index-html-before-version-injection", htmlDocument);

  for (const fileName of Object.keys(bundle).sort()) {
    const entry = bundle[fileName]!;
    updateHashPart(
      hash,
      `bundle:${entry.type}:${fileName}`,
      entry.type === "chunk" ? entry.code : entry.source
    );
  }
  for (const fileName of Object.keys(publicAssets).sort()) {
    updateHashPart(hash, `public:${fileName}`, publicAssets[fileName]!);
  }
  return hash.digest("hex").slice(0, 12);
}
