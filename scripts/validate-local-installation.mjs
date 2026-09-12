import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import { cp, link, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { installLocalPackage, probeLocalPackage, startLocalPackageServer, verifyLocalPackage } from "./local-research-package-lib.mjs";

// Integration validation requires a real, explicitly selected package. It never
// synthesizes the fixed c15ef identity or opens a daily browser profile.
const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== "--package-root" || args[2] !== "--output") {
  throw new Error("Usage: node scripts/validate-local-installation.mjs --package-root REAL_PACKAGE --output NEW_QA_DIRECTORY");
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

await check("complete fixed package verifies", async () => ({ manifestSha256: original.manifestSha256, files: original.manifest.files.length + 1 }));
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
  const destination = path.join(output, "new-user/install/c15ef05bb165");
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
await check("no incomplete package can start a listener", async () => {
  await assert.rejects(startLocalPackageServer(path.join(output, "empty-manifest"), { port: 0 }));
});
await check("original package remains byte-identical", async () => {
  assert.equal((await verifyLocalPackage(input)).manifestSha256, original.manifestSha256);
});
const report = { executedAt: new Date().toISOString(), packageRoot: input, manifestSha256: original.manifestSha256,
  checks, passed: checks.filter((item) => item.status === "passed").length, failed: checks.filter((item) => item.status === "failed").length,
  dailyBrowserOpened: false, fixed5188ListenerChanged: false, otherWindowsMachineVerified: false, scope: "Real fixed-package Node integration in new local directories; Windows launcher and clean-machine acceptance are separate." };
await writeFile(path.join(output, "results.json"), `${JSON.stringify(report, null, 2)}\n`, { flag: "wx" });
process.stdout.write(`${JSON.stringify({ passed: report.passed, failed: report.failed, output })}\n`);
process.exitCode = report.failed ? 1 : 0;
