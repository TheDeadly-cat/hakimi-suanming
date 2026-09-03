import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  VEDIC_KERNEL_PACKAGE_NAME,
  VedicInputAdmissionKernelDraftVerificationError,
  vedicInputAdmissionKernelDraftTestOnly as testOnly,
  verifyVedicInputAdmissionKernelDraft
} from "./verify-vedic-input-admission-kernel-draft.mjs";

const execFileAsync = promisify(execFile);
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliPath = path.join(workspaceRoot, "scripts", "verify-vedic-input-admission-kernel-draft.mjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function absolute(root, relativePath) {
  return path.resolve(root, ...relativePath.split("/"));
}

async function copyArtifact(root, relativePath) {
  const target = absolute(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(absolute(workspaceRoot, relativePath), target);
}

async function makeFixture(t) {
  const prefix = "hakimi-vedic-kernel-verifier-";
  const root = await mkdtemp(path.join(os.tmpdir(), prefix));
  t.after(async () => {
    const resolved = path.resolve(root);
    assert.equal(path.basename(resolved).startsWith(prefix), true);
    await rm(resolved, { force: true, recursive: true });
  });
  for (const relativePath of [
    ...testOnly.packageFileSet.map((file) => `${testOnly.packageDirectory}/${file}`),
    testOnly.frozenSchemaPath,
    testOnly.manifestSchemaPath,
    testOnly.rejectionSchemaPath,
    testOnly.upstreamRegistryPath,
    testOnly.downstreamRegistryPath,
    testOnly.lockPath,
    testOnly.rootManifestPath,
    ...testOnly.formalParentPaths
  ]) await copyArtifact(root, relativePath);
  const safeWebPath = "apps/web/src/kernel-verifier-safe-fixture.ts";
  await mkdir(path.dirname(absolute(root, safeWebPath)), { recursive: true });
  await writeFile(absolute(root, safeWebPath), "export const isolatedKernelImported = false;\n", "utf8");
  return root;
}

async function mutateJson(root, relativePath, mutate) {
  const value = JSON.parse(await readFile(absolute(root, relativePath), "utf8"));
  mutate(value);
  await writeFile(absolute(root, relativePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function assertVerifierRejects(root, allowedCodes) {
  await assert.rejects(
    () => verifyVedicInputAdmissionKernelDraft(root),
    (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
      && allowedCodes.includes(error.code)
  );
}

test("current kernel closure is only a point-in-time non-authoritative source observation", async () => {
  const report = await verifyVedicInputAdmissionKernelDraft(workspaceRoot);
  assert.equal(Object.hasOwn(report, "ok"), false);
  assert.equal(report.kernelDraftMechanicallyObserved, true);
  assert.equal(report.pointInTimeSourceObservation, true);
  assert.equal(report.crossFileAtomicSnapshot, false);
  assert.equal(report.trustedRuntimeObserved, false);
  assert.equal(report.runtimeEstablished, false);
  assert.equal(report.persistenceEstablished, false);
  assert.equal(report.transitionPersisted, false);
  assert.equal(report.acceptedReceiptIssued, false);
  assert.equal(report.preSnapshotManifestCandidateProjectionSchemaObserved, true);
  assert.equal(report.preSnapshotManifestPositiveTransitionCandidateImplemented, false);
  assert.equal(report.preSnapshotManifestSealFailClosedEvaluatorObserved, true);
  assert.equal(report.upstreamSealBlockersMechanicallyObserved, true);
  assert.equal(report.legalAuthorityDispositionCardinalityDefined, false);
  assert.equal(report.executableSuccessReceiptSchemasAvailable, false);
  assert.equal(report.runtimeRevocationRecheckEstablished, false);
  assert.equal(report.formalParentIntegrated, false);
  assert.equal(report.fourSystemRegistryIntegrated, false);
  assert.equal(report.upstreamReadinessRegistryBacklinkObserved, false);
  assert.equal(report.downstreamRegistryObserved, true);
  assert.equal(report.appsWebProductionImportObserved, false);
  assert.equal(report.appsWebStaticStringConstantFoldingApplied, true);
  assert.equal(report.appsWebUnresolvedRuntimeSpecifierAbsenceEstablished, false);
  assert.equal(report.productionDependencyClosureEstablished, false);
  assert.equal(report.restrictedWebFileIntentionallyNotRead, true);
  assert.equal(report.requirementIdsRequired, 13);
  assert.equal(report.invariantIdsRequired, 26);
  assert.equal(report.conditionIdsRequired, 8);
  assert.equal(report.reviewContentDigestFieldsRequired, 10);
  for (const key of [
    "contentTruthEstablished", "expertTruthEstablished", "expertClaimsAuthorized",
    "rightsLegalConclusionEstablished", "releaseEvidenceComplete", "releaseReady",
    "deploymentVerified", "publicDeploymentAuthorized", "publicReleaseAuthorized",
    "formalAdmissionAuthorized"
  ]) assert.equal(report[key], false, key);
  assert.equal(report.authorityEffect, "none");
});

test("CLI emits the same calibrated boundary and accepts no operands", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    windowsHide: true
  });
  assert.equal(stderr, "");
  const output = JSON.parse(stdout);
  assert.equal(output.kernelDraftMechanicallyObserved, true);
  assert.equal(output.runtimeEstablished, false);
  assert.equal(output.publicReleaseAuthorized, false);
  await assert.rejects(
    () => execFileAsync(process.execPath, [cliPath, "unexpected"], {
      cwd: workspaceRoot,
      windowsHide: true
    }),
    (error) => {
      assert.equal(error.code, 2);
      const failure = JSON.parse(error.stderr);
      assert.equal(failure.errorCode, "CLI_ARGUMENTS_FORBIDDEN");
      assert.equal(failure.kernelDraftMechanicallyObserved, false);
      assert.equal(failure.publicReleaseAuthorized, false);
      return true;
    }
  );
});

test("package manifest tamper fails closed", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, `${testOnly.packageDirectory}/package.json`, (manifest) => {
    manifest.private = false;
  });
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH", "PACKAGE_MANIFEST_DRIFT"]);
});

