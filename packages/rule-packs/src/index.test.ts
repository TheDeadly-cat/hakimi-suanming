import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { canonicalStringify, sha256Hex } from "@hakimi/integrity";
import { describe, expect, it } from "vitest";
import webPackage from "../../../apps/web/package.json";
import invalidExecutableFixture from "./fixtures/invalid-executable-field.v1.json";
import legacyFixture from "./fixtures/legacy-format.v0.json";
import validFixture from "./fixtures/valid-working-default.v1.json";
import {
  RULE_PACK_DIGEST_ALGORITHM,
  RULE_PACK_FORMAT,
  RULE_PACK_FORMAT_VERSION,
  RULE_PACK_MAX_INPUT_BYTES,
  RULE_PACK_MAX_TOTAL_KEYS,
  RULE_PACK_MAX_TOTAL_NODES,
  RULE_PACK_MAX_TOTAL_STRINGS,
  RulePackError,
  WORKING_DEFAULT_RULE_PACK_METADATA,
  compareStrictSemver,
  createRulePackEnvelope,
  createWorkingDefaultRulePackEnvelope,
  preflightRulePack,
  recomputeRulePackDigest,
  serializeRulePackEnvelope,
  verifyRulePackIntegrity,
  type RulePackEnvelope,
  type RulePackMetadata,
  type RulePackUnsignedEnvelope
} from "./index";

const APP_VERSION = webPackage.version;

function cloneFixture(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validFixture)) as Record<string, unknown>;
}

function expectCode(promise: Promise<unknown>, code: RulePackError["code"]): Promise<void> {
  return expect(promise).rejects.toMatchObject({ name: "RulePackError", code }) as Promise<void>;
}

