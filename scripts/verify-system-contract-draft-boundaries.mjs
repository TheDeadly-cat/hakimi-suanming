import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const verifierPath = fs.realpathSync(fileURLToPath(import.meta.url));
const defaultWorkspaceRoot = path.resolve(path.dirname(verifierPath), "..");
const draftRegistryPath = path.resolve(path.dirname(verifierPath), "system-contract-draft-registry.json");
const defaultDraftRegistry = JSON.parse(fs.readFileSync(draftRegistryPath, "utf8"));
const supportedDraftKinds = new Set(["contract", "adapter", "differential", "workspace"]);
const supportedDraftPresence = new Set(["required", "when-present"]);
const supportedSpecialChecks = new Set([
  "astronomy-engine-browser-parity-v1",
  "astronomy-engine-fresh-worker-v1",
  "fortel-fresh-node-worker-v1",
  "iztro-browser-preview-v1",
  "iztro-locked-worker-imports-v1",
  "iztro-tool-scripts-v1",
  "western-rules-preview-v1",
  "ziwei-workspace-browser-app-v1"
]);
const generatedWorkspaceDirectories = new Set([".vite", "dist", "tmp"]);
const verifierTestPath = path.resolve(path.dirname(verifierPath), "verify-system-contract-draft-boundaries.test.mjs");
const verifierFiles = new Set([
  verifierPath,
  ...(fs.existsSync(verifierTestPath) ? [fs.realpathSync(verifierTestPath)] : [])
]);
const codeFilePattern = /\.(?:[cm]?[jt]sx?)$/u;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function allowedDraftDependencies(draft) {
  return [...new Set((draft.crossDraftEdges ?? []).map((edge) => edge.toPackage))].sort();
}

function isSafeRegistryRelativePath(value) {
  if (typeof value !== "string" || value.length === 0 || path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  return normalized !== ".." && !normalized.startsWith(`..${path.sep}`);
}

function validateDraftRegistry(registry, record) {
  if (!registry || typeof registry !== "object" || Array.isArray(registry)
    || registry.schemaVersion !== 1 || !Array.isArray(registry.drafts)) {
    record("system-contract-draft-registry.json must keep schemaVersion 1 and a drafts array");
    return [];
  }

  const drafts = registry.drafts;
  const directoryNames = new Set();
  const packageNames = new Set();
  for (const draft of drafts) {
    if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
      record("system-contract-draft-registry.json contains a non-object draft entry");
      continue;
    }
    if (typeof draft.directoryName !== "string" || !draft.directoryName.endsWith("-draft")
      || draft.directoryName.includes("/") || draft.directoryName.includes("\\")) {
      record("system-contract-draft-registry.json contains an invalid draft directoryName");
    } else if (directoryNames.has(draft.directoryName)) {
      record(`system-contract-draft-registry.json duplicates directory ${draft.directoryName}`);
    } else {
      directoryNames.add(draft.directoryName);
    }
    if (typeof draft.packageName !== "string" || !draft.packageName.startsWith("@hakimi/")
      || !draft.packageName.endsWith("-draft")) {
      record(`system-contract-draft-registry.json contains an invalid packageName for ${String(draft.directoryName)}`);
    } else if (packageNames.has(draft.packageName)) {
      record(`system-contract-draft-registry.json duplicates package ${draft.packageName}`);
    } else {
      packageNames.add(draft.packageName);
    }
    if (!supportedDraftKinds.has(draft.kind)) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} unsupported kind ${String(draft.kind)}`);
    }
    if (!supportedDraftPresence.has(draft.presence)) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} unsupported presence ${String(draft.presence)}`);
    }
    if (typeof draft.systemId !== "string" || draft.systemId.length === 0) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} an invalid systemId`);
    }
    if (!draft.dependencies || typeof draft.dependencies !== "object" || Array.isArray(draft.dependencies)
      || Object.entries(draft.dependencies).some(([name, version]) => !name || typeof version !== "string" || !version)) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} invalid dependencies`);
    }
    if (!Array.isArray(draft.allowedBareImports)
      || draft.allowedBareImports.some((specifier) => typeof specifier !== "string" || specifier.length === 0)
      || new Set(draft.allowedBareImports).size !== draft.allowedBareImports.length) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} invalid allowedBareImports`);
    }
    if (!Array.isArray(draft.crossDraftEdges) || !Array.isArray(draft.specialChecks)
      || !Array.isArray(draft.lockClosures)) {
      record(`system-contract-draft-registry.json gives ${String(draft.packageName)} invalid policy arrays`);
      continue;
    }
    for (const edge of draft.crossDraftEdges) {
      if (!edge || typeof edge !== "object" || !isSafeRegistryRelativePath(edge.from)
        || typeof edge.toPackage !== "string" || !isSafeRegistryRelativePath(edge.to)) {
        record(`system-contract-draft-registry.json gives ${String(draft.packageName)} an invalid cross-draft edge`);
      }
    }
    for (const specialCheck of draft.specialChecks) {
      if (!supportedSpecialChecks.has(specialCheck)) {
        record(`system-contract-draft-registry.json gives ${String(draft.packageName)} unsupported special check ${String(specialCheck)}`);
      }
    }
    if (draft.browserPreview !== undefined) {
      const preview = draft.browserPreview;
      if (!preview || typeof preview !== "object" || Array.isArray(preview)
        || !isSafeRegistryRelativePath(preview.sourceDirectory)
        || !Array.isArray(preview.allowedBareImports)
        || !Array.isArray(preview.allowedSharedFiles)
        || preview.allowedSharedFiles.some((entry) => !isSafeRegistryRelativePath(entry))) {
        record(`system-contract-draft-registry.json gives ${String(draft.packageName)} an invalid browserPreview policy`);
      }
    }
    if (draft.packageName === "@hakimi/western-astronomy-engine-adapter-draft") {
      const expectedBrowserPolicy = {
        sourceDirectory: "src/browser-parity",
        allowedBareImports: ["astronomy-engine"],
        allowedSharedFiles: [
          "src/astronomy-engine-2.1.19-source-lock.json",
          "src/delta-t-model-lock.json"
        ]
      };
      if (canonicalJson(draft.browserPreview ?? null) !== canonicalJson(expectedBrowserPolicy)) {
        record("system-contract-draft-registry.json must keep the exact Western Browser-safe graph: astronomy-engine plus the two locked JSON identities only");
      }
      for (const requiredSpecialCheck of [
        "astronomy-engine-browser-parity-v1",
        "astronomy-engine-fresh-worker-v1"
      ]) {
        if (!draft.specialChecks.includes(requiredSpecialCheck)) {
          record(`system-contract-draft-registry.json must keep ${requiredSpecialCheck} on the Western Astronomy adapter`);
        }
      }
    }
    if (draft.packageName === "@hakimi/western-astrology-rules-preview-draft") {
      const expectedBrowserPolicy = {
        sourceDirectory: "src/browser-app",
        allowedBareImports: [],
        allowedSharedFiles: [
          "src/browser-client.ts",
          "src/rule-layer-bridge.ts"
        ]
      };
      if (canonicalJson(draft.browserPreview ?? null) !== canonicalJson(expectedBrowserPolicy)) {
        record("system-contract-draft-registry.json must keep the exact Western rules preview Browser graph: no bare imports, only the audited Worker client and rule-layer bridge");
      }
      if (!draft.specialChecks.includes("western-rules-preview-v1")) {
        record("system-contract-draft-registry.json must keep western-rules-preview-v1 on the Western rules preview draft");
      }
    }
    if (draft.packageName === "@hakimi/ziwei-workspace-artifact-draft") {
      const expectedBrowserPolicy = {
        sourceDirectory: "src/browser-app",
        allowedBareImports: [],
        allowedSharedFiles: [
          "src/browser-persistence.ts",
          "src/browser-artifact-bridge.ts",
          "src/browser-calculation-bridge.ts",
          "src/contract-bridge.ts"
        ]
      };
      if (canonicalJson(draft.browserPreview ?? null) !== canonicalJson(expectedBrowserPolicy)) {
        record("system-contract-draft-registry.json must keep the exact isolated Ziwei workspace Browser graph");
      }
      if (!draft.specialChecks.includes("ziwei-workspace-browser-app-v1")) {
        record("system-contract-draft-registry.json must keep ziwei-workspace-browser-app-v1 on the Ziwei workspace draft");
      }
      const expectedBrowserEdges = [
        ["src/browser-artifact-bridge.ts", "src/browser-preview/browser-artifact.ts"],
        ["src/browser-calculation-bridge.ts", "src/browser-preview/browser-client.ts"]
      ];
      for (const [from, to] of expectedBrowserEdges) {
        if (!draft.crossDraftEdges.some((edge) => edge.from === from
          && edge.toPackage === "@hakimi/ziwei-iztro-adapter-draft"
          && edge.to === to)) {
          record(`system-contract-draft-registry.json must keep the exact Ziwei workspace Browser bridge ${from} -> ${to}`);
        }
      }
    }
    for (const closure of draft.lockClosures) {
      if (!closure || typeof closure !== "object" || Array.isArray(closure)
        || typeof closure.dependency !== "string" || !isSafeRegistryRelativePath(closure.artifact)
        || typeof closure.version !== "string" || typeof closure.resolved !== "string"
        || typeof closure.integrity !== "string" || typeof closure.requireAllNodeRootOverrides !== "boolean") {
        record(`system-contract-draft-registry.json gives ${String(draft.packageName)} an invalid lock closure policy`);
      } else if (draft.dependencies?.[closure.dependency] !== closure.version) {
        record(`system-contract-draft-registry.json lock closure for ${closure.dependency} is not bound to ${String(draft.packageName)} dependencies`);
      } else if (closure.requiredRootOverrides !== undefined
        && (!closure.requiredRootOverrides || typeof closure.requiredRootOverrides !== "object"
          || Array.isArray(closure.requiredRootOverrides)
          || Object.entries(closure.requiredRootOverrides).some(([name, version]) =>
            !name || typeof version !== "string" || !version))) {
        record(`system-contract-draft-registry.json gives ${String(draft.packageName)} invalid requiredRootOverrides`);
      }
    }
  }

  const draftByPackage = new Map(drafts
    .filter((draft) => draft && typeof draft.packageName === "string")
    .map((draft) => [draft.packageName, draft]));
  for (const draft of drafts) {
    if (!draft || !Array.isArray(draft.crossDraftEdges)) continue;
    const edgeTargets = allowedDraftDependencies(draft);
    const declaredDraftDependencies = Object.keys(draft.dependencies ?? {})
      .filter((dependency) => draftByPackage.has(dependency))
      .sort();
    if (canonicalJson(edgeTargets) !== canonicalJson(declaredDraftDependencies)) {
      record(`system-contract-draft-registry.json must bind every draft dependency of ${String(draft.packageName)} to one exact cross-draft edge`);
    }
    if (draft.kind === "contract" && draft.crossDraftEdges.length > 0) {
      record(`system-contract-draft-registry.json contract ${String(draft.packageName)} must not depend on another draft`);
    }
    for (const edge of draft.crossDraftEdges) {
      const target = draftByPackage.get(edge?.toPackage);
      if (!target) {
        record(`system-contract-draft-registry.json edge from ${String(draft.packageName)} targets unknown draft ${String(edge?.toPackage)}`);
      } else {
        const validTargetKind = draft.kind === "adapter"
          ? target.kind === "contract"
          : (draft.kind === "differential" || draft.kind === "workspace")
            && (target.kind === "contract" || target.kind === "adapter");
        if (!validTargetKind || target.systemId !== draft.systemId) {
          record(`system-contract-draft-registry.json edge ${String(draft.packageName)} -> ${target.packageName} violates the same-system draft graph (adapter -> contract; differential|workspace -> contract|adapter)`);
        }
      }
    }
  }
  return drafts;
}

function shouldSkipDirectory(workspaceRoot, directoryPath) {
  const name = path.basename(directoryPath);
  if (name === ".git" || name === "node_modules") return true;
  const relativePath = path.relative(workspaceRoot, directoryPath);
  return !relativePath.includes(path.sep) && generatedWorkspaceDirectories.has(relativePath);
}

function listFiles(workspaceRoot, directoryPath, predicate) {
  const output = [];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(workspaceRoot, entryPath)) {
        output.push(...listFiles(workspaceRoot, entryPath, predicate));
      }
    } else if (entry.isFile() && predicate(entryPath)) {
      output.push(entryPath);
    }
  }
  return output;
}

function listExistingPaths(directoryPath) {
  const output = [directoryPath];
  for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const entryPath = path.join(directoryPath, entry.name);
    output.push(entryPath);
    if (entry.isDirectory()) output.push(...listExistingPaths(entryPath).slice(1));
  }
  return output;
}

function relative(workspaceRoot, filePath) {
  return path.relative(workspaceRoot, filePath).replaceAll("\\", "/");
}

function isSameOrWithin(parentDirectory, candidatePath) {
  const relativePath = path.relative(parentDirectory, candidatePath);
  return relativePath === ""
    || (!relativePath.startsWith(`..${path.sep}`) && relativePath !== ".." && !path.isAbsolute(relativePath));
}

function realPathIfExisting(filePath) {
  return fs.existsSync(filePath) ? fs.realpathSync(filePath) : null;
}

function maskJavaScriptComments(source) {
  const output = source.split("");
  let mode = "code";
  let templateExpressionDepth = [];

  for (let index = 0; index < source.length;) {
    const current = source[index];
    const next = source[index + 1];

    if (mode === "single" || mode === "double") {
      if (current === "\\") {
        index += 2;
      } else if ((mode === "single" && current === "'") || (mode === "double" && current === '"')) {
        mode = "code";
        index += 1;
      } else {
        index += 1;
      }
      continue;
    }

    if (mode === "template") {
      if (current === "\\") {
        index += 2;
      } else if (current === "`" ) {
        mode = "code";
        index += 1;
      } else if (current === "$" && next === "{") {
        templateExpressionDepth.push(0);
        mode = "code";
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    if (current === "'") {
      mode = "single";
      index += 1;
      continue;
    }
    if (current === '"') {
      mode = "double";
      index += 1;
      continue;
    }
    if (current === "`") {
      mode = "template";
      index += 1;
      continue;
    }
    if (current === "/" && next === "/") {
      output[index] = " ";
      output[index + 1] = " ";
      index += 2;
      while (index < source.length && source[index] !== "\n" && source[index] !== "\r") {
        output[index] = " ";
        index += 1;
      }
      continue;
    }
    if (current === "/" && next === "*") {
      output[index] = " ";
      output[index + 1] = " ";
      index += 2;
      while (index < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          output[index] = " ";
          output[index + 1] = " ";
          index += 2;
          break;
        }
        if (source[index] !== "\n" && source[index] !== "\r") output[index] = " ";
        index += 1;
      }
      continue;
    }

    if (templateExpressionDepth.length > 0) {
      const last = templateExpressionDepth.length - 1;
      if (current === "{") templateExpressionDepth[last] += 1;
      else if (current === "}") {
        if (templateExpressionDepth[last] === 0) {
          templateExpressionDepth.pop();
          mode = "template";
        } else {
          templateExpressionDepth[last] -= 1;
        }
      }
    }
    index += 1;
  }

  return output.join("");
}

