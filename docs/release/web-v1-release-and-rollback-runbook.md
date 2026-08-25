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
node scripts/run-release-evidence-command.mjs --id boot --output tmp/release-evidence-receipts/boot.json -- npm run test:e2e:boot
node scripts/run-release-evidence-command.mjs --id pwa --output tmp/release-evidence-receipts/pwa.json -- npm run test:e2e:pwa
node scripts/run-release-evidence-command.mjs --id web-v1-flow --output tmp/release-evidence-receipts/web-v1-flow.json -- npm run test:e2e:web-v1-flow
node scripts/run-release-evidence-command.mjs --id cross-schema-v13-v16 --output tmp/release-evidence-receipts/cross-schema-v13-v16.json -- npm run test:e2e:cross-schema-v13-v16
node scripts/run-release-evidence-command.mjs --id orphaned-v13-recovery --output tmp/release-evidence-receipts/orphaned-v13-recovery.json -- npm run test:e2e:orphaned-v13-recovery
node scripts/run-release-evidence-command.mjs --id built-contract --output tmp/release-evidence-receipts/built-contract.json -- npm run verify:built-release-storage-manifest
node scripts/generate-release-evidence.mjs --channel default-v13 --dist dist/web --receipts tmp/release-evidence-receipts --output dist/web/release-evidence.json --require-receipts boot,build,built-contract,cross-schema-v13-v16,evidence-tooling,governance,orphaned-v13-recovery,pwa,typecheck,unit,web-v1-flow
node scripts/verify-release-evidence.mjs --input dist/web/release-evidence.json --receipts tmp/release-evidence-receipts
```

`pwa` 与 `web-v1-flow` 回执除命令和退出码外，还必须各自产生一份绑定摘要：
`msedge`、`chrome` 每个项目都只能有一项实际通过，`skipped`、`fixme`、预期失败、
重试后 flaky、unexpected 或额外项目均失败关闭。摘要保存在
`tmp/release-evidence-receipts/browser-results/`，其路径、SHA-256 与规范内容进入对应命令回执；
缺失、篡改或无法复核时不得生成通过的默认 v13 工程证据。

以上命令集合来自机器策略，不得用同名但不同命令的回执替代。dirty 工作树或未绑定构建只能使用显式本地参数生成工程快照，工程门必须保持 `false`。

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

## 发布签字门

- Release Evidence 工程门通过。
- Git 工作树干净且证据 ID 与构建 meta 一致。
- 真实发布历史经所有者确认。
- 真实托管响应头通过验证并从 Report-Only 晋级为已验证阻断策略。
- 真实 v13 数据副本发布和回滚演练通过。
- 对外文案没有把工程证据冒充专家真值。
- 许可证与内容权利负责人已签字。
