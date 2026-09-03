import { describe, expect, it } from "vitest";
import {
  VEDIC_BROWSER_DST_POLICY_VERSION,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
  VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
  VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
  VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
  VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
  VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
  prepareVedicCivilTimeBrowserRequest
} from "./input-contract.ts";

type Overrides = Record<string, unknown>;

function request(overrides: Overrides = {}): Record<string, any> {
  const {
    civil_calendar_and_date: calendarOverrides,
    local_wall_time_and_precision: wallTimeOverrides,
    birth_time_uncertainty_interval_or_candidates: uncertaintyOverrides,
    iana_time_zone_and_tzdb_identity: zoneOverrides,
    dst_ambiguity_policy: policyOverrides,
    ...rootOverrides
  } = overrides;
  return {
    projectionVersion: VEDIC_BROWSER_INPUT_PROJECTION_VERSION,
    civil_calendar_and_date: {
      calendar_id: "proleptic_gregorian",
      calendar_version: VEDIC_BROWSER_PROLEPTIC_GREGORIAN_VERSION,
      year: 2025,
      month: 3,
      day: 20,
      ...(calendarOverrides as object | undefined)
    },
    local_wall_time_and_precision: {
      wall_time_text: "17:01",
      precision_id: "exact_minute",
      precision_version: VEDIC_BROWSER_EXACT_WALL_TIME_PRECISION_VERSION,
      ...(wallTimeOverrides as object | undefined)
    },
    birth_time_uncertainty_interval_or_candidates: {
      representation: "exact",
      model_id: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_ID,
      model_version: VEDIC_BROWSER_EXACT_UNCERTAINTY_MODEL_VERSION,
      ...(uncertaintyOverrides as object | undefined)
    },
    iana_time_zone_and_tzdb_identity: {
      iana_time_zone_id: "Asia/Shanghai",
      tzdb_version: "2026c",
      tzdb_snapshot_id: VEDIC_BROWSER_FIXED_TZDB_SNAPSHOT_ID,
      ...(zoneOverrides as object | undefined)
    },
    dst_ambiguity_policy: {
      policy_id: "vedic_adapter_draft_reject",
      policy_version: VEDIC_BROWSER_DST_POLICY_VERSION,
      ...(policyOverrides as object | undefined)
    },
    ...rootOverrides
  };
}

async function expectRejected(value: unknown, code?: string): Promise<void> {
  const pending = prepareVedicCivilTimeBrowserRequest(value);
  if (code === undefined) {
    await expect(pending).rejects.toBeInstanceOf(Error);
    return;
  }
  await expect(pending).rejects.toMatchObject({ code });
}

