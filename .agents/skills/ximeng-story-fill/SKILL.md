---
name: ximeng-story-fill
description: Fill or revise a day of 《熙蒙的手机》 (D01–D55) using the existing unified phone engine. Use for daily story lines, MIRAGE/GHOST contracts, WeChat and Moments, wishes, purchases, images, notifications, AI consequences and multi-App narrative linkage; requires a reviewable event packet, idempotent code adaptation, acceptance tests and isolated preview before merge.
---

# 《熙蒙的手机》｜55天剧情填充 Skill

**目标：只为既有手机系统填内容，不再为每一天复制一套系统。** 本技能为仓库内可执行的工作规程，不是游戏运行时自动读取/执行的配置插件。内容包（JSON）是剧情合同；现有服务负责执行事件。不要把通过 JSON 校验误报为“功能已完成”。

## 何时使用
用户说“继续做 Dxx / 填 Dxx / 修改剧情 / 增加委托 / 心愿 / 朋友圈 / 跨 App 联动 / 合并预览 / 统一系统”时启用。先读 `references/system-map.md`，再看目标日与前后日真实代码、现有对话和测试；以仓库实际程序为准，不以过时的 README、截图或旧分支为准。

**讨论/设计与写代码严格分离：** 用户说“先讨论、不写代码”就只写事件链、真实台词、分支表、资源表，**不改仓库**。用户授权开发后才进入实施。无需对用户已明确决定的细节反复询问；对非关键缺省采用保守、可解释默认值。

## 单一流水线（每个新日/新支线都走一遍）

1. **盘点与保护（Baseline）**：定位 `main` 最新 SHA、运行/查看 CI、正式站点、当前新日内容、D01前历史、已有角色和资产；列出**允许修改的路径**与**不能改的服务**。建立独立分支；不清空玩家存档、不删除历史朋友圈/短信/头像/音频、不覆写已验收 UI。
2. **写事件包（Contract）**：先运行 `npm run story:new -- D08`（替换成目标日；已存在文件**绝不覆盖**），生成游戏日期正确的 `docs/story-packets/d08.json` 草案；再填 `day/date`、角色、触发方式、玩家主动发送、NPC 逐条回复、日期/时间、钱、素材、过期与收货分支、重进/跨日策略。一个包代表**剧情起始日**，事件的 `timing.day` 可以是本日或以后的真实收货/后续剧情日（不超过 D55），但必须依赖真实前置事件；跨日不能借口 `replay` 自动替玩家发送消息。运行 `npm run story:check -- docs/story-packets/d08.json`；人工审定后用 `npm run story:check -- --strict docs/story-packets/d08.json`。每个事件只出现一个稳定 ID；“玩家点击发送”的话语必须是 `player-send`，不能随付款自动写入聊天。**stage:approved 只是作者声明，验证器不能证明用户实际批准了剧情。**
3. **剧情审校（Content review）**：核对人设与自然聊天节奏。手机里只出现真实 App 的内容；不显示“关卡完成、好感+5、玩家”等游戏式提示。核对群成员：熙蒙、熙旺、胡枫、仔仔、小辛、阿威；**熙泰/傅隆生不在狼崽团**。固定剧情和可跳过生活剧情分别标明；不能以可选心愿阻止主线跨日。
4. **系统映射（Adapter plan）**：参照 `references/system-map.md` 把事件写到**现有** `src/story/dXX/` 内容文件或相应注册表；触发器/状态/通知/收发信/时间/充值/钱包/提醒使用既有服务。**默认不改** `src/main.js`、`src/system/shell.js`、时钟/电量内核或银行状态结构。不得把同一个按钮在主屏和 App 内接成两套 handler；必须共用业务入口。确需底层改动：给出复用点与影响面并单独做回归。
5. **素材登记（Assets）**：每张图片先写 `assetId`、源（Supabase 公共 Storage / 已打包本地）和使用事件；真实文件存在后验证 HTTPS、内容类型、体积与手机加载。剧情按素材 ID 经唯一资源表解析；不把 ZIP 当图片，不把未上传说成已上线。首屏必要资源本地加载；生活照按需加载，不在锁屏之前预载55天全部照片。
6. **状态与副作用（One write path）**：一条事件只有一个持久化来源。消息只从 `appendAuthoredPhoneMessage`／现有原生编辑器送出；交易只走 `postBankTransaction/payBankPurchase` 等已有接口；委托只走统一 MIRAGE→KIRA附件→GHOST部署→各阶段→手动提交→结算；时间只由统一手机时钟推进。必须设计幂等、旧存档迁移、错过时间的补发/静默策略和重复点击处理。
7. **验收（Tests）**：先运行 `node scripts/audit-story-skill.mjs` 核对技能说明引用的真实服务文件，再运行 `node scripts/validate-story-packet.mjs <文件>`、`npm test`、`npm run build:pages`；为每个事件链增加**正向、负向、时序、重复、离线/迟到、存档重载、跨 App、图片可达**测试。关键流程用真实模拟手机点击，**不能仅通过构造已完成状态来宣称完整 GHOST 通关验证**。记录部署 SHA、URL、屏幕截图、失败清单。
8. **隔离发布（Preview → Merge → Verify）**：先独立预览 URL 与独立存档命名空间；只预览改动，确认 D01–前一日未退化、手机可触摸、原有四站点保持，图片载入且不闪屏。GitHub checks 全绿且用户授权合并后才合入 `main`；检查主分支 GitHub Pages **实际部署成功**，再给正式链接。不要把“代码提交”“测试通过”“已上线”混为一个状态。
9. **复盘/交接（Report）**：告诉用户**改了哪些内容、触发点、文案、资源、未完成项**；输出验收结果与原始链接。将新增复用规则写回本技能的参考文档，而不是继续扩展主文件/制造新系统。

