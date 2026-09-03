import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { before, describe, it } from "node:test";

import {
  WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH,
  canonicalStringifyWesternCurrentBasisLicenseCarrierChild,
  computeWesternCurrentBasisLicenseCarrierChildDigest,
  isVerifiedWesternCurrentBasisLicenseCarrierChild,
  loadWesternCurrentBasisLicenseCarrierChild,
  parseWesternCurrentBasisLicenseCarrierChildArtifact,
  serializeWesternCurrentBasisLicenseCarrierChild,
  verifyWesternCurrentBasisLicenseCarrierChildLedger,
  westernCurrentBasisLicenseCarrierChildTestOnly
} from "./western-current-basis-license-carrier-observation-child-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-western-current-basis-license-carrier-observation-child.mjs"
);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rehash(value) {
  value.childDigest = computeWesternCurrentBasisLicenseCarrierChildDigest(value);
  return value;
}

function expectCode(code, operation) {
  assert.throws(operation, (reason) => reason?.code === code);
}

let context;
let expected;
let loaded;

before(async () => {
  context = await westernCurrentBasisLicenseCarrierChildTestOnly.collectCurrentInputs(workspaceRoot);
  expected = westernCurrentBasisLicenseCarrierChildTestOnly.buildProjection(context);
  loaded = await loadWesternCurrentBasisLicenseCarrierChild(workspaceRoot);
});

