import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createMockedDeployedHostExpectation,
  loadDeployedHostExpectation,
  validateDeployedHostPolicyBinding,
  validateResolvedPublicAddresses,
  validateHostingSecurityPolicy,
  validateRealDeployedHostPreflight,
  verifyDeployedHostContract,
  verifyRealDeployedHost
} from "./deployed-security-headers-lib.mjs";
import { writeReleaseArtifactIdentityLock } from "./release-artifact-identity-lib.mjs";
import {
  canonicalJson,
  collectArtifactEntries,
  releaseArtifactComponents,
  sha256
} from "./release-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "https://staging.hakimi-bazi.cn";
const reportOnlyCsp = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; frame-src 'none'; upgrade-insecure-requests";
const fixtureDescriptor = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: Object.freeze([null]),
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});
const fixtureStorageManifest = Object.freeze({
  manifestVersion: 1,
  database: fixtureDescriptor,
  requiredStorageTables: Object.freeze([
    "cases", "revisions", "candidateSets", "researchNotes", "events", "savedViews",
    "knowledgeDocuments", "sourceRights", "citations", "attachments", "researcherProfiles",
    "appSettings", "ruleRegistry", "tzdbMigrationReceipts", "eventTimeMigrationReceipts",
    "birthFingerprints"
  ]),
  requiredStorageIndexes: Object.freeze([])
});
const fixtureSerializedStorageManifest = JSON.stringify(fixtureStorageManifest);
const fixtureReleaseIdentity = Object.freeze({
  descriptor: fixtureDescriptor,
  manifestVersion: 1,
  manifestDigest: createHash("sha256").update(fixtureSerializedStorageManifest).digest("hex"),
  buildVersion: "123456789abc",
  evidenceId: `hre1-${"a".repeat(32)}`
});

function escapeHtmlAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function releaseMetaTags() {
  return [
    `<meta name="hakimi-release-database" content="${escapeHtmlAttribute(JSON.stringify(fixtureDescriptor))}">`,
    `<meta name="hakimi-release-storage-manifest" content="${escapeHtmlAttribute(fixtureSerializedStorageManifest)}">`,
    `<meta name="hakimi-release-storage-manifest-digest" content="${fixtureReleaseIdentity.manifestDigest}">`,
    `<meta name="hakimi-build-version" content="${fixtureReleaseIdentity.buildVersion}">`,
    `<meta name="hakimi-release-evidence-id" content="${fixtureReleaseIdentity.evidenceId}">`
  ].join("");
}

function indexFixture() {
  return [
    "<!doctype html><html><head>",
    releaseMetaTags(),
    '<link rel="icon" href="/brand.svg" type="image/svg+xml">',
    '<link rel="manifest" href="/manifest.webmanifest">',
    '<link rel="stylesheet" href="/assets/app.css">',
    "</head><body>",
    '<img src="/brand.svg" alt="">',
    '<script type="module" crossorigin src="/assets/app.js"></script>',
    "</body></html>"
  ].join("");
}

function serviceWorkerFixture() {
  const descriptorLiteral = JSON.stringify(JSON.stringify(fixtureDescriptor));
  return [
    `const CACHE_VERSION = "${fixtureReleaseIdentity.buildVersion}";`,
    `const RELEASE_DATABASE = JSON.parse(${descriptorLiteral});`,
    `const LEGACY_BRIDGE_DATABASE = Object.freeze(JSON.parse(${descriptorLiteral}));`,
    "self.addEventListener('fetch', () => {});"
  ].join("\n");
}

