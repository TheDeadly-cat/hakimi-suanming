import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createBaziDomainManifestV23HistoricalInputs } from "./bazi-domain-manifest-v23-history.test-fixture.mjs";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

// Exact Git blob 85e004f3, archived as data. Never downgrade the live lock.
export async function createBaziDomainManifestV24HistoricalInputs() {
  const archive = await readFile(new URL("./fixtures/bazi-domain-manifest-v24-component-lock-original.zip", import.meta.url));
  assert.equal(sha(archive), "0526ef0a161625fc1a09620920f9a8b221a6b4d218c47bb2d198ffd97ca92ea3");
  const entries = unzipSync(archive);
  assert.deepEqual(Object.keys(entries), ["package-lock.json"]);
  const lock = Buffer.from(entries["package-lock.json"]);
  assert.equal(lock.length, 176278);
  assert.equal(sha(lock), "ceb0276477547cbf209e7937f9a5dcdc05a34ae21869af44b1f92825576c3e19");
  const historical = await createBaziDomainManifestV23HistoricalInputs();
  try {
    await writeFile(path.join(historical.root, "package-lock.json"), lock);
    return historical;
  } catch (error) { await historical.cleanup(); throw error; }
}
