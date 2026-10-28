# 《熙蒙的手机》剧情预设文件（v1）

这套系统与手机 App 的界面代码、玩家实际聊天记录分离。新增剧情时，在 `days/D001/` 至 `days/D090/` 下按软件放 JSON，然后把相对路径列入 `days/manifest.json`。例如 `days/D057/wechat.json`。**只保留一个网站入口 `index.html`**；文件夹不代表另开网页。

## 数据分层

| 位置 | 作用 | 更新方式 |
| --- | --- | --- |
| `days/D057/wechat.json` | 第 57 天微信预设规则和可选的作者历史消息 | 更新项目代码或导入开发者编辑器 |
| `days/manifest.json` | 记录自动加载的剧情文件路径 | 新增每日文件时登记 |
| `engine.js` | 连续消息消抖、关键词/时段/标记/优先级匹配、NPC 主动发送 | 程序规则，勿把台词写在这里 |
| `io/format.js` | 校验 JSON 的格式、时段、ID、内容长度与重复 ID | 增加文件格式版本时修改 |
| `io/import.js` | 冲突预览、合并或仅替换同 ID 规则 | 不覆盖实际玩家聊天记录 |
| `io/export.js` | 按天或全部导出 JSON | 不导出玩家聊天和游戏进度 |
| `src/editor/presets/index.js` | 专用开发者界面：编辑/测试/导入/导出 | 调整后台功能时修改 |

玩家已经使用的一次性规则（`usedIds`/`usedGroups`）、剧情阶段标记（`flags`）、真实发出的消息、时间和电量属于独立存档，不是导入文件。导入不会重置它们；删除规则会留下本地删除记录，重开游戏也不自动恢复。主动在开发者界面重新导入才能恢复。

## 文件实例

```json
{
  "format": "ximeng-preset-day-v1",
  "day": 57,
  "channel": "wechat",
  "label": "凌晨的消息",
  "rules": [
    {
      "id": "wang-d57-night-answer", "title": "凌晨仍没睡", "kind": "reply", "mode": "",
      "day": 57, "channel": "wechat", "conversationId": "wang",
      "from": "03:00", "to": "05:59", "priority": 110,
      "enabled": true, "once": true, "condition": "any", "keywords": [], "minMessages": 0,
      "requiresFlag": "wang-overnight-await", "setsFlag": "wang-overnight-answered",
      "group": "wang-overnight-answer", "messages": ["你怎么还没睡？"]
    }
  ],
  "history": []
}
```

`rules[].kind`：`reply`（收到玩家回复后）或 `proactive`（NPC 自己发）。主动发送时 `mode` 为 `scheduled` 或 `conditional`（按玩家当天已发消息总数）；回复按 `condition` 判断：`any`、`keywords-any`、`keywords-all`、`message-count`。`priority` 大者优先；`group` 可以让同组的日夜回复只用一次；`requiresFlag`、`setsFlag` 表示剧情前置和阶段推进。

`history` 可选，用于导入历史聊天，格式如下：

```json
"history": [{
  "conversationId": "wang",
  "conversationName": "熙旺",
  "messages": [{"id": "historical-wang-001", "from": "wang", "text": "嗯。", "time": "21:10", "sentDate": "2024-03-10", "appearance": "immediate"}]
}]
```

历史消息必须给稳定且唯一的 ID。重复 ID 的已有记录一律保留；导出的剧情文件不会包含玩家实际输入的消息。`appearance` 可为 `immediate` 或 `game-time`；后者进入手机原有的定时出现机制。

## 开发者界面导入步骤

1. 手机开发者入口 → **剧情预设** → **导入 JSON…**。
2. 选择单日文件，或 `ximeng-preset-bundle-v1` 的 `{"packs":[...]}` 合集。
3. 先看新增数/冲突数，再选：**合并**（已有规则保留）或**仅覆盖同编号规则**（历史消息仍保留）。
4. 在同页预设匹配测试，检查时间、关键词与回复优先级。
5. 点击**导出第 N 天**或**导出全部剧情**，得到可追踪版本的 JSON 文件；导出 JSON 与存档备份不同。

限制：每个单日文件最多 500 条规则、每条最多 30 个消息气泡；单次手工导入文件不超过 2 MB。空白的新建规则必须填好台词，才能通过正式 JSON 校验。
