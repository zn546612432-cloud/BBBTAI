---
name: ximeng-story-fill
description: 为《熙蒙的手机》任意 D01–D55 日期与已注册 App 编写、修订或审查剧情内容；通过 App 能力清单校验事件、跨 App 因果、游戏时钟、资产、财务、旧存档和自动化验收。现有已接通流程可复用；未实现的通用适配器必须显式拦截，不能把规划 JSON 当作已运行的游戏。
---

# 《熙蒙的手机》｜跨 App · 任意日期内容填充 Skill v2

**基本原则：系统只建一次，日期、台词、图片、金额、商品、联系人和事件依赖都应作为内容填入。** 本 Skill 是仓库内的工作规范和检查工具，**不是全自动剧情执行引擎**。App 有界面 ≠ App 可以自动接收任意日剧情。通过检查器 ≠ 实际部署/真人试玩通过。

## 使用边界与必读顺序

当用户要求填 Dxx、改任意日对话、生成朋友圈/邮件/短信/日程/订单/图片、跨 App 联动、检查统一系统时使用。按顺序：

1. `references/app-capabilities.json`：**25个注册 App** 的真实模块、操作、是否接线、缺失适配器；其中 mail/editor 是隐藏或别名；实际 Phone/Weather replica 覆盖原实现。
2. `references/system-map.md`：每类副作用由哪个**已存在**服务统一负责。
3. `references/cross-app-contract.md`：用户交互、触发器、排队、日期、跨日、事务和存档规范。
4. `references/acceptance-matrix.md`：正反例与移动端验收。
5. 再读目标日的现有 `src/story/dXX`、真实 App 代码、相关测试。不要以旧 README 的 90 天记录推断新版故事。

**若用户要求“先讨论、不写代码”，只做剧情、触发、分支、角色语气、资源与系统可行性讨论，不改仓库。** 用户授权开发后，才在隔离分支动手。用户要求检查 Skill 不等于同意合并 `main`。

## 统一内容生产流水线（适用于任意 App、任意 D01–D55）

1. **锁定基线**：`main` SHA、CI、前期历史聊天/朋友圈/短信、手机 UI、Story55、角色边界、现有分支；确定禁止修改范围。只在独立分支开发，不清空旧存档。
2. **选择日期与创建事件包**：`npm run story:new -- D23`，自动得到真实日期；填写独立事件 ID、`surface`（实际注册 App ID）、`capability`（该 App 能执行的操作）、`owner`（唯一副作用归属）、游戏日/时钟/前置/人名/台词/图片/迟到处理、交易 ID、负面分支。**JSON schemaVersion=2**。一个包表示事件链的起始日，收货等后续事件可以发生于更晚日期，不能逆时间线。
3. **能力检查（先于剧情实现）**：先运行 `npm run story:apps -- wechat` 或 `npm run story:apps -- aomi` 查看可用动作和状态，再运行 `npm run story:check -- docs/story-packets/d23.json`。遇到 `adapter-required` 必须承认未接通；哪怕内容完整，也**禁止**以 `stage:approved` 或 `--strict` 通过上线门禁。没有注册的 App、错误操作、错误 `owner` 和受锁定条件限制的 App 也直接报错。
4. **明确已实现/待适配清单**：能力标注 `wired-day` = 有**特定起始日**的现成内容入口（例如 D06 愿望）；不代表换到 D23 就能跑。`adapter-required` = 有 App/UI/部分原生服务，**尚无通用内容写入适配器**；先设计/补齐可复用 adapter、写跨日集成测试，不能靠重写该 App 页面“伪装接通”。新 adapter 需经真实测试验证后才能升级状态。
5. **整理自然内容**：角色台词、头像、群成员、消息间隔、图片、朋友圈与后续回忆必须合乎世界书。狼崽团含熙蒙、熙旺、胡枫、仔仔、小辛、阿威，**不含熙泰/傅隆生**。固定主线与可选生活剧情分开；可选心愿不阻止主线推进。玩家说话必须是原生 `player-send`，绝不由付款/定时器代发。
6. **复用底层而非扩写入口**：现有消息走 `appendAuthoredPhoneMessage`，钱包/银行走 `postBankTransaction/payBankPurchase`，委托走现有 MIRAGE→KIRA→GHOST→手动提交→结算；统一游戏时钟和事件持久化。不要让首页与 App 内的同一动作调用不同业务规则。**默认不动** `src/main.js`、`src/system/shell.js`、时钟/电量或各 App 已验收布局。只有跨日期可复用且测试过的新 adapter 才值得修改共享层。
7. **审查存档与资源**：相同事件 ID、财务 transactionId 必须幂等；刷新、断网、低电、跳天、提前/迟到打开、重试按既定策略处理。旧脚本的 D01 前对话与90天时代的静态数据不直接删除；由迁移/兼容层明确映射到新版55天，**旧 `src/story/schemas/content.schema.json` 的 max90 不等于新版允许90天**。Supabase 素材必须确实上传、HTTP200 且 MIME 正确；剧情只引用素材 ID。
8. **证据驱动验收**：`npm run story:audit` → `npm run story:check -- --strict 文件.json` → `npm test` → `npm run build:pages` → 隔离站点的触屏浏览器完整流程 + 旧存档回归。不能靠预置中奖状态冒充真实通关。所有跨 App 效果必须在真实业务状态中出现，不能通过 UI 模拟状态顶替。
9. **提交与复盘**：报告具体增加什么内容、每个 App 使用哪个 adapter、用户如何触发、负面分支、CI/真实预览 URL/版本 SHA、没解决的适配器；合并仅在用户**明确授权**、分支绿色、站点审查通过时进行，合并后再验证正式 Pages 成功。

