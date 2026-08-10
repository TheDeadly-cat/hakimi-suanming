import { describe, expect, it } from "vitest";
import {
  WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
  westernBirthInputDraftSchema,
  westernCalculationFailureDraftSchema,
  westernCalculationProfileDraftSchema,
  westernChartFixtureDraftSchema
} from "./index";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const SHA_C = "c".repeat(64);
const SHA_D = "d".repeat(64);
const TZDB_SNAPSHOT_ID =
  "iana-tzdb@2026c/sha256:43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81" +
  "/hakimi-tzdb-core@1.0.0/moment-timezone@0.6.3";

function buildProfile() {
  const artifacts = [
    {
      role: "planetary_ephemeris" as const,
      datasetId: "jpl_de440_fixture",
      sourceId: "source:jpl-de440",
      contentSha256: SHA_A,
      coverageFrom: "1995-08-18",
      coverageTo: "1995-08-18",
      rightsLedgerRef: "rights.jpl_fixture",
      targetInventory: {
        artifactContentSha256: SHA_A,
        extractionAlgorithmId: "synthetic_spk_inventory_fixture",
        targets: [
          { bodyId: "sun", providerTargetId: "10", targetCenterKind: "body_center" },
          { bodyId: "moon", providerTargetId: "301", targetCenterKind: "body_center" }
        ]
      }
    },
    {
      role: "frame" as const,
      datasetId: "sofa_frame_fixture",
      sourceId: "source:sofa",
      contentSha256: SHA_B,
      coverageFrom: "1995-08-18",
      coverageTo: "1995-08-18",
      rightsLedgerRef: "rights.sofa_fixture",
      targetInventory: null
    },
    {
      role: "leap_seconds" as const,
      datasetId: "leap_second_fixture",
      sourceId: "source:iers-time",
      contentSha256: SHA_C,
      coverageFrom: "1995-08-18",
      coverageTo: "1995-08-18",
      rightsLedgerRef: "rights.iers_link_only",
      targetInventory: null
    },
    {
      role: "earth_orientation" as const,
      datasetId: "iers_eop_fixture",
      sourceId: "source:iers-time",
      contentSha256: SHA_D,
      coverageFrom: "1995-08-18",
      coverageTo: "1995-08-18",
      rightsLedgerRef: "rights.iers_link_only",
      targetInventory: null
    }
  ];

  return westernCalculationProfileDraftSchema.parse({
    contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
    systemId: "western-astrology",
    profileId: "jpl_tropical_geocentric_fixture",
    profileVersion: "0.1.0",
    status: "contract_draft",
    supportedRange: { from: "1995-08-18", to: "1995-08-18", outsideRangePolicy: "reject" },
    astronomy: {
      targets: [
        { bodyId: "sun", providerTargetId: "10", targetCenterKind: "body_center" },
        { bodyId: "moon", providerTargetId: "301", targetCenterKind: "body_center" }
      ],
      observerOrigin: "geocenter",
      baseFrame: "ICRF",
      outputEcliptic: "true_ecliptic_equinox_of_date",
      lightTime: "converged",
      stellarAberration: true,
      solarGravitationalDeflection: false,
      frameTransformAlgorithmId: "sofa_true_ecliptic_fixture"
    },
    zodiac: { kind: "tropical", ayanamshaId: null, algorithmId: "tropical_equinox_of_date" },
    houses: null,
    aspects: {
      coordinateBasis: "ecliptic_longitude",
      definitions: [{ aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 8 }],
      motionAlgorithmId: "instantaneous_relative_longitude_speed_v1"
    },
    ephemeris: {
      provider: "jpl_spice",
      engineName: "naif-spice",
      engineVersion: "1.0.0",
      adapterVersion: "0.1.0",
      datasetId: "jpl_de440_fixture",
      requiredArtifacts: artifacts,
      fallbackPolicy: "reject",
      providerRightsReview: "local_evaluation_only"
    },
    timePolicy: {
      timeScaleAdapterId: "sofa_iers_fixture",
      leapSecondPolicy: "pinned_snapshot",
      eopPreference: ["final", "rapid"],
      missingEopPolicy: "reject"
    },
    sourceCatalog: [
      {
        sourceId: "source:jpl-de440",
        kind: "ephemeris_documentation",
        title: "JPL DE440 and DE441",
        publisher: "NASA Jet Propulsion Laboratory",
        url: "https://ssd.jpl.nasa.gov/doc/de440_de441.html",
        versionOrDate: "DE440",
        retrievedAt: "2026-08-10T00:00:00.000Z",
        usage: "astronomical_fixture",
        rightsStatus: "public_technical_reference",
        notes: "工程参考，不提供占星规则"
      },
      {
        sourceId: "source:sofa",
        kind: "reference_frame_standard",
        title: "IAU SOFA terms and software",
        publisher: "International Astronomical Union",
        url: "https://www.iausofa.org/",
        versionOrDate: null,
        retrievedAt: "2026-08-10T00:00:00.000Z",
        usage: "link_only",
        rightsStatus: "license_terms_recorded",
        notes: "尚未打包任何 SOFA 代码"
      },
      {
        sourceId: "source:iers-time",
        kind: "time_standard",
        title: "IERS Earth orientation and time products",
        publisher: "IERS",
        url: "https://www.iers.org/",
        versionOrDate: null,
        retrievedAt: "2026-08-10T00:00:00.000Z",
        usage: "astronomical_fixture",
        rightsStatus: "redistribution_review_required",
        notes: "随包分发前仍需书面确认"
      }
    ],
    review: { status: "unreviewed", attestations: [] },
    profileSha256: SHA_A,
    interpretationIncluded: false
  });
}

