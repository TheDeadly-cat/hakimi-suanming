import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const LOOPBACK_HOST = "127.0.0.1";

const staticFiles = new Map([
  ["/index.html", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/role-manifest.js", { file: "role-manifest.js", type: "text/javascript; charset=utf-8" }]
]);

const viewRoutes = new Set(["/", "/source-collation", "/rights", "/domain-a", "/domain-b"]);

const securityHeaders = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; connect-src 'none'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY"
});

function reply(response, status, body, headers = {}, method = "GET") {
  const bytes = Buffer.from(body);
  response.writeHead(status, {
    ...securityHeaders,
    ...headers,
    "Content-Length": bytes.byteLength
  });
  response.end(method === "HEAD" ? undefined : bytes);
}

export function createPreviewServer() {
  return createServer(async (request, response) => {
    const method = request.method ?? "GET";
    if (method !== "GET" && method !== "HEAD") {
      reply(response, 405, "Method Not Allowed\n", {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8"
      }, method);
      return;
    }

    let pathname;
    try {
      pathname = new URL(request.url ?? "/", `http://${LOOPBACK_HOST}`).pathname;
    } catch {
      reply(response, 400, "Bad Request\n", { "Content-Type": "text/plain; charset=utf-8" }, method);
      return;
    }

    if (pathname === "/health") {
      reply(response, 200, JSON.stringify({
        ok: true,
        mode: "read-only",
        lifecycle: "synthetic",
        authorization: false
      }), { "Content-Type": "application/json; charset=utf-8" }, method);
      return;
    }

    const asset = viewRoutes.has(pathname)
      ? staticFiles.get("/index.html")
      : staticFiles.get(pathname);

    if (!asset) {
      reply(response, 404, "Not Found\n", { "Content-Type": "text/plain; charset=utf-8" }, method);
      return;
    }

    try {
      const body = await readFile(join(ROOT, asset.file));
      reply(response, 200, body, { "Content-Type": asset.type }, method);
    } catch {
      reply(response, 500, "Static asset unavailable\n", { "Content-Type": "text/plain; charset=utf-8" }, method);
    }
  });
}

export async function startPreviewServer({ port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError("port must be an integer from 0 through 65535");
  }

  const server = createPreviewServer();
  await new Promise((resolveListening, rejectListening) => {
    server.once("error", rejectListening);
    server.listen(port, LOOPBACK_HOST, () => {
      server.off("error", rejectListening);
      resolveListening();
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    await new Promise((resolveClose) => server.close(resolveClose));
    throw new Error("loopback server address unavailable");
  }

  return {
    server,
    host: LOOPBACK_HOST,
    port: address.port,
    origin: `http://${LOOPBACK_HOST}:${address.port}`
  };
}

function parsePort(argv) {
  if (argv.length === 0) return 0;
  if (argv.length !== 2 || argv[0] !== "--port" || !/^\d+$/.test(argv[1])) {
    throw new Error("usage: node server.mjs [--port 0-65535]");
  }
  return Number(argv[1]);
}

const isMain = process.argv[1]
  ? resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  try {
    const started = await startPreviewServer({ port: parsePort(process.argv.slice(2)) });
    console.log(`DTT three-role read-only preview: ${started.origin}/source-collation`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "unable to start preview");
    process.exitCode = 1;
  }
}
