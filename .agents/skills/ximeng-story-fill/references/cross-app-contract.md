# 跨 App、任意日期事件合同（v2）

## 1. 为什么不能只填 Dxx 数据就声称可运行

手机里每个 App 独立拥有自己的 `render/handle/submit`，而 `src/services/story55/runtime.js`、`src/services/messaging/lifecycle/registry.js` 和各 App 仍存在 D01–D06 的专属入口。现有 `src/services/story-engine/index.js` 只有基本读取/可见性函数，**并不是通用事件调度器**。这里描述的是需要达成的接口合同，不能把这份文档、JSON 或校验器冒充已运行的通用引擎。

`references/app-capabilities.json` 是**规划期能力清单**，其中:
- `wired-day`：已经在源码里接通过专用事件，如 D06 愿望；`originDays` 必须匹配剧情包起始日。可以有未来收货日期，但不能改成 D23 就当作已实现。
- `adapter-required`：有 App 界面、原生能力或定制场景，但**尚无可校验的任意日期剧情数据接入**。规划阶段会提示，严格验收阻止发布。
- 没有列出的动作、没有注册的 App（例如目前独立目录但未进 `src/system/registry.js` 的 Instagram）、隐藏别名如 `mail` / `editor`：一律阻止通用剧情注入。

## 2. 最小事件模型

```text
storyId + eventId + revision     唯一标识及内容修订
originDay                        事件链创建日 D01..D55
timing.day/at                    游戏时间；允许跨日至 D55
surface + capability             真实 App ID + 声明过的动作
owner                            唯一持久化/副作用服务
trigger.type/ref                 时间、手动点击、剧情完成或前序事件
requires[]                       前序事件或事实标志
actor / thread / text / assetId   内容载荷（有条件必填）
once: true                       持久化幂等
delivery.late                    silent / skip / replay（不得重放玩家发言）
receipt / transactionId          交易的稳定 ID
```

在同一时间轴发生多项事件，必须在 `requires[]` 指明因果，**不能靠数组排列顺序碰运气**；NPC 逐条消息还应按既有消息队列控制间隔。玩家必须**在原生 UI 亲自点击**，才能提交他的发言和订单。UI 点击前仅能展示预填草稿。

## 3. 未来通用 adapter 的必备能力（设计合同，尚未全部实现）

每个 App 适配器应当提供稳定、可测试的接口：`validatePayload(event)`、`isReady(state, event)`、`applyOnce(state,event,context)`、`linkToApp(event)`、`reconcileAfterJump(state, from, to)`。它们是需要逐项实施的**目标接口**，不是已经存在的 JS 导出。

`applyOnce` 不能绕过 `PhoneStore.update`；须复用消息 `appendAuthoredPhoneMessage`、银行 `postBankTransaction/payBankPurchase`、Ghost/委托与日历等真实服务。操作应将事件 ID、修改的业务 ID、执行日、结果状态保存到同一持久化位置；对已处理事件**只返回既有结果，不再扣费/发两份通知**。

所有事件必须明确三种东西：
- **可见**（Visible）：目前是否应在 App 中出现这条内容。
- **可操作**（Actionable）：玩家能否点击/发送/付款（角色和剧情门槛、时间、余额等）。
- **已处理**（Applied）：对应业务副作用是否真正、且仅一次被写入状态。

不要用一个布尔值 `done` 混合“已看到/已付款/已回话/已收货/已完成剧情”。

## 4. D23→D25 必须拆开的跨 App 链

| 事件 | App 与业务权属 | 触发条件 | 结果 |
| --- | --- | --- | --- |
| D23 短信 | messages / messaging | 14:30 | 收到短信、红点、顶部通知 |
| 玩家点链接 | browser / browser adapter | 点击短信内真实链接 | 浏览器打开已登记页面 |
| 用户购买 | aomi / 商城适配器 + bank | 玩家点击支付且银行余额足够 | 同 ID 订单 + 银行负数流水 |
| D25 收货 | aomi / 订单与时间服务 | D23 订单存在且物流时间到 | 物流已签收，不再扣款 |
| 仔仔发图 | wechat / messaging + assets | 真实收货已确认 | 私聊照片一条、未读一次 |

**现状：这条链仍需要多项 adapter，不能执行。** `examples/d23-cross-app-needs-adapters.example.json` 可在规划状态通过，但严格校验必须失败，明确提醒开发人员补 adapter。补好后应在一条完整手机模拟交互中验证，不能仅仅把能力表改成 `wired-day` 欺骗检查器。

## 5. 先实现通用适配器，不按日期复制模块

优先实施顺序：消息/SMS 与原生 Send → 邮件/KIRA与文件附件 → 浏览器链接 → 提醒与日历 → 银行和订单/澳觅 → 物流照片/朋友圈 → 地图地点 → 电话/NoApp/AI隔离。所有新增场景应使用相同的数据入口，且复用实际存储。

**验证新适配器是否真通用**：同样事件模板分别设 D08、D23、D44，三天都应使用同一个入口和存档规则；时间、是否显示、延迟、重复点击/刷新、跳天、未解锁 App、无资源时的行为都应得到验证。没有真实跨日回归之前，不能升级能力清单的状态。

## 6. 旧90天资源与55天新剧情

旧 `src/story/schemas/content.schema.json` 的上限为90，只属于遗留格式；新版 Skill v2 仅允许 D01–D55。不可删除那些历史文件或自动按比例压缩时间。必须建立明确的转换审校：源 ID/原日期→新的故事日/事件 ID、是否还要显示、是否有重复、有关联的相册和消息资源、旧玩家存档如何继续读取。未审查的遗留素材继续保持原样，不自动注入新版调度器。

## 7. 交付与验收门禁

- 正常规划：`npm run story:check -- docs/story-packets/d23.json` 允许报告“部分能力待适配”，但不能把 WARN 当成已接线。
- 严格交付：`npm run story:check -- --strict docs/story-packets/d23.json` 如发现 `adapter-required`、旧v1、错日期、错 App ID、错误权属、门槛或依赖，必须失败。
- 仓库审查：`node scripts/audit-story-skill.mjs`，核对 App 清单与实际注册表、API 来源文件；它**不能证明**手机真有这项运行时能力。
- 实际验收：现有测试、功能自动化、隔离浏览器点击、跨日旧存档、网络断开、图片 HTTP MIME、余额和通知。
- 交付说明必须区分 **设计/校验通过**、**适配器落地**、**运行时测试通过**、**Pages 部署成功** 四种状态。
