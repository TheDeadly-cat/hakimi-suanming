import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAZI_SMT_V2_PRIVATE_AUTHORIZATION_SCHEMA_VERSION,
  baziSmtV2PrivateFileRunnerTestOnly,
  isVerifiedBaziSmtV2PrivateFileRunnerReceipt,
  safeBaziSmtV2PrivateFileRunnerCliCode,
  verifyBaziSmtV2PrivateExactQuoteFromFixedPrivateRoot
} from "./bazi-private-exact-quote-smt-v2-current-line-file-runner-lib.mjs";

const SCRIPTS_ROOT = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(SCRIPTS_ROOT, "..");
const CLI_PATH = path.join(SCRIPTS_ROOT, "verify-bazi-private-exact-quote-smt-v2-current-line-file-runner.mjs");

function authorization(overrides = {}) {
  return {
    schemaVersion: BAZI_SMT_V2_PRIVATE_AUTHORIZATION_SCHEMA_VERSION,
    recordType: "bazi_smt_v2_local_private_verification_authorization",
    authorizationId: "auth-0123456789abcdef0123456789abcdef",
    scope: {
      bindingId: "binding:smt-v10:whole-chart",
      sourceCandidateId: "smt-siku-v10-wikisource-r761703-candidate-v2",
      revisionId: 761703,
      topicId: "strength.yueling_exact_quote",
      quoteCandidateId: "smt-v10-yueling-minimal-v1"
    },
    authorization: {
      materialProviderAffirmsLawfulPossession: true,
      localMachinePrivateVerificationAuthorized: true,
      repositoryStorageAuthorized: false,
      redistributionAuthorized: false,
      quotePublicationAuthorized: false,
      rightsLegalConclusion: "not_established"
    },
    ...overrides
  };
}

async function fixture(t, options = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "hakimi-smt-v2-private-runner-"));
  t.after(async () => { await rm(root, { recursive: true, force: true }); });
  const authorizationBytes = options.authorizationBytes
    ?? Buffer.from(JSON.stringify(options.authorization ?? authorization()), "utf8");
  const bodyBytes = options.bodyBytes ?? Buffer.from("SYNTHETIC-PRIVATE-BODY-SENTINEL", "utf8");
  await writeFile(path.join(root, "authorization.json"), authorizationBytes);
  await writeFile(path.join(root, "source-body.utf8.txt"), bodyBytes);
  return { root, authorizationBytes, bodyBytes };
}

function cleanEnvironment(extra = {}) {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    const upper = key.toUpperCase();
    if (upper === "NODE_OPTIONS" || upper === "NODE_PATH" || upper === "NPM_CONFIG_NODE_OPTIONS"
      || upper === "HAKIMI_BAZI_SMT_PRIVATE_ROOT") delete environment[key];
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

test("fixture-only runner verifies exact two-file handling without creating a production receipt", async (t) => {
  const input = await fixture(t);
  const beforeAuthorization = await readFile(path.join(input.root, "authorization.json"));
  const beforeBody = await readFile(path.join(input.root, "source-body.utf8.txt"));
  const receipt = await baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);

  assert.equal(baziSmtV2PrivateFileRunnerTestOnly.isFixtureOnlyReceipt(receipt), true);
  assert.equal(isVerifiedBaziSmtV2PrivateFileRunnerReceipt(receipt), false);
  assert.equal(receipt.productionRunnerReceipt, false);
  assert.equal(receipt.formalAdmissionEligible, false);
  assert.equal(receipt.filesystemBoundary.exactInventoryVerifiedBeforeAndAfter, true);
  assert.equal(receipt.filesystemBoundary.heldHandleBoundedReadUsed, true);
  assert.equal(receipt.filesystemBoundary.genericNtfsReparseTagEnumerated, false);
  assert.equal(receipt.filesystemBoundary.alternateDataStreamsExcluded, false);
  assert.equal(receipt.executionTrustBoundary.fixedCliRejectsVisibleNodeInjectionStateByContract, true);
  assert.equal(receipt.executionTrustBoundary.receiptProvesFixedCliWasUsed, false);
  assert.equal(receipt.executionTrustBoundary.visibleNodeInjectionStateRejectedForThisReceipt, false);
  assert.equal(receipt.executionTrustBoundary.preEntryCodeExecutionExcluded, false);
  assert.equal(receipt.executionTrustBoundary.remoteOrNetworkFilesystemExcluded, false);
  assert.equal(receipt.executionTrustBoundary.localPhysicalDiskEstablished, false);
  assert.equal(receipt.serializationBoundary.processLocalBrandSurvivesSerialization, false);
  assert.equal(receipt.serializationBoundary.stdoutJsonAuthenticityEstablished, false);
  assert.equal(receipt.serializationBoundary.receiptDigestIsDigitalSignature, false);
  assert.equal(receipt.mutationBoundary.mutationEpochAvailable, false);
  assert.equal(receipt.mutationBoundary.abaExcluded, false);
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
  assert.deepEqual(await readFile(path.join(input.root, "authorization.json")), beforeAuthorization);
  assert.deepEqual(await readFile(path.join(input.root, "source-body.utf8.txt")), beforeBody);

  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes(input.root), false);
  assert.equal(serialized.includes("SYNTHETIC-PRIVATE-BODY-SENTINEL"), false);
  assert.equal(serialized.includes("auth-0123456789abcdef0123456789abcdef"), false);
  assert.equal(Object.isFrozen(receipt), true);
  assert.match(receipt.authorizationEvidence.authorizationRawSha256, /^[a-f0-9]{64}$/u);
  assert.equal(baziSmtV2PrivateFileRunnerTestOnly.isFixtureOnlyReceipt(JSON.parse(serialized)), false);
});

