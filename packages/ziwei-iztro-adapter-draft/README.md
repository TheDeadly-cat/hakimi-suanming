# iztro 2.5.8 隔离适配器草案

这是一个只供本地研究的 Node 原型，不会被八字 Web 应用导入，不写 IndexedDB，不进入 full backup，也没有产品路由。包保持 `private`、`0.0.0-draft.0` 和空 `exports`。

它实际做的事：

- 锁定 `iztro@2.5.8` / commit `9d39f1743bf31c2b3c635c9b9556215d9c90ee2c` / npm tarball integrity；
- 通过根 `overrides` 和 lockfile 固定 `dayjs@1.11.21`、`i18next@23.16.8`、`lunar-lite@0.2.8`、`lunar-typescript@1.8.6`、`@babel/runtime@7.29.7`；
- 用单一闭包工件绑定六个节点的版本、下载地址、SRI、请求边和精确解析边，并在 Worker 启动前核对当前 `package-lock.json`；该摘要只证明锁文件闭包身份，不声称逐字节重验已安装的 `node_modules`；
- 从固定包内生成 162 个星曜键双射注册表、10×4 四化表和按项目子至亥顺序保存的 20×12 亮度表；
- 每次计算新建一个有内存上限的 Worker，完整写入规则后只计算一次，等待唯一回执和正常退出；
- 把上游寅起数组重排为项目的子至亥宫位顺序，未知星名、宫名、亮度、四化或大限步进一律失败关闭；
- 依据“出生年支阴阳 × 排盘用性别”保存和复核大限顺逆；
- 最后经过草案的严格 Schema 和四层 canonical SHA-256 验证后才返回工程工件。
- 隔离回归用 DATA.GOV.HK 发布的香港天文台年度 CSV 固定公农历日期对照；原有 2025 年 5 条小样例保留，正式离线边界门扩展为 2023–2028 六个完整年度、2,192 日和 74 个月界对。它只验证 `calendar_resolution` 子集，不证明时辰、干支或紫微规则。

本地运行一个不持久化的工程预览：

```powershell
node packages/ziwei-iztro-adapter-draft/src/demo.ts 1995-08-18 6 male
```

参数依次是公历 `YYYY-MM-DD`、时辰索引 `0..12`、`male|female`。输出是结构事实、Worker/引擎回执和摘要，不包含断语。

## 官方 civil-date 边界门

`fixtures/hko-data-gov-hk-calendar-boundaries-2023-2028.json` 保存六个年度资源的精确 URL、响应字节数、SHA-256、BOM、换行和行数，以及由所有“后一天为农历初一”的相邻记录构成的 74 对矩阵。它覆盖每年农历新年、全年可见月末/月初、2023 闰二月、2025 闰六月，并额外记录 2028 闰五月。

正式定向测试不联网。`fixtures/hko-data-gov-hk-calendar-source-snapshots-2023-2028.json` 以 gzip+Base64 保存可还原的六份原始响应体；测试先逐字节复核 size/SHA，再解析全部 2,192 行、显式复核 5 个 Dec 31→Jan 1 跨文件接缝，并从原文重建矩阵：

```powershell
npx vitest run --config apps/web/vitest.config.ts packages/ziwei-iztro-adapter-draft/src/official-calendar-evidence.test.ts
```

需要人工确认 DATA.GOV.HK 当前资源仍与锁定工件相同时，才运行可选联网审计；它在读取前要求 `Content-Length` 与锁定 size 相等，再按 64 KiB 硬上限分块读取。HTTP 200 + `Not Available`、缺失或不符的长度、超限响应、内容变动、非严格 `d-MMM-yy`、简体 `闰`、异常 BOM/换行或日期不连续都会失败关闭：

```powershell
node packages/ziwei-iztro-adapter-draft/scripts/audit-hko-calendar-boundary-matrix.ts
```

来源为 [DATA.GOV.HK 公历与农历日期对照表](https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table)，使用和署名边界见 [DATA.GOV.HK 条款](https://data.gov.hk/tc/terms-and-conditions)。此门只支持香港民用日期的公历→农历归一化证据；时辰、晚子换日、四柱、太阳时和紫微规则全部在声明范围外。

## 独立浏览器工程探针

浏览器探针仍只属于本包，不接入 `apps/web`、八字路由、IndexedDB、localStorage、Service Worker、备份或升级。计算不主动访问外网，也不持久化出生输入与结果；页面本身只从启动命令指定的同源本机地址加载构建资源。它把输入交给每次新建的一次性 Browser Web Worker，Worker 返回 Browser 专属 `ziwei_browser_natal_engineering_artifact`：完整包含 input、冻结 rule snapshot、facts、provenance/evidence、Browser 请求/Worker/时间/来源身份，以及 input/rule/facts/artifact 四层 canonical SHA-256。

该工件不是、也不能冒充强制 `runtime: node` 的 Node fixture receipt。主线程会严格拒绝未知或缺失字段，重新计算四层摘要，并核对回包信封、当前 Browser 源码图和 Worker 源码身份；全部通过后才提交显示。显示宫位、星曜类别、亮度、四化和摘要由主线程从已验真 facts/rule snapshot 本地派生，协议拒绝 Worker 自报的同数量显示文本。

在仓库根目录执行：

```powershell
Set-Location packages/ziwei-iztro-adapter-draft
node ..\..\apps\web\node_modules\vite\bin\vite.js build --config vite.browser-preview.config.mjs --configLoader runner
node ..\..\apps\web\node_modules\vite\bin\vite.js preview --config vite.browser-preview.config.mjs --configLoader runner --host 127.0.0.1 --port 4216 --strictPort
```

然后只在本机打开 `http://127.0.0.1:4216/`。专用 Vite 门在构建时调用既有 Node 适配器生成 digest-bound 规则快照，并注入固定源码图身份；非专用构建触发 sentinel 后会立即失败关闭。源码图当前精确覆盖六个 Browser 计算/验真/显示源文件，以及直接依赖的 `src/contract-bridge.ts` 和 `src/iztro-2.5.8-lock-closure.json`；其中单独保存 `browserWorkerSourceSha256`。Browser Worker 会重新核对规则、表格与依赖闭包摘要，并明确区分 Browser runtime adapter 和 Node 参考引擎身份。独立类型检查与定向验真测试：

```powershell
npx tsc --noEmit -p packages/ziwei-iztro-adapter-draft/tsconfig.browser-preview.json
npx vitest run --config apps/web/vitest.config.ts packages/ziwei-iztro-adapter-draft/src/browser-artifact.test.ts
```

四层 SHA-256 与源码图摘要都是无密钥完整性校验：可以发现保存内容和当前构建身份的变化，但不能认证某份历史工件确实由该 Worker 在所记时间执行。工件固定 `productionEligible=false`、`expertTruthClaimed=false`，也明确不包含八字 Case/Revision、生产数据库或完整备份。

当前明确不支持：

- 地盘、人盘；
- 闰月且晚子时的交叉边界；
- 自定义派别、解释文本、专家真值、金标签发；
- 正式浏览器产品入口、数据库、备份与升级；当前 Browser 工件仅是本包内可独立验真的隔离工程工件。

`upstream_regression` 只表示固定依赖图在当前 Worker 适配器下的工程行为回归，不是专家真值。
