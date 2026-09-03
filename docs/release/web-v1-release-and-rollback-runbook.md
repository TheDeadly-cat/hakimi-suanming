# Web v1 发布与回滚手册

## 不变量

1. 默认发布身份保持 `legacy-v13 / targetSchema 13 / migrationId null`，除非正式批准新的 ReleaseStorageManifest。
2. 不原地破坏性升级 v13；候选迁移只写独立影子数据库。
3. 不把 v16 数据反向写回 v13。
4. 应用壳、Service Worker、数据库 generation 和证据包必须作为一个发布单元。
5. 工程证据、专家验证、内容授权和公开发布许可分别记录。

## 候选生成

```powershell
npm ci
npx playwright install chrome msedge
$env:HAKIMI_RELEASE_EVIDENCE_ID = node scripts/compute-release-evidence-id.mjs --channel default-v13
node scripts/run-release-evidence-command.mjs --id governance --output tmp/release-evidence-receipts/governance.json -- npm run check:release-governance
node scripts/run-release-evidence-command.mjs --id evidence-tooling --output tmp/release-evidence-receipts/evidence-tooling.json -- npm run test:release-evidence
node scripts/run-release-evidence-command.mjs --id typecheck --output tmp/release-evidence-receipts/typecheck.json -- npm run typecheck
node scripts/run-release-evidence-command.mjs --id unit --output tmp/release-evidence-receipts/unit.json -- npm test
node scripts/run-release-evidence-command.mjs --id build --output tmp/release-evidence-receipts/build.json -- npm run build
node scripts/release-artifact-identity.mjs --write --dist dist/web --lock tmp/release-artifact-identity.json
node scripts/run-release-evidence-command.mjs --id boot --output tmp/release-evidence-receipts/boot.json -- npm run test:release:boot-artifact
node scripts/run-release-evidence-command.mjs --id backup --output tmp/release-evidence-receipts/backup.json -- npm run test:release:backup-artifact
node scripts/run-release-evidence-command.mjs --id pwa --output tmp/release-evidence-receipts/pwa.json -- npm run test:release:pwa-artifact
node scripts/run-release-evidence-command.mjs --id web-v1-flow --output tmp/release-evidence-receipts/web-v1-flow.json -- npm run test:release:web-v1-artifact
node scripts/run-release-evidence-command.mjs --id cross-schema-v13-v16 --output tmp/release-evidence-receipts/cross-schema-v13-v16.json -- npm run test:e2e:cross-schema-v13-v16
node scripts/run-release-evidence-command.mjs --id orphaned-v13-recovery --output tmp/release-evidence-receipts/orphaned-v13-recovery.json -- npm run test:e2e:orphaned-v13-recovery
node scripts/run-release-evidence-command.mjs --id artifact-stability --output tmp/release-evidence-receipts/artifact-stability.json -- node scripts/release-artifact-identity.mjs --verify --dist dist/web --lock tmp/release-artifact-identity.json
node scripts/run-release-evidence-command.mjs --id built-contract --output tmp/release-evidence-receipts/built-contract.json -- npm run verify:built-release-storage-manifest
node scripts/generate-release-evidence.mjs --channel default-v13 --dist dist/web --receipts tmp/release-evidence-receipts --artifact-lock tmp/release-artifact-identity.json --output dist/web/release-evidence.json --require-receipts artifact-stability,backup,boot,build,built-contract,cross-schema-v13-v16,evidence-tooling,governance,orphaned-v13-recovery,pwa,typecheck,unit,web-v1-flow
node scripts/verify-release-evidence.mjs --input dist/web/release-evidence.json --receipts tmp/release-evidence-receipts --output tmp/release-evidence-receipts/formal-verification.json
```

选择真实托管平台、写入 canonical HTTPS origin，配置根/SW/Evidence/代表性深链四类精确 HTTP→HTTPS redirect，并确保 `_headers` 与 `release-evidence.json.sha256` 在远端返回 404/410 后，才能运行 deployed-host 矩阵：

```powershell
npm run verify:deployed-security-headers -- https://staging.example.invalid --artifact-root dist/web --evidence dist/web/release-evidence.json --receipts tmp/release-evidence-receipts
```

命令中的 URL 只是格式占位，checked-in policy 仍为 `unselected / canonicalOrigin null`，不能直接替换一个临时地址来绕过。CLI 必须先通过 real-host policy preflight，再由内部唯一授权入口重新运行 formal Release Evidence verifier；仅 Schema-valid 的本地 expectation 不得进入真实网络门。随后还要通过 policy 原始字节/Evidence sidecar/artifact lock/index/SW AST 交叉、全部 DNS A/AAAA 公网地址检查，以及同一 artifact 的全部公开文件、深链、远端 Evidence、non-public 404/410、HSTS/危险行为头/cache/UTF-8 MIME/identity content coding/redirect/流式 hash 矩阵，才可记录技术范围内的 `realHostVerified`。mocked contract、localhost、单 URL curl 或本地 `_headers` 一致性均不能替代。

