import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  appendFile,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  unlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import { canonicalJson, sha256 } from "./release-evidence-lib.mjs";
import {
  parseSwAbUpdateRuntimeClientCaptureJsonBytes
} from "./sw-ab-update-runtime-client-capture-lib.mjs";
import {
  parseSwAbUpdateRuntimeApiTranscriptJsonBytes
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeCollectorIssuance
} from "./sw-ab-update-runtime-collector-issuance-loader.mjs";
import {
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS,
  SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE,
  SwAbRuntimeDerivedEvidenceProducerBridgeError,
  buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure,
  finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication,
  parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes,
  validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-lib.mjs";
import {
  loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-loader.mjs";
import {
  compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-schema.mjs";
import {
  writeSwAbRuntimeDerivedEvidenceProducerBridgeFixture,
  writeSwAbRuntimeDerivedEvidenceProducerBridgeIssuanceFixture
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge.test-fixture.mjs";
import {
  publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge,
  swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly
} from "./sw-ab-update-runtime-derived-evidence-producer-bridge-writer.mjs";

const execFileAsync = promisify(execFile);
const sourceWorkspaceRoot = path.resolve(import.meta.dirname, "..");
const testParent = path.join(sourceWorkspaceRoot, "tmp");
const testRoots = new Set();

async function createHolder(prefix = "runtime-producer-bridge-") {
  await mkdir(testParent, { recursive: true });
  const holder = await mkdtemp(path.join(testParent, prefix));
  testRoots.add(holder);
  return holder;
}

test.after(async () => {
  for (const root of testRoots) {
    const relative = path.relative(testParent, root);
    assert.notEqual(relative, "");
    assert.equal(path.isAbsolute(relative), false);
    assert.equal(relative === ".." || relative.startsWith(`..${path.sep}`), false);
    await rm(root, { recursive: true, force: true });
  }
});

function fixturePaths(holder) {
  const workspaceRoot = path.join(holder, "workspace");
  return Object.freeze({
    workspaceRoot,
    runRoot: path.join(workspaceRoot, "tmp", "issuance-run"),
    bridgeRoot: path.join(workspaceRoot, "tmp", "bridge-root")
  });
}

async function prepareIssuance() {
  const holder = await createHolder();
  const paths = fixturePaths(holder);
  await writeSwAbRuntimeDerivedEvidenceProducerBridgeIssuanceFixture({
    sourceWorkspaceRoot,
    ...paths
  });
  return { holder, ...paths };
}

async function preparePublished() {
  const holder = await createHolder();
  const paths = fixturePaths(holder);
  const written = await writeSwAbRuntimeDerivedEvidenceProducerBridgeFixture({
    sourceWorkspaceRoot,
    ...paths
  });
  return { holder, ...paths, written };
}

function bridgeInput(paths) {
  return {
    cwd: paths.workspaceRoot,
    bindingRoot: paths.workspaceRoot,
    issuanceRunRoot: paths.runRoot,
    bridgeRoot: paths.bridgeRoot
  };
}

async function readStrictJson(filePath, label = path.basename(filePath)) {
  return parseSwAbRuntimeDerivedEvidenceProducerBridgeJsonBytes(
    await readFile(filePath),
    label
  );
}

async function rewriteCanonical(filePath, value) {
  await writeFile(filePath, `${canonicalJson(value)}\n`, "utf8");
}

function evidencePath(bridgeRoot) {
  return path.join(bridgeRoot, SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE);
}

function publicationPath(bridgeRoot) {
  return path.join(bridgeRoot, SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE);
}

function terminalCommitMarkerPath(bridgeRoot) {
  return path.join(
    bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
  );
}

test("policy and Schema freeze v13, eight source roles, and the complete false ledgers", async () => {
  const policy = validateSwAbRuntimeDerivedEvidenceProducerBridgePolicy(
    await readStrictJson(
      path.join(sourceWorkspaceRoot, ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH.split("/")),
      "producer bridge policy"
    )
  );
  compileSwAbUpdateRuntimeDerivedEvidenceProducerBridgeSchema(
    await readStrictJson(
      path.join(sourceWorkspaceRoot, ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SCHEMA_PATH.split("/")),
      "producer bridge Schema"
    )
  );
  assert.equal(policy.evidenceClass, "offline_untrusted_runtime_derived_evidence_producer_bridge_candidate");
  assert.equal(policy.terminalState.trustClass, "untrusted_derived_evidence_producer_bridge_candidate");
  assert.equal(policy.terminalState.strictGatePassed, false);
  assert.equal(policy.terminalState.runtimeAdmissionPassed, false);
  assert.equal(policy.terminalState.admissionPassed, false);
  assert.equal(policy.terminalState.usableForAdmission, false);
  assert.deepEqual(policy.requiredSourceBindings, SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_SOURCE_REQUIREMENTS);
  assert.equal(new Set(policy.requiredSourceBindings.map((entry) => entry.path)).size, 8);
  assert.ok(Object.values(policy.provenance).every((value) => value === false));
  assert.deepEqual(policy.authority, SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_AUTHORITY);
  assert.equal(Object.keys(policy.authority).length, 14);
  assert.ok(Object.values(policy.authority).every((value) => value === false));
});

test("real issuance fixture publishes and reloads a terminal-gated three-file root without admission", async () => {
  const { workspaceRoot, runRoot, bridgeRoot, written } = await preparePublished();
  assert.deepEqual((await readdir(bridgeRoot)).sort(), [
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_EVIDENCE_FILE,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PUBLICATION_FILE,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
  ].sort());
  const loaded = await loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(
    bridgeInput({ workspaceRoot, runRoot, bridgeRoot })
  );
  assert.equal(written.bridge.result.code, "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED");
  assert.equal(loaded.result.code, "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED");
  assert.equal(loaded.result.strictGatePassed, false);
  assert.equal(loaded.result.runtimeAdmissionPassed, false);
  assert.equal(loaded.result.admissionPassed, false);
  assert.equal(loaded.result.usableForAdmission, false);
  assert.equal(loaded.result.cliExitCode, 1);
  assert.equal(loaded.sourceBindings.length, 8);
  assert.equal(
    loaded.publication.publicationBoundary.issuanceTerminalRereadCompletedBeforeTerminalCommit,
    true
  );
  assert.equal(loaded.publication.publicationBoundary.issuanceFilesHeldAcrossTerminalCommit, false);
  assert.equal(loaded.publication.publicationBoundary.businessOutputHandlesHeldAcrossTerminalCommit, true);
  assert.equal(loaded.publication.publicationBoundary.postTerminalCommitThrowingWorkAbsent, true);
  assert.equal(loaded.endpointFingerprint.outputs.length, 2);
  assert.equal(
    await readFile(terminalCommitMarkerPath(bridgeRoot), "utf8"),
    `${loaded.publication.publicationDigest}\n`
  );
  assert.equal(loaded.publication.mutationBoundary.epoch, null);
});

test("loader requires exact lowercase publicationDigest plus one LF in the terminal marker", async (t) => {
  const fixture = await preparePublished();
  const publication = await readStrictJson(publicationPath(fixture.bridgeRoot));
  const markerPath = terminalCommitMarkerPath(fixture.bridgeRoot);
  const cases = [
    ["wrong digest", `${"0".repeat(64)}\n`],
    ["uppercase", `${publication.publicationDigest.toUpperCase()}\n`],
    ["missing LF", publication.publicationDigest],
    ["CRLF", `${publication.publicationDigest}\r\n`],
    ["extra LF", `${publication.publicationDigest}\n\n`]
  ];
  for (const [name, bytes] of cases) {
    await t.test(name, async () => {
      await writeFile(markerPath, bytes, "utf8");
      await assert.rejects(
        loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
      );
    });
  }
});

test("derived observedAt and capturedAt copy transcript times exactly while publishedAt stays only in 99", async () => {
  const { runRoot, bridgeRoot } = await preparePublished();
  const evidence = parseSwAbUpdateRuntimeClientCaptureJsonBytes(
    await readFile(evidencePath(bridgeRoot)),
    "derived evidence"
  );
  const transcriptRoot = path.join(runRoot, "api-transcript");
  const tupleFiles = (await readdir(transcriptRoot)).filter((entry) => entry !== "bundle-manifest.json").sort();
  const tuples = await Promise.all(tupleFiles.map(async (fileName, index) =>
    parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
      await readFile(path.join(transcriptRoot, fileName)),
      `tuple ${index + 1}`
    )
  ));
  const manifest = parseSwAbUpdateRuntimeApiTranscriptJsonBytes(
    await readFile(path.join(transcriptRoot, "bundle-manifest.json")),
    "manifest"
  );
  assert.deepEqual(evidence.observations.map((entry) => entry.observedAt), tuples.map((entry) => entry.completedAt));
  assert.equal(evidence.capturedAt, manifest.capturedAt);
  assert.equal(Object.hasOwn(evidence, "publishedAt"), false);
  assert.equal(typeof (await readStrictJson(publicationPath(bridgeRoot))).publishedAt, "string");
});

test("public APIs reject caller-authored fields, accessors, and a second dependency argument", async () => {
  const holder = await createHolder();
  const paths = fixturePaths(holder);
  const input = bridgeInput(paths);
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge({ ...input, evidence: {} }),
    /accepts only own data properties/u
  );
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(input, { dependencies: {} }),
    /requires exactly one input object/u
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge({ ...input, runId: "caller" }),
    /accepts only own data properties/u
  );
  let getterCalled = false;
  const accessorInput = { ...input };
  Object.defineProperty(accessorInput, "cwd", {
    enumerable: true,
    get() {
      getterCalled = true;
      return paths.workspaceRoot;
    }
  });
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(accessorInput),
    /own data properties/u
  );
  assert.equal(getterCalled, false);
});

