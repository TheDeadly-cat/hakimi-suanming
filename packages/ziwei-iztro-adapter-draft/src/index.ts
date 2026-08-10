import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { Worker as NodeWorker } from "node:worker_threads";
import {
  ZIWEI_DIGEST_ALGORITHM,
  ZIWEI_DIGEST_VERIFICATION,
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
  ZIWEI_DOUSHU_SYSTEM_ID,
  calculateZiweiNatalFixtureDigests,
  sha256ZiweiCanonicalJson,
  verifyZiweiNatalFixtureDraft,
  ziweiBirthInputDraftSchema,
  ziweiNatalFactsDraftSchema,
  ziweiRuleSnapshotDraftSchema
} from "./contract-bridge.ts";
import type {
  ZiweiBirthInputDraft,
  ZiweiNatalFactsDraft,
  ZiweiNatalFixtureDraft,
  ZiweiRuleSnapshotDraft
} from "./contract-bridge.ts";

export const ZIWEI_IZTRO_ADAPTER_DRAFT_VERSION = "0.1.0" as const;
export const ZIWEI_IZTRO_ADAPTER_ID = "hakimi.ziwei.iztro.node_adapter" as const;
export const ZIWEI_IZTRO_UPSTREAM_VERSION = "2.5.8" as const;
export const ZIWEI_IZTRO_UPSTREAM_COMMIT = "9d39f1743bf31c2b3c635c9b9556215d9c90ee2c" as const;
export const ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION = "hakimi-ziwei-iztro-worker/0.1-draft" as const;

const WORKER_ENTRY_URL = new URL("./node-worker-entry.mjs", import.meta.url);
const DEPENDENCY_LOCK_CLOSURE_URL = new URL("./iztro-2.5.8-lock-closure.json", import.meta.url);
const WORKSPACE_PACKAGE_LOCK_URL = new URL("../../../package-lock.json", import.meta.url);
const WORKSPACE_PACKAGE_MANIFEST_URL = new URL("../../../package.json", import.meta.url);
const ZERO_SHA256 = "0".repeat(64);
const DEFAULT_TIMEOUT_MS = 15_000;
const IMPLEMENTATION_SOURCE_ID = "source:iztro-2.5.8" as const;
const LICENSE_SOURCE_ID = "source:iztro-mit-license" as const;

type StarRegistryEntry = ZiweiRuleSnapshotDraft["rules"]["starRegistry"]["entries"][number];
type MutagenEntry = ZiweiRuleSnapshotDraft["rules"]["mutagenTable"]["entries"][number];
type BrightnessEntry = ZiweiRuleSnapshotDraft["rules"]["brightnessTable"]["entries"][number];

type DependencyLockEdge = Readonly<{
  name: string;
  requested: string;
  resolvedPackagePath: string;
  resolvedVersion: string;
}>;

type DependencyLockNode = Readonly<{
  packagePath: string;
  name: string;
  version: string;
  resolved: string;
  integrity: string;
  dependencies: readonly DependencyLockEdge[];
}>;

type DependencyLockClosure = Readonly<{
  schemaVersion: 1;
  proofScope: "package_lock_closure_identity_not_installed_bytes";
  lockfileVersion: 3;
  entryPackage: Readonly<{
    packagePath: string;
    name: string;
    version: string;
    dependencies: readonly DependencyLockEdge[];
  }>;
  rootOverrides: Readonly<Record<string, string>>;
  nodes: readonly DependencyLockNode[];
}>;

type AdapterLocks = Readonly<{
  adapterSourceSha256: string;
  workerEntrySha256: string;
  dependencyGraphSha256: string;
  dependencyLockClosure: DependencyLockClosure;
}>;

type FrozenProfile = Readonly<{
  runtimeVersions: Readonly<Record<string, string>>;
  upstreamNpmIntegrity: string;
  workerProtocolVersion: string;
  starRegistryEntries: readonly StarRegistryEntry[];
  mutagenEntries: readonly MutagenEntry[];
  brightnessEntries: readonly BrightnessEntry[];
  canonicalBranchOrder: readonly string[];
  missingStarPolicy: string;
}>;

type WorkerSuccess<T> = Readonly<{
  ok: true;
  protocolVersion: string;
  requestId: string;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  runtimeVersion: string;
  result: T;
}>;

type WorkerFailure = Readonly<{
  ok: false;
  protocolVersion: string;
  requestId: string | null;
  workerInstanceId: string;
  startedAt: string;
  completedAt: string;
  runtimeVersion: string;
  error: Readonly<{ code: string; message: string }>;
}>;

type WorkerResponse<T> = WorkerSuccess<T> | WorkerFailure;

type WorkerRun<T> = Readonly<{
  response: WorkerSuccess<T>;
  exitCode: 0;
}>;

export class ZiweiIztroAdapterDraftError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ZiweiIztroAdapterDraftError";
    this.code = code;
  }
}

const BUNDLED_DEPENDENCY_LOCK_CLOSURE = requireDependencyLockClosure(
  JSON.parse(readFileSync(DEPENDENCY_LOCK_CLOSURE_URL, "utf8")) as unknown
);
const IZTRO_DEPENDENCY_LOCK_NODE = requireDependencyLockNode(
  BUNDLED_DEPENDENCY_LOCK_CLOSURE,
  "iztro"
);
export const ZIWEI_IZTRO_NPM_INTEGRITY = IZTRO_DEPENDENCY_LOCK_NODE.integrity;

