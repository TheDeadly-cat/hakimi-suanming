import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
  SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
  createSingleBindingIntegratedSessionBinding
} from "./single-binding-integrated-contract.js";
import {
  SYNTHETIC_REHEARSAL_FIXTURE_REF
} from "./single-binding-rehearsal-contract.js";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const SESSION_PLACEHOLDER = "__HAKIMI_SINGLE_BINDING_SESSION_BINDING_JSON__";
const RETURN_TOKEN_PLACEHOLDER = "__HAKIMI_SINGLE_BINDING_RETURN_TOKEN__";
const RETURN_PATH = "/__complete-return";
const RETURN_TOKEN_PATTERN = /^[a-f0-9]{64}$/u;
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
const COMMON_PAYLOAD_PATHS = Object.freeze([
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated.css",
  "single-binding-integrated.js",
  "single-binding-rehearsal-contract.js"
]);

const MIME = Object.freeze({
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8"
});

const HEADERS = Object.freeze({
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy": "default-src 'self'; connect-src 'none'; img-src 'none'; style-src 'self'; script-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});
const RETURN_CAPTURE_HEADERS = Object.freeze({
  ...HEADERS,
  "Content-Security-Policy": "default-src 'self'; connect-src 'self'; img-src 'none'; style-src 'self'; script-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
});

export const SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO = Object.freeze({
  reviewCycleId: `single-binding-synthetic-review-cycle.${"a".repeat(64)}`,
  pairRunId: `single-binding-synthetic-pair-run.${"b".repeat(64)}`,
  pairPrecommitRawSha256: "c".repeat(64),
  pairManifestRawSha256: "d".repeat(64),
  seatSessionNonce: Object.freeze({
    A: `single-binding-synthetic-seat-session.${"e".repeat(64)}`,
    B: `single-binding-synthetic-seat-session.${"f".repeat(64)}`
  }),
  seatPackageManifestRawSha256: Object.freeze({
    A: "1".repeat(64),
    B: "2".repeat(64)
  })
});

function entryForSeat(seatId) {
  if (!new Set(["A", "B"]).has(seatId)) throw new Error("--seat 必须精确为 A 或 B");
  return `single-binding-integrated-${seatId.toLowerCase()}.html`;
}

export function createSingleBindingIntegratedSourceTreeDemoSessionBinding(seatId) {
  entryForSeat(seatId);
  return createSingleBindingIntegratedSessionBinding({
    schemaVersion: "1.0.0",
    recordType: "bazi_expert_single_binding_nocode_synthetic_pilot_session_binding_v1",
    workflowVersion: SINGLE_BINDING_INTEGRATED_WORKFLOW_VERSION,
    bindingMode: "source_tree_synthetic_integration_test",
    reviewCycleId: SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.reviewCycleId,
    pairRunId: SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.pairRunId,
    seatId,
    seatSessionNonce: SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.seatSessionNonce[seatId],
    pairPrecommitRawSha256: SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.pairPrecommitRawSha256,
    pairManifestRawSha256: SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.pairManifestRawSha256,
    seatPackageManifestRawSha256:
      SINGLE_BINDING_INTEGRATED_SOURCE_TREE_DEMO.seatPackageManifestRawSha256[seatId],
    syntheticRehearsalManifestDigest:
      SYNTHETIC_REHEARSAL_FIXTURE_REF.syntheticRehearsalManifestDigest,
    fixtureContentDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.fixtureContentDigest,
    questionSetDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.questionSetDigest,
    candidateDigest: SYNTHETIC_REHEARSAL_FIXTURE_REF.candidateDigest,
    bindingId: SYNTHETIC_REHEARSAL_FIXTURE_REF.bindingId,
    bindingIdentityDigest: SINGLE_BINDING_INTEGRATED_BINDING_IDENTITY_DIGEST,
    selectedBindingCount: 1
  });
}

export function singleBindingIntegratedPayloadPaths(seatId) {
  return Object.freeze([...COMMON_PAYLOAD_PATHS, entryForSeat(seatId)].sort());
}

function reply(response, status, body = "", extraHeaders = {}, baseHeaders = HEADERS) {
  response.writeHead(status, { ...baseHeaders, ...extraHeaders });
  response.end(body);
}

