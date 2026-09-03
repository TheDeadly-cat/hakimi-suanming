import assert from "node:assert/strict";
import { link, mkdir, mkdtemp, readFile, rename, rm, symlink, writeFile, copyFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
  canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence,
  computeVedicRuntimeDependencyLicenseEvidenceDigest,
  parseVedicRuntimeDependencyLicenseEvidenceJsonBytes,
  readVedicRuntimeDependencyLicenseEvidence,
  verifyVedicRuntimeDependencyLicenseEvidence
} from "./vedic-runtime-dependency-license-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(
  workspaceRoot,
  ...VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH.split("/")
);
const adrRelativePath = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const cliPath = path.join(workspaceRoot, "scripts/verify-vedic-runtime-dependency-license-evidence.mjs");

const baseline = await readVedicRuntimeDependencyLicenseEvidence(workspaceRoot);
const baselineBytes = await readFile(evidencePath);

function cloneBaseline() {
  return structuredClone(baseline);
}

async function rejectsCode(action, expectedCode) {
  await assert.rejects(action, (error) => {
    assert.equal(error?.code, expectedCode);
    return true;
  });
}

function throwsCode(action, expectedCode) {
  assert.throws(action, (error) => {
    assert.equal(error?.code, expectedCode);
    return true;
  });
}

function allJsonObjectsFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return true;
  seen.add(value);
  return Object.isFrozen(value)
    && Object.values(value).every((entry) => allJsonObjectsFrozen(entry, seen));
}

async function makeWorkspaceCopy() {
  const root = await mkdtemp(path.join(os.tmpdir(), "vedic-license-evidence-"));
  const adrTarget = path.join(root, ...adrRelativePath.split("/"));
  const evidenceTarget = path.join(
    root,
    ...VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH.split("/")
  );
  await mkdir(path.dirname(adrTarget), { recursive: true });
  await mkdir(path.dirname(evidenceTarget), { recursive: true });
  await copyFile(path.join(workspaceRoot, ...adrRelativePath.split("/")), adrTarget);
  await copyFile(evidencePath, evidenceTarget);
  return { evidenceTarget, root };
}

test("authoritative child is canonical, domain-digested, and deeply frozen", async () => {
  const result = await verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, baseline);
  assert.equal(result.evidenceDigest, "cbd459847bd4f57450f8389f127aa76c424298511786811b17c3cb88a856c926");
  assert.equal(computeVedicRuntimeDependencyLicenseEvidenceDigest(baseline), result.evidenceDigest);
  assert.deepEqual(
    Buffer.from(canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence(baseline), "utf8"),
    baselineBytes
  );
  assert.equal(allJsonObjectsFrozen(result.evidence), true);
});

test("five endpoints preserve ten reads but cover only four of five dependency classes", async () => {
  const result = await verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, baseline);
  assert.equal(baseline.observations.length, 5);
  assert.equal(result.publicHttpReadsObserved, 10);
  assert.equal(result.stableImmediateReadPairs, 4);
  assert.equal(result.unstableImmediateReadPairs, 1);
  assert.equal(result.dependenciesWithObservedRefs, 4);
  assert.equal(result.dependenciesWithoutObservedRefs, 1);
  assert.equal(result.loopbackEvidenceRefs, 0);
  assert.deepEqual(baseline.evidenceSummary.dependencyIdsWithoutObservedRefs, ["loopback_local_service"]);
  assert.deepEqual(
    baseline.dependencyEvidenceMatrix.map((entry) => entry.evidenceRefs.length),
    [1, 3, 3, 1, 0]
  );
});

test("each receipt contains only the approved transport fields and no per-read timestamp", () => {
  for (const observation of baseline.observations) {
    for (const key of ["firstRead", "secondRead"]) {
      assert.deepEqual(
        Object.keys(observation.carrierIdentity[key]).sort(),
        ["bytes", "contentType", "etag", "httpStatus", "lastModified", "sha256"]
      );
    }
  }
  assert.equal(baseline.observationBoundary.observationStartedAt, "2026-08-29T06:07:50.954Z");
  assert.equal(baseline.observationBoundary.observationCompletedAt, "2026-08-29T06:08:01.354Z");
  assert.equal(baseline.observationBoundary.perReadCapturedAtAvailable, false);
});

