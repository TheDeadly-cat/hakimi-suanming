import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";

const workspaceRoot = process.cwd();
const packagesRoot = join(workspaceRoot, "packages");

type AstNode = {
  type: string;
  start?: number | null;
  end?: number | null;
  [key: string]: unknown;
};

type SourceBinding = Readonly<{
  kind: "import" | "local";
  name: string;
  scopeStart: number;
  scopeEnd: number;
}>;

const FUNCTION_NODE_TYPES = new Set([
  "ArrowFunctionExpression",
  "ClassMethod",
  "ClassPrivateMethod",
  "FunctionDeclaration",
  "FunctionExpression",
  "ObjectMethod"
]);

const LEXICAL_SCOPE_NODE_TYPES = new Set([
  "BlockStatement",
  "CatchClause",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "Program",
  "StaticBlock",
  "SwitchStatement"
]);

const BROWSER_OBJECT_GLOBALS = new Set(["document", "navigator", "window"]);
const PLATFORM_CONSTRUCTOR_GLOBALS = new Set(["Blob"]);
const LEGACY_WEB_DOWNLOAD_FUNCTIONS = new Set(["downloadBlobFile", "downloadTextFile"]);

function isAstNode(value: unknown): value is AstNode {
  return Boolean(value && typeof value === "object" && typeof (value as { type?: unknown }).type === "string");
}

function astChildren(node: AstNode): AstNode[] {
  const children: AstNode[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (
      key === "comments"
      || key === "errors"
      || key === "extra"
      || key === "innerComments"
      || key === "leadingComments"
      || key === "loc"
      || key === "tokens"
      || key === "trailingComments"
    ) continue;
    if (Array.isArray(value)) {
      for (const candidate of value) if (isAstNode(candidate)) children.push(candidate);
    } else if (isAstNode(value)) {
      children.push(value);
    }
  }
  return children;
}

function walkAst(
  node: AstNode,
  ancestors: readonly AstNode[],
  visit: (current: AstNode, parents: readonly AstNode[]) => void
): void {
  visit(node, ancestors);
  const nextAncestors = [...ancestors, node];
  for (const child of astChildren(node)) walkAst(child, nextAncestors, visit);
}

function nodeRange(node: AstNode): readonly [number, number] {
  return [node.start ?? 0, node.end ?? Number.MAX_SAFE_INTEGER];
}

function nearestScope(
  ancestors: readonly AstNode[],
  predicate: (candidate: AstNode) => boolean
): AstNode {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    const candidate = ancestors[index];
    if (candidate && predicate(candidate)) return candidate;
  }
  throw new Error("Android boundary scanner could not resolve a lexical scope.");
}

function bindingNames(pattern: AstNode | null | undefined): string[] {
  if (!pattern) return [];
  if (pattern.type === "Identifier") {
    return typeof pattern.name === "string" ? [pattern.name] : [];
  }
  if (pattern.type === "AssignmentPattern" || pattern.type === "RestElement") {
    return bindingNames(isAstNode(pattern.left) ? pattern.left : isAstNode(pattern.argument) ? pattern.argument : undefined);
  }
  if (pattern.type === "TSParameterProperty") {
    return bindingNames(isAstNode(pattern.parameter) ? pattern.parameter : undefined);
  }
  if (pattern.type === "ArrayPattern") {
    return Array.isArray(pattern.elements)
      ? pattern.elements.flatMap((element) => bindingNames(isAstNode(element) ? element : undefined))
      : [];
  }
  if (pattern.type === "ObjectPattern") {
    if (!Array.isArray(pattern.properties)) return [];
    return pattern.properties.flatMap((property) => {
      if (!isAstNode(property)) return [];
      if (property.type === "RestElement") return bindingNames(isAstNode(property.argument) ? property.argument : undefined);
      return bindingNames(isAstNode(property.value) ? property.value : undefined);
    });
  }
  return [];
}

