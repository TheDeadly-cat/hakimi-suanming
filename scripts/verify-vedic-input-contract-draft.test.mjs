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
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  VedicInputContractDraftError,
  buildCurrentVedicInputContractDraft,
  canonicalPrettyStringifyVedicInputContractDraft,
  canonicalStringifyVedicInputContractDraft,
  computeVedicInputContractDraftSemanticDigest,
  parseVedicInputContractDraftJsonBytes,
  readVedicInputContractDraft,
  vedicInputContractDraftTestOnly,
  verifyVedicInputContractDraft
} from "./vedic-input-contract-draft-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-input-contract-draft.mjs");
const closurePaths = Object.freeze([
  VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
  vedicInputContractDraftTestOnly.expectedAdrRawIdentity.path
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

async function makeFixture(t, prefix = "hakimi-vedic-input-draft-") {
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => rm(root, { force: true, recursive: true }));
  for (const relativePath of closurePaths) {
    const source = path.resolve(workspaceRoot, ...relativePath.split("/"));
    const target = path.resolve(root, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  return root;
}

async function currentSchema(root = workspaceRoot) {
  return readVedicInputContractDraft(root);
}

async function expectMutationFailure(mutator, code) {
  const candidate = clone(await currentSchema());
  mutator(candidate);
  await assert.rejects(
    () => verifyVedicInputContractDraft(workspaceRoot, candidate),
    (error) => error instanceof VedicInputContractDraftError && error.code === code
  );
}

function walkJson(value, visitor) {
  visitor(value);
  if (Array.isArray(value)) value.forEach((entry) => walkJson(entry, visitor));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => walkJson(entry, visitor));
}

test("current Vedic input contract draft is an exact structural-only zero-instance closure", async () => {
  const schema = await currentSchema();
  const result = await verifyVedicInputContractDraft(workspaceRoot, schema);
  assert.equal(result.schemaStatus, "isolated_contract_draft");
  assert.equal(result.artifactRole, "project_authored_isolated_input_contract_draft");
  assert.equal(result.structuralPrecheckPassed, true);
  assert.equal(result.structuralPrecheckOnly, true);
  assert.equal(result.requirementFieldsDefined, 13);
  assert.equal(result.requirementSelectionsIncluded, 0);
  assert.equal(result.requirementsResolved, 0);
  assert.equal(result.inputInstancesObserved, 0);
  assert.equal(result.inputAccepted, false);
  assert.equal(result.inputAcceptanceReceiptIssued, false);
  assert.equal(result.factReceiptIssued, false);
  assert.equal(result.successReceiptIssued, false);
  assert.equal(result.inputContractGateSatisfied, false);
  assert.equal(result.countsTowardAdmission, false);
  assert.equal(result.formalAdmissionAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
});

test("CLI reports structure without issuing an acceptance fact or success receipt", async () => {
  const { stderr, stdout } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.structuralClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.structuralPrecheckOnly, true);
  assert.equal(output.structuralPrecheckPassed, true);
  assert.equal(output.requirementFieldsDefined, 13);
  assert.equal(output.requirementSelectionsIncluded, 0);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.inputAccepted, false);
  assert.equal(output.inputAcceptanceReceiptIssued, false);
  assert.equal(output.factReceiptIssued, false);
  assert.equal(output.successReceiptIssued, false);
  assert.equal(output.inputContractGateSatisfied, false);
  assert.equal(output.countsTowardAdmission, false);
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
      assert.equal(output.structuralClosureVerified, false);
      return true;
    }
  );
});

test("schema bytes canonical SHA-256 and semantic digest are exact", async () => {
  const raw = await readFile(path.resolve(workspaceRoot, ...VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH.split("/")));
  const schema = parseVedicInputContractDraftJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicInputContractDraft(schema));
  assert.equal(raw.byteLength, 16_529);
  assert.equal(createHash("sha256").update(raw).digest("hex"), "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69");
  assert.equal(
    computeVedicInputContractDraftSemanticDigest(schema),
    "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08"
  );
});