test("work, edition, carrier, legal, review, redistribution and body-storage boundaries stay false", () => {
  assert.ok(Object.values(baseline.authorityBoundary).every((value) => value === false));
  assert.equal(baseline.integrityBoundary.authenticityEstablished, false);
  assert.equal(baseline.integrityBoundary.digestIsDigitalSignature, false);
  assert.equal(baseline.legalDecisionBoundary.reviewComplete, false);
  assert.equal(baseline.legalDecisionBoundary.legalReviewComplete, false);
  assert.equal(baseline.legalDecisionBoundary.redistributionAuthorized, false);
  for (const observation of baseline.observations) {
    assert.equal(observation.authenticityEstablished, false);
    assert.equal(observation.publisherIdentityIndependentlyVerified, false);
    assert.equal(observation.workIdentity.identityEstablished, false);
    assert.equal(observation.editionIdentity.identityEstablished, false);
    assert.equal(observation.carrierIdentity.carrierIdentityEstablished, false);
    assert.equal(observation.carrierIdentity.bodyStored, false);
    assert.equal(observation.bodyObservation.sourceBodyStored, false);
    assert.equal(observation.bodyObservation.exactQuoteStored, false);
    assert.equal(observation.legalDecision.reviewComplete, false);
    assert.equal(observation.legalDecision.legalReviewComplete, false);
    assert.equal(observation.legalDecision.executedContractObserved, false);
    assert.equal(observation.legalDecision.redistributionAuthorized, false);
  }
});

test("dynamic public page cannot be promoted to a stable frozen carrier", async () => {
  const forged = cloneBaseline();
  forged.observations[2].carrierIdentity.stableAcrossTwoImmediateReads = true;
  forged.evidenceDigest = computeVedicRuntimeDependencyLicenseEvidenceDigest(forged);
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, forged),
    "DYNAMIC_CARRIER_STABILITY_PROMOTED"
  );
});

test("unsigned professional contract template cannot become an executed license", async () => {
  const forged = cloneBaseline();
  forged.observations[3].legalDecision.executedContractObserved = true;
  forged.evidenceDigest = computeVedicRuntimeDependencyLicenseEvidenceDigest(forged);
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, forged),
    "LEGAL_DECISION_PROMOTED"
  );
});

const promotionCases = [
  ["carrier URL", "CARRIER_OBSERVATION_INVALID", (value) => {
    value.observations[0].carrierIdentity.finalUrl = "https://example.invalid/forged";
  }],
  ["carrier body hash", "CARRIER_OBSERVATION_INVALID", (value) => {
    value.observations[0].carrierIdentity.firstRead.sha256 = "0".repeat(64);
  }],
  ["batch timestamp", "OBSERVATION_BOUNDARY_INVALID", (value) => {
    value.observationBoundary.observationCompletedAt = "2026-08-29T06:08:01.355Z";
  }],
  ["loopback evidence ref", "DEPENDENCY_EVIDENCE_MATRIX_INVALID", (value) => {
    value.dependencyEvidenceMatrix[4].evidenceRefs.push(value.observations[0].evidenceRef);
  }],
  ["runtime selection", "DEPENDENCY_SELECTION_PROMOTED", (value) => {
    value.dependencyEvidenceMatrix[0].selection = "selected";
  }],
  ["legal review", "LEGAL_DECISION_PROMOTED", (value) => {
    value.legalDecisionBoundary.reviewComplete = true;
  }],
  ["source body storage", "BODY_STORAGE_PROMOTED", (value) => {
    value.observations[0].bodyObservation.sourceBodyStored = true;
  }],
  ["body summary", "BODY_OBSERVATION_INVALID", (value) => {
    value.observations[0].bodyObservation.bodySummary += " Forged.";
  }],
  ["work identity", "IDENTITY_OR_AUTHENTICITY_PROMOTED", (value) => {
    value.observations[0].workIdentity.identityEstablished = true;
  }],
  ["proposal backlink", "BOUNDARY_BACKLINK_FORBIDDEN", (value) => {
    value.boundaryBindings.childBindsRuntimeProposal = true;
  }]
];

for (const [name, code, mutate] of promotionCases) {
  test(`fail-closed promotion attack: ${name}`, async () => {
    const forged = cloneBaseline();
    mutate(forged);
    forged.evidenceDigest = computeVedicRuntimeDependencyLicenseEvidenceDigest(forged);
    await rejectsCode(
      () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, forged),
      code
    );
  });
}

test("digest cannot self-sign or establish publisher authenticity", async () => {
  const forged = cloneBaseline();
  forged.integrityBoundary.digestIsDigitalSignature = true;
  forged.integrityBoundary.digitalSignature = forged.evidenceDigest;
  forged.integrityBoundary.signerIdentity = "self-asserted";
  forged.evidenceDigest = computeVedicRuntimeDependencyLicenseEvidenceDigest(forged);
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, forged),
    "SELF_SIGNED_AUTHORITY_PROMOTED"
  );
});