function collectSourceBindings(ast: AstNode): SourceBinding[] {
  const bindings: SourceBinding[] = [];
  const addBindings = (names: readonly string[], scope: AstNode, kind: SourceBinding["kind"] = "local") => {
    const [scopeStart, scopeEnd] = nodeRange(scope);
    for (const name of names) bindings.push({ kind, name, scopeStart, scopeEnd });
  };

  walkAst(ast, [], (node, ancestors) => {
    if (node.type === "ImportDeclaration") {
      const program = nearestScope(ancestors, (candidate) => candidate.type === "Program");
      if (Array.isArray(node.specifiers) && node.importKind !== "type") {
        for (const specifier of node.specifiers) {
          if (!isAstNode(specifier) || specifier.importKind === "type") continue;
          addBindings(bindingNames(isAstNode(specifier.local) ? specifier.local : undefined), program, "import");
        }
      }
      return;
    }

    if (node.type === "VariableDeclaration") {
      const scope = node.kind === "var"
        ? nearestScope(ancestors, (candidate) => candidate.type === "Program" || FUNCTION_NODE_TYPES.has(candidate.type))
        : nearestScope(ancestors, (candidate) => LEXICAL_SCOPE_NODE_TYPES.has(candidate.type));
      if (Array.isArray(node.declarations)) {
        for (const declaration of node.declarations) {
          if (isAstNode(declaration)) addBindings(bindingNames(isAstNode(declaration.id) ? declaration.id : undefined), scope);
        }
      }
      return;
    }

    if (FUNCTION_NODE_TYPES.has(node.type)) {
      if (node.type === "FunctionDeclaration" && isAstNode(node.id)) {
        addBindings(bindingNames(node.id), nearestScope(ancestors, (candidate) => LEXICAL_SCOPE_NODE_TYPES.has(candidate.type)));
      } else if (node.type === "FunctionExpression" && isAstNode(node.id)) {
        addBindings(bindingNames(node.id), node);
      }
      if (Array.isArray(node.params)) {
        for (const parameter of node.params) addBindings(bindingNames(isAstNode(parameter) ? parameter : undefined), node);
      }
      return;
    }

    if (node.type === "CatchClause" && isAstNode(node.param)) {
      addBindings(bindingNames(node.param), node);
      return;
    }

    if (node.type === "ClassDeclaration" && isAstNode(node.id)) {
      addBindings(bindingNames(node.id), nearestScope(ancestors, (candidate) => LEXICAL_SCOPE_NODE_TYPES.has(candidate.type)));
      return;
    }

    if (node.type === "ClassExpression" && isAstNode(node.id)) {
      addBindings(bindingNames(node.id), node);
      return;
    }

    if ((node.type === "TSEnumDeclaration" || node.type === "TSModuleDeclaration") && isAstNode(node.id)) {
      addBindings(bindingNames(node.id), nearestScope(ancestors, (candidate) => LEXICAL_SCOPE_NODE_TYPES.has(candidate.type)));
    }
  });

  return bindings;
}

function staticMemberName(node: AstNode): string | null {
  const property = isAstNode(node.property) ? node.property : null;
  if (!property) return null;
  if (!node.computed && property.type === "Identifier" && typeof property.name === "string") return property.name;
  if (node.computed && property.type === "StringLiteral" && typeof property.value === "string") return property.value;
  return null;
}

type BoundarySourceAnalysis = Readonly<{
  ast: AstNode;
  globalName(expression: AstNode | null, position: number, importsShadow?: boolean): string | null;
}>;

