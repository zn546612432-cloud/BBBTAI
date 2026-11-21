// Authored journal: narrative prose, not a task board or hidden progression UI.
import {getDailyWeather,setWeatherOverride} from '../../services/weather/world.js';
import {GHOST_CAR_DIARY} from '../d35-d40/diary.js';
import {D44_DIARY} from '../d43-d44/definition.js';
import {GHOST_CAR_MODEL_FILES} from '../d35-d40/progress.js';
import {modelDelivered} from '../../services/story55/ghost-car.js';
// Game D01 is 2025-05-19. [[label|reminder title]] marks optional reminders.
export const DIARY_START='2025-05-19';
export const DEFAULT_DIARY_ENTRIES={
  ...GHOST_CAR_DIARY,
  44:D44_DIARY,
  25:{title:'銜尾蛇之淚',afterNode:'d25-survey',body:'終於把程序跑起來了。\n\n阿威送來了第一批資料。估計這幾天機房都得開著。'},
  26:{title:'維保記錄',afterNode:'d26-records',body:'銀行今年三月換過安保公司。\n\n阿楓帶回來了新的維保記錄，重新調整研究方向。\n\n讓它繼續跑吧。'},
  27:{title:'四年',afterNode:'d27-ouroboros',body:'原來他花了四年才寫出這個程序。\n\n換作是我，恐怕連看都不肯給別人看一眼。\n\n他倒好，說給就給了。\n\n明天樣品就到，試試看。'},
  28:{title:'第一次測試',afterNode:'d28-meeting',body:'樣品送到了，原先的方案還有一些地方需要重新考慮。\n\n畫面看起來沒問題，不代表整個系統都沒有問題。\n\n明天下午開會，先把這些事情整理一下。'},
  29:{title:'鬼車',afterNode:'plan',body:'干爹說，下棋的時候，也要想清楚對方下一步會怎麼走。\n\n銜尾蛇今晚給了我一個意想不到的答案。\n\nGhost Car Trap。\n\n既然他們相信自己的眼睛，那就讓他們看見根本不存在的東西。\n\n真是個瘋子。\n\n不過，我喜歡這個想法。\n\n另外，他終於肯給我一點關於自己的線索了。'},
  23:{title:"王翼棄兵",afterNode:"d23-chess-finish",body:"今天開會，原先的計劃被干爹挑出不少毛病。\n\n準備的時候不覺得，聽他一問，才發現有些地方根本接不上。我們想著怎麼往下做，他卻問，為什麼非要這樣做。\n\n他說，做事跟下棋一樣，要講方法。不能手裡有什麼棋，就只想著下什麼棋。有時候，也要學會棄兵保后。\n\n當時聽懂了。回來再看計劃，還是不知道該從哪裡改。\n\n晚上跟 Ouroboros 下了盤棋。他講王翼棄兵，先捨一枚兵，去搶時間和主動權。\n\n怎麼今天誰都在教我丟東西。\n\n棋盤上倒好，兵就在眼前，丟了能換來什麼，也有人慢慢講給我聽。計劃裡要捨掉哪一部分，卻沒這麼清楚。\n\n躺下了還在想干爹問的那幾句話。\n\n明天再看一遍。"},
  14:{
    title:"最近有點忙",
    body:"搬回來以後，總覺得以前的東西越來越不夠用了。\n\n工作站那幾臺機器還能撐一陣子，就是吵得要命。有時候半夜安靜下來，聽著風扇轉，還挺催眠的。\n\n家裡又熱鬧起來了。\n\n哥最近很忙，乾爹回來以後，好像有操不完的心。\n\n感覺接下來有很長一段時間都閒不下來了。"
  },
  15:{
    title:"奇怪的人",
    body:"今天遇到一個很奇怪的人。\n\n明明是第一次認識，說話卻一副跟我很熟的樣子。\n\n自大，嘴欠，還特別愛管閒事。\n\n不過技術確實不錯。\n\n他說那一百萬美元是借給我的。\n\n我又沒說要借。\n\n……有錢人的腦子是不是都有點問題？",
    afterNode:"loan"
  },
  17:{
    title:"下雨了",
    body:"下午突然下了好大的雨。\n\n小辛又在群裡嚷嚷他的鞋。這人也真是，穿那麼貴的鞋去訓練，淋濕了還怪天氣。\n\n哥說今天不練了，晚上大家一起喫燒烤。\n\n胡楓帶回來的資料有些地方對不上。原本以為已經弄清楚的事情，好像又多了點麻煩。\n\n算了，明天再看。\n\n今天還是先喫飯。",
    afterChat:"bank-followup"
  },
  6:{
    title:'今天有點意思',
    body:'昨天整理的東西還有一點沒弄完，今天抽空處理一下。\n\n最近 MIRAGE 的單子還行，不過小委託做多了也挺煩的。看看今天有沒有什麼值得接的，最好來個獎金高一點的。\n\n哥昨天還叫我出去走走。再說吧，先把手裡的事情忙完。',
    // Generic diary stages use completed story nodes; D07-D55 can reuse this
    // format without a new daily tick function or event dispatcher.
    sections:[{id:'mirage-conversation',afterNode:'invitation',text:'今天運氣不錯。\n\nFlow 早上發來的那個錢包挑戰，獎金居然有 10 BTC。原本還以爲會有多麻煩，結果比想象中順利。\n\n獎金到賬了。\n\n發佈挑戰的那個 Dr Ouroboros 還專門找我聊了幾句，問我屬於哪個組織。\n\n我說我單幹。\n\n他好像挺意外的。說話有點欠揍，不過技術應該不錯。\n\n最後還叫我「黑客天才」，說以後有機會合作。\n\n行啊，有錢賺再說。'}]
  },
  5:{
    title:'先把手邊的事弄完',
    body:'工房裡的設備還能用。內存和硬盤的報價再看看，沒必要一下全換。\n\n前幾天的東西歸一下檔，備份也該整理了。有些委託還沒交，先把手邊的事弄完。\n\n天天都是這些，多少有點無聊。'
  },
  1:{
    title:'',
    body:'平靜的一天。\n\n胡楓還在韓國留學，偶爾在群裡發幾句消息，也不知道最近過得怎麼樣。\n\n仔仔不知道在忙什麼，已經很久沒在群裡冒泡了。小辛倒是難得幹起了正事，最近一直在忙他的酒吧。\n\n大家各有各的事情，偶爾聊上幾句，日子就這麼一天天過去了。\n\n說不上不好。\n\n只是有些平淡。\n\n……好像也太平淡了點。'
  },
  2:{
    title:'電腦該退休了',
    body:'最近工作站用著不太順手，前陣子才換過配件。機房裡那幾臺服務器還在跑，存儲和內存也想補一點。\n\n有空看看澳東商城。'
  }
};
export const D02_DIARY_SECTIONS={
 brother:'中午和哥聊了換配件的事。\n\n他說晚上出車完給我轉點錢。我倒是希望他給自己留着。老頭子一直沒動靜，手裡的錢還是得省着點。',
 purchase:'在澳東買了些配件。剩下的先放著吧，東西到手再安排。'
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
export const diaryWeatherLabel=value=>value.replace(/[云阴雾阵风]/g,ch=>({'云':'雲','阴':'陰','雾':'霧','阵':'陣','风':'風'}[ch]));
const diaryFacts={'ghost-car-models':s=>GHOST_CAR_MODEL_FILES.every(f=>modelDelivered(s,f.id))};
export function entryFor(s,day){
 const extra=s.content?.storyDiary?.[String(day)];
 const authored=DEFAULT_DIARY_ENTRIES[day];
 const base=extra||authored;
 if(!base)return null;
 // Approved authored entries appear only when their source scene has happened.
 // User-edited diary entries remain independent and visible as written.
 if(!extra&&authored?.afterNode&&!Object.hasOwn(s.story55?.completed||{},authored.afterNode))return null;
 if(!extra&&authored?.afterFact&&!diaryFacts[authored.afterFact]?.(s))return null;
 const authoredChat=s.story55?.authoredDays?.['d'+String(day).padStart(2,'0')]?.[authored?.afterChat];
 if(!extra&&authored?.afterChat&&!authoredChat?.completed)return null;
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
 return {...base,weather:getDailyWeather(s,{day,cityId:'macau'})?.condition||'暫無記錄',body:parts.filter(Boolean).join('\n\n')};
}
export function allDiaryDays(s){
 const days=new Set([...Object.keys(DEFAULT_DIARY_ENTRIES),...Object.keys(s.content?.storyDiary||{})]);
 return [...days].map(Number).filter(d=>Number.isInteger(d)&&d>=1&&d<=55&&entryFor(s,d)).sort((a,b)=>a-b);
}
export function saveDiaryEntry(s,day,data){
 if(!Number.isInteger(day)||day<1||day>55)throw Error('日程只支持D01—D55');
 if(typeof data.body!=='string'||data.body.length>6000||typeof data.title!=='string'||data.title.length>150||typeof data.weather!=='string'||data.weather.length>30)throw Error('日程內容超出長度限制');
 s.content.storyDiary??={};
 const existing=s.content.storyDiary[String(day)]||{};
 const permitted=new Set([...(day===2?['brother','purchase']:[]),...(DEFAULT_DIARY_ENTRIES[day]?.sections||[]).map(section=>section.id)]);
 const stages=data.stages?Object.fromEntries(Object.entries(data.stages).filter(([key,val])=>permitted.has(key)&&typeof val==='string'&&val.length<=3000).map(([key,val])=>[key,val.trim()])):existing.stages;
 // Journal weather edits use the exact same state as the Weather App.
 // Older storyDiary.weather values are read by getWeather for compatibility.
 setWeatherOverride(s,{day,cityId:'macau',values:{condition:data.weather.trim()||'晴'}});
 s.content.storyDiary[String(day)]={title:data.title.trim(),body:data.body.trim(),...(stages?{stages}:{})};
}
