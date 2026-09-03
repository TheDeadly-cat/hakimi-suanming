import { z } from "zod";
import {
  WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  WESTERN_ASTROLOGY_SYSTEM_ID,
  WESTERN_BODY_IDS
} from "../contract-bridge.ts";
import { sha256CanonicalJson } from "./canonical.ts";
import {
  WESTERN_HOUSE_RULES_VERSION,
  WESTERN_HOUSE_SYSTEM_IDS,
  assignHousePlacement,
  computeHouseCusps,
  westernHouseCuspsResultSchema,
  type WesternHouseRequest
} from "./houses.ts";
import {
  WESTERN_ASPECT_RULES_VERSION,
  enumerateAspects,
  westernAspectDefinitionSchema,
  westernAspectFactSchema,
  type WesternAspectRuleBody
} from "./aspects.ts";
import {
  WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
  WESTERN_TROPICAL_ZODIAC_IDENTITY,
  WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION,
  WESTERN_ZODIAC_RULES_VERSION,
  deriveZodiacPlacement,
  westernZodiacIdentityDraftSchema,
  zodiacPlacementSchema,
  type WesternZodiacIdentityDraft
} from "./zodiac.ts";

export {
  WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY,
  WESTERN_TROPICAL_ZODIAC_IDENTITY,
  WESTERN_ZODIAC_BOUNDARY_SNAP_TOLERANCE_DEG,
  WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION,
  WESTERN_ZODIAC_RULES_VERSION,
  deriveZodiacPlacement,
  westernZodiacIdentityDraftSchema,
  zodiacPlacementSchema,
  type WesternZodiacIdentityDraft,
  type ZodiacPlacement,
  type ZodiacRequestKind
} from "./zodiac.ts";

export const WESTERN_RULE_LAYER_REQUEST_VERSION =
  "western-astrology-rules-request/0.4-draft" as const;
export const WESTERN_RULE_LAYER_ARTIFACT_VERSION =
  "western-astrology-rules-artifact/0.4-draft" as const;
export const WESTERN_RULE_LAYER_PROJECTION_VERSION =
  "western-astrology-rules-projection/0.4-draft" as const;

const BODY_ORDER = new Map(WESTERN_BODY_IDS.map((bodyId, index) => [bodyId, index]));

const bodyInputSchema = z.strictObject({
  bodyId: z.enum(WESTERN_BODY_IDS),
  eclipticLongitudeDeg: z.number().finite().min(0).lt(360),
  longitudeSpeedDegPerDay: z.number().finite()
});

const housesRequestSchema = z.strictObject({
  systemId: z.enum(WESTERN_HOUSE_SYSTEM_IDS),
  ramcDeg: z.number().finite().min(0).lt(360),
  geographicLatitudeDeg: z.number().finite().min(-90).max(90),
  obliquityTrueOfDateDeg: z.number().finite().min(0).max(90)
}).nullable();

export const westernRuleLayerRequestSchema = z.strictObject({
  protocolVersion: z.literal(WESTERN_RULE_LAYER_REQUEST_VERSION),
  inputLabel: z.string().trim().min(1).max(120),
  bodies: z.array(bodyInputSchema).min(1).max(WESTERN_BODY_IDS.length),
  zodiac: westernZodiacIdentityDraftSchema,
  houses: housesRequestSchema,
  aspects: z.strictObject({
    definitions: z.array(westernAspectDefinitionSchema).min(1).max(50)
  })
}).superRefine((value, context) => {
  let previousIndex = -1;
  value.bodies.forEach((body, index) => {
    const currentIndex = BODY_ORDER.get(body.bodyId) ?? -1;
    if (currentIndex <= previousIndex) {
      context.addIssue({
        code: "custom",
        path: ["bodies", index, "bodyId"],
        message: "bodies must be unique and follow the canonical western body order"
      });
    }
    previousIndex = currentIndex;
  });
  const seenAspectIds = new Set<string>();
  value.aspects.definitions.forEach((definition, index) => {
    if (seenAspectIds.has(definition.aspectId)) {
      context.addIssue({
        code: "custom",
        path: ["aspects", "definitions", index, "aspectId"],
        message: "aspect definitions must be unique"
      });
    }
    seenAspectIds.add(definition.aspectId);
  });
});

