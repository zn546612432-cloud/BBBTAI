# 剧情内容边界

`demo/` 仅供 UI 与跨 App 交互测试，界面显示 DEMO 标记，不代表九十天正式文案。审定正文以后按日期、场景、渠道放入 `timeline/`、`scenes/`、`conversations/` 与 `group-chats/`。角色事实在 `character-profiles/`，内容 schema 在 `schemas/`。App 组件不存正式台词。

系统事件记录实际发生的棋局、消息、选择。AI 接口只能读取已经发生且有授权的事实；不能读取未来剧情或其他 App 的未发送草稿。
