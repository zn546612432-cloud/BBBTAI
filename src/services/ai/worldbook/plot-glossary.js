// BBBTAI story facts, not generative examples. Primary sources:
// D14 framework mail, D25 survey/group/Mirage, D29 identity+Ghost Car,
// D43 Paris exchange, D53 Jack/rescue, and the GHOST TAI app definition.
//
// One read-only projection into the existing NoApp worldbook snapshot.
// Never grant a role access to private WeChat or unopened future dialogue.
import {taiCanonicalMilestones} from './plot-memory.js';

const actual=m=>m&&m.actual!==false&&!m.demo&&!m.authoredPending&&!m.testOnly;
const played=(s,id)=>{const x=s.story55?.completed?.[id];return !!x&&!x.test&&!x.legacySkipped;};
const noappLines=s=>s.content?.conversations?.noapp?.find(c=>c.id==='tai')?.messages||[];
const heard=(s,id,part)=>noappLines(s).some(m=>actual(m)&&m.from==='tai'&&m.day<=s.day&&
  new RegExp('^s55-'+id+'-\\d+$').test(String(m.id||''))&&String(m.text||'').includes(part));
const readQuery=messages=>{
 const last=[...(Array.isArray(messages)?messages:[])].reverse().find(m=>m?.role==='user');
 const text=String(last?.content||'').slice(0,380);
 return /^\s*\[(?:游戏系统事件|遊戲系統事件|电话系统事件|電話系統事件)/.test(text)?'':text;
};
const t=value=>String(value||'').normalize('NFKC').toLowerCase().trim();
const supported=s=>s?.story55?.version===1&&!s.story55?.ended;
const program=/(?:[銜衔]尾蛇之[淚泪]|ouroboros[’']?\s*tear|(?:^|[^a-z])小?tai(?:$|[^a-z]))/i;
const tearName=/(?:[銜衔]尾蛇之[淚泪]|ouroboros[’']?\s*tear)/i;
const doctor=/(?:[銜衔]尾蛇博士|dr\.?\s*ouroboros|[銜衔]尾蛇|ouroboros)/i;
const termPatterns={
 'tear-program':program,
 'ouroboros-identity':doctor,
 'narrenschiff':/narrenschiff/i,
 'mirage':/mirage|幻象(?:平台|通訊|通讯)/i,
 'ghost-deployment':/(?:^|[^a-z])ghost(?:$|[^a-z])|五(?:關|关)(?:部署|測試|测试)|link.{0,4}(?:檢查|检查)/i,
 'ghost-car':/鬼[車车]陷阱|ghost\s*car\s*trap|數字人.*數字車|数字人.*数字车/i,
 'room404':/room[._-]?404|room404|三胞胎照片|加密照(?:片)?/i,
 'd43-paris':/巴黎(?:鐵塔|铁塔|見|见|約定|约定)|金字塔|(?:^|[^a-z])paris(?:$|[^a-z])/i,
 'd53-gift':/傑克(?:手辦|手办)|杰克(?:手辦|手办)|伴手[禮礼]|jack(?:的)?(?:手辦|手办)/i,
 'd25-survey':/security_survey_0612|安保(?:設備|设备|清單|清单)|監控系統(?:高清圖|清單)|监控系统(?:高清图|清单)/i,
 'family':/三胞胎|熙旺.{0,7}(?:熙泰|[兄弟])|孤兒院(?:兄弟|三胞胎)|孤儿院(?:兄弟|三胞胎)/i
};
export const TAI_CANONICAL_PLOT_TERMS=Object.freeze(Object.keys(termPatterns));

function entry(id,content){
 return {id:'story-lore:'+id,order:1150,position:0,role:0,phase:null,
  content:'【正典劇情詞條｜只供熙泰認知，不是對話原文】'+content+
  '。回答玩家實際問到的部分，不念來源編號，不背誦整條詞條，不聲稱未完成任務已成功；人物知道與願不願意透露是兩回事。'};
}
function term(s,id){
 switch(id){
 case 'tear-program':{
  const named=played(s,'d25-survey');
  return entry(id,'銜尾蛇之淚（Ouroboros’ Tear）不是人、幫派、組織或Dr Ouroboros的另一個身份，而是一套程序／AI工程Agent。D14由Dr Ouroboros向熙蒙提供基礎框架，D25熙蒙用它收集資料、分析軟件和研究設備，後來的部署與測試是熙蒙的工作；在GHOST可稱為TAI／小TAI。' +
   (named?'熙蒙已在D25群聊說出程序名稱，並稱框架來自銜尾蛇；熙泰對這段命名及框架來歷不陌生。':'目前沒有可靠證據表明熙蒙已把完整部署及測試結果親口告訴你，不要假裝已驗收。')+
   '熙泰本人不是TAI，也不能把TAI誤認為Dr Ouroboros本人');
 }
 case 'ouroboros-identity':
  return entry(id,'Dr Ouroboros／銜尾蛇博士是MIRAGE匿名合作時使用的身份；實際上是熙泰本人。熙泰知道自己提供過框架、協助過熙蒙，但不因此知道熙蒙所有私下群聊、未做的事或未說的計劃。這個真名與三胞胎關係在相認前嚴禁向玩家揭露');
 case 'narrenschiff':
  return entry(id,'Narrenschiff是D14郵件提到的名稱，郵件稱Ouroboros’ Tear為它的基礎框架，並明言當時還不是完整版本。不能編造Narrenschiff已完工、其全部模組已啟用或它是一個人物');
 case 'mirage':
  return entry(id,'MIRAGE是熙蒙與匿名Dr Ouroboros接觸、接收技術合作信息的通訊渠道。它不是銜尾蛇之淚，不是TAI，也不是NoApp私人通話。熙泰曾透過這個匿名身份提供框架與提醒');
 case 'ghost-deployment':
  return entry(id,'GHOST是熙蒙操作框架、部署專案和進行LINK等任務驗證的工具介面；Ouroboros’ Tear／TAI是與之相關的程序／Agent，不能把介面、程序、人物混作同一個實體。操作結果須看真實專案進度，不預設已成功');
 case 'ghost-car':
  if(!played(s,'plan'))return null;
  return entry(id,'鬼車陷阱（Ghost Car Trap）是D29由Dr Ouroboros提出的構想：使用虛構數字人與數字車混淆AI輔助追蹤，取代單純播放預錄監控畫面的舊做法。提出構想不代表數字人、數字車或系統已經完成交付；進度以已實際發生的任務為準');
 case 'room404':
  if(!played(s,'questions')&&!played(s,'photo'))return null;
  return entry(id,'room.404及相關照片／加密相片是銜尾蛇身份線中給熙蒙留下的線索。照片與孤兒院嬰兒合照有關，玩家需要親自解開線索；不能用這個詞條假裝玩家在找到文件前已看過全部內容');
 case 'd43-paris':
  if(!taiCanonicalMilestones(s).some(x=>x.id==='story55-paris-promise'))return null;
  return entry(id,'D43熙泰曾傳巴黎鐵塔照片，問熙蒙想不想看真正的巴黎鐵塔，熙蒙說更想看金字塔；熙泰真正說過：「所以別讓我失望，熙蒙。我們巴黎見。」這是尚未確認履行的見面約定，不代表兩人已在巴黎見面');
 case 'd53-gift':
  if(!heard(s,'d53-tai-night','手辦已經包好了'))return null;
  return entry(id,'D53熙泰談到看到傑克的手辦想起熙蒙，買下了一套並說「手辦已經包好了，自己過來拿。」這件禮物已提及、已包好，但沒有證據說熙蒙真的拿到了');
 case 'd25-survey':
  if(!played(s,'d25-survey'))return null;
  return entry(id,'D25阿威給熙蒙發了監控系統高清圖、設備採購清單，以及security_survey_0612.zip；熙蒙把設備型號作為AI程序研究銀行安保的輸入。這是收到材料，不等於已證實所有設備型號、破解成功或完成銀行行動');
 case 'family':
  return entry(id,'熙蒙、熙旺、熙泰是三胞胎。熙泰幼時被收養，沒有與熙旺、熙蒙在澳門孤兒院共同長大；他提前查到親緣，但玩家要經正式相認才能知道。不能捏造三人童年共同經歷。');
 default:return null;
 }
}

// Exposes precisely the same lore to text, call and the action director.
// No Story55 state is mutated; current saves immediately gain the correction.
export function projectTaiPlotGlossary(s,context={}){
 if(!supported(s)||context.channel!=='noapp'||context.recognized!==true)return [];
 const query=t(readQuery(context.messages));
 if(!query)return [];
 const matches=[];
 // Prioritize the exact program definition when "Ouroboros" also matches.
 if(termPatterns['tear-program'].test(query))matches.push('tear-program');
 for(const [id,pattern] of Object.entries(termPatterns)){
  if(id==='tear-program'||id==='ouroboros-identity'&&tearName.test(query))continue;
  if(pattern.test(query))matches.push(id);
 }
 return matches.slice(0,3).map(id=>term(s,id)).filter(Boolean);
}

// Only an ordinary, explicit "what is this program?" question gets one
// source-grounded, authored short reply. Other technical follow-ups use lore.
export function taiDirectTearDefinition(s,input){
 if(!supported(s)||!s.story55?.completed?.recognition)return null;
 const query=t(input).replace(/[\s，,。！？!?、：:；;「」『』“”"'’]/g,'').replace(/^(?:熙泰|陳熙泰|陈熙泰|nya)/i,'');
 const name='(?:[銜衔]尾蛇之[淚泪]|ouroborostear)';
 const pattern=new RegExp('^(?:(?:你)?(?:知[道唔]|記得|记得|說說|说说|告訴我|告诉我|解釋一下|解释一下))?'+name+'(?:是什[麼么]|是啥|是什[麼么]東西|是什[麼么]程序|(?:是)?做什[麼么]的|幹嘛的|干嘛的|有什[麼么]用|有什[麼么]作用)(?:嗎|吗)?$','i');
 if(!pattern.test(query))return null;
 return {id:'canon-tear-definition-v1',
  text:'銜尾蛇之淚，就是你叫 TAI 的那套程序。底層框架是我給你的，你把它做成能收集資料、分析軟件、自己跑研究流程的 AI。怎麼，現在考我？'};
}
