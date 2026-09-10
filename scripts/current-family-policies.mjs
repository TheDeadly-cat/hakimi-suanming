const REFLECT_APPLY = Reflect.apply;
const REGEXP_EXEC = RegExp.prototype.exec;
const STRING_REPLACE = String.prototype.replace;
const OBJECT_FREEZE = Object.freeze;
const OBJECT_KEYS = Object.keys;

export const REPOSITORY_VERSION_PATTERN =
  /^(0|[1-9][0-9]*)(?:\.(0|[1-9][0-9]*))?(?:\.(0|[1-9][0-9]*))?$/u;

export const VERSIONED_JSON_FILE_PATTERN =
  /^(.+)\.v(0|[1-9][0-9]*(?:\.(?:0|[1-9][0-9]*)){0,2})\.json$/u;

function regexExec(expression, value) {
  return REFLECT_APPLY(REGEXP_EXEC, expression, [value]);
}

function escapeRegex(value) {
  return REFLECT_APPLY(STRING_REPLACE, value, [/[.*+?^${}()|[\]\\]/gu, "\\$&"]);
}

export function parseRepositoryVersion(raw, errorFactory = undefined) {
  const match = typeof raw === "string" ? regexExec(REPOSITORY_VERSION_PATTERN, raw) : null;
  if (match === null) {
    const error = new Error(`FAMILY_VERSION_INVALID: ${String(raw)}`);
    throw typeof errorFactory === "function" ? errorFactory(error.message) : error;
  }
  const tuple = [match[1], match[2] ?? "0", match[3] ?? "0"].map((part) => Number(part));
  if (tuple.some((part) => !Number.isSafeInteger(part))) {
    const error = new Error(`FAMILY_VERSION_INVALID: ${raw}`);
    throw typeof errorFactory === "function" ? errorFactory(error.message) : error;
  }
  return OBJECT_FREEZE({
    raw,
    normalized: tuple.join("."),
    tuple: OBJECT_FREEZE(tuple)
  });
}

export function compareRepositoryVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.tuple[index] !== right.tuple[index]) {
      return left.tuple[index] - right.tuple[index];
    }
  }
  return 0;
}

function genericLineageExtractor(value, policy) {
  const references = [];
  const seen = new Set();
  const visit = (node) => {
    if (node === null || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (!Array.isArray(node)
      && typeof node.path === "string"
      && regexExec(policy.relativePathPattern, node.path) !== null) {
      references.push(node);
    }
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    for (const key of OBJECT_KEYS(node)) visit(node[key]);
  };
  visit(value);
  return references;
}

function policy({
  directory,
  stem,
  idField,
  memberDigestFields,
  artifactIdVersionMode = "suffix",
  lineageMode = "artifact"
}) {
  const familyKey = `${directory}/${stem}`;
  const fileNamePattern = new RegExp(
    `^${escapeRegex(stem)}\\.v(0|[1-9][0-9]*(?:\\.(?:0|[1-9][0-9]*)){0,2})\\.json$`,
    "u"
  );
  const relativePathPattern = new RegExp(
    `^${escapeRegex(directory)}/${escapeRegex(stem)}\\.v(0|[1-9][0-9]*(?:\\.(?:0|[1-9][0-9]*)){0,2})\\.json$`,
    "u"
  );
  return OBJECT_FREEZE({
    familyKey,
    directory,
    stem,
    idField,
    memberDigestFields: OBJECT_FREEZE([...memberDigestFields]),
    artifactIdVersionMode,
    lineageMode,
    fileNamePattern,
    relativePathPattern,
    lineageExtractor: genericLineageExtractor
  });
}

export const CURRENT_FAMILY_POLICIES = OBJECT_FREEZE([
  policy({
    directory: "content",
    stem: "bazi-strength-source-binding-candidates",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content",
    stem: "bazi-strength-source-rights-candidates",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/domain-release",
    stem: "bazi.single-chart-report.v1.7.0.manifest",
    idField: "manifestId",
    memberDigestFields: ["manifestDigest"]
  }),
  policy({
    directory: "content/domain-release",
    stem: "vedic-astrology.engineering-draft.v0.1.0.manifest",
    idField: "manifestId",
    memberDigestFields: ["manifestDigest"]
  }),
  policy({
    directory: "content/domain-release",
    stem: "western-astrology.engineering-draft.v0.1.0.manifest",
    idField: "manifestId",
    memberDigestFields: ["manifestDigest"]
  }),
  policy({
    directory: "content/domain-release",
    stem: "ziwei-doushu.engineering-draft.v0.1.0.manifest",
    idField: "manifestId",
    memberDigestFields: ["manifestDigest"]
  }),
  policy({
    directory: "content/knowledge",
    stem: "manifest",
    idField: "schemaVersion",
    memberDigestFields: [],
    artifactIdVersionMode: "exact",
    lineageMode: "index_only_legacy"
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-binding-freeze-requirements",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-current-machine-identity-successor",
    idField: "successorId",
    memberDigestFields: ["receiptDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-domain-release-manifest-version-aware-observation-candidate",
    idField: "candidateId",
    memberDigestFields: ["candidateDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-dtt-notice-reconciliation",
    idField: "reconciliationId",
    memberDigestFields: ["reconciliationDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-engineering-binding-value-subject-gaps",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-expert-current-line-zero-instance-observation-child",
    idField: "childId",
    memberDigestFields: ["childDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-expert-review-intake-gap",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-policy-weights-value-evidence-candidate",
    idField: "candidateId",
    memberDigestFields: ["candidateDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-pr10bc-scope-reconciliation",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-project-copy-materialization-requirements",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "bazi-source-carrier-record-readiness",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "four-system-current-status-observation-child",
    idField: "childId",
    memberDigestFields: ["childDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "vedic-source-binding-and-three-layer-rights-requirements",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "western-civil-time-same-artifact-browser-observation-child",
    idField: "childId",
    memberDigestFields: ["observationDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "western-source-and-manifest-identity-drift-receipt-candidate",
    idField: "candidateId",
    memberDigestFields: ["receiptDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "western-source-binding-requirements",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "ziwei-same-artifact-browser-observation-child",
    idField: "childId",
    memberDigestFields: ["childDigest", "observationDigest"]
  }),
  policy({
    directory: "content/system-admission",
    stem: "ziwei-source-binding-requirements",
    idField: "ledgerId",
    memberDigestFields: ["ledgerDigest"]
  })
]);

export const CURRENT_FAMILY_POLICY_BY_KEY = OBJECT_FREEZE(Object.fromEntries(
  CURRENT_FAMILY_POLICIES.map((entry) => [entry.familyKey, entry])
));

if (CURRENT_FAMILY_POLICIES.length !== 25
  || Object.keys(CURRENT_FAMILY_POLICY_BY_KEY).length !== 25) {
  throw new Error("HISTORY_POLICY_INVALID: expected exactly 25 unique families");
}

const legacyPolicies = CURRENT_FAMILY_POLICIES.filter(
  (entry) => entry.lineageMode === "index_only_legacy"
);
if (legacyPolicies.length !== 1
  || legacyPolicies[0].familyKey !== "content/knowledge/manifest") {
  throw new Error("HISTORY_POLICY_INVALID: knowledge manifest must be the sole legacy family");
}
