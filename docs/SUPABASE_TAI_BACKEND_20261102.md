# 熙蒙的手机 · 独立玩家 AI 后端（第一阶段）

建立日期：2026-11-02。此文档记录已真实部署的基础设施，不代表 DeepSeek/MiniMax 已连接。

## Supabase 项目

- 项目：`ximeng-phone-ai`
- Project ref：`zmnufhswpnreeseyamlv`
- 区域：`ap-southeast-1`（新加坡）
- 组织：`zn546612432-cloud's Org`（Free；创建报价 $0/月）
- 访问入口：https://supabase.com/dashboard/project/zmnufhswpnreeseyamlv
- Edge Function：`https://zmnufhswpnreeseyamlv.supabase.co/functions/v1/tai-brain`

## 已部署

数据库迁移版本：`20261102101524`（`ximeng_tai_backend_v1`）。

- `game_saves`：每位登录玩家最多五个独立存档槽。所有读写通过 RLS 绑定用户身份。
- `tai_profiles`：人物心境、关系、身份阶段、生活状态，每份存档一条。
- `tai_messages`：Mirage/NoApp/Chess/Call 消息，客户端事件 ID 去重。
- `tai_memories`：有来源与可信度的长期记忆。
- `tai_actions`：真实时间与游戏时间分别调度，幂等防重。
- `tai_decisions`：AI 行动决策日志。
- `tai_relationship_events`：关系变化事件。

内部 AI 表均启用 RLS，且撤销了 `anon` 和 `authenticated` 的直接表权限，由受信任的服务端使用 secret role 访问。访问任何玩家状态前必须检查真实 Auth 用户及存档归属。

已部署 `tai-brain` v1（`verify_jwt=true`），请求方式为 `POST`，JSON 示例：

```json
{"op":"bootstrap","slot":1}
```

受保护操作：`status`、`bootstrap`、`snapshot`、`submit_message`。包含输入校验、存档归属校验、消息幂等去重、简单防刷限速、身份阶段锁。没有有效 Supabase Auth JWT 时拒绝请求。

## 尚未启用 / 下一阶段

1. 在 Supabase 控制台配置玩家身份认证（无需注册表单时可启用匿名登录；建议加入恢复账号功能，以免换设备丢失存档）。
2. 通过 Supabase Edge Function Secrets 安全配置 `DEEPSEEK_API_KEY` 与 `MINIMAX_API_KEY`，**不能提交到 GitHub，也不能写入前端**。
3. 接入 v6 世界书、DeepSeek 两阶段决策器、状态更新、记忆抽取和动作执行器；第一版函数目前仅保存消息，返回 `ai_status: not_activated`，**不会伪造 AI 回复**。
4. 打通音频存储、手机全局通知、来电及未读状态。游戏时间变更须同步，后端不能自行推进固定 55 天剧情。
5. 在隔离预览分支接入 NoApp，先验证两位玩家的消息/关系状态完全隔离，之后再考虑合并 main。

## 部署注意

本次 SQL 已通过 Supabase 的迁移工具应用；源文件仅用于版本备份。不要在相同数据库重复执行建表 SQL。现有 `main`、历史微信、朋友圈和浏览器存档均未修改。

安全扫描中的 6 条信息级 `rls_enabled_no_policy` 提示来自内部 AI 表故意不设置玩家直接访问策略，已验证普通角色无 SELECT/INSERT 权限。
