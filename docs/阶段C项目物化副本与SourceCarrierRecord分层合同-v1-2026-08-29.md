# 阶段 C 项目物化副本与 SourceCarrierRecord 分层合同 v1

日期：2026-08-29  
状态：C-M1 零实例机械要求已落盘；正式载体、项目副本、正文、许可和冻结实例仍为 0

## 1. 结论

本合同把一条来源进入项目后的技术物化链明确拆为：正式 `SourceCarrierRecord` 所指载体 → 项目内原始副本 → 固定 UTF-8 归一化 → `KnowledgeDocument` 内容摘要。它不是作品层、现代版本层、载体层之外的第四个权利层，也不作许可或法律判断；它只规定未来真实副本怎样留下可重放、失败关闭的工程来源证明。

当前持久账是零实例要求账：正式 `SourceCarrierRecord=0`、项目副本记录 `0`、已验证 materialization `0`。测试中的字节、记录与路径均为 synthetic candidate，不是现实来源正文，也不增加 12 条 Binding 的冻结计数。

## 2. 机械边界

候选 preflight 精确绑定 carrier id／edition version／规范记录摘要与内容摘要、项目相对路径、原始文件 SHA-256／字节数、固定归一化算法以及目标 `KnowledgeDocument` id／hash。原始副本使用 held handle、有界读取、完整普通目录链与端点复核；绝对路径、UNC、ADS、父目录逃逸、symlink／junction、hardlink、特殊端点、超限文件、目录链替换和错误路径回显均失败关闭。

LF、CRLF 与 UTF-8 BOM 可以在固定规则下得到相同规范化内容，但各自原始 SHA-256 必须不同；旧 receipt 不能复用于新原始字节。TypedArray／Buffer 输入只接受 exact-native slot，拒绝子类、访问器和 hostile descriptor，且不调用不可信 getter。成功结果使用同一 held-buffer 字节生成 raw 与 normalized identity，并保持深冻结、脱敏。

这些离散端点检查没有 mutation epoch，不证明读取区间从未变化、ABA 不存在或多文件属于原子快照。

## 3. 当前工件身份与验证

| 工件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `content/system-admission/bazi-project-copy-materialization-requirements.v1.json` | 6,168 | `c63a95514063fb64752d449f6ccb1c844544110e5ed9f1192de2ef7723efd13b` |
| `scripts/bazi-project-copy-materialization-lib.mjs` | 54,877 | `9004d36284052cba94084dbe967245923f957dd01e2afa2e1f53d9f6f73a266f` |
| `scripts/verify-bazi-project-copy-materialization.mjs` | 1,581 | `9f1eb9f2bdf7eeb7b140be8614d675613d21de121cfdedaaed9a828b63645dcd` |
| `scripts/verify-bazi-project-copy-materialization.test.mjs` | 28,289 | `4222f48bdcb9474730e69fb1df58f0fed90a0c425ce7e5fdacb9792a997fa279` |

要求账 digest：`690320c5d9778bf61da5ca3e112aedc6f9e2760e27f628f4c992cb5b9a8af1cb`。C-M1 定向测试 `23/23`；与既有 C 来源／权利／冻结／私有 exact quote 切片合计 `77/77`。独立对抗复核发现 exact-byte descriptor／限制候选问题后，exact-native slot 修复已落盘；复核范围内未留存 P1/P2。

## 4. 没有建立的事项

- 没有真实来源正文、项目副本或 `KnowledgeDocument` 实例；
- 没有正式 `SourceRightsRecord`／`SourceCarrierRecord`，没有作品层或载体层许可结论；
- 没有 exact quote、内容真值、专家真值或 Binding 冻结；
- 没有进入 package、build gate、domain manifest、专家 packet 或中央 registry；因此本合同本身不新增 D0 漂移条目；
- 没有发布就绪、RC freeze、公开部署或专家声明授权。

未来若接入正式清单，必须由 owner 明确决定新增组件与锁定身份，并重新建立 D0／manifest／registry 证据；不能以本零实例合同自动授权 rebind。

发布身份继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`，`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。
