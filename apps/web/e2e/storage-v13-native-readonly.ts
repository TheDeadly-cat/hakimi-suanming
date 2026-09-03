import type { Page } from "@playwright/test";

export const STORAGE_V13_DATABASE_NAME = "hakimi-bazi-research" as const;
export const STORAGE_V13_NATIVE_VERSION = 130 as const;
export const STORAGE_V13_DEXIE_VERSION = 13 as const;
export const STORAGE_V13_PHYSICAL_STORE_NAMES = Object.freeze([
  "appSettings",
  "attachments",
  "birthFingerprints",
  "candidateSets",
  "cases",
  "citations",
  "eventTimeMigrationReceipts",
  "events",
  "knowledgeDocuments",
  "researchNotes",
  "researcherProfiles",
  "revisions",
  "ruleRegistry",
  "savedViews",
  "sourceRights",
  "tzdbMigrationReceipts"
] as const);

export type StorageV13ObservedOperationId =
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "restore"
  | "cancel";

export type StorageV13SnapshotStore = Readonly<{
  storeName: string;
  count: number;
  recordsDigest: string;
  logicalContentDigest: string | null;
}>;

export type StorageV13SemanticCaseWitness = Readonly<{
  caseIdDigest: string;
  latestRevisionIdDigest: string;
  revisionCount: number;
  lifecycleState: "active" | "trashed";
  lifecycleIndependentRecordDigest: string;
  editStableRecordDigest: string;
  recordDigest: string;
}>;

export type StorageV13SemanticRevisionWitness = Readonly<{
  revisionIdDigest: string;
  caseIdDigest: string;
  revisionNumber: number;
  recordDigest: string;
}>;

export type StorageV13SemanticRevisionFingerprintWitness = Readonly<{
  sourceIdDigest: string;
  subjectIdDigest: string;
  recordDigest: string;
}>;

export type StorageV13SemanticCandidateSetFingerprintInventory = Readonly<{
  count: number;
  logicalContentDigest: string;
}>;

export type StorageV13SemanticWitness = Readonly<{
  witnessType: "bounded_hashed_case_revision_relationships_v1";
  maximumEntriesPerCollection: 4096;
  cases: readonly StorageV13SemanticCaseWitness[];
  revisions: readonly StorageV13SemanticRevisionWitness[];
  revisionFingerprints: readonly StorageV13SemanticRevisionFingerprintWitness[];
  candidateSetFingerprintInventory: StorageV13SemanticCandidateSetFingerprintInventory;
  witnessDigest: string;
}>;

export type StorageV13NativeReadonlySnapshot = Readonly<{
  schemaVersion: 2;
  recordType: "storage_v13_native_readonly_snapshot_v2";
  captureId: string;
  operationId: StorageV13ObservedOperationId;
  phase: string;
  capturedAt: string;
  databaseName: typeof STORAGE_V13_DATABASE_NAME;
  physicalVersion: typeof STORAGE_V13_NATIVE_VERSION;
  dexieVersion: typeof STORAGE_V13_DEXIE_VERSION;
  transactionMode: "readonly";
  storeNames: readonly string[];
  stores: readonly StorageV13SnapshotStore[];
  semanticWitness: StorageV13SemanticWitness;
  snapshotDigest: string;
}>;

