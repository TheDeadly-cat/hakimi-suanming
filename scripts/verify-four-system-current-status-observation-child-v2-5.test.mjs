import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { after, before, test } from "node:test";

import {
  FourSystemCurrentStatusObservationChildV25Error,
  buildCurrentFourSystemCurrentStatusObservationChildV25,
  computeFourSystemCurrentStatusObservationChildV25Digest,
  fourSystemCurrentStatusObservationChildV25TestOnly as testOnly,
  getFourSystemCurrentStatusObservationChildV25Summary,
  isVerifiedFourSystemCurrentStatusObservationChildV25,
  loadFourSystemCurrentStatusObservationChildV25,
  serializeFourSystemCurrentStatusObservationChildV25
} from "./four-system-current-status-observation-child-v2-5-lib.mjs";
import {
  loadFourSystemCurrentStatusObservationChildV24
} from "./four-system-current-status-observation-child-v2-4-lib.mjs";
import {
  loadZiweiSameArtifactBrowserObservationChildV11
} from "./ziwei-same-artifact-browser-observation-child-v1-1-lib.mjs";
import { attachCurrentFourSystemCli } from "./four-system-v22-history.test-fixture.mjs";
import {
  FOUR_SYSTEM_V25_ADDITIONAL_ARCHIVE_URL,
  createFourSystemV25HistoricalInputs,
  parseFourSystemV25AdditionalArchive
} from "./four-system-v25-history.test-fixture.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const ACTUAL_CLI = path.join(
  HERE,
  "verify-four-system-current-status-observation-child-v2-5.mjs"
);
const ARTIFACT = path.join(
  ROOT,
  "content",
  "system-admission",
  "four-system-current-status-observation-child.v2.5.0.json"
);
const PRELOAD_FAILURE =
  "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_FAILED"
  + " VISIBLE_PRELOAD_OPTIONS_REJECTED\n";
let historicalInputs;
let CLI;
before(async () => {
  historicalInputs = await createFourSystemV25HistoricalInputs();
  CLI = await attachCurrentFourSystemCli(historicalInputs, 5);
  assert.deepEqual(await readFile(ARTIFACT), await readFile(path.join(historicalInputs.root,
    "content/system-admission/four-system-current-status-observation-child.v2.5.0.json")));
});
after(async () => { await historicalInputs?.cleanup(); });

test("current v2.5 loader and source CLI cannot inherit historical browser-input success", async () => {
  await assert.rejects(loadFourSystemCurrentStatusObservationChildV25(ROOT),
    { code: "MANIFEST_IDENTITY_DRIFT" });
  const run = spawnSync(process.execPath, [ACTUAL_CLI], {
    cwd: historicalInputs.root, encoding: "utf8", env: cleanEnv(), windowsHide: true
  });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_FAILED VERIFICATION_FAILED\n");
});

test("v2.5 supplemental archive rejects tampering, truncation and a valid empty ZIP", async () => {
  const original = await readFile(FOUR_SYSTEM_V25_ADDITIONAL_ARCHIVE_URL);
  assert.equal(parseFourSystemV25AdditionalArchive(original).manifest.files.length, 38);
  const changed = Buffer.from(original); changed[Math.floor(changed.length / 2)] ^= 1;
  const { zipSync } = createRequire(new URL("../packages/backup/package.json", import.meta.url))("fflate");
  for (const bytes of [changed, original.subarray(0, -1), zipSync({})]) {
    assert.throws(() => parseFourSystemV25AdditionalArchive(bytes), /v2.5 additional archive identity changed/u);
  }
});

test("v2.5 refuses the old browser observation when a bound source-graph input changes or disappears", async () => {
  const inputs = await createFourSystemV25HistoricalInputs();
  try {
    const target = path.join(inputs.root, "packages/ziwei-doushu-contracts-draft/tsconfig.json");
    const changed = Buffer.from(await readFile(target)); changed[0] ^= 1;
    await writeFile(target, changed);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV25(inputs.root),
      { code: "CURRENT_BASE_REBUILD_FAILED" });
    await rm(target);
    await assert.rejects(loadFourSystemCurrentStatusObservationChildV25(inputs.root),
      { code: "CURRENT_BASE_REBUILD_FAILED" });
  } finally {
    await inputs.cleanup();
  }
});

