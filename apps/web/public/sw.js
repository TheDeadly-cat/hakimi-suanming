const CACHE_PREFIX = "hakimi-shell-";
const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const CACHE_META_URL = new URL("/__hakimi_cache_meta__", self.location.origin).toString();
const MAX_CACHE_GENERATIONS = 2;
const RELEASE_CONTROL_DATABASE = "hakimi-bazi-release-control";
const RELEASE_CONTROL_STORE = "releaseState";
const RELEASE_CONTROL_KEY = "current";
const SUPPORTED_RELEASE_PROTOCOL_VERSION = 1;
const CLIENT_FREEZE_LEASE_MS = 30_000;
const CLIENT_DRAFT_CLEANUP_TIMEOUT_MS = 5_000;
const RELEASE_DATABASE = JSON.parse("__RELEASE_DATABASE_DESCRIPTOR__");
const LEGACY_BRIDGE_DATABASE = Object.freeze({
  protocolVersion: 1,
  dbGeneration: "legacy-v13",
  databaseName: "hakimi-bazi-research",
  targetSchema: 13,
  minReadableSchema: 13,
  maxReadableSchema: 13,
  migrationId: null,
  acceptedCommittedMigrationIds: [null],
  sourceGeneration: null,
  sourceDatabaseName: null,
  sourceSchema: null
});
const BUILD_ASSETS = [];
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/brand-mark.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  ...BUILD_ASSETS
];
const STATIC_PATHS = new Set(APP_SHELL.map((path) => new URL(path, self.location.origin).pathname));
const clientCacheNames = new Map();
let activationStarted = false;
let activeClientFreezeSession = null;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isSchemaVersion(value) {
  return Number.isSafeInteger(value) && value >= 1 && value <= 10_000;
}

function isNullableString(value) {
  return value === null || isNonEmptyString(value);
}

function normalizeAcceptedCommittedMigrationIds(value, primaryMigrationId) {
  const entries = value === undefined ? [primaryMigrationId] : value;
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 16) return undefined;
  if (!entries.every(isNullableString)) return undefined;
  if (entries.some((entry, index) => entries.indexOf(entry) !== index)) return undefined;
  if (!entries.includes(primaryMigrationId)) return undefined;
  if (
    primaryMigrationId === null
      ? entries.length !== 1 || entries[0] !== null
      : entries.some((entry) => entry === null)
  ) return undefined;
  return [...entries];
}

