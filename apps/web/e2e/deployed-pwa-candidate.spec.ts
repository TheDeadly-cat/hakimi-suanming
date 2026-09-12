import { lstat } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type {
  BrowserContext,
  CDPSession,
  Page,
  Response
} from "@playwright/test";

import {
  assertFreshProfileDirectory,
  deployedPwaCandidateProfileBindingDigest,
  loadVerifiedDeployedPwaCandidateArtifact,
  parseDeployedPwaCandidateEnvironment,
  prepareCandidateProjectOutput,
  revalidateDeployedPwaCandidateArtifactIdentity,
  writeDeployedPwaBrowserCandidate
} from "../../../scripts/deployed-pwa-candidate-runtime.mjs";
import { BRIDGE_RELEASE_DATABASE_DESCRIPTOR } from "../release-protocol.ts";
import { pageReleaseEvidence } from "./cross-schema-upgrade-helpers.ts";
import {
  MOBILE_VIEWPORT,
  createDemoCase,
  waitForAppReady,
  waitForServiceWorker
} from "./full-backup-helpers.ts";
import {
  createReleasePersistentProfile,
  launchReleasePersistentContext,
  requireReleaseBrowserRuntimeProduct
} from "./release-browser-persistent-context.ts";

type BrowserProjectName = "msedge" | "chrome";

type RouteObservation = Readonly<{
  routeId: string;
  path: string;
  navigationKind: "online" | "cold-start" | "reload";
  offline: boolean;
  playwrightFromServiceWorkerRecorded: boolean;
  cdpFromServiceWorkerRecorded: boolean;
  cdpRequestId: string;
  observedAt: string;
}>;

type ControllerRuntime = Readonly<{
  registrationScope: string;
  controllerScriptUrl: string;
  controllerState: string;
  activeScriptUrl: string;
  activeState: string;
  waitingScriptUrl: string | null;
  installingScriptUrl: string | null;
  workerMessage: Record<string, unknown>;
}>;

type NestedCdpResponse = Readonly<{
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: Readonly<{ code?: number; message?: string }>;
}>;

const candidate = parseDeployedPwaCandidateEnvironment(process.env);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;