function decodeModuleSpecifier(rawValue) {
  return rawValue.replace(
    /\\(?:u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|([0btnvfr'"\\]))/gu,
    (_match, bracedUnicode, unicode, hexadecimal, simpleEscape) => {
      if (bracedUnicode) return String.fromCodePoint(Number.parseInt(bracedUnicode, 16));
      if (unicode) return String.fromCharCode(Number.parseInt(unicode, 16));
      if (hexadecimal) return String.fromCharCode(Number.parseInt(hexadecimal, 16));
      return ({
        0: "\0",
        b: "\b",
        t: "\t",
        n: "\n",
        v: "\v",
        f: "\f",
        r: "\r",
        "'": "'",
        '"': '"',
        "\\": "\\"
      })[simpleEscape] ?? simpleEscape;
    }
  );
}

function skipJavaScriptTrivia(source, start, limit = source.length) {
  let index = start;
  while (index < limit) {
    if (/\s/u.test(source[index])) {
      index += 1;
      continue;
    }
    if (source[index] === "/" && source[index + 1] === "/") {
      index += 2;
      while (index < limit && source[index] !== "\n" && source[index] !== "\r") index += 1;
      continue;
    }
    if (source[index] === "/" && source[index + 1] === "*") {
      const closingIndex = source.indexOf("*/", index + 2);
      index = closingIndex < 0 || closingIndex + 2 > limit ? limit : closingIndex + 2;
      continue;
    }
    break;
  }
  return index;
}

function readQuotedLiteralEnd(source, start, quote, limit = source.length) {
  for (let index = start + 1; index < limit; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === quote) return index + 1;
    if (quote !== "`" && (source[index] === "\n" || source[index] === "\r")) return -1;
  }
  return -1;
}

function looksLikeRegexLiteralStart(source, slashIndex) {
  let previous = slashIndex - 1;
  while (previous >= 0 && /\s/u.test(source[previous])) previous -= 1;
  if (previous < 0) return true;
  if (source[previous] === "<") return false;
  if (/[A-Za-z0-9_$\])}'"`]/u.test(source[previous])) {
    let wordStart = previous;
    while (wordStart >= 0 && /[A-Za-z0-9_$]/u.test(source[wordStart])) wordStart -= 1;
    const previousWord = source.slice(wordStart + 1, previous + 1);
    return /^(?:await|case|delete|do|else|in|instanceof|new|return|throw|typeof|void|yield)$/u.test(previousWord);
  }
  return true;
}

function readRegexLiteralEnd(source, start, limit = source.length) {
  let inCharacterClass = false;
  for (let index = start + 1; index < limit; index += 1) {
    const current = source[index];
    if (current === "\\") {
      index += 1;
      continue;
    }
    if (current === "\n" || current === "\r") return -1;
    if (current === "[") inCharacterClass = true;
    else if (current === "]") inCharacterClass = false;
    else if (current === "/" && !inCharacterClass) {
      index += 1;
      while (index < limit && /[A-Za-z]/u.test(source[index])) index += 1;
      return index;
    }
  }
  return -1;
}

function findMatchingJavaScriptDelimiter(source, openingIndex, limit = source.length) {
  const expectedClosing = { "(": ")", "[": "]", "{": "}" };
  const closingDelimiters = new Set(Object.values(expectedClosing));
  const stack = [expectedClosing[source[openingIndex]]];
  if (!stack[0]) return -1;

  for (let index = openingIndex + 1; index < limit; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (current === "'" || current === '"') {
      const end = readQuotedLiteralEnd(source, index, current, limit);
      if (end < 0) return -1;
      index = end - 1;
      continue;
    }
    if (current === "`") {
      const end = readTemplateLiteralEnd(source, index, limit);
      if (end < 0) return -1;
      index = end - 1;
      continue;
    }
    if (current === "/" && next === "/") {
      index += 2;
      while (index < limit && source[index] !== "\n" && source[index] !== "\r") index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      const closingIndex = source.indexOf("*/", index + 2);
      if (closingIndex < 0 || closingIndex + 2 > limit) return -1;
      index = closingIndex + 1;
      continue;
    }
    if (current === "/" && looksLikeRegexLiteralStart(source, index)) {
      const end = readRegexLiteralEnd(source, index, limit);
      if (end > 0) {
        index = end - 1;
        continue;
      }
    }
    if (expectedClosing[current]) {
      stack.push(expectedClosing[current]);
      continue;
    }
    if (closingDelimiters.has(current)) {
      if (current !== stack.at(-1)) return -1;
      stack.pop();
      if (stack.length === 0) return index;
    }
  }
  return -1;
}

function readTemplateLiteralEnd(source, start, limit = source.length) {
  for (let index = start + 1; index < limit; index += 1) {
    if (source[index] === "\\") {
      index += 1;
      continue;
    }
    if (source[index] === "`") return index + 1;
    if (source[index] === "$" && source[index + 1] === "{") {
      const expressionEnd = findMatchingJavaScriptDelimiter(source, index + 1, limit);
      if (expressionEnd < 0) return -1;
      index = expressionEnd;
    }
  }
  return -1;
}