function policyFixture({ blocking = false } = {}) {
  return {
    schemaVersion: 2,
    policyId: "hakimi-web-public-hosting-baseline-v2",
    deploymentPlatform: "fixture-host",
    canonicalOrigin: origin,
    cspEnforcementStatus: blocking ? "blocking_header_candidate" : "report_only_until_real_host_validation",
    headers: {
      [blocking ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"]: reportOnlyCsp,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), browsing-topics=()",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Strict-Transport-Security": "max-age=31536000"
    },
    cacheRules: {
      "/*": "no-cache, no-store, must-revalidate",
      "/index.html": "no-cache, no-store, must-revalidate",
      "/sw.js": "no-cache, no-store, must-revalidate",
      "/assets/*": "public, max-age=31536000, immutable"
    },
    documentRoutes: [
      "/", "/index.html", "/new", "/cases", "/cases/research", "/compare",
      "/compare/pair", "/knowledge", "/help", "/settings", "/settings/data",
      "/settings/calendar-divergence-audit", "/settings/transit-review-inbox",
      "/candidate-sets/00000000-0000-4000-8000-000000000000",
      "/cases/00000000-0000-4000-8000-000000000000/revisions/00000000-0000-4000-8000-000000000001",
      "/cases/00000000-0000-4000-8000-000000000000/revisions/00000000-0000-4000-8000-000000000001/revise"
    ],
    releaseEvidencePath: "/release-evidence.json",
    nonPublicArtifactPaths: ["_headers", "release-evidence.json.sha256"],
    contentTypes: {
      ".html": ["text/html"],
      ".js": ["text/javascript", "application/javascript"],
      ".css": ["text/css"],
      ".webmanifest": ["application/manifest+json", "application/json"],
      ".json": ["application/json"],
      ".svg": ["image/svg+xml"],
      ".png": ["image/png"],
      ".woff2": ["font/woff2"],
      ".wasm": ["application/wasm"],
      ".map": ["application/json"],
      ".txt": ["text/plain"]
    },
    redirectRules: ["/", "/sw.js", "/release-evidence.json", "/settings/data"].map((pathname) => ({
      from: `http://staging.hakimi-bazi.cn${pathname}`,
      status: 308,
      to: `${origin}${pathname}`
    })),
    publicReleaseGate: {
      httpsRequired: true,
      realHostHeadersVerified: false,
      cspBlockingModeVerified: false,
      unnecessaryThirdPartyScriptsAllowed: false
    }
  };
}

function manifestFixture(overrides = {}) {
  return JSON.stringify({
    name: "Fixture",
    short_name: "Fixture",
    description: "Deployed host verifier fixture",
    id: "/",
    lang: "zh-CN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    categories: ["productivity"],
    prefer_related_applications: false,
    icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" }],
    shortcuts: [],
    ...overrides
  });
}

function artifactFiles({ html, manifest } = {}) {
  return {
    "_headers": "fixture deployment control",
    "release-evidence.json.sha256": "fixture non-public Evidence sidecar",
    "index.html": html ?? indexFixture(),
    "manifest.webmanifest": manifest ?? manifestFixture(),
    "sw.js": serviceWorkerFixture(),
    "brand.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>",
    "icon.png": Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    "assets/app.js": "export const release = 'legacy-v13';",
    "assets/app.css": "body{color:#111}"
  };
}

function mimeForPath(pathname) {
  if (policyFixture().documentRoutes.includes(pathname)) return "text/html; charset=utf-8";
  if (pathname.endsWith(".webmanifest")) return "application/manifest+json";
  if (pathname.endsWith(".json")) return "application/json";
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".svg")) return "image/svg+xml";
  if (pathname.endsWith(".png")) return "image/png";
  throw new Error(`No fixture MIME for ${pathname}`);
}

function responseFixture(url, body, headers, status = 200) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return {
    status,
    url,
    redirected: false,
    headers: new Headers(headers),
    async arrayBuffer() {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
  };
}

function streamedResponseFixture(url, chunks, headers, status = 200) {
  return {
    status,
    url,
    redirected: false,
    headers: new Headers(headers),
    body: {
      getReader() {
        let index = 0;
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            const value = chunks[index];
            index += 1;
            return { done: false, value };
          },
          async cancel() {},
          releaseLock() {}
        };
      },
      async cancel() {}
    },
    async arrayBuffer() {
      throw new Error("streaming response must not allocate through arrayBuffer");
    }
  };
}

function fetchFixture({ policy, files, evidenceBytes, mutate } = {}) {
  const activePolicy = policy ?? policyFixture();
  const activeFiles = files ?? artifactFiles();
  const evidence = Buffer.isBuffer(evidenceBytes) ? evidenceBytes : Buffer.from(evidenceBytes ?? '{"fixture":true}');
  const calls = [];
  const fetchImpl = async (target, options) => {
    const targetUrl = new URL(target);
    calls.push({ url: targetUrl.href, redirect: options?.redirect });
    if (targetUrl.protocol === "http:") {
      const rule = activePolicy.redirectRules.find((candidate) => candidate.from === targetUrl.href);
      const base = responseFixture(targetUrl.href, Buffer.alloc(0), { location: rule?.to ?? `${origin}/wrong` }, rule?.status ?? 302);
      return mutate?.({ kind: "redirect", pathname: targetUrl.pathname, response: base, body: Buffer.alloc(0) }) ?? base;
    }
    const pathname = targetUrl.pathname;
    if (activePolicy.nonPublicArtifactPaths.includes(pathname.slice(1))) {
      const base = responseFixture(targetUrl.href, Buffer.alloc(0), {}, 404);
      return mutate?.({ kind: "non-public", pathname, response: base, body: Buffer.alloc(0), headers: {} }) ?? base;
    }
    let body;
    if (activePolicy.documentRoutes.includes(pathname)) body = Buffer.from(activeFiles["index.html"]);
    else if (pathname === activePolicy.releaseEvidencePath) body = evidence;
    else body = activeFiles[pathname.slice(1)];
    if (body === undefined) throw new Error(`Unexpected fixture request: ${pathname}`);
    body = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const cache = pathname.startsWith("/assets/")
      ? activePolicy.cacheRules["/assets/*"]
      : activePolicy.cacheRules["/*"];
    const headers = {
      ...activePolicy.headers,
      "Cache-Control": cache,
      "Content-Type": mimeForPath(pathname),
      "Content-Length": String(body.byteLength)
    };
    const base = responseFixture(targetUrl.href, body, headers);
    return mutate?.({ kind: "content", pathname, response: base, body, headers }) ?? base;
  };
  return { fetchImpl, calls };
}

function completeFixture(options = {}) {
  const policy = options.policy ?? policyFixture();
  const files = options.files ?? artifactFiles();
  const evidenceBytes = Buffer.from('{"fixture":true}');
  const expectation = createMockedDeployedHostExpectation({
    files,
    evidenceBytes,
    releaseIdentity: options.releaseIdentity ?? fixtureReleaseIdentity
  });
  const network = fetchFixture({ policy, files, evidenceBytes, mutate: options.mutate });
  return { policy, files, evidenceBytes, expectation, ...network };
}