test("production path rejects synthetic bytes and does not confer a production brand", async (t) => {
  const input = await fixture(t);
  await assert.rejects(
    verifyBaziSmtV2PrivateExactQuoteFromFixedPrivateRoot(input.root),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "CURRENT_LINE_VERIFICATION_FAILED"
  );
});

test("authorization parser rejects BOM, invalid UTF-8, duplicate keys, extra keys and wrong scope", async () => {
  const valid = Buffer.from(JSON.stringify(authorization()), "utf8");
  const parsed = baziSmtV2PrivateFileRunnerTestOnly.parseAuthorization(valid);
  assert.equal(parsed.scope.revisionId, 761703);
  assert.equal(Object.isFrozen(parsed.scope), true);

  const cases = [
    Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), valid]),
    Buffer.from([0xc3, 0x28]),
    Buffer.from('{"schemaVersion":"1.0.0","schemaVersion":"1.0.0"}', "utf8"),
    Buffer.from(JSON.stringify({ ...authorization(), extra: true }), "utf8"),
    Buffer.from(JSON.stringify(authorization({ authorizationId: `auth-${"0".repeat(32)}` })), "utf8"),
    Buffer.from(JSON.stringify(authorization({
      scope: { ...authorization().scope, quoteCandidateId: "smt-v10-tougan-minimal-v1" }
    })), "utf8"),
    Buffer.from(JSON.stringify(authorization({
      authorization: { ...authorization().authorization, redistributionAuthorized: true }
    })), "utf8")
  ];
  for (const value of cases) {
    assert.throws(() => baziSmtV2PrivateFileRunnerTestOnly.parseAuthorization(value));
  }
});

test("private root must be external, absolute and contain exactly the two fixed files", async (t) => {
  const input = await fixture(t);
  await writeFile(path.join(input.root, "extra.txt"), "extra", "utf8");
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_INVENTORY_INVALID");
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly("relative-root"),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_ROOT_INVALID");
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(WORKSPACE_ROOT),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_ROOT_OVERLAPS_WORKSPACE");
});

test("missing and oversized private files fail closed", async (t) => {
  const missing = await fixture(t);
  await rm(path.join(missing.root, "source-body.utf8.txt"));
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(missing.root));

  const oversizedAuth = await fixture(t, {
    authorizationBytes: Buffer.alloc(baziSmtV2PrivateFileRunnerTestOnly.MAX_AUTHORIZATION_BYTES + 1, 0x61)
  });
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(oversizedAuth.root),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_FILE_TOO_LARGE");

  const oversizedBody = await fixture(t, {
    bodyBytes: Buffer.alloc(baziSmtV2PrivateFileRunnerTestOnly.MAX_SOURCE_BODY_BYTES + 1, 0x62)
  });
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(oversizedBody.root),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_FILE_TOO_LARGE");
});

