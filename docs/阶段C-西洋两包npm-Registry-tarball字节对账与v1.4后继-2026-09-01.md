# 阶段 C：西洋两包 npm Registry tarball 字节对账与 v1.4 后继（2026-09-01）

## 1. 结论

本轮仅对 `astronomy-engine@2.1.19` 与 `zod@4.4.3` 做了一次匿名、公开 npm Registry 精确版本元数据与 tarball 字节观察，并把结果追加为非正式 child 与非正式 v1.4 successor。

- 元数据中的 `dist.integrity`、`dist.shasum`、`dist.tarball` 分别与下载字节、工作区 `package-lock.json` 的 `integrity` / `resolved` 对上。
- 两个 tarball 内的 `package/package.json` 都与当前本机已安装 `package.json` 字节完全一致。
- `astronomy-engine` tarball 的精确 8 个成员中没有独立 LICENSE；本机精确路径 `node_modules/astronomy-engine/LICENSE` 也缺失。项目内两份 1,095-byte 受控副本单独记账，不能说成 tarball 成员，也没有拿不存在的 tarball LICENSE 与它们作伪对账。
- `zod` tarball 的 `package/LICENSE` 与本机 `node_modules/zod/LICENSE` 均为 1,072 bytes，SHA-256 完全一致。
- v1.4 只替换 `western.rights.engine-code-and-distribution` 原有的一个 partial candidate；其余 27 个 subject 相对 v1.3 整对象 exact。结果仍为 1 partial、`0/28`，正式 v1 不变。

上述只是一次字节与声明字段对账，不是 publisher 身份、签名、first-seen、真实性、许可适用性、权利或法律结论。

## 2. 在线观察端点和字节

### Astronomy Engine 2.1.19

- metadata：`https://registry.npmjs.org/astronomy-engine/2.1.19`
- metadata：1,648 bytes；SHA-256 `b755250242589d86527538b881b51bd4714b72ca90d645f2ea4cf80d8315591e`
- tarball：`https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-2.1.19.tgz`
- tarball：493,468 bytes
- SHA-512 SRI：`sha512-8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==`
- SHA-1：`41b9fd2afb7eba3485e3803cbd9033011f8557af`
- SHA-256：`605e9e9ebd0a364f1c5b556f10c1f163e4b8aa63b97ada1ab72e960d73189cdd`
- archive entry count：8；LF inventory SHA-256 `823d4e6aa658c241ec55128668c4011fd5e403b6feff92a4baa90b96bed765a8`
- `package/package.json`：1,078 bytes；SHA-256 `d035702763839ae11f41600cf4b8210005672658dcb19cea4a09591078af4931`
- standalone LICENSE member：0

### Zod 4.4.3

- metadata：`https://registry.npmjs.org/zod/4.4.3`
- metadata：4,033 bytes；SHA-256 `116e556cd34d18b4bc632e546260717c54b6a3f58bbf1c304c9962f7f783eb18`
- tarball：`https://registry.npmjs.org/zod/-/zod-4.4.3.tgz`
- tarball：759,588 bytes
- SHA-512 SRI：`sha512-ytENFjIJFl2UwYglde2jchW2Hwm4GJFLDiSXWdTrJQBIN9Fcyp7n4DhxJEiWNAJMV1/BqWfW/kkg71UDcHJyTQ==`
- SHA-1：`b680f172885d18bbebf21a834ea25e55a1bbf356`
- SHA-256：`ee38f17f533fd500610685a483ae2f413c26f4eb33a51684314563c8d60f279c`
- archive entry count：718；LF inventory SHA-256 `3364125e08bf6205921b47d7110823c4bbd36087b712269e4dda3a415e789221`
- `package/package.json`：3,796 bytes；SHA-256 `c630bd10b52dcf71c112a2bf78dbf2734b9db58d62de663b8d86c2ec2c8cda2e`
- `package/LICENSE`：1,072 bytes；SHA-256 `3f1189b28e3866e0d979968d466b78f813f76827cfdca1fbb124cc0a5c8841f8`

HTTP 200、TLS、Registry 域名或 ETag 都不建立 publisher 身份、发布者签名、首次出现时间或不可替换性。元数据响应原文和 tarball 没有留在仓库；child 只冻结端点、响应体身份、下载字节摘要及精确成员观察。

## 3. 临时目录与脚本边界

