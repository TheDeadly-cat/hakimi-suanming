import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  copyFile,
  link,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  VedicSourceBindingAndThreeLayerRightsRequirementsError,
  buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements,
  canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements,
  canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements,
  computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest,
  parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes,
  readVedicSourceBindingAndThreeLayerRightsRequirements,
  vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly,
  verifyVedicSourceBindingAndThreeLayerRightsRequirements
} from "./vedic-source-binding-and-three-layer-rights-requirements-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-vedic-source-binding-and-three-layer-rights-requirements.mjs"
);
const closurePaths = Object.freeze([
  VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH,
  ...vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.CHAIN_ORDER
]);
const expectedStatus =
  "requirements_only_current_scoped_inventory_38_all_unbound_open_universe_no_sources_bodies_quotes_bindings_or_three_layer_rights_established";
const expectedDigest = "b98699c70e9783ef670c6acfbb0410e0ff89eca51db54dd4b36b44e60d33194e";
const expectedRawSha256 = "2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function collectDataObjectGraph(root) {
  const objects = new Set();
  const stack = [root];
  while (stack.length > 0) {
    const value = stack.pop();
    if (value === null || typeof value !== "object" || objects.has(value)) continue;
    objects.add(value);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
      if (Object.hasOwn(descriptor, "value")) stack.push(descriptor.value);
    }
  }
  return objects;
}

function assertFullyFrozenAndDetached(input, result) {
  const inputObjects = collectDataObjectGraph(input);
  const resultObjects = collectDataObjectGraph(result);
  for (const value of resultObjects) {
    assert.equal(Object.isFrozen(value), true);
    assert.equal(inputObjects.has(value), false);
  }
  for (const value of inputObjects) assert.equal(Object.isFrozen(value), false);
}

function resign(candidate) {
  candidate.ledgerDigest =
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(candidate);
  return candidate;
}

let currentLedgerPromise;

async function currentLedger() {
  currentLedgerPromise ??=
    readVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  return currentLedgerPromise;
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentLedger());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error instanceof VedicSourceBindingAndThreeLayerRightsRequirementsError
      && error.code === code
  );
}

function mutationTest(name, mutator, code) {
  test(name, async () => expectResignedFailure(mutator, code));
}

async function makeFixture(t, prefix = "hakimi-vedic-source-rights-") {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => rm(root, { recursive: true, force: true }));
  for (const relativePath of closurePaths) {
    const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
    const target = path.resolve(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return root;
}

test("current Vedic source-rights child is requirements-only open and all 38 are unbound", async () => {
  const ledger = await currentLedger();
  const result = await verifyVedicSourceBindingAndThreeLayerRightsRequirements(
    workspaceRoot,
    ledger
  );
  assert.equal(result.status, expectedStatus);
  assert.equal(result.subjectCount, 38);
  assert.equal(result.bindingRequired, 38);
  assert.equal(result.bindingFrozenVerified, 0);
  assert.equal(result.bindingRequirementsInventoryDefined, true);
  assert.equal(result.requirementsUniverseClosed, false);
  assert.equal(result.sourceBundleComplete, false);
  assert.equal(result.rightsBundleComplete, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.ledgerDigest, expectedDigest);
});

test("CLI reports only neutral requirements mechanical closure", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.endsWith("\n"), true);
  assert.equal(stdout.trim().includes("\n"), false);
  const output = JSON.parse(stdout);
  assert.equal(output.sourceRightsRequirementsClosureVerified, true);
  assert.equal(output.status, expectedStatus);
  assert.equal(output.subjectCount, 38);
  assert.equal(output.bindingRequired, 38);
  assert.equal(output.bindingFrozenVerified, 0);
  assert.equal(output.requirementsUniverseClosed, false);
  assert.equal(output.sourceBundleComplete, false);
  assert.equal(output.rightsBundleComplete, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
  for (const forbidden of [
    "ok", "ready", "admissionGatesSatisfied", "rereviewRequirementsComplete",
    "sourceBindingEstablished", "rightsEstablished", "licenseReviewed"
  ]) assert.equal(Object.hasOwn(output, forbidden), false);
});

