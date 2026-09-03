import assert from "node:assert/strict";
import { test } from "node:test";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCurrentZiweiHkoCalendarSourceEvidence,
  canonicalStringifyZiweiHkoCalendarSourceEvidence,
  readZiweiHkoCalendarSourceEvidence,
  verifyZiweiHkoCalendarSourceEvidence
} from "./ziwei-hko-calendar-source-evidence-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function expectMismatch(mutate) {
  const evidence = clone(await readZiweiHkoCalendarSourceEvidence(workspaceRoot));
  mutate(evidence);
  await assert.rejects(
    verifyZiweiHkoCalendarSourceEvidence(workspaceRoot, evidence),
    /调用方 HKO evidence 与持久化工件不一致/u
  );
}

test("replays six stored HKO bodies into 2,192 days, 74 boundaries and five seams", async () => {
  const result = await verifyZiweiHkoCalendarSourceEvidence(workspaceRoot);
  assert.equal(result.subjectId, "ziwei.engineering.official-calendar-differential");
  assert.equal(result.coverageScope, "calendar_resolution");
  assert.equal(result.subjectFullySatisfied, false);
  assert.equal(result.evidence.derivedCoverage.annualResourcesBound, 6);
  assert.equal(result.evidence.derivedCoverage.rawSourceBodiesStored, 6);
  assert.equal(result.evidence.derivedCoverage.dailyRowsBound, 2192);
  assert.equal(result.evidence.derivedCoverage.boundaryPairsBound, 74);
  assert.equal(result.evidence.derivedCoverage.crossFileSeamsBound, 5);
  assert.deepEqual(result.evidence.derivedCoverage.boundaryKindCounts, {
    lunar_new_year: 6,
    ordinary_month_transition: 62,
    leap_month_start: 3,
    leap_month_end: 3
  });
});

test("persisted evidence exactly equals the current replay builder", async () => {
  const evidence = await readZiweiHkoCalendarSourceEvidence(workspaceRoot);
  const expected = await buildCurrentZiweiHkoCalendarSourceEvidence(workspaceRoot, { createdAt: evidence.createdAt });
  assert.equal(
    canonicalStringifyZiweiHkoCalendarSourceEvidence(evidence),
    canonicalStringifyZiweiHkoCalendarSourceEvidence(expected)
  );
});

test("candidate identity, scope and child direction cannot be widened", async () => {
  const mutations = [
    (x) => { x.candidateIdentity.subjectId = "ziwei.rules.year-and-day-boundaries"; },
    (x) => { x.candidateIdentity.candidateId = "candidate:alias"; },
    (x) => { x.candidateIdentity.coverageScope = "ziwei_chart_rules"; },
    (x) => { x.candidateIdentity.subjectFullySatisfied = true; },
    (x) => { x.candidateIdentity.bindingFrozenVerified = true; },
    (x) => { x.boundaryBindings.childBindsCentralRegistry = true; },
    (x) => { x.boundaryBindings.authorityInheritanceAllowed = true; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate);
});

test("source artifacts, raw body identities and coverage totals cannot drift", async () => {
  const mutations = [
    (x) => { x.sourceArtifacts[0].path = "../escape.json"; },
    (x) => { x.sourceArtifacts[0].sha256 = "0".repeat(64); },
    (x) => { x.resources[0].gzipBytes += 1; },
    (x) => { x.resources[0].rawSha256 = "0".repeat(64); },
    (x) => { x.resources.reverse(); },
    (x) => { x.resources.pop(); },
    (x) => { x.derivedCoverage.dailyRowsBound = 2191; },
    (x) => { x.derivedCoverage.boundaryPairsBound = 79; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate);
});

test("rights, expert, authenticity, release and cross-system authority stay false", async () => {
  const mutations = [
    (x) => { x.rightsBoundary.workRightsEstablished = true; },
    (x) => { x.rightsBoundary.redistributionAuthorized = true; },
    (x) => { x.expertBoundary.independentDomainReviewsVerified = 2; },
    (x) => { x.integrityBoundary.digestIsDigitalSignature = true; },
    (x) => { x.integrityBoundary.mutationEpochAvailable = true; },
    (x) => { x.authorityBoundary.ziweiRuleTruthEstablished = true; },
    (x) => { x.authorityBoundary.releaseReady = true; },
    (x) => { x.authorityBoundary.publicDeploymentAuthorized = true; },
    (x) => { x.authorityBoundary.baziAuthority = true; }
  ];
  for (const mutate of mutations) await expectMismatch(mutate);
});

test("digest or unknown-field self-editing is rejected", async () => {
  await expectMismatch((x) => { x.evidenceDigest = "0".repeat(64); });
  await expectMismatch((x) => { x.formalAdmissionAuthorized = true; });
});

test("a drifted upstream fixture is rejected even before persisted evidence comparison", async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-hko-evidence-"));
  try {
    const files = [
      "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
      "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
      "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.ts"
    ];
    for (const relative of files) {
      const target = path.join(tempRoot, ...relative.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await cp(path.join(workspaceRoot, ...relative.split("/")), target);
    }
    const matrixPath = path.join(tempRoot, ...files[1].split("/"));
    const bytes = await readFile(matrixPath);
    bytes[bytes.length - 2] ^= 1;
    await writeFile(matrixPath, bytes);
    await assert.rejects(
      buildCurrentZiweiHkoCalendarSourceEvidence(tempRoot, { createdAt: "2026-08-29T00:00:00.000Z" }),
      /与锁定 bytes\/SHA-256 不一致/u
    );
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