即使真实 host 技术矩阵未来通过，DNSSEC/连接级 pinning、HSTS preload/首次访问抗降级、CSP browser enforcement、PWA/SW Chrome/Edge、真实仓储、部署与回滚、许可证、内容权利、专家真值和公开发布授权仍是独立门。

`boot`、`backup`、`pwa` 与 `web-v1-flow` 四项回执除命令和退出码外，还必须各自产生一份绑定摘要。
`msedge`、`chrome` 每项目的精确测试数依次为 `6 / 4 / 1 / 1`；`skipped`、`fixme`、预期失败、
重试后 flaky、unexpected 或额外项目均失败关闭。摘要保存在
`tmp/release-evidence-receipts/browser-results/`，其路径、SHA-256 与规范内容进入对应命令回执；
缺失、篡改或无法复核时不得生成通过的默认 v13 工程证据。

`build` 后立即生成仓外 `release-artifact-identity` 锁；四项正式浏览器门都只执行
`vite preview` 服务该锁定的 `dist/web`，不得调用 `vite build` 或 `.vite/playwright-web`。
每项命令前后还必须把同一个 lock SHA-256、lock digest、artifact-set digest、build、manifest 和 v13 descriptor
写入其原始命令回执；`artifact-stability`、generator 与 formal verifier 会再次交叉复核。该机制只证明端点快照，
明确记录 `mutationEpochCapability=absent_schema13` 与“不声称排除区间 ABA”；任一可见字节漂移均失败关闭。

证据包必须把 `index.html`、`manifest.webmanifest`、`sw.js` 与 `_headers`
分别登记为显式必需组件，并记录精确路径、字节数和 SHA-256；全文件清单摘要不能替代这些组件身份。
若任一步骤失败，工作流只上传已经产生的命令回执作为
`failure-diagnostics`，不得把未完成的 `dist/web` 当成候选产物或正式 Release Evidence。

Release Evidence JSON 必须先通过 checked-in draft 2020-12 Schema 的实际执行门：generator 在任何 evidence 文件写入前验证；verifier 在 Git 状态读取前验证。Schema 封闭所有对象，并精确约束完整 descriptor 与浏览器摘要 binding；未知字段、坏时间、重复唯一项或未审核 Schema 关键词均失败关闭。

以上命令集合来自机器策略，不得用同名但不同命令的回执替代。generator 默认从 default-v13 策略派生完整回执集合；显式 `--require-receipts` 只能作精确相等断言，实际记录的 receipt ID 也必须与策略集合精确相等，不能附加策略外回执。默认 v13 descriptor 的全部 11 个字段、repository、branch 与完整 toolchain 都必须可重算。dirty 工作树或未绑定构建只能使用显式本地参数生成工程快照，工程门必须保持 `false`；`--allow-dirty` 只放宽 clean-source 谓词，`--allow-unbound` 只放宽 artifact binding 谓词，不能放宽 descriptor、回执、浏览器或 artifact 稳定性门。

## 干净 profile 演练

1. 新建浏览器 profile，确认没有站点数据库或缓存。
2. 安装默认 v13 候选，创建最小数据并导出 full v1.2 备份。
3. 断网关闭全部页面，从 `/settings`、`/settings/data` 和案例深链冷启动。
4. 核对设置页 generation、Schema、build、manifest digest 和 evidence ID。
5. 验证不同 profile 无法读取原 profile 的 IndexedDB。

## 真实 v13 数据副本演练

此步骤必须由数据所有者提供只读副本或批准的脱敏副本；合成 fixture 不得冒充真实用户数据。

1. 记录源库原生快照、分区计数和摘要。
2. 导出并只读预检 full v1.2 安全备份。
3. 在隔离 profile 运行候选升级、双标签页、旧 SW、离线和中断场景。
4. 核对源 v13 逐项不变，目标摘要与回执一致。
5. 执行应用壳/SW 回滚，证明 v13 仍可只读打开或导出。

## 回滚

1. 停止继续分发候选，不删除任何浏览器数据库。
2. 恢复与 v13 descriptor 匹配的应用壳和 Service Worker。
3. 若旧壳无法安全启动，进入只读恢复并导出 v13；不得猜测兼容。
4. 不修改 release-control 指针来伪造回滚，不绕过 mutation epoch。
5. 保存失败产物、证据包、浏览器版本和脱敏错误码。

