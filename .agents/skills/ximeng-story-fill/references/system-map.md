# Unified engine map (checked against BBBTAI main on 2026-11-07)

This is an **interface inventory**, not permission to duplicate a service. Before implementing, inspect current source and compare with this file; paths may move.

| Concern | Single source of truth / paths | Fill here, rather than rewriting framework |
| --- | --- | --- |
| D01–D55 dates and node completion | `src/services/story55/state.js`: `date55`, `nodeStatus`, `completeNode` | `src/story/story55/catalog.js`, matching day content |
| Unified time, battery and charging | `src/system/runtime/policy.js`, `src/services/story55/runtime.js` and phone runtime | Only event due time and late policy in authored content |
| Native WeChat chat and message queues | `src/services/messaging/phone-messages.js` `appendAuthoredPhoneMessage`; `src/services/messaging/preset-replies.js` `nativeWeChatComposer` / `sendNativeWeChatPreset`; `src/services/messaging/lifecycle/registry.js` | `src/story/dXX/wechat.js`, dialogue files, single declared track |
| Native phone Shell, app navigation & gesture | `src/system/shell.js`, `src/main.js`, `src/services/router.js` | **Do not change for story copy**. If a UI action is needed, add it through existing App's handler, reuse across home widget and app screen |
| WeChat rendered view / inline link | `src/apps/wechat/components/chat-view.js`; handler in `src/apps/wechat/index.js` | Prefer data or shared handler. Do not wrap interactive link buttons inside other buttons |
| Reminders and home widget | `src/services/reminders.js` and `src/apps/reminders/index.js`; home widget via Shell | One reminder record; the generic checkbox is not a wish purchase. Purchase/booking statuses are distinct |
| Optional wishes, late shipment and D07 follow-up | `src/services/wishes/index.js`, `src/services/wishes/catalog.js`; `src/story/d06/wish-content.js` | Extend only canonical catalog/reward source; stable wishId, messageId, order state |
| Bank/USD ledger | `src/services/bank.js`: `postBankTransaction`, `payBankPurchase`, `exchange` | No separate bank balances for wish, store or MIRAGE. One transaction ID written exactly once |
| MIRAGE/commission/GHOST | `src/apps/mirage/data.js`, `src/story/d06/commission.js`, `src/story/d05/commissions.js`, `src/services/story55/projects.js`, `src/services/story55/flow-d03.js` | Declare commission stage sequence, attachment/key and manual-submit gate; don't create a task-specific deployment game |
| Historical 2025 BTC/USD | `src/services/finance/historical-btc-usd.js` and `src/services/bank.js` | UTC calendar date and day-level historical quote, never silently credit fiat on award |
| Images/remote assets | `src/services/assets/wish-media.js` (D06); public `ximeng-assets/d06` Supabase Storage; other `public/` paths | Add asset IDs/paths, validate URL and MIME, use cache/preload policy; don't scatter full URLs across components |
| App notifications and unread | `src/services/messaging/phone-messages.js` and incoming scheduler | Never increment unread manually in a competing content scheduler |
| Script content review and saved history | `src/story/dXX/*`, `src/story/diary/*`, `src/story/story55/catalog.js` | Do not delete author-approved D01-before conversation or Moments |
| Test baseline | `npm test` (`tests/*.test.mjs`), `npm run build:pages`, `.github/workflows/pages.yml` | Add an event-chain test and mobile click path, not just snapshot assertions |
| Publishing | `main` → GitHub Pages; `/preview/` separate; `/review/55-20261101/` and `/review/tai-vision-20261105/` retained | Isolated review URL. Verify GitHub Actions deployment after merging; main Pages has four retained entries |

## Three kinds of events: never confuse them

1. **Fixed story trigger** — required plot node; it can gate charging/day progress if declared in the shared story tree. Must be replay-safe and cannot be silently skipped.
2. **Optional daily-life event** — friendships, gifts, social chat, photos, dinners; cannot block story day. Missing a time window may expire the opportunity while preserving bank history.
3. **Player-authored action** — WeChat `me` message, purchase or accept/submit; **never simulate an intentional click** in a content tick. Composer drafts are not committed messages.

## Golden behaviors

- The timeline is D01 = **2025-05-19** and D55 = **2025-07-12**. D06 = 2025-05-24.
- "狼崽团" members: 熙蒙、熙旺、胡枫、仔仔、小辛、阿威. 熙泰 and 傅隆生 are never group participants.
- Task flow: MIRAGE receive → one KIRA key attachment → Files/GHOST deployment (no mini-game) → ordered mini-game stages → **manual submission** → reward. A developer skip must explicitly settle/fix prerequisites, never retroactively erase history.
- For an optional purchase: actual bank debit first, **player Send separately**, NPC acknowledgement follows, delivery/booking may complete later; no "已完成" based solely on clicking a reminder.
- D06 specifically: BTC remains in MIRAGE until user-triggered exchange; no USD invented. The D06 dinner is **US$350**, 19:30 meeting after booking, 20:30 photo only after confirming dinner. Its group invite, thanks and reservation are modeled as distinct events.
- Data supplied to AI (including 熙泰): only observed facts, not unpublished future script choices. Don't alter his personality/worldbook to complete normal WeChat content.
- Existing docs may refer to an obsolete "90 day / DEMO" framework. Source of truth is the live Story55 modules and approved dialogue.
