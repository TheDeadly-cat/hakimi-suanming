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
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  VedicRuleContractDraftError,
  buildCurrentVedicRuleContractDraft,
  canonicalPrettyStringifyVedicRuleContractDraft,
  canonicalStringifyVedicRuleContractDraft,
  computeVedicRuleContractDraftSemanticDigest,
  parseVedicRuleContractDraftJsonBytes,
  readVedicRuleContractDraft,
  vedicRuleContractDraftTestOnly,
  verifyVedicRuleContractDraft
} from "./vedic-rule-contract-draft-lib.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-rule-contract-draft.mjs");
const closurePaths = Object.freeze([
  VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
  vedicRuleContractDraftTestOnly.expectedAdrRawIdentity.path,
  vedicRuleContractDraftTestOnly.expectedInputDraftRawIdentity.path,
  vedicRuleContractDraftTestOnly.expectedInputRequirementsRawIdentity.path,
  vedicRuleContractDraftTestOnly.expectedFactDraftRawIdentity.path,
  vedicRuleContractDraftTestOnly.expectedFactRequirementsRawIdentity.path
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
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkJson(entry, visitor, [...pathSegments, index]));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, entry]) =>
      walkJson(entry, visitor, [...pathSegments, key]));
  }
}

async function makeFixture(t, prefix = "hakimi-vedic-rule-draft-") {
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
  return readVedicRuleContractDraft(root);
}

async function expectMutationFailure(mutator, expectedCode) {
  const candidate = clone(await currentSchema());
  mutator(candidate);
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, candidate),
    (error) => error instanceof VedicRuleContractDraftError
      && (expectedCode === undefined || error.code === expectedCode)
      && error.code !== "SCHEMA_CURRENT_CLOSURE_MISMATCH"
  );
}

test("current Vedic rule contract draft is a zero-instance isolated structural closure", async () => {
  const result = await verifyVedicRuleContractDraft(workspaceRoot, await currentSchema());
  assert.equal(result.artifactRole, "project_authored_isolated_rule_contract_draft");
  assert.equal(result.schemaStatus, "isolated_contract_draft");
  assert.equal(result.structuralPrecheckPassed, true);
  assert.equal(result.structuralPrecheckOnly, true);
  assert.equal(result.blockedPrerequisiteIds.length, 13);
  assert.equal(result.blockedPrerequisitesDefined, 13);
  assert.equal(result.blockedPrerequisitesResolved, 0);
  assert.equal(result.blockedPrerequisitesUniverseClosed, false);
  for (const key of [
    "factInstancesObserved",
    "methodSelectionsIncluded",
    "requirementSelectionsIncluded",
    "requirementsResolved",
    "ruleBodiesIncluded",
    "ruleDefinitionsIncluded",
    "ruleInstancesObserved",
    "rulesetInstancesObserved",
    "sourceBodiesIncluded"
  ]) assert.equal(result[key], 0, key);
  for (const key of [
    "countsTowardAdmission",
    "factContractGateSatisfied",
    "formalAdmissionAuthorized",
    "inputContractGateSatisfied",
    "publicReleaseAuthorized",
    "releaseReady",
    "ruleContractGateSatisfied",
    "ruleEvaluationCapability",
    "ruleReceiptIssued",
    "rulesetExecutionCapability",
    "successReceiptIssued",
    "versionedRulesetGateSatisfied"
  ]) assert.equal(result[key], false, key);
});