当前这部分仍是操作要求，不是已经取得的回滚证据。预部署的正式 Release Evidence 继续保持精确 13 项回执，不把尚未发生的回滚塞进同一次构建资格；回滚另由后部署 `rollback-evidence` Schema、policy、actor registry 和离线 verifier 分账。现有两代 Service Worker 夹具只证明 cache fallback 行为，不等于恢复 baseline Service Worker 二进制，也不替代候选/baseline artifact lock、Chrome/Edge、真实主机和获批现实 v13 数据副本的演练。

只有在真实平台、canonical HTTPS origin、baseline/candidate 两份正式 Release Evidence 及其 `formal-verification.json`、三阶段真实主机回执、Chrome/Edge 原始运行时回执、获批私有数据包和不同操作者/验收者签名均已取得后，才可在私有证据目录运行：

```powershell
node scripts/verify-rollback-evidence.mjs --input private/rollback/run-001-private/rollback-evidence.json --baseline-root private/rollback/run-001-baseline --candidate-root private/rollback/run-001-candidate --receipts-root private/rollback/run-001-receipts --private-root private/rollback/run-001-private
```

四个 root 必须是工作区内 realpath 互异且彼此不嵌套的同级目录；Evidence input 与 sidecar 必须位于 `private-root` 内，artifact、receipt 和私有数据域不得共用 junction、symlink 或父子目录。

verifier 只复核既有 A→B→A 证据，不部署、不触发回滚、不读取密钥明文，也不生成现实演员或数据所有者同意。当前 checked-in hosting policy 仍为 `unselected / canonicalOrigin null`，actor registry 为零受信演员；独立复核还确认 formal 语义重放、原始 host/CDP/provider receipt、HMAC 重算、actor registry 治理根签名、逐阶段冻结和离线回滚观察均未实现，因此 policy 的 `executionAdmission` 也固定关闭。即使临时填入主机或演员，CLI 仍必须以 `ROLLBACK_EXECUTION_ADMISSION_CLOSED` 失败，不能生成 `passed` 的现实回滚结论。Schema 13 没有 mutation epoch 能力，证据必须写作 `absent_schema13` 和空 epoch；不得伪造 epoch 0。详见 [独立 v13 真实回滚证据机械门](./独立v13真实回滚证据机械门-v1-2026-08-26.md)。

另有一条独立的 rollback/provider **投影组合候选**：它只消费已持久化 provider sequence 的独立 verifier，并在其 overlapping checkpoint 内持有 rollback evidence、sidecar、两张 deployment receipt 与当前 policy sources；两张 receipt 的语义校验与 formal rollback 共用同一个纯 helper。该候选只接受自身已经 `failed`、有 failure 且 20 个 formal gates 全为 false 的 rollback 输入，输出固定 `untrusted_candidate_composition / not_admitted / usableForAdmission=false`，CLI 固定退出 `1`。当前 provider v1 要求 `unselected/null` policy，而 formal rollback 要求 selected canonical HTTPS host，二者同一 policy epoch 明确不可同时成功；候选不得把这一互斥或 `ROLLBACK_EXECUTION_ADMISSION_CLOSED` 解释成正式回滚通过。详见 [B 阶段 rollback 与 provider 序列投影组合边界](./B阶段rollback与provider序列投影组合边界-v1-2026-08-27.md)。

formal rollback 的 phase receipt/hash-chain 现另有纯合同 helper，独立锁定 baseline/candidate/rollbackObserved 的 default-v13 runtime identity，以及 host、Edge、Chrome、deployment 和 previous-phase 摘要关系。私有文件 wrapper 只在真实读取并验证既有 receipt 后调用它；formal admission 仍位于全部下游之前，且 helper 不返回 gates、claims 或 authority。其 30 项 rollback 合同测试不证明正式文件 wrapper、原始 transport、现实浏览器/provider、私有数据或真实回滚已执行。详见 [B 阶段 formal rollback phase 哈希链合同验证](./B阶段formal-rollback-phase哈希链合同验证-v1-2026-08-27.md)。

## 发布签字门

- Release Evidence 工程门通过。
- Git 工作树干净且证据 ID 与构建 meta 一致。
- 真实发布历史经所有者确认。
- 真实托管响应头通过验证并从 Report-Only 晋级为已验证阻断策略。
- 真实 v13 数据副本发布和回滚演练通过。
- 对外文案没有把工程证据冒充专家真值。
- 许可证与内容权利负责人已签字。
