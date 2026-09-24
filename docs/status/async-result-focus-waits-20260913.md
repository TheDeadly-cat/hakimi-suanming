# 异步结果焦点测试等待

`1471219410d88ab6e412ffb1d761b3ac0a17ff67` 的 [Quick CI 首轮](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34751324805) 中，完整 Vitest 为 2826 通过、1 失败。失败位于出生时间扰动面板的稳定报告用例：报告区域已出现，但焦点断言仍观察到 `document.body`。

组件通过 `useEffect([report])` 聚焦结果。`findByRole` 只等待元素出现，不能证明后续聚焦 effect 已完成。将该断言改为 `await waitFor(() => expect(document.activeElement).toBe(result))`，继续要求实际焦点严格等于报告区域，没有移除或弱化焦点要求，也没有设置任意等待时长或放宽超时。

同类检查发现 PWA 安装面板也通过 `useEffect([status, visible])` 聚焦异步结果。其接受、取消和失败三处测试断言一并等待实际焦点；这三处属于同类预防修正，不宣称本轮 CI 曾观察到它们失败。同步键盘导航及其他焦点断言未改。

生产组件、焦点行为、安装逻辑、参数和数据处理均未修改；测试文件已有 `waitFor` 导入。本次仅修改四处断言，测试数量不变。出生时间面板单文件先通过 10/10；最终两个完整文件 **16/16 通过**。两次执行有重叠，不相加计算覆盖。

最终验证命令为 `node node_modules/vitest/vitest.mjs run --config apps/web/vitest.config.ts apps/web/src/components/birth-time-perturbation-panel.test.tsx apps/web/src/components/pwa-install-banner.test.tsx`。原 CI 失败继续保存在 `four-system-v27-history-v1/`；本次日志与最终提交的远端 CI 回执保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/birth-time-focus-wait-v1/`。

这不是新浏览器验收，也不改变已安装产物、current 选择或正式专家准入。原治理组尚余 102 项失败的结论仍归 `1471219` 的完整治理回归，本补丁不申报额外关闭数。
