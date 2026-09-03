import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import { TextDecoder, types as utilTypes } from "node:util";
import { parseExpression } from "@babel/parser";

export const VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH =
  "content/system-admission/vedic-runtime-dependency-license-evidence.v1.json";

const ADR_RELATIVE_PATH = "docs/吠陀占星独立产品化ADR-0001-2026-08-26.md";
const ADR_RAW_IDENTITY = Object.freeze({
  bytes: 4_531,
  sha256: "0e9b81505abb963b4d64426338b8071cd8a211eed8d02fe76065fada335dce63"
});
const ARTIFACT_ROLE =
  "authoritative_project_record_of_public_runtime_dependency_license_observations";
const STATUS =
  "five_claimed_publisher_or_maintainer_public_endpoints_ten_read_receipts_observed_four_of_five_dependencies_have_refs_loopback_zero_link_only_unreviewed_unsigned_no_legal_conclusion_redistribution_or_selection";
const CREATED_AT = "2026-08-29T06:08:01.354Z";
const OBSERVATION_STARTED_AT = "2026-08-29T06:07:50.954Z";
const OBSERVATION_COMPLETED_AT = "2026-08-29T06:08:01.354Z";
const DIGEST_DOMAIN = "hakimi-vedic-runtime-dependency-license-evidence-v1";
const MAX_EVIDENCE_BYTES = 1_000_000;
const MAX_BOUND_ARTIFACT_BYTES = 100_000;
const MAX_SNAPSHOT_NODES = 80_000;
const MAX_SNAPSHOT_TEXT_CODE_UNITS = 4_000_000;
const MAX_SNAPSHOT_DEPTH = 128;

const DEPENDENCY_IDS = Object.freeze([
  "python_runtime",
  "swiss_ephemeris_code",
  "ephemeris_data_files",
  "dedicated_worker",
  "loopback_local_service"
]);

const EVIDENCE_REFS = Object.freeze({
  python:
    "hakimi.vedic.runtime-license-evidence/python-psf-legal-public-read/2026-08-29",
  swissPinned:
    "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-commit-license-public-read/2026-08-29",
  swissDynamic:
    "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-dynamic-overview-public-read/2026-08-29",
  swissProfessional:
    "hakimi.vedic.runtime-license-evidence/swiss-ephemeris-professional-contract-template-public-read/2026-08-29",
  whatwgWorker:
    "hakimi.vedic.runtime-license-evidence/whatwg-workers-living-standard-public-read/2026-08-29"
});

const REVIEW_QUESTION_IDS = Object.freeze({
  python_runtime: Object.freeze([
    "python_runtime_exact_version_and_license_identity_question",
    "python_runtime_packaging_and_redistribution_terms_question",
    "python_runtime_security_update_and_support_window_question"
  ]),
  swiss_ephemeris_code: Object.freeze([
    "swiss_ephemeris_code_exact_version_and_license_identity_question",
    "swiss_ephemeris_binding_and_distribution_terms_question",
    "swiss_ephemeris_code_update_and_provenance_question"
  ]),
  ephemeris_data_files: Object.freeze([
    "ephemeris_data_file_set_version_and_provenance_question",
    "ephemeris_data_file_use_and_redistribution_rights_question",
    "ephemeris_data_file_update_integrity_question"
  ]),
  dedicated_worker: Object.freeze([
    "dedicated_worker_platform_support_question",
    "dedicated_worker_isolation_and_message_boundary_question",
    "dedicated_worker_packaging_dependency_license_question"
  ]),
  loopback_local_service: Object.freeze([
    "loopback_service_process_distribution_question",
    "loopback_service_port_origin_and_authentication_review_question",
    "loopback_service_runtime_dependency_license_question"
  ])
});

const AUTHORITY_BOUNDARY = Object.freeze({
  artifactAuthenticityEstablished: false,
  centralAdmissionAuthorized: false,
  domainAuthorityAuthorized: false,
  expertClaimsAuthorized: false,
  formalAdmissionAuthorized: false,
  licenseReviewComplete: false,
  productRuntimeAuthorized: false,
  publicDeploymentAuthorized: false,
  publicReleaseAuthorized: false,
  redistributionAuthorized: false,
  releaseReady: false,
  rightsLegalConclusionEstablished: false,
  runtimeOptionSelected: false
});

const LEGAL_DECISION_BOUNDARY = Object.freeze({
  decisionArtifactRefs: Object.freeze([]),
  decisionStatus: "not_established",
  executedContractRefs: Object.freeze([]),
  legalReviewAttestationIds: Object.freeze([]),
  legalReviewComplete: false,
  ownerDecisionRefs: Object.freeze([]),
  redistributionAuthorized: false,
  reviewComplete: false,
  selectedLicenseModel: null,
  signedProfessionalContractObserved: false
});

const OBSERVATION_BOUNDARY = Object.freeze({
  abaExcluded: false,
  adrAndEvidenceAtomicSnapshot: false,
  artifactAuthenticityEstablished: false,
  claimedPublisherOrMaintainerEndpointsObserved: 5,
  crossFileAtomicSnapshot: false,
  digitalSignaturesVerified: 0,
  evidenceHashAndParseUseSameReadBuffer: true,
  heldFileHandleReads: true,
  immediateReadPairsObserved: 5,
  immediateReadPairsStable: 4,
  intervalMutationExcluded: false,
  legalReviewsComplete: 0,
  licenseSelectionsMade: 0,
  mutationEpochAvailable: false,
  mutationEpochReceipt: null,
  observationCompletedAt: OBSERVATION_COMPLETED_AT,
  observationStartedAt: OBSERVATION_STARTED_AT,
  pathEndpointRevalidated: true,
  perReadCapturedAtAvailable: false,
  plainDirectoryChainRequired: true,
  publicHttpReadsObserved: 10,
  publisherIdentitiesIndependentlyVerified: 0,
  redistributionAuthorizations: 0,
  sourceBodiesStored: 0,
  sourceObservationCount: 5,
  storagePolicy: "link_only_no_source_body_copied",
  unstableImmediateReadPairs: 1
});