test("CLI rejects every operand with one scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      assert.equal(error.stderr.endsWith("\n"), true);
      assert.equal(error.stderr.trim().includes("\n"), false);
      const output = JSON.parse(error.stderr);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.sourceRightsRequirementsClosureVerified, false);
      assert.equal(Object.hasOwn(output, "ok"), false);
      return true;
    }
  );
});

test("ledger bytes are one exact canonical materialization", async () => {
  const absolute = path.resolve(
    workspaceRoot,
    ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  const raw = await readFile(absolute);
  const ledger = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(raw);
  assert.equal(
    raw.toString("utf8"),
    canonicalPrettyStringifyVedicSourceBindingAndThreeLayerRightsRequirements(ledger)
  );
  assert.equal(raw.byteLength, 85_752);
  assert.equal(createHash("sha256").update(raw).digest("hex"), expectedRawSha256);
  assert.equal(
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(ledger),
    expectedDigest
  );
});

test("raw parser rejects UTF-8 BOM", () => {
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])
    ),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
});

test("raw parser rejects invalid UTF-8", () => {
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      Buffer.from([0xc3, 0x28])
    ),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
});

test("raw parser rejects duplicate object keys before JSON.parse collapse", () => {
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      Buffer.from('{"a":1,"a":2}', "utf8")
    ),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
});

test("raw parser rejects non-object JSON roots", () => {
  for (const text of ["[]", "null", "1", '"x"']) {
    assert.throws(
      () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
        Buffer.from(text, "utf8")
      ),
      (error) => error.code === "JSON_INVALID"
    );
  }
});

test("raw parser enforces maxBytes from intrinsic byte length", () => {
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      Buffer.from("{}", "utf8"),
      "fixture",
      1
    ),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(new ArrayBuffer(2)),
    (error) => error.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser rejects typed-array Proxy without invoking traps", () => {
  let traps = 0;
  const proxy = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      traps += 1;
      throw new Error("trap must not run");
    }
  });
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(proxy),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(traps, 0);
});

test("raw parser uses intrinsic typed-array slots instead of subclass getters", () => {
  let lengthReads = 0;
  let bufferReads = 0;
  class HostileBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      throw new Error("length getter must not run");
    }

    get buffer() {
      bufferReads += 1;
      throw new Error("buffer getter must not run");
    }
  }
  const hostile = new HostileBytes(2);
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      hostile,
      "fixture",
      1
    ),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);
  assert.equal(bufferReads, 0);
});

test("raw parser rejects SharedArrayBuffer storage", () => {
  if (typeof SharedArrayBuffer !== "function") return;
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      new Uint8Array(new SharedArrayBuffer(2))
    ),
    (error) => error.code === "JSON_SHARED_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects resizable ArrayBuffer storage", () => {
  if (typeof ArrayBuffer.prototype.resize !== "function") return;
  const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
      new Uint8Array(resizable)
    ),
    (error) => error.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
  );
});

test("raw parser rejects detached typed-array storage", () => {
  const detachedBuffer = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachedBuffer);
  structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
  assert.throws(
    () => parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(detachedView),
    (error) => error.code === "JSON_INVALID" || error.code === "JSON_BYTES_INVALID"
  );
});

test("raw parser returns a private object snapshot", () => {
  const source = Buffer.from('{"value":1}', "utf8");
  const parsed = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(source);
  source.fill(0);
  assert.deepEqual(parsed, { value: 1 });
});

test("object API rejects accessors passively", async () => {
  const candidate = clone(await currentLedger());
  let reads = 0;
  Object.defineProperty(candidate.subjects[0], "sourceBodyDigest", {
    enumerable: true,
    get() {
      reads += 1;
      return null;
    }
  });
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(candidate),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);
});

test("object API rejects Proxy passively", async () => {
  const candidate = clone(await currentLedger());
  candidate.requirementsUniverse = new Proxy(candidate.requirementsUniverse, {});
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
});

test("object API rejects Symbol keys", async () => {
  const candidate = clone(await currentLedger());
  candidate[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );
});