test("contractVersion plus all thirteen requirement fields are exact and one-to-one", async () => {
  const schema = await currentSchema();
  assert.equal(schema.properties.contractVersion.const, "hakimi.vedic.input/0.1-draft");
  assert.deepEqual(schema.required, ["contractVersion", ...vedicInputContractDraftTestOnly.requirementFields]);
  assert.deepEqual(
    Object.keys(schema.properties).filter((key) => key !== "contractVersion").sort(),
    [...vedicInputContractDraftTestOnly.requirementFields].sort()
  );
});

test("every requirement branch carries explicit identifier and version declarations", async () => {
  const schema = await currentSchema();
  for (const field of vedicInputContractDraftTestOnly.requirementFields) {
    const declaration = schema.properties[field];
    const branches = declaration.oneOf ?? [declaration];
    for (const branch of branches) {
      const required = branch.required;
      assert.equal(required.some((key) => key.endsWith("_id")), true, field);
      assert.equal(required.some((key) => key.endsWith("_version") || key === "tzdb_version"), true, field);
    }
  }
});

test("schema has no defaults examples external refs or open instance objects", async () => {
  const schema = await currentSchema();
  walkJson(schema, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    assert.equal(Object.hasOwn(value, "default"), false);
    assert.equal(Object.hasOwn(value, "example"), false);
    assert.equal(Object.hasOwn(value, "examples"), false);
    if (Object.hasOwn(value, "$ref")) assert.match(value.$ref, /^#\/\$defs\//u);
    if (value.type === "object") assert.equal(value.additionalProperties, false);
  });
});

test("boundary is zero-instance non-authoritative and binds only the approved ADR", async () => {
  const boundary = (await currentSchema())["x-hakimiBoundary"];
  for (const key of [
    "acceptanceCapability", "authenticityEstablished", "authorshipAuthenticityEstablished",
    "baziAuthorityInherited", "countsTowardAdmission", "domainAuthorityAuthorized", "expertClaimsAuthorized",
    "factReceiptCapability", "factReceiptIssued", "formalAdmissionAuthorized", "inputAcceptanceReceiptIssued",
    "inputAccepted", "inputContractGateSatisfied", "normalizationCapability", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseReady", "rightsEstablished", "structuralPrecheckCountsAsAcceptance",
    "successReceiptCapability", "successReceiptIssued"
  ]) assert.equal(boundary[key], false, key);
  for (const key of [
    "acceptedInputsIncluded", "inputInstancesIncluded", "realPersonInputsIncluded", "requirementSelectionsIncluded",
    "requirementsResolved", "sampleInputsIncluded", "syntheticPersonInputsIncluded"
  ]) assert.equal(boundary[key], 0, key);
  assert.equal(boundary.structuralPrecheckOnly, true);
  assert.deepEqual(boundary.externalSourceRefs, []);
  assert.deepEqual(boundary.baziArtifactRefs, []);
  assert.deepEqual(boundary.productBoundaryAdr, {
    bytes: 4_531,
    path: "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md",
    rawHashAndSemanticInspectionUseSameBuffer: true,
    sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
  });
});

test("raw parser rejects BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
});

test("raw parser snapshots internal Uint8Array bytes without caller hooks and rejects unsafe backing", () => {
  assert.deepEqual(
    parseVedicInputContractDraftJsonBytes(new Uint8Array(Buffer.from("{}", "utf8"))),
    {}
  );
  assert.deepEqual(parseVedicInputContractDraftJsonBytes(Buffer.from("{}", "utf8")), {});

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
  assert.deepEqual(parseVedicInputContractDraftJsonBytes(validHostile), {});
  assert.throws(
    () => parseVedicInputContractDraftJsonBytes(oversizedHostile, "hostile fixture", 1),
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
    () => parseVedicInputContractDraftJsonBytes(proxiedBytes),
    (error) => error.code === "JSON_INVALID"
  );
  assert.equal(proxyTraps, 0);

  if (typeof SharedArrayBuffer === "function") {
    const sharedBytes = new Uint8Array(new SharedArrayBuffer(2));
    sharedBytes.set(Buffer.from("{}", "utf8"));
    assert.throws(
      () => parseVedicInputContractDraftJsonBytes(sharedBytes),
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
        () => parseVedicInputContractDraftJsonBytes(resizableBytes),
        (error) => error.code === "JSON_INVALID"
      );
    }
  }
});

