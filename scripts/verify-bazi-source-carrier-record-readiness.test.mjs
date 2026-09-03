import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import {
  baziSourceCarrierRecordReadinessTestOnly,
  getBaziSourceCarrierRecordReadinessSummary,
  isVerifiedBaziSourceCarrierRecordReadiness,
  loadBaziSourceCarrierRecordReadiness
} from "./bazi-source-carrier-record-readiness-lib.mjs";

const execFileAsync = promisify(execFile);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDirectory, "..");
const { computeBaziSourceCarrierRecordReadinessDigest } =
  baziSourceCarrierRecordReadinessTestOnly;
const ARTIFACTS = Object.freeze({
  source: Object.freeze({ path: "content/bazi-strength-source-binding-candidates.v1.6.0.json" }),
  rights: Object.freeze({ path: "content/bazi-strength-source-rights-candidates.v1.2.0.json" }),
  readiness: Object.freeze({ path: "content/system-admission/bazi-binding-freeze-requirements.v1.7.0.json" }),
  contracts: Object.freeze({ path: "packages/contracts/src/index.ts" }),
  materialization: Object.freeze({ path: "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json" }),
  child: Object.freeze({ path: "content/system-admission/bazi-source-carrier-record-readiness.v1.json" })
});
const UPSTREAM_CAPABILITY_PATHS = Object.freeze([
  "content/bazi-strength-source-binding-candidates.v1.json",
  "content/bazi-strength-source-rights-candidates.v1.json",
  "content/bazi-strength-engineering-binding-candidates.v1.json",
  "content/bazi-strength-expert-review-packet.v1.json",
  "content/system-admission/bazi-prc-copyright-law-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-month-command-public-evidence.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v1.json",
  "content/system-admission/bazi-dtt-versioned-parent-supersession.v1.json",
  "content/system-admission/bazi-binding-freeze-requirements.v1.json",
  "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
  "docs/阶段C-DTT月令候选公开证据-child-v1-2026-08-29.md",
  "packages/bazi-interpretation/src/strength-assessment-core.ts",
  "packages/bazi-interpretation/src/strength-claim-registry.ts",
  "packages/bazi-interpretation/src/strength-policy.ts",
  "packages/bazi-interpretation/src/strength-sensitivity-review.ts",
  "packages/knowledge-core/src/index.ts"
]);
const REQUIRED_PATHS = Object.freeze([...new Set([
  ...Object.values(ARTIFACTS).map((entry) => entry.path),
  ...UPSTREAM_CAPABILITY_PATHS
])]);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-bazi-carrier-readiness-"));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of REQUIRED_PATHS) {
    const destination = path.join(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(workspaceRoot, relativePath), destination);
  }
  return root;
}

async function mutateChild(root, mutator, resign = true) {
  const target = path.join(root, ARTIFACTS.child.path);
  const value = JSON.parse(await readFile(target, "utf8"));
  mutator(value);
  if (resign) value.ledgerDigest = computeBaziSourceCarrierRecordReadinessDigest(value);
  await writeFile(target, JSON.stringify(value), "utf8");
}

test("loads the exact five-row deny-only readiness ledger with a private brand", async () => {
  const capability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
  const summary = getBaziSourceCarrierRecordReadinessSummary(capability);
  const persisted = JSON.parse(await readFile(path.join(workspaceRoot, ARTIFACTS.child.path), "utf8"));
  assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(capability), true);
  assert.equal("carrierGaps" in capability, false);
  assert.equal(persisted.carrierGaps.length, 5);
  assert.equal(persisted.carrierGaps.filter((row) => row.bindingId === "binding:dtt:month-command").length, 2);
  assert.deepEqual(
    persisted.carrierGaps.map((row) => row.observedCarrierIdentity.anchorId),
    [
      "smt-v10-gujin-volume-472-page-28-facsimile-v1",
      "dtt-chanwei-ssid-11335994-pages-170-176-facsimile-v1",
      "dtt-chanwei-cadal-07005210-pages-178-184-facsimile-v1",
      "smt-v5-gujin-volume-470-page-115-facsimile-v1",
      "yhzp-nlc416-15jh007754-99036-page-54-facsimile-v1"
    ]
  );
  assert.equal(summary.sourceBindingsFrozen, 0);
  assert.equal(summary.formalSourceCarrierRecords, 0);
  assert.equal(summary.adjudicationReceiptsIssued, 0);
  assert.equal(summary.verifiedRightsReviewers, 0);
  assert.equal(summary.activeAdmissionEffect, "none");
  assert.equal(summary.legalConclusion, "not_established");
  summary.releaseReady = true;
  assert.equal(getBaziSourceCarrierRecordReadinessSummary(capability).releaseReady, false);
});