function buildFixture() {
  const profile = buildProfile();
  return westernChartFixtureDraftSchema.parse({
    contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
    systemId: "western-astrology",
    artifactKind: "western_natal_engineering_fixture",
    input: {
      contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
      systemId: "western-astrology",
      calendar: "proleptic_gregorian",
      date: "1995-08-18",
      time: "08:26",
      timePrecision: "exact_minute",
      timeZone: "Asia/Shanghai",
      dstDisambiguation: "reject",
      location: {
        label: "上海",
        latitude: 31.2304,
        longitude: 121.4737,
        elevationMeters: null,
        precision: "coordinates"
      },
      birthSourceRef: "birth.example",
      sourceNote: "工程结构样例，不是占星真值"
    },
    profile,
    facts: {
      bodies: [
        {
          bodyId: "sun",
          providerTargetId: "10",
          targetCenterKind: "body_center",
          observerOrigin: "geocenter",
          ecliptic: {
            longitudeDeg: 10,
            latitudeDeg: 0.1,
            distanceAu: 1,
            longitudeSpeedDegPerDay: 0.98,
            latitudeSpeedDegPerDay: 0,
            distanceSpeedAuPerDay: 0
          },
          equatorial: { rightAscensionDeg: 9.2, declinationDeg: 4.1 },
          zodiac: { longitudeDeg: 10, signIndex: 0, degreeWithinSign: 10, ayanamshaDeg: null },
          retrograde: false
        },
        {
          bodyId: "moon",
          providerTargetId: "301",
          targetCenterKind: "body_center",
          observerOrigin: "geocenter",
          ecliptic: {
            longitudeDeg: 11,
            latitudeDeg: 2.1,
            distanceAu: 0.00257,
            longitudeSpeedDegPerDay: 13.2,
            latitudeSpeedDegPerDay: 0.4,
            distanceSpeedAuPerDay: -0.00001
          },
          equatorial: { rightAscensionDeg: 10.1, declinationDeg: 6.2 },
          zodiac: { longitudeDeg: 11, signIndex: 0, degreeWithinSign: 11, ayanamshaDeg: null },
          retrograde: false
        }
      ],
      houses: null,
      aspects: [{
        bodyA: "sun",
        bodyB: "moon",
        aspectId: "conjunction",
        exactAngleDeg: 0,
        separationDeg: 1,
        directedOrbDeg: 1,
        orbDeg: 1,
        maxOrbDeg: 8,
        motion: "separating"
      }]
    },
    timeProvenance: {
      utcInstant: "1995-08-18T00:26:00.000Z",
      utcOffsetSeconds: 28_800,
      dstResolution: {
        status: "resolved",
        choice: "unique",
        timeZone: "Asia/Shanghai",
        tzdbSnapshotId: TZDB_SNAPSHOT_ID
      },
      taiMinusUtcSeconds: 29,
      dut1Seconds: 0.1,
      deltaTSeconds: 61.084,
      tdbMinusTtSeconds: 0.0012,
      julianDay: {
        ut1: 2_449_947.518_056_713,
        tt: 2_449_947.518_763_704,
        tdb: 2_449_947.518_763_718
      },
      leapSeconds: {
        datasetId: "leap_second_fixture",
        contentSha256: SHA_C,
        validThrough: "1995-12-31"
      },
      earthOrientation: {
        provider: "IERS",
        productId: "iers_eop_fixture",
        status: "final",
        issueDate: "1995-09-01",
        sampleMjd: 49_947,
        sourceUrl: "https://www.iers.org/",
        contentSha256: SHA_D,
        polarMotionXArcsec: 0.1,
        polarMotionYArcsec: 0.2
      }
    },
    ephemerisProvenance: {
      provider: "jpl_spice",
      engineName: "naif-spice",
      engineVersion: "1.0.0",
      adapterVersion: "0.1.0",
      datasetId: "jpl_de440_fixture",
      artifacts: profile.ephemeris.requiredArtifacts,
      requestedOptions: { frame: "ICRF", aberration: "CN+S" },
      effectiveOptions: { frame: "ICRF", aberration: "CN+S" },
      returnedFlags: ["exact-requested-artifacts"],
      fallbackUsed: false,
      backendWarnings: []
    },
    fieldProvenance: [{
      fieldPath: "facts.bodies[0].ecliptic.longitudeDeg",
      kind: "ephemeris_fact",
      algorithmId: "jpl_spice_fixture",
      sourceIds: ["source:jpl-de440"],
      verificationStatus: "engineering_preview"
    }],
    evidence: {
      evidenceStatus: "synthetic_contract_fixture",
      claimScopes: ["fixture_structure"],
      productionEligible: false,
      expertTruthClaimed: false,
      note: "数值仅用于验证契约内部关系与结构，不声称来自真实天文计算、排盘或专家审核"
    },
    receipt: {
      receiptVersion: "western-calculation-receipt/0.1-draft",
      profileId: profile.profileId,
      profileVersion: profile.profileVersion,
      digestAlgorithm: "sha256-canonical-json-v1",
      digestVerification: "format_only_contract_draft",
      inputSha256: SHA_B,
      profileSha256: profile.profileSha256,
      factsSha256: SHA_C,
      artifactSha256: SHA_D,
      calculatedAt: "2026-08-10T00:00:00.000Z",
      fallbackUsed: false,
      interpretationIncluded: false,
      warnings: [],
      knownGaps: ["尚未接入或验证任何星历计算引擎；摘要仅通过格式校验，未由内容计算"]
    }
  });
}

