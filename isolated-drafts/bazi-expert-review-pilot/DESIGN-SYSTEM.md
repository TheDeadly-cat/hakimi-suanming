# Design system：无代码专家试审

实现直接取自已保存的 desktop/mobile concept，不改变其白底、深蓝、蓝色操作、橙色警示和绿色本地处理语义。两张 concept 是实现前的视觉参考；红队加固后的实际文案以运行页面为准，顶部已从“仅保存在本机”收窄为“工具不主动上传”。

## 色彩

| Token | 值 | 用途 |
| --- | --- | --- |
| `--ink` | `#071b48` | 标题与正文主色 |
| `--muted` | `#53617d` | 次级说明 |
| `--blue` | `#1f5bd8` | 主操作、当前导航、焦点 |
| `--blue-soft` | `#edf3ff` | 当前项背景 |
| `--orange` | `#e98208` | pilot 警示边框与图标 |
| `--orange-soft` | `#fff8ec` | pilot 警示背景 |
| `--green` | `#087c54` | 工具不主动上传、私密处理语义 |
| `--line` | `#d7deea` | 表格与容器细边框 |
| `--paper` | `#ffffff` | 页面和表单背景 |
| `--subtle` | `#f6f8fc` | 次级底色 |

状态不能只靠颜色表达；始终搭配文字、图标或原生控件状态。

## 字体与层级

- 系统中文无衬线：`"Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", sans-serif`
- H1：桌面 `30px/1.2/700`，移动 `28px`
- H2：`24px/1.3/700`
- H3：`18px/1.4/700`
- 正文与控件：`16px/1.65`
- 表格与辅助文字：`13–14px`
- 所有按钮、输入与表头都显式定义字体，不依赖浏览器默认值

## 容器与布局

- 桌面：固定 header、全宽警示条、`212px / minmax(0, 1fr) / 204px` 三栏
- 主内容最大宽度 `1120px`；细边框、4–8px 小圆角，不使用浮夸阴影
- 左侧是章节导航，右侧把场景、总体问题和使用感受分别计数，并显示本机草稿状态和跳转操作
- 移动端 `< 760px`：导航折叠为单行菜单，内容单列，底部固定“核对并保存 / 下一步”及未保存警示
- 表格在窄屏允许自身横向滚动；页面根不可横向溢出

## 组件

- `pilot-banner`：橙色警示，用普通语言固定说明“只检查题目是否清楚，不作为正式专家审定意见”
- `local-only-mark`：绿色软盘线性图标与“工具不主动上传”；下载位置仍由浏览器或操作系统决定
- `section-card`：单一细边框容器；避免卡片套卡片
- `factor-ledger`：默认折叠的可选计算明细；展开后显示事实/因子表，排除项显示“未计入”文字
- `response-form`：fieldset/legend、原生 radio/checkbox/select、明确 help text 与计数
- `expert/coordinator split`：专家只判断并锁定答卷；草稿恢复、下载和校验值位于折叠的协调人区域
- `empty-text helper`：只把空白说明栏填写为“无”，绝不替专家选择事实、规则立场或风险处置
- `primary-button`：实心蓝；`secondary-button`：白底蓝边；`local-button`：白底绿边
- `error-summary`：`role=alert`、程序聚焦，并链接到第一个错误字段

## 可访问性

- 真实 `label`、`fieldset`、`legend`、标题层级和跳转链接
- 键盘焦点使用 3px 蓝色轮廓；强制颜色模式保留轮廓
- 动效只用于轻量状态变化，`prefers-reduced-motion` 下关闭
- 200% 缩放、390×844、黑白打印均保持可读

## 打印

- `@page size: A4; margin: 13mm`
- 屏幕导航、按钮、上传控件和右侧 rail 全部隐藏
- 显示独立 human-readable projection，包含 seat、pack、record digest、所有专家原文和固定边界
- 场景/问题块尽量 `break-inside: avoid`；长文本允许自然分页
- 打印不生成、下载或上传 PDF，仍由浏览器系统打印功能完成
