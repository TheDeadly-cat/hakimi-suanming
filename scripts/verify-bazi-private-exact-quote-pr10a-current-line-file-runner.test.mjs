import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  link,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

import {
  BAZI_PR10A_PRIVATE_AUTHORIZATION_SCHEMA_VERSION,
  baziPr10aPrivateFileRunnerTestOnly,
  isVerifiedBaziPr10aPrivateFileRunnerReceipt,
  verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot
} from "./bazi-private-exact-quote-pr10a-current-line-file-runner-lib.mjs";

const SCRIPTS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPTS_ROOT, "..");
const CLI_PATH = path.join(SCRIPTS_ROOT, "verify-bazi-private-exact-quote-pr10a-current-line-file-runner.mjs");
const LIBRARY_PATH = path.join(SCRIPTS_ROOT, "bazi-private-exact-quote-pr10a-current-line-file-runner-lib.mjs");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function authorization(profileId, mutate) {
  const profile = baziPr10aPrivateFileRunnerTestOnly.SOURCE_PROFILES[profileId];
  const value = {
    schemaVersion: BAZI_PR10A_PRIVATE_AUTHORIZATION_SCHEMA_VERSION,
    recordType: "bazi_pr10a_local_private_verification_authorization",
    authorizationId: "auth-0123456789abcdef0123456789abcdef",
    scope: clone(baziPr10aPrivateFileRunnerTestOnly.scopeForProfile(profile)),
    authorization: {
      materialProviderAffirmsLawfulPossession: true,
      localMachinePrivateVerificationAuthorized: true,
      repositoryStorageAuthorized: false,
      redistributionAuthorized: false,
      quotePublicationAuthorized: false,
      rightsLegalConclusion: "not_established"
    }
  };
  if (mutate) mutate(value);
  return value;
}

async function fixture(t, profileId = "smt-r761703", options = {}) {
  const profile = baziPr10aPrivateFileRunnerTestOnly.SOURCE_PROFILES[profileId];
  const root = await mkdtemp(path.join(os.tmpdir(), `hakimi-pr10a-${profileId}-`));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  const authorizationValue = options.authorization ?? authorization(profileId);
  const authorizationBytes = options.authorizationBytes
    ?? Buffer.from(JSON.stringify(authorizationValue), "utf8");
  const bodyBytes = options.bodyBytes
    ?? Buffer.alloc(profile.expectedSourceBodyUtf8Bytes, profileId.startsWith("dtt") ? 0x44 : 0x53);
  await writeFile(path.join(root, "authorization.json"), authorizationBytes);
  await writeFile(path.join(root, "source-body.utf8.txt"), bodyBytes);
  return { root, profile, authorizationValue, authorizationBytes, bodyBytes };
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    const upper = key.toUpperCase();
    if (upper === "NODE_OPTIONS" || upper === "NODE_PATH" || upper === "NPM_CONFIG_NODE_OPTIONS"
      || upper === "HAKIMI_BAZI_PR10A_PRIVATE_ROOT") delete environment[key];
  }
  return { ...environment, ...extra };
}

function runCli(args = [], env = {}) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment(env),
    encoding: "utf8",
    windowsHide: true
  });
}

function errorHasCode(code) {
  return (error) => error && error.code === code;
}

test("two-profile dispatch closed world is distinct from each single-profile receipt", async (t) => {
  const observedProfiles = [];
  const observedQuotePairs = [];
  for (const profileId of ["dtt-r2600158", "smt-r761703"]) {
    const input = await fixture(t, profileId);
    const receipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
    observedProfiles.push(receipt.fixedSourceScope.profileId);
    for (const quote of receipt.fixedSourceScope.quoteScopes) {
      observedQuotePairs.push(`${quote.topicId}:${quote.quoteCandidateId}`);
    }

    assert.equal(baziPr10aPrivateFileRunnerTestOnly.isFixtureOnlyReceipt(receipt), true);
    assert.equal(isVerifiedBaziPr10aPrivateFileRunnerReceipt(receipt), false);
    assert.equal(receipt.productionRunnerReceipt, false);
    assert.equal(receipt.formalAdmissionEligible, false);
    assert.deepEqual(receipt.supportedClosedWorldScope, {
      supportedSourceProfiles: 2,
      supportedQuoteReferences: 4,
      supportedConceptualTopics: 3,
      supportedCurrentBindings: 2,
      quoteReferencesAreNotBindingCount: true,
      bindingFreezeEffect: "none"
    });
    assert.deepEqual(receipt.thisReceiptObservation, {
      sourceBodiesObserved: 1,
      quoteReferencesObserved: 2,
      conceptualTopicsObserved: 2,
      currentBindingsObserved: 1,
      allSupportedProfilesVerifiedByThisReceipt: false,
      bindingFreezeEffect: "none"
    });
    assert.equal(receipt.privateMaterialIntegrity.expectedQuoteCount, 2);
    assert.equal(receipt.privateMaterialIntegrity.currentLineReceipts.length, 2);
    assert.equal(receipt.privateMaterialIntegrity.oneBodyReadSharedAcrossExpectedQuotes, true);
    assert.equal(receipt.privateMaterialIntegrity.allExpectedQuoteIntegrityVerified, false);
    assert.equal(receipt.privateMaterialIntegrity.allExpectedCurrentLineProductionBrandsConsumed, false);
  }
  assert.deepEqual(observedProfiles, ["dtt-r2600158", "smt-r761703"]);
  assert.equal(new Set(observedQuotePairs).size, 4);
  assert.equal(new Set(observedQuotePairs.map((entry) => entry.split(":")[0])).size, 3);
});

