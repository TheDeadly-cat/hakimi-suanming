# Western Astrology Rules Preview Draft

这是一个私有、隔离的西洋星盘规则层浏览器预览。它不属于生产 Web 图，不写八字数据库，
不保存任何资料，也不注册 Service Worker。

```powershell
npm run preview:western-rules-preview
```

固定打开 `http://127.0.0.1:4219/`。每次点击“计算”都会：

1. 通过 `src/browser-client.ts` 创建**一个新的、单次使用的 Dedicated Worker**，指向
   `western-astronomy-engine-adapter-draft` 中已受审的 `browser-worker.ts`；
2. Worker 校验固定 astronomy-engine 2.1.19 源码锁与 DeltaT 哨兵，返回十体 UTC 诊断
   （含 60 秒中心差分的瞬时速度）；
3. 主线程严格核对回包协议、requestId 与 audit（fresh worker、无持久化、禁止外网、
   `productionEligible=false`、`expertTruthClaimed=false`）；
4. 通过 `src/rule-layer-bridge.ts` 调用规则层，生成黄道落位、宫位（整宫/等宫/波菲利/
   Placidus）、行星入宫与相位；
5. 通过 `src/browser-app/content-layer.ts` 把命主星、定位星链、天体到四轴距离、实际四轴、
   元素／模式分布、宫主星链、天体、星座、宫位与相位事实绑定到来源可追溯的西方占星内容候选，
   同时保留事实 SHA-256、流派分歧、复核问题与 `result:null`；
6. 通过 `src/browser-app/content-review-feedback.ts` 为 43 项固定基础内容生成三重 SHA-256 绑定的
   人工审稿模板，并只读预检带归属、传统范围、条件与反例的反馈；
7. 通过 `src/browser-app/dynamic-content-review-feedback.ts` 从当前 `WesternContentProjection` 生成
   去除直接身份与表单输入的动态逐卡审稿包，并把导入反馈严格绑定回当前内存命盘；
8. 渲染结构化工程事实与待审候选，不生成吉凶分数、科学有效性声明或具体事件预测，也不保存结果。

页面 CSP 为 `connect-src 'none'`，规则层摘要使用依赖自由的纯 TS SHA-256
（`rule-layer/canonical.ts`），因此整个页面可在浏览器内运行而不依赖 Node。

结果区新增 SVG 星盘轮（`src/browser-app/chart-wheel.ts`）：黄道十二宫环、十二宫头环、天体落点与相位连线，0° 位于左侧、随经度逆时针递增；恒星黄道为演示选项，勾选后规则层以给定岁差值生成恒星落位，轮盘宫头仅按该值平移显示，并明确标注“不进入规则层契约”。轮盘几何是纯函数，可复用于未来紫微/西洋融合视图。

## 来源绑定内容 v0.1

内容层固定登记 10 个天体、12 星座、12 宫与 5 类主相位。组合顺序是“天体回答关注什么、
星座回答怎样表达、宫位回答在哪类生活领域、相位回答两种功能如何协同或拉扯”。每条候选同时给出
可用端和紧张端，并列出需要专家确认的流派、权重与反例问题；任何专家结论都保持 `result:null`。

