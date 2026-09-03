# 阶段 D 仓外身份 Dossier 端点与 Opaque Identity Context v1

日期：2026-08-29  
状态：D2 机械端点与假 workspace 防线已落盘；现实专家仍为 0/2

## 1. 结论

D2 为两席公开 identity binding 增加仓外 opaque dossier 文件端点，并与 D1 的两份仓外原始意见 context 合并进入完整 bundle preflight。公开 API 不解析、不返回、不持久化 dossier 正文；同一 held-buffer SHA-256 必须同时等于 `credentialDigest` 与 `privateDossierRef.encryptedArtifactSha256`。

这只建立文件字节与候选记录的机械绑定。`storageClass`、文件名或 SHA 自摘要都不能证明已加密、密钥受控、身份真实、资质有效、验证者有权、first-seen、custody、独立性、意见真实性、专家真值或发布权限。

## 2. 固定项目根与仓外边界

`workspaceRoot` 不再只是调用者自报字符串。共享 private-artifact resolver 现在要求它是绝对普通目录，并与当前 verifier 模块所在固定项目根的 realpath、`dev/ino` 目录端点身份同时一致。假 workspace root 即使配合真实仓内 `privateRoot` 也会在读取前以稳定领域错误失败；同一修复同时覆盖 identity dossier 与 original opinion 端点。

随后 `privateRoot` 必须与该固定项目根双向不重叠。完整目录链、held handle、same-buffer SHA、ADS／UNC／逃逸、hardlink、symlink／junction、特殊端点、超限读取和错误脱敏边界继续适用。

独立审计先用只读 PoC 证明旧实现可把仓内文件误签成“仓外已验证”，定级 P2；修复与假根回归落盘后，独立复核确认原 P2 已闭合且未见新 P1/P2。该结论只限本端点切片；修复不把一次 receipt 提升为持续存储或现实 custody 证明。

## 3. Opaque identity context 与完整图

公开 context 深冻结且不含 dossier bytes、路径、identity payload 或完整记录；模块私有 `WeakMap` 保存已预检 identity 与 held-buffer artifact identity。完整入口只接受同一模块实际签发的两个 identity contexts 和两个 opinion contexts，拒绝伪造、clone、spread、Proxy、访问器、稀疏数组、重复 context／record／dossier SHA／opaque record id，以及调用方再次注入 identity、opinion 或 seal。

结构成功时仅允许 `privateIdentityDossierArtifactsMechanicallyBound=2` 与 `privateOriginalOpinionFilesMechanicallyBound=2`。所有 identity／credential／scope／verifier authority／authenticity／first-seen／custody／storage／independence／expert gate／truth／release／authorization 字段仍为 false，现实计数仍为 `0/2`。

WeakMap context 是同进程、可重复使用的 opaque capability，不是数字签名、一次性 token、跨进程 receipt 或 freshness 证明。签发后文件可变化；未来消费者不得把机械计数当作实时文件状态。

## 4. 当前工件身份与验证

| 工件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `scripts/bazi-expert-review-packet-lib.mjs` | 139,453 | `76046086e4d4b49cd7166b548f4b6999fb208db020ed9b06e1cdefa90c2cd669` |
| `scripts/verify-bazi-expert-review-packet.test.mjs` | 96,373 | `662923d0d1f2e49b845705fc2f59661ad50d72e750b647fedd5b5dd23fd23a60` |

D2 定向测试为 `47/47`。它们覆盖 identity-first 预检、opaque bytes 双摘要、完整图、假 workspace root、路径／目录链／held handle、same buffer、链接与 ADS、context 防伪与交叉错链。独立复核重放原 PoC 后得到 `WORKSPACE_ROOT_UNTRUSTED`，未泄露路径或 cause，并未发现新 P1/P2。

## 5. D0 与残余红线

D2 代码变化只更新非权威 expected-manifest preview 与 D0 事实账，不重签保存 manifest：

- 当前 `high_risk_policy` component digest：`666bffc377e59e220b4a7ca1930a7a519b046a89af7dbaaf186d2bec68b83c3c`；
- 当前 preview digest：`be637b1e37ae92a9fd047af28d0117334405a39408dc470c766b7ddb8ab96954`；
- D0 ledger digest：`5b82b545a2c5b0cd5714342c1bdaca742f4de44e196cc32817e8310926850d0f`；
- 漂移仍为 4 个组件／7 个组件文件，owner decisions `0/7`；专家 packet 仍有一条 `bazi-core` 工件漂移，现实专家 `0/2`，RC freeze 为 false。

Schema 13 仍没有 mutation epoch；本端点不证明区间 mutation／ABA 排除、跨文件原子快照、真实项目 custody、现实身份或签发时间。默认发布治理继续为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