test("fixed production source tamper fails closed", async (t) => {
  const root = await makeFixture(t);
  const sourcePath = `${testOnly.packageDirectory}/src/evaluator.ts`;
  const source = await readFile(absolute(root, sourcePath), "utf8");
  await writeFile(absolute(root, sourcePath), `${source}\n`, "utf8");
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH"]);
});

test("package test and documentation support artifacts are inside the raw identity closure", async (t) => {
  for (const [relativePath, suffix] of [
    [`${testOnly.packageDirectory}/README.md`, "\npublicReleaseAuthorized=true\n"],
    [`${testOnly.packageDirectory}/src/evaluator.test.ts`, "\n// removed-evidence-placeholder\n"]
  ]) {
    const root = await makeFixture(t);
    const source = await readFile(absolute(root, relativePath), "utf8");
    await writeFile(absolute(root, relativePath), `${source}${suffix}`, "utf8");
    await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH"]);
  }
});

test("schema authority tamper fails closed", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, testOnly.frozenSchemaPath, (schema) => {
    schema.$defs.authorityBoundary.properties.publicDeploymentAuthorized.const = true;
  });
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH", "SCHEMA_AUTHORITY_DRIFT"]);
});

test("manifest candidate boundary or undefined legal cardinality tamper fails closed", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, testOnly.manifestSchemaPath, (schema) => {
    schema["x-hakimiBoundary"].legalAuthorityDispositionCardinalityDefined = true;
    schema["x-hakimiManifestContractProjection"].undefinedReceiptCardinalityKinds = [];
  });
  await assertVerifierRejects(root, [
    "RAW_IDENTITY_MISMATCH",
    "MANIFEST_SCHEMA_CONTRACT_DRIFT",
    "SCHEMA_BOUNDARY_DRIFT"
  ]);
});