function isSha256Digest(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

function normalizeCanonicalValue(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(normalizeCanonicalValue);
  if (isRecord(value)) {
    return Object.keys(value)
      .sort()
      .reduce((output, key) => {
        if (value[key] !== undefined) output[key] = normalizeCanonicalValue(value[key]);
        return output;
      }, {});
  }
  throw new TypeError("Unsupported canonical release-state value");
}

function canonicalStringify(value) {
  return JSON.stringify(normalizeCanonicalValue(value));
}

async function sha256Hex(value) {
  if (!self.crypto?.subtle || typeof TextEncoder !== "function") {
    throw new Error("SHA-256 is unavailable in this Service Worker");
  }
  const bytes = new TextEncoder().encode(canonicalStringify(value));
  const digest = new Uint8Array(await self.crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeReleaseDescriptor(value) {
  if (!isRecord(value)) return undefined;
  if (value.protocolVersion !== SUPPORTED_RELEASE_PROTOCOL_VERSION) return undefined;
  if (!isNonEmptyString(value.dbGeneration) || !isNonEmptyString(value.databaseName)) return undefined;
  if (
    !isSchemaVersion(value.targetSchema) ||
    !isSchemaVersion(value.minReadableSchema) ||
    !isSchemaVersion(value.maxReadableSchema) ||
    value.minReadableSchema > value.targetSchema ||
    value.targetSchema > value.maxReadableSchema ||
    !isNullableString(value.migrationId)
  ) return undefined;

  const acceptedCommittedMigrationIds = normalizeAcceptedCommittedMigrationIds(
    value.acceptedCommittedMigrationIds,
    value.migrationId
  );
  if (!acceptedCommittedMigrationIds) return undefined;

  const sourceValues = [
    value.migrationId,
    value.sourceGeneration,
    value.sourceDatabaseName,
    value.sourceSchema
  ];
  const hasNoSource = sourceValues.every((entry) => entry === null);
  const hasCompleteSource =
    isNonEmptyString(value.migrationId) &&
    isNonEmptyString(value.sourceGeneration) &&
    isNonEmptyString(value.sourceDatabaseName) &&
    isSchemaVersion(value.sourceSchema);
  if (!hasNoSource && !hasCompleteSource) return undefined;

  return {
    protocolVersion: value.protocolVersion,
    dbGeneration: value.dbGeneration,
    databaseName: value.databaseName,
    targetSchema: value.targetSchema,
    minReadableSchema: value.minReadableSchema,
    maxReadableSchema: value.maxReadableSchema,
    migrationId: value.migrationId,
    acceptedCommittedMigrationIds,
    sourceGeneration: value.sourceGeneration,
    sourceDatabaseName: value.sourceDatabaseName,
    sourceSchema: value.sourceSchema
  };
}

const CURRENT_RELEASE_DATABASE = normalizeReleaseDescriptor(RELEASE_DATABASE);
if (!CURRENT_RELEASE_DATABASE) throw new Error("Invalid release database descriptor");

function releaseDescriptorFields(descriptor) {
  return {
    protocolVersion: descriptor.protocolVersion,
    dbGeneration: descriptor.dbGeneration,
    databaseName: descriptor.databaseName,
    targetSchema: descriptor.targetSchema,
    minReadableSchema: descriptor.minReadableSchema,
    maxReadableSchema: descriptor.maxReadableSchema,
    migrationId: descriptor.migrationId,
    acceptedCommittedMigrationIds: [...descriptor.acceptedCommittedMigrationIds],
    sourceGeneration: descriptor.sourceGeneration,
    sourceDatabaseName: descriptor.sourceDatabaseName,
    sourceSchema: descriptor.sourceSchema
  };
}

function descriptorsEqual(left, right) {
  try {
    return canonicalStringify(releaseDescriptorFields(left)) ===
      canonicalStringify(releaseDescriptorFields(right));
  } catch {
    return false;
  }
}

function isLegacyBridgeDescriptor(descriptor) {
  return descriptorsEqual(descriptor, LEGACY_BRIDGE_DATABASE);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        await cache.addAll(APP_SHELL);
        await cache.put(
          CACHE_META_URL,
          new Response(
            JSON.stringify({
              cacheName: CACHE_NAME,
              installedAt: Date.now(),
              bootAttempted: false,
              bootConfirmed: false,
              ...releaseDescriptorFields(CURRENT_RELEASE_DATABASE)
            }),
            { headers: { "content-type": "application/json" } }
          )
        );
      } catch (error) {
        // A partially populated generation must never become a rollback candidate.
        await caches.delete(CACHE_NAME);
        throw error;
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  // Activation only grants control. A generation is stable after a matching BOOT_OK.
  event.waitUntil(self.clients.claim());
});

function cacheNameForVersion(buildVersion) {
  return `${CACHE_PREFIX}${buildVersion}`;
}

function eventClientId(event) {
  return event.resultingClientId || event.clientId || "";
}

function bindClientToCache(clientId, cacheName) {
  if (clientId) clientCacheNames.set(clientId, cacheName);
}

function invalidCacheGeneration(cacheName, fallbackOrder) {
  return {
    cacheName,
    installedAt: fallbackOrder,
    bootAttempted: false,
    bootConfirmed: false,
    fallbackOrder,
    valid: false
  };
}

function isLegacyCacheMetadata(metadata, cacheName) {
  if (!isRecord(metadata) || metadata.cacheName !== cacheName) return false;
  const protocolKeys = [
    "protocolVersion",
    "dbGeneration",
    "databaseName",
    "targetSchema",
    "minReadableSchema",
    "maxReadableSchema",
    "migrationId",
    "acceptedCommittedMigrationIds",
    "sourceGeneration",
    "sourceDatabaseName",
    "sourceSchema"
  ];
  return protocolKeys.every((key) => !Object.prototype.hasOwnProperty.call(metadata, key));
}

function normalizeCacheGeneration(metadata, cacheName, fallbackOrder) {
  if (
    !isRecord(metadata) ||
    metadata.cacheName !== cacheName ||
    !Number.isFinite(metadata.installedAt) ||
    typeof metadata.bootAttempted !== "boolean" ||
    typeof metadata.bootConfirmed !== "boolean"
  ) return invalidCacheGeneration(cacheName, fallbackOrder);

  let descriptor = normalizeReleaseDescriptor(metadata);
  let legacyBridge = false;
  if (!descriptor && isLegacyCacheMetadata(metadata, cacheName)) {
    descriptor = LEGACY_BRIDGE_DATABASE;
    legacyBridge = true;
  }
  if (!descriptor) return invalidCacheGeneration(cacheName, fallbackOrder);

  return {
    cacheName,
    installedAt: metadata.installedAt,
    bootAttempted: metadata.bootAttempted || metadata.bootConfirmed,
    bootConfirmed: metadata.bootConfirmed,
    fallbackOrder,
    valid: true,
    legacyBridge,
    ...releaseDescriptorFields(descriptor)
  };
}

async function readCacheGeneration(cacheName, fallbackOrder) {
  try {
    const cache = await caches.open(cacheName);
    const response = await cache.match(CACHE_META_URL);
    if (!response) return invalidCacheGeneration(cacheName, fallbackOrder);
    return normalizeCacheGeneration(await response.json(), cacheName, fallbackOrder);
  } catch {
    return invalidCacheGeneration(cacheName, fallbackOrder);
  }
}

async function writeCacheGeneration(generation) {
  if (!generation.valid) throw new Error("Cannot write invalid cache generation metadata");
  const cache = await caches.open(generation.cacheName);
  await cache.put(
    CACHE_META_URL,
    new Response(
      JSON.stringify({
        cacheName: generation.cacheName,
        installedAt: generation.installedAt,
        bootAttempted: generation.bootAttempted,
        bootConfirmed: generation.bootConfirmed,
        ...releaseDescriptorFields(generation)
      }),
      { headers: { "content-type": "application/json" } }
    )
  );
}

async function readShellGenerations(cacheNames) {
  const shellCacheNames = cacheNames.filter((cacheName) => cacheName.startsWith(CACHE_PREFIX));
  return Promise.all(shellCacheNames.map((cacheName, order) => readCacheGeneration(cacheName, order)));
}

function normalizeCommittedReleaseState(value) {
  if (!isRecord(value) || value.id !== RELEASE_CONTROL_KEY) return undefined;
  if (value.protocolVersion !== SUPPORTED_RELEASE_PROTOCOL_VERSION) return undefined;
  if (
    !isNonEmptyString(value.committedGeneration) ||
    !isNonEmptyString(value.committedDatabaseName) ||
    !isSchemaVersion(value.committedSchema) ||
    !isNonEmptyString(value.committedBuild) ||
    !isNullableString(value.migrationId) ||
    !isSha256Digest(value.committedDigest) ||
    !isSha256Digest(value.receiptDigest) ||
    !isNonEmptyString(value.committedAt) ||
    !isNonEmptyString(value.updatedAt)
  ) return undefined;
  return {
    id: value.id,
    protocolVersion: value.protocolVersion,
    committedGeneration: value.committedGeneration,
    committedDatabaseName: value.committedDatabaseName,
    committedSchema: value.committedSchema,
    committedBuild: value.committedBuild,
    migrationId: value.migrationId,
    committedDigest: value.committedDigest,
    receiptDigest: value.receiptDigest,
    committedAt: value.committedAt,
    updatedAt: value.updatedAt
  };
}

async function verifyCommittedReleaseStateReceipt(state) {
  const { receiptDigest, ...unsigned } = state;
  const payload = {
    kind: "hakimi-database-generation-commit-receipt@1",
    ...unsigned
  };
  try {
    return (await sha256Hex(payload)) === receiptDigest;
  } catch {
    return false;
  }
}

async function readCommittedReleaseState() {
  const factory = self.indexedDB;
  if (!factory || typeof factory.open !== "function") return { status: "absent" };

  if (typeof factory.databases === "function") {
    try {
      const databases = await factory.databases();
      if (!databases.some((database) => database?.name === RELEASE_CONTROL_DATABASE)) {
        return { status: "absent" };
      }
    } catch {
      return { status: "invalid" };
    }
  }

  return new Promise((resolve) => {
    let settled = false;
    let createdByProbe = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    let request;
    try {
      request = factory.open(RELEASE_CONTROL_DATABASE);
    } catch {
      finish({ status: "invalid" });
      return;
    }
    request.onupgradeneeded = () => {
      createdByProbe = true;
      try {
        request.transaction?.abort();
      } catch {
        // The request error below resolves this probe as absent.
      }
    };
    request.onerror = () => finish({ status: createdByProbe ? "absent" : "invalid" });
    request.onblocked = () => finish({ status: "invalid" });
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RELEASE_CONTROL_STORE)) {
        database.close();
        finish({ status: "invalid" });
        return;
      }
      let transaction;
      try {
        transaction = database.transaction(RELEASE_CONTROL_STORE, "readonly");
        const getRequest = transaction.objectStore(RELEASE_CONTROL_STORE).get(RELEASE_CONTROL_KEY);
        getRequest.onerror = () => {
          database.close();
          finish({ status: "invalid" });
        };
        getRequest.onsuccess = async () => {
          const state = normalizeCommittedReleaseState(getRequest.result);
          const receiptValid = state ? await verifyCommittedReleaseStateReceipt(state) : false;
          database.close();
          finish(state && receiptValid ? { status: "ready", state } : { status: "invalid" });
        };
      } catch {
        database.close();
        finish({ status: "invalid" });
      }
      if (transaction) transaction.onabort = () => finish({ status: "invalid" });
    };
  });
}

