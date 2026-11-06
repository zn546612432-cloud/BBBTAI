// D06 / 2025-05-24. One authored wallet competition, using the same
// MIRAGE → KIRA single attachment → Files → GHOST → manual submission runner
// as the D04–D05 commissions. No separate wallet minigame or instant payout.
export const D06_ORDER_ID='s55-mirage-wallet-bounty';
export const D06_FLOW_AT='08:10';
export const D06_FLOW_MESSAGE='Nyarlathotep，快去看 MIRAGE 懸賞大廳！有人放了一場公開比特幣錢包奪取競賽，獎池整整 10 BTC，現在不少人都在盯著。';
export const D06_CONTRACT={
 id:D06_ORDER_ID,day:6,title:'S 級懸賞 · 公開錢包挑戰',
 owner:'Dr Ouroboros',grade:'S',asset:'BTC',assetAmount:10,reward:'10 BTC',
 // The wallet is a required story gate: expiring an unfinished save here
 // would permanently trap the player. The competition stays open.
 deadline:null,
 stages:['cipher','veil','route','route','extract'],
 key:'MIRAGE-D06',attachment:'wallet_challenge_0524.enc',
 description:'公開競賽 / WALLET CHALLENGE\n\n一份競賽用比特幣錢包鏡像已向所有參與者開放。獎池：10 BTC。\n\n參賽者需依序完成加密結構解析、存取痕跡隔離、雙重鏈路接通及目標資料提取。每項驗證都會記錄結果，未完成前一階段不得進入下一階段。\n\n交付：完整的加密成果與五階段驗證記錄。\n狀態：公開進行中；獎池尚未領取。',
 letter:'你接下了這場公開挑戰。加密資料、授權範圍與執行記錄都封裝在同一份附件內。\n\n授權密鑰：MIRAGE-D06\n附件：wallet_challenge_0524.enc\n\n請先在 GHOST 輸入授權密鑰，依次執行：\n01 破譯 → 02 隱匿 → 03 連結（第一關） → 04 連結（第二關） → 05 竊取。\n\n完成五項驗證後，回到 MIRAGE 手動提交，獎池才會結算。'
};