test("upstream legal cardinality, receipt schema, or seal guard drift fails closed", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, testOnly.transitionRequirementsPath, (contract) => {
    const legalFamily = contract.receiptTypeRequirements.families.find(
      (entry) => entry.receiptKind === "legal_authority_disposition_receipt"
    );
    legalFamily.minimumCount = 1;
    legalFamily.maximumCount = 1;
    contract.receiptEnvelopeRequirements.executableReceiptSchema = true;
    contract.guardDefinitions.orderedGuards.find(
      (entry) => entry.guardId === "manifest_layer_exact_set_coverage"
    ).currentSatisfied = true;
  });
  await assertVerifierRejects(root, ["UPSTREAM_SEAL_BLOCKER_DRIFT"]);
});

test("upstream evaluator, issuer-supplied authority, and success promotion drift fail closed", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, testOnly.transitionRequirementsPath, (contract) => {
    contract.guardDefinitions.allGuardsRequired = false;
    contract.guardDefinitions.failureDisposition = "ready_product_receipt";
    contract.receiptEnvelopeRequirements.acceptedOrGateSatisfiedMayBeIssuerSupplied = true;
    contract.receiptTypeRequirements.rejectionReceiptMayEnterSuccessExactSet = true;
    contract.receiptTypeRequirements.legalDispositionReceiptStructurallyVerified = true;
    contract.receiptTypeRequirements.rightsLegalConclusionRecorded = true;
    contract.receiptTypeRequirements
      .structuralVerificationAloneMaySetRightsLegalConclusionRecorded = true;
    contract.evaluationRequirements.evaluatorImplemented = true;
    contract.evaluationRequirements.evaluatorIdentity = "unverified-evaluator";
    contract.evaluationRequirements.evaluatorByteDigest = "0".repeat(64);
    contract.evaluationRequirements.evaluationInstances.push("unverified-instance");
    contract.evaluationRequirements.evaluationReceipts = 1;
    contract.evaluationRequirements.outputReceiptMayBeIncludedInOwnInputManifest = true;
    contract.evaluationRequirements.partialCompletionMaySetGateTrue = true;
  });
  await assertVerifierRejects(root, ["UPSTREAM_SEAL_BLOCKER_DRIFT"]);
});

test("targetReceiptId cannot be added to the rejection schema", async (t) => {
  const root = await makeFixture(t);
  await mutateJson(root, testOnly.rejectionSchemaPath, (schema) => {
    schema.required.push("targetReceiptId");
    schema.properties.targetReceiptId = { type: "string" };
  });
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH", "TARGET_RECEIPT_ID_FORBIDDEN"]);
});

test("rejection packet identity fields cannot be removed from schema semantics", async () => {
  const frozenSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.frozenSchemaPath), "utf8")
  );
  const rejectionSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.rejectionSchemaPath), "utf8")
  );
  const manifestSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.manifestSchemaPath), "utf8")
  );
  rejectionSchema.required = rejectionSchema.required.filter(
    (field) => field !== "packetDigest"
  );
  delete rejectionSchema.properties.packetDigest;
  assert.throws(
    () => testOnly.verifySchemaSemantics(frozenSchema, rejectionSchema, manifestSchema),
    (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
      && error.code === "REJECTION_ROOT_SHAPE_DRIFT"
  );
});