export type ZiweiIztroCalculationOptions = Readonly<{
  ruleSnapshot?: ZiweiRuleSnapshotDraft;
  signal?: AbortSignal;
  timeoutMs?: number;
}>;

function createFixedSourceCatalog(): ZiweiRuleSnapshotDraft["sourceCatalog"] {
  return [
    {
      sourceId: IMPLEMENTATION_SOURCE_ID,
      kind: "implementation_reference",
      title: "iztro 2.5.8 fixed implementation source",
      publisher: "SylarLong/iztro contributors",
      url: `https://github.com/SylarLong/iztro/tree/${ZIWEI_IZTRO_UPSTREAM_COMMIT}`,
      versionOrDate: `2.5.8 / ${ZIWEI_IZTRO_UPSTREAM_COMMIT}`,
      retrievedAt: "2026-08-10T00:00:00.000+08:00",
      usage: "adapter_behavior",
      rightsStatus: "mit_notice_required",
      notes: "Engineering implementation reference only; it is not an expert-truth source."
    },
    {
      sourceId: LICENSE_SOURCE_ID,
      kind: "license",
      title: "iztro MIT License",
      publisher: "SylarLong/iztro contributors",
      url: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/LICENSE`,
      versionOrDate: "2.5.8",
      retrievedAt: "2026-08-10T00:00:00.000+08:00",
      usage: "link_only",
      rightsStatus: "mit_notice_required",
      notes: "License notice source; not a legal conclusion or permission for unrelated data."
    }
  ];
}

export async function createIztro258RuleSnapshotDraft(): Promise<ZiweiRuleSnapshotDraft> {
  const adapterLocks = await calculateAdapterLocks();
  const requestId = randomUUID();
  const { response } = await runFreshWorker<FrozenProfile>({
    protocolVersion: ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION,
    requestId,
    action: "profile"
  });
  const profile = requireFrozenProfile(response.result);
  verifyRuntimeProfile(profile, adapterLocks.dependencyLockClosure);
  const [starRegistrySha256, mutagenTableSha256, brightnessTableSha256] = await Promise.all([
    sha256ZiweiCanonicalJson(profile.starRegistryEntries),
    sha256ZiweiCanonicalJson(profile.mutagenEntries),
    sha256ZiweiCanonicalJson({
      canonicalBranchOrder: profile.canonicalBranchOrder,
      missingStarPolicy: profile.missingStarPolicy,
      entries: profile.brightnessEntries
    })
  ]);

  const candidate: ZiweiRuleSnapshotDraft = {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    profileId: "iztro.2_5_8.default_heaven",
    profileVersion: "0.1.0",
    status: "contract_draft",
    engine: {
      adapterId: ZIWEI_IZTRO_ADAPTER_ID,
      adapterVersion: ZIWEI_IZTRO_ADAPTER_DRAFT_VERSION,
      upstreamName: "iztro",
      upstreamVersion: ZIWEI_IZTRO_UPSTREAM_VERSION,
      upstreamCommit: ZIWEI_IZTRO_UPSTREAM_COMMIT,
      upstreamNpmIntegrity: ZIWEI_IZTRO_NPM_INTEGRITY,
      dependencyGraphSha256: adapterLocks.dependencyGraphSha256,
      adapterSourceSha256: adapterLocks.adapterSourceSha256,
      workerEntrySha256: adapterLocks.workerEntrySha256,
      workerProtocolVersion: ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION,
      isolation: "fresh_worker_per_calculation",
      isolatedExecution: true,
      configurationMode: "full_snapshot_per_calculation",
      sourceIds: [IMPLEMENTATION_SOURCE_ID, LICENSE_SOURCE_ID]
    },
    verifiedRange: {
      from: "1900-01-01",
      to: "2100-12-31",
      outsideRangePolicy: "reject"
    },
    rules: {
      leapMonthPlacement: { mode: "iztro_fix_leap", cutoffDay: 15 },
      yearBoundary: "lunar_new_year",
      horoscopeBoundary: "lunar_new_year",
      lateZiDay: "next_civil_day",
      ageBoundary: "calendar_year",
      algorithm: "iztro_default",
      chartType: "heaven",
      starRegistry: {
        tableId: "iztro.2_5_8.zh_cn_star_registry",
        tableVersion: "2.5.8",
        contentSha256: starRegistrySha256,
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/i18n/locales/zh-CN/star.ts`,
        entryCount: 162,
        entries: [...profile.starRegistryEntries],
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      mutagenTable: {
        tableId: "iztro.2_5_8.default_mutagens",
        tableVersion: "2.5.8",
        contentSha256: mutagenTableSha256,
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/data/heavenlyStems.ts`,
        entryCount: 10,
        entries: [...profile.mutagenEntries],
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      brightnessTable: {
        tableId: "iztro.2_5_8.default_brightness",
        tableVersion: "2.5.8",
        contentSha256: brightnessTableSha256,
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/data/stars.ts`,
        entryCount: 20,
        canonicalBranchOrder: [...profile.canonicalBranchOrder] as ZiweiRuleSnapshotDraft["rules"]["brightnessTable"]["canonicalBranchOrder"],
        missingStarPolicy: "null_brightness",
        entries: [...profile.brightnessEntries],
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      enabledFactFamilies: ["calendar", "palaces", "natal_stars", "transformations", "major_periods"],
      interpretationIncluded: false
    },
    sourceCatalog: createFixedSourceCatalog(),
    review: { status: "unreviewed", attestations: [] },
    ruleSnapshotSha256: ZERO_SHA256
  };
  candidate.ruleSnapshotSha256 = await sha256ZiweiCanonicalJson(stripRuleSelfDigest(candidate));
  return ziweiRuleSnapshotDraftSchema.parse(candidate);
}

export async function calculateIztro258EngineeringFixture(
  inputCandidate: unknown,
  options: ZiweiIztroCalculationOptions = {}
): Promise<ZiweiNatalFixtureDraft> {
  const input = ziweiBirthInputDraftSchema.parse(inputCandidate);
  const ruleSnapshot = ziweiRuleSnapshotDraftSchema.parse(
    options.ruleSnapshot ?? await createIztro258RuleSnapshotDraft()
  );
  await verifyRuleSnapshotLock(ruleSnapshot);
  verifyFixedEngineIdentity(ruleSnapshot, await calculateAdapterLocks());
  const requestId = randomUUID();
  const run = await runFreshWorker<Readonly<{ profile: FrozenProfile; facts: ZiweiNatalFactsDraft }>>({
    protocolVersion: ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION,
    requestId,
    action: "calculate",
    input,
    ruleSnapshot
  }, options);
  const profile = requireFrozenProfile(run.response.result.profile);
  await verifyEngineLock(ruleSnapshot, profile);
  const facts = ziweiNatalFactsDraftSchema.parse(run.response.result.facts);
  const receiptEngine = {
    adapterId: ruleSnapshot.engine.adapterId,
    adapterVersion: ruleSnapshot.engine.adapterVersion,
    upstreamName: ruleSnapshot.engine.upstreamName,
    upstreamVersion: ruleSnapshot.engine.upstreamVersion,
    upstreamCommit: ruleSnapshot.engine.upstreamCommit,
    upstreamNpmIntegrity: ruleSnapshot.engine.upstreamNpmIntegrity,
    dependencyGraphSha256: ruleSnapshot.engine.dependencyGraphSha256,
    adapterSourceSha256: ruleSnapshot.engine.adapterSourceSha256,
    workerEntrySha256: ruleSnapshot.engine.workerEntrySha256,
    workerProtocolVersion: ruleSnapshot.engine.workerProtocolVersion,
    isolation: ruleSnapshot.engine.isolation,
    runtime: "node" as const,
    runtimeVersion: run.response.runtimeVersion,
    requestId,
    workerInstanceId: run.response.workerInstanceId,
    startedAt: run.response.startedAt,
    completedAt: run.response.completedAt,
    exitCode: run.exitCode
  };
  const fixture: ZiweiNatalFixtureDraft = {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    artifactKind: "ziwei_natal_engineering_fixture",
    input,
    ruleSnapshot,
    facts,
    provenance: [
      provenance("calendar", "facts.calendarFacts", "iztro.2_5_8.calendar_resolution"),
      provenance("palaces", "facts.palaces", "iztro.2_5_8.natal_palaces"),
      provenance("natal_stars", "facts.palaces", "iztro.2_5_8.natal_star_placement"),
      provenance("transformations", "facts.palaces", "iztro.2_5_8.birth_year_mutagens"),
      provenance("major_periods", "facts.majorPeriods", "iztro.2_5_8.major_periods")
    ],
    evidence: {
      truthStatus: "upstream_regression",
      claimScopes: ["adapter_behavior", "chart_structure"],
      productionEligible: false,
      expertTruthClaimed: false,
      note: "Fresh-Worker output bound to the exact package-lock closure identity; installed node_modules bytes are not re-hashed, and this remains engineering upstream behavior rather than expert truth."
    },
    receipt: {
      receiptVersion: "ziwei-calculation-receipt/0.3-draft",
      engine: receiptEngine,
      profileId: ruleSnapshot.profileId,
      profileVersion: ruleSnapshot.profileVersion,
      digestAlgorithm: ZIWEI_DIGEST_ALGORITHM,
      inputSha256: ZERO_SHA256,
      ruleSnapshotSha256: ruleSnapshot.ruleSnapshotSha256,
      factsSha256: ZERO_SHA256,
      artifactSha256: ZERO_SHA256,
      calculatedAt: run.response.completedAt,
      fallbackUsed: false,
      interpretationIncluded: false,
      warnings: [],
      knownGaps: [
        "This Node-only adapter draft is isolated from the Bazi Web app and is not an expert-reviewed production engine.",
        "The dependency digest proves the reviewed package-lock closure identity, not a byte-for-byte re-hash of installed node_modules.",
        "Earth/human charts and leap-month late-Zi inputs remain fail-closed."
      ],
      digestVerification: ZIWEI_DIGEST_VERIFICATION
    }
  };
  const structurallyParsed = await parseWithFreshDigests(fixture);
  const verified = await verifyZiweiNatalFixtureDraft(structurallyParsed);
  if (!verified.success) {
    throw new ZiweiIztroAdapterDraftError(
      "ARTIFACT_DIGEST_VERIFICATION_FAILED",
      `The generated artifact failed its canonical digest gate: ${verified.reason}`
    );
  }
  return verified.data;
}

async function parseWithFreshDigests(fixture: ZiweiNatalFixtureDraft): Promise<ZiweiNatalFixtureDraft> {
  Object.assign(fixture.receipt, await calculateZiweiNatalFixtureDigests(fixture));
  return fixture;
}

function provenance(
  factFamily: ZiweiNatalFixtureDraft["provenance"][number]["factFamily"],
  fieldPath: string,
  algorithmId: string
): ZiweiNatalFixtureDraft["provenance"][number] {
  return {
    factFamily,
    fieldPath,
    algorithmId,
    sourceIds: [IMPLEMENTATION_SOURCE_ID],
    verificationStatus: "engineering_fixture_only"
  };
}

async function verifyRuleSnapshotLock(ruleSnapshot: ZiweiRuleSnapshotDraft): Promise<void> {
  const expectedRuleDigest = await sha256ZiweiCanonicalJson(stripRuleSelfDigest(ruleSnapshot));
  if (expectedRuleDigest !== ruleSnapshot.ruleSnapshotSha256) {
    throw new ZiweiIztroAdapterDraftError("RULE_SNAPSHOT_DIGEST_MISMATCH", "Rule snapshot content does not match its embedded digest");
  }
  const [starRegistrySha256, mutagenTableSha256, brightnessTableSha256] = await Promise.all([
    sha256ZiweiCanonicalJson(ruleSnapshot.rules.starRegistry.entries),
    sha256ZiweiCanonicalJson(ruleSnapshot.rules.mutagenTable.entries),
    sha256ZiweiCanonicalJson({
      canonicalBranchOrder: ruleSnapshot.rules.brightnessTable.canonicalBranchOrder,
      missingStarPolicy: ruleSnapshot.rules.brightnessTable.missingStarPolicy,
      entries: ruleSnapshot.rules.brightnessTable.entries
    })
  ]);
  const mismatches = [
    ["starRegistry", starRegistrySha256, ruleSnapshot.rules.starRegistry.contentSha256],
    ["mutagenTable", mutagenTableSha256, ruleSnapshot.rules.mutagenTable.contentSha256],
    ["brightnessTable", brightnessTableSha256, ruleSnapshot.rules.brightnessTable.contentSha256]
  ].filter(([, expected, actual]) => expected !== actual);
  if (mismatches.length > 0) {
    throw new ZiweiIztroAdapterDraftError(
      "RULE_TABLE_CONTENT_DIGEST_MISMATCH",
      `Rule table content digest mismatch: ${mismatches.map(([name]) => name).join(", ")}`
    );
  }
  verifyFixedRuleProfileIdentity(ruleSnapshot);
}

function verifyFixedRuleProfileIdentity(ruleSnapshot: ZiweiRuleSnapshotDraft): void {
  const tableIdentity = (table: {
    tableId: string;
    tableVersion: string;
    immutableLocator: string;
    entryCount: number;
    sourceIds: readonly string[];
  }) => ({
    tableId: table.tableId,
    tableVersion: table.tableVersion,
    immutableLocator: table.immutableLocator,
    entryCount: table.entryCount,
    sourceIds: table.sourceIds
  });
  const actual = {
    contractVersion: ruleSnapshot.contractVersion,
    systemId: ruleSnapshot.systemId,
    profileId: ruleSnapshot.profileId,
    profileVersion: ruleSnapshot.profileVersion,
    status: ruleSnapshot.status,
    verifiedRange: ruleSnapshot.verifiedRange,
    rules: {
      leapMonthPlacement: ruleSnapshot.rules.leapMonthPlacement,
      yearBoundary: ruleSnapshot.rules.yearBoundary,
      horoscopeBoundary: ruleSnapshot.rules.horoscopeBoundary,
      lateZiDay: ruleSnapshot.rules.lateZiDay,
      ageBoundary: ruleSnapshot.rules.ageBoundary,
      algorithm: ruleSnapshot.rules.algorithm,
      chartType: ruleSnapshot.rules.chartType,
      starRegistry: tableIdentity(ruleSnapshot.rules.starRegistry),
      mutagenTable: tableIdentity(ruleSnapshot.rules.mutagenTable),
      brightnessTable: tableIdentity(ruleSnapshot.rules.brightnessTable),
      enabledFactFamilies: ruleSnapshot.rules.enabledFactFamilies,
      interpretationIncluded: ruleSnapshot.rules.interpretationIncluded
    },
    sourceCatalog: ruleSnapshot.sourceCatalog,
    review: ruleSnapshot.review
  };
  const expected = {
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: ZIWEI_DOUSHU_SYSTEM_ID,
    profileId: "iztro.2_5_8.default_heaven",
    profileVersion: "0.1.0",
    status: "contract_draft",
    verifiedRange: {
      from: "1900-01-01",
      to: "2100-12-31",
      outsideRangePolicy: "reject"
    },
    rules: {
      leapMonthPlacement: { mode: "iztro_fix_leap", cutoffDay: 15 },
      yearBoundary: "lunar_new_year",
      horoscopeBoundary: "lunar_new_year",
      lateZiDay: "next_civil_day",
      ageBoundary: "calendar_year",
      algorithm: "iztro_default",
      chartType: "heaven",
      starRegistry: {
        tableId: "iztro.2_5_8.zh_cn_star_registry",
        tableVersion: "2.5.8",
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/i18n/locales/zh-CN/star.ts`,
        entryCount: 162,
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      mutagenTable: {
        tableId: "iztro.2_5_8.default_mutagens",
        tableVersion: "2.5.8",
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/data/heavenlyStems.ts`,
        entryCount: 10,
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      brightnessTable: {
        tableId: "iztro.2_5_8.default_brightness",
        tableVersion: "2.5.8",
        immutableLocator: `https://github.com/SylarLong/iztro/blob/${ZIWEI_IZTRO_UPSTREAM_COMMIT}/src/data/stars.ts`,
        entryCount: 20,
        sourceIds: [IMPLEMENTATION_SOURCE_ID]
      },
      enabledFactFamilies: ["calendar", "palaces", "natal_stars", "transformations", "major_periods"],
      interpretationIncluded: false
    },
    sourceCatalog: createFixedSourceCatalog(),
    review: { status: "unreviewed", attestations: [] }
  };
  if (!sameCanonicalJson(actual, expected)) {
    throw new ZiweiIztroAdapterDraftError(
      "RULE_PROFILE_IDENTITY_MISMATCH",
      "Rule snapshot metadata, source evidence, verified range, or first-slice rule choices differ from the fixed iztro profile"
    );
  }
}

async function verifyEngineLock(ruleSnapshot: ZiweiRuleSnapshotDraft, profile: FrozenProfile): Promise<void> {
  const adapterLocks = await calculateAdapterLocks();
  verifyFixedEngineIdentity(ruleSnapshot, adapterLocks);
  verifyRuntimeProfile(profile, adapterLocks.dependencyLockClosure);
}

function verifyFixedEngineIdentity(ruleSnapshot: ZiweiRuleSnapshotDraft, adapterLocks: AdapterLocks): void {
  const expected = ruleSnapshot.engine;
  if (expected.adapterId !== ZIWEI_IZTRO_ADAPTER_ID
    || expected.adapterVersion !== ZIWEI_IZTRO_ADAPTER_DRAFT_VERSION
    || expected.upstreamName !== "iztro"
    || expected.upstreamVersion !== ZIWEI_IZTRO_UPSTREAM_VERSION
    || expected.upstreamCommit !== ZIWEI_IZTRO_UPSTREAM_COMMIT
    || expected.upstreamNpmIntegrity !== ZIWEI_IZTRO_NPM_INTEGRITY
    || expected.dependencyGraphSha256 !== adapterLocks.dependencyGraphSha256
    || expected.adapterSourceSha256 !== adapterLocks.adapterSourceSha256
    || expected.workerEntrySha256 !== adapterLocks.workerEntrySha256
    || expected.workerProtocolVersion !== ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION
    || expected.isolation !== "fresh_worker_per_calculation"
    || expected.isolatedExecution !== true
    || expected.configurationMode !== "full_snapshot_per_calculation"
    || !sameCanonicalJson(expected.sourceIds, [IMPLEMENTATION_SOURCE_ID, LICENSE_SOURCE_ID])) {
    throw new ZiweiIztroAdapterDraftError(
      "ENGINE_LOCK_MISMATCH",
      "Rule snapshot engine identity does not match this fixed adapter before Worker launch"
    );
  }
}

function verifyRuntimeProfile(profile: FrozenProfile, closure: DependencyLockClosure): void {
  const expectedRuntimeVersions = Object.fromEntries(
    closure.nodes.map((node) => [node.name, node.version])
  );
  if (profile.upstreamNpmIntegrity !== ZIWEI_IZTRO_NPM_INTEGRITY
    || profile.workerProtocolVersion !== ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION
    || !sameCanonicalJson(profile.runtimeVersions, expectedRuntimeVersions)) {
    throw new ZiweiIztroAdapterDraftError(
      "ENGINE_RUNTIME_MISMATCH",
      "Worker runtime versions do not match the reviewed package-lock closure identity"
    );
  }
}

async function calculateAdapterLocks(): Promise<AdapterLocks> {
  const [indexSource, bridgeSource, workerSource, closureSource, packageLockSource, rootManifestSource] = await Promise.all([
    readFile(new URL("./index.ts", import.meta.url), "utf8"),
    readFile(new URL("./contract-bridge.ts", import.meta.url), "utf8"),
    readFile(WORKER_ENTRY_URL, "utf8"),
    readFile(DEPENDENCY_LOCK_CLOSURE_URL, "utf8"),
    readFile(WORKSPACE_PACKAGE_LOCK_URL, "utf8"),
    readFile(WORKSPACE_PACKAGE_MANIFEST_URL, "utf8")
  ]);
  const dependencyLockClosure = requireDependencyLockClosure(parseJson(closureSource, "dependency lock closure"));
  verifyDependencyLockClosureAgainstWorkspace(
    dependencyLockClosure,
    parseJson(packageLockSource, "workspace package-lock.json"),
    parseJson(rootManifestSource, "workspace package.json")
  );
  const workerEntrySha256 = await sha256ZiweiCanonicalJson(workerSource);
  const dependencyGraphSha256 = await sha256ZiweiCanonicalJson(dependencyLockClosure);
  const adapterSourceSha256 = await sha256ZiweiCanonicalJson({
    contractBridge: bridgeSource,
    dependencyLockClosure: closureSource,
    index: indexSource,
    nodeWorkerEntry: workerSource
  });
  return { adapterSourceSha256, workerEntrySha256, dependencyGraphSha256, dependencyLockClosure };
}

function parseJson(source: string, label: string): unknown {
  try {
    return JSON.parse(source) as unknown;
  } catch (cause) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `${label} is not valid JSON`, { cause });
  }
}