function normalizedRelative(from, to) {
  return path.relative(from, to).replaceAll("\\", "/");
}

async function writeSchemaValidLocalLoaderFixture(root, policy) {
  const dist = path.join(root, "dist", "web");
  const lockPath = path.join(root, "release-artifact-identity.json");
  const policyPath = path.join(root, "hosting-security-policy.json");
  await mkdir(dist, { recursive: true });
  const files = artifactFiles();
  delete files["release-evidence.json.sha256"];
  for (const [artifactPath, value] of Object.entries(files)) {
    const absolutePath = path.join(dist, ...artifactPath.split("/"));
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, value);
  }
  await writeFile(policyPath, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
  const identityLock = await writeReleaseArtifactIdentityLock({
    cwd: workspaceRoot,
    dist,
    lockPath,
    channel: "default-v13",
    evidenceId: fixtureReleaseIdentity.evidenceId,
    createdAt: "2026-08-26T00:00:00.000Z"
  });
  const artifactEntries = await collectArtifactEntries(dist);
  const artifactSetDigest = sha256(canonicalJson(artifactEntries));
  const components = releaseArtifactComponents(artifactEntries);
  const hashes = Array.from({ length: 10 }, (_, index) => (index + 1).toString(16).padStart(64, "0"));
  const policyRelative = normalizedRelative(workspaceRoot, policyPath);
  const evidence = {
    schemaVersion: 1,
    evidenceType: "engineering_release_evidence",
    evidenceId: fixtureReleaseIdentity.evidenceId,
    generatedAt: "2026-08-26T00:02:00.000Z",
    source: {
      repository: null,
      commit: "b".repeat(40),
      branch: "fixture",
      dirty: false,
      untrackedSourceFileCount: 0,
      sourceTreeDigest: hashes[0],
      packageLockSha256: hashes[1]
    },
    release: {
      channel: "default-v13",
      candidateLabel: "deployed-host-loader-fixture",
      descriptor: structuredClone(fixtureDescriptor),
      manifestVersion: 1,
      manifestDigest: fixtureReleaseIdentity.manifestDigest,
      buildVersion: fixtureReleaseIdentity.buildVersion,
      builtEvidenceId: fixtureReleaseIdentity.evidenceId,
      evidenceIdBound: true,
      requiredReceiptIds: ["unit"]
    },
    toolchain: {
      node: process.version,
      npm: "11.13.0",
      platform: process.platform,
      arch: process.arch,
      osRelease: "fixture",
      browsers: { edge: "fixture", chrome: "fixture" }
    },
    policyFiles: [
      { path: "docs/release/web-v1-release-decisions.json", sha256: hashes[2] },
      { path: "docs/release/release-generation-history.json", sha256: hashes[3] },
      { path: policyRelative, sha256: sha256(await readFile(policyPath)) },
      { path: "docs/release/release-evidence.schema.json", sha256: hashes[4] }
    ],
    testReceipts: [{
      id: "unit",
      evidenceId: fixtureReleaseIdentity.evidenceId,
      status: "passed",
      exitCode: 0,
      command: ["npm", "test"],
      startedAt: "2026-08-26T00:00:00.000Z",
      completedAt: "2026-08-26T00:01:00.000Z",
      durationMs: 60_000,
      browserResultSummary: null,
      path: "tmp/release-evidence-receipts/unit.json",
      sha256: hashes[5]
    }],
    artifacts: {
      root: normalizedRelative(workspaceRoot, dist),
      count: artifactEntries.length,
      artifactSetDigest,
      identityLock: {
        path: normalizedRelative(workspaceRoot, lockPath),
        sha256: identityLock.lockFileSha256,
        lockDigest: identityLock.lock.lockDigest,
        artifactSetDigest,
        verified: true
      },
      mutationBoundary: {
        schemaVersion: 1,
        boundaryType: "release_artifact_endpoint_snapshot_boundary_v1",
        coveredReceiptIds: ["backup", "boot", "pwa", "web-v1-flow"],
        endpointSnapshotsMatched: true,
        verificationScope: "endpoint_snapshots_only_no_interval_mutation_epoch",
        mutationEpochCapability: "absent_schema13",
        intervalMutationExclusionClaimed: false,
        abaMutationExclusionClaimed: false
      },
      components,
      files: artifactEntries
    },
    gates: {
      sourceTreeClean: true,
      evidenceIdBound: true,
      defaultReleaseDescriptorMatched: true,
      requiredReceiptsPresent: true,
      allRecordedReceiptsPassed: true,
      policyReceiptSetMatched: true,
      recordedReceiptSetMatched: true,
      policyReceiptCommandsMatched: true,
      browserResultSummariesMatched: true,
      artifactIdentityStable: true,
      requiredArtifactComponentsPresent: true,
      engineeringGatePassed: true,
      releaseHistoryOwnerConfirmed: false,
      hostingSecurityVerified: false,
      publicDeploymentAuthorized: false,
      licenseOwnerSelectionRecorded: false,
      expertClaimsAuthorized: false
    },
    claims: {
      engineeringEvidenceOnly: true,
      codeSignature: false,
      expertSignature: false,
      contentRightsGrant: false,
      publicReleaseAuthorized: false
    }
  };
  const evidencePath = path.join(dist, "release-evidence.json");
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  await writeFile(evidencePath, evidenceBytes);
  await writeFile(`${evidencePath}.sha256`, `${sha256(evidenceBytes)}  release-evidence.json\n`, "utf8");
  return { dist, evidencePath, policyPath, lockPath, identityLock, artifactSetDigest };
}

