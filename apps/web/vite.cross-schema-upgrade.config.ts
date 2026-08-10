import path from "node:path";
import { defineConfig, mergeConfig, type Plugin } from "vite";
import baseConfig from "./vite.config";
import { releaseDatabaseDescriptorFromEnvironment } from "./release-protocol";

const fixtureLabel = process.env.HAKIMI_CROSS_SCHEMA_FIXTURE;
const outputDirectory = process.env.HAKIMI_CROSS_SCHEMA_OUT_DIR;
const fault = process.env.HAKIMI_CROSS_SCHEMA_FAULT ?? "none";
const descriptor = releaseDatabaseDescriptorFromEnvironment(process.env);
type ProductionMigrationSchema = 14 | 15 | 16;
const SUPPORTED_TARGET_SCHEMAS = [13, 14, 15, 16] as const;

if (!fixtureLabel || !/^[a-z0-9-]+$/iu.test(fixtureLabel)) {
  throw new Error("HAKIMI_CROSS_SCHEMA_FIXTURE must be a safe non-empty fixture label.");
}
if (!outputDirectory || !path.isAbsolute(outputDirectory)) {
  throw new Error("HAKIMI_CROSS_SCHEMA_OUT_DIR must be an absolute output directory.");
}
if (fault !== "none" && fault !== "migration" && fault !== "validation" && fault !== "digest") {
  throw new Error(`Unknown cross-Schema fixture fault: ${fault}`);
}
if (!SUPPORTED_TARGET_SCHEMAS.some((schema) => schema === descriptor.targetSchema)) {
  throw new Error(`The cross-Schema fixture only supports target Schema 13, 14, 15 or 16, got ${descriptor.targetSchema}.`);
}
if (descriptor.targetSchema === 13 && fault !== "none") {
  throw new Error("The v13 bridge fixture cannot inject a target migration fault.");
}

const PRODUCTION_SCHEMA_MARKERS: Record<ProductionMigrationSchema, readonly string[]> = {
  14: [
    "export const RESEARCH_DATABASE_SCHEMA_VERSION = 14 as const;",
    "// v14 only adds case-scoped recency indexes.",
    "this.version(14).stores({",
    'researchNotes: "id, caseId, [caseId+lifecycle], [caseId+updatedAt], anchor.kind, anchor.revisionId, updatedAt, *tags"',
    'events: "id, caseId, [caseId+updatedAt], revisionId, datePrecision, startDate, timeContext.kind, timeContext.start.canonicalUtc, deletedAt, updatedAt, *tags"'
  ],
  15: [
    "// v15 adds an empty append-only calculation receipt ledger.",
    "this.version(15).stores({",
    'revisionCalculationReceipts: "id, sourceRevision.caseId, sourceRevision.revisionId, captureKind, &requestFingerprint, createdAt, projection.projectionDigest"'
  ],
  16: [
    "export const RESEARCH_DATABASE_MAX_SCHEMA_VERSION = 16 as const;",
    "// v16 adds only an internal singleton mutation clock.",
    "this.version(16).stores({",
    'mutationState: "&id"'
  ]
};

function isProductionMigrationSchema(value: number): value is ProductionMigrationSchema {
  return value === 14 || value === 15 || value === 16;
}

function injectMigrationTransactionFailure(code: string, targetSchema: ProductionMigrationSchema): string {
  const startMarker = `this.version(${targetSchema}).stores({`;
  const blockStart = code.indexOf(startMarker);
  const nextVersionMarker = `this.version(${targetSchema + 1}).stores({`;
  const nextVersionBoundary = code.indexOf(nextVersionMarker, blockStart + startMarker.length);
  const classBoundary = code.indexOf("\n  }\n\n  ", blockStart + startMarker.length);
  const blockBoundary = nextVersionBoundary >= 0 ? nextVersionBoundary : classBoundary;
  if (blockStart < 0 || blockBoundary < 0) {
    throw new Error(`Cross-Schema fixture cannot isolate the production v${targetSchema} schema block.`);
  }
  const block = code.slice(blockStart, blockBoundary);
  const storesClose = block.lastIndexOf("\n      });");
  if (storesClose < 0) {
    throw new Error(`Cross-Schema fixture cannot locate the production v${targetSchema} stores() close.`);
  }
  const injectedBlock = `${block.slice(0, storesClose)}
      }).upgrade(() => {
        throw new Error("synthetic v${targetSchema} migration transaction failure");
      });${block.slice(storesClose + "\n      });".length)}`;
  return `${code.slice(0, blockStart)}${injectedBlock}${code.slice(blockBoundary)}`;
}

