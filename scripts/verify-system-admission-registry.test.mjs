import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import { after, before, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCurrentSystemAdmissionRegistry,
  canonicalStringifySystemAdmissionRegistry,
  readSystemAdmissionRegistry,
  verifySystemAdmissionRegistry
} from "./system-admission-registry-lib.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { unzipSync, zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
const archiveSpecs = [
  ["bazi-v17-domain-original-inputs.zip", 35, "b00795e335c132350204baabb7e92519dd94f614c789e44211d4b65f9e4908f5"],
  ["four-system-v1-additional-original-inputs.zip", 18, "27c0e45907802bfd27bd7ecf691613598106bf5dac12a155daef04c8d221ebf3"]
];
const originalDocumentPath = "docs/西洋星盘契约草案与来源门-v0.1.md";
const originalDocumentSha256 = "518116de8187893ddbe04542431681f6d17969e41b337988d189af6d977d9984";
let workspaceRoot;
let temporaryParent;
let ownedDirectory;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function decodeOriginalArchive(bytes, spec) {
  assert.equal(sha256(bytes), spec[2], `原输入归档 SHA-256 不符：${spec[0]}`);
  const entries = Object.entries(unzipSync(bytes));
  assert.equal(entries.length, spec[1]);
  for (const [relativePath] of entries) {
    assert.equal(path.isAbsolute(relativePath), false);
    assert.equal(relativePath.includes("\\") || relativePath.includes(":"), false);
    assert.equal(relativePath.split("/").some((part) => part === "" || part === "." || part === ".."), false);
  }
  return entries;
}

// Frozen inputs are data only. All validation code is imported from this
// current checkout, and the live checkout is tested separately below.
before(async () => {
  const inputs = new Map();
  for (const spec of archiveSpecs) {
    const raw = await readFile(path.join(repositoryRoot, "scripts/fixtures", spec[0]));
    for (const [relativePath, bytes] of decodeOriginalArchive(raw, spec)) {
      assert.equal(inputs.has(relativePath), false);
      inputs.set(relativePath, bytes);
    }
  }
  assert.equal(inputs.size, 53);
  assert.equal(inputs.get(originalDocumentPath)?.length, 20351);
  assert.equal(sha256(inputs.get(originalDocumentPath)), originalDocumentSha256);
  temporaryParent = await realpath(os.tmpdir());
  workspaceRoot = await mkdtemp(path.join(temporaryParent, "hakimi-system-registry-v1-history-"));
  ownedDirectory = await lstat(workspaceRoot, { bigint: true });
  for (const [relativePath, bytes] of inputs) {
    const target = path.resolve(workspaceRoot, relativePath);
    assert.equal(path.relative(workspaceRoot, target).startsWith(".."), false);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" });
  }
});

after(async () => {
  if (!workspaceRoot) return;
  assert.equal(path.dirname(workspaceRoot), temporaryParent);
  assert.match(path.basename(workspaceRoot), /^hakimi-system-registry-v1-history-[a-z0-9]{6}$/iu);
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

async function expectRegistryMismatch(candidate) {
  await assert.rejects(
    verifySystemAdmissionRegistry(workspaceRoot, candidate),
    /准入登记与当前证据闭包、独立准入门或失败关闭边界不一致/u
  );
}

test("historical v1 registry binds four independent systems and its original evidence closure", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const expected = await buildCurrentSystemAdmissionRegistry(workspaceRoot, {
    createdAt: registry.createdAt
  });
  assert.equal(
    canonicalStringifySystemAdmissionRegistry(registry),
    canonicalStringifySystemAdmissionRegistry(expected)
  );
  const verified = await verifySystemAdmissionRegistry(workspaceRoot, registry);
  assert.equal(verified.systemsRegistered, 4);
  assert.equal(verified.systemsFormallyAdmitted, 0);
  assert.deepEqual(
    registry.systemIdVocabulary.map((entry) => [entry.productSystemId, entry.contractSystemId]),
    [
      ["bazi", "bazi"],
      ["ziwei-doushu", "ziwei"],
      ["western-astrology", "western"],
      ["vedic-astrology", "vedic"]
    ]
  );
  const baziManifestArtifact = registry.systems[0].artifacts.find(
    (entry) => entry.role === "current_domain_release_manifest"
  );
  assert.equal(
    baziManifestArtifact?.semanticManifestDigest,
    "60711da42ebc71e1f23ec300dffd5ed44f418c9bcc83ee394bf106f7354dc932"
  );
});

test("legacy-v13 governance and mutation epoch cannot be widened by the registry", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.releaseGovernance.activeLine = "production-v14"; },
    (value) => { value.releaseGovernance.targetSchema = 14; },
    (value) => { value.releaseGovernance.migrationId = "v13-to-v14"; },
    (value) => { value.releaseGovernance.mutationEpochBoundaryRequired = false; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("no system can inherit bazi authority or self-promote to formal admission", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.systems[1].authorityBoundary.formalAdmissionAuthorized = true; },
    (value) => { value.systems[2].authorityBoundary.domainAuthorityAuthorized = true; },
    (value) => { value.systems[3].evidenceLedger.contentTruth = "inherited_from_bazi"; },
    (value) => { value.systems[0].authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.gateSummary.systemsFormallyAdmitted = 1; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("draft packages and research-only ADR cannot be renamed as production products", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  for (const index of [1, 2, 3]) {
    const candidate = clone(registry);
    candidate.systems[index].productStatus = "production";
    await expectRegistryMismatch(candidate);
  }
});

test("all eight admission gates remain exact and fail closed", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  assert.deepEqual(
    Object.keys(registry.systems[0].admissionGates),
    [
      "inputContract",
      "deterministicFacts",
      "ruleset",
      "sourceBundle",
      "rightsBundle",
      "expertReviewBundle",
      "highRiskPolicy",
      "releaseEvidence"
    ]
  );
  for (const system of registry.systems) {
    for (const gate of Object.values(system.admissionGates)) {
      assert.equal(gate.formalGateSatisfied, false);
    }
  }
  const candidate = clone(registry);
  candidate.systems[0].admissionGates.sourceBundle.formalGateSatisfied = true;
  await expectRegistryMismatch(candidate);
});

test("Ziwei and Western source gates bind exact requirement counts while all bindings remain absent", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const ziwei = registry.systems.find((entry) => entry.productSystemId === "ziwei-doushu");
  const western = registry.systems.find((entry) => entry.productSystemId === "western-astrology");
  assert.deepEqual(ziwei.admissionGates.sourceBundle, {
    engineeringState: "binding_requirements_inventory_27_present",
    closureState: "binding_frozen_0_of_27",
    formalGateSatisfied: false
  });
  assert.deepEqual(western.admissionGates.sourceBundle, {
    engineeringState: "binding_requirements_inventory_28_present",
    closureState: "binding_frozen_0_of_28",
    formalGateSatisfied: false
  });
  assert.equal(
    ziwei.artifacts.find((entry) => entry.role === "source_binding_requirements_inventory")?.path,
    "content/system-admission/ziwei-source-binding-requirements.v1.json"
  );
  assert.equal(
    western.artifacts.find((entry) => entry.role === "source_binding_requirements_inventory")?.path,
    "content/system-admission/western-source-binding-requirements.v1.json"
  );
});

