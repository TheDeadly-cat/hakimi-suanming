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
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VedicRuleContractRequirementsError,
  buildCurrentVedicRuleContractRequirementsLedger,
  canonicalPrettyStringifyVedicRuleContractRequirements,
  canonicalStringifyVedicRuleContractRequirements,
  computeVedicRuleContractRequirementsDigest,
  parseVedicRuleContractRequirementsJsonBytes,
  readVedicRuleContractRequirementsLedger,
  vedicRuleContractRequirementsTestOnly,
  verifyVedicRuleContractRequirementsLedger
} from "./vedic-rule-contract-requirements-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-rule-contract-requirements.mjs");
const closurePaths = Object.freeze([
  VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  ...vedicRuleContractRequirementsTestOnly.chainOrder
]);

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
  candidate.ledgerDigest = computeVedicRuleContractRequirementsDigest(candidate);
  return candidate;
}

async function currentLedger() {
  return readVedicRuleContractRequirementsLedger(workspaceRoot);
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentLedger());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, candidate),
    (error) => error instanceof VedicRuleContractRequirementsError && error.code === code
  );
}

async function makeFixture(t, prefix = "hakimi-vedic-rule-requirements-") {
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

function resolvePointer(root, pointer) {
  let cursor = root;
  for (const encoded of pointer.slice(1).split("/")) {
    const segment = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    assert.equal(Object.hasOwn(cursor, segment), true, pointer);
    cursor = cursor[segment];
  }
  return cursor;
}

test("current Vedic rule requirements ledger is a scoped open inventory with zero rule execution", async () => {
  const ledger = await currentLedger();
  const result = await verifyVedicRuleContractRequirementsLedger(workspaceRoot, ledger);
  assert.equal(
    result.status,
    "rule_contract_draft_present_zero_rule_instances_evaluator_and_versioned_ruleset_absent_not_admitted"
  );
  assert.equal(result.requirementsDefined, 13);
  assert.equal(result.requirementsDraftCovered, 13);
  assert.equal(result.requirementsResolved, 0);
  assert.equal(result.requirementsUniverseClosed, false);
  assert.equal(result.ruleContractArtifacts, 1);
  assert.equal(result.ruleInstancesObserved, 0);
  assert.equal(result.ruleContractGateSatisfied, false);
  assert.equal(result.versionedRulesetGateSatisfied, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.ledgerDigest, "fbaad8625fc10d112ccf47f7c5aae358a49305fe2d560a08d02f506194c4156f");
});

test("CLI reports only rule requirements mechanical closure", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.ruleRequirementsClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(Object.hasOwn(output, "requirementsClosureVerified"), false);
  assert.equal(output.bindingRequirementsInventoryDefined, false);
  assert.equal(output.bindingRequired, null);
  assert.equal(output.requirementsDefined, 13);
  assert.equal(output.requirementsDraftCovered, 13);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.requirementsUniverseClosed, false);
  assert.equal(output.ruleContract, "isolated_contract_draft");
  assert.equal(output.versionedRuleset, "absent");
  for (const key of [
    "ruleCandidatesObserved", "ruleDefinitionsObserved", "ruleEvaluatorInstances",
    "ruleFailureReceipts", "ruleImplementationInstances", "ruleInstancesObserved",
    "ruleReceipts", "rulesetInstancesObserved", "successReceipts"
  ]) assert.equal(output[key], 0);
  for (const key of [
    "countsTowardAdmission", "ruleContractGateSatisfied", "ruleReceiptIssued",
    "successReceiptIssued", "versionedRulesetGateSatisfied", "releaseReady",
    "publicReleaseAuthorized"
  ]) assert.equal(output[key], false);
});

test("CLI rejects operands with a stable scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      const output = JSON.parse(error.stderr);
      assert.equal(error.code, 2);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.ruleRequirementsClosureVerified, false);
      assert.equal(Object.hasOwn(output, "ok"), false);
      return true;
    }
  );
});

