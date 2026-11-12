# 当前任务卡

目标：恢复新版 EXTRACT 原生接管，缩短连续拒绝消息间隔。

验收：
- [ ] 原版与新版配对关卡均经真实控制器进入、原生点按、完成、返回 Mirage。
- [ ] 首句延迟保留，连续拒绝句严格相隔 2.2 秒。
- [ ] 边界及异常：旧格式、失效/无权限来源、中断行为不回退。
- [ ] 相关回归通过；截图及 PR 证据齐全。
- [ ] 状态与决策记录更新；不合并 main。

相关文件（最多8个）：
1. docs/REMOTE_FIX_STATE.md
2. docs/REMOTE_FIX_DECISIONS.md
3. docs/REMOTE_FIX_TASK.md
4. src/system/remote-control/controller.js
5. src/services/story55/ghost-share.js
6. tests/ghost-mirage-share.test.mjs
7. .github/test-scripts/tai-remote-mobile-browser-smoke.mjs
8. .github/workflows/tai-remote-mobile-browser-qa.yml
