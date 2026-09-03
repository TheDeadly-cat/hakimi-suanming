# 阶段 D：非技术专家单条 Binding 完整无代码 A/B 复核合成演练 v1（2026-09-04）

## 结论

本轮把既有“单条合成题面”从内存展示候选接成了一条可由非技术专家操作的完整 synthetic-only 演练链：

> A/B 独立单题页面 → 专家本人输入或协调人逐字代录 → 专家逐字读回 → session-bound submission → 单文件完整回件与包外 SHA-256 sidecar → 协调人重新校验两席原始字节 → 固定七个专业字段并列 → 所有差异保持 unresolved。

专家无需运行命令、编辑 JSON、理解 hash 或理解 AI。代码、会话 pin、文件下载和 A/B 机械校验属于协调人职责。

本结论只属于工程合同与本机 synthetic 浏览器验证。现实专家仍为 `0/2`，冻结 Binding 仍为 `0/12`；没有采集、读取或生成现实专家意见。它不建立内容真值、专家真值、专家身份／资质／独立性、来源许可或法律判断、预测准确度、发布就绪或公开发布授权。

## 对“不懂 AI、也不懂代码的专家”采用的流程

1. 协调人只给专家打开 A 或 B 中一个席位；专家看不到另一席状态或意见。
2. 页面只展示一个固定合成规则候选、四个合成临界例子、已有材料和缺失材料。
3. 专家先选择“本人输入”或“专家口述、协调人逐字代录”。代录只能逐字，不得概括、润色或改成项目术语。
4. 专家回答专业问题：支持／反对／有条件支持／无法判断、无法判断原因、理由、成立条件、反例或所需证据、面向用户的风险处置、修改建议。
5. 专家只披露协助类别；使用书籍、他人、AI／软件或不便披露都可以如实选择。披露是自述，不证明实际排除或使用了任何工具。
6. 页面生成完整读回稿。专家亲自通读，或由协调人逐项读回；任何实质字段修改都会让旧读回立即失效。
7. 四项最终确认完成后只生成当前内存候选，并明确提示“请把设备交回协调人”。
8. 协调人发起下载完整回件和包外 `.sha256.txt`；页面只记录下载请求，不声称文件已保存。
9. 协调人把 A/B 两席各自的回件与 sidecar 选入独立并列页。页面重新校验 package-external raw SHA、完整 session binding、内嵌 submission／seal／checksum 交叉引用。
10. 七个专业字段只做并列：相同只记为 byte-value exact match；不同固定为 unresolved。后续应分别回问理由和适用条件，不得多数表决、平均、自动合并或由生成模型选赢家。

专家的价值因此不是“比 AI 更会写答案”，而是承担独立的专业复核角色：指出规则在哪个流派／条件下成立、哪些反例会推翻、材料是否不足，以及产品应怎样保守表达。项目仍不能由这些意见直接推导“命理准确”或“专家比 AI 准”。

## 机械边界

### 会话必须在读回前绑定

每席 draft 创建前都要从 loopback server 注入的 HTML meta 中取得完整 session binding。URL query 不参与 session 构造。session 精确覆盖：

- workflow 与 `source_tree_synthetic_integration_test` mode；
- review cycle 与 pair run；
- A/B seat 与各席不同的 session nonce；
- pair precommit raw SHA-256；
- pair manifest raw SHA-256；
- 各席不同的 seat package manifest raw SHA-256；
- synthetic rehearsal manifest、fixture、question set、candidate、Binding 与 binding identity；
- `selectedBindingCount=1`。

缺失、额外字段、全零 ID／pin、错席、固定输入漂移或读回后改变一律 fail closed。旧版无 session rehearsal submission 不能事后套入新 wrapper。

### 完整回件与 host-side 重新校验

完整回件内嵌三份逻辑独立工件：原始 session submission、file-seal receipt 和原始 submission 的 `.sha256.txt`。包外另下载 complete-return sidecar。bytes preflight 要求精确原生 `Uint8Array`，拒绝子类和其他 TypedArray，并检查：

- 最大字节数、严格 UTF-8、无 BOM、无重复 JSON key；
- package-external expected session binding；
- package-external complete-return raw SHA-256；
- 所有内嵌工件的 raw hash、byte length、文件名与角色；
- submission、seal、checksum 与 complete wrapper 的全部交叉引用；
- 固定 fail-closed governance、mutation 与 integrity boundary。