function requireDependencyLockClosure(candidate: unknown): DependencyLockClosure {
  if (!isRecord(candidate)
    || candidate.schemaVersion !== 1
    || candidate.proofScope !== "package_lock_closure_identity_not_installed_bytes"
    || candidate.lockfileVersion !== 3
    || !isRecord(candidate.entryPackage)
    || !isRecord(candidate.rootOverrides)
    || !Array.isArray(candidate.nodes)) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", "Bundled dependency lock closure has an invalid envelope");
  }
  const entryPackage = candidate.entryPackage;
  if (entryPackage.packagePath !== "packages/ziwei-iztro-adapter-draft"
    || entryPackage.name !== "@hakimi/ziwei-iztro-adapter-draft"
    || entryPackage.version !== "0.0.0-draft.0"
    || !Array.isArray(entryPackage.dependencies)) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", "Bundled dependency lock closure has an invalid entry package");
  }
  const entryDependencies = entryPackage.dependencies.map((edge, index) => requireDependencyLockEdge(edge, `entryPackage.dependencies[${index}]`));
  const nodes = candidate.nodes.map((node, index) => requireDependencyLockNodeShape(node, `nodes[${index}]`));
  const nodeNames = nodes.map((node) => node.name);
  const nodePaths = nodes.map((node) => node.packagePath);
  if (nodes.length !== 6
    || new Set(nodeNames).size !== nodes.length
    || new Set(nodePaths).size !== nodes.length
    || !sameCanonicalJson(nodeNames, [...nodeNames].sort())) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", "Dependency lock nodes must be six unique entries sorted by package name");
  }
  const rootOverrides = Object.fromEntries(Object.entries(candidate.rootOverrides).map(([name, version]) => {
    if (typeof version !== "string" || version.length === 0) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `rootOverrides.${name} must be a version string`);
    }
    return [name, version];
  }));
  const closure: DependencyLockClosure = {
    schemaVersion: 1,
    proofScope: "package_lock_closure_identity_not_installed_bytes",
    lockfileVersion: 3,
    entryPackage: {
      packagePath: entryPackage.packagePath,
      name: entryPackage.name,
      version: entryPackage.version,
      dependencies: entryDependencies
    },
    rootOverrides,
    nodes
  };
  if (!sameCanonicalJson(rootOverrides, Object.fromEntries(nodes.map((node) => [node.name, node.version])))) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", "Root overrides must exactly pin every closure node version");
  }
  if (entryDependencies.length !== 1
    || entryDependencies[0]?.name !== "iztro"
    || entryDependencies[0].requested !== ZIWEI_IZTRO_UPSTREAM_VERSION) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", "Dependency lock entry must request exactly iztro 2.5.8");
  }
  const nodeByPath = new Map(nodes.map((node) => [node.packagePath, node]));
  for (const edge of [...entryDependencies, ...nodes.flatMap((node) => node.dependencies)]) {
    const target = nodeByPath.get(edge.resolvedPackagePath);
    if (!target || target.name !== edge.name || target.version !== edge.resolvedVersion) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `Dependency edge ${edge.name} does not bind an exact closure node`);
    }
  }
  return closure;
}