let fixturePromise;

function fixture() {
  if (!fixturePromise) {
    fixturePromise = Promise.all([
      loadFourSystemCurrentStatusObservationChildV25(historicalInputs.root),
      loadFourSystemCurrentStatusObservationChildV24(historicalInputs.root),
      loadZiweiSameArtifactBrowserObservationChildV11(historicalInputs.root),
      buildCurrentFourSystemCurrentStatusObservationChildV25(historicalInputs.root)
    ]).then(([loaded, parent, browserChild, built]) => ({
      loaded,
      parent,
      browserChild,
      built
    }));
  }
  return fixturePromise;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function codeIs(expected) {
  return (error) =>
    error instanceof FourSystemCurrentStatusObservationChildV25Error
    && error.code === expected;
}

function reseal(value) {
  value.childDigest =
    computeFourSystemCurrentStatusObservationChildV25Digest(value);
  return value;
}

function bySystem(value, id) {
  return value.systems.find((system) => system.productSystemId === id);
}

function binding(pin) {
  return {
    role: pin.role,
    path: pin.path,
    rawBytes: pin.rawBytes,
    rawSha256: pin.rawSha256,
    semanticDigestField: pin.semanticDigestField,
    semanticDigest: pin.semanticDigest
  };
}

function cleanEnv() {
  const env = { ...process.env, NODE_OPTIONS: "" };
  delete env.NODE_PATH;
  return env;
}

function assertActuallyDeepFrozen(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object" || seen.has(value)) {
    return;
  }
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && "value" in descriptor) {
      assertActuallyDeepFrozen(descriptor.value, seen);
    }
  }
}

test(
  "exact persisted loader grants the v2.5 private brand and builder does not",
  async () => {
    const { loaded, built } = await fixture();
    assert.deepEqual(built, loaded);
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV25(built),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV25(loaded),
      true
    );
    assertActuallyDeepFrozen(loaded);
  }
);

test(
  "persisted raw bytes, SHA-256, self digest and canonical materialization are frozen",
  async () => {
    const bytes = await readFile(ARTIFACT);
    const parsed = JSON.parse(bytes.toString("utf8"));
    assert.equal(bytes.length, testOnly.EXPECTED_PERSISTED.rawBytes);
    assert.equal(sha256(bytes), testOnly.EXPECTED_PERSISTED.rawSha256);
    assert.equal(
      parsed.childDigest,
      testOnly.EXPECTED_PERSISTED.childDigest
    );
    assert.equal(
      parsed.childDigest,
      computeFourSystemCurrentStatusObservationChildV25Digest(parsed)
    );
    assert.equal(
      bytes.toString("utf8"),
      serializeFourSystemCurrentStatusObservationChildV25(parsed)
    );
  }
);

test("createdAt is one canonical fixed UTC instant", async () => {
  const { loaded } = await fixture();
  assert.equal(loaded.createdAt, testOnly.CREATED_AT);
  assert.match(
    loaded.createdAt,
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u
  );
  const instant = Date.parse(loaded.createdAt);
  assert.equal(Number.isFinite(instant), true);
  assert.equal(new Date(instant).toISOString(), loaded.createdAt);
});

test(
  "v2.4 parent and Ziwei v1.1 are exact fixed-path full-loader private brands",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    assert.doesNotThrow(() => testOnly.assertParentV24(parent));
    assert.doesNotThrow(
      () => testOnly.assertZiweiBrowserV11(browserChild)
    );
    assert.throws(
      () => testOnly.assertParentV24(clone(parent)),
      codeIs("PARENT_V24_BRAND_REQUIRED")
    );
    assert.throws(
      () => testOnly.assertZiweiBrowserV11(clone(browserChild)),
      codeIs("ZIWEI_BROWSER_V11_BRAND_REQUIRED")
    );
    assert.deepEqual(loaded.artifactBindings, [
      binding(testOnly.PARENT_V24),
      binding(testOnly.ZIWEI_BROWSER_V11)
    ]);
  }
);