test("object API rejects accessors without invocation Proxy Symbol prototype sparse cycle and negative zero", async () => {
  const accessor = await currentSchema();
  let reads = 0;
  Object.defineProperty(accessor, "title", {
    enumerable: true,
    get() {
      reads += 1;
      return "Hakimi Vedic input contract draft 0.1.0";
    }
  });
  await assert.rejects(
    () => verifyVedicInputContractDraft(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicInputContractDraft(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const proxy = await currentSchema();
  proxy.properties = new Proxy(proxy.properties, {});
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, proxy), (error) => error.code === "INPUT_PROXY_FORBIDDEN");

  const symbol = await currentSchema();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, symbol), (error) => error.code === "INPUT_SYMBOL_FORBIDDEN");

  const prototype = await currentSchema();
  Object.setPrototypeOf(prototype.properties, null);
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, prototype), (error) => error.code === "INPUT_PROTOTYPE_INVALID");

  const sparse = await currentSchema();
  delete sparse.required[1];
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, sparse), (error) => error.code === "INPUT_ARRAY_INVALID");

  const cycle = await currentSchema();
  cycle.cycle = cycle;
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, cycle), (error) => error.code === "INPUT_CYCLE_FORBIDDEN");

  const negativeZero = await currentSchema();
  negativeZero.properties.place_coordinates_and_precision.properties.precision_meters.minimum = -0;
  await assert.rejects(() => verifyVedicInputContractDraft(workspaceRoot, negativeZero), (error) => error.code === "INPUT_VALUE_INVALID");
  assert.throws(
    () => canonicalStringifyVedicInputContractDraft({ value: -0 }),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("successful object verification is detached and deeply frozen", async () => {
  const candidate = await currentSchema();
  const result = await verifyVedicInputContractDraft(workspaceRoot, candidate);
  assertFullyFrozenAndDetached(candidate, result);
  assert.notEqual(result.schema, candidate);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.schema), true);
  assert.equal(Object.isFrozen(result.schema.properties), true);
  assert.equal(Object.isFrozen(result.schema.required), true);
  assert.equal(Object.isFrozen(result.schema["x-hakimiBoundary"]), true);
  assert.equal(Reflect.set(result.schema["x-hakimiBoundary"], "inputAccepted", true), false);
});

test("default example and external schema injection fail before closure comparison", async () => {
  await expectMutationFailure(
    (schema) => { schema.properties.ayanamsa_identity_and_version.properties.ayanamsa_id.default = "invented"; },
    "SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.properties.civil_calendar_and_date.examples = [{ year: 2000 }]; },
    "SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.properties.bhava_house_definition.$ref = "https://example.invalid/schema.json"; },
    "SCHEMA_EXTERNAL_REF_FORBIDDEN"
  );
});

test("missing or aliased requirement fields remain fail closed", async () => {
  await expectMutationFailure(
    (schema) => { delete schema.properties.ayanamsa_identity_and_version; },
    "REQUIREMENT_FIELD_SET_INVALID"
  );
  await expectMutationFailure(
    (schema) => { schema.required[1] = "birthDate"; },
    "REQUIREMENT_FIELD_SET_INVALID"
  );
});