test("checked-in hosting policy is closed but remains deliberately non-runnable as a real host", async () => {
  const checkedPolicy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs/security/hosting-security-policy.json"),
    "utf8"
  ));
  assert.deepEqual(validateHostingSecurityPolicy(checkedPolicy), {
    policyId: "hakimi-web-public-hosting-baseline-v2",
    schemaVersion: 2
  });
  assert.throws(
    () => validateRealDeployedHostPreflight({ baseUrl: origin, policy: checkedPolicy }),
    /selected platform and canonical origin/u
  );
  assert.equal(checkedPolicy.publicReleaseGate.realHostHeadersVerified, false);
  assert.equal(checkedPolicy.publicReleaseGate.cspBlockingModeVerified, false);
});

test("mocked full path and artifact matrix passes only the mocked contract ledger", async () => {
  const fixture = completeFixture();
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.verificationKind, "mocked-contract");
  assert.equal(result.networkAttempted, true);
  assert.equal(result.networkCompleted, true);
  assert.equal(result.strictGatePassed, true);
  assert.equal(result.gates.targetOriginSyntaxEligible, true);
  assert.equal(result.gates.dnsPublicAddressSetVerified, false);
  assert.equal(result.gates.publicHttpsVerified, false);
  assert.equal(result.gates.mockedContractVerified, true);
  assert.equal(result.gates.realHostVerified, false);
  assert.equal(result.gates.publicArtifactSetVerified, true);
  assert.equal(result.gates.nonPublicArtifactsHidden, true);
  assert.equal(result.gates.hstsHeaderVerified, true);
  assert.equal(result.gates.cspBlockingHeaderVerified, false);
  assert.equal(result.gates.cspBrowserEnforcementVerified, false);
  assert.equal(result.gates.inlineCssBrowserNetworkVerified, false);
  assert.equal(result.gates.javascriptRuntimeNetworkVerified, false);
  assert.equal(result.gates.serviceWorkerBrowserRuntimeVerified, false);
  assert.equal(result.gates.publicReleaseGatePassed, false);
  assert.equal(
    result.expectedIdentity.artifactSetDigest,
    sha256(canonicalJson(fixture.expectation.artifacts))
  );
  assert.equal(result.expectedIdentity.artifactSetDigest, fixture.expectation.artifactSetDigest);
  assert.equal(result.claims.publicDeploymentAuthorized, false);
  assert.equal(result.claims.browserRuntimeVerified, false);
  assert.equal(result.probes.some((probe) => probe.path === "/_headers"), false);
  assert.deepEqual(result.nonPublicProbes.map((probe) => probe.path), ["/_headers", "/release-evidence.json.sha256"]);
  assert.equal(fixture.calls.every((call) => call.redirect === "manual"), true);
});

test("verification snapshots policy before injected fetch can mutate caller-owned input", async () => {
  const policy = policyFixture();
  const responsePolicy = policyFixture();
  const files = artifactFiles();
  const evidenceBytes = Buffer.from('{"fixture":true}');
  const expectation = createMockedDeployedHostExpectation({
    files,
    evidenceBytes,
    releaseIdentity: fixtureReleaseIdentity
  });
  const network = fetchFixture({ policy: responsePolicy, files, evidenceBytes });
  let mutated = false;
  const result = await verifyDeployedHostContract({
    fetchImpl: async (...args) => {
      if (!mutated) {
        mutated = true;
        policy.headers["Referrer-Policy"] = "unsafe-url";
      }
      return network.fetchImpl(...args);
    },
    baseUrl: origin,
    policy,
    expectation
  });
  assert.equal(result.gates.mockedContractVerified, true);
  assert.equal(mutated, true);
});

test("mutating an exposed locked Buffer fails local preparation before network", async () => {
  const fixture = completeFixture();
  fixture.expectation.indexBytes[0] ^= 1;
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.deepEqual(result.errors, [{ code: "LOCAL_ARTIFACT_POLICY_MISMATCH" }]);
  assert.equal(result.networkAttempted, false);
  assert.equal(fixture.calls.length, 0);
});

test("blocking CSP header can pass its header-only ledger but never browser or public authorization", async () => {
  const policy = policyFixture({ blocking: true });
  const fixture = completeFixture({ policy });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy,
    expectation: fixture.expectation
  });
  assert.equal(result.gates.mockedContractVerified, true);
  assert.equal(result.gates.cspBlockingHeaderVerified, true);
  assert.equal(result.gates.cspBrowserEnforcementVerified, false);
  assert.equal(result.gates.publicReleaseGatePassed, false);
});

