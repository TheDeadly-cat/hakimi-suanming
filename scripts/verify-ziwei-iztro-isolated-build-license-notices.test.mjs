import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { gunzipSync } from "node:zlib";
import {
  buildZiweiIztroLicenseNoticeEvidence,
  computeZiweiIztroLicenseNoticeEvidenceDigest,
  runZiweiIztroIsolatedBuildLicenseNoticeVerification,
  verifyZiweiIztroIsolatedBuildLicenseNotices,
  verifyZiweiIztroIsolatedBuildLicenseSurface,
  ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY,
  ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH,
  ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY,
  ziweiIztroLicenseNoticeTestOnly
} from "./ziwei-iztro-isolated-build-license-notice-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const licenseBytes = readFileSync(path.join(
  workspaceRoot,
  ...ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.localLicensePath.split("/")
));
const hkoSourceEvidenceBytes = readFileSync(path.join(
  workspaceRoot,
  ...ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path.split("/")
));
const hkoSourceEvidence = JSON.parse(hkoSourceEvidenceBytes.toString("utf8"));
const hkoFixtureBytes = readFileSync(path.join(
  workspaceRoot,
  ...ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path.split("/")
));
const hkoFixture = JSON.parse(hkoFixtureBytes.toString("utf8"));
const tempRoots = new Set();
let controlledReceipt;
let expectedEvidence;
let expectedBuildInputAttestations;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function makeRoot(prefix = "hakimi-ziwei-iztro-license-test-") {
  const root = mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.add(root);
  return root;
}

function cleanupRoot(root) {
  rmSync(root, { recursive: true, force: true });
  tempRoots.delete(root);
}

function validHtml(extraHead = "") {
  return `<!doctype html><html><head>${extraHead}<link rel="license" type="text/plain" href="./licenses/iztro-2.5.8-LICENSE.txt"></head><body></body></html>`;
}

function writeSurface(root, options = {}) {
  const surfaceId = options.surfaceId ?? "browser-preview";
  mkdirSync(path.join(root, "assets"), { recursive: true });
  mkdirSync(path.join(root, "licenses"), { recursive: true });
  mkdirSync(path.join(root, "build-attestations"), { recursive: true });
  writeFileSync(path.join(root, "index.html"), options.html ?? validHtml());
  writeFileSync(
    path.join(root, "licenses", "iztro-2.5.8-LICENSE.txt"),
    options.licenseBytes ?? licenseBytes
  );
  if (options.worker !== false) {
    writeFileSync(
      path.join(root, "assets", "browser-worker-fixture.js"),
      options.workerText ?? `const version="${ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version}";const integrity="${ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.integrity}";`
    );
  }
  writeFileSync(path.join(root, "assets", "main-fixture.js"), "export {};\n");
  if (options.attestation !== false) {
    const attestation = options.attestation
      ?? expectedBuildInputAttestations?.[surfaceId]
      ?? ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(workspaceRoot, surfaceId).attestation;
    const bytes = options.attestationBytes
      ?? Buffer.from(`${JSON.stringify(attestation, null, 2)}\n`, "utf8");
    writeFileSync(
      path.join(root, ...ziweiIztroLicenseNoticeTestOnly.BUILD_INPUT_ATTESTATION_ASSET_PATH.split("/")),
      bytes
    );
  }
  return root;
}

