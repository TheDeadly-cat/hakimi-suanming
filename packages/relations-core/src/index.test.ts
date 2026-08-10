import { describe, expect, it } from "vitest";
import type { ChartFacts } from "@hakimi/contracts";
import {
  DEFAULT_RELATION_RULE_PROFILE,
  HISTORICAL_RELATIONS_EXECUTOR_REGISTRY,
  RELATIONS_CORE_ENGINE,
  RELATIONS_EXECUTOR_DESCRIPTOR,
  RELATION_TYPES,
  RelationsCoreError,
  calculatePillarRelations,
  lookupHistoricalRelationsExecutor,
  requireHistoricalRelationsExecutor,
  type FourPillarsInput,
  type RelationRuleProfile,
  type RelationType
} from "./index";

function pillars(year: string, month: string, day: string, hour: string): FourPillarsInput {
  return { year, month, day, hour };
}

function factsOf(input: FourPillarsInput, type: RelationType) {
  return calculatePillarRelations(input).facts.filter((fact) => fact.relationType === type);
}

function mutableProfile(): RelationRuleProfile {
  return structuredClone(DEFAULT_RELATION_RULE_PROFILE) as RelationRuleProfile;
}

function expectCode(action: () => unknown, code: RelationsCoreError["code"]): void {
  try {
    action();
    throw new Error("expected relations-core to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(RelationsCoreError);
    expect((error as RelationsCoreError).code).toBe(code);
  }
}

describe("calculatePillarRelations upstream-backed binary facts", () => {
  it("finds stem five-combination and the explicit four-pair stem clash rule", () => {
    const result = calculatePillarRelations(pillars("甲子", "己巳", "庚午", "丁卯"));
    const combination = result.facts.find((fact) => fact.relationType === "stem_five_combination");
    const clash = result.facts.find((fact) => fact.relationType === "stem_clash");

    expect(combination).toMatchObject({
      completeness: "binary",
      requiredMembers: ["甲", "己"],
      verificationStatus: "upstream_public_constant_audited"
    });
    expect(combination?.participants.map((item) => [item.position, item.ganZhi, item.value])).toEqual([
      ["year", "甲子", "甲"],
      ["month", "己巳", "己"]
    ]);
    expect(clash).toMatchObject({
      requiredMembers: ["甲", "庚"],
      tableVersion: "lunar-typescript@1.8.6:LunarUtil.CHONG_GAN_4"
    });
  });

  it("finds branch six-combination and six-clash from audited public constants", () => {
    const input = pillars("甲子", "乙丑", "庚午", "癸酉");
    expect(factsOf(input, "branch_six_combination").some((fact) => fact.requiredMembers.join("") === "子丑")).toBe(true);
    expect(factsOf(input, "branch_six_clash").some((fact) => fact.requiredMembers.join("") === "子午")).toBe(true);
  });
});

describe("calculatePillarRelations embedded set facts", () => {
  it("emits one complete three-harmony fact even when one member occurs twice", () => {
    const matches = factsOf(
      pillars("壬申", "甲子", "戊辰", "丙子"),
      "branch_three_harmony"
    ).filter((fact) => fact.ruleId === "three-harmony:shen-zi-chen");

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      completeness: "complete_set",
      presentMembers: ["申", "子", "辰"],
      missingMembers: [],
      verificationStatus: "embedded_table_pending_consultant_review"
    });
    expect(matches[0].participants.map((item) => item.position)).toEqual(["year", "month", "day", "hour"]);
  });

  it("marks two-of-three membership incomplete and names the missing member", () => {
    const match = factsOf(
      pillars("壬申", "甲子", "丙子", "戊子"),
      "branch_three_harmony"
    ).find((fact) => fact.ruleId === "three-harmony:shen-zi-chen");

    expect(match).toMatchObject({
      completeness: "incomplete_set",
      presentMembers: ["申", "子"],
      missingMembers: ["辰"]
    });

    const profile = mutableProfile();
    profile.incompleteSetPolicy = "complete_only";
    expect(
      calculatePillarRelations(pillars("壬申", "甲子", "丙子", "戊子"), profile).facts.some(
        (fact) => fact.id === match?.id
      )
    ).toBe(false);
  });

  it("detects complete three-meeting and complete three-punishment sets", () => {
    const meeting = factsOf(pillars("乙亥", "甲子", "乙丑", "丙寅"), "branch_three_meeting");
    const punishment = factsOf(pillars("丙寅", "己巳", "壬申", "甲子"), "branch_three_punishment");

    expect(meeting).toContainEqual(expect.objectContaining({
      ruleId: "three-meeting:hai-zi-chou",
      completeness: "complete_set"
    }));
    expect(punishment).toContainEqual(expect.objectContaining({
      ruleId: "three-punishment:yin-si-shen",
      completeness: "complete_set"
    }));
  });

  it("keeps Zi-Mao binary punishment separate from duplicate-branch self-punishment", () => {
    const binary = factsOf(pillars("甲子", "乙卯", "戊辰", "庚午"), "branch_binary_punishment");
    const self = factsOf(pillars("戊辰", "庚辰", "壬午", "甲申"), "branch_self_punishment");

    expect(binary).toContainEqual(expect.objectContaining({
      ruleId: "binary-punishment:zi-mao",
      completeness: "binary"
    }));
    expect(self).toHaveLength(1);
    expect(self[0]).toMatchObject({
      ruleId: "self-punishment:辰",
      requiredMembers: ["辰", "辰"]
    });
    expect(self[0].participants.map((item) => item.position)).toEqual(["year", "month"]);
  });

  it("detects six-harm and six-break while exposing pending-review metadata", () => {
    const input = pillars("甲子", "乙丑", "庚午", "癸酉");
    const harm = factsOf(input, "branch_six_harm");
    const branchBreak = factsOf(input, "branch_six_break");

    expect(harm).toContainEqual(expect.objectContaining({ ruleId: "six-harm:chou-wu" }));
    expect(branchBreak).toContainEqual(expect.objectContaining({ ruleId: "six-break:zi-you" }));
    expect(branchBreak[0].verificationStatus).toBe("embedded_table_pending_consultant_review");
    expect(branchBreak[0].knownGaps.join(" ")).toContain("Yin-Hai and Si-Shen");
  });
});

