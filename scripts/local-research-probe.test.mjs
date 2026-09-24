import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { test } from "node:test";
import { matchesLocalProbeResponse } from "./local-research-package-lib.mjs";

const bytes = Buffer.from("synthetic local probe identity\n");
const expected = { size: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };

async function withListener(respond, run) {
  const server = createServer(respond);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try { await run(`http://127.0.0.1:${server.address().port}/`); }
  finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("exact bytes match with a declared length or chunked transfer", async () => {
  for (const declared of [true, false]) {
    await withListener((_request, response) => {
      response.writeHead(200, declared ? { "Content-Length": bytes.length } : {});
      response.write(bytes.subarray(0, 7));
      response.end(bytes.subarray(7));
    }, async (origin) => {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      assert.equal(response.headers.has("content-length"), declared);
      assert.equal(await matchesLocalProbeResponse(response, expected), true);
    });
  }
});

test("mismatching Content-Length cancels before requesting any body chunk", async () => {
  for (const length of [String(bytes.length + 100_000_000), String(bytes.length - 1), "invalid"]) {
    let pulls = 0, cancelled = false;
    const body = new ReadableStream({
      pull() { pulls += 1; throw new Error("The rejected body must not be read."); },
      cancel() { cancelled = true; }
    }, { highWaterMark: 0 });
    const response = new Response(body, { headers: { "Content-Length": length } });
    assert.equal(await matchesLocalProbeResponse(response, expected), false);
    assert.equal(pulls, 0);
    assert.equal(cancelled, true);
  }
});

test("an oversized chunked response cancels at the first excessive chunk", async () => {
  let pulls = 0, cancelled = false;
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1;
      assert.equal(pulls, 1, "No further chunk may be requested after crossing the limit.");
      controller.enqueue(new Uint8Array(bytes.length + 1));
    },
    cancel() { cancelled = true; }
  }, { highWaterMark: 0 });
  assert.equal(await matchesLocalProbeResponse(new Response(body), expected), false);
  assert.equal(pulls, 1);
  assert.equal(cancelled, true);
});

test("unknown chunked listeners cannot pass with excess, truncated or same-size wrong bytes", async () => {
  for (const payload of [Buffer.concat([bytes, Buffer.from("extra")]), bytes.subarray(0, -1), Buffer.alloc(bytes.length)]) {
    await withListener((_request, response) => {
      response.writeHead(200);
      response.write(payload);
      response.end();
    }, async (origin) => {
      const response = await fetch(origin, { signal: AbortSignal.timeout(2000) });
      assert.equal(response.headers.has("content-length"), false);
      assert.equal(await matchesLocalProbeResponse(response, expected), false);
    });
  }
});

test("the fetch deadline also bounds a body which never completes", async () => {
  await withListener((_request, response) => {
    response.writeHead(200);
    response.write(bytes.subarray(0, 1));
  }, async (origin) => {
    const signal = AbortSignal.timeout(1000);
    const response = await fetch(origin, { signal });
    await assert.rejects(matchesLocalProbeResponse(response, expected), (error) =>
      signal.aborted && ["AbortError", "TimeoutError"].includes(error.name));
  });
});

test("non-success responses are cancelled and unbounded expected sizes are rejected", async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } }, { highWaterMark: 0 });
  assert.equal(await matchesLocalProbeResponse(new Response(body, { status: 503 }), expected), false);
  assert.equal(cancelled, true);
  for (const size of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(matchesLocalProbeResponse(new Response(bytes), { ...expected, size }), /bounded artifact/u);
  }
});
