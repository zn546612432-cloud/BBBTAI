# WeChat sticker sources

- `whitecat.webp`: **WhiteCat**, uploaded by anlh, published May 2023. Listed as CC0 1.0 on [myEmotes](https://myemotes.io/stickers/whitecat).
- `dog.svg`: **dog face (1F436)** by Sofie Ascherl, [OpenMoji](https://openmoji.org/library/emoji-1F436/), [source](https://github.com/hfg-gmuend/openmoji). CC BY-SA 4.0; original artwork unmodified.

Both sources predate the story's March 2024 chat history. Assets are bundled locally so old messages display offline.

## D09 · ZOGGY / 这狗

- `zoggy-stars.png`: **這狗 星星眼ver**, credited to **少年小酒JiAH / 这狗ZOGGY**. [Download page](https://www.sigstick.com/pack/TKyvCLmyFMlidt7fDZmk), [original PNG](https://cdn2.cdnstep.com/TKyvCLmyFMlidt7fDZmk/0-1.png).
- The source page's JSON-LD `datePublished` is `2024-10-17T11:39:57.597Z` (`createdAt: 1729165197597`), before D09 / 2025-05-27.
- Original 240 × 240 PNG, unmodified, bundled for the author's personal fan-game. Copyright remains with the original creator; this is not an open-source license claim.
- Replaces only `d09-laundry-0`, preserving the single image bubble and all other daily scenes.

## 小辛 · user-supplied dog sticker pack (2026-11-07)

- Original links and the user's Chinese names are recorded in `src/story/assets/xin-dog-stickers.json`; IDs retain the original input order, including repeated names.
- 162 source images were decoded and bundled as lossless WebP, with original dimensions and SHA-256 recorded. Chat rendering makes no requests to the original image hosts.
- `xin-dog-086` (快速等待（等待）) and `xin-dog-143` (蹭蹭你的手) returned HTTP 404, including their host landing pages. Their source records remain, with `path:null` and `status:unavailable`; no replacement artwork is invented.
- Supplied for this personal fan-game by its author. Copyright remains with the original creator; no open-source or redistribution license is asserted.
- Existing message IDs `d06-celebrate-01` and `wish-keyboard-thanks-1` use 果真吗 and 小狗谢谢, respectively. All other imported assets are available by ID/name through `xinDogSticker` for future authored dialogue; there is no automatic random sender.
