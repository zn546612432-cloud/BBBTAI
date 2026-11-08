// Exact-match D10–D13 migration. No new scheduler, no rewriting player speech.
import {D10_GROUP} from '../d10/dialogue.js';
import {seedAuthoredNotes} from '../../services/story55/authored-notes.js';
export const OLD_D10={"shopping-list":["下午去超市，有没有要带的","洗衣液快没了","五号电池","薯片","什么口味","都行，别芥末"],"noodles":["中午有人吃面吗","等会儿再说","昨天那袋咖啡豆谁开的","我，剩的都封好了"],"heat":["今天太阳是真的狠"],"supermarket":["超市排队排了半小时","我们还在停车场","马上好了"],"carry":["到楼下了，谁下来搬东西","我下去","薯片呢","你先搬"],"dinner":["汤在炉上，回来自己盛"],"night":["明天终于不用买东西了"]};
export const OLD_RETURN=[["wang","起床了没有？干爹回来了，今天回据点一趟。"],["me","真的？我马上过去。"],["father","好好干。"]];
export const OLD_MOVE=[["wang","先把自己的东西搬回来。胡枫晚上到，我去机场接他。"],["xin","谁把这屋子的插座全占了，我手机快没电了。"],["me","先别动那排，那是我的服务器。"]];
export const NEW_RETURN=[["wang","阿蒙，醒了没有？"],["wang","干爹前天晚上就回澳门了，今早刚打电话给我。晚上去老地方，大家碰个面。"],["me","干爹回来了？哥，你怎么现在才告诉我！"],["wang","我也是刚接到电话。他住美景大厦，今天不用过去找他。"],["wang","胡枫还在韩国，明晚落地，我去机场接。你晚上记得过来。"]];
export const NEW_MOVE=[["wang","今天先把旧大屋收拾出来，常用的东西各自带，不用一次搬完。"],["xin","我晚上再过去，先把手头的事弄完。"],["me","机房那几台机器你们先别动，我自己整理。"],["wang","知道。胡枫今晚落地，我去机场接他，记得给他留个地方放箱子。"]];
export const OLD_INTRUSION_LINE="你的日程里写着汪杰和他的电子钱包，我想我们有必要把接下来的事情谈清楚。";
export const NEW_INTRUSION_LINE="你手机里的消息比你想的多。看来你要做的事，也不只那十枚比特币。";
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const MEETING_NOTE={id:'xm-note-d11-meeting',day:11,at:'22:00',title:'5/29 · 备忘',
 text:['今晚去了老地方。胡枫还在韩国，明晚落地。',
 '干爹前天回了澳门，住美景大厦。今晚烧烤时问起大家最近在忙什么。',
 '我提了汪杰那份五亿美元电子钱包的线索。现在还不能把话说满。',
 '三个月筹三千万。干爹要看我们做出的东西，不是听我吹。',
 '明天整理旧据点，哥晚上去机场接胡枫。'].join('\n')};
const archive=(s,m)=>{(s.story55.contentArchives??=[]).push({
 id:m.id,text:m.text,from:m.from,day:m.day,time:m.time,sentDate:m.sentDate,
 original:structuredClone(m),revision:'d10-d13-20261108'
});};
function replaceNPCText(s,m,text,from,chatId){
 const old=m.text;
 archive(s,m);m.text=text;
 if(from)m.from=from;
 for(const n of s.notifications||[])if(n.messageId===m.id&&n.conversationId===chatId&&n.body===old)n.body=text;
}

