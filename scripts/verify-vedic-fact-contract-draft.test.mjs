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
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  VedicFactContractDraftError,
  buildCurrentVedicFactContractDraft,
  canonicalPrettyStringifyVedicFactContractDraft,
  canonicalStringifyVedicFactContractDraft,
  computeVedicFactContractDraftSemanticDigest,
  parseVedicFactContractDraftJsonBytes,
  readVedicFactContractDraft,
  vedicFactContractDraftTestOnly,
  verifyVedicFactContractDraft
} from "./vedic-fact-contract-draft-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-fact-contract-draft.mjs");
const closurePaths = Object.freeze([
  VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
  vedicFactContractDraftTestOnly.expectedAdrRawIdentity.path,
  vedicFactContractDraftTestOnly.expectedInputDraftRawIdentity.path,
  vedicFactContractDraftTestOnly.expectedInputRequirementsRawIdentity.path
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

function walkJson(value, visitor, pathSegments = []) {
  visitor(value, pathSegments);
  if (Array.isArray(value)) value.forEach((entry, index) => walkJson(entry, visitor, [...pathSegments, index]));
  else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) => walkJson(entry, visitor, [...pathSegments, key]));
  }
}

async function makeFixture(t, prefix = "hakimi-vedic-fact-draft-") {
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
  return readVedicFactContractDraft(root);
}

async function expectMutationFailure(mutator, code) {
  const candidate = clone(await currentSchema());
  mutator(candidate);
  await assert.rejects(
    () => verifyVedicFactContractDraft(workspaceRoot, candidate),
    (error) => error instanceof VedicFactContractDraftError && error.code === code
  );
}

test("current Vedic fact contract draft is a zero-instance structural closure", async () => {
  const result = await verifyVedicFactContractDraft(workspaceRoot, await currentSchema());
  assert.equal(result.artifactRole, "project_authored_isolated_fact_contract_draft");
  assert.equal(result.schemaStatus, "isolated_contract_draft");
  assert.equal(result.structuralPrecheckPassed, true);
  assert.equal(result.structuralPrecheckOnly, true);
  assert.equal(result.factFamiliesDefined, 4);
  assert.equal(result.blockedPrerequisiteIds.length, 12);
  assert.equal(result.factInstancesObserved, 0);
  assert.equal(result.factGenerationCapability, false);
  assert.equal(result.factReceiptIssued, false);
  assert.equal(result.factContractGateSatisfied, false);
  assert.equal(result.deterministicFactsGateSatisfied, false);
  assert.equal(result.inputContractGateSatisfied, false);
  assert.equal(result.inputAcceptanceReceiptIssued, false);
  assert.equal(result.requirementSelectionsIncluded, 0);
  assert.equal(result.requirementsResolved, 0);
  assert.equal(result.methodSelectionsIncluded, 0);
  assert.equal(result.countsTowardAdmission, false);
  assert.equal(result.formalAdmissionAuthorized, false);
  assert.equal(result.publicReleaseAuthorized, false);
});

test("CLI reports only the scoped draft closure", async () => {
  const { stderr, stdout } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.factContractDraftClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(output.structuralPrecheckOnly, true);
  assert.equal(output.factFamiliesDefined, 4);
  assert.equal(output.blockedPrerequisites, 12);
  assert.equal(output.factInstancesObserved, 0);
  assert.equal(output.factGenerationCapability, false);
  assert.equal(output.factReceiptIssued, false);
  assert.equal(output.factContractGateSatisfied, false);
  assert.equal(output.deterministicFactsGateSatisfied, false);
  assert.equal(output.requirementsResolved, 0);
  assert.equal(output.methodSelectionsIncluded, 0);
});

test("CLI rejects unexpected operands with a stable scoped error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      const output = JSON.parse(error.stderr);
      assert.equal(error.code, 2);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.factContractDraftClosureVerified, false);
      return true;
    }
  );
});

test("schema bytes canonical SHA-256 and semantic digest are exact", async () => {
  const raw = await readFile(path.resolve(workspaceRoot, ...VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH.split("/")));
  const schema = parseVedicFactContractDraftJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicFactContractDraft(schema));
  assert.equal(raw.byteLength, 14_240);
  assert.equal(createHash("sha256").update(raw).digest("hex"), "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe");
  assert.equal(
    computeVedicFactContractDraftSemanticDigest(schema),
    "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1"
  );
});