test("schema root, nested shape, grammar, and control-key widening fail closed", async () => {
  const frozenSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.frozenSchemaPath), "utf8")
  );
  const rejectionSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.rejectionSchemaPath), "utf8")
  );
  const manifestSchema = JSON.parse(
    await readFile(absolute(workspaceRoot, testOnly.manifestSchemaPath), "utf8")
  );
  const attacks = [
    {
      code: "FROZEN_ROOT_SHAPE_DRIFT",
      mutate: (frozen) => { frozen.type = ["object", "string"]; }
    },
    {
      code: "REJECTION_ROOT_SHAPE_DRIFT",
      mutate: (_frozen, rejection) => {
        rejection.required = rejection.required.filter((field) => field !== "acceptedReceipt");
        delete rejection.properties.acceptedReceipt;
        rejection.required.push("formalAdmissionAuthorized");
        rejection.properties.formalAdmissionAuthorized = { const: true };
      }
    },
    {
      code: "MANIFEST_ROOT_SHAPE_DRIFT",
      mutate: (_frozen, _rejection, manifest) => {
        manifest.required.push("sealedManifestEstablished");
        manifest.properties.sealedManifestEstablished = { const: true };
      }
    },
    {
      code: "MANIFEST_RECEIPT_REFERENCE_SHAPE_DRIFT",
      mutate: (_frozen, _rejection, manifest) => {
        manifest.$defs.receiptReference.required =
          manifest.$defs.receiptReference.required.filter((field) => field !== "receiptDigest");
        delete manifest.$defs.receiptReference.properties.receiptDigest;
      }
    },
    {
      code: "MANIFEST_REVOCATION_SHAPE_DRIFT",
      mutate: (_frozen, _rejection, manifest) => {
        manifest.$defs.revocationObservation.required.push("runtimeRevocationRecheckEstablished");
        manifest.$defs.revocationObservation.properties.runtimeRevocationRecheckEstablished = {
          const: true
        };
      }
    },
    {
      code: "SCHEMA_GRAMMAR_DRIFT",
      mutate: (_frozen, rejection) => {
        rejection.$defs.stateId.enum.push("formal_admission_authorized");
      }
    },
    {
      code: "SCHEMA_GRAMMAR_DRIFT",
      mutate: (_frozen, _rejection, manifest) => {
        manifest.$defs.receiptReference.properties.receiptKind.pattern = "^.*$";
      }
    },
    {
      code: "SCHEMA_GRAMMAR_DRIFT",
      mutate: (_frozen, _rejection, manifest) => {
        manifest.$defs.sha256.pattern = "^.*$";
      }
    },
    {
      code: "SCHEMA_KEYWORD_DRIFT",
      mutate: (_frozen, rejection) => { rejection.not = {}; }
    },
    {
      code: "REJECTION_TRANSITION_MAPPING_DRIFT",
      mutate: (_frozen, rejection) => { rejection.allOf[0].else = false; }
    }
  ];
  for (const attack of attacks) {
    const frozen = clone(frozenSchema);
    const rejection = clone(rejectionSchema);
    const manifest = clone(manifestSchema);
    attack.mutate(frozen, rejection, manifest);
    assert.throws(
      () => testOnly.verifySchemaSemantics(frozen, rejection, manifest),
      (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
        && error.code === attack.code,
      attack.code
    );
  }
});

