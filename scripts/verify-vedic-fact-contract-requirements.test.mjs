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
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VedicFactContractRequirementsError,
  buildCurrentVedicFactContractRequirementsLedger,
  canonicalPrettyStringifyVedicFactContractRequirements,
  canonicalStringifyVedicFactContractRequirements,
  computeVedicFactContractRequirementsDigest,
  parseVedicFactContractRequirementsJsonBytes,
  readVedicFactContractRequirementsLedger,
  vedicFactContractRequirementsTestOnly,
  verifyVedicFactContractRequirementsLedger
} from "./vedic-fact-contract-requirements-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(
  workspaceRoot,
  "scripts",
  "verify-vedic-fact-contract-requirements.mjs"
);
const closurePaths = Object.freeze([
  VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  vedicFactContractRequirementsTestOnly.expectedAdrRawIdentity.path,
  vedicFactContractRequirementsTestOnly.expectedInputDraftRawIdentity.path,
  vedicFactContractRequirementsTestOnly.expectedInputRequirementsRawIdentity.path,
  vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity.path
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
  candidate.ledgerDigest = computeVedicFactContractRequirementsDigest(candidate);
  return candidate;
}

async function currentLedger() {
  return readVedicFactContractRequirementsLedger(workspaceRoot);
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentLedger());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, candidate),
    (error) => error instanceof VedicFactContractRequirementsError && error.code === code
  );
}

async function makeFixture(t, prefix = "hakimi-vedic-fact-requirements-") {
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

test("current Vedic fact requirements ledger is a scoped open inventory with zero fact execution", async () => {
  const ledger = await currentLedger();
  const result = await verifyVedicFactContractRequirementsLedger(workspaceRoot, ledger);
  assert.equal(
    result.status,
    "fact_contract_draft_present_zero_instances_values_producer_projector_absent_not_admitted"
  );
  assert.equal(result.requirementsDefined, 12);
  assert.equal(result.requirementsDraftCovered, 12);
  assert.equal(result.requirementsResolved, 0);
  assert.equal(result.requirementsUniverseClosed, false);
  assert.equal(result.factContractArtifacts, 1);
  assert.equal(result.factInstancesObserved, 0);
  assert.equal(result.factContractGateSatisfied, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(
    result.ledgerDigest,
    "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8"
  );
});

test("CLI reports mechanical closure without an ok or admission claim", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.factRequirementsClosureVerified, true);
  assert.equal(Object.hasOwn(output, "requirementsClosureVerified"), false);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.requirementsInventoryDefined, true);
  assert.equal(output.inventoryScope, "v0.1_scoped");
  assert.equal(output.requirementsUniverseClosed, false);
  assert.equal(output.bindingRequirementsInventoryDefined, false);
  assert.equal(output.bindingRequired, null);
  assert.equal(output.requirementsDefined, 12);
  assert.equal(output.requirementsDraftCovered, 12);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.factContract, "isolated_contract_draft");
  assert.equal(output.factContractArtifacts, 1);
  for (const key of [
    "factInstancesObserved", "factValueInstances", "factProducerInstances",
    "factProjectorInstances", "factFailureReceipts", "factReceipts", "successReceipts"
  ]) assert.equal(output[key], 0);
  for (const key of [
    "factReceiptIssued", "successReceiptIssued", "countsTowardAdmission",
    "factContractGateSatisfied", "deterministicFactsGateSatisfied", "releaseReady",
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
      assert.equal(output.factRequirementsClosureVerified, false);
      assert.equal(Object.hasOwn(output, "requirementsClosureVerified"), false);
      return true;
    }
  );
});

test("ledger bytes are one exact canonical materialization", async () => {
  const absolute = path.resolve(
    workspaceRoot,
    ...VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  const raw = await readFile(absolute);
  const ledger = parseVedicFactContractRequirementsJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicFactContractRequirements(ledger));
  assert.equal(raw.byteLength, 42_634);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "a20a1033ce063702548a79b6a651d21421e9f59a9a2ecd4da251cde42ae36b38"
  );
});

test("raw JSON rejects BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );

  let proxyTraps = 0;
  const proxiedBytes = new Proxy(Buffer.from("{}", "utf8"), {
    get() {
      proxyTraps += 1;
      throw new Error("byte proxy trap must not run");
    }
  });
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(proxiedBytes),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(proxyTraps, 0);

  let lengthReads = 0;
  class HostileLengthBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      throw new Error("subclass length getter must not run");
    }
  }
  const oversized = new HostileLengthBytes(2);
  assert.throws(
    () => parseVedicFactContractRequirementsJsonBytes(oversized, "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);
});