test(
  "top-level delta is limited to v2.5 identity, bindings, lineage, disclaimer and digest",
  async () => {
    const { loaded, parent } = await fixture();
    const normalized = clone(loaded);
    for (const key of [
      "schemaVersion",
      "recordType",
      "childId",
      "createdAt",
      "artifactBindings",
      "lineage",
      "doesNotEstablish",
      "childDigest"
    ]) {
      normalized[key] = clone(parent[key]);
    }
    const currentZiwei = bySystem(normalized, "ziwei-doushu");
    const parentZiwei = bySystem(parent, "ziwei-doushu");
    currentZiwei.currentStatus = parentZiwei.currentStatus;
    currentZiwei.currentEvidence.browserRuntimeEvidence =
      parentZiwei.currentEvidence.browserRuntimeEvidence;
    currentZiwei.currentEvidence.endpoints =
      clone(parentZiwei.currentEvidence.endpoints);
    assert.deepEqual(normalized, parent);
    assert.equal(loaded.status, parent.status);
  }
);

test(
  "Bazi, Western and Vedic are canonical-exact v2.4 copies",
  async () => {
    const { loaded, parent } = await fixture();
    for (const id of [
      "bazi",
      "western-astrology",
      "vedic-astrology"
    ]) {
      assert.deepEqual(bySystem(loaded, id), bySystem(parent, id), id);
    }
    assert.doesNotThrow(
      () => testOnly.assertSystems(loaded, parent)
    );
  }
);

test(
  "Ziwei changes exactly status, browserRuntimeEvidence and two endpoints",
  async () => {
    const { loaded, parent } = await fixture();
    const current = clone(bySystem(loaded, "ziwei-doushu"));
    const previous = clone(bySystem(parent, "ziwei-doushu"));
    assert.equal(current.currentStatus, testOnly.ZIWEI_CURRENT_STATUS);
    assert.equal(
      current.currentEvidence.browserRuntimeEvidence,
      testOnly.ZIWEI_BROWSER_RUNTIME_EVIDENCE
    );
    assert.deepEqual(current.currentEvidence.endpoints, [
      binding(testOnly.ZIWEI_EXPERT_DRIFT_RECEIPT),
      binding(testOnly.ZIWEI_BROWSER_V11)
    ]);
    current.currentStatus = previous.currentStatus;
    current.currentEvidence.browserRuntimeEvidence =
      previous.currentEvidence.browserRuntimeEvidence;
    current.currentEvidence.endpoints =
      previous.currentEvidence.endpoints;
    assert.deepEqual(current, previous);
  }
);

test(
  "Ziwei disclaimer replacement is exact and preserves order/count",
  async () => {
    const { loaded, parent } = await fixture();
    assert.equal(
      parent.doesNotEstablish.includes(
        testOnly.STALE_ZIWEI_DOES_NOT_ESTABLISH
      ),
      true
    );
    assert.equal(
      loaded.doesNotEstablish.includes(
        testOnly.STALE_ZIWEI_DOES_NOT_ESTABLISH
      ),
      false
    );
    assert.equal(
      loaded.doesNotEstablish.filter(
        (entry) => entry === testOnly.CURRENT_ZIWEI_DOES_NOT_ESTABLISH
      ).length,
      1
    );
    assert.deepEqual(
      loaded.doesNotEstablish,
      testOnly.doesNotEstablishProjection(parent.doesNotEstablish)
    );
  }
);

test(
  "summary, governance, authority, epoch, atomic and ABA stay canonical-exact/all-red",
  async () => {
    const { loaded, parent } = await fixture();
    for (const key of [
      "currentStatusSummary",
      "authorityBoundary",
      "crossSystemPolicy",
      "observationBoundary",
      "projectReleaseGovernanceContext",
      "evidenceLedgerSeparation",
      "runtimeTrustBoundary",
      "versionBoundary"
    ]) {
      assert.deepEqual(loaded[key], parent[key], key);
    }
    assert.equal(
      loaded.observationBoundary.exactPersistedRawIdentitiesVerified,
      2
    );
    assert.equal(
      loaded.observationBoundary.upstreamPrivateBrandsVerified,
      2
    );
    assert.equal(
      loaded.observationBoundary.crossFileAtomicSnapshot,
      false
    );
    assert.equal(
      loaded.observationBoundary.mutationEpochAvailableForSchema13,
      false
    );
    assert.equal(loaded.observationBoundary.mutationEpochReceipt, null);
    assert.equal(
      loaded.observationBoundary.intervalMutationExcludedAcrossFiles,
      false
    );
    assert.equal(loaded.observationBoundary.abaExcluded, false);
  }
);