function copyControlledBuildInputs() {
  const root = makeRoot("hakimi-ziwei-iztro-controlled-build-inputs-");
  const copiedPaths = new Set([
    ...ziweiIztroLicenseNoticeTestOnly.CONTROLLED_BUILD_INPUT_PATHS,
    ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path,
    ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path
  ]);
  for (const relativePath of copiedPaths) {
    const source = path.join(workspaceRoot, ...relativePath.split("/"));
    const target = path.join(root, ...relativePath.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  return root;
}

before(() => {
  controlledReceipt = runZiweiIztroIsolatedBuildLicenseNoticeVerification({ evidenceMode: "none" });
  expectedEvidence = buildZiweiIztroLicenseNoticeEvidence(controlledReceipt, workspaceRoot);
  expectedBuildInputAttestations = Object.fromEntries(controlledReceipt.surfaces.map((surface) => [
    surface.surfaceId,
    ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(workspaceRoot, surface.surfaceId).attestation
  ]));
});

after(() => {
  for (const root of tempRoots) cleanupRoot(root);
});

test("freezes the exact top-level iztro license and fixed lock identity", () => {
  assert.equal(licenseBytes.byteLength, 1073);
  assert.equal(sha256(licenseBytes), ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseSha256);
  assert.equal(controlledReceipt.canonicalInputs.installedEndpoints.length, 3);
  assert.equal(controlledReceipt.canonicalInputs.basisArtifacts.length, 8);
  assert.deepEqual(
    controlledReceipt.surfaces.map((surface) => surface.surfaceId),
    ["browser-preview", "browser-workspace"]
  );
  for (const surface of controlledReceipt.surfaces) {
    assert.equal(
      surface.buildInputAttestation.path,
      ziweiIztroLicenseNoticeTestOnly.BUILD_INPUT_ATTESTATION_ASSET_PATH
    );
    assert.equal(surface.buildInputAttestation.surfaceId, surface.surfaceId);
    assert.equal(
      surface.buildInputAttestation.producerPlugin,
      ziweiIztroLicenseNoticeTestOnly.BUILD_INPUT_ATTESTATION_PRODUCER
    );
  }
  assert.equal(controlledReceipt.buildExecutionBoundary.viteIdentity.version, "7.3.6");
  assert.equal(controlledReceipt.buildExecutionBoundary.viteIdentity.endpoints.length, 3);
  assert.equal(
    controlledReceipt.buildExecutionBoundary.rootLockSemanticIdentity.semanticIdentityVerified,
    true
  );
  assert.equal(
    controlledReceipt.buildExecutionBoundary.rootLockSemanticIdentity.rawRootLockBytesPromotedToReleaseEvidence,
    false
  );
  assert.equal(controlledReceipt.buildExecutionBoundary.nodeRuntimeBinaryIdentityEstablished, false);
});

test("keeps HKO raw-source build exclusion exact, controlled and authority-negative", () => {
  const boundary = controlledReceipt.hkoRestrictedSourceMaterialBoundary;
  assert.equal(boundary.mode, "fixed_dual_ephemeral_build_exact_restricted_representation_exclusion");
  assert.equal(boundary.candidateId, ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.candidateId);
  assert.equal(boundary.sourceBodySetDigest, ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceBodySetDigest);
  assert.equal(boundary.annualBodyCount, 6);
  assert.deepEqual(boundary.years, [2023, 2024, 2025, 2026, 2027, 2028]);
  assert.equal(boundary.surfaceObservations.length, 2);
  for (const surface of boundary.surfaceObservations) {
    assert.equal(surface.outputFilesScanned > 0, true);
    assert.deepEqual(surface.representationClassesScanned, [
      "source_evidence_exact_json",
      "raw_snapshot_fixture_exact_json",
      "restricted_artifact_path_reference_utf8",
      "gzip_base64_payload_utf8",
      "gzip_payload_bytes",
      "decompressed_raw_csv_bytes"
    ]);
    assert.equal(surface.exactRestrictedRepresentationObserved, false);
    assert.equal(surface.transformedOrUnknownEncodingAbsenceEstablished, false);
  }
  assert.equal(boundary.currentKnownExactRepresentationsAbsentFromBothOutputs, true);
  assert.deepEqual(boundary.controlledMaterialIdentityEquality, {
    browserPreviewPrePostEqual: true,
    browserWorkspacePrePostEqual: true,
    betweenBuildsEqual: true,
    outputScanPrePostEqual: true,
    crossFileAtomicityEstablished: false,
    intervalIntegrityEstablished: false,
    abaResistanceEstablished: false,
    mutationEpochEstablished: false
  });
  assert.equal(boundary.exactCurrentRepresentationsOnly, true);
  assert.equal(boundary.universalTranscodingAbsenceEstablished, false);
  assert.equal(boundary.workspaceRawBodiesRemovedOrVaulted, false);
  assert.equal(boundary.linkOnlyStorageEstablished, false);
  assert.equal(boundary.workRightsEstablished, false);
  assert.equal(boundary.editionRightsEstablished, false);
  assert.equal(boundary.carrierRightsEstablished, false);
  assert.equal(boundary.rightsLegalConclusionEstablished, false);
  assert.equal(boundary.redistributionAuthorized, false);
  assert.equal(boundary.publicBuildInclusionAuthorized, false);
  assert.equal(boundary.releaseReady, false);
  assert.equal(boundary.publicDeploymentAuthorized, false);
});

test("runs two fresh isolated builds and verifies the persisted one-way child", () => {
  const summary = ziweiIztroLicenseNoticeTestOnly.loadAndVerifyEvidence(controlledReceipt, workspaceRoot);
  assert.equal(summary.path, ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH);
  assert.equal(summary.evidenceDigest, expectedEvidence.evidenceDigest);
  assert.equal(summary.subjectFullySatisfied, false);
  assert.equal(summary.completeDependencyClosureCovered, false);
  assert.equal(summary.fortelCovered, false);
  assert.equal(summary.bindingFrozenVerified, false);
  assert.equal(summary.rightsLegalConclusionEstablished, false);
  assert.equal(summary.expertClaimsAuthorized, false);
  assert.equal(summary.releaseReady, false);
  assert.equal(summary.publicDeploymentAuthorized, false);
});

test("keeps top-level propagation separate from closure, Fortel, legal, expert and release authority", () => {
  assert.equal(expectedEvidence.coverageBoundary.coversIztro2_5_8TopLevelLicenseOnly, true);
  assert.equal(expectedEvidence.coverageBoundary.completeDependencyClosureCovered, false);
  assert.equal(expectedEvidence.coverageBoundary.fortelCovered, false);
  assert.equal(expectedEvidence.coverageBoundary.zodCovered, false);
  assert.equal(expectedEvidence.coverageBoundary.subjectFullySatisfied, false);
  assert.deepEqual(Object.values(expectedEvidence.parentBindingBoundary).filter((value) => value === true), []);
  assert.deepEqual(Object.values(expectedEvidence.authorityBoundary).filter((value) => value === true), []);
  assert.equal(expectedEvidence.readBoundary.crossFileAtomicityEstablished, false);
  assert.equal(expectedEvidence.readBoundary.intervalIntegrityEstablished, false);
  assert.equal(expectedEvidence.readBoundary.abaResistanceEstablished, false);
  assert.equal(expectedEvidence.readBoundary.mutationEpochEstablished, false);
  assert.equal(expectedEvidence.buildExecutionObservation.viteIdentity.version, "7.3.6");
  assert.equal(expectedEvidence.buildExecutionObservation.viteIdentity.endpoints.length, 3);
  assert.deepEqual(
    expectedEvidence.buildExecutionObservation.viteIdentity.endpoints.map((endpoint) => endpoint.path),
    [
      "apps/web/node_modules/vite/package.json",
      "apps/web/node_modules/vite/bin/vite.js",
      "apps/web/node_modules/vite/dist/node/cli.js"
    ]
  );
  assert.equal(
    expectedEvidence.buildExecutionObservation.rootLockSemanticIdentity.semanticIdentityVerified,
    true
  );
  assert.equal(
    expectedEvidence.buildExecutionObservation.rootLockSemanticIdentity.rawRootLockBytesPromotedToReleaseEvidence,
    false
  );
  assert.equal(expectedEvidence.buildExecutionObservation.inheritedNodeAndViteEnvironmentAccepted, false);
  assert.equal(expectedEvidence.buildExecutionObservation.nodeRuntimeBinaryIdentityEstablished, false);
  assert.deepEqual(
    expectedEvidence.noticeCandidate.controlledBuildReceipt.controlledInputEquality,
    {
      comparedInputCount: ziweiIztroLicenseNoticeTestOnly.CONTROLLED_BUILD_INPUT_PATHS.length,
      browserPreviewPrePostEqual: true,
      browserWorkspacePrePostEqual: true,
      betweenBuildsEqual: true,
      crossFileAtomicityEstablished: false,
      intervalIntegrityEstablished: false,
      abaResistanceEstablished: false,
      mutationEpochEstablished: false
    }
  );
  for (const surface of expectedEvidence.noticeCandidate.controlledBuildReceipt.surfaces) {
    assert.equal(surface.buildInputAttestation.surfaceId, surface.surfaceId);
    assert.equal(surface.buildInputAttestation.schemaVersion, "ziwei-iztro-build-input-attestation/1");
    assert.equal(surface.buildInputAttestation.producerPlugin, "hakimi-ziwei-iztro-top-level-license");
    assert.equal(surface.buildInputAttestation.path, "build-attestations/ziwei-iztro-license-inputs.v1.json");
    assert.equal(surface.buildInputAttestation.bytes > 0, true);
    assert.match(surface.buildInputAttestation.sha256, /^[0-9a-f]{64}$/u);
    assert.equal(surface.buildInputAttestation.inputCount, surface.surfaceId === "browser-preview" ? 7 : 8);
  }
  for (const boundary of [
    "complete_vite_package_or_build_toolchain_byte_identity",
    "node_runtime_binary_identity",
    "uninterrupted_execution_interval_integrity_or_true_release_build_provenance"
  ]) {
    assert.equal(expectedEvidence.doesNotEstablish.includes(boundary), true);
  }
});

test("rejects low-level, cloned and same-shaped receipts for evidence construction", () => {
  const preview = writeSurface(makeRoot());
  const workspace = writeSurface(makeRoot(), { surfaceId: "browser-workspace" });
  try {
    const lowLevel = verifyZiweiIztroIsolatedBuildLicenseNotices({
      browserPreviewOutputRoot: preview,
      browserWorkspaceOutputRoot: workspace,
      workspaceRoot
    });
    assert.equal(lowLevel.hkoRestrictedSourceMaterialBoundary.mode, "uncontrolled_output_observation_only");
    assert.equal(
      lowLevel.hkoRestrictedSourceMaterialBoundary.controlledMaterialIdentityEquality.outputScanPrePostEqual,
      true
    );
    assert.equal(
      lowLevel.hkoRestrictedSourceMaterialBoundary.controlledMaterialIdentityEquality.browserPreviewPrePostEqual,
      false
    );
    assert.throws(
      () => buildZiweiIztroLicenseNoticeEvidence(lowLevel, workspaceRoot),
      /requires the controlled fixed dual-build receipt/u
    );
    assert.throws(
      () => buildZiweiIztroLicenseNoticeEvidence(structuredClone(controlledReceipt), workspaceRoot),
      /requires the controlled fixed dual-build receipt/u
    );
  } finally {
    cleanupRoot(preview);
    cleanupRoot(workspace);
  }
});

test("accepts a minimal exact build surface", () => {
  const root = writeSurface(makeRoot());
  try {
    const observed = verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root);
    assert.equal(observed.licenseAsset.sha256, ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.licenseSha256);
    assert.equal(observed.htmlLicenseLink.linkCount, 1);
    assert.equal(observed.workerObservation.dependencyExecutionEstablished, false);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.outputFilesScanned, 5);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.exactRestrictedRepresentationObserved, false);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.transformedOrUnknownEncodingAbsenceEstablished, false);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.rightsLegalConclusionEstablished, false);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.publicBuildInclusionAuthorized, false);
  } finally {
    cleanupRoot(root);
  }
});

