# 四体系 v2.7 与 Vedic 选定路径历史输入

本批接续 v2.6 修复提交 `b4c24a371b5a2c5c5cf1c4025c3b896e058d205c`，与 v2.6 一起交付。生产加载器、历史记录、current 索引和现实准入状态不变。

## 根因和复用范围

v2.6 修复后的完整治理组中，v2.7 文件仍为 30 项测试、25 项失败。原并行初始化首先观察到 `Fixed raw identity mismatch: scripts/system-contract-downstream-draft-registry.json`；单独调用当前 v2.7 加载器则先经父链返回 `MANIFEST_IDENTITY_DRIFT`。两者都是将当前源码目录用于核对固定历史输入，入口不同，首个失败也不同。

逐项核对 Vedic Manifest v2 的 57 条选定路径、原浏览器记录的 24 项 authored 输入、17 项锁定输入、20 项证据工具及 5 条上下文绑定，再计入固定记录，合并后需核对 98 个唯一文件身份。这些集合有重叠，不能相加成独立文件数。其中 96 项已在 v2.6 的 746 项数据中，原身份一致；只需补入 v2.7 记录及 Vedic Manifest v2，形成 **748 项历史输入**。

v2.7 原 JSON 为 18697 字节，SHA-256 `93e4b0487974d6b4b11312eaec7ee4e759a3af603e67389891bba31a42df4307`；Vedic Manifest v2 为 47107 字节，SHA-256 `ad69843f8e9ec9f1f3f5a446c2107389753100fe371fdbcef7202cbdb39639c4`。当前完整加载器在独立输入目录中得到预期 `childDigest`：`2dde1ccaf92d3437da13dc0ebcd2153fa11724b0be5bfed832ba519b9d5b9637`。

## 修改和边界

新归档 `scripts/fixtures/four-system-v27-additional-inputs.zip` 为 **14188 字节**，SHA-256 `693fd2265e2e9e8d7ee5c27704f5e09698222c8969ffbf194be25794e4e9f76c`。两份原 JSON 合计 65804 字节，另有一份新 `fixture-inputs.json`。解析前固定整个 ZIP 身份，再核对清单、精确唯一安全路径、逐项长度和摘要及总长度。新增文件以 `wx` 写入，不覆盖父上下文。

当前 CLI 使用其原字节副本与指向实际当前库的测试桥接；真实源码 CLI 即使以历史目录为 cwd，仍拒绝借用历史成功。公共 helper 的明确允许版本增加 7。归档代码只作为数据，不执行、不安装依赖、不重新运行旧构建或浏览器。

原 30 个测试函数体逐字节未改，初始化仅将四处输入根改为历史目录，保留原并行调用与缓存。新增三项测试覆盖当前入口拒绝误用、归档损坏/截断/空包，以及选定浏览器源码被同长度修改或 Vedic v2 清单缺失时，递归加载器分别返回 `CURRENT_GRAPH_BINDING_INVALID` / `MANIFEST_MISSING`。

Vedic v2 只核对父记录声明的选定路径，并不枚举整个工程目录。因此不能从本次通过推断所有目录文件完整、领域规则完整、新浏览器验收或正式术数准入；也不把额外文件一概当作违反它的现行合同。原记录中的浏览器观察、领域事实、专家意见、来源权利和发布授权仍分别保留其范围。

## 回归

关联 v2.6/v2.7 两个完整文件首轮 **65/65 通过**（32 + 33），无取消或跳过，约 52 秒：

```powershell
node --test --test-reporter=tap scripts/verify-four-system-current-status-observation-child-v2-6.test.mjs scripts/verify-four-system-current-status-observation-child-v2-7.test.mjs
```

最终执行 `node scripts/run-node-test-group.mjs current-governance`：完整 28 个文件、771 项，**669 通过、102 失败**，无跳过、取消或缺失结果，约 253 秒，整组仍退出 1。结果 JSON 的 SHA-256 为 `6d83f1d8b5b1427ce1986ae1d1a4fa365a50721d77bf81caac54dbfa7e2dba49`。

与 v2.6 阶段的 768 项逐项比较，原 v2.7 的 25 项失败全部转为通过，新增三项通过，其余结果状态不变。与本批之前 `d341b86` 的 765 项比较，v2.6/v2.7 合计关闭 **49 项原有失败**，新增六项通过，没有删除测试；原 269 项累计关闭 **167 项，剩 102 项**。Windows 新检出和远端 CI 按最终提交身份另存回执，不能据本组结果声称整个仓库或正式准入已通过。

原始输入及独立加载证据在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/four-system-v27-input-diagnostic-v1/`；测试、审阅和本批最终交付在同级 `four-system-v27-history-v1/`。v2.6 阶段的原始结果继续保存在 `four-system-v26-history-v1/`，不被最终回归覆盖。
