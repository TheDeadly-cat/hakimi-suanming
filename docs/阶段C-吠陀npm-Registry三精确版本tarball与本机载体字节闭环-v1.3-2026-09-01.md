# 阶段 C：吠陀 npm Registry 三精确版本 tarball 与本机载体字节闭环（v1.3，2026-09-01）

## 1. 结论先行

本轮只完成一个窄而真实的 Stage C 工程证据增量：在公开 `registry.npmjs.org` 上点时观察 `moment-timezone@0.6.3`、`moment-timezone@0.5.48` 和 `moment@2.30.1` 三个精确版本的 metadata 与 tarball；把 metadata 的 `dist.integrity`、`dist.shasum`、`dist.tarball` 与下载字节、当前 `package-lock.json`、tarball 内固定 entry 以及当前本机安装载体逐项对齐。

结果为：

- 3/3 精确版本 metadata endpoint 返回 HTTP 200，final URL 与固定 URL 完全相同；不接受重定向；
- 3/3 tarball endpoint 返回 HTTP 200，final URL 完全相同；
- 3/3 tarball 的实际 SHA-512 SRI 同时等于 metadata `dist.integrity` 和当前 lock `integrity`；
- 3/3 tarball 的实际 SHA-1 等于 metadata `dist.shasum`；
- 3/3 metadata `dist.tarball` 等于当前 lock `resolved`；
- tarball 内 3 份 `package.json`、3 份 `LICENSE`、`2026c` 与 `2025b` 两份 `data/packed/latest.json`，共 8 个 entry，均与当前本机安装路径精确字节相等；
- 没有缺失 LICENSE，没有发现字节不匹配；
- 未执行 `npm install`、`npm pack` 或任何 lifecycle script；tarball 只在已验证的系统 temp 子目录短暂落地，archive entry 在内存中解析；清理目标在递归删除前再次验证，并在删除后以 `ENOENT` 确认不存在；当前复核未发现任何 `hakimi-vedic-registry*` 残留目录。

这只建立“该次公开 Registry 响应字节、lock 与当前本机载体之间的点时一致性”。它不建立 npm publisher 账户身份、包签名、first-seen/发布时间、Registry 历史不变性或包真实性，也不建立许可证真实性/适用性、notice 义务、作品层/版本层/载体层权利、法律结论、再分发权限、内容真值、专家真值、发布就绪或公开发布授权。

## 2. 在线观察范围与精确身份

持久 child 固定的严格观察窗口为不可信本机时钟标签 `2026-09-01T14:42:32.615Z` 至 `2026-09-01T14:42:54.173Z`。metadata 与 tarball 都通过固定公开 HTTPS URL 获取，metadata 及所选 JSON entry 采用重复键拒绝 parser；未使用账号、cookie、token 或第三方私有后台。

### 2.1 `moment-timezone@0.6.3`

- metadata：`https://registry.npmjs.org/moment-timezone/0.6.3`
  - 2,169 bytes
  - SHA-256 `a07e166a0c52c2ab80472140349d6569c318df013e3c3d27fec50291ff8ef6d0`
- tarball：`https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.6.3.tgz`
  - 238,621 bytes
  - SHA-1 `e386bad3116567a44477653ad6543b071bc153b7`
  - SHA-256 `09cc398dae4d95db31016e6e3e35eafff09244a72e0511a292702738e7c724ac`
  - SHA-512 `a5510f03f1c21471dbc09d77d32c27cd8b99a6410670fe8369afcec0d79ba40d7c3326de1479908a50061a8bd78168a343cbd0b66b9df6366bce250182cca47e`
  - SRI `sha512-pVEPA/HCFHHbwJ130ywnzYuZpkEGcP6Daa/OwNebpA18MybeFHmQilAGGovXgWijQ8vQtmud9jZrziUBgsykfg==`
- tarball 与本机精确相等：
  - `package/package.json` ↔ `node_modules/moment-timezone/package.json`：1,076 bytes，SHA-256 `131fc5c4b7ad0c5ebcc00b5670c49ef54c2cf0cd26f68670bee10bfd66276a2b`
  - `package/LICENSE` ↔ `node_modules/moment-timezone/LICENSE`：1,097 bytes，SHA-256 `b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7`
  - `package/data/packed/latest.json` ↔ `node_modules/moment-timezone/data/packed/latest.json`：715,527 bytes，SHA-256 `43f7878a298740ff6acabb9c726c7e5431a94bdca79abad274a6fe6e355bfe81`；严格解析后为 `2026c`、340 zones、257 links、247 countries。

### 2.2 alias 目标 `moment-timezone@0.5.48`

- metadata：`https://registry.npmjs.org/moment-timezone/0.5.48`
  - 2,170 bytes
  - SHA-256 `4eaf51fb08eb703ff0c513831e2c9dd8100d70121bd020d12cd5c31f6a5c94b6`