describe("Vedic civil-time fact browser input contract", () => {
  it("prepares the exact six-root-field minute request and a Web Crypto SHA-256", async () => {
    const prepared = await prepareVedicCivilTimeBrowserRequest(request());

    expect(prepared.request).toEqual(request());
    expect(Object.keys(prepared.request).sort()).toEqual([
      "birth_time_uncertainty_interval_or_candidates",
      "civil_calendar_and_date",
      "dst_ambiguity_policy",
      "iana_time_zone_and_tzdb_identity",
      "local_wall_time_and_precision",
      "projectionVersion"
    ].sort());
    expect(prepared.requestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(prepared)).toBe(true);
    expect(Object.isFrozen(prepared.request)).toBe(true);
    expect(Object.isFrozen(prepared.request.civil_calendar_and_date)).toBe(true);
  });

  it("accepts exact-second input and each explicit reject/earlier/later policy", async () => {
    for (const policy_id of [
      "vedic_adapter_draft_reject",
      "vedic_adapter_draft_earlier",
      "vedic_adapter_draft_later"
    ] as const) {
      const prepared = await prepareVedicCivilTimeBrowserRequest(request({
        local_wall_time_and_precision: {
          wall_time_text: "01:30:59",
          precision_id: "exact_second"
        },
        dst_ambiguity_policy: { policy_id }
      }));
      expect(prepared.request.local_wall_time_and_precision).toMatchObject({
        wall_time_text: "01:30:59",
        precision_id: "exact_second"
      });
      expect(prepared.request.dst_ambiguity_policy.policy_id).toBe(policy_id);
    }
  });

  it("is deterministic and binds policy changes into requestSha256", async () => {
    const first = await prepareVedicCivilTimeBrowserRequest(request());
    const second = await prepareVedicCivilTimeBrowserRequest(request());
    const later = await prepareVedicCivilTimeBrowserRequest(request({
      dst_ambiguity_policy: { policy_id: "vedic_adapter_draft_later" }
    }));

    expect(first.requestSha256).toBe(second.requestSha256);
    expect(first.requestSha256).not.toBe(later.requestSha256);
  });

  it("takes the complete descriptor-safe snapshot before the Web Crypto await", async () => {
    const raw = request();
    const pending = prepareVedicCivilTimeBrowserRequest(raw);
    raw.civil_calendar_and_date.day = 21;
    raw.local_wall_time_and_precision.wall_time_text = "23:59";
    raw.dst_ambiguity_policy.policy_id = "vedic_adapter_draft_later";
    const prepared = await pending;

    expect(prepared.request.civil_calendar_and_date.day).toBe(20);
    expect(prepared.request.local_wall_time_and_precision.wall_time_text).toBe("17:01");
    expect(prepared.request.dst_ambiguity_policy.policy_id).toBe("vedic_adapter_draft_reject");
  });

  it("rejects every root or nested extra key, including a declaration", async () => {
    await expectRejected(request({ unexpected: true }), "VEDIC_BROWSER_INPUT_ROOT_KEYS_INVALID");
    await expectRejected(request({
      civil_calendar_and_date: { alias_year: 2025 }
    }), "VEDIC_BROWSER_CALENDAR_KEYS_INVALID");
    await expectRejected(request({
      dst_gap_overlap_resolution_declaration: { classification: "unambiguous" }
    }), "VEDIC_BROWSER_INPUT_ROOT_KEYS_INVALID");
  });

  it("rejects aliases and cycles", async () => {
    const aliased = request();
    aliased.dst_ambiguity_policy = aliased.iana_time_zone_and_tzdb_identity;
    const cyclic = request();
    cyclic.civil_calendar_and_date.cycle = cyclic;

    await expectRejected(aliased, "VEDIC_BROWSER_INPUT_ALIAS_OR_CYCLE");
    await expectRejected(cyclic, "VEDIC_BROWSER_INPUT_ALIAS_OR_CYCLE");
  });

  it("rejects accessors without invoking them", async () => {
    let getterCalls = 0;
    const raw = request();
    Object.defineProperty(raw.local_wall_time_and_precision, "wall_time_text", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        throw new Error("must not execute");
      }
    });

    await expectRejected(raw, "VEDIC_BROWSER_INPUT_DESCRIPTOR_INVALID");
    expect(getterCalls).toBe(0);
  });

  it("rejects symbol properties and negative zero", async () => {
    const withSymbol = request();
    Object.defineProperty(withSymbol.iana_time_zone_and_tzdb_identity, Symbol("hidden"), {
      enumerable: true,
      value: true
    });

    await expectRejected(withSymbol, "VEDIC_BROWSER_INPUT_SYMBOL_FORBIDDEN");
    await expectRejected(request({
      civil_calendar_and_date: { day: -0 }
    }), "VEDIC_BROWSER_INPUT_NUMBER_INVALID");
  });

  it.each([
    { year: 1900, month: 2, day: 29 },
    { year: 2025, month: 4, day: 31 },
    { year: 10_000, month: 1, day: 1 },
    { year: 2025, month: 0, day: 1 }
  ])("rejects illegal Gregorian date %#", async (civil_calendar_and_date) => {
    await expectRejected(request({ civil_calendar_and_date }), "VEDIC_BROWSER_GREGORIAN_DATE_INVALID");
  });

  it.each([
    { wall_time_text: "24:00", precision_id: "exact_minute" },
    { wall_time_text: "23:60", precision_id: "exact_minute" },
    { wall_time_text: "23:59:60", precision_id: "exact_second" },
    { wall_time_text: "17:01:00", precision_id: "exact_minute" },
    { wall_time_text: "17:01", precision_id: "exact_second" }
  ])("rejects illegal or precision-mismatched wall time %#", async (local_wall_time_and_precision) => {
    await expectRejected(request({ local_wall_time_and_precision }), "VEDIC_BROWSER_WALL_TIME_INVALID");
  });

  it("rejects non-exact uncertainty and unknown policy", async () => {
    await expectRejected(request({
      birth_time_uncertainty_interval_or_candidates: { representation: "closed_interval" }
    }), "VEDIC_BROWSER_EXACT_UNCERTAINTY_INVALID");
    await expectRejected(request({
      dst_ambiguity_policy: { policy_id: "automatic" }
    }), "VEDIC_BROWSER_DST_POLICY_INVALID");
  });

  it.each([
    { projectionVersion: "hakimi.vedic-civil-time-resolution-input-projection/0.2-draft" },
    { civil_calendar_and_date: { calendar_version: "wrong" } },
    { local_wall_time_and_precision: { precision_version: "wrong" } },
    { birth_time_uncertainty_interval_or_candidates: { model_version: "wrong" } },
    { iana_time_zone_and_tzdb_identity: { tzdb_version: "2025b" } },
    { iana_time_zone_and_tzdb_identity: { tzdb_snapshot_id: "iana-tzdb@2026c/sha256:wrong" } },
    { dst_ambiguity_policy: { policy_version: "wrong" } }
  ])("rejects a wrong bound version or snapshot %#", async (overrides) => {
    await expectRejected(request(overrides));
  });
});
