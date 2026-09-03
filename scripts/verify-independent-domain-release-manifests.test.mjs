import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import { test } from "node:test";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS,
  buildCurrentIndependentDomainManifest,
  canonicalStringifyIndependentDomainManifest,
  computeIndependentDomainManifestDigest,
  independentDomainManifestTestOnly,
  isVerifiedIndependentDomainManifestFullLoad,
  loadIndependentDomainManifest,
  parseIndependentDomainManifestJsonBytes,
  readIndependentDomainManifest,
  verifyAllIndependentDomainManifests,
  verifyIndependentDomainManifest
} from "./independent-domain-release-manifest-lib.mjs";

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function current(definitionInput) {
  return readIndependentDomainManifest(workspaceRoot, definitionInput);
}

async function expectMismatch(definitionInput, candidate) {
  await assert.rejects(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, candidate),
    /manifest 与当前隔离工程闭包或失败关闭账不一致/u
  );
}

async function expectCode(promise, expectedCode) {
  await assert.rejects(promise, (error) => {
    assert.equal(error?.code, expectedCode);
    return true;
  });
}

function expectThrowCode(callback, expectedCode) {
  assert.throws(callback, (error) => {
    assert.equal(error?.code, expectedCode);
    return true;
  });
}

function assertRecursivelyFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true);
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (Object.hasOwn(descriptor, "value")) assertRecursivelyFrozen(descriptor.value, seen);
  }
}

async function withTemporaryWorkspace(callback) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-independent-manifest-"));
  try {
    return await callback(temporaryRoot);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function copyDefinitionFixture(temporaryRoot, definitionInput) {
  const copied = new Set();
  for (const component of definitionInput.components) {
    for (const relativePath of component.files) {
      if (copied.has(relativePath)) continue;
      copied.add(relativePath);
      const destination = path.join(temporaryRoot, ...relativePath.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      await copyFile(path.join(workspaceRoot, ...relativePath.split("/")), destination);
    }
  }
  const manifestDestination = path.join(
    temporaryRoot,
    ...definitionInput.manifestPath.split("/")
  );
  await mkdir(path.dirname(manifestDestination), { recursive: true });
  await copyFile(
    path.join(workspaceRoot, ...definitionInput.manifestPath.split("/")),
    manifestDestination
  );
  if (definitionInput.predecessor !== undefined) {
    const predecessorDestination = path.join(
      temporaryRoot,
      ...definitionInput.predecessor.path.split("/")
    );
    await mkdir(path.dirname(predecessorDestination), { recursive: true });
    await copyFile(
      path.join(workspaceRoot, ...definitionInput.predecessor.path.split("/")),
      predecessorDestination
    );
  }
}

function installTargetedArrayIteratorRedirects(redirections, counters) {
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator
  );
  assert.ok(iteratorDescriptor);
  Object.defineProperty(Array.prototype, Symbol.iterator, {
    configurable: iteratorDescriptor.configurable,
    enumerable: iteratorDescriptor.enumerable,
    get() {
      for (let redirectIndex = 0; redirectIndex < redirections.length; redirectIndex += 1) {
        const redirect = redirections[redirectIndex];
        if (this.length !== redirect.requestedParts.length) continue;
        let matches = true;
        for (let partIndex = 0; partIndex < this.length; partIndex += 1) {
          if (this[partIndex] !== redirect.requestedParts[partIndex]) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
        counters.getterCalls += 1;
        return function poisonedIterator() {
          let nextIndex = 0;
          return {
            next() {
              counters.nextCalls += 1;
              if (nextIndex >= redirect.alternateParts.length) return { done: true };
              const value = redirect.alternateParts[nextIndex];
              nextIndex += 1;
              return { done: false, value };
            }
          };
        };
      }
      return iteratorDescriptor.value;
    }
  });
  return () => {
    Object.defineProperty(Array.prototype, Symbol.iterator, iteratorDescriptor);
  };
}

test("ziwei and western manifests exactly bind their separate current engineering closures", async () => {
  assert.deepEqual(
    INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.map((entry) => entry.productSystemId),
    ["ziwei-doushu", "western-astrology"]
  );
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);
    const expected = await buildCurrentIndependentDomainManifest(workspaceRoot, definitionInput, {
      createdAt: manifest.createdAt
    });
    assert.equal(
      canonicalStringifyIndependentDomainManifest(manifest),
      canonicalStringifyIndependentDomainManifest(expected)
    );
    await verifyIndependentDomainManifest(workspaceRoot, definitionInput, manifest);
  }
});