function normalizeReturnCapture(input, sessionBinding) {
  if (input === undefined || input === null) {
    if (sessionBinding.bindingMode === "physical_synthetic_single_binding_pair") {
      throw new Error("physical integrated server requires return capture");
    }
    return null;
  }
  if (sessionBinding.bindingMode !== "physical_synthetic_single_binding_pair"
    || typeof input !== "object" || Array.isArray(input)
    || Object.getPrototypeOf(input) !== Object.prototype) {
    throw new Error("integrated return capture invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(input);
  const expected = ["acceptBytes", "maxBytes", "returnToken"];
  if (keys.some((key) => typeof key !== "string")
    || JSON.stringify([...keys].sort()) !== JSON.stringify(expected.sort())
    || keys.some((key) => !descriptors[key].enumerable || descriptors[key].get || descriptors[key].set)
    || typeof descriptors.returnToken.value !== "string"
    || !RETURN_TOKEN_PATTERN.test(descriptors.returnToken.value)
    || /^0{64}$/u.test(descriptors.returnToken.value)
    || !Number.isSafeInteger(descriptors.maxBytes.value)
    || descriptors.maxBytes.value <= 0 || descriptors.maxBytes.value > MAX_PAYLOAD_BYTES
    || typeof descriptors.acceptBytes.value !== "function") {
    throw new Error("integrated return capture invalid");
  }
  return Object.freeze({
    returnToken: descriptors.returnToken.value,
    maxBytes: descriptors.maxBytes.value,
    acceptBytes: descriptors.acceptBytes.value
  });
}

function readExactRequestBytes(request, expectedLength, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    if (!Number.isSafeInteger(expectedLength) || expectedLength <= 0 || expectedLength > maxBytes) {
      rejectBody(new Error("return body length invalid"));
      return;
    }
    const chunks = [];
    let observed = 0;
    let settled = false;
    const rejectOnce = () => {
      if (settled) return;
      settled = true;
      rejectBody(new Error("return body stream invalid"));
    };
    request.setTimeout(10_000, () => request.destroy());
    request.on("aborted", rejectOnce);
    request.on("error", rejectOnce);
    request.on("data", (chunk) => {
      if (settled || !(chunk instanceof Buffer)) return rejectOnce();
      observed += chunk.byteLength;
      if (observed > expectedLength || observed > maxBytes) {
        request.destroy();
        rejectOnce();
        return;
      }
      chunks.push(Buffer.from(chunk));
    });
    request.on("end", () => {
      if (settled) return;
      if (observed !== expectedLength || Object.keys(request.trailers).length !== 0) {
        rejectOnce();
        return;
      }
      settled = true;
      resolveBody(Buffer.concat(chunks, observed));
    });
  });
}

function completeReturnReceiptBody(accepted, duplicate) {
  return Buffer.from(`${JSON.stringify({
    accepted: true,
    duplicate,
    rawSha256: accepted.rawSha256,
    byteLength: accepted.bytes.byteLength
  })}\n`, "utf8");
}

function requestPath(rawUrl) {
  if (typeof rawUrl !== "string" || !rawUrl.startsWith("/")) return null;
  const rawPath = rawUrl.split("?", 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    return null;
  }
  if (decoded.includes("\0") || decoded.includes("\\") || decoded.includes("//")) return null;
  const segments = decoded.split("/").slice(1);
  if (segments.some((segment) => segment === "." || segment === ".." || segment.startsWith("."))) return null;
  return decoded;
}

function actualAuthority(server) {
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") return null;
  return `127.0.0.1:${address.port}`;
}

function encodeHtmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function injectSessionBinding(htmlBytes, sessionBinding, returnCapture) {
  let html;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(htmlBytes);
  } catch {
    throw new Error("integrated HTML 必须是严格 UTF-8");
  }
  if (html.charCodeAt(0) === 0xfeff) throw new Error("integrated HTML 不接受 BOM");
  const first = html.indexOf(SESSION_PLACEHOLDER);
  if (first < 0 || html.indexOf(SESSION_PLACEHOLDER, first + SESSION_PLACEHOLDER.length) >= 0) {
    throw new Error("integrated HTML 必须精确包含一个 session placeholder");
  }
  const sessionJson = JSON.stringify(sessionBinding);
  let injected = html.slice(0, first)
    + encodeHtmlAttribute(sessionJson)
    + html.slice(first + SESSION_PLACEHOLDER.length);
  if (returnCapture !== null) {
    const tokenIndex = injected.indexOf(RETURN_TOKEN_PLACEHOLDER);
    if (tokenIndex < 0
      || injected.indexOf(RETURN_TOKEN_PLACEHOLDER, tokenIndex + RETURN_TOKEN_PLACEHOLDER.length) >= 0) {
      throw new Error("integrated HTML 必须精确包含一个 return token placeholder");
    }
    injected = injected.slice(0, tokenIndex)
      + returnCapture.returnToken
      + injected.slice(tokenIndex + RETURN_TOKEN_PLACEHOLDER.length);
  }
  return Buffer.from(injected, "utf8");
}

