// D02 WeChat: authored player turns require a real Send press.
// NPC replies are timed separately; state, deadlines and message IDs survive reloads.
const DATE='2025-05-20';
const DAY=2;
const DIALOGUES={
 wang:[
  ['me','哥，我的电脑真该退休了'],
  ['熙旺','又坏了吗？你不是上回才买了屏幕？还是显卡来着'],
  ['me','可是用着还是不顺，想换新配件了'],
  ['熙旺','换新的就换新的。还差多少钱？晚上出车完我转你一些'],
  ['me','哥，你给自己留点吧，老头子一直没动静，这些钱还不知道要撑到什么时候'],
  ['熙旺','别担心'],
  ['熙旺','哥能养你一辈子']
 ],
 xin:[
  ['小辛','蒙蒙哥，澳东商城打八折诶！！！你看到没'],
  ['me','你怎么比促销短信还准时'],
  ['小辛','那当然，我收藏的显卡终于降价了'],
  ['小辛','对了，你不是也想换电脑吗？'],
  ['me','你是帮我挑，还是想让我帮你付款？'],
  ['小辛','……'],
  ['小辛','我有这么明显？'],
  ['me','你差把购物车截图贴我脸上了'],
  ['小辛','那你先看看嘛！我保证这次不是乱推荐。']
 ]
};
const inDay=s=>s.story55?.version===1&&s.day===DAY;
const gameMinute=s=>s.day*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
const visible=(s,id)=>s.unlocked&&s.nav.current.appId==='wechat'&&s.nav.current.route==='/chat/'+id;
const chat=(s,id)=>s.content.conversations.wechat?.find(c=>c.id===id||(id==='wang'&&c.name==='熙旺')||(id==='xin'&&c.name==='小辛'));
const thread=(s,key)=>s.story55?.d02?.wechat?.[key];
function append(s,key,index,from,text,{clock=s.clock}={}){
 const c=chat(s,key);if(!c)return null;
 const id='d02-'+key+'-script-'+index;
 if(c.messages.some(m=>m.id===id))return id;
 c.messages.push({id,from,text,day:DAY,time:clock,sentDate:DATE,kind:'text',actual:true,storyD02:true});
 if(from!=='me'&&key==='xin'&&index===0&&!visible(s,c.id)){
  c.unread=Math.max(0,Number(c.unread)||0)+1;
  const notificationId='d02-wechat-notice-'+id;
  if(!s.notifications.some(n=>n.id===notificationId))s.notifications.unshift({
   id:notificationId,title:'微信',body:(key==='wang'?'熙旺':'小辛')+'：'+text,
   conversationId:c.id,day:DAY,clock,
   link:{appId:'wechat',route:'/chat/'+c.id,params:{}}
  });
 }
 s.events??=[];
 s.events.push({type:from==='me'?'message_sent':'authored_message_delivered',channel:'wechat',conversationId:c.id,messageId:id,day:DAY,clock});
 return id;
}
export function seedD02Wechat(s){
 if(s.story55?.version!==1||s.day<DAY||!s.story55.d02)return false;
 const d=s.story55.d02;
 if(!d.wechat)d.wechat={version:2,wang:{index:0,dueAt:null,completed:false},xin:{index:0,dueAt:null,initialSent:false,completed:false}};
 if(d.wechat.version===2&&d.wechat.migrated)return false;
 // Remove only the old auto-seeded six bubbles per chat, including the
 // fake player messages. Do not touch history, free messages or editor records.
 const deleted=new Set();
 for(const key of ['wang','xin']){
  const c=chat(s,key);if(!c)continue;
  c.messages=c.messages.filter(m=>{
   const legacy=m.storyD02&&new RegExp('^d02-'+key+'-0[1-6]$').test(m.id);
   if(legacy)deleted.add(m.id);
   return !legacy;
  });
 }
 if(deleted.size){
  for(const n of s.notifications||[]){
   if(deleted.has(n.messageId)){
    const c=s.content.conversations.wechat?.find(c=>c.id===n.conversationId);
    if(c)c.unread=Math.max(0,(Number(c.unread)||0)-1);
   }
  }
  s.notifications=s.notifications.filter(n=>!deleted.has(n.messageId));
  s.events=(s.events||[]).filter(e=>!deleted.has(e.messageId));
 }
 d.wechat.migrated=true;
 return true;
}
export function d02Draft(s,id){
 if(!inDay(s))return null;
 const key=id==='wang'?'wang':(id==='xin'||chat(s,'xin')?.id===id)?'xin':null;
 if(!key||key==='wang'&&s.clock<'12:16'&&s.story55?.d02?.wechat?.earlyAt==null)return null;
 const t=thread(s,key),step=DIALOGUES[key][t?.index||0];
 if(!t||t.completed||t.dueAt!=null||!step||step[0]!=='me')return null;
 return {text:step[1],stage:'d02:'+key+':'+t.index};
}
export function d02ComposerDisabled(s,id){
 if(!inDay(s))return false;
 const key=id==='wang'?'wang':(id==='xin'||chat(s,'xin')?.id===id)?'xin':null;
 const t=key&&thread(s,key);
 return !!(t&&!t.completed&&t.dueAt!=null);
}
export function sendD02WeChat(store,id,text,now=Date.now()){
 const s=store.get();
 const key=id==='wang'?'wang':(id==='xin'||chat(s,'xin')?.id===id)?'xin':null;
 if(!key||!inDay(s))return {handled:false};
 const draft=d02Draft(s,id);
 const t=thread(s,key);
 if(!t||t.completed)return {handled:false};
 if(!draft){
  if(t.dueAt!=null)return {handled:true,reason:'请等对方回复后再发送预设消息'};
  return {handled:false};
 }
 if(String(text||'').trim()!==draft.text.trim())return {handled:true,reason:'请发送输入框里完整的预设台词'};
 let messageId=null;
 store.update(next=>{
  const state=thread(next,key),index=state.index;
  messageId=append(next,key,index,'me',DIALOGUES[key][index][1]);
  state.index++;
  state.dueAt=DIALOGUES[key][state.index]?.[0]!=='me'?now+1800:null;
  delete next.drafts[id];
  if(state.index>=DIALOGUES[key].length){state.completed=true;state.completedAt=gameMinute(next);state.dueAt=null;}
 });
 return {handled:true,messageId};
}
export function d02WeChatDue(s,now=Date.now()){
 if(!inDay(s))return false;
 const w=thread(s,'wang'),x=thread(s,'xin');
 return !!(x&&!x.initialSent&&(s.clock>='16:08'||Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15)
  ||[w,x].some(t=>t&&!t.completed&&Number.isFinite(t.dueAt)&&now>=t.dueAt));
}
export function tickD02Wechat(s,now=Date.now()){
 if(!inDay(s)||!s.story55?.d02?.wechat)return false;
 let changed=false;
 const x=thread(s,'xin');
 if(x&&!x.initialSent&&(s.clock>='16:08'||Number.isFinite(s.story55?.d02?.wechat?.earlyAt)&&gameMinute(s)>=s.story55.d02.wechat.earlyAt+15)){
  const publishedClock=s.clock>='16:08'?'16:08':s.clock;
  x.initialSent=true;x.index=1;
  append(s,'xin',0,'小辛',DIALOGUES.xin[0][1],{clock:publishedClock});
  changed=true;
 }
 for(const key of ['wang','xin']){
  const t=thread(s,key);if(!t||t.completed||!Number.isFinite(t.dueAt)||now<t.dueAt)continue;
  const [from,text]=DIALOGUES[key][t.index]||[];
  if(!from||from==='me'){t.dueAt=null;continue;}
  append(s,key,t.index,from,text);
  t.index++;
  if(t.index===DIALOGUES[key].length){t.completed=true;t.completedAt=gameMinute(s);t.dueAt=null;}
  else if(DIALOGUES[key][t.index][0]==='me')t.dueAt=null;
  else t.dueAt=now+2200; // the last two brother messages remain two bubbles
  changed=true;
 }
 return changed;
}
