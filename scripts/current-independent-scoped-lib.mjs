import {
  isVerifiedCurrentIndex,
  loadCurrentIndex
} from "./current-index-lib.mjs";

const REFLECT_APPLY = Reflect.apply;
const ARRAY_FILTER = Array.prototype.filter;
const ARRAY_MAP = Array.prototype.map;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;
const WEAK_SET_ADD = WeakSet.prototype.add;
const WEAK_SET_HAS = WeakSet.prototype.has;

function arrayFilter(array, predicate) {
  return REFLECT_APPLY(ARRAY_FILTER, array, [predicate]);
}

function arrayMap(array, mapper) {
  return REFLECT_APPLY(ARRAY_MAP, array, [mapper]);
}

const SCOPE_FAMILIES = OBJECT_FREEZE({
  source_requirements: OBJECT_FREEZE([
    "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements",
    "content/system-admission/western-source-binding-requirements",
    "content/system-admission/ziwei-source-binding-requirements"
  ]),
  domain_manifests: OBJECT_FREEZE([
    "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest",
    "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest",
    "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest"
  ])
});

export class CurrentIndependentScopeError extends Error {
  constructor(code, message, details = null, options) {
    super(`${code}: ${message}`, options);
    this.name = "CurrentIndependentScopeError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details, cause) {
  throw new CurrentIndependentScopeError(
    code,
    message,
    details ?? null,
    cause === undefined ? undefined : { cause }
  );
}

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null
    || typeof value !== "object"
    || REFLECT_APPLY(WEAK_SET_HAS, seen, [value])) return value;
  REFLECT_APPLY(WEAK_SET_ADD, seen, [value]);
  for (const key of OBJECT_KEYS(value)) deepFreeze(value[key], seen);
  return OBJECT_FREEZE(value);
}

function bindingProjection(binding) {
  if (binding === null) return null;
  return {
    version: binding.version,
    path: binding.path,
    artifactId: binding.artifactId,
    rawBytes: binding.rawBytes,
    rawSha256: binding.rawSha256,
    semanticDigest: binding.semanticDigest
  };
}

function requireScope(scope) {
  const families = SCOPE_FAMILIES[scope];
  if (!families) fail("SCOPE_INVALID", "unknown independent current scope");
  return families;
}

function summarizeVerifiedIndexScope(index, scope) {
  if (!isVerifiedCurrentIndex(index)) {
    fail("CURRENT_INDEX_PRIVATE_BRAND_REQUIRED", "verified canonical current-index required");
  }
  const families = requireScope(scope);
  const entries = arrayMap(families, (familyKey) => {
    const matches = arrayFilter(index.entries, (entry) => entry.familyKey === familyKey);
    if (matches.length !== 1) {
      fail("CURRENT_INDEX_FAMILY_MISMATCH", familyKey);
    }
    const entry = matches[0];
    return {
      familyKey,
      selectionState: entry.selectionState,
      head: bindingProjection(entry.head),
      selectedCurrent: bindingProjection(entry.selectedCurrent)
    };
  });
  const unavailable = arrayMap(
    arrayFilter(entries, (entry) => entry.selectedCurrent === null),
    (entry) => ({
      familyKey: entry.familyKey,
      selectionState: entry.selectionState,
      head: entry.head
    })
  );
  return deepFreeze({
    scope,
    indexId: index.indexId,
    indexDigest: index.indexDigest,
    repositorySelectionOnly: true,
    formalAdmissionAuthorized: false,
    releaseReady: false,
    publicDeploymentAuthorized: false,
    expertClaimsAuthorized: false,
    entries,
    unavailable
  });
}

export async function resolveCurrentIndependentScope(
  scope,
  workspaceRoot = process.cwd()
) {
  const index = await loadCurrentIndex(workspaceRoot);
  const summary = summarizeVerifiedIndexScope(index, scope);
  if (summary.unavailable.length > 0) {
    fail(
      "CURRENT_UNAVAILABLE",
      `${scope} has ${summary.unavailable.length} unavailable current families`,
      summary
    );
  }
  return summary;
}

export async function inspectCurrentIndependentScopeInventory(
  scope,
  workspaceRoot = process.cwd()
) {
  const index = await loadCurrentIndex(workspaceRoot);
  const summary = summarizeVerifiedIndexScope(index, scope);
  return deepFreeze({
    ...summary,
    inventoryOnly: true,
    semanticEvaluationPerformed: false
  });
}

export const currentIndependentScopedTestOnly = OBJECT_FREEZE({
  SCOPE_FAMILIES,
  summarizeVerifiedIndexScope
});