test("a clone or refrozen value cannot forge the loader's private brand", async () => {
  const capability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
  let clone;
  try {
    clone = structuredClone(capability);
  } catch {
    clone = {};
  }
  Object.freeze(clone);
  assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(clone), false);
  assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(capability), true);
});

test("post-import WeakSet and Object.freeze poisoning cannot forge or rewrite the private summary", async () => {
  const originalHas = WeakSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  const originalFreeze = Object.freeze;
  try {
    WeakSet.prototype.has = () => true;
    WeakSet.prototype.add = function forgedAdd() { return this; };
    Object.freeze = (value) => value;
    const capability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
    let clone;
    try {
      clone = structuredClone(capability);
    } catch {
      clone = {};
    }
    capability.releaseReady = true;
    capability.activeAdmissionEffect = "allow";
    const summary = getBaziSourceCarrierRecordReadinessSummary(capability);
    assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(capability), true);
    assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(clone), false);
    assert.equal(summary.releaseReady, false);
    assert.equal(summary.activeAdmissionEffect, "none");
  } finally {
    WeakSet.prototype.has = originalHas;
    WeakSet.prototype.add = originalAdd;
    Object.freeze = originalFreeze;
  }
});

test("pre-import WeakSet poisoning in the ambient realm cannot forge the private-field capability", async () => {
  const moduleUrl = pathToFileURL(path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")).href;
  const probe = `
    WeakSet.prototype.has = () => true;
    const mod = await import(${JSON.stringify(moduleUrl)} + "?preimport-poison-probe");
    const forged = Object.freeze({ authorityBoundary: { activeAdmissionEffect: "allow", releaseReady: true } });
    process.stdout.write(JSON.stringify({ forgedAccepted: mod.isVerifiedBaziSourceCarrierRecordReadiness(forged) }));
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), { forgedAccepted: false });
});

test("pre-import node:vm export substitution cannot forge or rewrite the private-field capability", async () => {
  const moduleUrl = pathToFileURL(path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")).href;
  const probe = `
    import vm from "node:vm";
    import { syncBuiltinESMExports } from "node:module";
    let vmFactoryCalls = 0;
    const originalRunInNewContext = vm.runInNewContext;
    vm.runInNewContext = (source, ...args) => {
      if (typeof source === "string"
        && source.includes("ObjectFreeze")
        && source.includes("WeakSetHas")) {
        vmFactoryCalls += 1;
        return {
          ObjectFreeze: (value) => value,
          ObjectIsFrozen: () => true,
          ReflectApply: (fn, receiver, callArgs) => fn.apply(receiver, callArgs),
          WeakSetCtor: WeakSet,
          WeakSetAdd: WeakSet.prototype.add,
          WeakSetHas: () => true
        };
      }
      return Reflect.apply(originalRunInNewContext, vm, [source, ...args]);
    };
    syncBuiltinESMExports();
    Object.freeze = (value) => value;
    const mod = await import(${JSON.stringify(moduleUrl)} + "?preimport-vm-poison-probe");
    const forged = { releaseReady: true, activeAdmissionEffect: "allow" };
    const capability = await mod.loadBaziSourceCarrierRecordReadiness(${JSON.stringify(workspaceRoot)});
    capability.releaseReady = true;
    capability.activeAdmissionEffect = "allow";
    const summary = mod.getBaziSourceCarrierRecordReadinessSummary(capability);
    process.stdout.write(JSON.stringify({
      vmFactoryCalls,
      forgedAccepted: mod.isVerifiedBaziSourceCarrierRecordReadiness(forged),
      capabilityAccepted: mod.isVerifiedBaziSourceCarrierRecordReadiness(capability),
      releaseReady: summary.releaseReady,
      activeAdmissionEffect: summary.activeAdmissionEffect
    }));
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), {
    vmFactoryCalls: 0,
    forgedAccepted: false,
    capabilityAccepted: true,
    releaseReady: false,
    activeAdmissionEffect: "none"
  });
});