test("authority Bazi instance selection and receipt promotion are rejected", async () => {
  for (const mutation of [
    (schema) => { schema["x-hakimiBoundary"].inputAccepted = true; },
    (schema) => { schema["x-hakimiBoundary"].formalAdmissionAuthorized = true; },
    (schema) => { schema["x-hakimiBoundary"].factReceiptIssued = true; },
    (schema) => { schema["x-hakimiBoundary"].successReceiptIssued = true; },
    (schema) => { schema["x-hakimiBoundary"].baziAuthorityInherited = true; },
    (schema) => { schema["x-hakimiBoundary"].baziArtifactRefs.push("legacy-v13"); },
    (schema) => { schema["x-hakimiBoundary"].inputInstancesIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].requirementSelectionsIncluded = 1; }
  ]) await expectMutationFailure(mutation, "BOUNDARY_PROMOTED");
});

test("draft and ADR raw byte drift invalidate the closure", async (t) => {
  for (const relativePath of closurePaths) {
    const root = await makeFixture(t, "hakimi-vedic-drift-");
    await appendFile(path.resolve(root, ...relativePath.split("/")), "\n", "utf8");
    await assert.rejects(
      () => buildCurrentVedicInputContractDraft(root),
      (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
    );
  }
});

test("semantically equal but noncanonical schema materialization is rejected by raw identity", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH.split("/"));
  const schema = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(schema), "utf8");
  await assert.rejects(
    () => readVedicInputContractDraft(root),
    (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
  );
});

test("hard-linked schema and ADR endpoints are rejected", async (t) => {
  for (const [relativePath, expectedCode] of [
    [VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH, "SCHEMA_ENDPOINT_INVALID"],
    [vedicInputContractDraftTestOnly.expectedAdrRawIdentity.path, "ADR_ENDPOINT_INVALID"]
  ]) {
    const root = await makeFixture(t, "hakimi-vedic-hardlink-");
    const target = path.resolve(root, ...relativePath.split("/"));
    const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
    await copyFile(target, seed);
    await rm(target);
    await link(seed, target);
    await assert.rejects(
      () => buildCurrentVedicInputContractDraft(root),
      (error) => error.code === expectedCode
    );
  }
});

test("junction or directory symlink in the schema chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-linked-"));
  t.after(async () => rm(linkedRoot, { force: true, recursive: true }));
  await mkdir(path.join(linkedRoot, "docs"), { recursive: true });
  await copyFile(
    path.resolve(realRoot, ...vedicInputContractDraftTestOnly.expectedAdrRawIdentity.path.split("/")),
    path.resolve(linkedRoot, ...vedicInputContractDraftTestOnly.expectedAdrRawIdentity.path.split("/"))
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
    () => readVedicInputContractDraft(linkedRoot),
    (error) => error.code === "SCHEMA_ENDPOINT_INVALID"
  );
});

test("ADS traversal and unsafe relative path syntax are rejected", () => {
  for (const relativePath of [
    "content/system-admission/schema.json:stream",
    "content:stream/system-admission/schema.json",
    "../schema.json",
    "content\\system-admission\\schema.json"
  ]) {
    assert.throws(
      () => vedicInputContractDraftTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("build result records same-buffer identities without claiming cross-file atomicity", async () => {
  const current = await buildCurrentVedicInputContractDraft(workspaceRoot);
  for (const value of collectDataObjectGraph(current)) assert.equal(Object.isFrozen(value), true);
  assert.deepEqual(current.rawIdentity, {
    bytes: 16_529,
    path: VEDIC_INPUT_CONTRACT_DRAFT_RELATIVE_PATH,
    sha256: "4899e8fdf267a44e401295f23e11e2504e45f8e2f731c6be9b8ad1435e8dbf69"
  });
  assert.equal(current.schema["x-hakimiBoundary"].productBoundaryAdr.rawHashAndSemanticInspectionUseSameBuffer, true);
  assert.equal(Object.hasOwn(current, "crossFileAtomicSnapshot"), false);
});
