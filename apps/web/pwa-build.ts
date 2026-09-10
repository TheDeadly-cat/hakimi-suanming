import { createHash } from "node:crypto";
import type { ReleaseDatabaseDescriptor } from "./release-protocol";

function escapeHtmlIdentityAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Bind the controlled index template before its bytes enter the cache identity. */
export function bindReleaseIdentityAttributes(
  html: string,
  descriptor: ReleaseDatabaseDescriptor
): string {
  const roots = [...html.matchAll(/<html(?=[\s>])(?:[^"'<>]|"[^"]*"|'[^']*')*>/giu)];
  const root = roots[0];
  if (roots.length !== 1 || !root || !/^(?:\uFEFF)?\s*(?:<!doctype\s+html\s*>\s*)?$/iu.test(html.slice(0, root.index))) {
    throw new Error("Release identity requires one controlled root HTML element.");
  }
  const expected = new Map([
    ["data-release-contract", descriptor.dbGeneration],
    ["data-target-schema", String(descriptor.targetSchema)],
    ["data-migration-id", descriptor.migrationId ?? "null"]
  ]);
  const seen = new Set<string>();
  const attributes = root[0].slice(5, -1);
  const attributePattern = /(\s+)([^\s"'<>/=]+)(?:(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gu;
  let cursor = 0;
  const boundAttributes = attributes.replace(attributePattern, (
    attribute: string,
    whitespace: string,
    name: string,
    assignment: string | undefined,
    doubleQuoted: string | undefined,
    singleQuoted: string | undefined,
    _unquoted: string | undefined,
    offset: number
  ) => {
    if (offset !== cursor) throw new Error("Release identity root attributes are malformed.");
    cursor = offset + attribute.length;
    const key = name.toLowerCase();
    const value = expected.get(key);
    if (value === undefined) return attribute;
    if (seen.has(key)) throw new Error(`Duplicate root release identity attribute: ${key}.`);
    seen.add(key);
    if (!assignment || (doubleQuoted === undefined && singleQuoted === undefined)) {
      throw new Error(`Root release identity attribute must be quoted: ${key}.`);
    }
    const valueStart = whitespace.length + name.length + assignment.length + 1;
    return attribute.slice(0, valueStart)
      + escapeHtmlIdentityAttribute(value)
      + attribute.slice(-1);
  });
  if (attributes.slice(cursor).trim() !== "") throw new Error("Release identity root attributes are malformed.");
  for (const key of expected.keys()) {
    if (!seen.has(key)) throw new Error(`Missing root release identity attribute: ${key}.`);
  }
  return html.slice(0, root.index) + root[0].slice(0, 5) + boundAttributes + ">"
    + html.slice(root.index + root[0].length);
}

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