test("ledger reader rejects a semantically equal non-canonical materialization", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/")
  );
  const parsed = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(parsed), "utf8");
  await assert.rejects(
    () => readVedicFactContractRequirementsLedger(root),
    (error) => error.code === "LEDGER_MATERIALIZATION_MISMATCH"
  );
});

test("object API rejects accessors without invocation and structural object attacks", async () => {
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
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicFactContractRequirements(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const symbol = await currentLedger();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );

  const prototype = await currentLedger();
  Object.setPrototypeOf(prototype.productBoundary, null);
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, prototype),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );

  const proxy = await currentLedger();
  proxy.zeroInstanceRequirementsReceipt = new Proxy(proxy.zeroInstanceRequirementsReceipt, {});
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, proxy),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );

  const sparse = await currentLedger();
  delete sparse.requirementInventory.requirements[1];
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );

  const cycle = await currentLedger();
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_FORBIDDEN"
  );

  const negativeZero = await currentLedger();
  negativeZero.zeroInstanceRequirementsReceipt.factInstancesObserved = -0;
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("verified ledger and builder outputs are detached and deeply frozen", async () => {
  const input = await currentLedger();
  const result = await verifyVedicFactContractRequirementsLedger(workspaceRoot, input);
  assertFullyFrozenAndDetached(input, result.ledger);
  assert.equal(Object.isFrozen(result), true);

  const built = await buildCurrentVedicFactContractRequirementsLedger(workspaceRoot);
  for (const value of collectDataObjectGraph(built)) assert.equal(Object.isFrozen(value), true);
  assert.equal(computeVedicFactContractRequirementsDigest(built), built.ledgerDigest);
});

test("twelve prerequisites form the scoped open inventory and four families remain a separate coverage map", async () => {
  const ledger = await currentLedger();
  const inventory = ledger.requirementInventory;
  const specs = vedicFactContractRequirementsTestOnly.requirementSpecs;
  const familySpecs = vedicFactContractRequirementsTestOnly.factFamilySpecs;
  const mapping = vedicFactContractRequirementsTestOnly.factFamilyBlockedPrerequisiteMap;
  const draftPath = vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity.path;
  assert.equal(inventory.inventoryScope, "v0.1_scoped");
  assert.equal(inventory.requirementsUniverseClosed, false);
  assert.equal(inventory.bindingRequirementsInventoryDefined, false);
  assert.equal(inventory.bindingRequired, null);
  assert.equal(inventory.requirementsDefined, 12);
  assert.equal(inventory.requirementsDraftCovered, 12);
  assert.equal(inventory.requirementsResolved, 0);
  assert.deepEqual(
    inventory.requirements.map((item) => item.requirementId),
    vedicFactContractRequirementsTestOnly.blockedPrerequisiteIds
  );
  for (let index = 0; index < specs.length; index += 1) {
    const item = inventory.requirements[index];
    const spec = specs[index];
    const basisArtifactRefs = spec.basisPropertyIds.map((propertyId) =>
      `${draftPath}#/properties/basis/properties/${propertyId}`);
    const coveredFactFamilyIds = familySpecs
      .map((entry) => entry.factFamilyId)
      .filter((factFamilyId) => mapping[factFamilyId].includes(item.requirementId));
    const factFamilyMapArtifactRefs = coveredFactFamilyIds.map((factFamilyId) => {
      const position = mapping[factFamilyId].indexOf(item.requirementId);
      return `${draftPath}`
        + `#/x-hakimiBoundary/factFamilyBlockedPrerequisiteMap/${factFamilyId}/${position}`;
    });
    assert.equal(item.order, index + 1);
    assert.equal(item.requirementClass, "v0_1_scoped_fact_prerequisite");
    assert.equal(
      item.requirementState,
      "named_and_structurally_covered_semantics_unresolved"
    );
    assert.deepEqual(item.basisArtifactRefs, basisArtifactRefs);
    assert.deepEqual(item.coveredFactFamilyIds, coveredFactFamilyIds);
    assert.deepEqual(item.factFamilyMapArtifactRefs, factFamilyMapArtifactRefs);
    assert.deepEqual(item.artifactRefs, [
      `${draftPath}#/x-hakimiBoundary/blockedPrerequisiteIds/${index}`,
      ...basisArtifactRefs,
      ...factFamilyMapArtifactRefs
    ]);
    assert.equal(item.selectedDefinition, null);
    assert.equal(item.defaultDefinition, null);
    for (const key of [
      "algorithmBindingRefs", "evidenceRefs", "expertRefs", "factValueInstances",
      "rightsRefs", "sourceRefs"
    ]) assert.deepEqual(item[key], []);
  }

  const basisUnion = new Set(specs.flatMap((entry) => entry.basisPropertyIds));
  assert.deepEqual(
    [...basisUnion].sort(),
    [...vedicFactContractRequirementsTestOnly.basisPropertyIds].sort()
  );
  const summary = ledger.factFamilyCoverageSummary;
  assert.equal(summary.artifactRole, "non_requirement_fact_family_coverage_summary");
  assert.equal(summary.factFamiliesDefined, 4);
  assert.equal(summary.factFamiliesDraftCovered, 4);
  assert.equal(summary.requirementsUniverseClosed, false);
  assert.equal(summary.families.length, 4);
  for (let index = 0; index < familySpecs.length; index += 1) {
    const family = summary.families[index];
    const spec = familySpecs[index];
    assert.equal(family.factFamilyId, spec.factFamilyId);
    assert.equal(family.schemaPropertyPointer, spec.schemaPropertyPointer);
    assert.equal(
      family.familyState,
      "draft_shape_covered_prerequisites_semantically_unresolved"
    );
    assert.deepEqual(family.blockedPrerequisiteIds, mapping[spec.factFamilyId]);
    assert.deepEqual(family.artifactRefs, [
      `${draftPath}${spec.schemaPropertyPointer}`,
      `${draftPath}#/x-hakimiBoundary/factFamilyIds/${index}`,
      `${draftPath}#/x-hakimiBoundary/factFamilyBlockedPrerequisiteMap/${spec.factFamilyId}`
    ]);
  }
});

