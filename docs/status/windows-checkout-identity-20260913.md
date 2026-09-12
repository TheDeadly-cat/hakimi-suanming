# Windows 检出字节与治理验证

本轮修复 Git Windows 检出换行引起的身份漂移，不改变历史摘要、当前选择、业务参数或专家资格。改动接在独立治理分支的 `11a01e0d174a4b2092f4c8614153054ad891ab9b` 后，现用 c15ef 安装及 5188 入口保持原样。

## 复现与修复

同一 `11a01e0` 提交，用 `git -c core.autocrlf=true worktree add --detach ...` 建立独立完整 Windows 检出，真实 SW 源身份消费者抛出与远端一致的 `SW two-generation fixture critical source identity drifted`。21 个关键输入中的 19 个原始字节变为 CRLF，全部规范化摘要仍与原值一致；源身份模块自身的字节也改变。

后续完整验证又定位到历史 policy/schema、其上游 checked-source JSON、HKO 固定生命周期实现，以及检查点、当前索引和当前八字任务输入的相同问题。仅补第一处 SW 规则不足以使完整 Windows 检出可验证，因此保留了所有中间失败，并继续核对实际输入。

最终在 `.gitattributes` 中增加 47 条具体路径 LF 规则及一条 `content/**/*.json` 规则。范围规则前已逐个检查这 150 个已跟踪 JSON 的 Git blob，确认全部本来就是 LF；这条规则保留已有字节，不重算其内容或摘要。原有 `-text` 例外保持优先，包括带混合换行的 README、ABA spec 和历史原始夹具。

Migration CI 新增 `.gitattributes` 触发路径及对应删除负例。新增测试实际创建独立 Git index，使用 `core.autocrlf=true` 检出：保留规则时原始身份通过，去掉规则时确实出现原始身份漂移，而规范化摘要仍相同。测试同时逐字节检查固定 metadata、当前八字输入及已有混合换行文件，没有改变 Git 全局配置。

另外修正三个只涉及测试文本的换行假设：nightly job 分段按 LF 语义解析；HTTP `_headers` 的故障注入匹配 LF/CRLF；rollback helper 的注入以规范化测试副本构造，并继续验证 LF 与 CRLF 正例。所有实际注入仍检查发生变更或被原验证器拒绝，不接受“任意报错”。

## 已取得的证据

| 执行范围 | 源码身份与结果 |
| --- | --- |
| 完整 LF 与 Windows current-governance 组 | `41917c0f6b3c49ca92c9b8a2c8f0148cf5d3225c`：两侧均 27 文件、727 项，478 通过/249 失败；727 项名称集合及 249 项失败集合完全相同，无跳过、取消、缺失文件结果 |
| 上述 Windows 与 LF 差异 | 早期 Windows 额外 86 项失败全部消除；不能据此宣称原有 249 项已修复 |
| 新鲜 Windows 检出的 CI 合同完整组 | `7674862`：5 文件、57/57 通过，含真实 Git 检出正反例 |
| 新鲜 Windows 检出的工作流治理完整文件 | `7674862`：229/229 通过；比前批多一个 `.gitattributes` 触发路径负例 |
| 新鲜 Windows 检出的当前八字完整定向文件 | `7674862`：37/37 通过；此前同方式为 28/37，9 项先被当前输入原始字节漂移阻断 |

最后一组按已选 v2.3 manifest 与当前专家任务包的 28 个不同输入逐项核对，发现其中 6 个仍受检出换行影响；其 Git 字节已与原锁完全一致，只补检出规则。当前专家任务仍是结构性 0/2，合格意见仍为 0，正式准入没有成功路径。

初期 SW 修复后暴露的历史 JSON 失败、上游 checked-source 失败、HKO 实现失败、335/727 的 Windows 完整组，以及 28/37 的八字定向失败全部保留。用于定位下一层的手工还原诊断目录不作为最终验收；上表的 Windows 结果来自另建的新鲜完整 Git 检出。

这不是浏览器验收、迁移演练或发布许可。提交推送后的 CI 仍须按其完整 SHA 单独记录；不得用本地通过覆盖远端失败。不同 PR 分支也不能拼接成统一候选已通过。

## 历史输入恢复补充

旧 readiness 的准确原字节已存在于仓库的 `scripts/fixtures/bazi-expert-intake-readiness-1.5.original.json`，26038 字节，SHA-256 为 `662c91e6269d5e860a0d207185680ea7c7b752f24e313859c0d987cb5b446201`，与旧 manifest 对原路径的绑定完全相等。按原字节复制到 Z 盘，没有运行旧生成器或重写旧 ledger。

本批 24 个历史工程输入身份现已取得 23 个。尚缺 Western rules-preview 旧 README 的 `74d1faf827c0acf301a644af51d1435d3f6ba522b58af20f8f4002f09ade6aa2`；20351 字节历史西洋文档仍单独未解决。工程输入恢复不计为真人专家意见或古籍来源核验。

原始记录位于 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/governance-failure-triage/windows-checkout-identity-v1/`，包括每次完整检出、命令、退出码、逐文件字节差异、整组结果及平台对照。更新后的恢复清单为同一父目录的 `historical-source-recovery-manifest.v2.json`，之前的恢复记录原样保留。
