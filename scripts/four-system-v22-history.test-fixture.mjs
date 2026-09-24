import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL =
  new URL("./fixtures/four-system-v22-loader-inputs.zip", import.meta.url);
const ARCHIVE_SHA256 = "9c7d9ca28a5d3f5eeb0b26c39b39de2c4e17a296f197193f0a023598bb6c79bc";
const MANIFEST_PATH = "fixture-inputs.json";
const PREFIX = "hakimi-four-system-v22-inputs-";
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function parseFourSystemV22InputArchive(bytes) {
  assert.equal(sha256(bytes), ARCHIVE_SHA256, "v2.2 input archive identity changed");
  const entries = unzipSync(bytes);
  const manifest = JSON.parse(Buffer.from(entries[MANIFEST_PATH]).toString("utf8"));
  assert.equal(manifest.fixtureId, "four-system-v22-loader-input-context/1");
  assert.equal(manifest.expectedChildDigest,
    "b0d0340eae1190560831be2901afe9924e6c1a6434f5a7596d8be6aacb28d941");
  assert.equal(manifest.files.length, 589);
  const names = manifest.files.map((file) => file.path);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(Object.keys(entries).sort(), [...names, MANIFEST_PATH].sort());
  let totalBytes = 0;
  for (const file of manifest.files) {
    assert.equal(path.isAbsolute(file.path), false);
    assert.equal(file.path.includes("\\") || file.path.includes(":"), false);
    assert.equal(file.path.split("/").some((part) => ["", ".", ".."].includes(part)), false);
    const data = entries[file.path];
    assert.equal(data.byteLength, file.bytes, file.path);
    assert.equal(sha256(data), file.sha256, file.path);
    totalBytes += data.byteLength;
  }
  assert.equal(totalBytes, 13_585_614);
  return { entries, manifest };
}

// A data context for the original loader/brand/poisoning contracts. It combines
// the declared base commit with six recovered Git blobs and 24 dependency byte
// inputs. It does not recreate a complete historical checkout or browser run.
// Nothing in the archive is imported, installed, or executed. Test modules and
// validators continue to execute from the actual current source checkout.
export async function createFourSystemV22HistoricalInputs() {
  const { entries, manifest } = parseFourSystemV22InputArchive(
    await readFile(FOUR_SYSTEM_V22_INPUT_ARCHIVE_URL)
  );
  const parent = await realpath(os.tmpdir());
  const root = await mkdtemp(path.join(parent, PREFIX));
  const identity = await lstat(root, { bigint: true });
  let removed = false;
  async function cleanup() {
    if (removed) return;
    const final = await lstat(root, { bigint: true });
    assert.equal(final.isDirectory() && !final.isSymbolicLink(), true);
    assert.equal(final.dev, identity.dev);
    assert.equal(final.ino, identity.ino);
    assert.equal(path.dirname(await realpath(root)), parent);
    assert.equal(path.basename(root).startsWith(PREFIX), true);
    await rm(root, { recursive: true, force: true });
    removed = true;
  }
  try {
    for (const file of manifest.files) {
      const target = path.resolve(root, file.path);
      const relative = path.relative(root, target);
      assert.equal(relative.startsWith("..") || path.isAbsolute(relative), false);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(entries[file.path]), { flag: "wx" });
    }
    return { root, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

// Exercise the current CLI byte-for-byte against a declared input context.
// Its import.meta.url still determines its root, and its argv/preload guards
// run normally. Only this test bridge imports the current library by URL;
// source code archived as an input never becomes an executable module.
export async function attachCurrentFourSystemCli(inputs, minorVersion) {
  assert.ok(minorVersion === 1 || minorVersion === 2 || minorVersion === 3 || minorVersion === 4 || minorVersion === 5 || minorVersion === 6 || minorVersion === 7 || minorVersion === 8 || minorVersion === 9 || minorVersion === 10 || minorVersion === 12 || minorVersion === 13 || minorVersion === 14);
  const stem = `four-system-current-status-observation-child-v2-${minorVersion}`;
  const cliName = `verify-${stem}.mjs`;
  const libraryName = `${stem}-lib.mjs`;
  const cliSource = await readFile(new URL(cliName, import.meta.url));
  const libraryUrl = new URL(libraryName, import.meta.url);
  const cliPath = path.join(inputs.root, "scripts", cliName);
  await writeFile(cliPath, cliSource, { flag: "wx" });
  await writeFile(path.join(inputs.root, "scripts", libraryName),
    `// Test bridge to the actual current verifier, not archived code.\nexport * from ${JSON.stringify(libraryUrl.href)};\n`,
    { flag: "wx" });
  assert.deepEqual(await readFile(cliPath), cliSource);
  return cliPath;
}