const DOES_NOT_ESTABLISH = Object.freeze([
  "publisher_maintainer_or_carrier_authenticity_or_digital_signature",
  "exact_python_runtime_version_packaging_or_transitive_dependency_identity",
  "swiss_ephemeris_or_ephemeris_data_selection",
  "dedicated_worker_bundle_or_packaged_dependency_identity",
  "loopback_local_service_dependency_evidence",
  "five_public_endpoints_as_five_of_five_dependency_coverage",
  "dynamic_astrodienst_page_as_stable_or_frozen_source_body",
  "unsigned_professional_contract_template_as_executed_contract_or_license_grant",
  "whatwg_living_standard_as_worker_bundle_license_or_browser_validation",
  "source_body_storage_exact_quote_or_offline_carrier_materialization",
  "body_digest_or_project_summary_as_legal_review_or_legal_conclusion",
  "license_model_selection_redistribution_authorization_or_owner_decision",
  "runtime_option_selection_implementation_execution_or_build_artifact",
  "central_registry_parent_productization_or_source_rights_binding",
  "formal_admission_release_readiness_or_public_release_authorization",
  "mutation_epoch_cross_file_atomic_snapshot_interval_mutation_or_aba_exclusion"
]);

function retrievalRead(bytes, contentType, etag, lastModified, sha256) {
  return Object.freeze({
    bytes,
    contentType,
    etag,
    httpStatus: 200,
    lastModified,
    sha256
  });
}

function bodyObservation(summary, assertionCodes) {
  return Object.freeze({
    assertionCodes: Object.freeze(assertionCodes),
    bodySummary: summary,
    bodySummarySha256: createHash("sha256").update(summary, "utf8").digest("hex"),
    bodySummaryStatus: "project_authored_paraphrase_unreviewed",
    exactQuoteStored: false,
    locatorRefs: Object.freeze([]),
    sourceBodyStored: false
  });
}

function observationLegalDecision() {
  return Object.freeze({
    executedContractObserved: false,
    legalConclusionEstablished: false,
    legalReviewAttestationIds: Object.freeze([]),
    legalReviewComplete: false,
    ownerDecisionRefs: Object.freeze([]),
    redistributionAuthorized: false,
    reviewComplete: false,
    selectedLicenseModel: null
  });
}

function publicObservation(spec) {
  return Object.freeze({
    authenticityEstablished: false,
    bodyObservation: bodyObservation(spec.bodySummary, spec.assertionCodes),
    carrierIdentity: Object.freeze({
      bodyStored: false,
      carrierId: spec.carrierId,
      carrierIdentityEstablished: false,
      finalUrl: spec.finalUrl,
      firstRead: spec.firstRead,
      materializationPolicy: "link_only_no_source_body_stored",
      requestedUrl: spec.requestedUrl,
      secondRead: spec.secondRead,
      stableAcrossTwoImmediateReads: spec.stableAcrossTwoImmediateReads
    }),
    dependencyIds: Object.freeze(spec.dependencyIds),
    editionIdentity: Object.freeze({
      editionId: spec.editionId,
      identityEstablished: false,
      sourceVersionPin: spec.sourceVersionPin
    }),
    evidenceRef: spec.evidenceRef,
    evidenceScope: spec.evidenceScope,
    legalDecision: observationLegalDecision(),
    publisherIdentityIndependentlyVerified: false,
    workIdentity: Object.freeze({
      claimedPublisherOrMaintainer: spec.claimedPublisherOrMaintainer,
      identityEstablished: false,
      title: spec.workTitle,
      workId: spec.workId,
      workType: spec.workType
    })
  });
}

