# 微信 · 撤回消息

独立数据逻辑：`recallWeChatMessage(store, conversationId, messageId)`。

- 只允许玩家撤回自己发送的消息；不修改其他成员发言。
- 用 `kind: 'recalled'` 保留原消息位置与时间，正文移除，显示“你撤回了一条消息”。
- 写入事件历史，原有剧情、消息排序与定时发送逻辑不变。
- UI 入口是聊天气泡的点击/长按菜单中的「撤回」。
