# 阶段 D：认证私件 v4 synthetic-only 候选（2026-09-03）

## 结论

本次只新增一个隔离的机械能力：对单条 `binding_freeze_evidence / original_opinion` synthetic fixture 执行 AES-256-GCM 认证解密、envelope 外 Ed25519 pin capability 验签及解密后 exact schema/binding 校验。

它没有修改 v3 formal successor 的输入语义、record type、projection、pair 或 lifecycle；没有接中央 Registry、Web、真实专家、私人材料或生产 key。`legacy-v13 / targetSchema 13 / migrationId null` 不变。

## 工程闭环

实现文件：

- `src/authenticated-envelope-v4.ts`：外层 exact envelope、两类私有品牌 key capability、GCM/Ed25519 校验、最小报告；
- `src/original-opinion-payload-v4.ts`：唯一允许的 synthetic original-opinion payload schema；
- `src/test-support/authenticated-envelope-v4-fixture.ts`：仅测试用临时 Ed25519/AES key 与 synthetic producer；
- `src/authenticated-envelope-v4.test.ts`：正向、密码学篡改、跨绑、smuggling、严格 JSON、capability 防伪和 authority 红门。
- `src/authenticated-envelope-v4-kat.test.ts`：不调用生产 canonical helper 生成预期值的固定 AAD/signature-statement bytes KAT。

实际 AES-GCM AAD 覆盖 envelope/header/boundary 和 nonce。tag 与 ciphertext digest 在加密后才存在，不能进入生成自身的 AAD；独立 Ed25519 statement 覆盖 `AAD digest + tag + ciphertext length + ciphertext digest`，从而无循环地完成全部字段认证。

## 已关闭的攻击路径

- 任意 32+ 字节或 rehearsal JSON 伪装成“外部加密”字节；
- envelope 内嵌 public key、AES key、自带 registry body 或 self-pin 字段；
- signature、ciphertext、tag、nonce 任一位变化；
- purpose/cycle/seat/manifest/scope/selected binding/category/opaque ref 换绑；
- producerId seat 与 expected/envelope seat 不一致，包括 A→B、B→A 完整重加密重签；
- registry、producer、signing-key、encryption-key ID 替换；
- 非规范 Base64、错 nonce/tag/signature 长度、ciphertext length/digest 或 AAD digest；
- BOM、非法 UTF-8、重复 JSON key、未知字段、超限 payload；
- historical、pilot、rehearsal、v2/v3 内层 record type 重包装；
- 普通对象、spread、Proxy、structured clone 或 JSON 序列化后 capability 冒充。

## 仍然开放的红账

`signatureAgainstSyntheticOutOfEnvelopeKeyVerified=true` 只证明：当前字节由与 envelope 外 branded synthetic capability 中 public key 配对的 private key 签署；它绝不表示 external pin 已建立。由于没有外部真实 registry loader、key-owner enrollment、authority grant、rotation/revocation 与可信启动，它不建立现实来源认证，故 `payloadSourceAuthenticated=false / realKeyProvenanceEstablished=false`。

认证解密也不证明 payload 是真人意见、专家本人签署或内容正确。下列状态继续固定：

- identity、credential、scope、participation consent、opinion authenticity：false；
- first-seen、custody、A/B independence、human attestation：false；
- content truth、expert truth、rights/legal、release/public authorization：false；
- Stage C evidence eligibility、formal admission、formal 2/2：false；
- `0/2`、`0/12`、所有 count delta：0；
- persistence、schema-13 mutation epoch、cross-file atomic snapshot、interval mutation、ABA、replay、跨运行 nonce reuse 排除：false/null。

当前 API 只接受内存 raw bytes，没有稳定文件 receipt。现实接入还需外部固定的 producer/custodian key authority、可信时间源、held-handle 文件组合、crash-safe append/CAS、跨进程 replay/nonce registry 和 withdrawal/revocation 流程。因此不能把本 candidate 冒充 first-seen、custody 或正式专家准入。

## 定向验证

2026-09-03 本地定向结果：

- strict TypeScript：通过；
- v4 新增合同与独立 KAT：`108/108`；
- formal successor 完整套件：`209/209`（既有 `101` 全部保留并通过）。

这些结果只证明隔离代码与合成字节合同；不证明现实专家、内容真值、专家真值、权利法律、浏览器/正式运行时、发布就绪或公开发布授权。
