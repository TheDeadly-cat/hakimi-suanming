import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  WESTERN_LICENSE_NOTICE_IDENTITY,
  WESTERN_LICENSE_NOTICE_EVIDENCE_PATH,
  buildWesternLicenseNoticeEvidence,
  computeWesternLicenseNoticeEvidenceDigest,
  parseWesternLicenseNoticeEvidenceJsonBytes,
  runWesternIsolatedBuildLicenseNoticeVerification,
  verifyWesternCanonicalLicenseInputs,
  verifyWesternIsolatedBuildLicenseNotices,
  verifyWesternIsolatedBuildLicenseSurface,
  verifyWesternLicenseNoticeEvidence
} from "./western-isolated-build-license-notice-lib.mjs";

const testPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(testPath), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-western-isolated-build-license-notices.mjs");
const canonicalLicense = readFileSync(path.join(
  workspaceRoot,
  "packages",
  "western-astronomy-engine-adapter-draft",
  "licenses",
  "astronomy-engine-2.1.19-LICENSE.txt"
));

function withTemporaryRoot(run) {
  const root = mkdtempSync(path.join(os.tmpdir(), "hakimi-western-license-test-"));
  try {
    return run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeFixtureSurface(root, surfaceId, overrides = {}) {
  const outputRoot = path.join(root, surfaceId);
  mkdirSync(path.join(outputRoot, "licenses"), { recursive: true });
  mkdirSync(path.join(outputRoot, "assets"), { recursive: true });
  const licenseBytes = overrides.licenseBytes ?? canonicalLicense;
  writeFileSync(
    path.join(outputRoot, WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath),
    licenseBytes
  );
  const html = overrides.html ?? [
    "<!doctype html>",
    "<html><head>",
    '<link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt">',
    "</head><body></body></html>"
  ].join("\n");
  writeFileSync(path.join(outputRoot, "index.html"), html, "utf8");
  const workerSource = overrides.workerSource ?? [
    `const version = ${JSON.stringify(WESTERN_LICENSE_NOTICE_IDENTITY.version)};`,
    `const sourceDigest = ${JSON.stringify(WESTERN_LICENSE_NOTICE_IDENTITY.engineEsmSha256)};`,
    "void version; void sourceDigest;"
  ].join("\n");
  writeFileSync(path.join(outputRoot, "assets", "browser-worker-fixture.js"), workerSource, "utf8");
  if (overrides.mapSource !== undefined) {
    writeFileSync(path.join(outputRoot, "assets", "browser-worker-fixture.js.map"), overrides.mapSource, "utf8");
  }
  return outputRoot;
}

test("accepts exact standalone notices on both enumerated isolated build surfaces", () => withTemporaryRoot((root) => {
  const browserParityOutputRoot = writeFixtureSurface(root, "browser-parity");
  const rulesPreviewOutputRoot = writeFixtureSurface(root, "rules-preview");
  const receipt = verifyWesternIsolatedBuildLicenseNotices({
    browserParityOutputRoot,
    rulesPreviewOutputRoot,
    workspaceRoot
  });
  assert.equal(receipt.status, "isolated_build_notice_bytes_observed_without_legal_clearance");
  assert.equal(receipt.surfaces.length, 2);
  assert.ok(receipt.surfaces.every((surface) =>
    surface.licenseAsset.sha256 === WESTERN_LICENSE_NOTICE_IDENTITY.licenseSha256
      && surface.htmlLicenseLink.linkCount === 1
      && surface.engineWorkerObservation.executionEstablished === false
  ));
  assert.deepEqual(receipt.readBoundary, {
    model: "held_file_handle_endpoint_snapshots",
    crossFileAtomicityEstablished: false,
    intervalIntegrityEstablished: false,
    abaResistanceEstablished: false,
    mutationEpochEstablished: false
  });
  assert.ok(Object.values(receipt.authorityBoundary).every((value) => value === false));
}));

test("pins LF checkout semantics for every byte-hashed evidence basis artifact", () => {
  const attributeRules = new Set(readFileSync(path.join(workspaceRoot, ".gitattributes"), "utf8")
    .split(/\r?\n/u)
    .filter(Boolean));
  const basisPaths = [
    "packages/western-astronomy-engine-adapter-draft/package.json",
    "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-lock-closure.json",
    "packages/western-astronomy-engine-adapter-draft/src/astronomy-engine-2.1.19-source-lock.json",
    "packages/western-astronomy-engine-adapter-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
    "packages/western-astronomy-engine-adapter-draft/vite.browser-parity.config.mjs",
    "packages/western-astronomy-engine-adapter-draft/browser-parity/index.html",
    "packages/western-astrology-rules-preview-draft/licenses/astronomy-engine-2.1.19-LICENSE.txt",
    "packages/western-astrology-rules-preview-draft/vite.rules-preview.config.mjs",
    "packages/western-astrology-rules-preview-draft/browser-app/index.html"
  ];
  for (const basisPath of basisPaths) {
    assert.ok(attributeRules.has(`/${basisPath} text eol=lf`), basisPath);
  }
});

test("rejects duplicate keys before the frozen child can collapse to an authority-red object", () => {
  const evidenceBytes = readFileSync(path.join(workspaceRoot, WESTERN_LICENSE_NOTICE_EVIDENCE_PATH));
  const source = evidenceBytes.toString("utf8");
  const parsedEvidence = JSON.parse(source);
  assert.deepEqual(
    parseWesternLicenseNoticeEvidenceJsonBytes(evidenceBytes),
    parsedEvidence
  );
  const digestLine = `  "evidenceDigest": "${parsedEvidence.evidenceDigest}"`;
  const duplicates = [
    source.replace(
      digestLine,
      `  "evidenceDigest": "${"0".repeat(64)}",\n${digestLine}`
    ),
    source.replace(
      '    "bindsWesternManifest": false,',
      '    "bindsWesternManifest": true,\n    "bindsWesternManifest": false,'
    ),
    source.replace(
      '    "rightsLegalConclusionEstablished": false,',
      '    "rightsLegalConclusionEstablished": true,\n    "rightsLegalConclusionEstablished": false,'
    ),
    source.replace(
      '    "formalAdmissionAuthorized": false,',
      '    "formalAdmissionAuthorized": true,\n    "formalAdmissionAuthorized": false,'
    )
  ];
  for (const duplicate of duplicates) {
    assert.deepEqual(JSON.parse(duplicate), parsedEvidence);
    assert.throws(
      () => parseWesternLicenseNoticeEvidenceJsonBytes(Buffer.from(duplicate, "utf8")),
      /unique canonical duplicate-free JSON materialization/u
    );
  }
});

test("keeps the one-way evidence child exact, unbound, Schema-null, and authority-red", () => {
  const receipt = runWesternIsolatedBuildLicenseNoticeVerification({ evidenceMode: "none" });
  const expected = buildWesternLicenseNoticeEvidence(receipt, workspaceRoot);
  assert.equal(expected.systemIdentity.releaseIdentity, null);
  assert.equal(expected.systemIdentity.targetSchema, null);
  assert.equal(expected.systemIdentity.migrationId, null);
  assert.ok(Object.values(expected.parentBindingBoundary)
    .filter((value) => typeof value === "boolean")
    .every((value) => value === false));
  assert.ok(Object.values(expected.authorityBoundary).every((value) => value === false));
  assert.equal(
    expected.noticeCandidate.controlledBuildReceipt.platformSpecificOutputTreeDigestsBound,
    false
  );
  for (const surface of expected.noticeCandidate.controlledBuildReceipt.surfaces) {
    assert.equal(Object.hasOwn(surface, "outputTreeSha256"), false);
    assert.deepEqual(Object.keys(surface.engineWorkerObservation).sort(), [
      "engineEsmDigestMarkerObserved",
      "executionEstablished",
      "nonSourcemapWorkerCount",
      "versionMarkerObserved"
    ]);
    assert.equal(Object.hasOwn(surface.engineWorkerObservation, "path"), false);
    assert.equal(Object.hasOwn(surface.engineWorkerObservation, "bytes"), false);
    assert.equal(Object.hasOwn(surface.engineWorkerObservation, "sha256"), false);
  }
  const forgedReceipt = structuredClone(receipt);
  forgedReceipt.readBoundary.mutationEpochEstablished = true;
  forgedReceipt.surfaces[0].licenseAsset.rightsLegalConclusionEstablished = true;
  assert.throws(
    () => buildWesternLicenseNoticeEvidence(forgedReceipt, workspaceRoot),
    /requires the controlled fixed dual-build receipt/u
  );
  assert.throws(
    () => buildWesternLicenseNoticeEvidence(receipt, path.join(workspaceRoot, "packages")),
    /cannot be rebound to a different workspace root/u
  );
  withTemporaryRoot((root) => {
    const untrustedFixtureReceipt = verifyWesternIsolatedBuildLicenseNotices({
      browserParityOutputRoot: writeFixtureSurface(root, "browser-parity"),
      rulesPreviewOutputRoot: writeFixtureSurface(root, "rules-preview"),
      workspaceRoot
    });
    assert.throws(
      () => buildWesternLicenseNoticeEvidence(untrustedFixtureReceipt, workspaceRoot),
      /requires the controlled fixed dual-build receipt/u
    );
  });

  const frozenEvidence = JSON.parse(readFileSync(
    path.join(workspaceRoot, WESTERN_LICENSE_NOTICE_EVIDENCE_PATH),
    "utf8"
  ));
  assert.equal(
    frozenEvidence.evidenceDigest,
    computeWesternLicenseNoticeEvidenceDigest(frozenEvidence)
  );
  assert.deepEqual(frozenEvidence, expected);

  const attacks = [
    ["Schema inheritance", (candidate) => { candidate.systemIdentity.targetSchema = 13; }],
    ["legal clearance", (candidate) => { candidate.authorityBoundary.rightsLegalConclusionEstablished = true; }],
    ["rights coverage expansion", (candidate) => { candidate.coverageBoundary.coversSofa = true; }],
    ["parent back-link", (candidate) => { candidate.parentBindingBoundary.bindsWesternManifest = true; }],
    ["forged build receipt", (candidate) => { candidate.noticeCandidate.controlledBuildReceipt.surfaces[0].licenseAsset.sha256 = "0".repeat(64); }]
  ];
  for (const [label, mutate] of attacks) {
    const candidate = structuredClone(expected);
    mutate(candidate);
    candidate.evidenceDigest = computeWesternLicenseNoticeEvidenceDigest(candidate);
    assert.throws(
      () => verifyWesternLicenseNoticeEvidence(candidate, receipt, workspaceRoot),
      /no longer matches the fixed dependency and build observations/u,
      label
    );
  }
});

test("rejects missing, truncated, BOM-prefixed, CRLF, and equal-length modified license bytes", async (t) => {
  const cases = [
    ["truncated", canonicalLicense.subarray(0, canonicalLicense.byteLength - 1)],
    ["BOM-prefixed", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), canonicalLicense])],
    ["CRLF", Buffer.from(canonicalLicense.toString("utf8").replaceAll("\n", "\r\n"), "utf8")],
    ["equal-length modified", Buffer.concat([Buffer.from("X"), canonicalLicense.subarray(1)])]
  ];
  for (const [label, licenseBytes] of cases) {
    await t.test(label, () => withTemporaryRoot((root) => {
      const outputRoot = writeFixtureSurface(root, "browser-parity", { licenseBytes });
      assert.throws(
        () => verifyWesternIsolatedBuildLicenseSurface("browser-parity", outputRoot),
        /emitted license bytes drifted/u
      );
    }));
  }
  await t.test("missing", () => withTemporaryRoot((root) => {
    const outputRoot = writeFixtureSurface(root, "browser-parity");
    rmSync(path.join(outputRoot, WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath));
    assert.throws(
      () => verifyWesternIsolatedBuildLicenseSurface("browser-parity", outputRoot),
      /must contain exactly the fixed Astronomy Engine license asset/u
    );
  }));
});

