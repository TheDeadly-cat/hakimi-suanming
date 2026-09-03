import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

import {
  WesternTzdb2026cLiveAuditError,
  computeByteIdentity,
  computeSha512Sri,
  findForbiddenLauncherExecArgv,
  parseTarRegularEntries,
  verifyIanaAnnouncementSemantics,
  verifyPinnedLicenseQuote,
  verifyPinnedTarGzip
} from "./audit-western-tzdb-2026c-source-rights-live.mjs";
import {
  WESTERN_TZDB_2026C_REMOTE_EVIDENCE
} from "./western-tzdb-2026c-source-rights-evidence-lib.mjs";

const SCRIPT_PATH = fileURLToPath(new URL("./audit-western-tzdb-2026c-source-rights-live.mjs", import.meta.url));
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function cleanEnvironment(overrides = {}) {
  const environment = { ...process.env };
  delete environment.NODE_OPTIONS;
  delete environment.NODE_PATH;
  return { ...environment, ...overrides };
}

function expectCode(action, code) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof WesternTzdb2026cLiveAuditError);
    assert.equal(error.code, code);
    return true;
  });
}

function writeTarText(header, offset, length, value) {
  const bytes = Buffer.from(value, "utf8");
  assert.ok(bytes.byteLength <= length);
  bytes.copy(header, offset);
}

function writeTarOctal(header, offset, length, value) {
  const text = value.toString(8).padStart(length - 1, "0");
  writeTarText(header, offset, length, `${text}\0`);
}