function immutablePayloadMap(seatId, payloads, sessionBindingInput, returnCaptureInput) {
  if (!(payloads instanceof Map)) throw new Error("integrated payloads must be a Map");
  const sessionBinding = createSingleBindingIntegratedSessionBinding(sessionBindingInput);
  if (sessionBinding.seatId !== seatId) throw new Error("integrated session seat mismatch");
  const returnCapture = normalizeReturnCapture(returnCaptureInput, sessionBinding);
  const expected = singleBindingIntegratedPayloadPaths(seatId);
  const actual = [...payloads.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("integrated payload set invalid");
  const entry = entryForSeat(seatId);
  const captured = new Map();
  for (const path of expected) {
    const value = payloads.get(path);
    if (!(value instanceof Uint8Array) || value.byteLength <= 0 || value.byteLength > MAX_PAYLOAD_BYTES) {
      throw new Error("integrated payload invalid");
    }
    const stable = Buffer.from(value);
    captured.set(path, path === entry ? injectSessionBinding(stable, sessionBinding, returnCapture) : stable);
  }
  return Object.freeze({ captured, returnCapture });
}

export function createSingleBindingIntegratedServer({
  seatId,
  payloads,
  sessionBinding,
  returnCapture: returnCaptureInput
} = {}) {
  const entry = entryForSeat(seatId);
  const { captured, returnCapture } = immutablePayloadMap(
    seatId,
    payloads,
    sessionBinding,
    returnCaptureInput
  );
  const baseHeaders = returnCapture === null ? HEADERS : RETURN_CAPTURE_HEADERS;
  const routes = new Map([
    ["/", entry],
    [`/${entry}`, entry],
    ...COMMON_PAYLOAD_PATHS.map((path) => [`/${path}`, path])
  ]);
  let returnInFlight = false;
  let returnAccepted = null;
  let server;
  server = createServer((request, response) => {
    const expectedHost = actualAuthority(server);
    if (expectedHost === null || request.headers.host !== expectedHost) {
      if (!new Set(["GET", "HEAD"]).has(request.method ?? "")) request.resume();
      return reply(response, 421, "Misdirected request", {}, baseHeaders);
    }
    if (request.method === "POST" && request.url === RETURN_PATH && returnCapture !== null) {
      const expectedOrigin = `http://${expectedHost}`;
      const contentLength = request.headers["content-length"];
      if (request.headers.origin !== expectedOrigin
        || request.headers["x-hakimi-return-token"] !== returnCapture.returnToken
        || request.headers["content-type"] !== "application/json;charset=utf-8"
        || request.headers["transfer-encoding"] !== undefined
        || request.headers["content-encoding"] !== undefined
        || typeof contentLength !== "string" || !/^[1-9][0-9]*$/u.test(contentLength)) {
        request.resume();
        return reply(response, 400, "Bad request", {}, baseHeaders);
      }
      const expectedLength = Number(contentLength);
      if (!Number.isSafeInteger(expectedLength) || expectedLength <= 0
        || expectedLength > returnCapture.maxBytes) {
        request.resume();
        return reply(response, 413, "Payload too large", {}, baseHeaders);
      }
      if (returnInFlight) {
        request.once("end", () => reply(response, 409, "Conflict", {}, baseHeaders));
        request.resume();
        return;
      }
      returnInFlight = true;
      void (async () => {
        try {
          const bytes = await readExactRequestBytes(request, expectedLength, returnCapture.maxBytes);
          if (returnAccepted !== null) {
            if (bytes.byteLength !== returnAccepted.bytes.byteLength
              || !returnAccepted.bytes.equals(bytes)) {
              reply(response, 409, "Conflict", {}, baseHeaders);
              return;
            }
            const duplicateBody = completeReturnReceiptBody(returnAccepted, true);
            reply(response, 200, duplicateBody, {
              "Content-Type": "application/json;charset=utf-8",
              "Content-Length": String(duplicateBody.byteLength)
            }, baseHeaders);
            return;
          }
          await Reflect.apply(returnCapture.acceptBytes, undefined, [bytes]);
          returnAccepted = {
            bytes: Buffer.from(bytes),
            rawSha256: createHash("sha256").update(bytes).digest("hex")
          };
          const acceptedBody = completeReturnReceiptBody(returnAccepted, false);
          reply(response, 200, acceptedBody, {
            "Content-Type": "application/json;charset=utf-8",
            "Content-Length": String(acceptedBody.byteLength)
          }, baseHeaders);
        } catch {
          if (!response.headersSent && !response.destroyed) {
            reply(response, 400, "Bad request", {}, baseHeaders);
          }
        } finally {
          returnInFlight = false;
        }
      })();
      return;
    }
    if (!new Set(["GET", "HEAD"]).has(request.method ?? "")) {
      request.resume();
      return reply(response, 405, "Method not allowed", { Allow: "GET, HEAD" }, baseHeaders);
    }
    const pathname = requestPath(request.url);
    const relativePath = pathname === null ? null : routes.get(pathname);
    if (!relativePath || !captured.has(relativePath)) return reply(response, 404, "Not found", {}, baseHeaders);
    const body = captured.get(relativePath);
    const contentType = MIME[extname(relativePath).toLowerCase()];
    if (!body || !contentType) return reply(response, 404, "Not found", {}, baseHeaders);
    const headers = { "Content-Type": contentType, "Content-Length": String(body.byteLength) };
    if (request.method === "HEAD") return reply(response, 200, "", headers, baseHeaders);
    return reply(response, 200, body, headers, baseHeaders);
  });
  server.once("close", () => {
    if (returnAccepted?.bytes) returnAccepted.bytes.fill(0);
    returnAccepted = null;
  });
  return server;
}

async function stableSourcePayload(relativePath) {
  const target = resolve(SOURCE_ROOT, ...relativePath.split("/"));
  const lexicalRelation = relative(SOURCE_ROOT, target);
  if (!lexicalRelation || lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) {
    throw new Error("integrated source path invalid");
  }
  const before = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || canonical.toLowerCase() !== target.toLowerCase() || before.size <= 0n
    || before.size > BigInt(MAX_PAYLOAD_BYTES)) {
    throw new Error("integrated source endpoint invalid");
  }
  const body = await readFile(canonical);
  const after = await lstat(target, { bigint: true });
  const canonicalAfter = await realpath(target);
  const identity = (value) => [
    value.dev, value.ino, value.nlink, value.size, value.mtimeNs, value.ctimeNs
  ].map(String).join(":");
  if (body.byteLength !== Number(before.size) || identity(before) !== identity(after)
    || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
    throw new Error("integrated source endpoint changed");
  }
  return body;
}