test("CLI reports only the scoped rule draft closure", async () => {
  const { stderr, stdout } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  assert.equal(stdout.split("\n").filter(Boolean).length, 1);
  const output = JSON.parse(stdout);
  assert.equal(output.ruleContractDraftClosureVerified, true);
  assert.equal(Object.hasOwn(output, "ok"), false);
  assert.equal(Object.hasOwn(output, "requirementsClosureVerified"), false);
  assert.equal(output.schema, VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH);
  assert.equal(output.schemaStatus, "isolated_contract_draft");
  assert.equal(output.blockedPrerequisites, 13);
  assert.equal(output.blockedPrerequisitesResolved, 0);
  assert.equal(output.blockedPrerequisitesUniverseClosed, false);
  assert.equal(output.ruleDefinitionsIncluded, 0);
  assert.equal(output.ruleInstancesObserved, 0);
  assert.equal(output.rulesetInstancesObserved, 0);
  assert.equal(output.ruleEvaluationCapability, false);
  assert.equal(output.rulesetExecutionCapability, false);
  assert.equal(output.ruleContractGateSatisfied, false);
  assert.equal(output.versionedRulesetGateSatisfied, false);
  assert.equal(output.publicReleaseAuthorized, false);
});

test("CLI rejects every operand with exit 2 and a stable scoped error", async () => {
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "nonexistent.json"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      assert.equal(error.code, 2);
      assert.equal(error.stdout, "");
      assert.equal(error.stderr.split("\n").filter(Boolean).length, 1);
      const output = JSON.parse(error.stderr);
      assert.equal(output.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(output.ruleContractDraftClosureVerified, false);
      assert.equal(Object.hasOwn(output, "ok"), false);
      return true;
    }
  );
});

test("schema bytes canonical SHA-256 and semantic digest are exact", async () => {
  const raw = await readFile(
    path.resolve(workspaceRoot, ...VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH.split("/"))
  );
  const schema = parseVedicRuleContractDraftJsonBytes(raw);
  assert.equal(raw.toString("utf8"), canonicalPrettyStringifyVedicRuleContractDraft(schema));
  assert.equal(raw.byteLength, 12_140);
  assert.equal(
    createHash("sha256").update(raw).digest("hex"),
    "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
  );
  assert.equal(
    computeVedicRuleContractDraftSemanticDigest(schema),
    "3491132c1c5081eac5bb76f6fe1d67400da954ace73546589f34322dd11ae3f3"
  );
});

test("rule and ruleset envelopes cover only opaque identity-shaped declarations", async () => {
  const schema = await currentSchema();
  const rule = schema.properties.ruleDefinitionEnvelope;
  const ruleset = schema.properties.rulesetEnvelope;
  assert.deepEqual(rule.required, [...vedicRuleContractDraftTestOnly.ruleDefinitionRequired]);
  assert.deepEqual(ruleset.required, [...vedicRuleContractDraftTestOnly.rulesetRequired]);
  for (const field of [
    "school_definition_ref",
    "applicability_definition_ref",
    "conflict_definition_refs",
    "counterexample_definition_refs",
    "source_binding_refs",
    "rule_version_ref",
    "rule_digest_ref",
    "summary_ref",
    "fact_dependency_contract_ref",
    "rights_policy_ref",
    "expert_review_policy_ref",
    "high_risk_policy_ref",
    "implementation_artifact_set_ref",
    "failure_channel_contract_ref"
  ]) assert.equal(Object.hasOwn(rule.properties, field), true, field);
  for (const field of [
    "ruleset_version_ref",
    "ruleset_digest_ref",
    "summary_ref",
    "school_scope_ref",
    "rule_definition_refs",
    "fact_contract_ref",
    "source_binding_policy_ref",
    "rights_policy_ref",
    "expert_review_policy_ref",
    "high_risk_policy_ref",
    "implementation_artifact_set_ref",
    "failure_channel_contract_ref"
  ]) assert.equal(Object.hasOwn(ruleset.properties, field), true, field);
  assert.deepEqual(rule.properties.rule_digest_ref, { $ref: "#/$defs/opaqueIdentityRef" });
  assert.deepEqual(ruleset.properties.ruleset_digest_ref, { $ref: "#/$defs/opaqueIdentityRef" });
  assert.equal(schema.$defs.opaqueIdentityRefList.minItems, undefined);
  assert.equal(schema.$defs.nonEmptyOpaqueIdentityRefList.minItems, 1);
  assert.deepEqual(rule.properties.conflict_definition_refs, { $ref: "#/$defs/opaqueIdentityRefList" });
  assert.deepEqual(rule.properties.counterexample_definition_refs, { $ref: "#/$defs/opaqueIdentityRefList" });
});

