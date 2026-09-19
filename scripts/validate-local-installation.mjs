import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { cp, link, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { LOCAL_RESEARCH_CANDIDATE, LOCAL_RESEARCH_RELEASE, createLocalPackageTools } from "./local-research-package-lib.mjs";

// Integration validation requires a real, explicitly selected package. It never
// synthesizes the fixed c15ef identity or opens a daily browser profile.
const args = process.argv.slice(2);
const isCandidate = args[0] === "--candidate";
if (isCandidate) args.shift();
const selection = isCandidate ? LOCAL_RESEARCH_CANDIDATE : LOCAL_RESEARCH_RELEASE;
const { installLocalPackage, probeLocalPackage, startLocalPackageServer, verifyLocalPackage } = createLocalPackageTools(selection);
if (args.length !== 4 || args[0] !== "--package-root" || args[2] !== "--output") {
  throw new Error("Usage: node scripts/validate-local-installation.mjs [--candidate] --package-root REAL_PACKAGE --output NEW_QA_DIRECTORY");
}
const input = path.resolve(args[1]);
const output = path.resolve(args[3]);
for (const [a, b] of [[input, output], [output, input]]) {
  const relative = path.relative(a, b);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) throw new Error("QA output must be separate from the package.");
}
const original = await verifyLocalPackage(input);
await mkdir(output, { recursive: false });
const checks = [];
async function check(name, run) {
  try { const evidence = await run(); checks.push({ name, status: "passed", evidence: evidence ?? null }); }
  catch (error) { checks.push({ name, status: "failed", error: error.stack }); }
  process.stdout.write(`${checks.at(-1).status}: ${name}\n`);
}
async function fixture(name) {
  const target = path.join(output, name);
  await cp(input, target, { recursive: true, force: false, errorOnExist: true });
  return target;
}
async function listen(server) {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  return `http://127.0.0.1:${server.address().port}/`;
}
async function close(server) { server.closeAllConnections(); await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }

await check("complete selected package verifies", async () => ({ manifestSha256: original.manifestSha256, files: original.manifest.files.length + 1 }));
await check("arbitrary selections and the other pinned artifact are rejected", async () => {
  assert.throws(() => createLocalPackageTools({ ...selection }), /arbitrary/u);
  const other = createLocalPackageTools(isCandidate ? LOCAL_RESEARCH_RELEASE : LOCAL_RESEARCH_CANDIDATE);
  await assert.rejects(other.verifyLocalPackage(input));
});
if (isCandidate) {
  await check("candidate refuses the daily 5188 origin before opening any listener", async () => {
    await assert.rejects(startLocalPackageServer(input, { port: 5188 }), /daily 5188/u);
    for (const port of ["5188", "05188", NaN, -1, 65536]) {
      await assert.rejects(startLocalPackageServer(input, { port }), /explicit integer/u);
    }
    await assert.rejects(probeLocalPackage(input, { origin: "http://127.0.0.1:5188/" }), /daily 5188/u);
  });
  await check("rewriting a receipt and its package entry cannot transfer the original evidence", async () => {
    const root = await fixture("tampered-browser-receipt");
    const manifestPath = path.join(root, "local-package-files.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const entry = manifest.files.find((item) => item.path.endsWith("/pwa.json"));
    assert.ok(entry);
    const target = path.join(root, entry.path);
    const receipt = JSON.parse(await readFile(target, "utf8"));
    receipt.evidenceId = "hre1-wrong-artifact";
    const bytes = Buffer.from(JSON.stringify(receipt));
    await writeFile(target, bytes);
    entry.size = bytes.length;
    entry.sha256 = createHash("sha256").update(bytes).digest("hex");
    await writeFile(manifestPath, JSON.stringify(manifest));
    await assert.rejects(verifyLocalPackage(root), /browser receipt identity/u);
  });
}
await check("empty file manifest is rejected", async () => {
  const root = await fixture("empty-manifest");
  const manifest = JSON.parse(await readFile(path.join(root, "local-package-files.json"), "utf8"));
  manifest.files = [];
  await writeFile(path.join(root, "local-package-files.json"), JSON.stringify(manifest));
  await assert.rejects(verifyLocalPackage(root), /incomplete|duplicated/u);
});
await check("duplicate and escaping manifest paths are rejected before dereference", async () => {
  const root = await fixture("escaping-manifest");
  const manifest = JSON.parse(await readFile(path.join(root, "local-package-files.json"), "utf8"));
  manifest.files[0] = { ...manifest.files[0], path: "../not-an-input.txt" };
  await writeFile(path.join(root, "local-package-files.json"), JSON.stringify(manifest));
  await assert.rejects(verifyLocalPackage(root), /incomplete|duplicated/u);
  manifest.files = [...original.manifest.files, original.manifest.files[0]];
  await writeFile(path.join(root, "local-package-files.json"), JSON.stringify(manifest));
  await assert.rejects(verifyLocalPackage(root), /incomplete|duplicated/u);
});
await check("artifact tampering cannot be accepted by editing the package manifest", async () => {
  const root = await fixture("tampered-artifact");
  await writeFile(path.join(root, "dist/web/index.html"), "wrong artifact");
  await assert.rejects(verifyLocalPackage(root));
});
await check("extra files and hardlink aliases are rejected", async () => {
  const extra = await fixture("extra-file");
  await writeFile(path.join(extra, "unexpected.txt"), "unexpected");
  await assert.rejects(verifyLocalPackage(extra), /bytes differ/u);
  const alias = await fixture("hardlink-alias");
  await link(path.join(alias, "dist/web/index.html"), path.join(output, "external-hardlink.html"));
  await assert.rejects(verifyLocalPackage(alias), /link|alias/u);
});
let installed;
await check("new installation verifies and repeat installation is read-only reuse", async () => {
  const destination = path.join(output, "new-user/install", selection.buildVersion);
  const first = await installLocalPackage({ packageRoot: input, destination });
  const second = await installLocalPackage({ packageRoot: input, destination });
  assert.equal(first.reused, false); assert.equal(second.reused, true);
  installed = destination;
  assert.equal((await verifyLocalPackage(destination)).manifestSha256, original.manifestSha256);
  return { destination, first, second };
});
await check("unrelated destination is preserved, not overwritten", async () => {
  const destination = path.join(output, "existing-unrelated");
  await mkdir(destination); await writeFile(path.join(destination, "keep.txt"), "existing user content");
  await assert.rejects(installLocalPackage({ packageRoot: input, destination }));
  assert.equal(await readFile(path.join(destination, "keep.txt"), "utf8"), "existing user content");
});
await check("loopback serving preserves bytes, SPA routing, headers and fixed-port refusal", async () => {
  assert.ok(installed);
  const { server, origin } = await startLocalPackageServer(installed, { port: 0 });
  try {
    const response = await fetch(origin);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(input, "dist/web/index.html")));
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const rawHeaders = await readFile(path.join(input, "dist/web/_headers"), "utf8");
    const reportOnly = /^\s+Content-Security-Policy-Report-Only:\s*(.+)$/mu.exec(rawHeaders)?.[1].trim();
    assert.ok(reportOnly);
    const expectedReportOnly = isCandidate
      ? reportOnly.split(";").map((part) => part.trim())
        .filter((part) => !/^upgrade-insecure-requests(?:\s|$)/iu.test(part)).join("; ")
      : reportOnly;
    assert.equal(response.headers.get("content-security-policy-report-only"), expectedReportOnly);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("referrer-policy"), "no-referrer");
    assert.equal((await probeLocalPackage(installed, { origin })).state, "matching");
    assert.equal((await fetch(`${origin}cases`, { headers: { Accept: "text/html" } })).status, 200);
    assert.equal((await fetch(`${origin}absent.js`, { headers: { Accept: "text/html" } })).status, 404);
    assert.equal((await fetch(`${origin}_headers`)).status, 404);
    assert.equal((await fetch(origin, { method: "POST", body: "no-write" })).status, 405);
    const foreignHostStatus = await new Promise((resolve, reject) => {
      const request = httpRequest(origin, { headers: { Host: "foreign.example" } }, (response) => {
        response.resume(); response.once("end", () => resolve(response.statusCode));
      });
      assert.equal(request.getHeader("host"), "foreign.example");
      request.once("error", reject); request.end();
    });
    assert.equal(foreignHostStatus, 403);
    await assert.rejects(startLocalPackageServer(installed, { port: server.address().port }), { code: "EADDRINUSE" });
    assert.equal((await fetch(origin)).status, 200);
    return { origin, loopbackOnly: server.address().address === "127.0.0.1", secondServerRefused: true };
  } finally { await close(server); }
});
await check("a foreign listener is detected and left running", async () => {
  const server = createServer((_request, response) => response.end("other application"));
  const origin = await listen(server);
  try {
    assert.equal((await probeLocalPackage(input, { origin })).state, "foreign");
    assert.equal(await (await fetch(origin)).text(), "other application");
  } finally { await close(server); }
  assert.equal((await probeLocalPackage(input, { origin })).state, "stopped");
});
for (const scenario of ["oversized declared length", "oversized chunked body", "truncated chunked body"]) {
  await check(`probe rejects ${scenario} without stopping the listener`, async () => {
    const index = original.artifact.lock.files.find((entry) => entry.path === "index.html");
    const server = createServer((_request, response) => {
      if (scenario === "oversized declared length") {
        response.writeHead(200, { "Content-Length": index.size + 100_000_000 });
        response.flushHeaders();
      } else {
        response.writeHead(200);
        response.write(Buffer.alloc(scenario === "oversized chunked body" ? index.size + 1 : index.size - 1));
        if (scenario === "truncated chunked body") response.end();
      }
    });
    const origin = await listen(server);
    try {
      const result = await probeLocalPackage(input, { origin });
      assert.equal(result.state, "foreign");
      // The two open-ended responses must be rejected by identity/size checks,
      // rather than waiting for the existing fetch deadline to expire.
      assert.equal(result.reason, "index.html identity mismatch");
      assert.equal(server.listening, true);
    } finally { await close(server); }
  });
}
await check("exact chunked index and worker responses still identify the selected package", async () => {
  const index = await readFile(path.join(input, "dist/web/index.html"));
  const worker = await readFile(path.join(input, "dist/web/sw.js"));
  const server = createServer((request, response) => {
    const bytes = request.url === "/sw.js" ? worker : index;
    response.writeHead(200);
    response.write(bytes.subarray(0, 1));
    response.end(bytes.subarray(1));
  });
  const origin = await listen(server);
  try { assert.equal((await probeLocalPackage(input, { origin })).state, "matching"); }
  finally { await close(server); }
});
await check("no incomplete package can start a listener", async () => {
  await assert.rejects(startLocalPackageServer(path.join(output, "empty-manifest"), { port: 0 }));
});
await check("original package remains byte-identical", async () => {
  assert.equal((await verifyLocalPackage(input)).manifestSha256, original.manifestSha256);
});
const report = { executedAt: new Date().toISOString(), packageRoot: input, manifestSha256: original.manifestSha256,
  checks, passed: checks.filter((item) => item.status === "passed").length, failed: checks.filter((item) => item.status === "failed").length,
  dailyBrowserOpened: false, fixed5188ListenerChanged: false, otherWindowsMachineVerified: false, selection, scope: "Real selected-package Node integration in new local directories; Windows launcher and clean-machine acceptance are separate." };
await writeFile(path.join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify({ passed: report.passed, failed: report.failed, output })}\n`);
process.exitCode = report.failed ? 1 : 0;
