# 日历 App

独立入口是 `src/apps/calendar/index.js`，样式仅在 `src/apps/calendar/styles.css`，没有额外的 `index.html`。

## 功能子文件夹

- `components/`：与日历界面配套的 SVG 图标及玻璃按钮导航。
- `data/`：纯日期运算、农历、日程数据筛选与校验。
- `features/month/`：连续月份日历，点击日期进入单日。
- `features/day/`：七日栏、小时刻度与日程时间轴。
- `features/year/`：全年月份总览。
- `features/agenda/`：按日期分组的日程列表。
- `features/search/`：按标题、地点、备注即时搜索。
- `features/editor/`：新增及编辑日程，iOS 浅灰弹层与时间地点选项。
- `features/events/`：日程详情和二次确认删除。

用户日程保存在现有浏览器存档 `content.calendarEvents`，初始为 `[]`；旧存档没有此字段时按空数组处理。「提醒事项」分段创建内容写入原有 `content.reminders`，不伪装成日程。此数组不等于顶层 `events` 剧情引擎日志，互不干扰。截图中出现的课程、个人邮箱和工作计划都不是游戏示例数据，不预置到玩家存档。

手机系统负责状态栏、灵动岛和上滑返回主屏幕；日历自己负责每一层的返回导航。仅有根目录唯一的 `index.html`。
