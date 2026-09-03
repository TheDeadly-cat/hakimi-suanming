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
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  VedicInputContractRequirementsError,
  buildCurrentVedicInputContractRequirementsLedger,
  canonicalPrettyStringifyVedicInputContractRequirements,
  canonicalStringifyVedicInputContractRequirements,
  computeVedicInputContractRequirementsDigest,
  parseVedicInputContractRequirementsJsonBytes,
  readVedicInputContractRequirementsLedger,
  vedicInputContractRequirementsTestOnly,
  verifyVedicInputContractRequirementsLedger
} from "./vedic-input-contract-requirements-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-input-contract-requirements.mjs");
const closurePaths = Object.freeze([
  VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
  vedicInputContractRequirementsTestOnly.expectedAdrRawIdentity.path,
  vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path
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
  candidate.ledgerDigest = computeVedicInputContractRequirementsDigest(candidate);
  return candidate;
}

async function currentLedger() {
  return readVedicInputContractRequirementsLedger(workspaceRoot);
}

async function expectResignedFailure(mutator, code) {
  const candidate = clone(await currentLedger());
  mutator(candidate);
  resign(candidate);
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, candidate),
    (error) => error instanceof VedicInputContractRequirementsError && error.code === code
  );
}

async function makeFixture(t, prefix = "hakimi-vedic-input-requirements-") {
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

test("current Vedic input requirements ledger binds one isolated draft but remains zero-instance and not admitted", async () => {
  const ledger = await currentLedger();
  const result = await verifyVedicInputContractRequirementsLedger(workspaceRoot, ledger);
  assert.equal(result.status, "input_contract_draft_present_zero_instances_not_admitted");
  assert.equal(result.requirementsDefined, 13);
  assert.equal(result.requirementsDraftCovered, 13);
  assert.equal(result.requirementsResolved, 0);
  assert.equal(result.inputContractArtifacts, 1);
  assert.equal(result.inputInstancesObserved, 0);
  assert.equal(result.inputContractGateSatisfied, false);
  assert.equal(result.releaseReady, false);
  assert.equal(result.publicReleaseAuthorized, false);
  assert.equal(result.ledgerDigest, "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0");
});

test("CLI is green only for the isolated draft shape with zero instances and no admission", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.requirementsClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.requirementsInventoryDefined, true);
  assert.equal(output.requirementsDefined, 13);
  assert.equal(output.requirementsDraftCovered, 13);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.inputContract, "isolated_contract_draft");
  assert.equal(output.inputContractArtifacts, 1);
  assert.equal(output.inputInstancesObserved, 0);
  assert.equal(output.inputAcceptanceReceiptIssued, false);
  assert.equal(output.factReceiptIssued, false);
  assert.equal(output.countsTowardAdmission, false);
  assert.equal(output.inputContractGateSatisfied, false);
  assert.equal(output.releaseReady, false);
  assert.equal(output.publicReleaseAuthorized, false);
});

test("CLI rejects unexpected operands with a stable scoped JSON error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      const output = JSON.parse(error.stderr);
      assert.equal(error.code, 2);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.requirementsClosureVerified, false);
      return true;
    }
  );
});

test("ledger raw bytes are exact canonical materialization with frozen raw identity", async () => {
  const absolute = path.resolve(workspaceRoot, ...VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/"));
  const raw = await readFile(absolute);
  const ledger = parseVedicInputContractRequirementsJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicInputContractRequirements(ledger));
  assert.equal(raw.byteLength, 15_859);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "85409d7f4ed7ef6bddc4d34102ecff479fd8dbe4210a78416f90ee705a0f2e59"
  );
});

test("raw JSON rejects BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
});

