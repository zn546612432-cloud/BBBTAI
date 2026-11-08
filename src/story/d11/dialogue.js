// D11 · 2025-05-29. Only the six Wolf Cubs are in the group;
// Fu Longsheng's offline meeting is represented in Ximeng's own note.
const parse=body=>body.split('|').filter(Boolean).map(part=>{const i=part.indexOf('：');if(i<0)throw Error('群聊缺少发言人');const speaker=part.slice(0,i);return {who:speaker==='熙蒙'?'me':speaker==='胡楓'?'胡枫':speaker,kind:'text',text:part.slice(i+1)};});
// Chat events are independent of the player's reply. Unskip legacy missed NPC scenes.
const restoreSkipped=(s,q)=>{if(q.skipped&&q.status==='skipped'){q.skipped=false;q.historySettled=false;q.status='pending';q.started=false;q.index=0;q.nextAt=null;q.dueAt=null;q.awaitingPlayer=false;}};
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body),migrate:restoreSkipped});
export const D11_GROUP=[
 scene('notice','09:15','熙旺：晚上七點半，老地方見|熙旺：乾爹回來了，今天大家盡量過來|阿威：我晚上可以|仔仔：收到，我把手上的活弄完就去|小辛：啊？真的？|胡枫：我還在首爾，明晚才落地|熙旺：知道，航班號收到了，我去接'),
 scene('afternoon','15:20','阿威：我先去訓練，結束直接過去|小辛：我帶點喝的|仔仔：別買太多，今晚還有人準備吃的'),
 scene('after-meeting','22:20','仔仔：我到家了|阿威：我也回去了|小辛：今天吃得夠飽|胡枫：你們好歹給我留張照片|熙旺：明晚機場見，早點休息')
];


// D11: personal requests and post-meeting concerns stay in private chats.
// The evening family scene is NOT impersonated as a group conversation.
const privateScene=(id,chat,at,body,extra={})=>({
 id,chat,at,lines:parse(body),...extra
});
export const D11_PRIVATE=[
 privateScene('hufeng-laptop','hufeng','16:24',
  '胡枫：你那台舊筆電還在嗎？我回去想找你幫忙看看。|熙蒙：在啊，你又怎麼了|胡枫：開機像拖拉機，教授的報告還在裡面。|熙蒙：帶回來吧|胡枫：好，請你吃飯。不請辣炒年糕。'),
 privateScene('father-after-meeting','fulongsheng','22:06','傅隆生：好好幹。'),
 privateScene('wang-worry','wang','22:18',
  '熙旺：到家了嗎？|熙蒙：到了哥|熙旺：今晚那個電子錢包的事，我還是有點擔心。|熙旺：五億美元，哪有那麼容易拿。|熙蒙：我又沒說明天就能拿到|熙旺：我知道。干爹肯讓你試，是信你的本事。|熙旺：但有什麼風險，你得先跟我說。|熙蒙：哥，你不信我啊？|熙旺：信。就是不想你一個人扛著。|熙蒙：知道啦，我會跟你商量的|熙旺：嗯，明天搬東西，早點睡。',
  // A player with the morning reunion unanswered must not be displaced by
  // this later optional composer; after the day its NPC prefix backfills.
  {enabled:s=>!!s.story55?.completed?.return})
];