test("rejects forged or same-shaped HKO restricted-material snapshots", () => {
  const root = writeSurface(makeRoot());
  try {
    const sameShapedBoundary = structuredClone(
      controlledReceipt.hkoRestrictedSourceMaterialBoundary
    );
    assert.throws(
      () => verifyZiweiIztroIsolatedBuildLicenseSurface(
        "browser-preview",
        root,
        undefined,
        sameShapedBoundary
      ),
      /HKO restricted source material snapshot is invalid/u
    );
  } finally {
    cleanupRoot(root);
  }
});

test("rejects either fixed HKO material input drifting before Vite execution", () => {
  for (const relativePath of [
    ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.sourceEvidence.path,
    ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path
  ]) {
    const root = copyControlledBuildInputs();
    try {
      const target = path.join(root, ...relativePath.split("/"));
      writeFileSync(target, Buffer.concat([readFileSync(target), Buffer.from("\n", "utf8")]));
      assert.throws(
        () => ziweiIztroLicenseNoticeTestOnly.runFixedBuild(
          "browser-preview",
          path.join(root, "output"),
          root
        ),
        /drifted from the fixed restricted-material identity/u
      );
    } finally {
      cleanupRoot(root);
    }
  }
});

test("rejects known HKO paths, source JSON, Base64, gzip, raw CSV and sourcemap representations", () => {
  const firstSnapshot = hkoFixture.snapshots[0];
  const annualBodyCases = hkoFixture.snapshots.flatMap((snapshot) => {
    const gzipBytes = Buffer.from(snapshot.payload, "base64");
    const rawCsvBytes = gunzipSync(gzipBytes);
    return [
      {
        name: `${snapshot.year} Base64 payload in JavaScript`,
        relativePath: `assets/restricted-payload-${snapshot.year}.js`,
        bytes: Buffer.from(`export const payload=${JSON.stringify(snapshot.payload)};\n`, "utf8"),
        pattern: /gzip_base64_payload_utf8/u
      },
      {
        name: `${snapshot.year} gzip binary asset`,
        relativePath: `assets/restricted-payload-${snapshot.year}.gz`,
        bytes: gzipBytes,
        pattern: /gzip_payload_bytes/u
      },
      {
        name: `${snapshot.year} decompressed raw CSV asset`,
        relativePath: `assets/restricted-payload-${snapshot.year}.csv`,
        bytes: rawCsvBytes,
        pattern: /decompressed_raw_csv_bytes/u
      }
    ];
  });
  const cases = [
    {
      name: "forbidden fixture basename",
      relativePath: `assets/${path.posix.basename(ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path)}`,
      bytes: Buffer.from("metadata only", "utf8"),
      pattern: /exposes a restricted HKO source artifact path/u
    },
    {
      name: "exact source evidence JSON",
      relativePath: "assets/source-evidence-copy.dat",
      bytes: hkoSourceEvidenceBytes,
      pattern: /source_evidence_exact_json/u
    },
    {
      name: "exact raw fixture JSON",
      relativePath: "assets/raw-fixture-copy.dat",
      bytes: hkoFixtureBytes,
      pattern: /raw_snapshot_fixture_exact_json/u
    },
    {
      name: "raw fixture workspace path in JavaScript",
      relativePath: "assets/restricted-path.js",
      bytes: Buffer.from(
        `export const sourcePath=${JSON.stringify(ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path)};\n`,
        "utf8"
      ),
      pattern: /raw_snapshot_fixture_workspace_path_utf8/u
    },
    {
      name: "raw fixture basename in sourcemap sources",
      relativePath: "assets/path-only.js.map",
      bytes: Buffer.from(JSON.stringify({
        version: 3,
        sources: [`../fixtures/${path.posix.basename(
          ZIWEI_HKO_RESTRICTED_SOURCE_MATERIAL_IDENTITY.rawSnapshotFixture.path
        )}`]
      }), "utf8"),
      pattern: /raw_snapshot_fixture_basename_utf8/u
    },
    ...annualBodyCases,
    {
      name: "payload embedded in sourcemap",
      relativePath: "assets/main-fixture.js.map",
      bytes: Buffer.from(JSON.stringify({ version: 3, sourcesContent: [firstSnapshot.payload] }), "utf8"),
      pattern: /gzip_base64_payload_utf8/u
    }
  ];
  for (const fixtureCase of cases) {
    const root = writeSurface(makeRoot());
    try {
      const target = path.join(root, ...fixtureCase.relativePath.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, fixtureCase.bytes);
      assert.throws(
        () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
        fixtureCase.pattern,
        fixtureCase.name
      );
    } finally {
      cleanupRoot(root);
    }
  }
});

