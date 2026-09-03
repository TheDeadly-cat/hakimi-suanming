import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createSingleBindingIntegratedSessionBinding } from "./single-binding-integrated-contract.js";
import { createSingleBindingIntegratedSourceTreeDemoSessionBinding } from "./single-binding-integrated-server.mjs";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const ENTRY = "single-binding-integrated-pair.html";
const MAX_PAYLOAD_BYTES = 4 * 1024 * 1024;
const PLACEHOLDERS = Object.freeze({
  A: "__HAKIMI_SINGLE_BINDING_SEAT_A_SESSION_BINDING_JSON__",
  B: "__HAKIMI_SINGLE_BINDING_SEAT_B_SESSION_BINDING_JSON__"
});
const PAYLOAD_PATHS = Object.freeze([
  ENTRY,
  "single-binding-integrated-contract.js",
  "single-binding-integrated-handoff.js",
  "single-binding-integrated-json.js",
  "single-binding-integrated-pair.css",
  "single-binding-integrated-pair.js",
  "single-binding-rehearsal-contract.js"
].sort());

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

function callGetPrototypeOf(value) {
  return Object.getPrototypeOf(value);
}

function exactSessionPair(seatASessionInput, seatBSessionInput) {
  const seatASession = createSingleBindingIntegratedSessionBinding(seatASessionInput);
  const seatBSession = createSingleBindingIntegratedSessionBinding(seatBSessionInput);
  if (seatASession.seatId !== "A" || seatBSession.seatId !== "B") {
    throw new Error("integrated pair session 必须精确为 A/B 两席");
  }
  for (const key of [
    "workflowVersion", "bindingMode", "reviewCycleId", "pairRunId",
    "pairPrecommitRawSha256", "pairManifestRawSha256",
    "syntheticRehearsalManifestDigest", "fixtureContentDigest", "questionSetDigest",
    "candidateDigest", "bindingId", "bindingIdentityDigest", "selectedBindingCount"
  ]) {
    if (seatASession[key] !== seatBSession[key]) throw new Error(`integrated pair session ${key} mismatch`);
  }
  if (seatASession.seatSessionNonce === seatBSession.seatSessionNonce
    || seatASession.seatPackageManifestRawSha256 === seatBSession.seatPackageManifestRawSha256) {
    throw new Error("integrated pair session seat nonce/package pin must remain distinct");
  }
  return { seatASession, seatBSession };
}