test("mocked expectation cannot be passed to the real-network entry", async () => {
  const fixture = completeFixture();
  assert.deepEqual(validateRealDeployedHostPreflight({ baseUrl: origin, policy: fixture.policy }), {
    origin,
    deploymentPlatform: "fixture-host",
    redirectClassPaths: ["/", "/sw.js", "/release-evidence.json", "/settings/data"]
  });
  await assert.rejects(
    verifyRealDeployedHost({ baseUrl: origin, policy: fixture.policy, expectation: fixture.expectation }),
    /formally verified Release Evidence/u
  );
});

test("real-host preflight rejects an unrelated redirect rule as a canonical HTTP proof", () => {
  const policy = policyFixture();
  policy.redirectRules = [{
    from: "http://alias.hakimi-bazi.cn/",
    status: 308,
    to: `${origin}/`
  }];
  assert.throws(
    () => validateRealDeployedHostPreflight({ baseUrl: origin, policy }),
    /canonical HTTP redirects/u
  );
});

test("real-host preflight rejects a redirect matrix missing the deep-route class", () => {
  const policy = policyFixture();
  policy.redirectRules = policy.redirectRules.filter((rule) => !rule.from.endsWith("/settings/data"));
  assert.throws(
    () => validateRealDeployedHostPreflight({ baseUrl: origin, policy }),
    /canonical HTTP redirects/u
  );
});

test("real-host public DNS gate rejects private, reserved, malformed, and mixed address sets", () => {
  assert.deepEqual(validateResolvedPublicAddresses([
    { address: "93.184.216.34", family: 4 },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 }
  ]), { addressCount: 2, families: [4, 6] });
  for (const records of [
    [{ address: "127.0.0.1", family: 4 }],
    [{ address: "192.168.1.5", family: 4 }],
    [{ address: "203.0.113.7", family: 4 }],
    [{ address: "64:ff9b::5db8:d822", family: 6 }],
    [{ address: "2001:0:4136:e378:8000:63bf:3fff:fdd2", family: 6 }],
    [{ address: "::c000:201", family: 6 }],
    [{ address: "::ffff:93.184.216.34", family: 6 }],
    [{ address: "0:0:0:0:0:ffff:5db8:d822", family: 6 }],
    [{ address: "fec0::1", family: 6 }],
    [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.7", family: 4 }],
    [{ address: "not-an-ip", family: 4 }]
  ]) {
    assert.throws(() => validateResolvedPublicAddresses(records), /DNS|non-public|reserved|malformed/u);
  }
});

test("real-host hostname syntax rejects an internal-only suffix before DNS", () => {
  const policy = policyFixture();
  policy.canonicalOrigin = "https://service.corp";
  policy.redirectRules = ["/", "/sw.js", "/release-evidence.json", "/settings/data"].map((pathname) => ({
    from: `http://service.corp${pathname}`,
    status: 308,
    to: `https://service.corp${pathname}`
  }));
  assert.throws(
    () => validateRealDeployedHostPreflight({ baseUrl: policy.canonicalOrigin, policy }),
    /public HTTPS origin/u
  );
});

test("hosting policy rejects unknown keys and an omitted route cache baseline", () => {
  assert.throws(
    () => validateHostingSecurityPolicy({ ...policyFixture(), extra: true }),
    /keys are not exact/u
  );
  const noGlobalCache = policyFixture();
  delete noGlobalCache.cacheRules["/*"];
  assert.throws(() => validateHostingSecurityPolicy(noGlobalCache), /exact document\/SW no-store/u);
});

