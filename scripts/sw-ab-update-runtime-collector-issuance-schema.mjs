import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";

export const SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH =
  "docs/release/sw-ab-update-runtime-collector-issuance-candidate-v1.schema.json";
export const SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-runtime-collector-issuance-candidate-v1.json";

const ATTEMPT_MARKER_RECORD_TYPE =
  "sw_ab_update_runtime_collector_attempt_marker_candidate_v1";
const TERMINAL_ISSUANCE_RECORD_TYPE =
  "sw_ab_update_runtime_collector_issuance_candidate_v1";

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function compileRecordSchemaView(schema, definitionName) {
  const definition = schema?.$defs?.[definitionName];
  if (!isRecord(definition)) {
    throw new Error(
      `SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_VIEW_INVALID: missing ${definitionName} definition.`
    );
  }
  if (!isRecord(schema.$defs)) {
    throw new Error(
      "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_VIEW_INVALID: source Schema has no definitions."
    );
  }
  const view = {
    $schema: schema.$schema,
    $id: SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_ID,
    title: `${schema.title} ${definitionName}`,
    $defs: structuredClone(schema.$defs),
    ...structuredClone(definition)
  };
  return compileEvidenceSchemaForId(
    view,
    SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_ID
  );
}

function assertSchemaRoot(schema) {
  if (
    !isRecord(schema)
    || schema.$id !== SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_ID
    || !exactKeys(schema, ["$schema", "$id", "title", "$defs", "oneOf"])
    || !Array.isArray(schema.oneOf)
    || schema.oneOf.length !== 2
    || !exactKeys(schema.oneOf[0], ["$ref"])
    || schema.oneOf[0].$ref !== "#/$defs/AttemptMarker"
    || !exactKeys(schema.oneOf[1], ["$ref"])
    || schema.oneOf[1].$ref !== "#/$defs/CollectorIssuanceReceipt"
  ) {
    throw new Error(
      "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_ROOT_INVALID: source Schema does not expose the exact marker/terminal oneOf."
    );
  }
}

export function compileSwAbUpdateRuntimeCollectorIssuanceSchema(schema) {
  assertSchemaRoot(schema);
  const attemptMarkerValidator = compileRecordSchemaView(schema, "AttemptMarker");
  const terminalIssuanceValidator = compileRecordSchemaView(
    schema,
    "CollectorIssuanceReceipt"
  );
  return Object.freeze({
    schema,
    assert(value) {
      if (value?.recordType === ATTEMPT_MARKER_RECORD_TYPE) {
        return attemptMarkerValidator.assert(value);
      }
      if (value?.recordType === TERMINAL_ISSUANCE_RECORD_TYPE) {
        return terminalIssuanceValidator.assert(value);
      }
      throw new Error(
        "SW_AB_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_RECORD_INVALID: recordType is not marker or terminal issuance."
      );
    }
  });
}

export async function loadSwAbUpdateRuntimeCollectorIssuanceSchemaValidator(
  cwd = process.cwd()
) {
  const schemaPath = path.resolve(
    cwd,
    SW_AB_UPDATE_RUNTIME_COLLECTOR_ISSUANCE_SCHEMA_PATH
  );
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileSwAbUpdateRuntimeCollectorIssuanceSchema(schema);
}