function requireDependencyLockNode(closure: DependencyLockClosure, packageName: string): DependencyLockNode {
  const node = closure.nodes.find((candidate) => candidate.name === packageName);
  if (!node) throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `Dependency lock has no node for ${packageName}`);
  return node;
}

function requireDependencyLockNodeShape(candidate: unknown, path: string): DependencyLockNode {
  if (!isRecord(candidate)
    || typeof candidate.packagePath !== "string"
    || typeof candidate.name !== "string"
    || typeof candidate.version !== "string"
    || typeof candidate.resolved !== "string"
    || !candidate.resolved.startsWith("https://registry.npmjs.org/")
    || typeof candidate.integrity !== "string"
    || !candidate.integrity.startsWith("sha512-")
    || !Array.isArray(candidate.dependencies)) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `${path} is not a complete lock node`);
  }
  const dependencies = candidate.dependencies.map((edge, index) => requireDependencyLockEdge(edge, `${path}.dependencies[${index}]`));
  const dependencyNames = dependencies.map((edge) => edge.name);
  if (new Set(dependencyNames).size !== dependencies.length
    || !sameCanonicalJson(dependencyNames, [...dependencyNames].sort())) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `${path} dependency edges must be unique and sorted`);
  }
  return {
    packagePath: candidate.packagePath,
    name: candidate.name,
    version: candidate.version,
    resolved: candidate.resolved,
    integrity: candidate.integrity,
    dependencies
  };
}

