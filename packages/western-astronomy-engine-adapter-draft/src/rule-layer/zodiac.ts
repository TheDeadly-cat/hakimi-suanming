import { z } from "zod";
import { normalizeLongitudeDeg } from "./canonical.ts";

export const WESTERN_ZODIAC_RULES_VERSION = "western-zodiac-rules/0.1-draft" as const;

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

export type ZodiacRequestKind =
  | { kind: "tropical"; ayanamshaDeg: null }
  | { kind: "sidereal"; ayanamshaDeg: number };

export function deriveZodiacPlacement(
  eclipticLongitudeDeg: number,
  zodiac: ZodiacRequestKind
): ZodiacPlacement {
  const ecliptic = normalizeLongitudeDeg(eclipticLongitudeDeg);
  let longitudeDeg: number;
  let ayanamshaDeg: number | null;
  if (zodiac.kind === "tropical") {
    longitudeDeg = ecliptic;
    ayanamshaDeg = null;
  } else {
    if (!Number.isFinite(zodiac.ayanamshaDeg)) {
      throw new Error("sidereal zodiac requires a finite ayanamsha value");
    }
    ayanamshaDeg = normalizeLongitudeDeg(zodiac.ayanamshaDeg);
    longitudeDeg = normalizeLongitudeDeg(ecliptic - ayanamshaDeg);
  }
  const signIndex = Math.floor(longitudeDeg / 30);
  return zodiacPlacementSchema.parse({
    longitudeDeg,
    signIndex,
    signId: ZODIAC_SIGN_IDS[signIndex],
    degreeWithinSign: longitudeDeg - signIndex * 30,
    ayanamshaDeg
  });
}
