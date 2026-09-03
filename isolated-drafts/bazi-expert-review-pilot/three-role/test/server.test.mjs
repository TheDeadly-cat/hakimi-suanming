import assert from "node:assert/strict";
import test from "node:test";

import { startPreviewServer } from "../server.mjs";

async function stop(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("read-only loopback server serves only fixed preview routes and assets", async (t) => {
  const started = await startPreviewServer();
  t.after(() => stop(started.server));

  assert.equal(started.host, "127.0.0.1");
  assert.match(started.origin, /^http:\/\/127\.0\.0\.1:\d+$/);

  for (const route of ["/", "/source-collation", "/rights", "/domain-a", "/domain-b"]) {
    const response = await fetch(`${started.origin}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("content-security-policy") ?? "", /connect-src 'none'/);
    assert.match(await response.text(), /id="view-content"/);
  }

  for (const asset of ["/styles.css", "/app.js", "/role-manifest.js"]) {
    const response = await fetch(`${started.origin}${asset}`);
    assert.equal(response.status, 200, asset);
    assert.ok(Number(response.headers.get("content-length")) > 0);
  }

  const health = await fetch(`${started.origin}/health`);
  assert.deepEqual(await health.json(), {
    ok: true,
    mode: "read-only",
    lifecycle: "synthetic",
    authorization: false
  });

  for (const blocked of ["/package.json", "/server.mjs", "/test/server.test.mjs", "/%2e%2e/package.json"]) {
    const response = await fetch(`${started.origin}${blocked}`);
    assert.equal(response.status, 404, blocked);
  }
});

test("server allows GET and HEAD only", async (t) => {
  const started = await startPreviewServer();
  t.after(() => stop(started.server));

  const head = await fetch(`${started.origin}/domain-a`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const response = await fetch(`${started.origin}/domain-a`, {
      method,
      body: method === "DELETE" ? undefined : "not accepted"
    });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "GET, HEAD");
  }
});