test("ledger bytes are one exact canonical materialization", async () => {
  const absolute = path.resolve(
    workspaceRoot,
    ...VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  const raw = await readFile(absolute);
  const ledger = parseVedicRuleContractRequirementsJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicRuleContractRequirements(ledger));
  assert.equal(raw.byteLength, 30_734);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "ee34106b3dccdfd5d08d89d3871161ba2a12f7bcc983aff8b4850aa6ee42bc94"
  );
});

test("raw parser rejects malformed JSON and uses intrinsic byte slots", () => {
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  let proxyTraps = 0;
  const proxy = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      proxyTraps += 1;
      throw new Error("byte proxy trap must not run");
    }
  });
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(proxy),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(proxyTraps, 0);
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
    () => parseVedicRuleContractRequirementsJsonBytes(hostile, "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);
  assert.equal(bufferReads, 0);
});

test("raw parser rejects SharedArrayBuffer resizable buffers and detached views", () => {
  if (typeof SharedArrayBuffer === "function") {
    assert.throws(
      () => parseVedicRuleContractRequirementsJsonBytes(new Uint8Array(new SharedArrayBuffer(2))),
      (error) => error.code === "JSON_SHARED_BUFFER_FORBIDDEN"
    );
  }
  if (typeof ArrayBuffer.prototype.resize === "function") {
    const resizable = new ArrayBuffer(2, { maxByteLength: 4 });
    assert.throws(
      () => parseVedicRuleContractRequirementsJsonBytes(new Uint8Array(resizable)),
      (error) => error.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
    );
  }
  const detachedBuffer = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachedBuffer);
  structuredClone(detachedBuffer, { transfer: [detachedBuffer] });
  assert.throws(
    () => parseVedicRuleContractRequirementsJsonBytes(detachedView),
    (error) => error.code === "JSON_INVALID"
  );
});

test("ledger reader rejects semantically equal non-canonical bytes", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/"));
  await writeFile(target, JSON.stringify(JSON.parse(await readFile(target, "utf8"))), "utf8");
  await assert.rejects(
    () => readVedicRuleContractRequirementsLedger(root),
    (error) => error.code === "LEDGER_MATERIALIZATION_MISMATCH"
  );
});

test("object API rejects accessors Proxy Symbol prototypes sparse arrays cycles and negative zero", async () => {
  const accessor = await currentLedger();
  let reads = 0;
  Object.defineProperty(accessor.requirementInventory.requirements[0], "selectedDefinition", {
    enumerable: true,
    get() {
      reads += 1;
      return null;
    }
  });
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicRuleContractRequirements(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const symbol = await currentLedger();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );
  const prototype = await currentLedger();
  Object.setPrototypeOf(prototype.productBoundary, null);
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, prototype),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );
  const proxy = await currentLedger();
  proxy.zeroInstanceRequirementsReceipt = new Proxy(proxy.zeroInstanceRequirementsReceipt, {});
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, proxy),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
  const sparse = await currentLedger();
  delete sparse.requirementInventory.requirements[1];
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );
  const cycle = await currentLedger();
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_FORBIDDEN"
  );
  const negativeZero = await currentLedger();
  negativeZero.zeroInstanceRequirementsReceipt.ruleInstancesObserved = -0;
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("verified and built ledgers are detached and deeply frozen", async () => {
  const input = await currentLedger();
  const result = await verifyVedicRuleContractRequirementsLedger(workspaceRoot, input);
  assertFullyFrozenAndDetached(input, result.ledger);
  assert.equal(Object.isFrozen(result), true);
  const built = await buildCurrentVedicRuleContractRequirementsLedger(workspaceRoot);
  for (const value of collectDataObjectGraph(built)) assert.equal(Object.isFrozen(value), true);
  assert.equal(computeVedicRuleContractRequirementsDigest(built), built.ledgerDigest);
});