test("Ziwei v2 preserves its predecessor and separates the project default from its schema-less draft", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  const manifest = await current(definitionInput);
  assert.equal(definitionInput.manifestPath,
    "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v2.json");
  assert.equal(manifest.schemaVersion, "2.0.0");
  assert.equal(manifest.recordType, "system_domain_release_manifest_current_machine_identity");
  assert.equal(manifest.manifestId,
    "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0");
  assert.equal(manifest.releaseGovernance.releaseIdentity, null);
  assert.equal(manifest.releaseGovernance.targetSchema, null);
  assert.equal(manifest.releaseGovernance.migrationId, null);
  assert.deepEqual(manifest.projectDefaultReleaseGovernance, {
    releaseIdentity: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    inheritedByThisSystem: false
  });
  assert.equal(manifest.lineage.predecessor.path,
    "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json");
  assert.equal(manifest.lineage.predecessorPreservedUnmodified, true);
  assert.equal(manifest.lineage.predecessorCurrent, false);
  assert.equal(manifest.lineage.centralSystemAdmissionRegistryIntegrated, false);
  assert.equal(manifest.lineage.crossSystemEngineeringReceiptRegistryIntegrated, false);
  assert.equal(manifest.lineage.mainApplicationIntegrated, false);
  assert.equal(manifest.snapshotBoundary.crossFileAtomicSnapshot, false);
  assert.equal(manifest.snapshotBoundary.mutationEpochAvailable, false);
  assert.equal(manifest.snapshotBoundary.mutationEpochReceipt, null);
  assert.equal(manifest.snapshotBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(manifest.snapshotBoundary.abaExcluded, false);
  assert.equal(manifest.authorityBoundary.releaseReady, false);
  assert.equal(manifest.authorityBoundary.publicReleaseAuthorized, false);

  const persisted = await readFile(path.resolve(
    workspaceRoot,
    ...definitionInput.manifestPath.split("/")
  ));
  assert.equal(persisted.byteLength, definitionInput.persistedRawIdentity.rawBytes);
  assert.equal(createHash("sha256").update(persisted).digest("hex"),
    definitionInput.persistedRawIdentity.rawSha256);
  assert.equal(manifest.manifestDigest, definitionInput.persistedRawIdentity.manifestDigest);
});

test("Ziwei v2 binds current source rights and high-risk children without promoting their gates", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  const manifest = await current(definitionInput);
  const byId = new Map(manifest.components.map((entry) => [entry.componentId, entry]));
  for (const relativePath of [
    "content/system-admission/ziwei-hko-calendar-public-endpoint-observation.v1.json",
    "content/system-admission/ziwei-hko-restricted-source-pre-release-policy.v1.json"
  ]) {
    assert.equal(byId.get("source_bundle").files.some((entry) => entry.path === relativePath), true);
  }
  assert.equal(byId.get("rights_bundle").files.some(
    (entry) => entry.path === "content/system-admission/ziwei-iztro-build-notice-evidence.v1.json"
  ), true);
  for (const relativePath of [
    "content/system-admission/ziwei-high-risk-expression-policy-draft.v0.1.0.json",
    "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-policy.ts",
    "packages/ziwei-iztro-adapter-draft/src/browser-preview/high-risk-expression-egress-view.ts"
  ]) {
    assert.equal(byId.get("high_risk_policy").files.some((entry) => entry.path === relativePath), true);
  }
  assert.equal(manifest.gateState.bindingRequired, 27);
  assert.equal(manifest.gateState.bindingFrozenVerified, 0);
  assert.equal(manifest.gateState.formalKnowledgeDocuments, 0);
  assert.equal(manifest.gateState.formalSourceRightsRecords, 0);
  assert.equal(manifest.gateState.formalSourceCarrierRecords, 0);
  assert.equal(manifest.gateState.hkoRawSourceBodiesStoredPendingRightsReview, 6);
  assert.equal(manifest.gateState.freshRestrictedSourcePreReleaseCheckRequired, true);
  assert.equal(manifest.gateState.historicalRestrictedSourcePassMaySatisfy, false);
  assert.equal(manifest.gateState.restrictedSourcePointInTimePassPersisted, false);
  assert.equal(manifest.gateState.highRiskPolicySourceIdentityBound, true);
  assert.equal(manifest.gateState.registeredHighRiskEgressSurfaces, 16);
  assert.equal(manifest.gateState.candidateCallSitesWiredToGate, false);
  assert.equal(manifest.gateState.semanticCoverageComplete, false);
  assert.equal(manifest.gateState.formalAdmissionPromotionBlocked, true);
  assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
});

test("Ziwei v2 raw identity and predecessor drift fail closed independently", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  await withTemporaryWorkspace(async (temporaryRoot) => {
    await copyDefinitionFixture(temporaryRoot, definitionInput);
    const manifestPath = path.join(temporaryRoot, ...definitionInput.manifestPath.split("/"));
    const manifestBytes = await readFile(manifestPath);
    await writeFile(manifestPath, Buffer.concat([manifestBytes, Buffer.from("\n")]));
    await expectCode(
      readIndependentDomainManifest(temporaryRoot, definitionInput),
      "PERSISTED_RAW_DRIFT"
    );
  });
  await withTemporaryWorkspace(async (temporaryRoot) => {
    await copyDefinitionFixture(temporaryRoot, definitionInput);
    const predecessorPath = path.join(
      temporaryRoot,
      ...definitionInput.predecessor.path.split("/")
    );
    const predecessorBytes = await readFile(predecessorPath);
    await writeFile(predecessorPath, Buffer.concat([predecessorBytes, Buffer.from("\n")]));
    await expectCode(
      buildCurrentIndependentDomainManifest(temporaryRoot, definitionInput, {
        createdAt: "2026-08-31T06:00:00.000Z"
      }),
      "PREDECESSOR_DRIFT"
    );
  });
});