function committedStateExactlyMatchesDescriptor(state, descriptor) {
  return (
    state.protocolVersion === descriptor.protocolVersion &&
    state.committedGeneration === descriptor.dbGeneration &&
    state.committedDatabaseName === descriptor.databaseName &&
    state.committedSchema >= descriptor.minReadableSchema &&
    state.committedSchema <= descriptor.maxReadableSchema &&
    descriptor.acceptedCommittedMigrationIds.includes(state.migrationId)
  );
}

function generationCompatibleWithCommittedState(generation, committed) {
  if (!generation?.valid) return false;
  if (committed.status === "invalid") return false;
  if (committed.status === "absent") return isLegacyBridgeDescriptor(generation);

  const state = committed.state;
  if (committedStateExactlyMatchesDescriptor(state, generation)) return true;

  // A prepared target shell may run while its immutable source generation remains committed.
  // BOOT_OK is still rejected until the target itself becomes the committed generation.
  return (
    state.protocolVersion === generation.protocolVersion &&
    generation.migrationId !== null &&
    generation.sourceGeneration === state.committedGeneration &&
    generation.sourceDatabaseName === state.committedDatabaseName &&
    generation.sourceSchema === state.committedSchema
  );
}

function newestConfirmedPrevious(generations, committed) {
  return generations
    .filter(
      (generation) =>
        generation.cacheName !== CACHE_NAME &&
        generation.bootConfirmed &&
        generationCompatibleWithCommittedState(generation, committed)
    )
    .sort(
      (left, right) =>
        right.installedAt - left.installedAt || right.fallbackOrder - left.fallbackOrder
    )[0];
}

async function confirmCurrentBoot() {
  const cacheNames = await caches.keys();
  if (!cacheNames.includes(CACHE_NAME)) return false;

  const currentOrder = cacheNames.indexOf(CACHE_NAME);
  const currentGeneration = await readCacheGeneration(CACHE_NAME, currentOrder);
  if (!currentGeneration.valid || !descriptorsEqual(currentGeneration, CURRENT_RELEASE_DATABASE)) {
    return false;
  }
  await writeCacheGeneration({
    ...currentGeneration,
    bootAttempted: true,
    bootConfirmed: true
  });
  return true;
}

async function pruneShellGenerations() {
  const cacheNames = await caches.keys();
  const shellCacheNames = cacheNames.filter((cacheName) => cacheName.startsWith(CACHE_PREFIX));
  const generations = await readShellGenerations(cacheNames);
  const previousGenerations = generations
    .filter((generation) => generation.cacheName !== CACHE_NAME)
    .sort((left, right) => {
      if (left.valid !== right.valid) return left.valid ? -1 : 1;
      if (left.bootConfirmed !== right.bootConfirmed) return left.bootConfirmed ? -1 : 1;
      return right.installedAt - left.installedAt || right.fallbackOrder - left.fallbackOrder;
    });
  const retainedCacheNames = new Set([
    CACHE_NAME,
    ...previousGenerations
      .slice(0, Math.max(0, MAX_CACHE_GENERATIONS - 1))
      .map((generation) => generation.cacheName)
  ]);

  await Promise.all(
    shellCacheNames
      .filter((cacheName) => !retainedCacheNames.has(cacheName))
      .map((cacheName) => caches.delete(cacheName))
  );
}

function messagePort(event) {
  return event.ports?.[0];
}

function postBootAck(
  event,
  accepted,
  reason,
  descriptor = CURRENT_RELEASE_DATABASE,
  buildVersion = CACHE_VERSION,
  committedMigrationId = descriptor.migrationId
) {
  messagePort(event)?.postMessage({
    type: "BOOT_OK_ACK",
    accepted,
    reason,
    buildVersion,
    committedMigrationId,
    ...releaseDescriptorFields(descriptor)
  });
}

function committedMigrationIdFromBootMessage(message) {
  if (!isRecord(message)) return undefined;
  return Object.prototype.hasOwnProperty.call(message, "committedMigrationId")
    ? message.committedMigrationId
    : message.migrationId;
}

function isCompleteBootMessage(message) {
  return (
    isRecord(message) &&
    Number.isInteger(message.protocolVersion) &&
    isNonEmptyString(message.dbGeneration) &&
    isSchemaVersion(message.dbSchemaVersion) &&
    isNullableString(message.migrationId) &&
    isNullableString(committedMigrationIdFromBootMessage(message)) &&
    (message.migrationReceiptDigest === null || isNonEmptyString(message.migrationReceiptDigest))
  );
}