test("hosting policy rejects weakened exact headers, CSP, cache, MIME, and route aliases", () => {
  for (const [mutate, pattern] of [
    [(policy) => { policy.headers["Referrer-Policy"] = "strict-origin"; }, /baseline has drifted/u],
    [(policy) => { policy.headers["X-Frame-Options"] = "SAMEORIGIN"; }, /baseline has drifted/u],
    [(policy) => { policy.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"; }, /baseline has drifted/u],
    [(policy) => { policy.headers["Permissions-Policy"] = "camera=()"; }, /baseline has drifted/u],
    [(policy) => { policy.headers["Strict-Transport-Security"] = "max-age=0"; }, /baseline has drifted/u],
    [(policy) => { policy.headers["Content-Security-Policy-Report-Only"] = `default-src *; ${reportOnlyCsp}`; }, /CSP policy shape/u],
    [(policy) => { policy.cacheRules["/sw.js"] = "public, max-age=31536000, immutable"; }, /exact document\/SW no-store/u],
    [(policy) => { policy.contentTypes[".html"] = ["text/plain"]; }, /MIME baseline/u],
    [(policy) => { policy.documentRoutes[10] = "/settings/../settings/data"; }, /dot segments|URL-normalizing/u]
  ]) {
    const policy = policyFixture();
    mutate(policy);
    assert.throws(() => validateHostingSecurityPolicy(policy), pattern);
  }
});

test("real expectation policy binding is exact and cannot be swapped after loading", () => {
  const policy = policyFixture();
  const canonicalPolicy = canonicalJson(policy);
  const expectation = {
    policyBinding: {
      path: "docs/security/hosting-security-policy.json",
      policyId: policy.policyId,
      sha256: "b".repeat(64),
      canonicalSha256: sha256(canonicalPolicy),
      canonicalPolicy
    }
  };
  assert.equal(validateDeployedHostPolicyBinding({ policy, expectation }).policyId, policy.policyId);
  const swapped = policyFixture({ blocking: true });
  assert.throws(
    () => validateDeployedHostPolicyBinding({ policy: swapped, expectation }),
    /does not match the current policy/u
  );
});

for (const [label, mutate, failedGate, errorCode] of [
  [
    "a missing security header on only sw.js",
    ({ kind, pathname, response, body, headers }) => {
      if (kind !== "content" || pathname !== "/sw.js") return response;
      const next = { ...headers };
      delete next["X-Frame-Options"];
      return responseFixture(response.url, body, next);
    },
    "securityHeadersVerified",
    "SECURITY_HEADERS_MISMATCH"
  ],
  [
    "an immutable asset served with document cache control",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/assets/app.js"
      ? responseFixture(response.url, body, { ...headers, "Cache-Control": "no-cache, no-store, must-revalidate" })
      : response,
    "cacheRulesVerified",
    "CACHE_CONTROL_MISMATCH"
  ],
  [
    "a manifest served as text/plain",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/manifest.webmanifest"
      ? responseFixture(response.url, body, { ...headers, "Content-Type": "text/plain" })
      : response,
    "contentTypesVerified",
    "CONTENT_TYPE_MISMATCH"
  ],
  [
    "an HTML response served with a non-UTF-8 charset",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/"
      ? responseFixture(response.url, body, { ...headers, "Content-Type": "text/html; charset=utf-16" })
      : response,
    "contentTypesVerified",
    "CONTENT_TYPE_MISMATCH"
  ],
  [
    "a response that ignores the identity content-coding request",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/sw.js"
      ? responseFixture(response.url, body, { ...headers, "Content-Encoding": "gzip" })
      : response,
    "contentEncodingsVerified",
    "CONTENT_ENCODING_MISMATCH"
  ],
  [
    "a response-triggered external preload",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/"
      ? responseFixture(response.url, body, { ...headers, Link: "<https://evil.example/app.js>; rel=preload; as=script" })
      : response,
    "behaviorResponseHeadersAbsent",
    "FORBIDDEN_BEHAVIOR_HEADER"
  ],
  [
    "a hosting-layer storage clear outside the mutation epoch",
    ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/"
      ? responseFixture(response.url, body, { ...headers, "Clear-Site-Data": '"storage"' })
      : response,
    "behaviorResponseHeadersAbsent",
    "FORBIDDEN_BEHAVIOR_HEADER"
  ],
  [
    "release evidence byte drift",
    ({ kind, pathname, response, body, headers }) => {
      if (kind !== "content" || pathname !== "/release-evidence.json") return response;
      const changed = Buffer.from(body);
      changed[0] ^= 1;
      return responseFixture(response.url, changed, headers);
    },
    "applicationIdentityVerified",
    "BODY_IDENTITY_MISMATCH"
  ]
]) {
  test(`mocked matrix fails closed for ${label}`, async () => {
    const fixture = completeFixture({ mutate });
    const result = await verifyDeployedHostContract({
      fetchImpl: fixture.fetchImpl,
      baseUrl: origin,
      policy: fixture.policy,
      expectation: fixture.expectation
    });
    assert.equal(result.strictGatePassed, false);
    assert.equal(result.gates.mockedContractVerified, false);
    assert.equal(result.gates[failedGate], false);
    assert.equal(result.errors.some((error) => error.code === errorCode), true);
    assert.equal(result.gates.realHostVerified, false);
  });
}

test("streaming body reader stops at the locked size before arrayBuffer allocation", async () => {
  const fixture = completeFixture({
    mutate: ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/assets/app.js"
      ? streamedResponseFixture(response.url, [body, Buffer.from([0])], headers)
      : response
  });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.errors.some((error) => error.code === "BODY_IDENTITY_MISMATCH"), true);
});

test("root success cannot mask an unexpected deep-route redirect", async () => {
  const fixture = completeFixture({
    mutate: ({ kind, pathname, response, body, headers }) => kind === "content" && pathname === "/settings"
      ? responseFixture(response.url, body, { ...headers, location: `${origin}/` }, 302)
      : response
  });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.gates.pathMatrixVerified, false);
  assert.equal(result.errors.some((error) => error.probeId === "document:/settings"), true);
});

test("HTTP redirect matrix requires the exact status and canonical location", async () => {
  const fixture = completeFixture({
    mutate: ({ kind, response }) => kind === "redirect"
      ? responseFixture(response.url, Buffer.alloc(0), { location: `${origin}/wrong` }, 308)
      : response
  });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.gates.redirectMatrixVerified, false);
  assert.equal(result.errors.some((error) => error.code === "REDIRECT_RULE_MISMATCH"), true);
});

test("redirect responses cannot mutate storage or emit other forbidden behavior headers", async () => {
  const fixture = completeFixture({
    mutate: ({ kind, response }) => kind === "redirect"
      ? responseFixture(response.url, Buffer.alloc(0), {
          location: new URL(response.url).pathname === "/" ? `${origin}/` : `${origin}${new URL(response.url).pathname}`,
          "Clear-Site-Data": '"storage"'
        }, 308)
      : response
  });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.gates.behaviorResponseHeadersAbsent, false);
  assert.equal(result.errors.some((error) => error.code === "FORBIDDEN_BEHAVIOR_HEADER"), true);
});