describe("calculatePillarRelations determinism and boundaries", () => {
  it("returns no facts when no configured relation is present", () => {
    expect(calculatePillarRelations(pillars("甲子", "甲子", "甲子", "甲子")).facts).toEqual([]);
  });

  it("accepts a ChartFacts-shaped input and never mutates it", () => {
    const input = {
      pillars: {
        year: { ganZhi: "壬申", stem: "壬", branch: "申" },
        month: { ganZhi: "甲子", stem: "甲", branch: "子" },
        day: { ganZhi: "戊辰", stem: "戊", branch: "辰" },
        hour: { ganZhi: "丁卯", stem: "丁", branch: "卯" }
      }
    } as unknown as ChartFacts;
    const before = structuredClone(input);

    const result = calculatePillarRelations(input);

    expect(input).toEqual(before);
    expect(result.pillars).toEqual({ year: "壬申", month: "甲子", day: "戊辰", hour: "丁卯" });
  });

  it("deduplicates and returns a stable documented order", () => {
    const input = pillars("壬申", "甲子", "戊辰", "丙子");
    const first = calculatePillarRelations(input);
    const second = calculatePillarRelations(structuredClone(input));
    const order = new Map(RELATION_TYPES.map((type, index) => [type, index]));

    expect(second).toEqual(first);
    expect(new Set(first.facts.map((fact) => fact.id)).size).toBe(first.facts.length);
    for (let index = 1; index < first.facts.length; index += 1) {
      expect(order.get(first.facts[index - 1].relationType)).toBeLessThanOrEqual(
        order.get(first.facts[index].relationType) ?? -1
      );
    }
  });

  it("supports per-relation switches and rejects every unknown rule shape", () => {
    const profile = mutableProfile();
    profile.enabled.branch_six_clash = false;
    expect(calculatePillarRelations(pillars("甲子", "庚午", "乙丑", "丁卯"), profile).facts).not.toContainEqual(
      expect.objectContaining({ relationType: "branch_six_clash" })
    );

    expectCode(
      () => calculatePillarRelations(pillars("甲子", "甲子", "甲子", "甲子"), {
        ...mutableProfile(),
        stemClashRule: "unknown-rule"
      } as unknown as RelationRuleProfile),
      "UNSUPPORTED_RULE"
    );
    expectCode(
      () => calculatePillarRelations(pillars("甲子", "甲子", "甲子", "甲子"), {
        ...mutableProfile(),
        extraRule: true
      } as unknown as RelationRuleProfile),
      "UNSUPPORTED_RULE"
    );
  });

  it("rejects invalid JiaZi and inconsistent ChartFacts pillar fields", () => {
    expectCode(() => calculatePillarRelations(pillars("甲丑", "甲子", "甲子", "甲子")), "INVALID_INPUT");
    expectCode(
      () => calculatePillarRelations({
        pillars: {
          year: { ganZhi: "甲子", stem: "乙", branch: "子" },
          month: { ganZhi: "甲子" },
          day: { ganZhi: "甲子" },
          hour: { ganZhi: "甲子" }
        }
      } as unknown as ChartFacts),
      "INVALID_INPUT"
    );
  });

  it("contains fact metadata but no interpretive verdict vocabulary", () => {
    const serialized = JSON.stringify(calculatePillarRelations(pillars("丙寅", "己巳", "壬申", "甲子")));
    expect(serialized).not.toMatch(/吉|凶|旺|衰|好|坏|婚|财|灾|宜|忌|成功|失败|有利|不利|克夫|克妻/);
  });
});

