# 熙泰 · DeepSeek 思考模式对照实验

用途：比较 **DeepSeek V4.1 Flash 与 V4 Pro** 的非思考 / low / high / max 思考模式，在《熙蒙的手机》**真实运行时世界书与 JSON 回复协议**下，谁更像熙泰。

本脚本是可复现实验工具；**并非已经取得的实时评测结论**。所有请求在运行者电脑中发出，不上传密钥到仓库，不在报告中存储密钥、不保存模型 reasoning_content。

## 1. Windows PowerShell 操作

在仓库目录（有 `package.json` 的地方）执行：

```powershell
node .\scripts\benchmark-xitai.mjs --dry-run
```

需要真实对照时，**不要把密钥直接写在命令行、文件或 GitHub issue 中**。在 PowerShell 隐藏输入：

```powershell
$secret = Read-Host "DeepSeek API Key" -AsSecureString
$env:DEEPSEEK_API_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
Remove-Variable secret
node .\scripts\benchmark-xitai.mjs --quick
```

`--quick`：4 个模型/模式组合 × 4 种剧情（16 次请求），用于确认账号、接口、JSON 兼容性与初步表现。

```powershell
node .\scripts\benchmark-xitai.mjs --full
```

`--full`：8 个模型/模式组合 × 9 种情境 × 每个两次（144 次请求）。覆盖日常闲话、看秀酒店生活、撒娇、脆弱、家人记忆、虚构童年陷阱、晚安、平等的技术交流、争执后的克制。此模式可能产生较多思考 token 费用，且依次调用接口。

测试后清除当前 PowerShell 环境变量：

```powershell
Remove-Item Env:\DEEPSEEK_API_KEY
```

## 2. 单独试听 MiniMax 慢语速

使用国内 MiniMax 的 API Key：

```powershell
$secret = Read-Host "MiniMax API Key" -AsSecureString
$env:MINIMAX_API_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
Remove-Variable secret
node .\scripts\benchmark-xitai.mjs --tts
Remove-Item Env:\MINIMAX_API_KEY
```

将生成的三个 MP3 对比听感：语速 0.80、0.85、0.90；统一使用 Speech 2.8 HD、`calm`、指定的游戏音色。须关注断句、尾音和是否出现情绪突升。这是音色控制实验，**不能以文字模型的得分替代真人试听**。

## 3. 结果在哪里，怎么选？

输出在 `benchmark-results/` 下：同一时间戳对应 `.json`（数据）、`.md`（完整文本并排阅读）、`-human-review.csv`（人工打分表）。

人工评测建议盲评：把模型名遮住，分别对 **自然口语、熙泰人设、关系连续性、正典可靠性、独立生活感** 给 1–5 分，优先考虑发生人物失忆/家庭设定错误的样本。自动分只检查明显问题，不能代表活人感。

需要注意：当前正式游戏的 `askTai` 使用 `deepseek-flash` + 显式 `thinking.disabled`，这仅是既有实现，不是实验胜者。不能在看到 A/B 结果以前就宣称哪一个模型最像熙泰。

## 4. 安全与质量

- 仅使用环境变量读取密钥；不通过 URL 参数，不进入浏览器 localStorage、JSON 日志、GitHub Actions 日志或 Git 历史。
- 真实请求为 `https://api.deepseek.com/chat/completions` 与 `https://api.minimaxi.com/v1/t2a_v2`。
- `thinking` 在 DeepSeek 目前默认打开，脚本逐组显式标记 enabled/disabled，并在开启时设置 `reasoning_effort`。
- 思考模式需要更多输出预算以留足最终 JSON，不宜用同样窄的 max_tokens 进行不公平比较。
- 别把本地实验结果自动合入游戏 main：先看完整文字、人工评分和音频，再改默认模型/思考强度。

官方参考：[DeepSeek 思考模式](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/) ｜ [模型与价格](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)
