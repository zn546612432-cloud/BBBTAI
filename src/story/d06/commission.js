// D06 / 2025-05-24. One authored wallet competition, using the same
// MIRAGE → KIRA single attachment → Files → GHOST → manual submission runner
// as the D04–D05 commissions. No separate wallet minigame or instant payout.
export const D06_ORDER_ID='s55-mirage-wallet-bounty';
export const D06_FLOW_AT='08:10';
export const D06_FLOW_MESSAGE='Nyarlathotep，MIRAGE 大廳剛放了一個 10 BTC 的公開錢包挑戰。發布人直接把鏡像掛上去了，現在一堆人在試。你要不要去看看？';
export const D06_CONTRACT={
 id:D06_ORDER_ID,day:6,title:'S 級懸賞 · 公開錢包挑戰',
 owner:'Dr Ouroboros',grade:'S',asset:'BTC',assetAmount:10,reward:'10 BTC',
 // The wallet is a required story gate: expiring an unfinished save here
 // would permanently trap the player. The competition stays open.
 deadline:null,
 stages:['cipher','veil','route','route','extract'],
 key:'MIRAGE-D06',attachment:'wallet_challenge_0524.enc',
 description:"公開錢包鏡像已進入競賽池。先完成密文核對，再清理測試痕跡並建立兩段連線，最後取回可核驗的錢包資料。\\n\\n競賽獎金：10 BTC，先提交完整結果者領取。\\n五個階段依序驗收，不接受跳步。",
 letter:"已接入公開挑戰。這是競賽提供的加密鏡像，不是私人錢包的真實憑證。\\n\\n附件：wallet_challenge_0524.enc\\n授權密鑰：MIRAGE-D06\\n流程：破譯 → 隱匿 → 連結 → 連結 → 竊取。\\n\\n完成後請回 MIRAGE 親自提交。"
};