test("rejects sourcemap-only engine markers and an empty build plus notice", () => withTemporaryRoot((root) => {
  const outputRoot = writeFixtureSurface(root, "browser-parity", {
    workerSource: "self.close();",
    mapSource: JSON.stringify({
      version: 3,
      sourcesContent: [
        `${WESTERN_LICENSE_NOTICE_IDENTITY.version} ${WESTERN_LICENSE_NOTICE_IDENTITY.engineEsmSha256}`
      ]
    })
  });
  assert.throws(
    () => verifyWesternIsolatedBuildLicenseSurface("browser-parity", outputRoot),
    /non-sourcemap Browser Worker does not carry the locked engine identity markers/u
  );
}));

test("rejects base redirects, duplicate license links, and external license links", async (t) => {
  const cases = [
    ["base redirect", '<base href="https://example.invalid/"><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt">', /must not contain a base element/u],
    ["duplicate", '<link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt">', /exactly one rel=license/u],
    ["external", '<link rel="license" href="https://example.invalid/LICENSE">', /exact same-origin relative license asset/u],
    ["script inert text", '<script>const inert = \'<link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt">\';</script>', /exactly one rel=license/u],
    ["script false closing token", '<script>const inert = "</scriptx><link rel=license href=./licenses/astronomy-engine-2.1.19-LICENSE.txt>";</script>', /exactly one rel=license/u],
    ["title RCDATA", '<title><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"></title>', /exactly one rel=license/u],
    ["textarea RCDATA", '<textarea><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"></textarea>', /exactly one rel=license/u],
    ["template inert content", '<template><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"></template>', /must not place license metadata behind an inert container/u],
    ["noscript inert content", '<noscript><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"></noscript>', /exactly one rel=license|direct HTML head child/u],
    ["foreign SVG link", '<svg><link rel="license" href="./licenses/astronomy-engine-2.1.19-LICENSE.txt"></link></svg>', /direct HTML head child/u],
    ["attribute inert text", '<div data-inert="<link rel=\'license\' href=\'./licenses/astronomy-engine-2.1.19-LICENSE.txt\'>"></div>', /exactly one rel=license/u]
  ];
  for (const [label, head, pattern] of cases) {
    await t.test(label, () => withTemporaryRoot((root) => {
      const outputRoot = writeFixtureSurface(root, "rules-preview", {
        html: `<!doctype html><html><head>${head}</head><body></body></html>`
      });
      assert.throws(
        () => verifyWesternIsolatedBuildLicenseSurface("rules-preview", outputRoot),
        pattern
      );
    }));
  }
});