test("fact families and scoped blocked prerequisites are exact", async () => {
  const schema = await currentSchema();
  const boundary = schema["x-hakimiBoundary"];
  assert.deepEqual(boundary.factFamilyIds, [...vedicFactContractDraftTestOnly.factFamilyIds]);
  assert.deepEqual(boundary.blockedPrerequisiteIds, [...vedicFactContractDraftTestOnly.blockedPrerequisiteIds]);
  assert.deepEqual(
    boundary.factFamilyBlockedPrerequisiteMap,
    clone(vedicFactContractDraftTestOnly.factFamilyBlockedPrerequisiteMap)
  );
  const mapped = new Set(Object.values(boundary.factFamilyBlockedPrerequisiteMap).flat());
  assert.deepEqual([...mapped].sort(), [...boundary.blockedPrerequisiteIds].sort());
});

test("basis exposes only opaque identity slots including implementation and runtime", async () => {
  const schema = await currentSchema();
  const basis = schema.properties.basis;
  for (const key of [
    "accepted_input_artifact_ref",
    "input_acceptance_receipt_ref",
    "evaluated_candidate_ref",
    "fact_generation_implementation_ref",
    "runtime_artifact_set_ref",
    "ephemeris_definition_ref",
    "sidereal_zodiac_definition_ref",
    "ayanamsa_definition_ref",
    "node_mode_definition_ref",
    "bhava_definition_ref",
    "graha_catalog_definition_ref",
    "rashi_catalog_definition_ref"
  ]) {
    assert.equal(basis.required.includes(key), true, key);
    assert.deepEqual(basis.properties[key], { $ref: "#/$defs/identityReference" });
  }
  assert.deepEqual(schema.$defs.identityReference.required, ["id", "version", "sha256"]);
  assert.equal(Object.hasOwn(schema.$defs.identityReference.properties.id, "const"), false);
});

test("nonnegative decimal is only a v0.1 encoding shape and establishes no angle range", async () => {
  const schema = await currentSchema();
  const quantity = schema.$defs.canonicalQuantity.properties.value_text;
  assert.equal(quantity.pattern, "^(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$");
  assert.equal(Object.hasOwn(quantity, "minimum"), false);
  assert.equal(Object.hasOwn(quantity, "maximum"), false);
  assert.equal(
    schema["x-hakimiBoundary"].canonicalQuantityEncodingScope,
    "v0.1_nonnegative_decimal_text_shape_only"
  );
  assert.equal(schema["x-hakimiBoundary"].angleRangeOrCoordinateSemanticsEstablished, false);
});