hash 只检出字节漂移，不是签名、本人认证、可信时间、首次出现或保管链。sidecar 来源本身也未认证。

### A/B 比较

比较只接受同一 cycle、pair、precommit、pair manifest 与固定输入身份的精确 A/B 两席；两席 nonce、seat package pin、complete-return raw SHA 与原始字节必须不同。输出只有七个专业字段及 `exact_match`／`difference`；差异的 `resolutionStatus` 固定为 `unresolved`。没有 winner、score、vote、average、automatic merge 或 model adjudication 字段。

## Formal successor 负向隔离

以下九类 integrated synthetic pilot record type 已全部登记到 formal successor 的 `PILOT_RECORD_TYPES` deny inventory：

1. session binding；
2. session draft；
3. session readback；
4. session submission；
5. handoff artifacts；
6. file seal receipt；
7. complete return；
8. complete-return preflight；
9. pair comparison。

formal v3 private collection 的直接 record type、未解释 opaque base64 路径，以及 v4 authenticated envelope 解密后的 inner payload 均不能把这些记录转换成正式证据。验证结果仍固定 `formalTwoOfTwoCountDelta=0 / expertGateCountDelta=0`。

## 当前工程证据

### 代码与合同测试

- integrated 定向 Node：`28/28`。
- 整个隔离 pilot Node：`135/135`；包含旧五场景、旧单题、physical candidate、return verifier、integrated session/handoff/server/pair。
- formal successor：`2 files / 234 tests`；strict TypeScript 通过。
- 公共严格 JSON bytes 入口显式拒绝 `EF BB BF`，不依赖 `TextDecoder` 默认 BOM 行为。
- complete-return bytes preflight 拒绝 `Buffer`、`Uint16Array` 与 `Uint8Array` 子类，只接受精确原生 `Uint8Array`。

### 浏览器与运行时

- 本机 Chrome 最终全 pilot UI：`24/24`。
- 本机 Edge 最终全 pilot UI：`24/24`。
- 新 integrated 子集在最终源码上：Chrome `6/6`；Edge `6/6`。
- 覆盖 A 席协调人逐字代录、B 席本人输入、读回后修改失效、完整回件与 sidecar 的实际下载文件名／字节、session-specific basename、浏览器 `(1)` 等冲突后缀、A/B 四文件 host-side 校验、成功后换文件立即撤销旧结果、校验中 change 阻止旧异步结果回写、错误 raw pin 阻断、390×844 与 320×568 无页面级横向溢出、无 warning/error、无非 allowlist 请求。
- 应用内浏览器真实走完 A 席输入、一次越界“准确度”措辞阻断、修正后读回、四项确认与最终交回协调人状态；控制台 warning/error 为 0。
- 应用内浏览器在新 origin `127.0.0.1:43193` 核对协调人页标题、中文步骤、390×844 布局与控制台，未载入真实文件。

最终只读复核发现并关闭了两个 UI 风险：旧“通过”结果可能在换文件后继续显示，以及固定 basename 与浏览器自动重命名冲突。修复后同时重跑 Chrome／Edge 的 integrated `6/6` 与全 pilot `24/24`；上述数字对应最终受影响源码。

应用内持久浏览器在历史 origin `127.0.0.1:4193` 被既有主应用 Service Worker 接管，显示了主应用而不是协调人页。本轮没有清除可能含用户数据的 storage/cache，而是停止并换用未使用的新 loopback origin。这个观察证明“端口响应”不能替代页面身份核对；它不是 clean-profile 失败，也不能冒充 clean-profile 通过。自动化 Chrome/Edge 使用 Playwright 阻断 Service Worker 的测试配置；本轮 integrated source-tree 页面尚未取得独立 physical clean-profile 启动器证据。

浏览器可执行文件本轮重新读取：

- Chrome：`bda33d5c0634050dc77dbd73a97c25c4b3ded0d385d08277e02ac1165f6fab1d`
- Edge：`bf9cb9e184d1719e2ebb7ce66b1fad2efaca215bd86796ed474d0a025b6882ab`

