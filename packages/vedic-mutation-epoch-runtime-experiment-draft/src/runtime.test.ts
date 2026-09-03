import { IDBFactory } from "fake-indexeddb";
import { afterEach, describe, expect, it } from "vitest";
import {
  createVedicForwardRestoreCandidate,
  createVedicEphemeralExperimentDatabaseName,
  createVedicMutationCandidate,
  deleteVedicEphemeralMutationEpochRuntimeExperiment,
  openVedicEphemeralMutationEpochRuntimeExperiment,
  VedicEphemeralRuntimeError,
  type VedicEphemeralRuntimeSnapshot,
  type VedicMutationCandidate
} from "./runtime.ts";

interface OpenExperiment {
  readonly factory: IDBFactory;
  readonly databaseName: string;
  readonly runtime: Awaited<ReturnType<typeof openVedicEphemeralMutationEpochRuntimeExperiment>>;
}

const openExperiments: OpenExperiment[] = [];

function candidate(
  base: VedicEphemeralRuntimeSnapshot,
  _suffix: string,
  nextStateId: VedicMutationCandidate["nextStateId"] = "synthetic_governance_state_beta"
): VedicMutationCandidate {
  return createVedicMutationCandidate(base, nextStateId, "no_revocation_event");
}

async function openExperiment(factory = new IDBFactory()): Promise<OpenExperiment> {
  const databaseName = createVedicEphemeralExperimentDatabaseName();
  const runtime = await openVedicEphemeralMutationEpochRuntimeExperiment(factory, databaseName);
  const opened = { factory, databaseName, runtime };
  openExperiments.push(opened);
  return opened;
}

async function writeMalformedSameDigestHead(
  factory: IDBFactory,
  databaseName: string
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("ephemeral-engineering-ledger", "readwrite");
      const store = transaction.objectStore("ephemeral-engineering-ledger");
      const request = store.get("head");
      request.onsuccess = () => {
        store.put({
          ...(request.result as Record<string, unknown>),
          chainHeadDigest: "f".repeat(64)
        }, "head");
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => undefined;
    });
  } finally {
    database.close();
  }
}

async function writeExtraDigestArrayPropertyHead(
  factory: IDBFactory,
  databaseName: string
): Promise<void> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(databaseName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("ephemeral-engineering-ledger", "readwrite");
      const store = transaction.objectStore("ephemeral-engineering-ledger");
      const request = store.get("head");
      request.onsuccess = () => {
        const head = request.result as Record<string, unknown>;
        Object.defineProperty(head.consumedOperationIdDigests as string[], "personText", {
          value: "alice_birth_19900101",
          enumerable: true,
          configurable: true,
          writable: true
        });
        store.put(head, "head");
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => undefined;
    });
  } finally {
    database.close();
  }
}

afterEach(async () => {
  while (openExperiments.length > 0) {
    const opened = openExperiments.pop()!;
    opened.runtime.close();
    await deleteVedicEphemeralMutationEpochRuntimeExperiment(opened.factory, opened.databaseName);
  }
});

