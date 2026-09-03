import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";
import { parseSwAbUpdateCandidateJsonBytes } from "./sw-ab-update-candidate-lib.mjs";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_PATH =
  "docs/release/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.schema.json";

export const SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-candidate-runtime-client-capture-collector-issuance-producer-bridge-composition-v2.json";

export function compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchema(
  schema
) {
  if (
    schema?.$id
      !== SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_ID
    || schema?.type !== "object"
    || schema?.additionalProperties !== false
    || schema?.properties?.recordType?.const
      !== "sw_ab_update_candidate_runtime_client_capture_collector_issuance_producer_bridge_composition_v2"
  ) {
    throw new Error(
      "SW_AB_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_ROOT_INVALID: Schema root drifted from v2."
    );
  }
  return compileEvidenceSchemaForId(
    schema,
    SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_ID
  );
}

export async function loadSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchemaValidator(
  cwd = process.cwd()
) {
  const bytes = await readFile(
    path.resolve(
      cwd,
      SW_AB_UPDATE_CANDIDATE_RUNTIME_CLIENT_CAPTURE_COLLECTOR_ISSUANCE_PRODUCER_BRIDGE_COMPOSITION_SCHEMA_PATH
    )
  );
  return compileSwAbUpdateCandidateRuntimeClientCaptureCollectorIssuanceProducerBridgeCompositionSchema(
    parseSwAbUpdateCandidateJsonBytes(bytes, "producer-bridge composition v2 Schema")
  );
}