test("Ziwei v2 rejects self-resealed inheritance cleanup admission and authority promotions", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.find(
    (entry) => entry.productSystemId === "ziwei-doushu"
  );
  assert.ok(definitionInput);
  const manifest = await current(definitionInput);
  const mutations = [
    (value) => { value.projectDefaultReleaseGovernance.targetSchema = 14; },
    (value) => { value.projectDefaultReleaseGovernance.inheritedByThisSystem = true; },
    (value) => { value.releaseGovernance.releaseIdentity = "legacy-v13"; },
    (value) => { value.gateState.formalSourceRightsRecords = 1; },
    (value) => { value.gateState.formalSourceCarrierRecords = 1; },
    (value) => { value.gateState.hkoRawSourceBodiesStoredPendingRightsReview = 0; },
    (value) => { value.gateState.historicalRestrictedSourcePassMaySatisfy = true; },
    (value) => { value.gateState.restrictedSourcePointInTimePassPersisted = true; },
    (value) => { value.gateState.highRiskPolicyBound = true; },
    (value) => { value.gateState.candidateCallSitesWiredToGate = true; },
    (value) => { value.gateState.semanticCoverageComplete = true; },
    (value) => { value.lineage.centralSystemAdmissionRegistryIntegrated = true; },
    (value) => { value.lineage.mainApplicationIntegrated = true; },
    (value) => { value.snapshotBoundary.crossFileAtomicSnapshot = true; },
    (value) => { value.snapshotBoundary.mutationEpochAvailable = true; },
    (value) => { value.authorityBoundary.releaseReady = true; },
    (value) => { value.authorityBoundary.publicReleaseAuthorized = true; }
  ];
  for (const mutate of mutations) {
    const candidate = clone(manifest);
    mutate(candidate);
    candidate.manifestDigest = computeIndependentDomainManifestDigest(candidate);
    await expectMismatch(definitionInput, candidate);
  }
});

test("both independent products remain schema-less drafts with exact unbound source inventories and no expert instance", async () => {
  const expectedBindingCounts = new Map([
    ["ziwei-doushu", 27],
    ["western-astrology", 28]
  ]);
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);
    assert.equal(manifest.releaseStatus, "draft");
    assert.equal(manifest.releaseGovernance.targetSchema, null);
    assert.equal(manifest.releaseGovernance.migrationId, null);
    assert.equal(
      manifest.gateState.bindingRequired,
      expectedBindingCounts.get(definitionInput.productSystemId)
    );
    assert.equal(manifest.gateState.bindingFrozenVerified, 0);
    assert.equal(manifest.gateState.independentExpertReviewsVerified, 0);
    assert.equal(manifest.gateState.releaseEvidenceComplete, false);
  }
});

test("only the Ziwei incomplete source bundle binds the current HKO candidate and governed source context", async () => {
  const definitions = new Map(
    INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS.map((entry) => [entry.productSystemId, entry])
  );
  const ziwei = definitions.get("ziwei-doushu");
  const western = definitions.get("western-astrology");
  assert.ok(ziwei);
  assert.ok(western);

  const ziweiSource = ziwei.components.find((entry) => entry.componentId === "source_bundle");
  const westernSource = western.components.find((entry) => entry.componentId === "source_bundle");
  assert.ok(ziweiSource);
  assert.ok(westernSource);
  assert.equal(ziweiSource.status, "incomplete");
  assert.equal(westernSource.status, "incomplete");
  assert.equal(
    ziweiSource.version,
    "source-binding-requirements-plus-hko-calendar-candidate/1.1.0"
  );

  const hkoFiles = [
    "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json",
    "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json",
    "packages/ziwei-iztro-adapter-draft/fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json",
    "packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.ts",
    "scripts/verify-ziwei-hko-calendar-source-evidence.mjs",
    "scripts/ziwei-hko-calendar-source-evidence-lib.mjs"
  ];
  for (const relativePath of hkoFiles) {
    assert.equal(ziweiSource.files.includes(relativePath), true, relativePath);
    assert.equal(westernSource.files.includes(relativePath), false, relativePath);
  }
});

test("bazi authority and default Schema 13 cannot be inherited by isolated systems", async () => {
  const mutations = [
    (value) => { value.releaseGovernance.targetSchema = 13; },
    (value) => { value.releaseGovernance.releaseIdentity = "legacy-v13"; },
    (value) => { value.evidenceLedger.contentTruth = "inherited_from_bazi"; },
    (value) => { value.releaseStatus = "engineering_candidate"; }
  ];
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);
    for (const mutate of mutations) {
      const candidate = clone(manifest);
      mutate(candidate);
      await expectMismatch(definitionInput, candidate);
    }
  }
});

