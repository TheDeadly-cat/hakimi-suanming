import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFourSystemV22HistoricalInputs } from "./four-system-v22-history.test-fixture.mjs";

export const ORIGINAL_ZIWEI_CONTRACT_ARCHIVE_URL =
  new URL("./fixtures/ziwei-v2-manifest-original-changed-inputs.zip", import.meta.url);
const CONTRACT_PATH = "packages/ziwei-doushu-contracts-draft/src/index.ts";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function readOriginalZiweiContract(bytes) {
  assert.equal(sha256(bytes),
    "684b64b2e70b1eb11b5d58ecee631b64e9c54a7b28874c23f49dd21063ef6cf0",
    "original Ziwei contract archive identity changed");
  const contract = Buffer.from(unzipSync(bytes)[CONTRACT_PATH]);
  assert.equal(contract.length, 45_329);
  assert.equal(sha256(contract),
    "0474abe7170f17352efd9b0d0f2735f2edbec049bb331441b7bd77ff2b79acc0");
  return contract;
}

// The v2.1 input context predates the one-contract change observed by v2.2.
// Reuse its exact 589 input files, replacing only that contract with the
// already recovered original Git blob. Both archives remain unchanged.
export async function createFourSystemV21HistoricalInputs() {
  const original = readOriginalZiweiContract(await readFile(ORIGINAL_ZIWEI_CONTRACT_ARCHIVE_URL));
  const inputs = await createFourSystemV22HistoricalInputs();
  try {
    const target = path.join(inputs.root, CONTRACT_PATH);
    assert.equal(sha256(await readFile(target)),
      "2a9555dba509873e6c436dcdc9121fcd90e943d880984581fbff865feca15685");
    await writeFile(target, original);
    assert.deepEqual(await readFile(target), original);
    return inputs;
  } catch (error) {
    await inputs.cleanup();
    throw error;
  }
}
