import replacements from '../../../story/assets/d01-d09-copy-replacements.json' with {type:'json'};

// Update only delivered NPC copies with an exact known former authored value.
// A source change must not rewrite real player speech, edited text, timestamps,
// read state, IDs, progress or pre-D01 historical messages.
export function reviseDeliveredStoryCopy(s){
 if(s.story55?.copyRevisionD01D09===4)return false;
 for(const [channel,chats] of Object.entries(s.content?.conversations||{}))for(const c of chats){
  for(const m of c.messages||[]){
   const line=replacements.find(line=>line.id===m.id&&line.channel===channel&&(line.before===m.text||m.id==='d09-laundry-0'&&m.text==='🐶'));
   if(!line||c.id!==line.chat||m.from!==line.from||m.from==='me'||m.sentDate&&m.sentDate<'2025-05-19')continue;
   m.text=line.text;m.kind=line.kind;
   for(const n of s.notifications||[])if(n.messageId===m.id&&n.conversationId===c.id&&n.body===line.before)n.body=line.kind==='image'?'[圖片]':line.text;
  }
 }
 for(const line of replacements){
  if(line.scene){
   const saved=s.story55.config?.scenes?.[line.scene]?.[line.index];
   if(saved?.[1]===line.before)saved[1]=line.text;
  }
  for(const queued of s.story55.wishes?.story?.lines||[]){
   if(queued.id===line.id&&queued.from===line.from&&queued.text===line.before){queued.text=line.text;queued.kind=line.kind;}
  }
 }
 const dinnerText='那晚上我們幾個出去吃飯？好久沒聚了';
 const group=s.content?.conversations?.wechat?.find(c=>c.id==='group');
 for(const m of [...(group?.messages||[]),...(s.story55.wishes?.story?.lines||[])])
  if(m.id==='d06-celebrate-10'&&m.text===dinnerText&&m.wishId==='d06-dinner')m.wishText='出去吃飯';
 s.story55.copyRevisionD01D09=4;
 return true;
}


// Older saves can contain two obsolete lines from Xiao Xin's missed computer chats.
// Revise only the exact built-in preset IDs/text, preserving player timestamps, real
// manual messages, progress and all other conversations. Never fabricate a Send.
const COMPUTER_APOLOGY='抱歉，忘記回你了。';
const obsoleteComputerReplies=[
 {track:'d02',scene:'xin',kind:'nextDay',me:'昨天沒顧上回。那台先別買，配置再看看。',npc:'行，我先不下單。'},
 {track:'d02',scene:'xin',kind:'later',me:'電腦的事還要我幫你看嗎？',npc:'要啊哥，我還沒決定。'},
 {track:'d03',scene:'xiaoxin',kind:'nextDay',me:'昨天那台先別買，別光看燈。',npc:'知道啦，等你幫我看配置。'},
 {track:'d03',scene:'xiaoxin',kind:'later',me:'電腦買了沒有？沒買的話先把配置發我。',npc:'還沒，我找找。'}
];
export function reviseMissedComputerCopy(s){
 if(s.story55?.version!==1||s.story55.missedComputerCopyRevision===1)return false;
 const c=s.content?.conversations?.wechat?.find(c=>c.id==='xiaoxin'||c.id==='xin'||c.name==='小辛');
 if(c){
  const removed=new Set();
  for(const spec of obsoleteComputerReplies){
   const prefix=spec.track+'-'+spec.scene+'-late-'+spec.kind+'-';
   const sent=c.messages?.find(m=>m.id===prefix+'0'&&m.from==='me'&&m.text===spec.me);
   if(sent)sent.text=COMPUTER_APOLOGY;
   const npc=c.messages?.find(m=>m.id===prefix+'1'&&m.from==='小辛'&&m.text===spec.npc);
   if(npc)removed.add(npc.id);
   const q=spec.track==='d02'?s.story55.d02?.wechat?.xin:s.story55.d03Chats?.xiaoxin;
   const run=q?.lateRun;
   if(run?.kind===spec.kind&&run.index>=1&&run.lines?.[0]?.text===spec.me&&run.lines?.[1]?.text===spec.npc){
    run.lines=[{who:'me',text:COMPUTER_APOLOGY}];run.index=1;
    q.lateHandled=true;q.status='closed';q.nextAt=null;q.dueAt=null;q.awaitingPlayer=false;
   }
   if(s.drafts?.[c.id]===spec.me)delete s.drafts[c.id];
  }
  if(removed.size){
   c.messages=c.messages.filter(m=>!removed.has(m.id));
   const pending=(s.notifications||[]).filter(n=>n.conversationId===c.id&&removed.has(n.messageId)).length;
   c.unread=Math.max(0,(Number(c.unread)||0)-pending);
   s.notifications=(s.notifications||[]).filter(n=>!(n.conversationId===c.id&&removed.has(n.messageId)));
   s.events=(s.events||[]).filter(e=>!(e.channel==='wechat'&&e.conversationId===c.id&&removed.has(e.messageId)));
  }
 }
 s.story55.missedComputerCopyRevision=1;
 return true;
}

const D13_REVISED_NPC=Object.freeze([
 {id:'d13-evening-0',from:'熙旺',before:'各自手上的資料先整理好，明天碰面一起看',after:'明天碰個頭，東西都帶上'},
 {id:'d13-evening-1',from:'阿威',before:'我那份晚上發你',after:'我那份晚點發你'},
 {id:'d13-evening-2',from:'胡枫',before:'我剛回來，先把收到的檔案過一遍',after:'我剛回來，讓我先看看'}
]);
const D13_RETIRED_WORK=Object.freeze([
 ['d13-work-0','仔仔','那幾套衣服要再核一次尺寸'],
 ['d13-work-1','阿威','我晚上過去試'],
 ['d13-work-2','仔仔','別穿著跑，先讓我改完'],
 ['d13-work-3','小辛','這話怎麼像特地說給我聽的']
]);
/** Reconcile D13 author revisions in a saved game without touching player messages.
 * This is a one-time source-copy migration, not a second conversation scheduler. */
export function reviseD13GroupCopy(s){
 if(s.story55?.version!==1||s.story55.d13GroupCopyRevision===1)return false;
 const c=s.content?.conversations?.wechat?.find(x=>x.id==='group');
 if(c){
  const retired=new Set();
  for(const message of c.messages||[]){
   if(message.from==='me'||message.from==='熙蒙'||message.actual===true)continue;
   const old=D13_RETIRED_WORK.find(([id,from,body])=>message.id===id&&message.from===from&&message.text===body);
   if(old){retired.add(message.id);continue;}
   const replacement=D13_REVISED_NPC.find(line=>message.id===line.id&&message.from===line.from&&message.text===line.before);
   if(replacement){
    message.text=replacement.after;
    for(const notice of s.notifications||[])
     if(notice.messageId===message.id&&notice.conversationId==='group'&&notice.body===replacement.before)
      notice.body=replacement.after;
   }
  }
  if(retired.size){
   c.messages=c.messages.filter(m=>!retired.has(m.id));
   c.unread=Math.max(0,(Number(c.unread)||0)-retired.size);
   s.notifications=(s.notifications||[]).filter(n=>!(n.conversationId==='group'&&retired.has(n.messageId)));
   s.events=(s.events||[]).filter(e=>!(e.conversationId==='group'&&retired.has(e.messageId)));
  }
 }
 s.story55.d13GroupCopyRevision=1;
 return true;
}