test("self-resigning cannot close choose or populate a fact requirement", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirementsUniverseClosed = true; },
    "REQUIREMENT_INVENTORY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.bindingRequired = true; },
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
    (ledger) => { ledger.requirementInventory.requirements[2].factValueInstances.push({ value: 1 }); },
    "REQUIREMENT_ITEM_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[3].evidenceRefs.push("fake"); },
    "REQUIREMENT_ITEM_INVALID"
  );
});

test("self-resigning cannot materialize facts producers projectors or any receipt", async () => {
  await expectResignedFailure((ledger) => {
    ledger.currentInstances.factValueInstances.push({ value: "fake" });
    ledger.currentInstances.counts.factValueInstances = 1;
  }, "CURRENT_INSTANCES_INVALID");
  await expectResignedFailure((ledger) => {
    ledger.currentInstances.factProducerInstances.push({ id: "fake" });
    ledger.currentInstances.counts.factProducerInstances = 1;
  }, "CURRENT_INSTANCES_INVALID");
  await expectResignedFailure((ledger) => {
    ledger.currentInstances.factProjectorInstances.push({ id: "fake" });
    ledger.currentInstances.counts.factProjectorInstances = 1;
  }, "CURRENT_INSTANCES_INVALID");
  await expectResignedFailure((ledger) => {
    ledger.currentInstances.factFailureReceipts.push({ id: "fake" });
    ledger.currentInstances.counts.factFailureReceipts = 1;
  }, "CURRENT_INSTANCES_INVALID");
  await expectResignedFailure(
    (ledger) => { ledger.zeroInstanceRequirementsReceipt.factReceiptIssued = true; },
    "ZERO_INSTANCE_RECEIPT_INVALID"
  );
});

test("source expert authority integrity product and mutation epoch boundaries cannot be promoted", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.sourceRightsBoundary.sourceCandidateIds.push("fake-source"); },
    "SOURCE_RIGHTS_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.expertBoundary.reviewerIds.push("fake-expert"); },
    "EXPERT_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.authorityBoundary.deterministicFactsGateSatisfied = true; },
    "AUTHORITY_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.integrityBoundary.digestIsDigitalSignature = true; },
    "INTEGRITY_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.productBoundary.factProducer = "present"; },
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