test("rejects hard-linked output endpoints", () => withTemporaryRoot((root) => {
  const outputRoot = writeFixtureSurface(root, "browser-parity");
  linkSync(
    path.join(outputRoot, WESTERN_LICENSE_NOTICE_IDENTITY.licenseAssetPath),
    path.join(root, "license-hardlink.txt")
  );
  assert.throws(
    () => verifyWesternIsolatedBuildLicenseSurface("browser-parity", outputRoot),
    /must not be a hard-linked endpoint/u
  );
}));

test("rejects a workspace evidence path that crosses a symlinked or junction directory", (t) => withTemporaryRoot((root) => {
  const workspace = path.join(root, "workspace");
  const outside = path.join(root, "outside-packages");
  mkdirSync(workspace, { recursive: true });
  mkdirSync(outside, { recursive: true });
  try {
    symlinkSync(outside, path.join(workspace, "packages"), process.platform === "win32" ? "junction" : "dir");
  } catch (cause) {
    if (cause && typeof cause === "object" && ["EPERM", "EACCES"].includes(cause.code)) {
      t.skip("platform does not permit creating a directory symlink or junction");
      return;
    }
    throw cause;
  }
  assert.throws(
    () => verifyWesternCanonicalLicenseInputs(workspace),
    /crosses a symlink or junction/u
  );
}));