function requireDependencyLockEdge(candidate: unknown, path: string): DependencyLockEdge {
  if (!isRecord(candidate)
    || typeof candidate.name !== "string" || candidate.name.length === 0
    || typeof candidate.requested !== "string" || candidate.requested.length === 0
    || typeof candidate.resolvedPackagePath !== "string" || candidate.resolvedPackagePath.length === 0
    || typeof candidate.resolvedVersion !== "string" || candidate.resolvedVersion.length === 0) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_INVALID", `${path} is not a complete dependency edge`);
  }
  return {
    name: candidate.name,
    requested: candidate.requested,
    resolvedPackagePath: candidate.resolvedPackagePath,
    resolvedVersion: candidate.resolvedVersion
  };
}

function verifyDependencyLockClosureAgainstWorkspace(
  closure: DependencyLockClosure,
  packageLockCandidate: unknown,
  rootManifestCandidate: unknown
): void {
  if (!isRecord(packageLockCandidate)
    || packageLockCandidate.lockfileVersion !== closure.lockfileVersion
    || !isRecord(packageLockCandidate.packages)
    || !isRecord(rootManifestCandidate)
    || !isRecord(rootManifestCandidate.overrides)) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", "Workspace lockfile or root overrides cannot prove the reviewed closure identity");
  }
  const packages = packageLockCandidate.packages;
  const rootOverrides = rootManifestCandidate.overrides;
  for (const [name, version] of Object.entries(closure.rootOverrides)) {
    if (rootOverrides[name] !== version) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", `Root override ${name} no longer equals ${version}`);
    }
  }
  const entry = packages[closure.entryPackage.packagePath];
  if (!isRecord(entry)
    || entry.name !== closure.entryPackage.name
    || entry.version !== closure.entryPackage.version
    || !isRecord(entry.dependencies)) {
    throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", "Adapter workspace lock entry no longer matches the reviewed closure");
  }
  verifyResolvedLockEdges(packages, closure.entryPackage.packagePath, entry.dependencies, closure.entryPackage.dependencies);
  for (const node of closure.nodes) {
    const lockNode = packages[node.packagePath];
    if (!isRecord(lockNode)
      || lockNode.version !== node.version
      || lockNode.resolved !== node.resolved
      || lockNode.integrity !== node.integrity) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", `Lock node ${node.packagePath} no longer matches version/resolved/integrity`);
    }
    const requestedDependencies = Object.fromEntries(node.dependencies.map((edge) => [edge.name, edge.requested]));
    const lockDependencies = isRecord(lockNode.dependencies) ? lockNode.dependencies : {};
    if (!sameCanonicalJson(lockDependencies, requestedDependencies)) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", `Lock node ${node.packagePath} has stale requested dependency edges`);
    }
    verifyResolvedLockEdges(packages, node.packagePath, lockDependencies, node.dependencies);
  }
}