test("pre-import stateful Object.keys cannot mutate rebuilt authority after its digest pass", async () => {
  const supersessionUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-versioned-parent-supersession-lib.mjs")
  ).href;
  const readinessUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-version-aware-readiness-lib.mjs")
  ).href;
  const moduleUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")
  ).href;
  const probe = `
    await import(${JSON.stringify(supersessionUrl)});
    await import(${JSON.stringify(readinessUrl)});
    const originalObjectKeys = Object.keys;
    let authorityCalls = 0;
    let releaseGovernanceCalls = 0;
    let firstAuthority = null;
    let mutationTriggered = false;
    Object.keys = (value) => {
      const keys = originalObjectKeys(value);
      const isAuthority = value !== null
        && typeof value === "object"
        && keys.includes("rightsEffect")
        && keys.includes("bindingFreezeEffect")
        && keys.includes("contentTruthEstablished");
      if (isAuthority) {
        authorityCalls += 1;
        if (authorityCalls === 1) firstAuthority = value;
        if (authorityCalls >= 3) {
          return keys.filter((key) => ![
            "activeAdmissionEffect",
            "releaseReady",
            "publicDeploymentAuthorized",
            "expertClaimsAuthorized"
          ].includes(key));
        }
      }
      const isReleaseGovernance = value !== null
        && typeof value === "object"
        && keys.includes("activeLine")
        && keys.includes("targetSchema")
        && keys.includes("mutationEpochBoundaryRequired");
      if (isReleaseGovernance) {
        releaseGovernanceCalls += 1;
        if (releaseGovernanceCalls === 1 && firstAuthority !== null) {
          firstAuthority.activeAdmissionEffect = "allow";
          firstAuthority.releaseReady = true;
          firstAuthority.publicDeploymentAuthorized = true;
          firstAuthority.expertClaimsAuthorized = true;
          mutationTriggered = true;
        }
      }
      return keys;
    };
    const mod = await import(${JSON.stringify(moduleUrl)} + "?preimport-stateful-object-keys-probe");
    let accepted = false;
    let summary = null;
    let errorCode = null;
    try {
      const capability = await mod.loadBaziSourceCarrierRecordReadiness(${JSON.stringify(workspaceRoot)});
      accepted = true;
      summary = mod.getBaziSourceCarrierRecordReadinessSummary(capability);
    } catch (error) {
      errorCode = error?.code ?? null;
    }
    process.stdout.write(JSON.stringify({
      accepted,
      summary,
      errorCode,
      mutationTriggered,
      authorityCalls
    }));
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  const result = JSON.parse(stdout);
  assert.equal(result.mutationTriggered, true);
  assert.equal(result.authorityCalls >= 4, true);
  assert.equal(result.accepted, false);
  assert.equal(result.summary, null);
  assert.equal(result.errorCode, "SEMANTIC_DRIFT");
});

test("pre-import stateful Array.isArray cannot mutate rebuilt authority after its final helper pass", async () => {
  const supersessionUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-versioned-parent-supersession-lib.mjs")
  ).href;
  const readinessUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-version-aware-readiness-lib.mjs")
  ).href;
  const moduleUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")
  ).href;
  const probe = `
    await import(${JSON.stringify(supersessionUrl)});
    await import(${JSON.stringify(readinessUrl)});
    const originalArrayIsArray = Array.isArray;
    let persistedAuthority = null;
    let expectedAuthority = null;
    let expectedAuthorityCalls = 0;
    let armed = false;
    let mutationTriggered = false;
    Array.isArray = (value) => {
      const isAuthority = value !== null
        && typeof value === "object"
        && value.rightsEffect === "none"
        && value.bindingFreezeEffect === "none"
        && "contentTruthEstablished" in value;
      if (isAuthority) {
        if (persistedAuthority === null) {
          persistedAuthority = value;
        } else if (value !== persistedAuthority) {
          if (expectedAuthority === null) expectedAuthority = value;
          if (value === expectedAuthority) {
            expectedAuthorityCalls += 1;
            if (expectedAuthorityCalls >= 5) armed = true;
          }
        }
      } else if (armed
        && !mutationTriggered
        && value !== null
        && typeof value === "object"
        && value.minimumIndependentNaturalPersonReviewersForFutureFormalUse === 2) {
        expectedAuthority.activeAdmissionEffect = "allow";
        expectedAuthority.releaseReady = true;
        expectedAuthority.publicDeploymentAuthorized = true;
        expectedAuthority.expertClaimsAuthorized = true;
        mutationTriggered = true;
      }
      return originalArrayIsArray(value);
    };
    const mod = await import(${JSON.stringify(moduleUrl)} + "?preimport-stateful-array-is-array-probe");
    let accepted = false;
    let summary = null;
    let errorCode = null;
    try {
      const capability = await mod.loadBaziSourceCarrierRecordReadiness(${JSON.stringify(workspaceRoot)});
      accepted = true;
      summary = mod.getBaziSourceCarrierRecordReadinessSummary(capability);
    } catch (error) {
      errorCode = error?.code ?? null;
    }
    process.stdout.write(JSON.stringify({
      accepted,
      summary,
      errorCode,
      mutationTriggered,
      expectedAuthorityCalls
    }));
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), {
    accepted: false,
    summary: null,
    errorCode: "FINAL_RED_BOUNDARY_DRIFT",
    mutationTriggered: true,
    expectedAuthorityCalls: 5
  });
});