test("schema has no premature values methods defaults examples external refs or open objects", async () => {
  const schema = await currentSchema();
  const forbiddenTerms = ["success", "computed", "outcome", "producer", "projector"];
  const constPaths = [];
  walkJson(schema, (value, pathSegments) => {
    if (typeof value === "string") {
      for (const term of forbiddenTerms) assert.equal(value.toLowerCase().includes(term), false, pathSegments.join("."));
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      assert.equal(["default", "example", "examples"].includes(key.toLowerCase()), false, key);
      for (const term of forbiddenTerms) assert.equal(key.toLowerCase().includes(term), false, key);
    }
    assert.equal(Object.hasOwn(value, "enum"), false, pathSegments.join("."));
    if (Object.hasOwn(value, "const")) constPaths.push(pathSegments.join("."));
    if (Object.hasOwn(value, "$ref")) assert.match(value.$ref, /^#\/\$defs\/(?:canonicalQuantity|identityReference|positionFact|rashiSegmentReference)$/u);
    if (value.type === "object") assert.equal(value.additionalProperties, false, pathSegments.join("."));
  });
  assert.deepEqual(constPaths.sort(), ["properties.contractVersion", "properties.systemId"]);
});

test("fact families cannot encode an empty artifact", async () => {
  const schema = await currentSchema();
  assert.equal(schema.properties.grahaPositionFacts.minItems, 1);
  assert.equal(schema.properties.bhavaFacts.properties.boundaries.minItems, 1);
  assert.equal(schema.properties.bhavaFacts.properties.subject_assignments.minItems, 1);
  assert.deepEqual(schema.properties.lagnaFact, { $ref: "#/$defs/positionFact" });
  assert.equal(Object.hasOwn(schema.properties, "d1Chart"), false);
});

test("unreviewed candidate methods are explicitly excluded", async () => {
  const boundary = (await currentSchema())["x-hakimiBoundary"];
  assert.deepEqual(
    boundary.excludedUnreviewedCandidateMethods,
    [...vedicFactContractDraftTestOnly.excludedUnreviewedCandidateMethods]
  );
  assert.deepEqual(boundary.excludedUnreviewedCandidateMethods, [
    "d9_divisional_chart",
    "d10_divisional_chart",
    "other_divisional_charts",
    "vimshottari_dasha",
    "chara_karaka",
    "shadbala",
    "ashtakavarga"
  ]);
});

test("boundary binds the exact ADR input draft and input requirements while staying non-authoritative", async () => {
  const boundary = (await currentSchema())["x-hakimiBoundary"];
  for (const key of [
    "angleRangeOrCoordinateSemanticsEstablished", "authenticityEstablished",
    "authorshipAuthenticityEstablished", "baziAuthorityInherited", "comparisonIncluded",
    "countsTowardAdmission", "deterministicFactsGateSatisfied", "domainAuthorityAuthorized",
    "expertClaimsAuthorized", "factContractGateSatisfied", "factGenerationCapability",
    "factReceiptCapability", "factReceiptIssued", "formalAdmissionAuthorized",
    "inputAcceptanceReceiptIssued", "inputContractGateSatisfied", "publicDeploymentAuthorized",
    "publicReleaseAuthorized", "releaseReady", "rightsEstablished", "sourceBindingEstablished",
    "structuralPrecheckCountsAsFactValidation"
  ]) assert.equal(boundary[key], false, key);
  for (const key of [
    "factInstancesIncluded", "methodSelectionsIncluded", "requirementSelectionsIncluded", "requirementsResolved"
  ]) assert.equal(boundary[key], 0, key);
  assert.equal(boundary.structuralPrecheckOnly, true);
  assert.equal(boundary.boundaryBindings.bindingDirection, "fact_draft_to_adr_input_draft_and_input_requirements_only");
  assert.equal(boundary.boundaryBindings.productBoundaryAdr.sha256, vedicFactContractDraftTestOnly.expectedAdrRawIdentity.sha256);
  assert.equal(boundary.boundaryBindings.inputContractDraft.sha256, vedicFactContractDraftTestOnly.expectedInputDraftRawIdentity.sha256);
  assert.equal(
    boundary.boundaryBindings.inputContractRequirements.sha256,
    vedicFactContractDraftTestOnly.expectedInputRequirementsRawIdentity.sha256
  );
});

test("observation boundary states endpoint evidence without epoch atomicity or ABA claims", async () => {
  const observation = (await currentSchema())["x-hakimiBoundary"].observationBoundary;
  assert.equal(observation.heldFileHandleReads, true);
  assert.equal(observation.pathEndpointRevalidated, true);
  assert.equal(observation.plainDirectoryChainRequired, true);
  assert.equal(observation.schemaHashAndParseUseSameReadBuffer, true);
  assert.equal(observation.upstreamArtifactHashAndInspectionUseSameReadBuffer, true);
  assert.equal(observation.mutationEpochAvailable, false);
  assert.equal(observation.mutationEpochReceipt, null);
  assert.equal(observation.crossFileAtomicSnapshot, false);
  assert.equal(observation.intervalMutationExcluded, false);
  assert.equal(observation.abaExcluded, false);
});

test("raw parser rejects BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
});