function bootMessageMatchesDescriptor(message, descriptor) {
  if (!isCompleteBootMessage(message)) return false;
  return (
    message.protocolVersion === descriptor.protocolVersion &&
    message.dbGeneration === descriptor.dbGeneration &&
    message.dbSchemaVersion === descriptor.targetSchema &&
    message.migrationId === descriptor.migrationId &&
    descriptor.acceptedCommittedMigrationIds.includes(
      committedMigrationIdFromBootMessage(message)
    )
  );
}

function isLegacyBridgeBootMessage(message, descriptor) {
  if (!isLegacyBridgeDescriptor(descriptor) || !isRecord(message)) return false;
  const protocolFields = [
    "protocolVersion",
    "dbGeneration",
    "dbSchemaVersion",
    "migrationId",
    "committedMigrationId",
    "migrationReceiptDigest"
  ];
  return protocolFields.every((key) => !Object.prototype.hasOwnProperty.call(message, key));
}

function committedStateMatchesBootMessage(committed, descriptor, message, legacyBridgeMessage) {
  if (committed.status === "invalid") return false;
  if (committed.status === "absent") {
    return isLegacyBridgeDescriptor(descriptor);
  }
  if (!committedStateExactlyMatchesDescriptor(committed.state, descriptor)) return false;
  if (committed.state.committedSchema !== descriptor.targetSchema) return false;
  if (committed.state.committedBuild !== message.buildVersion) return false;
  if (legacyBridgeMessage) return true;
  if (committed.state.migrationId !== committedMigrationIdFromBootMessage(message)) return false;
  return committed.state.receiptDigest === message.migrationReceiptDigest;
}

async function bindConfirmedPreviousClient(event, message) {
  const cacheName = cacheNameForVersion(message.buildVersion);
  const cacheNames = await caches.keys();
  const fallbackOrder = cacheNames.indexOf(cacheName);
  if (fallbackOrder < 0) {
    postBootAck(event, false, "CACHE_NOT_FOUND");
    return;
  }

  const generation = await readCacheGeneration(cacheName, fallbackOrder);
  const legacyBridgeMessage = isLegacyBridgeBootMessage(message, generation);
  if (!generation.valid || (!legacyBridgeMessage && !bootMessageMatchesDescriptor(message, generation))) {
    postBootAck(event, false, "PROTOCOL_MISMATCH", generation.valid ? generation : CURRENT_RELEASE_DATABASE, message.buildVersion);
    return;
  }
  if (!legacyBridgeMessage && !messagePort(event)) return;

  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  if (!sourceClientId || clientCacheNames.get(sourceClientId) !== cacheName) {
    postBootAck(event, false, "CLIENT_NOT_BOUND_TO_GENERATION", generation, message.buildVersion);
    return;
  }
  const committed = await readCommittedReleaseState();
  if (
    !generation.bootConfirmed ||
    !generationCompatibleWithCommittedState(generation, committed) ||
    !committedStateMatchesBootMessage(committed, generation, message, legacyBridgeMessage)
  ) {
    postBootAck(event, false, "GENERATION_NOT_COMPATIBLE", generation, message.buildVersion);
    return;
  }
  postBootAck(
    event,
    true,
    "PREVIOUS_GENERATION_BOUND",
    generation,
    message.buildVersion,
    committedMigrationIdFromBootMessage(message)
  );
}

async function acceptCurrentBoot(event, message) {
  const cacheNames = await caches.keys();
  const currentOrder = cacheNames.indexOf(CACHE_NAME);
  if (currentOrder < 0) {
    postBootAck(event, false, "CACHE_NOT_FOUND");
    return;
  }
  const generation = await readCacheGeneration(CACHE_NAME, currentOrder);
  const legacyBridgeMessage = isLegacyBridgeBootMessage(message, generation);
  if (
    !generation.valid ||
    !descriptorsEqual(generation, CURRENT_RELEASE_DATABASE) ||
    (!legacyBridgeMessage && !bootMessageMatchesDescriptor(message, generation))
  ) {
    postBootAck(event, false, "PROTOCOL_MISMATCH");
    return;
  }
  if (!legacyBridgeMessage && !messagePort(event)) return;

  const committed = await readCommittedReleaseState();
  if (!committedStateMatchesBootMessage(committed, generation, message, legacyBridgeMessage)) {
    postBootAck(event, false, "COMMIT_NOT_VERIFIED");
    return;
  }

  if (!(await confirmCurrentBoot())) {
    postBootAck(event, false, "CACHE_CONFIRMATION_FAILED");
    return;
  }

  // Re-read the independent commit record after Cache Storage mutation. A changed
  // pointer fails closed; cache selection will also reject this generation.
  const committedAfterWrite = await readCommittedReleaseState();
  if (!committedStateMatchesBootMessage(committedAfterWrite, generation, message, legacyBridgeMessage)) {
    const refreshedNames = await caches.keys();
    const refreshedOrder = refreshedNames.indexOf(CACHE_NAME);
    if (refreshedOrder >= 0) {
      const refreshed = await readCacheGeneration(CACHE_NAME, refreshedOrder);
      if (refreshed.valid) {
        await writeCacheGeneration({ ...refreshed, bootConfirmed: false, bootAttempted: true });
      }
    }
    postBootAck(event, false, "COMMIT_CHANGED_DURING_CONFIRMATION");
    return;
  }
  await pruneShellGenerations();
  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  bindClientToCache(sourceClientId, CACHE_NAME);
  postBootAck(
    event,
    true,
    legacyBridgeMessage ? "LEGACY_BRIDGE_CONFIRMED" : "CONFIRMED",
    CURRENT_RELEASE_DATABASE,
    CACHE_VERSION,
    committedMigrationIdFromBootMessage(message)
  );
}

function clientFreezeRequestMatchesCurrentRelease(message) {
  return (
    CURRENT_RELEASE_DATABASE.migrationId !== null &&
    isNonEmptyString(message?.requestId) &&
    message?.migrationId === CURRENT_RELEASE_DATABASE.migrationId &&
    message?.sourceGeneration === CURRENT_RELEASE_DATABASE.sourceGeneration &&
    message?.sourceDatabaseName === CURRENT_RELEASE_DATABASE.sourceDatabaseName &&
    message?.sourceSchema === CURRENT_RELEASE_DATABASE.sourceSchema
  );
}

function isNonNegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

