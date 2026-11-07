# D06 / D07 wish-system integration

**Status:** draft feature; **do not merge** until the twelve user-supplied photo files have been committed to `public/assets/d06-wishes/` and the existing asset audit is green.

## Source of truth
- `src/services/wishes/index.js`: one store-backed state machine for wish recording, purchase, bank transaction idempotence, delivery and scheduled messages. No second clock, bank or phone store.
- `src/services/wishes/catalog.js`: wish IDs, prices, delivery days and asset bindings.
- `src/story/d06/wish-content.js`: authored D06 group conversation, follow-up private messages and D07 consequences.
- `src/apps/wechat/`: clickable blue underline and a user-initiated 10 BTC celebration message.
- `src/apps/reminders/`: native list integration, prompt and confirm purchase.
- `tests/wishes.test.mjs`: wallet gate, duplicate protection, delivery, expiry and D07 choice branches.

## User-supplied JPEG names
The archive named `D06_wish_photos_complete_12.zip` contains these files at their correct repo-relative paths:

| Filename | Story use |
| --- | --- |
| `celebration-dinner.jpg` | D06 purchased gathering photo |
| `celebration-street.jpg` | Optional street restaurant context |
| `celebration-cake.jpg` | Optional group celebration |
| `keyboard-product.jpg` | Xiao Xin wish preview |
| `keyboard-received.jpg` | Xiao Xin opening photo |
| `keyboard-received-alternate.jpg` | Spare Xiao Xin desk photo |
| `shoes-product.jpg` | Hu Feng wish preview |
| `shoes-received.jpg` | Hu Feng wearing the shoes |
| `headphones-product.jpg` | A Wei wish preview |
| `tableware-product.jpg` | Wang's family household wish |
| `tableware-received.jpg` | Wang's family dinner with matching blue-rimmed ceramic ware |
| `headphones-received.jpg` | A Wei's matching headphone-and-player unboxing photo |

Both headphone and tableware reward sets now include separately supplied recipient-viewpoint delivery photographs. The camera shows belongings and hands, not invented character faces.

## User flow
1. D06 S-class Ghost contest fully submitted and wallet credited 10 BTC; **no automatic fake USD bonus**.
2. In the Wolf Cubs group the player taps **把10 BTC的好消息告诉大家** (explicit player send).
3. NPC lines arrive one by one; wish words are underlined blue.
4. Tap a phrase, confirm adding to the existing Reminders app.
5. Tap a saved wish in Reminders, confirm an actual **USD** bank debit.
6. D06 dinner is time-limited. Physical gifts queue delivery relative to the *purchase game day*, no courier app.
7. NPC reward texts/photos arrive through the existing WeChat message writer, with stable IDs. Rewards are optional and do not resolve main story nodes.
8. D07 has default daily conversation and only mentions the dinner if it was purchased.

## Validation before merging
- Install provided asset archive in this branch.
- Run `npm test` and `npm run build:pages`; the existing image-path regression audit deliberately fails until all declared images exist.
- Verify D01-D05 saves, D06 five-stage Ghost, actual wallet settlement, purchase insufficient-funds behavior, back navigation, chat notifications, delivery after short/long charges, duplicate taps, reload, and ordinary D07.
- Publish a **separate review preview**; do not replace main or delete previous versions.

## Historical BTC conversion (resolved)
D06 uses the verified 24 May 2025 daily reference **1 BTC = US$107,791.16**, with 55 offline daily prices. The 10 BTC reward is worth approximately US$1,077,911.60 but remains in MIRAGE until the player actively sells BTC. Pacific bank credits the converted USD only, via one shared bank ledger; 8 BTC fractional digits are allowed and both sides record the same receipt ID. The original bank `rate=1` is **not** used for BTC in Story55. See `docs/finance-btc-2025.md`.