test("exact binding totals, source rights and expert gates cannot be fabricated as complete", async () => {
  const mutations = [
    (value) => { value.gateState.bindingRequired = 0; },
    (value) => { value.gateState.bindingRequired += 1; },
    (value) => { value.gateState.bindingFrozenVerified = 1; },
    (value) => { value.gateState.sourceBundleComplete = true; },
    (value) => { value.gateState.rightsBundleComplete = true; },
    (value) => { value.gateState.expertReviewBundleComplete = true; },
    (value) => { value.gateState.independentExpertReviewsVerified = 2; },
    (value) => { value.releaseGovernance.expertClaimsAuthorized = true; },
    (value) => { value.releaseGovernance.publicDeploymentAuthorized = true; }
  ];
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);
    for (const mutate of mutations) {
      const candidate = clone(manifest);
      mutate(candidate);
      await expectMismatch(definitionInput, candidate);
    }
  }
});

test("component drift, component promotion and unknown fields fail closed", async () => {
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);

    const digestDrift = clone(manifest);
    digestDrift.components[0].files[0].sha256 = "0".repeat(64);
    await expectMismatch(definitionInput, digestDrift);

    const rightsPromotion = clone(manifest);
    rightsPromotion.components.find((entry) => entry.componentId === "rights_bundle").status = "bound";
    await expectMismatch(definitionInput, rightsPromotion);

    const sourcePromotion = clone(manifest);
    sourcePromotion.components.find((entry) => entry.componentId === "source_bundle").status = "bound";
    await expectMismatch(definitionInput, sourcePromotion);

    if (definitionInput.productSystemId === "ziwei-doushu") {
      const missingHkoChild = clone(manifest);
      const sourceBundle = missingHkoChild.components.find((entry) => entry.componentId === "source_bundle");
      sourceBundle.files = sourceBundle.files.filter(
        (entry) => entry.path !== "content/system-admission/ziwei-hko-calendar-source-evidence.v1.json"
      );
      await expectMismatch(definitionInput, missingHkoChild);
    }

    const unknown = clone(manifest);
    unknown.formalAdmissionAuthorized = true;
    await expectMismatch(definitionInput, unknown);
  }
});

test("strict manifest JSON bytes reject BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("{}", "utf8")])
    ),
    "JSON_BOM_FORBIDDEN"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(Uint8Array.from([0xc3, 0x28])),
    "JSON_UTF8_INVALID"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(
      Buffer.from('{"x":1,"\\u0078":2}', "utf8")
    ),
    "JSON_DUPLICATE_KEY"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(Buffer.from("[]", "utf8")),
    "JSON_INVALID"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(Buffer.from('{"x":-0}', "utf8")),
    "INPUT_VALUE_INVALID"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(Buffer.from('{"x":1e400}', "utf8")),
    "INPUT_VALUE_INVALID"
  );
  expectThrowCode(
    () => parseIndependentDomainManifestJsonBytes(Buffer.from("{}", "utf8"), "tiny", 1),
    "JSON_TOO_LARGE"
  );
  const source = Buffer.from('{"draft":true}', "utf8");
  const parsed = parseIndependentDomainManifestJsonBytes(source);
  source.fill(0);
  assert.deepEqual(parsed, { draft: true });
  assertRecursivelyFrozen(parsed);
});

test("strict UTF-8 decoding resists TextDecoder prototype replacement after module load", () => {
  const decodeDescriptor = Object.getOwnPropertyDescriptor(TextDecoder.prototype, "decode");
  assert.ok(decodeDescriptor);
  try {
    Object.defineProperty(TextDecoder.prototype, "decode", {
      ...decodeDescriptor,
      value() {
        return '{"draft":true}';
      }
    });
    expectThrowCode(
      () => parseIndependentDomainManifestJsonBytes(Uint8Array.from([0xc3, 0x28])),
      "JSON_UTF8_INVALID"
    );
  } finally {
    Object.defineProperty(TextDecoder.prototype, "decode", decodeDescriptor);
  }
});

test("createdAt requires a real canonical millisecond UTC instant", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const manifest = await current(definitionInput);
  for (const invalidCreatedAt of [
    "2026-99-99T99:99:99.999Z",
    "2025-02-29T04:00:00.000Z",
    "2026-08-26T04:00:00Z"
  ]) {
    const candidate = clone(manifest);
    candidate.createdAt = invalidCreatedAt;
    candidate.manifestDigest = computeIndependentDomainManifestDigest(candidate);
    await expectCode(
      verifyIndependentDomainManifest(workspaceRoot, definitionInput, candidate),
      "MANIFEST_INVALID"
    );
    await expectCode(
      buildCurrentIndependentDomainManifest(workspaceRoot, definitionInput, {
        createdAt: invalidCreatedAt
      }),
      "BUILD_OPTIONS_INVALID"
    );
  }
});

test("object verification rejects an accessor without invoking it", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const candidate = clone(await current(definitionInput));
  const originalCreatedAt = candidate.createdAt;
  let getterCalls = 0;
  Object.defineProperty(candidate, "createdAt", {
    enumerable: true,
    configurable: true,
    get() {
      getterCalls += 1;
      return originalCreatedAt;
    }
  });
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, candidate),
    "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(getterCalls, 0);
});