## 事件链必须具有业务先后顺序

例：D06 聚餐
`钱包挑战结算` → `熙蒙群聊分享` → `角色提出心愿` → `玩家加入提醒事项` → `银行实际付款` → `熙蒙在微信亲自点发送“好啊，一起去吃饭！今晚我请客。”` → `朋友逐条感谢` → `仔仔订餐并确认` → `19:30 用餐` → `20:30 照片` → `D07 条件性回忆`。

**重要**：付款≠熙蒙发话≠餐厅订好≠已经吃饭。任何一步都不能提前替下一步写消息或标记提醒为完成。原生日常对话一律不自动代用户发送。

## 阻断条件
- 交易/奖励双重入账或凭空加美元；未付款却显示已完成；同一消息二次通知。
- 锁屏、电量、日期、后台切换影响另一个 App；新代码删除旧聊天、短信、朋友圈。
- 活动已过期还付款；未收货提前发奖赏照片；没聚餐 D07 却说“昨晚吃撑了”。
- 线上资源404、真实手机无法点/滚动、预览与主站共享存档。
- 本次开发又新建一套 Bank/Reminder/Message/Time 引擎。

遇到这些问题先修**同一事件源或接口合同**，不要为单个页面打旁路补丁。

## 入口与配套文件
- `templates/day-packet.template.json`：每天填空的数据包骨架（不会自动注入游戏）。
- `examples/d06-dinner.example.json`：复盘示例，演示已实现事件顺序，不可作为游戏第二套剧情载入。
- `references/system-map.md`：系统权属、角色边界、注册点及允许修改处。
- `references/acceptance-matrix.md`：必须检查的各类边界情境。
- `scripts/new-story-day.mjs`：一键生成正确日期的 Dxx 草案，不覆盖已有文件，绝不自动变成游戏剧情。
- `scripts/validate-story-packet.mjs`：事件包日期、依赖、财务、角色、动作及资源的结构校验（计划层，不证明剧情已执行）。
- `scripts/audit-story-skill.mjs`：对照真实仓库确认 Skill 引用的文件、入口与命令仍然存在；换结构时先更新此清单。
- `docs/STORY_CONTENT_PIPELINE.md`：给创作者看的简化流程及需求模板。

## 工具与能力边界
本技能是仓库内的指令与校验工具；自动生成的是**待实现的内容包**，不是自动执行的 D08 程序，也不是在 ChatGPT 设置里全局安装的插件。不能声称能一键把 JSON 插进所有 App。构建接入和手机验收仍是必要开发步骤。碰到工具缺失（无浏览器/无文件上传/无发布权限）必须标注阻塞，不得标记完成。

## 交付标准
只有当**内容/触发/素材/反馈/时序/存档/发布**七项证据齐全，才报告“Dxx 已完成”。在此之前如实说“设计通过”“代码已提交”“CI 已通过”或“预览已上线”，附剩余阻塞。