function fail(code: string, message: string): never {
  throw new Error(`${code}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function waitForNextUtcMillisecond(previous: string | null): Promise<string> {
  const previousTime = previous === null ? -1 : Date.parse(previous);
  const now = Date.now();
  const delay = Math.max(0, previousTime - now + 1);
  return new Promise((resolve) => {
    setTimeout(() => resolve(new Date().toISOString()), delay);
  });
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function observeServiceWorkerRuntime(page: Page): Promise<ControllerRuntime> {
  return page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const expectedScope = new URL("/", window.location.origin).href;
    const registration = registrations.length === 1 && registrations[0].scope === expectedScope
      ? registrations[0]
      : null;
    const controller = navigator.serviceWorker.controller;
    const active = registration?.active ?? null;
    if (!registration || !controller || !active) {
      throw new Error("Candidate capture requires exactly one root registration, controller, and active Service Worker.");
    }
    const workerMessage = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const channel = new MessageChannel();
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        channel.port1.close();
        reject(new Error("Service Worker build identity query timed out."));
      }, 5_000);
      channel.port1.onmessage = (event: MessageEvent<unknown>) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        channel.port1.close();
        if (event.data === null || typeof event.data !== "object" || Array.isArray(event.data)) {
          reject(new Error("Service Worker build identity reply is not an object."));
          return;
        }
        resolve(event.data as Record<string, unknown>);
      };
      channel.port1.onmessageerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        channel.port1.close();
        reject(new Error("Service Worker build identity reply could not be decoded."));
      };
      controller.postMessage({ type: "GET_BUILD_VERSION" }, [channel.port2]);
    });
    return {
      registrationScope: registration.scope,
      controllerScriptUrl: controller.scriptURL,
      controllerState: controller.state,
      activeScriptUrl: active.scriptURL,
      activeState: active.state,
      waitingScriptUrl: registration.waiting?.scriptURL ?? null,
      installingScriptUrl: registration.installing?.scriptURL ?? null,
      workerMessage
    };
  });
}

async function observeNavigation({
  page,
  expectedUrl,
  routeId,
  routePath,
  navigationKind,
  offline,
  expectedFromServiceWorker,
  previousObservedAt,
  navigate
}: Readonly<{
  page: Page;
  expectedUrl: string;
  routeId: string;
  routePath: string;
  navigationKind: "online" | "cold-start" | "reload";
  offline: boolean;
  expectedFromServiceWorker: boolean;
  previousObservedAt: string | null;
  navigate: () => Promise<Response | null>;
}>): Promise<RouteObservation> {
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  let responseTimeout: ReturnType<typeof setTimeout> | undefined;
  let removeListener: () => void = () => undefined;
  try {
    const cdpResponse = new Promise<Readonly<{
      requestId: string;
      fromServiceWorker: boolean;
    }>>((resolve, reject) => {
      responseTimeout = setTimeout(() => {
        removeListener();
        reject(new Error(`Timed out waiting for CDP document response: ${expectedUrl}`));
      }, 15_000);
      const listener = (event: {
        requestId: string;
        type: string;
        response: { url: string; fromServiceWorker?: boolean };
      }) => {
        if (event.type !== "Document" || event.response.url !== expectedUrl) return;
        if (responseTimeout) clearTimeout(responseTimeout);
        removeListener();
        resolve({
          requestId: event.requestId,
          fromServiceWorker: event.response.fromServiceWorker === true
        });
      };
      removeListener = () => {
        session.off("Network.responseReceived", listener);
      };
      session.on("Network.responseReceived", listener);
    });
    const [playwrightResponse, rawCdpResponse] = await Promise.all([navigate(), cdpResponse]);
    if (playwrightResponse === null || playwrightResponse.url() !== expectedUrl) {
      fail("DEPLOYED_PWA_CANDIDATE_PLAYWRIGHT_RESPONSE_MISSING", `${routeId} did not return the exact navigation response.`);
    }
    const playwrightFromServiceWorker = playwrightResponse.fromServiceWorker();
    if (
      playwrightFromServiceWorker !== expectedFromServiceWorker
      || rawCdpResponse.fromServiceWorker !== expectedFromServiceWorker
      || !/^[a-z0-9][a-z0-9._:-]{0,127}$/u.test(rawCdpResponse.requestId)
    ) {
      fail(
        "DEPLOYED_PWA_CANDIDATE_ROUTE_SOURCE_MISMATCH",
        `${routeId} Playwright/CDP fromServiceWorker evidence is not exact.`
      );
    }
    return Object.freeze({
      routeId,
      path: routePath,
      navigationKind,
      offline,
      playwrightFromServiceWorkerRecorded: playwrightFromServiceWorker,
      cdpFromServiceWorkerRecorded: rawCdpResponse.fromServiceWorker,
      cdpRequestId: rawCdpResponse.requestId,
      observedAt: await waitForNextUtcMillisecond(previousObservedAt)
    });
  } finally {
    if (responseTimeout) clearTimeout(responseTimeout);
    removeListener();
    await session.detach();
  }
}

async function fetchRemoteServiceWorkerBytes(
  context: BrowserContext,
  serviceWorkerUrl: string
): Promise<Buffer> {
  const response = await context.request.get(serviceWorkerUrl, {
    headers: {
      "accept-encoding": "identity",
      "cache-control": "no-cache",
      pragma: "no-cache"
    },
    maxRedirects: 0,
    maxRetries: 0,
    timeout: 15_000
  });
  if (!response.ok() || response.status() !== 200 || response.url() !== serviceWorkerUrl) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_REMOTE_SW_FETCH_FAILED",
      `Remote Service Worker fetch was not an exact HTTP 200 response: ${response.status()} ${response.url()}.`
    );
  }
  const contentEncoding = response.headers()["content-encoding"]?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    fail(
      "DEPLOYED_PWA_CANDIDATE_REMOTE_SW_ENCODING_INVALID",
      `Remote Service Worker must be transferred with identity encoding; received ${contentEncoding}.`
    );
  }
  const bytes = await response.body();
  if (bytes.byteLength === 0) {
    fail("DEPLOYED_PWA_CANDIDATE_REMOTE_SW_EMPTY", "Remote Service Worker response is empty.");
  }
  return bytes;
}

async function fetchRemotePwaManifestBytes(
  context: BrowserContext,
  manifestUrl: string
): Promise<Buffer> {
  const response = await context.request.get(manifestUrl, {
    headers: {
      accept: "application/manifest+json, application/json;q=0.9",
      "accept-encoding": "identity",
      "cache-control": "no-cache",
      pragma: "no-cache"
    },
    maxRedirects: 0,
    maxRetries: 0,
    timeout: 15_000
  });
  if (!response.ok() || response.status() !== 200 || response.url() !== manifestUrl) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_REMOTE_MANIFEST_FETCH_FAILED",
      `Remote PWA manifest fetch was not an exact HTTP 200 response: ${response.status()} ${response.url()}.`
    );
  }
  const contentEncoding = response.headers()["content-encoding"]?.trim().toLowerCase();
  if (contentEncoding && contentEncoding !== "identity") {
    fail(
      "DEPLOYED_PWA_CANDIDATE_REMOTE_MANIFEST_ENCODING_INVALID",
      `Remote PWA manifest must be transferred with identity encoding; received ${contentEncoding}.`
    );
  }
  const contentType = response.headers()["content-type"]
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/manifest+json" && contentType !== "application/json") {
    fail(
      "DEPLOYED_PWA_CANDIDATE_REMOTE_MANIFEST_CONTENT_TYPE_INVALID",
      `Remote PWA manifest content type is not allowed by the hosting policy: ${contentType ?? "missing"}.`
    );
  }
  const bytes = await response.body();
  if (bytes.byteLength === 0) {
    fail("DEPLOYED_PWA_CANDIDATE_REMOTE_MANIFEST_EMPTY", "Remote PWA manifest response is empty.");
  }
  return bytes;
}

async function captureControllerSourceViaCdp(
  context: BrowserContext,
  page: Page,
  serviceWorkerUrl: string
): Promise<Buffer> {
  const browser = context.browser();
  // In the installed Playwright client, launchPersistentContext returns a
  // BrowserDispatcher plus its default context, and _didCreateContext binds
  // that context back to Browser. Keep a page-session Target-domain fallback
  // so a future transport that returns browser() === null fails only if the
  // Target domain itself cannot discover/attach the exact Service Worker.
  const browserSession = browser
    ? await browser.newBrowserCDPSession()
    : await context.newCDPSession(page);
  let childSessionId: string | null = null;
  const pending = new Map<number, {
    resolve: (value: Record<string, unknown>) => void;
    reject: (reason: Error) => void;
  }>();
  let nextCommandId = 1;
  let parsedScriptId: string | null = null;
  let resolveParsedScript: ((scriptId: string) => void) | null = null;
  const parsedScript = new Promise<string>((resolve) => {
    resolveParsedScript = resolve;
  });
  const onChildMessage = (event: { sessionId: string; message: string }) => {
    if (event.sessionId !== childSessionId) return;
    let message: NestedCdpResponse;
    try {
      message = JSON.parse(event.message) as NestedCdpResponse;
    } catch {
      return;
    }
    if (typeof message.id === "number") {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) {
        request.reject(new Error(
          `Nested CDP command failed (${String(message.error.code)}): ${String(message.error.message)}`
        ));
      } else {
        request.resolve(message.result ?? {});
      }
      return;
    }
    if (
      message.method === "Debugger.scriptParsed"
      && message.params?.url === serviceWorkerUrl
      && typeof message.params.scriptId === "string"
    ) {
      parsedScriptId = message.params.scriptId;
      resolveParsedScript?.(message.params.scriptId);
    }
  };
  browserSession.on("Target.receivedMessageFromTarget", onChildMessage);
  const sendChild = async (
    method: string,
    params: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    if (!childSessionId) {
      fail("DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE", "Service Worker CDP child session is not attached.");
    }
    const id = nextCommandId;
    nextCommandId += 1;
    const response = new Promise<Record<string, unknown>>((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
    try {
      await browserSession.send("Target.sendMessageToTarget", {
        sessionId: childSessionId,
        message: JSON.stringify({ id, method, params })
      });
    } catch (error) {
      pending.delete(id);
      throw error;
    }
    return response;
  };
  try {
    await browserSession.send("Target.setDiscoverTargets", { discover: true });
    const targetInfos = (await browserSession.send("Target.getTargets")).targetInfos;
    const workers = targetInfos.filter((target) => (
      target.type === "service_worker" && target.url === serviceWorkerUrl
    ));
    if (workers.length !== 1) {
      fail(
        "DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE",
        `Expected one exact Service Worker target for ${serviceWorkerUrl}; found ${workers.length}.`
      );
    }
    const attached = await browserSession.send("Target.attachToTarget", {
      targetId: workers[0].targetId,
      flatten: false
    });
    childSessionId = attached.sessionId;
    await sendChild("Debugger.enable", {});
    const scriptId = parsedScriptId ?? await withTimeout(
      parsedScript,
      10_000,
      "DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE: Debugger.scriptParsed did not bind the active controller source."
    );
    const source = await sendChild("Debugger.getScriptSource", { scriptId });
    if (typeof source.scriptSource !== "string" || source.scriptSource.length === 0) {
      fail(
        "DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE",
        "Debugger.getScriptSource did not return non-empty controller source."
      );
    }
    return Buffer.from(source.scriptSource, "utf8");
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE")) {
      throw error;
    }
    return fail(
      "DEPLOYED_PWA_CONTROLLER_SOURCE_CDP_UNAVAILABLE",
      `Browser/worker CDP transport could not capture controller source: ${error instanceof Error ? error.message : String(error)}.`
    );
  } finally {
    browserSession.off("Target.receivedMessageFromTarget", onChildMessage);
    for (const request of pending.values()) {
      request.reject(new Error("Service Worker CDP child session closed before completing the command."));
    }
    pending.clear();
    if (childSessionId) {
      await browserSession.send("Target.detachFromTarget", { sessionId: childSessionId }).catch(() => undefined);
    }
    await browserSession.detach();
  }
}

async function captureCaseRevisionFingerprint({
  page,
  projectName,
  caseRevisionPath,
  captureId,
  capturePhase,
  previousTimestamp
}: Readonly<{
  page: Page;
  projectName: BrowserProjectName;
  caseRevisionPath: string;
  captureId: string;
  capturePhase: "before_offline_cold_start" | "after_offline_cold_start";
  previousTimestamp: string | null;
}>) {
  const match = caseRevisionPath.match(
    /^\/cases\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/revisions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/u
  );
  if (!match) fail("DEPLOYED_PWA_CANDIDATE_CASE_PATH_INVALID", "UI did not produce a canonical case/revision path.");
  const projection = await page.evaluate(async ({ databaseName, caseId, revisionId }) => {
    const normalize = (value: unknown, ancestors = new WeakSet<object>()): unknown => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return value;
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return { $type: "Date", value: value.toISOString() };
      }
      if (Array.isArray(value)) {
        if (ancestors.has(value)) throw new Error("Cyclic IndexedDB array cannot be fingerprinted.");
        ancestors.add(value);
        const output = value.map((entry) => normalize(entry, ancestors));
        ancestors.delete(value);
        return output;
      }
      if (typeof value !== "object" || value === null) {
        throw new Error(`Unsupported fingerprint value type: ${typeof value}.`);
      }
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error(`Unsupported fingerprint object: ${Object.prototype.toString.call(value)}.`);
      }
      if (ancestors.has(value)) throw new Error("Cyclic IndexedDB record cannot be fingerprinted.");
      ancestors.add(value);
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(value).sort()) {
        const entry = (value as Record<string, unknown>)[key];
        if (entry === undefined) throw new Error(`Undefined fingerprint field: ${key}.`);
        output[key] = normalize(entry, ancestors);
      }
      ancestors.delete(value);
      return output;
    };
    const digest = async (value: unknown): Promise<string> => {
      const bytes = new TextEncoder().encode(JSON.stringify(normalize(value)));
      const hashed = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
      return [...hashed].map((entry) => entry.toString(16).padStart(2, "0")).join("");
    };
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onupgradeneeded = () => {
        request.transaction?.abort();
        reject(new Error("Fingerprint capture refuses to create or upgrade the release database."));
      };
      request.onerror = () => reject(request.error ?? new Error("Release database open failed."));
      request.onsuccess = () => resolve(request.result);
    });
    try {
      if (!database.objectStoreNames.contains("cases") || !database.objectStoreNames.contains("revisions")) {
        throw new Error("Release database is missing cases or revisions.");
      }
      const transaction = database.transaction(["cases", "revisions"], "readonly");
      if (transaction.mode !== "readonly") throw new Error("Fingerprint transaction is not readonly.");
      const read = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error("Readonly fingerprint request failed."));
        request.onsuccess = () => resolve(request.result);
      });
      const completed = new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error ?? new Error("Readonly fingerprint transaction failed."));
        transaction.onabort = () => reject(transaction.error ?? new Error("Readonly fingerprint transaction aborted."));
      });
      const [caseRecord, revisionRecord] = await Promise.all([
        read(transaction.objectStore("cases").get(caseId)),
        read(transaction.objectStore("revisions").get(revisionId))
      ]);
      await completed;
      if (!caseRecord || !revisionRecord || typeof caseRecord !== "object" || typeof revisionRecord !== "object") {
        throw new Error("Case or revision record is absent.");
      }
      const caseValue = caseRecord as Record<string, unknown>;
      const revisionValue = revisionRecord as Record<string, unknown>;
      if (
        caseValue.id !== caseId
        || caseValue.latestRevisionId !== revisionId
        || revisionValue.id !== revisionId
        || revisionValue.caseId !== caseId
      ) {
        throw new Error("Case/revision relationship does not match the UI deep link.");
      }
      const [caseRecordSha256, revisionRecordSha256] = await Promise.all([
        digest(caseRecord),
        digest(revisionRecord)
      ]);
      return {
        databaseName,
        dbGeneration: "legacy-v13",
        targetSchema: 13,
        migrationId: null,
        caseId,
        revisionId,
        caseRecordSha256,
        revisionRecordSha256
      };
    } finally {
      database.close();
    }
  }, {
    databaseName: BRIDGE_RELEASE_DATABASE_DESCRIPTOR.databaseName,
    caseId: match[1],
    revisionId: match[2]
  });
  return Object.freeze({
    schemaVersion: 1,
    recordType: "deployed-pwa-case-revision-observation-v1",
    projectName,
    captureId,
    capturePhase,
    capturedAt: await waitForNextUtcMillisecond(previousTimestamp),
    projection
  });
}

function recordUnexpectedNetworkUrl(ledger: Set<string>, rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (!["http:", "https:", "ws:", "wss:"].includes(parsed.protocol)) return;
    const sameHttpsOrigin = parsed.protocol === "https:" && parsed.origin === candidate.origin;
    const sameSecureWebSocketOrigin = parsed.protocol === "wss:"
      && `https://${parsed.host}` === candidate.origin;
    if (!sameHttpsOrigin && !sameSecureWebSocketOrigin) ledger.add(rawUrl);
  } catch {
    ledger.add(rawUrl);
  }
}