test("schema contains no rule body truth defaults examples enum external refs or open instance objects", async () => {
  const schema = await currentSchema();
  const instanceSchema = { $defs: schema.$defs, properties: schema.properties };
  const constPaths = [];
  const forbidden = [
    "rule_body", "predicate", "expression", "weight", "score", "computed", "outcome",
    "hit_result", "interpretation_text", "traditional_quote", "expert_disposition",
    "producer", "projector", "executable"
  ];
  walkJson(instanceSchema, (value, pathSegments) => {
    if (typeof value === "string") {
      for (const term of forbidden) {
        assert.equal(value.toLowerCase().includes(term), false, pathSegments.join("."));
      }
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    for (const key of Object.keys(value)) {
      assert.equal(["default", "example", "examples"].includes(key.toLowerCase()), false, key);
      for (const term of forbidden) assert.equal(key.toLowerCase().includes(term), false, key);
    }
    assert.equal(Object.hasOwn(value, "enum"), false, pathSegments.join("."));
    if (Object.hasOwn(value, "const")) constPaths.push(pathSegments.join("."));
    if (Object.hasOwn(value, "$ref")) {
      assert.match(
        value.$ref,
        /^#\/\$defs\/(?:nonEmptyOpaqueIdentityRefList|opaqueIdentityRef|opaqueIdentityRefList)$/u
      );
    }
    if (value.type === "object") assert.equal(value.additionalProperties, false, pathSegments.join("."));
  });
  assert.deepEqual(constPaths.sort(), ["properties.contractVersion", "properties.systemId"]);
});

test("candidate methods occur exactly once and only as excluded unreviewed IDs", async () => {
  const schema = await currentSchema();
  const boundary = schema["x-hakimiBoundary"];
  assert.deepEqual(
    boundary.excludedUnreviewedCandidateMethodIds,
    [...vedicRuleContractDraftTestOnly.excludedUnreviewedCandidateMethodIds]
  );
  const occurrences = new Map(
    vedicRuleContractDraftTestOnly.excludedUnreviewedCandidateMethodIds
      .map((methodId) => [methodId, []])
  );
  walkJson(schema, (value, pathSegments) => {
    if (typeof value === "string" && occurrences.has(value)) {
      occurrences.get(value).push(pathSegments.join("."));
    }
  });
  for (const paths of occurrences.values()) {
    assert.equal(paths.length, 1);
    assert.match(paths[0], /^x-hakimiBoundary\.excludedUnreviewedCandidateMethodIds\.\d+$/u);
  }
  assert.equal(boundary.methodSelectionsIncluded, 0);
  assert.equal(boundary.schoolSelectionsIncluded, 0);
});

test("blocked prerequisites are scoped open and all unresolved", async () => {
  const boundary = (await currentSchema())["x-hakimiBoundary"];
  assert.deepEqual(
    boundary.blockedPrerequisiteIds,
    [...vedicRuleContractDraftTestOnly.blockedPrerequisiteIds]
  );
  assert.equal(new Set(boundary.blockedPrerequisiteIds).size, 13);
  assert.equal(boundary.blockedPrerequisitesDefined, 13);
  assert.equal(boundary.blockedPrerequisitesResolved, 0);
  assert.equal(boundary.blockedPrerequisitesUniverseClosed, false);
  assert.equal(boundary.requirementsResolved, 0);
  assert.equal(boundary.requirementsUniverseClosed, false);
  assert.equal(boundary.requirementSelectionsIncluded, 0);
});

test("authority capability receipt and instance boundary is entirely false or zero", async () => {
  const boundary = (await currentSchema())["x-hakimiBoundary"];
  for (const key of [
    "authenticityEstablished",
    "authorshipAuthenticityEstablished",
    "baziAuthorityInherited",
    "countsTowardAdmission",
    "domainAuthorityAuthorized",
    "expertClaimsAuthorized",
    "factContractGateSatisfied",
    "factReceiptIssued",
    "formalAdmissionAuthorized",
    "highRiskClaimsAuthorized",
    "inputAcceptanceReceiptIssued",
    "inputContractGateSatisfied",
    "publicDeploymentAuthorized",
    "publicReleaseAuthorized",
    "releaseReady",
    "rightsEstablished",
    "ruleContractGateSatisfied",
    "ruleEvaluationCapability",
    "ruleReceiptCapability",
    "ruleReceiptIssued",
    "rulesetExecutionCapability",
    "sourceBindingEstablished",
    "structuralPrecheckCountsAsRuleValidation",
    "successReceiptCapability",
    "successReceiptIssued",
    "versionedRulesetGateSatisfied"
  ]) assert.equal(boundary[key], false, key);
  for (const key of [
    "factInstancesIncluded",
    "methodSelectionsIncluded",
    "requirementSelectionsIncluded",
    "requirementsResolved",
    "ruleBodiesIncluded",
    "ruleDefinitionsIncluded",
    "ruleInstancesIncluded",
    "rulesetInstancesIncluded",
    "schoolSelectionsIncluded",
    "sourceBodiesIncluded"
  ]) assert.equal(boundary[key], 0, key);
  for (const key of ["baziArtifactRefs", "externalSourceRefs", "implementationArtifactRefs"]) {
    assert.deepEqual(boundary[key], [], key);
  }
  assert.equal(boundary.structuralPrecheckOnly, true);
});

test("binding graph is exact one-way acyclic and has no parent or registry backlink", async () => {
  const bindings = (await currentSchema())["x-hakimiBoundary"].boundaryBindings;
  assert.equal(bindings.bindingDirection, "rule_draft_to_adr_input_and_fact_closures_only");
  assert.deepEqual(bindings.chainOrder, [...vedicRuleContractDraftTestOnly.chainOrder]);
  assert.equal(new Set(bindings.chainOrder).size, bindings.chainOrder.length);
  assert.equal(bindings.chainOrder.includes(VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH), false);
  const encoded = canonicalStringifyVedicRuleContractDraft(bindings);
  assert.equal(encoded.includes("vedic-independent-productization-requirements"), false);
  assert.equal(encoded.includes("four-system"), false);
  assert.equal(
    bindings.factContractDraft.sha256,
    vedicRuleContractDraftTestOnly.expectedFactDraftRawIdentity.sha256
  );
  assert.equal(
    bindings.factContractRequirements.sha256,
    vedicRuleContractDraftTestOnly.expectedFactRequirementsRawIdentity.sha256
  );
  assert.equal(
    bindings.inputContractDraft.sha256,
    vedicRuleContractDraftTestOnly.expectedInputDraftRawIdentity.sha256
  );
  assert.equal(
    bindings.inputContractRequirements.sha256,
    vedicRuleContractDraftTestOnly.expectedInputRequirementsRawIdentity.sha256
  );
  assert.equal(
    bindings.productBoundaryAdr.sha256,
    vedicRuleContractDraftTestOnly.expectedAdrRawIdentity.sha256
  );
  await expectMutationFailure(
    (schema) => { schema["x-hakimiBoundary"].boundaryBindings.chainOrder.push(VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH); },
    "BOUNDARY_GRAPH_CYCLIC"
  );
  await expectMutationFailure(
    (schema) => { schema["x-hakimiBoundary"].boundaryBindings.chainOrder[1] = bindings.chainOrder[0]; },
    "BOUNDARY_GRAPH_CYCLIC"
  );
});

test("observation boundary states same-buffer evidence without epoch atomicity interval or ABA claims", async () => {
  const observation = (await currentSchema())["x-hakimiBoundary"].observationBoundary;
  assert.deepEqual(observation, clone(vedicRuleContractDraftTestOnly.expectedObservationBoundary));
  assert.equal(observation.heldFileHandleReads, true);
  assert.equal(observation.pathEndpointRevalidated, true);
  assert.equal(observation.plainDirectoryChainRequired, true);
  assert.equal(observation.schemaHashAndParseUseSameReadBuffer, true);
  assert.equal(observation.upstreamArtifactHashAndInspectionUseSameReadBuffer, true);
  assert.equal(observation.mutationEpochAvailable, false);
  assert.equal(observation.mutationEpochReceipt, null);
  assert.equal(observation.crossFileAtomicSnapshot, false);
  assert.equal(observation.ruleDraftAndUpstreamsAtomicSnapshot, false);
  assert.equal(observation.intervalMutationExcluded, false);
  assert.equal(observation.abaExcluded, false);
});

test("raw parser rejects BOM invalid UTF-8 duplicate keys non-object roots and oversize", () => {
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d])),
    (error) => error.code === "JSON_BOM_FORBIDDEN"
  );
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from([0xc3, 0x28])),
    (error) => error.code === "JSON_UTF8_INVALID"
  );
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from('{"a":1,"a":2}', "utf8")),
    (error) => error.code === "JSON_DUPLICATE_KEY"
  );
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from("[]", "utf8")),
    (error) => error.code === "JSON_INVALID"
  );
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from("{}", "utf8"), "fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(Buffer.from("{}", "utf8"), "fixture", -0),
    (error) => error.code === "JSON_TOO_LARGE"
  );
});