test("raw parser snapshots internal Uint8Array bytes without caller hooks and rejects unsafe backing", () => {
  assert.deepEqual(
    parseVedicInputContractRequirementsJsonBytes(new Uint8Array(Buffer.from("{}", "utf8"))),
    {}
  );
  assert.deepEqual(parseVedicInputContractRequirementsJsonBytes(Buffer.from("{}", "utf8")), {});

  const reads = {
    buffer: 0,
    byteOffset: 0,
    constructor: 0,
    iterator: 0,
    length: 0,
    species: 0,
    toString: 0
  };
  const hostileConstructor = {};
  Object.defineProperty(hostileConstructor, Symbol.species, {
    configurable: true,
    get() {
      reads.species += 1;
      throw new Error("caller species getter must not run");
    }
  });
  class HostileBytes extends Uint8Array {
    get buffer() {
      reads.buffer += 1;
      throw new Error("caller buffer getter must not run");
    }

    get byteOffset() {
      reads.byteOffset += 1;
      throw new Error("caller byteOffset getter must not run");
    }

    get length() {
      reads.length += 1;
      return 0;
    }

    get toString() {
      reads.toString += 1;
      throw new Error("caller toString getter must not run");
    }

    get [Symbol.iterator]() {
      reads.iterator += 1;
      throw new Error("caller iterator getter must not run");
    }
  }
  const validHostile = new HostileBytes(Buffer.from("{}", "utf8"));
  const oversizedHostile = new HostileBytes(Buffer.from(`{}${" ".repeat(4096)}`, "utf8"));
  Object.defineProperty(HostileBytes.prototype, "constructor", {
    configurable: true,
    get() {
      reads.constructor += 1;
      return hostileConstructor;
    }
  });
  assert.deepEqual(parseVedicInputContractRequirementsJsonBytes(validHostile), {});
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(oversizedHostile, "hostile fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.deepEqual(reads, {
    buffer: 0,
    byteOffset: 0,
    constructor: 0,
    iterator: 0,
    length: 0,
    species: 0,
    toString: 0
  });

  let proxyTraps = 0;
  const proxiedBytes = new Proxy(new Uint8Array(Buffer.from("{}", "utf8")), {
    get() {
      proxyTraps += 1;
      throw new Error("caller byte Proxy getter must not run");
    },
    getOwnPropertyDescriptor() {
      proxyTraps += 1;
      throw new Error("caller byte Proxy descriptor trap must not run");
    },
    getPrototypeOf() {
      proxyTraps += 1;
      throw new Error("caller byte Proxy prototype trap must not run");
    },
    ownKeys() {
      proxyTraps += 1;
      throw new Error("caller byte Proxy ownKeys trap must not run");
    }
  });
  assert.throws(
    () => parseVedicInputContractRequirementsJsonBytes(proxiedBytes),
    (error) => error.code === "JSON_INVALID"
  );
  assert.equal(proxyTraps, 0);

  if (typeof SharedArrayBuffer === "function") {
    const sharedBytes = new Uint8Array(new SharedArrayBuffer(2));
    sharedBytes.set(Buffer.from("{}", "utf8"));
    assert.throws(
      () => parseVedicInputContractRequirementsJsonBytes(sharedBytes),
      (error) => error.code === "JSON_INVALID"
    );
  }

  const resizableGetter = Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
  if (typeof resizableGetter === "function") {
    const resizableBuffer = new ArrayBuffer(2, { maxByteLength: 8 });
    if (Reflect.apply(resizableGetter, resizableBuffer, []) === true) {
      const resizableBytes = new Uint8Array(resizableBuffer);
      resizableBytes.set(Buffer.from("{}", "utf8"));
      assert.throws(
        () => parseVedicInputContractRequirementsJsonBytes(resizableBytes),
        (error) => error.code === "JSON_INVALID"
      );
    }
  }
});

test("ledger reader rejects semantically equal but non-canonical materialization", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/"));
  const parsed = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(parsed), "utf8");
  await assert.rejects(
    () => readVedicInputContractRequirementsLedger(root),
    (error) => error.code === "LEDGER_MATERIALIZATION_MISMATCH"
  );
});

test("object API rejects accessors without invocation plus prototype Proxy sparse array and cycle attacks", async () => {
  const accessor = await currentLedger();
  let reads = 0;
  Object.defineProperty(accessor.requirementInventory.requirements[0], "selectedValue", {
    enumerable: true,
    get() {
      reads += 1;
      return null;
    }
  });
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicInputContractRequirements(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const symbol = await currentLedger();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );

  const prototype = await currentLedger();
  Object.setPrototypeOf(prototype.productBoundary, null);
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, prototype),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );

  const proxy = await currentLedger();
  proxy.zeroInstanceRequirementsReceipt = new Proxy(proxy.zeroInstanceRequirementsReceipt, {});
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, proxy),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );

  const sparse = await currentLedger();
  delete sparse.requirementInventory.requirements[1];
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );

  const cycle = await currentLedger();
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_FORBIDDEN"
  );

  const negativeZero = await currentLedger();
  negativeZero.zeroInstanceRequirementsReceipt.rejectedInputs = -0;
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
  assert.throws(
    () => canonicalStringifyVedicInputContractRequirements({ value: -0 }),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("successful object verification returns a detached deeply frozen result", async () => {
  const candidate = await currentLedger();
  const result = await verifyVedicInputContractRequirementsLedger(workspaceRoot, candidate);
  assertFullyFrozenAndDetached(candidate, result);
  assert.notEqual(result.ledger, candidate);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.ledger), true);
  assert.equal(Object.isFrozen(result.ledger.requirementInventory), true);
  assert.equal(Object.isFrozen(result.ledger.requirementInventory.requirements), true);
  assert.equal(Object.isFrozen(result.ledger.requirementInventory.requirements[0]), true);
  assert.equal(Object.isFrozen(result.ledger.currentInstances.inputCandidates), true);
  assert.equal(Reflect.set(result.ledger.authorityBoundary, "releaseReady", true), false);
});

