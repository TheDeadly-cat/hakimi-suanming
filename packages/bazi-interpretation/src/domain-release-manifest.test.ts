import { describe, expect, it } from "vitest";
import baziDomainReleaseManifest from "../../../content/domain-release/bazi.single-chart-report.v1.7.0.json";
import {
  SOURCE_CARRIER_SCHEMA_VERSION,
  systemDomainReleaseManifestSchema
} from "@hakimi/contracts";
import { WORKING_DEFAULT_RULE_PROFILE } from "@hakimi/rule-profiles";
import {
  BAZI_INTERPRETATION_RULE_PROFILE,
  BAZI_STRENGTH_CLAIM_REGISTRY,
  BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE
} from "./index";
import { BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION } from "./current-chart-review-snapshot";

function component(componentId: string) {
  const found = baziDomainReleaseManifest.components.find((entry) => entry.componentId === componentId);
  if (!found) throw new Error(`测试 manifest 缺少组件：${componentId}`);
  return found;
}

describe("bazi v1.7 machine identity", () => {
  it("separates report format, execution profile, interpretation rules and fact projection versions", () => {
    systemDomainReleaseManifestSchema.parse(baziDomainReleaseManifest);
    expect(baziDomainReleaseManifest.surface.surfaceVersion).toBe("1.7.0");
    expect(component("execution_rules").version).toBe(
      `${WORKING_DEFAULT_RULE_PROFILE.profileId}@${WORKING_DEFAULT_RULE_PROFILE.profileVersion}`
    );
    expect(component("interpretation_rules").version).toBe(
      `${BAZI_INTERPRETATION_RULE_PROFILE.rulePackId}@${BAZI_INTERPRETATION_RULE_PROFILE.ruleVersion}`
    );
    expect(component("fact_contract").version).toBe(BAZI_CURRENT_CHART_FACTS_PROJECTION_VERSION);
    expect(component("input_policy").version).toBe("hakimi.bazi.input_policy/0.1.0");
    expect(component("high_risk_policy").version).toBe(
      "hakimi.bazi.high_risk_policy/0.2.0+expert-review-packet.6+engineering-candidates.1"
    );
    expect(component("report_contract").version).toBe("single-chart-report@1.7.0");
    expect(
      component("report_contract").files.find((file) =>
        file.path.endsWith("single-chart-report.contract.v1.7.json")
      )?.sha256
    ).toBe("aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29");
  });

  it("records the 8-source/12-binding registry as incomplete and keeps real expert evidence absent", () => {
    expect(BAZI_STRENGTH_CLAIM_REGISTRY.sources).toHaveLength(8);
    expect(BAZI_STRENGTH_CLAIM_REGISTRY.sourceBindings).toHaveLength(12);
    expect(component("source_bundle")).toMatchObject({
      version: `${BAZI_STRENGTH_CLAIM_REGISTRY_PROFILE.projectionVersion}+content.0.19.0-historical-candidates.4+engineering-candidates.7+freeze-readiness.6`,
      status: "incomplete"
    });
    expect(component("rights_bundle")).toMatchObject({
      version: `source-rights@1.0.0+source-carrier@${SOURCE_CARRIER_SCHEMA_VERSION}+manifest@2.0.0+rights-candidates.2+source-collation.4+freeze-readiness.6`,
      status: "incomplete"
    });
    expect(component("expert_review_bundle")).toMatchObject({ version: "absent/0", status: "absent", files: [] });
    expect(baziDomainReleaseManifest.evidenceLedger).toMatchObject({
      contentTruth: "not_established",
      expertTruth: "not_established",
      rightsLegalConclusion: "not_established",
      releaseReadiness: "not_ready",
      publicReleaseAuthorization: "not_authorized"
    });
    expect(baziDomainReleaseManifest.gateState).toMatchObject({
      engineeringBindingCandidatesMechanicallyVerified: 7,
      engineeringRationalesFrozen: 0,
      bindingFrozenVerified: 0,
      independentExpertReviewsVerified: 0
    });
  });
});