function analyzeBoundarySource(source: string): BoundarySourceAnalysis {
  const ast = parse(source, {
    errorRecovery: true,
    sourceType: "module",
    plugins: ["typescript", "jsx"]
  }) as unknown as AstNode;
  const bindings = collectSourceBindings(ast);
  const isShadowed = (name: string, position: number, importsShadow = true) => bindings.some((binding) => (
    binding.name === name
    && (importsShadow || binding.kind === "local")
    && binding.scopeStart <= position
    && position <= binding.scopeEnd
  ));
  const globalName = (expression: AstNode | null, position: number, importsShadow = true): string | null => {
    if (!expression) return null;
    if (expression.type === "Identifier" && typeof expression.name === "string") {
      return isShadowed(expression.name, position, importsShadow) ? null : expression.name;
    }
    if (
      (expression.type === "MemberExpression" || expression.type === "OptionalMemberExpression")
      && isAstNode(expression.object)
      && expression.object.type === "Identifier"
      && expression.object.name === "globalThis"
      && !isShadowed("globalThis", position, importsShadow)
    ) {
      return staticMemberName(expression);
    }
    return null;
  };
  return { ast, globalName };
}

function hasForbiddenBrowserBoundaryUsage(source: string): boolean {
  const { ast, globalName } = analyzeBoundarySource(source);

  let violation = false;
  walkAst(ast, [], (node) => {
    if (violation) return;
    const position = node.start ?? 0;
    if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
      const rootName = globalName(isAstNode(node.object) ? node.object : null, position);
      if (rootName && BROWSER_OBJECT_GLOBALS.has(rootName)) {
        violation = true;
        return;
      }
      if (rootName === "URL" && staticMemberName(node) === "createObjectURL") violation = true;
      return;
    }
    if (node.type === "NewExpression") {
      const constructorName = globalName(isAstNode(node.callee) ? node.callee : null, position);
      if (constructorName && PLATFORM_CONSTRUCTOR_GLOBALS.has(constructorName)) violation = true;
      return;
    }
    if (node.type === "CallExpression" || node.type === "OptionalCallExpression") {
      const calleeName = globalName(isAstNode(node.callee) ? node.callee : null, position);
      if (calleeName === "createObjectURL") violation = true;
    }
  });
  return violation;
}

function hasForbiddenWebFileBoundaryUsage(source: string): boolean {
  const { ast, globalName } = analyzeBoundarySource(source);
  let violation = false;
  walkAst(ast, [], (node) => {
    if (violation) return;
    const position = node.start ?? 0;

    if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
      const object = isAstNode(node.object) ? node.object : null;
      const rootName = globalName(object, position);
      const memberName = staticMemberName(node);
      if (
        (rootName === "URL" && memberName === "createObjectURL")
        || (rootName === "navigator" && (memberName === "share" || memberName === "canShare"))
        || (rootName === "window" && memberName === "print")
      ) {
        violation = true;
        return;
      }
      const legacyDownloadName = globalName(object, position, false);
      if (legacyDownloadName && LEGACY_WEB_DOWNLOAD_FUNCTIONS.has(legacyDownloadName)) violation = true;
      return;
    }

    if (node.type !== "CallExpression" && node.type !== "OptionalCallExpression") return;
    const callee = isAstNode(node.callee) ? node.callee : null;
    if (callee?.type === "MemberExpression" || callee?.type === "OptionalMemberExpression") {
      const rootName = globalName(isAstNode(callee.object) ? callee.object : null, position);
      const firstArgument = Array.isArray(node.arguments) && isAstNode(node.arguments[0])
        ? node.arguments[0]
        : null;
      if (
        rootName === "document"
        && staticMemberName(callee) === "createElement"
        && firstArgument?.type === "StringLiteral"
        && (firstArgument.value === "a" || firstArgument.value === "input")
      ) {
        violation = true;
        return;
      }
    }
    const directName = globalName(callee, position, false);
    if (directName && LEGACY_WEB_DOWNLOAD_FUNCTIONS.has(directName)) violation = true;
  });
  return violation;
}

function productionTypeScriptFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...productionTypeScriptFiles(absolute));
    else if ((entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) && !entry.name.includes(".test.")) files.push(absolute);
  }
  return files;
}