test("current requirements builder returns a deeply frozen digest-bearing object", async () => {
  const built = await buildCurrentVedicInputContractRequirementsLedger(workspaceRoot);
  for (const value of collectDataObjectGraph(built)) assert.equal(Object.isFrozen(value), true);
  const digest = built.ledgerDigest;
  assert.equal(Reflect.set(built.authorityBoundary, "formalAdmissionAuthorized", true), false);
  assert.equal(built.authorityBoundary.formalAdmissionAuthorized, false);
  assert.equal(built.ledgerDigest, digest);
});

test("all thirteen requirement IDs stay ordered draft-covered and semantically unresolved", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(
    ledger.requirementInventory.requirements.map((item) => item.requirementId),
    vedicInputContractRequirementsTestOnly.requirementSpecs.map((item) => item.requirementId)
  );
  assert.deepEqual(
    ledger.requirementInventory.requirements.map((item) => item.requirementClass),
    vedicInputContractRequirementsTestOnly.requirementSpecs.map((item) => item.requirementClass)
  );
  assert.equal(ledger.requirementInventory.requirements.every(
    (item, index) => item.order === index + 1
      && item.requirementState === "draft_shape_defined_value_unselected"
  ), true);
  assert.equal(ledger.requirementInventory.requirementsDraftCovered, 13);
  assert.equal(ledger.requirementInventory.requirementsResolved, 0);
  assert.equal(new Set(ledger.requirementInventory.requirements.map((item) => item.requirementId)).size, 13);
});

test("requirements carry only exact draft pointers and no selections defaults instances evidence rights or experts", async () => {
  const ledger = await currentLedger();
  for (const item of ledger.requirementInventory.requirements) {
    assert.equal(item.selectedValue, null);
    assert.equal(item.defaultValue, null);
    assert.deepEqual(item.artifactRefs, [
      `${vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path}#/properties/${item.requirementId}`
    ]);
    for (const key of ["instanceValues", "evidenceRefs", "sourceRefs", "rightsRefs", "expertRefs"]) {
      assert.deepEqual(item[key], []);
    }
  }
});

test("self-resigning cannot select an ayanamsa node house ephemeris or any other requirement value", async () => {
  for (const [index, value] of [[9, "invented-choice"], [10, "mean"], [11, "invented-house"], [7, "invented-ephemeris"]]) {
    await expectResignedFailure(
      (ledger) => { ledger.requirementInventory.requirements[index].selectedValue = value; },
      "REQUIREMENT_ITEM_INVALID"
    );
  }
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[0].defaultValue = "invented-default"; },
    "REQUIREMENT_ITEM_INVALID"
  );
});

test("self-resigning cannot replace draft pointers or attach fake evidence source rights expert or instances", async () => {
  const attacks = [
    ["evidenceRefs", "invented-evidence"],
    ["sourceRefs", "invented-source"],
    ["rightsRefs", "invented-right"],
    ["expertRefs", "invented-expert"],
    ["instanceValues", "invented-instance"]
  ];
  for (const [key, value] of attacks) {
    await expectResignedFailure(
      (ledger) => { ledger.requirementInventory.requirements[0][key].push(value); },
      "REQUIREMENT_ITEM_INVALID"
    );
  }
  await expectResignedFailure(
    (ledger) => { ledger.requirementInventory.requirements[0].artifactRefs[0] = "invented-artifact"; },
    "REQUIREMENT_ITEM_INVALID"
  );
});