test("writer rejects an existing final root and refuses reuse after successful publication", async () => {
  const first = await prepareIssuance();
  await mkdir(first.bridgeRoot);
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(first)),
    /already exists/u
  );
  const second = await preparePublished();
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(second)),
    /already exists/u
  );
});

test("loader rejects partial roots and roots with extra files", async () => {
  const partial = await preparePublished();
  await unlink(publicationPath(partial.bridgeRoot));
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(partial))
  );
  const oldTwoFileRoot = await preparePublished();
  await unlink(terminalCommitMarkerPath(oldTwoFileRoot.bridgeRoot));
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(oldTwoFileRoot))
  );
  const extra = await preparePublished();
  await writeFile(path.join(extra.bridgeRoot, "unexpected.json"), "{}\n", "utf8");
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(extra)),
    /terminal commit marker/u
  );
});

test("loader rejects duplicate JSON keys including a duplicate terminal status", async () => {
  const fixture = await preparePublished();
  const filePath = publicationPath(fixture.bridgeRoot);
  const text = await readFile(filePath, "utf8");
  await writeFile(
    filePath,
    `{"status":"bridge_candidate_not_admitted",${text.slice(1)}`,
    "utf8"
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture)),
    /duplicate-free JSON/u
  );
});

test("raw/canonical hash rebinding cannot legitimize changed derived evidence bytes", async () => {
  const fixture = await preparePublished();
  const evidenceFile = evidencePath(fixture.bridgeRoot);
  await appendFile(evidenceFile, " \n", "utf8");
  const changedBytes = await readFile(evidenceFile);
  const evidence = parseSwAbUpdateRuntimeClientCaptureJsonBytes(changedBytes, "changed evidence");
  const publicationFile = publicationPath(fixture.bridgeRoot);
  const publication = await readStrictJson(publicationFile);
  publication.derivedEvidenceBinding.size = changedBytes.length;
  publication.derivedEvidenceBinding.rawSha256 = sha256(changedBytes);
  publication.derivedEvidenceBinding.canonicalSha256 = sha256(canonicalJson(evidence));
  await rewriteCanonical(
    publicationFile,
    finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication(publication)
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture)),
    /exact reconstruction/u
  );
});

