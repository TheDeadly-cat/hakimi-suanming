# DTT 月令候选三角色四视图模板预览

这是协调员和产品评审使用的本机只读模板预览，不是现实专家入口、登录系统、访问控制或物理分席工具。

## 四个视图

- `/source-collation`：来源／书目／校勘模板；
- `/rights`：作品、转录与载体三层权利核对模板；
- `/domain-a`：领域专家 A 的普通中文题面模板；
- `/domain-b`：领域专家 B 的同题模板。

同一人可以通过导航浏览全部四个视图。当前页面没有意见字段，因而没有可供跨席查看的意见；未来现实 A／B 意见必须使用分别构建、分别发放的物理包或独立受控会话，不能把本预览当作隔离证据。

## 启动

在项目根目录运行：

```powershell
node isolated-drafts\bazi-expert-review-pilot\three-role\server.mjs --port 0
```

服务只绑定 `127.0.0.1`，只响应固定 GET／HEAD 路由。应用本身不主动访问外网；点击页面标明的公开来源链接会离开本地页面并联网。

## 定向验证

```powershell
node --test isolated-drafts\bazi-expert-review-pilot\three-role\test\preview-contract.test.mjs isolated-drafts\bazi-expert-review-pilot\three-role\test\server.test.mjs
node --test isolated-drafts\bazi-expert-review-pilot\three-role\e2e\preview.playwright.test.mjs
```

浏览器测试使用已安装的系统 Edge；找不到该可执行文件时会跳过，不会下载浏览器。

## 当前机器 basis

- packet：`hakimi.bazi.dtt-month-command-three-role-review-packet/1.0.0`
- packet digest：`c1f92bbb836875b50458e1a3c81bf1f2c1aa4a654fa8a9a9f66a7198f71a7d8e`
- persisted artifact：`30854` bytes
- raw SHA-256：`252370b6a03e799321544948182351a96d42d148fe8e3039eacdb43385a4b5ca`

Node 测试会读取真实 packet、source ledger 和 rights ledger，重新核对上述 raw identity 及页面使用的候选 ID、digest、locator 和 carrier 元数据。浏览器本身只消费静态投影，不取得 loader private brand，也不证明跨文件原子快照、mutation epoch、interval mutation 或 ABA 排除。

## 不建立的结论

当前固定：

- `synthetic / candidate-only`；
- reviewer seat `0/4`；
- domain seat-item assignment／completion `0/4`；
- Binding `0/12`；
- 现实领域专家 `0/2`；
- `legacy-v13 / targetSchema 13 / migrationId null`；
- 内容真值、专家真值、权利法律结论、发布就绪、公开部署和专家宣称授权全部为 `false/not_established`。

本目录不保存来源正文、引文正文、真人身份、联系方式、真人命盘或现实意见；也没有提交、上传或持久化能力。