- tarball：`https://registry.npmjs.org/moment-timezone/-/moment-timezone-0.5.48.tgz`
  - 238,671 bytes
  - SHA-1 `111727bb274734a518ae154b5ca589283f058967`
  - SHA-256 `2c95a267b09e2d3d0fe1511901f05f7d62c806f8e34a35323382c6d3956df826`
  - SHA-512 `7f6d9bf0b57581b4ceda6b368f6cf5dccb8fa20368879533c4bde7ccd018286ada20b9db19cf4d104e9dca28a22efe3a0c645bf00e2483c50a58b8cfb61c411f`
  - SRI `sha512-f22b8LV1gbTO2ms2j2z13MuPogNoh5UzxL3nzNAYKGraILnbGc9NEE6dyiiiLv46DGRb8A4kg8UKWLjPthxBHw==`
- tarball 与本机 alias 安装端点精确相等：
  - `package/package.json` ↔ `node_modules/moment-timezone-2025b/package.json`：1,077 bytes，SHA-256 `4b5a6218fe37ea04bbe19f463fc2477e141bfb8ee18506bd99e871a0d25c3dad`
  - `package/LICENSE` ↔ `node_modules/moment-timezone-2025b/LICENSE`：1,097 bytes，SHA-256 `b3a550795f41cdccdb5eb2523505ce54dc4a7a3e0d3a6d457d297591341795e7`
  - `package/data/packed/latest.json` ↔ `node_modules/moment-timezone-2025b/data/packed/latest.json`：727,104 bytes，SHA-256 `b1ad1446fbc94459f86c8e3f4ffadfc4170ad2af9cbd2a9b85c75d5436ce6425`；严格解析后为 `2025b`、340 zones、257 links、247 countries。

### 2.3 `moment@2.30.1`

- metadata：`https://registry.npmjs.org/moment/2.30.1`
  - 3,669 bytes
  - SHA-256 `98e09e47dde58be32311ad46b8dcb072c6468f37cefd4249e2eda3a211ae9525`
- tarball：`https://registry.npmjs.org/moment/-/moment-2.30.1.tgz`
  - 715,526 bytes
  - SHA-1 `f8c91c07b7a786e30c59926df530b4eac96974ae`
  - SHA-256 `52219a9fee5e1faade4c72536c173c54cedd5e2619272dd0c251a30aeafcde8c`
  - SHA-512 `b849ad3616c33ab58f152fa176314205fcbd7f6628cb3469c1c97e0eaa42ead697db5173b132d055b315fd6ecfccd497eb1fdb842d73037736510e4dcc7ea1a3`
  - SRI `sha512-uEmtNhbDOrWPFS+hdjFCBfy9f2YoyzRpwcl+DqpC6taX21FzsTLQVbMV/W7PzNSX6x/bhC1zA3c2UQ5NzH6how==`
- tarball 与本机精确相等：
  - `package/package.json` ↔ `node_modules/moment/package.json`：3,556 bytes，SHA-256 `5e2f0870f4d1bbef11e8bf90babd72a4399b86b19da81de796a58457a37b8e13`
  - `package/LICENSE` ↔ `node_modules/moment/LICENSE`：1,075 bytes，SHA-256 `8f38f320bbf5eb84c08e08676f7ee1d2204ebe5797f6a090d077329cf212fca3`

三份 package manifest 的 `license: MIT` 只作为本次载体字段观察保存；本文件不复制 LICENSE 正文，也不据此下许可适用性或法律结论。

## 3. temp 与第二次在线复验

第一轮严格观察在系统 temp 的随机子目录完成。临时绝对路径只用于运行期清理验证，不写入 child；删除后以 `ENOENT` 验证。落盘实现完成后，又通过实现内的 live observer 于不可信本机时钟 `2026-09-01T14:57:33.942Z` 至 `2026-09-01T14:57:46.425Z` 重取 3 metadata、3 tarball，并再次确认相同的 3 个 SHA-1、3 个 SHA-512 与 8 个 entry parity；返回 `cleanupVerified=true`。随后只读列举系统 temp，未发现 `hakimi-vedic-registry*` 残留目录。

该 live observer：

- 对 response body 设置 metadata 16 KiB、tarball 2,000,000 bytes 上限；
- 固定 `registry.npmjs.org`、HTTPS、无用户信息、无端口、无 redirect；
- 使用重复键拒绝 JSON parser；
- 验证 gzip/tar header、checksum、终止块、entry 路径与重复 regular-file 路径；
- 不执行解包文件、package code 或 lifecycle script；
- 不访问凭据、账号或私有后台。

这些运行约束仍不是 Node runtime、loader、launcher 或隐藏 pre-evaluation 的身份/完整性证明；visible guard 也不是安全边界。

## 4. append-only child

