# Western Astronomy Engine Adapter Draft

这是一个私有、隔离、仅供工程诊断的 UTC 天文位置探针。它不属于生产 Web 图，也不生成 `western_natal_engineering_fixture` 或 `western-calculation-receipt`。

当前固定范围：

- 只接受规范的毫秒级 `Z` UTC 瞬时和十体中的规范有序子集；
- Node 诊断每次计算创建新的 Node Worker；隔离 Browser/Node 一致性页每个种子也创建新的 Dedicated Worker，不复用 Astronomy Engine 的模块级可变状态；
- 固定 `astronomy-engine@2.1.19` 与 `DeltaT_EspenakMeeus`；
- 输出地心 EQJ 向量、Astronomy Engine 的 true-ecliptic-of-date，以及 UTC ±60 秒中心差分；
- Moon 明确记录为 `GeoMoon` 直接路径，不把它冒充为显式光行时回溯；
- 结果永远标记为 `differential_diagnostic`、`productionEligible=false`、`expertTruthClaimed=false`。

直接运行一个 UTC 位置诊断：

```powershell
npm run demo:western:astronomy -- 2025-03-20T09:01:00.000Z sun,moon
```

输出是适配器自己的 `diagnostic_only` 信封；它明确写出未满足的严格契约字段族，且没有
`western-calculation-receipt`。

规则层再把天文位置接到纯几何占星规则上：

```powershell
npm run demo:western:rules -- 2025-03-20T09:01:00.000Z
```

该命令先用 fresh Worker 诊断同一 UTC 瞬时的日/月黄道位置，再把结果输入隔离规则层，
生成黄道落位（热带/恒星）、宫位（整宫 / 等宫 / 波菲利）与相位（含入相/出相）的
`astrology_rules_engineering_artifact`。规则层不读取星历、RAMC 或观测者位置；
演示中的格林尼治几何参数只是显式调用方输入，不能由诊断结果推断。

构建并打开隔离的 Browser/Node 一致性页：

```powershell
npm run build:western-browser-parity
npm run preview:western-browser-parity
```

该页面不接入 `apps/web`。构建插件先逐字节核对已安装 ESM、包清单、源码锁和 DeltaT 锁，随后用五个 fresh Node Worker 生成完整参考；页面再以五个 fresh Browser Worker 重放相同请求。主线程从两边的 raw result 各自重新生成稳定投影，不能只信任 Worker 返回的投影或摘要。

## 证据边界

Astronomy Engine 把 UT1 与 UTC 近似为同一值，内部 DeltaT 是模型值；它不读取冻结的闰秒、EOP、DUT1 或 JPL kernel。因此本包不能满足严格西洋契约的时间回执、ICRF 身份、目标中心工件、provider flags、宫制、相位或瞬时速度要求。

`astronomy-engine-2.1.19-source-lock.json` 同时记录 npm tarball、annotated tag object 与 peeled commit。npm tarball 的八个文件中没有独立 `LICENSE`；本包的 `licenses/astronomy-engine-2.1.19-LICENSE.txt` 是从 peeled commit 获取并按字节摘要锁定的 MIT 原文，不声称它来自 npm tarball。

正式测试不联网。未来 JPL Horizons 差分应另存离线原始响应和查询清单，不能把在线 API 嵌入浏览器运行时。

## 离线回归门

`diagnostic-seed-lock.json` 固定五个引擎回归种子：1900 下边界、J2000 十体、2024 日食附近、2025 春分零度换向和 2100 上边界。它们锁的是此版本引擎、此 DeltaT 模型和此投影代码的规范 JSON 摘要，只能证明工程回归一致，不能当作 JPL Horizons 或占星专家真值。

Node 原始结果继续保留完整 double，不为制造跨运行时相等而改写。Browser/Node 门另生成显式 `cross_runtime_quantized_projection_v1`：时间天数与向量/距离保留 12 位小数，DeltaT 秒及角度、角速度、距离速度保留 9 位小数；元数据记录的是十进制网格半步，不把它冒充 IEEE-754 总误差上限或天文精度。通过条件仅是这份稳定投影的 canonical JSON 逐字段与摘要完全相等；raw double 只记录 canonical JSON 是否精确一致，不声称逐字段 Float64 位模式比较。

2026-08-10 的当前产物在 Edge `151.0.4129.59` 与 Chrome `151.0.7922.77` 各连续重放两轮。每轮五个种子均为 5/5 稳定投影完全相同，两轮与两浏览器锁到相同五个摘要；raw double 的 canonical JSON 为 0/5 精确一致，页面如实显示而不影响稳定投影门。两轮后 local/session storage、IndexedDB、Cache Storage、Service Worker、cookie 均为空，意外外网请求、console warning/error 和 pageerror 均为 0。这只证明当前 JS 运行时下的工程稳定投影，不是历表或占星专家真值。