test("raw parser uses intrinsic Uint8Array slots and rejects Proxy bytes without traps", () => {
  let lengthReads = 0;
  class HostileLengthBytes extends Uint8Array {
    get length() {
      lengthReads += 1;
      throw new Error("hostile length getter must not run");
    }
  }
  const bytes = new HostileLengthBytes(Buffer.from("{}", "utf8"));
  assert.deepEqual(parseVedicRuleContractDraftJsonBytes(bytes), {});
  assert.equal(lengthReads, 0);

  const oversized = new HostileLengthBytes(Buffer.from(`{}${" ".repeat(4096)}`, "utf8"));
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(oversized, "subclass fixture", 1),
    (error) => error.code === "JSON_TOO_LARGE"
  );
  assert.equal(lengthReads, 0);

  let proxyTraps = 0;
  const proxy = new Proxy(new Uint8Array(Buffer.from("{}", "utf8")), {
    get() {
      proxyTraps += 1;
      throw new Error("byte Proxy trap must not run");
    }
  });
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(proxy),
    (error) => error.code === "JSON_PROXY_FORBIDDEN"
  );
  assert.equal(proxyTraps, 0);
});

test("raw parser rejects shared resizable and detached buffers and snapshots mutable source bytes", (t) => {
  if (typeof SharedArrayBuffer !== "function") {
    t.skip("当前运行时没有 SharedArrayBuffer");
    return;
  }
  const shared = new SharedArrayBuffer(2);
  new Uint8Array(shared).set(Buffer.from("{}", "utf8"));
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(new Uint8Array(shared)),
    (error) => error.code === "JSON_SHARED_BUFFER_FORBIDDEN"
  );
  if (typeof ArrayBuffer.prototype.resize === "function") {
    const resizable = new ArrayBuffer(2, { maxByteLength: 16 });
    new Uint8Array(resizable).set(Buffer.from("{}", "utf8"));
    assert.throws(
      () => parseVedicRuleContractDraftJsonBytes(new Uint8Array(resizable)),
      (error) => error.code === "JSON_RESIZABLE_BUFFER_FORBIDDEN"
    );
  }
  const detachable = new ArrayBuffer(2);
  const detachedView = new Uint8Array(detachable);
  detachedView.set(Buffer.from("{}", "utf8"));
  structuredClone(detachable, { transfer: [detachable] });
  assert.throws(
    () => parseVedicRuleContractDraftJsonBytes(detachedView),
    (error) => error.code === "JSON_INVALID"
  );
  const source = new Uint8Array(Buffer.from('{"captured":true}', "utf8"));
  const parsed = parseVedicRuleContractDraftJsonBytes(source);
  source.fill(0);
  assert.deepEqual(parsed, { captured: true });
});

