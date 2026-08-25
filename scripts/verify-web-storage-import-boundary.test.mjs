import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import {
  findWebStorageImportBoundaryViolations,
  verifyWebStorageImportBoundary
} from "./verify-web-storage-import-boundary.mjs";

let fixtureRoot;

before(async () => {
  fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "hakimi-storage-boundary-"));
});

after(async () => {
  if (fixtureRoot) await rm(fixtureRoot, { recursive: true, force: true });
});

test("allows type-only and dynamic storage imports", async () => {
  const entry = path.join(fixtureRoot, "safe.ts");
  await writeFile(entry, [
    'import type { ResearchDatabase } from "@hakimi/storage";',
    'import { type CaseRepository } from "@hakimi/storage";',
    'export async function load() { return import("@hakimi/storage"); }'
  ].join("\n"));
  assert.deepEqual(findWebStorageImportBoundaryViolations([entry]), []);
  assert.doesNotThrow(() => verifyWebStorageImportBoundary([entry]));
});

test("rejects a direct runtime storage import", async () => {
  const entry = path.join(fixtureRoot, "direct.ts");
  await writeFile(entry, 'import { ResearchDatabase } from "@hakimi/storage";\n');
  assert.equal(findWebStorageImportBoundaryViolations([entry]).length, 1);
  assert.throws(
    () => verifyWebStorageImportBoundary([entry]),
    /reaches @hakimi\/storage/u
  );
});

test("rejects a transitive runtime storage import", async () => {
  const entry = path.join(fixtureRoot, "entry.ts");
  const child = path.join(fixtureRoot, "child.ts");
  await writeFile(entry, 'import "./child";\n');
  await writeFile(child, 'export { CaseRepository } from "@hakimi/storage";\n');
  const violations = findWebStorageImportBoundaryViolations([entry]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].file, child);
});