function migrateNPC(s){
 let changed=false;
 const group=s.content.conversations.wechat?.find(x=>x.id==='group');
 const wang=s.content.conversations.wechat?.find(x=>x.id==='wang');
 if(group){
  for(const scene of D10_GROUP)for(let i=0;i<scene.lines.length;i++){
   const m=group.messages.find(x=>x.id==='d10-'+scene.id+'-'+i);
   if(!m||m.from==='me'||m.from==='熙蒙'||m.text!==OLD_D10[scene.id]?.[i])continue;
   replaceNPCText(s,m,scene.lines[i].text,scene.lines[i].who,'group');changed=true;
  }
  for(let i=0;i<2;i++){
   const m=group.messages.find(x=>x.id==='s55-move-'+i);
   if(m&&m.from!=='me'&&m.from!=='熙蒙'&&m.text===OLD_MOVE[i][1]){
    replaceNPCText(s,m,NEW_MOVE[i][1],null,'group');changed=true;
   }
  }
  const falseFather=group.messages.find(x=>x.id==='s55-return-2'&&x.from!=='me'&&x.text==='好好干。');
  if(falseFather){
   archive(s,falseFather);group.messages=group.messages.filter(m=>m!==falseFather);
   group.unread=Math.max(0,(group.unread||0)-1);
   s.notifications=(s.notifications||[]).filter(n=>n.messageId!==falseFather.id);changed=true;
  }
  const original=group.messages.find(x=>x.id==='s55-return-0'&&x.from!=='me'&&x.text===OLD_RETURN[0][1]);
  if(original&&wang){
   replaceNPCText(s,original,NEW_RETURN[0][1],null,'group');
   group.messages=group.messages.filter(m=>m!==original);
   if(!wang.messages.some(m=>m.id===original.id))wang.messages.push(original);
   for(const n of s.notifications||[])if(n.messageId===original.id){
    n.conversationId='wang';n.title=wang.name;n.body=original.text;n.link={appId:'wechat',route:'/chat/wang',params:{}};
   }
   changed=true;
  }
 }
 for(const c of s.content.conversations.mirage||[])for(const m of c.messages||[])
  if(m.id==='s55-intrusion-5'&&m.from!=='me'&&m.text===OLD_INTRUSION_LINE){
   replaceNPCText(s,m,NEW_INTRUSION_LINE,null,c.id);changed=true;
  }
 return changed;
}
// Earlier saved phones may already have migration revision 1 and the NEW
// text but still retain the OLD sender: the original migration changed only
// m.text. Correct that precise partial migration even after revision 1.
function correctMigratedD10Speakers(s){
 const group=s.content?.conversations?.wechat?.find(x=>x.id==='group');
 if(!group)return false;
 let changed=false;
 for(const scene of D10_GROUP)for(let i=0;i<scene.lines.length;i++){
  const expected=scene.lines[i],m=group.messages.find(x=>x.id==='d10-'+scene.id+'-'+i);
  if(!m||m.from===expected.who||m.from==='me'||m.from==='熙蒙'||m.authored||m.edited||
    m.text!==expected.text||!(m.storyD10===true||m.lifecycleId==='d10:'+scene.id)||
    !(m.day===10||m.sentDate==='2025-05-28'))continue;
  archive(s,m);m.from=expected.who;changed=true;
 }
 return changed;
}
// Repair the D10 Wednesday/Friday pickup contradiction on already-delivered NPC
// messages, including saves that have completed the previous D10-D13 migration.
// A player-sent or customized message is never rewritten.
function correctD10Pickup(s){
 const oldText='收到了，明晚我去機場接你';
 const newText='收到了，後天晚上我去機場接你';
 const group=s.content?.conversations?.wechat?.find(x=>x.id==='group');
 const m=group?.messages?.find(x=>x.id==='d10-carry-2'&&x.from==='熙旺'&&
   x.text===oldText&&(x.day===10||x.sentDate==='2025-05-28'));
 if(!m)return false;
 archive(s,m);m.text=newText;
 for(const n of s.notifications||[])if(n.messageId===m.id&&n.conversationId==='group'&&n.body===oldText)n.body=newText;
 return true;
}
export function syncD10D13Content(s){
 if(s.story55?.version!==1)return false;
 let changed=false;
 // Keep D11 family reunion and D12 arrival independent of D06 and reply gates.
 for(const [id,old] of [['return','invitation'],['move','return']]){
  const node=s.story55.config?.nodes?.find(n=>n.id===id);
  if(node&&JSON.stringify(node.requires)===JSON.stringify([old])){node.requires=[];changed=true;}
 }
 if(s.story55.d10D13Revision!==1){
  const c=s.story55.config,q=s.story55.scenes||{};
  if(c&&same(c.scenes?.return,OLD_RETURN)){
   c.scenes.return=structuredClone(NEW_RETURN);
   Object.assign(c.nodes.find(n=>n.id==='return')||{},{at:'08:40',delivery:'queued',channel:'wechat',conversationId:'wang'});
   if(q.return&&!s.story55.completed?.return){
    q.return.index=[0,1,3,4][Math.max(0,Math.min(3,q.return.index||0))];
    delete q.return.nextAt;
   }
   changed=true;
  }
  if(c&&same(c.scenes?.move,OLD_MOVE)){
   c.scenes.move=structuredClone(NEW_MOVE);
   Object.assign(c.nodes.find(n=>n.id==='move')||{},{at:'10:10',delivery:'queued',channel:'wechat',conversationId:'group'});
   if(q.move)delete q.move.nextAt;
   changed=true;
  }
  if(c?.scenes?.intrusion?.[5]?.[1]===OLD_INTRUSION_LINE){
   c.scenes.intrusion[5][1]=NEW_INTRUSION_LINE;changed=true;
  }
  changed=migrateNPC(s)||changed;
  s.story55.d10D13Revision=1;changed=true;
 }
 changed=correctD10Pickup(s)||changed;
 changed=correctMigratedD10Speakers(s)||changed;
 if(s.story55.completed?.return)changed=seedAuthoredNotes(s,[MEETING_NOTE])||changed;
 return changed;
}
