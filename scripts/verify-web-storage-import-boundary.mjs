import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

function resolveRelativeModule(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    ...SOURCE_EXTENSIONS.map((extension) => `${base}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(base, `index${extension}`))
  ];
  return candidates.find((candidate) => (
    existsSync(candidate) && statSync(candidate).isFile()
  ));
}

function clauseHasRuntimeBinding(clause) {
  const trimmed = clause.trim();
  if (/^type\b/u.test(trimmed)) return false;
  const named = trimmed.match(/^\{([\s\S]*)\}$/u);
  if (!named) return true;
  return named[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => !/^type\b/u.test(entry));
}

function lineAt(sourceText, offset) {
  return sourceText.slice(0, offset).split("\n").length;
}

function staticModuleReferences(sourceText) {
  const references = [];
  const fromDeclaration = /(?:^|\n)\s*(?:import|export)\s+([^;]*?)\s+from\s+(["'])([^"']+)\2\s*;/gu;
  const sideEffectImport = /(?:^|\n)\s*import\s+(["'])([^"']+)\1\s*;/gu;
  for (const match of sourceText.matchAll(fromDeclaration)) {
    references.push({
      specifier: match[3],
      runtimeBinding: clauseHasRuntimeBinding(match[1]),
      line: lineAt(sourceText, match.index)
    });
  }
  for (const match of sourceText.matchAll(sideEffectImport)) {
    references.push({
      specifier: match[2],
      runtimeBinding: true,
      line: lineAt(sourceText, match.index)
    });
  }
  return references;
}

export function findWebStorageImportBoundaryViolations(entryFiles) {
  const pending = entryFiles.map((entry) => path.resolve(entry));
  const visited = new Set();
  const violations = [];

  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    const sourceText = readFileSync(file, "utf8");
    for (const reference of staticModuleReferences(sourceText)) {
      if (!reference.runtimeBinding) continue;
      if (
        reference.specifier === "@hakimi/storage" ||
        reference.specifier.startsWith("@hakimi/storage/")
      ) {
        violations.push({ file, line: reference.line, specifier: reference.specifier });
        continue;
      }
      if (reference.specifier.startsWith(".")) {
        const resolved = resolveRelativeModule(file, reference.specifier);
        if (resolved) pending.push(resolved);
      }
    }
  }
  return violations.sort((left, right) => (
    left.file.localeCompare(right.file) || left.line - right.line
  ));
}

export function verifyWebStorageImportBoundary(entryFiles) {
  const violations = findWebStorageImportBoundaryViolations(entryFiles);
  if (violations.length === 0) return;
  const details = violations
    .map((violation) => `${violation.file}:${violation.line} imports ${violation.specifier}`)
    .join("\n");
  throw new Error(
    `Web startup static graph reaches @hakimi/storage before runtime configuration:\n${details}`
  );
}

const isDirectRun = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
  const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  verifyWebStorageImportBoundary([
    path.resolve(workspaceRoot, "apps/web/src/main.tsx"),
    path.resolve(workspaceRoot, "apps/web/src/bootstrap.ts")
  ]);
  process.stdout.write("Web startup static imports remain outside the storage runtime boundary.\n");
}