test("post-read inventory and same-size byte drift are detected before a fixture receipt is issued", async (t) => {
  const inventory = await fixture(t);
  await assert.rejects(
    baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnlyWithHook(inventory.root, async () => {
      await writeFile(path.join(inventory.root, "late-extra.txt"), "late", "utf8");
    }),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_INVENTORY_INVALID"
  );

  const drift = await fixture(t, { bodyBytes: Buffer.from("same-size-A", "utf8") });
  await assert.rejects(
    baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnlyWithHook(drift.root, async () => {
      await writeFile(path.join(drift.root, "source-body.utf8.txt"), "same-size-B", "utf8");
    }),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_INPUT_CHANGED"
  );
});

test("hardlinked and symlinked endpoints are rejected when the platform permits creating them", async (t) => {
  const hardlinked = await fixture(t);
  await link(
    path.join(hardlinked.root, "source-body.utf8.txt"),
    path.join(hardlinked.root, "body-alias-outside-inventory.txt")
  );
  await rm(path.join(hardlinked.root, "body-alias-outside-inventory.txt"));
  // nlink returns to one after removing the alias, so create the alias outside the root.
  const externalAlias = `${hardlinked.root}-hardlink-alias`;
  await link(path.join(hardlinked.root, "source-body.utf8.txt"), externalAlias);
  t.after(async () => { await rm(externalAlias, { force: true }); });
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(hardlinked.root),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_FILE_ENDPOINT_INVALID");

  const symlinked = await fixture(t);
  const realBody = `${symlinked.root}-real-body`;
  await writeFile(realBody, "synthetic", "utf8");
  t.after(async () => { await rm(realBody, { force: true }); });
  await rm(path.join(symlinked.root, "source-body.utf8.txt"));
  try {
    await symlink(realBody, path.join(symlinked.root, "source-body.utf8.txt"), process.platform === "win32" ? "file" : undefined);
  } catch (error) {
    if (process.platform === "win32") return t.skip(`symlink privilege unavailable: ${error.code ?? "unknown"}`);
    throw error;
  }
  await assert.rejects(baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(symlinked.root));
});

test("an intermediate directory symlink or junction is rejected", async (t) => {
  const base = await mkdtemp(path.join(os.tmpdir(), "hakimi-smt-v2-private-chain-"));
  t.after(async () => { await rm(base, { recursive: true, force: true }); });
  const target = path.join(base, "actual-root");
  const privateLeaf = path.join(target, "private-leaf");
  const alias = path.join(base, "alias-root");
  await mkdir(privateLeaf, { recursive: true });
  await writeFile(path.join(privateLeaf, "authorization.json"), JSON.stringify(authorization()), "utf8");
  await writeFile(path.join(privateLeaf, "source-body.utf8.txt"), "synthetic", "utf8");
  try {
    await symlink(target, alias, process.platform === "win32" ? "junction" : "dir");
  } catch (error) {
    if (process.platform === "win32") return t.skip(`junction privilege unavailable: ${error.code ?? "unknown"}`);
    throw error;
  }
  await assert.rejects(
    baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(path.join(alias, "private-leaf")),
    (error) => safeBaziSmtV2PrivateFileRunnerCliCode(error) === "PRIVATE_ROOT_ALIAS_REJECTED"
  );
});