function reply(response, status, body = "", extraHeaders = {}) {
  response.writeHead(status, { ...HEADERS, ...extraHeaders });
  response.end(body);
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

function injectPairSessions(htmlBytes, sessions) {
  let html;
  try {
    html = new TextDecoder("utf-8", { fatal: true }).decode(htmlBytes);
  } catch {
    throw new Error("integrated pair HTML 必须是严格 UTF-8");
  }
  if (html.charCodeAt(0) === 0xfeff) throw new Error("integrated pair HTML 不接受 BOM");
  for (const seatId of ["A", "B"]) {
    const placeholder = PLACEHOLDERS[seatId];
    const first = html.indexOf(placeholder);
    if (first < 0 || html.indexOf(placeholder, first + placeholder.length) >= 0) {
      throw new Error(`integrated pair HTML 必须精确包含一个 ${seatId} session placeholder`);
    }
    const session = seatId === "A" ? sessions.seatASession : sessions.seatBSession;
    html = html.slice(0, first)
      + encodeHtmlAttribute(JSON.stringify(session))
      + html.slice(first + placeholder.length);
  }
  return Buffer.from(html, "utf8");
}

function immutablePayloadMap(payloads, seatASessionInput, seatBSessionInput) {
  if (!(payloads instanceof Map) || callGetPrototypeOf(payloads) !== Map.prototype) {
    throw new Error("integrated pair payloads must be an exact Map");
  }
  const actual = [...payloads.keys()].sort();
  if (JSON.stringify(actual) !== JSON.stringify(PAYLOAD_PATHS)) {
    throw new Error("integrated pair payload set invalid");
  }
  const sessions = exactSessionPair(seatASessionInput, seatBSessionInput);
  const captured = new Map();
  for (const path of PAYLOAD_PATHS) {
    const value = payloads.get(path);
    if (!(value instanceof Uint8Array) || value.byteLength <= 0 || value.byteLength > MAX_PAYLOAD_BYTES) {
      throw new Error("integrated pair payload invalid");
    }
    const stable = Buffer.from(value);
    captured.set(path, path === ENTRY ? injectPairSessions(stable, sessions) : stable);
  }
  return captured;
}

export function createSingleBindingIntegratedPairServer({
  payloads,
  seatASessionBinding,
  seatBSessionBinding
} = {}) {
  const captured = immutablePayloadMap(payloads, seatASessionBinding, seatBSessionBinding);
  const routes = new Map([
    ["/", ENTRY],
    [`/${ENTRY}`, ENTRY],
    ...PAYLOAD_PATHS.filter((path) => path !== ENTRY).map((path) => [`/${path}`, path])
  ]);
  let server;
  server = createServer((request, response) => {
    const expectedHost = actualAuthority(server);
    if (expectedHost === null || request.headers.host !== expectedHost) {
      return reply(response, 421, "Misdirected request");
    }
    if (!new Set(["GET", "HEAD"]).has(request.method ?? "")) {
      return reply(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    }
    const pathname = requestPath(request.url);
    const relativePath = pathname === null ? null : routes.get(pathname);
    if (!relativePath || !captured.has(relativePath)) return reply(response, 404, "Not found");
    const body = captured.get(relativePath);
    const contentType = MIME[extname(relativePath).toLowerCase()];
    if (!body || !contentType) return reply(response, 404, "Not found");
    const headers = { "Content-Type": contentType, "Content-Length": String(body.byteLength) };
    if (request.method === "HEAD") return reply(response, 200, "", headers);
    return reply(response, 200, body, headers);
  });
  return server;
}

async function stableSourcePayload(relativePath) {
  const target = resolve(SOURCE_ROOT, ...relativePath.split("/"));
  const lexicalRelation = relative(SOURCE_ROOT, target);
  if (!lexicalRelation || lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) {
    throw new Error("integrated pair source path invalid");
  }
  const before = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || canonical.toLowerCase() !== target.toLowerCase() || before.size <= 0n
    || before.size > BigInt(MAX_PAYLOAD_BYTES)) {
    throw new Error("integrated pair source endpoint invalid");
  }
  const body = await readFile(canonical);
  const after = await lstat(target, { bigint: true });
  const canonicalAfter = await realpath(target);
  const identity = (value) => [
    value.dev, value.ino, value.nlink, value.size, value.mtimeNs, value.ctimeNs
  ].map(String).join(":");
  if (body.byteLength !== Number(before.size) || identity(before) !== identity(after)
    || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
    throw new Error("integrated pair source endpoint changed");
  }
  return body;
}

export async function loadSingleBindingIntegratedPairPayloadsFromSourceCandidate() {
  const payloads = new Map();
  for (const path of PAYLOAD_PATHS) payloads.set(path, await stableSourcePayload(path));
  return payloads;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export async function runSingleBindingIntegratedPairServerCli(args = process.argv.slice(2)) {
  const port = Number(option(args, "--port", "0"));
  if (!Number.isInteger(port) || !(port === 0 || (port >= 1024 && port <= 65535))) {
    throw new Error("--port 必须是 0 或 1024–65535 的整数");
  }
  if (!args.includes("--source-tree-demo")) {
    throw new Error("当前 CLI 只接受明确的 --source-tree-demo；physical pair 必须由包外启动器注入");
  }
  const server = createSingleBindingIntegratedPairServer({
    payloads: await loadSingleBindingIntegratedPairPayloadsFromSourceCandidate(),
    seatASessionBinding: createSingleBindingIntegratedSourceTreeDemoSessionBinding("A"),
    seatBSessionBinding: createSingleBindingIntegratedSourceTreeDemoSessionBinding("B")
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
      server.close();
      throw new Error("SINGLE_BINDING_INTEGRATED_PAIR_LOOPBACK_BIND_FAILED");
    }
    process.stdout.write(
      `Bazi integrated synthetic single-binding pair listening at http://127.0.0.1:${address.port}/\n`
    );
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runSingleBindingIntegratedPairServerCli();