describe("declarative rule-pack envelope", () => {
  it("exports the built-in WORKING_DEFAULT as a verified canonical envelope", async () => {
    const envelope = await createWorkingDefaultRulePackEnvelope();
    expect(envelope).toMatchObject({
      format: RULE_PACK_FORMAT,
      formatVersion: RULE_PACK_FORMAT_VERSION,
      minAppVersion: "0.1.0",
      digest: { algorithm: RULE_PACK_DIGEST_ALGORITHM },
      metadata: {
        packId: "ziping-working-default",
        review: { status: "pending_consultant_review", reviewedBy: null, reviewedAt: null }
      }
    });
    expect(envelope.profile.status).toBe("working_default");
    expect(envelope.digest.value).toBe("f314b288ba12161b0da9c43cfdb3a053ff40181fd566185fefdee836d32551b8");

    const serialized = await serializeRulePackEnvelope(envelope);
    const repeated = await createWorkingDefaultRulePackEnvelope();
    expect(await serializeRulePackEnvelope(repeated)).toBe(serialized);
    expect(new TextEncoder().encode(serialized)).toHaveLength(1981);
    const imported = await preflightRulePack(serialized, { appVersion: APP_VERSION });
    expect(imported.envelope).toEqual(envelope);
    expect(imported.canonicalJson).toBe(serialized);
    expect(imported.profileDigest).toBe(await sha256Hex(envelope.profile));
    expect(imported.appVersion).toBe("0.2.0-p0");
  });

  it("accepts the pinned valid fixture and reproduces its known digest", async () => {
    const result = await preflightRulePack(JSON.stringify(validFixture), { appVersion: APP_VERSION });
    expect(result.digest).toBe("1b4cd5ce9b7f6384e31bbe717481b53abca34fba9213734d377062c9c909c805");
    expect(result.profileDigest).toBe(await sha256Hex(result.envelope.profile));
    expect(result.envelope.profile.profileId).toBe("fixture-working-default");
    await expect(recomputeRulePackDigest({
      format: result.envelope.format,
      formatVersion: result.envelope.formatVersion,
      minAppVersion: result.envelope.minAppVersion,
      profile: result.envelope.profile,
      metadata: result.envelope.metadata
    })).resolves.toBe(result.digest);
  });

  it("verifies integrity independently from app compatibility and returns the bound profile digest", async () => {
    const current = (await verifyRulePackIntegrity(validFixture)).envelope;
    const future = await createRulePackEnvelope({
      format: current.format,
      formatVersion: current.formatVersion,
      minAppVersion: "99.0.0-rc.1",
      profile: current.profile,
      metadata: current.metadata
    });

    const verified = await verifyRulePackIntegrity(future);
    expect(verified.digest).toBe(future.digest.value);
    expect(verified.profileDigest).toBe(await sha256Hex(future.profile));
    await expectCode(preflightRulePack(future, { appVersion: APP_VERSION }), "INCOMPATIBLE_APP_VERSION");
  });

  it("produces stable bytes and digests regardless of object insertion order", async () => {
    const valid = (await preflightRulePack(validFixture, { appVersion: APP_VERSION })).envelope;
    const reversedProfile = Object.fromEntries(Object.entries(valid.profile).reverse()) as typeof valid.profile;
    const reversedMetadata = Object.fromEntries(Object.entries(valid.metadata).reverse()) as RulePackMetadata;
    const reordered = await createRulePackEnvelope({
      metadata: reversedMetadata,
      profile: reversedProfile,
      minAppVersion: valid.minAppVersion,
      formatVersion: valid.formatVersion,
      format: valid.format
    });

    expect(reordered.digest.value).toBe(valid.digest.value);
    await expect(serializeRulePackEnvelope(reordered)).resolves.toBe(await serializeRulePackEnvelope(valid));
    expect(canonicalStringify(reordered)).toBe(canonicalStringify(valid));
  });

  it("rejects any content change after signing", async () => {
    const tampered = cloneFixture();
    const metadata = tampered.metadata as Record<string, unknown>;
    metadata.title = "Tampered title";
    await expectCode(preflightRulePack(tampered, { appVersion: APP_VERSION }), "DIGEST_MISMATCH");
  });

  it("rejects unknown envelope and nested profile fields instead of stripping them", async () => {
    const unknownEnvelope = cloneFixture();
    unknownEnvelope.extra = true;
    await expectCode(preflightRulePack(unknownEnvelope, { appVersion: APP_VERSION }), "SCHEMA_INVALID");

    const unknownProfile = cloneFixture();
    const profile = unknownProfile.profile as Record<string, unknown>;
    const calendar = profile.calendar as Record<string, unknown>;
    calendar.unrecognizedRule = true;
    await expectCode(preflightRulePack(unknownProfile, { appVersion: APP_VERSION }), "SCHEMA_INVALID");
  });

  it("rejects metadata that would require silent trimming", async () => {
    const normalized = cloneFixture();
    (normalized.metadata as Record<string, unknown>).title = " Fixture working default ";
    await expectCode(preflightRulePack(normalized, { appVersion: APP_VERSION }), "SCHEMA_INVALID");
  });
});