test("raw parser uses the intrinsic byte length and rejects Proxy bytes without invoking user code", () => {
  let lengthReads = 0;
  class MisleadingBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      return 0;
    }
  }
  const oversized = new MisleadingBytes(Buffer.from(`{}${" ".repeat(4096)}`, "utf8"));
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(oversized, "subclass fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);

  let proxyReads = 0;
  const proxy = new Proxy(new Uint8Array(Buffer.from("{}", "utf8")), {
    get() {
      proxyReads += 1;
      throw new Error("byte Proxy getter must not run");
    }
  });
  assert.throws(
    () => parseVedicFactContractDraftJsonBytes(proxy),
    (error) => error.code === "JSON_INVALID"
  );
  assert.equal(proxyReads, 0);
});

test("object API passively rejects accessor Proxy Symbol prototype sparse cycle nonfinite and negative zero", async () => {
  const accessor = await currentSchema();
  let reads = 0;
  Object.defineProperty(accessor, "title", {
    enumerable: true,
    get() {
      reads += 1;
      return "Hakimi Vedic fact contract draft 0.1.0";
    }
  });
  await assert.rejects(
    () => verifyVedicFactContractDraft(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicFactContractDraft(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(reads, 0);

  const proxy = await currentSchema();
  proxy.properties = new Proxy(proxy.properties, {});
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, proxy), (error) => error.code === "INPUT_PROXY_FORBIDDEN");

  const symbol = await currentSchema();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, symbol), (error) => error.code === "INPUT_SYMBOL_FORBIDDEN");

  const prototype = await currentSchema();
  Object.setPrototypeOf(prototype.properties, null);
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, prototype), (error) => error.code === "INPUT_PROTOTYPE_INVALID");

  const sparse = await currentSchema();
  delete sparse.required[1];
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, sparse), (error) => error.code === "INPUT_ARRAY_INVALID");

  const cycle = await currentSchema();
  cycle.cycle = cycle;
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, cycle), (error) => error.code === "INPUT_CYCLE_FORBIDDEN");

  const negativeZero = await currentSchema();
  negativeZero.$defs.identityReference.properties.id.minLength = -0;
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, negativeZero), (error) => error.code === "INPUT_VALUE_INVALID");
  assert.throws(() => canonicalStringifyVedicFactContractDraft({ value: -0 }), (error) => error.code === "INPUT_VALUE_INVALID");

  const nonfinite = await currentSchema();
  nonfinite.$defs.identityReference.properties.id.minLength = Number.POSITIVE_INFINITY;
  await assert.rejects(() => verifyVedicFactContractDraft(workspaceRoot, nonfinite), (error) => error.code === "INPUT_VALUE_INVALID");
});

test("verified object result is detached and recursively frozen", async () => {
  const candidate = await currentSchema();
  const result = await verifyVedicFactContractDraft(workspaceRoot, candidate);
  assertFullyFrozenAndDetached(candidate, result);
  assert.notEqual(result.schema, candidate);
  assert.equal(Reflect.set(result.schema["x-hakimiBoundary"], "factInstancesIncluded", 1), false);
});

test("defaults examples external refs enums extra const and premature terms fail before closure comparison", async () => {
  await expectMutationFailure(
    (schema) => { schema.$defs.identityReference.properties.id.default = "invented"; },
    "SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.$defs.identityReference.properties.id.examples = ["invented"]; },
    "SCHEMA_DEFAULT_OR_EXAMPLE_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.$defs.identityReference.properties.id.$ref = "https://invalid.example/schema.json"; },
    "SCHEMA_EXTERNAL_REF_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.$defs.identityReference.properties.id.enum = ["invented"]; },
    "SCHEMA_METHOD_ENUM_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema.$defs.identityReference.properties.id.const = "invented"; },
    "SCHEMA_VALUE_SELECTION_FORBIDDEN"
  );
  await expectMutationFailure(
    (schema) => { schema["x-hakimiBoundary"].authorshipClaim = "producer identity selected"; },
    "SCHEMA_PREMATURE_SEMANTIC_FORBIDDEN"
  );
});

