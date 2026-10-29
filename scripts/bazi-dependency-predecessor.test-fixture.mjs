import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const PINS = [
  ["package-lock.json", 174157, "ce26e796ad8942c120042e76632ed2fd1e3c7da1001506dd5601c34e5242737d"],
  ["packages/contracts/src/index.ts", 244747, "674a3fe1e2b3cd4fc99e481a758966a320ddc3c1113a9471eba190851d15e041"],
  ["packages/research-export/src/single-chart-report.ts", 164210, "43da8ce98eb0b09c061e6997dd140ffd3ad3dd597cb30720413fd67cf724d2dc"]
];
// Exact 906e7bf Git blobs, archived as inert test inputs. Runtime never requires
// Git history and the live source/lock is never downgraded.
export async function readBaziDependencyPredecessorOriginals() {
  const zip = await readFile(new URL("./fixtures/bazi-dependency-predecessor-originals.zip", import.meta.url));
  assert.equal(sha(zip), "3d088ba05d20827bfd846decf13b481183eecdde1ab06d8e0771a31cbc2dbaf7");
  const entries = unzipSync(zip);
  assert.deepEqual(Object.keys(entries), PINS.map(pin => pin[0]));
  for (const [file, bytes, hash] of PINS) {
    assert.equal(entries[file].length, bytes); assert.equal(sha(entries[file]), hash);
  }
  return entries;
}
export async function createBaziDomainManifestV25HistoricalInputs() {
  const { createBaziDomainManifestV24HistoricalInputs } = await import("./bazi-domain-manifest-v24-history.test-fixture.mjs");
  const historical = await createBaziDomainManifestV24HistoricalInputs();
  try {
    const entries = await readBaziDependencyPredecessorOriginals();
    await writeFile(path.join(historical.root, "package-lock.json"), entries["package-lock.json"]);
    return historical;
  } catch (error) { await historical.cleanup(); throw error; }
}
