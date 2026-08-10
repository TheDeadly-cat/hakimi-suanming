import { z } from "zod";
import { deg, nearlyEqual, normalizeLongitudeDeg, rad } from "./canonical.ts";

export const WESTERN_HOUSE_RULES_VERSION = "western-house-rules/0.1-draft" as const;

export const WESTERN_HOUSE_SYSTEM_IDS = Object.freeze([
  "whole_sign_v1",
  "equal_asc_v1",
  "porphyry_v1",
  "placidus_v1"
] as const);

const POLAR_LATITUDE_LIMIT_DEG = 89.999;
const PLACIDUS_LATITUDE_LIMIT_DEG = 60;
const HORIZON_ALTITUDE_TOLERANCE_RAD = 1e-5;

export const westernHouseCuspsResultSchema = z.strictObject({
  status: z.literal("computed"),
  systemId: z.enum(WESTERN_HOUSE_SYSTEM_IDS),
  cusps: z.array(z.strictObject({
    houseNumber: z.number().int().min(1).max(12),
    longitudeDeg: z.number().finite().min(0).lt(360)
  })).length(12),
  angles: z.strictObject({
    ascendantDeg: z.number().finite().min(0).lt(360),
    midheavenDeg: z.number().finite().min(0).lt(360),
    descendantDeg: z.number().finite().min(0).lt(360),
    imumCoeliDeg: z.number().finite().min(0).lt(360),
    vertexDeg: z.null()
  }),
  armcDeg: z.number().finite().min(0).lt(360),
  algorithmId: z.string().min(1).max(120),
  fallbackUsed: z.literal(false)
});

export type WesternHouseCuspsResult = z.infer<typeof westernHouseCuspsResultSchema>;

export type WesternHouseRequest = {
  systemId: (typeof WESTERN_HOUSE_SYSTEM_IDS)[number];
  ramcDeg: number;
  geographicLatitudeDeg: number;
  obliquityTrueOfDateDeg: number;
};

function eclipticFromRightAscension(rightAscensionDeg: number, obliquityDeg: number): number {
  const ra = rad(rightAscensionDeg);
  const eps = rad(obliquityDeg);
  return normalizeLongitudeDeg(deg(Math.atan2(Math.sin(ra) * Math.cos(eps), Math.cos(ra))));
}

function rightAscensionAndDeclination(eclipticLongitudeDeg: number, obliquityDeg: number): {
  rightAscensionDeg: number;
  declinationDeg: number;
} {
  const lambda = rad(eclipticLongitudeDeg);
  const eps = rad(obliquityDeg);
  const declination = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const rightAscension = normalizeLongitudeDeg(deg(
    Math.atan2(Math.sin(lambda) * Math.cos(eps), Math.cos(lambda))
  ));
  return { rightAscensionDeg: rightAscension, declinationDeg: deg(declination) };
}

function computeAngles(
  ramcDeg: number,
  geographicLatitudeDeg: number,
  obliquityTrueOfDateDeg: number
): {
  ascendantDeg: number;
  midheavenDeg: number;
  descendantDeg: number;
  imumCoeliDeg: number;
} {
  if (!Number.isFinite(ramcDeg)
    || !Number.isFinite(geographicLatitudeDeg)
    || !Number.isFinite(obliquityTrueOfDateDeg)) {
    throw new Error("house angles require finite ramc, latitude and obliquity");
  }
  if (Math.abs(geographicLatitudeDeg) >= POLAR_LATITUDE_LIMIT_DEG) {
    throw new Error("house angles are undefined at or near the polar circles");
  }
  const ramc = rad(normalizeLongitudeDeg(ramcDeg));
  const lat = rad(geographicLatitudeDeg);
  const eps = rad(obliquityTrueOfDateDeg);
  const midheaven = eclipticFromRightAscension(normalizeLongitudeDeg(ramcDeg), obliquityTrueOfDateDeg);
  const ascendant = normalizeLongitudeDeg(deg(Math.atan2(
    Math.cos(ramc),
    -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))
  )));
  const { rightAscensionDeg, declinationDeg } = rightAscensionAndDeclination(
    ascendant,
    obliquityTrueOfDateDeg
  );
  let hourAngleDeg = normalizeLongitudeDeg(normalizeLongitudeDeg(ramcDeg) - rightAscensionDeg);
  if (hourAngleDeg > 180) hourAngleDeg -= 360;
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(rad(declinationDeg))
    + Math.cos(lat) * Math.cos(rad(declinationDeg)) * Math.cos(rad(hourAngleDeg))
  );
  if (!nearlyEqual(altitude, 0, HORIZON_ALTITUDE_TOLERANCE_RAD)) {
    throw new Error("ascendant is not on the observer horizon; house system undefined");
  }
  if (hourAngleDeg >= 0) {
    throw new Error("ascendant resolved to the setting branch; house system undefined");
  }
  return {
    ascendantDeg: ascendant,
    midheavenDeg: midheaven,
    descendantDeg: normalizeLongitudeDeg(ascendant + 180),
    imumCoeliDeg: normalizeLongitudeDeg(midheaven + 180)
  };
}