test("object API rejects accessor Proxy and Symbol without invoking user code", async () => {
  const accessor = await currentSchema();
  let accessorReads = 0;
  Object.defineProperty(accessor, "title", {
    enumerable: true,
    get() {
      accessorReads += 1;
      throw new Error("accessor must not run");
    }
  });
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.throws(
    () => canonicalStringifyVedicRuleContractDraft(accessor),
    (error) => error.code === "INPUT_ACCESSOR_FORBIDDEN"
  );
  assert.equal(accessorReads, 0);

  const proxyCandidate = await currentSchema();
  let proxyTraps = 0;
  proxyCandidate.properties = new Proxy(proxyCandidate.properties, {
    get() {
      proxyTraps += 1;
      throw new Error("object Proxy trap must not run");
    }
  });
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, proxyCandidate),
    (error) => error.code === "INPUT_PROXY_FORBIDDEN"
  );
  assert.equal(proxyTraps, 0);

  const symbol = await currentSchema();
  symbol[Symbol("hidden")] = true;
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, symbol),
    (error) => error.code === "INPUT_SYMBOL_FORBIDDEN"
  );
});

test("object API rejects bad prototypes sparse or decorated arrays cycles nonfinite and negative zero", async () => {
  const prototype = await currentSchema();
  Object.setPrototypeOf(prototype.properties, null);
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, prototype),
    (error) => error.code === "INPUT_PROTOTYPE_INVALID"
  );

  const sparse = await currentSchema();
  delete sparse.required[1];
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, sparse),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );

  const decorated = await currentSchema();
  decorated.required.extra = true;
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, decorated),
    (error) => error.code === "INPUT_ARRAY_INVALID"
  );

  const cycle = await currentSchema();
  cycle.cycle = cycle;
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, cycle),
    (error) => error.code === "INPUT_CYCLE_FORBIDDEN"
  );

  const nonfinite = await currentSchema();
  nonfinite.$defs.opaqueIdentityRef.minLength = Number.POSITIVE_INFINITY;
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, nonfinite),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );

  const negativeZero = await currentSchema();
  negativeZero.$defs.opaqueIdentityRef.minLength = -0;
  await assert.rejects(
    () => verifyVedicRuleContractDraft(workspaceRoot, negativeZero),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
  assert.throws(
    () => canonicalStringifyVedicRuleContractDraft({ value: -0 }),
    (error) => error.code === "INPUT_VALUE_INVALID"
  );
});