test("thirteen prerequisites follow rule draft order and every pointer resolves", async () => {
  const ledger = await currentLedger();
  const draft = JSON.parse(await readFile(
    path.resolve(workspaceRoot, ...vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity.path.split("/")),
    "utf8"
  ));
  const inventory = ledger.requirementInventory;
  assert.equal(inventory.requirementsDefined, 13);
  assert.equal(inventory.requirementsDraftCovered, 13);
  assert.equal(inventory.requirementsResolved, 0);
  assert.equal(inventory.requirementsUniverseClosed, false);
  assert.deepEqual(
    inventory.requirements.map((item) => item.requirementId),
    vedicRuleContractRequirementsTestOnly.blockedPrerequisiteIds
  );
  for (let index = 0; index < inventory.requirements.length; index += 1) {
    const item = inventory.requirements[index];
    const spec = vedicRuleContractRequirementsTestOnly.requirementSpecs[index];
    assert.equal(item.order, index + 1);
    assert.equal(item.requirementClass, "v0_1_scoped_rule_prerequisite");
    assert.equal(item.requirementState, "named_and_structurally_covered_semantics_unresolved");
    assert.deepEqual(item.schemaPointers, [
      `/x-hakimiBoundary/blockedPrerequisiteIds/${index}`,
      ...spec.schemaPointers
    ]);
    assert.equal(resolvePointer(draft, item.schemaPointers[0]), item.requirementId);
    for (const pointer of item.schemaPointers.slice(1)) assert.notEqual(resolvePointer(draft, pointer), undefined);
    assert.deepEqual(item.artifactRefs, item.schemaPointers.map((pointer) =>
      `${vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity.path}#${pointer}`));
    assert.equal(item.selectedDefinition, null);
    assert.equal(item.defaultDefinition, null);
    for (const key of [
      "algorithmBindingRefs", "evidenceRefs", "expertRefs", "rightsRefs",
      "ruleDefinitionInstances", "ruleEvaluationInstances", "ruleInstances",
      "rulesetInstances", "sourceRefs"
    ]) assert.deepEqual(item[key], []);
  }
});

test("self-resigning cannot close choose or populate a rule prerequisite", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirementsUniverseClosed = true; },
    "REQUIREMENT_INVENTORY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.bindingRequired = 13; },
    "REQUIREMENT_INVENTORY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[0].selectedDefinition = "guessed"; },
    "REQUIREMENT_ITEM_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[1].algorithmBindingRefs.push("fake"); },
    "REQUIREMENT_ITEM_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[2].ruleInstances.push({ id: "fake" }); },
    "REQUIREMENT_ITEM_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[3].sourceRefs.push("fake"); },
    "REQUIREMENT_ITEM_INVALID"
  );
});

test("self-resigning cannot materialize any rule execution or receipt instance", async () => {
  const cases = [
    ["ruleCandidates", "ruleCandidates"],
    ["ruleDefinitions", "ruleDefinitions"],
    ["ruleEvaluatorInstances", "ruleEvaluatorInstances"],
    ["ruleFailureReceipts", "ruleFailureReceipts"],
    ["ruleImplementationInstances", "ruleImplementationInstances"],
    ["ruleInstances", "ruleInstances"],
    ["ruleReceipts", "ruleReceipts"],
    ["rulesetInstances", "rulesetInstances"],
    ["successReceipts", "successReceipts"]
  ];
  for (const [listKey, countKey] of cases) {
    await expectResignedFailure((ledger) => {
      ledger.currentInstances[listKey].push({ id: "fake" });
      ledger.currentInstances.counts[countKey] = 1;
    }, "CURRENT_INSTANCES_INVALID");
  }
  await expectResignedFailure(
    (ledger) => { ledger.zeroInstanceRequirementsReceipt.ruleReceiptIssued = true; },
    "ZERO_INSTANCE_RECEIPT_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.zeroInstanceRequirementsReceipt.versionedRulesetGateSatisfied = true; },
    "ZERO_INSTANCE_RECEIPT_INVALID"
  );
});

