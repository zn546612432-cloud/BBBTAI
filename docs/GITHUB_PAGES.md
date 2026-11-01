# GitHub Pages 发布

项目主页位于 `https://zn546612432-cloud.github.io/BBBTAI/`。

`npm run build:pages` 先执行静态构建，再为 `dist/` 中的绝对资源路径加上版本目录前缀。原生 ES 模块通过自身部署位置解析动态图片与音频；无需 Vite 环境变量。该规则同时适用于主页、预览和独立审核路径。

`.github/workflows/pages.yml` 在 `main` 新提交时自动执行测试、构建、上传和部署；亦可在 GitHub → Actions → `Deploy phone game to GitHub Pages` 手动运行。

若 Actions 提示 GitHub Pages 未启用，进入仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**，随后重新运行工作流。

发布完成后检查 `release.json` 中的提交与当前分支一致，并检查版本目录的模块、壁纸、微信配图与 `assets/story55/ximeng-final-keywords.mp3`。当前主线为55天；旧D57预设不作为本版验收入口。
