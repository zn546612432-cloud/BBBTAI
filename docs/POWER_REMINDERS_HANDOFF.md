# 提醒事项滚动与电量跨日 · 独立分支交接

本功能独立于 Claude 正在进行的 FoundPhone 页面修订；此分支不应直接覆盖 `main`。集成前先检查 Claude 是否修改了 `src/main.js`、`src/system/shell.js`、`src/system/gestures.js` 和 `index.html`。

## 模块

- `src/apps/reminders/styles.css`：Safari 原生纵向滑动、长列表滚动及新建栏固定。
- `src/apps/reminders/index.js`：为提醒事项滚动区添加 `data-native-scroll`。
- `src/system/gestures.js`：全局下拉/左右滑手势不抢占标记为原生滚动的区域。
- `src/system/power/battery.js`：电量下降规则与可测试的跨日逻辑。
- `src/system/power/island.js`：20% 红色电池、中文提示及充电状态的灵动岛视图。
- `src/system/power/styles.css`：胶囊展开、红色呼吸及绿色充电动效。
- `src/main.js`：前台解锁时每 45 秒减少 1%，点击灵动岛先动画，再进入次日。

## 不可破坏的剧情规则

1. 不根据现实午夜或刷新自动换天。关闭页面不应消耗大量电量。
2. 日常电量不低于 20%，不会意外关机；20% 时点击灵动岛才触发过夜。进入次日后电量为 100%，时钟 08:30，进入锁屏。
3. 跨日不删除聊天、照片、提醒事项、邀请、棋局和已发生事件；日期由 `calendarAnchor` 与 `day` 计算。
4. D90 的电量归零、充电失效、血迹擦拭和熙泰继承是单独的固定结局流程。本模块在 D90 阻止跳到不存在的 D91，不抢先制作结局。
5. 正式剧情播出前置条件及跨日触发器尚未接入；接入后应在 `advanceAfterCharge` 前调用对应的剧情总控，不能直接跳过未播放的固定场景。

## 验收

`npm test`：现有测试加上 `tests/power-reminders.test.mjs`，包含低电量边界、跨日、D90 阻断、存档恢复与原生滚动标记。

`npm run build`：静态资源正常生成。

浏览器验证：19 项长列表能够上下滚动并找到末项；状态栏电量在前台从 82% 实际下降；独立的 20% 状态外观与红转绿动画已检查。需在合并后的移动端完整回归一次。