test("verified result is detached and recursively frozen", async () => {
  const candidate = await currentSchema();
  const result = await verifyVedicRuleContractDraft(workspaceRoot, candidate);
  assertFullyFrozenAndDetached(candidate, result);
  assert.notEqual(result.schema, candidate);
  assert.equal(
    Reflect.set(result.schema["x-hakimiBoundary"], "ruleInstancesIncluded", 1),
    false
  );
});

test("schema keyword and envelope mutations fail before current closure comparison", async () => {
  for (const mutation of [
    (schema) => { schema.$defs.opaqueIdentityRef.default = "invented"; },
    (schema) => { schema.$defs.opaqueIdentityRef.examples = ["invented"]; },
    (schema) => { schema.$defs.opaqueIdentityRef.enum = ["invented"]; },
    (schema) => { schema.$defs.opaqueIdentityRef.const = "invented"; },
    (schema) => { schema.$defs.opaqueIdentityRef.$ref = "https://invalid.example/schema.json"; },
    (schema) => { schema.properties.ruleDefinitionEnvelope.additionalProperties = true; },
    (schema) => { schema.properties.ruleDefinitionEnvelope.properties.rule_body = { type: "string" }; },
    (schema) => { delete schema.properties.rulesetEnvelope.properties.summary_ref; },
    (schema) => {
      schema.properties.ruleDefinitionEnvelope.properties.conflict_definition_refs = {
        $ref: "#/$defs/nonEmptyOpaqueIdentityRefList"
      };
    }
  ]) await expectMutationFailure(mutation);
});