test("authority and Schema13 epoch promotion stay rejected even after publication digest rebinding", async () => {
  for (const mutation of [
    (publication) => { publication.authority.publicReleaseAuthorized = true; },
    (publication) => { publication.mutationBoundary.epoch = 0; }
  ]) {
    const fixture = await preparePublished();
    const filePath = publicationPath(fixture.bridgeRoot);
    const publication = await readStrictJson(filePath);
    mutation(publication);
    await rewriteCanonical(
      filePath,
      finalizeSwAbRuntimeDerivedEvidenceProducerBridgePublication(publication)
    );
    await assert.rejects(
      loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture)),
      /Schema|publication identity|boundary/u
    );
  }
});

test("existing-source whitespace drift and bridge-source BOM both fail closed", async () => {
  const whitespace = await prepareIssuance();
  await appendFile(
    path.join(whitespace.workspaceRoot, "docs/release/sw-ab-update-runtime-client-capture-policy.v1.json"),
    " \n",
    "utf8"
  );
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(whitespace))
  );
  const bom = await prepareIssuance();
  await writeFile(
    path.join(bom.workspaceRoot, ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH.split("/")),
    Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      await readFile(path.join(sourceWorkspaceRoot, ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH.split("/")))
    ])
  );
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(bom)),
    /duplicate-free JSON/u
  );
});