test("allows HKO link, year and digest metadata without raw response bodies", () => {
  const root = writeSurface(makeRoot());
  const firstResource = hkoSourceEvidence.resources[0];
  try {
    writeFileSync(
      path.join(root, "assets", "hko-link-hash-metadata.js"),
      `export const metadata=${JSON.stringify({
        year: firstResource.year,
        url: firstResource.resourceUrl,
        gzipSha256: firstResource.gzipSha256,
        rawSha256: firstResource.rawSha256,
        rawBytes: firstResource.rawBytes
      })};\n`
    );
    const observed = verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.exactRestrictedRepresentationObserved, false);
    assert.equal(observed.hkoRestrictedSourceMaterialExclusion.outputFilesScanned, 6);
  } finally {
    cleanupRoot(root);
  }
});

test("rejects missing, truncated, BOM-prefixed, CRLF and equal-length modified license bytes", () => {
  const cases = [
    Buffer.alloc(0),
    licenseBytes.subarray(0, licenseBytes.length - 1),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), licenseBytes]),
    Buffer.from(licenseBytes.toString("utf8").replaceAll("\n", "\r\n"), "utf8"),
    Buffer.concat([Buffer.from("X"), licenseBytes.subarray(1)])
  ];
  for (const candidate of cases) {
    const root = writeSurface(makeRoot(), { licenseBytes: candidate });
    try {
      assert.throws(
        () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
        /emitted iztro license bytes drifted/u
      );
    } finally {
      cleanupRoot(root);
    }
  }
});

