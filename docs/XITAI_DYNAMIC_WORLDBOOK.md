# 熙泰动态世界书

参考：SillyTavern [World Info 文档](https://docs.sillytavern.app/usage/core-concepts/worldinfo/) 与 [06bde939 源码](https://github.com/SillyTavern/SillyTavern/blob/06bde939fb1e9c4c8d8641d810f0a916b5bce127/public/scripts/world-info.js)。上游为 AGPL-3.0；本模块为 BBBTAI 自行实现，不引入酒馆源码、服务器、存档或第三方人物文案。

入口 `src/services/ai/worldbook/`：`entries.js` 保留原条目，`xitai.js` 增加专属情境，`format.js` 管理兼容格式，`engine.js` 负责纯激活，`index.js` 将同一轮激活快照接入实际决策与表达。原作者已确认的底层人格、固定剧情、身份锁及 MiniMax 声线不变。

支持酒馆原生 JSON 与角色卡内嵌世界书、常驻/关键词/正则/次关键词四种逻辑、递归与递归延迟、互斥组/评分/权重、可重现概率、Sticky/Cooldown/Delay、真实事件、按频道/身份/人物/生成类型过滤、各注入位置、作者备注及 Outlet。可选预算为本地估算 token，不是实际供应商用量；默认 1800。时间状态按本游戏的生成事务与消息计数推进，不承诺和酒馆内部消息历史逐条等价。向量使用离线概念稀疏向量，也接受外部相似度结果，不包含神经 embedding 服务。Automation ID 只映射已授权手机动作意向，不运行任意脚本。

相同来源 ID 的决策、表达和补发共享快照，运行状态存于当前手机存档。开发者工作台新增「熙泰世界書」，可管理多个书、条目、设置并预览实际角色消息序列，不消耗 API。电话拨号增加接听/拒接/不接决策；玩家挂断且有真实通话内容后，可选择静默或使用既有主动消息队列发文字（最多三条）；实际结束者与主观过错分开，心情原因写入持久状态。不会自动以电话挂断者为过错者。

验证：`node --test tests/xitai-dynamic-worldbook.test.mjs tests/xitai-full-worldbook.test.mjs tests/xitai-v10-action-protocol.test.mjs tests/noapp-v3-channel-hangup.test.mjs tests/tai-supabase-gateway.test.mjs`。
