import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SCENARIOS } from "./data/scenarios.js";
import { assertPhysicalReviewCycleId } from "./contract.js";

const MODULE_PATH = fileURLToPath(import.meta.url);
const SOURCE_ROOT = await realpath(dirname(MODULE_PATH));
const COMMON_SOURCE_FILES = Object.freeze([
  "app.js",
  "contract.js",
  "styles.css",
  "data/questions.js",
  "server.mjs",
  "return-verifier.mjs"
]);

const CONFIG_MODULE_BY_SEAT = Object.freeze({
  A: "./package-builder/seat-a.config.mjs",
  B: "./package-builder/seat-b.config.mjs"
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function assertOutsideSourceRoot(outputRoot) {
  const relation = relative(SOURCE_ROOT, outputRoot);
  if (!relation || (!relation.startsWith("..") && !relation.includes(":"))) {
    throw new Error("物理交付包输出目录必须位于 pilot 源码树之外");
  }
}

async function loadSeatConfig(seatId) {
  const modulePath = CONFIG_MODULE_BY_SEAT[seatId];
  if (!modulePath) throw new Error("--seat 只能是 A 或 B");
  const module = await import(modulePath);
  const config = module.SEAT_PACKAGE_CONFIG;
  if (!config || config.seatId !== seatId || !/^seat-[ab]\.html$/u.test(config.entry)
    || !Array.isArray(config.order) || config.order.length !== 5 || new Set(config.order).size !== 5) {
    throw new Error("seat-specific package config 无效");
  }
  const scenarioIds = SCENARIOS.map((scenario) => scenario.id);
  if (config.order.some((id) => !scenarioIds.includes(id)) || scenarioIds.some((id) => !config.order.includes(id))) {
    throw new Error("seat-specific order 未精确覆盖五个场景");
  }
  return config;
}

async function readRegularSource(relativePath) {
  const sourcePath = resolve(SOURCE_ROOT, relativePath);
  const relation = relative(SOURCE_ROOT, sourcePath);
  if (!relation || relation.startsWith("..") || relation.includes(":")) throw new Error(`源码路径越界：${relativePath}`);
  const metadata = await lstat(sourcePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(`源码不是普通文件：${relativePath}`);
  const canonical = await realpath(sourcePath);
  const canonicalRelation = relative(SOURCE_ROOT, canonical);
  if (!canonicalRelation || canonicalRelation.startsWith("..") || canonicalRelation.includes(":")) {
    throw new Error(`源码 realpath 越界：${relativePath}`);
  }
  return readFile(canonical);
}

function generatedScenarioModule(config) {
  const scenarioJson = JSON.stringify(SCENARIOS, null, 2);
  const orderJson = JSON.stringify(config.order);
  return `// Generated deterministically for physical seat ${config.seatId}.\n`
    + `// This delivery module intentionally contains one seat order only.\n`
    + `const deepFreeze = (value) => {\n`
    + `  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;\n`
    + `  for (const child of Object.values(value)) deepFreeze(child);\n`
    + `  return Object.freeze(value);\n`
    + `};\n\n`
    + `export const SCENARIOS = deepFreeze(${scenarioJson});\n\n`
    + `export const SCENARIO_BY_ID = Object.freeze(Object.fromEntries(SCENARIOS.map((scenario) => [scenario.id, scenario])));\n\n`
    + `export const SEAT_ORDERS = Object.freeze({\n`
    + `  ${config.seatId}: Object.freeze(${orderJson})\n`
    + `});\n`;
}

function generatedPackageJson(config) {
  return jsonText({
    name: `hakimi-bazi-expert-review-pilot-seat-${config.seatId.toLowerCase()}`,
    version: "0.2.0",
    private: true,
    type: "module",
    scripts: {
      "start:after-external-pin-preflight": "node coordinator-launch.mjs",
      serve: `node server.mjs --entry ${config.entry}`
    }
  });
}

function generatedCoordinatorLauncher(config) {
  return [
    'let launchRejected = false;',
    'function rejectLaunch() {',
    '  if (!launchRejected) process.stderr.write("PILOT_LAUNCH_REJECTED；现场保留。\\n");',
    '  launchRejected = true;',
    '  process.exit(1);',
    '}',
    'process.on("uncaughtException", rejectLaunch);',
    'process.on("unhandledRejection", rejectLaunch);',
    '',
    'let builtinModules;',
    'try {',
    '  builtinModules = await Promise.all([',
    '    import("node:child_process"), import("node:crypto"), import("node:fs"),',
    '    import("node:fs/promises"), import("node:os"), import("node:path"), import("node:url")',
    '  ]);',
    '} catch { rejectLaunch(); }',
    'const [{ spawn }, { createHash }, { existsSync }, fsPromises, { tmpdir }, pathModule, { fileURLToPath }] = builtinModules;',
    'const { lstat, mkdir, mkdtemp, readFile, readdir, realpath, writeFile } = fsPromises;',
    'const { dirname, join, relative, resolve } = pathModule;',
    '',
    `const entry = ${JSON.stringify(config.entry)};`,
    `const seatId = ${JSON.stringify(config.seatId)};`,
    'const packageRoot = dirname(fileURLToPath(import.meta.url));',
    'let canonicalPackageRoot;',
    'try { canonicalPackageRoot = await realpath(packageRoot); } catch { rejectLaunch(); }',
    'const expectedManifestRawSha256 = process.env.HAKIMI_PILOT_EXPECTED_MANIFEST_SHA256;',
    'const expectedSeatId = process.env.HAKIMI_PILOT_EXPECTED_SEAT;',
    'const expectedReviewCycleId = process.env.HAKIMI_PILOT_EXPECTED_REVIEW_CYCLE;',
    'const pinProvenanceVerified = process.env.HAKIMI_PILOT_PIN_PROVENANCE_VERIFIED;',
    'if (typeof expectedManifestRawSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(expectedManifestRawSha256)',
    '  || expectedSeatId !== seatId || typeof expectedReviewCycleId !== "string"',
    '  || !/^pilot-review-cycle\\.[a-f0-9]{64}$/u.test(expectedReviewCycleId)',
    '  || pinProvenanceVerified !== "false") rejectLaunch();',
    `const bootstrapExpectedPayloads = Object.freeze(${JSON.stringify([
      ...COMMON_SOURCE_FILES,
      config.entry,
      "data/scenarios.js",
      "coordinator-launch.mjs",
      "START-PILOT.cmd",
      "START-HERE.txt",
      "package.json"
    ].sort())});`,
    'const bootstrapIdentity = (metadata) => [metadata.dev, metadata.ino, metadata.nlink, metadata.size, metadata.mtimeNs, metadata.ctimeNs].map(String).join(":");',
    'const bootstrapSha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");',
    'async function readBootstrapRegular(relativePath, maxBytes) {',
    '  const target = resolve(canonicalPackageRoot, ...relativePath.split("/"));',
    '  const relationToRoot = relative(canonicalPackageRoot, target);',
    '  if (!relationToRoot || relationToRoot.startsWith("..") || relationToRoot.includes(":")) throw new Error("BOOTSTRAP_PATH_INVALID");',
    '  const before = await lstat(target, { bigint: true });',
    '  const canonical = await realpath(target);',
    '  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n || before.size <= 0n',
    '    || before.size > BigInt(maxBytes) || canonical.toLowerCase() !== target.toLowerCase()) throw new Error("BOOTSTRAP_ENDPOINT_INVALID");',
    '  const bytes = await readFile(canonical);',
    '  const after = await lstat(target, { bigint: true });',
    '  const canonicalAfter = await realpath(target);',
    '  if (bytes.byteLength !== Number(before.size) || bootstrapIdentity(after) !== bootstrapIdentity(before)',
    '    || canonicalAfter.toLowerCase() !== canonical.toLowerCase()) throw new Error("BOOTSTRAP_ENDPOINT_CHANGED");',
    '  return bytes;',
    '}',
    'async function bootstrapPackagePayloads() {',
    '  const manifestBytes = await readBootstrapRegular("package-manifest.json", 1024 * 1024);',
    '  let manifest;',
    '  try {',
    '    const text = new TextDecoder("utf-8", { fatal: true }).decode(manifestBytes);',
    '    if (text.charCodeAt(0) === 0xfeff) throw new Error("BOM");',
    '    manifest = JSON.parse(text);',
    '  } catch { throw new Error("BOOTSTRAP_MANIFEST_INVALID"); }',
    '  const manifestRawSha256 = bootstrapSha256(manifestBytes);',
    '  if (manifestRawSha256 !== expectedManifestRawSha256',
    '    || manifest?.seatId !== expectedSeatId || manifest?.reviewCycleId !== expectedReviewCycleId) {',
    '    throw new Error("BOOTSTRAP_EXTERNAL_PIN_MISMATCH");',
    '  }',
    '  if (!manifest || manifest.schemaVersion !== "1.1.0"',
    '    || manifest.recordType !== "bazi_expert_review_pilot_physical_seat_package_manifest_v1"',
    '    || manifest.seatId !== seatId || manifest.selectedEntry !== entry',
    '    || typeof manifest.reviewCycleId !== "string" || !/^pilot-review-cycle\\.[a-f0-9]{64}$/u.test(manifest.reviewCycleId)',
    '    || manifest.trustedBootstrapEstablished !== false || manifest.packageAuthenticityEstablished !== false',
    '    || manifest.pinProvenanceVerified !== false || manifest.signature !== false',
    '    || manifest.samePrivilegeIntervalMutationExcluded !== false || manifest.samePackagePinFileIsTrustRoot !== false',
    '    || manifest.packageLocalDirectStartAllowed !== false',
    '    || manifest.realPersonDistributionReady !== false || manifest.sameCycleReplayExcluded !== false',
    '    || manifest.alternateDataStreamsEnumerated !== false || manifest.alternateDataStreamsExcluded !== false',
    '    || manifest.samePrivilegeConcurrentMutationExcluded !== false || manifest.atomicSessionCleanupEstablished !== false',
    '    || manifest.atomicObservationWriteEstablished !== false',
    '    || !Array.isArray(manifest.payloads)) throw new Error("BOOTSTRAP_MANIFEST_INVALID");',
    '  const paths = manifest.payloads.map((payload) => payload?.path);',
    '  if (JSON.stringify(paths) !== JSON.stringify(bootstrapExpectedPayloads)) throw new Error("BOOTSTRAP_PAYLOAD_SET_INVALID");',
    '  for (const payload of manifest.payloads) {',
    '    if (!payload || Object.keys(payload).sort().join(",") !== "byteLength,path,sha256"',
    '      || !Number.isSafeInteger(payload.byteLength) || payload.byteLength <= 0 || payload.byteLength > 8 * 1024 * 1024',
    '      || typeof payload.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(payload.sha256)) throw new Error("BOOTSTRAP_PAYLOAD_IDENTITY_INVALID");',
    '    const bytes = await readBootstrapRegular(payload.path, 8 * 1024 * 1024);',
    '    if (bytes.byteLength !== payload.byteLength || bootstrapSha256(bytes) !== payload.sha256) throw new Error("BOOTSTRAP_PAYLOAD_DRIFT");',
    '  }',
    '  return { manifestRawSha256 };',
    '}',
    'let bootstrapInspection;',
    'try { bootstrapInspection = await bootstrapPackagePayloads(); } catch { rejectLaunch(); }',
    'let packageModules;',
    'try { packageModules = await Promise.all([import("./server.mjs"), import("./return-verifier.mjs")]); } catch { rejectLaunch(); }',
    'const [{ createPilotServer }, { inspectPilotSeatPackage, removePilotSessionProfileIfExact, verifyPilotReturnDirectory }] = packageModules;',
    'let packageInspection;',
    'try { packageInspection = await inspectPilotSeatPackage(canonicalPackageRoot); } catch { rejectLaunch(); }',
    'if (packageInspection.manifestRawSha256 !== bootstrapInspection.manifestRawSha256) rejectLaunch();',
    'if (packageInspection.manifest.seatId !== seatId) throw new Error("package manifest seat 与启动器不匹配。");',
    'const reviewCycleId = packageInspection.manifest.reviewCycleId;',
    'const packageManifestRawSha256 = packageInspection.manifestRawSha256;',
    'const returnedMaterialsRoot = join(packageRoot, "returned-materials");',
    'try { await mkdir(returnedMaterialsRoot, { recursive: false }); } catch (error) { if (error?.code !== "EEXIST") throw error; }',
    'const returnedRootMetadata = await lstat(returnedMaterialsRoot);',
    'if (!returnedRootMetadata.isDirectory() || returnedRootMetadata.isSymbolicLink()) {',
    '  throw new Error("returned-materials 必须是包内普通目录，不能是 symlink 或 junction。");',
    '}',
    'const canonicalReturnedRoot = await realpath(returnedMaterialsRoot);',
    'if (dirname(canonicalReturnedRoot).toLowerCase() !== canonicalPackageRoot.toLowerCase()) {',
    '  throw new Error("returned-materials 的 realpath 不在当前物理单席包内。");',
    '}',
    'if ((await readdir(canonicalReturnedRoot)).length > 0) {',
    '  throw new Error("returned-materials 不是空目录；请先由协调人移走并隔离上一轮材料。");',
    '}',
    'const browserCandidates = [',
    '  process.env.ProgramFiles && join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),',
    '  process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),',
    '  process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Microsoft", "Edge", "Application", "msedge.exe"),',
    '  process.env.ProgramFiles && join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe"),',
    '  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")',
    '].filter(Boolean);',
    'const browserExecutable = browserCandidates.find((candidate) => existsSync(candidate));',
    'if (!browserExecutable) throw new Error("找不到可隔离启动的 Chrome 或 Edge；本启动器拒绝回退到默认浏览器。");',
    'const returnedMaterials = await mkdtemp(join(canonicalReturnedRoot, `seat-${seatId.toLowerCase()}-`));',
    'const canonicalReturnedMaterials = await realpath(returnedMaterials);',
    'const returnRelation = relative(canonicalReturnedRoot, canonicalReturnedMaterials);',
    'if (!returnRelation || returnRelation.startsWith("..") || returnRelation.includes(":")) {',
    '  throw new Error("本轮返回材料目录越过物理单席包边界。");',
    '}',
    'const canonicalTempRoot = await realpath(tmpdir());',
    'const sessionRoot = await mkdtemp(join(canonicalTempRoot, `hakimi-bazi-seat-${seatId.toLowerCase()}-`));',
    'const canonicalSessionRoot = await realpath(sessionRoot);',
    'const sessionMetadata = await lstat(canonicalSessionRoot, { bigint: true });',
    'const initialSessionIdentity = Object.freeze({ dev: sessionMetadata.dev, ino: sessionMetadata.ino });',
    'const sessionRelation = relative(canonicalTempRoot, canonicalSessionRoot);',
    'if (!sessionMetadata.isDirectory() || sessionMetadata.isSymbolicLink() || !sessionRelation || sessionRelation.startsWith("..") || sessionRelation.includes(":")) {',
    '  throw new Error("临时浏览器资料夹身份或边界无效。");',
    '}',
    'const profileRoot = join(canonicalSessionRoot, "browser-profile");',
    'await mkdir(join(profileRoot, "Default"), { recursive: true });',
    'await writeFile(join(profileRoot, "Default", "Preferences"), JSON.stringify({',
    '  download: { default_directory: canonicalReturnedMaterials, directory_upgrade: true, prompt_for_download: false },',
    '  profile: { default_content_setting_values: { automatic_downloads: 1 } }',
    '}), { encoding: "utf8", flag: "wx" });',
    '',
    'const server = createPilotServer({ entry });',
    'await new Promise((resolveListen, reject) => {',
    '  server.once("error", reject);',
    '  server.listen(0, "127.0.0.1", resolveListen);',
    '});',
    'const address = server.address();',
    'if (!address || typeof address === "string") throw new Error("无法取得本机监听端口");',
    'const query = new URLSearchParams({ reviewCycleId, packageManifestRawSha256 });',
    'const url = "http://127.0.0.1:" + address.port + "/?" + query.toString();',
    'let browserProcess = null;',
    'let stopping = false;',
    'let verifyingReturn = false;',
    'let returnVerified = false;',
    '',
    'async function terminateBrowser() {',
    '  if (!browserProcess || browserProcess.exitCode !== null || !browserProcess.pid) return true;',
    '  if (process.platform === "win32") {',
    '    return new Promise((resolveKill) => {',
    '      const killer = spawn("taskkill.exe", ["/PID", String(browserProcess.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });',
    '      killer.once("error", () => resolveKill(false));',
    '      killer.once("exit", (code) => resolveKill(code === 0 || code === 128));',
    '    });',
    '  }',
    '  browserProcess.kill("SIGTERM");',
    '  return true;',
    '}',
    '',
    'async function closeServerBounded() {',
    '  return new Promise((resolveClose) => {',
    '    let settled = false;',
    '    const timer = setTimeout(() => { if (!settled) { settled = true; resolveClose(false); } }, 3000);',
    '    server.close(() => {',
    '      if (settled) return;',
    '      settled = true;',
    '      clearTimeout(timer);',
    '      resolveClose(true);',
    '    });',
    '  });',
    '}',
    '',
    'async function removeSessionProfile(browserClosed, serverClosed) {',
    '  return removePilotSessionProfileIfExact({',
    '    canonicalTempRoot, canonicalSessionRoot, initialSessionIdentity, browserClosed, serverClosed',
    '  });',
    '}',
    '',
    'async function stop(exitCode = 0, reason = "", preserveSession = false) {',
    '  if (stopping) return;',
    '  stopping = true;',
    '  if (reason) process.stderr.write(reason + "\\n");',
    '  const browserClosed = await terminateBrowser();',
    '  const serverClosed = await closeServerBounded();',
    '  let profileRemoved = preserveSession;',
    '  if (!preserveSession && browserClosed && serverClosed) {',
    '    try { profileRemoved = (await removeSessionProfile(browserClosed, serverClosed)).removed; } catch { process.stderr.write("临时浏览器资料夹清理失败。\\n"); }',
    '  } else if (!preserveSession && (!browserClosed || !serverClosed)) {',
    '    process.stderr.write("浏览器或服务器关闭未确认；临时浏览器资料夹已保留。\\n");',
    '  }',
    '  if (!browserClosed || !serverClosed || !profileRemoved) exitCode = 1;',
    '  process.exit(exitCode);',
    '}',
    '',
    'browserProcess = spawn(browserExecutable, [',
    '  `--user-data-dir=${profileRoot}`,',
    '  "--disable-sync",',
    '  "--disable-extensions",',
    '  "--disable-background-networking",',
    '  "--disable-component-update",',
    '  "--no-first-run",',
    '  "--no-default-browser-check",',
    '  `--app=${url}`',
    '], { stdio: "ignore", windowsHide: false });',
    'browserProcess.once("error", () => { void stop(1, "隔离浏览器启动失败；现场保留。", true); });',
    'browserProcess.once("exit", () => { if (!stopping && !returnVerified) void stop(1, "隔离浏览器在回件验证前关闭；现场保留。", true); });',
    'process.stdout.write("八字专家试填 " + seatId + " 席已在独立浏览器资料夹中启动：" + url + "\\n");',
    'process.stdout.write("完整提交文件会保存到本包的本轮返回材料目录。\\n");',
    'process.stdout.write("下载完成后在此窗口按 Enter；只有回件校验通过才会关闭浏览器并清理临时资料夹。\\n");',
    'process.on("SIGINT", () => { void stop(1, "验证完成前中止；现场保留。", !returnVerified); });',
    'process.on("SIGTERM", () => { void stop(1, "验证完成前中止；现场保留。", !returnVerified); });',
    'process.stdin.resume();',
    'process.stdin.on("data", async () => {',
    '  if (verifyingReturn || returnVerified || stopping) return;',
    '  verifyingReturn = true;',
    '  try {',
    '    await verifyPilotReturnDirectory({ packageRoot: canonicalPackageRoot, returnDirectory: canonicalReturnedMaterials });',
    '    returnVerified = true;',
    '    process.stdout.write("回件机械校验通过，已在同一私密目录生成 authority-none 观察回执；仍不计入正式 2/2。\\n");',
    '    await stop(0);',
    '  } catch (error) {',
    '    const code = typeof error?.code === "string" ? error.code : "RETURN_VERIFICATION_FAILED";',
    '    process.stderr.write("回件校验未通过（" + code + "）；现场已保留，不得晋级。修正后可再次按 Enter。\\n");',
    '    verifyingReturn = false;',
    '  }',
    '});',
    ''
  ].join("\n");
}

function generatedStartCommand() {
  return "@echo off\r\necho 包内直启已关闭。请以 PowerShell -NoProfile 运行源码树 external-pin-prelaunch-candidate.ps1，并使用协调人在仓外另存的显式 manifest pin。\r\nexit /b 1\r\n";
}

function generatedCoordinatorGuide(config, reviewCycleId) {
  return `八字 v1.7 无代码专家试填 · ${config.seatId} 席 · 协调人启动卡\r\n`
    + `========================================================\r\n\r\n`
    + `当前 pinProvenanceVerified=false、signature=false、samePrivilegeIntervalMutationExcluded=false、distributionAuthorized=false、realPersonDistributionReady=false；即使 owner 允许继续开发，也不得把本可执行包交给现实专家。\r\n\r\n`
    + `本包 reviewCycleId：${reviewCycleId}\r\n\r\n`
    + `本包、package-manifest.json、START-HERE.txt、PAIR-MANIFEST.json 或任何同包 pin 文件都不是信任根。当前候选流程只能由协调人把 builder 控制台输出的 manifest pin 仓外另存后，以 PowerShell -NoProfile 运行源码树 external-pin-prelaunch-candidate.ps1；它仍不证明 wrapper、Node 或 pin 来源。\r\n\r\n`
    + `仅在 owner 另行建立可信 pin 来源或签名并取得明确分发授权后，才允许执行现实分发；当前仅可机械测试以下候选流程：\r\n`
    + `1. 本包只给 ${config.seatId} 席；A/B 必须使用不同物理目录，返回材料也不得共用。物理单席包本身不证明端到端独立性。\r\n`
    + `2. START-PILOT.cmd 与 Node 核心直启均已关闭。协调人在源码树运行：powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File .\\external-pin-prelaunch-candidate.ps1 --package-root <本席绝对路径> --manifest-sha256 <仓外另存的本席64hex pin> --seat ${config.seatId} --review-cycle ${reviewCycleId}。专家不需要运行命令，也不需要理解 AI 或代码。\r\n`
    + `3. 启动器只使用全新的临时 Chrome/Edge 资料夹，不打开默认浏览器历史、账号或扩展；找不到受支持浏览器时会失败关闭。\r\n`
    + `4. 专家完成五个场景、总体问题、使用感受与最终确认，然后点击“检查并锁定答卷”。\r\n`
    + `5. 页面出现“内容已锁定，尚未保存文件”后，点击“下载完整提交资料（一个文件）”。\r\n`
    + `6. 下载完成后回到启动窗口按 Enter；启动器会核对当前 cycle、seat、package manifest、四个内嵌工件及全部摘要，但包内自检不是信任根，也不建立 package authenticity。\r\n`
    + `7. 只有回件通过才会生成 authority-none handoff observation；浏览器与服务器均确认关闭且临时目录仍是最初 dev/ino 时才尝试清理。路径式递归删除仍不证明排除了同权限竞态或原子删除。\r\n`
    + `8. 将本轮 returned-materials 子目录中的文件作为私密、仓外材料保存，不上传仓库；确认 A 席窗口与材料均已隔离后，才可开始 B 席。\r\n\r\n`
    + `不同 cycle/hash 的错配会被拒绝；同一 cycle 的回放未排除。真实 NTFS ADS 未枚举、未排除。\r\n`
    + `本试填不计入正式专家 2/2，不证明专家身份、内容真值、科学有效性、包真实性或发布授权。\r\n`;
}

async function createOutputRoot(seatId, explicitOutput) {
  if (explicitOutput) {
    const outputRoot = resolve(explicitOutput);
    const canonicalParent = await realpath(dirname(outputRoot));
    const canonicalOutput = resolve(canonicalParent, basename(outputRoot));
    assertOutsideSourceRoot(canonicalOutput);
    await mkdir(outputRoot, { recursive: false });
    const createdCanonicalOutput = await realpath(outputRoot);
    assertOutsideSourceRoot(createdCanonicalOutput);
    if (createdCanonicalOutput.toLowerCase() !== canonicalOutput.toLowerCase()) {
      throw new Error("物理交付包输出目录 realpath 与预期不一致");
    }
    return createdCanonicalOutput;
  }
  const canonicalTempRoot = await realpath(tmpdir());
  assertOutsideSourceRoot(canonicalTempRoot);
  const outputRoot = await mkdtemp(join(canonicalTempRoot, `hakimi-bazi-pilot-seat-${seatId.toLowerCase()}-`));
  const canonicalOutput = await realpath(outputRoot);
  assertOutsideSourceRoot(canonicalOutput);
  return canonicalOutput;
}

async function writePayloadFile(outputRoot, relativePath, bytes) {
  const target = resolve(outputRoot, relativePath);
  const relation = relative(outputRoot, target);
  if (!relation || relation.startsWith("..") || relation.includes(":")) throw new Error(`输出路径越界：${relativePath}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return Object.freeze({ path: relativePath.replaceAll("\\", "/"), byteLength: bytes.byteLength, sha256: sha256(bytes) });
}

export async function buildSeatPackage({ seatId, reviewCycleId, outputDirectory = null } = {}) {
  assertPhysicalReviewCycleId(reviewCycleId);
  const config = await loadSeatConfig(seatId);
  const outputRoot = await createOutputRoot(seatId, outputDirectory);
  let completed = false;
  try {
    const payloads = [];
    for (const relativePath of COMMON_SOURCE_FILES) {
      payloads.push(await writePayloadFile(outputRoot, relativePath, await readRegularSource(relativePath)));
    }
    payloads.push(await writePayloadFile(outputRoot, config.entry, await readRegularSource(config.entry)));
    payloads.push(await writePayloadFile(
      outputRoot,
      "data/scenarios.js",
      Buffer.from(generatedScenarioModule(config), "utf8")
    ));
    payloads.push(await writePayloadFile(
      outputRoot,
      "coordinator-launch.mjs",
      Buffer.from(generatedCoordinatorLauncher(config), "utf8")
    ));
    payloads.push(await writePayloadFile(outputRoot, "START-PILOT.cmd", Buffer.from(generatedStartCommand(), "utf8")));
    payloads.push(await writePayloadFile(outputRoot, "START-HERE.txt", Buffer.from(generatedCoordinatorGuide(config, reviewCycleId), "utf8")));
    payloads.push(await writePayloadFile(outputRoot, "package.json", Buffer.from(generatedPackageJson(config), "utf8")));
    payloads.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
    const manifest = {
      schemaVersion: "1.1.0",
      recordType: "bazi_expert_review_pilot_physical_seat_package_manifest_v1",
      packageId: `hakimi.bazi.expert-review-pilot.physical-seat-${seatId.toLowerCase()}/0.2.0`,
      reviewCycleId,
      seatId,
      selectedEntry: config.entry,
      selectedOrder: [...config.order],
      containsOppositeSeatEntry: false,
      containsMultipleSeatOrders: false,
      isolatedBrowserProfileLauncherIncluded: true,
      defaultBrowserProfileUsedByLauncher: false,
      packageLocalReturnDirectoryConfigured: true,
      returnVerifierIncluded: true,
      endToEndOpinionIndependenceEstablished: false,
      distributionAuthorized: false,
      countsTowardFormal2of2: false,
      countsTowardExpertGate: false,
      formalConversionAllowed: false,
      trustedBootstrapEstablished: false,
      packageAuthenticityEstablished: false,
      pinProvenanceVerified: false,
      signature: false,
      samePrivilegeIntervalMutationExcluded: false,
      samePackagePinFileIsTrustRoot: false,
      packageLocalDirectStartAllowed: false,
      realPersonDistributionReady: false,
      sameCycleReplayExcluded: false,
      alternateDataStreamsEnumerated: false,
      alternateDataStreamsExcluded: false,
      samePrivilegeConcurrentMutationExcluded: false,
      atomicSessionCleanupEstablished: false,
      atomicObservationWriteEstablished: false,
      payloads
    };
    const manifestEntry = await writePayloadFile(
      outputRoot,
      "package-manifest.json",
      Buffer.from(jsonText(manifest), "utf8")
    );
    completed = true;
    return Object.freeze({
      outputDirectory: outputRoot,
      seatId,
      entry: config.entry,
      reviewCycleId,
      packageManifestRawSha256: manifestEntry.sha256,
      files: Object.freeze([...payloads, manifestEntry].map((item) => item.path).sort()),
      manifest: Object.freeze(manifest)
    });
  } finally {
    if (!completed) await rm(outputRoot, { recursive: true, force: true });
  }
}

export function createOpaqueReviewCycleId() {
  return `pilot-review-cycle.${randomBytes(32).toString("hex")}`;
}

export async function buildPairedSeatPackages({ reviewCycleId, outputDirectory = null } = {}) {
  assertPhysicalReviewCycleId(reviewCycleId);
  const pairRoot = await createOutputRoot("pair", outputDirectory);
  let completed = false;
  try {
    const seatA = await buildSeatPackage({
      seatId: "A",
      reviewCycleId,
      outputDirectory: join(pairRoot, "seat-a")
    });
    const seatB = await buildSeatPackage({
      seatId: "B",
      reviewCycleId,
      outputDirectory: join(pairRoot, "seat-b")
    });
    const pairManifest = {
      schemaVersion: "1.0.0",
      recordType: "bazi_expert_review_pilot_physical_pair_manifest_v1",
      pairId: `hakimi.bazi.expert-review-pilot.physical-pair/0.1.0`,
      reviewCycleId,
      physicalSeatDirectoriesMustBeDistributedSeparately: true,
      endToEndOpinionIndependenceEstablished: false,
      distributionAuthorized: false,
      countsTowardFormal2of2: false,
      countsTowardExpertGate: false,
      formalConversionAllowed: false,
      trustedBootstrapEstablished: false,
      packageAuthenticityEstablished: false,
      pinProvenanceVerified: false,
      signature: false,
      samePrivilegeIntervalMutationExcluded: false,
      samePackagePinFileIsTrustRoot: false,
      realPersonDistributionReady: false,
      sameCycleReplayExcluded: false,
      alternateDataStreamsEnumerated: false,
      alternateDataStreamsExcluded: false,
      samePrivilegeConcurrentMutationExcluded: false,
      atomicSessionCleanupEstablished: false,
      atomicObservationWriteEstablished: false,
      manifestPinCandidatesForExternalRecording: [
        {
          seatId: "A",
          reviewCycleId,
          packageManifestRawSha256: seatA.packageManifestRawSha256,
          pinProvenanceVerified: false,
          signature: false,
          samePrivilegeIntervalMutationExcluded: false,
          realPersonDistributionReady: false,
          samePackagePinFileIsTrustRoot: false
        },
        {
          seatId: "B",
          reviewCycleId,
          packageManifestRawSha256: seatB.packageManifestRawSha256,
          pinProvenanceVerified: false,
          signature: false,
          samePrivilegeIntervalMutationExcluded: false,
          realPersonDistributionReady: false,
          samePackagePinFileIsTrustRoot: false
        }
      ],
      seatPackages: [
        {
          seatId: "A",
          relativeDirectory: "seat-a",
          packageManifestRawSha256: seatA.packageManifestRawSha256
        },
        {
          seatId: "B",
          relativeDirectory: "seat-b",
          packageManifestRawSha256: seatB.packageManifestRawSha256
        }
      ]
    };
    await writePayloadFile(pairRoot, "PAIR-MANIFEST.json", Buffer.from(jsonText(pairManifest), "utf8"));
    await writePayloadFile(pairRoot, "PAIR-START-HERE.txt", Buffer.from(
      `八字 v1.7 无代码专家试填 · 配对交接卡\r\n`
      + `========================================\r\n\r\n`
      + `reviewCycleId：${reviewCycleId}\r\n\r\n`
      + `当前 pinProvenanceVerified=false、signature=false、samePrivilegeIntervalMutationExcluded=false、distributionAuthorized=false、realPersonDistributionReady=false；现实分发必须停止。\r\n`
      + `builder 控制台会输出 A/B 的 manifest pin 候选，供协调人仓外分别记录；PAIR-MANIFEST.json、PAIR-START-HERE.txt 以及任何与包同存的 pin 文件都不是信任根。\r\n`
      + `仅在另行建立可信启动根并取得明确分发授权后，seat-a 与 seat-b 才能作为两个互不可见的物理目录分别交付；不得把本 pair 根目录交给任一专家。\r\n`
      + `两席回件均只属于易用性与题目质量 pilot，不计入正式专家 2/2，也不得自动转换为 formal intake；不同 cycle/hash 错配会拒绝，但同 cycle replay 未排除。\r\n`,
      "utf8"
    ));
    completed = true;
    return Object.freeze({
      outputDirectory: pairRoot,
      reviewCycleId,
      pairManifest: Object.freeze(pairManifest),
      seatA,
      seatB
    });
  } finally {
    if (!completed) await rm(pairRoot, { recursive: true, force: true });
  }
}

function option(args, name, fallback = null) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

export async function runPackageBuilderCli(args = process.argv.slice(2)) {
  const seatId = option(args, "--seat");
  const outputDirectory = option(args, "--output");
  const newCycleRequested = args.includes("--new-review-cycle");
  let reviewCycleId = option(args, "--review-cycle");
  if (newCycleRequested) {
    if (reviewCycleId !== null) throw new Error("--new-review-cycle 与 --review-cycle 不能同时使用");
    reviewCycleId = createOpaqueReviewCycleId();
  }
  assertPhysicalReviewCycleId(reviewCycleId);
  const pairRequested = args.includes("--pair");
  if (pairRequested && seatId !== null) throw new Error("--pair 与 --seat 不能同时使用");
  const result = pairRequested
    ? await buildPairedSeatPackages({ reviewCycleId, outputDirectory })
    : await buildSeatPackage({ seatId, reviewCycleId, outputDirectory });
  process.stdout.write(`${result.outputDirectory}\n`);
  process.stdout.write(`${reviewCycleId}\n`);
  if (pairRequested) {
    process.stdout.write(`PIN-CANDIDATE A ${result.seatA.packageManifestRawSha256}\n`);
    process.stdout.write(`PIN-CANDIDATE B ${result.seatB.packageManifestRawSha256}\n`);
    process.stdout.write("PIN-BOUNDARY pinProvenanceVerified=false signature=false samePrivilegeIntervalMutationExcluded=false samePackagePinFileIsTrustRoot=false realPersonDistributionReady=false\n");
  } else {
    process.stdout.write(`PIN-CANDIDATE ${result.seatId} ${result.packageManifestRawSha256}\n`);
    process.stdout.write("PIN-BOUNDARY pinProvenanceVerified=false signature=false samePrivilegeIntervalMutationExcluded=false samePackagePinFileIsTrustRoot=false realPersonDistributionReady=false\n");
  }
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) await runPackageBuilderCli();