test("a proxy receipt length getter cannot mutate authority after review and row reads", async () => {
  const supersessionUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-versioned-parent-supersession-lib.mjs")
  ).href;
  const readinessUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-dtt-version-aware-readiness-lib.mjs")
  ).href;
  const moduleUrl = pathToFileURL(
    path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")
  ).href;
  const probe = `
    await import(${JSON.stringify(supersessionUrl)});
    await import(${JSON.stringify(readinessUrl)});
    const originalArrayIsArray = Array.isArray;
    let persistedAuthority = null;
    let expectedAuthority = null;
    let persistedReview = null;
    let expectedReview = null;
    let expectedReviewCalls = 0;
    let proxyInstalled = false;
    let getterTriggered = false;
    Array.isArray = (value) => {
      const isAuthority = value !== null
        && typeof value === "object"
        && value.rightsEffect === "none"
        && value.bindingFreezeEffect === "none"
        && "contentTruthEstablished" in value;
      const isReview = value !== null
        && typeof value === "object"
        && value.minimumIndependentNaturalPersonReviewersForFutureFormalUse === 2
        && "thisLedgerMayIssueReceipt" in value;
      if (isAuthority) {
        if (persistedAuthority === null) {
          persistedAuthority = value;
        } else if (value !== persistedAuthority && expectedAuthority === null) {
          expectedAuthority = value;
        }
      } else if (isReview) {
        if (persistedReview === null) {
          persistedReview = value;
        } else if (value !== persistedReview) {
          if (expectedReview === null) expectedReview = value;
          if (value === expectedReview) {
            expectedReviewCalls += 1;
            if (!proxyInstalled && expectedReviewCalls >= 5 && expectedAuthority !== null) {
              expectedReview.currentReceiptIds = new Proxy([], {
                get(target, property) {
                  if (property === "length") {
                    expectedAuthority.activeAdmissionEffect = "allow";
                    expectedAuthority.releaseReady = true;
                    expectedAuthority.publicDeploymentAuthorized = true;
                    expectedAuthority.expertClaimsAuthorized = true;
                    getterTriggered = true;
                    return 0;
                  }
                  return target[property];
                }
              });
              proxyInstalled = true;
            }
          }
        }
      }
      return originalArrayIsArray(value);
    };
    const mod = await import(${JSON.stringify(moduleUrl)} + "?preimport-proxy-receipt-length-probe");
    let accepted = false;
    let summary = null;
    let errorCode = null;
    try {
      const capability = await mod.loadBaziSourceCarrierRecordReadiness(${JSON.stringify(workspaceRoot)});
      accepted = true;
      summary = mod.getBaziSourceCarrierRecordReadinessSummary(capability);
    } catch (error) {
      errorCode = error?.code ?? null;
    }
    process.stdout.write(JSON.stringify({
      accepted,
      summary,
      errorCode,
      proxyInstalled,
      getterTriggered,
      expectedReviewCalls
    }));
  `;
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--input-type=module", "-e", probe],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  assert.deepEqual(JSON.parse(stdout), {
    accepted: false,
    summary: null,
    errorCode: "FINAL_AUTHORITY_LATCH_DRIFT",
    proxyInstalled: true,
    getterTriggered: true,
    expectedReviewCalls: 5
  });
});