describe("Android migration boundary", () => {
  it("扫描器忽略同名局部业务变量、对象字段、注释与字符串", () => {
    expect(hasForbiddenBrowserBoundaryUsage(`
      function read(document: { id: string }, navigator: { status: string }) {
        return [document.id, navigator.status];
      }
      const value = { document: { id: "doc-1" } };
      class Blob {}
      const URL = { createObjectURL() { return "local"; } };
      function createObjectURL() { return "local"; }
      void value.document.id;
      void new Blob();
      void URL.createObjectURL();
      void createObjectURL();
      const examples = "window.print(); document.createElement('a');";
      // navigator.share({ files: [] });
    `)).toBe(false);
  });

  it("扫描器识别未被遮蔽的浏览器与文件接口", () => {
    for (const source of [
      "window.print();",
      "globalThis.document.createElement('a');",
      "navigator.share({ files: [] });",
      "void new Blob(['report']);",
      "void URL.createObjectURL(new Blob());",
      "createObjectURL();"
    ]) {
      expect(hasForbiddenBrowserBoundaryUsage(source), source).toBe(true);
    }
  });

  it("Web 扫描器忽略局部同名接口、对象字段、注释与字符串", () => {
    expect(hasForbiddenWebFileBoundaryUsage(`
      function render(
        window: { print(): void },
        document: { createElement(tag: string): void },
        navigator: { share(value: unknown): void }
      ) {
        window.print();
        document.createElement("a");
        navigator.share({});
      }
      const URL = { createObjectURL() { return "local"; } };
      function downloadBlobFile() { return "local"; }
      const downloadTextFile = () => "local";
      void URL.createObjectURL();
      void downloadBlobFile();
      void downloadTextFile();
      const examples = "window.print(); downloadBlobFile();";
      // document.createElement("input"); navigator.canShare({});
    `)).toBe(false);
  });

  it("Web 扫描器识别真实全局文件、分享与打印绕过", () => {
    for (const source of [
      "window.print();",
      "globalThis.window.print();",
      "document.createElement('a');",
      "globalThis.document.createElement('input');",
      "navigator.share({ files: [] });",
      "navigator.canShare({ files: [] });",
      "URL.createObjectURL(new Blob());",
      "downloadBlobFile(new Blob(), 'report.bin');",
      "downloadTextFile('report.txt', 'report');",
      "import { downloadBlobFile } from './legacy'; downloadBlobFile(new Blob(), 'report.bin');"
    ]) {
      expect(hasForbiddenWebFileBoundaryUsage(source), source).toBe(true);
    }
  });

  it("核心计算、存储、备份与导出包不直接调用浏览器 DOM 文件接口", () => {
    const violations: string[] = [];
    for (const packageEntry of readdirSync(packagesRoot, { withFileTypes: true })) {
      // Isolated draft packages are private, empty-export, and never reach the
      // production bundle; their browser-app sources must not be treated as
      // production Android-facing code here.
      if (!packageEntry.isDirectory() || packageEntry.name === "platform" || packageEntry.name.endsWith("-draft")) continue;
      const sourceDirectory = join(packagesRoot, packageEntry.name, "src");
      for (const file of productionTypeScriptFiles(sourceDirectory)) {
        const source = readFileSync(file, "utf8");
        if (hasForbiddenBrowserBoundaryUsage(source)) {
          violations.push(file.replace(`${workspaceRoot}\\`, ""));
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("Web 业务代码只通过平台端口选择、保存、分享和打印文件", () => {
    const webSourceRoot = join(workspaceRoot, "apps", "web", "src");
    const violations: string[] = [];
    for (const file of productionTypeScriptFiles(webSourceRoot)) {
      const source = readFileSync(file, "utf8");
      if (hasForbiddenWebFileBoundaryUsage(source)) {
        violations.push(file.replace(`${workspaceRoot}\\`, ""));
      }
    }
    expect(violations).toEqual([]);
  });
});