test("rejects a missing asset, extra license asset, empty build and sourcemap-only worker", () => {
  const missing = writeSurface(makeRoot());
  rmSync(path.join(missing, "licenses", "iztro-2.5.8-LICENSE.txt"));
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", missing),
    /exactly the fixed top-level iztro license asset/u
  );
  cleanupRoot(missing);

  const extra = writeSurface(makeRoot());
  writeFileSync(path.join(extra, "licenses", "unexpected.txt"), "x");
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", extra),
    /exactly the fixed top-level iztro license asset/u
  );
  cleanupRoot(extra);

  const empty = writeSurface(makeRoot(), { worker: false });
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", empty),
    /exactly one non-sourcemap Browser Worker/u
  );
  cleanupRoot(empty);

  const sourcemapOnly = writeSurface(makeRoot(), { worker: false });
  writeFileSync(path.join(sourcemapOnly, "assets", "browser-worker-fixture.js.map"), JSON.stringify({ version: 3 }));
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", sourcemapOnly),
    /exactly one non-sourcemap Browser Worker/u
  );
  cleanupRoot(sourcemapOnly);
});

test("rejects Worker chunks without both locked adapter identity markers", () => {
  for (const workerText of [
    `const version="${ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.version}";`,
    `const integrity="${ZIWEI_IZTRO_LICENSE_NOTICE_IDENTITY.integrity}";`,
    "const unrelated=true;"
  ]) {
    const root = writeSurface(makeRoot(), { workerText });
    try {
      assert.throws(
        () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
        /does not carry the locked adapter identity markers/u
      );
    } finally {
      cleanupRoot(root);
    }
  }
});