术语及现代占星象征主要绑定 [Astrodienst 行星资料](https://www.astro.com/astrologie/in_planets_e.htm)、
[星座概览](https://www.astro.com/astrology/in_signs_e.htm)、
[宫位概览](https://www.astro.com/astrowiki/en/House) 与
[相位概览](https://www.astro.com/astrology/in_aspect_e.htm)。同时引用其
[整体解读原则](https://www.astro.com/astrowiki/en/Interpretation) 和
[解读限度](https://www.astro.com/astrowiki/en/Limits_of_Interpretation)，防止把单一落位当成整盘结论；
[Nature 1985 双盲测试](https://www.nature.com/articles/318419a0)只作为科学证据边界，不能反向给候选内容背书。

## 来源绑定内容 v0.2

v0.2 在 v0.1 的 10 条落位与相位候选之上增加三类整盘结构：

1. 实际 ASC / MC / DSC / IC 四轴按当前热带或恒星黄道落座，分别呈现自我进入、公共角色、
   一对一关系与私密根基主题；出生时间精度仍是显式复核项；
2. 元素与模式只做透明原始计数，同时展示“全部十体”和“核心五体”两个口径；不把每体一票
   冒充公认权重，也不输出单一人格主导、吉凶或分数；
3. 对十二宫逐一读取宫头星座，再追踪其守护星的实际落座、落宫与逆行事实。白羊至天秤、射手、
   摩羯等传统／现代同表项仍并列保留；天蝎、水瓶、双鱼分别并列 Mars / Pluto、Saturn / Uranus、
   Jupiter / Neptune 两条路径，不擅自选流派或合成单一结论。

新增来源绑定到 Astrodienst 的 [Ascendant](https://www.astro.com/astrowiki/en/Ascendant)、
[Medium Coeli](https://www.astro.com/astrowiki/en/MC)、
[Descendant](https://www.astro.com/astrowiki/en/Desc)、
[Imum Coeli](https://www.astro.com/astrowiki/en/IC)、
[Element](https://www.astro.com/astrowiki/en/Element)、
[Quality](https://www.astro.com/astrowiki/en/Quality)、
[House Ruler](https://www.astro.com/astrowiki/en/House_Ruler) 与
[Ruler](https://www.astro.com/astrowiki/en/Ruler)。这些是从业术语／流派参考，不是科学有效性证据；
四轴、分布和 12 条宫主星链的专家结果仍全部为 `result:null`。

## 来源绑定内容 v0.3

v0.3 在 v0.2 的 50 个候选之上增加 12 个盘内追踪候选：

1. 从实际 ASC 落座读取命主星，再并列追踪传统与现代守护星的实际落座、落宫和逆行事实；命主星
   只是一条盘内阅读路径，不被描述为整盘唯一主宰；
2. 对十体逐一建立传统／现代定位星链，只按落座星座的守护星继续追踪，并显式记录“自守终点”、
   “循环”或“缺少守护星天体”三种终止状态。两体循环只标作守护星互换候选，不自动升级为已经
   满足相位、尊贵或流派条件的互容结论；
3. 对每个天体计算距 ASC / MC / DSC / IC 最近的精确黄经距离并排序。因为从业资料对角星可能采用
   合轴容许度或角宫位置等不同口径，本版不设置统一 orb，也不输出 `isAngular` 或强弱结论；≤1°
   只是一条同度复核带，等待专家决定是否及如何采用。

新增来源绑定到 Astrodienst 的 [Chart Ruler](https://www.astro.com/astrowiki/en/Chart_Ruler)、
[Dispositor](https://www.astro.com/astrowiki/en/Dispositor)、
[Chain of Dispositors](https://www.astro.com/astrowiki/en/Chain_of_Dispositors)、
[Angular Planet](https://www.astro.com/astrowiki/en/Angular_Planet) 与
[Art of Combination](https://www.astro.com/astrowiki/en/Art_of_Combination)，并用 Skyscript 的
[Dispositor](https://www.skyscript.co.uk/glossary/dispositor/) 和
[Angular](https://www.skyscript.co.uk/glossary/angular/) 交叉核对术语差异。默认盘共形成 62 个候选、
31 项来源；新增 12 个候选的专家结果同样全部为 `result:null`。

## 来源绑定内容 v0.4

v0.4 不增加新的天文或占星规则，而是为每个已计算天体生成一张逐星综合阅读包：把该天体的落座、
落宫、全部五类主要相位、传统／现代定位星链、命主星路径身份及最近四轴距离放进同一可审计队列。
每条相位同时投影到参与的两颗天体，因此默认盘的 23 条相位在十张逐星包内形成 46 个关系链接；
这只是双向索引，不是相位权重翻倍。

组合顺序采用 Astrodienst 的 [Art of Combination](https://www.astro.com/astrowiki/en/Art_of_Combination)
与 [Interpretation](https://www.astro.com/astrowiki/en/Interpretations) 作为从业方法参考：先看天体—星座、
天体—宫位和天体—相位，再回到守护星关系与全盘反复主题。土星、天王星、海王星与冥王星额外标注
“慢行星 · 先看落宫”，但不自动赋予更高权重。结合
[Limits of Interpretation](https://www.astro.com/astrowiki/en/Limits_of_Interpretation) 的边界，
每张包的 `overallResult` 与 `goodBadOrientation` 固定为 `null`；矛盾因素保留原样，不按相位数量、
名称、命主星身份或四轴距离自动合成主导、人格、强弱、吉凶或事件结论。

## 人工审稿反馈 v0.6

v0.6 不增加新星历、落位或动态组合规则，而是把可复用的内容基础拆成固定 43 项审稿队列：

- 10 个天体；
- 12 个星座；
- 12 个宫位；
- 5 类主相位；
- 4 个轴点。

页面可下载 `hakimi-western-content-primitives-review-v006.json`。模板严格绑定当前有序 43 项快照、
31 条来源账，以及基础目录、条目顺序、来源登记三个 SHA-256；任一内容、顺序、来源、计数或摘要
失配都会失败关闭，并清除先前已通过的内存预览。导入使用严格 UTF-8 与 2 MiB 上限，不写入
`IndexedDB`、`localStorage`、`sessionStorage`、规则层工件或正式入口。

审稿人可填写决定、采用的占星传统、成立条件、反例、退修要求、补充 HTTPS 来源及条件化方向提案。
方向只允许“可能偏支持／可能偏挑战／正反并见／不可评估”等候选表述；身份仍为自述且无数字签名，
科学有效性、正式激活、自动集成、`goodBadOrientation`、`eventOutcome` 与 `result` 均保持关闭。

特别注意：43 项模板只审基础词条，不覆盖默认盘的 73 张动态整盘组合卡。即使 43 项全部通过，
也不能把某张具体星盘的落座、落宫、相位、定位链或整盘首读视为已经获审；动态组合需要另立隐私、
事实绑定和专家复核协议。

## 当前盘动态审稿反馈 v0.7

v0.7 为当前成功排出的 `WesternContentProjection` 建立与 43 项基础审稿完全独立的逐卡反馈包。
候选顺序固定为：四步首读 → 十体逐星综合 → 命主星 → 十体定位星链 → 四轴距离账 → 四轴 →
结构分布 → 十二宫主星 → 十体落位 → 当前实际命中的相位。候选总数是动态值；默认盘为
`50 + 23 = 73`，另一个实算盘为 `50 + 20 = 70`，因此 profile、类型和 UI 均不把 73 写成常量。

页面只有在当前盘成功生成后才允许下载 `hakimi-western-current-chart-review-v007.json`。模板只接收
内容投影，不接收规则请求或表单，明确排除姓名、UTC、地点、`inputLabel`、RAMC、纬度、黄赤交角、
岁差值与表单原值；但仍携带精确落位、宫位、相位、守护链和事实摘要，所以只是“移除直接身份字段”，
不是匿名化。用户必须自行决定是否把该敏感星盘指纹交给外部审稿人；程序不自动上传或缓存。

模板绑定当前事实 SHA-256、完整内容投影 SHA-256、有序 candidateId SHA-256、来源账 SHA-256、逐卡
完整候选快照 SHA-256、动态计数与 31 条来源。导入时不是只检查文件内部自洽，而是从当前内存命盘
重新构造全部期望值逐项比较；重算、非法输入、Worker 失败、错盘或任一不可变字段篡改都会清空旧
动态预览。有效反馈只显示自述审稿人的条件化提案；43 项基础决定不会继承，任何反馈也不写规则、
浏览器存储或正式入口。即使全部通过，身份、签名、科学有效性、确定事件结果、自动集成、正式激活、
`goodBadOrientation / eventOutcome / result` 仍保持 `false / null`。

## 边界

- `browserPreview` 只允许共享 `src/browser-client.ts` 与 `src/rule-layer-bridge.ts`，
  不允许裸模块导入，不允许 `indexedDB/localStorage/sessionStorage/caches`；
- 跨草案边只有两条：Worker 客户端 → 受审一次性 Browser Worker，规则层桥 → 规则层入口；
- 宫位纬度限 ±60°（Placidus 定义域），输入使用演示 RAMC/纬度/黄赤交角，不冒充
  tzdb/DST、EOP 或官方星历；
- 真实浏览器证据（2026-08-10）：Edge `151.0.4129.59` 与 Chrome `151.0.7922.77` 各
  完成“默认 Placidus 十体计算 → 整宫 30° 重算”，10 天体 / 12 宫头 / 4 角点 / 23 相位，
  控制台 0 错误、0 页面异常、0 外网请求；local/session storage、Cache Storage 与
  IndexedDB 均为空；桌面与 390×844 手机视口无横向溢出，主按钮高度 48px。同轮新增星盘轮验收：两浏览器均渲染 24 个环段（12 星座 + 12 宫）、10 个天体、35 条线（12 宫头辐条 + 23 相位连线）、34 个文本标签；勾选恒星黄道（岁差值 24.1°）后太阳落点从（112.0, 244.0）平移到（123.2, 191.7），环段与天体数量不变，且两浏览器结果逐字段一致。
- 可重复自动化门：`npm run test:e2e:western-rules-preview` 2026-08-11 在 Edge 与 Chrome 各通过 4/4、共 8/8：默认 Placidus 与恒星黄道两次计算（10 天体、12 宫、4 角、轮盘非空、localStorage/sessionStorage/IndexedDB 全程零写入、控制台 0 问题），另新增浏览器故障矩阵——Worker 崩溃、畸形 Worker 回执均失败关闭且不渲染任何结果，非法 UTC/纬度 ±60° 外等表单级参数错误在启动 Worker 前失败关闭；控制台 0 问题。
- 本轮新增证据（2026-08-12，与上述历史证据分开）：默认盘生成 10 条落位候选、23 条相位候选和
  16 项来源，33 条候选均为 `awaiting_expert_review / result:null`，并绑定规则结果 SHA-256。
  应用内浏览器在 1280×720 与 390×844 验证页面身份、首屏、计算交互、专家问题展开、来源链接与
  非科学边界；桌面/手机均 0 卡片裁切，手机问题字号 12.8px、行高 19.84px，控制台 0 warning/error、
  0 框架错误层。定向 Vitest 3 文件 / 7 项、双 tsconfig、94-module build 均通过；同日 Edge + Chrome
  故障矩阵仍为各 4/4、共 8/8，并新增“成功后非法输入必须清空旧盘面和旧候选”的断言。
- v0.2 新增证据（2026-08-12，不回填到上述 v0.1 记录）：默认盘额外生成 4 条四轴候选、1 份双口径
  元素／模式分布和 12 条宫主星链；连同原 33 条落位／相位候选共 50 个待审条目、24 项来源，全部
  `awaiting_expert_review / result:null`。应用内浏览器在 1280×720 与 390×844 完成默认计算、专家问题
  展开、来源链接、传统／现代天蝎宫主星 Mars / Pluto 并列、恒星黄道重算与非法输入清空；两视口均
  0 卡片裁切、0 错误层、0 warning/error，手机横向溢出 0px。隔离检查、双 tsconfig、定向 Vitest
  3 文件 / 8 项与 94-module build 通过；Edge + Chrome 各 4/4、共 8/8（10.5 秒）。这些仍只是当前
  代码的工程证据，不增加专家真值或科学有效性计数。
- v0.3 新增证据（2026-08-12，与 v0.1/v0.2 分开）：默认盘再增加 1 条命主星、10 条定位星链与
  1 份十体四轴最近距离账；总计 62 个待审条目、31 项来源，全部 `result:null`。定位链单测覆盖
  自守、循环、缺天体停止、两体守护星互换候选及传统／现代分歧；距离账只排序精确几何距离，
  没有 `isAngular` 或统一 orb 结论。隔离检查、双 tsconfig、定向 Vitest 3 文件 / 9 项、94-module
  build 通过；Edge + Chrome 各 4/4、共 8/8（10.7 秒）。应用内浏览器 1280×720 与 390×844
  均为 0 横向溢出、0 卡片裁切、0 错误层、0 控制台日志。详细账见
  `docs/西洋内容-v0.3-命主星定位星链四轴距离账与证据-2026-08-12.md`。
- v0.5 新增证据（2026-08-12，与 v0.4 逐星包分开）：在 10 张逐星包之上增加 1 张
  “太阳 → 月亮 → 上升 → 命主星”固定首读导航包；默认盘 4/4 入口可用，总计 73 个待审条目、
  31 项来源。导航顺序不转换为主导排名，`selectedPrimaryFactor / overallResult /
  goodBadOrientation` 均为 `null`；缺少日月或上升事实时逐项失败关闭，不从其他天体补猜。
  双 tsconfig、定向 Vitest 3 文件 / 9 项、94-module build 通过；最终 Edge + Chrome 各 4/4、
  共 8/8。应用内 Browser 实算确认 1280×720 为 2×2、无横向溢出；移动 390×844 截图为单列。
  详细账见 `docs/西洋内容-v0.5-日月上升命主星整盘首读与证据-2026-08-12.md`。
- v0.6 新增证据（2026-08-12，与 v0.5 的动态整盘卡分开）：固定导出 10 天体 + 12 星座 +
  12 宫位 + 5 相位 + 4 轴点共 43 项基础内容审稿模板，同时绑定 31 来源与三个 SHA-256。
  有效反馈只读显示条件化方向、传统、条件与反例；摘要篡改后清除旧预览，73 张动态卡仍保持待审。
  定向 Vitest 2 文件 / 10 项、双包与全体系 TypeScript、95-module build 通过；本轮只跑新增场景，
  Edge + Chrome 各 1/1、共 2/2（11.7 秒），没有把历史 8/8 冒充本轮执行。应用内 Browser
  桌面与 390px 移动主链通过、0 横向溢出、0 控制台问题；体系草案聚合门最终为边界 42/42、
  Vitest 16 文件 / 110 项通过。详细账见
  `docs/西洋内容-v0.6-基础内容审稿反馈模板与只读预检-2026-08-12.md`。
- v0.7 新增证据（2026-08-12，与 v0.6 的 43 项基础审稿分开）：新增当前盘动态候选模板与
  当前内存投影严格预检。默认盘 73 卡有效反馈显示 1/72；改换 UTC 后实际为 70 卡，旧 73 卡文件
  失败关闭并清空；非法输入再禁用下载与导入，基础审稿仍为 0/43。定向 Vitest 2 文件 / 12 项、
  双 tsconfig、96-module build 通过；新增动态流 Edge + Chrome 各 1/1、共 2/2（11.7 秒），
  原 v0.6 流同期回归各 1/1、共 2/2（10.8 秒）。应用内 Browser 完成桌面与 390px 实算、下载、
  有效导入、换盘拒绝和非法输入清空，体系草案聚合门为边界 42/42、Vitest 17 文件 / 117 项，
  0 横向溢出、0 控制台问题。详细账见
  `docs/西洋内容-v0.7-当前盘动态候选审稿反馈与只读预检-2026-08-12.md`。
- 这些内容候选不补齐缺失的 JPL 官方响应字节，不签发严格计算回执，不把 `issued:false` 改成成功，
  不获得生产入口资格，也不构成占星专家真值或科学有效性证据。
