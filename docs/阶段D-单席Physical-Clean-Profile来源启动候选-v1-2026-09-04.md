# 阶段 D：单席 Physical Clean-Profile 来源启动候选 v1

日期：2026-09-04

## 结论

本轮把“来源侧 verified-memory 单席 server 已存在、但专家浏览器仍由普通 profile 打开”的缺口推进为一个三阶段 clean-profile 启动候选：preflight 核对显式 Chrome／Edge executable path 与 exact SHA-256 并消费当前进程产生的 prepared-seat capability；start 创建仓库外 system-temp session/profile、启动随机 loopback 单席 server，再以清理后的环境和固定 flags 启动实际 browser child；stop 在直接 child、server 与初始 `dev/ino` 绑定的 session 路径均完成关闭／缺失观察后才返回。

这只建立限定工程机制和两次本机进程运行观察。它不建立现实专家、真人资料处理、内容真值、专家真值、来源权利法律结论、预测准确度、发布就绪或公开发布授权。

当前继续固定：

- `legacy-v13 / targetSchema 13 / migrationId null`；
- 现实专家 `0/2`；
- 正式冻结 Binding `0/12`；
- `physicalExpertSurfaceReady=false`；
- `expertClaimsAuthorized=false`；
- `publicDeploymentAuthorized=false`；
- v1.7 frozen golden SHA-256 仍为 `aba357d98a99271cc9a9b2727ad1c7c516424c94b7cf34f765cb38b0e9a74b29`，本轮没有重签或替换。

## 新增工程切片

### Runner

`isolated-drafts/bazi-expert-review-pilot/single-binding-integrated-physical-clean-profile-runner.mjs`

- 37,437 bytes；883 行；SHA-256 `429060429ecc4ad3f5cba661500846d374a25136a2a22310e7798ae4f67e9231`。
- preflight 要求显式 absolute executable path、`chrome|edge`、非零小写 SHA-256、`syntheticDataOnly=true`、`realPersonUseAuthorized=false`、`realReturnLoadingAuthorized=false`。
- executable 必须是仓库外、名称匹配、大小受限、普通单链接文件；从 held handle 读取并计算 raw SHA-256，在 spawn 前后重新核对 path／metadata／bytes。
- prepared seat package 由当前进程 physical verifier 消费为私有 verified-server payload；clone 或重复 capability 不能启动。
- start 创建 system temp 的直接子目录，以及空的 `browser-profile` 和 `browser-temp`；向 child 只传固定 `SystemRoot/WINDIR/TEMP/TMP` allowlist。
- 参数包含显式 `--user-data-dir`、禁用 sync／extensions／component extensions／background networking／component update／default apps、no first run／default-browser check、no proxy 和 exact loopback `--app`。
- `shell=false`；headless 测试时隐藏窗口，未来显式 synthetic operator 模式才允许可见窗口。
- stop 串行化并发调用；浏览器终止、server 关闭或 session 删除任一不能确认时返回带原 capability 的 fail-closed 错误，可重试但不误发成功记录。
- failed-start 和 test-adapter lifecycle 都只产生无 `recordType` 的 cleanup receipt；test adapter run 固定 `admissibleRuntimeRecord=false`。

### Tests

`test/single-binding-integrated-physical-clean-profile-runner.test.mjs`

- 22,742 bytes；463 行；SHA-256 `a860c89bef624812cd459c6af52e5616527e61591b2863de0745c74c88d3328d`。
- 10/10 通过。
- 覆盖 wrong pin 不消费 prepared cap、family/path 错配、accessor 请求、clone、固定 flags／env、stop 失败后重试、同步 spawn throw、异步 spawn error、source server listen rejection、并发 start／release reservation、natural exit／explicit stop 收敛，以及所有权威投影继续关闭。

`test/single-binding-integrated-physical-clean-profile-real-browser.test.mjs`

- 5,916 bytes；110 行；SHA-256 `edf1558f13dcfff662b0b8d0d134227b57482d89f1f0c494052ac91dc593dd0f`。
- 默认没有 path／family／hash 时明确 skip，不会寻找或回退到默认浏览器。
- 显式提供三项外部值后，只使用固定合成 A 席，且不使用 test adapter。

## Capability 与正式 intake 分离

三个新 candidate record type：

1. `bazi_expert_single_binding_physical_clean_profile_preflight_candidate_v1`
2. `bazi_expert_single_binding_physical_clean_profile_run_candidate_v1`
3. `bazi_expert_single_binding_physical_clean_profile_stop_observation_candidate_v1`

均已加入 formal successor 的 `PILOT_RECORD_TYPES` 与独立固定字面量测试。formal intake 会以 predecessor/pilot type 拒绝它们；不能改名、序列化或作为 v4 私件转入正式专家计数。

## 本机实际 Chrome／Edge 观察

Browser 插件当前不在可用能力列表，因此 UI 行为仍按前端测试规程使用仓库 Playwright；本节的 clean-profile runner 则用其自身无 adapter 的实际 child-process 路径验证。两类证据分别保存，不能合并成一次完整真人运行。

| 浏览器 | 版本 | executable raw SHA-256 | 无 adapter runner |
| --- | --- | --- | ---: |
| Google Chrome | 152.0.7977.77 | `0f0f93866c581a18ff870455d6827acb85bf9b78c2e1b780714e89a613c707dc` | 1/1 |
| Microsoft Edge | 152.0.4191.53 | `bf9cb9e184d1719e2ebb7ce66b1fad2efaca215bd86796ed474d0a025b6882ab` | 1/1 |

