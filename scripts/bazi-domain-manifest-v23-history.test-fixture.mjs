import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..");
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

// Recovered from 3e17fea's exact Git blob. Only the old lock is archived, and is
// read as data. Current verifier code is imported from the real repository.
export async function createBaziDomainManifestV23HistoricalInputs() {
  const archive = await readFile(new URL("./fixtures/bazi-domain-manifest-v23-component-lock-original.zip", import.meta.url));
  assert.equal(sha(archive), "53aa333f6011cd7a361fe45e55f61357dcd8927e97b9e4f1384bf65063a4f158");
  const entries = unzipSync(archive);
  assert.deepEqual(Object.keys(entries), ["package-lock.json"]);
  const lock = Buffer.from(entries["package-lock.json"]);
  assert.equal(lock.length, 176276);
  assert.equal(sha(lock), "fd94ca9ba0832c1cf596c3e05f980fde5af82849b4935877342cc67d4d22c0e2");
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-manifest-v23-history-")));
  async function cleanup() {
    assert.equal(path.dirname(root), await realpath(os.tmpdir()));
    assert.match(path.basename(root), /^hakimi-bazi-manifest-v23-history-[a-z0-9]{6}$/iu);
    const stat = await lstat(root); assert.equal(stat.isDirectory(), true); assert.equal(stat.isSymbolicLink(), false);
    assert.equal(await realpath(root), root);
    await rm(root, { recursive: true, force: true });
  }
  try {
    await cp(path.join(REPOSITORY_ROOT, "content"), path.join(root, "content"), { recursive: true, force: false, errorOnExist: true });
    const manifest = JSON.parse(await readFile(path.join(root, "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json"), "utf8"));
    const byPath = new Map(manifest.components.flatMap(c => c.files.map(f => [f.path, f])));
    assert.equal(byPath.size, 28);
    for (const file of byPath.values()) {
      if (file.path.startsWith("content/")) continue;
      const bytes = file.path === "package-lock.json" ? lock : await readFile(path.join(REPOSITORY_ROOT, file.path));
      assert.equal(bytes.length, file.rawBytes, file.path); assert.equal(sha(bytes), file.sha256, file.path);
      const target = path.resolve(root, file.path);
      assert.equal(path.relative(root, target).startsWith("..") || path.isAbsolute(path.relative(root, target)), false);
      await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: "wx" });
    }
    return { root, cleanup };
  } catch (error) { await cleanup(); throw error; }
}
