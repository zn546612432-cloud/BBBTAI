import {isStory55,taiRecognized} from '../story55/state.js';
// On-device episodic memories only from facts the player explicitly said.
// No AI-inferred "facts"; no unshared WeChat or future-story contents.
const MARKERS=/(我喜欢|我不喜欢|我最喜欢|我讨厌|我害怕|我怕|我答应|我们约好|说好了|下次我们|别忘了|记住|我想要|我生日|我会在|我准备|我读过|我一直)/;
export function rememberTaiConversation(s,text,{source='noapp'}={}){
 if(!taiRecognized(s)||source!=='noapp')return false;
 const quote=String(text||'').trim().slice(0,360);
 if(!quote||quote.length<5||!MARKERS.test(quote))return false;
 const list=s.aiDraft?.memories;
 if(!Array.isArray(list))return false;
 if(list.some(x=>x.source==='NoApp · 熙蒙亲口所说'&&x.text===quote))return false;
 list.push({day:s.day,visibility:'noapp',source:'NoApp · 熙蒙亲口所说',text:quote,enabled:true});
 // Keep 100 exact quotes. Never overwrite manually authored memories.
 const dynamic=list.filter(x=>x.source==='NoApp · 熙蒙亲口所说');
 if(dynamic.length>100){
  const earliest=dynamic[0],index=list.indexOf(earliest);
  if(index>=0)list.splice(index,1);
 }
 return true;
}