test("child binds ADR input draft input requirements and fact draft exactly without a parent backlink", async () => {
  const ledger = await currentLedger();
  const bindings = ledger.boundaryBindings;
  assert.equal(
    bindings.bindingDirection,
    "requirements_to_adr_input_draft_input_requirements_and_fact_draft_only"
  );
  assert.deepEqual(bindings.chainOrder, [
    vedicFactContractRequirementsTestOnly.expectedAdrRawIdentity.path,
    vedicFactContractRequirementsTestOnly.expectedInputDraftRawIdentity.path,
    vedicFactContractRequirementsTestOnly.expectedInputRequirementsRawIdentity.path,
    vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity.path
  ]);
  for (const [binding, identity] of [
    [bindings.productBoundaryAdr, vedicFactContractRequirementsTestOnly.expectedAdrRawIdentity],
    [bindings.inputContractDraft, vedicFactContractRequirementsTestOnly.expectedInputDraftRawIdentity],
    [bindings.inputContractRequirements, vedicFactContractRequirementsTestOnly.expectedInputRequirementsRawIdentity],
    [bindings.factContractDraft, vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity]
  ]) {
    assert.equal(binding.path, identity.path);
    assert.equal(binding.bytes, identity.bytes);
    assert.equal(binding.sha256, identity.sha256);
    assert.equal(binding.rawHashAndSemanticInspectionUseSameBuffer, true);
  }
  assert.equal(
    bindings.factContractDraft.schemaSemanticDigest,
    vedicFactContractRequirementsTestOnly.expectedFactDraftSemanticDigest
  );
  const serialized = canonicalStringifyVedicFactContractRequirements(bindings);
  assert.equal(serialized.includes("vedic-independent-productization-requirements"), false);
  assert.equal(serialized.includes("four-system-admission"), false);
  assert.equal(Object.hasOwn(bindings, "parentProductizationRequirements"), false);

  await expectResignedFailure((candidate) => {
    candidate.boundaryBindings.parentProductizationRequirements = {
      path: "content/system-admission/vedic-independent-productization-requirements.v1.json"
    };
  }, "PARENT_BACKLINK_FORBIDDEN");
});

test("a byte drift in any of the four approved upstream artifacts invalidates the child", async (t) => {
  const identities = [
    vedicFactContractRequirementsTestOnly.expectedAdrRawIdentity,
    vedicFactContractRequirementsTestOnly.expectedInputDraftRawIdentity,
    vedicFactContractRequirementsTestOnly.expectedInputRequirementsRawIdentity,
    vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity
  ];
  for (const identity of identities) {
    await t.test(identity.path, async (subtest) => {
      const root = await makeFixture(subtest);
      await appendFile(path.resolve(root, ...identity.path.split("/")), "\n", "utf8");
      const candidate = await readVedicFactContractRequirementsLedger(root);
      await assert.rejects(
        () => verifyVedicFactContractRequirementsLedger(root, candidate),
        (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
      );
    });
  }
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
      () => vedicFactContractRequirementsTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("hard-linked ledger and every upstream endpoint are rejected", async (t) => {
  const cases = [
    [VEDIC_FACT_CONTRACT_REQUIREMENTS_RELATIVE_PATH, "LEDGER_ENDPOINT_INVALID", "read"],
    [vedicFactContractRequirementsTestOnly.expectedAdrRawIdentity.path, "ADR_ENDPOINT_INVALID", "build"],
    [vedicFactContractRequirementsTestOnly.expectedInputDraftRawIdentity.path, "INPUT_DRAFT_SCHEMA_ENDPOINT_INVALID", "build"],
    [vedicFactContractRequirementsTestOnly.expectedInputRequirementsRawIdentity.path, "INPUT_REQUIREMENTS_ENDPOINT_INVALID", "build"],
    [vedicFactContractRequirementsTestOnly.expectedFactDraftRawIdentity.path, "FACT_DRAFT_SCHEMA_ENDPOINT_INVALID", "build"]
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
        ? () => readVedicFactContractRequirementsLedger(root)
        : () => buildCurrentVedicFactContractRequirementsLedger(root);
      await assert.rejects(action, (error) => error.code === code);
    });
  }
});

test("junction or directory symlink in the ledger chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-fact-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-fact-linked-"));
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
    () => readVedicFactContractRequirementsLedger(linkedRoot),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in the ADR chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-fact-docs-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-fact-docs-linked-"));
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
  const candidate = await readVedicFactContractRequirementsLedger(linkedRoot);
  await assert.rejects(
    () => verifyVedicFactContractRequirementsLedger(linkedRoot, candidate),
    (error) => error.code === "ADR_ENDPOINT_INVALID"
  );
});

test("unknown fields and non-canonical UTC cannot be self-resigned into current closure", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.unexpected = true; },
    "LEDGER_CURRENT_CLOSURE_MISMATCH"
  );
  await expectResignedFailure(
    (ledger) => { ledger.createdAt = "2026-08-29T00:00:00Z"; },
    "LEDGER_INVALID"
  );
});
