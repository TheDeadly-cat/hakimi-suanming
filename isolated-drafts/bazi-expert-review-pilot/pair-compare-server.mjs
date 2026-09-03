import { createServer } from "node:http";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const ALLOWED = new Map([
  ["/", "pair-compare.html"],
  ["/pair-compare.html", "pair-compare.html"],
  ["/pair-compare.css", "pair-compare.css"],
  ["/pair-compare.js", "pair-compare.js"],
  ["/pair-comparison.js", "pair-comparison.js"],
  ["/contract.js", "contract.js"],
  ["/data/questions.js", "data/questions.js"],
  ["/data/scenarios.js", "data/scenarios.js"]
]);

const MIME = Object.freeze({
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8"
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

function authority(server) {
  const address = server.address();
  if (!address || typeof address === "string" || address.address !== "127.0.0.1") return null;
  return `127.0.0.1:${address.port}`;
}

async function readAllowed(relativePath) {
  const lexicalTarget = resolve(SOURCE_ROOT, relativePath);
  const lexicalRelation = relative(SOURCE_ROOT, lexicalTarget);
  if (!lexicalRelation || lexicalRelation.startsWith("..") || lexicalRelation.includes(":")) {
    throw new Error("target outside source root");
  }
  const before = await lstat(lexicalTarget);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error("target is not a regular file");
  const canonicalTarget = await realpath(lexicalTarget);
  const canonicalRelation = relative(SOURCE_ROOT, canonicalTarget);
  if (!canonicalRelation || canonicalRelation.startsWith("..") || canonicalRelation.includes(":")) {
    throw new Error("real target outside source root");
  }
  const stable = await stat(canonicalTarget);
  if (!stable.isFile() || stable.size !== before.size) throw new Error("target identity changed");
  return { body: await readFile(canonicalTarget), size: stable.size };
}

export function createPairComparisonServer() {
  let server;
  server = createServer(async (request, response) => {
    const expectedHost = authority(server);
    if (expectedHost === null || request.headers.host !== expectedHost) {
      return reply(response, 421, "Misdirected request");
    }
    if (!new Set(["GET", "HEAD"]).has(request.method ?? "")) {
      return reply(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    }
    const pathname = requestPath(request.url);
    const relativePath = pathname === null ? null : ALLOWED.get(pathname);
    if (!relativePath) return reply(response, 404, "Not found");
    const contentType = MIME[extname(relativePath).toLowerCase()];
    if (!contentType) return reply(response, 415, "Unsupported file type");
    try {
      const file = await readAllowed(relativePath);
      const headers = { "Content-Type": contentType, "Content-Length": String(file.size) };
      if (request.method === "HEAD") return reply(response, 200, "", headers);
      return reply(response, 200, file.body, headers);
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

export async function runPairComparisonServerCli(args = process.argv.slice(2)) {
  const port = Number(option(args, "--port", "0"));
  if (!Number.isInteger(port) || !(port === 0 || (port >= 1024 && port <= 65535))) {
    throw new Error("--port 必须是 0 或 1024–65535 的整数");
  }
  const server = createPairComparisonServer();
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string" || address.address !== "127.0.0.1") {
      server.close();
      throw new Error("PAIR_COMPARISON_LOOPBACK_BIND_FAILED");
    }
    process.stdout.write(`Bazi synthetic pilot pair comparison listening at http://127.0.0.1:${address.port}/\n`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
  return server;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runPairComparisonServerCli();
