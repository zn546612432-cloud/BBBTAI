// D55 · 2025-07-12 · one clock and the existing native chat lifecycle.
// Every "me" line is an explicit player Send; no automated player dialogue.
export const D55_BRIEFING='d55-briefing';
export const D55_DEPARTURE='d55-departure';
export const D55_WANG_LAST='d55-wang-last';
export const D55_XIAOXIN='d55-xiaoxin';
export const D55_BRIEFING_LINES=[
 ['me','最後再確認一次行動流程。'],
 ['me','哥負責帶干爹去孤兒院。黃德忠的跟蹤隊會一路尾隨，等他們途經司法警察局，僱傭兵就會同步發起襲擊。'],
 ['me','他們負責在一樓製造混亂，解決黃德忠。我們趁特警隊進場，跟著混入金庫。'],
 ['me','只有三分鐘。下載完帳戶資料，立刻撤退。'],
 ['me','晚上十點前到永利皇宮，混進撤展隊伍，離開澳門。'],
 ['me','還有一種最壞的情況。'],
 ['me','如果僱傭兵沒能殺死黃德忠……'],
 ['me','不管是誰，先撤。不要戀戰。'],
 ['小辛','好。'],
 ['胡楓','收到。'],
 ['仔仔','我再檢查一遍衣服。'],
 ['阿威','明白。'],
 ['熙旺','好。']
];
export const D55_DEPARTURE_LINES=[['熙旺','我出發了，保持聯絡。']];
export const D55_WANG_LAST_LINES=[['熙旺','抱歉，原諒哥哥。']];
export const D55_XIAOXIN_LINES=[
 ['小辛','蒙哥？該出發了。'],
 ['小辛','蒙哥，你怎麼了？'],
 ['me','好，過來接我。'],
 ['me','計劃有變。'],
 ['me','熙旺死了。'],
 ['小辛','啊？？！'],
 ['小辛','怎麼會？警察跟來了嗎？'],
 ['小辛','怎麼會這樣……'],
 ['me','路上再說，抓緊時間。'],
 ['小辛','好。']
];
const SCENES=[
 [D55_BRIEFING,'09:50','行動確認','wechat','group',['ready'],D55_BRIEFING_LINES],
 [D55_DEPARTURE,'18:00','行動開始','wechat','wang',[D55_BRIEFING],D55_DEPARTURE_LINES],
 [D55_WANG_LAST,'19:00','最後的消息','wechat','wang',[D55_DEPARTURE],D55_WANG_LAST_LINES],
 [D55_XIAOXIN,'19:02','計劃有變','wechat','xiaoxin',[D55_WANG_LAST],D55_XIAOXIN_LINES]
];
export function applyD55Definition(c){
 if(c.d55ActionRevision>=1)return false;
 for(const [id,at,title,channel,conversationId,requires,lines] of SCENES){
  const node={id,day:55,at,title,channel,conversationId,requires,kind:'scene',
   delivery:'queued',pauseTimeUntilComplete:true,messagePrefix:'s55-'+id,
   initialDelayMs:0,pauseMs:2600};
  const index=c.nodes.findIndex(n=>n.id===id);
  if(index<0)c.nodes.push(node);else c.nodes[index]={...c.nodes[index],...node};
  c.scenes[id]=structuredClone(lines);
 }
 const ending=c.nodes.find(n=>n.id==='ending');
 if(ending&&!ending.requires.includes(D55_XIAOXIN))ending.requires.push(D55_XIAOXIN);
 c.d55ActionRevision=1;
 return true;
}
