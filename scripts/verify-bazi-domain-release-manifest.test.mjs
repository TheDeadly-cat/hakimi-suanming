import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_V17_FROZEN_GOLDEN_SHA256,
  buildCurrentBaziDomainReleaseManifest,
  canonicalStringifyDomainManifest,
  readBaziDomainReleaseManifest,
  verifyBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { unzipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
let workspaceRoot;
let temporaryParent;
let ownedDirectory;

// Historical bytes are data. Verifiers always import from this current source
// tree; no archived code is imported and no archived package/lock is installed.
before(async () => {
  const archive = await readFile(path.join(repositoryRoot, "scripts/fixtures/bazi-v17-domain-original-inputs.zip"));
  assert.equal(createHash("sha256").update(archive).digest("hex"),
    "b00795e335c132350204baabb7e92519dd94f614c789e44211d4b65f9e4908f5");
  const entries = Object.entries(unzipSync(archive));
  assert.equal(entries.length, 35);
  temporaryParent = await realpath(os.tmpdir());
  workspaceRoot = await mkdtemp(path.join(temporaryParent, "hakimi-bazi-v17-history-"));
  ownedDirectory = await lstat(workspaceRoot, { bigint: true });
  for (const [relativePath, bytes] of entries) {
    assert.equal(path.isAbsolute(relativePath), false);
    assert.equal(relativePath.includes("\\") || relativePath.includes(":"), false);
    assert.equal(relativePath.split("/").some((part) => part === "" || part === "." || part === ".."), false);
    const target = path.resolve(workspaceRoot, relativePath);
    assert.equal(path.relative(workspaceRoot, target).startsWith(".."), false);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
});

after(async () => {
  if (!workspaceRoot) return;
  assert.equal(path.dirname(workspaceRoot), temporaryParent);
  assert.match(path.basename(workspaceRoot), /^hakimi-bazi-v17-history-[a-z0-9]{6}$/iu);
  assert.equal(await realpath(workspaceRoot), workspaceRoot);
  const current = await lstat(workspaceRoot, { bigint: true });
  assert(current.isDirectory() && !current.isSymbolicLink());
  assert.equal(current.dev, ownedDirectory.dev);
  assert.equal(current.ino, ownedDirectory.ino);
  await rm(workspaceRoot, { recursive: true, force: true });
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("historical bazi v1.7 domain manifest exactly binds its original component closure", async () => {
  const manifest = await readBaziDomainReleaseManifest(workspaceRoot);
  const expected = await buildCurrentBaziDomainReleaseManifest(workspaceRoot, { createdAt: manifest.createdAt });
  assert.equal(canonicalStringifyDomainManifest(manifest), canonicalStringifyDomainManifest(expected));
  const verified = await verifyBaziDomainReleaseManifest(workspaceRoot, manifest);
  assert.equal(verified.manifestDigest, manifest.manifestDigest);
  assert.equal(
    manifest.components.find((component) => component.componentId === "report_contract")
      .files.find((file) => file.path.endsWith("single-chart-report.contract.v1.7.json")).sha256,
    BAZI_V17_FROZEN_GOLDEN_SHA256
  );
});

test("the historical v1.7 verifier rejects the live checkout without borrowing archive inputs", async () => {
  const manifest = await readBaziDomainReleaseManifest(repositoryRoot);
  await assert.rejects(verifyBaziDomainReleaseManifest(repositoryRoot, manifest),
    /manifest 与当前组件、失败关闭门或证据分账不一致/u);
});

test("candidate identity cannot be promoted by editing authorization, counts or status", async () => {
  const manifest = await readBaziDomainReleaseManifest(workspaceRoot);
  const mutations = [
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; },
    (value) => { value.gateState.bindingFrozenVerified = 12; },
    (value) => { value.gateState.independentExpertReviewsVerified = 2; },
    (value) => { value.evidenceLedger.contentTruth = "established_for_declared_scope"; },
    (value) => { value.releaseStatus = "released"; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(manifest);
    mutate(candidate);
    await assert.rejects(
      verifyBaziDomainReleaseManifest(workspaceRoot, candidate),
      /manifest 与当前组件、失败关闭门或证据分账不一致/u
    );
  }
});

test("component hash, closure and unknown-field drift fail closed", async () => {
  const manifest = await readBaziDomainReleaseManifest(workspaceRoot);
  const hashDrift = clone(manifest);
  hashDrift.components[0].files[0].sha256 = "0".repeat(64);
  await assert.rejects(verifyBaziDomainReleaseManifest(workspaceRoot, hashDrift), /manifest 与当前组件/u);

  const closureDrift = clone(manifest);
  closureDrift.components[1].files.pop();
  await assert.rejects(verifyBaziDomainReleaseManifest(workspaceRoot, closureDrift), /manifest 与当前组件/u);

  const unknown = clone(manifest);
  unknown.publicReleaseApproved = true;
  await assert.rejects(verifyBaziDomainReleaseManifest(workspaceRoot, unknown), /manifest 与当前组件/u);
});