describe("Vedic ephemeral mutation epoch runtime experiment", () => {
  it("starts with a zero-person, authority-false, generation-scoped genesis", async () => {
    const { runtime } = await openExperiment();
    const snapshot = await runtime.readSnapshot();

    expect(snapshot).toMatchObject({
      mutationEpoch: 0,
      stateId: "synthetic_governance_state_alpha",
      lastEngineeringObservation: null,
      zeroPersonData: true,
      authorityBoundary: {
        contentTruthEstablished: false,
        expertClaimsAuthorized: false,
        formalSystemAdmissionAuthorized: false,
        productMutationReceiptIssued: false,
        publicDeploymentAuthorized: false,
        publicReleaseAuthorized: false,
        releaseReady: false,
        rightsLegalConclusionEstablished: false
      }
    });
    expect(snapshot.generationId).toMatch(/^[a-f0-9-]{36}$/u);
    expect(snapshot.databaseNameSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.authorityBoundary)).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain("hakimi-vedic-ephemeral-mutation-experiment-");
  });

  it("serializes competing CAS mutations so exactly one advances the epoch", async () => {
    const { runtime } = await openExperiment();
    const base = await runtime.readSnapshot();

    const outcomes = await Promise.allSettled([
      runtime.commitCandidate(candidate(base, "cas_left")),
      runtime.commitCandidate(candidate(base, "cas_right"))
    ]);
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === "rejected");
    expect(rejected).toBeDefined();
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(VedicEphemeralRuntimeError);
    expect(["BASE_SNAPSHOT_MISMATCH", "STALE_MUTATION_EPOCH"]).toContain(
      (rejected as PromiseRejectedResult).reason.code
    );

    const current = await runtime.readSnapshot();
    expect(current.mutationEpoch).toBe(1);
    expect(current.stateId).toBe("synthetic_governance_state_beta");
    expect(current.lastEngineeringObservation).toMatchObject({
      previousMutationEpoch: 0,
      currentMutationEpoch: 1,
      atomicStateEpochHeadsAndObservationCommit: true,
      commitObserved: true,
      selectedProductBackend: false,
      selectedProductNamespace: false
    });
  });

  it("treats an A-B-A restore probe as a forward epoch and rejects snapshot replay", async () => {
    const { runtime } = await openExperiment();
    const alpha = await runtime.readSnapshot();
    const alphaRestoreProbe = await runtime.captureEphemeralRestoreProbeSnapshot();
    await runtime.commitCandidate(candidate(alpha, "to_beta"));
    const beta = await runtime.readSnapshot();

    const forgedAlias = structuredClone(alphaRestoreProbe) as unknown as Record<string, unknown>;
    forgedAlias.sourceEnvelopeDigest = "f".repeat(64);
    forgedAlias.snapshotDigest = "e".repeat(64);
    await expect(runtime.restoreSnapshotAsForwardMutation(
      forgedAlias,
      createVedicForwardRestoreCandidate(beta, "synthetic_prior_state_revoked")
    )).rejects.toMatchObject({ code: "RESTORE_SNAPSHOT_INVALID" });
    expect(await runtime.readSnapshot()).toEqual(beta);

    await runtime.restoreSnapshotAsForwardMutation(
      alphaRestoreProbe,
      createVedicForwardRestoreCandidate(beta, "synthetic_prior_state_revoked")
    );
    const alphaAgain = await runtime.readSnapshot();

    expect(alphaAgain.stateId).toBe(alpha.stateId);
    expect(alphaAgain.stateDigest).toBe(alpha.stateDigest);
    expect(alphaAgain.mutationEpoch).toBe(2);
    expect(alphaAgain.chainHeadDigest).not.toBe(alpha.chainHeadDigest);
    expect(alphaAgain.envelopeDigest).not.toBe(alpha.envelopeDigest);
    expect(alphaRestoreProbe).toMatchObject({
      zeroPersonData: true,
      notAProductBackupArtifact: true,
      productRecoveryCapabilityEstablished: false
    });

    await expect(runtime.restoreSnapshotAsForwardMutation(
      alphaRestoreProbe,
      createVedicForwardRestoreCandidate(alphaAgain, "no_revocation_event")
    )).rejects.toMatchObject({ code: "RESTORE_SNAPSHOT_REPLAY" });
    expect((await runtime.readSnapshot()).mutationEpoch).toBe(2);
  });

  it("rolls back synthetic abort and labelled quota-like post-put abort without consuming the epoch", async () => {
    const { runtime } = await openExperiment();
    const base = await runtime.readSnapshot();

    await expect(runtime.runSyntheticAbortAfterPutProbe(candidate(base, "abort_probe")))
      .rejects.toMatchObject({ code: "SYNTHETIC_ABORT_PROBE" });
    expect(await runtime.readSnapshot()).toEqual(base);

    await expect(runtime.runSyntheticQuotaLikeAbortAfterPutProbe(candidate(base, "quota_probe")))
      .rejects.toMatchObject({ code: "SYNTHETIC_QUOTA_LIKE_ABORT_PROBE" });
    expect(await runtime.readSnapshot()).toEqual(base);

    const observation = await runtime.commitCandidate(candidate(base, "abort_probe"));
    expect(observation.currentMutationEpoch).toBe(1);
    expect((await runtime.readSnapshot()).mutationEpoch).toBe(1);
  });

  it("creates a new generation after deletion and rejects a stale-generation restore probe", async () => {
    const factory = new IDBFactory();
    const opened = await openExperiment(factory);
    const oldSnapshot = await opened.runtime.readSnapshot();
    const oldRestoreProbe = await opened.runtime.captureEphemeralRestoreProbeSnapshot();
    opened.runtime.close();
    await deleteVedicEphemeralMutationEpochRuntimeExperiment(factory, opened.databaseName);

    const replacement = await openVedicEphemeralMutationEpochRuntimeExperiment(factory, opened.databaseName);
    openExperiments.push({ factory, databaseName: opened.databaseName, runtime: replacement });
    const fresh = await replacement.readSnapshot();
    expect(fresh.generationId).not.toBe(oldSnapshot.generationId);
    expect(fresh.mutationEpoch).toBe(0);

    await expect(replacement.restoreSnapshotAsForwardMutation(
      oldRestoreProbe,
      createVedicForwardRestoreCandidate(fresh, "no_revocation_event")
    )).rejects.toMatchObject({ code: "RESTORE_SNAPSHOT_GENERATION_MISMATCH" });
    expect(await replacement.readSnapshot()).toEqual(fresh);
  });

  it("requires private same-realm brands and never persists caller text as zero-person evidence", async () => {
    const { runtime } = await openExperiment();
    const base = await runtime.readSnapshot();
    const hostile = new Proxy({}, {
      getPrototypeOf() {
        throw new Error("HOSTILE_GET_PROTOTYPE");
      }
    });

    await expect(runtime.commitCandidate(hostile)).rejects.toMatchObject({ code: "MALFORMED_OPERATION" });
    const branded = candidate(base, "branded");
    await expect(runtime.commitCandidate(new Proxy(branded, {})))
      .rejects.toMatchObject({ code: "MALFORMED_OPERATION" });
    await expect(runtime.commitCandidate(structuredClone(branded)))
      .rejects.toMatchObject({ code: "MALFORMED_OPERATION" });
    await expect(runtime.commitCandidate({
      ...branded,
      operationId: "alice_birth_19900101",
      operationNonce: "alice_birth_19900101",
      idempotencyKey: "alice_birth_19900101"
    })).rejects.toMatchObject({ code: "MALFORMED_OPERATION" });
    expect(() => createVedicMutationCandidate(
      new Proxy(base, {}),
      "synthetic_governance_state_beta",
      "no_revocation_event"
    )).toThrowError(expect.objectContaining({ code: "MALFORMED_OPERATION" }));
    expect(await runtime.readSnapshot()).toEqual(base);

    const observation = await runtime.commitCandidate(branded);
    expect(Object.isFrozen(observation)).toBe(true);
    expect(Object.isFrozen(observation.authorityBoundary)).toBe(true);
    expect(Object.values(observation.authorityBoundary).every((value) => value === false)).toBe(true);
    const serialized = JSON.stringify(observation);
    expect(serialized).not.toMatch(/alice|birth|person.?name|exact.?quote|source.?text/i);
    expect(serialized).not.toContain("hakimi-vedic-ephemeral-mutation-experiment-");
    expect(observation.operationIdSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(observation.operationKind).toBe("synthetic_state_transition");
    expect(serialized).toContain("browser_or_test_runtime_mechanical_observation_only");
  });

  it("rejects a malformed same-digest raw writer between read/compute and final CAS", async () => {
    const { runtime, factory, databaseName } = await openExperiment();
    const base = await runtime.readSnapshot();
    const pendingCommit = runtime.commitCandidate(candidate(base, "raw_writer_race"));

    await writeMalformedSameDigestHead(factory, databaseName);
    await expect(pendingCommit).rejects.toMatchObject({ code: "BASE_SNAPSHOT_MISMATCH" });
    await expect(runtime.readSnapshot()).rejects.toMatchObject({ code: "STORED_STATE_INVALID" });
  });

  it("rejects extra digest-array properties that canonical array mapping would omit", async () => {
    const { runtime, factory, databaseName } = await openExperiment();
    await writeExtraDigestArrayPropertyHead(factory, databaseName);

    await expect(runtime.readSnapshot()).rejects.toMatchObject({ code: "STORED_STATE_INVALID" });
  });

  it("captures private-brand WeakMap primordials against post-import method poisoning", async () => {
    const { runtime } = await openExperiment();
    const originalGet = WeakMap.prototype.get;
    let thrown: unknown;
    Object.defineProperty(WeakMap.prototype, "get", {
      value: () => ({ forged: true }),
      configurable: true,
      writable: true
    });
    try {
      await runtime.commitCandidate({ forged: true });
    } catch (cause) {
      thrown = cause;
    } finally {
      Object.defineProperty(WeakMap.prototype, "get", {
        value: originalGet,
        configurable: true,
        writable: true
      });
    }
    expect(thrown).toMatchObject({ code: "MALFORMED_OPERATION" });
  });

  it("refuses non-ephemeral database names", async () => {
    const factory = new IDBFactory();
    await expect(openVedicEphemeralMutationEpochRuntimeExperiment(factory, "vedic-product"))
      .rejects.toMatchObject({ code: "DATABASE_NAME_NOT_EPHEMERAL" });
    await expect(deleteVedicEphemeralMutationEpochRuntimeExperiment(factory, "legacy-v13"))
      .rejects.toMatchObject({ code: "DATABASE_NAME_NOT_EPHEMERAL" });
  });
});