test("authority body instance receipt and prerequisite promotions remain fail closed", async () => {
  for (const mutation of [
    (schema) => { schema["x-hakimiBoundary"].domainAuthorityAuthorized = true; },
    (schema) => { schema["x-hakimiBoundary"].ruleBodiesIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].ruleDefinitionsIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].ruleInstancesIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].rulesetInstancesIncluded = 1; },
    (schema) => { schema["x-hakimiBoundary"].ruleEvaluationCapability = true; },
    (schema) => { schema["x-hakimiBoundary"].rulesetExecutionCapability = true; },
    (schema) => { schema["x-hakimiBoundary"].ruleReceiptIssued = true; },
    (schema) => { schema["x-hakimiBoundary"].successReceiptIssued = true; },
    (schema) => { schema["x-hakimiBoundary"].ruleContractGateSatisfied = true; },
    (schema) => { schema["x-hakimiBoundary"].versionedRulesetGateSatisfied = true; },
    (schema) => { schema["x-hakimiBoundary"].formalAdmissionAuthorized = true; },
    (schema) => { schema["x-hakimiBoundary"].blockedPrerequisitesResolved = 1; },
    (schema) => { schema["x-hakimiBoundary"].blockedPrerequisitesUniverseClosed = true; },
    (schema) => { schema["x-hakimiBoundary"].externalSourceRefs.push("invented"); },
    (schema) => { schema["x-hakimiBoundary"].implementationArtifactRefs.push("invented"); }
  ]) await expectMutationFailure(mutation, "BOUNDARY_PROMOTED");
});

test("schema and each of the five upstream raw identities invalidate on byte drift", async (t) => {
  for (const relativePath of closurePaths) {
    const root = await makeFixture(t, "hakimi-vedic-rule-drift-");
    await appendFile(path.resolve(root, ...relativePath.split("/")), "\n", "utf8");
    await assert.rejects(
      () => buildCurrentVedicRuleContractDraft(root),
      (error) => error instanceof VedicRuleContractDraftError
        && error.code.includes("IDENTITY_MISMATCH")
    );
  }
});

test("semantically equal but noncanonical schema materialization is rejected", async (t) => {
  const root = await makeFixture(t);
  const target = path.resolve(root, ...VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH.split("/"));
  const schema = JSON.parse(await readFile(target, "utf8"));
  await writeFile(target, JSON.stringify(schema), "utf8");
  await assert.rejects(
    () => readVedicRuleContractDraft(root),
    (error) => error.code === "BOUND_ARTIFACT_IDENTITY_MISMATCH"
  );
});

test("hard-linked schema and every upstream endpoint are rejected", async (t) => {
  const expectedCodes = new Map([
    [VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH, "SCHEMA_ENDPOINT_INVALID"],
    [vedicRuleContractDraftTestOnly.expectedAdrRawIdentity.path, "ADR_ENDPOINT_INVALID"],
    [vedicRuleContractDraftTestOnly.expectedInputDraftRawIdentity.path, "INPUT_DRAFT_ENDPOINT_INVALID"],
    [vedicRuleContractDraftTestOnly.expectedInputRequirementsRawIdentity.path,
      "INPUT_REQUIREMENTS_ENDPOINT_INVALID"],
    [vedicRuleContractDraftTestOnly.expectedFactDraftRawIdentity.path, "FACT_DRAFT_ENDPOINT_INVALID"],
    [vedicRuleContractDraftTestOnly.expectedFactRequirementsRawIdentity.path,
      "FACT_REQUIREMENTS_ENDPOINT_INVALID"]
  ]);
  for (const relativePath of closurePaths) {
    const root = await makeFixture(t, "hakimi-vedic-rule-hardlink-");
    const target = path.resolve(root, ...relativePath.split("/"));
    const seed = path.join(path.dirname(target), `seed-${path.basename(target)}`);
    await copyFile(target, seed);
    await rm(target);
    await link(seed, target);
    await assert.rejects(
      () => buildCurrentVedicRuleContractDraft(root),
      (error) => error.code === expectedCodes.get(relativePath)
    );
  }
});

