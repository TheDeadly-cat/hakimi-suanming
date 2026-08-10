# 紫微独立 Browser Workspace 草案

这是一个不接入八字生产面的紫微资料库竖切。它包含两条明确分开的工程路径：

- Node 演示继续用显式注入的内存 Store，验证完整 Node fixture 的不可变 Revision、重开与单 Revision canonical JSON 导出/导入；
- 独立 Browser 研究预览在 `http://127.0.0.1:4218/` 运行，每次计算新建一次性 Worker，主线程验真完整 Browser 工件后才允许用户显式保存。

Browser 预览不进入 `apps/web`，不注册 Service Worker，也不导入八字 `Case/Revision`、Schema v13–v16 或 full v1.2。包保持 `private`、空 `exports`，普通生产代码不能按包名导入；普通 `npm run build` 仍固定为 `legacy-v13 / targetSchema 13`。

## 运行独立 Browser 预览

```powershell
npm run build:ziwei-browser-workspace
npm run preview:ziwei-browser-workspace
```

预览固定使用 `4218` 端口。它既不是八字 `4173` 生产预览，也不是 `4216` 的紫微纯计算工件预览。

## Browser 资料库契约

Browser 路径使用独立 IndexedDB `hakimi-ziwei-browser-workspace-draft`，当前数据库版本为 1；库中只有 `revisions` 与 `mutationState`，不读取或改写八字数据库。每份保存记录都是真正的不可变 Revision：

- `studyId`、`revisionId`、`parentRevisionId` 是明确 UUID；根 Revision 的 parent 为 `null`；
- `browserArtifactSha256` 必须绑定内层完整 Browser 工程工件，`contentSha256` 覆盖身份、谱系、标题、备注、工件与全部边界声明，`contentAddress` 固定为 `sha256:<contentSha256>`；
- 保存是 create-only：相同 Revision 与相同字节可以幂等跳过；Revision ID 复用、内容地址碰撞、缺失父 Revision、跨 study 父链或谱系环都会失败关闭；
- 保存、恢复和清空都比较调用者读到的 mutation epoch，并把业务行与新 epoch 放在同一 IndexedDB 事务；陈旧标签页不能覆盖较新的资料；
- 重开会从 IndexedDB 重新读取并核对精确 Store/索引、计数与字节账、canonical bytes、Browser 工件四层摘要、内容地址和完整父链；它不会重新排盘；
- 最近档案默认有界返回 50 条，API 只允许 1～100 条，不把整个资料库静默物化成无限列表；
- 默认单 Revision 上限 4 MiB、全库 512 个 Revision / 64 MiB，完整备份上限 72 MiB。容量不足或浏览器事务中止不会留下部分写入。

计算和保存是两个动作：计算通过验真后仍只在当前页内存中显示，只有用户点击“保存到独立本地档案”才会写入这一个独立数据库。多标签页只通过 `BroadcastChannel` 通知 epoch 变化，不传递出生资料或工件内容。

## 导出、备份、恢复与清空

- “导出此 Revision”只导出一个已重开验真的 Revision。它不是完整备份，也不自动携带 parent；单条导入 API 仍要求 parent 已存在。
- “导出完整紫微档案”会在只读快照中核对并包含该独立 Browser 资料库的全部 Revision 和完整谱系，生成独立的 canonical JSON 备份。它不包含八字数据库，也不是 full v1.2。
- 选择完整备份后先执行零写入预检，报告新增、已存在、身份/内容冲突以及恢复后的容量。预检返回的 target epoch 会绑定随后一次恢复。
- 恢复是 create-only 原子合并：完全相同的 Revision 跳过，只新增缺少项；任何 Revision ID/内容地址冲突、陈旧 epoch、容量不足或事务中止都会整批失败，不覆盖、不删除现有记录，也不留下部分恢复。
- `clearAll` 是唯一删除例外。界面要求先勾选风险确认并再次接受浏览器确认；它只清空 `hakimi-ziwei-browser-workspace-draft`，不会清理八字资料或 full v1.2 分区。

## 证据与声明边界

当前定向草案基线为 Vitest **13 个文件 / 88 项**通过，隔离边界门 **42/42** 通过，并已通过草案 typecheck 与独立 Browser 构建。2026-08-10 起真实浏览器门由 `npm run test:e2e:ziwei-workspace` 提供：Edge 与 Chrome 各通过 1/1、共 2/2，覆盖计算→保存→重开→跨标签刷新→唯一清空全链路，控制台 0 问题。浏览器通过仍不认证现实来源或专家真值。

内外 SHA-256 都没有密钥，只证明当前字节的结构、自洽性和损坏检测；它们不认证历史 Worker、作者或现实来源。Browser Revision 和完整备份均固定声明 `productionEligible:false`、`expertTruthClaimed:false`、不连接八字 Case/Revision，且不构成命理专家真值。

Node 内存路径仍可运行：

```powershell
npm run demo:ziwei:workspace -- 1995-08-18 6 male
```

该命令只打印身份、内容地址、文件信息和边界，不把出生输入或结果写入磁盘。
