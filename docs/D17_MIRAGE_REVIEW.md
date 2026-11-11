# D17 Mirage 搜索与星月论坛

基线为 main `a44d416a77813499cb09effab1829e1e91fd9aaf`。本次仅实现 D17 浏览器调查、读取后的备忘录，以及已冻结30句的 D17 19:00 Mirage 对话。D11、D12、D16原对话继续保留在 main 对应模块，本次未改写。

## 原始与目标

| 位置 | 原始行为 | 本次行为 |
| --- | --- | --- |
| browser submit | D17搜索Mirage直接打开简短Story55摘要 | 使用原搜索结果列表，显示3个无法访问的入口和星月论坛 |
| browser /story55 page=mirage | 摘要与手动收录按钮 | 兼容旧存档深链接，打开Mirage搜索结果 |
| rumours节点 | D17 23:06且code已完成 | D17全天可选搜索，不阻塞私聊 |
| 星月论坛 | 无页面 | 女生求助帖摘要、憂傷的魚评论、楼主回复、憂傷的魚再回复，顺序完整保留 |
| 登入查看更多 | 无 | 原浏览器内进入“該帖子已失效”，可后退/前进 |
| 备忘录mirage | 无搜索阅读联动 | 仅打开可见论坛摘录后追加；不从失效网站或搜索结果提前记录；保留用户原笔记与修改，只收录一次 |
| Azathoth | 无词条链接 | D17解密聊天中的同名字样可打开词条，分开神话与未核实的组织传闻 |
| D17私聊 | 无对应冻结稿节点 | 原queued Story55场景，19:00且intrusion、code、loan完成；不检查购物、设备到货、base完成或论坛阅读 |

## 文案与事实边界

用户2026-11-11补充的完整论坛描述为权威来源。仅润色口语和标点，将“b64转译”改为“Base64编码，解码后是Mirage”。保留男朋友、乱码短信、暗网下单猜测、劝分、楼主搜不到网站、钓鱼入口、盗刷警告与Azathoth传闻。没有将评论者猜测升级为设定事实。

D17私聊30句逐字对照上传交接文档第6节。独立冻结副本为 `tests/fixtures/d17-approved-lines.json`，运行时唯一来源为 `src/story/d17/content.js`。所有me句均由原生Send提交，队列只推进NPC气泡。

## 实现与授权来源

- 已检查 `SelmiAbderrahim/Free-Forum-Template`：未发现仓库根目录授权文件，因此不复制其源码、字体或素材。
- 复用 `skx/e-comments` 的评论CSS基础，局部限定到`.xingyue-forum`并适配手机宽度；保留Steve Kemp的MIT许可与版权。没有引入其jQuery、Mustache或Ruby评论后端。
- 上游CSS： https://github.com/skx/e-comments/blob/master/client/css/e-comments.css ，blob `78acac1013c1b7d57fc49229226c4b160d80deeb`。
- MIT许可： https://github.com/skx/e-comments/blob/master/LICENSE.md ，blob `8f109c8622200358d584bbe61c28f3d81e55ce1c`。
- 技术参考： https://developer.mozilla.org/en-US/docs/Web/API/Window/atob ，https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/blockquote 。网页历史复用项目已有browserData.navigation，不另建路由或计时器。

全部站点为原浏览器中的本地剧情页面，无真实暗网、登录、银行或评论服务请求；无新增图片、字体和远程资源。

## 回归与复现

1. 在独立测试存档跳至D16，搜索mirage应无D17结果。
2. D17打开原浏览器，在地址栏搜索MiRaGe；逐一点击三个失效入口，再后退；不会收录论坛信息或改变余额。
3. 点击星月论坛，阅读唯一可见评论及两条楼中楼；打开备忘录mirage，确认原有手写内容仍在，论坛信息注明为未核实说法。
4. 点“登入查看更多”应显示帖子失效；前进、后退、刷新与重复进入均不重复收录。
5. D17 18:59无邀请；19:00但loan未完成仍无邀请。完成借款后以当前时间延迟解锁，不回拨时钟。
6. 不买设备、不完成部署、不搜论坛，仍能在loan与既有前置完成后，用原生Send走完30句。刷新后从等待的句子继续，不重发。
7. 点击聊天中的Azathoth蓝字，词条不展示真实姓名、血缘或组织后台。

回滚：撤销本PR提交即可恢复旧搜索入口。新增的已发聊天和笔记保持为普通存档记录，不清空用户存档。

完整npm test曾被自动审批拦截，提示潜在Supabase AI外部请求；本地改用明确列出的相关回归文件。此限制不应被报告为完整测试通过。浏览器验证使用本地静态服务器并阻断外部请求，开发者重建仅用于D17之前的前置状态，D17页面点击及消息发送实际操作。

## 2026-11-11 mobile website visual revision

The first review was rejected by the user for looking like a plain document. The revision replaces that presentation with distinct mobile website structures: illustrated encyclopedia cover and gallery, blue brand header, anchored tabs, a collapsible contents list, basic information and references; a forum board photo, user photo avatars, post statistics, numbered reply and nested conversation; site favicons and a thumbnail in search results.

The old “含 Mirage 的回覆” clue label and encyclopedia organization summary are removed from the website. The three approved comments, unread-content restriction, expired-login result, note idempotency and all 30 invitation lines are preserved. The encyclopedia contains ordinary mythology only. Illustration, photography, licensing and source references are in `public/assets/browser/d17/SOURCES.md`.

Visual acceptance now checks image decoding, the expanded contents list, image gallery, and 320/390/430-pixel widths, in addition to the original interaction checks. A passing unit test alone does not count as visual acceptance; review the generated phone screenshots before handing over the preview.
