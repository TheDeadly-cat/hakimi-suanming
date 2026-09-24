import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { parse } from "@babel/parser";
import { chromium } from "@playwright/test";
import {
  createReleasePersistentProfile,
  launchReleasePersistentContext
} from "../apps/web/e2e/release-browser-persistent-context.ts";

// Native temporary files are retained. These tests never read a daily profile,
// start a real browser, or need a caller-selected filesystem root.
test("parallel allocations are unique, outside reports, and initially absent", async () => {
  const profiles = await Promise.all(Array.from({ length: 12 }, () => createReleasePersistentProfile()));
  const temporaryRoot = await fs.realpath(os.tmpdir());
  assert.equal(new Set(profiles).size, 12);
  for (const profile of profiles) {
    assert.equal(path.dirname(path.dirname(profile)), temporaryRoot);
    assert.match(path.basename(path.dirname(profile)), /^hrp-/u);
    await assert.rejects(fs.lstat(profile), { code: "ENOENT" });
  }
});

test("daily Chrome and Edge paths and arbitrary directories are refused before filesystem reads", async (t) => {
  const launched = t.mock.method(chromium, "launchPersistentContext", () => { throw new Error("Browser must not start"); });
  const read = t.mock.method(fs, "lstat", () => { throw new Error("Daily directory must not be read"); });
  for (const userDataDir of [
    path.join(os.homedir(), "AppData/Local/Google/Chrome/User Data"),
    path.join(os.homedir(), "AppData/Local/Microsoft/Edge/User Data/Default"),
    path.join(os.tmpdir(), "arbitrary-existing-profile"), "", undefined
  ]) await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), /unused profile issued/u);
  assert.equal(launched.mock.callCount(), 0);
  assert.equal(read.mock.callCount(), 0);
});

test("two concurrent launch attempts cannot share an issued profile", async (t) => {
  const userDataDir = await createReleasePersistentProfile();
  const context = { close: async () => {} };
  let releaseLaunch;
  const launch = t.mock.method(chromium, "launchPersistentContext", () => new Promise((resolve) => { releaseLaunch = () => resolve(context); }));
  const first = launchReleasePersistentContext({ projectName: "chrome", userDataDir });
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), /unused profile issued/u);
  for (let attempt = 0; !releaseLaunch && attempt < 100; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(releaseLaunch);
  releaseLaunch();
  assert.equal(await first, context);
  assert.equal(launch.mock.callCount(), 1);
  assert.equal(launch.mock.calls[0].arguments[0], userDataDir);
  const options = launch.mock.calls[0].arguments[1];
  assert.equal(options.channel, "chrome");
  assert.equal(options.headless, true);
  assert.equal(options.serviceWorkers, "allow");
  await context.close();
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), /unused profile issued/u);
  assert.equal((await fs.lstat(userDataDir)).isDirectory(), true);
});

test("temporary root allocation failure never reaches browser launch", async (t) => {
  t.mock.method(fs, "mkdtemp", async () => { throw Object.assign(new Error("injected allocation failure"), { code: "EACCES" }); });
  const launch = t.mock.method(chromium, "launchPersistentContext", () => { throw new Error("Browser must not start"); });
  await assert.rejects((async () => {
    const userDataDir = await createReleasePersistentProfile();
    await launchReleasePersistentContext({ projectName: "chrome", userDataDir });
  })(), { code: "EACCES" });
  assert.equal(launch.mock.callCount(), 0);
});

test("profile mkdir failure consumes the reservation without starting a browser", async (t) => {
  const userDataDir = await createReleasePersistentProfile();
  t.mock.method(fs, "mkdir", async () => { throw Object.assign(new Error("injected mkdir failure"), { code: "EACCES" }); });
  const launch = t.mock.method(chromium, "launchPersistentContext", () => { throw new Error("Browser must not start"); });
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), { code: "EACCES" });
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), /unused profile issued/u);
  assert.equal(launch.mock.callCount(), 0);
});

test("pre-existing content in a reserved profile is retained and never opened", async (t) => {
  const userDataDir = await createReleasePersistentProfile();
  await fs.mkdir(userDataDir);
  await fs.writeFile(path.join(userDataDir, "keep.txt"), "keep original evidence", { flag: "wx" });
  const launch = t.mock.method(chromium, "launchPersistentContext", () => { throw new Error("Browser must not start"); });
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), { code: "EEXIST" });
  assert.equal(await fs.readFile(path.join(userDataDir, "keep.txt"), "utf8"), "keep original evidence");
  assert.equal(launch.mock.callCount(), 0);
});