test("object verification rejects Proxy without invoking traps", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const candidate = clone(await current(definitionInput));
  let trapCalls = 0;
  const proxy = new Proxy(candidate, {
    get() {
      trapCalls += 1;
      throw new Error("get trap must stay unreachable");
    },
    getOwnPropertyDescriptor() {
      trapCalls += 1;
      throw new Error("descriptor trap must stay unreachable");
    },
    getPrototypeOf() {
      trapCalls += 1;
      throw new Error("prototype trap must stay unreachable");
    },
    ownKeys() {
      trapCalls += 1;
      throw new Error("ownKeys trap must stay unreachable");
    }
  });
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, proxy),
    "INPUT_PROXY_FORBIDDEN"
  );
  assert.equal(trapCalls, 0);
});

test("object verification rejects Symbol sparse cycle alias and negative zero inputs", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const manifest = await current(definitionInput);

  const withSymbol = clone(manifest);
  withSymbol[Symbol("authority")] = true;
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, withSymbol),
    "INPUT_SYMBOL_FORBIDDEN"
  );

  const sparse = clone(manifest);
  sparse.components = new Array(sparse.components.length);
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, sparse),
    "INPUT_ARRAY_INVALID"
  );

  const cyclic = clone(manifest);
  cyclic.self = cyclic;
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, cyclic),
    "INPUT_CYCLE_FORBIDDEN"
  );

  const aliased = clone(manifest);
  aliased.alias = aliased.releaseGovernance;
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, aliased),
    "INPUT_ALIAS_FORBIDDEN"
  );

  const negativeZero = clone(manifest);
  negativeZero.gateState.bindingFrozenVerified = -0;
  await expectCode(
    verifyIndependentDomainManifest(workspaceRoot, definitionInput, negativeZero),
    "INPUT_VALUE_INVALID"
  );
});

test("pure verification returns a detached recursively frozen but unbranded snapshot", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const caller = clone(await current(definitionInput));
  const result = await verifyIndependentDomainManifest(workspaceRoot, definitionInput, caller);

  assert.notStrictEqual(result.manifest, caller);
  assert.notStrictEqual(result.manifest.releaseGovernance, caller.releaseGovernance);
  assertRecursivelyFrozen(result);
  assert.equal(isVerifiedIndependentDomainManifestFullLoad(result), false);
  caller.releaseGovernance.publicDeploymentAuthorized = true;
  assert.equal(result.manifest.releaseGovernance.publicDeploymentAuthorized, false);
  assert.throws(
    () => { result.manifest.releaseGovernance.publicDeploymentAuthorized = true; },
    TypeError
  );
  assert.equal(result.authorityBoundary.publicDeploymentAuthorized, false);
  assert.deepEqual(result.observationBoundary, {
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    crossFileAtomicSnapshot: false,
    intervalMutationExcluded: false,
    abaExcluded: false
  });
});

test("full-load APIs return only detached recursively frozen WeakSet-branded snapshots", async () => {
  const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
  const persisted = await current(definitionInput);
  const loaded = await loadIndependentDomainManifest(workspaceRoot, definitionInput);
  assert.equal(loaded.offlineIndependentDraftClosureMechanicallyVerified, true);
  assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
  assert.notStrictEqual(loaded.manifest, persisted);
  assertRecursivelyFrozen(loaded);

  const all = await verifyAllIndependentDomainManifests(workspaceRoot);
  assert.equal(Object.isFrozen(all), true);
  assert.equal(all.length, 2);
  for (const result of all) {
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(result), true);
    assert.equal(result.offlineIndependentDraftClosureMechanicallyVerified, true);
    assertRecursivelyFrozen(result);
  }
  assert.equal(isVerifiedIndependentDomainManifestFullLoad(clone(loaded)), false);
});

test("full-load stays truly recursively frozen when Object.freeze is replaced after module load", async () => {
  const originalFreeze = Object.freeze;
  let loaded;
  try {
    Object.freeze = (value) => value;
    loaded = await loadIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assertRecursivelyFrozen(loaded);
  } finally {
    Object.freeze = originalFreeze;
  }
  assert.throws(
    () => { loaded.manifest.releaseGovernance.publicDeploymentAuthorized = true; },
    TypeError
  );
  assert.equal(loaded.manifest.releaseGovernance.publicDeploymentAuthorized, false);
  assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
});

