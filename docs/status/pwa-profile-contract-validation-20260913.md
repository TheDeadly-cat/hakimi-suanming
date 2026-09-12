# PWA 持久浏览器资料目录合同修复

基线 `3a6fa1e3dd7edad26dde203205bf98eaf34e4956`；开发分支 `codex/pwa-profile-contract-20260913`。此分支独立于本地安装分支，只修测试目录保护、合同断言和对应的当前测试来源身份。应用、Service Worker、数据库及既有 c15ef 安装未修改。

## 行为与检查

统一 helper 在系统临时目录中分配一个短的独占父目录，返回尚不存在的 `profile` 路径。启动只接受本进程实际签发且未使用的路径，在任何异步操作前标记已占用，随后验证父目录真实路径与设备/inode身份，再独占创建 profile。设备与 inode 使用 BigInt，避免 Windows 大文件标识被 Number 舍入。失败和关闭都不允许复用该路径，保留目录供诊断。

三个调用者——PWA安装与离线测试、部署PWA候选测试、同Schema ABA补充测试——都使用此分配器；部署候选仍保留原来的新鲜度检查与路径绑定摘要。没有运行部署候选的远端浏览器采集，也没有触发真实服务发布。

新注册的12项测试覆盖唯一临时目录、日常Chrome/Edge路径在文件读取前拒绝、并发共享拒绝、分配失败、mkdir失败、预存内容保留、父目录身份改变、浏览器启动失败和失败后复用拒绝。AST检查三个实际调用者，并以直接调用、计算属性调用、解构别名调用和任意目录作为绕过负例。目录隔离由真实helper调用验证，不再要求某种`testInfo.outputPath`源码写法。

| 执行 | 实际结果 | 边界 |
| --- | --- | --- |
| 完整 `node scripts/run-node-test-group.mjs release-evidence` | **27文件、712/712；0跳过、取消、遗漏** | 原700项加12项保护测试；最终源码在增加浏览器运行时附件后再次全量通过 |
| 完整 `node scripts/run-node-test-group.mjs ci-contracts` | **56/56；0跳过、取消** | 夜间工作流合同读取兼容LF/CRLF，未修改工作流行为 |
| `node scripts/run-diagnostic-stage.mjs typecheck` | `programStarted:true`、退出0 | 完整类型检查正文，不代表正式npm聚合准入 |
| 原完整PWA测试文件、两个浏览器 | **2/2；各一次，0跳过/重试/不稳定** | 保留原严格reporter，另外保存JSON；固定c15ef产物，没有重新构建 |

真实浏览器CDP回传：Edge `Edg/152.0.4191.66`、Chrome `Chrome/153.0.8010.36`。测试入口 `http://127.0.0.1:4197/`，390×844；两个profile分别独立，均不属于日常5188资料空间。

已验证流程：工作台加载及身份 → 安装资格与manifest检查 → 创建演示案例 → 离线数据管理深链 → 离线案例Revision深链 → 离线帮助页冷启动与刷新。标题、可见内容、原SW/产物身份、离线响应来源、无横向溢出、帮助页WCAG A/AA检查和console检查均通过；六张截图已保存，Codex已查看案例页与帮助页截图。Browser插件未提供，本次使用仓库Playwright入口；未打开日常桌面浏览器。

## 字节身份与首次失败

初次Windows检出使用`core.autocrlf=true`，完整发布证据组在导入时停止，记录为559通过、3失败，且`release-evidence.test.mjs`缺少正常文件结果。19个SW关键源码文件的差异全为Git检出产生的CRLF；历史v1和其他raw-pin输入也有同类转换。逐个核对当前文件的LF字节与HEAD blob、既有固定摘要，再将此独立目录中尚未编辑的文件恢复为提交原字节；没有重算历史摘要或覆盖用户工作。临时过程中尝试的更广属性规则未纳入补丁。最终属性修改仅固定已有21项SW关键来源集合中缺少LF规则的19项。

