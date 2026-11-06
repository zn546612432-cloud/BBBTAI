// Authored journal: narrative prose, not a task board or hidden progression UI.
import {getWeather,setWeatherOverride} from '../../services/weather/world.js';
// Game D01 is 2025-05-19. [[label|reminder title]] marks optional reminders.
export const DIARY_START='2025-05-19';
export const DEFAULT_DIARY_ENTRIES={
  6:{
    title:'今天有点意思',
    body:'昨天整理的东西还有一点没弄完，今天抽空处理一下。\n\n最近 MIRAGE 的单子还行，不过小委托做多了也挺烦的。看看今天有没有什么值得接的，最好来个奖金高一点的。\n\n哥昨天还叫我出去走走。再说吧，先把手里的事情忙完。',
    // Generic diary stages use completed story nodes; D07-D55 can reuse this
    // format without a new daily tick function or event dispatcher.
    sections:[{id:'mirage-conversation',afterNode:'invitation',text:'今天运气不错。\n\nFlow 早上发来的那个钱包挑战，奖金居然有 10 BTC。原本还以为会有多麻烦，结果比想象中顺利。\n\n奖金到账了。\n\n发布挑战的那个 Dr Ouroboros 还专门找我聊了几句，问我属于哪个组织。\n\n我说我单干。\n\n他好像挺意外的。说话有点欠揍，不过技术应该不错。\n\n最后还叫我「黑客天才」，说以后有机会合作。\n\n行啊，有钱赚再说。'}]
  },
  5:{
    title:'先把手边的事弄完',
    body:'工房里的设备还能用。内存和硬盘的报价再看看，没必要一下全换。\n\n前几天的东西归一下档，备份也该整理了。有些委托还没交，先把手边的事弄完。\n\n天天都是这些，多少有点无聊。'
  },
  1:{
    title:'老狼归巢',
    body:'这是傅隆生回澳门的第三天。他谁也没通知，只悄悄告诉了熙旺。当天早上，熙旺给大家发群聊说了这件事，要大家去[[据点碰面|前往据点碰面]]。\n\n三年了。傅隆生这次回来，一定有什么大动静。老狼归巢，忍饥挨饿了三年的狼崽也蠢蠢欲动……'
  },
  2:{
    title:'电脑该退休了',
    body:'最近工作站用着不太顺手，前阵子才换过配件。机房里那几台服务器还在跑，存储和内存也想补一点。\n\n有空看看澳东商城。'
  }
};
export const D02_DIARY_SECTIONS={
 brother:'中午和哥聊了换配件的事。\n\n他说晚上出车完给我转点钱。我倒是希望他给自己留着。老头子一直没动静，手里的钱还是得省着点。',
 purchase:'在澳东买了些配件。剩下的先放着吧，东西到手再安排。'
};
const storyMinute=s=>Number(s.day)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3,5));
/** Schedule only: staged D02 diary unlocks 20 GAME minutes after actions. */
export function tickD02Diary(s){
 if(s.story55?.version!==1||s.day<2||!s.story55.d02)return false;
 const d=s.story55.d02;
 d.diary??={due:{},visible:{}};
 const clock=storyMinute(s),due=d.diary.due,visible=d.diary.visible;
 if(d.wechat?.wang?.completed&&!visible.brother&&due.brother==null)due.brother=clock+20;
 if(s.day===2&&(d.purchased||[]).length&&!visible.purchase&&due.purchase==null)due.purchase=clock+20;
 let changed=false;
 for(const key of ['brother','purchase']){
  if(!visible[key]&&Number.isFinite(due[key])&&clock>=due[key]){visible[key]=true;changed=true;}
 }
 return changed;
}
export function diaryDate(day,start=DIARY_START){
 const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+Number(day)-1);
 return d.toISOString().slice(0,10);
}
export function entryFor(s,day){
 const extra=s.content?.storyDiary?.[String(day)];
 const authored=DEFAULT_DIARY_ENTRIES[day];
 const base=extra||authored;
 if(!base)return null;
 const overrides=extra?.stages||{};
 const parts=[base.body];
 // Preserve the existing D02 delayed sections unchanged; only their source
 // prose is editable, never the story timing or milestone.
 if(day===2){
  const visible=s.story55?.d02?.diary?.visible||{};
  for(const key of ['brother','purchase'])if(visible[key])parts.push(overrides[key]??D02_DIARY_SECTIONS[key]);
 }
 // All future authored stages share this one diary renderer. No daily-specific
 // application logic; never reveal private future facts before node completion.
 for(const section of (authored?.sections||[])){
  const complete=section.afterNode&&Object.hasOwn(s.story55?.completed||{},section.afterNode);
  if(complete)parts.push(overrides[section.id]??section.text);
 }
 return {...base,weather:getWeather(s,{day,cityId:'macau'})?.condition||'暂无记录',body:parts.filter(Boolean).join('\n\n')};
}
export function allDiaryDays(s){
 const days=new Set([...Object.keys(DEFAULT_DIARY_ENTRIES),...Object.keys(s.content?.storyDiary||{})]);
 return [...days].map(Number).filter(d=>Number.isInteger(d)&&d>=1&&d<=55&&entryFor(s,d)).sort((a,b)=>a-b);
}
export function saveDiaryEntry(s,day,data){
 if(!Number.isInteger(day)||day<1||day>55)throw Error('日程只支持D01—D55');
 if(typeof data.body!=='string'||data.body.length>6000||typeof data.title!=='string'||data.title.length>150||typeof data.weather!=='string'||data.weather.length>30)throw Error('日程内容超出长度限制');
 s.content.storyDiary??={};
 const existing=s.content.storyDiary[String(day)]||{};
 const permitted=new Set([...(day===2?['brother','purchase']:[]),...(DEFAULT_DIARY_ENTRIES[day]?.sections||[]).map(section=>section.id)]);
 const stages=data.stages?Object.fromEntries(Object.entries(data.stages).filter(([key,val])=>permitted.has(key)&&typeof val==='string'&&val.length<=3000).map(([key,val])=>[key,val.trim()])):existing.stages;
 // Journal weather edits use the exact same state as the Weather App.
 // Older storyDiary.weather values are read by getWeather for compatibility.
 setWeatherOverride(s,{day,cityId:'macau',values:{condition:data.weather.trim()||'晴'}});
 s.content.storyDiary[String(day)]={title:data.title.trim(),body:data.body.trim(),...(stages?{stages}:{})};
}
