# 备忘录 App

入口仅为 `src/apps/notes/index.js`，没有第二个 `index.html`，与其他 App 不共享样式或功能实现。

## 独立功能子目录

- `features/list/`：根据存档里的真实备忘录分组、排序，渲染置顶和最近编辑的白色卡片。
- `features/folders/`：文件夹入口。
- `features/editor/`：白色编辑页、黄色完成按钮、工具条。
- `features/actions/`：保存、置顶、删除确认、分享、格式等操作。
- `features/search/`：列表内即时搜索。
- `features/attachments/`：从系统图片选择器向当前笔记添加/移除图片。
- `features/sketch/`：可用鼠标或触控绘画并保存为笔记附件的速写画板。
- `components/`：独立 SVG 图标。

## 约束

列表中的数量来自 `store.get().content.notes`，不复制用户参考截图里的 83 条笔记或任何敏感文字。既有 `{id,title,text}` 存档保持兼容，新笔记可增加 `createdDay`、`updatedDay`、`updatedClock`、`pinned`、`attachments` 字段。

`styles.css` 只属于备忘录，顶部使用全局手机已有的状态栏高度加 iPhone 安全区域，不隐藏或覆盖灵动岛。原生输入聚焦时由全局 `mountViewport` 缩小可视屏幕，底部工具条随编辑区抬升；不自己制作假键盘。主屏幕底部上滑手势仍由系统负责。
