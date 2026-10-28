# 音乐与熙泰 AI 参考（2026-10-28）

## 已核查的音乐项目

- [YesPlayMusic](https://github.com/qier222/YesPlayMusic)：MIT；网易云扫码/手机/邮箱登录、歌词、歌单、音乐云盘，Vue 前端。README 声明旧版本进入维护模式。适合参考登录、歌单与曲库组织，需要独立部署网易云 API。
- [AlgerMusicPlayer](https://github.com/algerkong/AlgerMusicPlayer)：MIT；账号同步、歌单、歌词、远程控制，基于 netease-cloud-music-api 的本地服务，覆盖桌面/Web。适合参考服务适配。桌面能力不等于浏览器可以直接复用。

建议保留现有手机音乐 UI，先增加歌单链接导入与本地音频导入，再接自托管服务。导入曲目元数据不保证取得完整音频；播放取决于账户权限与服务可用性。当前只完成项目调查，未接入第三方账号或音乐接口。未复制上游代码。

## 熙泰 AI：待确认范围

参考 [FoundPhone-Studio](https://github.com/keoyyo85/FoundPhone-Studio) 的剧情数据和 UI 分离方式。该项目 README 明确：AI 在创作阶段生成 JSON，运行时不自动调用模型，不能当成现成的在线角色聊天后端。

用户给出的声音、世界书截图作为后续设计参考，不在需求未确定时新增付费调用：

- text：角色设定、模型适配、会话记忆；
- lore：常驻/关键词触发、权重、读取顺序；
- voice：MiniMax / ElevenLabs / Fish / 自定义服务适配、音色、语言、语速、试听缓存；
- story bridge：AI 读取当前剧情日与允许的信息，不自行改写死亡夜、充电或密码状态机；
- 服务端保存提供商凭据；GitHub Pages 仅承载 UI，不把服务密钥写进源码或公开构建。

下一轮需确定：熙泰在哪些 App 出现、何时主动说话、记忆范围、允许触发哪些剧情、是否需要声音。
