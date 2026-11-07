# D06–D55 Finance: historic exchange-rate policy

## Verified historical 2025 reference figures

- **24 May 2025, BTC/USD:** `1 BTC = 107,791.16 USD` from CoinMarketCap's 2025-05-24 historical snapshot: https://coinmarketcap.com/historical/20250524/
- **D06 award:** exactly 10 BTC; historical value **USD 1,077,911.60**, which is a valuation, **not** spendable Pacific bank cash.
- **Macao May 2025 average USD/MOP:** 100 USD = MOP 803.84 (1 USD = MOP 8.0384). Data from Macao DSEC / Monetary Authority of Macao: https://www.dsec.gov.mo/getAttachment/edeea2c1-baf9-4fcf-b6d0-f30df64ffae9/E_BME_PUB_2025_M08.aspx . This is a **monthly average**, not an exact May 24 spot rate.
- Complete 55-day BTC/USD daily-close reference series mirrors historical BTC-USD dataset: https://huggingface.co/datasets/Projet4AIABoursiere/stock-market-data/blob/main/BTC-USD.csv. The D06 entry matches CoinMarketCap's verified snapshot. This is a **day-level reference** used by the narrative, not an intraday executed spot market quote.

## Single source of truth

`src/services/finance/historical-btc-usd.js` maps Day 1–55 to the 2025-05-19 through 2025-07-12 historical daily BTC/USD reference close, all offline, never from today's live internet.

`src/services/bank.js` is the only finance entry point for D06+D07 wish purchases and BTC conversion. Each conversion:
1. Validates up to 8 BTC fractional digits (satoshi precision), available BTC and USD-cent rounding.
2. Decreases the existing `content.mirage.digitalBalance` (BTC).
3. Adds a matching `content.mirage.digitalTransactions` negative BTC entry and a MIRAGE wallet transaction.
4. Credits the **existing** `bankData.balance` in USD through `postBankTransaction`, with the same transaction ID and historic quote attached.
5. Stores the confirmed date/time, BTC amount, quote, and USD amount so past receipts never reprice when the player advances days.
6. Commits the entire state mutation inside one `PhoneStore.update()` transaction, retaining existing persistence and preventing duplicate transaction IDs.

`src/services/wishes/index.js` calls `payBankPurchase()`; it does not maintain a second balance or a shopping-specific bank book. One wish ID can be purchased once.

## Narrative consequences

- D06 10-BTC award stays in MIRAGE until the player actively converts it.
- The WeChat group only shares the true 10-BTC award after the successful Ghost/MIRAGE submission and an explicit player press of the ordinary WeChat **Send** button.
- Long-term wishes appear as blue underlined phrases in authored chats; tapping adds them to the **existing** Reminders app.
- The D06 celebration dinner expires at 18:30 game time, and the player sees a normal expired reminder. It is not automatically charged.
- Physical purchases use each item's configured delivery day. Reward chats and uploaded photographs arrive after delivery; D07 runs its normal authored messages independently of purchase choices.
- No purchase affects forced story progression, and no developer skip logic is added.

## Tests & delivery status

`tests/finance-historical-btc.test.mjs` covers all 55 days, confirmed D06 rate, 8-decimal fractions, BTC debit vs USD credit, shared receipt IDs, insufficient BTC, and backwards-compatible legacy fixture exchange.

`tests/wishes.test.mjs` covers the prize requirement, idempotence, expiry, D07 fallback, and optional reward photos.

The actual user-provided **12 JPEGs** are in `D06_wish_photos_complete_12.zip` under `public/assets/d06-wishes/`. Until those binary images are committed to the **review branch**, GitHub's asset-path regression check correctly fails. Never merge main with missing visuals, and never bypass the check by inserting empty placeholders.

## Supabase Storage asset routing (2026-11-07)
A public, read-only-from-frontend Storage bucket `ximeng-assets` has been created in the connected Supabase project `ximeng-phone-ai` (`zmnufhswpnreeseyamlv`). The 12 D06 photo names are centrally registered in `src/services/assets/wish-media.js` under `https://zmnufhswpnreeseyamlv.supabase.co/storage/v1/object/public/ximeng-assets/d06/<filename>`. The authored WeChat photos and wish catalog both use that one resolver; no extra app-specific photo base URLs.

**Important:** The bucket currently has **zero objects**. The 12 user-supplied original JPEG files are prepared in `D06_Supabase_Storage_12_images.zip` with `d06/` paths, but this Supabase connector does not provide an object-storage binary upload action and the local file container does not have outbound network connectivity. No image upload success is claimed. The `tests/d06-supabase-image-integrity.test.mjs` release gate must remain red until all 12 public HTTPS JPEG URLs actually return HTTP 200. Do not merge PR #92 before that.