test("the final primitive guard also covers review issuance and per-row rights", async (t) => {
  for (const mode of ["review", "row"]) {
    await t.test(mode, async () => {
      const supersessionUrl = pathToFileURL(
        path.join(scriptDirectory, "bazi-dtt-versioned-parent-supersession-lib.mjs")
      ).href;
      const readinessUrl = pathToFileURL(
        path.join(scriptDirectory, "bazi-dtt-version-aware-readiness-lib.mjs")
      ).href;
      const moduleUrl = pathToFileURL(
        path.join(scriptDirectory, "bazi-source-carrier-record-readiness-lib.mjs")
      ).href;
      const probe = `
        await import(${JSON.stringify(supersessionUrl)});
        await import(${JSON.stringify(readinessUrl)});
        const mode = ${JSON.stringify(mode)};
        const originalArrayIsArray = Array.isArray;
        let persistedReview = null;
        let expectedReview = null;
        let expectedReviewCalls = 0;
        let armed = false;
        let expectedDecision = null;
        let mutationTriggered = false;
        Array.isArray = (value) => {
          const isReview = value !== null
            && typeof value === "object"
            && value.minimumIndependentNaturalPersonReviewersForFutureFormalUse === 2
            && "thisLedgerMayIssueReceipt" in value;
          if (isReview) {
            if (persistedReview === null) {
              persistedReview = value;
            } else if (value !== persistedReview) {
              if (expectedReview === null) expectedReview = value;
              if (value === expectedReview) {
                expectedReviewCalls += 1;
                if (expectedReviewCalls >= 5) armed = true;
              }
            }
          } else if (armed && !mutationTriggered && mode === "review") {
            expectedReview.thisLedgerMayIssueReceipt = true;
            expectedReview.automaticPromotionAllowed = true;
            mutationTriggered = true;
          } else if (armed && !mutationTriggered && mode === "row") {
            const isDecision = value !== null
              && typeof value === "object"
              && value.reproductionAllowed === false
              && value.quotationAllowed === false
              && value.redistributionAllowed === false
              && value.admissionEffect === "none";
            const isTargetReadiness = value !== null
              && typeof value === "object"
              && value.formalRecordCreated === false
              && value.eligibleForMaterialization === false
              && "documentContentHash" in value;
            if (expectedDecision === null && isDecision) {
              expectedDecision = value;
            } else if (expectedDecision !== null && isTargetReadiness) {
              expectedDecision.redistributionAllowed = true;
              expectedDecision.legalConclusion = "cleared";
              expectedDecision.admissionEffect = "allow";
              mutationTriggered = true;
            }
          }
          return originalArrayIsArray(value);
        };
        const mod = await import(
          ${JSON.stringify(moduleUrl)} + "?preimport-late-" + mode + "-red-gate-probe"
        );
        let accepted = false;
        let summary = null;
        let errorCode = null;
        try {
          const capability = await mod.loadBaziSourceCarrierRecordReadiness(${JSON.stringify(workspaceRoot)});
          accepted = true;
          summary = mod.getBaziSourceCarrierRecordReadinessSummary(capability);
        } catch (error) {
          errorCode = error?.code ?? null;
        }
        process.stdout.write(JSON.stringify({
          accepted,
          summary,
          errorCode,
          mutationTriggered,
          expectedReviewCalls
        }));
      `;
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        ["--input-type=module", "-e", probe],
        { cwd: workspaceRoot, windowsHide: true }
      );
      assert.equal(stderr, "");
      assert.deepEqual(JSON.parse(stdout), {
        accepted: false,
        summary: null,
        errorCode: "FINAL_RED_BOUNDARY_DRIFT",
        mutationTriggered: true,
        expectedReviewCalls: 5
      });
    });
  }
});