function tarFixture(entries) {
  const blocks = [];
  for (const entry of entries) {
    const body = Buffer.from(entry.body);
    const header = Buffer.alloc(512);
    writeTarText(header, 0, 100, entry.path);
    writeTarOctal(header, 100, 8, 0o644);
    writeTarOctal(header, 108, 8, 0);
    writeTarOctal(header, 116, 8, 0);
    writeTarOctal(header, 124, 12, body.byteLength);
    writeTarOctal(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    header[156] = 0x30;
    writeTarText(header, 257, 6, "ustar");
    let checksum = 0;
    for (const byte of header) checksum += byte;
    const checksumText = `${checksum.toString(8).padStart(6, "0")}\0 `;
    writeTarText(header, 148, 8, checksumText);
    const padding = Buffer.alloc(Math.ceil(body.byteLength / 512) * 512 - body.byteLength);
    blocks.push(header, body, padding);
  }
  blocks.push(Buffer.alloc(1024));
  return Buffer.concat(blocks);
}

test("byte identity and SRI are deterministic pure functions", () => {
  const bytes = Buffer.from("fixed fixture", "utf8");
  assert.deepEqual(computeByteIdentity(bytes), {
    rawBytes: 13,
    rawSha256: "51f3a39018bd742b2a213397d444f54ae92c4d1720ab6608d950e0ee458d9a70",
    rawSha512: "6723812f43988c17065e6a7a005a987ea1474ed951fd8caccffb345a7603e2969ae381b361a10e7cbd18f55989ae61a739df0faca51fd0dbfad4faff79dd9bba"
  });
  assert.equal(
    computeSha512Sri(bytes),
    "sha512-ZyOBL0OYjBcGXmp6AFqYfqFHTtlR/Yysz/s0WnYD4paa44GzYaEOfL0Y9VmJrmGnOd8PrKUf0Nv61Pr/ed2bug=="
  );
});

test("tar parser verifies checksums and pinned entries entirely in memory", () => {
  const tar = tarFixture([
    { path: "version", body: Buffer.from("2026c\n") },
    { path: "nested/data.txt", body: Buffer.from("payload") }
  ]);
  const entries = parseTarRegularEntries(tar);
  assert.equal(entries.get("version").toString("utf8"), "2026c\n");
  assert.equal(entries.get("nested/data.txt").toString("utf8"), "payload");

  const identity = computeByteIdentity(Buffer.from("2026c\n"));
  const verified = verifyPinnedTarGzip(gzipSync(tar), [{
    path: "version",
    rawBytes: identity.rawBytes,
    rawSha256: identity.rawSha256
  }]);
  assert.deepEqual(verified.summaries, [{
    path: "version",
    rawBytes: 6,
    rawSha256: identity.rawSha256
  }]);

  const damaged = Buffer.from(tar);
  damaged[0] ^= 1;
  expectCode(() => parseTarRegularEntries(damaged), "TAR_HEADER_CHECKSUM_MISMATCH");
});

test("announcement gates fixed checksum, commit and tag but not dynamic HTML identity", () => {
  const expected = WESTERN_TZDB_2026C_REMOTE_EVIDENCE.announcement;
  const fixture = Buffer.from(
    `<html>This release corresponds to commit ${expected.statedCommit}; `
      + `archive SHA-512 ${expected.statedDataArchiveSha512}; tagged '${expected.statedTag}'. `
      + `dynamic-token=${Date.now()}</html>`,
    "utf8"
  );
  const result = verifyIanaAnnouncementSemantics(fixture, expected);
  assert.equal(result.statedCommit, expected.statedCommit);
  assert.equal(result.statedDataArchiveSha512, expected.statedDataArchiveSha512);
  assert.equal(result.statedTag, expected.statedTag);
  assert.match(result.semanticChecksum, /^[0-9a-f]{64}$/u);

  const missingCommit = Buffer.from(fixture.toString("utf8").replace(expected.statedCommit, "0".repeat(40)));
  expectCode(
    () => verifyIanaAnnouncementSemantics(missingCommit, expected),
    "ANNOUNCEMENT_SEMANTIC_FACT_MISSING"
  );
});

test("LICENSE quote prefers the exact source LF and uses symmetric normalization only as fallback", () => {
  const quoteSpec = WESTERN_TZDB_2026C_REMOTE_EVIDENCE.licenseRepresentation.exactQuote;
  const exactSource = Buffer.from(`${quoteSpec.text}\n`, "utf8");
  assert.deepEqual(verifyPinnedLicenseQuote(exactSource, quoteSpec), {
    exactSourceTextMatched: true,
    matchedAfterWhitespaceNormalization: false,
    matchMode: "exact_source_text",
    quoteUtf8Bytes: 113,
    quoteSha256: "72c3b37777104fdba9c140c56d93cd282266f283e848399f0d8e3cef9daaf0ff"
  });

  const crlfSource = Buffer.from(`${quoteSpec.text.replace("\n", "\r\n")}\r\n`, "utf8");
  assert.deepEqual(verifyPinnedLicenseQuote(crlfSource, quoteSpec), {
    exactSourceTextMatched: false,
    matchedAfterWhitespaceNormalization: true,
    matchMode: "whitespace_normalized",
    quoteUtf8Bytes: 113,
    quoteSha256: "72c3b37777104fdba9c140c56d93cd282266f283e848399f0d8e3cef9daaf0ff"
  });

  expectCode(
    () => verifyPinnedLicenseQuote(Buffer.from("unrelated license", "utf8"), quoteSpec),
    "IANA_LICENSE_QUOTE_MISSING"
  );
});

test("module import is inert and does not invoke fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("offline test must not fetch");
  };
  try {
    await import(`${pathToFileURL(SCRIPT_PATH).href}?offline-inert=${Date.now()}`);
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(called, false);
});

test("auditor source has no filesystem writer or child-process execution path", async () => {
  const source = await readFile(SCRIPT_PATH, "utf8");
  assert.doesNotMatch(source, /node:fs|writeFile|appendFile|createWriteStream|child_process|spawn|execFile/u);
  assert.doesNotMatch(source, /from "\.\/western-tzdb-2026c-source-rights-evidence-lib\.mjs"/u);
  assert.match(source, /await import\(BUSINESS_DEPENDENCY_URL\.href\)/u);
  assert.match(source, /scope: "this_audit_process_only"/u);
  assert.match(source, /workspaceWideAbsenceMechanicallyVerified: false/u);
  assert.doesNotMatch(source, /\bremoteResponseBodiesPersisted:/u);
  assert.doesNotMatch(source, /\bremoteArchivesPersisted:/u);
  assert.doesNotMatch(source, /\bdetachedSignaturesPersisted:/u);
  assert.doesNotMatch(source, /\bcompleteRemoteLicenseBodiesPersisted:/u);
});