const OBSERVATIONS = Object.freeze([
  publicObservation({
    assertionCodes: [
      "psf_page_identifies_python_and_standard_library_license_family",
      "other_python_implementations_may_have_different_rights"
    ],
    bodySummary:
      "The public Python legal overview identifies a Python and standard-library license family and warns that other implementations may carry different rights; no exact runtime version or packaging set is selected.",
    carrierId: "python-org-about-legal-public-page",
    claimedPublisherOrMaintainer: "Python Software Foundation",
    dependencyIds: ["python_runtime"],
    editionId: null,
    evidenceRef: EVIDENCE_REFS.python,
    evidenceScope: "license_family_overview_only_exact_runtime_version_and_packaging_unselected",
    finalUrl: "https://www.python.org/about/legal/",
    firstRead: retrievalRead(
      33_368,
      "text/html",
      null,
      null,
      "579c76490d8f53a260c5aaa436f8287d770063168220b5bc9f1bf41cc2da0957"
    ),
    requestedUrl: "https://www.python.org/about/legal/",
    secondRead: retrievalRead(
      33_368,
      "text/html",
      null,
      null,
      "579c76490d8f53a260c5aaa436f8287d770063168220b5bc9f1bf41cc2da0957"
    ),
    sourceVersionPin: null,
    stableAcrossTwoImmediateReads: true,
    workId: "python-runtime-license-family",
    workTitle: "Python",
    workType: "software_runtime_license_family"
  }),
  publicObservation({
    assertionCodes: [
      "swiss_ephemeris_license_file_describes_dual_license_models",
      "license_choice_described_before_distribution_or_public_service"
    ],
    bodySummary:
      "The commit-pinned Swiss Ephemeris LICENSE describes AGPL and Professional license routes and says a route is chosen before software distribution or activation of a public service; no route is selected here.",
    carrierId: "github-raw-swisseph-3fd0-license",
    claimedPublisherOrMaintainer: "Astrodienst AG via aloistr/swisseph",
    dependencyIds: ["swiss_ephemeris_code", "ephemeris_data_files"],
    editionId: "git-commit-3fd0f956d73898b91cc4f67cf18b21af656d1342",
    evidenceRef: EVIDENCE_REFS.swissPinned,
    evidenceScope: "commit_pinned_license_text_retrieval_only_no_license_path_selected",
    finalUrl:
      "https://raw.githubusercontent.com/aloistr/swisseph/3fd0f956d73898b91cc4f67cf18b21af656d1342/LICENSE",
    firstRead: retrievalRead(
      2_371,
      "text/plain; charset=utf-8",
      "W/\"1f0f24a33b0eb12f550f9cf5bddd632280134f0d4175dbc8dd2886904b1dbbb5\"",
      null,
      "b6345743292c516d07799dfad46f1a641e5270da2160cc4d6bd54594d6faa991"
    ),
    requestedUrl:
      "https://raw.githubusercontent.com/aloistr/swisseph/3fd0f956d73898b91cc4f67cf18b21af656d1342/LICENSE",
    secondRead: retrievalRead(
      2_371,
      "text/plain; charset=utf-8",
      "W/\"1f0f24a33b0eb12f550f9cf5bddd632280134f0d4175dbc8dd2886904b1dbbb5\"",
      null,
      "b6345743292c516d07799dfad46f1a641e5270da2160cc4d6bd54594d6faa991"
    ),
    sourceVersionPin: "git_commit_3fd0f956d73898b91cc4f67cf18b21af656d1342",
    stableAcrossTwoImmediateReads: true,
    workId: "swiss-ephemeris-code-and-data-license-notice",
    workTitle: "Swiss Ephemeris",
    workType: "software_and_ephemeris_data_license_notice"
  }),
  publicObservation({
    assertionCodes: [
      "astrodienst_page_describes_dual_license_models",
      "astrodienst_page_describes_compressed_ephemeris_data",
      "immediate_retrieval_pair_has_different_body_digest"
    ],
    bodySummary:
      "The Astrodienst overview describes Swiss Ephemeris licensing and compressed ephemeris data, but the two immediate public reads had different body digests, so this dynamic page is not a frozen source body.",
    carrierId: "astro-com-swisseph-dynamic-overview-page",
    claimedPublisherOrMaintainer: "Astrodienst AG",
    dependencyIds: ["swiss_ephemeris_code", "ephemeris_data_files"],
    editionId: null,
    evidenceRef: EVIDENCE_REFS.swissDynamic,
    evidenceScope: "dynamic_publisher_page_variance_observation_not_frozen_source_body",
    finalUrl: "https://www.astro.com/swisseph/swephinfo_e.htm",
    firstRead: retrievalRead(
      62_524,
      "text/html; charset=UTF-8",
      null,
      null,
      "0d08e91fe7c975d0156b38d56add580f8bcd662433fef589e82dcdb1cd4eb9c0"
    ),
    requestedUrl: "https://www.astro.com/swisseph/swephinfo_e.htm",
    secondRead: retrievalRead(
      62_524,
      "text/html; charset=UTF-8",
      null,
      null,
      "a5766678581fa5fd263fe217bcd11695d3b74144a7be216c0668a7ef545a2efe"
    ),
    sourceVersionPin: null,
    stableAcrossTwoImmediateReads: false,
    workId: "swiss-ephemeris-public-overview",
    workTitle: "Swiss Ephemeris public overview",
    workType: "dynamic_publisher_webpage"
  }),
  publicObservation({
    assertionCodes: [
      "professional_contract_template_lists_code_and_ephemeris_data_files",
      "professional_license_template_requires_execution_and_payment_before_validity"
    ],
    bodySummary:
      "The public Professional License contract template lists Swiss Ephemeris code and data files and states that validity depends on execution and payment; the template is unsigned and is not a project license.",
    carrierId: "astro-com-swisseph-professional-contract-template-pdf",
    claimedPublisherOrMaintainer: "Astrodienst AG",
    dependencyIds: ["swiss_ephemeris_code", "ephemeris_data_files"],
    editionId: "last-modified-2026-06-19T14-10-31Z",
    evidenceRef: EVIDENCE_REFS.swissProfessional,
    evidenceScope: "unsigned_contract_template_observation_not_executed_license_or_authorization",
    finalUrl: "https://www.astro.com/swisseph/secont_e.pdf",
    firstRead: retrievalRead(
      105_150,
      "application/pdf",
      null,
      "Fri, 19 Jun 2026 14:10:31 GMT",
      "0e0a80ab3efcc239ce5a0d8d0be05635281b2a6f298935229ebdfe5392ca043a"
    ),
    requestedUrl: "https://www.astro.com/swisseph/secont_e.pdf",
    secondRead: retrievalRead(
      105_150,
      "application/pdf",
      null,
      "Fri, 19 Jun 2026 14:10:31 GMT",
      "0e0a80ab3efcc239ce5a0d8d0be05635281b2a6f298935229ebdfe5392ca043a"
    ),
    sourceVersionPin: "last_modified_2026_06_19T14_10_31Z",
    stableAcrossTwoImmediateReads: true,
    workId: "swiss-ephemeris-professional-license-contract-template",
    workTitle: "Swiss Ephemeris Professional License contract template",
    workType: "unsigned_contract_template"
  }),
  publicObservation({
    assertionCodes: [
      "whatwg_standard_defines_dedicated_worker_platform_api",
      "whatwg_standard_describes_worker_message_boundary"
    ],
    bodySummary:
      "The WHATWG living standard defines the Dedicated Worker platform API and its message boundary; it is not evidence for a packaged Worker bundle, a browser run, or any third-party dependency license.",
    carrierId: "whatwg-html-workers-living-standard-page",
    claimedPublisherOrMaintainer: "WHATWG",
    dependencyIds: ["dedicated_worker"],
    editionId: "last-modified-2026-08-28T06-43-45Z",
    evidenceRef: EVIDENCE_REFS.whatwgWorker,
    evidenceScope: "living_platform_specification_observation_not_browser_or_packaged_dependency_license",
    finalUrl: "https://html.spec.whatwg.org/multipage/workers.html",
    firstRead: retrievalRead(
      305_340,
      "text/html; charset=utf-8",
      "W/\"6a912e21-4a8bc\"",
      "Fri, 28 Aug 2026 06:43:45 GMT",
      "f768875a62c65ef50b08c7e1126084148b3f1b9e74037165601b22399aaee429"
    ),
    requestedUrl: "https://html.spec.whatwg.org/multipage/workers.html",
    secondRead: retrievalRead(
      305_340,
      "text/html; charset=utf-8",
      "W/\"6a912e21-4a8bc\"",
      "Fri, 28 Aug 2026 06:43:45 GMT",
      "f768875a62c65ef50b08c7e1126084148b3f1b9e74037165601b22399aaee429"
    ),
    sourceVersionPin: "living_standard_last_modified_2026_08_28T06_43_45Z",
    stableAcrossTwoImmediateReads: true,
    workId: "whatwg-html-workers-living-standard",
    workTitle: "HTML Living Standard: Web workers",
    workType: "living_platform_standard"
  })
]);

function dependencyEvidenceEntry(dependencyId, evidenceRefs) {
  return Object.freeze({
    dependencyId,
    evidenceRefs: Object.freeze(evidenceRefs),
    legalConclusionEstablished: false,
    redistributionAuthorized: false,
    reviewComplete: false,
    reviewQuestionIds: REVIEW_QUESTION_IDS[dependencyId],
    selection: "undecided_not_selected"
  });
}