test("rejects symlinked output endpoints when the platform permits creating them", (t) => withTemporaryRoot((root) => {
  const outputRoot = writeFixtureSurface(root, "browser-parity");
  const workerPath = path.join(outputRoot, "assets", "browser-worker-fixture.js");
  const targetPath = path.join(root, "worker-target.js");
  writeFileSync(targetPath, readFileSync(workerPath));
  rmSync(workerPath);
  try {
    symlinkSync(targetPath, workerPath, "file");
  } catch (cause) {
    if (cause && typeof cause === "object" && ["EPERM", "EACCES"].includes(cause.code)) {
      t.skip("platform does not permit creating a file symlink");
      return;
    }
    throw cause;
  }
  assert.throws(
    () => verifyWesternIsolatedBuildLicenseSurface("browser-parity", outputRoot),
    /must not be a symlink or junction/u
  );
}));

test("runs both fixed Vite builds in an owned temporary root and returns a bounded receipt", () => {
  const temporaryPrefix = "hakimi-western-license-verification-";
  const before = new Set(readdirSync(os.tmpdir()).filter((entry) => entry.startsWith(temporaryPrefix)));
  const stdout = execFileSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024
  });
  const receipt = JSON.parse(stdout);
  assert.deepEqual(receipt.surfaces.map((surface) => surface.surfaceId), ["browser-parity", "rules-preview"]);
  assert.ok(receipt.surfaces.every((surface) =>
    surface.licenseAsset.bytes === 1095
      && surface.licenseAsset.sha256 === WESTERN_LICENSE_NOTICE_IDENTITY.licenseSha256
      && surface.htmlLicenseLink.href === "./licenses/astronomy-engine-2.1.19-LICENSE.txt"
  ));
  assert.equal(receipt.authorityBoundary.noticeObligationSatisfied, false);
  assert.equal(receipt.authorityBoundary.redistributionAuthorized, false);
  assert.equal(receipt.authorityBoundary.releaseReady, false);
  const after = new Set(readdirSync(os.tmpdir()).filter((entry) => entry.startsWith(temporaryPrefix)));
  assert.deepEqual(after, before);
});