test("strict JSON parser rejects duplicate keys, BOM, invalid UTF-8, Proxy, SAB and RAB", () => {
  const text = baselineBytes.toString("utf8");
  const duplicate = Buffer.from(
    text.replace('"artifactRole": ', '"artifactRole": "shadow",\n  "artifactRole": '),
    "utf8"
  );
  throwsCode(() => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(duplicate), "JSON_DUPLICATE_KEY");
  throwsCode(
    () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), baselineBytes])
    ),
    "JSON_BOM_FORBIDDEN"
  );
  throwsCode(
    () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(Uint8Array.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  throwsCode(
    () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(new Proxy(baselineBytes, {})),
    "JSON_PROXY_FORBIDDEN"
  );
  if (typeof SharedArrayBuffer === "function") {
    throwsCode(
      () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(
        new Uint8Array(new SharedArrayBuffer(16))
      ),
      "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  const resizable = new ArrayBuffer(16, { maxByteLength: 32 });
  if (resizable.resizable) {
    throwsCode(
      () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(new Uint8Array(resizable)),
      "JSON_RESIZABLE_BUFFER_FORBIDDEN"
    );
  }
});

test("byte parsing uses a private snapshot and rejects detached storage", () => {
  const mutable = Uint8Array.from(Buffer.from('{"value":1}', "utf8"));
  const parsed = parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(mutable);
  mutable.fill(0x20);
  assert.deepEqual(parsed, { value: 1 });

  const backing = new ArrayBuffer(8);
  const detached = new Uint8Array(backing);
  structuredClone(backing, { transfer: [backing] });
  assert.throws(
    () => parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(detached),
    (error) => ["JSON_BYTES_INVALID", "JSON_INVALID"].includes(error?.code)
  );
});

test("object API rejects Proxy, accessor, alias, cycle, Symbol, non-plain, sparse and negative-zero inputs", async () => {
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, new Proxy(cloneBaseline(), {})),
    "INPUT_PROXY_FORBIDDEN"
  );
  const accessor = cloneBaseline();
  Object.defineProperty(accessor, "status", { enumerable: true, get: () => baseline.status });
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, accessor),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  const alias = cloneBaseline();
  alias.integrityBoundary = alias.authorityBoundary;
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, alias),
    "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
  const cycle = cloneBaseline();
  cycle.authorityBoundary.loop = cycle;
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, cycle),
    "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
  const symbol = cloneBaseline();
  symbol[Symbol("forged")] = true;
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, symbol),
    "INPUT_SYMBOL_FORBIDDEN"
  );
  const nonPlain = cloneBaseline();
  Object.setPrototypeOf(nonPlain, { forged: true });
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, nonPlain),
    "INPUT_PROTOTYPE_INVALID"
  );
  const sparse = cloneBaseline();
  delete sparse.observations[0];
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, sparse),
    "INPUT_ARRAY_INVALID"
  );
  const negativeZero = cloneBaseline();
  negativeZero.evidenceSummary.publicHttpReadsObserved = -0;
  await rejectsCode(
    () => verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, negativeZero),
    "INPUT_VALUE_INVALID"
  );
});

test("filesystem reader rejects non-canonical materialization and hard-linked evidence endpoints", async (t) => {
  await t.test("non-canonical bytes", async () => {
    const fixture = await makeWorkspaceCopy();
    try {
      await writeFile(fixture.evidenceTarget, Buffer.concat([Buffer.from(" "), baselineBytes]));
      await rejectsCode(
        () => readVedicRuntimeDependencyLicenseEvidence(fixture.root),
        "EVIDENCE_MATERIALIZATION_MISMATCH"
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
  await t.test("hard link", async () => {
    const fixture = await makeWorkspaceCopy();
    try {
      const backing = `${fixture.evidenceTarget}.backing`;
      await rename(fixture.evidenceTarget, backing);
      await link(backing, fixture.evidenceTarget);
      await rejectsCode(
        () => readVedicRuntimeDependencyLicenseEvidence(fixture.root),
        "EVIDENCE_ENDPOINT_INVALID"
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  });
});

test("filesystem reader rejects symlinked evidence endpoints when the platform permits creating one", async (t) => {
  const fixture = await makeWorkspaceCopy();
  try {
    const backing = `${fixture.evidenceTarget}.backing`;
    await rename(fixture.evidenceTarget, backing);
    try {
      await symlink(backing, fixture.evidenceTarget, "file");
    } catch (error) {
      if (["EPERM", "EACCES", "UNKNOWN"].includes(error?.code)) {
        t.skip(`symlink creation unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await rejectsCode(
      () => readVedicRuntimeDependencyLicenseEvidence(fixture.root),
      "EVIDENCE_ENDPOINT_INVALID"
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("CLI reports the fail-closed evidence state and rejects arguments", () => {
  const success = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(success.status, 0, success.stderr);
  const output = JSON.parse(success.stdout);
  assert.equal(output.runtimeDependencyLicenseEvidenceVerified, true);
  assert.equal(output.dependenciesWithObservedRefs, 4);
  assert.equal(output.dependenciesWithoutObservedRefs, 1);
  assert.equal(output.loopbackEvidenceRefs, 0);
  assert.equal(output.publicReleaseAuthorized, false);
  assert.equal(output.redistributionAuthorizations, 0);
  assert.equal(output.releaseReady, false);

  const rejected = spawnSync(process.execPath, [cliPath, "--forged"], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(rejected.status, 2);
  assert.equal(JSON.parse(rejected.stdout).runtimeDependencyLicenseEvidenceVerified, false);
});