/**
 * Generates real, independently fingerprinted A/B application shells from the
 * production v13/v14/v15/v16 conditional schema registration. Healthy fixtures do
 * not rewrite storage. A migration-failure fixture appends a throwing upgrade
 * callback only to its real target version chain. Validation faults stop the
 * target boot probe, while digest faults alter only the materialize-to-verify
 * handoff. Release selection, shadow writes, validation, activation and
 * BOOT_OK remain production code.
 */
function crossSchemaFixturePlugin(): Plugin {
  return {
    name: "hakimi-cross-schema-upgrade-fixture",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = id.replaceAll("\\", "/").split("?", 1)[0];
      if (
        fault === "digest" &&
        normalizedId.endsWith("/src/lib/release-database-coordinator.ts")
      ) {
        const digestProbe = "return { targetDigest: target.digest };";
        if (!code.includes(digestProbe)) {
          throw new Error("Cross-Schema fixture cannot locate the production target digest handoff.");
        }
        return {
          code: code.replace(
            digestProbe,
            `const corruptedTargetDigest = \`\${target.digest[0] === "0" ? "1" : "0"}\${target.digest.slice(1)}\`;\n        return { targetDigest: corruptedTargetDigest };`
          ),
          map: null
        };
      }
      if (normalizedId.endsWith("/src/main.tsx")) {
        const validationProbe = "await caseRepository.database.open();";
        if (fault === "validation" && !code.includes(validationProbe)) {
          throw new Error("Cross-Schema fixture cannot locate the production storage verification probe.");
        }
        const fixtureCode = fault === "validation"
          ? code.replace(
            validationProbe,
            `${validationProbe}\n  throw new Error("synthetic v${descriptor.targetSchema} target validation failure");`
          )
          : code;
        return {
          code: `${fixtureCode}
if (typeof document !== "undefined") {
  document.documentElement.dataset.e2eCrossSchemaFixture = ${JSON.stringify(fixtureLabel)};
  document.documentElement.dataset.e2eCrossSchemaFault = ${JSON.stringify(fault)};
  const e2eScope = globalThis as typeof globalThis & {
    __hakimiE2eAttemptRepositoryWrite?: (caseId: string) => Promise<{
      ok: boolean;
      errorName: string | null;
      errorMessage: string | null;
    }>;
  };
  e2eScope.__hakimiE2eAttemptRepositoryWrite = async (caseId: string) => {
    try {
      const { caseRepository } = await import("@hakimi/storage");
      const current = await caseRepository.database.cases.get(caseId);
      if (!current) throw new Error("E2E repository write probe cannot find its case.");
      await caseRepository.updateCaseMetadata(caseId, {
        alias: current.alias,
        tags: current.tags,
        notes: current.notes
      });
      return { ok: true, errorName: null, errorMessage: null };
    } catch (error) {
      return {
        ok: false,
        errorName: error instanceof Error ? error.name : null,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  };
}`,
          map: null
        };
      }
      if (
        isProductionMigrationSchema(descriptor.targetSchema) &&
        normalizedId.endsWith("/packages/storage/src/index.ts")
      ) {
        const targetSchema = descriptor.targetSchema;
        const markers = PRODUCTION_SCHEMA_MARKERS[targetSchema];
        const missingMarker = markers.find((marker) => !code.includes(marker));
        if (missingMarker) {
          throw new Error(
            `Cross-Schema fixture cannot locate the production v${targetSchema} schema definition: ${missingMarker}`
          );
        }
        if (fault !== "migration") return undefined;
        return {
          code: injectMigrationTransactionFailure(code, targetSchema),
          map: null
        };
      }
      return undefined;
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: `e2e-cross-schema-${fixtureLabel}.json`,
        source: `${JSON.stringify({ fixtureLabel, fault, descriptor }, null, 2)}\n`
      });
    }
  };
}

export default mergeConfig(baseConfig, defineConfig({
  plugins: [crossSchemaFixturePlugin()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true
  }
}));