async function requestClientResearchQueryDraftCleanup(client, requestId) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      channel.port1.close();
      resolve(result);
    };
    const timeout = setTimeout(() => {
      finish({
        clientId: client.id,
        acknowledged: false,
        accepted: false,
        reason: "CLIENT_TIMEOUT",
        matchedDraftCount: 0,
        removedDraftCount: 0,
        failedDraftCount: 0
      });
    }, CLIENT_DRAFT_CLEANUP_TIMEOUT_MS);
    channel.port1.onmessage = (event) => {
      const response = event.data;
      const acknowledged =
        response?.type === "RESEARCH_QUERY_SESSION_DRAFTS_CLEARED" &&
        response?.requestId === requestId &&
        typeof response?.accepted === "boolean" &&
        isNonEmptyString(response?.reason) &&
        isNonNegativeInteger(response?.matchedDraftCount) &&
        isNonNegativeInteger(response?.removedDraftCount) &&
        isNonNegativeInteger(response?.failedDraftCount) &&
        response.removedDraftCount + response.failedDraftCount === response.matchedDraftCount;
      finish({
        clientId: client.id,
        acknowledged,
        accepted: acknowledged && response.accepted === true && response.failedDraftCount === 0,
        reason: acknowledged ? response.reason : "INVALID_CLIENT_ACK",
        matchedDraftCount: acknowledged ? response.matchedDraftCount : 0,
        removedDraftCount: acknowledged ? response.removedDraftCount : 0,
        failedDraftCount: acknowledged ? response.failedDraftCount : 0
      });
    };
    try {
      client.postMessage({
        type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS",
        requestId
      }, [channel.port2]);
    } catch {
      finish({
        clientId: client.id,
        acknowledged: false,
        accepted: false,
        reason: "CLIENT_POST_FAILED",
        matchedDraftCount: 0,
        removedDraftCount: 0,
        failedDraftCount: 0
      });
    }
  });
}

function postControlledWindowDraftCleanupResult(port, requestId, result) {
  port.postMessage({
    type: "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS_ACK",
    requestId,
    ...result
  });
}

async function clearResearchQueryDraftsAcrossControlledClients(event, message) {
  const responsePort = messagePort(event);
  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  if (!responsePort || !sourceClientId || !isNonEmptyString(message?.requestId)) {
    if (responsePort) postControlledWindowDraftCleanupResult(responsePort, message?.requestId ?? "", {
      accepted: false,
      reason: "PROTOCOL_MISMATCH",
      requestedClientCount: 0,
      acknowledgedClientCount: 0,
      clearedClientCount: 0,
      matchedDraftCount: 0,
      removedDraftCount: 0,
      failedDraftCount: 0,
      failedClients: []
    });
    return;
  }

  let clients;
  try {
    clients = await self.clients.matchAll({ type: "window", includeUncontrolled: false });
  } catch {
    postControlledWindowDraftCleanupResult(responsePort, message.requestId, {
      accepted: false,
      reason: "CLIENT_ENUMERATION_FAILED",
      requestedClientCount: 0,
      acknowledgedClientCount: 0,
      clearedClientCount: 0,
      matchedDraftCount: 0,
      removedDraftCount: 0,
      failedDraftCount: 0,
      failedClients: []
    });
    return;
  }

  if (!clients.some((client) => client.id === sourceClientId)) {
    const notStarted = [
      { clientId: sourceClientId, reason: "SOURCE_CLIENT_NOT_ENUMERATED" },
      ...clients.map((client) => ({ clientId: client.id, reason: "CLEANUP_NOT_STARTED" }))
    ];
    postControlledWindowDraftCleanupResult(responsePort, message.requestId, {
      accepted: false,
      reason: "SOURCE_CLIENT_NOT_ENUMERATED",
      requestedClientCount: notStarted.length,
      acknowledgedClientCount: 0,
      clearedClientCount: 0,
      matchedDraftCount: 0,
      removedDraftCount: 0,
      failedDraftCount: 0,
      failedClients: notStarted
    });
    return;
  }

  const results = await Promise.all(clients.map((client) =>
    requestClientResearchQueryDraftCleanup(client, message.requestId)
  ));
  const failures = results.filter((result) => !result.accepted);
  postControlledWindowDraftCleanupResult(responsePort, message.requestId, {
    accepted: failures.length === 0,
    reason: failures.length === 0 ? "ALL_CONTROLLED_WINDOWS_CLEARED" : "CLIENTS_NOT_CONFIRMED",
    requestedClientCount: clients.length,
    acknowledgedClientCount: results.filter((result) => result.acknowledged).length,
    clearedClientCount: results.filter((result) => result.accepted).length,
    matchedDraftCount: results.reduce((sum, result) => sum + result.matchedDraftCount, 0),
    removedDraftCount: results.reduce((sum, result) => sum + result.removedDraftCount, 0),
    failedDraftCount: results.reduce((sum, result) => sum + result.failedDraftCount, 0),
    failedClients: failures.map((result) => ({ clientId: result.clientId, reason: result.reason }))
  });
}

async function requestClientWriteFreeze(client, message, leaseDeadline) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      channel.port1.close();
      resolve(result);
    };
    const timeout = setTimeout(() => {
      finish({ accepted: false, clientId: client.id, reason: "CLIENT_TIMEOUT" });
    }, 5_000);
    channel.port1.onmessage = (event) => {
      const response = event.data;
      const accepted =
          response?.type === "DATABASE_WRITES_FROZEN" &&
          response?.accepted === true &&
          response?.requestId === message.requestId &&
          (response?.reason === "SOURCE_CLOSED" || response?.reason === "CLIENT_NOT_SOURCE");
      finish({
        accepted,
        clientId: client.id,
        reason: response?.reason ?? "INVALID_CLIENT_ACK"
      });
    };
    try {
      client.postMessage({
        type: "FREEZE_DATABASE_WRITES",
        requestId: message.requestId,
        migrationId: message.migrationId,
        sourceGeneration: message.sourceGeneration,
        sourceDatabaseName: message.sourceDatabaseName,
        sourceSchema: message.sourceSchema,
        targetGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
        targetDatabaseName: CURRENT_RELEASE_DATABASE.databaseName,
        targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
        leaseDeadline
      }, [channel.port2]);
    } catch {
      finish({ accepted: false, clientId: client.id, reason: "CLIENT_POST_FAILED" });
    }
  });
}

