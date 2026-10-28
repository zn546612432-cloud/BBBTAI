# 目录与测试发布

每个 App 位于 `src/apps/<app>/`，页面/功能位于其 `features/<feature>/`。共享系统能力位于 `src/system/<feature>/`，共享数据服务位于 `src/services/`。

开发者入口与实际实现：`src/apps/developer/index.js`。
其对话、短信、电话、图片、剧情预设、时间预览分别位于 `features/` 的独立子目录。旧 `src/editor/*.js` 仅保留兼容转发，避免破坏已有引用。IG 目录保留，不在桌面注册。

每次 main 更新：GitHub Actions 运行全部测试，构建正式版和 `/preview/` 测试版，然后一起部署。两个版本使用不同存档键。预览版不读取旧正式存档，标题带 PREVIEW。预览是当前更新的测试入口，不是历史快照。

- 正式：`https://zn546612432-cloud.github.io/BBBTAI/`
- 预览：`https://zn546612432-cloud.github.io/BBBTAI/preview/`

测试：设置 → 开发者模式 → 预览。输入天数时日期和 BIG DAY 倒计时立即更新，点击应用后修改系统时间。D1 为 2025-05-19，D90 为 2025-08-16。

锁屏输入 0000 → 是否重启手机 → 是：清除本轮进度、返回 D1 08:00 / 100%；保留开发者编写的内容和规则。否：返回密码输入。6180 仍仅用于原死亡夜恢复流程。重启通过重新加载终止旧运行的计时器、音频和异步回调。