test("default createdAt resists Date global and toISOString replacement after module load", async () => {
  const originalDate = globalThis.Date;
  const toISOStringDescriptor = Object.getOwnPropertyDescriptor(
    originalDate.prototype,
    "toISOString"
  );
  assert.ok(toISOStringDescriptor);
  try {
    globalThis.Date = class PoisonedDate {
      toISOString() {
        return "2026-99-99T99:99:99.999Z";
      }
    };
    Object.defineProperty(originalDate.prototype, "toISOString", {
      ...toISOStringDescriptor,
      value() {
        return "2026-99-99T99:99:99.999Z";
      }
    });
    const built = await buildCurrentIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.match(built.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
    assert.notEqual(built.createdAt, "2026-99-99T99:99:99.999Z");
  } finally {
    globalThis.Date = originalDate;
    Object.defineProperty(originalDate.prototype, "toISOString", toISOStringDescriptor);
  }
});

test("full-load brand resists WeakSet prototype add and has poisoning after module load", async () => {
  const addDescriptor = Object.getOwnPropertyDescriptor(WeakSet.prototype, "add");
  const hasDescriptor = Object.getOwnPropertyDescriptor(WeakSet.prototype, "has");
  assert.ok(addDescriptor);
  assert.ok(hasDescriptor);
  const forged = { forged: true };
  try {
    Object.defineProperty(WeakSet.prototype, "add", {
      ...addDescriptor,
      value(value) {
        Reflect.apply(addDescriptor.value, this, [value]);
        Reflect.apply(addDescriptor.value, this, [forged]);
        return this;
      }
    });
    const loaded = await loadIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(forged), false);

    Object.defineProperty(WeakSet.prototype, "has", {
      ...hasDescriptor,
      value() {
        return true;
      }
    });
    assert.equal(isVerifiedIndependentDomainManifestFullLoad({ forged: true }), false);
  } finally {
    Object.defineProperty(WeakSet.prototype, "add", addDescriptor);
    Object.defineProperty(WeakSet.prototype, "has", hasDescriptor);
  }
});

test("full-load brand resists Reflect.apply and Boolean replacement after module load", () => {
  const originalReflectApply = Reflect.apply;
  const originalBoolean = globalThis.Boolean;
  try {
    Reflect.apply = () => true;
    globalThis.Boolean = () => true;
    assert.equal(isVerifiedIndependentDomainManifestFullLoad({ forged: true }), false);
  } finally {
    Reflect.apply = originalReflectApply;
    globalThis.Boolean = originalBoolean;
  }
});

test("canonical comparison resists Array sort replacement after module load", async () => {
  const sortDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "sort");
  assert.ok(sortDescriptor);
  let poisonCalls = 0;
  try {
    Object.defineProperty(Array.prototype, "sort", {
      ...sortDescriptor,
      value(compareFunction) {
        for (let index = 0; index < this.length; index += 1) {
          if (this[index] === "manifestDigest") {
            poisonCalls += 1;
            return [];
          }
        }
        return Reflect.apply(sortDescriptor.value, this, [compareFunction]);
      }
    });
    const loaded = await loadIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assert.equal(poisonCalls, 0);
  } finally {
    Object.defineProperty(Array.prototype, "sort", sortDescriptor);
  }
});

test("canonical comparison resists Array iterator replacement after module load", async () => {
  const iteratorDescriptor = Object.getOwnPropertyDescriptor(
    Array.prototype,
    Symbol.iterator
  );
  assert.ok(iteratorDescriptor);
  let poisonCalls = 0;
  try {
    Object.defineProperty(Array.prototype, Symbol.iterator, {
      ...iteratorDescriptor,
      value() {
        for (let index = 0; index < this.length; index += 1) {
          if (this[index] === "manifestDigest") {
            poisonCalls += 1;
            return Reflect.apply(iteratorDescriptor.value, [], []);
          }
        }
        return Reflect.apply(iteratorDescriptor.value, this, []);
      }
    });
    const loaded = await loadIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assert.equal(poisonCalls, 0);
  } finally {
    Object.defineProperty(Array.prototype, Symbol.iterator, iteratorDescriptor);
  }
});

test("canonical comparison isolates inherited Object and Array toJSON hooks", async () => {
  const objectToJsonDescriptor = Object.getOwnPropertyDescriptor(Object.prototype, "toJSON");
  const arrayToJsonDescriptor = Object.getOwnPropertyDescriptor(Array.prototype, "toJSON");
  let poisonCalls = 0;
  try {
    Object.defineProperty(Object.prototype, "toJSON", {
      value() {
        poisonCalls += 1;
        return {};
      },
      configurable: true,
      enumerable: false,
      writable: true
    });
    Object.defineProperty(Array.prototype, "toJSON", {
      value() {
        poisonCalls += 1;
        return [];
      },
      configurable: true,
      enumerable: false,
      writable: true
    });
    const loaded = await loadIndependentDomainManifest(
      workspaceRoot,
      INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0]
    );
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assert.equal(poisonCalls, 0);
  } finally {
    if (objectToJsonDescriptor) {
      Object.defineProperty(Object.prototype, "toJSON", objectToJsonDescriptor);
    } else {
      delete Object.prototype.toJSON;
    }
    if (arrayToJsonDescriptor) {
      Object.defineProperty(Array.prototype, "toJSON", arrayToJsonDescriptor);
    } else {
      delete Array.prototype.toJSON;
    }
  }
});

test("mutation epoch atomic interval and ABA proof fields cannot be injected through the object API", async () => {
  const mutations = [
    (value) => { value.releaseGovernance.mutationEpochBoundary = "proved"; },
    (value) => { value.releaseGovernance.mutationEpochReceipt = { digest: "0".repeat(64) }; },
    (value) => { value.releaseGovernance.crossFileAtomicSnapshot = true; },
    (value) => { value.releaseGovernance.intervalMutationExcluded = true; },
    (value) => { value.releaseGovernance.abaExcluded = true; },
    (value) => {
      value.observationBoundary = {
        mutationEpochAvailable: true,
        mutationEpochReceipt: "forged",
        crossFileAtomicSnapshot: true,
        intervalMutationExcluded: true,
        abaExcluded: true
      };
    }
  ];
  for (const definitionInput of INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS) {
    const manifest = await current(definitionInput);
    for (const mutate of mutations) {
      const candidate = clone(manifest);
      mutate(candidate);
      await expectMismatch(definitionInput, candidate);
    }
  }
});