test(
  "formal full Domain Manifest, gates, expert receipts and authority remain red",
  async () => {
    const { loaded, browserChild } = await fixture();
    assert.equal(
      loaded.currentStatusSummary
        .allSystemsCurrentFullDomainManifestMechanicallyVerified,
      false
    );
    assert.equal(
      loaded.currentStatusSummary.totalAdmissionGatesSatisfied,
      0
    );
    assert.equal(
      loaded.currentStatusSummary.systemsFormallyAdmitted,
      0
    );
    assert.equal(
      loaded.currentStatusSummary.systemsDomainAuthorityAuthorized,
      0
    );
    assert.equal(loaded.currentStatusSummary.systemsReleaseReady, 0);
    assert.equal(
      loaded.currentStatusSummary.systemsPublicReleaseAuthorized,
      0
    );
    for (const system of loaded.systems) {
      assert.equal(
        system.currentEvidence
          .currentFullDomainManifestMechanicallyVerified,
        false,
        system.productSystemId
      );
      assert.equal(
        system.gateSummary.admissionGatesSatisfied,
        0,
        system.productSystemId
      );
      assert.equal(
        system.gateSummary.bindingFrozenVerified,
        0,
        system.productSystemId
      );
      assert.equal(
        system.gateSummary.independentExpertReviewsVerified,
        0,
        system.productSystemId
      );
      for (const value of Object.values(system.authorityBoundary)) {
        assert.equal(value, false, system.productSystemId);
      }
    }
    for (const value of Object.values(browserChild.formalReceiptCounts)) {
      assert.equal(value, 0);
    }
  }
);

test(
  "non-Ziwei projection mutation is rejected after v2.5 resealing",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    for (const mutate of [
      (value) => {
        bySystem(value, "bazi").currentStatus = "forged";
      },
      (value) => {
        bySystem(value, "western-astrology")
          .currentEvidence.endpoints.length = 0;
      },
      (value) => {
        bySystem(value, "vedic-astrology")
          .currentEvidence.browserRuntimeEvidence = "forged";
      }
    ]) {
      const forged = clone(loaded);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => testOnly.assertChildBoundary(
          forged,
          parent,
          browserChild
        ),
        codeIs("NON_ZIWEI_PROJECTION_DRIFT")
      );
    }
  }
);

test(
  "Ziwei mutations beyond the three allowed fields are rejected after resealing",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    for (const mutate of [
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.currentEngineeringManifestMechanicallyVerified =
            true;
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.currentFullDomainManifestMechanicallyVerified =
            true;
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .gateSummary.bindingFrozenVerified = 27;
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .authorityBoundary.releaseReady = true;
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .productBoundary.releaseIdentity = "legacy-v13";
      }
    ]) {
      const forged = clone(loaded);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => testOnly.assertChildBoundary(
          forged,
          parent,
          browserChild
        ),
        codeIs("ZIWEI_PROJECTION_DRIFT")
      );
    }
  }
);

test(
  "Ziwei expert/browser endpoint identity drift is rejected after resealing",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    for (const mutate of [
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.endpoints[0].rawBytes += 1;
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.endpoints[1].rawSha256 = "0".repeat(64);
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.endpoints[1].semanticDigest = "0".repeat(64);
      },
      (value) => {
        bySystem(value, "ziwei-doushu")
          .currentEvidence.endpoints.reverse();
      }
    ]) {
      const forged = clone(loaded);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => testOnly.assertChildBoundary(
          forged,
          parent,
          browserChild
        ),
        codeIs("ZIWEI_PROJECTION_DRIFT")
      );
    }
  }
);

