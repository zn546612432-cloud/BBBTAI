# 决策记录
## 2026-11-13 · Mirage 接管返修
- 背景：用户在 9905b0d0.bbbtai.pages.dev 收到「遠端連線已中斷」，并指出「你真的會寫代碼嗎？」「我很忙，你自己處理」间隔过长。
- 确认：用户已进入 Ghost 后才中断。保持 Mirage 不接自由聊天 AI；NoApp AI 保留；沿用原关卡、按钮、手动提交和统一消息投递。
- 决定：先补失败测试，修复已确认的新版 EXTRACT 入口兼容；通过现有共享入口保持接管返回后的聊天解密；首句停顿保留，连续 NPC 句子使用既有 2200ms 间隔，取消重复阅读延迟。
- 不做：不重写游戏，不改已定稿对白，不清空存档，不改变剧情/银行结算，不合并 main，不手动运行全项目测试。
- 待办：相关测试红/绿验证；真实移动浏览器含新版 EXTRACT 接管与错误恢复；更新本记录及状态。
- UI：沿用既有 Mirage 和接管红光；只修复返回状态，不新增组件/视觉风格。
- 负责人：Codex。截止：本轮交付前；卡住 30 分钟或同一错误两次修复失败即停并报告。
- 未确认：缺用户存档，暂不能声称唯一根因；运行结果需据实补充。

## 第 2 步证据
- 命令：`node --test tests/tai-remote-extract-entry.test.mjs tests/ghost-mirage-share.test.mjs`。
- 修复前：22 项中 5 项失败，C/S 新版 EXTRACT 入口实际抛 `ghost_board_not_running`；旧版成功返回及无效棋盘失败返回都丢失解密；拒绝两句间隔 5.105 秒。
- 修复：仅 controller.js 和 ghost-share.js 两个业务文件；复用现有共享入口返回解密、接收 extract-memory、连续 NPC 间隔使用既有 WAIT_MS。
- 修复后：22/22 通过；新 C 8 张牌、新 S 20 张牌、原 10 张牌均由原生 GHOST 点击完成；无效棋盘保持 running、零点击零结算并释放控制。
- 下一步：桌面/移动真实浏览器，不以单元测试替代视觉和跨 App 验收。

## 浏览器验收范围（第 3 步）
- 固定为四个真实 UI 用例：手机端 M-008 原生完成前置 CIPHER 后接管 8 张 EXTRACT、手机 20 张 EXTRACT、桌面 8 张 EXTRACT、手机空棋盘失败恢复。
- 测试故意不设置 d13.phase=chat，要求接管返回后无需额外解密/登录。
- 使用独立 feature 分支的相关 CI，仅运行指定 22 项和本任务浏览器用例，不运行项目全量测试；本轮 PR 以 #142 分支为基准，不擅自合并 main。

## 2026-11-13 · 用户补充确认与最终验收
- 用户确认中断发生在进入 Ghost 之后，画面是翻牌配对；与本轮测试复现的 extract-memory 入口拒绝一致。
- 验收命令：`node --test tests/tai-remote-extract-entry.test.mjs tests/ghost-mirage-share.test.mjs` → 22/22；`node .github/test-scripts/tai-remote-extract-regression-browser.mjs` → 4/4；`npm run build:pages`、`git diff --check` → 通过。
- 实际结果：手机真实 M-008 原生前置 CIPHER 后的 C8 翻牌 12 次点击成功、S20 翻牌 30 次点击成功、桌面 C8 12 次点击成功；每次只有 1 条完成历史，余额不变，M-008 为 READY 待手动提交。
- 空棋盘异常：0 次点击、0 次结算，原关卡保持 running；控制权释放，返回仍为解密对话；不伪造成功。
- 图像审查：桌面、手机、空棋盘、异常通知与返回截图均已检查；沿用现有 UI，无新组件/视觉样式。
- CI 与截图包：https://github.com/zn546612432-cloud/BBBTAI/actions/runs/43273558148 ，artifact `mirage-extract-focused-browser`（id 13970040876，保留 14 天）。
- 截图包内路径：`desktop-C8-returned.png`（桌面）、`mobile-real-M008-returned.png`（手机）、`mobile-empty-error-board.png`（空）、`mobile-empty-error-returned.png`（错）；另有棋盘过程截图及 results.json。
- PR #143：https://github.com/zn546612432-cloud/BBBTAI/pull/143 ，目标为 #142 分支，未合并 main；交付预览 https://77654a34.bbbtai.pages.dev 。
- 验证范围限制：Chromium 桌面与手机尺寸；未在用户的 iOS 实机与本地存档上直接运行。未运行项目全量测试。
