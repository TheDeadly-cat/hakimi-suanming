# 吠陀临时 Mutation Epoch 工程实验 v0.1（2026-08-31）

## 结论

本轮只新增一个零个人数据、随机临时 IndexedDB 的机械运行实验。它验证候选 CAS、mutation epoch、A→B→A 历史身份、事务中止、quota-like 合成中止和 generation 重建；不选择吠陀产品 identity、正式 namespace、storage backend、target schema、migration、备份恢复方案或发布路径。

因此，本实验不会更新：

- `content/system-admission/vedic-independent-productization-requirements.v1.json`；
- `content/system-admission/vedic-independent-storage-backup-recovery-and-rollback-design-candidate.v0.1.0.json`；
- `content/system-admission/four-system-admission.v1.json`；
- 任一 domain release manifest 或 Release Evidence。

## 落盘范围

- `packages/vedic-mutation-epoch-runtime-experiment-draft/`
  - `private: true`；
  - `exports: {}`；
  - `productionImport: forbidden`；
  - `productIdentity / targetSchema / migrationId: null`；
  - `runtimeOptionSelected / storageBackendSelected: false`；
  - 无运行时依赖。
- `scripts/system-contract-downstream-draft-registry.json`
  - 仅登记技术隔离边界；该 registry 明确不绑定上游 readiness。
- `package-lock.json`
  - 仅登记该私有 workspace link。

没有修改 `apps/web`、PWA、Service Worker、中央四体系准入账或默认 `legacy-v13 / targetSchema 13 / migrationId null` 发布治理。

## 机械不变量

1. 数据库名必须带固定 `ephemeral-mutation-experiment` 标识和随机 UUID；工程观察只包含其 SHA-256，不包含原名。
2. generation 内成功 mutation 的 epoch 精确加一；失败 mutation 不改变 state、epoch、三条 head 或工程观察。
3. read/compute 后，写事务会重新读取并 exact-capture 当前 raw envelope，再与基线的完整 canonical base 精确比较；不信任存储对象自报的 `envelopeDigest`。state、epoch、chain head、revocation head、consumed-nonce head 与工程观察在同一 IndexedDB readwrite transaction 提交。
4. operation ID、nonce 与 idempotency key 只由 runtime 内部随机生成，调用者不能注入原文；它们与 restore snapshot 均只记录消费摘要。
5. 四个 consumed-digest 数组会在 canonical/hash 前按精确自有 data descriptor 捕获；holes、symbol／额外字符串键、accessor、non-enumerable item、非法或重复 digest、超限长度均失败关闭。
6. A→B→A 允许回到同一合成状态摘要，但 epoch 与 chain head 不回退，不把 A 误认成旧快照。
7. 删除并重建同名临时库会生成新 generation；旧 generation 的 restore probe 不可写入。
8. restore probe 是内存中的机械快照并要求同 realm 私有品牌；公开可重算 hash 不能单独取得签发身份，且它不构成备份或恢复能力。模块求值时只捕获了 `Reflect.apply` 与 `WeakMap.prototype.get/set`，当前测试只证明 post-import `WeakMap#get` 污染不能伪造品牌。
9. 本实验要求模块在受信 realm 中导入；pre-import primordial integrity 与其他 primordials 的完整性未建立，不能外推为通用 hostile-same-realm、fresh Worker 或 SES 安全边界。
10. quota-like probe 只是 labelled synthetic post-put abort injection，不是实际 `QuotaExceededError`、浏览器容量或配额测量。
11. 没有 external monotonic anchor，也没有独占／认证的 same-origin store ownership；不能排除完整旧且自洽的 envelope／数据库回灌，也不能排除 live same-origin raw writer 在本次 transaction 后覆盖。malformed same-digest 竞态测试只证明该固定竞态在提交点失败关闭，不证明全部 writer 已认证或后写被阻止。
12. 工程观察会冻结但没有私有品牌或真实性认证；公开可重算的 `observationId` 不是签发证明，下游不得把它当产品 receipt，`productMutationReceiptIssued=false`。
13. 所有 authority 字段固定为 false；工程观察明确为 `browser_or_test_runtime_mechanical_observation_only`。

## 当前证据分账

### 工程证据

- 独立 strict TypeScript：通过。
- Vitest：`1 file / 10 tests` 通过；覆盖 private brand、caller-text 拒绝、restore alias、malformed same-digest raw writer 竞态、digest-array 额外属性拒绝与 post-import `WeakMap#get` 污染拒绝。
- 隔离 Vite build：通过，6 个模块；本轮没有把它等同于完整 Web build。
- 技术 draft registry 已识别本包；全局 boundary 命令仍受禁读文件和其他既有脚本红项影响，因此不记全局通过。
- registry 对 `fake-indexeddb` 的 allowlist 目前是包级而非 test-file 级；虽然运行时依赖为空且 production import 被禁止，未来晋级仍须新增 file-scoped test-only import gate。

### 浏览器／运行时证据

- 应用内浏览器已在独立随机端口加载本实验页面；标题与 DOM 正确，初始控制台 error/warn 为 0。
- 六项按钮流尚未计为通过；尚未建立临时数据库创建、六项 probe 结果或 cleanup 的浏览器证据。只有完成真实点击、结果 DOM、日志与截图核对后才可补记。

### 未建立的账

- 吠陀输入、事实或规则的内容真值：未建立。
- 38 条来源 binding、来源正文、exact quote 与作品／版本／载体三层权利：未建立。
- 现实专家身份、资质、独立性或至少两份意见：未建立。
- 正式产品存储、容量预算、真实 quota、备份、恢复、回滚、PWA、跨浏览器或公开主机证据：未建立。
- release readiness、public deployment/release authorization、expert claims authorization：全部为 false。

## 后续准入要求

如未来把任何实验结论转成正式能力，必须另行完成 owner scope、runtime/backend、privacy/retention、schema/namespace、真实配额、备份恢复和 rollback 决策与证据，并触发独立复审。不能通过改名或引用本实验绕过这些红门。
