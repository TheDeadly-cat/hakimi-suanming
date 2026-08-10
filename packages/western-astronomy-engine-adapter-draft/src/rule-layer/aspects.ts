import { z } from "zod";
import { WESTERN_BODY_IDS } from "../contract-bridge.ts";
import { nearlyEqual, signedSeparationDeg } from "./canonical.ts";

export const WESTERN_ASPECT_RULES_VERSION = "western-aspect-rules/0.1-draft" as const;

const BODY_ORDER = new Map(WESTERN_BODY_IDS.map((bodyId, index) => [bodyId, index]));

export const westernAspectDefinitionSchema = z.strictObject({
  aspectId: z.string().regex(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/).max(120),
  exactAngleDeg: z.number().finite().min(0).max(180),
  maxOrbDeg: z.number().finite().min(0).max(30)
});

export const westernAspectFactSchema = z.strictObject({
  bodyA: z.enum(WESTERN_BODY_IDS),
  bodyB: z.enum(WESTERN_BODY_IDS),
  aspectId: z.string().min(1).max(120),
  exactAngleDeg: z.number().finite().min(0).max(180),
  separationDeg: z.number().finite().min(0).max(180),
  directedOrbDeg: z.number().finite().min(-180).max(180),
  orbDeg: z.number().finite().min(0).max(180),
  maxOrbDeg: z.number().finite().min(0).max(30),
  motion: z.enum(["exact", "applying", "separating", "indeterminate"])
});

export type WesternAspectDefinition = z.infer<typeof westernAspectDefinitionSchema>;
export type WesternAspectFact = z.infer<typeof westernAspectFactSchema>;

export type WesternAspectRuleBody = {
  bodyId: (typeof WESTERN_BODY_IDS)[number];
  eclipticLongitudeDeg: number;
  longitudeSpeedDegPerDay: number;
};

export function enumerateAspects(
  bodies: readonly WesternAspectRuleBody[],
  definitions: readonly WesternAspectDefinition[]
): WesternAspectFact[] {
  if (bodies.length < 2 || bodies.length > WESTERN_BODY_IDS.length) {
    throw new Error("aspect enumeration requires between two and ten canonical bodies");
  }
  let previousIndex = -1;
  bodies.forEach((body, index) => {
    const currentIndex = BODY_ORDER.get(body.bodyId) ?? -1;
    if (currentIndex <= previousIndex) {
      throw new Error(`bodyIds must be unique and follow the canonical western body order (at ${index})`);
    }
    previousIndex = currentIndex;
  });

  const facts: WesternAspectFact[] = [];
  for (let left = 0; left < bodies.length; left += 1) {
    for (let right = left + 1; right < bodies.length; right += 1) {
      const bodyA = bodies[left]!;
      const bodyB = bodies[right]!;
      const signedSeparation = signedSeparationDeg(
        bodyA.eclipticLongitudeDeg,
        bodyB.eclipticLongitudeDeg
      );
      const separation = Math.abs(signedSeparation);
      const relativeSpeed = bodyB.longitudeSpeedDegPerDay - bodyA.longitudeSpeedDegPerDay;
      for (const definition of definitions) {
        const directedOrb = separation - definition.exactAngleDeg;
        const orb = Math.abs(directedOrb);
        if (orb > definition.maxOrbDeg) continue;

        let motion: "exact" | "applying" | "separating" | "indeterminate";
        if (nearlyEqual(orb, 0)) {
          motion = "exact";
        } else if (nearlyEqual(separation, 0) || nearlyEqual(separation, 180)) {
          motion = "indeterminate";
        } else {
          const separationRate = Math.sign(signedSeparation) * relativeSpeed;
          const orbRate = Math.sign(directedOrb) * separationRate;
          motion = nearlyEqual(orbRate, 0)
            ? "indeterminate"
            : orbRate < 0 ? "applying" : "separating";
        }

        facts.push(westernAspectFactSchema.parse({
          bodyA: bodyA.bodyId,
          bodyB: bodyB.bodyId,
          aspectId: definition.aspectId,
          exactAngleDeg: definition.exactAngleDeg,
          separationDeg: separation,
          directedOrbDeg: directedOrb,
          orbDeg: orb,
          maxOrbDeg: definition.maxOrbDeg,
          motion
        }));
      }
    }
  }

  facts.sort((left, right) => {
    const pairOrder = (BODY_ORDER.get(left.bodyA) ?? 0) - (BODY_ORDER.get(right.bodyA) ?? 0)
      || (BODY_ORDER.get(left.bodyB) ?? 0) - (BODY_ORDER.get(right.bodyB) ?? 0);
    return pairOrder || left.aspectId.localeCompare(right.aspectId);
  });
  return facts;
}
