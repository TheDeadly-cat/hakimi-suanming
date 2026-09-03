# 阶段 D：紫微／西洋独立 Manifest verifier 信任边界硬化 v1

日期：2026-08-30

## 结论先行

本批次只把紫微斗数与西洋占星两份隔离工程 draft 的本地机械闭包 verifier 收紧为失败关闭；没有把任一体系升级为正式准入、内容权威、专家审定、许可结论、发布就绪或公开发布授权。

两份 manifest、四体系中央 registry 与跨体系 receipts 均未改写。八字默认治理继续固定为 `legacy-v13 / targetSchema 13 / migrationId null`；紫微与西洋 manifest 的 `targetSchema`、`migrationId` 继续为 `null`，`releaseStatus=draft`。

## 修改范围

仅修改：

- `scripts/independent-domain-release-manifest-lib.mjs`
- `scripts/verify-independent-domain-release-manifests.test.mjs`
- `scripts/verify-independent-domain-release-manifests.mjs`

未修改两份 domain manifest、`content/system-admission/four-system-admission.v1.json`、跨体系 receipts、package scripts、受限 Web 文件或任何 Git 状态。

## 信任边界硬化

### 文件与字节

- 使用 held-handle 有界读取，核对目录链、真实路径、文件端点、硬链接、读取前后 metadata 与实际读取长度。
- 模块初始化时捕获 FileHandle `read/stat/close`、Stats 类型判断、Buffer allocation 与 TypedArray 内部槽；污染 `Buffer.prototype.subarray` 或 FileHandle 原型不能用旧字节掩盖等长磁盘漂移。
- 固定相对路径的目录参数与 `path.resolve` 参数只通过索引和捕获的 Array push 构造；运行期不再用 Array iterator、spread 或动态 `slice`。污染 `Array.prototype[Symbol.iterator]` 不能把 manifest 或组件请求静默重定向到同一 root 内的替代文件。
- 严格 UTF-8、BOM、重复键、非对象根和大小上限继续失败关闭；污染 `TextDecoder.prototype.decode` 不能把非法字节升级为有效 manifest。

### 对象、摘要与品牌

- 对象入口采用被动 data-descriptor snapshot；getter 与 Proxy 不得被 verifier 主动调用，并拒绝 Symbol、稀疏数组、循环、共享别名与 `-0`。
- canonical comparison 不依赖可变的 Array sort／iterator，也隔离 Object／Array 原型继承的 `toJSON`；不能通过原型污染改变摘要或让 current closure 与 persisted manifest 伪相等。
- `Object.freeze`、WeakSet、`Reflect.apply`、Date／`toISOString` 等关键 intrinsic 在模块初始化时捕获。
- pure verifier 只返回 detached、递归冻结、未品牌化结果；full loader 在递归冻结不变量通过后才写入私有 WeakSet 品牌。污染 freeze／WeakSet 不能生成可变结果或伪造品牌。

### 明确边界

上述证据只覆盖模块载入后的进程内污染与当前文件闭包。它不声称自证预导入 runtime、`NODE_OPTIONS`、Node builtin 或 OS 内核整体未被攻陷，也不建立跨文件原子快照、mutation epoch、interval mutation exclusion 或 ABA exclusion。

## 固定身份

### 紫微斗数工程 draft

- artifact：`content/domain-release/ziwei-doushu.engineering-draft.v0.1.0.json`
- bytes：`11591`
- raw SHA-256：`4a09928188c659152383824dca7630a251a3b384b82a81344ea3d3a4b812d5f7`
- manifest digest：`ac8d05dbfe45846e1edbb277ce2e34f076a8e2c7e6adb8c57b75366d04c8eed7`
- binding：required `27`、frozen verified `0`
- independent expert reviews verified：`0`

### 西洋占星工程 draft

- artifact：`content/domain-release/western-astrology.engineering-draft.v0.1.0.json`
- bytes：`10832`
- raw SHA-256：`c138220098346a3ff9857c1e8034914205277bdbe8cf5563e80b58687745a398`
- manifest digest：`5c44fce96357ed80c4274f1f225151764ffe5998956e7e823764499ee45f993e`
- binding：required `28`、frozen verified `0`
- independent expert reviews verified：`0`

### verifier

- lib：`52254` bytes；SHA-256 `f6659c59d20af92355b9e858a441c8e170d8ebad7ac072fcdab0ca350e721bf6`
- tests：`36629` bytes；SHA-256 `634c216f1f6ff453a62e146d66f5462a950723393e06a27c302089b1a72272af`
- CLI：`2479` bytes；SHA-256 `9b4634e0469932522bf9137f318cab546c2d3f76e1111de493d16a2fbb942d5a`

### 未改写的中央账

- `content/system-admission/four-system-admission.v1.json`：`19093` bytes；raw SHA-256 `a81550320e25b5dc696eaa1e2490f93aaf3ccfc0e41a9fb1fa088ceddf434959`
- `packages/cross-system-comparison-draft/src/generated-engineering-fact-receipts.v1.json`：`18816` bytes；raw SHA-256 `7fabe16ea747877cb18692ffc5033fb58ea2d43058deb89aa3039446d47f555d`

## 验证

- D-M1 定向：默认 `29/29`；`--test-isolation=none --test-concurrency=1` 同进程串行 `29/29`。
- `verify-independent-source-binding-requirements.test.mjs` + D-M1 + `verify-release-governance.test.mjs`：默认 `231/231`；同进程串行 `231/231`。
- Array iterator 定向复现：reader 重定向与完整紫微 manifest／component full-load 重定向两项均通过；目标 iterator getter／`next` 为 `0` 次，品牌结果只绑定固定 official digest。
- lib／tests／CLI 三文件 `node --check` 均 exit `0`。
- CLI exit `0`，只声明 `offlineIndependentDraftClosureMechanicallyVerified=true`；formal admission、domain authority、expert claims、release/public deployment 及 epoch／atomic／interval／ABA 均为 `false`／`null`。
- 定向终审范围内没有剩余可复现 P1／P2 绕过；这不是全仓安全审计结论。

## 中央门继续失败关闭

- `verify-system-admission-registry` exit `1`：八字体系 manifest 与当前组件、失败关闭门或证据分账不一致。
- `verify-cross-system-engineering-fact-receipts` exit `1`：当前只读 expected-manifest preview 摘要已变化，旧 D0 决策账不得沿用。
- draft-boundary 检查仍为 exit `1`，但不再含 C-L3 或 D-M1 归因；当前输出明确跳过受限文件，其他红项来自既有 `bazi-expert-review-packet-lib.mjs` 未登记 imports 与 private exact-quote test 的非 literal dynamic import。

这些 expected-red 证明本批 verifier 变化没有被静默冒充成四体系中央闭包，也没有重签旧 receipts。

## 明确未完成

- 紫微与西洋各自的输入语义、流派／口径、事实、规则版本、来源、作品／版本／载体权利、两名现实独立专家和高风险表达边界均未闭合。
- 同上游实现的一致性仍不能充当独立算法验证；八字 v1.7 的任何权威不能向紫微或西洋继承。
- 未运行全仓 typecheck、默认 Web build、完整浏览器／PWA、公开主机、Release Evidence、部署或回滚确认。
- `publicDeploymentAuthorized=false`，`expertClaimsAuthorized=false`，`releaseReady=false`。