function verifyResolvedLockEdges(
  packages: Record<string, unknown>,
  fromPackagePath: string,
  requestedDependencies: Record<string, unknown>,
  expectedEdges: readonly DependencyLockEdge[]
): void {
  for (const edge of expectedEdges) {
    if (requestedDependencies[edge.name] !== edge.requested) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", `${fromPackagePath} no longer requests ${edge.name}@${edge.requested}`);
    }
    const resolvedPackagePath = resolveLockDependencyPackagePath(packages, fromPackagePath, edge.name);
    const target = resolvedPackagePath ? packages[resolvedPackagePath] : undefined;
    if (resolvedPackagePath !== edge.resolvedPackagePath
      || !isRecord(target)
      || target.version !== edge.resolvedVersion) {
      throw new ZiweiIztroAdapterDraftError("DEPENDENCY_LOCK_MISMATCH", `${fromPackagePath} no longer resolves exactly to ${edge.resolvedPackagePath}@${edge.resolvedVersion}`);
    }
  }
}

function resolveLockDependencyPackagePath(
  packages: Record<string, unknown>,
  fromPackagePath: string,
  dependencyName: string
): string | null {
  let cursor = fromPackagePath;
  while (true) {
    const candidate = cursor ? `${cursor}/node_modules/${dependencyName}` : `node_modules/${dependencyName}`;
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!cursor) return null;
    const separator = cursor.lastIndexOf("/");
    cursor = separator < 0 ? "" : cursor.slice(0, separator);
  }
}