test("object API rejects foreign or null prototypes", async () => {
  const candidate = clone(await currentLedger());
  Object.setPrototypeOf(candidate.sourceRightsBoundary, null);
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );
});

test("object API rejects sparse arrays", async () => {
  const candidate = clone(await currentLedger());
  delete candidate.subjects[4];
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );
});

test("object API rejects aliases and cycles", async () => {
  const alias = clone(await currentLedger());
  alias.subjects[1] = alias.subjects[0];
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, alias),
    (error) => error.code === "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
  const cycle = clone(await currentLedger());
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_OR_ALIAS_FORBIDDEN"
  );
});

test("object API rejects non-finite numbers and negative zero", async () => {
  const nan = clone(await currentLedger());
  nan.gateSummary.bindingFrozenVerified = Number.NaN;
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, nan),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
  const negativeZero = clone(await currentLedger());
  negativeZero.gateSummary.bindingFrozenVerified = -0;
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("own __proto__ keys cannot alias canonical identity or digest", async () => {
  const ordinary = JSON.parse('{"safe":1}');
  const protoKey = JSON.parse('{"__proto__":{"polluted":true},"safe":1}');
  assert.equal(Object.hasOwn(protoKey, "__proto__"), true);
  assert.notEqual(
    canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(ordinary),
    canonicalStringifyVedicSourceBindingAndThreeLayerRightsRequirements(protoKey)
  );
  assert.notEqual(
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(ordinary),
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(protoKey)
  );
  const raw = parseVedicSourceBindingAndThreeLayerRightsRequirementsJsonBytes(
    Buffer.from('{"__proto__":{"polluted":true},"safe":1}', "utf8")
  );
  assert.equal(Object.hasOwn(raw, "__proto__"), true);
  const candidate = clone(await currentLedger());
  Object.defineProperty(candidate, "__proto__", {
    configurable: true,
    enumerable: true,
    value: { polluted: true },
    writable: true
  });
  resign(candidate);
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "LEDGER_INVALID"
  );
});

test("verified and built ledgers are detached and deeply frozen", async () => {
  const input = clone(await currentLedger());
  const result = await verifyVedicSourceBindingAndThreeLayerRightsRequirements(
    workspaceRoot,
    input
  );
  assertFullyFrozenAndDetached(input, result.ledger);
  assert.equal(Object.isFrozen(result), true);
  const built = await buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot);
  for (const value of collectDataObjectGraph(built)) assert.equal(Object.isFrozen(value), true);
  assert.equal(
    computeVedicSourceBindingAndThreeLayerRightsRequirementsDigest(built),
    built.ledgerDigest
  );
});

test("38 subjects are exact current 13 input 12 fact and 13 rule identities", async () => {
  const ledger = await currentLedger();
  const expectedIds = [
    ...vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.INPUT_REQUIREMENT_IDS
      .map((id) => `vedic.input.${id}`),
    ...vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.FACT_REQUIREMENT_IDS
      .map((id) => `vedic.fact.${id}`),
    ...vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.RULE_REQUIREMENT_IDS
      .map((id) => `vedic.rule.${id}`)
  ];
  assert.deepEqual(ledger.subjects.map((entry) => entry.subjectId), expectedIds);
  assert.equal(new Set(expectedIds).size, 38);
  assert.deepEqual(ledger.requirementsUniverse.countsByLayer, { fact: 12, input: 13, rule: 13 });
  assert.equal(ledger.requirementsUniverse.currentScopedSubjectCount, 38);
  assert.equal(ledger.requirementsUniverse.requirementsUniverseClosed, false);
  assert.equal(ledger.requirementsUniverse.exhaustiveVedicSourceRightsUniverseClaimed, false);
});