test("zero-instance arrays and counts cannot be populated or promoted after re-digest", async () => {
  await expectResignedFailure(
    (ledger) => {
      ledger.currentInstances.inputContractArtifacts.push({ path: "fake" });
      ledger.currentInstances.counts.inputContractArtifacts = 2;
    },
    "CURRENT_INSTANCES_INVALID"
  );
  await expectResignedFailure(
    (ledger) => {
      ledger.currentInstances.inputCandidates.push({ candidateId: "fake" });
      ledger.currentInstances.counts.inputCandidates = 1;
    },
    "CURRENT_INSTANCES_INVALID"
  );
  await expectResignedFailure(
    (ledger) => {
      ledger.currentInstances.factReceipts.push({ receiptId: "fake" });
      ledger.currentInstances.counts.factReceipts = 1;
    },
    "CURRENT_INSTANCES_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.currentInstances.counts.realPersonInputs = 1; },
    "CURRENT_INSTANCES_INVALID"
  );
});

test("zero rejected inputs means no execution and cannot become validation capability or success", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.zeroInstanceRequirementsReceipt.zeroRejectedInputsMeansNoExecutionObserved = false; },
    "ZERO_INSTANCE_RECEIPT_INVALID"
  );
  for (const key of [
    "inputAcceptanceReceiptIssued", "factReceiptIssued", "successReceiptIssued",
    "receiptIsFactReceipt", "receiptIsProductReceipt", "countsTowardAdmission", "inputContractGateSatisfied"
  ]) {
    await expectResignedFailure(
      (ledger) => { ledger.zeroInstanceRequirementsReceipt[key] = true; },
      "ZERO_INSTANCE_RECEIPT_INVALID"
    );
  }
  await expectResignedFailure(
    (ledger) => { ledger.zeroInstanceRequirementsReceipt.rejectedInputs = 1; },
    "ZERO_INSTANCE_RECEIPT_INVALID"
  );
});

test("ADR fail-closed invariants cannot be weakened after self-resigning", async () => {
  const attacks = [
    (ledger) => { ledger.failClosedInvariants.defaultInference = "allowed"; },
    (ledger) => { ledger.failClosedInvariants.generativeModelInference = "allowed"; },
    (ledger) => { ledger.failClosedInvariants.missingOrAmbiguousInput = "guess"; },
    (ledger) => { ledger.failClosedInvariants.partialFactsPersisted = true; },
    (ledger) => { ledger.failClosedInvariants.crossSystemFallbackAccepted = true; }
  ];
  for (const attack of attacks) await expectResignedFailure(attack, "FAIL_CLOSED_INVARIANT_INVALID");
});

test("product identity Schema producer projector contract manifest and ruleset cannot be borrowed", async () => {
  const attacks = [
    (ledger) => { ledger.productBoundary.releaseIdentity = "legacy-v13"; },
    (ledger) => { ledger.productBoundary.targetSchema = 13; },
    (ledger) => { ledger.productBoundary.migrationId = "borrowed"; },
    (ledger) => { ledger.productBoundary.inputContract = "present"; },
    (ledger) => { ledger.productBoundary.factProducer = "present"; },
    (ledger) => { ledger.productBoundary.projector = "present"; },
    (ledger) => { ledger.productBoundary.factContract = "present"; },
    (ledger) => { ledger.productBoundary.domainManifest = "present"; },
    (ledger) => { ledger.productBoundary.versionedRuleset = "present"; }
  ];
  for (const attack of attacks) await expectResignedFailure(attack, "PRODUCT_BOUNDARY_INVALID");
});

test("saved ledger contains no borrowed producer fixture sourceRef or personal input values", async () => {
  const text = canonicalStringifyVedicInputContractRequirements(await currentLedger());
  for (const forbidden of [
    "legacy-v13", "engineering-replay:", "synthetic-e1", '"sourceRef":', "projectorVersion",
    '"birthDate"', '"latitude"', '"longitude"', '"personName"', '"utcInstant"'
  ]) {
    assert.equal(text.includes(forbidden), false, forbidden);
  }
});

test("source binding licensing and rights remain null empty and not established", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.sourceRightsBoundary.bindingRequired = 0; },
    "SOURCE_RIGHTS_BOUNDARY_INVALID"
  );
  for (const key of ["sourceCandidateIds", "sourceBodyRefs", "exactQuoteRefs", "exactLocatorRefs", "licenseEvidenceRefs", "rightsEvidenceRefs"]) {
    await expectResignedFailure(
      (ledger) => { ledger.sourceRightsBoundary[key].push("invented"); },
      "SOURCE_RIGHTS_BOUNDARY_INVALID"
    );
  }
  for (const key of ["bindingRequirementsInventoryDefined", "sourceBindingEstablished", "licenseEstablished", "rightsEstablished"]) {
    await expectResignedFailure(
      (ledger) => { ledger.sourceRightsBoundary[key] = true; },
      "SOURCE_RIGHTS_BOUNDARY_INVALID"
    );
  }
});