test("field method family and authority promotion remain fail closed", async () => {
  await expectMutationFailure(
    (schema) => { delete schema.properties.grahaPositionFacts; },
    "FACT_FIELD_SET_INVALID"
  );
  await expectMutationFailure(
    (schema) => { schema.properties.grahaPositionFacts.minItems = 0; },
    "EMPTY_FACT_SHAPE_FORBIDDEN"
  );
  for (const mutation of [
    (schema) => { schema["x-hakimiBoundary"].factInstancesIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].factReceiptIssued = true; },
    (schema) => { schema["x-hakimiBoundary"].factContractGateSatisfied = true; },
    (schema) => { schema["x-hakimiBoundary"].deterministicFactsGateSatisfied = true; },
    (schema) => { schema["x-hakimiBoundary"].formalAdmissionAuthorized = true; },
    (schema) => { schema["x-hakimiBoundary"].baziAuthorityInherited = true; },
    (schema) => { schema["x-hakimiBoundary"].baziArtifactRefs.push("legacy-v13"); },
    (schema) => { schema["x-hakimiBoundary"].methodSelectionsIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].factFamilyIds.push("d9_divisional_chart"); }
  ]) await expectMutationFailure(mutation, "BOUNDARY_PROMOTED");
});

test("schema and every bound upstream raw identity drift invalidate the closure", async (t) => {
  for (const relativePath of closurePaths) {
    const root = await makeFixture(t, "hakimi-vedic-fact-drift-");
    await appendFile(path.resolve(root, ...relativePath.split("/")), "\n", "utf8");
    await assert.rejects(
      () => buildCurrentVedicFactContractDraft(root),
      (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
    );
  }
});

test("semantically equal but noncanonical schema materialization is rejected by raw identity", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH.split("/"));
  const schema = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(schema), "utf8");
  await assert.rejects(
    () => readVedicFactContractDraft(root),
    (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
  );
});

test("hard-linked schema and all upstream endpoints are rejected", async (t) => {
  const expectedCodes = new Map([
    [VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH, "SCHEMA_ENDPOINT_INVALID"],
    [vedicFactContractDraftTestOnly.expectedAdrRawIdentity.path, "ADR_ENDPOINT_INVALID"],
    [vedicFactContractDraftTestOnly.expectedInputDraftRawIdentity.path, "INPUT_DRAFT_ENDPOINT_INVALID"],
    [vedicFactContractDraftTestOnly.expectedInputRequirementsRawIdentity.path, "INPUT_REQUIREMENTS_ENDPOINT_INVALID"]
  ]);
  for (const relativePath of closurePaths) {
    const root = await makeFixture(t, "hakimi-vedic-fact-hardlink-");
    const target = path.resolve(root, ...relativePath.split("/"));
    const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
    await copyFile(target, seed);
    await rm(target);
    await link(seed, target);
    await assert.rejects(
      () => buildCurrentVedicFactContractDraft(root),
      (error) => error.code === expectedCodes.get(relativePath)
    );
  }
});

test("junction or directory symlink in the schema chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-fact-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-fact-linked-"));
  t.after(async () => rm(linkedRoot, { force: true, recursive: true }));
  await mkdir(path.join(linkedRoot, "docs"), { recursive: true });
  await copyFile(
    path.resolve(realRoot, ...vedicFactContractDraftTestOnly.expectedAdrRawIdentity.path.split("/")),
    path.resolve(linkedRoot, ...vedicFactContractDraftTestOnly.expectedAdrRawIdentity.path.split("/"))
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
    () => readVedicFactContractDraft(linkedRoot),
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
      () => vedicFactContractDraftTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("build result freezes same-buffer upstream identities without adding an atomicity claim", async () => {
  const current = await buildCurrentVedicFactContractDraft(workspaceRoot);
  for (const value of collectDataObjectGraph(current)) assert.equal(Object.isFrozen(value), true);
  assert.deepEqual(current.rawIdentity, {
    bytes: 14_240,
    path: VEDIC_FACT_CONTRACT_DRAFT_RELATIVE_PATH,
    sha256: "6fe875bcb156ae9c7756302e96d902b8c03668e58a8894b33bc0d5fab374a1fe"
  });
  assert.deepEqual(current.upstreamIdentities, {
    inputContractDraftSemanticDigest: "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
    inputContractRequirementsLedgerDigest: "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0",
    productBoundaryAdrSemanticDigest: "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89"
  });
  assert.equal(Object.hasOwn(current, "crossFileAtomicSnapshot"), false);
});