test("CLI accepts no arguments, requires the environment root and rejects visible injection state", async (t) => {
  const input = await fixture(t);
  const noRoot = runCli();
  assert.equal(noRoot.status, 1);
  assert.equal(noRoot.stderr.trim(), "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED PRIVATE_ROOT_ENVIRONMENT_REQUIRED");

  const extra = runCli(["--private-root", input.root], { HAKIMI_BAZI_SMT_PRIVATE_ROOT: input.root });
  assert.equal(extra.status, 1);
  assert.equal(extra.stderr.trim(), "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED CLI_ARGUMENTS_FORBIDDEN");

  const injected = runCli([], {
    HAKIMI_BAZI_SMT_PRIVATE_ROOT: input.root,
    NODE_PATH: "visible-loader-path"
  });
  assert.equal(injected.status, 1);
  assert.equal(injected.stderr.trim(), "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED VISIBLE_NODE_INJECTION_STATE_FORBIDDEN");

  const synthetic = runCli([], { HAKIMI_BAZI_SMT_PRIVATE_ROOT: input.root });
  assert.equal(synthetic.status, 1);
  assert.equal(synthetic.stdout, "");
  assert.equal(synthetic.stderr.trim(), "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED CURRENT_LINE_VERIFICATION_FAILED");
  assert.equal(synthetic.stderr.includes(input.root), false);
  assert.equal(synthetic.stderr.includes("SYNTHETIC-PRIVATE-BODY-SENTINEL"), false);

  const benignExecArgv = spawnSync(process.execPath, ["--no-warnings", CLI_PATH], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment({ HAKIMI_BAZI_SMT_PRIVATE_ROOT: input.root }),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(benignExecArgv.status, 1);
  assert.equal(
    benignExecArgv.stderr.trim(),
    "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED CURRENT_LINE_VERIFICATION_FAILED"
  );
});

test("a symlinked CLI entry fails explicitly instead of silently exiting zero", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "hakimi-smt-v2-cli-alias-"));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const alias = path.join(directory, "runner-alias.mjs");
  try {
    await symlink(CLI_PATH, alias, process.platform === "win32" ? "file" : undefined);
  } catch (error) {
    if (process.platform === "win32") return t.skip(`symlink privilege unavailable: ${error.code ?? "unknown"}`);
    throw error;
  }
  const result = spawnSync(process.execPath, [alias], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED CLI_ENTRY_ALIAS_FORBIDDEN");

  const preserved = spawnSync(process.execPath, ["--preserve-symlinks-main", alias], {
    cwd: WORKSPACE_ROOT,
    env: cleanEnvironment(),
    encoding: "utf8",
    windowsHide: true
  });
  assert.equal(preserved.status, 1);
  assert.equal(preserved.stdout, "");
  assert.equal(
    preserved.stderr.trim(),
    "BAZI_SMT_V2_PRIVATE_FILE_RUNNER_FAILED VISIBLE_NODE_INJECTION_STATE_FORBIDDEN"
  );
});

test("captured freeze and descriptor intrinsics keep a post-import fixture receipt immutable", async (t) => {
  const input = await fixture(t);
  const originalFreeze = Object.freeze;
  const originalDescriptor = Object.getOwnPropertyDescriptor;
  const originalOwnKeys = Reflect.ownKeys;
  try {
    Object.freeze = (value) => value;
    Object.getOwnPropertyDescriptor = () => undefined;
    Reflect.ownKeys = () => [];
    const receipt = await baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
    assert.equal(Object.isFrozen(receipt), true);
    assert.equal(Object.isFrozen(receipt.authorityBoundary), true);
    assert.throws(() => { receipt.authorityBoundary.releaseReady = true; }, TypeError);
    assert.equal(receipt.authorityBoundary.releaseReady, false);
  } finally {
    Object.freeze = originalFreeze;
    Object.getOwnPropertyDescriptor = originalDescriptor;
    Reflect.ownKeys = originalOwnKeys;
  }
});

test("runner implementation has no filesystem write primitive and fixture surface cannot forge production brand", async (t) => {
  const source = await readFile(
    path.join(SCRIPTS_ROOT, "bazi-private-exact-quote-smt-v2-current-line-file-runner-lib.mjs"),
    "utf8"
  );
  assert.equal(/\b(writeFile|appendFile|mkdir|rename|unlink|rm|copyFile)\b/u.test(source), false);
  const input = await fixture(t);
  const receipt = await baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  assert.equal(isVerifiedBaziSmtV2PrivateFileRunnerReceipt(structuredClone(receipt)), false);
  assert.equal(isVerifiedBaziSmtV2PrivateFileRunnerReceipt({ ...receipt }), false);
});

test("post-import WeakSet prototype poisoning cannot promote or break either receipt brand", async (t) => {
  const input = await fixture(t);
  const receipt = await baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
  const originalHas = WeakSet.prototype.has;
  const originalAdd = WeakSet.prototype.add;
  try {
    WeakSet.prototype.has = () => true;
    WeakSet.prototype.add = () => { throw new Error("poisoned WeakSet.add"); };
    assert.equal(isVerifiedBaziSmtV2PrivateFileRunnerReceipt({}), false);
    assert.equal(baziSmtV2PrivateFileRunnerTestOnly.isFixtureOnlyReceipt({}), false);
    assert.equal(baziSmtV2PrivateFileRunnerTestOnly.isFixtureOnlyReceipt(receipt), true);
    const second = await baziSmtV2PrivateFileRunnerTestOnly.verifyFixtureOnly(input.root);
    assert.equal(baziSmtV2PrivateFileRunnerTestOnly.isFixtureOnlyReceipt(second), true);
  } finally {
    WeakSet.prototype.has = originalHas;
    WeakSet.prototype.add = originalAdd;
  }
});