test("held-handle reader returns same-buffer bytes and rejects unsafe paths and hard links", async () => {
  await withTemporaryWorkspace(async (temporaryRoot) => {
    const directory = path.join(temporaryRoot, "artifacts");
    await mkdir(directory, { recursive: true });
    const first = path.join(directory, "first.json");
    const second = path.join(directory, "second.json");
    await writeFile(first, '{"draft":true}', "utf8");
    const snapshot = await independentDomainManifestTestOnly.readStableWorkspaceFile(
      temporaryRoot,
      "artifacts/first.json",
      1024
    );
    assert.equal(Buffer.from(snapshot.bytes).toString("utf8"), '{"draft":true}');
    assert.equal(snapshot.rawBytes, 14);
    assert.match(snapshot.rawSha256, /^[a-f0-9]{64}$/u);

    await expectCode(
      independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "artifacts/first.json:ads",
        1024
      ),
      "UNSAFE_COMPONENT_PATH"
    );

    await link(first, second);
    await expectCode(
      independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "artifacts/first.json",
        1024
      ),
      "HARDLINK_REJECTED"
    );
  });
});

test("held-handle reader never consults a targeted Array iterator redirect", async () => {
  await withTemporaryWorkspace(async (temporaryRoot) => {
    const directory = path.join(temporaryRoot, "data");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "requested.bin"), "REQUESTED", "utf8");
    await writeFile(path.join(directory, "alternate.bin"), "ALTERNATE", "utf8");
    const counters = { getterCalls: 0, nextCalls: 0 };
    const restore = installTargetedArrayIteratorRedirects([
      {
        requestedParts: ["data", "requested.bin"],
        alternateParts: ["data", "alternate.bin"]
      }
    ], counters);
    let snapshot;
    try {
      snapshot = await independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "data/requested.bin",
        1024
      );
    } finally {
      restore();
    }
    assert.equal(Buffer.from(snapshot.bytes).toString("utf8"), "REQUESTED");
    assert.equal(counters.getterCalls, 0);
    assert.equal(counters.nextCalls, 0);
  });
});

test("full-load cannot brand a manifest and component closure redirected by Array iterator", async () => {
  await withTemporaryWorkspace(async (temporaryRoot) => {
    const definitionInput = INDEPENDENT_DOMAIN_MANIFEST_DEFINITIONS[0];
    await copyDefinitionFixture(temporaryRoot, definitionInput);
    const official = await readIndependentDomainManifest(temporaryRoot, definitionInput);
    const targetPath = "packages/ziwei-doushu-contracts-draft/src/index.ts";
    const alternateTargetPath =
      "packages/ziwei-doushu-contracts-draft/src/index.iterator-alternate.ts";
    const targetAbsolute = path.join(temporaryRoot, ...targetPath.split("/"));
    const alternateTargetAbsolute = path.join(
      temporaryRoot,
      ...alternateTargetPath.split("/")
    );
    const originalBytes = await readFile(targetAbsolute);
    const alternateBytes = Buffer.concat([
      originalBytes,
      Buffer.from("\n// iterator redirect alternate\n", "utf8")
    ]);
    await writeFile(alternateTargetAbsolute, alternateBytes);
    await writeFile(targetAbsolute, alternateBytes);
    let alternateManifest;
    try {
      alternateManifest = await buildCurrentIndependentDomainManifest(
        temporaryRoot,
        definitionInput,
        { createdAt: official.createdAt }
      );
    } finally {
      await writeFile(targetAbsolute, originalBytes);
    }
    assert.notEqual(alternateManifest.manifestDigest, official.manifestDigest);
    const alternateManifestPath =
      "content/domain-release/ziwei-doushu.engineering-draft.iterator-alternate.json";
    await writeFile(
      path.join(temporaryRoot, ...alternateManifestPath.split("/")),
      `${JSON.stringify(alternateManifest, null, 2)}\n`,
      "utf8"
    );

    const counters = { getterCalls: 0, nextCalls: 0 };
    const restore = installTargetedArrayIteratorRedirects([
      {
        requestedParts: definitionInput.manifestPath.split("/"),
        alternateParts: alternateManifestPath.split("/")
      },
      {
        requestedParts: targetPath.split("/"),
        alternateParts: alternateTargetPath.split("/")
      }
    ], counters);
    let loaded;
    try {
      loaded = await loadIndependentDomainManifest(temporaryRoot, definitionInput);
    } finally {
      restore();
    }
    assert.equal(isVerifiedIndependentDomainManifestFullLoad(loaded), true);
    assert.equal(loaded.manifestDigest, official.manifestDigest);
    assert.notEqual(loaded.manifestDigest, alternateManifest.manifestDigest);
    assert.equal(counters.getterCalls, 0);
    assert.equal(counters.nextCalls, 0);
  });
});