test("DTT uses its exact 401801-byte profile rather than the former 128 KiB ceiling", async (t) => {
  const input = await fixture(t, "dtt-r2600158");
  assert.equal(input.bodyBytes.length, 401801);
  assert.ok(input.bodyBytes.length > 128 * 1024);
  assert.equal(input.profile.expectedSourceBodyUtf16CodeUnits, 143701);
  assert.equal(
    input.profile.expectedSourceBodySha256,
    "1d1a3d61c1b9a26618b41b8ead857a6b966992fdf2adabdc607a0c6cb4c8f04d"
  );
  const receipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  assert.equal(receipt.privateMaterialIntegrity.sourceBodyUtf8Bytes, 401801);
  assert.equal(receipt.privateMaterialIntegrity.expectedSourceBodyUtf8Bytes, 401801);
});

test("authorization rejects cross-source, missing, extra, duplicate, reordered and unknown closed-world scopes", () => {
  const parse = (value) => baziPr10aPrivateFileRunnerTestOnly.parseAuthorization(
    Buffer.from(JSON.stringify(value), "utf8")
  );
  const cases = [
    authorization("dtt-r2600158", (value) => {
      value.scope.sourceCandidateId = "smt-siku-v10-wikisource-r761703-candidate-v2";
    }),
    authorization("dtt-r2600158", (value) => { value.scope.quoteScopes.pop(); }),
    authorization("dtt-r2600158", (value) => {
      value.scope.quoteScopes.push(clone(value.scope.quoteScopes[0]));
    }),
    authorization("dtt-r2600158", (value) => {
      value.scope.quoteScopes[1] = clone(value.scope.quoteScopes[0]);
    }),
    authorization("dtt-r2600158", (value) => { value.scope.quoteScopes.reverse(); }),
    authorization("dtt-r2600158", (value) => { value.scope.profileId = "unknown-r1"; }),
    authorization("smt-r761703", (value) => { value.scope.bindingId = "binding:dtt:month-command"; }),
    authorization("smt-r761703", (value) => { value.scope.expectedSourceBodySha256 = "f".repeat(64); }),
    authorization("smt-r761703", (value) => { value.scope.sourceCandidateDigest = "e".repeat(64); }),
    authorization("smt-r761703", (value) => { value.scope.quoteScopes[0].quoteSha256 = "d".repeat(64); }),
    authorization("smt-r761703", (value) => { value.scope.quoteScopes[0].rawCharacterStartZeroBased += 1; }),
    authorization("smt-r761703", (value) => { value.scope.quoteScopes[0].rightsCandidateDigest = "c".repeat(64); })
  ];
  for (const value of cases) assert.throws(() => parse(value), errorHasCode("AUTHORIZATION_SCOPE_INVALID"));
});

test("authorization parser rejects duplicate JSON keys, extra authority and widened handling", () => {
  const valid = authorization("smt-r761703");
  const duplicate = Buffer.from(
    JSON.stringify(valid).replace(
      '"profileId":"smt-r761703"',
      '"profileId":"smt-r761703","profileId":"dtt-r2600158"'
    ),
    "utf8"
  );
  assert.throws(
    () => baziPr10aPrivateFileRunnerTestOnly.parseAuthorization(duplicate),
    errorHasCode("AUTHORIZATION_JSON_INVALID")
  );
  const extra = authorization("smt-r761703");
  extra.authorization.publicationApproved = true;
  assert.throws(
    () => baziPr10aPrivateFileRunnerTestOnly.parseAuthorization(Buffer.from(JSON.stringify(extra))),
    errorHasCode("AUTHORIZATION_BOUNDARY_INVALID")
  );
  const widened = authorization("smt-r761703");
  widened.authorization.redistributionAuthorized = true;
  assert.throws(
    () => baziPr10aPrivateFileRunnerTestOnly.parseAuthorization(Buffer.from(JSON.stringify(widened))),
    errorHasCode("AUTHORIZATION_BOUNDARY_INVALID")
  );
});

