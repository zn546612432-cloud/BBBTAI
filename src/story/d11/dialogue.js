import {xinDogSticker} from '../../services/assets/xin-dog-stickers.js';
// D11 · 2025-05-29. Only the six Wolf Cubs are in the group;
// Fu Longsheng's offline meeting is represented in Ximeng's own note.
const parse=body=>body.split('|').filter(Boolean).map(part=>{const i=part.indexOf('：');if(i<0)throw Error('群聊缺少发言人');const speaker=part.slice(0,i);return {who:speaker==='熙蒙'?'me':speaker==='胡楓'?'胡枫':speaker,kind:'text',text:part.slice(i+1)};});
// Chat events are independent of the player's reply. Unskip legacy missed NPC scenes.
const restoreSkipped=(s,q)=>{if(q.skipped&&q.status==='skipped'){q.skipped=false;q.historySettled=false;q.status='pending';q.started=false;q.index=0;q.nextAt=null;q.dueAt=null;q.awaitingPlayer=false;}};
const scene=(id,at,body)=>({id,chat:'group',at,lines:parse(body),migrate:restoreSkipped});
export const D11_GROUP=[
 scene('notice','09:15','熙旺：晚上七點半，老地方見。|熙旺：乾爹回來了，今天大家盡量過來。|阿威：？？？？？？？什麼時候回來的？|仔仔：哇！！！|小辛：啊？真的？|阿威：是不是說|阿威：我們終於可以出山幹一票大的了？|小辛：我的手槍飢渴難耐。|胡枫：這麼突然？可我還在韓國。|胡枫：乾爹什麼時候回來的，一點風聲也沒有。|熙旺：具體情況見面再說呢。阿楓，你看看最近的機票是什麼時候，我到時候去機場接你。|胡枫：好。|仔仔：怎麼辦，我有點激動。|熙旺：乾爹感受到你們的愛了。|小辛：欸，好難得看到旺哥用表情包！'),
 scene('afternoon','15:20','小辛：興奮得我酒吧打烊半天。|阿威：小辛順路嗎？我在大三巴，一會接我。|小辛：好，我去買點啤酒。|小辛：楓哥你今天來嗎？@胡楓|胡枫：來不了，我明天才能到。|小辛：好哦，注意安全。'),
 scene('after-meeting','22:20','仔仔：我到家了。|阿威：我也回去了。|小辛：今天吃得夠飽。|熙旺：明晚機場見，早點休息。')
];


// D11: personal requests and post-meeting concerns stay in private chats.
// The evening family scene is NOT impersonated as a group conversation.
const privateScene=(id,chat,at,body,extra={})=>({
 id,chat,at,lines:parse(body),...extra
});
export const D11_PRIVATE=[
 privateScene('father-after-meeting','fulongsheng','22:06','傅隆生：好好幹。'),
 privateScene('wang-worry','wang','22:18',
  '熙旺：蒙蒙，睡了嗎？|熙蒙：沒呢哥。|熙旺：今天你說的電子錢包的事，我還是有點擔心。|熙旺：五億美元，沒有那麼容易拿。|熙蒙：我又沒說明天就能拿到。|熙蒙：上次那十枚比特幣，我不也拿到了嗎？這次規模是大了點，可又不是完全沒機會。哥，我可是天才黑客。|熙旺：我知道。我弟弟肯定是最棒的。而且我看得出來，乾爹被你說動了。他肯讓你試，也是信你的本事。|熙蒙：時代在變，我們也要變，這是趨勢。|熙旺：不過，我希望有任何事情，你能先跟我商量。|熙蒙：哥，你不信我啊？|熙旺：信。只是不想你一個人扛著，我們是一家人。|熙蒙：知道啦，我會跟你商量的。時間不早了，我先休息了。|熙旺：嗯，晚安。',
  // A player with the morning reunion unanswered must not be displaced by
  // this later optional composer; after the day its NPC prefix backfills.
  {enabled:s=>!!s.story55?.completed?.return})
];

D11_GROUP.find(s=>s.id==='notice').lines.splice(14,0,{who:'熙旺',kind:'image',text:xinDogSticker('得意的小狗')});
