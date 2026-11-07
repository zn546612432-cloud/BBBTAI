# 《熙蒙的手机》全 App 内容填充流水线 · v2

这套流程不是给 D08 单独造微信脚本，而是让**D01–D55 任意一天**都按同一个合同，把内容安排到实际支持的手机 App。请先看 [Skill 原文](../.agents/skills/ximeng-story-fill/SKILL.md)、[25个 App 能力清单](../.agents/skills/ximeng-story-fill/references/app-capabilities.json) 和 [跨 App 事件合同](../.agents/skills/ximeng-story-fill/references/cross-app-contract.md)。

**重要**：仓库已有 25 个注册 App 模块（含隐藏别名），但大量 App **暂未实现任意日期的通用剧情适配器**。这套 Skill 和校验器可以准确指出阻塞，**并不能代替运行时代码接线**。

## 三个命令

```bash
npm run story:new -- D23
npm run story:check -- docs/story-packets/d23.json
npm run story:check -- --strict docs/story-packets/d23.json
```

- 第一条创建起始日为 D23（2025-06-10）的空白 v2 内容包，**不覆盖已有文件**。
- 第二条在规划阶段允许提示缺少哪些 adapter。
- 第三条作为发布门禁：缺少 adapter、错误 App、旧90天结构、人物错误、时间倒置等都会失败。**严格校验通过也不代表数据已自动执行，仍需要实际接入、浏览器/手机验收。**

## 任意日期、任意 App 的统一填表

| 部分 | 必填 | 检验点 |
| --- | --- | --- |
| 故事时间 | 起始日、执行日、游戏时钟、允许迟到/跳过规则 | D23=6月10日；D25=6月12日，不能提前完成收货 |
| App 能力 | `surface` + `capability` + `owner` | App 必须真实注册、操作已声明；未接通则阻止发布 |
| 触发因果 | `trigger` + `requires[]` + `once:true` | 短信显示≠点击链接≠支付≠收到货 |
| 内容人物 | 来信人、微信群/联系人、台词/预设 Send | 熙蒙必须亲自发送；熙泰和傅隆生不在狼崽团 |
| 资金/订单 | 货币、唯一回执、订单状态与收货条件 | 只有银行统一扣款，不重复，也不能凭空增加余额 |
| 素材/后续 | 资产 ID、Supabase/本地路径、D+N反馈 | 图片确实存在、MIME正确，收货后才发照片 |
| 测试/发布 | 负面分支、重复、旧存档、手机点击 | 先隔离预览，明确授权合并，核对正式 Pages |

## 两个对照示例

**D06：** 已有专用代码接通的愿望剧情：购买 → 熙蒙点击发送 → 大家感谢 → 仔仔订餐 → 晚餐 → D07反馈。可以在 v2 中标为 `wired-day`，仅在 D06 起始故事链使用。运行 `npm run story:example` 可校验内容合同，但不会再注入第二套剧情。

**D23→D25：** 手机收到短信 → 点击网址进入浏览器 → 在澳觅下单 → 银行扣款 → D25 物流签收 → 仔仔发微信照片。规划文件 `examples/d23-cross-app-needs-adapters.example.json`；在普通模式下会警告未完成的 App adapter，`--strict` **应当失败**。要让它真的能玩，必须先完成这些通用适配器并在移动浏览器里逐步点击验收。

## 每个 App 的接入原则

支持的不是“随便把任何事件塞进所有 App”，而是**按该 App 的真实能力使用**。如银行支持交易，照片 App 管照片，MIRAGE 管委托，Ghost 管工具，NoApp 与象棋有剧情门槛。App 可以不参与某一天，也可以在晚于起始日才显示后果。

原生状态由 App/服务独占，例如微信与短信都要用统一消息服务，银行所有交易都归银行服务。新剧情只填内容，不另造一个按日期重复的 Bank、Reminders、MessageQueue。源代码里仍存在日期专属函数；**直到通用调度器与相应 adapter 真的完成且通过测试，不能宣称随意选择某一天的 JSON 就会自动运行。**

## 旧版数据保护

D01 前历史对话、旧90天朋友圈、语音与素材都不得直接删除。遗留 `src/story/schemas/content.schema.json` 的 `maximum:90` 是旧格式上限，不代表新版 Story55 可以填到 D90。新包必须是 `schemaVersion:2`、D01–D55；旧格式要经过逐项转换与时间线验收，不能直接拿旧90天事件当新55天事件注入。

## 标准交付

设计稿、事件包、真实文案、事件→App adapter表、资产、测试通过率、跨日存档行为、独立预览 URL、正式 SHA/部署结果。任何待实现项都要列出来；**不把规划成功称为开发完成**。