- `npm_config_ignore_scripts=true`。
- 只做匿名 HTTP GET、tar listing 和指定成员只读提取；没有安装或执行包，也没有生命周期脚本。
- 另用第二个固定系统 Temp 目录执行了 `npm pack <exact-version> --ignore-scripts --json --pack-destination <temp>`；环境仍为 `npm_config_ignore_scripts=true`。两份 pack 输出的 size、SHA-1、SHA-512 SRI 和实际落地 tarball SHA-256 均与上节直接下载字节完全一致。
- 临时目录固定为 `C:\Users\Administrator\AppData\Local\Temp\hakimi-western-registry-20260901-7f6c9321`。
- 删除前重新解析绝对路径，确认位于系统 Temp，只有 4 个文件、0 个子目录。
- 两次 `Remove-Item` 调用都在执行前被命令安全层拒绝；没有扩大路径或跨 shell 删除。随后在同一 PowerShell 中对 4 个固定文件使用显式 `[System.IO.File]::Delete`，再对空目录使用 `[System.IO.Directory]::Delete(..., $false)`。
- 最终 `Test-Path` 为 false，临时材料已清理。child 忠实记录了 Remove-Item 未执行和显式 .NET 删除的差异，不能表述为 Remove-Item 成功。
- 第二个 npm-pack 临时目录 `C:\Users\Administrator\AppData\Local\Temp\hakimi-western-npm-pack-20260901-1c9487ad` 删除前也确认位于系统 Temp、仅 2 个文件且无子目录；同样以两个显式 `File.Delete` 和一次非递归空目录删除清理，最终 `Test-Path=false`。

## 4. 新增冻结身份

### Registry-tarball parity child

- 路径：`content/system-admission/western-registry-tarball-parity-observation-child.v1.json`
- childId：`hakimi.western.registry-tarball-parity-observation-child/1.0.0`
- childDigest：`d449f225a10c8a8a4e63a9e6990ef5c9a4cced687d1d5d4bacba8146af749a60`
- raw：13,945 bytes
- raw SHA-256：`92aaea4cc66836c25c5c810d69a9154812361ebb0db91c7467e992a3b9c3413a`
- parent：v1.3 private brand 与原 current-basis child private brand
- formal effect：none

### Western source-binding v1.4

- 路径：`content/system-admission/western-source-binding-requirements.v1.4.0.json`
- ledgerId：`hakimi.western-astrology.source-binding-requirements/1.4.0`
- ledgerDigest：`d2e13b51abfc0a4247d6b083f8121f5681a925122edcc73ef31819d9e3d23243`
- raw：42,349 bytes
- raw SHA-256：`da755745c327b72aa617e40aed8d37a5e3f2c69aeb367dbfd9262dd5cece9f35`
- v1.3 parent：private brand verified、nonformal、active effect none
- v1.4：nonformal、active effect none；正式 v1 仍 declared current 且 mechanically stale

## 5. 为什么仍只是 partial

`western.rights.engine-code-and-distribution` 仍缺：

1. publisher / package authenticity 与不可替换来源证明；
2. 作品层、精确版本/edition 层、载体层的权利依据；
3. 许可适用性、组合兼容性和 notice 义务的独立权利审查；
4. SOFA、Swiss Ephemeris 及完整产品依赖/分发闭包；
5. redistribution 明确授权和权利法律结论；
6. source body、exact locator、最小充分 exact quote 与 frozen binding；
7. 现实专家审定、正式 owner admission、正式 Manifest/Registry 接入。

因此 `exactLocatorEstablished=false`、`exactQuoteStored=false`、全部三层 rights=false、`rightsLegalConclusionEstablished=false`、`redistributionAuthorized=false`、`countsTowardFrozenBindingGate=false`、`subjectFullySatisfied=false`。

## 6. 定向验证

```powershell
node --test --test-concurrency=1 scripts/verify-western-registry-tarball-parity-observation-child.test.mjs
node --test --test-concurrency=1 scripts/verify-western-source-binding-requirements-registry-tarball-successor.test.mjs
node scripts/verify-western-registry-tarball-parity-observation-child.mjs
node scripts/verify-western-source-binding-requirements-registry-tarball-successor.mjs
```

- child：10/10 passed。
- v1.4 successor：10/10 passed。
- 两条固定路径 CLI 均 exit 0。
- 6 个新 `.mjs` 的 `node --check` 全部通过。

没有运行 Git、全仓 typecheck、默认 Web build、浏览器、PWA、Service Worker、公开主机、部署或回滚验证；没有读取受限文件。

## 7. 分账终态

- 工程证据：两包 metadata/tarball/lock/local member parity 已观察。
- 浏览器/运行时证据：未评估。
- 内容真值：未建立。
- 专家真值：未建立；独立专家意见 0。
- 权利法律判断：未建立；不能再分发的材料仍须 private 或 link-only。
- 发布就绪：false。
- 公开发布授权：false。
- 项目上下文：`legacy-v13 / targetSchema 13 / migrationId null`。
- mutation epoch：schema 13 不可用，receipt `null`；cross-file atomic、interval integrity、ABA exclusion 均为 false。
