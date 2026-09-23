import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";

export const FACT_RECEIPT_V1_INPUT_ARCHIVE_URL =
  new URL("./fixtures/cross-system-fact-receipts-v1-original-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "a0c8f0f14cbb3094ef42d002f3b3e24ec7ccd5e769c53bfcfa17d00d015af42b";
const MANIFEST_SHA256 = "60b301f38804eaa9c27a17dfb5fa2057eae854db93f25a7b82d732fbd7000f8d";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function requireIdentity(condition, label) {
  if (!condition) {
    const error = new Error(`Historical fact receipt v1 input identity differs: ${label}`);
    error.code = "HISTORICAL_V1_INPUT_MISMATCH";
    throw error;
  }
}

// These bytes are data, never imported or executed. The fixed inventory is the
// original v1 consumer's complete input contract, not a selectable current head.
export function parseFactReceiptV1InputArchive(bytes) {
  requireIdentity(sha256(bytes) === ARCHIVE_SHA256, "archive");
  const entries = unzipSync(bytes);
  requireIdentity(sha256(entries["fixture-inputs.json"]) === MANIFEST_SHA256, "inventory");
  const manifest = JSON.parse(Buffer.from(entries["fixture-inputs.json"]).toString("utf8"));
  requireIdentity(manifest.fixtureId === "cross-system-fact-receipts-historical-v1/1"
    && manifest.files.length === 98, "scope");
  requireIdentity(JSON.stringify(Object.keys(entries).sort()) === JSON.stringify([
    "fixture-inputs.json", ...manifest.files.map(file => file.path)
  ].sort()), "entry set");
  for (const file of manifest.files) {
    requireIdentity(!file.path.includes("\\") && !file.path.includes(":")
      && !file.path.split("/").some(part => ["", ".", ".."].includes(part)), "relative path");
    requireIdentity(entries[file.path]?.byteLength === file.bytes
      && sha256(entries[file.path]) === file.sha256, file.path);
  }
  return { manifest, entries };
}



export async function createFactReceiptV1HistoricalInputs() {
  const { manifest, entries } = parseFactReceiptV1InputArchive(await readFile(FACT_RECEIPT_V1_INPUT_ARCHIVE_URL));
  const parent = await realpath(os.tmpdir());
  const prefix = "hakimi-fact-receipt-v1-";
  const root = await mkdtemp(path.join(parent, prefix));
  const identity = await lstat(root, { bigint: true });
  let removed = false;
  async function cleanup() {
    if (removed) return;
    const final = await lstat(root, { bigint: true });
    assert(final.isDirectory() && !final.isSymbolicLink());
    assert.equal(final.dev, identity.dev);
    assert.equal(final.ino, identity.ino);
    assert.equal(path.dirname(await realpath(root)), parent);
    assert(path.basename(root).startsWith(prefix));
    await rm(root, { recursive: true, force: true });
    removed = true;
  }
  try {
    await writeFile(path.join(root, "fixture-inputs.json"), entries["fixture-inputs.json"], { flag: "wx" });
    for (const file of manifest.files) {
      const target = path.join(root, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, entries[file.path], { flag: "wx" });
    }
    return { root, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