async function broadcastMigrationResolutionToClientIds(clientIds, migrationId, type) {
  const targetIds = new Set(clientIds);
  if (targetIds.size === 0) return;
  const committed = await readCommittedReleaseState();
  let resolvedType;
  if (
    committed.status === "ready" &&
    committedStateExactlyMatchesDescriptor(committed.state, CURRENT_RELEASE_DATABASE) &&
    committed.state.committedSchema === CURRENT_RELEASE_DATABASE.targetSchema
  ) {
    resolvedType = "DATABASE_MIGRATION_COMMITTED";
  } else if (
    committed.status === "ready" &&
    committed.state.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion &&
    committed.state.committedGeneration === CURRENT_RELEASE_DATABASE.sourceGeneration &&
    committed.state.committedDatabaseName === CURRENT_RELEASE_DATABASE.sourceDatabaseName &&
    committed.state.committedSchema === CURRENT_RELEASE_DATABASE.sourceSchema
  ) {
    resolvedType = "DATABASE_MIGRATION_ABORTED";
  } else {
    // Unknown/corrupt control state must not unlock a source database. Frozen
    // clients retain their own recovery loop until a verifiable pointer exists.
    return;
  }
  let clients;
  try {
    clients = await self.clients.matchAll({ type: "window", includeUncontrolled: false });
  } catch {
    return;
  }
  await Promise.allSettled(clients
    .filter((client) => targetIds.has(client.id))
    .map(async (client) => client.postMessage({
      type: resolvedType,
      migrationId,
      targetGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
      targetDatabaseName: CURRENT_RELEASE_DATABASE.databaseName,
      targetSchema: CURRENT_RELEASE_DATABASE.targetSchema
    })));
}

function clearClientFreezeSession(session) {
  if (session.leaseTimer !== null) clearTimeout(session.leaseTimer);
  if (activeClientFreezeSession === session) activeClientFreezeSession = null;
}

function startClientFreezeSessionLease(session) {
  if (session.leaseTimer !== null) clearTimeout(session.leaseTimer);
  const timeout = setTimeout(() => {
    if (activeClientFreezeSession !== session) return;
    activeClientFreezeSession = null;
    void broadcastMigrationResolutionToClientIds(
      session.peerClientIds,
      session.migrationId,
      "DATABASE_MIGRATION_ABORTED"
    );
  }, Math.max(0, session.leaseDeadline - Date.now()));
  // Node's unit-test timer supports unref; browsers return a numeric handle.
  timeout?.unref?.();
  session.leaseTimer = timeout;
}

function postMigrationPreparationAck(port, message, result) {
  port.postMessage({
    type: "PREPARE_DATABASE_MIGRATION_ACK",
    requestId: message?.requestId,
    migrationId: CURRENT_RELEASE_DATABASE.migrationId,
    targetGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
    targetDatabaseName: CURRENT_RELEASE_DATABASE.databaseName,
    targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
    ...result
  });
}

function postMigrationRenewalAck(port, message, result) {
  port.postMessage({
    type: "RENEW_DATABASE_MIGRATION_ACK",
    requestId: message?.requestId,
    migrationId: message?.migrationId,
    targetGeneration: CURRENT_RELEASE_DATABASE.dbGeneration,
    targetDatabaseName: CURRENT_RELEASE_DATABASE.databaseName,
    targetSchema: CURRENT_RELEASE_DATABASE.targetSchema,
    ...result
  });
}

async function freezeSourceGenerationClients(event, message) {
  const responsePort = messagePort(event);
  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  if (!responsePort || !sourceClientId || !clientFreezeRequestMatchesCurrentRelease(message)) {
    if (responsePort) postMigrationPreparationAck(responsePort, message, {
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    });
    return;
  }

  if (activeClientFreezeSession !== null) {
    postMigrationPreparationAck(responsePort, message, {
      accepted: false,
      reason: "MIGRATION_SESSION_ACTIVE"
    });
    return;
  }

  let clients;
  try {
    clients = await self.clients.matchAll({ type: "window", includeUncontrolled: false });
  } catch {
    postMigrationPreparationAck(responsePort, message, {
      accepted: false,
      reason: "CLIENT_ENUMERATION_FAILED"
    });
    return;
  }
  const peers = clients.filter((client) => client.id !== sourceClientId);
  const session = {
    requestId: message.requestId,
    migrationId: message.migrationId,
    initiatorClientId: sourceClientId,
    peerClientIds: peers.map((client) => client.id),
    state: "preparing",
    leaseDeadline: Date.now() + CLIENT_FREEZE_LEASE_MS,
    leaseTimer: null
  };
  activeClientFreezeSession = session;
  startClientFreezeSessionLease(session);
  const results = await Promise.all(peers.map((client) =>
    requestClientWriteFreeze(client, message, session.leaseDeadline)
  ));
  const rejected = results.filter((result) => !result.accepted);
  const sessionCancelled = activeClientFreezeSession !== session;
  if (rejected.length > 0 || sessionCancelled) {
    clearClientFreezeSession(session);
    // Broadcast to every requested peer, not only clients whose ACK arrived. A
    // source tab may have closed its database and then lost its ACK in transit.
    await broadcastMigrationResolutionToClientIds(
      session.peerClientIds,
      session.migrationId,
      "DATABASE_MIGRATION_ABORTED"
    );
    postMigrationPreparationAck(responsePort, message, {
      accepted: false,
      reason: sessionCancelled ? "MIGRATION_SESSION_CANCELLED" : "CLIENT_NOT_FROZEN",
      clientCount: peers.length,
      acknowledgedClientCount: results.filter((result) => result.accepted).length,
      frozenClientCount: results.filter((result) => result.accepted && result.reason === "SOURCE_CLOSED").length,
      rejectedClientIds: rejected.map((result) => result.clientId)
    });
    return;
  }

  session.state = "prepared";
  postMigrationPreparationAck(responsePort, message, {
    accepted: true,
    reason: "ALL_CLIENTS_FROZEN",
    clientCount: peers.length,
    acknowledgedClientCount: results.length,
    frozenClientCount: results.filter((result) => result.reason === "SOURCE_CLOSED").length,
    rejectedClientIds: []
  });
}

