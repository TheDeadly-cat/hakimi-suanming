import {
  ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION
} from "./contract-bridge.ts";
import {
  calculateIztro258EngineeringFixture,
  createIztro258RuleSnapshotDraft
} from "./index.ts";

const [date = "1995-08-18", shichenText = "6", sex = "male"] = process.argv.slice(2);
const shichenIndex = Number(shichenText);

try {
  const ruleSnapshot = await createIztro258RuleSnapshotDraft();
  const fixture = await calculateIztro258EngineeringFixture({
    contractVersion: ZIWEI_DOUSHU_DRAFT_CONTRACT_VERSION,
    systemId: "ziwei-doushu",
    calendarInput: { calendar: "gregorian", date },
    shichenIndex,
    sexForCalculation: sex,
    solarTimeAdjustment: "none",
    civilContext: {
      usedForCalculation: false,
      localTime: null,
      timeZone: null,
      location: { precision: "unknown", label: "", latitude: null, longitude: null }
    },
    birthSourceRef: "cli.engineering_preview",
    sourceNote: "Local isolated adapter preview; not expert truth and not persisted."
  }, { ruleSnapshot });

  console.log(JSON.stringify({
    warning: "Engineering upstream behavior only; not expert truth or a production chart.",
    engine: fixture.receipt.engine,
    evidence: fixture.evidence,
    profile: {
      id: fixture.ruleSnapshot.profileId,
      version: fixture.ruleSnapshot.profileVersion,
      ruleSnapshotSha256: fixture.ruleSnapshot.ruleSnapshotSha256
    },
    facts: fixture.facts,
    artifactSha256: fixture.receipt.artifactSha256
  }, null, 2));
} catch (error) {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "ZIWEI_ADAPTER_DEMO_FAILED";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${code}: ${message}`);
  process.exitCode = 1;
}
