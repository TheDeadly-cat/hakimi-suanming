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
5. 只渲染结构化工程事实，不提供断语，不保存任何结果。

页面 CSP 为 `connect-src 'none'`，规则层摘要使用依赖自由的纯 TS SHA-256
（`rule-layer/canonical.ts`），因此整个页面可在浏览器内运行而不依赖 Node。

结果区新增 SVG 星盘轮（`src/browser-app/chart-wheel.ts`）：黄道十二宫环、十二宫头环、天体落点与相位连线，0° 位于左侧、随经度逆时针递增；恒星黄道为演示选项，勾选后规则层以给定岁差值生成恒星落位，轮盘宫头仅按该值平移显示，并明确标注“不进入规则层契约”。轮盘几何是纯函数，可复用于未来紫微/西洋融合视图。

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