async function renewSourceGenerationClientFreeze(event, message) {
  const responsePort = messagePort(event);
  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  const session = activeClientFreezeSession;
  if (
    !responsePort ||
    !session ||
    session.state !== "prepared" ||
    sourceClientId !== session.initiatorClientId ||
    message?.requestId !== session.requestId ||
    message?.migrationId !== session.migrationId ||
    message.migrationId !== CURRENT_RELEASE_DATABASE.migrationId
  ) {
    if (responsePort) postMigrationRenewalAck(responsePort, message, {
      accepted: false,
      reason: "PROTOCOL_MISMATCH"
    });
    return;
  }

  let clients;
  try {
    clients = await self.clients.matchAll({ type: "window", includeUncontrolled: false });
  } catch {
    postMigrationRenewalAck(responsePort, message, {
      accepted: false,
      reason: "CLIENT_ENUMERATION_FAILED"
    });
    return;
  }

  // Include newly controlled tabs in every heartbeat. This narrows the window in
  // which an old source shell can appear after the initial freeze snapshot.
  const peers = clients.filter((client) => client.id !== sourceClientId);
  const requestedIds = new Set([...session.peerClientIds, ...peers.map((client) => client.id)]);
  session.peerClientIds = [...requestedIds];
  const nextLeaseDeadline = Date.now() + CLIENT_FREEZE_LEASE_MS;
  const freezeMessage = {
    requestId: session.requestId,
    migrationId: session.migrationId,
    sourceGeneration: CURRENT_RELEASE_DATABASE.sourceGeneration,
    sourceDatabaseName: CURRENT_RELEASE_DATABASE.sourceDatabaseName,
    sourceSchema: CURRENT_RELEASE_DATABASE.sourceSchema
  };
  session.state = "renewing";
  const results = await Promise.all(peers.map((client) =>
    requestClientWriteFreeze(client, freezeMessage, nextLeaseDeadline)
  ));
  const rejected = results.filter((result) => !result.accepted);
  const sessionCancelled = activeClientFreezeSession !== session;
  if (rejected.length > 0 || sessionCancelled) {
    clearClientFreezeSession(session);
    if (!sessionCancelled) {
      await broadcastMigrationResolutionToClientIds(
        session.peerClientIds,
        session.migrationId,
        "DATABASE_MIGRATION_ABORTED"
      );
    }
    postMigrationRenewalAck(responsePort, message, {
      accepted: false,
      reason: sessionCancelled ? "MIGRATION_SESSION_CANCELLED" : "CLIENT_NOT_FROZEN",
      clientCount: peers.length,
      acknowledgedClientCount: results.filter((result) => result.accepted).length,
      frozenClientCount: results.filter((result) => result.accepted && result.reason === "SOURCE_CLOSED").length,
      rejectedClientIds: rejected.map((result) => result.clientId)
    });
    return;
  }

  session.leaseDeadline = nextLeaseDeadline;
  session.state = "prepared";
  startClientFreezeSessionLease(session);
  postMigrationRenewalAck(responsePort, message, {
    accepted: true,
    reason: "LEASE_RENEWED",
    leaseDeadline: nextLeaseDeadline,
    clientCount: peers.length,
    acknowledgedClientCount: results.length,
    frozenClientCount: results.filter((result) => result.reason === "SOURCE_CLOSED").length,
    rejectedClientIds: []
  });
}

async function broadcastMigrationResolution(event, message, type) {
  const sourceClientId = typeof event.source?.id === "string" ? event.source.id : "";
  const session = activeClientFreezeSession;
  if (
    !session ||
    session.state !== "prepared" ||
    sourceClientId !== session.initiatorClientId ||
    message?.requestId !== session.requestId ||
    message?.migrationId !== session.migrationId ||
    message.migrationId !== CURRENT_RELEASE_DATABASE.migrationId
  ) return;
  clearClientFreezeSession(session);
  await broadcastMigrationResolutionToClientIds(session.peerClientIds, session.migrationId, type);
}

