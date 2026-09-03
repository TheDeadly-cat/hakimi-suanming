import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve as resolvePath } from "node:path";

import { REVIEW_PREVIEW_MANIFEST, resolveViewId } from "../role-manifest.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const WORKSPACE_ROOT = resolvePath(HERE, "../../../..");

function collectUrls(value, found = []) {
  if (typeof value === "string" && value.startsWith("https://")) {
    found.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectUrls(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectUrls(item, found);
  }
  return found;
}

test("manifest exposes exactly four same-page templates across three role types", () => {
  const manifest = REVIEW_PREVIEW_MANIFEST;
  assert.deepEqual(manifest.viewOrder, ["source-collation", "rights", "domain-a", "domain-b"]);
  assert.deepEqual(Object.keys(manifest.views), manifest.viewOrder);
  assert.deepEqual(
    [...new Set(Object.values(manifest.views).map((view) => view.roleId))].sort(),
    ["domain-review", "rights", "source-collation"]
  );
  assert.equal(manifest.views["domain-a"].seat, "A");
  assert.equal(manifest.views["domain-b"].seat, "B");
  assert.equal(manifest.views["domain-a"].opinionEntryEnabled, false);
  assert.equal(manifest.views["domain-b"].opinionEntryEnabled, false);
});

test("template navigation is explicitly not access control or physical seat separation", () => {
  const boundary = REVIEW_PREVIEW_MANIFEST.templateBoundary;
  assert.equal(boundary.samePageFourRouteNavigation, true);
  assert.equal(boundary.sameHumanMayBrowseAllTemplates, true);
  assert.equal(boundary.roleAccessControlEstablished, false);
  assert.equal(boundary.physicalSeatSeparationEstablished, false);
  assert.equal(boundary.sameHumanMultiSeatExcluded, false);
  assert.equal(boundary.currentOpinionRecords, 0);
  assert.equal(boundary.currentOpinionContentToLeakExists, false);
  assert.equal(boundary.absenceOfOpinionsEstablishesAccessControl, false);
  assert.equal(boundary.futureFormalDomainAAndBRequireIndependentPhysicalPackagesOrSessions, true);
  assert.equal(boundary.browserStaticProjectionOnly, true);
  assert.equal(boundary.runtimePrivateBrand, false);
  assert.equal(boundary.runtimePrivateBrandEstablished, false);
  assert.equal(boundary.crossFileAtomicSnapshot, false);
  assert.equal(boundary.applicationInitiatedExternalFetch, false);
  assert.equal(boundary.externalLinkNavigationMayUseNetwork, true);
});

test("all gates stay synthetic, candidate-only, zero and unauthorized", () => {
  const manifest = REVIEW_PREVIEW_MANIFEST;
  assert.equal(manifest.lifecycle, "synthetic");
  assert.equal(manifest.admissionState, "candidate-only");
  assert.deepEqual(manifest.bindingGate, { verified: 0, total: 12, label: "0/12" });
  assert.deepEqual(manifest.expertGate, { verified: 0, total: 2, label: "0/2" });
  assert.equal(manifest.authorization, false);
  assert.ok(Object.values(manifest.authorizations).every((value) => value === false));
  assert.equal(manifest.dataBoundary.sourceBodyStored, false);
  assert.equal(manifest.dataBoundary.quoteTextStored, false);
  assert.equal(manifest.dataBoundary.identityFields, 0);
  assert.equal(manifest.dataBoundary.contactFields, 0);
  assert.equal(manifest.dataBoundary.realChartFields, 0);
  assert.equal(manifest.dataBoundary.opinionFields, 0);
});

test("role scopes are disjoint and each role names its exclusions", () => {
  const primaryViews = [
    REVIEW_PREVIEW_MANIFEST.views["source-collation"],
    REVIEW_PREVIEW_MANIFEST.views.rights,
    REVIEW_PREVIEW_MANIFEST.views["domain-a"]
  ];
  for (const view of primaryViews) {
    assert.ok(view.scope.length >= 3);
    assert.ok(view.exclusions.length >= 3);
    assert.equal(new Set([...view.scope, ...view.exclusions]).size, view.scope.length + view.exclusions.length);
  }
  for (let left = 0; left < primaryViews.length; left += 1) {
    for (let right = left + 1; right < primaryViews.length; right += 1) {
      const overlap = primaryViews[left].scope.filter((item) => primaryViews[right].scope.includes(item));
      assert.deepEqual(overlap, []);
    }
  }
});

test("domain templates contain only plain-language topic, work, chapter and missing-material guidance", () => {
  for (const viewId of ["domain-a", "domain-b"]) {
    const view = REVIEW_PREVIEW_MANIFEST.views[viewId];
    assert.deepEqual(view.facts.map((fact) => fact.label), ["作品", "章节", "普通中文题面", "当前材料"]);
    assert.ok(view.facts.every((fact) => fact.mono !== true));
    assert.deepEqual(view.links, []);
    assert.ok(view.missing.length >= 4);
    assert.doesNotMatch(JSON.stringify({ scope: view.scope, exclusions: view.exclusions, facts: view.facts, missing: view.missing }), /binding|evidenceSubject|revision|sha-?256|digest|candidateId|hash/i);
  }
});

test("machine packet raw identity and UI metadata match the actual JSON artifacts", async () => {
  const manifest = REVIEW_PREVIEW_MANIFEST;
  const basis = manifest.machinePacketBasis;
  const packetPath = resolvePath(WORKSPACE_ROOT, ...basis.path.split("/"));
  const sourcePath = resolvePath(WORKSPACE_ROOT, "content/bazi-strength-source-binding-candidates.v1.7.0.json");
  const rightsPath = resolvePath(WORKSPACE_ROOT, "content/bazi-strength-source-rights-candidates.v1.3.0.json");
  const [packetRaw, sourceRaw, rightsRaw] = await Promise.all([
    readFile(packetPath),
    readFile(sourcePath),
    readFile(rightsPath)
  ]);
  const packet = JSON.parse(packetRaw.toString("utf8"));
  const sourceLedger = JSON.parse(sourceRaw.toString("utf8"));
  const rightsLedger = JSON.parse(rightsRaw.toString("utf8"));
  const rawSha256 = createHash("sha256").update(packetRaw).digest("hex");

  assert.equal(packetRaw.byteLength, basis.rawBytes);
  assert.equal(rawSha256, basis.rawSha256);
  assert.equal(packet.packetId, basis.packetId);
  assert.equal(packet.packetDigest, basis.packetDigest);
  assert.equal(basis.browserStaticProjectionOnly, true);
  assert.equal(basis.runtimePrivateBrand, false);
  assert.equal(basis.runtimePrivateBrandEstablished, false);
  assert.equal(basis.crossFileAtomicSnapshot, false);
  assert.equal(packet.integrityBoundary.crossFileAtomicSnapshot, false);

  const ui = manifest.publicEvidence;
  const sourceCandidate = sourceLedger.candidates.find((candidate) => candidate.candidateId === packet.subjectLock.sourceCandidateId);
  const rightsCandidate = rightsLedger.candidates.find((candidate) => candidate.rightsCandidateId === packet.subjectLock.rightsCandidateId);
  assert.ok(sourceCandidate);
  assert.ok(rightsCandidate);

  assert.equal(ui.source.sourceCandidateId, packet.subjectLock.sourceCandidateId);
  assert.equal(ui.source.sourceCandidateDigest, packet.subjectLock.sourceCandidateDigest);
  assert.equal(ui.source.sourceCandidateDigest, sourceCandidate.candidateDigest);
  assert.equal(ui.rights.rightsCandidateId, packet.subjectLock.rightsCandidateId);
  assert.equal(ui.rights.rightsCandidateDigest, packet.subjectLock.rightsCandidateDigest);
  assert.equal(ui.rights.rightsCandidateDigest, rightsCandidate.candidateDigest);

  const sourceFactValues = new Set(manifest.views["source-collation"].facts.map((fact) => String(fact.value)));
  const rightsFactValues = new Set(manifest.views.rights.facts.map((fact) => String(fact.value)));
  assert.ok(sourceFactValues.has(ui.source.sourceCandidateId));
  assert.ok(sourceFactValues.has(ui.source.sourceCandidateDigest));
  assert.ok(sourceFactValues.has(ui.locator.heading));
  assert.ok(sourceFactValues.has(ui.locator.rawRevisionLine));
  assert.ok(sourceFactValues.has(ui.locator.quoteSha256));
  assert.ok(rightsFactValues.has(ui.rights.rightsCandidateId));
  assert.ok(rightsFactValues.has(ui.rights.rightsCandidateDigest));
  assert.equal(manifest.views["source-collation"].collation, ui.collation);

  const transcription = packet.sourceMaterialProjection.transcriptionCarrier;
  assert.equal(ui.source.permanentUrl, transcription.permanentUrl);
  assert.equal(ui.source.revisionId, String(transcription.revisionId));
  assert.equal(ui.source.revisionTimestamp, transcription.revisionTimestamp);
  assert.equal(ui.source.mediaWikiSha1, transcription.mediaWikiSha1);
  assert.equal(ui.source.rawWikitextSha256, sourceCandidate.carrierIdentity.rawWikitextSha256);

  const locator = packet.sourceMaterialProjection.quoteLocator;
  assert.equal(ui.locator.quoteCandidateId, locator.quoteCandidateId);
  assert.equal(ui.locator.heading, locator.heading);
  assert.equal(ui.locator.rawRevisionLineStart, locator.rawRevisionLineStart);
  assert.equal(ui.locator.rawRevisionLineEnd, locator.rawRevisionLineEnd);
  assert.equal(ui.locator.rawCharacterStartZeroBased, locator.rawCharacterStartZeroBased);
  assert.equal(ui.locator.rawCharacterEndExclusive, locator.rawCharacterEndExclusive);
  assert.equal(ui.locator.quoteCharacters, String(locator.quoteCharacters));
  assert.equal(ui.locator.quoteUtf8Bytes, String(locator.quoteUtf8Bytes));
  assert.equal(ui.locator.quoteSha256, locator.quoteSha256);
  assert.equal(ui.locator.quoteTextStored, false);

  assert.equal(ui.collation.length, packet.sourceMaterialProjection.carrierLocators.length);
  for (const uiCarrier of ui.collation) {
    const packetCarrier = packet.sourceMaterialProjection.carrierLocators.find((carrier) => carrier.anchorId === uiCarrier.anchorId);
    const rightsCarrier = rightsCandidate.carrierLayers.find((carrier) => carrier.anchorId === uiCarrier.anchorId);
    assert.ok(packetCarrier);
    assert.ok(rightsCarrier);
    assert.equal(uiCarrier.descriptionHref, packetCarrier.carrierDescriptionUrl);
    assert.equal(uiCarrier.href, packetCarrier.pageLocator.pageUrl);
    assert.equal(uiCarrier.pageRefId, packetCarrier.pageLocator.pageRefId);
    assert.equal(uiCarrier.visibleHeading, packetCarrier.pageLocator.visibleHeading);
    assert.equal(uiCarrier.carrierBytes, packetCarrier.carrierBytes);
    assert.equal(uiCarrier.carrierMime, packetCarrier.carrierMime);
    assert.equal(uiCarrier.carrierSha256, packetCarrier.carrierSha256);
    assert.equal(uiCarrier.carrierSha256, rightsCarrier.carrierSha256);
    assert.equal(uiCarrier.collationCandidateId, packetCarrier.collationCandidate.collationCandidateId);
    assert.equal(uiCarrier.collationDigest, packetCarrier.collationCandidate.collationDigest);
  }

  assert.equal(ui.rights.distributionPolicy, packet.rightsEvidenceProjection.distributionPolicy);
  assert.equal(ui.rights.legalConclusion, packet.rightsEvidenceProjection.legalConclusion);
  assert.equal(ui.rights.distributionPolicy, rightsCandidate.decision.distributionPolicy);
  assert.equal(ui.rights.legalConclusion, rightsCandidate.decision.legalConclusion);
});

test("only allowlisted public HTTPS metadata links are present", () => {
  const allowedHosts = new Set([
    "zh.wikisource.org",
    "commons.wikimedia.org",
    "foundation.wikimedia.org",
    "creativecommons.org"
  ]);
  const urls = collectUrls(REVIEW_PREVIEW_MANIFEST);
  assert.ok(urls.length >= 7);
  for (const href of urls) {
    const parsed = new URL(href);
    assert.equal(parsed.protocol, "https:");
    assert.ok(allowedHosts.has(parsed.hostname), `unexpected host: ${parsed.hostname}`);
    assert.equal(parsed.username, "");
    assert.equal(parsed.password, "");
  }
});

test("route resolution keeps the four view identities deterministic", () => {
  for (const viewId of REVIEW_PREVIEW_MANIFEST.viewOrder) {
    const view = REVIEW_PREVIEW_MANIFEST.views[viewId];
    assert.equal(resolveViewId(view.path), viewId);
    assert.equal(resolveViewId("/index.html", `#${viewId}`), viewId);
  }
  assert.equal(resolveViewId("/unknown", "#unknown"), "source-collation");
});

test("static surface has no collection form, storage API or network client", async () => {
  const [html, app, manifestSource] = await Promise.all([
    readFile(join(ROOT, "index.html"), "utf8"),
    readFile(join(ROOT, "app.js"), "utf8"),
    readFile(join(ROOT, "role-manifest.js"), "utf8")
  ]);
  assert.doesNotMatch(html, /<(?:form|input|textarea|select|button)\b/i);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /不收集 · 不保存 · 不上传/);
  assert.match(html, /不比较真人与 AI 的准确度/);
  assert.match(html, /三角色四视图模板预览/);
  assert.match(html, /这.*不是访问控制/);
  assert.doesNotMatch(app, /\bfetch\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource)\b|sendBeacon\s*\(|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(manifestSource, /authorization\s*:\s*true/);
  assert.doesNotMatch(manifestSource, /(?:sourceBodyStored|quoteTextStored)\s*:\s*true/);
});
