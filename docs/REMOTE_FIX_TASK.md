# 当前任务卡

目标：恢复新版 EXTRACT 原生接管，缩短连续拒绝消息间隔。

验收：
- [x] 原版与新版配对关卡均经真实控制器进入、原生点按、完成、返回 Mirage。
- [x] 首句延迟保留，连续拒绝句严格相隔 2.2 秒（排程回归通过）。
- [x] 边界及异常：旧格式、失效/无权限来源、中断行为不回退（相关44项测试通过）。
- [x] 相关回归通过；截图及 PR 证据齐全。
- [x] 状态与决策记录更新；不合并 main。

相关文件（最多8个）：
1. docs/REMOTE_FIX_STATE.md
2. docs/REMOTE_FIX_DECISIONS.md
3. docs/REMOTE_FIX_TASK.md
4. src/system/remote-control/controller.js
5. src/services/story55/ghost-share.js
6. tests/ghost-mirage-share.test.mjs
7. .github/test-scripts/tai-remote-mobile-browser-smoke.mjs
8. .github/workflows/tai-remote-mobile-browser-qa.yml

## 验证证据

- 修改实现前：`node --test tests/ghost-mirage-share.test.mjs`，14通过/3失败，失败均为连续句间隔。
- 修改实现后：`node --test tests/ghost-mirage-share.test.mjs tests/tai-remote-extract.test.mjs tests/tai-remote-upstream.test.mjs tests/tai-remote-daily-completion.test.mjs tests/tai-remote-visibility.test.mjs tests/tai-remote-integration.test.mjs`，44/44通过。
- `npm run build:pages`、`node --check .github/test-scripts/tai-remote-mobile-browser-smoke.mjs`、`git diff --check`均通过。
- GitHub完整回归与构建：https://github.com/zn546612432-cloud/BBBTAI/actions/runs/43275470666 ，1112/1112通过。
- 真实浏览器工作流：https://github.com/zn546612432-cloud/BBBTAI/actions/runs/43275470742 ，成功。
- 本次未改布局/样式；视觉验证聚焦现有手机的分享、接管、原生关卡及返回状态。

- 截图证据：https://github.com/zn546612432-cloud/BBBTAI/actions/runs/43275470742/artifacts/13969969643 。已人工检查新版配对关卡及返回聊天截图。
- 六步：一读、二写、三做、四测、五交、六记均已留证据；合并尚未执行。

## 授权后的合并发布验收

- [x] 用户明确授权合并PR #142。
- [x] 指定69b7a94合并为main提交544b111，无冲突。
- [x] 正式Pages发布43322812907成功。
- [x] 线上release.json与正式入口指向c68a550f491c9572，source_commit=544b111。
- [x] 线上controller.js和ghost-share.js与通过测试版本逐字节一致。
- [x] 状态、决策、任务卡写回；不修改其他PR或业务代码。

## 本轮任务卡 · 持续拒绝原因排查 · 2026-11-13
- 目标：解释用户截图中的固定拒绝；交付代码依据。
- [x] 定位两句文案（ghost-share.js:35-37）。
- [x] 核对50%判定、接管次数、每日一次规则（:141-151）。
- [x] 区分代码已证实行为与截图尚无法证实的实际存档状态。
- [x] 写回隔离分支的状态与决策；无业务改动，无合并。
- 验证：仅静态核对和阅读既有测试，不声称本轮测试或UI验证通过。
- 范围：AGENTS.md及三份记录、ghost-share.js、ghost-mirage-share.test.mjs，共6个文件。
- 剩余风险：未取得设备存档，未核对设备实际加载版本。