test(
  "summary, governance, authority and non-atomic promotions are rejected",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    for (const mutate of [
      (value) => {
        value.currentStatusSummary.totalAdmissionGatesSatisfied = 1;
      },
      (value) => {
        value.authorityBoundary.publicDeploymentAuthorized = true;
      },
      (value) => {
        value.projectReleaseGovernanceContext.migrationId = "forged";
      },
      (value) => {
        value.observationBoundary.crossFileAtomicSnapshot = true;
      },
      (value) => {
        value.observationBoundary.mutationEpochAvailableForSchema13 =
          true;
      },
      (value) => {
        value.observationBoundary.intervalMutationExcludedAcrossFiles =
          true;
      },
      (value) => {
        value.observationBoundary.abaExcluded = true;
      },
      (value) => {
        value.versionBoundary.ownerPromotionDecisionReceipt = "forged";
      }
    ]) {
      const forged = clone(loaded);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => testOnly.assertChildBoundary(
          forged,
          parent,
          browserChild
        ),
        codeIs("BOUNDARY_PROMOTION_FORBIDDEN")
      );
    }
  }
);

test(
  "lineage and disclaimer forgery are rejected by exact current projection",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    for (const mutate of [
      (value) => {
        value.lineage.uniqueBlockerClaimed = true;
      },
      (value) => {
        value.lineage.parentOverwritten = true;
      },
      (value) => {
        value.doesNotEstablish.pop();
      }
    ]) {
      const forged = clone(loaded);
      mutate(forged);
      reseal(forged);
      assert.throws(
        () => testOnly.assertChildBoundary(
          forged,
          parent,
          browserChild,
          loaded
        )
      );
    }
  }
);

test(
  "clone and exact-content reseal never gain the v2.5 private brand",
  async () => {
    const { loaded, parent, browserChild } = await fixture();
    const copied = clone(loaded);
    const resealed = reseal(clone(loaded));
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV25(copied),
      false
    );
    assert.equal(
      isVerifiedFourSystemCurrentStatusObservationChildV25(resealed),
      false
    );
    assert.throws(
      () => getFourSystemCurrentStatusObservationChildV25Summary(copied),
      codeIs("CHILD_BRAND_REQUIRED")
    );
    assert.doesNotThrow(
      () => testOnly.assertChildBoundary(
        resealed,
        parent,
        browserChild,
        loaded
      )
    );
  }
);

test(
  "captured WeakSet intrinsics resist post-import brand poisoning",
  async () => {
    const { loaded } = await fixture();
    const originalAdd = WeakSet.prototype.add;
    const originalHas = WeakSet.prototype.has;
    try {
      WeakSet.prototype.add = () => {
        throw new Error("poisoned add");
      };
      WeakSet.prototype.has = () => true;
      assert.equal(
        isVerifiedFourSystemCurrentStatusObservationChildV25(loaded),
        true
      );
      assert.equal(
        isVerifiedFourSystemCurrentStatusObservationChildV25(clone(loaded)),
        false
      );
    } finally {
      WeakSet.prototype.add = originalAdd;
      WeakSet.prototype.has = originalHas;
    }
  }
);

test(
  "captured Object.isFrozen resists post-import brand poisoning",
  async () => {
    const { loaded } = await fixture();
    const original = Object.isFrozen;
    try {
      Object.isFrozen = () => false;
      assert.equal(
        isVerifiedFourSystemCurrentStatusObservationChildV25(loaded),
        true
      );
      assert.equal(
        isVerifiedFourSystemCurrentStatusObservationChildV25(clone(loaded)),
        false
      );
    } finally {
      Object.isFrozen = original;
    }
    assertActuallyDeepFrozen(loaded);
  }
);

