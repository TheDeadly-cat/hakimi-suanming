import { createServer } from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));

export const SYNTHETIC_PAIR_PAYLOAD_PATHS = Object.freeze([
  "contract.js",
  "data/questions.js",
  "data/scenarios.js",
  "pair-comparison.js",
  "pair-compare-synthetic.css",
  "pair-compare-synthetic.html",
  "pair-compare-synthetic-icon.svg",
  "pair-compare-synthetic.js"
]);

const ROUTES = Object.freeze(new Map([
  ["/", "pair-compare-synthetic.html"],
  ["/pair-compare-synthetic.html", "pair-compare-synthetic.html"],
  ["/pair-compare-synthetic.css", "pair-compare-synthetic.css"],
  ["/pair-compare-synthetic-icon.svg", "pair-compare-synthetic-icon.svg"],
  ["/pair-compare-synthetic.js", "pair-compare-synthetic.js"],
  ["/pair-comparison.js", "pair-comparison.js"],
  ["/contract.js", "contract.js"],
  ["/data/questions.js", "data/questions.js"],
  ["/data/scenarios.js", "data/scenarios.js"]
]));

const MIME = Object.freeze({
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".svg": "image/svg+xml;charset=utf-8"
});

const HEADERS = Object.freeze({
  "Cache-Control": "no-store, max-age=0",
  "Content-Security-Policy": "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

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

function immutablePayloadMap(payloads) {
  if (!(payloads instanceof Map)) throw new Error("synthetic payloads must be a Map");
  const paths = [...payloads.keys()].sort();
  if (JSON.stringify(paths) !== JSON.stringify([...SYNTHETIC_PAIR_PAYLOAD_PATHS].sort())) {
    throw new Error("synthetic payload set invalid");
  }
  const captured = new Map();
  for (const path of SYNTHETIC_PAIR_PAYLOAD_PATHS) {
    const value = payloads.get(path);
    if (!(value instanceof Uint8Array) || value.byteLength <= 0 || value.byteLength > 8 * 1024 * 1024) {
      throw new Error("synthetic payload invalid");
    }
    captured.set(path, Buffer.from(value));
  }
  return captured;
}

export function createSyntheticPairComparisonServer({ payloads } = {}) {
  const captured = immutablePayloadMap(payloads);
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
    const relativePath = pathname === null ? null : ROUTES.get(pathname);
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
    throw new Error("synthetic source path invalid");
  }
  const before = await lstat(target, { bigint: true });
  const canonical = await realpath(target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || canonical.toLowerCase() !== target.toLowerCase() || before.size <= 0n || before.size > 8n * 1024n * 1024n) {
    throw new Error("synthetic source endpoint invalid");
  }
  const body = await readFile(canonical);
  const after = await lstat(target, { bigint: true });
  const canonicalAfter = await realpath(target);
  const identity = (value) => [value.dev, value.ino, value.nlink, value.size, value.mtimeNs, value.ctimeNs].map(String).join(":");
  if (body.byteLength !== Number(before.size) || identity(before) !== identity(after)
    || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) {
    throw new Error("synthetic source endpoint changed");
  }
  return body;
}

export async function loadSyntheticPairPayloadsFromSourceCandidate() {
  const payloads = new Map();
  for (const path of SYNTHETIC_PAIR_PAYLOAD_PATHS) payloads.set(path, await stableSourcePayload(path));
  return payloads;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export async function runSyntheticPairComparisonServerCli(args = process.argv.slice(2)) {
  const port = Number(option(args, "--port", "0"));
  if (!Number.isInteger(port) || !(port === 0 || (port >= 1024 && port <= 65535))) {
    throw new Error("--port 必须是 0 或 1024–65535 的整数");
  }
  const server = createSyntheticPairComparisonServer({ payloads: await loadSyntheticPairPayloadsFromSourceCandidate() });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
      server.close();
      throw new Error("SYNTHETIC_PAIR_LOOPBACK_BIND_FAILED");
    }
    process.stdout.write(`Bazi synthetic pair self-check listening at http://127.0.0.1:${address.port}/\n`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => process.exit(0)));
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runSyntheticPairComparisonServerCli();