test("the public constructor and mutable static methods cannot mint or redefine authority", async () => {
  const capability = await loadBaziSourceCarrierRecordReadiness(workspaceRoot);
  const Constructor = Object.getPrototypeOf(capability).constructor;
  assert.throws(
    () => new Constructor({}, { authorityBoundary: { releaseReady: true } }),
    /CAPABILITY_CONSTRUCTION_FORBIDDEN/u
  );
  const originalIs = Constructor.is;
  const originalRead = Constructor.read;
  try {
    Constructor.is = () => true;
    Constructor.read = () => ({ releaseReady: true, activeAdmissionEffect: "allow" });
    assert.equal(isVerifiedBaziSourceCarrierRecordReadiness({}), false);
    assert.equal(getBaziSourceCarrierRecordReadinessSummary(capability).releaseReady, false);
    assert.equal(getBaziSourceCarrierRecordReadinessSummary(capability).activeAdmissionEffect, "none");
  } finally {
    Constructor.is = originalIs;
    Constructor.read = originalRead;
  }
});

test("public loader and brand check do not inspect a hostile workspaceRoot object", async () => {
  let trapCount = 0;
  const hostile = new Proxy({}, {
    get() { trapCount += 1; throw new Error("getter must not run"); },
    ownKeys() { trapCount += 1; throw new Error("ownKeys must not run"); },
    getOwnPropertyDescriptor() { trapCount += 1; throw new Error("descriptor must not run"); }
  });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(hostile),
    /WORKSPACE_ROOT_INVALID/u
  );
  assert.equal(isVerifiedBaziSourceCarrierRecordReadiness(hostile), false);
  assert.equal(trapCount, 0);
});

test("strict child JSON rejects literal and escaped duplicate keys", async (t) => {
  for (const duplicate of [
    '"status":"forged","status":',
    '"st\\u0061tus":"forged","status":'
  ]) {
    await t.test(duplicate.includes("\\u") ? "escaped duplicate" : "literal duplicate", async (t2) => {
      const root = await fixture(t2);
      const target = path.join(root, ARTIFACTS.child.path);
      const text = await readFile(target, "utf8");
      await writeFile(target, text.replace('"status":', duplicate), "utf8");
      await assert.rejects(
        loadBaziSourceCarrierRecordReadiness(root),
        /JSON_DUPLICATE_KEY|不是严格 JSON/u
      );
    });
  }
});

test("child BOM, invalid UTF-8, and a second hardlink name fail closed", async (t) => {
  await t.test("UTF-8 BOM", async (t2) => {
    const root = await fixture(t2);
    const target = path.join(root, ARTIFACTS.child.path);
    const bytes = await readFile(target);
    await writeFile(target, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes]));
    await assert.rejects(loadBaziSourceCarrierRecordReadiness(root), /不是严格 JSON|JSON/u);
  });
  await t.test("invalid UTF-8", async (t2) => {
    const root = await fixture(t2);
    const target = path.join(root, ARTIFACTS.child.path);
    await writeFile(target, Buffer.from([0xff, 0xfe, 0xfd]));
    await assert.rejects(loadBaziSourceCarrierRecordReadiness(root), /不是严格 JSON|JSON/u);
  });
  await t.test("hardlink", async (t2) => {
    const root = await fixture(t2);
    const target = path.join(root, ARTIFACTS.child.path);
    await link(target, `${target}.second-name`);
    await assert.rejects(loadBaziSourceCarrierRecordReadiness(root), /HARDLINK_REJECTED/u);
  });
});

test("a self-resigned authority promotion is rejected against the rebuilt projection", async (t) => {
  const root = await fixture(t);
  await mutateChild(root, (ledger) => {
    ledger.authorityBoundary.publicDeploymentAuthorized = true;
    ledger.authorityBoundary.releaseReady = true;
  });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(root),
    /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
  );
});

