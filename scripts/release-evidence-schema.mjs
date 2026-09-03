import { readFile } from "node:fs/promises";
import path from "node:path";
import { fromJSONSchema } from "zod/v4";
import { canonicalJson } from "./release-evidence-lib.mjs";

export const RELEASE_EVIDENCE_SCHEMA_PATH =
  "docs/release/release-evidence.schema.json";

const RELEASE_EVIDENCE_SCHEMA_DRAFT =
  "https://json-schema.org/draft/2020-12/schema";
const RELEASE_EVIDENCE_SCHEMA_ID =
  "https://hakimi.invalid/schemas/release-evidence-v1.json";
const ALLOWED_TYPES = new Set([
  "array",
  "boolean",
  "integer",
  "null",
  "number",
  "object",
  "string"
]);
const ALLOWED_SCHEMA_KEYS = new Set([
  "$defs",
  "$id",
  "$ref",
  "$schema",
  "additionalProperties",
  "anyOf",
  "const",
  "enum",
  "format",
  "items",
  "maxItems",
  "maxLength",
  "maximum",
  "minItems",
  "minLength",
  "minimum",
  "pattern",
  "properties",
  "required",
  "title",
  "type",
  "uniqueItems"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pointerSegment(value) {
  return String(value).replaceAll("~", "~0").replaceAll("/", "~1");
}

function childPointer(pointer, segment) {
  return `${pointer}/${pointerSegment(segment)}`;
}

function definitionError(pointer, message) {
  throw new Error(`Release Evidence Schema definition is invalid at ${pointer}: ${message}`);
}

function documentError(pointer, code) {
  throw new Error(`Release Evidence Schema validation failed at ${pointer} (${code}).`);
}

function schemaTypes(node) {
  if (typeof node.type === "string") return [node.type];
  if (Array.isArray(node.type)) return node.type;
  return [];
}

function resolveLocalReference(rootSchema, reference, pointer) {
  const match = typeof reference === "string"
    ? reference.match(/^#\/\$defs\/([A-Za-z][A-Za-z0-9]*)$/u)
    : null;
  if (!match || !isRecord(rootSchema.$defs?.[match[1]])) {
    definitionError(pointer, "only existing standalone local $defs references are allowed");
  }
  return rootSchema.$defs[match[1]];
}

function assertNonNegativeInteger(value, pointer, label) {
  if (!Number.isInteger(value) || value < 0) {
    definitionError(pointer, `${label} must be a non-negative integer`);
  }
}

function sameStringSet(left, right) {
  return canonicalJson([...left].sort()) === canonicalJson([...right].sort());
}

function auditSchemaNode(node, pointer, rootSchema, isRoot = false) {
  if (!isRecord(node)) definitionError(pointer, "schema nodes must be objects");
  const unknownKey = Object.keys(node).find((key) => !ALLOWED_SCHEMA_KEYS.has(key));
  if (unknownKey) {
    definitionError(childPointer(pointer, unknownKey), "unsupported schema keyword");
  }

  if (!isRoot && ["$schema", "$id", "$defs", "title"].some((key) => key in node)) {
    definitionError(pointer, "root metadata keywords may only appear at the schema root");
  }
  if ("$ref" in node) {
    if (Object.keys(node).length !== 1) {
      definitionError(pointer, "$ref must be the only keyword in its schema node");
    }
    resolveLocalReference(rootSchema, node.$ref, childPointer(pointer, "$ref"));
    return;
  }
  if ("anyOf" in node) {
    const referenceOptions = Array.isArray(node.anyOf)
      ? node.anyOf.filter((option) => isRecord(option) && Object.keys(option).length === 1 && "$ref" in option)
      : [];
    const nullOptions = Array.isArray(node.anyOf)
      ? node.anyOf.filter((option) => isRecord(option) && canonicalJson(option) === canonicalJson({ type: "null" }))
      : [];
    if (
      Object.keys(node).length !== 1
      || !Array.isArray(node.anyOf)
      || node.anyOf.length !== 2
      || referenceOptions.length !== 1
      || nullOptions.length !== 1
    ) {
      definitionError(pointer, "anyOf must be the audited local-reference-or-null union");
    }
    for (let index = 0; index < node.anyOf.length; index += 1) {
      auditSchemaNode(
        node.anyOf[index],
        childPointer(childPointer(pointer, "anyOf"), index),
        rootSchema
      );
    }
    return;
  }

  const types = schemaTypes(node);
  if (!("type" in node) && !("const" in node) && !("enum" in node)) {
    definitionError(pointer, "schema nodes must contain an explicit audited constraint");
  }
  if ("type" in node) {
    if (
      types.length === 0
      || types.some((type) => !ALLOWED_TYPES.has(type))
      || new Set(types).size !== types.length
    ) {
      definitionError(childPointer(pointer, "type"), "type must use unique supported JSON types");
    }
  }

  if ("$defs" in node) {
    if (!isRecord(node.$defs) || Object.keys(node.$defs).length === 0) {
      definitionError(childPointer(pointer, "$defs"), "$defs must be a non-empty object");
    }
    for (const [name, definition] of Object.entries(node.$defs)) {
      if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(name)) {
        definitionError(childPointer(childPointer(pointer, "$defs"), name), "definition name is not canonical");
      }
      auditSchemaNode(
        definition,
        childPointer(childPointer(pointer, "$defs"), name),
        rootSchema
      );
    }
  }

  if ("properties" in node) {
    if (!types.includes("object") || !isRecord(node.properties)) {
      definitionError(childPointer(pointer, "properties"), "properties require an object schema");
    }
    for (const [name, propertySchema] of Object.entries(node.properties)) {
      auditSchemaNode(
        propertySchema,
        childPointer(childPointer(pointer, "properties"), name),
        rootSchema
      );
    }
  }

  if (types.includes("object")) {
    if (node.additionalProperties !== false || !isRecord(node.properties)) {
      definitionError(pointer, "every object schema must declare properties and additionalProperties false");
    }
    if (
      !Array.isArray(node.required)
      || node.required.some((value) => typeof value !== "string")
      || new Set(node.required).size !== node.required.length
      || !sameStringSet(node.required, Object.keys(node.properties))
    ) {
      definitionError(
        childPointer(pointer, "required"),
        "every declared object property must be required exactly once"
      );
    }
  } else if ("required" in node || "additionalProperties" in node) {
    definitionError(pointer, "object-only keywords require type object");
  }

  if (types.includes("array")) {
    if (!isRecord(node.items)) {
      definitionError(childPointer(pointer, "items"), "every array schema must declare one item schema");
    }
    auditSchemaNode(node.items, childPointer(pointer, "items"), rootSchema);
  } else if (["items", "minItems", "maxItems", "uniqueItems"].some((key) => key in node)) {
    definitionError(pointer, "array-only keywords require type array");
  }

  for (const key of ["minItems", "maxItems", "minLength", "maxLength"]) {
    if (key in node) assertNonNegativeInteger(node[key], childPointer(pointer, key), key);
  }
  if (["minLength", "maxLength"].some((key) => key in node) && !types.includes("string")) {
    definitionError(pointer, "string length keywords require type string");
  }
  if (
    Number.isInteger(node.minItems)
    && Number.isInteger(node.maxItems)
    && node.minItems > node.maxItems
  ) definitionError(pointer, "minItems cannot exceed maxItems");
  if (
    Number.isInteger(node.minLength)
    && Number.isInteger(node.maxLength)
    && node.minLength > node.maxLength
  ) definitionError(pointer, "minLength cannot exceed maxLength");
  if ("uniqueItems" in node && node.uniqueItems !== true) {
    definitionError(childPointer(pointer, "uniqueItems"), "uniqueItems may only be enabled");
  }
  if ("format" in node && (node.format !== "date-time" || !types.includes("string"))) {
    definitionError(childPointer(pointer, "format"), "only string date-time format is supported");
  }
  if ("pattern" in node) {
    if (typeof node.pattern !== "string" || !types.includes("string")) {
      definitionError(childPointer(pointer, "pattern"), "pattern requires a string schema");
    }
    try {
      new RegExp(node.pattern, "u");
    } catch {
      definitionError(childPointer(pointer, "pattern"), "pattern is not a valid regular expression");
    }
  }
  for (const key of ["minimum", "maximum"]) {
    if (key in node && (!Number.isFinite(node[key]) || !types.some((type) => type === "number" || type === "integer"))) {
      definitionError(childPointer(pointer, key), `${key} requires a finite numeric schema constraint`);
    }
  }
  if ("enum" in node) {
    if (
      !Array.isArray(node.enum)
      || node.enum.length === 0
      || new Set(node.enum.map((value) => canonicalJson(value))).size !== node.enum.length
    ) definitionError(childPointer(pointer, "enum"), "enum must contain unique JSON values");
  }
  if ("const" in node && "enum" in node) {
    definitionError(pointer, "const and enum cannot be combined in this audited schema subset");
  }
  if ("type" in node && ("const" in node || "enum" in node)) {
    definitionError(pointer, "type cannot be combined with const or enum in this audited schema subset");
  }
}

export function auditEvidenceSchemaForId(schema, expectedSchemaId) {
  if (!isRecord(schema)) definitionError("#", "schema root must be an object");
  if (schema.$schema !== RELEASE_EVIDENCE_SCHEMA_DRAFT) {
    definitionError("#/$schema", "the canonical draft 2020-12 identifier is required");
  }
  if (typeof expectedSchemaId !== "string" || schema.$id !== expectedSchemaId) {
    definitionError("#/$id", "the canonical evidence schema id is required");
  }
  if (typeof schema.title !== "string" || schema.title.length === 0) {
    definitionError("#/title", "the schema title must be a non-empty string");
  }
  auditSchemaNode(schema, "#", schema, true);
  return schema;
}

export function auditReleaseEvidenceSchema(schema) {
  return auditEvidenceSchemaForId(schema, RELEASE_EVIDENCE_SCHEMA_ID);
}

function assertUniqueItems(value, schemaNode, pointer, rootSchema, references = new Set()) {
  if ("$ref" in schemaNode) {
    if (references.has(schemaNode.$ref)) return;
    const nextReferences = new Set(references).add(schemaNode.$ref);
    assertUniqueItems(
      value,
      resolveLocalReference(rootSchema, schemaNode.$ref, pointer),
      pointer,
      rootSchema,
      nextReferences
    );
    return;
  }
  if ("anyOf" in schemaNode) {
    for (const option of schemaNode.anyOf) {
      assertUniqueItems(value, option, pointer, rootSchema, references);
    }
    return;
  }
  const types = schemaTypes(schemaNode);
  if (types.includes("array") && Array.isArray(value)) {
    if (schemaNode.uniqueItems === true) {
      const seen = new Set();
      for (let index = 0; index < value.length; index += 1) {
        const fingerprint = canonicalJson(value[index]);
        if (seen.has(fingerprint)) {
          documentError(childPointer(pointer, index), "duplicate_array_item");
        }
        seen.add(fingerprint);
      }
    }
    for (let index = 0; index < value.length; index += 1) {
      assertUniqueItems(
        value[index],
        schemaNode.items,
        childPointer(pointer, index),
        rootSchema,
        references
      );
    }
  }
  if (types.includes("object") && isRecord(value)) {
    for (const [key, childSchema] of Object.entries(schemaNode.properties)) {
      if (key in value) {
        assertUniqueItems(
          value[key],
          childSchema,
          childPointer(pointer, key),
          rootSchema,
          references
        );
      }
    }
  }
}

export function compileEvidenceSchemaForId(schema, expectedSchemaId) {
  let schemaSnapshot;
  try {
    const serialized = JSON.stringify(schema);
    if (typeof serialized !== "string") throw new Error("schema is not JSON serializable");
    schemaSnapshot = JSON.parse(serialized);
  } catch (error) {
    throw new Error(
      `Release Evidence Schema snapshot failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
  const freezeRecursively = (value) => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freezeRecursively(child);
      Object.freeze(value);
    }
    return value;
  };
  freezeRecursively(schemaSnapshot);
  auditEvidenceSchemaForId(schemaSnapshot, expectedSchemaId);
  let validator;
  try {
    validator = fromJSONSchema(schemaSnapshot, { defaultTarget: "draft-2020-12" });
  } catch (error) {
    throw new Error(
      `Release Evidence Schema compilation failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
  }
  return Object.freeze({
    schema: schemaSnapshot,
    assert(document) {
      const result = validator.safeParse(document);
      if (!result.success) {
        const issue = result.error.issues[0];
        const pointer = issue.path.reduce(childPointer, "#");
        documentError(pointer, issue.code);
      }
      assertUniqueItems(document, schemaSnapshot, "#", schemaSnapshot);
      return document;
    }
  });
}

export function compileReleaseEvidenceSchema(schema) {
  return compileEvidenceSchemaForId(schema, RELEASE_EVIDENCE_SCHEMA_ID);
}

export async function loadReleaseEvidenceSchemaValidator(cwd = process.cwd()) {
  const schemaPath = path.resolve(cwd, RELEASE_EVIDENCE_SCHEMA_PATH);
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  return compileReleaseEvidenceSchema(schema);
}
