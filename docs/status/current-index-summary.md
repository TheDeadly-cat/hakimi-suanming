# Canonical Current Index 状态投影

本页是 `content/system-admission/current-index.v1.json` 的机器投影，不是独立的 current、正式准入或发布授权来源。
人工叙述、历史状态文档、最高版本号和 SHA-256 均不得单独提升任何 current 或 authority 状态。

<!-- CURRENT_INDEX_MACHINE_PROJECTION_V1_BEGIN -->
```json
{
  "schemaVersion": "1.0.0",
  "recordType": "current_index_status_projection_v1",
  "source": {
    "path": "content/system-admission/current-index.v1.json",
    "indexId": "hakimi.repository/current-index/1.0.0",
    "indexDigest": "63e71d0c36e2f216711ac6c0b8ae0051c7f3ccd98d5b4a55cfdce8560180520e",
    "rawBytes": 42740,
    "rawSha256": "df7e9ac217d480ea84acb02d0f3484d8684fbcc6426eef9d0dbc7d8d358f326a",
    "machineSourceOnly": true,
    "humanDocumentIsAuthority": false
  },
  "historyCheckpoint": {
    "path": "content/system-admission/history-checkpoint.v2.json",
    "checkpointId": "hakimi.repository/history-checkpoint/2.0.0",
    "rawBytes": 36579,
    "rawSha256": "e1eba8f4d7a7ed7ffbe343cf8cc4c7dd2a453cba27a8d0b090da9b6cfb67c7ff",
    "checkpointDigest": "4b245ecf7f3493edf7654e882eb9735116a2b5d8ea0fcdb289ed8271720187e7",
    "familyCount": 25,
    "memberCount": 78,
    "familyInventoryDigest": "b62871655ccc771849e2ce35794411285157ef31be172690c3f7a6200ae30ddf",
    "historyRootDigest": "aa4aa5ea9a1774202c6bc1064e26d37119ed1e2af5bc22c013bd0fc4404debb5",
    "identityMechanicallyVerified": true,
    "fullHistoryVerifiedByCurrentIndexLoad": false
  },
  "currentAvailability": {
    "state": "unavailable",
    "unavailableFamilyCount": 8,
    "unavailableFamilyKeys": [
      "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest",
      "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest",
      "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest",
      "content/system-admission/bazi-current-machine-identity-successor",
      "content/system-admission/four-system-current-status-observation-child",
      "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements",
      "content/system-admission/western-source-binding-requirements",
      "content/system-admission/ziwei-source-binding-requirements"
    ],
    "baziCurrentManifestAvailable": true,
    "baziCurrentMachineIdentityAvailable": false,
    "baziExpertReviewPacketCurrentAvailable": true,
    "currentFourSystemStatusAvailable": false,
    "westernCurrentManifestAvailable": false,
    "ziweiCurrentManifestAvailable": false,
    "vedicCurrentManifestAvailable": false,
    "bundledKnowledgeManifestAvailable": true,
    "latestPersistedArtifactDoesNotImplyCurrent": true
  },
  "selectionCounts": {
    "selectedCurrentHead": 16,
    "selectedCurrentBelowHead": 0,
    "nonformalHeadFormalCurrentIsLower": 0,
    "historicalHeadCurrentUnavailable": 8,
    "currentObservationOnlyNoCurrentStatus": 1
  },
  "projectReleaseGovernance": {
    "activeLine": "legacy-v13",
    "targetSchema": 13,
    "migrationId": null
  },
  "authorityBoundary": {
    "formalAdmissionAuthorized": false,
    "releaseReady": false,
    "publicDeploymentAuthorized": false,
    "publicReleaseAuthorized": false,
    "expertClaimsAuthorized": false
  },
  "snapshotBoundary": {
    "crossFileAtomicSnapshot": false,
    "mutationEpochAvailableForSchema13": false,
    "mutationEpochReceipt": null,
    "intervalMutationExcludedAcrossFiles": false,
    "abaExcluded": false,
    "indexDigestIsDigitalSignature": false
  },
  "selectionBoundary": {
    "familyHeadMeansHighestPersistedVersionOnly": true,
    "selectedCurrentMeansRepositorySelectionOnly": true,
    "selectedCurrentDoesNotEstablishFormalAdmission": true,
    "latestVersionDoesNotImplyAuthority": true,
    "automaticPromotionAllowed": false
  },
  "nonVersionedSelections": {
    "baziExpertReviewPacket": {
      "currentAvailable": true,
      "selectedCurrent": {
        "version": "1.6.0",
        "path": "content/bazi-strength-expert-review-packet.current.json",
        "rawBytes": 12692,
        "rawSha256": "42c7541b9c1f84d5473bc91765cf599eb518abf2ebb656ba4360fbbd6ae37327",
        "packetId": "hakimi.bazi.strength.expert-review-packet/1.6.0",
        "packetDigest": "1b1e06439b4b3e44358b9e5b9feea2d44058933c8f66010d6a8940faa2da87e6"
      },
      "historicalAnchorVerifiedByCurrentLoad": false,
      "historicalAnchor": {
        "path": "content/bazi-strength-expert-review-packet.v1.json",
        "rawBytes": 12684,
        "rawSha256": "ba28de1b95d57de4320913e7a0b00fe780630d15408c5b22b84311977ea29163",
        "packetId": "hakimi.bazi.strength.expert-review-packet/1.5.0",
        "packetDigest": "cfe554b60b4698e0acd0a42e14484f4683eb7663d4f6862b767cf70404d2cd5f"
      },
      "driftReasons": []
    }
  },
  "entries": [
    {
      "familyKey": "content/bazi-strength-source-binding-candidates",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.7.0",
        "path": "content/bazi-strength-source-binding-candidates.v1.7.0.json",
        "artifactId": "hakimi.bazi.strength.source-binding-candidates/1.7.0",
        "rawSha256": "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
        "semanticDigest": "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9"
      },
      "selectedCurrent": {
        "version": "1.7.0",
        "path": "content/bazi-strength-source-binding-candidates.v1.7.0.json",
        "artifactId": "hakimi.bazi.strength.source-binding-candidates/1.7.0",
        "rawSha256": "03bc334a507e224d8658cd2af5fe5d5a11e1db0553fa7e54bf1287010147ccd2",
        "semanticDigest": "e705ef32eb2dc0d6651f314a6020b71c18070ba5b6702c6965b628d01f1ef5d9"
      }
    },
    {
      "familyKey": "content/bazi-strength-source-rights-candidates",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.3.0",
        "path": "content/bazi-strength-source-rights-candidates.v1.3.0.json",
        "artifactId": "hakimi.bazi.strength.source-rights-candidates/1.3.0",
        "rawSha256": "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
        "semanticDigest": "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1"
      },
      "selectedCurrent": {
        "version": "1.3.0",
        "path": "content/bazi-strength-source-rights-candidates.v1.3.0.json",
        "artifactId": "hakimi.bazi.strength.source-rights-candidates/1.3.0",
        "rawSha256": "8b26eea65e9ee3e7876298c3f720c46c43d5ec7d444ad4a4252116fc1dc21f17",
        "semanticDigest": "4b1183a85f1d2aeee537544a6b3711510406d98856a921730879c8a9ca782db1"
      }
    },
    {
      "familyKey": "content/domain-release/bazi.single-chart-report.v1.7.0.manifest",
      "selectionState": "selected_current_head",
      "head": {
        "version": "2.3.0",
        "path": "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json",
        "artifactId": "hakimi.bazi.single-chart-report.domain-release-manifest/2.3.0",
        "rawSha256": "d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578",
        "semanticDigest": "98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f"
      },
      "selectedCurrent": {
        "version": "2.3.0",
        "path": "content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.3.0.json",
        "artifactId": "hakimi.bazi.single-chart-report.domain-release-manifest/2.3.0",
        "rawSha256": "d155b4d3cf8693ca61a210091a8563aea8cdbe646689f11e09e946e2d1333578",
        "semanticDigest": "98babe5a9e29ad20807961f1561991c8ddaa5bb068f6da37cd1b0978b509fa3f"
      }
    },
    {
      "familyKey": "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "3.0.0",
        "path": "content/domain-release/vedic-astrology.engineering-draft.v0.1.0.manifest.v3.json",
        "artifactId": "hakimi.vedic-astrology.five-allowlisted-authored-root-recursive-machine-identity-manifest/3.0.0",
        "rawSha256": "c3d35e24073e7be14be971dae4e6825758b9fbfc3efd4adbc372e91fb74bf278",
        "semanticDigest": "b466a83ada3c9f39721cfc4a54628eb1a9afa03ff4794f51461fb6b4100041b2"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "5.0.0",
        "path": "content/domain-release/western-astrology.engineering-draft.v0.1.0.manifest.v5.json",
        "artifactId": "hakimi.western-astrology.six-allowlisted-authored-root-recursive-machine-identity-manifest/5.0.0",
        "rawSha256": "8dfe4a25fb4194d8e9e7b53f8d5b786813b11db9a7ed11e8a88c4f96aad41904",
        "semanticDigest": "3617e2bb812e64ea6a79c5a9c6660344e09ed85f5869ff1528415cab13f434b4"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "4.0.0",
        "path": "content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.manifest.v4.json",
        "artifactId": "hakimi.ziwei-doushu.four-package-authored-source-root-machine-identity-manifest/4.0.0",
        "rawSha256": "f1aa27896f589a3b1070ff6eb00b4c60fe3f77811365d760ee86b80b5e35ea3e",
        "semanticDigest": "46c2784875462e1851d0e3c7e352163660fbe29916e6ad6abd4f50065db42170"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/knowledge/manifest",
      "selectionState": "selected_current_head",
      "head": {
        "version": "2.0.0",
        "path": "content/knowledge/manifest.v2.json",
        "artifactId": "2.0.0",
        "rawSha256": "92e4d2c92aeb7f1e7898014be429f0fab92885dd52c36aee8eb1523941c55122",
        "semanticDigest": null
      },
      "selectedCurrent": {
        "version": "2.0.0",
        "path": "content/knowledge/manifest.v2.json",
        "artifactId": "2.0.0",
        "rawSha256": "92e4d2c92aeb7f1e7898014be429f0fab92885dd52c36aee8eb1523941c55122",
        "semanticDigest": null
      }
    },
    {
      "familyKey": "content/system-admission/bazi-binding-freeze-requirements",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.9.0",
        "path": "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
        "artifactId": "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
        "rawSha256": "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
        "semanticDigest": "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
      },
      "selectedCurrent": {
        "version": "1.9.0",
        "path": "content/system-admission/bazi-binding-freeze-requirements.v1.9.0.json",
        "artifactId": "hakimi.bazi.strength.binding-freeze-candidate-readiness/1.9.0",
        "rawSha256": "e20145b5f34b5dc04464e482cda5da990f82e520236679efbf568b322637f797",
        "semanticDigest": "42930e63cb0960df969f5fe059617eb96a8ec9bd857c486cd4b33a28d37a8ae1"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-current-machine-identity-successor",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-current-machine-identity-successor.v1.1.0.json",
        "artifactId": "hakimi.bazi.current-machine-identity-successor/1.1.0",
        "rawSha256": "787c5cd5994923805ca37b096be5ae36a94cf5f809c6892ce854e9b193ddff7b",
        "semanticDigest": "589e7157fb4cd4943ceea7b44d27ed2fc7b32cd6f21b788ca3b59b92973e54bf"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.2.0",
        "path": "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json",
        "artifactId": "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0",
        "rawSha256": "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491",
        "semanticDigest": "8634c6dba6591014040107d53b0dd6bb38a98fc67cc977f022f234525b47e6a2"
      },
      "selectedCurrent": {
        "version": "1.2.0",
        "path": "content/system-admission/bazi-domain-release-manifest-version-aware-observation-candidate.v1.2.0.json",
        "artifactId": "hakimi.bazi.domain-release-manifest.version-aware-observation-candidate/1.2.0",
        "rawSha256": "88ada4ca435228e7802b97eb0f19665392fb03445d7b065a36aac7a7efe18491",
        "semanticDigest": "8634c6dba6591014040107d53b0dd6bb38a98fc67cc977f022f234525b47e6a2"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-dtt-notice-reconciliation",
      "selectionState": "selected_current_head",
      "head": {
        "version": "2.0.0",
        "path": "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
        "artifactId": "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
        "rawSha256": "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
        "semanticDigest": "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
      },
      "selectedCurrent": {
        "version": "2.0.0",
        "path": "content/system-admission/bazi-dtt-notice-reconciliation.v2.json",
        "artifactId": "hakimi.bazi.dtt-notice-reconciliation/2.0.0",
        "rawSha256": "e2656a19955db0ce908df88aa696cd40847e7536af58c79548ac1fbce9a7464b",
        "semanticDigest": "2a47fc6fe281a4362c36dfc67c2a6dee195b5b069065ffc0e86ac1afcd7aa8a0"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-engineering-binding-value-subject-gaps",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json",
        "artifactId": "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
        "rawSha256": "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
        "semanticDigest": "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-engineering-binding-value-subject-gaps.v1.1.0.json",
        "artifactId": "hakimi.bazi.engineering_binding_value_subject_gaps.version-aware-candidate/1.1.0",
        "rawSha256": "f8ed780ce8e3fbaca59b295faff2f12b939a8b0c193bc0c20ce1198690528d4e",
        "semanticDigest": "d578b6e76c325bf79593b728b78035d3481ec60fa7fb99c815748d9f806a8330"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-expert-current-line-zero-instance-observation-child",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.1.0.json",
        "artifactId": "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0",
        "rawSha256": "598b662c7c58913fe9326290d08a1559f46f91909e5d040f9e335ad23562f9e2",
        "semanticDigest": "88044983de8b32fb68da7075224b5799528aa2ce63970d7c4eae0a0a92fae647"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-expert-current-line-zero-instance-observation-child.v1.1.0.json",
        "artifactId": "hakimi.bazi.expert-current-line-zero-instance-observation-child/1.1.0",
        "rawSha256": "598b662c7c58913fe9326290d08a1559f46f91909e5d040f9e335ad23562f9e2",
        "semanticDigest": "88044983de8b32fb68da7075224b5799528aa2ce63970d7c4eae0a0a92fae647"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-expert-review-intake-gap",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
        "artifactId": "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
        "rawSha256": "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
        "semanticDigest": "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-expert-review-intake-gap.v1.1.0.json",
        "artifactId": "hakimi.bazi.expert-review-intake-gap.version-aware-candidate/1.1.0",
        "rawSha256": "7a7088a3fdc660ccca3ef0d9765e36421563c7feee1c3dfa6bc4d7169d0f91df",
        "semanticDigest": "5318b9543bad20c52e5129901e94aa2ca3d2dd68f342ba11ab9611f4f767d582"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-policy-weights-value-evidence-candidate",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json",
        "artifactId": "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
        "rawSha256": "0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1",
        "semanticDigest": "95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-policy-weights-value-evidence-candidate.v1.1.0.json",
        "artifactId": "hakimi.bazi/policy-weights-value-evidence.version-aware-candidate/1.1.0",
        "rawSha256": "0b221bfc2669310298d9082711ad111b205c5881e419a90f92776229102f53c1",
        "semanticDigest": "95a1edb8d0228231229b561c97fd4960385e581cef87c3e1f2aa57e979c12c5b"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-pr10bc-scope-reconciliation",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
        "artifactId": "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
        "rawSha256": "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
        "semanticDigest": "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-pr10bc-scope-reconciliation.v1.1.0.json",
        "artifactId": "hakimi.bazi.pr10bc.version-aware-candidate-scope-reconciliation/1.1.0",
        "rawSha256": "edb367448f857972e50c735e86acc5252605a0b4d27a2f85c996fcd67d0ed2cc",
        "semanticDigest": "24851de28a762c426e2630c9a52666786274c3c5477b9fc0463f9129e43d20d1"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-project-copy-materialization-requirements",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
        "artifactId": "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
        "rawSha256": "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
        "semanticDigest": "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-project-copy-materialization-requirements.v1.1.0.json",
        "artifactId": "hakimi.bazi.project-copy-materialization-requirements.version-aware-candidate/1.1.0",
        "rawSha256": "7e98e6042cd1ccb00a2cff749f0000a989baacd683271edffc3158a80ee02b83",
        "semanticDigest": "d877ac00042d9e9635b0bf2cfe7b5f387f3aad82faa96c8a7214548299045d3f"
      }
    },
    {
      "familyKey": "content/system-admission/bazi-source-carrier-record-readiness",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
        "artifactId": "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
        "rawSha256": "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
        "semanticDigest": "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/bazi-source-carrier-record-readiness.v1.1.0.json",
        "artifactId": "hakimi.bazi.source-carrier-record-readiness.version-aware-candidate/1.1.0",
        "rawSha256": "8a2ae3fcd2abc01d952159ab78cb98eeba5dd2ab06d205e478abf64574759377",
        "semanticDigest": "ca2734777002a2e56d82ec3702f0517668ae68b23b423c2cb31e65164c225531"
      }
    },
    {
      "familyKey": "content/system-admission/four-system-current-status-observation-child",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "2.14.0",
        "path": "content/system-admission/four-system-current-status-observation-child.v2.14.0.json",
        "artifactId": "hakimi.system-admission/four-system-current-status-observation-child/2.14.0",
        "rawSha256": "5aae5229c9e4cac8f15e31cfaa43f8f4bc6156fddedd74cbb206236dd29f954a",
        "semanticDigest": "78e493c478737baca20b73338310f3077fd172e20e5d1546077c9514b6b16eee"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "1.3.0",
        "path": "content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.3.0.json",
        "artifactId": "hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.3.0",
        "rawSha256": "52a86e9b6cac141b8914b5462b92e713a5029d82acb7b97d2f2a92621035920a",
        "semanticDigest": "a019f2a78e7631486f56cc75a1de0fe28b8f0d8651ed0b71ec7a5910767326bb"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/system-admission/western-civil-time-same-artifact-browser-observation-child",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/western-civil-time-same-artifact-browser-observation-child.v1.1.0.json",
        "artifactId": "hakimi.western.civil-time.same-artifact-edge-chrome-observation/1.1.0",
        "rawSha256": "7d93d446bdd15c5d639704d70820453bc38f2c6aafa0611f7e49b08a9b6d7c00",
        "semanticDigest": "acc62365c0b03bc763b8ec09f04f92d87af750e277dcc091435b8c8487a9533e"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/western-civil-time-same-artifact-browser-observation-child.v1.1.0.json",
        "artifactId": "hakimi.western.civil-time.same-artifact-edge-chrome-observation/1.1.0",
        "rawSha256": "7d93d446bdd15c5d639704d70820453bc38f2c6aafa0611f7e49b08a9b6d7c00",
        "semanticDigest": "acc62365c0b03bc763b8ec09f04f92d87af750e277dcc091435b8c8487a9533e"
      }
    },
    {
      "familyKey": "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate",
      "selectionState": "current_observation_only_no_current_status",
      "head": {
        "version": "2.0.0",
        "path": "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v2.0.0.json",
        "artifactId": "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/2.0.0",
        "rawSha256": "e2f9daed6470c3965a3ce7d4088760687653e4ddf068022288e7be851ea35dd0",
        "semanticDigest": "7e562d0fa00239f5ef5293d70f6e66f6742fde82ef107bfb0461309c15667b4c"
      },
      "selectedCurrent": {
        "version": "2.0.0",
        "path": "content/system-admission/western-source-and-manifest-identity-drift-receipt-candidate.v2.0.0.json",
        "artifactId": "hakimi.western.source-and-manifest-identity-drift-receipt-candidate/2.0.0",
        "rawSha256": "e2f9daed6470c3965a3ce7d4088760687653e4ddf068022288e7be851ea35dd0",
        "semanticDigest": "7e562d0fa00239f5ef5293d70f6e66f6742fde82ef107bfb0461309c15667b4c"
      }
    },
    {
      "familyKey": "content/system-admission/western-source-binding-requirements",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "1.4.0",
        "path": "content/system-admission/western-source-binding-requirements.v1.4.0.json",
        "artifactId": "hakimi.western-astrology.source-binding-requirements/1.4.0",
        "rawSha256": "da755745c327b72aa617e40aed8d37a5e3f2c69aeb367dbfd9262dd5cece9f35",
        "semanticDigest": "d2e13b51abfc0a4247d6b083f8121f5681a925122edcc73ef31819d9e3d23243"
      },
      "selectedCurrent": null
    },
    {
      "familyKey": "content/system-admission/ziwei-same-artifact-browser-observation-child",
      "selectionState": "selected_current_head",
      "head": {
        "version": "1.1.0",
        "path": "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json",
        "artifactId": "hakimi.ziwei.same-artifact-browser-observation/1.1.0",
        "rawSha256": "da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5",
        "semanticDigest": "08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7"
      },
      "selectedCurrent": {
        "version": "1.1.0",
        "path": "content/system-admission/ziwei-same-artifact-browser-observation-child.v1.1.0.json",
        "artifactId": "hakimi.ziwei.same-artifact-browser-observation/1.1.0",
        "rawSha256": "da3c5da3b0e587e826235af9401df2b5b48618c7e37f89ede3d5a5deb7ed80c5",
        "semanticDigest": "08d717d62f84dc3146069d387904aa7e8626cca2f12594154b5e5002b2e355e7"
      }
    },
    {
      "familyKey": "content/system-admission/ziwei-source-binding-requirements",
      "selectionState": "historical_head_current_unavailable",
      "head": {
        "version": "1.2.0",
        "path": "content/system-admission/ziwei-source-binding-requirements.v1.2.0.json",
        "artifactId": "hakimi.ziwei-doushu.source-binding-requirements/1.2.0",
        "rawSha256": "63c0b8776978432dbcaaaaf5b2638acbc5d28d755dc1387c59c7e3421865c9a1",
        "semanticDigest": "0ea8fa98ac54926a019cb1aa428cdc8150e5a824400cc144b85bc1a645092624"
      },
      "selectedCurrent": null
    }
  ]
}
```
<!-- CURRENT_INDEX_MACHINE_PROJECTION_V1_END -->