### 27 文件当前源码切片

路径按 PowerShell `Sort-Object` 默认规则排序；每行规范形式为 `path + NUL + decimal byte length + NUL + lowercase raw SHA-256 + LF`，对全部 27 行拼接后的 UTF-8（无 BOM）再计算 SHA-256：

`1862dc0188362f412e473757d698471ae362f990191303fab2e3450080d88e3e`

总字节数：`439603`。切片包括：

- formal successor：`protocol.ts`、`successor.test.ts`、`authenticated-envelope-v4.test.ts`；
- pilot 配置／说明：`README.md`、`package.json`、`playwright.config.mjs`；
- 既有单题能力与测试：`single-binding-rehearsal-contract.js`、`single-binding-rehearsal.js`、对应 Node test；
- integrated JSON／contract／handoff／seat server；
- integrated A/B HTML、共享 CSS/JS；
- integrated pair HTML/CSS/JS/server；
- integrated 的四个 Node test 文件与两个 E2E 文件。

这只是当前工作区上述文件的工程身份，不是独立发布 golden，不替代 v1.7 frozen golden，也不证明文件作者、来源、签名或可发布性。

## 治理账

- `legacy-v13 / targetSchema 13 / migrationId null` 保持不变。
- `check:release-governance` 通过；`publicDeploymentAuthorized=false / expertClaimsAuthorized=false`。
- `check:system-contract-draft-boundaries` 仍以 exit 1 报告同一组 17 个既有阻塞项；其中受限 `apps/web/src/lib/local-user-data-cleanup.ts` 明确未读取。本轮没有新增 integrated tranche 阻塞项。
- 本流程不读写产品 storage，不使用 Schema 13 mutation epoch；`productStorageMutationPerformed=false / schema13MutationEpochUsed=false / intervalMutationExcluded=false / abaExcluded=false`。
- 未执行任何 Git 操作；未访问第三方后台；未复制 prompt、知识库、断语或资产；未使用现实专家或来源材料。

## 尚未完成

1. integrated 流程仍是 source-tree、固定可重放 session 的 synthetic-only QA；尚无 pair precommit → 两席 manifest → pair manifest 的 physical package builder、包外可信 pin 启动器、回件 held-handle observation 与回滚／清理证据。
2. 现实专家的身份、资质、同意与彼此独立性仍未核验；本轮页面自述不能代替这些事实。
3. 12 条 Binding 仍未逐条取得可靠底本／版本、exact quote、作品层与载体层许可依据，也未取得两份现实专家意见。
4. 专家与 AI 的预测准确度尚无预注册样本、结果标签、盲评和评分协议；本轮明确排除此研究，不能据专家口述得出准确度结论。
5. 完整应用、正式仓储边界、PWA／Service Worker、公开主机、Release Evidence、部署与回滚仍是另一条发布验证账。
6. 紫微、西洋、吠陀必须各自完成独立输入、事实、规则版本、来源、权利、专家审定与高风险表达边界；本轮八字 synthetic 流程不能外推。

## 验证命令账

本轮实际使用的主要命令：

```powershell
npm.cmd run test:single-binding-integrated
npm.cmd run test:node

$env:HAKIMI_PILOT_BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm.cmd run test:ui

$env:HAKIMI_PILOT_BROWSER_EXECUTABLE='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm.cmd run test:ui

& .\node_modules\.bin\vitest.cmd run --config isolated-drafts/bazi-expert-formal-intake-successor/vitest.config.ts `
  isolated-drafts/bazi-expert-formal-intake-successor/src/successor.test.ts `
  isolated-drafts/bazi-expert-formal-intake-successor/src/authenticated-envelope-v4.test.ts
& .\node_modules\.bin\tsc.cmd --noEmit -p isolated-drafts/bazi-expert-formal-intake-successor/tsconfig.json

npm.cmd run check:release-governance
npm.cmd run check:system-contract-draft-boundaries
```

第一次直接运行 Playwright 时因本机没有该版本自带的 `chromium_headless_shell` 而未启动浏览器；随后没有下载或安装软件，而是显式使用本机已安装并重新 hash 的 Chrome／Edge 完成上述通过线。该环境启动失败不计为产品测试失败，也不从最终通过次数中删改。