function bindWebSocketLedger(page: Page, ledger: Set<string>) {
  page.on("websocket", (webSocket) => {
    recordUnexpectedNetworkUrl(ledger, webSocket.url());
  });
}

test("公网 HTTPS PWA 只采集未受信 v3 浏览器候选回执", async ({ baseURL }, testInfo) => {
  test.setTimeout(180_000);
  if (baseURL !== candidate.origin) {
    fail("DEPLOYED_PWA_CANDIDATE_ORIGIN_REBOUND", "Playwright baseURL does not equal the explicit candidate origin.");
  }
  const projectName = testInfo.project.name as BrowserProjectName;
  if (projectName !== "msedge" && projectName !== "chrome") {
    fail("DEPLOYED_PWA_CANDIDATE_PROJECT_INVALID", `Unexpected project ${testInfo.project.name}.`);
  }
  expect(testInfo.project.metadata.releaseIdentity).toEqual({
    dbGeneration: "legacy-v13",
    targetSchema: 13,
    migrationId: null
  });
  const artifact = await loadVerifiedDeployedPwaCandidateArtifact(candidate);
  const preparedOutput = await prepareCandidateProjectOutput({
    bindingRoot: candidate.bindingRoot,
    outputRoot: candidate.outputRoot,
    artifactRoot: candidate.artifactRoot,
    projectName
  });
  const userDataDir = await createReleasePersistentProfile();
  await assertFreshProfileDirectory(userDataDir);
  const profileBindingDigest = deployedPwaCandidateProfileBindingDigest({
    projectName,
    userDataDir
  });
  const startedAt = new Date().toISOString();
  const context = await launchReleasePersistentContext({ projectName, userDataDir });
  const profileMetadata = await lstat(userDataDir);
  if (!profileMetadata.isDirectory() || profileMetadata.isSymbolicLink()) {
    fail("DEPLOYED_PWA_CANDIDATE_PROFILE_CREATE_FAILED", "Browser did not create a real persistent profile directory.");
  }
  const unexpectedNetworkLedger = new Set<string>();
  context.on("request", (request) => {
    recordUnexpectedNetworkUrl(unexpectedNetworkLedger, request.url());
  });
  const ledgerBoundPages = new WeakSet<Page>();
  const bindPage = (page: Page) => {
    if (ledgerBoundPages.has(page)) return;
    ledgerBoundPages.add(page);
    bindWebSocketLedger(page, unexpectedNetworkLedger);
  };
  for (const page of context.pages()) bindPage(page);
  context.on("page", bindPage);
  let captured: Readonly<{
    actualProduct: string;
    initialControllerRuntime: ControllerRuntime;
    finalControllerRuntime: ControllerRuntime;
    initialControllerSourceBytes: Buffer;
    finalControllerSourceBytes: Buffer;
    initialRemoteServiceWorkerBytes: Buffer;
    finalRemoteServiceWorkerBytes: Buffer;
    initialInstallabilityResponse: unknown;
    finalInstallabilityResponse: unknown;
    initialAppManifestResponse: unknown;
    finalAppManifestResponse: unknown;
    initialRemoteManifestBytes: Buffer;
    finalRemoteManifestBytes: Buffer;
    routeObservations: RouteObservation[];
    caseRevisionPath: string;
    beforeCapture: Awaited<ReturnType<typeof captureCaseRevisionFingerprint>>;
    afterCapture: Awaited<ReturnType<typeof captureCaseRevisionFingerprint>>;
  }> | null = null;
  let contextOffline = false;
  try {
    const routeObservations: RouteObservation[] = [];
    const page = context.pages()[0] ?? await context.newPage();
    await page.setViewportSize(MOBILE_VIEWPORT);
    routeObservations.push(await observeNavigation({
      page,
      expectedUrl: `${candidate.origin}/`,
      routeId: "online-root",
      routePath: "/",
      navigationKind: "online",
      offline: false,
      expectedFromServiceWorker: false,
      previousObservedAt: null,
      navigate: () => page.goto(`${candidate.origin}/`, { waitUntil: "domcontentloaded" })
    }));
    await waitForAppReady(page);
    await waitForServiceWorker(page);
    const pageIdentity = await pageReleaseEvidence(page);
    if (
      pageIdentity.appBootReady !== "true"
      || pageIdentity.dbGeneration !== "legacy-v13"
      || pageIdentity.dbSchema !== "13"
      || pageIdentity.evidenceId !== artifact.releaseEvidenceId
      || pageIdentity.buildVersion !== artifact.buildVersion
      || JSON.stringify(pageIdentity.descriptor) !== JSON.stringify(artifact.descriptor)
    ) {
      fail("DEPLOYED_PWA_CANDIDATE_PAGE_IDENTITY_MISMATCH", "Deployed page identity does not match the verified locked artifact.");
    }
    const versionSession = await context.newCDPSession(page);
    await versionSession.send("Page.enable");
    const [browserVersion, initialInstallabilityResponse, initialAppManifestResponse] = await Promise.all([
      versionSession.send("Browser.getVersion"),
      versionSession.send("Page.getInstallabilityErrors"),
      versionSession.send("Page.getAppManifest")
    ]);
    await versionSession.detach();
    const actualProduct = requireReleaseBrowserRuntimeProduct(projectName, browserVersion.product);
    const initialControllerRuntime = await observeServiceWorkerRuntime(page);
    const initialControllerSourceBytes = await captureControllerSourceViaCdp(
      context,
      page,
      `${candidate.origin}/sw.js`
    );
    const initialRemoteServiceWorkerBytes = await fetchRemoteServiceWorkerBytes(
      context,
      `${candidate.origin}/sw.js`
    );
    const initialRemoteManifestBytes = await fetchRemotePwaManifestBytes(
      context,
      `${candidate.origin}/manifest.webmanifest`
    );

    await createDemoCase(page);
    const caseRevisionPath = new URL(page.url()).pathname;
    if (!/^\/cases\/[0-9a-f-]+\/revisions\/[0-9a-f-]+$/u.test(caseRevisionPath)) {
      fail("DEPLOYED_PWA_CANDIDATE_CASE_PATH_INVALID", "UI-created case did not open a case/revision deep link.");
    }
    const [caseId, revisionId] = [caseRevisionPath.split("/")[2], caseRevisionPath.split("/")[4]];
    if (!UUID_PATTERN.test(caseId) || !UUID_PATTERN.test(revisionId)) {
      fail("DEPLOYED_PWA_CANDIDATE_CASE_PATH_INVALID", "UI-created case/revision ids are not canonical UUIDs.");
    }
    const beforeCapture = await captureCaseRevisionFingerprint({
      page,
      projectName,
      caseRevisionPath,
      captureId: `${candidate.runId}-${projectName}-before`,
      capturePhase: "before_offline_cold_start",
      previousTimestamp: routeObservations.at(-1)?.observedAt ?? null
    });

    const cacheSession = await context.newCDPSession(page);
    await cacheSession.send("Network.enable");
    await cacheSession.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cacheSession.send("Network.clearBrowserCache");
    await cacheSession.detach();
    await context.setOffline(true);
    contextOffline = true;
    await page.close();

    const settingsPage = await context.newPage();
    routeObservations.push(await observeNavigation({
      page: settingsPage,
      expectedUrl: `${candidate.origin}/settings/data`,
      routeId: "offline-settings-data",
      routePath: "/settings/data",
      navigationKind: "cold-start",
      offline: true,
      expectedFromServiceWorker: true,
      previousObservedAt: routeObservations.at(-1)?.observedAt ?? null,
      navigate: () => settingsPage.goto(`${candidate.origin}/settings/data`, { waitUntil: "domcontentloaded" })
    }));
    await waitForAppReady(settingsPage);
    await waitForServiceWorker(settingsPage);
    await settingsPage.close();

    const casePage = await context.newPage();
    routeObservations.push(await observeNavigation({
      page: casePage,
      expectedUrl: `${candidate.origin}${caseRevisionPath}`,
      routeId: "offline-case-revision",
      routePath: caseRevisionPath,
      navigationKind: "cold-start",
      offline: true,
      expectedFromServiceWorker: true,
      previousObservedAt: routeObservations.at(-1)?.observedAt ?? null,
      navigate: () => casePage.goto(`${candidate.origin}${caseRevisionPath}`, { waitUntil: "domcontentloaded" })
    }));
    await waitForAppReady(casePage);
    await waitForServiceWorker(casePage);
    const afterCapture = await captureCaseRevisionFingerprint({
      page: casePage,
      projectName,
      caseRevisionPath,
      captureId: `${candidate.runId}-${projectName}-after`,
      capturePhase: "after_offline_cold_start",
      previousTimestamp: routeObservations.at(-1)?.observedAt ?? null
    });
    await casePage.close();

    const helpPage = await context.newPage();
    routeObservations.push(await observeNavigation({
      page: helpPage,
      expectedUrl: `${candidate.origin}/help`,
      routeId: "offline-help-cold-start",
      routePath: "/help",
      navigationKind: "cold-start",
      offline: true,
      expectedFromServiceWorker: true,
      previousObservedAt: routeObservations.at(-1)?.observedAt ?? null,
      navigate: () => helpPage.goto(`${candidate.origin}/help`, { waitUntil: "domcontentloaded" })
    }));
    await waitForAppReady(helpPage);
    await waitForServiceWorker(helpPage);
    routeObservations.push(await observeNavigation({
      page: helpPage,
      expectedUrl: `${candidate.origin}/help`,
      routeId: "offline-help-reload",
      routePath: "/help",
      navigationKind: "reload",
      offline: true,
      expectedFromServiceWorker: true,
      previousObservedAt: routeObservations.at(-1)?.observedAt ?? null,
      navigate: () => helpPage.reload({ waitUntil: "domcontentloaded" })
    }));
    await waitForAppReady(helpPage);
    await waitForServiceWorker(helpPage);
    const finalControllerRuntime = await observeServiceWorkerRuntime(helpPage);
    const finalControllerSourceBytes = await captureControllerSourceViaCdp(
      context,
      helpPage,
      `${candidate.origin}/sw.js`
    );
    await context.setOffline(false);
    contextOffline = false;
    const finalManifestSession = await context.newCDPSession(helpPage);
    await finalManifestSession.send("Page.enable");
    const [finalInstallabilityResponse, finalAppManifestResponse] = await Promise.all([
      finalManifestSession.send("Page.getInstallabilityErrors"),
      finalManifestSession.send("Page.getAppManifest")
    ]);
    await finalManifestSession.detach();
    const finalRemoteServiceWorkerBytes = await fetchRemoteServiceWorkerBytes(
      context,
      `${candidate.origin}/sw.js`
    );
    const finalRemoteManifestBytes = await fetchRemotePwaManifestBytes(
      context,
      `${candidate.origin}/manifest.webmanifest`
    );
    captured = Object.freeze({
      actualProduct,
      initialControllerRuntime,
      finalControllerRuntime,
      initialControllerSourceBytes,
      finalControllerSourceBytes,
      initialRemoteServiceWorkerBytes,
      finalRemoteServiceWorkerBytes,
      initialInstallabilityResponse,
      finalInstallabilityResponse,
      initialAppManifestResponse,
      finalAppManifestResponse,
      initialRemoteManifestBytes,
      finalRemoteManifestBytes,
      routeObservations,
      caseRevisionPath,
      beforeCapture,
      afterCapture
    });
  } finally {
    if (contextOffline && context.pages().length > 0) {
      await context.setOffline(false).catch(() => undefined);
    }
    await context.close();
  }
  if (captured === null) {
    fail("DEPLOYED_PWA_CANDIDATE_CAPTURE_INCOMPLETE", "Browser context closed without a complete candidate observation set.");
  }
  const frozenUnexpectedNetworkLedger = Object.freeze([...unexpectedNetworkLedger].sort());
  const unexpectedExternalRequestCount = frozenUnexpectedNetworkLedger.length;
  if (unexpectedExternalRequestCount !== 0) {
    fail(
      "DEPLOYED_PWA_CANDIDATE_EXTERNAL_REQUEST_OBSERVED",
      `Unexpected HTTP(S)/WS(S) requests were observed: ${frozenUnexpectedNetworkLedger.join(", ")}.`
    );
  }
  const stableArtifact = await revalidateDeployedPwaCandidateArtifactIdentity(candidate, artifact);
  const completedAt = await waitForNextUtcMillisecond(captured.routeObservations.at(-1)?.observedAt ?? null);
  await writeDeployedPwaBrowserCandidate({
    preparedOutput,
    runId: candidate.runId,
    targetOrigin: candidate.origin,
    initialArtifact: artifact,
    finalArtifact: stableArtifact,
    projectName,
    browserChannel: projectName,
    actualProduct: captured.actualProduct,
    profileBindingDigest,
    initialControllerRuntime: captured.initialControllerRuntime,
    finalControllerRuntime: captured.finalControllerRuntime,
    routeObservations: captured.routeObservations,
    caseRevisionPath: captured.caseRevisionPath,
    beforeCapture: captured.beforeCapture,
    afterCapture: captured.afterCapture,
    initialControllerSourceBytes: captured.initialControllerSourceBytes,
    finalControllerSourceBytes: captured.finalControllerSourceBytes,
    initialRemoteServiceWorkerBytes: captured.initialRemoteServiceWorkerBytes,
    finalRemoteServiceWorkerBytes: captured.finalRemoteServiceWorkerBytes,
    initialInstallabilityResponse: captured.initialInstallabilityResponse,
    finalInstallabilityResponse: captured.finalInstallabilityResponse,
    initialAppManifestResponse: captured.initialAppManifestResponse,
    finalAppManifestResponse: captured.finalAppManifestResponse,
    initialRemoteManifestBytes: captured.initialRemoteManifestBytes,
    finalRemoteManifestBytes: captured.finalRemoteManifestBytes,
    startedAt,
    completedAt,
    unexpectedExternalRequestCount
  });
});
