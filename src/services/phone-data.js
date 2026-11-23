// One phone book and one call log for the phone UI and native story calls.
// Fictional Macau numbers are assigned once and retained in each player's save.
const phoneNumbers=Object.freeze({
 self:'+853 6935 0816',
 'contact-brother':'+853 6658 4912',
 'contact-dentist':'+853 2834 6041',
 'contact-fu':'+853 6634 2873',
 'contact-awai':'+853 6619 6305',
 'contact-xiaoxin':'+853 6672 1748',
 'contact-zaizai':'+853 6694 9026',
 'contact-hufeng':'+853 6628 3159'
});
const contactAliases=Object.freeze({
 '熙旺':'contact-brother','哥':'contact-brother','傅隆生':'contact-fu',
 '阿威':'contact-awai','小辛':'contact-xiaoxin','仔仔':'contact-zaizai',
 '胡楓':'contact-hufeng','胡枫':'contact-hufeng','口腔前台':'contact-dentist'
});
const digits=value=>String(value||'').replace(/\D/g,'');
const isMacauNumber=value=>/^853[26]\d{7}$/.test(digits(value));
const makeMobile=digits8=>'+853 '+digits8.slice(0,4)+' '+digits8.slice(4);
function stableNumber(key,used){
 let hash=2166136261;
 for(const c of String(key||'contact'))hash=Math.imul(hash^c.codePointAt(0),16777619)>>>0;
 let suffix=hash%10000000;
 for(let attempt=0;attempt<10000000;attempt++){
  const value=makeMobile('6'+String(suffix).padStart(7,'0'));
  if(!used.has(digits(value)))return value;
  suffix=(suffix+1)%10000000;
 }
 throw Error('No Macau contact number available');
}
const seedNumber=contact=>phoneNumbers[contact.id]||phoneNumbers[contactAliases[String(contact.name||'').trim()]]||'';

export const defaultPhoneData=()=>({
 self:{name:'熙蒙',number:phoneNumbers.self,region:'澳门'},
 contacts:[
  {id:'contact-brother',name:'哥',number:phoneNumbers['contact-brother']},
  {id:'contact-dentist',name:'口腔前台',number:phoneNumbers['contact-dentist']},
  {id:'contact-fu',name:'傅隆生',number:phoneNumbers['contact-fu']},
  {id:'contact-awai',name:'阿威',number:phoneNumbers['contact-awai']},
  {id:'contact-xiaoxin',name:'小辛',number:phoneNumbers['contact-xiaoxin']},
  {id:'contact-zaizai',name:'仔仔',number:phoneNumbers['contact-zaizai']},
  {id:'contact-hufeng',name:'胡枫',number:phoneNumbers['contact-hufeng']}
 ],
 historySeedVersion:1,
 calls:[
  {id:'macau-call-1',number:'+853 6XXX 0741',place:'澳门',day:'昨天',missed:false,authored:true},
  {id:'macau-call-2',number:'+853 6XXX 0509',place:'澳门',day:'星期日',missed:true,authored:true},
  {id:'macau-call-3',number:'+853 6XXX 0690',place:'澳门',day:'星期六',missed:false,authored:true},
  {id:'macau-call-4',number:'+853 6XXX 6081',place:'澳门',day:'星期六',missed:false,authored:true},
  {id:'macau-call-5',number:'+853 6XXX 5581',place:'澳门',day:'星期四',missed:false,authored:true}
 ]
});
export function phoneNumberFor(state,name){
 const alias=contactAliases[String(name||'').trim()];
 const contacts=state?.content?.phone?.contacts||[];
 const contact=contacts.find(c=>c?.name===name||c?.id===name||alias&&c?.id===alias);
 const number=contact?.number||phoneNumbers[alias]||phoneNumbers[name]||'';
 return isMacauNumber(number)?number:'';
}