test("source rights expert high-risk authority product integrity and epoch cannot be promoted", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.sourceRightsBoundary.sourceCandidateIds.push("fake-source"); },
    "SOURCE_RIGHTS_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.expertBoundary.reviewerIds.push("fake-expert"); },
    "EXPERT_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.highRiskBoundary.highRiskClaimsAuthorized = true; },
    "HIGH_RISK_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.authorityBoundary.versionedRulesetGateSatisfied = true; },
    "AUTHORITY_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.integrityBoundary.digestIsDigitalSignature = true; },
    "INTEGRITY_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.productBoundary.versionedRuleset = "present"; },
    "PRODUCT_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.observationBoundary.mutationEpochAvailable = true; },
    "OBSERVATION_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.failClosedInvariants.defaultInference = "allowed"; },
    "FAIL_CLOSED_INVARIANT_INVALID"
  );
});

test("child binds six upstreams exactly in a unique one-way chain without parent backlinks", async () => {
  const ledger = await currentLedger();
  const bindings = ledger.boundaryBindings;
  assert.equal(
    bindings.bindingDirection,
    "requirements_to_adr_input_draft_input_requirements_fact_draft_fact_requirements_and_rule_draft_only"
  );
  assert.deepEqual(bindings.chainOrder, vedicRuleContractRequirementsTestOnly.chainOrder);
  assert.equal(new Set(bindings.chainOrder).size, 6);
  const pairs = [
    [bindings.productBoundaryAdr, vedicRuleContractRequirementsTestOnly.expectedAdrRawIdentity],
    [bindings.inputContractDraft, vedicRuleContractRequirementsTestOnly.expectedInputDraftRawIdentity],
    [bindings.inputContractRequirements, vedicRuleContractRequirementsTestOnly.expectedInputRequirementsRawIdentity],
    [bindings.factContractDraft, vedicRuleContractRequirementsTestOnly.expectedFactDraftRawIdentity],
    [bindings.factContractRequirements, vedicRuleContractRequirementsTestOnly.expectedFactRequirementsRawIdentity],
    [bindings.ruleContractDraft, vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity]
  ];
  for (const [binding, identity] of pairs) {
    assert.equal(binding.path, identity.path);
    assert.equal(binding.bytes, identity.bytes);
    assert.equal(binding.sha256, identity.sha256);
    assert.equal(binding.rawHashAndSemanticInspectionUseSameBuffer, true);
  }
  assert.equal(
    bindings.ruleContractDraft.schemaSemanticDigest,
    vedicRuleContractRequirementsTestOnly.expectedRuleDraftSemanticDigest
  );
  const serialized = canonicalStringifyVedicRuleContractRequirements(bindings);
  assert.equal(serialized.includes("vedic-independent-productization-requirements"), false);
  assert.equal(serialized.includes("four-system-admission"), false);
  await expectResignedFailure((candidate) => {
    candidate.boundaryBindings.parentProductizationRequirements = {
      path: "content/system-admission/vedic-independent-productization-requirements.v1.json"
    };
  }, "PARENT_BACKLINK_FORBIDDEN");
  await expectResignedFailure((candidate) => {
    candidate.boundaryBindings.chainOrder[5] = candidate.boundaryBindings.chainOrder[4];
  }, "BOUNDARY_CHAIN_INVALID");
});

