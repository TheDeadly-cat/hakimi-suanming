import { z } from "zod";
import { normalizeLongitudeDeg } from "./canonical.ts";

export const WESTERN_ZODIAC_RULES_VERSION = "western-zodiac-rules/0.3-draft" as const;
export const WESTERN_ZODIAC_BOUNDARY_SNAP_VERSION =
  "western-zodiac-boundary-snap/0.1-draft" as const;
export const WESTERN_ZODIAC_BOUNDARY_SNAP_TOLERANCE_DEG = 1e-10 as const;

export const WESTERN_TROPICAL_ZODIAC_IDENTITY = Object.freeze({
  kind: "tropical",
  ayanamshaId: null,
  algorithmId: "tropical_identity_v1",
  ayanamshaDeg: null
} as const);

export const WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY = Object.freeze({
  kind: "sidereal",
  ayanamshaId: "manual_offset_unverified",
  algorithmId: "subtract_supplied_offset_v1"
} as const);

export const westernZodiacIdentityDraftSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal(WESTERN_TROPICAL_ZODIAC_IDENTITY.kind),
    ayanamshaId: z.null(),
    algorithmId: z.literal(WESTERN_TROPICAL_ZODIAC_IDENTITY.algorithmId),
    ayanamshaDeg: z.null()
  }),
  z.strictObject({
    kind: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.kind),
    ayanamshaId: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.ayanamshaId),
    algorithmId: z.literal(WESTERN_SIDEREAL_MANUAL_ZODIAC_IDENTITY.algorithmId),
    ayanamshaDeg: z.number().finite().min(0).lt(360)
  })
]);

export type WesternZodiacIdentityDraft = z.infer<typeof westernZodiacIdentityDraftSchema>;

export const ZODIAC_SIGN_IDS = Object.freeze([
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces"
] as const);

export const zodiacPlacementSchema = z.strictObject({
  longitudeDeg: z.number().finite().min(0).lt(360),
  signIndex: z.number().int().min(0).max(11),
  signId: z.enum(ZODIAC_SIGN_IDS),
  degreeWithinSign: z.number().finite().min(0).lt(30),
  ayanamshaDeg: z.number().finite().min(0).lt(360).nullable()
});

export type ZodiacPlacement = z.infer<typeof zodiacPlacementSchema>;

export type ZodiacRequestKind = WesternZodiacIdentityDraft;

function snapZodiacBoundaryDeg(longitudeDeg: number): number {
  const normalized = normalizeLongitudeDeg(longitudeDeg);
  const nearestBoundaryDeg = Math.round(normalized / 30) * 30;
  if (Math.abs(normalized - nearestBoundaryDeg)
    <= WESTERN_ZODIAC_BOUNDARY_SNAP_TOLERANCE_DEG) {
    return normalizeLongitudeDeg(nearestBoundaryDeg);
  }
  return normalized;
}

export function deriveZodiacPlacement(
  eclipticLongitudeDeg: number,
  zodiac: ZodiacRequestKind
): ZodiacPlacement {
  if (!Number.isFinite(eclipticLongitudeDeg)) {
    throw new Error("zodiac placement requires a finite ecliptic longitude");
  }
  const identity = westernZodiacIdentityDraftSchema.parse(zodiac);
  const ecliptic = normalizeLongitudeDeg(eclipticLongitudeDeg);
  let longitudeDeg: number;
  let ayanamshaDeg: number | null;
  if (identity.kind === WESTERN_TROPICAL_ZODIAC_IDENTITY.kind) {
    longitudeDeg = ecliptic;
    ayanamshaDeg = null;
  } else {
    ayanamshaDeg = identity.ayanamshaDeg;
    longitudeDeg = normalizeLongitudeDeg(ecliptic - ayanamshaDeg);
  }
  longitudeDeg = snapZodiacBoundaryDeg(longitudeDeg);
  const signIndex = Math.floor(longitudeDeg / 30);
  return zodiacPlacementSchema.parse({
    longitudeDeg,
    signIndex,
    signId: ZODIAC_SIGN_IDS[signIndex],
    degreeWithinSign: longitudeDeg - signIndex * 30,
    ayanamshaDeg
  });
}
