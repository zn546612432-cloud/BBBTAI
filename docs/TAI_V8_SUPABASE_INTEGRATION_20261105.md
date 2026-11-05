# 陈熙泰 V8-B → Supabase 读取接入（2026-11-05）

## 当前完成范围

- Supabase Project: `ximeng-phone-ai` (`zmnufhswpnreeseyamlv`).
- 作者批准人物档：`public.tai_character_bibles` / `chen_xitai` / `v8-b-2026-11-05`。**人物档不是玩家聊天记忆**。
- 独立云函数 `tai-v8-persona` 是只读公开 GET API，返回版本化、已审核的人物规则；不返回玩家数据，不持有个人聊天信息，不接受自由 SQL 或表名。
- `src/services/ai/supabase-persona.js` 从此接口加载人物规则、5分钟缓存并设2.6秒超时。失败时采用既有本地世界书，游戏正常继续。
- `src/services/ai/gateway.js` 在自由文字/语音/通话生成前读取云端人设，附加在本地 prompt 后方；行为决策读取 V8 意图约束后仍由本地 action protocol 校验。
- NoApp → AI设置 → 「检测 V8 人设连接」显示版本或本地回退状态。
- `author-dialogue-examples.js` 修正作者亲自删除的健身自述。只有剧情已相认时才加入相认后表达示例。

## 不可破坏的约束

1. V8-B 人格与表达优先，但 **55天固定剧情、身份知情、媒介与真实拨号规则** 不可被云端示例覆盖。
2. 不把示例自动写入 `tai_memories`；不存在于真实聊天的事件不算记忆。
3. 网页关闭时不推进游戏时间，不生成离线主动消息。
4. 不向客户端公开 Supabase 服务端 secret key；云函数的读取权限只用于已批准静态人设。
5. 旧 `tai-brain` v1 没有替换。当前只是人物圣经实际读入 Direct-BYOK DeepSeek 链路，**不是后台记忆完全打通**。
6. 目前用户仍需通过 NoApp 按此前方式提供 DeepSeek 凭据，除非另行部署已认证的服务端AI代理。不能把提供商私钥写到公开GitHub Pages。
7. 不导入、迁移或覆盖游戏本地存档。

## 下一阶段（尚未启用）

- 通过 Auth 建立可恢复的个人登录存档，完成客户端 `tai-brain` 用户归属校验，再启用云端写入。
- 记忆创建/查询/删除需要端到端验证，包括消除衍生摘要与检索缓存重污染。
- DeepSeek 和 MiniMax 的服务端私钥应配置在 Edge Function Secrets；要建立会话限频和用量上限。
- 真实 iPhone Safari 语音打断/挂断、断网重连、55天旧存档迁移仍需测试。

## 复核步骤

1. 在Supabase Dashboard检查 `tai-v8-persona` 为 ACTIVE，`tai_character_bibles` 包含批准的v8版本。
2. 在 NoApp 设置选择「检测 V8 人设连接」；成功显示 `v8-b-2026-11-05`。
3. 用测试存档、已有合法 DeepSeek Key 进行文字测试：「我想你了」，观察回复没有无关健身/会议自我介绍。
4. 测试尚未相认时期的身份门控；不要通过开发者跳日破坏已有剧情。
5. 测试断网：回退本地V8，不崩溃；并确认无需云端就能正常启动手机。
6. 运行 `npm test` 与 `npm run build`。

## 回滚

- 尚未合并 main；直接关闭PR或删除测试分支即可撤销前端变更。
- 即使前端回滚，独立 `tai-v8-persona` 也不会影响旧 `tai-brain`。
- 服务器端V8人物档仍可留在数据库，且与玩家数据隔离。