JPL Horizons 差分仍未形成通过门。本轮已把首个候选查询收窄为 `COMMAND=10`、`CENTER=500@399`、`EPHEM_TYPE=VECTORS`、`TIME_TYPE=UT`、`REF_PLANE=FRAME`、`REF_SYSTEM=ICRF`、`OUT_UNITS=AU-D`、`VEC_TABLE=1`、`VEC_CORR=LT` 与固定 UTC `2025-03-20T09:01:00.000Z`；但当前环境没有从官方端点取得可锁定的响应字节，因此没有创建替代或合成 fixture。下一步仍须固定官方原始响应、完整参数顺序、检索时间、URL/响应摘要，并明确 ICRF/EQJ、UT/UTC、EOP、太阳引力偏折与容差语义；在这些工件经审查前，只能输出不带真值裁决的差分报告。

2026-08-10 对 JPL Horizons 官方端点的再次尝试（curl/PowerShell/Python 直连与本地代理均走 HTTPS）在 TLS 握手阶段被网络层阻断，未取得任何可锁定字节；该结果不影响规则层，因为规则层明确不依赖官方星历字节。

## 独立占星规则层

`src/rule-layer/` 是西洋体系第一个不依赖星历真值的功能竖切，只对调用方提供的黄道经度与瞬时速度做纯几何运算，并固定版本化算法 ID：

- `western-zodiac-rules/0.1-draft`：热带/恒星黄道落位；恒星必须携带岁差值，热带不得伪造岁差值。
- `western-house-rules/0.1-draft`：整宫、等宫（ASC）、波菲利与 Placidus 四种宫制；统一从 RAMC、地理纬度与 true-of-date 黄赤交角导出 ASC/MC/IC/DSC，极区或 ASC 不在地平线时失败关闭，不使用后备宫制。Porphyry 的四象限三等分由测试锁定结构不变式；Placidus 忠实移植自 Unlicense 参考实现（Phaen/CircularNatalHoroscopeJS，依据 Munkasey《An Astrological House Formulary》第 18 页及已记录的三角修正），并以赤道手工案例与 672 组 RAMC/纬度对照零差异锁定，纬度 ≥60° 失败关闭。
- `western-aspect-rules/0.1-draft`：按稳定天体顺序枚举相位，复算夹角与有向 orb，并由瞬时相对黄经速度派生 exact/applying/separating/indeterminate。

每个天体会额外分配 `houseNumber`：按十二宫头在输出黄道上的升序跨度定位，跨 0° 的宫位正确回绕。输出固定为 `astrology_rules_engineering_artifact`、`diagnostic_only`、`productionEligible=false`、`expertTruthClaimed=false`、`chartFixtureAccepted=false`、`successReceiptIssued=false`，没有 `western-calculation-receipt`。规则层不计算星历位置、RAMC、岁差方案或宫制外部参考值；把这些纯几何结果当成天文或占星真值仍是被禁止的。

## JPL Horizons 差分离线管道

`src/horizons-differential/` 在官方字节缺席时把“正式差分门”的机器全部搭好并失败关闭：

- `query-manifest.ts` 冻结 2025 春分太阳地心 `500@399` VECTORS 查询的完整参数顺序、
  固定 UTC、输出单位/参考系/光行时与比较语义（`passClaimPolicy=never_in_draft`，
  frame bias 明确 `not_modeled_acknowledged`，不设通过阈值）；
- `official-response.ts` 要求证据记录精确绑定 manifest、字节长度与 SHA-256，并解析
  `$$SOE/$$EOE` 内的唯一 X/Y/Z 行；记录缺失、摘要不符、非 VECTORS 文本或行数/标签不符
  全部失败关闭；
- `differential-report.ts` 输出 `horizons_astronomy_engine_differential` 报告：raw AU
  差值、`truthAdjudicated=false`、`passClaim=false`，不把 EQJ 与 ICRF 的差异当成已建模；
- `demo.ts` 提供 `npm run demo:western:horizons`：先计算同日同时辰的太阳诊断，再尝试读取
  `evidence/horizons-2025-equinox-official.{json,txt}`；文件不存在时明确输出
  `OFFICIAL_EVIDENCE_INVALID` 并退出失败，不生成任何合成官方证据。

2026-08-10 官方端点仍不可达（TLS 直连与本地代理均被网络层阻断），因此该管道当前只有
失败路径可执行；官方原始响应一旦取得并落盘，同一命令即可直接产出差分报告。
