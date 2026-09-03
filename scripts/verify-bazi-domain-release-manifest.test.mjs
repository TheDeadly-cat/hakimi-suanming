import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BAZI_V17_FROZEN_GOLDEN_SHA256,
  buildCurrentBaziDomainReleaseManifest,
  canonicalStringifyDomainManifest,
  readBaziDomainReleaseManifest,
  verifyBaziDomainReleaseManifest
} from "./bazi-domain-release-manifest-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("current bazi v1.7 domain manifest exactly binds the current component closure", async () => {
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
