# GitHub Pages 发布

项目主页预期位于 `https://zn546612432-cloud.github.io/AAATAI/`。

`npm run build:pages` 先执行原本的静态构建，再只对 `dist/` 中的 HTML / CSS / JavaScript 中的绝对资源路径加上 `/AAATAI/` 前缀，保留普通 `npm run build`、本地 `/` 环境和玩家存档中的路径不变。

`.github/workflows/pages.yml` 在 `main` 新提交时自动执行测试、构建、上传和部署；亦可在 GitHub → Actions → `Deploy phone game to GitHub Pages` 手动运行。

若 Actions 提示 GitHub Pages 未启用，进入仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**，随后重新运行工作流。

发布完成后需要检查：`index.html`、JS 模块、壁纸、图标、`/src/story/presets/days/D057/wechat.json`，以及解锁、微信、剧情预设和开发人员页面在手机浏览器上的行为。
