# 阶段 D：八字 v1.7 当前机器身份 Manifest v2.1

日期：2026-08-31  
状态：append-only 机器观察后继；现实专家仍为 `0/2`；无发布或中央准入效力

## 结论

新增 `hakimi.bazi.single-chart-report.domain-release-manifest/2.1.0`，并列消费三个 full fixed-path loader 私有品牌：Manifest v2、SourceCarrier readiness v1.1、八字专家隐私与正式 intake 对账 v1。它没有改写 v2，没有改中央 system-admission registry、cross-system engineering registry 或 lifecycle。

v2.1 只做两项版本感知重绑：

1. `rights_bundle` 仅把历史 SourceCarrier readiness v1 替换为 v1.1；其余八个组件投影保持与 v2 精确一致。
2. expert preconditions 增加 privacy／formal intake reconciliation 观察，但没有现实自然人实例、正式同意、正式 packet 或意见正文。

因此 `sourceCarrierReadinessSuccessorCreated=true` 和 `privacyFormalIntakeReconciliationMechanicallyVerified=true` 只是机械观察，不代表权利记录、专家审定或个人信息处理获得授权。

## 固定身份

| 项目 | 值 |
|---|---|
| artifact | `content/domain-release/bazi.single-chart-report.v1.7.0.manifest.v2.1.0.json` |
| raw identity | `19,064 bytes / 68794de2ce30c11a8e94333c23a2e115355590ead41eb97f67af6a638e420413` |
| manifest digest | `f3cc8c91674c49317f93a7362b34e1b8eb887029284e0c9994fdf15ea546bfd2` |
| loader | `scripts/bazi-domain-release-manifest-v2-1-lib.mjs` — `31,567 bytes / a01fa54be3c6a03a0abb3176306d3ab01e0f3ea5eb7937023ff90893d898dfcb` |
| CLI | `scripts/verify-bazi-domain-release-manifest-v2-1.mjs` — `10,534 bytes / b90e3fbf56c83bbe2bf2b8372ce6bbc02a546a314d4207b0fa12b5fe34aa7fe2` |
| tests | `scripts/verify-bazi-domain-release-manifest-v2-1.test.mjs` — `21,714 bytes / 292f46112c3bd70a31f5b381586b75777ff76a4c31130a72e4f86c7e0930246a` |

## 精确红账

- Binding 为 `0/12`；formal KnowledgeDocument／SourceRightsRecord／SourceCarrierRecord 均为 `0`。
- 现实专家要求 `2`，reviewer slot、independent verified review、sealed original opinion 均为 `0`。
- packet artifact lock 为 `11 exact / 1 drift`；首个正式失败仍为 `INTAKE_GAP_BINDING_DRIFT`。
- `currentOpaqueContextInstances=0`、`persistedRealPersonInstancesAllowed=false`、`collectionAuthorized=false`、`personDataPresenceAssessed=false`、`personDerivedDigestExcluded=false`、`safeToPublish=false`。
- 内容真值、专家真值、权利法律结论均未建立；`activeAdmissionEffect="none"`。
- `releaseReady=false`、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
- `legacy-v13 / targetSchema 13 / migrationId null` 保持不变。
- cross-file atomic snapshot、Schema 13 mutation epoch、interval mutation exclusion、ABA exclusion 与 replay exclusion 均未建立。
- 两个中央 registry integration 均为 `false`。

CLI 使用 `BAZI_DOMAIN_RELEASE_MANIFEST_V2_1_OBSERVATION_OK`，同时把 hidden preload、Node runtime、loader、launcher 与 stdout attestation 信任全部记为未建立。可见 loader 参数守卫只用于减少误用，不是安全边界。

## 本轮验证

```text
node --test scripts/verify-bazi-domain-release-manifest-v2-1.test.mjs
# 32/32

node --test --test-concurrency=1 scripts/verify-bazi-domain-release-manifest-v2-1.test.mjs
# 32/32

node scripts/verify-bazi-domain-release-manifest-v2-1.mjs
# exit 0; *_OBSERVATION_OK
```

三个 `.mjs` 文件均通过 `node --check`。测试覆盖三父品牌克隆、旧 carrier 回混、自重签 authority elevation、formal／privacy／runtime 红门抬升、`-0`、accessor、稀疏数组、alias、额外 CLI 参数、可见 loader 参数与 side-effect-free import。红队发现 test-only raw `summaryFrom` 可为未品牌 wrapper 写入误导性的 verified 标志后，该导出已删除；公开 summary 现在只有 full-loader 私有品牌入口，clone 以 `MANIFEST_V21_BRAND_REQUIRED` 失败关闭。

## 分账

| 账本 | 当前结论 |
|---|---|
| 工程证据 | 当前 v2.1 字节身份与三个私有上游观察可机械复验 |
| 浏览器／运行时证据 | 未建立；CLI 不是可信运行时 attestation |
| 内容真值 | `not_established` |
| 专家真值 | `not_established`；现实专家 `0/2` |
| 权利法律判断 | `not_established`；正式记录仍为零 |
| 发布就绪 | `false` |
| 专家宣称授权 | `false` |
| 公开部署授权 | `false` |

本轮没有联系专家、收集个人信息或读取意见正文；没有运行浏览器、正式仓储、PWA／Service Worker、公开主机、Release Evidence、部署、回滚、全仓 typecheck 或默认 Web build。