describe("Western astrology isolated contract draft", () => {
  it("accepts a fully bound engineering fixture and preserves explicit target-center identities", () => {
    const fixture = buildFixture();
    expect(fixture.facts.bodies.map((item) => [item.bodyId, item.targetCenterKind])).toEqual([
      ["sun", "body_center"],
      ["moon", "body_center"]
    ]);
    expect(fixture.facts.aspects[0]?.motion).toBe("separating");
    expect(fixture.evidence.evidenceStatus).toBe("synthetic_contract_fixture");
    expect(fixture.receipt.digestVerification).toBe("format_only_contract_draft");
    expect(fixture.evidence.productionEligible).toBe(false);
  });

  it("accepts only exact, coordinate-backed input inside the frozen 1900-2100 MVP range", () => {
    const input = buildFixture().input;
    expect(westernBirthInputDraftSchema.safeParse({ ...input, unexpected: true }).success).toBe(false);
    expect(westernBirthInputDraftSchema.safeParse({ ...input, date: "1899-12-31" }).success).toBe(false);
    expect(westernBirthInputDraftSchema.safeParse({ ...input, timePrecision: "exact_second", time: "08:26" }).success).toBe(false);
    expect(westernBirthInputDraftSchema.safeParse({ ...input, timePrecision: "unknown_hour", time: null }).success).toBe(false);

    const fixture = buildFixture();
    expect(fixture.timeProvenance.dstResolution.tzdbSnapshotId).toBe(TZDB_SNAPSHOT_ID);
    fixture.timeProvenance.dstResolution.tzdbSnapshotId = "iana_tzdb_2026c";
    expect(westernChartFixtureDraftSchema.safeParse(fixture).success).toBe(false);
  });

  it("rejects uncleared providers, target-center substitution and every backend fallback", () => {
    const blocked = buildFixture();
    blocked.profile.ephemeris.providerRightsReview = "blocked_pending_review";
    expect(westernChartFixtureDraftSchema.safeParse(blocked).success).toBe(false);

    const wrongCenter = buildFixture();
    wrongCenter.facts.bodies[1]!.targetCenterKind = "system_barycenter";
    expect(westernChartFixtureDraftSchema.safeParse(wrongCenter).success).toBe(false);

    const wrongProviderTarget = buildFixture();
    wrongProviderTarget.profile.astronomy.targets[1]!.providerTargetId = "5";
    wrongProviderTarget.facts.bodies[1]!.providerTargetId = "5";
    expect(westernChartFixtureDraftSchema.safeParse(wrongProviderTarget).success).toBe(false);

    const fallback = buildFixture();
    expect(westernChartFixtureDraftSchema.safeParse({
      ...fallback,
      ephemerisProvenance: { ...fallback.ephemerisProvenance, fallbackUsed: true }
    }).success).toBe(false);

    const changedEffectiveOptions = buildFixture();
    changedEffectiveOptions.ephemerisProvenance.effectiveOptions.aberration = "NONE";
    expect(westernChartFixtureDraftSchema.safeParse(changedEffectiveOptions).success).toBe(false);

    const backendWarning = buildFixture();
    backendWarning.ephemerisProvenance.backendWarnings.push("provider reported a fallback warning");
    expect(westernChartFixtureDraftSchema.safeParse(backendWarning).success).toBe(false);

    const swiss = buildFixture();
    swiss.profile.ephemeris.provider = "swiss_ephemeris";
    swiss.ephemerisProvenance.provider = "swiss_ephemeris";
    expect(westernChartFixtureDraftSchema.safeParse(swiss).success).toBe(false);

    const profile = buildProfile();
    expect(westernCalculationProfileDraftSchema.safeParse({
      ...profile,
      astronomy: { ...profile.astronomy, solarGravitationalDeflection: true }
    }).success).toBe(false);
  });

  it("rejects sidereal profiles without ayanamsha, house substitution and inconsistent aspect math", () => {
    const profile = buildProfile();
    expect(westernCalculationProfileDraftSchema.safeParse({
      ...profile,
      zodiac: { kind: "sidereal", ayanamshaId: null, algorithmId: "sidereal_fixture" }
    }).success).toBe(false);

    const missingHouses = buildFixture();
    missingHouses.profile.houses = {
      systemId: "placidus",
      equator: "true_of_date",
      algorithmId: "house_fixture",
      unavailablePolicy: "reject",
      fallbackPolicy: "reject"
    };
    expect(westernChartFixtureDraftSchema.safeParse(missingHouses).success).toBe(false);

    const badOrb = buildFixture();
    badOrb.facts.aspects[0]!.orbDeg = 2;
    expect(westernChartFixtureDraftSchema.safeParse(badOrb).success).toBe(false);

    const badSeparation = buildFixture();
    badSeparation.facts.aspects[0]!.separationDeg = 2;
    expect(westernChartFixtureDraftSchema.safeParse(badSeparation).success).toBe(false);

    const badDirectedOrb = buildFixture();
    badDirectedOrb.facts.aspects[0]!.directedOrbDeg = -1;
    expect(westernChartFixtureDraftSchema.safeParse(badDirectedOrb).success).toBe(false);

    const badMotion = buildFixture();
    badMotion.facts.aspects[0]!.motion = "applying";
    expect(westernChartFixtureDraftSchema.safeParse(badMotion).success).toBe(false);

    expect(westernCalculationProfileDraftSchema.safeParse({
      ...profile,
      aspects: {
        ...profile.aspects,
        definitions: [{ aspectId: "conjunction", exactAngleDeg: 0, maxOrbDeg: 0 }]
      }
    }).success).toBe(true);
  });

  it("binds civil time, UTC offset and every declared Julian Day", () => {
    const badDeltaT = buildFixture();
    badDeltaT.timeProvenance.deltaTSeconds += 1;
    expect(westernChartFixtureDraftSchema.safeParse(badDeltaT).success).toBe(false);

    const badUtc = buildFixture();
    badUtc.timeProvenance.utcInstant = "1995-08-18T00:26:01.000Z";
    expect(westernChartFixtureDraftSchema.safeParse(badUtc).success).toBe(false);

    const badOffset = buildFixture();
    badOffset.timeProvenance.utcOffsetSeconds += 3_600;
    expect(westernChartFixtureDraftSchema.safeParse(badOffset).success).toBe(false);

    const badUt1 = buildFixture();
    badUt1.timeProvenance.julianDay.ut1 += 1 / 86_400;
    expect(westernChartFixtureDraftSchema.safeParse(badUt1).success).toBe(false);

    const badTt = buildFixture();
    badTt.timeProvenance.julianDay.tt += 1 / 86_400;
    expect(westernChartFixtureDraftSchema.safeParse(badTt).success).toBe(false);

    const badTdb = buildFixture();
    badTdb.timeProvenance.julianDay.tdb += 1 / 86_400;
    expect(westernChartFixtureDraftSchema.safeParse(badTdb).success).toBe(false);

    const expiredLeapSnapshot = buildFixture();
    expiredLeapSnapshot.timeProvenance.leapSeconds.validThrough = "1995-08-17";
    expect(westernChartFixtureDraftSchema.safeParse(expiredLeapSnapshot).success).toBe(false);
  });

  it("requires an exact artifact set and binds leap-second and EOP receipts", () => {
    const extraArtifact = buildFixture();
    extraArtifact.ephemerisProvenance.artifacts.push(extraArtifact.ephemerisProvenance.artifacts[0]!);
    expect(westernChartFixtureDraftSchema.safeParse(extraArtifact).success).toBe(false);

    const alteredArtifact = buildFixture();
    alteredArtifact.ephemerisProvenance.artifacts[0]!.rightsLedgerRef = "rights.changed";
    expect(westernChartFixtureDraftSchema.safeParse(alteredArtifact).success).toBe(false);

    const wrongLeapArtifact = buildFixture();
    wrongLeapArtifact.timeProvenance.leapSeconds.contentSha256 = SHA_D;
    expect(westernChartFixtureDraftSchema.safeParse(wrongLeapArtifact).success).toBe(false);

    const wrongEopArtifact = buildFixture();
    wrongEopArtifact.timeProvenance.earthOrientation.productId = "other_eop_fixture";
    expect(westernChartFixtureDraftSchema.safeParse(wrongEopArtifact).success).toBe(false);

    const unrelatedProfileDataset = buildFixture();
    unrelatedProfileDataset.profile.ephemeris.datasetId = "other_planetary_fixture";
    unrelatedProfileDataset.ephemerisProvenance.datasetId = "other_planetary_fixture";
    expect(westernChartFixtureDraftSchema.safeParse(unrelatedProfileDataset).success).toBe(false);
  });

  it("represents failures without partial facts", () => {

    expect(westernCalculationFailureDraftSchema.parse({
      contractVersion: WESTERN_ASTROLOGY_DRAFT_CONTRACT_VERSION,
      systemId: "western-astrology",
      status: "failed_closed",
      stage: "houses",
      code: "BACKEND_FALLBACK_REJECTED",
      inputSha256: SHA_A,
      profileSha256: SHA_B,
      occurredAt: "2026-08-10T00:00:00.000Z",
      partialFactsPersisted: false,
      fallbackAccepted: false,
      message: "所选宫制失败，拒绝接受后备宫制"
    }).partialFactsPersisted).toBe(false);
  });
});
