import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { FACT_RECEIPT_V1_INPUT_ARCHIVE_URL, parseFactReceiptV1InputArchive } from "./cross-system-engineering-fact-v1-inputs.mjs";

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
    for (const file of manifest.files) {
      const target = path.join(root, file.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, entries[file.path], { flag: "wx" });
    }
    return { root, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
