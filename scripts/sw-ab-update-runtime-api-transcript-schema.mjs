import { readFile } from "node:fs/promises";
import path from "node:path";

import { compileEvidenceSchemaForId } from "./release-evidence-schema.mjs";
import {
  SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH
} from "./sw-ab-update-runtime-api-transcript-lib.mjs";

export const SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_ID =
  "https://hakimi.invalid/schemas/sw-ab-update-runtime-api-transcript-candidate-v1.json";

const MANIFEST_DEFINITION_NAMES = Object.freeze([
  "Sha256",
  "RunId",
  "AttemptId",
  "Timestamp",
  "ReleaseIdentity",
  "Capabilities",
  "ArtifactBinding",
  "CaptureSurface",
  "TupleBinding",
  "SourceBinding",
  "Provenance",
  "Authority",
  "Manifest"
]);

function compileManifestSchemaView(schema) {
  const definitionName = "Manifest";
  const schemaId = SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_ID;
  const definition = schema?.$defs?.[definitionName];
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new Error(
      `SW_AB_RUNTIME_API_TRANSCRIPT_SCHEMA_VIEW_INVALID: missing ${definitionName} definition.`
    );
  }
  const definitions = Object.fromEntries(MANIFEST_DEFINITION_NAMES.map((name) => [
    name,
    structuredClone(schema.$defs[name])
  ]));
  const view = {
    $schema: schema.$schema,
    $id: schemaId,
    title: `${schema.title} ${definitionName}`,
    $defs: definitions,
    ...structuredClone(definition)
  };
  return compileEvidenceSchemaForId(view, schemaId);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

function assertTupleSchemaShape(value) {
  if (
    !exactKeys(value, [
      "schemaVersion",
      "recordType",
      "projectName",
      "phase",
      "slot",
      "sequence",
      "startedAt",
      "completedAt",
      "pageUrlBefore",
      "pageUrlAfter",
      "cdpSession",
      "serviceWorkerChallenge",
      "recordDigest"
    ])
    || !exactKeys(value.cdpSession, [
      "surface",
      "instanceNonce",
      "createdAt",
      "detachedAt",
      "preChallenge",
      "postChallenge"
    ])
    || !exactKeys(value.cdpSession.preChallenge, [
      "requestStartedAt",
      "responseReceivedAt",
      "request",
      "response",
      "canonicalRequestSha256",
      "canonicalResponseSha256"
    ])
    || !exactKeys(value.cdpSession.postChallenge, [
      "requestStartedAt",
      "responseReceivedAt",
      "request",
      "response",
      "canonicalRequestSha256",
      "canonicalResponseSha256"
    ])
    || !exactKeys(value.serviceWorkerChallenge, [
      "surface",
      "realm",
      "requestStartedAt",
      "responseReceivedAt",
      "request",
      "response",
      "canonicalRequestSha256",
      "canonicalResponseSha256"
    ])
  ) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_TUPLE_SCHEMA_INVALID: tuple record has missing or additional structural fields."
    );
  }
}

export function compileSwAbUpdateRuntimeApiTranscriptSchema(schema) {
  if (
    schema?.$id !== SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_ID
    || !Array.isArray(schema?.oneOf)
    || schema.oneOf.length !== 2
    || schema.oneOf[0]?.$ref !== "#/$defs/Manifest"
    || schema.oneOf[1]?.$ref !== "#/$defs/TupleRecord"
  ) {
    throw new Error(
      "SW_AB_RUNTIME_API_TRANSCRIPT_SCHEMA_ROOT_INVALID: source Schema does not expose the exact two record definitions."
    );
  }
  const manifestValidator = compileManifestSchemaView(schema);
  return Object.freeze({
    schema,
    assert(value) {
      if (value?.recordType === "sw_ab_update_runtime_api_transcript_tuple_candidate_v1") {
        return assertTupleSchemaShape(value);
      }
      return manifestValidator.assert(value);
    }
  });
}

export async function loadSwAbUpdateRuntimeApiTranscriptSchemaValidator(
  cwd = process.cwd()
) {
  const schemaPath = path.resolve(cwd, SW_AB_UPDATE_RUNTIME_API_TRANSCRIPT_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileSwAbUpdateRuntimeApiTranscriptSchema(schema);
}
