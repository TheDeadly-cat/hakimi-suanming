import { constants as fsConstants } from "node:fs";
import type { BigIntStats } from "node:fs";
import { lstat, open, realpath, stat, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { fail, rawSha256 } from "./canonical.ts";

type EndpointIdentity = Readonly<{
  dev: bigint;
  ino: bigint;
  nlink: bigint;
  size: bigint;
  mtimeNs: bigint;
  ctimeNs: bigint;
}>;

export type StableRead = Readonly<{
  bytes: Uint8Array;
  rawSha256: string;
  byteLength: number;
  heldHandleReadMechanicallyVerified: true;
  endpointIdentityStableDuringRead: true;
}>;

function pathToken(value: string): string {
  const normalized = path.normalize(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function samePath(left: string, right: string): boolean {
  return pathToken(left) === pathToken(right);
}

function isSameOrWithin(parent: string, candidate: string): boolean {
  const relation = path.relative(parent, candidate);
  return relation === "" || (!relation.startsWith(`..${path.sep}`) && relation !== ".." && !path.isAbsolute(relation));
}

function endpointIdentity(metadata: BigIntStats): EndpointIdentity {
  return Object.freeze({
    dev: metadata.dev,
    ino: metadata.ino,
    nlink: metadata.nlink,
    size: metadata.size,
    mtimeNs: metadata.mtimeNs,
    ctimeNs: metadata.ctimeNs
  });
}

function sameEndpoint(left: EndpointIdentity, right: EndpointIdentity): boolean {
  return left.dev > 0n && left.ino > 0n
    && left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function assertPlainDirectory(metadata: BigIntStats, label: string): void {
  if (!metadata.isDirectory() || metadata.isSymbolicLink() || metadata.dev <= 0n || metadata.ino <= 0n) {
    fail("DIRECTORY_ENDPOINT_INVALID", `${label} 必须是无链接的普通目录端点。`);
  }
}

function assertRegularFile(metadata: BigIntStats, maxBytes: number, label: string): void {
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.dev <= 0n || metadata.ino <= 0n
    || metadata.nlink !== 1n || metadata.size <= 0n || metadata.size > BigInt(maxBytes)) {
    fail("FILE_ENDPOINT_INVALID", `${label} 必须是非空、单链接、有界普通文件。`);
  }
}

async function resolvePlainDirectory(directory: string, label: string): Promise<Readonly<{
  unresolved: string;
  canonical: string;
  identity: EndpointIdentity;
}>> {
  if (typeof directory !== "string" || !path.isAbsolute(directory)) {
    fail("ROOT_INVALID", `${label} 必须是显式绝对路径。`);
  }
  try {
    const unresolved = path.resolve(directory);
    const link = await lstat(unresolved, { bigint: true });
    assertPlainDirectory(link, label);
    const canonical = await realpath(unresolved);
    if (!samePath(unresolved, canonical)) {
      fail("ROOT_ALIAS_FORBIDDEN", `${label} 目录链不得经由 symlink、junction 或别名路径。`);
    }
    const target = await stat(canonical, { bigint: true });
    assertPlainDirectory(target, label);
    const linkIdentity = endpointIdentity(link);
    const targetIdentity = endpointIdentity(target);
    if (!sameEndpoint(linkIdentity, targetIdentity) || !samePath(canonical, await realpath(canonical))) {
      fail("ROOT_CHANGED", `${label} 端点身份不稳定。`);
    }
    return Object.freeze({ unresolved, canonical, identity: targetIdentity });
  } catch (cause) {
    if (cause instanceof Error && "code" in cause && cause.name === "FormalIntakeSuccessorError") throw cause;
    if (cause instanceof Error && cause.name === "FormalIntakeSuccessorError") throw cause;
    return fail("ROOT_INVALID", `${label} 无法安全解析。`);
  }
}

async function readAtMost(handle: FileHandle, maxBytes: number, label: string): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total <= maxBytes) {
    const buffer = new Uint8Array(Math.min(64 * 1024, maxBytes + 1 - total));
    const result = await handle.read(buffer, 0, buffer.byteLength, null);
    if (result.bytesRead === 0) break;
    chunks.push(buffer.subarray(0, result.bytesRead));
    total += result.bytesRead;
  }
  if (total === 0 || total > maxBytes) fail("FILE_BYTES_INVALID", `${label} 字节长度无效。`);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function readStableFileAt(
  canonicalRoot: string,
  unresolvedRoot: string,
  relativePath: string,
  maxBytes: number,
  label: string
): Promise<StableRead> {
  if (typeof relativePath !== "string" || relativePath.length === 0 || path.isAbsolute(relativePath)
    || relativePath.includes(":") || relativePath.split(/[\\/]/u).some((segment) => segment === "" || segment === "." || segment === "..")) {
    fail("RELATIVE_PATH_INVALID", `${label} 相对路径无效。`);
  }
  const unresolved = path.resolve(unresolvedRoot, ...relativePath.split("/"));
  if (!isSameOrWithin(unresolvedRoot, unresolved)) fail("RELATIVE_PATH_INVALID", `${label} 越出根目录。`);
  let handle: FileHandle | null = null;
  try {
    const beforeLink = await lstat(unresolved, { bigint: true });
    assertRegularFile(beforeLink, maxBytes, label);
    const canonicalBefore = await realpath(unresolved);
    if (!isSameOrWithin(canonicalRoot, canonicalBefore)) fail("FILE_ENDPOINT_INVALID", `${label} realpath 越界。`);
    const beforeTarget = await stat(canonicalBefore, { bigint: true });
    assertRegularFile(beforeTarget, maxBytes, label);
    const beforeIdentity = endpointIdentity(beforeLink);
    if (!sameEndpoint(beforeIdentity, endpointIdentity(beforeTarget))) fail("FILE_CHANGED", `${label} 打开前换绑。`);
    const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
    handle = await open(unresolved, fsConstants.O_RDONLY | noFollow);
    const handleBefore = await handle.stat({ bigint: true });
    assertRegularFile(handleBefore, maxBytes, label);
    if (!sameEndpoint(beforeIdentity, endpointIdentity(handleBefore))) fail("FILE_CHANGED", `${label} 打开时换绑。`);
    const bytes = await readAtMost(handle, maxBytes, label);
    const [handleAfter, linkAfter, canonicalAfter] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(unresolved, { bigint: true }),
      realpath(unresolved)
    ]);
    assertRegularFile(handleAfter, maxBytes, label);
    assertRegularFile(linkAfter, maxBytes, label);
    const afterTarget = await stat(canonicalAfter, { bigint: true });
    assertRegularFile(afterTarget, maxBytes, label);
    if (!samePath(canonicalBefore, canonicalAfter)
      || !isSameOrWithin(canonicalRoot, canonicalAfter)
      || !sameEndpoint(beforeIdentity, endpointIdentity(handleAfter))
      || !sameEndpoint(beforeIdentity, endpointIdentity(linkAfter))
      || !sameEndpoint(beforeIdentity, endpointIdentity(afterTarget))
      || BigInt(bytes.byteLength) !== handleAfter.size) {
      fail("FILE_CHANGED", `${label} 读取期间变化。`);
    }
    return Object.freeze({
      bytes,
      rawSha256: rawSha256(bytes),
      byteLength: bytes.byteLength,
      heldHandleReadMechanicallyVerified: true,
      endpointIdentityStableDuringRead: true
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === "FormalIntakeSuccessorError") throw cause;
    return fail("FILE_READ_FAILED", `${label} 无法安全读取。`);
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function readStableWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
  maxBytes: number,
  label: string
): Promise<StableRead> {
  const root = await resolvePlainDirectory(workspaceRoot, "workspaceRoot");
  return readStableFileAt(root.canonical, root.unresolved, relativePath, maxBytes, label);
}

export async function readStablePrivateFile(options: Readonly<{
  workspaceRoot: string;
  privateRoot: string;
  relativeFileName: string;
  maxBytes: number;
  label: string;
}>): Promise<StableRead> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u.test(options.relativeFileName)) {
    fail("PRIVATE_FILENAME_INVALID", `${options.label} 只接受单层不透明文件名。`);
  }
  const [workspace, privateDirectory] = await Promise.all([
    resolvePlainDirectory(options.workspaceRoot, "workspaceRoot"),
    resolvePlainDirectory(options.privateRoot, "privateRoot")
  ]);
  if (isSameOrWithin(workspace.canonical, privateDirectory.canonical)
    || isSameOrWithin(privateDirectory.canonical, workspace.canonical)) {
    fail("PRIVATE_ROOT_OVERLAP", "privateRoot 必须与 workspace 双向不重叠。");
  }
  return readStableFileAt(
    privateDirectory.canonical,
    privateDirectory.unresolved,
    options.relativeFileName,
    options.maxBytes,
    options.label
  );
}
