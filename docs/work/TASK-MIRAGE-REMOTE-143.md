# 任务卡 · Mirage 接管返修
- 基准：PR #142 / 7ed6e3dab4d59ad961cfc8f08d3f5f4fae9885c3。
- 目标：新 EXTRACT 可由原控制器操作到真实成功；返回保持当前对话解密；两句拒绝对白间隔缩到现有 2.2 秒。
- 验收：主流程真通关、不改答案/不伪造成功；边界含最小/最大牌数或旧格式；异常含无效/缺失棋盘拒绝及释放控制；移动端和桌面端验证并截图。
- 步骤：1 ☑ 阅读定位；2 ☑ 失败测试→最小修复；3 ☑ 相关测试及浏览器验收；4 ☑ 交付与记录。
- 相关文件（8 个上限）：
  1. src/system/remote-control/controller.js
  2. src/apps/mirage/index.js
  3. src/services/story55/ghost-share.js
  4. src/services/messaging/delivery.js
  5. tests/ghost-mirage-share.test.mjs
  6. tests/tai-remote-extract-entry.test.mjs（新）
  7. .github/test-scripts/tai-remote-extract-regression-browser.mjs（新）
  8. .github/workflows/tai-remote-extract-regression.yml（新）
- 保存：隔离分支，以 PR #142 分支为基准；仅运行相关测试；浏览器 CI 单独执行，不启动全项目测试。
- UI 拆解：参考用户 IMG_4892.jpeg、既有 #142 移动截图；布局/组件/颜色/字体/间距/圆角全部沿用；返回维持已解密对话；异常释放控制、保留原关卡状态；不新增视觉组件。

## 验收逐项
- ☑ 原生新版 EXTRACT：C8、S20 真实操作成功；保留手动提交，不增加银行到账。
- ☑ 旧格式 10 张牌回归、无效棋盘拒绝与释放控制。
- ☑ 身份对话返回无需重新登录、无需额外解密，不依赖 d13.phase=chat。
- ☑ 连续拒绝两句间隔 2.2 秒；首句仍有原等待节奏。
- ☑ 桌面/手机/空/错截图及结构化结果在相关 CI artifact 中。
- ☑ 状态、决策、证据与风险同步。PR #143 未合并，待领导决定。
