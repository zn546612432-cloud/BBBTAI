# MIRAGE CIPHER

The fictional phone game's MIRAGE app, styled from the four supplied film references.

- `index.js`: login, directory, encrypted/decrypted chat, bounty exchange, market, cart, ledger and content editing routes.
- `data.js`: reference contact migration, catalog fixtures, local content records and atomic simulated checkout.
- `art.js`: inline interface symbols, generic contact portrait and product outline illustrations.
- `styles.css`: scoped phone layout and reference palette. Imported through `src/styles/mirage.css`.
- `public/apps/mirage/`: world map and Nyarlathotep skull art.

The phone keeps a single `index.html`; no iframe or independent app entry is used. Messages use the existing MIRAGE conversation channel and shared developer editor. New contacts are seeded once, and existing histories are preserved. Deleting an identity after migration does not regenerate it. Only the player uses the skull portrait; all default contacts use the reference person silhouette.

The three tabs are CONTACTS (speech bubble), BOUNTIES (outlined money bag), and MARKET (cart). BOUNTIES has 进行中 and 已完成 views. Marking an accepted contract completed moves it into the completed view; editing its status also updates its category. Content settings are available from each tab's upper-right gear. Contact names, custom avatars and presence; bounty clients, briefs, rewards and status; and product names, categories, artwork, prices, stock and descriptions can be edited locally. The market includes ARMS, ORGANS and EQUIPMENT as fictional game inventory. Purchases only update the local game balance, stock, ledger and owned assets. No seller, payment service or real marketplace is connected.

Each entry opens the film-style login with the fixed NYARLATHOTEP account and a prefilled password. Three taps on the account field restore its name if erased. SIGN UP displays a short, red “REGISTRATION IS TEMPORARILY UNAVAILABLE” message. The login is a scene interaction, not server authentication. Password input is not persisted. Cipher text is deterministic presentation text; it does not encrypt stored history. Do not use this UI as a real secure messenger. Real authentication/encryption, AI replies and inventory integration with a future authored bank system are separate work.

`mission.js` owns the fictional “招募黑客” order and its cross-app IDs. Accepting it creates one persisted KIRA mail and opens a notification dialog. The mail's step buttons route to the browser's local search placeholder, KIRA's theme-choice/local-send scene, and GHOST's future puzzle entry. Only the board-meeting topic unlocks the next step. No real message is transmitted, no live website is searched and no external system is accessed. The GHOST puzzles are named but not implemented yet: 防火墙密钥重组 (decryption), 节点规避 (snake), 信号锁定 (timed green target).

During development, the MIRAGE UI exposes message add, edit and delete so authored history can be entered. The planned 0000 developer passcode and its future gating are deferred. The phone's existing local backup export includes MIRAGE edits. The preview has no real AI responses, and no new character dialogue is invented by the directory fixtures.

Validation: `npm test`, `npm run build`, and browser review of login, directory, chat decrypt state, market and product detail.
