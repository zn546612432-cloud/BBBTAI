import {applyD14D24Definition,D14_D24_CONTENT,D14_D24_LEGACY} from './definition.js';
import {seedAuthoredNotes} from '../../services/story55/authored-notes.js';
import previousLoan from './previous-loan-v1.json' with {type:'json'};
import previousLoanV2 from './previous-loan-v2.json' with {type:'json'};

export function syncD14D24Content(s){
 if(s.story55?.version!==1)return false;
 let changed=false;
 // Add the approved D23 scene to active saves without resetting other story nodes.
 if(s.story55.config&&(!s.story55.config.nodes.some(n=>n.id==='d23-chess')||!s.story55.config.nodes.some(n=>n.id==='d23-chess-finish')||s.story55.config.nodes.find(n=>n.id==='d23-chess')?.gateDay!==23||s.story55.config.nodes.find(n=>n.id==='d23-chess-finish')?.kind!=='scene')){
  changed=applyD14D24Definition(s.story55.config)||changed;
 }
 if(s.story55.d14D24Revision!==1){
  const c=s.story55.config;
  if(!c)return seedAuthoredNotes(s,D14_D24_CONTENT.notes);
  const oldLoan=JSON.stringify(c.scenes.loan)===JSON.stringify(D14_D24_LEGACY.scenes.loan);
  const oldLead=JSON.stringify(c.scenes.lead)===JSON.stringify(D14_D24_LEGACY.scenes.lead);
  changed=applyD14D24Definition(c)||changed;
  // Already completed scenes/credits stay complete. Resume partial legacy
  // scenes at an unsent player turn; never replay their old player bubbles.
  if(oldLoan&&!s.story55.completed.loan&&s.story55.scenes.loan){
   const q=s.story55.scenes.loan;
   q.index=[0,1,4,10,13,17,26][Math.min(q.index||0,6)];delete q.nextAt;
   if(q.index>=13)s.story55.sceneCamera={node:'loan',active:false,disconnected:true};
   if(q.index>0)c.scenes.loan=structuredClone(previousLoan); // old index belongs to the 26-line script
  }
  if(oldLead&&!s.story55.completed.lead&&s.story55.scenes.lead){
   s.story55.scenes.lead.index=s.story55.scenes.lead.index?6:0;
   delete s.story55.scenes.lead.nextAt;
  }
  // Repair exact shipped NPC copy only; retain old player speech and metadata.
  for(const chat of s.content.conversations.mirage||[])for(const m of chat.messages||[]){
   const former=/^s55-loan-(0|2|4|5)$/.exec(m.id||'');
   if(former&&m.from!=='me'&&m.text===D14_D24_LEGACY.scenes.loan[Number(former[1])][1]){
    const map={0:0,2:9,4:14,5:20};
    (s.story55.contentArchives??=[]).push({id:m.id,text:m.text,revision:'before-d14-d24'});
    m.text=previousLoan[map[Number(former[1])]][1];
   }
   if(m.id==='s55-lead-0'&&m.from!=='me'&&m.text===D14_D24_LEGACY.scenes.lead[0][1])m.text=D14_D24_CONTENT.scenes.lead[5][1];
  }
  s.story55.d14D24Revision=1;changed=true;
 }
 // D24 v2: update only the exact old seven-line scene before its first Send.
 // Preserve any in-flight legacy conversation and every previously sent bubble.
 // The mandatory gate is metadata and applies regardless of copy revisions.
 if(s.story55.d24FlowRevision!==2){
  const c=s.story55.config,node=c?.nodes?.find(n=>n.id==='lead');
  if(node&&node.day===24&&(!node.holdAt03||node.gateDay!==24)){
   node.holdAt03=true;node.gateDay=24;changed=true;
  }
  const previousLead=[
   ['me','問你個人。Dr Ouroboros，你聽過嗎？'],
   ['hacker','這不是上次那個錢包懸賞的發單人嗎？聽說他是mirage的創辦人之一，你贏了他的錢包，他應該有跟你聯繫才對呀？'],
   ['me','是有聯繫過，所以才好奇，想知道他什麼來頭。'],
   ['hacker','這種人哪有什麼來頭給你查。圈子裡都說他年紀不大，技術很兇 名聲很響，命很值錢，有黑手黨在懸賞他的人頭，價值二十億，'],
   ['me','就這些？'],
   ['hacker','聽說他住在英國和葡萄牙，其他的真不知道了'],
   ['me','明白了。謝了。']
  ];
  const q=s.story55.scenes?.lead;
  if(c?.scenes&&JSON.stringify(c.scenes.lead)===JSON.stringify(previousLead)&&!q?.index&&!s.story55.completed?.lead){
   c.scenes.lead=structuredClone(D14_D24_CONTENT.scenes.lead);changed=true;
   if(node)node.messagePrefix='s55-lead-v3';
  }
  s.story55.d24FlowRevision=2;changed=true;
 }
 // Exact-only correction of the shipped D23 King's Gambit dialogue.
 // Never overwrite an edited line or synthesize any player Send action.
 const corrected=D14_D24_CONTENT.scenes['d23-chess'];
 const legacyD23=[
  [7,'後翼棄兵，你知道吧？'],[8,"Queen's Gambit？"],
  [10,'白方以后翼兵爭奪中心。名字叫棄兵，但不是說你把兵送出去就完事了。'],
  [12,'那就換一種局面繼續下。']
 ];
 const currentD23=s.story55.config?.scenes?.['d23-chess'];
 if(Array.isArray(currentD23))for(const [index,old] of legacyD23)
  if(currentD23[index]?.[1]===old){currentD23[index]=[currentD23[index][0],corrected[index][1]];changed=true;}
 // V4's full literary/strategic King's Gambit narrative replaces only
 // the exact shipped shorter lines; author-edited variants remain untouched.
 if(Array.isArray(currentD23)&&currentD23[10]?.[1]==="白方先走 e4，等黑方走 e5，再把 f 兵推上去。夠冒險的，連自己的王都不怎麼顧。"){
  currentD23[10][1]=D14_D24_CONTENT.scenes['d23-chess'][10][1];changed=true;
 }
 if(Array.isArray(currentD23)&&currentD23[12]?.[1]==="不吃就不吃。你還能逼對方收下不成？"){
  currentD23[12][1]=D14_D24_CONTENT.scenes['d23-chess'][12][1];changed=true;
 }
 // V4 revises exactly one previously shipped narrative line, never other authored prose.
 const v4Line=D14_D24_CONTENT.scenes['d23-chess'][13][1];
 if(Array.isArray(currentD23)&&/若能打通 f 線，車就有機會直指黑方的 f7。/.test(currentD23[13]?.[1]||'')){
  currentD23[13][1]=v4Line;changed=true;
 }
 // D23 polished revision 2: only unsent official or draft lines change.
 // Preserve previously delivered messages and any authored variation.
 if(s.story55.d23ChessDialogueRevision!==2){
  const script=s.story55.config?.scenes?.['d23-chess'];
  const next=D14_D24_CONTENT.scenes['d23-chess'];
  const cursor=s.story55.scenes?.['d23-chess']?.index||0;
  if(Array.isArray(script)&&!s.story55.completed?.['d23-chess']){
   for(const [index,old,draft] of [[4,"聽起來你沒少挨訓。","一下午？那你应该没少挨训"],[5,"你能不能好好說話？","你真是嘴里吐不出好话"],[6,"我正在好好說話。","想听漂亮话，那是另外的价钱"]]){
    if(index>=cursor&&[old,draft].includes(script[index]?.[1])){
     script[index]=[script[index][0],next[index][1]];changed=true;
    }
   }
  }
  s.story55.d23ChessDialogueRevision=2;changed=true;
 }
 // Exact-match migration. An in-progress D15 conversation keeps its old
 // script and current index; all prior real Send messages remain untouched.
 // A not-yet-started scene adopts the newly approved sequence.
 if(s.story55.d14D24LoanRevision!==2){
  const q=s.story55.scenes?.loan;
  const stored=s.story55.config?.scenes?.loan;
  if(JSON.stringify(stored)===JSON.stringify(previousLoan)){
   if(!q?.index&&!s.story55.completed?.loan){
    s.story55.config.scenes.loan=structuredClone(D14_D24_CONTENT.scenes.loan);
    changed=true;
   }else{
    s.story55.legacyLoanInFlight=true;
   }
  }
  s.story55.d14D24LoanRevision=2;changed=true;
 }
 // D15 approved dialogue update: adopt the new script only before its first
 // real message. Never reinterpret an in-flight index, replay old credits or
 // fabricate player SEND messages from a previous release.
 if(s.story55.d15ApprovedLoanRevision!==1){
  const q=s.story55.scenes?.loan,stored=s.story55.config?.scenes?.loan;
  if(JSON.stringify(stored)===JSON.stringify(previousLoanV2)&&
     !q?.index&&!s.story55.completed?.loan){
   s.story55.config.scenes.loan=structuredClone(D14_D24_CONTENT.scenes.loan);
   changed=true;
  }
  s.story55.d15ApprovedLoanRevision=1;changed=true;
 }
 // The D15 farewell is a status change, not a visible message. Keep the
 // original payment, camera, cursor and offline timestamp intact.
 const loan=s.story55.config?.scenes?.loan;
 if(Array.isArray(loan)&&loan.at(-1)?.[0]==='offline'&&/^(?:衔尾蛇|銜尾蛇)已下[線线]$/.test(loan.at(-1)[1])){
  loan[loan.length-1]=['offline',''];changed=true;
 }
 for(const chat of s.content?.conversations?.mirage||[])if(chat.id==='s55-ouroboros'){
  const before=chat.messages?.length||0;
  if(before){chat.messages=chat.messages.filter(m=>!(m.from==='system'&&m.day===15&&/^(?:衔尾蛇|銜尾蛇)已下[線线][。.]?$/.test(m.text||'')));if(chat.messages.length!==before)changed=true;}
 }
 return seedAuthoredNotes(s,D14_D24_CONTENT.notes)||changed;
}