test("every subject is requirements-only with empty source rights expert and freeze fields", async () => {
  const ledger = await currentLedger();
  for (const subject of ledger.subjects) {
    assert.equal(subject.bindingState, "required_unbound");
    assert.equal(subject.sourceOrProvenanceMode, null);
    assert.deepEqual(subject.sourceCandidateIds, []);
    assert.equal(subject.selectedSourceCandidateId, null);
    assert.deepEqual(subject.sourceBodyRefs, []);
    assert.equal(subject.sourceBodyDigest, null);
    assert.deepEqual(subject.exactQuoteRefs, []);
    assert.equal(subject.exactQuoteDigest, null);
    assert.equal(subject.exactQuoteStored, false);
    assert.deepEqual(subject.exactLocatorRefs, []);
    assert.equal(subject.exactLocatorEstablished, false);
    assert.equal(subject.workIdentity, null);
    assert.equal(subject.versionIdentity, null);
    assert.equal(subject.carrierIdentity, null);
    assert.equal(subject.workRightsEstablished, false);
    assert.equal(subject.versionRightsEstablished, false);
    assert.equal(subject.carrierRightsEstablished, false);
    assert.equal(subject.licenseEstablished, false);
    assert.equal(subject.rightsLegalConclusionEstablished, false);
    assert.equal(subject.redistributionAuthorized, false);
    assert.deepEqual(subject.expertReviewIds, []);
    assert.equal(subject.contentTruthEstablished, false);
    assert.equal(subject.expertTruthEstablished, false);
    assert.equal(subject.frozenBindingId, null);
    assert.equal(subject.bindingDigest, null);
    assert.equal(subject.frozenAt, null);
    assert.equal(subject.basisRefsEstablishFormalSource, false);
  }
});

test("child binds exactly seven upstreams and no runtime parent or registry", async () => {
  const ledger = await currentLedger();
  const bindings = ledger.boundaryBindings;
  assert.deepEqual(bindings.chainOrder, vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.CHAIN_ORDER);
  assert.equal(new Set(bindings.chainOrder).size, 7);
  assert.equal(bindings.childBindsRuntimeProposal, false);
  assert.equal(bindings.childBindsParent, false);
  assert.equal(bindings.childBindsCentralRegistry, false);
  assert.deepEqual(bindings.upstreamArtifacts.map((entry) => entry.path), bindings.chainOrder);
  for (const artifact of bindings.upstreamArtifacts) {
    assert.equal(artifact.rawHashAndInspectionUseSameReadBuffer, true);
  }
  const text = JSON.stringify(bindings);
  assert.equal(text.includes("vedic-runtime-and-bundle-size-proposal"), false);
  assert.equal(text.includes("vedic-independent-productization-requirements"), false);
  assert.equal(text.includes("four-system-admission"), false);
});

test("product authority source-rights expert and mutation boundaries stay fail closed", async () => {
  const ledger = await currentLedger();
  assert.equal(ledger.productBoundary.legacyV13Inherited, false);
  assert.equal(ledger.productBoundary.schema13Inherited, false);
  assert.equal(ledger.productBoundary.releaseIdentity, null);
  assert.equal(ledger.productBoundary.targetSchema, null);
  assert.equal(ledger.productBoundary.migrationId, null);
  assert.equal(ledger.productBoundary.productSurface, "absent");
  for (const value of Object.values(ledger.authorityBoundary)) assert.equal(value, false);
  assert.equal(ledger.sourceRightsBoundary.bindingRequired, 38);
  assert.equal(ledger.sourceRightsBoundary.bindingFrozenVerified, 0);
  assert.equal(ledger.sourceRightsBoundary.sourceBindingEstablished, false);
  assert.equal(ledger.sourceRightsBoundary.rightsEstablished, false);
  assert.equal(ledger.expertBoundary.independentExpertReviewsVerified, 0);
  assert.equal(ledger.observationBoundary.mutationEpochAvailable, false);
  assert.equal(ledger.observationBoundary.mutationEpochReceipt, null);
  assert.equal(ledger.observationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(ledger.observationBoundary.intervalMutationExcluded, false);
  assert.equal(ledger.observationBoundary.abaExcluded, false);
});

test("ledger reader rejects semantically equal non-canonical bytes", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  await writeFile(target, JSON.stringify(JSON.parse(await readFile(target, "utf8"))), "utf8");
  await assert.rejects(
    () => readVedicSourceBindingAndThreeLayerRightsRequirements(root),
    (error) => error.code === "JSON_NON_CANONICAL"
  );
});

