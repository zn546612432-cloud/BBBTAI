# 朋友圈图片来源与使用位置

角色朋友圈是游戏内虚构动态，文字与日期为剧情设定；演员照片作为角色视觉素材，不表示演员实际发布过这些动态。原有用户指定头像仍原样保留在 `avatars/originals/`，本轮不替换。

| 文件 | 对应内容 | 检索来源 |
| --- | --- | --- |
| hufeng-mirror.webp | 胡枫（文俊辉）镜子自拍 | https://ph.pinterest.com/pin/seventeen-jun-wen-junhui-mirror-selca-selfie--675962225342882377/ |
| hufeng-outdoors.webp | 胡枫（文俊辉）户外自拍 | https://x.com/junhuiquotes （原图 E3IQRCGXMAYey06） |
| xiaoxin-mirror.webp | 小辛（林秋楠）镜子自拍 | https://sina.cn/news/detail/5350732060428902.html （演员微博转载） |
| xiaoxin-selfie.webp | 小辛（林秋楠）耳机自拍 | https://sina.cn/news/detail/5324872063385807.html （演员微博转载） |
| macau-morning.webp | 澳门黑沙海滩的白天天空 | https://my.trip.com/moments/detail/macau-39-144832130?locale=en-MY |
| macau-dawn.webp | 澳门观音莲花苑晨景 | https://ent.ifeng.com/c/7xhQhe5rbQL |
| shumai.webp | 烧麦 | https://www.macaotourism.gov.mo/pt/sight/estabelecimento-de-comidas-san-kam-wa-mei-sek |
| fabric-swatches.webp | 仔仔的布料色卡 | https://m.made-in-china.com/product/Low-MOQ-Soft-Breathable-100-Polyester-Korean-Crepe-Chiffon-Fabric-for-Women-Clothing-1967266222.html |
| cat-video-cover.webp | 猫视频的真实首帧 | 从已有 moment-cat-video.mp4 提取 |

下载图片仅为游戏预览素材，不声明具有开源授权，原作者保留权利。图片已转为 WebP 并限制边长以减少下载；运行时不请求外部图床。

## 90 天朋友圈补充（本轮）

玩家上传的 `IMG_4049(2).jpeg`、`IMG_4047(2).jpeg`、`IMG_4048(1).jpeg`、
`IMG_4042(1).jpeg`、`IMG_4041(1).jpeg`、`IMG_8363.jpeg`、`IMG_8147.jpeg`、
`1792928572573(2).jpeg` 用于 D04 偷拍、D04 饭局双图、D15 兄弟照、
D21/D70 合照、熙旺的喷泉和公园风景，以及 D78 胡枫在群聊发出的抓娃娃照。
截图中多余的手机界面与黑边已裁去；最后一张仅保留白线圈定的人像和机台，不带小红书角标。
`xiaoxin-mirror-clean.webp` 和 `xiaoxin-selfie-clean.webp` 来源于上一轮两张林秋楠照片，
底部微博水印已去掉。上述裁切通过图像编辑生成，使用时请对照原图核查人物细节。

新增内容混用原来已经本地打包的澳门街景、烧麦、布料、健身等图片；
补查过 [Wikimedia Commons 澳门蛋挞](https://commons.wikimedia.org/wiki/File:Macau_Eggtart.jpg)
与 [澳门夜景](https://commons.wikimedia.org/wiki/File:Macau_Night_1.jpg)、
[器械训练](https://commons.wikimedia.org/wiki/File:Close-up_Hand_holding_dumbbell_in_gym.jpg)，
但没有把未取回的网络图片写入动态。小辛的音乐分享选自
[SEVENTEEN 官方曲目表](https://www.seventeen-17.jp/posts/discography/atwpya)：`_WORLD` / `SECTOR 17`；
展示曲目信息卡片，不打包歌曲音频。

界面参照：FoundPhone-Studio `WeChatSkin` 的头像列、作者/正文/媒体/时间结构与 `.wx-moment-post` 间距、边线、色彩。保留 MIT 声明于 `public/licenses/FoundPhone-Studio-MIT.txt`。其原实现没有赞评菜单与三天可见逻辑，本项目在现有独立 Moments 模块中补齐。心形、评论、相机使用 Lucide 上游 SVG，沿用仓库的 ISC 许可证。
