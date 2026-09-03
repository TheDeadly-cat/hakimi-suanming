# PR6 运行时已解码 API transcript 候选边界 v1（2026-08-27）

## 结论

本切片新增的是一个始终失败关闭的磁盘候选包，用来保存 Playwright `CDPSession.send()` 与页面 `MessageChannel` 返回的完整已解码 JSON 对象，并从这些文件独立派生既有 `sw_ab_update_runtime_client_capture_candidate_v1` 投影。

它不是 CDP WebSocket wire frame、浏览器 transport、TLS/HTTP 原始流量或真实 Chrome/Edge 执行证据。`raw` 一词不再作为本家族的身份名称；唯一可为真的正向字段是 `decodedApiObjectProjectionDerivationVerified=true`，含义只限于“检查过的 API 对象文件能够机械派生当前 v1 投影”。

## 固定磁盘包

成功发布的 bundle 必须精确包含 9 个普通单链接文件，不能有临时文件、别名、符号链接或额外文件：

1. `01-msedge-initial-a-retained-old-a.json`
2. `02-msedge-initial-a-reload-to-b.json`
3. `03-chrome-initial-a-retained-old-a.json`
4. `04-chrome-initial-a-reload-to-b.json`
5. `05-msedge-post-claim-retained-old-a.json`
6. `06-msedge-post-claim-reload-to-b.json`
7. `07-chrome-post-claim-retained-old-a.json`
8. `08-chrome-post-claim-reload-to-b.json`
9. `bundle-manifest.json`

writer 在内存中完成 policy、Schema、tuple、A/B artifact claim、phase barrier、client/target 关系和既有 runtime-capture verifier 的全部检查后，才创建新目录；8 个 tuple 先以不可覆盖方式写入并同步，manifest 最后发布。已存在目录一律拒绝覆盖。写入中断可以留下没有 manifest 的不完整目录；这种目录只能丢弃，loader 不会接纳。

每个 tuple 保存 challenge 前后两次 `Target.getTargetInfo` 的完整 decoded response，包括投影不消费的 `title`、`browserContextId` 等字段；同时保存两个 decoded request、完整 SW challenge request/response、采集器自发 session nonce 和逐操作主机时间。tuple 不允许保存 pseudonymous ID、continuity boolean、derived evidence digest 或任何准入结论。

## 独立派生链

loader 固定执行：

1. 校验 bundle 位于显式 workspace root 内，枚举精确 9 文件；
2. 稳定读取 9 个 bundle 文件和 4 个 source 文件，拒绝 symlink、hardlink、物理别名、体积越界、读取期间变化、UTF-8/BOM/重复 JSON key；
3. 将 manifest 的 source/file/raw/canonical digest 与实际字节逐一交叉绑定；
4. 从完整 decoded target response 只提取 `{targetId,type,url,attached}`，从 challenge response 提取 client/build/default-v13 descriptor；
5. 不接受调用方派生字段，重新计算 target/client pseudonym、observation digest 与 evidence digest；
6. 组装既有 `sw_ab_update_runtime_client_capture_candidate_v1`，立即交给当前 policy、Schema 和 verifier 重验；
7. 重新枚举并重读 9+4 文件，要求终点文件身份和摘要与起点一致。

因此 `terminalEndpointSnapshotsMatched=true` 只表示两个端点快照一致。文件句柄没有覆盖整个验证区间，Schema 13 也没有 mutation epoch，所以以下结论继续固定：

- `overlappingFileHandleEpochEstablished=false`
- `mutationEpochCapability=absent_schema13`
- `epoch=null`
- `intervalMutationExcluded=false`
- `abaExcluded=false`

## 永久关闭的证据与授权账

- `trustClass=untrusted_decoded_browser_api_transcript_candidate`
- `status=capture_incomplete`
- `executionAdmission=closed_missing_selected_https_origin`
- `cdpWireBytesCaptured=false`
- `devtoolsWebSocketFramesCaptured=false`
- `browserTransportAuthenticityVerified=false`
- `callerSuppliedPageAuthenticityVerified=false`
- `runtimeCollectorProvenanceVerified=false`
- `realBrowserExecutionVerified=false`
- `offlineTransportClosureVerified=false`
- `usableForRuntimeEvidence=false`
- `usableForCandidateAssembly=false`
- `formalReleaseEvidenceReceipt=false`
- `publicDeploymentAuthorized=false`
- `expertClaimsAuthorized=false`
- `rightsLegalConclusionAuthorized=false`
- verifier CLI 固定退出 `1`

该家族只有独立 `test:` 与 `verify:` 入口，没有 `capture:`、pre/post lifecycle 或正式 receipt；不进入 `test:release-evidence`、默认 13-receipt allowlist、Release workflow、正式 rollback admission、既有 SW composition 或根 npm lifecycle closure。

## 本地机械验证

独立测试 15/15 通过，覆盖完整 decoded 对象保留、9 文件顺序、byte→projection 派生、递归冻结、derived-field 注入、tuple 摘要漂移、自洽重绑后的 continuity 破坏、额外文件、重复 key、authority 提升、伪造 epoch、hardlink、覆盖拒绝和 CLI 固定退出 1。

本轮没有运行浏览器、网络、公开 HTTPS、Service Worker 更新、离线矩阵、双标签页、provider、部署或回滚；运行时证据仍为 0。本文件只登记工程合同，不登记内容真值、专家真值、权利法律结论、发布就绪或公开发布授权。