复现相同输入应从提交原字节建立独立目录，例如 `git -c core.autocrlf=false worktree add ... <明确提交>`，再安装依赖。其他历史raw-pin检查对默认CRLF检出的兼容问题仍是后续治理范围，不能把本次字节一致的目录验证扩大为任意Windows检出均通过。

恢复提交原字节后，原发布证据主测试为138通过、1失败，实际失败正是旧目录正则。新增负例第一轮11通过、1失败，暴露了Number型inode精度不足；改为BigInt后12/12。所有初始结果按实际证据保留，后续复测不叠加计算覆盖。

当前SW来源集合只更新helper一项，再更新当前集合摘要与校验器绑定；旧来源集合仍保留在历史负例中。新helper SHA-256为`729def903b21aa961bb9d0e87fe07ae4073576645a4a698a4435c3ecb8666edc`，当前集合为`8582c897eb6c95e40f2209ef80cd575440910b0d30163344c7272bd5063572c6`。原c15ef产物锁仍为`1403c9d765fff226b68d5b51e9cbe2c9cb724d7e3fc47893d3d3fa081d38227e`，137个文件不变；旧浏览器回执未改签。

## 可复核的本地材料

备份目录：`Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/pwa-profile-contract/`。测试目录、实际命令、JSON、原始日志和截图均保留，不上传浏览器profile或原始材料到GitHub。

| 证据文件 | SHA-256 |
| --- | --- |
| `release-evidence-final/results.json` | `287c476d29166750e087bbd1db114b40aa25858e48138d6acf5b8c6db58a38f8` |
| `ci-contracts-final/results.json` | `5cc673de18e0fc3d63d8794a39eaf4e86c1039051750983a6cf773fd527551f8` |
| `final-node-checks/typecheck.stdout.log` | `51a7ece5fd0044cad8757f1bcfa994d622848fdd3b9d21c69106fd812fc3ad16` |
| `browser-v2/results.json` | `9040ffd85d3fe5a3aba599d4c687a3966dabe19ce6c308abdb3c1b174f76a941` |
| `current-helper-identity-change.json` | `ebcdc02daffef0a1ac01e61c175b8e0bc4f408ac71e6255a988daa9d91756c95` |

## 远端基线与剩余目标

安装分支的[Draft PR #1](https://github.com/TheDeadly-cat/hakimi-suanming/pull/1)已触发真实CI。以下结果精确属于`cdb845782c88491ce511e4027f7a8c73ef0f02d8`，不是本PWA分支的远端通过证明：

| 运行 | 终态与关键结果 |
| --- | --- |
| [Quick CI 34710918460](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34710918460) | failure；完整类型检查、CI合同、包产物工具、current索引、历史checkpoint通过；Vitest为2824通过/1失败（焦点断言）；发布证据旧PWA正则失败；专家0/2继续拒绝；西洋构建告示观察不匹配；构建因安装分支修改package.json后当前运行时清单尚未更新而停止；产物校验被跳过，聚合失败 |
| [Migration CI 34710918485](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34710918485) | failure；Windows在SW关键来源raw身份校验处停止，浏览器迁移未执行 |

两次运行的完整原始日志分别为`remote-ci-baseline/34710918460.log`（`8626958d687350e13f590ec1da88aff344d079c9b80049143fe30930915be33f`）和`34710918485.log`（`68f84c99fffb57ed5488b959eed13b1db102191f83f31ef3fafe85012d2f9d28`）。安装分支的当前清单修复留在该分支，不混入PWA补丁。

完整交付目标仍未完成：专家结构/进度/正式准入职责拆分、269项治理失败逐组归因修复、远端剩余失败处理、下一份独立候选及同产物矩阵、另一台Windows安装和本人真实研究反馈、真实来源校勘与专家原始材料。PWA工程验证不增加专家人数，也不授权替换现用版本或合并main。