test("post-import Object.keys poisoning cannot hide a self-resigned authority promotion", async (t) => {
  const root = await fixture(t);
  const originalObjectKeys = Object.keys;
  let targetedPoisonCalls = 0;
  try {
    Object.keys = (value) => {
      const keys = originalObjectKeys(value);
      if (value !== null
        && typeof value === "object"
        && value.rightsEffect === "none"
        && value.bindingFreezeEffect === "none"
        && keys.includes("contentTruthEstablished")) {
        targetedPoisonCalls += 1;
        return keys.filter((key) => ![
          "releaseReady",
          "publicDeploymentAuthorized",
          "expertClaimsAuthorized"
        ].includes(key));
      }
      return keys;
    };
    await mutateChild(root, (ledger) => {
      ledger.authorityBoundary.releaseReady = true;
      ledger.authorityBoundary.publicDeploymentAuthorized = true;
      ledger.authorityBoundary.expertClaimsAuthorized = true;
    });
    const persisted = JSON.parse(await readFile(path.join(root, ARTIFACTS.child.path), "utf8"));
    assert.equal(persisted.authorityBoundary.releaseReady, true);
    assert.equal(persisted.authorityBoundary.publicDeploymentAuthorized, true);
    assert.equal(persisted.authorityBoundary.expertClaimsAuthorized, true);
    await assert.rejects(
      loadBaziSourceCarrierRecordReadiness(root),
      /SEMANTIC_DRIFT|RAW_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
    );
    assert.equal(targetedPoisonCalls, 0);
  } finally {
    Object.keys = originalObjectKeys;
  }
});

test("row deletion, duplication, reordering, and cross-row identity swaps are rejected", async (t) => {
  const mutations = [
    ["delete", (ledger) => { ledger.carrierGaps.pop(); }],
    ["duplicate", (ledger) => { ledger.carrierGaps[4] = structuredClone(ledger.carrierGaps[0]); }],
    ["reorder", (ledger) => { [ledger.carrierGaps[0], ledger.carrierGaps[1]] = [ledger.carrierGaps[1], ledger.carrierGaps[0]]; }],
    ["cross-row swap", (ledger) => {
      const value = ledger.carrierGaps[1].observedCarrierIdentity.carrierFilePageId;
      ledger.carrierGaps[1].observedCarrierIdentity.carrierFilePageId =
        ledger.carrierGaps[2].observedCarrierIdentity.carrierFilePageId;
      ledger.carrierGaps[2].observedCarrierIdentity.carrierFilePageId = value;
    }]
  ];
  for (const [name, mutation] of mutations) {
    await t.test(name, async (t2) => {
      const root = await fixture(t2);
      await mutateChild(root, mutation);
      await assert.rejects(
        loadBaziSourceCarrierRecordReadiness(root),
        /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
      );
    });
  }
});

test("DTT SSID and CADAL notices cannot be collapsed into one projection", async (t) => {
  const root = await fixture(t);
  await mutateChild(root, (ledger) => {
    ledger.carrierGaps[2].observedCarrierIdentity.rightsNoticeState =
      ledger.carrierGaps[1].observedCarrierIdentity.rightsNoticeState;
    ledger.carrierGaps[2].observedCarrierIdentity.fixedFilePageRevisionId =
      ledger.carrierGaps[1].observedCarrierIdentity.fixedFilePageRevisionId;
  });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(root),
    /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
  );
});

test("PD metadata and a carrier raw hash cannot be promoted to permissions or document identity", async (t) => {
  const root = await fixture(t);
  await mutateChild(root, (ledger) => {
    const row = ledger.carrierGaps[0];
    row.targetFieldReadiness.documentContentHash = row.observedCarrierIdentity.carrierRawSha256;
    row.targetFieldReadiness.formalRecordCreated = true;
    row.decision.reproductionAllowed = true;
    row.decision.quotationAllowed = true;
    row.decision.redistributionAllowed = true;
    row.decision.legalConclusion = "public_domain";
  });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(root),
    /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
  );
});

test("self-declared reviewers and a fabricated receipt do not satisfy adjudication", async (t) => {
  const root = await fixture(t);
  await mutateChild(root, (ledger) => {
    ledger.carrierGaps[0].observedCarrierIdentity.rightsReviewerIds = ["alias-a", "alias-b"];
    ledger.carrierGaps[0].targetFieldReadiness.adjudicationReceiptIds = ["receipt:forged"];
    ledger.reviewAdjudicationRequirements.currentReceiptIds = ["receipt:forged"];
    ledger.reviewAdjudicationRequirements.adjudicationReceiptsIssued = 1;
    ledger.counts.adjudicationReceiptsIssued = 1;
    ledger.counts.verifiedRightsReviewers = 2;
  });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(root),
    /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
  );
});