function sameCanonicalJson(left: unknown, right: unknown): boolean {
  return canonicalJsonForComparison(left) === canonicalJsonForComparison(right);
}

function canonicalJsonForComparison(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJsonForComparison).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJsonForComparison((value as Record<string, unknown>)[key])}`
  )).join(",")}}`;
}

function stripRuleSelfDigest(
  ruleSnapshot: ZiweiRuleSnapshotDraft
): Omit<ZiweiRuleSnapshotDraft, "ruleSnapshotSha256"> {
  const { ruleSnapshotSha256: _excluded, ...projection } = ruleSnapshot;
  return projection;
}

function requireFrozenProfile(candidate: unknown): FrozenProfile {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_PROFILE", "Worker returned a non-object profile");
  }
  const profile = candidate as Partial<FrozenProfile>;
  if (!profile.runtimeVersions || profile.upstreamNpmIntegrity !== ZIWEI_IZTRO_NPM_INTEGRITY
    || profile.workerProtocolVersion !== ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION
    || !Array.isArray(profile.starRegistryEntries) || profile.starRegistryEntries.length !== 162
    || !Array.isArray(profile.mutagenEntries) || profile.mutagenEntries.length !== 10
    || !Array.isArray(profile.brightnessEntries) || profile.brightnessEntries.length !== 20
    || !Array.isArray(profile.canonicalBranchOrder) || profile.canonicalBranchOrder.length !== 12
    || profile.missingStarPolicy !== "null_brightness") {
    throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_PROFILE", "Worker profile does not match the frozen adapter protocol");
  }
  return profile as FrozenProfile;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return candidate !== null && typeof candidate === "object" && !Array.isArray(candidate);
}