test("rejects a fake Vite launcher before it can synthesize a passing output tree", () => {
  const root = copyControlledBuildInputs();
  const launcherPath = path.join(
    root,
    ...ziweiIztroLicenseNoticeTestOnly.VITE_BUILD_IDENTITY.launcherPath.split("/")
  );
  const executionMarker = path.join(path.dirname(launcherPath), "fake-vite-executed.txt");
  try {
    writeFileSync(
      launcherPath,
      "import { writeFileSync } from 'node:fs'; writeFileSync(new URL('./fake-vite-executed.txt', import.meta.url), 'executed');\n"
    );
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.runFixedBuild(
        "browser-preview",
        path.join(root, "output"),
        root
      ),
      /vite_launcher_endpoint drifted from the fixed Vite 7\.3\.6 endpoint/u
    );
    assert.equal(existsSync(executionMarker), false);
  } finally {
    cleanupRoot(root);
  }
});

test("does not inherit NODE_OPTIONS loaders into the fixed Vite child", () => {
  const root = makeRoot("hakimi-ziwei-iztro-node-options-");
  const loaderPath = path.join(root, "malicious-loader.mjs");
  const markerPath = path.join(root, "loader-executed.txt");
  const outputRoot = path.join(root, "output");
  const previousNodeOptions = process.env.NODE_OPTIONS;
  try {
    writeFileSync(
      loaderPath,
      `import { writeFileSync } from "node:fs"; writeFileSync(${JSON.stringify(markerPath)}, "executed");\n`
    );
    process.env.NODE_OPTIONS = `--import=${pathToFileURL(loaderPath).href}`;
    const build = ziweiIztroLicenseNoticeTestOnly.runFixedBuild(
      "browser-preview",
      outputRoot,
      workspaceRoot
    );
    assert.equal(existsSync(markerPath), false);
    const observed = verifyZiweiIztroIsolatedBuildLicenseSurface(
      "browser-preview",
      outputRoot,
      build.before.attestation
    );
    assert.equal(observed.buildInputAttestation.surfaceId, "browser-preview");
  } finally {
    if (previousNodeOptions === undefined) delete process.env.NODE_OPTIONS;
    else process.env.NODE_OPTIONS = previousNodeOptions;
    cleanupRoot(root);
  }
});