test("cross-system scoring, weighting, voting, model arbitration and concept equivalence stay prohibited", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const mutations = [
    (value) => { value.crossSystemPolicy.scoringAllowed = true; },
    (value) => { value.crossSystemPolicy.weightingAllowed = true; },
    (value) => { value.crossSystemPolicy.majorityVoteAllowed = true; },
    (value) => { value.crossSystemPolicy.generatedModelWinnerSelectionAllowed = true; },
    (value) => { value.crossSystemPolicy.conceptEquivalenceInferenceAllowed = true; },
    (value) => { value.crossSystemPolicy.authorityInheritanceAllowed = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(registry);
    mutate(candidate);
    await expectRegistryMismatch(candidate);
  }
});

test("vedic astrology cannot enter the comparison draft before independent admission", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const candidate = clone(registry);
  candidate.crossSystemPolicy.currentDraftSystemIds.push("vedic-astrology");
  candidate.crossSystemPolicy.excludedUntilIndependentAdmission = [];
  await expectRegistryMismatch(candidate);
});

test("artifact digest drift and unknown authorization fields fail closed", async () => {
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  const digestDrift = clone(registry);
  digestDrift.systems[1].artifacts[0].sha256 = "0".repeat(64);
  await expectRegistryMismatch(digestDrift);

  const semanticDigestDrift = clone(registry);
  semanticDigestDrift.systems[0].artifacts[0].semanticManifestDigest = "0".repeat(64);
  await expectRegistryMismatch(semanticDigestDrift);

  const unknown = clone(registry);
  unknown.crossSystemAuthorityApproved = true;
  await expectRegistryMismatch(unknown);
});

test("the live checkout cannot inherit historical v1 registry verification", async () => {
  const registry = await readSystemAdmissionRegistry(repositoryRoot);
  await assert.rejects(verifySystemAdmissionRegistry(repositoryRoot, registry),
    /manifest 与当前组件、失败关闭门或证据分账不一致/u);
});

test("the exact recovered document is required, including its original bytes", async () => {
  const filePath = path.join(workspaceRoot, originalDocumentPath);
  const original = await readFile(filePath);
  assert.equal(original.length, 20351);
  assert.equal(sha256(original), originalDocumentSha256);
  const registry = await readSystemAdmissionRegistry(workspaceRoot);
  await unlink(filePath);
  try {
    await assert.rejects(verifySystemAdmissionRegistry(workspaceRoot, registry), (error) =>
      error.code === "ENOENT" && path.normalize(error.path) === path.normalize(filePath));
  } finally {
    await writeFile(filePath, original, { flag: "wx" });
  }
  const changed = Buffer.from(original);
  changed[0] ^= 1;
  await writeFile(filePath, changed);
  try {
    await assert.rejects(verifySystemAdmissionRegistry(workspaceRoot, registry), { code: "REGISTRY_MISMATCH" });
  } finally {
    await writeFile(filePath, original);
  }
  assert.deepEqual(await readFile(filePath), original);
});

test("original input archives reject tampering, truncation and an empty archive", async () => {
  for (const spec of archiveSpecs) {
    const raw = await readFile(path.join(repositoryRoot, "scripts/fixtures", spec[0]));
    const changed = Buffer.from(raw);
    changed[0] ^= 1;
    for (const invalid of [changed, raw.subarray(0, raw.length - 1), zipSync({})]) {
      assert.throws(() => decodeOriginalArchive(invalid, spec), /原输入归档 SHA-256 不符/u);
    }
  }
});