export async function captureStorageV13NativeReadonlySnapshot(
  page: Page,
  input: Readonly<{
    captureId: string;
    operationId: StorageV13ObservedOperationId;
    phase: string;
  }>
): Promise<StorageV13NativeReadonlySnapshot> {
  return page.evaluate(async ({
    captureId,
    operationId,
    phase,
    databaseName,
    expectedNativeVersion,
    expectedDexieVersion,
    expectedStoreNames
  }) => {
    const hexDigest = async (bytes: Uint8Array): Promise<string> => {
      const owned = new Uint8Array(bytes.byteLength);
      owned.set(bytes);
      const hashed = new Uint8Array(await crypto.subtle.digest("SHA-256", owned.buffer));
      return [...hashed].map((entry) => entry.toString(16).padStart(2, "0")).join("");
    };
    const sortJsonValue = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map((entry) => sortJsonValue(entry));
      if (value !== null && typeof value === "object") {
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [
              key,
              sortJsonValue((value as Record<string, unknown>)[key])
            ])
        );
      }
      return value;
    };
    const jsonDigest = async (value: unknown): Promise<string> =>
      hexDigest(new TextEncoder().encode(JSON.stringify(sortJsonValue(value))));
    const canonicalJsonValue = (
      value: unknown,
      ancestors = new WeakSet<object>()
    ): null | boolean | number | string | unknown[] | Record<string, unknown> => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Backup-compatible digest refuses non-finite numbers.");
        return value;
      }
      if (typeof value !== "object") {
        throw new Error(`Backup-compatible digest refuses ${typeof value} values.`);
      }
      if (ancestors.has(value)) throw new Error("Backup-compatible digest refuses cyclic values.");
      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const output = [];
          for (let index = 0; index < value.length; index += 1) {
            if (!Object.hasOwn(value, index)) {
              throw new Error("Backup-compatible digest refuses sparse arrays.");
            }
            output.push(canonicalJsonValue(value[index], ancestors));
          }
          if (Object.keys(value).length !== value.length) {
            throw new Error("Backup-compatible digest refuses named array properties.");
          }
          return output;
        }
        if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
          throw new Error("Backup-compatible digest accepts only plain JSON objects.");
        }
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value).sort()) {
          const descriptor = Object.getOwnPropertyDescriptor(value, key);
          if (!descriptor || !("value" in descriptor)) {
            throw new Error("Backup-compatible digest refuses accessors.");
          }
          if (descriptor.value !== undefined) {
            output[key] = canonicalJsonValue(descriptor.value, ancestors);
          }
        }
        return output;
      } finally {
        ancestors.delete(value);
      }
    };
    const canonicalJson = (value: unknown): string => JSON.stringify(canonicalJsonValue(value));
    const canonicalJsonDigest = async (value: unknown): Promise<string> =>
      hexDigest(new TextEncoder().encode(canonicalJson(value)));
    const compareText = (left: string, right: string): number =>
      left < right ? -1 : left > right ? 1 : 0;
    const requireRecord = (value: unknown, label: string): Record<string, unknown> => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`${label} must be a record.`);
      }
      return value as Record<string, unknown>;
    };
    const requireTextField = (value: unknown, field: string, label: string): string => {
      const record = requireRecord(value, label);
      if (typeof record[field] !== "string") throw new Error(`${label}.${field} must be text.`);
      return record[field];
    };
    const requirePositiveIntegerField = (value: unknown, field: string, label: string): number => {
      const record = requireRecord(value, label);
      if (!Number.isSafeInteger(record[field]) || Number(record[field]) < 1) {
        throw new Error(`${label}.${field} must be a positive safe integer.`);
      }
      return Number(record[field]);
    };
    const logicalContentDigest = async (values: readonly unknown[]): Promise<string> => {
      const canonicalEntries = values.map((value) => canonicalJson(value)).sort(compareText);
      return hexDigest(new TextEncoder().encode(canonicalJson(canonicalEntries)));
    };
    const canonicalMultisetKnownVector = [
      { z: 1, a: "alpha" },
      { b: 0, a: [3, { y: true, x: null }] }
    ];
    const canonicalMultisetKnownDigest =
      "21b981965002c9b2658e08a8b9906de26963d9409f63e26ad11e6f3c4b7e70a6";
    if (
      await logicalContentDigest(canonicalMultisetKnownVector) !== canonicalMultisetKnownDigest
      || await logicalContentDigest([...canonicalMultisetKnownVector].reverse())
        !== canonicalMultisetKnownDigest
    ) {
      throw new Error("Native snapshot canonical-multiset-v1 conformance failed.");
    }
    const utf16OrdinalKnownVector = ["\u{10000}", "\uE000"];
    const utf16OrdinalKnownDigest =
      "899793e09b1db200cde7180f3e52dcb63aadfc97c090734c2b0bad6648e9b4e2";
    if (
      compareText(utf16OrdinalKnownVector[0], utf16OrdinalKnownVector[1]) >= 0
      || await logicalContentDigest(utf16OrdinalKnownVector) !== utf16OrdinalKnownDigest
      || await logicalContentDigest([...utf16OrdinalKnownVector].reverse())
        !== utf16OrdinalKnownDigest
    ) {
      throw new Error("Native snapshot UTF-16 ordinal conformance failed.");
    }
    const normalize = async (
      value: unknown,
      ancestors = new WeakSet<object>()
    ): Promise<unknown> => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new Error("Native snapshot refuses non-finite numbers.");
        return Object.is(value, -0) ? { $type: "Number", value: "-0" } : value;
      }
      if (typeof value === "bigint") return { $type: "BigInt", value: value.toString(10) };
      if (typeof value === "undefined") return { $type: "Undefined" };
      if (typeof value !== "object") {
        throw new Error(`Native snapshot refuses ${typeof value} values.`);
      }
      if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) throw new Error("Native snapshot refuses invalid Date values.");
        return { $type: "Date", value: value.toISOString() };
      }
      if (value instanceof Blob) {
        const bytes = new Uint8Array(await value.arrayBuffer());
        const base = {
          $type: value instanceof File ? "File" : "Blob",
          mediaType: value.type,
          size: value.size,
          sha256: await hexDigest(bytes)
        };
        return value instanceof File
          ? { ...base, name: value.name, lastModified: value.lastModified }
          : base;
      }
      if (value instanceof ArrayBuffer) {
        const bytes = new Uint8Array(value);
        return { $type: "ArrayBuffer", size: bytes.byteLength, sha256: await hexDigest(bytes) };
      }
      if (ArrayBuffer.isView(value)) {
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        return {
          $type: value.constructor.name,
          size: bytes.byteLength,
          sha256: await hexDigest(bytes)
        };
      }
      if (ancestors.has(value)) throw new Error("Native snapshot refuses cyclic IndexedDB values.");
      ancestors.add(value);
      try {
        if (Array.isArray(value)) {
          const output = [];
          for (const entry of value) output.push(await normalize(entry, ancestors));
          return { $type: "Array", value: output };
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new Error(`Native snapshot refuses ${Object.prototype.toString.call(value)} objects.`);
        }
        const output: Record<string, unknown> = {};
        for (const key of Object.keys(value).sort()) {
          output[key] = await normalize((value as Record<string, unknown>)[key], ancestors);
        }
        return { $type: "Object", value: output };
      } finally {
        ancestors.delete(value);
      }
    };
    const readRequest = <T>(request: IDBRequest<T>, label: string): Promise<T> =>
      new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error(`${label} failed.`));
        request.onsuccess = () => resolve(request.result);
      });
    if (typeof indexedDB.databases !== "function") {
      throw new Error("Native snapshot requires IndexedDB database enumeration support.");
    }
    const databaseEntries = await indexedDB.databases();
    const matchingEntries = databaseEntries.filter((entry) => entry.name === databaseName);
    if (
      matchingEntries.length !== 1
      || matchingEntries[0]?.version !== expectedNativeVersion
    ) {
      throw new Error(
        `Native snapshot requires one existing ${databaseName} database at physical v${expectedNativeVersion}.`
      );
    }
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        reject(new Error("Native snapshot refuses to create or upgrade the release database."));
      };
      request.onerror = () => reject(request.error ?? new Error("Native snapshot database open failed."));
      request.onsuccess = () => resolve(request.result);
    });
    try {
      const storeNames = [...database.objectStoreNames];
      if (
        database.version !== expectedNativeVersion
        || database.version / 10 !== expectedDexieVersion
        || JSON.stringify(storeNames) !== JSON.stringify(expectedStoreNames)
      ) {
        throw new Error(
          `Native snapshot requires physical v${expectedNativeVersion} with the exact v13 stores.`
        );
      }
      const transaction = database.transaction(storeNames, "readonly");
      if (transaction.mode !== "readonly") {
        throw new Error("Native snapshot transaction is not readonly.");
      }
      const completed = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(
          transaction.error ?? new Error("Native snapshot transaction failed.")
        );
        transaction.onabort = () => reject(
          transaction.error ?? new Error("Native snapshot transaction aborted.")
        );
      });
      const rawStores = await Promise.all(storeNames.map(async (storeName) => {
        const store = transaction.objectStore(storeName);
        const [keys, values] = await Promise.all([
          readRequest(store.getAllKeys(), `${storeName} key read`),
          readRequest(store.getAll(), `${storeName} record read`)
        ]);
        if (keys.length !== values.length) {
          throw new Error(`${storeName} key and record cardinalities differ.`);
        }
        return { storeName, keys, values };
      }));
      await completed;
      const stores = [];
      for (const rawStore of rawStores) {
        const records = [];
        for (let index = 0; index < rawStore.values.length; index += 1) {
          records.push({
            key: await normalize(rawStore.keys[index]),
            value: await normalize(rawStore.values[index])
          });
        }
        stores.push({
          storeName: rawStore.storeName,
          count: records.length,
          recordsDigest: await jsonDigest(records),
          logicalContentDigest: rawStore.storeName === "birthFingerprints"
            ? null
            : await logicalContentDigest(rawStore.values)
        });
      }
      const maximumEntriesPerCollection = 4096 as const;
      const storeValues = new Map(rawStores.map((store) => [store.storeName, store.values] as const));
      const caseValues = storeValues.get("cases") ?? [];
      const revisionValues = storeValues.get("revisions") ?? [];
      const birthFingerprintValues = storeValues.get("birthFingerprints") ?? [];
      const revisionFingerprintValues = birthFingerprintValues.filter(
        (value) => requireRecord(value, "birthFingerprints").recordType === "revision"
      );
      const candidateSetFingerprintValues = birthFingerprintValues.filter(
        (value) => requireRecord(value, "birthFingerprints").recordType === "candidate_set"
      );
      if (
        revisionFingerprintValues.length + candidateSetFingerprintValues.length
          !== birthFingerprintValues.length
      ) {
        throw new Error("Birth fingerprint inventory contains an unknown recordType.");
      }
      if (
        caseValues.length > maximumEntriesPerCollection
        || revisionValues.length > maximumEntriesPerCollection
        || revisionFingerprintValues.length > maximumEntriesPerCollection
      ) {
        throw new Error("Semantic witness exceeds its bounded collection limit.");
      }
      const identifierDigest = async (value: string): Promise<string> =>
        hexDigest(new TextEncoder().encode(value));
      const cases = await Promise.all(caseValues.map(async (value) => {
        const record = requireRecord(value, "cases");
        const lifecycleIndependentRecord = { ...record };
        delete lifecycleIndependentRecord.updatedAt;
        delete lifecycleIndependentRecord.deletedAt;
        const editStableRecord = { ...record };
        delete editStableRecord.updatedAt;
        delete editStableRecord.latestRevisionId;
        delete editStableRecord.revisionCount;
        if (record.deletedAt !== null && typeof record.deletedAt !== "string") {
          throw new Error("cases.deletedAt must be null or text.");
        }
        return {
          caseIdDigest: await identifierDigest(requireTextField(value, "id", "cases")),
          latestRevisionIdDigest: await identifierDigest(requireTextField(value, "latestRevisionId", "cases")),
          revisionCount: requirePositiveIntegerField(value, "revisionCount", "cases"),
          lifecycleState: record.deletedAt === null ? "active" as const : "trashed" as const,
          lifecycleIndependentRecordDigest: await canonicalJsonDigest(lifecycleIndependentRecord),
          editStableRecordDigest: await canonicalJsonDigest(editStableRecord),
          recordDigest: await canonicalJsonDigest(value)
        };
      }));
      cases.sort((left, right) => compareText(left.caseIdDigest, right.caseIdDigest));
      const revisions = await Promise.all(revisionValues.map(async (value) => ({
        revisionIdDigest: await identifierDigest(requireTextField(value, "id", "revisions")),
        caseIdDigest: await identifierDigest(requireTextField(value, "caseId", "revisions")),
        revisionNumber: requirePositiveIntegerField(value, "revisionNumber", "revisions"),
        recordDigest: await canonicalJsonDigest(value)
      })));
      revisions.sort((left, right) => compareText(left.caseIdDigest, right.caseIdDigest)
        || left.revisionNumber - right.revisionNumber
        || compareText(left.revisionIdDigest, right.revisionIdDigest));
      const revisionFingerprints = await Promise.all(revisionFingerprintValues.map(async (value) => ({
        sourceIdDigest: await identifierDigest(requireTextField(value, "sourceId", "birthFingerprints")),
        subjectIdDigest: await identifierDigest(requireTextField(value, "subjectId", "birthFingerprints")),
        recordDigest: await canonicalJsonDigest(value)
      })));
      revisionFingerprints.sort((left, right) => compareText(left.subjectIdDigest, right.subjectIdDigest)
        || compareText(left.sourceIdDigest, right.sourceIdDigest));
      const requireUnique = (values: readonly string[], label: string): void => {
        if (new Set(values).size !== values.length) {
          throw new Error(`${label} contains duplicate identifier digests.`);
        }
      };
      requireUnique(cases.map((value) => value.caseIdDigest), "Case semantic witness");
      requireUnique(revisions.map((value) => value.revisionIdDigest), "Revision semantic witness");
      requireUnique(
        revisionFingerprints.map((value) => value.sourceIdDigest),
        "Revision fingerprint semantic witness"
      );
      const candidateSetFingerprintInventory = {
        count: candidateSetFingerprintValues.length,
        logicalContentDigest: await logicalContentDigest(candidateSetFingerprintValues)
      };
      const semanticWitnessProjection = {
        witnessType: "bounded_hashed_case_revision_relationships_v1" as const,
        maximumEntriesPerCollection,
        cases,
        revisions,
        revisionFingerprints,
        candidateSetFingerprintInventory
      };
      const semanticWitness = {
        ...semanticWitnessProjection,
        witnessDigest: await canonicalJsonDigest(semanticWitnessProjection)
      };
      const projection = {
        databaseName,
        physicalVersion: database.version,
        dexieVersion: expectedDexieVersion,
        transactionMode: "readonly" as const,
        storeNames,
        stores,
        semanticWitness
      };
      return {
        schemaVersion: 2 as const,
        recordType: "storage_v13_native_readonly_snapshot_v2" as const,
        captureId,
        operationId,
        phase,
        capturedAt: new Date().toISOString(),
        ...projection,
        snapshotDigest: await jsonDigest(projection)
      };
    } finally {
      database.close();
    }
  }, {
    ...input,
    databaseName: STORAGE_V13_DATABASE_NAME,
    expectedNativeVersion: STORAGE_V13_NATIVE_VERSION,
    expectedDexieVersion: STORAGE_V13_DEXIE_VERSION,
    expectedStoreNames: [...STORAGE_V13_PHYSICAL_STORE_NAMES]
  });
}

