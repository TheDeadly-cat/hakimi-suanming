# Western v1 原文恢复与历史输入范围

本批从 `ba912b6ae741d1fe098c7705bc945e276ee4e1dc` 开始，恢复旧 Western README，并修复独立体系 manifest 测试对当前源码与历史输入的混用。生产验证器、正式准入、旧清单和当前选择不变。

## 原文恢复

`packages/western-astrology-rules-preview-draft/README.md` 的历史目标为 **18037 字节**，SHA-256 `74d1faf827c0acf301a644af51d1435d3f6ba522b58af20f8f4002f09ade6aa2`。现用同名文件没有被覆盖。

本机现用原文件为 18721 字节、SHA-256 `4e27a2e5d1919f32949be8870a8fd0c73110dd0e9e3f15f4f292416fe0803c3d`，第 30、31 行为 CRLF。Git 的旧内容对象 `b17fc48be61c170a48dd6454008df0f40d4aaf9c` 为 18035 字节、全 LF，来自 `acf9b9869a6c471202beb375b39bc12577f2e283`；较新内容对象 `1a6579dc23c14ba94685daee15965341e00bb748` 为 18719 字节、全 LF，来自 `f14d1eca4c1323a2f5f219ce3c03ad04ad96ba19`。

两个 Git 对象之间有八处单行替换，净增 684 字节；均不涉及上述两处 CRLF。恢复时逆向应用真实替换，保留未改行原字节，得到 18721 − 684 = 18037 字节，SHA 与未改变的历史目标完全一致。再正向应用替换，逐字节还原现用原文件。没有枚举换行组合、补写文本或执行会话中的历史命令。

独立 Python 标准库复验包为 `western-readme-original-recovery-v1.zip`，40294 字节，SHA-256 `8239c4a5f749c049485b032ad8570b4be5ff184905a573dba2d43e14f6d36637`。另一个新目录解压后重放通过；三个固定输入各单字节篡改均被拒绝且不写输出，已存在输出也被拒绝覆盖。该包在 Z 盘保留完整原始输入与过程，不依赖项目安装或旧会话文件。

## 测试输入与执行代码

Western v1 的 27 项原始输入已逐项匹配。此前 Ziwei v2 的 48 项输入与它共享两个字节一致的文件，合并为 **73 项**；有冲突则准备阶段直接失败。测试在自有临时目录使用这些输入，归档中的源码只作为数据。

新归档 `scripts/fixtures/western-v1-original-changed-inputs.zip` 为 62285 字节、8 项，SHA-256 `1ca40a99339474eb5d076a150097a15904e2a3b2c1d617a5082b3a7edf6499ba`。它包含原 manifest、恢复的 README 和六个从 Git 对象找到的原文件；另两项从既有 `four-system-v1-additional-original-inputs.zip` 复用，没有重复打包。原 Ziwei 和四体系归档字节未改。

准备阶段校验三个完整 ZIP 身份、指定条目、原 manifest 身份、每项输入 SHA、重复路径一致性，以及 README 的精确长度与 SHA。未变化输入仍取自当前源码，不通过换行转换来冒充原字节。

验证器始终从本次源码直接导入。CLI 正例使用当前 CLI 的逐字节副本，其相邻测试专用模块只转发到当前验证器；当前源码 CLI 即使在历史输入目录作为 cwd 启动，也必须继续拒绝旧 manifest。临时目录清理继续核对实际父目录、名称前缀、目录类型和原 dev/ino 身份。

## 验证与限制

原 36 个测试中 34 个函数体逐字节未变；另两个分别让完整双体系加载和 CLI 正例使用声明的历史输入。原测试没有删除，新增三项覆盖归档损坏/截断/空 ZIP、当前入口不能继承历史成功、恢复 README 缺失与同长度篡改。

首轮为 37 通过、2 失败，原始结果保留：新增缺失负例原先误将底层 ENOENT 当作外层错误，现同时断言 `COMPONENT_FILE_MISSING` 与底层 ENOENT 的目标路径；扩展后的 Windows 检出验证发现九个现用 LF 输入没有固定换行规则，现仅为这九个路径补充 `text eol=lf`。未变化的 58 项输入均纳入检出字节核验，原缺失属性负例继续保留。

修正后的定向文件 **39/39 通过**，无取消或跳过。随后完整 current-governance 运行 28 个文件、756 项，**557 通过、199 失败**，无取消、跳过或缺失文件结果，整组退出码仍为 1。

与 `ba912b6` 的 753 项结果按文件、测试名和同名出现序号逐项比较：原有三个独立 manifest 失败转为通过，新增三个负例通过，没有删除原测试，也没有其他测试结果状态变化。原 269 项治理失败累计关闭 **70 项，剩 199 项**。较后历史链与现实准入仍未完成。完整结果文件 SHA-256 为 `d24db18d9a2ea27b208c516e9099c650ff7dd537313d3b5765596c2d47d1ed15`。

执行命令为 `node --test --test-reporter=tap scripts/verify-independent-domain-release-manifests.test.mjs` 和 `node scripts/run-node-test-group.mjs current-governance`。上述结果属于本机完整执行；提交后的 Windows 新检出与远端 CI 按它们的实际提交身份另存回执，不能相互冒充。

恢复和回归证据分别保存在 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/western-readme-session-recovery-v1/` 与 `western-manifest-history-v1/`。较后 Western manifest 使用的合约和页面输入与 v1 并不相同，不能把所有历史层的路径强行合并成一个版本。本批尚未证明这些后续历史链通过，也没有新增现实来源、权利或专家意见；不更换 5188/5189 安装。