test("a byte drift in any of the six approved upstream artifacts invalidates the child", async (t) => {
  const identities = [
    vedicRuleContractRequirementsTestOnly.expectedAdrRawIdentity,
    vedicRuleContractRequirementsTestOnly.expectedInputDraftRawIdentity,
    vedicRuleContractRequirementsTestOnly.expectedInputRequirementsRawIdentity,
    vedicRuleContractRequirementsTestOnly.expectedFactDraftRawIdentity,
    vedicRuleContractRequirementsTestOnly.expectedFactRequirementsRawIdentity,
    vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity
  ];
  for (const identity of identities) {
    await t.test(identity.path, async (subtest) => {
      const root = await makeFixture(subtest);
      await appendFile(path.resolve(root, ...identity.path.split("/")), "\n", "utf8");
      const candidate = await readVedicRuleContractRequirementsLedger(root);
      await assert.rejects(
        () => verifyVedicRuleContractRequirementsLedger(root, candidate),
        (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
      );
    });
  }
});

test("pointer chain and backlink tampering fail after self-resigning", async () => {
  await expectResignedFailure((ledger) => {
    ledger.requirementInventory.requirements[0].schemaPointers[1] = "/missing";
    ledger.requirementInventory.requirements[0].artifactRefs[1] =
      `${vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity.path}#/missing`;
  }, "REQUIREMENT_ITEM_INVALID");
  await expectResignedFailure((ledger) => {
    ledger.boundaryBindings.chainOrder.reverse();
  }, "BOUNDARY_CHAIN_INVALID");
});

test("ADS traversal backslash and unsafe relative paths are rejected", () => {
  for (const relativePath of [
    "content/system-admission/ledger.json:stream",
    "content:stream/system-admission/ledger.json",
    "content/system-admission:stream/ledger.json",
    "../ledger.json",
    "content\\system-admission\\ledger.json"
  ]) {
    assert.throws(
      () => vedicRuleContractRequirementsTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("hard-linked ledger and every upstream endpoint are rejected", async (t) => {
  const cases = [
    [VEDIC_RULE_CONTRACT_REQUIREMENTS_RELATIVE_PATH, "LEDGER_ENDPOINT_INVALID", "read"],
    [vedicRuleContractRequirementsTestOnly.expectedAdrRawIdentity.path, "ADR_ENDPOINT_INVALID", "build"],
    [vedicRuleContractRequirementsTestOnly.expectedInputDraftRawIdentity.path, "INPUT_DRAFT_ENDPOINT_INVALID", "build"],
    [vedicRuleContractRequirementsTestOnly.expectedInputRequirementsRawIdentity.path, "INPUT_REQUIREMENTS_ENDPOINT_INVALID", "build"],
    [vedicRuleContractRequirementsTestOnly.expectedFactDraftRawIdentity.path, "FACT_DRAFT_ENDPOINT_INVALID", "build"],
    [vedicRuleContractRequirementsTestOnly.expectedFactRequirementsRawIdentity.path, "FACT_REQUIREMENTS_ENDPOINT_INVALID", "build"],
    [vedicRuleContractRequirementsTestOnly.expectedRuleDraftRawIdentity.path, "RULE_DRAFT_ENDPOINT_INVALID", "build"]
  ];
  for (const [relativePath, code, operation] of cases) {
    await t.test(relativePath, async (subtest) => {
      const root = await makeFixture(subtest);
      const target = path.resolve(root, ...relativePath.split("/"));
      const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
      await copyFile(target, seed);
      await rm(target);
      await link(seed, target);
      const action = operation === "read"
        ? () => readVedicRuleContractRequirementsLedger(root)
        : () => buildCurrentVedicRuleContractRequirementsLedger(root);
      await assert.rejects(action, (error) => error.code === code);
    });
  }
});

test("junction or directory symlink in the ledger chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-rule-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-rule-linked-"));
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
    () => readVedicRuleContractRequirementsLedger(linkedRoot),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in the ADR chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-rule-docs-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-rule-docs-linked-"));
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
  const candidate = await readVedicRuleContractRequirementsLedger(linkedRoot);
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(linkedRoot, candidate),
    (error) => error.code === "ADR_ENDPOINT_INVALID"
  );
});

test("unknown fields non-canonical UTC and digest reuse cannot enter current closure", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.unexpected = true; },
    "LEDGER_CURRENT_CLOSURE_MISMATCH"
  );
  await expectResignedFailure(
    (ledger) => { ledger.createdAt = "2026-08-29T00:00:00Z"; },
    "LEDGER_INVALID"
  );
  const ledger = clone(await currentLedger());
  ledger.status = "admitted";
  await assert.rejects(
    () => verifyVedicRuleContractRequirementsLedger(workspaceRoot, ledger),
    (error) => error.code === "LEDGER_INVALID" || error.code === "LEDGER_DIGEST_MISMATCH"
  );
});
