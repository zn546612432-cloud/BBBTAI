import replacements from '../../../story/assets/d01-d09-copy-replacements.json' with {type:'json'};

// Update only delivered NPC copies with an exact known former authored value.
// A source change must not rewrite real player speech, edited text, timestamps,
// read state, IDs, progress or pre-D01 historical messages.
export function reviseDeliveredStoryCopy(s){
 if(s.story55?.copyRevisionD01D09===2)return false;
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
 s.story55.copyRevisionD01D09=2;
 return true;
}