test("binds Vite 7.3.6 lock semantics and rejects linked execution endpoints", (t) => {
  const semanticRoot = copyControlledBuildInputs();
  try {
    const snapshot = ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
      semanticRoot,
      "browser-preview"
    );
    assert.equal(snapshot.nodeRuntimeBinaryIdentityEstablished, false);
    const lockPath = path.join(semanticRoot, "package-lock.json");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.packages[ziweiIztroLicenseNoticeTestOnly.VITE_BUILD_IDENTITY.lockPackagePath].version = "7.3.5";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
        semanticRoot,
        "browser-preview"
      ),
      /root package lock does not bind the fixed Vite 7\.3\.6 execution identity/u
    );
  } finally {
    cleanupRoot(semanticRoot);
  }

  const hardLinkRoot = copyControlledBuildInputs();
  const hardLinkTargetRoot = makeRoot("hakimi-ziwei-iztro-vite-hardlink-");
  try {
    const launcherPath = path.join(
      hardLinkRoot,
      ...ziweiIztroLicenseNoticeTestOnly.VITE_BUILD_IDENTITY.launcherPath.split("/")
    );
    linkSync(launcherPath, path.join(hardLinkTargetRoot, "vite-launcher-copy.js"));
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
        hardLinkRoot,
        "browser-preview"
      ),
      /must not be hard-linked/u
    );
  } finally {
    cleanupRoot(hardLinkRoot);
    cleanupRoot(hardLinkTargetRoot);
  }

  const symlinkRoot = copyControlledBuildInputs();
  const symlinkTargetRoot = makeRoot("hakimi-ziwei-iztro-vite-symlink-");
  try {
    const launcherPath = path.join(
      symlinkRoot,
      ...ziweiIztroLicenseNoticeTestOnly.VITE_BUILD_IDENTITY.launcherPath.split("/")
    );
    const target = path.join(symlinkTargetRoot, "vite.js");
    copyFileSync(
      path.join(workspaceRoot, ...ziweiIztroLicenseNoticeTestOnly.VITE_BUILD_IDENTITY.launcherPath.split("/")),
      target
    );
    rmSync(launcherPath);
    try {
      symlinkSync(target, launcherPath, "file");
    } catch (cause) {
      t.diagnostic(`file symlink creation unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
        symlinkRoot,
        "browser-preview"
      ),
      /symlink or junction/u
    );
  } finally {
    cleanupRoot(symlinkRoot);
    cleanupRoot(symlinkTargetRoot);
  }
});

test("rejects a controlled input that changes between build snapshots", () => {
  const root = copyControlledBuildInputs();
  try {
    const before = ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
      root,
      "browser-preview"
    );
    const configPath = path.join(
      root,
      "packages",
      "ziwei-iztro-adapter-draft",
      "vite.browser-preview.config.mjs"
    );
    writeFileSync(configPath, Buffer.concat([readFileSync(configPath), Buffer.from("\n")]));
    const after = ziweiIztroLicenseNoticeTestOnly.observeControlledBuildInputs(
      root,
      "browser-preview"
    );
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.requireSameControlledBuildInputs(
        before,
        after,
        "during fixture build"
      ),
      /controlled build input changed during fixture build/u
    );
  } finally {
    cleanupRoot(root);
  }
});

test("rejects missing, tampered, forged, duplicate-key and extra build attestations", () => {
  const missing = writeSurface(makeRoot(), { attestation: false });
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", missing),
    /exactly the canonical build-input attestation asset/u
  );
  cleanupRoot(missing);

  const tamperedAttestation = structuredClone(expectedBuildInputAttestations["browser-preview"]);
  tamperedAttestation.inputs[0].sha256 = "0".repeat(64);
  const tampered = writeSurface(makeRoot(), { attestation: tamperedAttestation });
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", tampered),
    /not the unique canonical observation of the fixed inputs/u
  );
  cleanupRoot(tampered);

  const forgedAttestation = structuredClone(expectedBuildInputAttestations["browser-workspace"]);
  forgedAttestation.surfaceId = "browser-preview";
  const forged = writeSurface(makeRoot(), { attestation: forgedAttestation });
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", forged),
    /not the unique canonical observation of the fixed inputs/u
  );
  cleanupRoot(forged);

  const canonical = `${JSON.stringify(expectedBuildInputAttestations["browser-preview"], null, 2)}\n`;
  const duplicateKey = canonical.replace(
    '{\n  "schemaVersion": "ziwei-iztro-build-input-attestation/1",',
    '{\n  "schemaVersion": "forged",\n  "schemaVersion": "ziwei-iztro-build-input-attestation/1",'
  );
  assert.deepEqual(JSON.parse(duplicateKey), JSON.parse(canonical));
  const duplicate = writeSurface(makeRoot(), { attestationBytes: Buffer.from(duplicateKey) });
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", duplicate),
    /not the unique canonical observation of the fixed inputs/u
  );
  cleanupRoot(duplicate);

  const extra = writeSurface(makeRoot());
  writeFileSync(path.join(extra, "build-attestations", "forged.json"), canonical);
  assert.throws(
    () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", extra),
    /exactly the canonical build-input attestation asset/u
  );
  cleanupRoot(extra);
});

test("rejects base redirects, duplicates, external links and inert or foreign fake links", () => {
  const cases = [
    ["base redirect", validHtml('<base href="https://example.invalid/">')],
    ["duplicate", validHtml('<link rel="license" type="text/plain" href="./licenses/iztro-2.5.8-LICENSE.txt">')],
    ["external", '<!doctype html><html><head><link rel="license" type="text/plain" href="https://example.invalid/LICENSE"></head></html>'],
    ["script", '<!doctype html><html><head><script>const x=`<link rel="license" href="./licenses/iztro-2.5.8-LICENSE.txt">`;</script></head></html>'],
    ["title", '<!doctype html><html><head><title><link rel="license" href="./licenses/iztro-2.5.8-LICENSE.txt"></title></head></html>'],
    ["template", '<!doctype html><html><head><template><link rel="license" href="./licenses/iztro-2.5.8-LICENSE.txt"></template></head></html>'],
    ["noscript", '<!doctype html><html><head><noscript><link rel="license" href="./licenses/iztro-2.5.8-LICENSE.txt"></noscript></head></html>'],
    ["svg", '<!doctype html><html><head><svg><link rel="license" href="./licenses/iztro-2.5.8-LICENSE.txt"></link></svg></head></html>'],
    ["attribute", '<!doctype html><html><head></head><body><div data-x="<link rel=license href=./licenses/iztro-2.5.8-LICENSE.txt>"></div></body></html>']
  ];
  for (const [label, html] of cases) {
    const root = writeSurface(makeRoot(), { html });
    try {
      assert.throws(
        () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
        /base element|exactly one rel=license|exact same-origin|inert container|direct HTML head/u,
        label
      );
    } finally {
      cleanupRoot(root);
    }
  }
});

test("rejects symlink or junction output endpoints when supported", (t) => {
  const root = writeSurface(makeRoot());
  const target = makeRoot("hakimi-ziwei-iztro-link-target-");
  writeFileSync(path.join(target, "outside.txt"), "outside");
  try {
    try {
      symlinkSync(target, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
    } catch (cause) {
      t.skip(`symlink creation unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    assert.throws(
      () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
      /symlink or junction/u
    );
  } finally {
    cleanupRoot(root);
    cleanupRoot(target);
  }
});