新增：

- `content/system-admission/vedic-tzdb-core-registry-tarball-parity-observation-child.v1.json`
  - 19,758 bytes
  - raw SHA-256 `8c6cbafa49a2ff4b5c453a7c43fd9474aff338b05b1c0a5b32f303bd0cf5d074`
  - child ID `hakimi.vedic.tzdb-core-registry-tarball-parity-observation-child/1.0.0`
  - child digest `51c4c7ec945050d3bf40b0051d9a3b3237b310a22892f2a57c9399d8d331c86c`
- `scripts/vedic-tzdb-core-registry-tarball-parity-observation-child-lib.mjs`
- `scripts/verify-vedic-tzdb-core-registry-tarball-parity-observation-child.mjs`
- `scripts/verify-vedic-tzdb-core-registry-tarball-parity-observation-child.test.mjs`

child 只以单向 lineage 绑定既有本地 carrier child：

- predecessor raw：12,983 bytes，SHA-256 `3320d773aaf6687af773d8d8a98cbc01cee1f0b83831120069e002caef766884`
- predecessor child digest：`37800051745eeff337134962eb2518c9149eab14cf8369d559419ea76cdca4d0`
- predecessor 未修改，未添加 backlink。

## 5. nonformal v1.3 successor

新增：

- `content/system-admission/vedic-source-binding-and-three-layer-rights-requirements.v1.3.0.json`
  - 12,056 bytes
  - raw SHA-256 `52a86e9b6cac141b8914b5462b92e713a5029d82acb7b97d2f2a92621035920a`
  - ledger ID `hakimi.vedic.source-binding-and-three-layer-rights-requirements/1.3.0`
  - ledger digest `a019f2a78e7631486f56cc75a1de0fe28b8f0d8651ed0b71ec7a5910767326bb`
- `scripts/vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3-lib.mjs`
- `scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3.mjs`
- `scripts/verify-vedic-source-binding-and-three-layer-rights-requirements-successor-v1-3.test.mjs`

v1.3 只把 parity child 作为对原有两个 partial candidates 的补充，不新增 candidate ID：

- `vedic.input.iana_time_zone_and_tzdb_identity`
  - 既有 candidate：`vedic-iana-tzdb-2026c-input-source-candidate-v1`
- `vedic.rule.rights_license_and_redistribution_review`
  - 既有 candidate：`vedic-iana-tzdb-2026c-moment-timezone-rights-candidate-v1`

两项继续都是 `candidate_only_unbound`；`newCandidateIdsAdded=0`，`bindingFrozenVerified=0/38`，`subjectFullySatisfied=0`。v1.3 是 append-only nonformal successor，`successorIsFormalCurrent=false`、`successorActiveEffect=none`。

历史身份复核不变：

- formal v1：85,752 bytes，SHA-256 `2eed084660dbfa9de5c655e40d96c9bb848743f8f14091e8fb3564f2d60385b9`，仍是 formal current；
- nonformal v1.1：94,582 bytes，SHA-256 `9356740cfd960a3137493928978d43d25be432f1bae719dde7ea95c66338c2bd`；
- nonformal v1.2：15,738 bytes，SHA-256 `6d3a36f041801e7120a3d270695f94b34242a97fc1559000f8d4d2c0002a3239`；
- 三者均未修改，均未添加 v1.3 backlink。

## 6. 定向验证

- Registry parity child tests：15/15 通过；
- Vedic v1.3 successor tests：15/15 通过；
- 合计：2 files / 30 tests；
- 两条 fixed-path CLI 均通过；
- 六个新增 `.mjs`（两个 lib、两个 CLI、两个 test）均通过 `node --check`；
- 实现完成后的 live observer 再次通过：3 packages、8 selected-entry parities、`cleanupVerified=true`；
- 没有运行全仓 typecheck、默认 Web build、浏览器/PWA、正式主机、部署或回滚；
- 没有执行 Git，也没有读取受限的 `apps/web/src/lib/local-user-data-cleanup.ts`。

## 7. 持续失败关闭

以下状态没有因为公开 tarball 对账而升级：

- `legacy-v13 / targetSchema 13 / migrationId null`；
- mutation epoch unavailable，receipt `null`；
- cross-file/network atomic snapshot、interval integrity 与 ABA exclusion 均为 false；
- publisher identity、package signature、first-seen、authenticity 均未建立；
- license authenticity/applicability、notice satisfaction、作品/版本/载体三层权利、法律结论、再分发权限均未建立；
- 内容真值、传统权威、专家真值与现实独立专家审定均未建立；
- formal registry/manifest/owner admission 未接入；
- release evidence、release readiness、public deployment/public release authorization 均为 false。

因此，本轮是 Stage C 的真实外部载体字节闭环，不是来源正文冻结、许可结论、专家审定或发布授权。
