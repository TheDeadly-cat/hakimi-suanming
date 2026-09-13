# 四体系 v2.6 与 Western 三包历史输入

本批以 `06029fb7f1db7079271eff8f3511ece716ee16eb` 为基线，修复 v2.6 历史测试的输入适用范围。生产加载器、原记录、current 索引与正式准入状态保持原字节。

## 首个失败与输入范围

最近完整治理记录来自 `d341b86`，v2.6 文件的 29 项测试中有 24 项失败。原 `fixture()` 并行加载 v2.6、v2.5、Western Manifest v2 及重建对象；实际首先观察到的错误是 Western 旧来源漂移回执所绑定的 `packages/western-astrology-rules-preview-draft/src/browser-app/main.ts` 返回 `CURRENT_SOURCE_DRIFT`。单独调用当前 v2.6 加载器则先沿父链返回 `MANIFEST_IDENTITY_DRIFT`。两个错误的入口和先后关系不能混写。

Western Manifest v2 固定三个包根的 70 项 authored 文件：契约包 6 项、规则包 24 项、天文适配包 40 项。与已有 v2.5 的 700 项原始输入核对后，需要补入 44 项文件和两份 JSON，共 46 项，形成 **746 项历史输入**。重复路径的原身份一致，没有覆盖既有 700 项数据。

原 v2.6 JSON 为 18673 字节，SHA-256 `7e82402069b9a761cd23a8d428b74f389754bd1e30654428fc5bd965bdf57dd5`；Western Manifest v2 为 72472 字节，SHA-256 `a4ba9ca6504e5d386be5302c28a498d95b172a3904c5ddc5f90a8adcc5951f27`。当前加载器在独立重建的历史目录中核对得到原 `childDigest`：`72f9cb10f46025662730bd2a4d12c1d7ec8796109350358c815a97c492b07ee7`。

## 归档、测试与执行代码

新归档 `scripts/fixtures/four-system-v26-additional-inputs.zip` 为 **134529 字节**，SHA-256 `029ca7f655cd66fca240502659228ad90f2859d69a7b4ccc529a53c556a43c19`。它包含 46 项数据及 `fixture-inputs.json`，数据合计 492813 字节。准备阶段核对固定 ZIP 身份、清单、精确且唯一的安全路径、各项长度与 SHA，以及总长度；新增写入使用 `wx`。旧归档没有改写。

归档中的源码仅作为字节输入。加载器始终来自当前源码；CLI 正例使用当前 CLI 的原字节副本及转发到当前加载器 URL 的测试桥接。实际源码 CLI 在历史目录作为 cwd 时仍失败，不能继承历史验证成功。公共 CLI helper 只增加明确允许的版本 6。

原 29 个测试函数体逐字节未改。`fixture()` 只调整四处输入根目录，原 `Promise.all` 和缓存行为保持不变。新增三项测试检查当前加载器/CLI 不继承历史成功、损坏/截断/空归档被拒绝，以及三包文件集合中的同长度篡改、缺失文件和额外文件被实际递归加载器拒绝。

关联 v2.5/v2.6 两个完整文件首轮 **59/59 通过**（27 + 32），无取消或跳过，约 106 秒：

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-5.test.mjs scripts/verify-four-system-current-status-observation-child-v2-6.test.mjs
```

随后运行 `node scripts/run-node-test-group.mjs current-governance`：完整 28 个文件、768 项，**641 通过、127 失败**，无跳过、取消或缺失结果，约 354 秒，整组仍退出 1。与 `d341b86` 的 765 项逐项比较，原 v2.6 的 24 项失败全部转为通过，新增三项通过，没有删除测试，其余结果状态不变。原 269 项失败累计关闭 **142 项，剩 127 项**。Windows 新检出与远端 CI 按最终提交身份另存回执。

本次没有运行归档源码、旧构建或浏览器，也没有把旧观察转签到当前源码。Western 的历史工程组件身份不构成正式领域准入、来源权利、专家意见或实际浏览器验收；5188/5189 安装保持原版本。

原始输入发现、归档与独立复验保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/four-system-v26-input-diagnostic-v1/`；本次测试、审阅及交付证据保存在同级 `four-system-v26-history-v1/`。