test("a byte drift in any of seven upstreams invalidates the child", async (t) => {
  for (const relativePath of vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.CHAIN_ORDER) {
    await t.test(relativePath, async (subtest) => {
      const root = await makeFixture(subtest);
      await appendFile(path.resolve(root, ...relativePath.split("/")), "\n", "utf8");
      await assert.rejects(
        () => readVedicSourceBindingAndThreeLayerRightsRequirements(root),
        (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
      );
    });
  }
});

test("ADS traversal backslash absolute and dot-segment paths are rejected", () => {
  for (const relativePath of [
    "content/system-admission/ledger.json:stream",
    "content:stream/system-admission/ledger.json",
    "../ledger.json",
    "content/../ledger.json",
    "content\\system-admission\\ledger.json",
    path.resolve(workspaceRoot, "content", "ledger.json")
  ]) {
    assert.throws(
      () => vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.safeWorkspaceFile(
        workspaceRoot,
        relativePath
      ),
      (error) => error.code === "PATH_INVALID"
    );
  }
});

test("hard-linked ledger endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
  await copyFile(target, seed);
  await rm(target);
  await link(seed, target);
  await assert.rejects(
    () => readVedicSourceBindingAndThreeLayerRightsRequirements(root),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("hard-linked upstream endpoints are rejected", async (t) => {
  for (const relativePath of vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.CHAIN_ORDER) {
    await t.test(relativePath, async (subtest) => {
      const root = await makeFixture(subtest);
      const target = path.resolve(root, ...relativePath.split("/"));
      const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
      await copyFile(target, seed);
      await rm(target);
      await link(seed, target);
      await assert.rejects(
        () => buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(root),
        (error) => error.code === "BOUND_ARTIFACT_ENDPOINT_INVALID"
      );
    });
  }
});

test("oversized ledger endpoint is rejected before parsing", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...VEDIC_SOURCE_BINDING_AND_THREE_LAYER_RIGHTS_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  await writeFile(
    target,
    Buffer.alloc(vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.MAX_LEDGER_BYTES + 1)
  );
  await assert.rejects(
    () => readVedicSourceBindingAndThreeLayerRightsRequirements(root),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("oversized upstream endpoint is rejected before inspection", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.CHAIN_ORDER[0].split("/")
  );
  await writeFile(
    target,
    Buffer.alloc(
      vedicSourceBindingAndThreeLayerRightsRequirementsTestOnly.MAX_BOUND_ARTIFACT_BYTES + 1
    )
  );
  await assert.rejects(
    () => buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(root),
    (error) => error.code === "BOUND_ARTIFACT_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in ledger content chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-source-rights-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-source-rights-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  try {
    await symlink(
      path.join(realRoot, "content"),
      path.join(linkedRoot, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("platform does not permit a junction or directory symlink");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readVedicSourceBindingAndThreeLayerRightsRequirements(linkedRoot),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in ADR chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-source-rights-docs-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-source-rights-docs-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  for (const relativePath of closurePaths.filter((entry) => !entry.startsWith("docs/"))) {
    const target = path.resolve(linkedRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.resolve(realRoot, ...relativePath.split("/")), target);
  }
  try {
    await symlink(
      path.join(realRoot, "docs"),
      path.join(linkedRoot, "docs"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("platform does not permit a junction or directory symlink");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => buildCurrentVedicSourceBindingAndThreeLayerRightsRequirements(linkedRoot),
    (error) => error.code === "BOUND_ARTIFACT_ENDPOINT_INVALID"
  );
});

test("stale digest cannot enter after an otherwise static identity change", async () => {
  const candidate = clone(await currentLedger());
  candidate.ledgerDigest = "0".repeat(64);
  await assert.rejects(
    () => verifyVedicSourceBindingAndThreeLayerRightsRequirements(workspaceRoot, candidate),
    (error) => error.code === "LEDGER_DIGEST_MISMATCH"
  );
});

const mutationCases = [
  ["self-resigning cannot close the requirements universe", (x) => {
    x.requirementsUniverse.requirementsUniverseClosed = true;
  }, "REQUIREMENTS_UNIVERSE_PROMOTED"],
  ["self-resigning cannot claim an exhaustive universe", (x) => {
    x.requirementsUniverse.exhaustiveVedicSourceRightsUniverseClaimed = true;
  }, "REQUIREMENTS_UNIVERSE_PROMOTED"],
  ["self-resigning cannot change the current scoped count", (x) => {
    x.requirementsUniverse.currentScopedSubjectCount = 39;
  }, "REQUIREMENTS_UNIVERSE_PROMOTED"],
  ["self-resigning cannot change layer counts", (x) => {
    x.requirementsUniverse.countsByLayer.fact = 13;
  }, "REQUIREMENTS_UNIVERSE_PROMOTED"],
  ["self-resigning cannot turn off explicit future expansion", (x) => {
    x.requirementsUniverse.futureRequirementExpansionRequiresExplicitLedgerRevision = false;
  }, "REQUIREMENTS_UNIVERSE_PROMOTED"],
  ["self-resigning cannot attach a source candidate", (x) => {
    x.subjects[0].sourceCandidateIds.push("fake-source");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot select provenance mode", (x) => {
    x.subjects[1].sourceOrProvenanceMode = "traditional_text";
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot bind a source body digest", (x) => {
    x.subjects[2].sourceBodyDigest = "0".repeat(64);
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot attach an exact quote", (x) => {
    x.subjects[3].exactQuoteRefs.push("fake-quote");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish an exact locator", (x) => {
    x.subjects[4].exactLocatorEstablished = true;
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish work identity", (x) => {
    x.subjects[5].workIdentity = "fake-work";
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish version identity", (x) => {
    x.subjects[6].versionIdentity = "fake-version";
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish carrier identity", (x) => {
    x.subjects[7].carrierIdentity = "fake-carrier";
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot attach work rights", (x) => {
    x.subjects[8].workRightsEvidenceRefs.push("fake-work-rights");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot attach version rights", (x) => {
    x.subjects[9].versionRightsEvidenceRefs.push("fake-version-rights");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot attach carrier rights", (x) => {
    x.subjects[10].carrierRightsEvidenceRefs.push("fake-carrier-rights");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish license", (x) => {
    x.subjects[11].licenseEstablished = true;
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot authorize redistribution", (x) => {
    x.subjects[12].redistributionAuthorized = true;
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot establish a legal conclusion", (x) => {
    x.subjects[13].rightsLegalConclusionEstablished = true;
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot attach an expert review", (x) => {
    x.subjects[14].expertReviewIds.push("fake-expert");
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot freeze a binding", (x) => {
    x.subjects[15].frozenBindingId = "fake-binding";
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot reorder subjects", (x) => {
    x.subjects.reverse();
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot duplicate a subject identity", (x) => {
    x.subjects[1].subjectId = x.subjects[0].subjectId;
  }, "SUBJECT_INVENTORY_INVALID"],
  ["self-resigning cannot count a frozen binding globally", (x) => {
    x.sourceRightsBoundary.bindingFrozenVerified = 1;
  }, "SOURCE_RIGHTS_PROMOTED"],
  ["self-resigning cannot claim source binding established", (x) => {
    x.sourceRightsBoundary.sourceBindingEstablished = true;
  }, "SOURCE_RIGHTS_PROMOTED"],
  ["self-resigning cannot claim rights established", (x) => {
    x.sourceRightsBoundary.rightsEstablished = true;
  }, "SOURCE_RIGHTS_PROMOTED"],
  ["self-resigning cannot complete source bundle", (x) => {
    x.gateSummary.sourceBundleComplete = true;
  }, "SOURCE_RIGHTS_PROMOTED"],
  ["self-resigning cannot complete rights bundle", (x) => {
    x.gateSummary.rightsBundleComplete = true;
  }, "SOURCE_RIGHTS_PROMOTED"],
  ["self-resigning cannot add expert identity", (x) => {
    x.expertBoundary.reviewerIds.push("fake-reviewer");
  }, "EXPERT_PROMOTED"],
  ["self-resigning cannot authorize expert claims", (x) => {
    x.authorityBoundary.expertClaimsAuthorized = true;
  }, "AUTHORITY_PROMOTED"],
  ["self-resigning cannot authorize public release", (x) => {
    x.authorityBoundary.publicReleaseAuthorized = true;
  }, "AUTHORITY_PROMOTED"],
  ["self-resigning cannot mark release ready", (x) => {
    x.authorityBoundary.releaseReady = true;
  }, "AUTHORITY_PROMOTED"],
  ["self-resigning cannot inherit legacy v13", (x) => {
    x.productBoundary.legacyV13Inherited = true;
  }, "PRODUCT_BOUNDARY_PROMOTED"],
  ["self-resigning cannot inherit Schema 13", (x) => {
    x.productBoundary.targetSchema = 13;
  }, "PRODUCT_BOUNDARY_PROMOTED"],
  ["self-resigning cannot create a migration identity", (x) => {
    x.productBoundary.migrationId = "fake";
  }, "PRODUCT_BOUNDARY_PROMOTED"],
  ["self-resigning cannot add product surface", (x) => {
    x.productBoundary.productSurface = "present";
  }, "PRODUCT_BOUNDARY_PROMOTED"],
  ["self-resigning cannot claim mutation epoch", (x) => {
    x.observationBoundary.mutationEpochAvailable = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED"],
  ["self-resigning cannot attach mutation epoch receipt", (x) => {
    x.observationBoundary.mutationEpochReceipt = "fake";
  }, "OBSERVATION_BOUNDARY_PROMOTED"],
  ["self-resigning cannot claim cross-file atomicity", (x) => {
    x.observationBoundary.crossFileAtomicSnapshot = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED"],
  ["self-resigning cannot claim interval mutation exclusion", (x) => {
    x.observationBoundary.intervalMutationExcluded = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED"],
  ["self-resigning cannot claim ABA exclusion", (x) => {
    x.observationBoundary.abaExcluded = true;
  }, "OBSERVATION_BOUNDARY_PROMOTED"],
  ["self-resigning cannot cover runtime license questions", (x) => {
    x.scopeExclusions.runtimeDependencyLicenseQuestionMatrixCovered = true;
  }, "SCOPE_EXCLUSION_INVALID"],
  ["self-resigning cannot bind runtime proposal", (x) => {
    x.boundaryBindings.childBindsRuntimeProposal = true;
  }, "BOUNDARY_BACKLINK_FORBIDDEN"],
  ["self-resigning cannot bind parent", (x) => {
    x.boundaryBindings.childBindsParent = true;
  }, "BOUNDARY_BACKLINK_FORBIDDEN"],
  ["self-resigning cannot bind central registry", (x) => {
    x.boundaryBindings.childBindsCentralRegistry = true;
  }, "BOUNDARY_BACKLINK_FORBIDDEN"],
  ["self-resigning cannot reorder the seven upstream chain", (x) => {
    x.boundaryBindings.chainOrder.reverse();
  }, "BOUND_ARTIFACT_CLOSURE_INVALID"],
  ["self-resigning cannot delete an explicit non-claim", (x) => {
    x.doesNotEstablish.pop();
  }, "EVIDENCE_BOUNDARY_PROMOTED"],
  ["self-resigning cannot forge content truth evidence", (x) => {
    x.evidenceLedger.contentTruth = "established";
  }, "EVIDENCE_BOUNDARY_PROMOTED"],
  ["self-resigning cannot call digest a signature", (x) => {
    x.integrityBoundary.digestIsDigitalSignature = true;
  }, "INTEGRITY_BOUNDARY_INVALID"],
  ["self-resigning cannot add unknown top-level fields", (x) => {
    x.productArtifactsPresent = 4;
  }, "LEDGER_INVALID"],
  ["self-resigning cannot change status to ready", (x) => {
    x.status = "ready";
  }, "LEDGER_INVALID"]
];

for (const [name, mutator, code] of mutationCases) mutationTest(name, mutator, code);