describe("rule-pack import security boundary", () => {
  it("rejects the executable-field fixture before schema or digest handling", async () => {
    await expectCode(
      preflightRulePack(invalidExecutableFixture, { appVersion: APP_VERSION }),
      "FORBIDDEN_EXECUTION_FIELD"
    );
  });

  it.each(["code", "Code", "script", "SCRIPT", "function", "Function"])(
    "rejects an arbitrary nested %s field",
    async (field) => {
      const malicious = cloneFixture();
      const metadata = malicious.metadata as Record<string, unknown>;
      metadata.review = { ...(metadata.review as object), [field]: "doSomething()" };
      await expectCode(preflightRulePack(malicious, { appVersion: APP_VERSION }), "FORBIDDEN_EXECUTION_FIELD");
    }
  );

  it.each(["__proto__", "prototype", "constructor"])("rejects the prototype-pollution key %s", async (field) => {
    const json = JSON.stringify(validFixture);
    const malicious = `{"${field}":{"polluted":true},${json.slice(1)}`;
    await expectCode(preflightRulePack(malicious, { appVersion: APP_VERSION }), "PROTOTYPE_POLLUTION_KEY");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("rejects accessors without invoking them", async () => {
    const malicious = cloneFixture();
    let invoked = false;
    Object.defineProperty(malicious, "payload", {
      enumerable: true,
      get() {
        invoked = true;
        return "not data";
      }
    });
    await expectCode(preflightRulePack(malicious, { appVersion: APP_VERSION }), "NON_JSON_VALUE");
    expect(invoked).toBe(false);
  });

  it("rejects non-JSON values, cyclic objects and non-plain prototypes", async () => {
    const withFunction = cloneFixture();
    (withFunction.metadata as Record<string, unknown>).handler = () => undefined;
    await expectCode(preflightRulePack(withFunction, { appVersion: APP_VERSION }), "NON_JSON_VALUE");

    const cyclic = cloneFixture();
    cyclic.self = cyclic;
    await expectCode(preflightRulePack(cyclic, { appVersion: APP_VERSION }), "NON_JSON_VALUE");

    const customPrototype = Object.create({ polluted: true }) as Record<string, unknown>;
    Object.assign(customPrototype, cloneFixture());
    await expectCode(preflightRulePack(customPrototype, { appVersion: APP_VERSION }), "PROTOTYPE_POLLUTION_KEY");

    const sparse = cloneFixture();
    (sparse.metadata as Record<string, unknown>).items = new Array(2);
    await expectCode(preflightRulePack(sparse, { appVersion: APP_VERSION }), "NON_JSON_VALUE");

    const customArray = cloneFixture();
    const refs = (customArray.metadata as Record<string, unknown>).sourceRefs as unknown[] & { extra?: string };
    refs.extra = "unsigned";
    await expectCode(preflightRulePack(customArray, { appVersion: APP_VERSION }), "NON_JSON_VALUE");
  });

  it("treats URL-like input as content and never fetches/imports it", async () => {
    await expectCode(preflightRulePack("https://example.invalid/rules.json", { appVersion: APP_VERSION }), "INVALID_JSON");
    await expectCode(preflightRulePack("not-json", { appVersion: APP_VERSION }), "INVALID_JSON");
  });

  it("fails closed on byte, node, key and string resource budgets before schema work", async () => {
    await expectCode(
      verifyRulePackIntegrity(" ".repeat(RULE_PACK_MAX_INPUT_BYTES + 1)),
      "RESOURCE_LIMIT_EXCEEDED"
    );

    const nodes = cloneFixture();
    nodes.nodeFlood = new Array(RULE_PACK_MAX_TOTAL_NODES + 1).fill(null);
    await expectCode(verifyRulePackIntegrity(nodes), "RESOURCE_LIMIT_EXCEEDED");

    const keys = cloneFixture();
    keys.keyFlood = Object.fromEntries(
      Array.from({ length: RULE_PACK_MAX_TOTAL_KEYS + 1 }, (_, index) => [`k${index}`, null])
    );
    await expectCode(verifyRulePackIntegrity(keys), "RESOURCE_LIMIT_EXCEEDED");

    const strings = cloneFixture();
    strings.stringFlood = new Array(RULE_PACK_MAX_TOTAL_STRINGS + 1).fill("");
    await expectCode(verifyRulePackIntegrity(strings), "RESOURCE_LIMIT_EXCEEDED");
  });

  it("contains no executable or remote-loading primitive", () => {
    const source = readFileSync(resolve(process.cwd(), "packages/rule-packs/src/index.ts"), "utf8");
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toMatch(/new\s+Function\s*\(/);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\bimport\s*\(/);
  });
});

describe("strict version compatibility", () => {
  it("rejects the legacy fixture and unknown profile schema versions", async () => {
    await expectCode(preflightRulePack(legacyFixture, { appVersion: APP_VERSION }), "UNSUPPORTED_FORMAT_VERSION");

    const profileVersion = cloneFixture();
    (profileVersion.profile as Record<string, unknown>).schemaVersion = "2.0.0";
    await expectCode(
      preflightRulePack(profileVersion, { appVersion: APP_VERSION }),
      "UNSUPPORTED_PROFILE_SCHEMA_VERSION"
    );
  });

  it("rejects unknown formats and apps below an integrity-verified minAppVersion", async () => {
    const format = cloneFixture();
    format.format = "other-format";
    await expectCode(preflightRulePack(format, { appVersion: APP_VERSION }), "UNSUPPORTED_FORMAT");

    const current = (await verifyRulePackIntegrity(validFixture)).envelope;
    const future = await createRulePackEnvelope({
      format: current.format,
      formatVersion: current.formatVersion,
      minAppVersion: "1.0.0",
      profile: current.profile,
      metadata: current.metadata
    });
    await expectCode(preflightRulePack(future, { appVersion: "0.9.9" }), "INCOMPATIBLE_APP_VERSION");
  });

  it("implements standard SemVer precedence, including prerelease and large numeric identifiers", () => {
    expect(compareStrictSemver("1.2.3", "1.2.3")).toBe(0);
    expect(compareStrictSemver("1.10.0", "1.9.99")).toBe(1);
    expect(compareStrictSemver("0.0.9", "0.1.0")).toBe(-1);
    expect(compareStrictSemver("999999999999999999999.0.0", "999999999999999999998.999.999")).toBe(1);
    const precedence = [
      "1.0.0-alpha",
      "1.0.0-alpha.1",
      "1.0.0-alpha.beta",
      "1.0.0-beta",
      "1.0.0-beta.2",
      "1.0.0-beta.11",
      "1.0.0-rc.1",
      "1.0.0"
    ];
    for (let index = 0; index < precedence.length - 1; index += 1) {
      expect(compareStrictSemver(precedence[index], precedence[index + 1])).toBe(-1);
    }
    expect(compareStrictSemver("1.2.3+build.001", "1.2.3+other")).toBe(0);
    expect(compareStrictSemver("1.2.3-p0", "1.2.3")).toBe(-1);
    for (const version of ["01.2.3", "1.2.3-01", "1.2.3-", "1.2.3+", "v1.2.3"]) {
      try {
        compareStrictSemver(version, "1.2.3");
        throw new Error("expected compareStrictSemver to reject invalid input");
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_APP_VERSION" });
      }
    }
  });

  it.each(["1", "1.2", "01.2.3", "1.2.3-01", "v1.2.3"])(
    "rejects invalid current app version %s",
    async (appVersion) => {
      await expectCode(preflightRulePack(validFixture, { appVersion }), "INVALID_APP_VERSION");
    }
  );

  it("uses the real prerelease app version for activation precedence", async () => {
    expect(APP_VERSION).toBe("0.2.0-p0");
    const current = (await verifyRulePackIntegrity(validFixture)).envelope;
    const exactPrerelease = await createRulePackEnvelope({
      format: current.format,
      formatVersion: current.formatVersion,
      minAppVersion: APP_VERSION,
      profile: current.profile,
      metadata: current.metadata
    });
    await expect(preflightRulePack(exactPrerelease, { appVersion: APP_VERSION })).resolves.toMatchObject({
      appVersion: APP_VERSION
    });

    const finalReleaseOnly = await createRulePackEnvelope({
      format: current.format,
      formatVersion: current.formatVersion,
      minAppVersion: "0.2.0",
      profile: current.profile,
      metadata: current.metadata
    });
    await expectCode(
      preflightRulePack(finalReleaseOnly, { appVersion: APP_VERSION }),
      "INCOMPATIBLE_APP_VERSION"
    );
  });

  it("rejects malformed minAppVersion and inconsistent review metadata", async () => {
    const badVersion = cloneFixture();
    badVersion.minAppVersion = "01.0.0";
    await expectCode(preflightRulePack(badVersion, { appVersion: APP_VERSION }), "SCHEMA_INVALID");

    const input = (await preflightRulePack(validFixture, { appVersion: APP_VERSION })).envelope;
    const unsigned: RulePackUnsignedEnvelope = {
      format: input.format,
      formatVersion: input.formatVersion,
      minAppVersion: input.minAppVersion,
      profile: input.profile,
      metadata: {
        ...input.metadata,
        review: { ...input.metadata.review, status: "consultant_reviewed" }
      }
    };
    await expectCode(createRulePackEnvelope(unsigned), "SCHEMA_INVALID");
  });
});

describe("fixture shape", () => {
  it("keeps valid fixture serializable as the package-owned envelope type", async () => {
    const result = await preflightRulePack(validFixture, { appVersion: APP_VERSION });
    const typed: RulePackEnvelope = result.envelope;
    expect(JSON.parse(await serializeRulePackEnvelope(typed))).toEqual(JSON.parse(result.canonicalJson));
    expect(WORKING_DEFAULT_RULE_PACK_METADATA.review.status).toBe("pending_consultant_review");
  });
});