test(
  "captured canonical and summary paths ignore poisoned array map and iterator",
  async () => {
    const { loaded } = await fixture();
    const originalMap = Array.prototype.map;
    const originalIterator = Array.prototype[Symbol.iterator];
    let summary;
    let serialized;
    try {
      Array.prototype.map = () => {
        throw new Error("poisoned map");
      };
      Array.prototype[Symbol.iterator] = function* poisonedIterator() {
        throw new Error("poisoned iterator");
      };
      summary =
        getFourSystemCurrentStatusObservationChildV25Summary(loaded);
      serialized =
        serializeFourSystemCurrentStatusObservationChildV25(loaded);
    } finally {
      Array.prototype.map = originalMap;
      Array.prototype[Symbol.iterator] = originalIterator;
    }
    assert.equal(summary.systemsRequired, 4);
    assert.equal(summary.totalAdmissionGatesSatisfied, 0);
    assert.match(
      serialized,
      /four_system_current_status_observation_child_v2_5/u
    );
  }
);

test("CLI emits one narrow calibrated all-red summary", () => {
  const run = spawnSync(process.execPath, [CLI], {
    cwd: ROOT,
    encoding: "utf8",
    env: cleanEnv()
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.match(
    run.stdout,
    /^FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_OK \{/u
  );
  const summary =
    JSON.parse(run.stdout.slice(run.stdout.indexOf("{")).trim());
  assert.equal(summary.systemsRequired, 4);
  assert.equal(summary.totalAdmissionGatesSatisfied, 0);
  assert.equal(summary.systemsFormallyAdmitted, 0);
  assert.equal(summary.systemsDomainAuthorityAuthorized, 0);
  assert.equal(summary.systemsReleaseReady, 0);
  assert.equal(summary.systemsPublicReleaseAuthorized, 0);
  assert.equal(
    summary.ziweiCurrentEngineeringManifestMechanicallyVerified,
    false
  );
  assert.equal(
    summary.ziweiCurrentFullDomainManifestMechanicallyVerified,
    false
  );
  assert.equal(summary.crossFileAtomicSnapshot, false);
  assert.equal(summary.mutationEpochReceipt, null);
  assert.equal(summary.abaExcluded, false);
  assert.equal(summary.releaseIdentity, "legacy-v13");
  assert.equal(summary.targetSchema, 13);
  assert.equal(summary.migrationId, null);
});

test(
  "CLI rejects operands and visible NODE_OPTIONS without detail leakage",
  () => {
    const operand = spawnSync(process.execPath, [CLI, "unexpected"], {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnv()
    });
    assert.equal(operand.status, 1);
    assert.equal(operand.stdout, "");
    assert.equal(
      operand.stderr,
      "FOUR_SYSTEM_CURRENT_STATUS_OBSERVATION_CHILD_V2_5_FAILED"
        + " CLI_ARGUMENTS_REJECTED\n"
    );
    const env = cleanEnv();
    env.NODE_OPTIONS = "--trace-warnings";
    const preload = spawnSync(process.execPath, [CLI], {
      cwd: ROOT,
      encoding: "utf8",
      env
    });
    assert.equal(preload.status, 1);
    assert.equal(preload.stdout, "");
    assert.equal(preload.stderr, PRELOAD_FAILURE);
  }
);

test(
  "CLI fails closed when malicious --import poisons String.prototype.toLowerCase",
  () => {
    const malicious =
      "data:text/javascript,"
      + "String.prototype.toLowerCase%3D()%3D%3E%22poisoned%22";
    const run = spawnSync(
      process.execPath,
      ["--import", malicious, CLI],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: cleanEnv()
      }
    );
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, PRELOAD_FAILURE);
  }
);

test(
  "CLI fails closed when malicious --import rewrites process.argv[1] to x",
  () => {
    const malicious =
      "data:text/javascript,"
      + "process.argv%5B1%5D%3D%22x%22";
    const run = spawnSync(
      process.execPath,
      ["--import", malicious, CLI],
      {
        cwd: ROOT,
        encoding: "utf8",
        env: cleanEnv()
      }
    );
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, "");
    assert.equal(run.stderr, PRELOAD_FAILURE);
  }
);

test("importing the CLI is side-effect free without visible preloads", () => {
  const code =
    "await import("
    + JSON.stringify(pathToFileURL(CLI).href)
    + '); process.stdout.write("IMPORTED\\n");';
  const run = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", code],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: cleanEnv()
    }
  );
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, "");
  assert.equal(run.stdout, "IMPORTED\n");
});