test("single-link enforcement rejects source and output hardlink aliases when NTFS supports links", async (t) => {
  const sourceAlias = await prepareIssuance();
  const policyPath = path.join(
    sourceAlias.workspaceRoot,
    ...SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_POLICY_PATH.split("/")
  );
  try {
    await link(policyPath, path.join(sourceAlias.workspaceRoot, "tmp", "policy-alias.json"));
  } catch (error) {
    if (["EPERM", "ENOTSUP", "EACCES"].includes(error?.code)) {
      t.skip(`hardlinks unavailable: ${error.code}`);
      return;
    }
    throw error;
  }
  await assert.rejects(
    publishSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(sourceAlias)),
    /single-link/u
  );
  const outputAlias = await preparePublished();
  await link(
    evidencePath(outputAlias.bridgeRoot),
    path.join(outputAlias.workspaceRoot, "tmp", "evidence-alias.json")
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(outputAlias)),
    /single-link/u
  );
  const terminalAlias = await preparePublished();
  await link(
    terminalCommitMarkerPath(terminalAlias.bridgeRoot),
    path.join(terminalAlias.workspaceRoot, "tmp", "terminal-commit-alias.sha256")
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(terminalAlias)),
    /single-link/u
  );
});

test("rename failure leaves no final root and never upgrades a staging tree", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      { rename: async () => { throw new Error("rename failure run-secret attempt-secret"); } }
    )
  );
  await assert.rejects(lstat(fixture.bridgeRoot), (error) => error?.code === "ENOENT");
  const names = await readdir(path.dirname(fixture.bridgeRoot));
  assert.ok(names.some((entry) => entry.startsWith(".bridge-root.staging-")));
});

test("post-rename endpoint tamper makes the failed final tree unacceptable to the loader", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        afterRename: async ({ evidencePath: target }) => {
          await appendFile(target, "tamper", "utf8");
        }
      }
    ),
    /Final bridge bytes drifted/u
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
  );
});

test("post-final verification failure leaves only a pending loader-rejected root", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        afterFinalVerification: async () => {
          throw new Error("post-commit failure run-secret attempt-secret");
        }
      }
    ),
    /post-commit failure/u
  );
  const names = await readdir(fixture.bridgeRoot);
  assert.ok(names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE));
  assert.equal(
    names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE),
    false
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
  );
});

test("terminal issuance failure before commit leaves the pending root loader-rejected", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        loadIssuance: async (input) => {
          await loadVerifiedSwAbUpdateRuntimeCollectorIssuance(input);
          throw new Error("terminal issuance failure after held reread");
        }
      }
    ),
    /terminal issuance failure/u
  );
  const names = await readdir(fixture.bridgeRoot);
  assert.ok(names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE));
  assert.equal(
    names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE),
    false
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
  );
});

test("terminal issuance result drift leaves the pending root loader-rejected", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        loadIssuance: async (input) => {
          const loaded = structuredClone(
            await loadVerifiedSwAbUpdateRuntimeCollectorIssuance(input)
          );
          loaded.result.receiptDigest = "9".repeat(64);
          return loaded;
        }
      }
    ),
    /Terminal issuance result drifted/u
  );
  const names = await readdir(fixture.bridgeRoot);
  assert.ok(names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE));
  assert.equal(
    names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE),
    false
  );
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
  );
});

