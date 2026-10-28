# 手机 UI 修复交接说明（2026-10-27）

## 分支与状态
- 来源分支：`fix/mobile-ui-scroll-music-toasts-20261027`
- 修改以 App 子文件夹为单位，尽量不侵入其他模块。
- 已将用户确认的 UI 修复验收第 4 版同步至 main。
- 验收网址：https://ximeng-ui-fix-review-1027.quietdegu20.chatgpt.site/
- Sites 源码提交：`8c59f22a9df462dcd553506414150e0f03bd8c51`。
- `index.html`、`src/`、`public/`、构建脚本、依赖声明及测试与该版一致；保留主站 hosting 配置。

## 文件归属
| 功能 | 文件 | 改动 |
| --- | --- | --- |
| 音乐 | `src/apps/music/styles.css` | 缩小封面、播放器底部预留空间；由 `src/styles/new-apps.css` 引入 |
| 提醒事项 | `src/apps/reminders/styles.css` | 调整触摸滚动容器和底部空间 |
| 澳觅 | `src/apps/aomi/features/home/index.js` | 顶部显示“暂时无法定位” |
| 电话 | `src/apps/phone/replica.js` | 删除澳门地区切换符号与地区 Toast |
| 天气 | `src/apps/weather/replica.js` | 删除底部搜索城市输入栏 |
| 时钟 | `src/apps/clock/index.js` | 删除“游戏内时间”字样 |
| KIRA | `src/apps/kira/features/inbox/index.js` | 删除邮件底部工具栏 |
| 全局提示 | `src/main.js` | 关闭游戏内通用白色 Toast 显示（错误写入控制台） |

## 本次同步包含
- 统一通知已读和聊天未读状态；打开会话时清除对应通知，保留其他会话未读。
- 通知使用来源 App 图标；紧凑灵动岛不再打开电量，状态栏电池保留入口。
- 设置分隔线随列表滚动，澳觅界面使用独立样式；天气移除中山默认城市。
- 验证：`npm test` 128 项全部通过；`npm run build:pages` 通过。
- 本次为已验收源码同步，未新增 iPhone 真机交互测试。

## 协作原则
每个 App 的业务逻辑和样式优先留在 `src/apps/<app>/` 下；系统级行为集中在 `src/system/`、`src/services/`。多人协作前先拉取 main，避免覆盖并行修改。