function maskJavaScriptNonCode(source) {
  const withoutComments = maskJavaScriptComments(source);
  const output = withoutComments.split("");
  let mode = "code";
  const templateExpressionDepth = [];
  const blank = (index) => {
    if (output[index] !== "\n" && output[index] !== "\r") output[index] = " ";
  };

  for (let index = 0; index < withoutComments.length;) {
    const current = withoutComments[index];
    const next = withoutComments[index + 1];
    if (mode === "single" || mode === "double") {
      blank(index);
      if (current === "\\") {
        blank(index + 1);
        index += 2;
      } else if ((mode === "single" && current === "'") || (mode === "double" && current === '"')) {
        mode = "code";
        index += 1;
      } else {
        index += 1;
      }
      continue;
    }
    if (mode === "template") {
      blank(index);
      if (current === "\\") {
        blank(index + 1);
        index += 2;
      } else if (current === "`") {
        mode = "code";
        index += 1;
      } else if (current === "$" && next === "{") {
        blank(index + 1);
        templateExpressionDepth.push(0);
        mode = "code";
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }
    if (current === "'") {
      blank(index);
      mode = "single";
      index += 1;
      continue;
    }
    if (current === '"') {
      blank(index);
      mode = "double";
      index += 1;
      continue;
    }
    if (current === "`") {
      blank(index);
      mode = "template";
      index += 1;
      continue;
    }
    if (current === "/" && looksLikeRegexLiteralStart(withoutComments, index)) {
      const end = readRegexLiteralEnd(withoutComments, index);
      if (end > 0) {
        for (let cursor = index; cursor < end; cursor += 1) blank(cursor);
        index = end;
        continue;
      }
    }
    if (templateExpressionDepth.length > 0) {
      const last = templateExpressionDepth.length - 1;
      if (current === "{") templateExpressionDepth[last] += 1;
      else if (current === "}") {
        if (templateExpressionDepth[last] === 0) {
          blank(index);
          templateExpressionDepth.pop();
          mode = "template";
        } else {
          templateExpressionDepth[last] -= 1;
        }
      }
    }
    index += 1;
  }
  return output.join("");
}

function splitTopLevelArguments(source, start, end) {
  const ranges = [];
  let argumentStart = start;
  for (let index = start; index < end; index += 1) {
    const current = source[index];
    const next = source[index + 1];
    if (current === "'" || current === '"') {
      const literalEnd = readQuotedLiteralEnd(source, index, current, end);
      if (literalEnd < 0) return null;
      index = literalEnd - 1;
      continue;
    }
    if (current === "`") {
      const literalEnd = readTemplateLiteralEnd(source, index, end);
      if (literalEnd < 0) return null;
      index = literalEnd - 1;
      continue;
    }
    if (current === "/" && next === "/") {
      index += 2;
      while (index < end && source[index] !== "\n" && source[index] !== "\r") index += 1;
      continue;
    }
    if (current === "/" && next === "*") {
      const closingIndex = source.indexOf("*/", index + 2);
      if (closingIndex < 0 || closingIndex + 2 > end) return null;
      index = closingIndex + 1;
      continue;
    }
    if (current === "/" && looksLikeRegexLiteralStart(source, index)) {
      const regexEnd = readRegexLiteralEnd(source, index, end);
      if (regexEnd > 0) {
        index = regexEnd - 1;
        continue;
      }
    }
    if (current === "(" || current === "[" || current === "{") {
      const nestedEnd = findMatchingJavaScriptDelimiter(source, index, end);
      if (nestedEnd < 0) return null;
      index = nestedEnd;
      continue;
    }
    if (current === ",") {
      ranges.push([argumentStart, index]);
      argumentStart = index + 1;
    }
  }
  ranges.push([argumentStart, end]);
  return ranges;
}

function staticModuleLiteral(source, start, end) {
  let index = skipJavaScriptTrivia(source, start, end);
  if (index >= end || !["'", '"', "`"].includes(source[index])) return null;
  const quote = source[index];
  const literalStart = index;
  let computedTemplate = false;
  if (quote === "`") {
    for (let cursor = index + 1; cursor < end; cursor += 1) {
      if (source[cursor] === "\\") {
        cursor += 1;
      } else if (source[cursor] === "$" && source[cursor + 1] === "{") {
        computedTemplate = true;
        break;
      } else if (source[cursor] === "`") {
        break;
      }
    }
  }
  const literalEnd = quote === "`"
    ? readTemplateLiteralEnd(source, index, end)
    : readQuotedLiteralEnd(source, index, quote, end);
  if (literalEnd < 0 || computedTemplate) return null;
  index = skipJavaScriptTrivia(source, literalEnd, end);
  if (index !== end) return null;
  return decodeModuleSpecifier(source.slice(literalStart + 1, literalEnd - 1));
}

function scanModuleLoadCalls(source) {
  const withoutComments = maskJavaScriptComments(source);
  const codeMask = maskJavaScriptNonCode(source);
  const calls = [];
  for (const match of codeMask.matchAll(/\b(?:importScripts|require|import)\b/gu)) {
    const identifier = match[0];
    let cursor = match.index + identifier.length;
    while (/\s/u.test(codeMask[cursor] ?? "")) cursor += 1;
    let kind = identifier === "import" ? "dynamic import" : identifier;
    if (identifier === "import" && codeMask[cursor] !== "(") continue;
    if (identifier === "require") {
      if (codeMask.slice(cursor, cursor + 2) === "?.") cursor += 2;
      if (codeMask[cursor] === ".") cursor += 1;
      while (/\s/u.test(codeMask[cursor] ?? "")) cursor += 1;
      if (codeMask.slice(cursor, cursor + 7) === "resolve"
        && !/[A-Za-z0-9_$]/u.test(codeMask[cursor + 7] ?? "")) {
        kind = "require.resolve";
        cursor += 7;
        while (/\s/u.test(codeMask[cursor] ?? "")) cursor += 1;
        if (codeMask.slice(cursor, cursor + 2) === "?.") cursor += 2;
        while (/\s/u.test(codeMask[cursor] ?? "")) cursor += 1;
      }
    }
    if (codeMask[cursor] !== "(") continue;
    const closingIndex = findMatchingJavaScriptDelimiter(withoutComments, cursor);
    if (closingIndex < 0) {
      calls.push({ kind, nonLiteral: true, specifiers: [] });
      continue;
    }
    const argumentRanges = splitTopLevelArguments(withoutComments, cursor + 1, closingIndex);
    if (!argumentRanges) {
      calls.push({ kind, nonLiteral: true, specifiers: [] });
      continue;
    }
    const moduleArgumentRanges = kind === "importScripts" ? argumentRanges : argumentRanges.slice(0, 1);
    const specifiers = moduleArgumentRanges.map(([start, end]) => staticModuleLiteral(source, start, end));
    calls.push({
      kind,
      nonLiteral: specifiers.length === 0 || specifiers.some((specifier) => specifier === null),
      specifiers: specifiers.filter((specifier) => specifier !== null)
    });
  }
  return calls;
}

function extractModuleSpecifiers(source, moduleLoadCalls = scanModuleLoadCalls(source)) {
  const withoutComments = maskJavaScriptComments(source);
  const specifiers = [];
  const pattern = /(?:\bfrom\s*|\bimport\s*)(["'`])((?:\\.|(?!\1)[^\\\r\n$])*)\1/gu;
  for (const match of withoutComments.matchAll(pattern)) {
    specifiers.push(decodeModuleSpecifier(match[2]));
  }
  for (const call of moduleLoadCalls) specifiers.push(...call.specifiers);
  const referencePattern = /^\s*\/\/\/\s*<reference\s+(?:types|path)=["']([^"']+)["']/gmu;
  for (const match of source.matchAll(referencePattern)) specifiers.push(match[1]);
  return specifiers;
}

function htmlAttribute(attributes, name) {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:(["'])(.*?)\\1|([^\\s"'=<>\u0060]+))`, "iu").exec(attributes);
  return match?.[2] ?? match?.[3] ?? null;
}

function extractHtmlModuleSpecifiers(source) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/gu, (comment) => comment.replace(/[^\r\n]/gu, " "));
  const specifiers = [];
  const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/giu;
  for (const match of withoutComments.matchAll(scriptPattern)) {
    const attributes = match[1];
    const sourceAttribute = htmlAttribute(attributes, "src");
    if (sourceAttribute) specifiers.push(sourceAttribute);
    if ((htmlAttribute(attributes, "type") ?? "").trim().toLowerCase() === "module") {
      specifiers.push(...extractModuleSpecifiers(match[2]));
    }
  }
  const linkPattern = /<link\b((?:[^>"']|"[^"]*"|'[^']*')*)>/giu;
  for (const match of withoutComments.matchAll(linkPattern)) {
    if ((htmlAttribute(match[1], "rel") ?? "").trim().toLowerCase() !== "modulepreload") continue;
    const href = htmlAttribute(match[1], "href");
    if (href) specifiers.push(href);
  }
  return specifiers;
}

function scanHtmlModuleLoadCalls(source) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/gu, (comment) => comment.replace(/[^\r\n]/gu, " "));
  const calls = [];
  const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/giu;
  for (const match of withoutComments.matchAll(scriptPattern)) {
    calls.push(...scanModuleLoadCalls(match[2]));
  }
  return calls;
}

function resolveRelativeModule(sourceFile, specifier) {
  const cleanSpecifier = specifier.split(/[?#]/u, 1)[0];
  const base = path.resolve(path.dirname(sourceFile), cleanSpecifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}.json`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
    path.join(base, "index.mjs")
  ];
  const candidate = candidates.find((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile());
  return candidate ? fs.realpathSync(candidate) : null;
}

function resolveWorkspaceModule(sourceFile, specifier) {
  if (specifier.startsWith("/")) {
    return resolveRelativeModule(sourceFile, `.${specifier}`);
  }
  return resolveRelativeModule(sourceFile, specifier);
}

function wildcardCaptures(pattern, value) {
  const pieces = pattern.split("*");
  if (pieces.length === 1) return pattern === value ? [] : null;
  const expression = `^${pieces.map((piece) => piece.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("(.*)")}$`;
  return new RegExp(expression, "u").exec(value)?.slice(1) ?? null;
}

function substituteWildcards(pattern, captures) {
  let captureIndex = 0;
  return pattern.replaceAll("*", () => captures[captureIndex++] ?? "__draft_boundary_probe__");
}

function configuredTargetPath(configFile, baseUrl, target) {
  return path.resolve(path.dirname(configFile), baseUrl ?? ".", target.split(/[?#]/u, 1)[0]);
}

function configuredTargetReachesDraft(configFile, baseUrl, aliasPattern, targetPattern, draft, draftRoot) {
  const captures = wildcardCaptures(aliasPattern, draft.packageName);
  if (captures) {
    const candidate = configuredTargetPath(configFile, baseUrl, substituteWildcards(targetPattern, captures));
    const realCandidate = realPathIfExisting(candidate) ?? candidate;
    if (isSameOrWithin(draftRoot, realCandidate)) return true;
  }
  if (!targetPattern.includes("*")) {
    const candidate = configuredTargetPath(configFile, baseUrl, targetPattern);
    const realCandidate = realPathIfExisting(candidate) ?? candidate;
    if (isSameOrWithin(draftRoot, realCandidate)) return true;
  }
  const absolutePattern = configuredTargetPath(configFile, baseUrl, targetPattern).replaceAll("\\", "/");
  const expression = `^${absolutePattern
    .split("*")
    .map((piece) => piece.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
    .join(".*")}$`;
  const flags = process.platform === "win32" ? "iu" : "u";
  const targetExpression = new RegExp(expression, flags);
  if (fs.existsSync(draftRoot)
    && listExistingPaths(draftRoot).some((candidate) => targetExpression.test(candidate.replaceAll("\\", "/")))) {
    return true;
  }
  return false;
}

function parseJsonWithComments(filePath) {
  const source = maskJavaScriptComments(fs.readFileSync(filePath, "utf8"));
  return JSON.parse(source.replace(/,\s*([}\]])/gu, "$1"));
}

function inspectTsconfigAliases(workspaceRoot, configFile, draftPackages, draftRoots, record) {
  let config;
  try {
    config = parseJsonWithComments(configFile);
  } catch (cause) {
    record(`${relative(workspaceRoot, configFile)} cannot be parsed for isolated-draft aliases: ${cause instanceof Error ? cause.message : String(cause)}`);
    return;
  }
  const paths = config.compilerOptions?.paths ?? {};
  const baseUrl = config.compilerOptions?.baseUrl;
  for (const [aliasPattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets)) continue;
    draftPackages.forEach((draft, draftIndex) => {
      const exposesDraftName = wildcardCaptures(aliasPattern, draft.packageName) !== null;
      const reachesDraft = targets.some((target) => typeof target === "string"
        && configuredTargetReachesDraft(configFile, baseUrl, aliasPattern, target, draft, draftRoots[draftIndex]));
      if (exposesDraftName || reachesDraft) {
        record(`${relative(workspaceRoot, configFile)} aliases isolated draft ${draft.packageName} through ${aliasPattern}`);
      }
    });
  }
}

function inspectAdapterBrowserPreviewBoundary(workspaceRoot, adapterRoot, adapterSourceRoot, record) {
  const previewRoot = path.join(adapterRoot, "browser-preview");
  const viteConfigPath = path.join(adapterRoot, "vite.browser-preview.config.mjs");
  const snapshotEmitterPath = path.join(previewRoot, "emit-rule-snapshot.mjs");
  const previewHtmlPath = path.join(previewRoot, "index.html");
  const previewTsconfigPath = path.join(adapterRoot, "tsconfig.browser-preview.json");
  const expectedEmitterTarget = path.join(adapterSourceRoot, "index.ts");
  const expectedHtmlTarget = path.join(adapterSourceRoot, "browser-preview", "main.ts");
  const browserWorkerPath = path.join(adapterSourceRoot, "browser-preview", "browser-worker.ts");
  const browserClientPath = path.join(adapterSourceRoot, "browser-preview", "browser-client.ts");
  const browserMainPath = path.join(adapterSourceRoot, "browser-preview", "main.ts");
  const snapshotSentinelPath = path.join(adapterSourceRoot, "browser-preview", "generated-rule-snapshot.ts");
  const sourceIdentitySentinelPath = path.join(
    adapterSourceRoot,
    "browser-preview",
    "generated-browser-source-identity.ts"
  );
  const browserSourceGraphRelativePaths = [
    "src/browser-preview/browser-artifact.ts",
    "src/browser-preview/browser-client.ts",
    "src/browser-preview/browser-protocol.ts",
    "src/browser-preview/browser-worker.ts",
    "src/browser-preview/display-projection.ts",
    "src/browser-preview/main-response-gate.ts",
    "src/browser-preview/main.ts",
    "src/contract-bridge.ts",
    "src/iztro-2.5.8-lock-closure.json"
  ];
  const browserSourceGraphPaths = browserSourceGraphRelativePaths.map((relativePath) =>
    path.join(adapterRoot, ...relativePath.split("/")));
  const allowedConfigBareImports = new Set([
    "node:child_process",
    "node:crypto",
    "node:fs",
    "node:path",
    "node:url"
  ]);

  for (const requiredPath of [
    viteConfigPath,
    snapshotEmitterPath,
    previewHtmlPath,
    previewTsconfigPath,
    expectedHtmlTarget,
    browserWorkerPath,
    browserClientPath,
    snapshotSentinelPath,
    sourceIdentitySentinelPath,
    ...browserSourceGraphPaths
  ]) {
    if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
      record(`${relative(workspaceRoot, requiredPath)} is required by the isolated browser-preview boundary`);
    }
  }
  if (![viteConfigPath, snapshotEmitterPath, previewHtmlPath, previewTsconfigPath, expectedHtmlTarget,
    browserWorkerPath, browserClientPath, snapshotSentinelPath, sourceIdentitySentinelPath]
    .every((entry) => fs.existsSync(entry))) {
    return;
  }

  const previewTsconfig = parseJsonWithComments(previewTsconfigPath);
  if (JSON.stringify(previewTsconfig.include) !== JSON.stringify(["src/browser-preview/**/*.ts"])
    || canonicalJson(previewTsconfig.compilerOptions?.paths ?? null) !== canonicalJson({})) {
    record(`${relative(workspaceRoot, previewTsconfigPath)} must typecheck only the audited browser-preview source with no aliases`);
  }

  const outerExecutableFiles = listFiles(workspaceRoot, previewRoot, (filePath) => codeFilePattern.test(filePath));
  for (const executableFile of outerExecutableFiles) {
    if (fs.realpathSync(executableFile) !== fs.realpathSync(snapshotEmitterPath)) {
      record(`${relative(workspaceRoot, executableFile)} is executable browser-preview code outside the audited adapter src directory`);
    }
  }

  const configSource = fs.readFileSync(viteConfigPath, "utf8");
  if (!configSource.includes("generated-rule-snapshot.ts")
    || !configSource.includes("generated-browser-source-identity.ts")
    || !configSource.includes("\\0hakimi:ziwei-browser-preview-source-identity")
    || !configSource.includes("browserWorkerModule")
    || !configSource.includes("browserClientModule")
    || !configSource.includes("createHash(\"sha256\")")
    || !configSource.includes("readFileSync")
    || !/worker\s*:\s*\{[\s\S]*?plugins\s*:/u.test(maskJavaScriptComments(configSource))) {
    record(`${relative(workspaceRoot, viteConfigPath)} must inject the fixed rule snapshot and Browser source identity through the dedicated main/Worker plugin chains`);
  }
  for (const sourcePath of browserSourceGraphRelativePaths) {
    if (!configSource.includes(`\"${sourcePath}\"`)) {
      record(`${relative(workspaceRoot, viteConfigPath)} Browser source graph omits ${sourcePath}`);
    }
  }
  for (const specifier of extractModuleSpecifiers(configSource)) {
    if (allowedConfigBareImports.has(specifier)) continue;
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
      record(`${relative(workspaceRoot, viteConfigPath)} imports forbidden module ${specifier}`);
      continue;
    }
    const resolved = resolveRelativeModule(viteConfigPath, specifier);
    if (!resolved) {
      record(`${relative(workspaceRoot, viteConfigPath)} has unresolved relative import ${specifier}`);
    } else if (!isSameOrWithin(adapterRoot, resolved)) {
      record(`${relative(workspaceRoot, viteConfigPath)} escapes its isolated adapter directory through ${specifier}`);
    }
  }

  const emitterSource = fs.readFileSync(snapshotEmitterPath, "utf8");
  const emitterSpecifiers = extractModuleSpecifiers(emitterSource);
  if (emitterSpecifiers.length !== 1) {
    record(`${relative(workspaceRoot, snapshotEmitterPath)} must import only the fixed adapter snapshot entry`);
  }
  for (const specifier of emitterSpecifiers) {
    if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
      record(`${relative(workspaceRoot, snapshotEmitterPath)} imports forbidden module ${specifier}`);
      continue;
    }
    const resolved = resolveRelativeModule(snapshotEmitterPath, specifier);
    if (!resolved) {
      record(`${relative(workspaceRoot, snapshotEmitterPath)} has unresolved relative import ${specifier}`);
    } else if (resolved !== expectedEmitterTarget) {
      record(`${relative(workspaceRoot, snapshotEmitterPath)} may import only ${relative(workspaceRoot, expectedEmitterTarget)}`);
    }
  }

  const htmlSource = fs.readFileSync(previewHtmlPath, "utf8");
  if (!/http-equiv=["']Content-Security-Policy["']/iu.test(htmlSource)) {
    record(`${relative(workspaceRoot, previewHtmlPath)} must keep a same-origin Content-Security-Policy`);
  }
  const htmlSpecifiers = extractHtmlModuleSpecifiers(htmlSource);
  if (htmlSpecifiers.length !== 1) {
    record(`${relative(workspaceRoot, previewHtmlPath)} must expose exactly one fixed module entry`);
  }
  for (const specifier of htmlSpecifiers) {
    const resolved = specifier.startsWith("./") || specifier.startsWith("../")
      ? resolveRelativeModule(previewHtmlPath, specifier)
      : null;
    if (resolved !== expectedHtmlTarget) {
      record(`${relative(workspaceRoot, previewHtmlPath)} may load only ${relative(workspaceRoot, expectedHtmlTarget)}`);
    }
  }

  const workerSpecifiers = extractModuleSpecifiers(fs.readFileSync(browserWorkerPath, "utf8"));
  if (!workerSpecifiers.includes("./generated-rule-snapshot.ts")) {
    record(`${relative(workspaceRoot, browserWorkerPath)} must import the fixed generated snapshot sentinel`);
  }
  const sentinelSpecifiers = extractModuleSpecifiers(fs.readFileSync(snapshotSentinelPath, "utf8"));
  if (JSON.stringify(sentinelSpecifiers) !== JSON.stringify(["../contract-bridge.ts"])) {
    record(`${relative(workspaceRoot, snapshotSentinelPath)} must remain a typed fail-closed sentinel with no runtime graph`);
  }
  const sourceIdentitySentinelSource = fs.readFileSync(sourceIdentitySentinelPath, "utf8");
  const sourceIdentitySentinelSpecifiers = extractModuleSpecifiers(sourceIdentitySentinelSource);
  if (JSON.stringify(sourceIdentitySentinelSpecifiers) !== JSON.stringify(["./browser-artifact.ts"])
    || !sourceIdentitySentinelSource.includes("throw new Error")) {
    record(`${relative(workspaceRoot, sourceIdentitySentinelPath)} must remain a typed fail-closed Browser source-identity sentinel`);
  }
  const sourceIdentitySpecifier = "./generated-browser-source-identity.ts";
  if (!workerSpecifiers.includes(sourceIdentitySpecifier)
    || !extractModuleSpecifiers(fs.readFileSync(browserClientPath, "utf8")).includes(sourceIdentitySpecifier)) {
    record(`${relative(workspaceRoot, adapterSourceRoot)} must bind the injected Browser source identity in both reusable client and fresh Worker graphs`);
  }
}

function inspectZiweiWorkspaceBrowserAppBoundary(
  workspaceRoot,
  workspacePackageRoot,
  workspaceSourceRoot,
  record
) {
  const appRoot = path.join(workspacePackageRoot, "browser-app");
  const htmlPath = path.join(appRoot, "index.html");
  const mainPath = path.join(workspaceSourceRoot, "browser-app", "main.ts");
  const stylesPath = path.join(workspaceSourceRoot, "browser-app", "styles.css");
  const persistencePath = path.join(workspaceSourceRoot, "browser-persistence.ts");
  const artifactBridgePath = path.join(workspaceSourceRoot, "browser-artifact-bridge.ts");
  const calculationBridgePath = path.join(workspaceSourceRoot, "browser-calculation-bridge.ts");
  const contractBridgePath = path.join(workspaceSourceRoot, "contract-bridge.ts");
  const viteConfigPath = path.join(workspacePackageRoot, "vite.browser-app.config.mjs");
  const tsconfigPath = path.join(workspacePackageRoot, "tsconfig.browser-app.json");
  const adapterRoot = path.join(workspaceRoot, "packages", "ziwei-iztro-adapter-draft");
  const adapterConfigPath = path.join(adapterRoot, "vite.browser-preview.config.mjs");
  const adapterClientPath = path.join(adapterRoot, "src", "browser-preview", "browser-client.ts");
  const adapterArtifactPath = path.join(adapterRoot, "src", "browser-preview", "browser-artifact.ts");

  for (const requiredPath of [
    htmlPath,
    mainPath,
    stylesPath,
    persistencePath,
    artifactBridgePath,
    calculationBridgePath,
    contractBridgePath,
    viteConfigPath,
    tsconfigPath,
    adapterConfigPath,
    adapterClientPath,
    adapterArtifactPath
  ]) {
    if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
      record(`${relative(workspaceRoot, requiredPath)} is required by the isolated Ziwei workspace Browser boundary`);
    }
  }
  if (![htmlPath, mainPath, stylesPath, persistencePath, artifactBridgePath,
    calculationBridgePath, contractBridgePath, viteConfigPath, tsconfigPath,
    adapterConfigPath, adapterClientPath, adapterArtifactPath]
    .every((entry) => fs.existsSync(entry))) {
    return;
  }

  const htmlSource = fs.readFileSync(htmlPath, "utf8");
  if (!/http-equiv=["']Content-Security-Policy["']/iu.test(htmlSource)
    || !/default-src 'none'/u.test(htmlSource)
    || !/worker-src 'self'/u.test(htmlSource)
    || !/connect-src 'none'/u.test(htmlSource)
    || !/form-action 'none'/u.test(htmlSource)) {
    record(`${relative(workspaceRoot, htmlPath)} must keep the fixed offline, same-origin Content-Security-Policy`);
  }
  const htmlSpecifiers = extractHtmlModuleSpecifiers(htmlSource);
  const expectedHtmlTarget = realPathIfExisting(mainPath) ?? mainPath;
  if (htmlSpecifiers.length !== 1
    || resolveRelativeModule(htmlPath, htmlSpecifiers[0] ?? "") !== expectedHtmlTarget) {
    record(`${relative(workspaceRoot, htmlPath)} may load only ${relative(workspaceRoot, mainPath)}`);
  }

  const tsconfig = parseJsonWithComments(tsconfigPath);
  if (JSON.stringify(tsconfig.include) !== JSON.stringify(["src/browser-app/**/*.ts"])
    || canonicalJson(tsconfig.compilerOptions?.paths ?? null) !== canonicalJson({})
    || canonicalJson(tsconfig.compilerOptions?.types ?? null) !== canonicalJson(["vite/client"])
    || !Array.isArray(tsconfig.compilerOptions?.lib)
    || !tsconfig.compilerOptions.lib.includes("DOM")
    || !tsconfig.compilerOptions.lib.includes("WebWorker")) {
    record(`${relative(workspaceRoot, tsconfigPath)} must typecheck only the audited Browser app with DOM/Worker types and no aliases`);
  }

  const configSource = fs.readFileSync(viteConfigPath, "utf8");
  const configSpecifiers = extractModuleSpecifiers(configSource);
  const allowedBareImports = new Set(["node:path", "node:url"]);
  for (const specifier of configSpecifiers) {
    if (allowedBareImports.has(specifier)) continue;
    const resolved = specifier.startsWith("./") || specifier.startsWith("../")
      ? resolveRelativeModule(viteConfigPath, specifier)
      : null;
    if (resolved !== (realPathIfExisting(adapterConfigPath) ?? adapterConfigPath)) {
      record(`${relative(workspaceRoot, viteConfigPath)} imports forbidden module ${specifier}`);
    }
  }
  if (!configSpecifiers.includes("../ziwei-iztro-adapter-draft/vite.browser-preview.config.mjs")
    || !configSource.includes("adapterBrowserPreviewConfig.plugins")
    || !configSource.includes("adapterBrowserPreviewConfig.worker")
    || !configSource.includes("const appRoot = path.join(packageRoot, \"browser-app\")")
    || !configSource.includes("path.join(packageRoot, \"dist\", \"browser-app\")")
    || /\balias\s*:/u.test(maskJavaScriptComments(configSource))) {
    record(`${relative(workspaceRoot, viteConfigPath)} must reuse the audited adapter main/Worker injection chain with no aliases`);
  }

  const mainSource = fs.readFileSync(mainPath, "utf8");
  if (/\bnew\s+Worker\s*\(/u.test(maskJavaScriptComments(mainSource))
    || /indexedDB\s*\.\s*open\s*\(/u.test(maskJavaScriptComments(mainSource))) {
    record(`${relative(workspaceRoot, mainPath)} must use the audited calculation bridge and Repository instead of direct Worker or IndexedDB writes`);
  }
  const allowedMainTargets = new Set([
    realPathIfExisting(stylesPath) ?? stylesPath,
    realPathIfExisting(persistencePath) ?? persistencePath,
    realPathIfExisting(calculationBridgePath) ?? calculationBridgePath,
    realPathIfExisting(contractBridgePath) ?? contractBridgePath
  ]);
  for (const specifier of extractModuleSpecifiers(mainSource)) {
    const resolved = specifier.startsWith("./") || specifier.startsWith("../")
      ? resolveRelativeModule(mainPath, specifier)
      : null;
    if (!resolved || !allowedMainTargets.has(resolved)) {
      record(`${relative(workspaceRoot, mainPath)} imports outside its fixed Browser app surface through ${specifier}`);
    }
  }

  const calculationSpecifiers = extractModuleSpecifiers(fs.readFileSync(calculationBridgePath, "utf8"));
  if (calculationSpecifiers.length === 0
    || calculationSpecifiers.some((specifier) =>
      resolveRelativeModule(calculationBridgePath, specifier)
        !== (realPathIfExisting(adapterClientPath) ?? adapterClientPath))) {
    record(`${relative(workspaceRoot, calculationBridgePath)} may import only the audited adapter Browser client`);
  }
  const artifactSpecifiers = extractModuleSpecifiers(fs.readFileSync(artifactBridgePath, "utf8"));
  if (artifactSpecifiers.length === 0
    || artifactSpecifiers.some((specifier) =>
      resolveRelativeModule(artifactBridgePath, specifier)
        !== (realPathIfExisting(adapterArtifactPath) ?? adapterArtifactPath))) {
    record(`${relative(workspaceRoot, artifactBridgePath)} may import only the audited Browser artifact verifier`);
  }

  const adapterClientSource = fs.readFileSync(adapterClientPath, "utf8");
  if (!adapterClientSource.includes("new Worker(new URL(\"./browser-worker.ts\", import.meta.url)")
    || !adapterClientSource.includes("requireVerifiedBrowserProbeResponse")
    || !adapterClientSource.includes("messageCount")
    || !adapterClientSource.includes("worker.terminate()")
    || !adapterClientSource.includes("15_000")) {
    record(`${relative(workspaceRoot, adapterClientPath)} must retain fresh single-request Worker, timeout, termination, and verified-response gates`);
  }

  const rootManifest = readJson(path.join(workspaceRoot, "package.json"));
  if (rootManifest.scripts?.build !== "npm run build --workspace @hakimi/web") {
    record("package.json ordinary build must remain the legacy Web workspace build, not the isolated Ziwei Browser app");
  }
}

function inspectAdapterToolScriptsBoundary(workspaceRoot, adapterRoot, adapterSourceRoot, record) {
  const scriptsRoot = path.join(adapterRoot, "scripts");
  if (!fs.existsSync(scriptsRoot)) return;
  const allowedSourceTarget = path.join(adapterSourceRoot, "official-calendar-evidence.ts");
  const scriptFiles = listFiles(workspaceRoot, scriptsRoot, (filePath) => codeFilePattern.test(filePath));
  for (const scriptFile of scriptFiles) {
    const source = fs.readFileSync(scriptFile, "utf8");
    for (const specifier of extractModuleSpecifiers(source)) {
      if (specifier === "node:fs/promises") continue;
      if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
        record(`${relative(workspaceRoot, scriptFile)} imports forbidden isolated-tool module ${specifier}`);
        continue;
      }
      const resolved = resolveRelativeModule(scriptFile, specifier);
      if (!resolved) {
        record(`${relative(workspaceRoot, scriptFile)} has unresolved relative import ${specifier}`);
      } else if (resolved !== allowedSourceTarget) {
        record(`${relative(workspaceRoot, scriptFile)} may import only ${relative(workspaceRoot, allowedSourceTarget)}`);
      }
    }
  }
}

function inspectIztroLockedWorkerImportsBoundary(workspaceRoot, adapterSourceRoot, record) {
  const workerPath = path.join(adapterSourceRoot, "node-worker-entry.mjs");
  const browserWorkerPath = path.join(adapterSourceRoot, "browser-preview", "browser-worker.ts");
  const requiredWorkerPaths = [workerPath, browserWorkerPath];
  for (const requiredWorkerPath of requiredWorkerPaths) {
    if (!fs.existsSync(requiredWorkerPath) || !fs.statSync(requiredWorkerPath).isFile()) {
      record(`${relative(workspaceRoot, requiredWorkerPath)} is required by the locked iztro Worker import boundary`);
    }
  }
  if (!requiredWorkerPaths.every((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())) {
    return;
  }
  const workerOnlySpecifiers = [
    "@babel/runtime/helpers/typeof",
    "dayjs",
    "i18next",
    "lunar-lite",
    "lunar-typescript"
  ];
  const sourceFiles = listFiles(workspaceRoot, adapterSourceRoot, (filePath) => codeFilePattern.test(filePath));
  for (const specifier of workerOnlySpecifiers) {
    const importers = sourceFiles.filter((filePath) =>
      extractModuleSpecifiers(fs.readFileSync(filePath, "utf8")).includes(specifier)
    );
    if (importers.length !== 1 || path.resolve(importers[0] ?? "") !== path.resolve(workerPath)) {
      record(`${relative(workspaceRoot, adapterSourceRoot)} may import ${specifier} only from src/node-worker-entry.mjs`);
    }
  }
  const fixedUpstreamSpecifiers = [
    "iztro",
    "iztro/lib/i18n",
    "iztro/lib/i18n/locales/zh-CN/star"
  ];
  const expectedImporters = [workerPath, browserWorkerPath].map((entry) => path.resolve(entry)).sort();
  for (const specifier of fixedUpstreamSpecifiers) {
    const importers = sourceFiles
      .filter((filePath) => extractModuleSpecifiers(fs.readFileSync(filePath, "utf8")).includes(specifier))
      .map((entry) => path.resolve(entry))
      .sort();
    if (canonicalJson(importers) !== canonicalJson(expectedImporters)) {
      record(`${relative(workspaceRoot, adapterSourceRoot)} may import ${specifier} only from src/node-worker-entry.mjs and src/browser-preview/browser-worker.ts`);
    }
  }
}

function inspectWesternRulesPreviewBoundary(workspaceRoot, packageRoot, sourceRoot, record) {
  const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/giu;
  const appRoot = path.join(packageRoot, "browser-app");
  const htmlPath = path.join(appRoot, "index.html");
  const mainPath = path.join(sourceRoot, "browser-app", "main.ts");
  const clientPath = path.join(sourceRoot, "browser-client.ts");
  const bridgePath = path.join(sourceRoot, "rule-layer-bridge.ts");
  const requiredPaths = [htmlPath, mainPath, clientPath, bridgePath];
  if (!requiredPaths.every((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())) {
    record(`${relative(workspaceRoot, packageRoot)} requires browser-app/index.html, src/browser-app/main.ts, src/browser-client.ts and src/rule-layer-bridge.ts`);
    return;
  }

  const htmlSource = fs.readFileSync(htmlPath, "utf8");
  if (!htmlSource.includes("connect-src 'none'") || !htmlSource.includes("worker-src 'self'")) {
    record(`${relative(workspaceRoot, htmlPath)} must forbid external network access and restrict workers to self`);
  }
  const scripts = [...htmlSource.matchAll(scriptPattern)];
  const htmlSpecifiers = extractHtmlModuleSpecifiers(htmlSource);
  const expectedHtmlTarget = fs.realpathSync(mainPath);
  if (scripts.length !== 1
    || (htmlAttribute(scripts[0]?.[1] ?? "", "type") ?? "").trim().toLowerCase() !== "module"
    || (scripts[0]?.[2] ?? "").trim() !== ""
    || htmlSpecifiers.length !== 1
    || resolveRelativeModule(htmlPath, htmlSpecifiers[0] ?? "") !== expectedHtmlTarget) {
    record(`${relative(workspaceRoot, htmlPath)} must expose exactly one empty inline-body module script targeting ${relative(workspaceRoot, mainPath)}`);
  }

  const mainSource = maskJavaScriptComments(fs.readFileSync(mainPath, "utf8"));
  if (!mainSource.includes('from "../browser-client.ts"')
    || !mainSource.includes('from "../rule-layer-bridge.ts"')
    || !mainSource.includes("runWesternRulesPreviewWorker(")
    || !mainSource.includes("runWesternRuleLayer(")) {
    record(`${relative(workspaceRoot, mainPath)} must use only the audited Worker client and rule-layer bridge`);
  }

  const clientSource = maskJavaScriptComments(fs.readFileSync(clientPath, "utf8"));
  if (!clientSource.includes('new Worker(new URL("../../western-astronomy-engine-adapter-draft/src/browser-parity/browser-worker.ts", import.meta.url)')
    || !clientSource.includes("worker.terminate()")
    || !clientSource.includes("messageCount")
    || !clientSource.includes("fresh_browser_worker_per_seed")
    || /\bonmessage\s*=/u.test(clientSource)) {
    record(`${relative(workspaceRoot, clientPath)} must create one fresh audited Browser Worker per request and reject reuse`);
  }

  for (const filePath of [mainPath, clientPath]) {
    const source = maskJavaScriptComments(fs.readFileSync(filePath, "utf8"));
    if (/\b(?:indexedDB|localStorage|sessionStorage|caches)\b/u.test(source)) {
      record(`${relative(workspaceRoot, filePath)} must not persist or cache any chart data`);
    }
  }

  const bridgeSource = maskJavaScriptComments(fs.readFileSync(bridgePath, "utf8"));
  if (!bridgeSource.includes("runWesternRuleLayer")) {
    record(`${relative(workspaceRoot, bridgePath)} must export only the audited rule-layer entry`);
  }
}

function inspectAstronomyEngineBrowserParityBoundary(workspaceRoot, adapterRoot, adapterSourceRoot, record) {
  const parityRoot = path.join(adapterRoot, "browser-parity");
  const paritySourceRoot = path.join(adapterSourceRoot, "browser-parity");
  const viteConfigPath = path.join(adapterRoot, "vite.browser-parity.config.mjs");
  const emitterPath = path.join(parityRoot, "emit-node-reference.mjs");
  const htmlPath = path.join(parityRoot, "index.html");
  const tsconfigPath = path.join(adapterRoot, "tsconfig.browser-parity.json");
  const hostPath = path.join(adapterSourceRoot, "index.ts");
  const seedLockPath = path.join(adapterSourceRoot, "diagnostic-seed-lock.json");
  const mainPath = path.join(paritySourceRoot, "main.ts");
  const browserWorkerPath = path.join(paritySourceRoot, "browser-worker.ts");
  const protocolPath = path.join(paritySourceRoot, "protocol.ts");
  const stableProjectionPath = path.join(paritySourceRoot, "quantized-projection.ts");
  const generatedReferencePath = path.join(paritySourceRoot, "generated-node-reference.ts");
  const sourceLockPath = path.join(adapterSourceRoot, "astronomy-engine-2.1.19-source-lock.json");
  const deltaTLockPath = path.join(adapterSourceRoot, "delta-t-model-lock.json");
  const requiredPaths = [
    viteConfigPath,
    emitterPath,
    htmlPath,
    tsconfigPath,
    hostPath,
    seedLockPath,
    mainPath,
    browserWorkerPath,
    protocolPath,
    stableProjectionPath,
    generatedReferencePath,
    sourceLockPath,
    deltaTLockPath
  ];
  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
      record(`${relative(workspaceRoot, requiredPath)} is required by the isolated Astronomy Engine Browser parity boundary`);
    }
  }
  if (!requiredPaths.every((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())) return;

  let parityTsconfig;
  try {
    parityTsconfig = parseJsonWithComments(tsconfigPath);
  } catch (cause) {
    record(`${relative(workspaceRoot, tsconfigPath)} cannot be parsed for the Browser parity boundary: ${cause instanceof Error ? cause.message : String(cause)}`);
    return;
  }
  const expectedTsconfig = {
    extends: "../../tsconfig.base.json",
    compilerOptions: {
      lib: ["ES2022", "DOM", "DOM.Iterable", "WebWorker"],
      types: ["vite/client"],
      paths: {}
    },
    include: ["src/browser-parity/**/*.ts"]
  };
  if (canonicalJson(parityTsconfig) !== canonicalJson(expectedTsconfig)) {
    record(`${relative(workspaceRoot, tsconfigPath)} must typecheck only the exact isolated Browser parity source with DOM, WebWorker, and Vite types and no aliases`);
  }

  const outerExecutableFiles = listFiles(workspaceRoot, parityRoot, (filePath) => codeFilePattern.test(filePath));
  for (const executableFile of outerExecutableFiles) {
    if (path.resolve(executableFile) !== path.resolve(emitterPath)) {
      record(`${relative(workspaceRoot, executableFile)} is executable Browser parity code outside the audited adapter src directory`);
    }
  }

  const viteSource = maskJavaScriptComments(fs.readFileSync(viteConfigPath, "utf8"));
  const expectedViteImports = [
    "node:child_process",
    "node:crypto",
    "node:fs",
    "node:path",
    "node:url"
  ];
  const viteImports = [...new Set(extractModuleSpecifiers(viteSource))].sort();
  if (canonicalJson(viteImports) !== canonicalJson(expectedViteImports)) {
    record(`${relative(workspaceRoot, viteConfigPath)} may import only the five fixed Node build utilities`);
  }
  const requiredViteMarkers = [
    'const mainModule = path.normalize(path.join(packageRoot, "src", "browser-parity", "main.ts"))',
    'const engineEsmPath = fileURLToPath(import.meta.resolve("astronomy-engine"))',
    'const sourceLockPath = path.join(packageRoot, "src", "astronomy-engine-2.1.19-source-lock.json")',
    'const deltaTLockPath = path.join(packageRoot, "src", "delta-t-model-lock.json")',
    'const generatedReferenceSpecifier = "./generated-node-reference.ts"',
    'const generatedReferenceModule = "\\0hakimi:western-browser-node-reference"',
    'name: "hakimi-western-isolated-node-reference"',
    "buildStart()",
    "verifyLockedBuildInputs();",
    "resolveId(id, importer)",
    "portablePath(importer) !== portablePath(mainModule)",
    "load(id)",
    "id !== generatedReferenceModule",
    "execFileSync(",
    '[path.join(previewRoot, "emit-node-reference.mjs")]',
    "return `export default ${generatedReferenceSource};`;",
    "plugins: [isolatedNodeReferencePlugin()]"
  ];
  if (requiredViteMarkers.some((marker) => !viteSource.includes(marker))) {
    record(`${relative(workspaceRoot, viteConfigPath)} must replace the fail-closed generated reference only for the fixed main module by replaying the fixed Node emitter`);
  }

  const emitterSource = maskJavaScriptComments(fs.readFileSync(emitterPath, "utf8"));
  const expectedEmitterImports = [
    "../src/browser-parity/quantized-projection.ts",
    "../src/diagnostic-seed-lock.json",
    "../src/index.ts",
    "node:crypto"
  ].sort();
  const emitterImports = [...new Set(extractModuleSpecifiers(emitterSource))].sort();
  if (canonicalJson(emitterImports) !== canonicalJson(expectedEmitterImports)) {
    record(`${relative(workspaceRoot, emitterPath)} may import only the fixed Node host, seed lock, stable projection, and node:crypto digest utility`);
  }
  for (const [specifier, expectedTarget] of [
    ["../src/browser-parity/quantized-projection.ts", stableProjectionPath],
    ["../src/diagnostic-seed-lock.json", seedLockPath],
    ["../src/index.ts", hostPath]
  ]) {
    const resolved = resolveRelativeModule(emitterPath, specifier);
    if (resolved !== fs.realpathSync(expectedTarget)) {
      record(`${relative(workspaceRoot, emitterPath)} must resolve ${specifier} to ${relative(workspaceRoot, expectedTarget)}`);
    }
  }
  const requiredEmitterMarkers = [
    "for (const seed of seedLock.seeds)",
    "await runWesternAstronomyUtcDiagnostic(request)",
    "envelope.diagnosticDigests.requestSha256 !== seed.requestSha256",
    "envelope.diagnosticDigests.resultSha256 !== seed.resultSha256",
    "createWesternCrossRuntimeQuantizedProjection(envelope.result)",
    'createHash("sha256")',
    "process.stdout.write(JSON.stringify("
  ];
  if (requiredEmitterMarkers.some((marker) => !emitterSource.includes(marker))) {
    record(`${relative(workspaceRoot, emitterPath)} must replay only the fixed seed lock through the fixed fresh Node host and emit its checked stable projection reference`);
  }

  const htmlSource = fs.readFileSync(htmlPath, "utf8");
  const metaPattern = /<meta\b((?:[^>"']|"[^"]*"|'[^']*')*)>/giu;
  const cspValues = [];
  for (const match of htmlSource.matchAll(metaPattern)) {
    if ((htmlAttribute(match[1], "http-equiv") ?? "").trim().toLowerCase() === "content-security-policy") {
      cspValues.push(htmlAttribute(match[1], "content"));
    }
  }
  const expectedCsp = {
    "base-uri": ["'none'"],
    "connect-src": ["'none'"],
    "default-src": ["'none'"],
    "font-src": ["'self'"],
    "form-action": ["'none'"],
    "img-src": ["'self'", "data:"],
    "object-src": ["'none'"],
    "script-src": ["'self'"],
    "style-src": ["'self'"],
    "worker-src": ["'self'"]
  };
  let actualCsp = null;
  if (cspValues.length === 1 && typeof cspValues[0] === "string") {
    const directives = {};
    let valid = true;
    for (const rawDirective of cspValues[0].split(";")) {
      const tokens = rawDirective.trim().split(/\s+/u).filter(Boolean);
      if (tokens.length === 0) continue;
      const [name, ...values] = tokens;
      if (Object.hasOwn(directives, name)) valid = false;
      directives[name] = values;
    }
    if (valid) actualCsp = directives;
  }
  if (canonicalJson(actualCsp) !== canonicalJson(expectedCsp)) {
    record(`${relative(workspaceRoot, htmlPath)} must keep the exact same-origin, no-connect Browser parity Content-Security-Policy`);
  }
  const scriptPattern = /<script\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/script\s*>/giu;
  const scripts = [...htmlSource.matchAll(scriptPattern)];
  const htmlSpecifiers = extractHtmlModuleSpecifiers(htmlSource);
  const expectedHtmlTarget = fs.realpathSync(mainPath);
  if (scripts.length !== 1
    || (htmlAttribute(scripts[0]?.[1] ?? "", "type") ?? "").trim().toLowerCase() !== "module"
    || (scripts[0]?.[2] ?? "").trim() !== ""
    || htmlSpecifiers.length !== 1
    || resolveRelativeModule(htmlPath, htmlSpecifiers[0] ?? "") !== expectedHtmlTarget) {
    record(`${relative(workspaceRoot, htmlPath)} must expose exactly one empty inline-body module script targeting ${relative(workspaceRoot, mainPath)}`);
  }

  const paritySourceFiles = listFiles(workspaceRoot, paritySourceRoot, (filePath) => codeFilePattern.test(filePath));
  const generatedReferenceImporters = paritySourceFiles.filter((filePath) =>
    extractModuleSpecifiers(fs.readFileSync(filePath, "utf8"))
      .some((specifier) => resolveRelativeModule(filePath, specifier) === fs.realpathSync(generatedReferencePath))
  ).map((entry) => path.resolve(entry));
  if (canonicalJson(generatedReferenceImporters.sort()) !== canonicalJson([path.resolve(mainPath)])) {
    record(`${relative(workspaceRoot, generatedReferencePath)} may be imported only by the fixed Browser parity main module`);
  }

  const sentinelSource = maskJavaScriptComments(fs.readFileSync(generatedReferencePath, "utf8"));
  const sentinelImports = extractModuleSpecifiers(sentinelSource);
  if (canonicalJson(sentinelImports) !== canonicalJson(["./protocol.ts"])
    || !sentinelSource.includes('import type { WesternBrowserNodeReference } from "./protocol.ts"')
    || !sentinelSource.includes("const unavailableOutsideIsolatedBuild: WesternBrowserNodeReference = null as never")
    || !sentinelSource.includes("export default unavailableOutsideIsolatedBuild")) {
    record(`${relative(workspaceRoot, generatedReferencePath)} must remain a typed fail-closed null sentinel with no embedded reference data`);
  }

  const mainSource = maskJavaScriptComments(fs.readFileSync(mainPath, "utf8"));
  if (!mainSource.includes('import nodeReference from "./generated-node-reference.ts"')
    || !mainSource.includes('new Worker(new URL("./browser-worker.ts", import.meta.url)')
    || !mainSource.includes("worker.terminate()")
    || !mainSource.includes("messageCount += 1")
    || !mainSource.includes("worker.postMessage(workerRequest)")) {
    record(`${relative(workspaceRoot, mainPath)} must create, verify, and terminate one fixed fresh Browser Worker for every locked seed`);
  }

  const stableProjectionSource = maskJavaScriptComments(fs.readFileSync(stableProjectionPath, "utf8"));
  if (canonicalJson(extractModuleSpecifiers(stableProjectionSource)) !== canonicalJson(["./protocol.ts"])
    || !stableProjectionSource.includes('"western-astronomy-cross-runtime-projection/0.1-draft"')
    || !stableProjectionSource.includes('algorithmId: "cross_runtime_quantized_projection_v1"')
    || !stableProjectionSource.includes('interpretation: "decimal_grid_half_step_not_ieee754_total_error_bound"')
    || !stableProjectionSource.includes("export function createWesternCrossRuntimeQuantizedProjection(")) {
    record(`${relative(workspaceRoot, stableProjectionPath)} must remain the one explicit cross-runtime stable projection with an honest decimal-grid interpretation`);
  }

  const browserWorkerSource = maskJavaScriptComments(fs.readFileSync(browserWorkerPath, "utf8"));
  const messageListenerCount = [...browserWorkerSource.matchAll(/\b(?:workerScope\s*\.\s*)?addEventListener\s*\(\s*["']message["']/gu)].length;
  if (messageListenerCount !== 1
    || !browserWorkerSource.includes("{ once: true }")
    || !browserWorkerSource.includes("workerScope.postMessage(response)")
    || !browserWorkerSource.includes("workerScope.close()")
    || !browserWorkerSource.includes("Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus)")
    || !browserWorkerSource.includes("for (const sentinel of deltaTLock.sentinels)")
    || !browserWorkerSource.includes("createWesternCrossRuntimeQuantizedProjection(result)")
    || /\bonmessage\s*=/u.test(browserWorkerSource)
    || /\bnew\s+(?:Shared)?Worker\s*\(/u.test(browserWorkerSource)
    || /\bsetInterval\s*\(/u.test(browserWorkerSource)) {
    record(`${relative(workspaceRoot, browserWorkerPath)} must remain a fixed single-shot Browser Worker with locked DeltaT sentinels and the shared stable projection`);
  }
}

function inspectAstronomyEngineFreshWorkerBoundary(workspaceRoot, adapterRoot, adapterSourceRoot, record) {
  const hostPath = path.join(adapterSourceRoot, "index.ts");
  const workerPath = path.join(adapterSourceRoot, "astronomy-worker-entry.mjs");
  const browserWorkerPath = path.join(adapterSourceRoot, "browser-parity", "browser-worker.ts");
  const sourceLockPath = path.join(adapterSourceRoot, "astronomy-engine-2.1.19-source-lock.json");
  const deltaTLockPath = path.join(adapterSourceRoot, "delta-t-model-lock.json");
  const requiredPaths = [hostPath, workerPath, sourceLockPath, deltaTLockPath];
  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
      record(`${relative(workspaceRoot, requiredPath)} is required by the fresh Astronomy Engine Worker boundary`);
    }
  }
  if (!requiredPaths.every((entry) => fs.existsSync(entry))) return;

  const hostSource = maskJavaScriptComments(fs.readFileSync(hostPath, "utf8"));
  if (!hostSource.includes('new URL("./astronomy-worker-entry.mjs", import.meta.url)')
    || !hostSource.includes("new NodeWorker(WORKER_ENTRY_URL")
    || !hostSource.includes('isolation: "fresh_worker_per_request"')) {
    record(`${relative(workspaceRoot, hostPath)} must create one fixed fresh Node Worker per diagnostic request`);
  }

  const workerSource = maskJavaScriptComments(fs.readFileSync(workerPath, "utf8"));
  if (!workerSource.includes("workerData")
    || !workerSource.includes("Astronomy.SetDeltaTFunction(Astronomy.DeltaT_EspenakMeeus)")
    || !workerSource.includes('await import("astronomy-engine")')) {
    record(`${relative(workspaceRoot, workerPath)} must import the locked engine only after fixing DeltaT in the fresh Worker`);
  }
  if (/\b(?:parentPort|process)\s*\.\s*on\s*\(/u.test(workerSource)
    || /\bnew\s+(?:Node)?Worker\s*\(/u.test(workerSource)) {
    record(`${relative(workspaceRoot, workerPath)} must be single-shot and must not pool, listen for reuse, or spawn nested Workers`);
  }

  const engineImporters = listFiles(workspaceRoot, adapterSourceRoot, (filePath) => codeFilePattern.test(filePath))
    .filter((filePath) => extractModuleSpecifiers(fs.readFileSync(filePath, "utf8"))
      .some((specifier) => specifier === "astronomy-engine" || specifier.startsWith("astronomy-engine/")))
    .map((entry) => path.resolve(entry))
    .sort();
  const expectedEngineImporters = [workerPath, browserWorkerPath]
    .filter((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())
    .map((entry) => path.resolve(entry))
    .sort();
  if (canonicalJson(engineImporters) !== canonicalJson(expectedEngineImporters)
    || expectedEngineImporters.length !== 2) {
    record(`${relative(workspaceRoot, adapterSourceRoot)} may import astronomy-engine only from src/astronomy-worker-entry.mjs and src/browser-parity/browser-worker.ts`);
  }

  let sourceLock;
  let deltaTLock;
  try {
    sourceLock = readJson(sourceLockPath);
    deltaTLock = readJson(deltaTLockPath);
  } catch (cause) {
    record(`fresh Astronomy Engine Worker locks cannot be parsed: ${cause instanceof Error ? cause.message : String(cause)}`);
    return;
  }
  if (sourceLock.package?.name !== "astronomy-engine"
    || sourceLock.package?.version !== "2.1.19"
    || sourceLock.license?.standaloneFilePresentInNpmTarball !== false) {
    record(`${relative(workspaceRoot, sourceLockPath)} must preserve the exact engine and honest npm license inventory`);
  }
  if (deltaTLock.modelId !== "astronomy-engine@2.1.19.DeltaT_EspenakMeeus"
    || deltaTLock.setter !== "SetDeltaTFunction(DeltaT_EspenakMeeus)"
    || !Array.isArray(deltaTLock.sentinels)
    || deltaTLock.sentinels.length < 5) {
    record(`${relative(workspaceRoot, deltaTLockPath)} must preserve the fixed Espenak-Meeus model sentinels`);
  }
}

function inspectFortelFreshWorkerBoundary(workspaceRoot, differentialSourceRoot, record) {
  const hostPath = path.join(differentialSourceRoot, "index.ts");
  const workerPath = path.join(differentialSourceRoot, "fortel-worker-entry.mjs");
  const requiredPaths = [hostPath, workerPath];
  for (const requiredPath of requiredPaths) {
    if (!fs.existsSync(requiredPath) || !fs.statSync(requiredPath).isFile()) {
      record(`${relative(workspaceRoot, requiredPath)} is required by the fresh Fortel Worker boundary`);
    }
  }

  const sourceFiles = listFiles(workspaceRoot, differentialSourceRoot, (filePath) => codeFilePattern.test(filePath));
  const upstreamImporters = sourceFiles.filter((filePath) =>
    extractModuleSpecifiers(fs.readFileSync(filePath, "utf8"))
      .some((specifier) => specifier === "fortel-ziweidoushu" || specifier.startsWith("fortel-ziweidoushu/"))
  );
  if (upstreamImporters.length !== 1 || path.resolve(upstreamImporters[0] ?? "") !== path.resolve(workerPath)) {
    record(`${relative(workspaceRoot, differentialSourceRoot)} may import fortel-ziweidoushu only from src/fortel-worker-entry.mjs`);
  }
  if (!requiredPaths.every((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile())) return;

  const hostSource = maskJavaScriptComments(fs.readFileSync(hostPath, "utf8"));
  const hostSpecifiers = extractModuleSpecifiers(hostSource);
  if (!hostSpecifiers.includes("node:worker_threads")
    || !hostSource.includes('new URL("./fortel-worker-entry.mjs", import.meta.url)')
    || !hostSource.includes("new NodeWorker(WORKER_ENTRY_URL")
    || !hostSource.includes('isolation: "fresh_worker_per_calculation"')) {
    record(`${relative(workspaceRoot, hostPath)} must create one fixed fresh Fortel Node Worker per calculation`);
  }

  const workerSource = maskJavaScriptComments(fs.readFileSync(workerPath, "utf8"));
  const workerSpecifiers = extractModuleSpecifiers(workerSource);
  if (!workerSpecifiers.includes("node:worker_threads")
    || !workerSpecifiers.includes("fortel-ziweidoushu")
    || !workerSource.includes("workerData")
    || !workerSource.includes("parentPort?.postMessage")
    || !workerSource.includes("parentPort?.close")) {
    record(`${relative(workspaceRoot, workerPath)} must keep the fixed single-shot Fortel Worker wiring`);
  }
  if (/\b(?:parentPort|process)\s*\.\s*on\s*\(/u.test(workerSource)
    || /\bnew\s+(?:Node)?Worker\s*\(/u.test(workerSource)) {
    record(`${relative(workspaceRoot, workerPath)} must not pool, listen for reuse, or spawn nested Workers`);
  }
}

function draftManifestFailures(workspaceRoot, draft, manifestPath, record) {
  const manifest = readJson(manifestPath);
  if (manifest.name !== draft.packageName) record(`${relative(workspaceRoot, manifestPath)} must keep package name ${draft.packageName}`);
  if (manifest.private !== true) record(`${relative(workspaceRoot, manifestPath)} must stay private`);
  if (!/^0\.0\.0-draft\.\d+$/u.test(manifest.version ?? "")) {
    record(`${relative(workspaceRoot, manifestPath)} must keep a 0.0.0-draft.N version`);
  }
  if (!manifest.exports || typeof manifest.exports !== "object" || Array.isArray(manifest.exports)
    || Object.keys(manifest.exports).length !== 0) {
    record(`${relative(workspaceRoot, manifestPath)} must keep an empty exports object`);
  }
  for (const field of ["main", "module", "types", "typings", "browser", "bin", "imports"]) {
    if (manifest[field] !== undefined) record(`${relative(workspaceRoot, manifestPath)} must not expose ${field}`);
  }
  if (manifest.scripts && Object.keys(manifest.scripts).length > 0) {
    record(`${relative(workspaceRoot, manifestPath)} must not declare lifecycle or package scripts`);
  }
  const metadata = manifest["x-hakimi-isolated-draft"];
  const expectedDraftDependencies = allowedDraftDependencies(draft);
  if (!metadata || metadata.schemaVersion !== 1 || metadata.kind !== draft.kind
    || metadata.systemId !== draft.systemId || metadata.productionImport !== "forbidden"
    || canonicalJson(metadata.allowedDraftDependencies) !== canonicalJson(expectedDraftDependencies)) {
    record(`${relative(workspaceRoot, manifestPath)} has stale or invalid x-hakimi-isolated-draft metadata`);
  }
  const dependencies = manifest.dependencies ?? {};
  if (JSON.stringify(Object.fromEntries(Object.entries(dependencies).sort()))
    !== JSON.stringify(Object.fromEntries(Object.entries(draft.dependencies).sort()))) {
    record(`${relative(workspaceRoot, manifestPath)} must keep its exact isolated dependency allowlist`);
  }
  for (const section of ["devDependencies", "peerDependencies", "optionalDependencies"]) {
    if (manifest[section] && Object.keys(manifest[section]).length > 0) {
      record(`${relative(workspaceRoot, manifestPath)} must not declare ${section}`);
    }
  }
  return manifest;
}

function inspectLockfile(workspaceRoot, activeDrafts, manifestsByPackage, record) {
  const lockPath = path.join(workspaceRoot, "package-lock.json");
  const lock = readJson(lockPath);
  for (const draft of activeDrafts) {
    const workspaceKey = `packages/${draft.directoryName}`;
    const linkKey = `node_modules/${draft.packageName}`;
    const workspaceEntry = lock.packages?.[workspaceKey];
    const linkEntry = lock.packages?.[linkKey];
    const expectedManifest = manifestsByPackage.get(draft.packageName);
    const expectedDependencies = Object.fromEntries(Object.entries(draft.dependencies).sort());
    const lockedDependencies = Object.fromEntries(Object.entries(workspaceEntry?.dependencies ?? {}).sort());
    if (workspaceEntry?.name !== draft.packageName
      || workspaceEntry?.version !== expectedManifest?.version
      || JSON.stringify(lockedDependencies) !== JSON.stringify(expectedDependencies)) {
      record(`package-lock.json has a stale or widened ${workspaceKey} workspace entry`);
    }
    if (linkEntry?.link !== true || linkEntry?.resolved !== workspaceKey) {
      record(`package-lock.json must keep ${linkKey} as a link to ${workspaceKey}`);
    }
    for (const closurePolicy of draft.lockClosures ?? []) {
      inspectLockClosureIdentity(workspaceRoot, lock, draft, expectedManifest, closurePolicy, record);
    }
  }
}

function inspectLockClosureIdentity(workspaceRoot, lock, draft, manifest, closurePolicy, record) {
  const draftRoot = path.join(workspaceRoot, "packages", draft.directoryName);
  const artifactPath = path.resolve(draftRoot, closurePolicy.artifact);
  if (!isSameOrWithin(draftRoot, artifactPath)) {
    record(`system-contract-draft-registry.json lock closure for ${draft.packageName} escapes its draft directory`);
    return;
  }
  let closure;
  try {
    closure = readJson(artifactPath);
  } catch (cause) {
    record(`${relative(workspaceRoot, artifactPath)} cannot be parsed: ${cause instanceof Error ? cause.message : String(cause)}`);
    return;
  }
  if (!closure || typeof closure !== "object" || Array.isArray(closure)
    || closure.schemaVersion !== 1
    || closure.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || closure.lockfileVersion !== 3
    || !closure.entryPackage || typeof closure.entryPackage !== "object"
    || !closure.rootOverrides || typeof closure.rootOverrides !== "object"
    || !Array.isArray(closure.nodes)) {
    record(`${relative(workspaceRoot, artifactPath)} has an invalid package-lock closure envelope`);
    return;
  }
  if (lock.lockfileVersion !== closure.lockfileVersion) {
    record(`package-lock.json lockfileVersion does not match the frozen ${closurePolicy.dependency} closure identity`);
  }
  const entryPackage = closure.entryPackage;
  const expectedEntryPath = `packages/${draft.directoryName}`;
  if (entryPackage.packagePath !== expectedEntryPath
    || entryPackage.name !== manifest?.name
    || entryPackage.version !== manifest?.version
    || !Array.isArray(entryPackage.dependencies)) {
    record(`${relative(workspaceRoot, artifactPath)} has a stale isolated-draft entry package`);
    return;
  }
  if (entryPackage.dependencies.length !== 1
    || entryPackage.dependencies[0]?.name !== closurePolicy.dependency
    || entryPackage.dependencies[0]?.requested !== draft.dependencies[closurePolicy.dependency]
    || entryPackage.dependencies[0]?.resolvedVersion !== closurePolicy.version) {
    record(`${relative(workspaceRoot, artifactPath)} must bind exactly the registered ${closurePolicy.dependency}@${closurePolicy.version} entry edge`);
  }
  const entryLock = lock.packages?.[entryPackage.packagePath];
  if (!entryLock || entryLock.name !== entryPackage.name || entryLock.version !== entryPackage.version) {
    record(`package-lock.json does not keep ${draft.packageName} bound by the frozen ${closurePolicy.dependency} closure identity`);
  } else {
    inspectResolvedClosureEdges(lock.packages ?? {}, entryPackage.packagePath, entryLock.dependencies ?? {}, entryPackage.dependencies, record);
  }

  const nodePaths = closure.nodes.map((node) => node?.packagePath);
  if (new Set(nodePaths).size !== closure.nodes.length
    || JSON.stringify(nodePaths) !== JSON.stringify([...nodePaths].sort())) {
    record(`${relative(workspaceRoot, artifactPath)} must keep unique closure nodes sorted by package path`);
    return;
  }
  const nodeByPath = new Map(closure.nodes.map((node) => [node.packagePath, node]));
  const allEdges = [...entryPackage.dependencies];
  for (const node of closure.nodes) {
    if (!node || typeof node !== "object" || Array.isArray(node)
      || typeof node.packagePath !== "string"
      || typeof node.name !== "string"
      || typeof node.version !== "string"
      || typeof node.resolved !== "string"
      || typeof node.integrity !== "string"
      || !Array.isArray(node.dependencies)) {
      record(`${relative(workspaceRoot, artifactPath)} contains an incomplete closure node`);
      continue;
    }
    const lockNode = lock.packages?.[node.packagePath];
    if (!lockNode
      || lockNode.version !== node.version
      || lockNode.resolved !== node.resolved
      || lockNode.integrity !== node.integrity) {
      record(`package-lock.json does not keep frozen version/resolved/integrity for ${node.packagePath}`);
      continue;
    }
    const expectedRequested = Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested]));
    if (canonicalJson(lockNode.dependencies ?? {}) !== canonicalJson(expectedRequested)) {
      record(`package-lock.json does not keep exact requested edges for ${node.packagePath}`);
    }
    inspectResolvedClosureEdges(lock.packages ?? {}, node.packagePath, lockNode.dependencies ?? {}, node.dependencies, record);
    allEdges.push(...node.dependencies);
  }
  for (const edge of allEdges) {
    const target = nodeByPath.get(edge?.resolvedPackagePath);
    if (!edge || typeof edge !== "object"
      || typeof edge.name !== "string"
      || typeof edge.requested !== "string"
      || typeof edge.resolvedPackagePath !== "string"
      || typeof edge.resolvedVersion !== "string"
      || !target || target.name !== edge.name || target.version !== edge.resolvedVersion) {
      record(`${relative(workspaceRoot, artifactPath)} contains an invalid exact resolved edge`);
    }
  }

  const entryEdge = entryPackage.dependencies[0];
  const entryNode = nodeByPath.get(entryEdge?.resolvedPackagePath);
  if (!entryNode || entryNode.name !== closurePolicy.dependency
    || entryNode.version !== closurePolicy.version
    || entryNode.resolved !== closurePolicy.resolved
    || entryNode.integrity !== closurePolicy.integrity) {
    record(`${relative(workspaceRoot, artifactPath)} does not match the registered ${closurePolicy.dependency} version/resolved/integrity anchor`);
  }

  const reachablePaths = new Set();
  const pendingPaths = entryPackage.dependencies.map((edge) => edge?.resolvedPackagePath);
  while (pendingPaths.length > 0) {
    const packagePath = pendingPaths.pop();
    if (typeof packagePath !== "string" || reachablePaths.has(packagePath)) continue;
    reachablePaths.add(packagePath);
    const node = nodeByPath.get(packagePath);
    if (!node || !Array.isArray(node.dependencies)) continue;
    pendingPaths.push(...node.dependencies.map((edge) => edge?.resolvedPackagePath));
  }
  if (canonicalJson([...reachablePaths].sort()) !== canonicalJson([...nodeByPath.keys()].sort())) {
    record(`${relative(workspaceRoot, artifactPath)} nodes must exactly equal the dependency closure reachable from its registered entry edge`);
  }

  if (closurePolicy.requireAllNodeRootOverrides) {
    const nodeNames = closure.nodes.map((node) => node?.name);
    if (new Set(nodeNames).size !== closure.nodes.length) {
      record(`${relative(workspaceRoot, artifactPath)} cannot require one root override for duplicate package names`);
    } else {
      const expectedOverrides = Object.fromEntries(closure.nodes.map((node) => [node.name, node.version]));
      if (canonicalJson(closure.rootOverrides) !== canonicalJson(expectedOverrides)) {
        record(`${relative(workspaceRoot, artifactPath)} rootOverrides must exactly pin every closure node`);
      }
    }
  } else {
    for (const [packageName, version] of Object.entries(closure.rootOverrides)) {
      if (!closure.nodes.some((node) => node?.name === packageName && node?.version === version)) {
        record(`${relative(workspaceRoot, artifactPath)} rootOverrides contains an entry outside its frozen closure`);
      }
    }
  }
  for (const [packageName, version] of Object.entries(closurePolicy.requiredRootOverrides ?? {})) {
    if (closure.rootOverrides[packageName] !== version) {
      record(`${relative(workspaceRoot, artifactPath)} must keep required root override ${packageName}@${version}`);
    }
  }
  const rootOverrides = readJson(path.join(workspaceRoot, "package.json")).overrides ?? {};
  for (const [packageName, version] of Object.entries(closure.rootOverrides)) {
    if (rootOverrides[packageName] !== version) {
      record(`package.json root overrides must freeze ${packageName}@${version}`);
    }
  }
}

function inspectResolvedClosureEdges(packages, fromPackagePath, requestedDependencies, edges, record) {
  for (const edge of edges) {
    if (!edge || typeof edge !== "object") {
      record(`Frozen package-lock closure has an invalid dependency edge from ${fromPackagePath}`);
      continue;
    }
    if (requestedDependencies[edge.name] !== edge.requested) {
      record(`package-lock.json no longer requests ${edge.name}@${edge.requested} from ${fromPackagePath}`);
    }
    const resolvedPackagePath = resolveLockDependencyPackagePath(packages, fromPackagePath, edge.name);
    const target = resolvedPackagePath ? packages[resolvedPackagePath] : null;
    if (resolvedPackagePath !== edge.resolvedPackagePath || target?.version !== edge.resolvedVersion) {
      record(`package-lock.json no longer resolves ${fromPackagePath} -> ${edge.name} exactly to ${edge.resolvedPackagePath}@${edge.resolvedVersion}`);
    }
  }
}

function resolveLockDependencyPackagePath(packages, fromPackagePath, dependencyName) {
  let cursor = fromPackagePath;
  while (true) {
    const candidate = cursor ? `${cursor}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!cursor) return null;
    const separator = cursor.lastIndexOf("/");
    cursor = separator < 0 ? "" : cursor.slice(0, separator);
  }
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function verifySystemContractDraftBoundaries(
  workspaceRootInput = defaultWorkspaceRoot,
  registryInput = defaultDraftRegistry
) {
  const workspaceRoot = fs.realpathSync(path.resolve(workspaceRootInput));
  const failures = [];
  const record = (message) => failures.push(message);
  const draftPackages = validateDraftRegistry(registryInput, record).filter((draft) =>
    draft && typeof draft.directoryName === "string" && typeof draft.packageName === "string"
  );
  const packageDirectories = draftPackages.map((draft) => path.join(workspaceRoot, "packages", draft.directoryName));
  const draftRoots = packageDirectories.map((directory) => realPathIfExisting(directory) ?? path.resolve(directory));
  const draftByDirectory = new Map(draftPackages.map((draft) => [draft.directoryName, draft]));
  const draftByPackage = new Map(draftPackages.map((draft) => [draft.packageName, draft]));
  const packagesRoot = path.join(workspaceRoot, "packages");
  if (fs.existsSync(packagesRoot)) {
    for (const entry of fs.readdirSync(packagesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = path.join(packagesRoot, entry.name, "package.json");
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = readJson(manifestPath);
        } catch {
          // Registered packages report the precise parse failure below. Unknown
          // draft-shaped directories still fail closed through their name.
        }
      }
      const registeredForName = typeof manifest?.name === "string"
        ? draftByPackage.get(manifest.name)
        : null;
      if (registeredForName && registeredForName.directoryName !== entry.name) {
        record(`${relative(workspaceRoot, manifestPath)} claims registered draft ${registeredForName.packageName} from the wrong directory`);
      }
      if ((entry.name.endsWith("-draft") || manifest?.["x-hakimi-isolated-draft"] !== undefined)
        && !draftByDirectory.has(entry.name)) {
        record(`packages/${entry.name} is an unregistered isolated draft directory`);
      }
    }
  }

  const activeDrafts = [];
  const activeDraftRoots = [];
  const sourceRootByPackage = new Map();
  const manifestsByPackage = new Map();

  draftPackages.forEach((draft, draftIndex) => {
    const packageDirectory = packageDirectories[draftIndex];
    if (!fs.existsSync(packageDirectory) || !fs.statSync(packageDirectory).isDirectory()) {
      if (draft.presence === "required") {
        record(`packages/${draft.directoryName} is required by system-contract-draft-registry.json`);
      }
      return;
    }
    activeDrafts.push(draft);
    activeDraftRoots.push(draftRoots[draftIndex]);
    const manifestPath = path.join(packageDirectory, "package.json");
    const sourceDirectory = path.join(packageDirectory, "src");
    if (!fs.existsSync(manifestPath) || !fs.statSync(manifestPath).isFile()) {
      record(`${relative(workspaceRoot, manifestPath)} is required for an active isolated draft`);
      return;
    }
    if (!fs.existsSync(sourceDirectory) || !fs.statSync(sourceDirectory).isDirectory()) {
      record(`${relative(workspaceRoot, sourceDirectory)} is required for an active isolated draft`);
      return;
    }
    let manifest;
    try {
      manifest = draftManifestFailures(workspaceRoot, draft, manifestPath, record);
    } catch (cause) {
      record(`${relative(workspaceRoot, manifestPath)} cannot be parsed: ${cause instanceof Error ? cause.message : String(cause)}`);
      return;
    }
    manifestsByPackage.set(draft.packageName, manifest);
    const draftSourceRoot = fs.realpathSync(sourceDirectory);
    sourceRootByPackage.set(draft.packageName, draftSourceRoot);

    const draftBoundaryFiles = listFiles(workspaceRoot, packageDirectory, (filePath) =>
      codeFilePattern.test(filePath) || path.extname(filePath).toLowerCase() === ".html"
    );
    for (const boundaryFile of draftBoundaryFiles) {
      const boundarySource = fs.readFileSync(boundaryFile, "utf8");
      const moduleLoads = path.extname(boundaryFile).toLowerCase() === ".html"
        ? scanHtmlModuleLoadCalls(boundarySource)
        : scanModuleLoadCalls(boundarySource);
      for (const moduleLoad of moduleLoads.filter((entry) => entry.nonLiteral)) {
        record(`${relative(workspaceRoot, boundaryFile)} uses non-literal ${moduleLoad.kind} module loading`);
      }
    }

    const sourceFiles = listFiles(workspaceRoot, draftSourceRoot, (filePath) => codeFilePattern.test(filePath));
    const browserPreviewSourceRoot = draft.browserPreview
      ? path.resolve(packageDirectory, draft.browserPreview.sourceDirectory)
      : null;
    const browserSafeBareImports = new Set(draft.browserPreview?.allowedBareImports ?? []);
    const browserSafeSharedFiles = new Set((draft.browserPreview?.allowedSharedFiles ?? []).map((entry) => {
      const candidate = path.resolve(packageDirectory, entry);
      return realPathIfExisting(candidate) ?? candidate;
    }));
    for (const sourceFile of sourceFiles) {
      const source = fs.readFileSync(sourceFile, "utf8");
      for (const specifier of extractModuleSpecifiers(source)) {
        if (browserPreviewSourceRoot && isSameOrWithin(browserPreviewSourceRoot, sourceFile)) {
          if (specifier.startsWith("./") || specifier.startsWith("../")) {
            const resolved = resolveRelativeModule(sourceFile, specifier);
            if (!resolved) {
              record(`${relative(workspaceRoot, sourceFile)} has unresolved relative import ${specifier}`);
            } else if (!isSameOrWithin(browserPreviewSourceRoot, resolved) && !browserSafeSharedFiles.has(resolved)) {
              record(`${relative(workspaceRoot, sourceFile)} escapes its browser-safe preview graph through ${specifier}`);
            }
          } else if (!browserSafeBareImports.has(specifier)) {
            record(`${relative(workspaceRoot, sourceFile)} imports browser-unsafe module ${specifier}`);
          }
          continue;
        }
        if (draft.allowedBareImports.includes(specifier)) continue;
        if (specifier === "vitest" && /\.test\.[cm]?[jt]sx?$/u.test(sourceFile)) continue;
        if (specifier.startsWith("./") || specifier.startsWith("../")) {
          const resolved = resolveRelativeModule(sourceFile, specifier);
          if (!resolved) {
            record(`${relative(workspaceRoot, sourceFile)} has unresolved relative import ${specifier}`);
          } else if (!isSameOrWithin(draftSourceRoot, resolved)) {
            const allowedBridge = (draft.crossDraftEdges ?? []).some((edge) => {
              const targetDraft = draftByPackage.get(edge.toPackage);
              if (!targetDraft) return false;
              const expectedSource = path.resolve(packageDirectory, edge.from);
              const expectedTarget = path.resolve(
                workspaceRoot,
                "packages",
                targetDraft.directoryName,
                edge.to
              );
              return sourceFile === (realPathIfExisting(expectedSource) ?? expectedSource)
                && resolved === (realPathIfExisting(expectedTarget) ?? expectedTarget);
            });
            if (!allowedBridge) {
              record(`${relative(workspaceRoot, sourceFile)} escapes its isolated src directory through ${specifier}`);
            }
          }
          continue;
        }
        record(`${relative(workspaceRoot, sourceFile)} imports forbidden module ${specifier}`);
      }
    }
  });

  for (const draft of activeDrafts) {
    const packageDirectory = path.join(workspaceRoot, "packages", draft.directoryName);
    const sourceRoot = sourceRootByPackage.get(draft.packageName);
    if (!sourceRoot) continue;
    for (const specialCheck of draft.specialChecks ?? []) {
      if (specialCheck === "iztro-browser-preview-v1") {
        inspectAdapterBrowserPreviewBoundary(workspaceRoot, packageDirectory, sourceRoot, record);
      } else if (specialCheck === "iztro-locked-worker-imports-v1") {
        inspectIztroLockedWorkerImportsBoundary(workspaceRoot, sourceRoot, record);
      } else if (specialCheck === "iztro-tool-scripts-v1") {
        inspectAdapterToolScriptsBoundary(workspaceRoot, packageDirectory, sourceRoot, record);
      } else if (specialCheck === "astronomy-engine-browser-parity-v1") {
        inspectAstronomyEngineBrowserParityBoundary(workspaceRoot, packageDirectory, sourceRoot, record);
      } else if (specialCheck === "astronomy-engine-fresh-worker-v1") {
        inspectAstronomyEngineFreshWorkerBoundary(workspaceRoot, packageDirectory, sourceRoot, record);
      } else if (specialCheck === "western-rules-preview-v1") {
        inspectWesternRulesPreviewBoundary(workspaceRoot, packageDirectory, sourceRoot, record);
      } else if (specialCheck === "fortel-fresh-node-worker-v1") {
        inspectFortelFreshWorkerBoundary(workspaceRoot, sourceRoot, record);
      } else if (specialCheck === "ziwei-workspace-browser-app-v1") {
        inspectZiweiWorkspaceBrowserAppBoundary(
          workspaceRoot,
          packageDirectory,
          sourceRoot,
          record
        );
      }
    }
  }

  inspectLockfile(workspaceRoot, activeDrafts, manifestsByPackage, record);

  const productionFiles = listFiles(workspaceRoot, workspaceRoot, (filePath) => {
    if (!codeFilePattern.test(filePath) && path.extname(filePath).toLowerCase() !== ".html") return false;
    const realPath = fs.realpathSync(filePath);
    if (verifierFiles.has(realPath)) return false;
    return !activeDraftRoots.some((draftRoot) => isSameOrWithin(draftRoot, realPath));
  });

  for (const sourceFile of productionFiles) {
    const source = fs.readFileSync(sourceFile, "utf8");
    const isHtml = path.extname(sourceFile).toLowerCase() === ".html";
    const moduleLoads = isHtml ? scanHtmlModuleLoadCalls(source) : scanModuleLoadCalls(source);
    for (const moduleLoad of moduleLoads.filter((entry) => entry.nonLiteral)) {
      record(`${relative(workspaceRoot, sourceFile)} uses non-literal ${moduleLoad.kind} module loading`);
    }
    const specifiers = isHtml
      ? extractHtmlModuleSpecifiers(source)
      : extractModuleSpecifiers(source, moduleLoads);
    for (const specifier of specifiers) {
      const forbiddenPackage = draftPackages.find((draft) =>
        specifier === draft.packageName || specifier.startsWith(`${draft.packageName}/`)
      );
      if (forbiddenPackage) {
        record(`${relative(workspaceRoot, sourceFile)} imports isolated draft ${forbiddenPackage.packageName}`);
        continue;
      }
      if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) {
        const resolved = resolveWorkspaceModule(sourceFile, specifier);
        const draftIndex = resolved
          ? activeDraftRoots.findIndex((draftRoot) => isSameOrWithin(draftRoot, resolved))
          : -1;
        if (draftIndex >= 0) {
          record(`${relative(workspaceRoot, sourceFile)} resolves into isolated draft ${activeDrafts[draftIndex].packageName}`);
        }
      }
    }
  }

  const manifestFiles = listFiles(workspaceRoot, workspaceRoot, (filePath) => {
    if (path.basename(filePath) !== "package.json") return false;
    return !activeDraftRoots.some((draftRoot) => isSameOrWithin(draftRoot, fs.realpathSync(filePath)));
  });

  for (const manifestFile of manifestFiles) {
    const manifest = readJson(manifestFile);
    for (const section of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
      const dependencies = manifest[section] ?? {};
      for (const draft of draftPackages) {
        if (Object.hasOwn(dependencies, draft.packageName)) {
          record(`${relative(workspaceRoot, manifestFile)} declares forbidden ${section} entry ${draft.packageName}`);
        }
      }
    }
  }

  const tsconfigFiles = listFiles(workspaceRoot, workspaceRoot, (filePath) =>
    /^tsconfig(?:\.[^.]+)?\.json$/u.test(path.basename(filePath))
  );
  for (const configFile of tsconfigFiles) {
    inspectTsconfigAliases(workspaceRoot, configFile, draftPackages, draftRoots, record);
  }

  const executableAliasFiles = listFiles(workspaceRoot, workspaceRoot, (filePath) =>
    /(?:vite|vitest|playwright).*\.(?:[cm]?[jt]s)$/u.test(path.basename(filePath))
  );
  const allowedIsolatedViteBridge = realPathIfExisting(path.join(
    workspaceRoot,
    "packages",
    "ziwei-workspace-artifact-draft",
    "vite.browser-app.config.mjs"
  ));
  for (const aliasFile of executableAliasFiles) {
    if (allowedIsolatedViteBridge && fs.realpathSync(aliasFile) === allowedIsolatedViteBridge) continue;
    const sourceWithoutComments = maskJavaScriptComments(fs.readFileSync(aliasFile, "utf8"));
    for (const draft of draftPackages) {
      if (sourceWithoutComments.includes(draft.packageName) || sourceWithoutComments.includes(draft.directoryName)) {
        record(`${relative(workspaceRoot, aliasFile)} must not alias isolated draft ${draft.packageName}`);
      }
    }
  }

  return Object.freeze([...new Set(failures)]);
}

function runCli() {
  const failures = verifySystemContractDraftBoundaries();
  if (failures.length > 0) {
    console.error("System contract draft boundary check failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log("System contract drafts remain private, isolated, and unreachable from production code.");
  }
}

const invokedPath = process.argv[1] && fs.existsSync(process.argv[1]) ? fs.realpathSync(process.argv[1]) : null;
if (invokedPath === verifierPath) runCli();