test("held-handle reader resists Buffer subarray replacement after module load", async () => {
  const subarrayDescriptor = Object.getOwnPropertyDescriptor(Buffer.prototype, "subarray");
  assert.ok(subarrayDescriptor);
  let poisonCalls = 0;
  try {
    Object.defineProperty(Buffer.prototype, "subarray", {
      ...subarrayDescriptor,
      value(start, end) {
        if (this.byteLength === 1025 && start === 0 && end === 14) {
          poisonCalls += 1;
          return Buffer.from('{"forged":true}', "utf8");
        }
        return Reflect.apply(subarrayDescriptor.value, this, [start, end]);
      }
    });
    await withTemporaryWorkspace(async (temporaryRoot) => {
      await mkdir(path.join(temporaryRoot, "artifacts"), { recursive: true });
      await writeFile(
        path.join(temporaryRoot, "artifacts", "manifest.json"),
        '{"draft":true}',
        "utf8"
      );
      const snapshot = await independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "artifacts/manifest.json",
        1024
      );
      assert.equal(Buffer.from(snapshot.bytes).toString("utf8"), '{"draft":true}');
    });
    assert.equal(poisonCalls, 0);
  } finally {
    Object.defineProperty(Buffer.prototype, "subarray", subarrayDescriptor);
  }
});

test("held-handle reader detects endpoint replacement during the read interval", async () => {
  await withTemporaryWorkspace(async (temporaryRoot) => {
    const directory = path.join(temporaryRoot, "artifacts");
    await mkdir(directory, { recursive: true });
    const endpoint = path.join(directory, "manifest.json");
    const displaced = path.join(directory, "manifest.displaced.json");
    await writeFile(endpoint, '{"draft":true}', "utf8");
    await expectCode(
      independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "artifacts/manifest.json",
        1024,
        {
          async afterOpenBeforeRead() {
            await rename(endpoint, displaced);
            await writeFile(endpoint, '{"draft":false}', "utf8");
          }
        }
      ),
      "ENDPOINT_CHANGED"
    );
  });
});

test("held-handle reader rejects a linked directory chain", async (t) => {
  await withTemporaryWorkspace(async (temporaryRoot) => {
    const realDirectory = path.join(temporaryRoot, "real");
    const linkedDirectory = path.join(temporaryRoot, "linked");
    await mkdir(realDirectory, { recursive: true });
    await writeFile(path.join(realDirectory, "manifest.json"), '{"draft":true}', "utf8");
    try {
      await symlink(realDirectory, linkedDirectory, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) {
        t.skip(`directory link creation unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    await expectCode(
      independentDomainManifestTestOnly.readStableWorkspaceFile(
        temporaryRoot,
        "linked/manifest.json",
        1024
      ),
      "DIRECTORY_CHAIN_INVALID"
    );
  });
});

test("CLI emits calibrated offline draft closure and explicit all-false authority and observation boundaries", async () => {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [path.join(workspaceRoot, "scripts", "verify-independent-domain-release-manifests.mjs")],
    { cwd: workspaceRoot, windowsHide: true }
  );
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.offlineIndependentDraftClosureMechanicallyVerified, true);
  for (const field of [
    "formalAdmissionAuthorized",
    "domainAuthorityAuthorized",
    "expertClaimsAuthorized",
    "publicDeploymentAuthorized",
    "releaseReady",
    "publicReleaseAuthorized",
    "mutationEpochAvailable",
    "crossFileAtomicSnapshot",
    "intervalMutationExcluded",
    "abaExcluded"
  ]) {
    assert.equal(output[field], false, field);
  }
  assert.equal(output.mutationEpochReceipt, null);
  assert.deepEqual(output.manifests.map((entry) => entry.productSystemId), [
    "ziwei-doushu",
    "western-astrology"
  ]);
  const ziwei = output.manifests.find((entry) => entry.productSystemId === "ziwei-doushu");
  assert.ok(ziwei);
  assert.equal(ziwei.manifestId,
    "hakimi.ziwei-doushu.isolated-engineering-domain-release-manifest/2.0.0");
  assert.equal(ziwei.manifestSchemaVersion, "2.0.0");
  assert.equal(ziwei.releaseIdentity, null);
  assert.equal(ziwei.artifact.rawBytes, 17968);
  assert.equal(ziwei.artifact.rawSha256,
    "f886e95815109d670b65628db403a2fb86e69e5af4088466de1330a15695a867");
  for (const manifest of output.manifests) {
    assert.equal(manifest.releaseStatus, "draft");
    assert.equal(manifest.targetSchema, null);
    assert.equal(manifest.migrationId, null);
    assert.equal(manifest.bindingFrozenVerified, 0);
    assert.equal(manifest.independentExpertReviewsVerified, 0);
    assert.equal(manifest.expertClaimsAuthorized, false);
    assert.equal(manifest.publicDeploymentAuthorized, false);
    assert.equal(manifest.sourceBundleComplete, false);
    assert.equal(manifest.rightsBundleComplete, false);
    assert.equal(manifest.expertReviewBundleComplete, false);
    assert.equal(manifest.releaseEvidenceComplete, false);
  }
});