function requireWorkerResponse<T>(candidate: unknown, expectedRequestId: unknown): WorkerResponse<T> {
  if (!isRecord(candidate)) {
    throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Worker returned a non-object result envelope");
  }
  if (candidate.protocolVersion !== ZIWEI_IZTRO_WORKER_PROTOCOL_VERSION
    || candidate.requestId !== expectedRequestId) {
    throw new ZiweiIztroAdapterDraftError("WORKER_IDENTITY_MISMATCH", "Worker protocol or request identity did not round-trip");
  }
  if (typeof candidate.workerInstanceId !== "string" || candidate.workerInstanceId.length === 0
    || typeof candidate.startedAt !== "string" || candidate.startedAt.length === 0
    || typeof candidate.completedAt !== "string" || candidate.completedAt.length === 0
    || typeof candidate.runtimeVersion !== "string" || candidate.runtimeVersion.length === 0) {
    throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Worker result envelope is incomplete");
  }
  if (candidate.ok === true) {
    if (!Object.hasOwn(candidate, "result")) {
      throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Successful Worker response has no result");
    }
    return candidate as unknown as WorkerSuccess<T>;
  }
  if (candidate.ok === false) {
    if (!isRecord(candidate.error)
      || typeof candidate.error.code !== "string" || candidate.error.code.length === 0
      || typeof candidate.error.message !== "string" || candidate.error.message.length === 0) {
      throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Failed Worker response has no structured error");
    }
    return candidate as unknown as WorkerFailure;
  }
  throw new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Worker result envelope has no valid outcome discriminator");
}

export function assertValidWorkerResponseEnvelopeDraft(
  candidate: unknown,
  expectedRequestId: string
): void {
  requireWorkerResponse<unknown>(candidate, expectedRequestId);
}

async function runFreshWorker<T>(
  workerRequest: Readonly<Record<string, unknown>>,
  options: Pick<ZiweiIztroCalculationOptions, "signal" | "timeoutMs"> = {}
): Promise<WorkerRun<T>> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) {
    throw new ZiweiIztroAdapterDraftError("INVALID_TIMEOUT", "Worker timeout must be an integer from 100 to 120000 milliseconds");
  }
  if (options.signal?.aborted) throw new ZiweiIztroAdapterDraftError("ABORTED", "Calculation was aborted before Worker launch");

  return new Promise<WorkerRun<T>>((resolve, reject) => {
    const worker = new NodeWorker(WORKER_ENTRY_URL, {
      workerData: workerRequest,
      execArgv: [],
      resourceLimits: {
        maxOldGenerationSizeMb: 64,
        maxYoungGenerationSizeMb: 16,
        stackSizeMb: 4
      }
    });
    let settled = false;
    let messageCount = 0;
    let response: unknown;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      void worker.terminate();
      reject(error);
    };
    const abort = () => finishReject(new ZiweiIztroAdapterDraftError("ABORTED", "Calculation was aborted and its fresh Worker was terminated"));
    const timer = setTimeout(() => finishReject(new ZiweiIztroAdapterDraftError("WORKER_TIMEOUT", `Fresh Worker did not finish within ${timeoutMs} ms`)), timeoutMs);

    worker.on("message", (message: unknown) => {
      messageCount += 1;
      if (messageCount > 1) {
        finishReject(new ZiweiIztroAdapterDraftError("MULTIPLE_WORKER_MESSAGES", "A one-shot Worker emitted more than one result"));
        return;
      }
      response = message;
    });
    worker.once("messageerror", (cause) => {
      finishReject(new ZiweiIztroAdapterDraftError("WORKER_MESSAGE_ERROR", "Worker result could not be deserialized", { cause }));
    });
    worker.once("error", (cause) => {
      finishReject(new ZiweiIztroAdapterDraftError("WORKER_RUNTIME_ERROR", "Fresh Worker raised an uncaught error", { cause }));
    });
    worker.once("exit", (exitCode) => {
      if (settled) return;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      if (exitCode !== 0) {
        finishReject(new ZiweiIztroAdapterDraftError("WORKER_NONZERO_EXIT", `Fresh Worker exited with code ${exitCode}`));
        return;
      }
      if (messageCount !== 1) {
        finishReject(new ZiweiIztroAdapterDraftError("WORKER_RESULT_MISSING", "Fresh Worker exited without exactly one result"));
        return;
      }
      let parsedResponse: WorkerResponse<T>;
      try {
        parsedResponse = requireWorkerResponse<T>(response, workerRequest.requestId);
      } catch (error) {
        finishReject(error instanceof Error
          ? error
          : new ZiweiIztroAdapterDraftError("INVALID_WORKER_RESPONSE", "Worker result validation failed"));
        return;
      }
      if (!parsedResponse.ok) {
        finishReject(new ZiweiIztroAdapterDraftError(parsedResponse.error.code, parsedResponse.error.message));
        return;
      }
      settled = true;
      resolve({ response: parsedResponse, exitCode: 0 });
    });

    options.signal?.addEventListener("abort", abort, { once: true });
    if (options.signal?.aborted) abort();
  });
}