describe("Western current-basis license carrier observation child", () => {
  it("fixed loader returns a frozen private-branded 4-basis/2-dependency observation", () => {
    assert.equal(isVerifiedWesternCurrentBasisLicenseCarrierChild(loaded), true);
    assert.equal(Object.isFrozen(loaded), true);
    assert.equal(loaded.currentSourceBasisEndpointsObserved, 4);
    assert.equal(loaded.externalDependenciesObserved, 2);
    assert.equal(loaded.bindingFrozenVerified, 0);
    assert.equal(loaded.bindingRequired, 28);
  });

  it("a structural clone never inherits the full-loader private brand", () => {
    assert.equal(isVerifiedWesternCurrentBasisLicenseCarrierChild(clone(loaded)), false);
    assert.equal(isVerifiedWesternCurrentBasisLicenseCarrierChild(clone(loaded.child)), false);
  });

  it("keeps formal v1 declared current but mechanically stale and gives the child no effect", () => {
    const boundary = loaded.child.formalStateBoundary;
    assert.equal(boundary.formalSourceRequirementsV1RemainsDeclaredCurrent, true);
    assert.equal(boundary.formalSourceRequirementsV1MechanicallyCurrent, false);
    assert.equal(boundary.historicalV11IsFormalCurrent, false);
    assert.equal(boundary.historicalV12IsFormalCurrent, false);
    assert.equal(boundary.childIsFormalCurrent, false);
    assert.equal(boundary.childActiveEffect, "none");
  });

  it("binds exactly three package roots and two external dependency nodes", () => {
    const dependency = loaded.child.threePackageDeclaredDependencyObservation;
    assert.deepEqual(Array.from(dependency.packageRoots), [
      "packages/western-astrology-contracts-draft",
      "packages/western-astrology-rules-preview-draft",
      "packages/western-astronomy-engine-adapter-draft"
    ]);
    assert.deepEqual(Array.from(dependency.externalPackageNodeIds), [
      "astronomy-engine@2.1.19",
      "zod@4.4.3"
    ]);
    assert.equal(dependency.civilTimeTzdbMomentTimezoneClosureIncluded, false);
    assert.equal(dependency.entireWesternProductClosureEstablished, false);
  });

  it("records the exact Astronomy installed LICENSE absence and two controlled copies", () => {
    const astronomy = loaded.child.dependencyLicenseCarrierObservations[0];
    assert.equal(astronomy.packageName, "astronomy-engine");
    assert.equal(astronomy.version, "2.1.19");
    assert.equal(astronomy.installedExactLicenseEndpoint.path, "node_modules/astronomy-engine/LICENSE");
    assert.equal(astronomy.installedExactLicenseEndpoint.persistentAbsenceEstablished, false);
    assert.equal(astronomy.controlledProjectLicenseCopies.length, 2);
    assert.equal(astronomy.controlledProjectLicenseCopies[0].rawSha256,
      "690dd98cb13ba4db77c6327deea852a816892bb9debbad5943405c66972f8023");
    assert.equal(astronomy.controlledProjectLicenseCopies[1].rawSha256,
      astronomy.controlledProjectLicenseCopies[0].rawSha256);
  });

  it("records the installed zod manifest and LICENSE carrier without promoting rights", () => {
    const zod = loaded.child.dependencyLicenseCarrierObservations[1];
    assert.equal(zod.packageName, "zod");
    assert.equal(zod.version, "4.4.3");
    assert.equal(zod.installedLicenseCarrier.rawBytes, 1072);
    assert.equal(zod.carrierRightsEstablished, false);
    assert.equal(zod.publisherAuthenticityEstablished, false);
  });

  it("consumes current drift/manifest brands and reverified build notice with all authority red", () => {
    const upstreams = loaded.child.upstreamBindings;
    assert.equal(upstreams.currentSourceAndManifestDriftReceipt.privateBrandVerified, true);
    assert.equal(upstreams.currentThreePackageMachineIdentityManifest.privateBrandVerified, true);
    assert.equal(upstreams.astronomyEngineBuildNoticeEvidence.controlledDualBuildReverifiedThisLoad, true);
    assert.equal(upstreams.astronomyEngineBuildNoticeEvidence.bindsWesternRequirementsBeforeSuccessor, false);
    assert.equal(upstreams.astronomyEngineBuildNoticeEvidence.rightsLegalConclusionEstablished, false);
  });

  it("keeps rights, experts, release, runtime and epoch boundaries red", () => {
    assert.equal(loaded.child.rightsBoundary.workRightsEstablished, false);
    assert.equal(loaded.child.rightsBoundary.versionRightsEstablished, false);
    assert.equal(loaded.child.rightsBoundary.carrierRightsEstablished, false);
    assert.equal(loaded.child.rightsBoundary.redistributionAuthorized, false);
    assert.equal(loaded.child.expertAndAuthorityBoundary.independentExpertReviewsVerified, 0);
    assert.equal(loaded.child.expertAndAuthorityBoundary.releaseReady, false);
    assert.equal(loaded.child.expertAndAuthorityBoundary.publicReleaseAuthorized, false);
    assert.equal(loaded.child.runtimeTrustBoundary.cliOutputTrustedAttestation, false);
    assert.equal(loaded.child.observationBoundary.mutationEpochReceipt, null);
    assert.equal(loaded.child.observationBoundary.abaExcluded, false);
  });

  it("uses deterministic digest and unique canonical LF materialization", async () => {
    assert.equal(expected.childDigest,
      computeWesternCurrentBasisLicenseCarrierChildDigest(expected));
    const persisted = await readFile(
      path.join(workspaceRoot, ...WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH.split("/")),
      "utf8"
    );
    assert.equal(persisted, serializeWesternCurrentBasisLicenseCarrierChild(expected));
    assert.equal(persisted.endsWith("\n"), true);
    assert.equal(persisted.endsWith("\n\n"), false);
  });

  it("stores no full license prose", async () => {
    const persisted = await readFile(
      path.join(workspaceRoot, ...WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_RELATIVE_PATH.split("/")),
      "utf8"
    );
    assert.equal(persisted.includes("Permission is hereby granted"), false);
    assert.equal(loaded.child.gateSummary.exactQuotesStored, 0);
    assert.equal(loaded.child.gateSummary.sourceBodiesCopied, 0);
  });

  it("rejects rehashed authority promotion", () => {
    const mutated = clone(expected);
    mutated.rightsBoundary.rightsLegalConclusionEstablished = true;
    mutated.expertAndAuthorityBoundary.publicReleaseAuthorized = true;
    rehash(mutated);
    expectCode("CHILD_CONTRACT_MISMATCH", () =>
      verifyWesternCurrentBasisLicenseCarrierChildLedger(mutated, context));
  });

  it("rejects rehashed dependency-scope or absence overclaims", () => {
    const mutated = clone(expected);
    mutated.threePackageDeclaredDependencyObservation.externalPackageNodesObserved = 3;
    mutated.dependencyLicenseCarrierObservations[0]
      .installedExactLicenseEndpoint.persistentAbsenceEstablished = true;
    rehash(mutated);
    expectCode("CHILD_CONTRACT_MISMATCH", () =>
      verifyWesternCurrentBasisLicenseCarrierChildLedger(mutated, context));
  });

  it("rejects rehashed source/full-subject promotion", () => {
    const mutated = clone(expected);
    mutated.gateSummary.bindingFrozenVerified = 1;
    mutated.gateSummary.subjectFullySatisfied = 1;
    rehash(mutated);
    expectCode("CHILD_CONTRACT_MISMATCH", () =>
      verifyWesternCurrentBasisLicenseCarrierChildLedger(mutated, context));
  });

  it("rejects accessors, aliases, cycles and dangerous JSON keys before digest trust", () => {
    const accessor = clone(expected);
    Object.defineProperty(accessor, "status", { enumerable: true, get() { return expected.status; } });
    expectCode("ACCESSOR_OR_HIDDEN_PROPERTY", () =>
      computeWesternCurrentBasisLicenseCarrierChildDigest(accessor));

    const alias = clone(expected);
    alias.alias = alias.rightsBoundary;
    expectCode("CYCLIC_JSON", () => computeWesternCurrentBasisLicenseCarrierChildDigest(alias));

    const cyclic = clone(expected);
    cyclic.loop = cyclic;
    expectCode("CYCLIC_JSON", () => computeWesternCurrentBasisLicenseCarrierChildDigest(cyclic));

    const dangerous = clone(expected);
    Object.defineProperty(dangerous, "__proto__", {
      value: {}, enumerable: true, configurable: true, writable: true
    });
    expectCode("DANGEROUS_JSON_KEY", () =>
      computeWesternCurrentBasisLicenseCarrierChildDigest(dangerous));
  });

  it("strict parser rejects duplicate keys", () => {
    const bytes = Buffer.from('{"schemaVersion":"1","schemaVersion":"2"}\n', "utf8");
    expectCode("JSON_DUPLICATE_KEY", () =>
      parseWesternCurrentBasisLicenseCarrierChildArtifact({
        path: "duplicate.json",
        bytes,
        rawBytes: bytes.length,
        rawSha256: "0".repeat(64)
      }));
  });

  it("canonicalization ignores polluted toJSON and remains exact", () => {
    const structuralClone = clone(expected);
    const original = Object.prototype.toJSON;
    Object.prototype.toJSON = () => ({ promoted: true });
    try {
      assert.equal(
        canonicalStringifyWesternCurrentBasisLicenseCarrierChild(expected),
        canonicalStringifyWesternCurrentBasisLicenseCarrierChild(structuralClone)
      );
      assert.equal(computeWesternCurrentBasisLicenseCarrierChildDigest(expected), expected.childDigest);
    } finally {
      if (original === undefined) delete Object.prototype.toJSON;
      else Object.prototype.toJSON = original;
    }
  });

  it("fixed CLI succeeds without operands", () => {
    const result = spawnSync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined },
      windowsHide: true
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^WESTERN_CURRENT_BASIS_LICENSE_CARRIER_CHILD_OK /u);
    assert.match(result.stdout, /"bindings":"0\/28"/u);
  });

  it("fixed CLI rejects operands and visible preload environment before business import", () => {
    const operand = spawnSync(process.execPath, [cliPath, "unexpected"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: undefined, NODE_PATH: undefined },
      windowsHide: true
    });
    assert.equal(operand.status, 1);
    assert.match(operand.stderr, /ARGUMENTS_FORBIDDEN/u);

    const preload = spawnSync(process.execPath, [cliPath], {
      cwd: workspaceRoot,
      encoding: "utf8",
      env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: undefined },
      windowsHide: true
    });
    assert.equal(preload.status, 1);
    assert.match(preload.stderr, /PRELOAD_ENVIRONMENT_FORBIDDEN/u);
  });
});
