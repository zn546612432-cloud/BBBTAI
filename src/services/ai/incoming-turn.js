export const TAI_INCOMING_QUIET_MS=2200;

// Preserve every incoming bubble. The latest unanswered batch is one turn,
// not necessarily one subject; the model sees the whole sequence.
export function incomingTaiBatch(history,sourceId){
 const end=history.findIndex(m=>m.id===sourceId);if(end<0)return [];
 const batch=[];
 for(let i=end;i>=0;i--){const m=history[i];
  if(m.demo||m.kind==='app_invitation')continue;
  if(m.from!=='me'||m.taiHandledAction||m.kind==='call')break;
  if(m.actual!==false&&['text','music','voice'].includes(m.kind||'text'))batch.unshift(m);
 }
 return batch;
}
export const incomingBatchPrompt=batch=>batch.length>1?'【连续来信】这是同一轮未答复的'+batch.length+'条消息。先判断是否是同类、补充或重复的话；同一意思只回应一次，不逐条引用或逐条回，不凑气泡数。不同话题才按必要性分别简短回应，允许只回应最重要的一件事。':'不必为了延续而追问；简单消息一句就足够。';