const DEPENDENCY_EVIDENCE_MATRIX = Object.freeze([
  dependencyEvidenceEntry("python_runtime", [EVIDENCE_REFS.python]),
  dependencyEvidenceEntry("swiss_ephemeris_code", [
    EVIDENCE_REFS.swissPinned,
    EVIDENCE_REFS.swissDynamic,
    EVIDENCE_REFS.swissProfessional
  ]),
  dependencyEvidenceEntry("ephemeris_data_files", [
    EVIDENCE_REFS.swissPinned,
    EVIDENCE_REFS.swissDynamic,
    EVIDENCE_REFS.swissProfessional
  ]),
  dependencyEvidenceEntry("dedicated_worker", [EVIDENCE_REFS.whatwgWorker]),
  dependencyEvidenceEntry("loopback_local_service", [])
]);

const EVIDENCE_SUMMARY = Object.freeze({
  dependenciesRequired: 5,
  dependenciesWithObservedRefs: 4,
  dependenciesWithoutObservedRefs: 1,
  dependencyIdsWithoutObservedRefs: Object.freeze(["loopback_local_service"]),
  immediateReadPairsObserved: 5,
  immediateReadPairsStable: 4,
  legalReviewsComplete: 0,
  licenseSelectionsMade: 0,
  matrixEvidenceRefLinks: 8,
  publicHttpReadsObserved: 10,
  redistributionAuthorizations: 0,
  sourceBodiesStored: 0,
  uniqueEvidenceRefs: 5,
  unstableImmediateReadPairs: 1
});

const TYPED_ARRAY_PROTOTYPE = Object.getPrototypeOf(Uint8Array.prototype);
const TYPED_ARRAY_BUFFER_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "buffer")?.get;
const TYPED_ARRAY_BYTE_OFFSET_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteOffset")?.get;
const TYPED_ARRAY_BYTE_LENGTH_GETTER =
  Object.getOwnPropertyDescriptor(TYPED_ARRAY_PROTOTYPE, "byteLength")?.get;
const ARRAY_BUFFER_RESIZABLE_GETTER =
  Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "resizable")?.get;
const UINT8_ARRAY_SET = Uint8Array.prototype.set;

export class VedicRuntimeDependencyLicenseEvidenceError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = "VedicRuntimeDependencyLicenseEvidenceError";
    this.code = code;
  }
}

function fail(code, message, options = undefined) {
  throw new VedicRuntimeDependencyLicenseEvidenceError(code, message, options);
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function snapshotJsonValue(
  input,
  label = "吠陀运行时依赖许可 evidence",
  depth = 0,
  state = undefined
) {
  const activeState = state ?? {
    nodes: 0,
    textCodeUnits: 0,
    seen: new WeakSet()
  };
  activeState.nodes += 1;
  if (activeState.nodes > MAX_SNAPSHOT_NODES || depth > MAX_SNAPSHOT_DEPTH) {
    fail("INPUT_BUDGET_EXCEEDED", `${label} 超过结构预算。`);
  }
  if (input === null || typeof input === "boolean") return input;
  if (typeof input === "string") {
    activeState.textCodeUnits += input.length;
    if (activeState.textCodeUnits > MAX_SNAPSHOT_TEXT_CODE_UNITS) {
      fail("INPUT_BUDGET_EXCEEDED", `${label} 超过文本预算。`);
    }
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input) || Object.is(input, -0)) {
      fail("INPUT_VALUE_INVALID", `${label} 含非有限数或负零。`);
    }
    return input;
  }
  if (typeof input !== "object") {
    fail("INPUT_VALUE_INVALID", `${label} 含非 JSON 值。`);
  }
  if (utilTypes.isProxy(input)) fail("INPUT_PROXY_FORBIDDEN", `${label} 不接受 Proxy。`);
  if (activeState.seen.has(input)) {
    fail("INPUT_CYCLE_OR_ALIAS_FORBIDDEN", `${label} 不接受循环或对象别名。`);
  }
  activeState.seen.add(input);
  let descriptors;
  try {
    descriptors = Object.getOwnPropertyDescriptors(input);
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "INPUT_DESCRIPTOR_INVALID",
      `${label} 无法被动读取描述符。`,
      { cause }
    );
  }
  if (Reflect.ownKeys(descriptors).some((key) => typeof key === "symbol")) {
    fail("INPUT_SYMBOL_FORBIDDEN", `${label} 不接受 Symbol 键。`);
  }
  for (const descriptor of Object.values(descriptors)) {
    if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
      fail("INPUT_ACCESSOR_FORBIDDEN", `${label} 不接受访问器。`);
    }
  }
  if (Array.isArray(input)) {
    if (Object.getPrototypeOf(input) !== Array.prototype) {
      fail("INPUT_PROTOTYPE_INVALID", `${label} 数组原型无效。`);
    }
    const keys = Object.keys(descriptors).filter((key) => key !== "length");
    if (keys.length !== input.length || keys.some((key, index) => key !== String(index))) {
      fail("INPUT_ARRAY_INVALID", `${label} 数组稀疏或含额外字段。`);
    }
    return keys.map((key) => snapshotJsonValue(
      descriptors[key].value,
      `${label}[${key}]`,
      depth + 1,
      activeState
    ));
  }
  if (Object.getPrototypeOf(input) !== Object.prototype) {
    fail("INPUT_PROTOTYPE_INVALID", `${label} 必须是普通对象。`);
  }
  const output = {};
  for (const key of Object.keys(descriptors).sort(compareCodeUnits)) {
    activeState.textCodeUnits += key.length;
    if (activeState.textCodeUnits > MAX_SNAPSHOT_TEXT_CODE_UNITS) {
      fail("INPUT_BUDGET_EXCEEDED", `${label} 超过文本预算。`);
    }
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: snapshotJsonValue(
        descriptors[key].value,
        `${label}.${key}`,
        depth + 1,
        activeState
      ),
      writable: true
    });
  }
  return output;
}