test("changed temporary root identity is rejected before profile creation", async (t) => {
  const userDataDir = await createReleasePersistentProfile();
  const nativeLstat = fs.lstat;
  t.mock.method(fs, "lstat", async (...args) => {
    const stat = await nativeLstat(...args);
    Object.defineProperty(stat, "ino", { value: stat.ino + 1n });
    return stat;
  });
  const mkdir = t.mock.method(fs, "mkdir", () => { throw new Error("Must reject first"); });
  const launch = t.mock.method(chromium, "launchPersistentContext", () => { throw new Error("Browser must not start"); });
  await assert.rejects(launchReleasePersistentContext({ projectName: "chrome", userDataDir }), /reservation identity changed/u);
  assert.equal(mkdir.mock.callCount(), 0);
  assert.equal(launch.mock.callCount(), 0);
});

test("browser launch failure is retained and the same profile cannot be retried", async (t) => {
  const userDataDir = await createReleasePersistentProfile();
  const launch = t.mock.method(chromium, "launchPersistentContext", async () => { throw new Error("injected browser failure"); });
  await assert.rejects(launchReleasePersistentContext({ projectName: "msedge", userDataDir }), /injected browser failure/u);
  await assert.rejects(launchReleasePersistentContext({ projectName: "msedge", userDataDir }), /unused profile issued/u);
  assert.equal(launch.mock.callCount(), 1);
  assert.equal((await fs.lstat(userDataDir)).isDirectory(), true);
});

// Inspect helper use as syntax, including aliases and computed property bypasses.
// The filesystem and concurrency properties above are tested through real calls.
function assertProfileLaunchContract(source) {
  const ast = parse(source, { sourceType: "module", plugins: ["typescript"] });
  const nodes = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type) nodes.push(node);
    for (const [key, value] of Object.entries(node)) if (!["loc", "comments", "tokens"].includes(key)) walk(value);
  }
  walk(ast.program);
  const imported = new Map();
  for (const node of nodes) if (node.type === "ImportDeclaration" && /\/release-browser-persistent-context(?:\.ts)?$/u.test(node.source.value)) {
    for (const spec of node.specifiers) if (spec.type === "ImportSpecifier") imported.set(spec.imported.name, spec.local.name);
  }
  const allocate = imported.get("createReleasePersistentProfile");
  const launch = imported.get("launchReleasePersistentContext");
  assert.ok(allocate && launch, "Must import both guarded profile operations");
  assert.equal(nodes.some((node) => node.type === "Identifier" && ["chromium", "launchPersistentContext"].includes(node.name)
    || node.type === "StringLiteral" && node.value === "launchPersistentContext"), false, "Direct persistent browser bypass");
  const allocations = nodes.filter((node) => node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === allocate);
  const launches = nodes.filter((node) => node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === launch);
  assert.equal(allocations.length, 1);
  assert.equal(allocations[0].arguments.length, 0, "No custom directory operand");
  assert.equal(launches.length, 1);
  const variables = new Set();
  for (const node of nodes) {
    const value = node.type === "VariableDeclarator" ? node.init : node.type === "AssignmentExpression" ? node.right : null;
    const target = node.type === "VariableDeclarator" ? node.id : node.left;
    if (value?.type === "AwaitExpression" && value.argument === allocations[0] && target?.type === "Identifier") variables.add(target.name);
  }
  const args = launches[0].arguments;
  assert.equal(args.length, 1);
  assert.equal(args[0].type, "ObjectExpression");
  assert.ok(args[0].properties.every((property) => property.type === "ObjectProperty" && !property.computed));
  const directory = args[0].properties.filter((property) => (property.key.name ?? property.key.value) === "userDataDir");
  assert.equal(directory.length, 1);
  assert.equal(directory[0].value.type, "Identifier");
  assert.ok(variables.has(directory[0].value.name), "Launch must use the issued directory");
}

for (const file of ["pwa-install-and-offline-cold-start.spec.ts", "deployed-pwa-candidate.spec.ts", "service-worker-same-schema-aba.spec.ts"]) {
  test(`${file} uses the issued directory through the policy helper`, async () => {
    assertProfileLaunchContract(await fs.readFile(new URL(`../apps/web/e2e/${file}`, import.meta.url), "utf8"));
  });
}

test("launch-contract check accepts import aliases and rejects direct/computed bypass and arbitrary paths", () => {
  const valid = `import { createReleasePersistentProfile as reserve, launchReleasePersistentContext as open } from './release-browser-persistent-context.ts';
    const directory = await reserve(); await open({projectName: 'chrome', userDataDir: directory});`;
  assert.doesNotThrow(() => assertProfileLaunchContract(valid));
  for (const invalid of [
    valid.replace("userDataDir: directory", "userDataDir: '/daily/chrome'"),
    valid.replace("reserve()", "reserve('/daily/chrome')"),
    valid + " chromium.launchPersistentContext('/daily/chrome');",
    valid + " browser['launchPersistentContext']('/daily/chrome');",
    valid + " const { launchPersistentContext: direct } = browser; direct('/daily/chrome');"
  ]) assert.throws(() => assertProfileLaunchContract(invalid));
});
