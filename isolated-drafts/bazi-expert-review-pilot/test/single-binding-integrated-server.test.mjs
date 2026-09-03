import assert from "node:assert/strict";
import { request } from "node:http";
import test from "node:test";

import {
  createSingleBindingIntegratedServer,
  createSingleBindingIntegratedSourceTreeDemoSessionBinding,
  loadSingleBindingIntegratedPayloadsFromSourceCandidate,
  singleBindingIntegratedPayloadPaths
} from "../single-binding-integrated-server.mjs";
import {
  createSingleBindingIntegratedPairServer,
  loadSingleBindingIntegratedPairPayloadsFromSourceCandidate
} from "../single-binding-integrated-pair-server.mjs";

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

async function close(server) {
  await new Promise((resolveClose, reject) => {
    server.close((error) => error ? reject(error) : resolveClose());
  });
}

async function httpCall({ port, path = "/", method = "GET", hostHeader = `127.0.0.1:${port}` }) {
  return new Promise((resolveCall, reject) => {
    const outgoing = request({
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: { Host: hostHeader }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveCall({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    outgoing.once("error", reject);
    outgoing.end();
  });
}

test("seat server injects one exact pre-readback session and exposes only its static allowlist", async (t) => {
  const sessionBinding = createSingleBindingIntegratedSourceTreeDemoSessionBinding("A");
  const payloads = await loadSingleBindingIntegratedPayloadsFromSourceCandidate("A");
  const server = createSingleBindingIntegratedServer({ seatId: "A", payloads, sessionBinding });
  const port = await listen(server);
  t.after(() => close(server));

  const root = await httpCall({ port });
  assert.equal(root.status, 200);
  assert.doesNotMatch(root.body, /__HAKIMI_SINGLE_BINDING_SESSION_BINDING_JSON__/u);
  assert.match(root.body, /hakimi-single-binding-session/u);
  assert.match(root.body, new RegExp(sessionBinding.reviewCycleId, "u"));
  assert.match(root.headers["content-security-policy"], /connect-src 'none'/u);

  for (const path of ["/", "/single-binding-integrated-a.html", ...singleBindingIntegratedPayloadPaths("A")
    .filter((entry) => !entry.endsWith(".html"))
    .map((entry) => `/${entry}`)]) {
    assert.equal((await httpCall({ port, path })).status, 200, path);
  }
  for (const path of [
    "/single-binding-integrated-b.html", "/single-binding-integrated-pair.html",
    "/package.json", "/single-binding-integrated-server.mjs", "/%2e%2e/package.json",
    "//single-binding-integrated-a.html"
  ]) {
    assert.equal((await httpCall({ port, path })).status, 404, path);
  }
  assert.equal((await httpCall({ port, method: "POST" })).status, 405);
  assert.equal((await httpCall({ port, hostHeader: `localhost:${port}` })).status, 421);
});

test("seat server fails before listen on seat drift or a missing/duplicate session placeholder", async () => {
  const sessionA = createSingleBindingIntegratedSourceTreeDemoSessionBinding("A");
  const sessionB = createSingleBindingIntegratedSourceTreeDemoSessionBinding("B");
  const payloads = await loadSingleBindingIntegratedPayloadsFromSourceCandidate("A");
  assert.throws(
    () => createSingleBindingIntegratedServer({ seatId: "A", payloads, sessionBinding: sessionB }),
    /seat mismatch/u
  );

  const entry = "single-binding-integrated-a.html";
  const missing = new Map(payloads);
  missing.set(entry, Buffer.from("<!doctype html><title>missing</title>", "utf8"));
  assert.throws(
    () => createSingleBindingIntegratedServer({ seatId: "A", payloads: missing, sessionBinding: sessionA }),
    /精确包含一个 session placeholder/u
  );

  const duplicate = new Map(payloads);
  const original = payloads.get(entry).toString("utf8");
  duplicate.set(entry, Buffer.from(`${original}__HAKIMI_SINGLE_BINDING_SESSION_BINDING_JSON__`, "utf8"));
  assert.throws(
    () => createSingleBindingIntegratedServer({ seatId: "A", payloads: duplicate, sessionBinding: sessionA }),
    /精确包含一个 session placeholder/u
  );
});

test("pair server injects complementary exact sessions and rejects pair drift", async (t) => {
  const seatASessionBinding = createSingleBindingIntegratedSourceTreeDemoSessionBinding("A");
  const seatBSessionBinding = createSingleBindingIntegratedSourceTreeDemoSessionBinding("B");
  const payloads = await loadSingleBindingIntegratedPairPayloadsFromSourceCandidate();
  const server = createSingleBindingIntegratedPairServer({
    payloads,
    seatASessionBinding,
    seatBSessionBinding
  });
  const port = await listen(server);
  t.after(() => close(server));

  const root = await httpCall({ port });
  assert.equal(root.status, 200);
  assert.doesNotMatch(root.body, /__HAKIMI_SINGLE_BINDING_SEAT_[AB]_SESSION_BINDING_JSON__/u);
  assert.match(root.body, new RegExp(seatASessionBinding.seatSessionNonce, "u"));
  assert.match(root.body, new RegExp(seatBSessionBinding.seatSessionNonce, "u"));
  assert.equal((await httpCall({ port, path: "/single-binding-integrated-pair.js" })).status, 200);
  assert.equal((await httpCall({ port, path: "/single-binding-integrated-a.html" })).status, 404);
  assert.equal((await httpCall({ port, path: "/single-binding-integrated-b.html" })).status, 404);

  assert.throws(
    () => createSingleBindingIntegratedPairServer({
      payloads,
      seatASessionBinding,
      seatBSessionBinding: { ...seatBSessionBinding, pairRunId: `single-binding-synthetic-pair-run.${"9".repeat(64)}` }
    }),
    /pairRunId mismatch/u
  );
  assert.throws(
    () => createSingleBindingIntegratedPairServer({
      payloads,
      seatASessionBinding,
      seatBSessionBinding: { ...seatBSessionBinding, seatSessionNonce: seatASessionBinding.seatSessionNonce }
    }),
    /nonce\/package pin/u
  );
});

test("expert and coordinator source surfaces stay local-only with distinct file-handling roles", async () => {
  const seatPayloads = await loadSingleBindingIntegratedPayloadsFromSourceCandidate("A");
  const pairPayloads = await loadSingleBindingIntegratedPairPayloadsFromSourceCandidate();
  const seatSource = [...seatPayloads.values()].map((bytes) => bytes.toString("utf8")).join("\n");
  const pairSource = [...pairPayloads.values()].map((bytes) => bytes.toString("utf8")).join("\n");
  const forbiddenRuntimeSurface = /localStorage|sessionStorage|indexedDB|serviceWorker|XMLHttpRequest|WebSocket|navigator\.clipboard/iu;
  assert.doesNotMatch(seatSource, forbiddenRuntimeSurface);
  assert.doesNotMatch(pairSource, forbiddenRuntimeSurface);
  assert.equal((seatSource.match(/\bfetch\s*\(/gu) ?? []).length, 1);
  assert.match(seatSource, /fetch\("\/__complete-return"/u);
  assert.doesNotMatch(pairSource, /\bfetch\s*\(/u);
  assert.doesNotMatch(seatSource, /type=["']file/iu);
  assert.match(pairSource, /type=["']file/iu);
  assert.match(seatSource, /只需阅读题面、按自己的专业判断回答/u);
  assert.match(seatSource, /协调人只能逐字代录/u);
  assert.match(pairSource, /差异保持未解决/u);
  assert.doesNotMatch(pairSource, /选择赢家|采用 A 席|采用 B 席/u);
});
