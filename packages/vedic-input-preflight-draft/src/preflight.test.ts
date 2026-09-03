import { describe, expect, it } from "vitest";
import draftSchema from "virtual:vedic-input-draft-schema";
import * as preflightModule from "./preflight.ts";
import {
  CURRENT_VEDIC_INPUT_DRAFT_IDENTITY,
  EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT
} from "./protocol.ts";

function currentBundle(): preflightModule.VedicInputDraftSchemaBundle {
  return {
    identity: { ...CURRENT_VEDIC_INPUT_DRAFT_IDENTITY },
    schema: structuredClone(draftSchema)
  };
}

describe("Vedic fixed input preflight", () => {
  it("replays exactly the four Node-evidence probes and receipt identities", async () => {
    const result = await preflightModule.runFixedVedicInputPreflight(currentBundle());

    expect(result).toEqual(EXPECTED_VEDIC_INPUT_PREFLIGHT_RESULT);
    expect(result.probeResults.map((entry) => entry.probeId)).toEqual([
      "missing_required_root_field",
      "invalid_ephemeris_digest_shape",
      "declared_dst_gap",
      "structurally_complete_contract_not_admitted"
    ]);
    expect(result.probeResults.map((entry) => entry.diagnostic.code)).toEqual([
      "SCHEMA_REQUIRED_PROPERTY_MISSING",
      "SCHEMA_PATTERN_MISMATCH",
      "DECLARED_DST_GAP_REJECTED",
      "INPUT_CONTRACT_NOT_ADMITTED"
    ]);
    expect(result.probeResults.map((entry) => entry.receiptId)).toEqual([
      "hakimi.vedic.structural-precheck-diagnostic/178b527a30396579060f4d3978c55a3e1c1e6a99d386db202d03963460124264",
      "hakimi.vedic.structural-precheck-diagnostic/e50cfc73e274c7e5c6c2cf0795a7a7ad4fc20fb5e01f9625a82daa993b3fc174",
      "hakimi.vedic.structural-precheck-diagnostic/023ab8cd7779b2d7c43e5314761cab9c4fdc8c7a093bcf2399c97276a968b112",
      "hakimi.vedic.structural-precheck-diagnostic/d7c048b5ba968ea7ae795f9116d7bedd5af5c1693acac3cc3769b86ff55c5dc0"
    ]);
  });

  it("keeps accepted, product receipt, capability, coverage, and every authority field red", async () => {
    const result = await preflightModule.runFixedVedicInputPreflight(currentBundle());

    expect(result.acceptedInputs).toBe(0);
    expect(result.inputInstances).toBe(0);
    expect(result.productInputRejectionReceipts).toBe(0);
    expect(result.inputContractGateSatisfied).toBe(false);
    expect(result.inputRejectionCapabilityEstablished).toBe(false);
    expect(result.probeCoverageComplete).toBe(false);
    expect(Object.values(result.authorityBoundary)).toEqual(Array(9).fill(false));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.probeResults)).toBe(true);
    expect(Object.isFrozen(result.probeResults[0]!.diagnostic)).toBe(true);
  });

  it("uses Web Crypto to reject schema bytes or injected identity that are not current", async () => {
    const drifted = currentBundle();
    (drifted.schema as Record<string, unknown>).$id = "urn:hakimi:vedic:input-contract-draft:forged";
    await expect(preflightModule.runFixedVedicInputPreflight(drifted)).rejects.toMatchObject({
      code: "SCHEMA_IDENTITY_INVALID"
    });

    const current = currentBundle();
    const wrongIdentity = {
      schema: current.schema,
      identity: {
        ...CURRENT_VEDIC_INPUT_DRAFT_IDENTITY,
        canonicalSha256: "0".repeat(64)
      }
    } as unknown as preflightModule.VedicInputDraftSchemaBundle;
    await expect(preflightModule.runFixedVedicInputPreflight(wrongIdentity)).rejects.toMatchObject({
      code: "SCHEMA_IDENTITY_INVALID"
    });
  });

  it("is deterministic and exposes no caller-candidate validation entrypoint", async () => {
    const first = await preflightModule.runFixedVedicInputPreflight(currentBundle());
    const second = await preflightModule.runFixedVedicInputPreflight(currentBundle());

    expect(first).toEqual(second);
    expect(Object.keys(preflightModule).sort()).toEqual([
      "VedicInputPreflightError",
      "runFixedVedicInputPreflight"
    ]);
  });
});