test("expert instances opinions and every authority or release flag remain false", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.expertBoundary.reviewerIds.push("fake-reviewer"); },
    "EXPERT_BOUNDARY_INVALID"
  );
  await expectResignedFailure(
    (ledger) => { ledger.expertBoundary.independentExpertReviewsVerified = 1; },
    "EXPERT_BOUNDARY_INVALID"
  );
  const ledger = await currentLedger();
  for (const key of Object.keys(ledger.authorityBoundary)) {
    await expectResignedFailure(
      (candidate) => { candidate.authorityBoundary[key] = true; },
      "AUTHORITY_BOUNDARY_INVALID"
    );
  }
});

test("SHA-256 cannot be relabeled as signature signer identity or authenticity", async () => {
  const attacks = [
    (ledger) => { ledger.integrityBoundary.digestIsDigitalSignature = true; },
    (ledger) => { ledger.integrityBoundary.digitalSignature = "invented"; },
    (ledger) => { ledger.integrityBoundary.signerIdentity = "invented"; },
    (ledger) => { ledger.integrityBoundary.authenticityEstablished = true; }
  ];
  for (const attack of attacks) await expectResignedFailure(attack, "INTEGRITY_BOUNDARY_INVALID");
});

test("mutation epoch atomic snapshot interval mutation and ABA stay explicitly unproved", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(ledger.observationBoundary, {
    abaExcluded: false,
    boundArtifactHashAndInspectionUseSameReadBuffer: true,
    crossFileAtomicSnapshot: false,
    draftAndRequirementsAtomicSnapshot: false,
    endpointSnapshotOnly: true,
    heldFileHandleReads: true,
    intervalMutationExcluded: false,
    ledgerHashAndParseUseSameReadBuffer: true,
    mutationEpochAvailable: false,
    mutationEpochReceipt: null,
    pathEndpointRevalidated: true,
    plainDirectoryChainRequired: true
  });
  for (const key of [
    "abaExcluded", "draftAndRequirementsAtomicSnapshot", "crossFileAtomicSnapshot",
    "intervalMutationExcluded", "mutationEpochAvailable"
  ]) {
    await expectResignedFailure(
      (candidate) => { candidate.observationBoundary[key] = true; },
      "OBSERVATION_BOUNDARY_INVALID"
    );
  }
});

test("ADR and isolated draft are bound by exact raw and same-buffer semantic identities without a parent backlink", async () => {
  const ledger = await currentLedger();
  assert.deepEqual(
    ledger.boundaryBindings.productBoundaryAdr,
    {
      bytes: 4_531,
      path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
      rawHashAndSemanticInspectionUseSameBuffer: true,
      semanticIdentity: {
        authorityStatus: "not-authoritative",
        boundaryId: "hakimi.vedic.independent-product-boundary/1.0.0",
        decisionStatus: "accepted-research-boundary",
        integrationStatus: "not-integrated",
        productStatus: "research-only",
        publicReleaseAuthorized: false,
        rereviewRequirementIds: [
          "own_input_fact_and_rule_drafts",
          "runtime_and_bundle_size_proposal",
          "three_layer_source_rights_ledger",
          "two_independent_real_expert_review_plan",
          "independent_storage_backup_recovery_and_rollback_design",
          "independent_browser_gate_and_release_evidence_design",
          "owner_scope_license_and_deployment_decision"
        ],
        semanticDigest: "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89"
      },
      sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
    }
  );
  assert.deepEqual(ledger.boundaryBindings.inputContractDraft, {
    artifactRole: "project_authored_isolated_input_contract_draft",
    bytes: vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.bytes,
    path: vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path,
    rawHashAndSemanticInspectionUseSameBuffer: true,
    schemaSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
    schemaStatus: "isolated_contract_draft",
    sha256: vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.sha256
  });
  assert.equal(
    ledger.boundaryBindings.inputContractDraft.schemaSemanticDigest,
    "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08"
  );
  assert.deepEqual(ledger.currentInstances.inputContractArtifacts, [ledger.boundaryBindings.inputContractDraft]);
  assert.equal(ledger.boundaryBindings.bindingDirection, "requirements_to_draft_and_adr_only");
  assert.equal(Object.hasOwn(ledger.boundaryBindings, "parentProductizationRequirements"), false);
});