test("non-public deployment controls and Evidence sidecar must be hidden by the host", async () => {
  const fixture = completeFixture({
    mutate: ({ kind, pathname, response }) => kind === "non-public" && pathname === "/_headers"
      ? responseFixture(response.url, "exposed", { "Content-Type": "text/plain" }, 200)
      : response
  });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.gates.nonPublicArtifactsHidden, false);
  assert.equal(result.errors.some((error) => error.code === "NON_PUBLIC_ARTIFACT_EXPOSED"), true);
});

for (const [label, html] of [
  ["base element", indexFixture().replace("<head>", '<head><base href="https://evil.example/">')],
  ["inline module", indexFixture().replace('<script type="module" crossorigin src="/assets/app.js"></script>', '<script type="module">import "/assets/app.js"</script>')],
  ["meta refresh", indexFixture().replace("<head>", '<head><meta http-equiv="refresh" content="0;url=https://evil.example/">')],
  ["HTML entity external script", indexFixture().replace('/assets/app.js', 'https&#x3a;//evil.example/app.js')],
  ["legacy background URL", indexFixture().replace("<body>", '<body background="https://evil.example/bg.png">')],
  ["preload imagesrcset URL", indexFixture().replace("</head>", '<link rel="preload" as="image" href="/icon.png" imagesrcset="https://evil.example/set.png 1x"></head>')],
  ["CSS escaped url function", indexFixture().replace("</head>", `${String.raw`<style>body{background:u\72l(https://evil.example/x.png)}</style>`}</head>`) ],
  ["CSS escaped import", indexFixture().replace("</head>", `${String.raw`<style>@\69mport "https://evil.example/x.css";</style>`}</head>`) ],
  ["CSS image-set string URL", indexFixture().replace("</head>", '<style>body{background-image:image-set("https://evil.example/x.png" 1x)}</style></head>')],
  ["inline event handler", indexFixture().replace("<body>", '<body onload="fetch(\'https://evil.example/\')">')],
  ["anchor ping URL", indexFixture().replace("</body>", '<a href="/help" ping="https://evil.example/ping">help</a></body>')],
  ["attribution reporting URL", indexFixture().replace("<body>", '<body attributionsrc="https://evil.example/report">')]
]) {
  test(`locked index rejects ${label} before any host request`, async () => {
    const files = artifactFiles({ html });
    const fixture = completeFixture({ files });
    const result = await verifyDeployedHostContract({
      fetchImpl: fixture.fetchImpl,
      baseUrl: origin,
      policy: fixture.policy,
      expectation: fixture.expectation
    });
    assert.equal(result.strictGatePassed, false);
    assert.deepEqual(result.errors, [{ code: "LOCAL_ARTIFACT_POLICY_MISMATCH" }]);
    assert.equal(fixture.calls.length, 0);
  });
}

test("index and Service Worker release identities must match the expected v13 build before network", async () => {
  for (const files of [
    artifactFiles({
      html: indexFixture().replace(fixtureReleaseIdentity.buildVersion, "abcdefabcdef")
    }),
    {
      ...artifactFiles(),
      "sw.js": serviceWorkerFixture().replace(fixtureReleaseIdentity.buildVersion, "abcdefabcdef")
    },
    {
      ...artifactFiles(),
      "sw.js": `/* ${serviceWorkerFixture()} */\nself.addEventListener('fetch', () => {});`
    }
  ]) {
    const fixture = completeFixture({ files });
    const result = await verifyDeployedHostContract({
      fetchImpl: fixture.fetchImpl,
      baseUrl: origin,
      policy: fixture.policy,
      expectation: fixture.expectation
    });
    assert.equal(result.strictGatePassed, false);
    assert.deepEqual(result.errors, [{ code: "LOCAL_ARTIFACT_POLICY_MISMATCH" }]);
    assert.equal(fixture.calls.length, 0);
  }
});

test("locked manifest rejects unknown loading fields and external icon origins", async () => {
  for (const manifest of [
    manifestFixture({ screenshots: [] }),
    manifestFixture({
      icons: [{ src: "https://evil.example/icon.png", sizes: "192x192", type: "image/png", purpose: "any" }]
    })
  ]) {
    const files = artifactFiles({ manifest });
    const fixture = completeFixture({ files });
    const result = await verifyDeployedHostContract({
      fetchImpl: fixture.fetchImpl,
      baseUrl: origin,
      policy: fixture.policy,
      expectation: fixture.expectation
    });
    assert.equal(result.strictGatePassed, false);
    assert.equal(fixture.calls.length, 0);
  }
});

test("artifact extensions without an explicit MIME policy fail before network", async () => {
  const files = { ...artifactFiles(), "assets/extra.bin": Buffer.from([1, 2, 3]) };
  const fixture = completeFixture({ files });
  const result = await verifyDeployedHostContract({
    fetchImpl: fixture.fetchImpl,
    baseUrl: origin,
    policy: fixture.policy,
    expectation: fixture.expectation
  });
  assert.equal(result.strictGatePassed, false);
  assert.equal(result.errors[0].code, "LOCAL_ARTIFACT_POLICY_MISMATCH");
  assert.equal(fixture.calls.length, 0);
});

test("schema-valid local loader binds policy bytes, sidecar, identity lock, index, and Service Worker", async () => {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "deployed-host-loader-"));
  if (!path.resolve(root).startsWith(`${path.resolve(tmpRoot)}${path.sep}`)) {
    throw new Error("Temporary loader fixture escaped the workspace tmp directory.");
  }
  try {
    const policy = policyFixture();
    const fixture = await writeSchemaValidLocalLoaderFixture(root, policy);
    const expectation = await loadDeployedHostExpectation({
      cwd: workspaceRoot,
      artifactRoot: fixture.dist,
      evidencePath: fixture.evidencePath,
      policy,
      policyPath: normalizedRelative(workspaceRoot, fixture.policyPath)
    });
    assert.equal(expectation.evidenceId, fixtureReleaseIdentity.evidenceId);
    assert.deepEqual(expectation.releaseIdentity, fixtureReleaseIdentity);
    assert.equal(expectation.policyBinding.policyId, policy.policyId);
    assert.deepEqual(expectation.artifactIdentityLockBinding, {
      path: normalizedRelative(workspaceRoot, fixture.lockPath),
      realPath: await realpath(fixture.lockPath),
      sha256: fixture.identityLock.lockFileSha256,
      lockDigest: fixture.identityLock.lock.lockDigest,
      artifactSetDigest: fixture.artifactSetDigest
    });
    await assert.rejects(
      verifyRealDeployedHost({ baseUrl: origin, policy, expectation }),
      /formally verified Release Evidence/u
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("local loader independently rejects a non-canonical mutation-boundary receipt order", async () => {
  const tmpRoot = path.join(workspaceRoot, "tmp");
  await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(path.join(tmpRoot, "deployed-host-mutation-boundary-"));
  try {
    const policy = policyFixture();
    const fixture = await writeSchemaValidLocalLoaderFixture(root, policy);
    const evidence = JSON.parse(await readFile(fixture.evidencePath, "utf8"));
    evidence.artifacts.mutationBoundary.coveredReceiptIds.reverse();
    const evidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    await writeFile(fixture.evidencePath, evidenceBytes);
    await writeFile(
      `${fixture.evidencePath}.sha256`,
      `${sha256(evidenceBytes)}  release-evidence.json\n`,
      "utf8"
    );
    await assert.rejects(
      loadDeployedHostExpectation({
        cwd: workspaceRoot,
        artifactRoot: fixture.dist,
        evidencePath: fixture.evidencePath,
        policy,
        policyPath: normalizedRelative(workspaceRoot, fixture.policyPath)
      }),
      /mutation boundary projection is malformed/u
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("formal expectation loader executes schema validation before any Git-backed verifier", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-host-expectation-"));
  const dist = path.join(root, "dist", "web");
  await mkdir(dist, { recursive: true });
  await writeFile(path.join(dist, "release-evidence.json"), "{}\n", "utf8");
  const checkedPolicy = JSON.parse(await readFile(
    path.join(workspaceRoot, "docs/security/hosting-security-policy.json"),
    "utf8"
  ));
  await assert.rejects(
    loadDeployedHostExpectation({
      cwd: workspaceRoot,
      artifactRoot: dist,
      evidencePath: path.join(dist, "release-evidence.json"),
      policy: checkedPolicy
    }),
    /Release Evidence Schema validation failed/u
  );
});

test("CLI missing-argument failure is stable JSON and cannot claim a real host", () => {
  const result = spawnSync(process.execPath, [
    path.join(workspaceRoot, "scripts/verify-deployed-security-headers.mjs")
  ], { cwd: workspaceRoot, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 1);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.verificationKind, "real-network");
  assert.equal(summary.dnsResolutionAttempted, false);
  assert.equal(summary.networkAttempted, false);
  assert.equal(summary.strictGatePassed, false);
  assert.equal(summary.preparationGates.realHostPreflightPassed, false);
  assert.equal(summary.preparationGates.formalReleaseEvidenceVerified, false);
  assert.equal(summary.preparationGates.artifactExpectationLoaded, false);
  assert.equal(summary.preparationGates.deployedHostVerifierInvoked, false);
  assert.equal(summary.claims.realHostVerified, false);
  assert.equal(summary.claims.publicDeploymentAuthorized, false);
  assert.equal(summary.errors[0].code, "REAL_HOST_PREFLIGHT_FAILED");
});

test("checked-in unselected host policy stops CLI before artifact, formal verifier, or network access", () => {
  const result = spawnSync(process.execPath, [
    path.join(workspaceRoot, "scripts/verify-deployed-security-headers.mjs"),
    origin,
    "--artifact-root", "missing-artifact-root",
    "--evidence", "missing-artifact-root/release-evidence.json",
    "--receipts", "missing-receipts"
  ], { cwd: workspaceRoot, encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 1);
  const summary = JSON.parse(result.stdout);
  assert.match(summary.errors[0].detail, /selected platform and canonical origin/u);
  assert.doesNotMatch(summary.errors[0].detail, /ENOENT|Git|Release Evidence verification/u);
  assert.equal(summary.networkAttempted, false);
  assert.equal(summary.preparationGates.realHostPreflightPassed, false);
  assert.equal(summary.preparationGates.formalReleaseEvidenceVerified, false);
  assert.equal(summary.claims.realHostVerified, false);
});