function sinDeg(valueDeg: number): number {
  return Math.sin(rad(valueDeg));
}

function cosDeg(valueDeg: number): number {
  return Math.cos(rad(valueDeg));
}

function tanDeg(valueDeg: number): number {
  return Math.tan(rad(valueDeg));
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/**
 * Placidus cusps, ported from the Unlicense reference implementation in
 * Phaen/CircularNatalHoroscopeJS (src/utilities/astrology.js), which follows
 * Michael P. Munkasey, "An Astrological House Formulary", page 18, with the
 * documented trigonometric fix that avoids arcsin of a value above 1.
 *
 * The port is a faithful reimplementation of the reference algorithm and is
 * cross-checked against the reference source at build/test time; it is still
 * a rule-layer draft and has not been verified against Swiss Ephemeris or any
 * licensed ephemeris implementation.
 */
function calculatePlacidusCusps(
  ramcDeg: number,
  midheavenDeg: number,
  ascendantDeg: number,
  geographicLatitudeDeg: number,
  obliquityTrueOfDateDeg: number
): number[] {
  if (Math.abs(geographicLatitudeDeg) >= PLACIDUS_LATITUDE_LIMIT_DEG) {
    throw new Error("Placidus is undefined beyond 60 degrees latitude; refusing to guess polar cusps");
  }
  const cuspInterval = (houseNumber: number): number => {
    switch (houseNumber) {
      case 2: return ramcDeg + 120;
      case 3: return ramcDeg + 150;
      case 11: return ramcDeg + 30;
      case 12: return ramcDeg + 60;
      default: throw new Error("Placidus intermediate cusp requested outside 2, 3, 11, 12");
    }
  };
  const semiArcRatio = (houseNumber: number): number => {
    switch (houseNumber) {
      case 2: return 2 / 3;
      case 3: return 1 / 3;
      case 11: return 1 / 3;
      case 12: return 2 / 3;
      default: throw new Error("Placidus semi-arc ratio requested outside 2, 3, 11, 12");
    }
  };
  const calculatedCusp = (houseNumber: number): number => {
    const interval = cuspInterval(houseNumber);
    const ratio = semiArcRatio(houseNumber);
    let cuspValue = Math.asin(sinDeg(obliquityTrueOfDateDeg) * sinDeg(interval));
    let previousCuspValue = 0;
    let guard = 0;
    while (Math.abs(cuspValue - previousCuspValue) > 0.01 && guard < 100) {
      const m = Math.atan(ratio * (tanDeg(geographicLatitudeDeg) / cosDeg(interval)));
      const r = Math.atan(
        (tanDeg(interval) * Math.cos(m)) / Math.cos(m + rad(obliquityTrueOfDateDeg))
      );
      previousCuspValue = cuspValue;
      cuspValue = r;
      guard += 1;
    }
    if (guard >= 100 && Math.abs(cuspValue - previousCuspValue) > 0.01) {
      throw new Error("Placidus cusp iteration did not converge; refusing to return a guessed cusp");
    }
    return deg(cuspValue) + 180;
  };
  const shouldMod180 = (previousCusp: number, currentCusp: number): boolean => {
    if (currentCusp < previousCusp) {
      if (Math.abs(currentCusp - previousCusp) >= 180) return false;
      return true;
    }
    if (previousCusp < currentCusp) {
      if (currentCusp - previousCusp < 180) return false;
      return true;
    }
    return false;
  };
  const c1 = ascendantDeg;
  const c2 = modulo(calculatedCusp(2), 360);
  const c3 = modulo(calculatedCusp(3), 360);
  const c4 = modulo(midheavenDeg + 180, 360);
  const c10 = midheavenDeg;
  const c11 = calculatedCusp(11);
  const c12 = calculatedCusp(12);
  const c5 = modulo(c11 + 180, 360);
  const c6 = modulo(c12 + 180, 360);
  const c7 = modulo(ascendantDeg + 180, 360);
  const c8 = modulo(c2 + 180, 360);
  const c9 = modulo(c3 + 180, 360);
  return [
    c1,
    shouldMod180(c1, c2) ? modulo(c2 + 180, 360) : c2,
    shouldMod180(c1, c3) ? modulo(c3 + 180, 360) : c3,
    c4,
    shouldMod180(c4, c5) ? modulo(c5 + 180, 360) : c5,
    shouldMod180(c4, c6) ? modulo(c6 + 180, 360) : c6,
    c7,
    shouldMod180(c7, c8) ? modulo(c8 + 180, 360) : c8,
    shouldMod180(c7, c9) ? modulo(c9 + 180, 360) : c9,
    c10,
    shouldMod180(c10, c11) ? modulo(c11 + 180, 360) : c11,
    shouldMod180(c10, c12) ? modulo(c12 + 180, 360) : c12
  ].map((value) => normalizeLongitudeDeg(value));
}

const ALGORITHM_IDS = Object.freeze({
  whole_sign_v1: "western-house-whole-sign/0.1-draft",
  equal_asc_v1: "western-house-equal-asc/0.1-draft",
  porphyry_v1: "western-house-porphyry/0.1-draft",
  placidus_v1: "western-house-placidus/0.1-draft"
} as const);

export function computeHouseCusps(input: WesternHouseRequest): WesternHouseCuspsResult {
  const ramc = normalizeLongitudeDeg(input.ramcDeg);
  const angles = computeAngles(ramc, input.geographicLatitudeDeg, input.obliquityTrueOfDateDeg);
  const cuspLongitudes: number[] = [];

  if (input.systemId === "whole_sign_v1") {
    const houseZeroSign = Math.floor(angles.ascendantDeg / 30);
    for (let houseNumber = 1; houseNumber <= 12; houseNumber += 1) {
      cuspLongitudes.push(((houseZeroSign + houseNumber - 1) % 12) * 30);
    }
  } else if (input.systemId === "equal_asc_v1") {
    for (let houseNumber = 1; houseNumber <= 12; houseNumber += 1) {
      cuspLongitudes.push(normalizeLongitudeDeg(angles.ascendantDeg + (houseNumber - 1) * 30));
    }
  } else if (input.systemId === "porphyry_v1") {
    const arcAscIc = normalizeLongitudeDeg(angles.imumCoeliDeg - angles.ascendantDeg);
    const arcIcDsc = normalizeLongitudeDeg(angles.descendantDeg - angles.imumCoeliDeg);
    const arcDscMc = normalizeLongitudeDeg(angles.midheavenDeg - angles.descendantDeg);
    const arcMcAsc = normalizeLongitudeDeg(angles.ascendantDeg - angles.midheavenDeg);
    cuspLongitudes[1 - 1] = angles.ascendantDeg;
    cuspLongitudes[2 - 1] = normalizeLongitudeDeg(angles.ascendantDeg + arcAscIc / 3);
    cuspLongitudes[3 - 1] = normalizeLongitudeDeg(angles.ascendantDeg + (2 * arcAscIc) / 3);
    cuspLongitudes[4 - 1] = angles.imumCoeliDeg;
    cuspLongitudes[5 - 1] = normalizeLongitudeDeg(angles.imumCoeliDeg + arcIcDsc / 3);
    cuspLongitudes[6 - 1] = normalizeLongitudeDeg(angles.imumCoeliDeg + (2 * arcIcDsc) / 3);
    cuspLongitudes[7 - 1] = angles.descendantDeg;
    cuspLongitudes[8 - 1] = normalizeLongitudeDeg(angles.descendantDeg + arcDscMc / 3);
    cuspLongitudes[9 - 1] = normalizeLongitudeDeg(angles.descendantDeg + (2 * arcDscMc) / 3);
    cuspLongitudes[10 - 1] = angles.midheavenDeg;
    cuspLongitudes[11 - 1] = normalizeLongitudeDeg(angles.midheavenDeg + arcMcAsc / 3);
    cuspLongitudes[12 - 1] = normalizeLongitudeDeg(angles.midheavenDeg + (2 * arcMcAsc) / 3);
  } else {
    cuspLongitudes.push(...calculatePlacidusCusps(
      ramc,
      angles.midheavenDeg,
      angles.ascendantDeg,
      input.geographicLatitudeDeg,
      input.obliquityTrueOfDateDeg
    ));
  }

  return westernHouseCuspsResultSchema.parse({
    status: "computed",
    systemId: input.systemId,
    cusps: cuspLongitudes.map((longitudeDeg, index) => ({
      houseNumber: index + 1,
      longitudeDeg
    })),
    angles: {
      ascendantDeg: angles.ascendantDeg,
      midheavenDeg: angles.midheavenDeg,
      descendantDeg: angles.descendantDeg,
      imumCoeliDeg: angles.imumCoeliDeg,
      vertexDeg: null
    },
    armcDeg: ramc,
    algorithmId: ALGORITHM_IDS[input.systemId],
    fallbackUsed: false
  });
}

export function assignHousePlacement(
  longitudeDeg: number,
  cusps: readonly { houseNumber: number; longitudeDeg: number }[]
): number {
  if (cusps.length !== 12) {
    throw new Error("house placement requires exactly twelve cusps");
  }
  const longitude = normalizeLongitudeDeg(longitudeDeg);
  const ordered = [...cusps].sort((left, right) => left.houseNumber - right.houseNumber);
  for (let index = 0; index < 12; index += 1) {
    const start = ordered[index]!.longitudeDeg;
    const end = index === 11
      ? ordered[0]!.longitudeDeg + 360
      : ordered[index + 1]!.longitudeDeg;
    const candidate = index === 11 && longitude < start ? longitude + 360 : longitude;
    if (candidate >= start && candidate < end) {
      return ordered[index]!.houseNumber;
    }
  }
  throw new Error("house placement could not locate the longitude in the twelve cusps");
}