test("any approved ADR byte drift invalidates the child ledger", async (t) => {
  const root = await makeFixture(t);
  const adrPath = path.resolve(root, ...vedicInputContractRequirementsTestOnly.expectedAdrRawIdentity.path.split("/"));
  await appendFile(adrPath, "\n", "utf8");
  const candidate = await readVedicInputContractRequirementsLedger(root);
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(root, candidate),
    (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
  );
});

test("any isolated draft raw or semantic byte drift invalidates the child ledger", async (t) => {
  const root = await makeFixture(t);
  const draftPath = path.resolve(
    root,
    ...vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path.split("/")
  );
  await appendFile(draftPath, "\n", "utf8");
  const candidate = await readVedicInputContractRequirementsLedger(root);
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(root, candidate),
    (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
  );
});

test("ADS traversal and unsafe relative path syntax are rejected", () => {
  for (const relativePath of [
    "content/system-admission/ledger.json:stream",
    "content:stream/system-admission/ledger.json",
    "content/system-admission:stream/ledger.json",
    "../ledger.json",
    "content\\system-admission\\ledger.json"
  ]) {
    assert.throws(
      () => vedicInputContractRequirementsTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("hard-linked saved ledger endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH.split("/"));
  const seed = path.join(path.dirname(target), "ledger-seed.json");
  await copyFile(target, seed);
  await rm(target);
  await link(seed, target);
  await assert.rejects(
    () => readVedicInputContractRequirementsLedger(root),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("hard-linked isolated draft endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path.split("/")
  );
  const seed = path.join(path.dirname(target), "draft-seed.json");
  await copyFile(target, seed);
  await rm(target);
  await link(seed, target);
  await assert.rejects(
    () => buildCurrentVedicInputContractRequirementsLedger(root),
    (error) => error.code === "DRAFT_SCHEMA_ENDPOINT_INVALID"
  );
});

test("hard-linked ADR endpoint is rejected", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(
    root,
    ...vedicInputContractRequirementsTestOnly.expectedAdrRawIdentity.path.split("/")
  );
  const seed = path.join(path.dirname(target), "adr-seed.md");
  await copyFile(target, seed);
  await rm(target);
  await link(seed, target);
  await assert.rejects(
    () => buildCurrentVedicInputContractRequirementsLedger(root),
    (error) => error.code === "ADR_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in the ledger chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-input-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-input-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  await mkdir(path.join(linkedRoot, "docs"), { recursive: true });
  await copyFile(
    path.resolve(realRoot, ...vedicInputContractRequirementsTestOnly.expectedAdrRawIdentity.path.split("/")),
    path.resolve(linkedRoot, ...vedicInputContractRequirementsTestOnly.expectedAdrRawIdentity.path.split("/"))
  );
  try {
    await symlink(
      path.join(realRoot, "content"),
      path.join(linkedRoot, "content"),
      process.platform === "win32" ? "junction" : "dir"
    );
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("当前平台不允许创建 junction 或目录符号链接");
      return;
    }
    throw error;
  }
  await assert.rejects(
    () => readVedicInputContractRequirementsLedger(linkedRoot),
    (error) => error.code === "LEDGER_ENDPOINT_INVALID"
  );
});

test("junction or directory symlink in the ADR docs chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-input-docs-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-input-docs-linked-"));
  t.after(async () => rm(linkedRoot, { recursive: true, force: true }));
  for (const relativePath of [
    VEDIC_INPUT_CONTRACT_REQUIREMENTS_RELATIVE_PATH,
    vedicInputContractRequirementsTestOnly.expectedDraftRawIdentity.path
  ]) {
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
      t.skip("当前平台不允许创建 junction 或目录符号链接");
      return;
    }
    throw error;
  }
  const candidate = await readVedicInputContractRequirementsLedger(linkedRoot);
  await assert.rejects(
    () => verifyVedicInputContractRequirementsLedger(linkedRoot, candidate),
    (error) => error.code === "ADR_ENDPOINT_INVALID"
  );
});

test("unknown fields and non-canonical UTC cannot be self-resigned into the current closure", async () => {
  await expectResignedFailure(
    (ledger) => { ledger.unexpected = true; },
    "LEDGER_CURRENT_CLOSURE_MISMATCH"
  );
  await expectResignedFailure(
    (ledger) => { ledger.createdAt = "2026-08-29T00:00:00Z"; },
    "LEDGER_INVALID"
  );
});