test("launcher option classifier covers separate, equals and short require forms", () => {
  const forbiddenCases = [
    [["--require", "fixture.cjs"], "--require"],
    [["--require=fixture.cjs"], "--require"],
    [["-r", "fixture.cjs"], "-r"],
    [["-rfixture.cjs"], "-r"],
    [["-r=fixture.cjs"], "-r"],
    [["--import", "fixture.mjs"], "--import"],
    [["--import=fixture.mjs"], "--import"],
    [["--loader", "fixture.mjs"], "--loader"],
    [["--loader=fixture.mjs"], "--loader"],
    [["--experimental-loader", "fixture.mjs"], "--experimental-loader"],
    [["--experimental-loader=fixture.mjs"], "--experimental-loader"]
  ];
  for (const [values, expected] of forbiddenCases) {
    assert.equal(findForbiddenLauncherExecArgv(values), expected);
  }
  assert.equal(findForbiddenLauncherExecArgv([]), null);
  assert.equal(findForbiddenLauncherExecArgv(["--no-warnings"]), null);
});

test("CLI rejects operands and any visible NODE_OPTIONS before any network work", () => {
  const withArgument = spawnSync(process.execPath, [SCRIPT_PATH, "unexpected"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.notEqual(withArgument.status, 0);
  assert.deepEqual(JSON.parse(withArgument.stderr), {
    ok: false,
    code: "UNSAFE_ARGUMENTS",
    message: "live auditor 不接受命令行参数。"
  });

  const withNodeOptions = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment({ NODE_OPTIONS: "--no-warnings" })
  });
  assert.notEqual(withNodeOptions.status, 0);
  assert.deepEqual(JSON.parse(withNodeOptions.stderr), {
    ok: false,
    code: "NODE_OPTIONS_FORBIDDEN",
    message: "live auditor 不接受 NODE_OPTIONS。"
  });

  const withEmptyNodeOptions = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment({ NODE_OPTIONS: "" })
  });
  assert.notEqual(withEmptyNodeOptions.status, 0);
  assert.deepEqual(JSON.parse(withEmptyNodeOptions.stderr), {
    ok: false,
    code: "NODE_OPTIONS_FORBIDDEN",
    message: "live auditor 不接受 NODE_OPTIONS。"
  });
});

test("CLI rejects an actual --import execArgv and visible NODE_PATH before business import", () => {
  const withImport = spawnSync(
    process.execPath,
    ["--import=data:text/javascript,void%200", SCRIPT_PATH],
    {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      env: cleanEnvironment()
    }
  );
  assert.notEqual(withImport.status, 0);
  assert.deepEqual(JSON.parse(withImport.stderr), {
    ok: false,
    code: "EXEC_ARGV_FORBIDDEN",
    message: "live auditor 不接受可见的 Node preload 或 loader execArgv。"
  });

  const withNodePath = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    env: cleanEnvironment({ NODE_PATH: "untrusted-module-search-path" })
  });
  assert.notEqual(withNodePath.status, 0);
  assert.deepEqual(JSON.parse(withNodePath.stderr), {
    ok: false,
    code: "NODE_PATH_FORBIDDEN",
    message: "live auditor 不接受 NODE_PATH。"
  });
});

test("CLI rejects a non-fixed working directory before fetching", () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: path.dirname(PROJECT_ROOT),
    encoding: "utf8",
    env: cleanEnvironment()
  });
  assert.notEqual(result.status, 0);
  assert.deepEqual(JSON.parse(result.stderr), {
    ok: false,
    code: "WORKSPACE_ROOT_MISMATCH",
    message: "live auditor 必须从固定 workspaceRoot 调用。"
  });
});
