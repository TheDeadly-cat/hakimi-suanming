# 阶段 C：SMT v2 当前线单条私有正文 Runner v1

## 1. 范围与当前结论

本 runner 只为以下唯一范围提供仓外、本机、只读的字节完整性核验入口：

- Binding：`binding:smt-v10:whole-chart`
- 来源候选：`smt-siku-v10-wikisource-r761703-candidate-v2`
- revision：`761703`
- 主题：`strength.yueling_exact_quote`
- quote candidate：`smt-v10-yueling-minimal-v1`

它复用当前线已经固定的正文 SHA-256／字节数、strict UTF-8、字符 locator、line locator、quote SHA-256 与重叠唯一性检查。当前仓内只用合成正文测试文件读取边界；没有读取或执行真实私有底本成功路径。

成功最多证明：调用者在本机提供的那一份私有字节与当前固定候选完全一致，并同时提供了一份结构合格的“允许本机私有核验”自我声明。它不证明声明人的身份、归属、合法持有、作品／版本／载体权利、最小充分引文、内容真值、专家真值或发布授权。

## 2. 私有目录

私有目录必须是 workspace 外的显式绝对路径；Windows 只接受普通盘符语法，并且目录只包含两个单层普通文件：

```text
authorization.json
source-body.utf8.txt
```

runner 不接受正文路径参数，不递归查找文件，不读取仓内正文，不写入仓库或私有目录。目录或文件 symlink／junction、hardlink、越界、特殊端点、额外文件、缺失文件、超限字节及读取期间可见的 endpoint 漂移均失败关闭。

盘符语法不证明它对应本机物理磁盘；映射网络盘、远程／网络文件系统和运行时真实性均未被排除或认证。

`authorization.json` 必须是无 BOM、strict UTF-8、无重复键的 exact JSON：

```json
{
  "schemaVersion": "1.0.0",
  "recordType": "bazi_smt_v2_local_private_verification_authorization",
  "authorizationId": "auth-0123456789abcdef0123456789abcdef",
  "scope": {
    "bindingId": "binding:smt-v10:whole-chart",
    "sourceCandidateId": "smt-siku-v10-wikisource-r761703-candidate-v2",
    "revisionId": 761703,
    "topicId": "strength.yueling_exact_quote",
    "quoteCandidateId": "smt-v10-yueling-minimal-v1"
  },
  "authorization": {
    "materialProviderAffirmsLawfulPossession": true,
    "localMachinePrivateVerificationAuthorized": true,
    "repositoryStorageAuthorized": false,
    "redistributionAuthorized": false,
    "quotePublicationAuthorized": false,
    "rightsLegalConclusion": "not_established"
  }
}
```

`authorizationId` 只用于输入结构；脱敏收据不保存或输出它。收据绑定 authorization 原始字节摘要、字节数与固定 scope 摘要，但这些摘要仍不能证明谁作出声明。

## 3. 固定 CLI

CLI 不接受任何 argv 参数。私有目录只通过进程环境传入；可见的 `NODE_OPTIONS`、`NODE_PATH`、npm Node options 或 loader／require 注入参数会被拒绝。该检查发生在 Node 进入 CLI 之后，因此不能倒推为 preload 未在 entry 前执行，也不认证 Node、CLI 或 library 来源。

```powershell
$env:HAKIMI_BAZI_SMT_PRIVATE_ROOT = 'D:\approved-private-root'
node scripts\verify-bazi-private-exact-quote-smt-v2-current-line-file-runner.mjs
Remove-Item Env:HAKIMI_BAZI_SMT_PRIVATE_ROOT
```

成功 stdout 只有固定前缀，以及由已验进程内 brand 对象生成的一份脱敏 JSON 投影；失败 stderr 只有固定前缀与稳定错误码。JSON 序列化不会保留 WeakSet brand，离线重建同形对象也不能恢复 brand，且 stdout JSON 没有数字签名或真实性保证。两者都不回显 private root、文件路径、authorization ID、正文或 quote text。

## 4. 仍保持失败关闭的账

- `formalKnowledgeDocuments=0`
- `formalSourceRightsRecords=0`
- `formalSourceCarrierRecords=0`
- `projectCopyMaterializationRecords=0`
- `bindingCitationLocatorLinks=0`
- `bindingsFrozen=0`
- `domainExpertReviews=0`
- `rightsLegalReviews=0`
- `legacy-v13 / targetSchema 13 / migrationId null`
- 内容、专家、权利法律、发布就绪、公开部署、专家声明及公开发布授权全部为 `false`

逐文件 held-handle 和前后重读不构成跨文件原子快照；generic NTFS reparse tag 与 ADS 没有被完整枚举；同权限区间替换、ABA、replay、可信时间和 Schema 13 mutation epoch 均未建立。输入字节在进程内的完整清零也未得到证明。

## 5. 定向验证

```powershell
node --check scripts\bazi-private-exact-quote-smt-v2-current-line-file-runner-lib.mjs
node --check scripts\verify-bazi-private-exact-quote-smt-v2-current-line-file-runner.mjs
node --test scripts\verify-bazi-private-exact-quote-smt-v2-current-line-file-runner.test.mjs
```

测试中的 authorization、正文、hardlink／symlink 和目录全部位于系统临时目录，均为合成材料。fixture-only receipt 使用独立 WeakSet 品牌，不能通过生产 receipt 检查；合成正文也不能取得 current-line production brand。