test("each source enforces exact size and the production path rejects same-size synthetic hash", async (t) => {
  for (const profileId of ["dtt-r2600158", "smt-r761703"]) {
    const profile = baziPr10aPrivateFileRunnerTestOnly.SOURCE_PROFILES[profileId];
    const short = await fixture(t, profileId, {
      bodyBytes: Buffer.alloc(profile.expectedSourceBodyUtf8Bytes - 1, 0x31)
    });
    await assert.rejects(
      baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(short.root),
      errorHasCode("SOURCE_BODY_SIZE_MISMATCH")
    );

    const oversized = await fixture(t, profileId, {
      bodyBytes: Buffer.alloc(profile.expectedSourceBodyUtf8Bytes + 1, 0x32)
    });
    await assert.rejects(
      baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(oversized.root),
      errorHasCode("PRIVATE_FILE_TOO_LARGE")
    );

    const exactSynthetic = await fixture(t, profileId);
    await assert.rejects(
      verifyBaziPr10aPrivateExactQuotesFromFixedPrivateRoot(exactSynthetic.root),
      errorHasCode("SOURCE_BODY_IDENTITY_MISMATCH")
    );
  }
});

test("body and inventory drift after the first snapshot fail before fixture receipt issuance", async (t) => {
  const bodyDrift = await fixture(t, "smt-r761703");
  await assert.rejects(
    baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnlyWithHook(bodyDrift.root, async () => {
      await writeFile(
        path.join(bodyDrift.root, "source-body.utf8.txt"),
        Buffer.alloc(bodyDrift.profile.expectedSourceBodyUtf8Bytes, 0x58)
      );
    }),
    errorHasCode("PRIVATE_INPUT_CHANGED")
  );

  const inventoryDrift = await fixture(t, "smt-r761703");
  await assert.rejects(
    baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnlyWithHook(inventoryDrift.root, async () => {
      await writeFile(path.join(inventoryDrift.root, "unexpected.txt"), "x");
    }),
    errorHasCode("PRIVATE_INVENTORY_INVALID")
  );
});

test("hardlinked and symlinked private endpoints fail closed when the platform permits them", async (t) => {
  const hardlinkInput = await fixture(t, "smt-r761703");
  const hardlinkAliasRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-pr10a-hardlink-alias-"));
  t.after(async () => { await rm(hardlinkAliasRoot, { recursive: true, force: true }); });
  const hardlinkAlias = path.join(hardlinkAliasRoot, "body-alias.txt");
  await link(path.join(hardlinkInput.root, "source-body.utf8.txt"), hardlinkAlias);
  await assert.rejects(
    baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(hardlinkInput.root),
    errorHasCode("PRIVATE_FILE_ENDPOINT_INVALID")
  );

  const target = await mkdtemp(path.join(os.tmpdir(), "hakimi-pr10a-symlink-target-"));
  t.after(async () => { await rm(target, { recursive: true, force: true }); });
  const symlinkInput = await fixture(t, "smt-r761703");
  const bodyPath = path.join(symlinkInput.root, "source-body.utf8.txt");
  await rm(bodyPath);
  await writeFile(path.join(target, "body.txt"), symlinkInput.bodyBytes);
  try {
    await symlink(path.join(target, "body.txt"), bodyPath, "file");
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES" || error?.code === "ENOSYS") return;
    throw error;
  }
  await assert.rejects(
    baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(symlinkInput.root),
    (error) => error?.code === "PRIVATE_INVENTORY_INVALID" || error?.code === "PRIVATE_FILE_ENDPOINT_INVALID"
  );
});

test("fixture receipt leaks no authorization id, authorization digest, private path, body or quote text", async (t) => {
  const input = await fixture(t, "smt-r761703");
  const receipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  const serialized = JSON.stringify(receipt);
  assert.equal(receipt.safeToPublish, false);
  assert.equal(receipt.anonymousReceipt, false);
  assert.equal(receipt.authorizationEvidence.authorizationRawDigestStored, false);
  assert.equal(receipt.authorizationEvidence.authorizationUtf8BytesStored, false);
  assert.equal(receipt.authorizationEvidence.requestIdentifiersDerivedFromAuthorizationBytes, false);
  assert.match(receipt.authorizationEvidence.fixedPublicScopeSha256, /^[a-f0-9]{64}$/u);
  assert.equal(serialized.includes(input.authorizationValue.authorizationId), false);
  assert.equal(serialized.includes(input.root), false);
  assert.equal(serialized.includes("authorizationRawSha256"), false);
  assert.equal(serialized.includes("SSSSSSSSSSSSSSSS"), false);
  assert.equal(receipt.redactionBoundary.quoteTextStored, false);
});

