# B 阶段正式 Release Evidence 同锁定产物回执修正（2026-08-27）

## 结论

本轮关闭了一个可达的正式工程证据假阳性：此前 Release workflow 虽先构建并锁定 `dist/web`，但 `boot` 与 `backup` 回执仍调用通用 E2E 配置，由 `serve:e2e` 另建 `.vite/playwright-web`，且没有形成正式 Edge/Chrome 双项目回执。因此两项通过可能来自另一份产物，不能证明锁定发布产物通过相应用例。

现在 `boot / backup / pwa / web-v1-flow` 四项正式浏览器回执都只预览同一份已锁定 `dist/web`。这只是机械证据链修正；本轮没有执行构建、浏览器、正式 generator/verifier、公开主机、部署或回滚。

## 修正后的正式矩阵

| 回执 | 正式配置 | 每个项目用例数 | 项目 | 产物入口 |
| --- | --- | ---: | --- | --- |
| `boot` | `playwright.release-boot-artifact.config.ts` | 6 | Edge、Chrome | `preview:release-artifact` |
| `backup` | `playwright.release-backup-artifact.config.ts` | 4 | Edge、Chrome | `preview:release-artifact` |
| `pwa` | `playwright.release-pwa-artifact.config.ts` | 1 | Edge、Chrome | `preview:release-artifact` |
| `web-v1-flow` | `playwright.release-web-v1-artifact.config.ts` | 1 | Edge、Chrome | `preview:release-artifact` |

`full-backup-cross-browser.spec.ts` 会在用例内部自行启动 Chrome 与 Edge，不使用项目 fixture，因此继续留在通用/nightly 路径，不计入正式 backup 回执。

## Artifact 端点绑定

正式 runner 在每项浏览器命令启动前与结束后分别重读并验证：

- lock 文件路径与文件 SHA-256；
- lock canonical digest 与 artifact-set digest；
- evidence ID、build、manifest、文件数；
- 完整 `legacy-v13 / targetSchema 13 / migrationId null` descriptor。

任一端点漂移都会让该回执失败；generator 与 formal verifier 还会重新核对四项原始回执的端点绑定。Schema、Release Evidence、formal receipt 与下游 deployed-host/PWA/rollback 消费者现在都精确携带同一 `artifacts.mutationBoundary`，明确登记 `mutationEpochCapability=absent_schema13`、`intervalMutationExclusionClaimed=false`、`abaMutationExclusionClaimed=false`：它只证明命令两端的确定性快照相等，不宣称执行区间内不存在同权限 mutation 或 ABA。

后续独立复核还关闭了持久路径别名与 JSON 双读窗口：artifact inventory 会拒绝 symlink、junction/reparse、非普通文件和 hardlink，artifact root 也不得经自身或祖先 alias 到达；raw receipt、browser summary 和 artifact lock 均以同一持有句柄的一份 Buffer 完成摘要与解析。该修正仍不是跨文件连续 mutation epoch。详见 [B 阶段正式证据与候选回执终点复验补强](./B阶段正式证据与候选回执终点复验补强-2026-08-27.md)。

## 治理闭包

正式 13 项 receipt 命令与四个 Playwright `webServer.command` 的 npm/lifecycle/workspace 可达闭包现为 32 个脚本三元组，canonical SHA-256：

`eaba293e79453b250ce1d3520989da0dad184843e40dd28a9231c296f2bc9092`

通用 `serve:e2e / build:e2e / preview:e2e` 不再从正式根可达。命令、配置矩阵、testMatch、每项目精确计数、执行次序或闭包漂移均失败关闭。

## 本地验证账

- boot 配置 `--list`：2 个文件、Edge/Chrome 共 12 个 tuple；没有启动浏览器。
- backup 配置 `--list`：4 个文件、Edge/Chrome 共 8 个 tuple；没有启动浏览器。
- 新配置、严格 reporter/result 的定向 strict TypeScript：通过。
- `test:release-evidence`：179/179 通过，其中 Release Evidence core 为 55。
- `verify-release-governance.test.mjs`：146/146 通过。
- provider/host candidate receipt 发布后来源与输出终点复验：分别 20/20、22/22 通过；两者仍为仓外候选证据，不进入正式 receipt 集合。
- SW 两代夹具与 A→B 离线候选合同：47/47 通过；关键源码集合重新冻结为 `e3a6d11c9ddafe11327f4a8e45e6628073025e13c04a72e9278b9c5c5e13e64d`。
- `check:release-governance`：通过；保持 `legacy-v13 / 13 / null`、候选不准入、主机未选择、`publicDeploymentAuthorized=false`、`expertClaimsAuthorized=false`。

## 未建立的证据

- 没有生成当前工作区正式 Release Evidence；dirty/untracked 状态不能冒充正式证据。
- 没有执行默认 Web build、全仓 typecheck 或受限文件读取。
- 没有执行 Chrome/Edge、PWA/Service Worker、真实仓储边界、公开 HTTPS 主机、部署与 A→B→A 回滚。
- 没有建立内容真值、专家真值、来源许可、法律结论、发布就绪或公开发布授权。

因此 B 阶段仍未通过；本轮只把正式工程回执从“可能测试另一产物”收紧为“必须绑定同一锁定产物”。