// Save migration: assign only missing/invalid/duplicate numbers. Respect an
// existing valid player-edited number; never re-randomize on launch or refresh.
export function ensurePhoneData(state){
 state.content??={};
 if(!state.content.phone||!Array.isArray(state.content.phone.contacts)||!Array.isArray(state.content.phone.calls)){
  state.content.phone=defaultPhoneData();
  return true;
 }
 const data=state.content.phone;
 let changed=false;
 if(data.historySeedVersion!==1){
  const known=new Set(data.calls.map(c=>c.id));
  for(const original of defaultPhoneData().calls){
   if(!known.has(original.id)){data.calls.push(structuredClone(original));changed=true;}
  }
  data.historySeedVersion=1;changed=true;
 }
 if(!data.self||typeof data.self!=='object'){
  data.self=defaultPhoneData().self;changed=true;
 }
 const used=new Set();
 const assign=(person,preferred,key)=>{
  const current=person.number||'';
  if(isMacauNumber(current)&&!used.has(digits(current))){used.add(digits(current));return;}
  const choice=isMacauNumber(preferred)&&!used.has(digits(preferred))?preferred:stableNumber(key,used);
  person.number=choice;used.add(digits(choice));changed=true;
 };
 assign(data.self,phoneNumbers.self,'self');
 for(const contact of data.contacts){
  if(!contact||typeof contact!=='object')continue;
  assign(contact,seedNumber(contact),contact.id||contact.name);
 }
 // Earlier story calls may already exist but have no number. Patch those rows
 // without changing their identity, chronology, or call status.
 for(const call of data.calls){
  const knownFu=call?.name==='傅隆生'||['d53-fulongsheng-call','d55-fulongsheng-last'].includes(call?.scriptId);
  if(!knownFu)continue;
  const number=phoneNumberFor(state,'傅隆生');
  if(call.name!=='傅隆生'){call.name='傅隆生';changed=true;}
  if(!isMacauNumber(call.number)&&number){call.number=number;changed=true;}
 }
 return changed;
}

// Only real completed, actually-played native scenes can be recovered after a
// legacy save lost a phone-list row. A developer preview completion flag alone
// is NOT proof of a call and must not create fictional history.
export function restoreRecordedPhoneCalls(state){
 if(!state?.story55||!Array.isArray(state.content?.phone?.calls))return false;
 const calls=state.content.phone.calls;
 let changed=false;
 for(const script of [
  {id:'d53-fulongsheng-call',day:53,at:'21:30'},
  {id:'d55-fulongsheng-last',day:55,at:'22:30'}
 ]){
  if(!state.story55.scriptedCallCompleted?.[script.id])continue;
  const lines=state.story55.nativePhoneCalls?.[script.id]?.transcript||[];
  const heard=Array.isArray(lines)&&lines.some(line=>line?.speaker==='傅隆生'&&Number.isFinite(line.playedAt));
  // Older saves sometimes kept the completion + actual trigger but dropped the
  // transcript. A trigger paired with completion still proves a real call.
  const triggered=script.id==='d53-fulongsheng-call'?'d53FuCallTriggered':'d55FatherTriggered';
  if(!heard&&!(state.story55[triggered]===true&&!state.story55.previewNode))continue;
  if(calls.some(c=>c?.scriptId===script.id||c?.id===script.id||String(c?.id||'').startsWith(script.id+'-')))continue;
  const moments=lines.map(x=>x.playedAt).filter(Number.isFinite);
  const duration=moments.length?Math.max(0,Math.floor((Math.max(...moments)-Math.min(...moments))/1000)):0;
  calls.unshift({id:'recovered-'+script.id,scriptId:script.id,
   name:'傅隆生',number:phoneNumberFor(state,'傅隆生'),direction:'incoming',
   missed:false,connected:true,duration,day:script.day,time:script.at,
   place:'澳门',source:'authored-phone',recovered:true});
  changed=true;
 }
 return changed;
}

export const phoneData=state=>state.content.phone||defaultPhoneData();