## v2 事件包合同

事件最重要的字段：`id`、`kind`、`surface`（真实 App ID，如 messages、browser、aomi、wechat；不是笼统“短信”）、`capability`（必须列在该 App 能力表）、`owner`（真实副作用服务）、`actor`、`trigger`、`requires`、`timing.day/at`、`delivery.late`、`once:true`。支付额使用现有 `payBankPurchase` 合同与唯一交易号；图片使用唯一资源 ID。

`npm run story:example` 检查 **D06 已接通的聚餐链**。另一个 **`examples/d23-cross-app-needs-adapters.example.json`** 刻意描述短信→浏览器→澳觅→D25微信收货，它在普通规划校验中提示缺失能力，在 `--strict` 下必须失败；这是设计门禁**正确工作**，不是程序缺陷。所有通用 App adapter 真正落地之前，绝不声称“随机某天填进去就能运行”。

## 绝对禁止的旁路
- 付款=熙蒙已答应=仔仔订位=已吃饭；这些必须是**不同事件**。D06 的正确链是 **付款 → 熙蒙亲自发送 → 大家感谢 → 仔仔订餐 → 晚上照片 → D07条件反馈**。
- 同一银行流水在 MIRAGE、商店或提醒事项分别扣一次，或者游戏货币未经兑换直接成为美元。
- 因为 D23 增加订单就再建立 D23Bank / D23Reminders / D23MessageScheduler。
- 删除 D01 之前历史、旧短信、朋友圈，改过的 iOS UI，低电/解锁/充电逻辑或熙泰的独立 AI/通话人格。
- `manifest` 存在就把 App 宣称为已支持通用剧情；`stage:approved` 只是作者状态，**不等于用户授权发布**。
- 把90天旧资源强行压成55天而不审查其原始日期与前后因果。

## 附件
- `references/app-capabilities.json`：25 个 App 的能力、归属、状态与源码证明（能力表是规划合同，不是运行时注册表）。
- `references/cross-app-contract.md`：跨 App 事件的标准执行序列与必要适配器合同。
- `references/system-map.md`：系统权属与已存在的入口。
- `references/acceptance-matrix.md`：D01–D55 的负面场景、幂等、存档、时钟和 App 验收。
- `templates/day-packet.template.json`：空白 v2 内容包。
- `examples/d06-dinner.example.json`：只供审查、不重复导入的已实现专用链。
- `examples/d23-cross-app-needs-adapters.example.json`：不能通过正式验收的跨 App 规划链。
- `scripts/new-story-day.mjs` / `scripts/validate-story-packet.mjs` / `scripts/audit-story-skill.mjs` / `scripts/list-story-app-capabilities.mjs`：生成日期、检查能力、审查真实源码、列出 App 能力与缺失的 adapter。
- `docs/STORY_CONTENT_PIPELINE.md`：简化作者指南。

## “已完成”定义
只有在目标日/前置事实/所有 App adapter/消息与资金/图片/跨日/旧存档/浏览器交互/预览/正式发布证据全部齐全时，才可以宣布“本日/本支线已完成”。**当前的 Skill 不等于全 App 的 runtime 自动执行器。**