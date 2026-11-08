import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
// Only incidental NPC life chats; D12 move and D13 intrusion remain original Story55 nodes.
const parse=t=>t.split('|').filter(Boolean).map(x=>{const i=x.indexOf('：');if(i<0)throw Error('群聊缺少发言人');return {who:x.slice(0,i),kind:'text',text:x.slice(i+1)};});
// Chat events are independent of the player's reply. Unskip legacy missed NPC scenes.
const restoreSkipped=(s,q)=>{if(q.skipped&&q.status==='skipped'){q.skipped=false;q.historySettled=false;q.status='pending';q.started=false;q.index=0;q.nextAt=null;q.dueAt=null;q.awaitingPlayer=false;}};
const scene=(id,at,text,migrate=null)=>({id,chat:'group',at,lines:parse(text),...(migrate?{migrate}:{})});
export const D12_GROUP=[
 scene('separate-work','13:40','阿威：大屋那邊我先把空地清一下|仔仔：我晚點帶衣架過去|小辛：今天別算我，我晚上才有空',restoreSkipped),
 scene('arrival','21:50','胡枫：落地了，在等行李|熙旺：我在出站口那邊|胡枫：行，我拿完箱子就出來',restoreSkipped),
 scene('settling','23:02','胡枫：終於到了，行李放哪？|仔仔：我給你空了一個角落|胡枫：可以，明天再整理吧',restoreSkipped)
];
export const D13_GROUP=[
 scene('seoul-jetlag','09:44','胡枫：昨晚到得太晚了，現在才醒|小辛：回澳門第一天就賴床啊|胡枫：你凌晨三點還在打遊戲，有資格說我？'),
 scene('work','15:10','仔仔：那幾套衣服要再核一次尺寸|阿威：我晚上過去試|仔仔：別穿著跑，先讓我改完|小辛：這話怎麼像特地說給我聽的'),
 scene('evening','18:35','熙旺：各自手上的資料先整理好，明天碰面一起看|阿威：我那份晚上發你|胡枫：我剛回來，先把收到的檔案過一遍')
];

export const D12_PRIVATE=[
 {id:'wang-airport',chat:'wang',at:'18:41',lines:parse('熙旺：我出門去機場接胡楓了。|熙旺：你們先吃，不用等。|熙蒙：他幾點落地？|熙旺：八點多，路上可能慢一點。|熙蒙：那你小心開車|熙旺：嗯，幫我留點菜。')}
];
// D13's existing Mirage wallet, green screen and telephony scenes are untouched.
export const D13_PRIVATE=[
 {id:'hufeng-laptop','chat':'hufeng',at:'12:27',lines:parse('胡枫：我那台電腦你看了沒？|熙蒙：你昨晚才給我，急什麼|胡枫：怕報告又丟了嘛。|胡枫：晚上請你吃豬扒包，算修理費。|熙蒙：一個豬扒包就打發我？|胡枫：再加杯凍檸茶，不能更多了。')},
 {id:'father-planning',chat:'fulongsheng',at:'19:03',lines:parse('傅隆生：下午說的資料，你先慢慢整理。|傅隆生：這次不急著動手，先把每一步想清楚。|熙蒙：知道了干爹，我會做好方案的|傅隆生：嗯，別光顧著逞能。')}
];

export const d12Track=createConversationTrack({day:12,prefix:'d12',scenes:[...D12_GROUP,...D12_PRIVATE],progress:s=>s.story55.d12Chats??={}});
export const d13Track=createConversationTrack({day:13,prefix:'d13',scenes:[...D13_GROUP,...D13_PRIVATE],progress:s=>s.story55.d13Chats??={}});
