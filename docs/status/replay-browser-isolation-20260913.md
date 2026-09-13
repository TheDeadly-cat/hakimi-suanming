# 合成文件回放测试的浏览器版本隔离

基线为 `d341b862b174d18d18e36a778ee7f8a433e66164`。该提交的 [Quick CI 首轮](https://github.com/TheDeadly-cat/hakimi-suanming/actions/runs/34748869320) 在 `Toolchain and boundaries` 的 `npm run test:release-evidence` 中出现 294 通过、1 失败：合成文件回放夹具调用真实 `microsoft-edge --version`，5005 毫秒后因 `ETIMEDOUT` / `SIGTERM` 返回 `RELEASE_BROWSER_VERSION_PROBE_FAILED`。

该测试验证合成回执、文件摘要、产物锁及源树绑定，不承担真实浏览器验收。生成器和验证器都会独立采集工具链，因此只隔离生成端不足以修复这种环境依赖。

## 修改范围

仅修改 `scripts/release-evidence.test.mjs`，新增测试夹具 `scripts/release-file-replay-browser.test-fixture.mjs`。生产生成器、文件验证器、回滚验证器、浏览器探测函数、5 秒超时和失败拒绝规则均未改变。

测试父进程使用随单个测试恢复的浏览器探测替身；生成与验证 CLI 子进程通过明确的 `--import` 加载同一夹具。普通导入不启用子进程替身。子进程启用前核对当前 CLI 路径、限定参数、实际临时目录及 `SYNTHETIC.txt`，拒绝任意脚本和普通源码目录。原有环境白名单继续排除继承的 `NODE_OPTIONS`、密钥和发布身份。

替身只处理 Chrome/Edge 的版本探测，包括 Windows 文件版本读取；Git、npm、Node 和文件读取仍真实执行。合成版本始终为 `Microsoft Edge SYNTHETIC-file-replay` / `Google Chrome SYNTHETIC-file-replay`，生成端还记录并校验两次探测。生成器、父进程文件验证器及验证 CLI 使用一致的合成环境，工具链比较仍由生产验证器执行。

原有全部 93 个语法层测试回调（含表驱动声明）逐字节未变；这不是运行时用例数。新增两项测试分别检查夹具启用范围，以及合成版本被改动后仍被生产验证器拒绝。原有超时、权限、空输出、失败首选程序、脏源码、缺失回执、锁冲突和 CLI 排他写入断言继续执行。

## 本地验证与保留的失败

- 第一轮隔离误拦了生成器的 Git 状态读取：296 项中 286 通过、10 失败，原日志保留。
- 第二轮只完成生成端隔离，验证端仍读取真实版本：296 项中 287 通过、9 失败，原日志及当时源码保留。
- 修正后的原 CI 命令 `npm.cmd run test:release-evidence`：6 个文件、**297/297 通过**，约 63 秒。
- `node scripts/run-node-test-group.mjs release-evidence`：完整 27 个文件、**718/718 通过**，约 99 秒，无跳过、取消或缺失文件结果。结果 JSON 的 SHA-256 为 `d7461c84920e9e77fb94452713acb791c88c72e516f4d94b7e0fe8c64c850d6c`。

以上两个成功执行存在重叠，不能相加为独立覆盖。Windows 新检出和远端 CI 按最终提交身份另存回执。此前 `d341b86` 的远端失败不会因后续成功被覆盖或改写。

本次不增加真实浏览器、来源、专家或发布授权证据，不改变 current 选择、已安装的 5188/5189 产物，也不减少原治理组尚余的 151 项失败。原始日志、审阅记录和提交交付回执位于 `Z:/HakimiBaziBackups/LocalDelivery/2026-09-13/replay-browser-isolation-v1/`。
