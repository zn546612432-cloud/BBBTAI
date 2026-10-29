# 微信朋友圈开发者编辑器

代码目录：`src/apps/developer/features/moments/`。运行时朋友圈由 `src/apps/wechat/features/moments/` 加载。

## 功能

- 开发人员入口 → 微信朋友圈 → 全部预览：按时间倒序展示所有 90 天动态，不受“仅三天可见”限制，可按角色筛选。
- 编辑：新增/修改/删除动态；指定 D01–D90 和 HH:mm；图文、纯文本、公众号、音乐及视频；隐私；置顶；最多九张图片。
- 人物资料：编辑七人的朋友圈头像、封面和个性签名。
- 互动：编辑初始点赞、初始评论及被回复者；设定熙蒙的可选预设回复（第一条自动填到输入框，不自动发送）；设定 NPC 针对熙蒙评论的自动回复及触发语句、一次性规则。
- 导入/导出：`BBBTAI-wechat-moments-v1.json`。所有新增图片会以内嵌 data URL 格式保存到数据包。

## 存储与整合

原始 45 条剧情在 `src/apps/wechat/features/moments/data.js`，编辑器并不重写这个文件。运行时将 `content.moments.editedPosts` 覆盖到原数据，并叠加 `posts`、`deletedIds`、`profiles`。

导出 JSON：

- `schema`: `bbbtai.wechat.moments/1`
- `startDate`: `2025-05-19`
- `profiles`: 整合后的七个人物资料
- `posts`: 当前全部剧情动态（供剧情文件整合）
- `overrides`: 可原样导入 `content.moments` 的编辑记录

游戏时产生的玩家点赞和玩家评论 (`content.moments.likes/comments`) 不作为剧情文本导出，避免把某一位测试玩家的行为固化到公共预设。

图片经前端 JPEG 压缩后保存在当前浏览器的本机存储中；浏览器本机空间有限，建议每编辑完一组人物就导出 JSON 备份。不同浏览器不会自动同步。

## 本地预览

```bash
npm ci
npm run build
npm run dev
```

在浏览器打开 `http://localhost:5173/`，解锁后进入设置的开发人员入口，选择“微信朋友圈”。

独立离线预览（包含本仓库全部朋友圈图片和头像，直接打开 HTML）：

```bash
node scripts/build-moments-preview.mjs
```

输出 `qa/BBBTAI-moments-editor-offline.html`。上方可切换“开发者窗口”和“游戏朋友圈”。

自动化测试：`npm test`，包含新增的 `tests/wechat-moments-editor.test.mjs`。