两次均观察到：

- exact executable hash 在 test 外重算后传入，并由 runner 重新读取匹配；
- 当前进程 verified-memory A 席 server 使用随机 `127.0.0.1` 端口；
- 实际 browser child 发出 spawn；
- 来源 server 返回固定合成中文页面；
- operator stop 后直接 child terminal、server close、session removal 全部为 true；
- `returnCaptured=false`；
- 结束后没有 `hakimi-bazi-single-binding-physical-synthetic-*` 临时目录；
- 排除当前检查命令自身后，没有命令行仍引用该 session 前缀的进程。

该 test 通过 Node `fetch` 验证来源 server 可读，没有通过 CDP 或 Playwright 证明实际 child 内页面已完成渲染。既有 physical Playwright 页面交互证据与本次进程启动证据是两条独立证据线。

## 当前验证汇总

| 检查 | 结果 | 边界 |
| --- | ---: | --- |
| clean-profile runner unit | 10/10 | 参数、capability、失败／并发／cleanup 状态机 |
| real installed Chrome runner | 1/1 | 实际 child spawn 与本次关闭清理 |
| real installed Edge runner | 1/1 | 实际 child spawn 与本次关闭清理 |
| pilot `test:node` | 175 tests；174 passed；1 Windows 平台 skip | isolated pilot 全集，不是全仓测试 |
| formal successor Vitest | 3 files；248/248 | 新三类 candidate 明确被 formal deny |
| formal successor strict TypeScript | exit 0 | 只覆盖该 formal isolated draft |
| `check:release-governance` | exit 0 | 继续为 legacy-v13／13／null，两项公开授权 false |
| `check:system-contract-draft-boundaries` | exit 1；仍为既有 17 条 | 没有新增本 tranche 红项；不能称为通过 |

本轮未运行全仓 typecheck 或默认 Web build。受限文件 `apps/web/src/lib/local-user-data-cleanup.ts` 未读取、未修改、未排除、未抑制；它继续只登记为既有阻塞。

## 仍然不能宣称的浏览器性质

即使实际 Chrome／Edge 两次通过，下列字段仍保持 false：

- `browserExecutablePinProvenanceVerified`；
- `browserPublisherSignatureVerified`；
- `runningProcessImageVerified`；
- `samePrivilegeIntervalMutationExcluded`；
- `browserHonoredUserDataDirVerified`；
- `browserProfileIsolationEstablished`；
- `browserProcessTreeClosureEstablished`；
- `externalNetworkExcluded`；
- `browserExtensionInterceptionExcluded`；
- `enterpriseBrowserPolicyEffectsExcluded`；
- `physicalExpertSurfaceReady`。

原因是 runner 仍按 path spawn；held executable 与实际 process image 之间没有原子绑定。它只观察直接 `ChildProcess`，没有持续枚举整个进程树；传入 flags 也不等于从 OS 层证明外网、扩展或企业策略被排除。`--user-data-dir` 被传入不等于浏览器已经通过独立观察证明采用该目录。

## 回件私有落盘仍是下一停止线

本轮尝试运行一个只在系统 temp 创建自有空目录的 Windows DACL 探针，但本机执行策略在进程创建前阻止了该命令；没有创建目录，也没有取得 ACL 证据，且没有绕过。因此 writer 必须继续保持：

- `outputFileAclPrivacyEstablished=false`；
- `outputDirectoryEntryDurabilityEstablished=false`；
- `atomicTwoFileCommitEstablished=false`；
- `partialOutputCleanupImplemented=false`；
- `partialOutputMayContainSensitiveReturnBytes=true`；
- `samePermissionMutationExcluded=false`；
- `capturedReturnRecoverableAfterWriteFailure=false`。

`mkdir(..., 0o700)` 与 `open(..., 0o600)` 不能作为 Windows 私有 DACL 证明。现有两个文件依次直接写入最终目录，只有 file-handle sync，没有受控原生 ACL backend、staging directory commit、目录项 flush 或失败残留自动清理。故即使 clean-profile runner 已新增，当前 candidate 仍不得接收真人资料或现实专家意见。

## 非技术专家接入状态

本轮同时新增两份不要求专家理解 AI、代码、JSON 或 hash 的材料：

- `docs/阶段D-非技术专家Synthetic-Onboarding协调员操作与停止线-v1-2026-09-04.md`；
- `docs/阶段D-命理专家单条规则复核一页说明-Synthetic-Onboarding-v1-2026-09-04.md`。

它们把 expert、coordinator、AI/software 的责任分开，固定 A/B 独立、口述逐字代录、完整读回、协助类别自述、分歧不投票／不平均／不由模型选赢家，以及所有异常立即停止。它们是未来 onboarding 的底稿，不解除当前真人禁入线。

## 下一步

在真人专家甚至只做合成 onboarding 之前，仍需独立完成：

1. 从浏览器内证明本次实际采用新 profile，并明确／验证允许的网络集合；
2. 证明 browser process tree 和 profile 路径在停止后均不存在；
3. 取得可审计的 Windows private ACL backend；
4. 设计同 parent staging、非覆盖发布、失败恢复和目录 durability 状态机；
5. 建立现实参与者同意、退出、事故处理，以及身份／资质／独立性私有核验；
6. 将 synthetic onboarding 与未来正式审定的存储、权限和计数物理隔离。

这些工程门即使全部完成，也仍不能代替 12 条 Binding 的来源正文、exact quote、作品／版本／载体权利依据或两名现实专家原始意见。