test("different private authorization ids produce the same non-person-derived public projection", async (t) => {
  const firstAuthorization = authorization("smt-r761703");
  const secondAuthorization = authorization("smt-r761703");
  secondAuthorization.authorizationId = "auth-fedcba9876543210fedcba9876543210";
  const first = await fixture(t, "smt-r761703", { authorization: firstAuthorization });
  const second = await fixture(t, "smt-r761703", { authorization: secondAuthorization });
  const firstReceipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(first.root);
  const secondReceipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(second.root);
  assert.equal(firstReceipt.receiptId, secondReceipt.receiptId);
  assert.equal(firstReceipt.receiptDigest, secondReceipt.receiptDigest);
  assert.equal(JSON.stringify(firstReceipt), JSON.stringify(secondReceipt));
});

test("formal counts, authority, epoch, atomicity and ABA remain red and clones gain no brand", async (t) => {
  const input = await fixture(t, "dtt-r2600158");
  const receipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  assert.deepEqual(receipt.counts, {
    formalKnowledgeDocuments: 0,
    formalSourceRightsRecords: 0,
    formalSourceCarrierRecords: 0,
    projectCopyMaterializationRecords: 0,
    materializationsVerified: 0,
    bindingCitationLocatorLinks: 0,
    bindingsFrozen: 0,
    domainExpertReviews: 0,
    rightsLegalReviews: 0
  });
  assert.equal(Object.values(receipt.authorityBoundary).includes(true), false);
  assert.deepEqual(receipt.releaseGovernance, {
    activeLine: "legacy-v13",
    targetSchema: 13,
    migrationId: null,
    mutationEpochBoundaryRequired: true,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false
  });
  assert.equal(receipt.mutationBoundary.mutationEpochReceipt, null);
  assert.equal(receipt.mutationBoundary.crossFileAtomicSnapshot, false);
  assert.equal(receipt.mutationBoundary.intervalMutationExcludedAcrossFiles, false);
  assert.equal(receipt.mutationBoundary.abaExcluded, false);
  assert.equal(isVerifiedBaziPr10aPrivateFileRunnerReceipt(structuredClone(receipt)), false);
  assert.equal(baziPr10aPrivateFileRunnerTestOnly.isFixtureOnlyReceipt(structuredClone(receipt)), false);
  assert.equal(Object.isFrozen(receipt), true);
  assert.equal(Object.isFrozen(receipt.counts), true);
});

test("CLI accepts no arguments, requires one environment root and rejects visible injection state", async (t) => {
  const noRoot = runCli();
  assert.equal(noRoot.status, 1);
  assert.equal(noRoot.stderr.trim(), "BAZI_PR10A_PRIVATE_FILE_RUNNER_FAILED PRIVATE_ROOT_ENVIRONMENT_REQUIRED");

  const extra = runCli(["C:\\private"]);
  assert.equal(extra.status, 1);
  assert.equal(extra.stderr.trim(), "BAZI_PR10A_PRIVATE_FILE_RUNNER_FAILED CLI_ARGUMENTS_FORBIDDEN");

  const input = await fixture(t, "smt-r761703");
  const injected = runCli([], {
    HAKIMI_BAZI_PR10A_PRIVATE_ROOT: input.root,
    NODE_PATH: "C:\\untrusted-node-path"
  });
  assert.equal(injected.status, 1);
  assert.equal(
    injected.stderr.trim(),
    "BAZI_PR10A_PRIVATE_FILE_RUNNER_FAILED VISIBLE_NODE_INJECTION_STATE_FORBIDDEN"
  );

  const synthetic = runCli([], { HAKIMI_BAZI_PR10A_PRIVATE_ROOT: input.root });
  assert.equal(synthetic.status, 1);
  assert.equal(synthetic.stdout, "");
  assert.equal(
    synthetic.stderr.trim(),
    "BAZI_PR10A_PRIVATE_FILE_RUNNER_FAILED SOURCE_BODY_IDENTITY_MISMATCH"
  );
  assert.equal(synthetic.stderr.includes(input.root), false);
  assert.equal(synthetic.stderr.includes(input.authorizationValue.authorizationId), false);
});

test("implementation has no filesystem write primitive and test surface cannot forge production brand", async (t) => {
  const source = await readFile(LIBRARY_PATH, "utf8");
  assert.equal(/\b(writeFile|appendFile|mkdir|rename|unlink|rm|copyFile)\b/u.test(source), false);
  assert.equal(source.includes("authorizationRawSha256"), false);
  assert.equal(source.includes("authorizationScopeSha256"), false);
  assert.equal(source.includes("requestIdentifiersDerivedFromAuthorizationBytes: false"), true);
  const input = await fixture(t, "smt-r761703");
  const receipt = await baziPr10aPrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  assert.equal(isVerifiedBaziPr10aPrivateFileRunnerReceipt(receipt), false);
  assert.equal(isVerifiedBaziPr10aPrivateFileRunnerReceipt({ ...receipt }), false);
});