test("rejects hard-linked output files", () => {
  const root = writeSurface(makeRoot());
  const outside = path.join(makeRoot("hakimi-ziwei-iztro-hardlink-target-"), "license-copy.txt");
  try {
    linkSync(path.join(root, "licenses", "iztro-2.5.8-LICENSE.txt"), outside);
    assert.throws(
      () => verifyZiweiIztroIsolatedBuildLicenseSurface("browser-preview", root),
      /hard-linked/u
    );
  } finally {
    cleanupRoot(root);
    cleanupRoot(path.dirname(outside));
  }
});

test("rejects duplicate-key, BOM, CRLF and trailing-byte evidence even when JSON.parse collapses it", () => {
  const canonical = `${JSON.stringify(expectedEvidence, null, 2)}\n`;
  const duplicate = canonical.replace(
    '{\n  "schemaVersion": "1.0.0",',
    '{\n  "schemaVersion": "forged",\n  "schemaVersion": "1.0.0",'
  );
  assert.deepEqual(JSON.parse(duplicate), JSON.parse(canonical));
  for (const bytes of [
    Buffer.from(duplicate),
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(canonical)]),
    Buffer.from(canonical.replaceAll("\n", "\r\n")),
    Buffer.from(`${canonical} `)
  ]) {
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.requireExactCanonicalEvidenceBytes(bytes, expectedEvidence),
      /BOM|unique current canonical pretty JSON/u
    );
  }
});

test("rejects re-signed authority, coverage, parent binding and read-boundary elevation", () => {
  const mutators = [
    (value) => { value.coverageBoundary.subjectFullySatisfied = true; },
    (value) => { value.coverageBoundary.completeDependencyClosureCovered = true; },
    (value) => { value.coverageBoundary.fortelCovered = true; },
    (value) => { value.parentBindingBoundary.bindsZiweiManifest = true; },
    (value) => { value.authorityBoundary.noticeObligationSatisfied = true; },
    (value) => { value.authorityBoundary.rightsLegalConclusionEstablished = true; },
    (value) => { value.authorityBoundary.expertClaimsAuthorized = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicDeploymentAuthorized = true; },
    (value) => { value.readBoundary.mutationEpochEstablished = true; },
    (value) => { value.buildExecutionObservation.nodeRuntimeBinaryIdentityEstablished = true; },
    (value) => { value.buildExecutionObservation.inheritedNodeAndViteEnvironmentAccepted = true; },
    (value) => { value.buildExecutionObservation.rootLockSemanticIdentity.rawRootLockBytesPromotedToReleaseEvidence = true; },
    (value) => { value.buildExecutionObservation.controlledInputEquality.intervalIntegrityEstablished = true; },
    (value) => { value.noticeCandidate.releaseBuildProvenanceEstablished = true; },
    (value) => { value.noticeCandidate.controlledBuildReceipt.surfaces[0].buildInputAttestation.inputCount = 999; }
  ];
  for (const mutate of mutators) {
    const candidate = structuredClone(expectedEvidence);
    mutate(candidate);
    candidate.evidenceDigest = computeZiweiIztroLicenseNoticeEvidenceDigest(candidate);
    const bytes = Buffer.from(`${JSON.stringify(candidate, null, 2)}\n`);
    assert.throws(
      () => ziweiIztroLicenseNoticeTestOnly.requireExactCanonicalEvidenceBytes(bytes, expectedEvidence),
      /unique current canonical pretty JSON|no longer matches/u
    );
  }
});

test("persists the unique expected evidence bytes", () => {
  const evidencePath = path.join(workspaceRoot, ...ZIWEI_IZTRO_LICENSE_NOTICE_EVIDENCE_PATH.split("/"));
  assert.equal(existsSync(evidencePath), true);
  const actual = readFileSync(evidencePath);
  const expected = Buffer.from(`${JSON.stringify(expectedEvidence, null, 2)}\n`);
  assert.equal(actual.equals(expected), true);
});
