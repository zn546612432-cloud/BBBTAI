import {applyD14D24Definition,D14_D24_CONTENT,D14_D24_LEGACY} from './definition.js';
import {seedAuthoredNotes} from '../../services/story55/authored-notes.js';
import previousLoan from './previous-loan-v1.json' with {type:'json'};

export function syncD14D24Content(s){
 if(s.story55?.version!==1)return false;
 let changed=false;
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
 return seedAuthoredNotes(s,D14_D24_CONTENT.notes)||changed;
}