test("native terminal marker rename collision leaves the pending root loader-rejected", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        beforeTerminalCommit: async ({ terminalCommitPath }) => {
          await mkdir(terminalCommitPath);
        }
      }
    )
  );
  const names = await readdir(fixture.bridgeRoot);
  assert.ok(names.includes(SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_PENDING_COMMIT_MARKER_FILE));
  assert.equal((await lstat(path.join(
    fixture.bridgeRoot,
    SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_TERMINAL_COMMIT_MARKER_FILE
  ))).isDirectory(), true);
  await assert.rejects(
    loadVerifiedSwAbUpdateRuntimeDerivedEvidenceProducerBridge(bridgeInput(fixture))
  );
});

test("checkpoint phase and exact-once count fail closed through the explicit test-only seam", async () => {
  const fixture = await prepareIssuance();
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      {
        loadIssuance: async ({ onHeldEpochCheckpoint }) =>
          onHeldEpochCheckpoint({ phase: "wrong_phase" })
      }
    ),
    /checkpoint phase drifted/u
  );
  await assert.rejects(
    swAbRuntimeDerivedEvidenceProducerBridgeWriterTestOnly.publishWithDependencies(
      bridgeInput(fixture),
      { loadIssuance: async () => ({ result: {}, endpointFingerprint: {} }) }
    ),
    /did not run exactly once/u
  );
});

test("failure JSON exposes only stable code, stage, and sanitized digest", () => {
  const secret = "run-aaaaaaaa attempt-bbbbbbbb challenge-cccc C:\\secret\\payload.json";
  const known = buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure(
    new SwAbRuntimeDerivedEvidenceProducerBridgeError("TEST_FAILURE", "test", secret)
  );
  const unknown = buildSwAbRuntimeDerivedEvidenceProducerBridgeFailure(new Error(secret));
  for (const failure of [known, unknown]) {
    const serialized = JSON.stringify(failure);
    assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes("challenge-cccc"), false);
    assert.equal(Object.hasOwn(failure, "error"), false);
    assert.equal(Object.hasOwn(failure, "cause"), false);
    assert.match(failure.messageDigest, /^[a-f0-9]{64}$/u);
    assert.equal(failure.cliExitCode, 1);
    for (const field of [
      "issuanceFilesHeldAcrossPendingRootMaterialization",
      "issuanceTerminalRereadCompletedBeforeTerminalCommit",
      "bridgeOwnContractSourcesHeldAcrossTerminalCommit",
      "allEightContractSourcesTerminalRereadCompletedBeforeTerminalCommit",
      "completePendingSetVerifiedBeforeRootRename",
      "sameParentPendingRootRenameCompleted",
      "finalPendingSetVerifiedBeforeTerminalCommit",
      "derivedDocumentProjectionAndDigestTripleMatched",
      "terminalCommitMarkerBoundToPublicationDigest",
      "terminalCommitMarkerPublishedLastBySameDirectoryRename",
      "businessOutputHandlesHeldAcrossTerminalCommit",
      "postTerminalCommitThrowingWorkAbsent"
    ]) {
      assert.equal(failure.publicationBoundary[field], false);
    }
    assert.equal(failure.publicationBoundary.publicLoaderRequiresTerminalCommitMarker, true);
  }
});

test("CLI accepts only exact flags, emits JSON only, and exits 1 for a valid mechanical candidate", async () => {
  const fixture = await preparePublished();
  const verifier = path.join(
    sourceWorkspaceRoot,
    "scripts/verify-sw-ab-update-runtime-derived-evidence-producer-bridge.mjs"
  );
  let failure;
  try {
    await execFileAsync(process.execPath, [
      verifier,
      "--issuance-run-root",
      fixture.runRoot,
      "--bridge-root",
      fixture.bridgeRoot
    ], { cwd: fixture.workspaceRoot, windowsHide: true });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure);
  assert.equal(failure.code, 1);
  assert.equal(failure.stderr, "");
  const output = JSON.parse(failure.stdout);
  assert.equal(output.code, "SW_AB_RUNTIME_DERIVED_EVIDENCE_PRODUCER_BRIDGE_NOT_ADMITTED");
  assert.equal(output.cliExitCode, 1);
  assert.equal(output.usableForAdmission, false);
});
