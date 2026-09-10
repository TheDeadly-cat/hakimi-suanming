import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const NODE_TEST_GROUPS_PATH = "scripts/node-test-groups.json";

// Discover filenames only. Never import test modules or inspect their source/dependencies.
export async function discoverNodeTests(workspaceRoot) {
  const found = [];
  const walk = async (relative) => {
    const absolute = path.resolve(workspaceRoot, relative);
    if (!(await lstat(absolute)).isDirectory()) {
      throw new Error(`Node test discovery root must be a real directory: ${relative}`);
    }
    for (const entry of await readdir(absolute, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      const child = `${relative}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error(`Node test discovery does not follow symlinks: ${child}`);
      if (entry.isDirectory()) await walk(child);
      else if (entry.isFile() && entry.name.endsWith(".test.mjs")) found.push(child);
    }
  };
  await walk("scripts");
  const packagesRoot = path.resolve(workspaceRoot, "packages");
  if (!(await lstat(packagesRoot)).isDirectory()) throw new Error("packages must be a real directory");
  for (const entry of await readdir(packagesRoot, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    if (entry.isSymbolicLink()) throw new Error(`Node test discovery does not follow package symlinks: packages/${entry.name}`);
    if (!entry.isDirectory()) continue;
    const relative = `packages/${entry.name}/scripts`;
    let metadata;
    try {
      metadata = await lstat(path.resolve(workspaceRoot, relative));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (!metadata.isDirectory()) throw new Error(`Node test discovery root must be a real directory: ${relative}`);
    await walk(relative);
  }
  return found.sort();
}

export function validateNodeTestGroups(manifest, discovered) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.groups) || manifest.groups.length === 0) {
    throw new Error("Node test groups must have version 1 and a nonempty groups array");
  }
  const groupIds = new Set();
  const owners = new Map();
  const groups = [];
  for (const group of manifest.groups) {
    if (!group || typeof group.id !== "string" || !/^[a-z][a-z0-9-]*$/u.test(group.id) || groupIds.has(group.id)) {
      throw new Error(`Invalid or duplicate Node test group: ${group?.id}`);
    }
    if (!Array.isArray(group.tests) || group.tests.length === 0) throw new Error(`Node test group is empty: ${group.id}`);
    groupIds.add(group.id);
    for (const testPath of group.tests) {
      if (typeof testPath !== "string" || !/^(?:scripts\/|packages\/[^/]+\/scripts\/).+\.test\.mjs$/u.test(testPath) ||
          testPath.split("/").some((part) => part === "." || part === ".." || part === "") || /[\\*?\r\n\0]/u.test(testPath)) {
        throw new Error(`Node test groups require an exact repository test path: ${testPath}`);
      }
      if (owners.has(testPath)) throw new Error(`Duplicate Node test registration: ${testPath} (${owners.get(testPath)}, ${group.id})`);
      owners.set(testPath, group.id);
    }
    groups.push({ id: group.id, tests: [...group.tests].sort() });
  }
  const actual = new Set(discovered);
  const unregistered = discovered.filter((testPath) => !owners.has(testPath));
  const missing = [...owners.keys()].filter((testPath) => !actual.has(testPath));
  if (unregistered.length || missing.length) {
    throw new Error([
      "Node test group inventory mismatch",
      ...unregistered.map((testPath) => `Unregistered test: ${testPath}`),
      ...missing.map((testPath) => `Missing registered test: ${testPath}`)
    ].join("\n"));
  }
  return { discoveredCount: discovered.length, executionStatus: "not-executed", groups };
}

export async function verifyNodeTestGroups(workspaceRoot) {
  const manifest = JSON.parse(await readFile(path.resolve(workspaceRoot, NODE_TEST_GROUPS_PATH), "utf8"));
  return validateNodeTestGroups(manifest, await discoverNodeTests(workspaceRoot));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 0 && !(args.length === 2 && args[0] === "--list")) {
      throw new Error("Usage: node scripts/verify-node-test-groups.mjs [--list <group>]");
    }
    const result = await verifyNodeTestGroups(process.cwd());
    if (args.length) {
      const group = result.groups.find((entry) => entry.id === args[1]);
      if (!group) throw new Error(`Unknown Node test group: ${args[1]}`);
      process.stdout.write(`${group.tests.join("\n")}\n`);
    } else {
      console.log(`Node test group inventory verified: ${result.discoveredCount} paths. No tests executed.`);
      for (const group of result.groups) console.log(`${group.id}: ${group.tests.length} discovered, not executed`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