self.addEventListener("message", (event) => {
  const message = event.data;
  if (message?.type === "CLEAR_RESEARCH_QUERY_SESSION_DRAFTS_ACROSS_CLIENTS") {
    event.waitUntil(clearResearchQueryDraftsAcrossControlledClients(event, message));
    return;
  }
  if (message?.type === "PREPARE_DATABASE_MIGRATION") {
    event.waitUntil(freezeSourceGenerationClients(event, message));
    return;
  }
  if (message?.type === "RENEW_DATABASE_MIGRATION") {
    event.waitUntil(renewSourceGenerationClientFreeze(event, message));
    return;
  }
  if (message?.type === "ABORT_DATABASE_MIGRATION") {
    event.waitUntil(broadcastMigrationResolution(event, message, "DATABASE_MIGRATION_ABORTED"));
    return;
  }
  if (message?.type === "FINISH_DATABASE_MIGRATION") {
    event.waitUntil(broadcastMigrationResolution(event, message, "DATABASE_MIGRATION_COMMITTED"));
    return;
  }
  if (message?.type === "ACTIVATE_INSTALLED_GENERATION") {
    if (activationStarted) return;
    activationStarted = true;
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (message?.type === "GET_BUILD_VERSION") {
    event.ports?.[0]?.postMessage({
      type: "BUILD_VERSION",
      buildVersion: CACHE_VERSION,
      ...releaseDescriptorFields(CURRENT_RELEASE_DATABASE)
    });
    return;
  }
  if (message?.type !== "BOOT_OK" || typeof message.buildVersion !== "string") return;

  if (message.buildVersion === CACHE_VERSION) {
    event.waitUntil(acceptCurrentBoot(event, message));
    return;
  }
  event.waitUntil(bindConfirmedPreviousClient(event, message));
});

async function matchGenerationCache(cacheName, request) {
  const cache = await caches.open(cacheName);
  return cache.match(request, { ignoreVary: true });
}

async function matchCurrentCache(request) {
  return matchGenerationCache(CACHE_NAME, request);
}

function orderedResourceGenerations(generations, preferredCacheName, committed) {
  const compatible = generations.filter((generation) =>
    generationCompatibleWithCommittedState(generation, committed)
  );
  const confirmedPrevious = compatible
    .filter((generation) => generation.cacheName !== CACHE_NAME && generation.bootConfirmed)
    .sort(
      (left, right) =>
        right.installedAt - left.installedAt || right.fallbackOrder - left.fallbackOrder
    );
  const current = compatible.find((generation) => generation.cacheName === CACHE_NAME);
  const orderedNames = [
    preferredCacheName,
    current?.cacheName,
    ...confirmedPrevious.map((generation) => generation.cacheName)
  ].filter(Boolean);
  return [...new Set(orderedNames)];
}

async function matchRetainedGenerationResource(request, preferredCacheName) {
  const cacheNames = await caches.keys();
  const generations = await readShellGenerations(cacheNames);
  const committed = await readCommittedReleaseState();
  const retainedCacheNames = new Set(generations.map((generation) => generation.cacheName));

  for (const cacheName of orderedResourceGenerations(generations, preferredCacheName, committed)) {
    if (!retainedCacheNames.has(cacheName)) continue;
    const response = await matchGenerationCache(cacheName, request);
    if (response) return response;
  }
  return undefined;
}

async function routeUnconfirmedNavigation(generations, committed) {
  const currentGeneration = generations.find((generation) => generation.cacheName === CACHE_NAME);
  const currentCompatible = generationCompatibleWithCommittedState(currentGeneration, committed);
  if (!currentGeneration || currentGeneration.bootConfirmed) return undefined;

  if (currentCompatible && !currentGeneration.bootAttempted) {
    const currentShell = await matchCurrentCache("/");
    if (currentShell) {
      await writeCacheGeneration({ ...currentGeneration, bootAttempted: true });
      return { response: currentShell, cacheName: CACHE_NAME };
    }
  }

  const rollbackGeneration = newestConfirmedPrevious(generations, committed);
  if (rollbackGeneration) {
    const rollbackShell = await matchGenerationCache(rollbackGeneration.cacheName, "/");
    if (rollbackShell) {
      return { response: rollbackShell, cacheName: rollbackGeneration.cacheName };
    }
  }

  if (!currentCompatible) return undefined;
  const currentShell = await matchCurrentCache("/");
  return currentShell ? { response: currentShell, cacheName: CACHE_NAME } : undefined;
}

function activeFreezeBlocksSourceNavigation(cacheName, generations, committed) {
  const session = activeClientFreezeSession;
  if (!session || committed.status !== "ready") return false;
  const generation = generations.find((candidate) => candidate.cacheName === cacheName);
  if (!generation?.valid) return false;
  const state = committed.state;
  const sourceIsStillCommitted =
    state.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion &&
    state.committedGeneration === CURRENT_RELEASE_DATABASE.sourceGeneration &&
    state.committedDatabaseName === CURRENT_RELEASE_DATABASE.sourceDatabaseName &&
    state.committedSchema === CURRENT_RELEASE_DATABASE.sourceSchema;
  const candidateIsSource =
    generation.protocolVersion === CURRENT_RELEASE_DATABASE.protocolVersion &&
    generation.dbGeneration === CURRENT_RELEASE_DATABASE.sourceGeneration &&
    generation.databaseName === CURRENT_RELEASE_DATABASE.sourceDatabaseName &&
    generation.targetSchema === CURRENT_RELEASE_DATABASE.sourceSchema;
  return sourceIsStillCommitted && candidateIsSource;
}

function migrationHoldingResponse() {
  return new Response(
    "<!doctype html><html lang=\"zh-CN\"><meta charset=\"utf-8\">" +
      "<meta http-equiv=\"refresh\" content=\"2\"><meta name=\"viewport\" content=\"width=device-width\">" +
      "<title>正在安全升级</title><body><main><h1>正在安全升级本地研究库</h1>" +
      "<p>旧数据库已暂停写入，完成后页面会自动重试。请暂时不要关闭所有标签页。</p></main></body></html>",
    {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/html; charset=utf-8",
        "retry-after": "2"
      }
    }
  );
}

async function handleNavigation(event) {
  const request = event.request;
  const clientId = eventClientId(event);
  const cacheNames = await caches.keys();
  const generations = await readShellGenerations(cacheNames);
  const committed = await readCommittedReleaseState();
  const rollbackOrFirstBoot = await routeUnconfirmedNavigation(generations, committed);
  if (rollbackOrFirstBoot) {
    if (activeFreezeBlocksSourceNavigation(rollbackOrFirstBoot.cacheName, generations, committed)) {
      return migrationHoldingResponse();
    }
    bindClientToCache(clientId, rollbackOrFirstBoot.cacheName);
    return rollbackOrFirstBoot.response;
  }

  const currentGeneration = generations.find((generation) => generation.cacheName === CACHE_NAME);
  if (
    currentGeneration?.bootConfirmed &&
    generationCompatibleWithCommittedState(currentGeneration, committed)
  ) {
    const currentShell = await matchCurrentCache("/");
    if (currentShell) {
      bindClientToCache(clientId, CACHE_NAME);
      return currentShell;
    }
  }

  const rollbackGeneration = newestConfirmedPrevious(generations, committed);
  if (rollbackGeneration) {
    if (activeFreezeBlocksSourceNavigation(rollbackGeneration.cacheName, generations, committed)) {
      return migrationHoldingResponse();
    }
    const rollbackShell = await matchGenerationCache(rollbackGeneration.cacheName, "/");
    if (rollbackShell) {
      bindClientToCache(clientId, rollbackGeneration.cacheName);
      return rollbackShell;
    }
  }

  // Existing shell caches with missing/corrupt/incompatible metadata fail closed;
  // fetching deployment HTML here would create an unverified mixed generation.
  if (generations.length > 0) throw new Error("No compatible offline application shell");

  const response = await fetch(request);
  bindClientToCache(clientId, CACHE_NAME);
  return response;
}

async function handleStaticResource(event) {
  const preferredCacheName = clientCacheNames.get(event.clientId);
  const cached = await matchRetainedGenerationResource(event.request, preferredCacheName);
  if (cached) return cached;

  // Runtime responses are never written into an immutable generation cache.
  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (!STATIC_PATHS.has(url.pathname) && !url.pathname.startsWith("/assets/")) return;
  event.respondWith(handleStaticResource(event));
});