test("attempted transition and rejection-code mapping tamper fails closed", async (t) => {
  const root = await makeFixture(t);
  const frozenSchema = JSON.parse(
    await readFile(absolute(root, testOnly.frozenSchemaPath), "utf8")
  );
  const persistedRejectionSchema = JSON.parse(
    await readFile(absolute(root, testOnly.rejectionSchemaPath), "utf8")
  );
  const persistedManifestSchema = JSON.parse(
    await readFile(absolute(root, testOnly.manifestSchemaPath), "utf8")
  );
  const attacks = [
    (schema) => {
      schema.allOf.find(
        (clause) => clause.if.properties.rejectionCode.const === "UNKNOWN_TRANSITION"
      ).then.properties.attemptedTransitionId.not.enum.pop();
    },
    (schema) => {
      schema.allOf.find(
        (clause) => clause.if.properties.rejectionCode.const === "TRANSITION_NOT_IMPLEMENTED"
      ).then.properties.attemptedTransitionId.enum.unshift("freeze_packet");
    },
    (schema) => {
      schema.allOf.find(
        (clause) => clause.if.properties.rejectionCode.const === "FROM_STATE_MISMATCH"
      ).then.oneOf[1].properties.attemptedTransitionId.const = "invalidate";
    },
    (schema) => {
      schema.allOf.find(
        (clause) => clause.if.properties.rejectionCode.const
          === "PRE_SNAPSHOT_MANIFEST_SEAL_BLOCKED"
      ).then.properties.failedGuardIds.const.pop();
    }
  ];
  for (const attack of attacks) {
    const candidate = clone(persistedRejectionSchema);
    attack(candidate);
    assert.throws(
      () => testOnly.verifySchemaSemantics(
        frozenSchema,
        candidate,
        persistedManifestSchema
      ),
      (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
        && error.code === "REJECTION_TRANSITION_MAPPING_DRIFT"
    );
  }
  const materializedAttack = clone(persistedRejectionSchema);
  attacks[0](materializedAttack);
  await writeFile(
    absolute(root, testOnly.rejectionSchemaPath),
    `${JSON.stringify(materializedAttack, null, 2)}\n`,
    "utf8"
  );
  await assertVerifierRejects(root, [
    "RAW_IDENTITY_MISMATCH",
    "REJECTION_TRANSITION_MAPPING_DRIFT"
  ]);
});

test("upstream readiness registry backlink fails closed", async (t) => {
  const root = await makeFixture(t);
  const upstream = JSON.parse(
    await readFile(absolute(root, testOnly.upstreamRegistryPath), "utf8")
  );
  const downstream = JSON.parse(
    await readFile(absolute(root, testOnly.downstreamRegistryPath), "utf8")
  );
  const backlink = clone(downstream.drafts[0]);
  upstream.drafts.push(backlink);
  assert.throws(
    () => testOnly.verifyRegistryLayers(upstream, downstream),
    (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
      && error.code === "UPSTREAM_REGISTRY_BACKLINK"
  );
  await mutateJson(root, testOnly.upstreamRegistryPath, (registry) => {
    registry.drafts.push(backlink);
  });
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH", "UPSTREAM_REGISTRY_BACKLINK"]);
});

test("downstream registry metadata and unique kernel entry drift fail closed", async (t) => {
  const root = await makeFixture(t);
  const upstream = JSON.parse(
    await readFile(absolute(root, testOnly.upstreamRegistryPath), "utf8")
  );
  const downstream = JSON.parse(
    await readFile(absolute(root, testOnly.downstreamRegistryPath), "utf8")
  );
  for (const attack of [
    (registry) => { registry.registryClass = "upstream"; },
    (registry) => { registry.upstreamRegistryPath = "scripts/other.json"; },
    (registry) => { registry.drafts[0].allowedBareImports = []; },
    (registry) => { registry.drafts.push(clone(registry.drafts[0])); }
  ]) {
    const candidate = clone(downstream);
    attack(candidate);
    assert.throws(
      () => testOnly.verifyRegistryLayers(upstream, candidate),
      (error) => error instanceof VedicInputAdmissionKernelDraftVerificationError
        && ["DOWNSTREAM_REGISTRY_DRIFT", "DOWNSTREAM_REGISTRY_ENTRY_COUNT_DRIFT"].includes(error.code)
    );
  }
  await mutateJson(root, testOnly.downstreamRegistryPath, (registry) => {
    registry.drafts[0].allowedBareImports = [];
  });
  await assertVerifierRejects(root, ["RAW_IDENTITY_MISMATCH", "DOWNSTREAM_REGISTRY_DRIFT"]);
});

test("formal four-system registry leakage fails closed", async (t) => {
  const root = await makeFixture(t);
  const formalRegistry = testOnly.formalParentPaths[0];
  await mutateJson(root, formalRegistry, (registry) => {
    registry.testOnlyKernelLeak = VEDIC_KERNEL_PACKAGE_NAME;
  });
  await assertVerifierRejects(root, ["FORMAL_PARENT_LEAKAGE"]);
});

test("formal parent schema URN or workspace-path leakage fails closed", async (t) => {
  for (const schemaRef of [
    "urn:hakimi:vedic:input-admission:pre-snapshot-evidence-manifest-candidate:0.1.0",
    "content/system-admission/vedic-input-admission-transition-rejection-receipt.v0.1.0.schema.json"
  ]) {
    const root = await makeFixture(t);
    const formalRegistry = testOnly.formalParentPaths[0];
    await mutateJson(root, formalRegistry, (registry) => {
      registry.testOnlySchemaRef = schemaRef;
    });
    await assertVerifierRejects(root, ["FORMAL_PARENT_LEAKAGE"]);
  }
});

test("apps/web production import leakage fails closed without reading the restricted file", async (t) => {
  const root = await makeFixture(t);
  const leakPath = "apps/web/src/kernel-import-leak.ts";
  await writeFile(
    absolute(root, leakPath),
    `import ${JSON.stringify(VEDIC_KERNEL_PACKAGE_NAME)};\n`,
    "utf8"
  );
  await assertVerifierRejects(root, ["PRODUCTION_IMPORT_LEAKAGE"]);
});

test("apps/web case and escaped-module-specifier leakage fail closed", async (t) => {
  const sources = [
    'import "../../../packages/VEDIC-input-admission-kernel-draft/src/evaluator.ts";\n',
    String.raw`import "../../../packages/vedic\u002dinput-admission-kernel-draft/src/evaluator.ts";`
      + "\n",
    'await import("../../../packages/vedic-input-" + "admission-kernel-draft/src/evaluator.ts");\n',
    String.raw`import "../../../packages/vedic-input-admission-\
kernel-draft/src/evaluator.ts";` + "\n",
    [
      'const packageRoot = "../../../packages/";',
      'const packageName = "vedic-input-" + "admission-kernel-draft";',
      'await import(packageRoot + packageName + "/src/evaluator.ts");',
      ""
    ].join("\n"),
    'import frozenSchema from "../../../content/system-admission/vedic-input-admission-frozen-packet-receipt.v0.1.0.schema.json" with { type: "json" };\n',
    'require("../../../content/system-admission/vedic-input-admission-transition-rejection-receipt.v0.1.0.schema.json");\n',
    'await import("../../../content/system-admission/vedic-input-admission-pre-snapshot-evidence-manifest-candidate.v0.1.0.schema.json", { with: { type: "json" } });\n',
    [
      'const specifier = ["../../../packages/vedic-input-",',
      '  "admission-kernel-draft/src/evaluator.ts"].join("");',
      "await import(specifier);",
      ""
    ].join("\n"),
    'await import("../../../packages/vedic-input-".concat("admission-kernel-draft/src/evaluator.ts"));\n'
  ];
  for (const [index, source] of sources.entries()) {
    const root = await makeFixture(t);
    const leakPath = `apps/web/src/kernel-import-evasion-${index}.ts`;
    await writeFile(absolute(root, leakPath), source, "utf8");
    await assertVerifierRejects(root, ["PRODUCTION_IMPORT_LEAKAGE"]);
  }
});

test("root script and lock closure drift fail closed", async (t) => {
  const scriptRoot = await makeFixture(t);
  await mutateJson(scriptRoot, testOnly.rootManifestPath, (manifest) => {
    manifest.scripts["check:vedic-input-admission-kernel-draft"] = "node bypass.mjs";
  });
  await assertVerifierRejects(scriptRoot, ["ROOT_SCRIPT_DRIFT"]);

  const lockRoot = await makeFixture(t);
  await mutateJson(lockRoot, testOnly.lockPath, (lock) => {
    lock.packages[`node_modules/${VEDIC_KERNEL_PACKAGE_NAME}`].link = false;
  });
  await assertVerifierRejects(lockRoot, ["LOCK_LINK_DRIFT"]);
});