test("junction or directory symlink in the schema chain is rejected", async (t) => {
  const realRoot = await makeFixture(t, "hakimi-vedic-rule-real-");
  const linkedRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-vedic-rule-linked-"));
  t.after(async () => rm(linkedRoot, { force: true, recursive: true }));
  await mkdir(path.join(linkedRoot, "docs"), { recursive: true });
  await copyFile(
    path.resolve(realRoot, ...vedicRuleContractDraftTestOnly.expectedAdrRawIdentity.path.split("/")),
    path.resolve(linkedRoot, ...vedicRuleContractDraftTestOnly.expectedAdrRawIdentity.path.split("/"))
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
    () => readVedicRuleContractDraft(linkedRoot),
    (error) => error.code === "SCHEMA_ENDPOINT_INVALID"
  );
});

test("ADS traversal parent traversal backslashes and absolute syntax are rejected", () => {
  for (const relativePath of [
    "content/system-admission/schema.json:stream",
    "content:stream/system-admission/schema.json",
    "../schema.json",
    "content\\system-admission\\schema.json",
    "/content/system-admission/schema.json"
  ]) {
    assert.throws(
      () => vedicRuleContractDraftTestOnly.safeWorkspaceFile(workspaceRoot, relativePath),
      (error) => error.code === "UNSAFE_ARTIFACT_PATH"
    );
  }
});

test("oversized schema endpoint fails closed before parsing", async (t) => {
  const root = await makeFixture(t, "hakimi-vedic-rule-size-");
  const target = path.resolve(root, ...VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH.split("/"));
  await writeFile(target, Buffer.alloc(1_000_001, 0x20));
  await assert.rejects(
    () => readVedicRuleContractDraft(root),
    (error) => error.code === "SCHEMA_ENDPOINT_INVALID"
  );
});

test("build result freezes exact same-buffer identities without claiming cross-file atomicity", async () => {
  const current = await buildCurrentVedicRuleContractDraft(workspaceRoot);
  for (const value of collectDataObjectGraph(current)) assert.equal(Object.isFrozen(value), true);
  assert.deepEqual(current.rawIdentity, {
    bytes: 12_140,
    path: VEDIC_RULE_CONTRACT_DRAFT_RELATIVE_PATH,
    sha256: "1b0f118d5014aa8de0ab85bd756b710252565d643a5164ee88a7418d4a002f0d"
  });
  assert.deepEqual(current.upstreamIdentities, {
    factContractDraftSemanticDigest:
      "0eb3aa460403e42ca5542d1bafb3325d543a0e11429f40b8041f2c1bdf0bc5b1",
    factContractRequirementsLedgerDigest:
      "a33eeee2652559faa0f83c404980ec78acc6dc94be3f6476f25b0e8fdd5eb6b8",
    inputContractDraftSemanticDigest:
      "ad9a1d568d63296d3ed19f30d91cb8f8e52f543afcec03f238178da4af70ee08",
    inputContractRequirementsLedgerDigest:
      "e545c254d29902df58e29ca90f965333daca70f06bce03cca62ad9e2f4fc7ac0",
    productBoundaryAdrSemanticDigest:
      "1a71b363132b0d61298f53f7e14eb77d58a3eb3f7d649d8d3c8f42fd1acd1a89"
  });
  assert.equal(Object.hasOwn(current, "crossFileAtomicSnapshot"), false);
  assert.equal(Object.hasOwn(current, "mutationEpochReceipt"), false);
});