function snapshotStoreMap(snapshot: StorageV13NativeReadonlySnapshot) {
  return new Map(snapshot.stores.map((store) => [store.storeName, store] as const));
}

export function storageV13ChangedStores(
  before: StorageV13NativeReadonlySnapshot,
  after: StorageV13NativeReadonlySnapshot
): string[] {
  const beforeStores = snapshotStoreMap(before);
  const afterStores = snapshotStoreMap(after);
  return [...STORAGE_V13_PHYSICAL_STORE_NAMES].filter((storeName) => {
    const left = beforeStores.get(storeName);
    const right = afterStores.get(storeName);
    const semanticChanged = storeName === "cases"
      ? JSON.stringify(before.semanticWitness.cases) !== JSON.stringify(after.semanticWitness.cases)
      : storeName === "revisions"
        ? JSON.stringify(before.semanticWitness.revisions)
          !== JSON.stringify(after.semanticWitness.revisions)
        : storeName === "birthFingerprints"
          ? JSON.stringify({
            revisionFingerprints: before.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              before.semanticWitness.candidateSetFingerprintInventory
          }) !== JSON.stringify({
            revisionFingerprints: after.semanticWitness.revisionFingerprints,
            candidateSetFingerprintInventory:
              after.semanticWitness.candidateSetFingerprintInventory
          })
          : false;
    return left?.count !== right?.count
      || left?.recordsDigest !== right?.recordsDigest
      || left?.logicalContentDigest !== right?.logicalContentDigest
      || semanticChanged;
  });
}

export function storageV13CountDelta(
  before: StorageV13NativeReadonlySnapshot,
  after: StorageV13NativeReadonlySnapshot,
  storeName: string
): number {
  const beforeStore = snapshotStoreMap(before).get(storeName);
  const afterStore = snapshotStoreMap(after).get(storeName);
  if (!beforeStore || !afterStore) throw new Error(`Unknown v13 physical store: ${storeName}.`);
  return afterStore.count - beforeStore.count;
}

export function storageV13SnapshotsEqual(
  left: StorageV13NativeReadonlySnapshot,
  right: StorageV13NativeReadonlySnapshot
): boolean {
  return left.snapshotDigest === right.snapshotDigest;
}