test("every zero-instance count and legacy-v13 governance field is fail-closed", async (t) => {
  const mutations = [
    (ledger) => { ledger.counts.formalSourceRightsRecords = 1; },
    (ledger) => { ledger.counts.formalSourceCarrierRecords = 1; },
    (ledger) => { ledger.counts.projectCopyMaterializationRecords = 1; },
    (ledger) => { ledger.counts.sourceBindingsFrozen = 1; },
    (ledger) => { ledger.releaseGovernance.targetSchema = 15; },
    (ledger) => { ledger.releaseGovernance.migrationId = "forged"; },
    (ledger) => { ledger.integrityBoundary.mutationEpochAvailableForSchema13 = true; }
  ];
  for (const [index, mutation] of mutations.entries()) {
    await t.test(`red gate ${index + 1}`, async (t2) => {
      const root = await fixture(t2);
      await mutateChild(root, mutation);
      await assert.rejects(
        loadBaziSourceCarrierRecordReadiness(root),
        /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
      );
    });
  }
});

test("parent raw drift fails before a child can rebind itself", async (t) => {
  for (const artifact of [ARTIFACTS.source, ARTIFACTS.rights, ARTIFACTS.readiness, ARTIFACTS.contracts, ARTIFACTS.materialization]) {
    await t.test(path.basename(artifact.path), async (t2) => {
      const root = await fixture(t2);
      const target = path.join(root, artifact.path);
      const bytes = await readFile(target);
      await writeFile(target, Buffer.concat([bytes, Buffer.from("\n", "utf8")]));
      await assert.rejects(
        loadBaziSourceCarrierRecordReadiness(root),
        /SEMANTIC_DRIFT|RAW_DRIFT|BASIS_DRIFT/u
      );
    });
  }
});

test("unknown child fields fail even when the child digest is recomputed", async (t) => {
  const root = await fixture(t);
  await mutateChild(root, (ledger) => { ledger.optimisticAdmission = true; });
  await assert.rejects(
    loadBaziSourceCarrierRecordReadiness(root),
    /SEMANTIC_DRIFT|EXPECTED_PROJECTION_MISMATCH/u
  );
});

test("CLI emits only bounded status metadata and keeps all authority gates closed", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [path.join(scriptDirectory, "verify-bazi-source-carrier-record-readiness.mjs")],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.deepEqual(
    {
      ok: output.ok,
      canonicalSourceRightsSupersessionBrandVerified:
        output.canonicalSourceRightsSupersessionBrandVerified,
      canonicalBindingReadinessV17BrandVerified:
        output.canonicalBindingReadinessV17BrandVerified,
      carrierObservationLayers: output.carrierObservationLayers,
      formalSourceCarrierRecords: output.formalSourceCarrierRecords,
      adjudicationReceiptsIssued: output.adjudicationReceiptsIssued,
      verifiedRightsReviewers: output.verifiedRightsReviewers,
      sourceBindingsFrozen: output.sourceBindingsFrozen,
      legalConclusion: output.legalConclusion,
      activeAdmissionEffect: output.activeAdmissionEffect,
      releaseReady: output.releaseReady,
      publicDeploymentAuthorized: output.publicDeploymentAuthorized,
      expertClaimsAuthorized: output.expertClaimsAuthorized
    },
    {
      ok: true,
      canonicalSourceRightsSupersessionBrandVerified: true,
      canonicalBindingReadinessV17BrandVerified: true,
      carrierObservationLayers: 5,
      formalSourceCarrierRecords: 0,
      adjudicationReceiptsIssued: 0,
      verifiedRightsReviewers: 0,
      sourceBindingsFrozen: 0,
      legalConclusion: "not_established",
      activeAdmissionEffect: "none",
      releaseReady: false,
      publicDeploymentAuthorized: false,
      expertClaimsAuthorized: false
    }
  );
  assert.equal(stdout.includes("https://"), false);
  assert.equal(stdout.includes(workspaceRoot), false);
});