export type WesternRuleLayerRequest = z.infer<typeof westernRuleLayerRequestSchema>;

const ruleResultSchema = z.strictObject({
  projectionVersion: z.literal(WESTERN_RULE_LAYER_PROJECTION_VERSION),
  zodiac: westernZodiacIdentityDraftSchema,
  bodies: z.array(z.strictObject({
    bodyId: z.enum(WESTERN_BODY_IDS),
    zodiac: zodiacPlacementSchema,
    houseNumber: z.number().int().min(1).max(12).nullable(),
    retrograde: z.boolean()
  })).min(1).max(WESTERN_BODY_IDS.length),
  houses: westernHouseCuspsResultSchema.nullable(),
  aspects: z.array(westernAspectFactSchema).max(500)
});

const zodiacMethodIdentitySchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal(WESTERN_TROPICAL_ZODIAC_IDENTITY.kind),
    ayanamshaId: z.null(),
    algorithmId: z.literal(WESTERN_TROPICAL_ZODIAC_IDENTITY.algorithmId)
  }),
  z.strictObject({
    kind: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.kind),
    ayanamshaId: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.ayanamshaId),
    algorithmId: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.algorithmId)
  })
]);

type WesternZodiacMethodIdentity = z.infer<typeof zodiacMethodIdentitySchema>;

const ruleExecutionSchema = z.strictObject({
  ruleLayerVersion: z.literal(WESTERN_RULE_LAYER_ARTIFACT_VERSION),
  algorithms: z.strictObject({
    zodiac: z.literal(WESTERN_ZODIAC_RULES_VERSION),
    zodiacBoundarySnap: z.literal(WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION),
    zodiacMethod: zodiacMethodIdentitySchema,
    houses: z.literal(WESTERN_HOUSE_RULES_VERSION).nullable(),
    aspects: z.literal(WESTERN_ASPECT_RULES_VERSION)
  }),
  runtime: z.literal("pure_typescript_no_external_ephemeris")
});

const ruleEvidenceSchema = z.strictObject({
  evidenceStatus: z.literal("rule_layer_engineering"),
  claimScopes: z.array(z.enum([
    "zodiac_placement",
    "house_geometry",
    "aspect_geometry"
  ])).min(1).max(3),
  productionEligible: z.literal(false),
  expertTruthClaimed: z.literal(false),
  note: z.string().trim().min(1).max(1_000)
});

const ruleStrictRelationSchema = z.strictObject({
  contractVersion: z.literal(WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION),
  chartFixtureAccepted: z.literal(false),
  successReceiptIssued: z.literal(false),
  unmetFieldFamilies: z.array(z.string().min(1).max(120)).min(1).max(30)
});

const ruleComputedDigestsSchema = z.strictObject({
  algorithm: z.literal("sha256-canonical-json-v1"),
  requestSha256: z.string().regex(/^[a-f0-9]{64}$/),
  resultSha256: z.string().regex(/^[a-f0-9]{64}$/)
});

const ruleFailedDigestsSchema = z.strictObject({
  algorithm: z.literal("sha256-canonical-json-v1"),
  requestSha256: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  resultSha256: z.null()
});

const commonShape = {
  schemaVersion: z.literal(WESTERN_RULE_LAYER_ARTIFACT_VERSION),
  systemId: z.literal(WESTERN_ASTROLOGY_SYSTEM_ID),
  artifactKind: z.literal("astrology_rules_engineering_artifact"),
  disposition: z.literal("diagnostic_only"),
  evidence: ruleEvidenceSchema,
  strictContractRelation: ruleStrictRelationSchema
} as const;

export const westernRuleLayerArtifactSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    ...commonShape,
    outcome: z.literal("computed"),
    request: westernRuleLayerRequestSchema,
    execution: ruleExecutionSchema,
    result: ruleResultSchema,
    digests: ruleComputedDigestsSchema,
    failure: z.null()
  }),
  z.strictObject({
    ...commonShape,
    outcome: z.literal("failed_closed"),
    request: westernRuleLayerRequestSchema.nullable(),
    execution: z.null(),
    result: z.null(),
    digests: ruleFailedDigestsSchema,
    failure: z.strictObject({
      stage: z.enum(["request_validation", "zodiac", "houses", "aspects", "normalization"]),
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/).max(100),
      message: z.string().trim().min(1).max(500),
      partialResultReturned: z.literal(false)
    })
  })
]).superRefine((value, context) => {
  if (value.outcome === "failed_closed") {
    const expectedRequestSha256 = value.request === null
      ? null
      : sha256CanonicalJson(value.request);
    if (value.digests.requestSha256 !== expectedRequestSha256) {
      context.addIssue({
        code: "custom",
        path: ["digests", "requestSha256"],
        message: "failed artifact request digest must be recomputed from its parsed request"
      });
    }
    return;
  }

  if (!zodiacIdentitiesEqual(value.request.zodiac, value.result.zodiac)) {
    context.addIssue({
      code: "custom",
      path: ["result", "zodiac"],
      message: "computed result must echo the exact requested zodiac identity and supplied offset"
    });
  }
  if (!zodiacMethodIdentitiesEqual(value.execution.algorithms.zodiacMethod, value.request.zodiac)
    || !zodiacMethodIdentitiesEqual(value.execution.algorithms.zodiacMethod, value.result.zodiac)) {
    context.addIssue({
      code: "custom",
      path: ["execution", "algorithms", "zodiacMethod"],
      message: "executed zodiac method must match both request and result identities"
    });
  }

  const expectedHouseExecution = value.request.houses === null
    ? null
    : WESTERN_HOUSE_RULES_VERSION;
  if (value.execution.algorithms.houses !== expectedHouseExecution) {
    context.addIssue({
      code: "custom",
      path: ["execution", "algorithms", "houses"],
      message: "executed house rules identity must match whether houses were requested"
    });
  }
  let expectedHouses: z.infer<typeof westernHouseCuspsResultSchema> | null = null;
  if (value.request.houses === null) {
    if (value.result.houses !== null) {
      context.addIssue({
        code: "custom",
        path: ["result", "houses"],
        message: "computed result cannot contain houses when none were requested"
      });
    }
  } else {
    try {
      expectedHouses = computeHouseCusps(value.request.houses, value.result.zodiac);
      if (value.result.houses === null
        || sha256CanonicalJson(value.result.houses) !== sha256CanonicalJson(expectedHouses)) {
        context.addIssue({
          code: "custom",
          path: ["result", "houses"],
          message: "computed house geometry must match the requested system and bound zodiac identity"
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        path: ["result", "houses"],
        message: "computed artifact cannot claim houses for an unavailable house calculation"
      });
    }
  }
  if (value.result.bodies.length !== value.request.bodies.length) {
    context.addIssue({
      code: "custom",
      path: ["result", "bodies"],
      message: "computed bodies must exactly cover the request bodies"
    });
  }
  value.result.bodies.forEach((body, index) => {
    const requestedBody = value.request.bodies[index];
    if (!requestedBody || requestedBody.bodyId !== body.bodyId) {
      context.addIssue({
        code: "custom",
        path: ["result", "bodies", index, "bodyId"],
        message: "computed bodies must preserve request identity and canonical order"
      });
      return;
    }
    const expectedPlacement = deriveZodiacPlacement(
      requestedBody.eclipticLongitudeDeg,
      value.result.zodiac
    );
    if (!zodiacPlacementsEqual(body.zodiac, expectedPlacement)) {
      context.addIssue({
        code: "custom",
        path: ["result", "bodies", index, "zodiac"],
        message: "computed zodiac placement must match the bound result zodiac transform"
      });
    }
    const expectedHouseNumber = expectedHouses === null
      ? null
      : assignHousePlacement(requestedBody.eclipticLongitudeDeg, expectedHouses.cusps);
    if (body.houseNumber !== expectedHouseNumber) {
      context.addIssue({
        code: "custom",
        path: ["result", "bodies", index, "houseNumber"],
        message: "computed body house must match the independently reconstructed raw cusp spans"
      });
    }
  });

  if (value.digests.requestSha256 !== sha256CanonicalJson(value.request)) {
    context.addIssue({
      code: "custom",
      path: ["digests", "requestSha256"],
      message: "computed artifact request digest does not match its parsed request"
    });
  }
  if (value.digests.resultSha256 !== sha256CanonicalJson(value.result)) {
    context.addIssue({
      code: "custom",
      path: ["digests", "resultSha256"],
      message: "computed artifact result digest does not match its parsed result"
    });
  }
});

export type WesternRuleLayerArtifact = z.infer<typeof westernRuleLayerArtifactSchema>;
export type WesternRuleLayerComputedArtifact = Extract<
  WesternRuleLayerArtifact,
  { outcome: "computed" }
>;

function zodiacIdentitiesEqual(
  left: WesternZodiacIdentityDraft,
  right: WesternZodiacIdentityDraft
): boolean {
  return left.kind === right.kind
    && left.ayanamshaId === right.ayanamshaId
    && left.algorithmId === right.algorithmId
    && Object.is(left.ayanamshaDeg, right.ayanamshaDeg);
}

function zodiacMethodIdentitiesEqual(
  method: WesternZodiacMethodIdentity,
  zodiac: WesternZodiacIdentityDraft
): boolean {
  return method.kind === zodiac.kind
    && method.ayanamshaId === zodiac.ayanamshaId
    && method.algorithmId === zodiac.algorithmId;
}

function zodiacMethodIdentityFrom(
  zodiac: WesternZodiacIdentityDraft
): WesternZodiacMethodIdentity {
  return zodiacMethodIdentitySchema.parse({
    kind: zodiac.kind,
    ayanamshaId: zodiac.ayanamshaId,
    algorithmId: zodiac.algorithmId
  });
}

function zodiacPlacementsEqual(
  left: z.infer<typeof zodiacPlacementSchema>,
  right: z.infer<typeof zodiacPlacementSchema>
): boolean {
  return left.signIndex === right.signIndex
    && left.signId === right.signId
    && Object.is(left.longitudeDeg, right.longitudeDeg)
    && Object.is(left.degreeWithinSign, right.degreeWithinSign)
    && Object.is(left.ayanamshaDeg, right.ayanamshaDeg);
}

export function verifyWesternRuleLayerComputedArtifact(
  input: unknown
): WesternRuleLayerComputedArtifact {
  const artifact = westernRuleLayerArtifactSchema.parse(input);
  if (artifact.outcome !== "computed") {
    throw new Error("expected a computed Western rule-layer artifact");
  }
  return artifact;
}

const RULE_EVIDENCE = ruleEvidenceSchema.parse({
  evidenceStatus: "rule_layer_engineering",
  claimScopes: ["zodiac_placement", "house_geometry", "aspect_geometry"],
  productionEligible: false,
  expertTruthClaimed: false,
  note: "Pure rule-layer geometry over caller-supplied ecliptic positions; no ephemeris truth, chart acceptance, or expert interpretation."
});

const RULE_STRICT_RELATION = ruleStrictRelationSchema.parse({
  contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  chartFixtureAccepted: false,
  successReceiptIssued: false,
  unmetFieldFamilies: [
    "civil_time_tzdb_dst_resolution",
    "icrf_frame_identity",
    "target_center_artifact_inventory",
    "leap_second_eop_time_provenance",
    "provider_options_flags_and_fallback",
    "instantaneous_speed_contract",
    "official_ephemeris_differential",
    "western_calculation_receipt"
  ]
});

function failedEnvelope(
  request: WesternRuleLayerRequest | null,
  stage: "request_validation" | "zodiac" | "houses" | "aspects" | "normalization",
  code: string,
  message: string
): WesternRuleLayerArtifact {
  return westernRuleLayerArtifactSchema.parse({
    schemaVersion: WESTERN_RULE_LAYER_ARTIFACT_VERSION,
    systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
    artifactKind: "astrology_rules_engineering_artifact",
    disposition: "diagnostic_only",
    outcome: "failed_closed",
    request,
    execution: null,
    result: null,
    failure: {
      stage,
      code,
      message: message.slice(0, 500) || "rule layer failed closed",
      partialResultReturned: false
    },
    evidence: RULE_EVIDENCE,
    strictContractRelation: RULE_STRICT_RELATION,
    digests: {
      algorithm: "sha256-canonical-json-v1",
      requestSha256: request ? sha256CanonicalJson(request) : null,
      resultSha256: null
    }
  });
}

export function runWesternRuleLayer(input: unknown): WesternRuleLayerArtifact {
  const parsed = westernRuleLayerRequestSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return failedEnvelope(
      null,
      "request_validation",
      "INVALID_REQUEST",
      `${path}${issue?.message ?? "rule layer request validation failed"}`
    );
  }
  const request = parsed.data;

  try {
    let houses: z.infer<typeof westernHouseCuspsResultSchema> | null = null;
    if (request.houses !== null) {
      houses = computeHouseCusps(request.houses as WesternHouseRequest, request.zodiac);
    }

    const bodyResults = request.bodies.map((body) => {
      const zodiac = deriveZodiacPlacement(
        body.eclipticLongitudeDeg,
        request.zodiac
      );
      return {
        bodyId: body.bodyId,
        zodiac,
        houseNumber: houses === null
          ? null
          : assignHousePlacement(body.eclipticLongitudeDeg, houses.cusps),
        retrograde: body.longitudeSpeedDegPerDay < 0
      };
    });

    const aspectBodies: WesternAspectRuleBody[] = request.bodies.map((body) => ({
      bodyId: body.bodyId,
      eclipticLongitudeDeg: body.eclipticLongitudeDeg,
      longitudeSpeedDegPerDay: body.longitudeSpeedDegPerDay
    }));
    const aspects = aspectBodies.length >= 2
      ? enumerateAspects(aspectBodies, request.aspects.definitions)
      : [];

    const result = ruleResultSchema.parse({
      projectionVersion: WESTERN_RULE_LAYER_PROJECTION_VERSION,
      zodiac: request.zodiac,
      bodies: bodyResults,
      houses,
      aspects
    });

    return westernRuleLayerArtifactSchema.parse({
      schemaVersion: WESTERN_RULE_LAYER_ARTIFACT_VERSION,
      systemId: WESTERN_ASTROLOGY_SYSTEM_ID,
      artifactKind: "astrology_rules_engineering_artifact",
      disposition: "diagnostic_only",
      outcome: "computed",
      request,
      execution: {
        ruleLayerVersion: WESTERN_RULE_LAYER_ARTIFACT_VERSION,
        algorithms: {
          zodiac: WESTERN_ZODIAC_RULES_VERSION,
          zodiacBoundarySnap: WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION,
          zodiacMethod: zodiacMethodIdentityFrom(request.zodiac),
          houses: request.houses === null ? null : WESTERN_HOUSE_RULES_VERSION,
          aspects: WESTERN_ASPECT_RULES_VERSION
        },
        runtime: "pure_typescript_no_external_ephemeris"
      },
      result,
      failure: null,
      evidence: RULE_EVIDENCE,
      strictContractRelation: RULE_STRICT_RELATION,
      digests: {
        algorithm: "sha256-canonical-json-v1",
        requestSha256: sha256CanonicalJson(request),
        resultSha256: sha256CanonicalJson(result)
      }
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const stage = message.includes("house") || message.includes("ascendant")
      || message.includes("cusp") || message.includes("Placidus")
      ? "houses"
      : message.includes("aspect") ? "aspects" : "zodiac";
    const code = stage === "houses"
      ? (message.includes("polar") || message.includes("latitude")
        ? "UNSUPPORTED_LATITUDE"
        : "HOUSE_ALGORITHM_FAILED")
      : stage === "aspects" ? "ASPECT_RULES_FAILED" : "ZODIAC_RULES_FAILED";
    return failedEnvelope(request, stage, code, message);
  }
}
