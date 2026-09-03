import { createServer } from "node:http";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const ENTRY_PATTERN = /^seat-[ab]\.html$/u;

const COMMON_FILE_ALLOWLIST = Object.freeze([
  "app.js",
  "contract.js",
  "styles.css",
  "data/questions.js",
  "data/scenarios.js"
]);

const mimeTypes = Object.freeze({
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8"
});

const responseHeaders = Object.freeze({
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
  response.writeHead(status, { ...responseHeaders, ...extraHeaders });
  response.end(body);
}

function validateEntry(entry) {
  if (typeof entry !== "string" || !ENTRY_PATTERN.test(entry)) {
    throw new Error("--entry 必须是精确 seat 入口文件名");
  }
  return entry;
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

function allowedPathMap(entry) {
  return new Map([
    ["/", entry],
    [`/${entry}`, entry],
    ...COMMON_FILE_ALLOWLIST.map((path) => [`/${path}`, path])
  ]);
}

function actualLoopbackAuthority(server) {
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") return null;
  return `127.0.0.1:${address.port}`;
}

async function readAllowedFile(sourceRoot, relativePath) {
  const lexicalTarget = resolve(sourceRoot, relativePath);
  const lexicalRelation = relative(sourceRoot, lexicalTarget);
  if (!lexicalRelation || lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) {
    throw new Error("file outside source root");
  }
  const metadata = await lstat(lexicalTarget);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("allowed target must be a regular file");
  const [canonicalRoot, canonicalTarget] = await Promise.all([realpath(sourceRoot), realpath(lexicalTarget)]);
  const canonicalRelation = relative(canonicalRoot, canonicalTarget);
  if (!canonicalRelation || canonicalRelation.startsWith("..") || canonicalRelation.includes(":")) {
    throw new Error("real target outside source root");
  }
  const stableMetadata = await stat(canonicalTarget);
  if (!stableMetadata.isFile() || stableMetadata.size !== metadata.size) throw new Error("allowed target identity changed");
  const body = await readFile(canonicalTarget);
  return { body, size: stableMetadata.size };
}

export function createPilotServer({ entry, sourceRoot = SOURCE_ROOT } = {}) {
  const selectedEntry = validateEntry(entry);
  const allowlist = allowedPathMap(selectedEntry);
  let server;
  server = createServer(async (request, response) => {
    const expectedHost = actualLoopbackAuthority(server);
    if (expectedHost === null || request.headers.host !== expectedHost) {
      return reply(response, 421, "Misdirected request");
    }
    if (!request.url) return reply(response, 400, "Bad request");
    if (!new Set(["GET", "HEAD"]).has(request.method ?? "")) {
      return reply(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    }
    const pathname = requestPath(request.url);
    const relativePath = pathname === null ? null : allowlist.get(pathname);
    if (!relativePath) return reply(response, 404, "Not found");
    const contentType = mimeTypes[extname(relativePath).toLowerCase()];
    if (!contentType) return reply(response, 415, "Unsupported file type");
    try {
      const file = await readAllowedFile(sourceRoot, relativePath);
      const fileHeaders = { "Content-Type": contentType, "Content-Length": String(file.size) };
      if (request.method === "HEAD") return reply(response, 200, "", fileHeaders);
      return reply(response, 200, file.body, fileHeaders);
    } catch {
      return reply(response, 404, "Not found");
    }
  });
  return server;
}

function option(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export async function runPilotServerCli(args = process.argv.slice(2)) {
  const entry = option(args, "--entry", null);
  const port = Number(option(args, "--port", "4178"));
  validateEntry(entry);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("--port 必须是 1024–65535 的整数");
  const server = createPilotServer({ entry });
  server.listen(port, "127.0.0.1", () => {
    process.stdout.write(`Bazi expert review pilot (${entry}) listening at http://127.0.0.1:${port}/\n`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runPilotServerCli();