describe("historical relations executor registry", () => {
  const replayInput = pillars("壬申", "甲子", "戊辰", "丁卯");

  it("replays 0.1.0 only when the complete composite descriptor matches exactly", () => {
    const descriptor = structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR);
    const executor = lookupHistoricalRelationsExecutor(descriptor);

    expect(executor).not.toBeNull();
    expect(executor?.executorId).toBe("hakimi-relations-core:pillar-relations-executor:0.1.0");
    expect(executor?.descriptor).toEqual(RELATIONS_EXECUTOR_DESCRIPTOR);
    expect(executor?.engine).toEqual(RELATIONS_CORE_ENGINE);
    const result = executor?.calculatePillarRelations(replayInput);
    expect(result).toEqual(calculatePillarRelations(replayInput));
    expect(new Set(result?.facts.map((fact) => fact.verificationStatus))).toEqual(new Set([
      "upstream_public_constant_audited",
      "embedded_table_pending_consultant_review"
    ]));
    for (const fact of result?.facts ?? []) {
      const algorithmKind = fact.completeness === "binary"
        ? "position-pair-scan"
        : "required-set-presence";
      expect(fact.algorithmId).toBe(
        `${descriptor.engine.name}:${fact.relationType}:${algorithmKind}:${descriptor.factAlgorithmVersion}`
      );
      if (fact.verificationStatus === "upstream_public_constant_audited") {
        expect(fact.tableVersion).toMatch(
          new RegExp(`^${descriptor.engine.upstreamName}@${descriptor.engine.upstreamVersion}:LunarUtil\\.`)
        );
      } else {
        expect(fact.tableVersion).toBe(
          `${descriptor.engine.name}:embedded-tables@${descriptor.embeddedRelationTableVersion}`
        );
      }
    }
  });

  it("rejects a same-version descriptor from a different build", () => {
    const mismatchedDescriptor = {
      ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR),
      engine: {
        ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR.engine),
        upstreamTagCommit: "tampered-build"
      }
    };

    expect(lookupHistoricalRelationsExecutor(mismatchedDescriptor)).toBeNull();
    expectCode(
      () => requireHistoricalRelationsExecutor(mismatchedDescriptor),
      "HISTORICAL_EXECUTOR_UNAVAILABLE"
    );
  });

  it("rejects old engine-only, unknown, incomplete, and extra-field descriptors without fallback", () => {
    const unknownDescriptor = {
      ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR),
      engine: {
        ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR.engine),
        version: "9.9.9"
      }
    };
    const { upstreamIntegrity: _omittedIntegrity, ...oldFiveFieldDescriptor } = RELATIONS_CORE_ENGINE;
    const incompleteDescriptor = { engine: structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR.engine) };
    const extraFieldDescriptor = { ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR), unexpected: true };
    const wrongEmbeddedTable = {
      ...structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR),
      embeddedRelationTableVersion: "9.9.9"
    };

    expect(lookupHistoricalRelationsExecutor(oldFiveFieldDescriptor)).toBeNull();
    expect(lookupHistoricalRelationsExecutor(RELATIONS_CORE_ENGINE)).toBeNull();
    expect(lookupHistoricalRelationsExecutor(unknownDescriptor)).toBeNull();
    expect(lookupHistoricalRelationsExecutor(incompleteDescriptor)).toBeNull();
    expect(lookupHistoricalRelationsExecutor(extraFieldDescriptor)).toBeNull();
    expect(lookupHistoricalRelationsExecutor(wrongEmbeddedTable)).toBeNull();
    expect(() => requireHistoricalRelationsExecutor(unknownDescriptor)).toThrow(/不会回退到当前版本/);
  });

  it("freezes public relation types and the complete registry identity at runtime", () => {
    expect(Object.isFrozen(RELATION_TYPES)).toBe(true);
    expect(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY).toHaveLength(1);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0])).toBe(true);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0].descriptor)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0].descriptor.ruleProfile)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0].descriptor.engine)).toBe(true);
    expect(Object.isFrozen(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0].engine)).toBe(true);
    expect(HISTORICAL_RELATIONS_EXECUTOR_REGISTRY[0].engine).not.toBe(RELATIONS_CORE_ENGINE);
    expect(() => {
      (HISTORICAL_RELATIONS_EXECUTOR_REGISTRY as unknown as unknown[]).push({});
    }).toThrow(TypeError);
  });

  it("keeps A/B/A isolated across rejected descriptor and exported-array mutation attempts", () => {
    const descriptorA = structuredClone(RELATIONS_EXECUTOR_DESCRIPTOR);
    const descriptorB = {
      ...structuredClone(descriptorA),
      engine: { ...structuredClone(descriptorA.engine), upstreamVersion: "1.8.7" }
    };
    const firstExecutor = requireHistoricalRelationsExecutor(descriptorA);
    const firstResult = firstExecutor.calculatePillarRelations(replayInput);

    expect(() => requireHistoricalRelationsExecutor(descriptorB)).toThrow(RelationsCoreError);
    expect(() => {
      (RELATION_TYPES as unknown as string[]).splice(0, 1);
    }).toThrow(TypeError);

    const secondExecutor = requireHistoricalRelationsExecutor(structuredClone(descriptorA));
    const secondResult = secondExecutor.calculatePillarRelations(structuredClone(replayInput));
    expect(secondExecutor).toBe(firstExecutor);
    expect(secondResult).toEqual(firstResult);
    expect(secondResult.manifest.engine).toEqual(RELATIONS_CORE_ENGINE);
  });
});