function canonicalJsonFromSnapshot(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJsonFromSnapshot(entry)).join(",")}]`;
  }
  const keys = Object.keys(value).sort(compareCodeUnits);
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJsonFromSnapshot(value[key])}`).join(",")}}`;
}

function canonicalPrettyFromSnapshot(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence(value) {
  return canonicalPrettyFromSnapshot(snapshotJsonValue(value));
}

function canonicalStringify(value) {
  return canonicalJsonFromSnapshot(snapshotJsonValue(value));
}

function domainSeparatedDigest(domain, value) {
  return createHash("sha256")
    .update(domain, "utf8")
    .update(Buffer.from([0]))
    .update(canonicalJsonFromSnapshot(value), "utf8")
    .digest("hex");
}

export function computeVedicRuntimeDependencyLicenseEvidenceDigest(evidenceInput) {
  const evidence = snapshotJsonValue(evidenceInput);
  const { evidenceDigest: _ignored, ...unsigned } = evidence;
  return domainSeparatedDigest(DIGEST_DOMAIN, unsigned);
}

function walkAst(node, visit) {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const entry of value) walkAst(entry, visit);
    } else if (value && typeof value === "object") {
      walkAst(value, visit);
    }
  }
}

function captureUint8Array(bytes, label, maxBytes) {
  if (utilTypes.isProxy(bytes)) fail("JSON_PROXY_FORBIDDEN", `${label} 不接受 Proxy 字节。`);
  if (!utilTypes.isUint8Array(bytes)
    || typeof TYPED_ARRAY_BUFFER_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_OFFSET_GETTER !== "function"
    || typeof TYPED_ARRAY_BYTE_LENGTH_GETTER !== "function") {
    fail("JSON_BYTES_INVALID", `${label} 必须是内部 Uint8Array 字节视图。`);
  }
  let backingBuffer;
  let byteOffset;
  let byteLength;
  try {
    backingBuffer = Reflect.apply(TYPED_ARRAY_BUFFER_GETTER, bytes, []);
    byteOffset = Reflect.apply(TYPED_ARRAY_BYTE_OFFSET_GETTER, bytes, []);
    byteLength = Reflect.apply(TYPED_ARRAY_BYTE_LENGTH_GETTER, bytes, []);
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "JSON_BYTES_INVALID",
      `${label} 的内部字节槽不可读。`,
      { cause }
    );
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0
    || !Number.isSafeInteger(byteOffset) || byteOffset < 0
    || !Number.isSafeInteger(byteLength) || byteLength < 0) {
    fail("JSON_BYTES_INVALID", `${label} 的字节边界无效。`);
  }
  if (byteLength > maxBytes) fail("JSON_TOO_LARGE", `${label} 超过输入上限。`);
  if (typeof utilTypes.isSharedArrayBuffer === "function"
    && utilTypes.isSharedArrayBuffer(backingBuffer)) {
    fail("JSON_SHARED_BUFFER_FORBIDDEN", `${label} 不接受 SharedArrayBuffer。`);
  }
  if (!utilTypes.isArrayBuffer(backingBuffer)) {
    fail("JSON_BYTES_INVALID", `${label} 的 backing buffer 无效。`);
  }
  if (typeof ARRAY_BUFFER_RESIZABLE_GETTER === "function") {
    let resizable;
    try {
      resizable = Reflect.apply(ARRAY_BUFFER_RESIZABLE_GETTER, backingBuffer, []);
    } catch (cause) {
      throw new VedicRuntimeDependencyLicenseEvidenceError(
        "JSON_BYTES_INVALID",
        `${label} 的 ArrayBuffer 状态不可读。`,
        { cause }
      );
    }
    if (resizable) fail("JSON_RESIZABLE_BUFFER_FORBIDDEN", `${label} 不接受 resizable ArrayBuffer。`);
  }
  const captured = new Uint8Array(byteLength);
  try {
    Reflect.apply(UINT8_ARRAY_SET, captured, [bytes]);
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "JSON_BYTES_INVALID",
      `${label} 无法复制到私有固定缓冲区。`,
      { cause }
    );
  }
  return captured;
}

export function parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(
  bytes,
  label = "吠陀运行时依赖许可 evidence JSON",
  maxBytes = MAX_EVIDENCE_BYTES
) {
  const captured = captureUint8Array(bytes, label, maxBytes);
  if (captured.byteLength >= 3
    && captured[0] === 0xef && captured[1] === 0xbb && captured[2] === 0xbf) {
    fail("JSON_BOM_FORBIDDEN", `${label} 不得包含 UTF-8 BOM。`);
  }
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(captured);
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "JSON_UTF8_INVALID",
      `${label} 不是严格 UTF-8。`,
      { cause }
    );
  }
  if (!source.trim()) fail("JSON_INVALID", `${label} 为空。`);
  let expression;
  try {
    expression = parseExpression(source.trim(), {
      attachComment: false,
      errorRecovery: false,
      sourceFilename: "vedic-runtime-dependency-license-evidence.json",
      sourceType: "script"
    });
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "JSON_INVALID",
      `${label} 不能按严格 JSON 检查。`,
      { cause }
    );
  }
  walkAst(expression, (node) => {
    if (node.type !== "ObjectExpression") return;
    const keys = new Set();
    for (const property of node.properties) {
      if (property.type !== "ObjectProperty"
        || property.computed
        || property.key?.type !== "StringLiteral") {
        fail("JSON_INVALID", `${label} 含非 JSON 对象属性。`);
      }
      if (keys.has(property.key.value)) fail("JSON_DUPLICATE_KEY", `${label} 含重复对象键。`);
      keys.add(property.key.value);
    }
  });
  let parsed;
  try {
    parsed = JSON.parse(source);
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(
      "JSON_INVALID",
      `${label} 不是合法 JSON。`,
      { cause }
    );
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    fail("JSON_INVALID", `${label} 必须是 JSON 对象。`);
  }
  return parsed;
}

function canonicalRelativePath(relativePath, label) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
    || relativePath.includes(":")
    || relativePath.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
    fail("PATH_INVALID", `${label} 必须是 canonical 工作区相对路径。`);
  }
  return relativePath;
}

function insideRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ""
    || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function sameFilesystemPath(left, right) {
  return process.platform === "win32"
    ? left.toLowerCase() === right.toLowerCase()
    : left === right;
}

function safeWorkspaceFile(workspaceRoot, relativePath) {
  const canonical = canonicalRelativePath(relativePath, "工件路径");
  const root = path.resolve(workspaceRoot);
  const absolute = path.resolve(root, ...canonical.split("/"));
  if (!insideRoot(root, absolute)) fail("PATH_INVALID", "工件路径越出工作区。");
  return { absolute, canonical, root };
}

function sameFileEndpoint(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.nlink === right.nlink
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function verifyPlainDirectoryChain(root, canonicalPath, invalidCode, label) {
  const rootReal = await realpath(root);
  if (!sameFilesystemPath(rootReal, root)) {
    fail(invalidCode, `${label} 工作区根必须是物理目录。`);
  }
  const segments = canonicalPath.split("/").slice(0, -1);
  let cursor = root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    const details = await lstat(cursor, { bigint: true });
    if (!details.isDirectory() || details.isSymbolicLink()) {
      fail(invalidCode, `${label} 的目录链不能包含符号链接、junction 或特殊端点。`);
    }
    const resolved = await realpath(cursor);
    if (!insideRoot(rootReal, resolved)) fail(invalidCode, `${label} 的目录链 realpath 越出工作区。`);
  }
}

async function readAtMost(handle, maxBytes, invalidCode, label) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const capacity = Math.min(64 * 1024, maxBytes + 1 - total);
    if (capacity <= 0) break;
    const chunk = Buffer.allocUnsafe(capacity);
    const { bytesRead } = await handle.read(chunk, 0, capacity, null);
    if (bytesRead === 0) break;
    chunks.push(chunk.subarray(0, bytesRead));
    total += bytesRead;
  }
  if (total > maxBytes) fail(invalidCode, `${label} 超过输入上限。`);
  return Buffer.concat(chunks, total);
}

async function readStableWorkspaceFile(workspaceRoot, relativePath, maxBytes, options = {}) {
  const {
    invalidCode = "BOUND_ARTIFACT_ENDPOINT_INVALID",
    label = relativePath,
    missingCode = "BOUND_ARTIFACT_MISSING"
  } = options;
  const { absolute, canonical, root } = safeWorkspaceFile(workspaceRoot, relativePath);
  await verifyPlainDirectoryChain(root, canonical, invalidCode, label);
  let before;
  try {
    before = await lstat(absolute, { bigint: true });
  } catch (cause) {
    throw new VedicRuntimeDependencyLicenseEvidenceError(missingCode, `${label} 不存在。`, { cause });
  }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size <= 0n || before.size > BigInt(maxBytes)) {
    fail(invalidCode, `${label} 必须是单链接、非空、有限大小普通文件。`);
  }
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const handle = await open(absolute, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = await handle.stat({ bigint: true });
    if (!opened.isFile() || opened.nlink !== 1n || !sameFileEndpoint(before, opened)) {
      fail(invalidCode, `${label} 打开后端点发生变化。`);
    }
    const bytes = await readAtMost(handle, maxBytes, invalidCode, label);
    const [afterHandle, afterPath, afterReal] = await Promise.all([
      handle.stat({ bigint: true }),
      lstat(absolute, { bigint: true }),
      realpath(absolute)
    ]);
    if (!afterPath.isFile() || afterPath.isSymbolicLink() || afterPath.nlink !== 1n
      || !sameFileEndpoint(opened, afterHandle)
      || !sameFileEndpoint(afterHandle, afterPath)
      || !sameFilesystemPath(afterReal, absolute)
      || BigInt(bytes.byteLength) !== afterHandle.size) {
      fail(invalidCode, `${label} 读取期间端点发生变化。`);
    }
    await verifyPlainDirectoryChain(root, canonical, invalidCode, label);
    return Object.freeze({
      bytes,
      path: canonical,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.byteLength
    });
  } finally {
    await handle.close();
  }
}

function requireAdrIdentity(snapshot) {
  if (snapshot.path !== ADR_RELATIVE_PATH
    || snapshot.size !== ADR_RAW_IDENTITY.bytes
    || snapshot.sha256 !== ADR_RAW_IDENTITY.sha256) {
    fail("ADR_IDENTITY_MISMATCH", "吠陀独立产品边界 ADR 的 bytes 或 raw SHA-256 漂移。");
  }
}

function deepFreezeJson(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const entry of Object.values(value)) deepFreezeJson(entry);
  return Object.freeze(value);
}

function buildExpectedEvidence(adrSnapshot) {
  requireAdrIdentity(adrSnapshot);
  const unsigned = {
    artifactRole: ARTIFACT_ROLE,
    authorityBoundary: { ...AUTHORITY_BOUNDARY },
    boundaryBindings: {
      bindingDirection: "runtime_dependency_license_evidence_to_adr_only",
      childBindsCentralRegistry: false,
      childBindsParent: false,
      childBindsRuntimeProposal: false,
      upstreamArtifacts: [
        {
          artifactRole: "independent_product_boundary_adr",
          bytes: adrSnapshot.size,
          decisionStatus: "accepted_research_boundary",
          path: adrSnapshot.path,
          rawHashAndInspectionUseSameReadBuffer: true,
          sha256: adrSnapshot.sha256
        }
      ]
    },
    createdAt: CREATED_AT,
    dependencyEvidenceMatrix: DEPENDENCY_EVIDENCE_MATRIX.map((entry) => ({ ...entry })),
    doesNotEstablish: [...DOES_NOT_ESTABLISH],
    evidenceLedgerId: "hakimi.vedic.runtime-dependency-license-evidence/1.0.0",
    evidenceSummary: { ...EVIDENCE_SUMMARY },
    integrityBoundary: {
      authenticityEstablished: false,
      digestAlgorithm: "SHA-256",
      digestDomain: DIGEST_DOMAIN,
      digestIsDigitalSignature: false,
      digitalSignature: null,
      signerIdentity: null
    },
    legalDecisionBoundary: { ...LEGAL_DECISION_BOUNDARY },
    observationBoundary: { ...OBSERVATION_BOUNDARY },
    observations: OBSERVATIONS.map((entry) => ({ ...entry })),
    recordType: "vedic_runtime_dependency_license_evidence_v1",
    schemaVersion: "1.0.0",
    status: STATUS,
    systemIdentity: {
      contractSystemId: "vedic",
      integrationStatus: "not_integrated",
      productStatus: "research_only",
      productSystemId: "vedic-astrology"
    }
  };
  return deepFreezeJson({
    ...unsigned,
    evidenceDigest: domainSeparatedDigest(DIGEST_DOMAIN, snapshotJsonValue(unsigned))
  });
}

export async function buildCurrentVedicRuntimeDependencyLicenseEvidence(workspaceRoot) {
  const adrSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ADR_RELATIVE_PATH,
    MAX_BOUND_ARTIFACT_BYTES,
    {
      invalidCode: "ADR_ENDPOINT_INVALID",
      label: "吠陀独立产品边界 ADR",
      missingCode: "ADR_MISSING"
    }
  );
  return buildExpectedEvidence(adrSnapshot);
}

function exactJson(left, right) {
  return canonicalJsonFromSnapshot(left) === canonicalJsonFromSnapshot(right);
}

function requireExactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("EVIDENCE_INVALID", `${label} 必须是对象。`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const expected = [...keys].sort(compareCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("EVIDENCE_INVALID", `${label} 字段集合不匹配。`);
  }
}

function requireNoBacklink(boundaryBindings) {
  const text = canonicalJsonFromSnapshot(boundaryBindings);
  if (boundaryBindings?.childBindsParent !== false
    || boundaryBindings?.childBindsCentralRegistry !== false
    || boundaryBindings?.childBindsRuntimeProposal !== false
    || text.includes("vedic-runtime-and-bundle-size-proposal")
    || text.includes("vedic-independent-productization-requirements")
    || text.includes("system-admission-registry")
    || text.includes("four-system-admission")) {
    fail(
      "BOUNDARY_BACKLINK_FORBIDDEN",
      "runtime dependency license evidence child 只能绑定 ADR，不得回绑 proposal、parent 或中央 registry。"
    );
  }
}

function requireStaticFailClosedBoundary(evidence) {
  requireExactKeys(evidence, [
    "artifactRole", "authorityBoundary", "boundaryBindings", "createdAt",
    "dependencyEvidenceMatrix", "doesNotEstablish", "evidenceDigest", "evidenceLedgerId",
    "evidenceSummary", "integrityBoundary", "legalDecisionBoundary", "observationBoundary",
    "observations", "recordType", "schemaVersion", "status", "systemIdentity"
  ], "吠陀运行时依赖许可 evidence child");
  if (evidence.schemaVersion !== "1.0.0"
    || evidence.recordType !== "vedic_runtime_dependency_license_evidence_v1"
    || evidence.evidenceLedgerId !== "hakimi.vedic.runtime-dependency-license-evidence/1.0.0"
    || evidence.artifactRole !== ARTIFACT_ROLE
    || evidence.status !== STATUS
    || evidence.createdAt !== CREATED_AT) {
    fail("EVIDENCE_IDENTITY_INVALID", "evidence child 的 schema、身份、状态或 createdAt 无效。");
  }
  requireNoBacklink(evidence.boundaryBindings);
  if (!exactJson(evidence.authorityBoundary, AUTHORITY_BOUNDARY)) {
    fail("AUTHORITY_PROMOTED", "公开读取回执不得晋级任何产品、准入、法律或发布权威。");
  }
  if (!exactJson(evidence.integrityBoundary, {
    authenticityEstablished: false,
    digestAlgorithm: "SHA-256",
    digestDomain: DIGEST_DOMAIN,
    digestIsDigitalSignature: false,
    digitalSignature: null,
    signerIdentity: null
  })) {
    fail("SELF_SIGNED_AUTHORITY_PROMOTED", "摘要不是签名，不得自签或声称真实性。");
  }
  if (!exactJson(evidence.legalDecisionBoundary, LEGAL_DECISION_BOUNDARY)) {
    fail("LEGAL_DECISION_PROMOTED", "读取回执、模板或摘要不得冒充法律复核、合同或许可决定。");
  }
  if (!exactJson(evidence.observationBoundary, OBSERVATION_BOUNDARY)) {
    fail("OBSERVATION_BOUNDARY_INVALID", "批次时间、读取计数或 observation boundary 被改变。");
  }
  if (!exactJson(evidence.evidenceSummary, EVIDENCE_SUMMARY)) {
    fail("EVIDENCE_SUMMARY_INVALID", "五端点不得冒充五类依赖全部有 evidence refs。");
  }
  if (!Array.isArray(evidence.dependencyEvidenceMatrix)
    || evidence.dependencyEvidenceMatrix.length !== DEPENDENCY_IDS.length) {
    fail("DEPENDENCY_EVIDENCE_MATRIX_INVALID", "dependency evidence matrix 必须精确覆盖五类问题。");
  }
  for (const entry of evidence.dependencyEvidenceMatrix) {
    if (entry?.selection !== "undecided_not_selected") {
      fail("DEPENDENCY_SELECTION_PROMOTED", "evidence 观察不得选择 runtime dependency。");
    }
    if (entry?.reviewComplete !== false
      || entry?.legalConclusionEstablished !== false
      || entry?.redistributionAuthorized !== false) {
      fail("LEGAL_DECISION_PROMOTED", "evidence refs 不得提升 review、法律结论或再分发权限。");
    }
  }
  if (!exactJson(evidence.dependencyEvidenceMatrix, DEPENDENCY_EVIDENCE_MATRIX)
    || evidence.dependencyEvidenceMatrix[4]?.evidenceRefs?.length !== 0) {
    fail(
      "DEPENDENCY_EVIDENCE_MATRIX_INVALID",
      "matrix refs 必须精确映射四类已有观察，loopback_local_service 必须保持零 refs。"
    );
  }
  if (!Array.isArray(evidence.observations) || evidence.observations.length !== OBSERVATIONS.length) {
    fail("OBSERVATION_SET_INVALID", "必须精确保存五个公开端点 observation。");
  }
  for (let index = 0; index < evidence.observations.length; index += 1) {
    const actual = evidence.observations[index];
    const expected = OBSERVATIONS[index];
    const legal = actual?.legalDecision;
    if (legal?.reviewComplete !== false
      || legal?.legalReviewComplete !== false
      || legal?.legalConclusionEstablished !== false
      || legal?.redistributionAuthorized !== false
      || legal?.executedContractObserved !== false
      || legal?.selectedLicenseModel !== null
      || !Array.isArray(legal?.legalReviewAttestationIds)
      || legal.legalReviewAttestationIds.length !== 0
      || !Array.isArray(legal?.ownerDecisionRefs)
      || legal.ownerDecisionRefs.length !== 0) {
      fail("LEGAL_DECISION_PROMOTED", "单条 observation 不得自签 review、合同或法律决定。");
    }
    if (actual?.authenticityEstablished !== false
      || actual?.publisherIdentityIndependentlyVerified !== false
      || actual?.workIdentity?.identityEstablished !== false
      || actual?.editionIdentity?.identityEstablished !== false
      || actual?.carrierIdentity?.carrierIdentityEstablished !== false) {
      fail("IDENTITY_OR_AUTHENTICITY_PROMOTED", "公开端点声明不得冒充独立身份或真实性核验。");
    }
    if (actual?.carrierIdentity?.bodyStored !== false
      || actual?.carrierIdentity?.materializationPolicy !== "link_only_no_source_body_stored"
      || actual?.bodyObservation?.sourceBodyStored !== false
      || actual?.bodyObservation?.exactQuoteStored !== false) {
      fail("BODY_STORAGE_PROMOTED", "本 child 只能 link-only，不能声称保存正文或 exact quote。");
    }
    if (index === 2) {
      const firstSha = actual?.carrierIdentity?.firstRead?.sha256;
      const secondSha = actual?.carrierIdentity?.secondRead?.sha256;
      if (actual?.carrierIdentity?.stableAcrossTwoImmediateReads !== false || firstSha === secondSha) {
        fail("DYNAMIC_CARRIER_STABILITY_PROMOTED", "动态 Astrodienst 页面两次 digest 不同，不得伪装稳定。");
      }
    }
    if (!exactJson(actual?.carrierIdentity, expected.carrierIdentity)) {
      fail("CARRIER_OBSERVATION_INVALID", `observation ${index + 1} 的 URL、header、bytes 或 body hash 漂移。`);
    }
    if (!exactJson(actual?.workIdentity, expected.workIdentity)
      || !exactJson(actual?.editionIdentity, expected.editionIdentity)) {
      fail("WORK_EDITION_IDENTITY_INVALID", `observation ${index + 1} 的 work／edition 分账漂移。`);
    }
    if (!exactJson(actual?.bodyObservation, expected.bodyObservation)) {
      fail("BODY_OBSERVATION_INVALID", `observation ${index + 1} 的正文摘要、摘要 hash 或 assertion 漂移。`);
    }
    if (!exactJson(actual, expected)) {
      fail("OBSERVATION_INVALID", `observation ${index + 1} 与批准的只读回执不一致。`);
    }
  }
  if (!exactJson(evidence.doesNotEstablish, DOES_NOT_ESTABLISH)) {
    fail("EVIDENCE_BOUNDARY_PROMOTED", "doesNotEstablish 边界被删改。");
  }
  const computedDigest = computeVedicRuntimeDependencyLicenseEvidenceDigest(evidence);
  if (evidence.evidenceDigest !== computedDigest) {
    fail("EVIDENCE_DIGEST_MISMATCH", "evidenceDigest 与 canonical evidence 不一致。");
  }
}

async function verifyWithAdrSnapshot(adrSnapshot, evidenceInput) {
  requireAdrIdentity(adrSnapshot);
  const evidence = snapshotJsonValue(evidenceInput);
  requireStaticFailClosedBoundary(evidence);
  const expected = buildExpectedEvidence(adrSnapshot);
  if (canonicalStringify(evidence) !== canonicalStringify(expected)) {
    fail("EVIDENCE_MISMATCH", "evidence child 与固定 ADR 和公开读取回执不一致。");
  }
  const frozenEvidence = deepFreezeJson(evidence);
  return Object.freeze({
    dependenciesWithObservedRefs: frozenEvidence.evidenceSummary.dependenciesWithObservedRefs,
    dependenciesWithoutObservedRefs: frozenEvidence.evidenceSummary.dependenciesWithoutObservedRefs,
    evidence: frozenEvidence,
    evidenceDigest: frozenEvidence.evidenceDigest,
    legalReviewsComplete: frozenEvidence.evidenceSummary.legalReviewsComplete,
    loopbackEvidenceRefs: frozenEvidence.dependencyEvidenceMatrix[4].evidenceRefs.length,
    publicHttpReadsObserved: frozenEvidence.evidenceSummary.publicHttpReadsObserved,
    publicReleaseAuthorized: false,
    redistributionAuthorizations: frozenEvidence.evidenceSummary.redistributionAuthorizations,
    releaseReady: false,
    sourceObservationCount: frozenEvidence.evidenceSummary.uniqueEvidenceRefs,
    stableImmediateReadPairs: frozenEvidence.evidenceSummary.immediateReadPairsStable,
    status: frozenEvidence.status,
    unstableImmediateReadPairs: frozenEvidence.evidenceSummary.unstableImmediateReadPairs
  });
}

export async function verifyVedicRuntimeDependencyLicenseEvidence(workspaceRoot, evidenceInput) {
  const adrSnapshot = await readStableWorkspaceFile(
    workspaceRoot,
    ADR_RELATIVE_PATH,
    MAX_BOUND_ARTIFACT_BYTES,
    {
      invalidCode: "ADR_ENDPOINT_INVALID",
      label: "吠陀独立产品边界 ADR",
      missingCode: "ADR_MISSING"
    }
  );
  return verifyWithAdrSnapshot(adrSnapshot, evidenceInput);
}

export async function readVedicRuntimeDependencyLicenseEvidence(workspaceRoot) {
  const [adrSnapshot, evidenceSnapshot] = await Promise.all([
    readStableWorkspaceFile(workspaceRoot, ADR_RELATIVE_PATH, MAX_BOUND_ARTIFACT_BYTES, {
      invalidCode: "ADR_ENDPOINT_INVALID",
      label: "吠陀独立产品边界 ADR",
      missingCode: "ADR_MISSING"
    }),
    readStableWorkspaceFile(
      workspaceRoot,
      VEDIC_RUNTIME_DEPENDENCY_LICENSE_EVIDENCE_RELATIVE_PATH,
      MAX_EVIDENCE_BYTES,
      {
        invalidCode: "EVIDENCE_ENDPOINT_INVALID",
        label: "吠陀运行时依赖许可 evidence child",
        missingCode: "EVIDENCE_MISSING"
      }
    )
  ]);
  requireAdrIdentity(adrSnapshot);
  const parsed = parseVedicRuntimeDependencyLicenseEvidenceJsonBytes(
    evidenceSnapshot.bytes,
    "吠陀运行时依赖许可 evidence JSON",
    MAX_EVIDENCE_BYTES
  );
  const canonical = canonicalPrettyStringifyVedicRuntimeDependencyLicenseEvidence(parsed);
  if (!Buffer.from(canonical, "utf8").equals(evidenceSnapshot.bytes)) {
    fail("EVIDENCE_MATERIALIZATION_MISMATCH", "evidence JSON 必须是 canonical UTF-8 materialization。 ");
  }
  return (await verifyWithAdrSnapshot(adrSnapshot, parsed)).evidence;
}