export async function loadSingleBindingIntegratedPayloadsFromSourceCandidate(seatId) {
  const payloads = new Map();
  for (const path of singleBindingIntegratedPayloadPaths(seatId)) {
    payloads.set(path, await stableSourcePayload(path));
  }
  return payloads;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export async function runSingleBindingIntegratedServerCli(args = process.argv.slice(2)) {
  const seatId = option(args, "--seat", null);
  const port = Number(option(args, "--port", "0"));
  entryForSeat(seatId);
  if (!Number.isInteger(port) || !(port === 0 || (port >= 1024 && port <= 65535))) {
    throw new Error("--port 必须是 0 或 1024–65535 的整数");
  }
  if (!args.includes("--source-tree-demo")) {
    throw new Error("当前 CLI 只接受明确的 --source-tree-demo；physical session 必须由包外启动器注入");
  }
  const sessionBinding = createSingleBindingIntegratedSourceTreeDemoSessionBinding(seatId);
  const server = createSingleBindingIntegratedServer({
    seatId,
    sessionBinding,
    payloads: await loadSingleBindingIntegratedPayloadsFromSourceCandidate(seatId)
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
      server.close();
      throw new Error("SINGLE_BINDING_INTEGRATED_LOOPBACK_BIND_FAILED");
    }
    process.stdout.write(
      `Bazi integrated synthetic single-binding seat ${seatId} listening at http://127.0.0.1:${address.port}/\n`
    );
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runSingleBindingIntegratedServerCli();
