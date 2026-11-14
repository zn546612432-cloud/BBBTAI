import {appendAuthoredPhoneMessage} from '../../services/messaging/phone-messages.js';

// User-approved 82-order allocation: 20 existing distinctive owners and
// 50 one-off owners. This data only changes owner labels; orders still use
// the existing D04 commission runner and notification/message lifecycle.
export const MIRAGE_OWNER_OVERRIDES=Object.freeze({
 'M-012':'@quietterminal',
 'M-023':'@rowan_17',
 'M-024':'@shallowbox',
 'M-025':'@hollowreceipt',
 'M-027':'@thirdwindow',
 'M-029':'@marbleline',
 'M-030':'@duskoperator',
 'M-031':'@blankfolio',
 'M-032':'@kitesignal',
 'M-035':'@mossroute',
 'M-036':'@cinder_archive',
 'M-037':'@sleepless_04',
 'M-038':'@bluecarbon',
 'M-039':'@tinparcel',
 'M-040':'@paperorbit',
 'M-044':'@wintergrain',
 'M-045':'@lowharbor',
 'M-046':'@sable_12',
 'M-048':'@narrowkey',
 'M-049':'@whitequartz',
 'M-050':'@ambertrace',
 'M-051':'@station_09',
 'M-052':'@noonshade',
 'M-053':'@oxidepaper',
 'M-054':'@frostledger',
 'M-055':'@silentacre',
 'M-056':'@lostfolio',
 'M-057':'@lilacnode',
 'M-058':'@moonstripe',
 'M-059':'@windowless',
 'M-060':'@silverframe',
 'M-061':'@driftindex',
 'M-062':'@vaultline',
 'M-063':'@hushbay',
 'M-064':'@blackmarble',
 'M-066':'@stone_17',
 'M-067':'@northparcel',
 'M-068':'@twinmirror',
 'M-069':'@stillgrain',
 'M-073':'@pinelight',
 'M-074':'@tealshift',
 'M-075':'@dawncipher',
 'M-076':'@paperwharf',
 'M-078':'@distant_02',
 'M-079':'@greycable',
 'M-080':'@rustenvelope',
 'M-081':'@wavetop',
 'M-082':'@coldstudio',
 'M-083':'@smallharbor',
 'M-085':'@outerledger',
});

const STANDARD=Object.freeze({
 accepted:'委託資料已發送，請按約定交付。',
 completed:'已收到，驗收通過。',
 expired:'未按約定完成，合作終止。'
});

// Fixed authorial lines: no AI improvisation, technical hints or new scheduler.
const FEATURED=Object.freeze({
 '@deadletter':{accepted:"資料我收到了就會看。不需要另外提醒。",completed:"檔案齊全。這次可以結案。",expired:"原定時間過了，檔案不用再寄。",repeat:"又是你。這次別讓我多等。"},
 '@undertow':{accepted:"時間已經寫清楚了，別耽誤。",completed:"正好趕上。下回再聯絡。",expired:"錯過時間就沒意思了。",repeat:"還記得上次的規矩吧？"},
 '@moth':{accepted:"有人說你很擅長找別人不願留下的東西。",completed:"看來傳聞並不全是假的。",expired:"那就當這封信從沒寄過。",repeat:"我們又碰面了。挺巧。"},
 '@blacktide':{accepted:"我只看結果，不聽解釋。",completed:"合格。錢會照付。",expired:"失敗就是失敗。不要找藉口。"},
 '@basalt':{accepted:"價格寫在上面，別再加。",completed:"這個價錢，算值得。",expired:"那我只好找更便宜的人。"},
 '@velvet_00':{accepted:"這回可別讓我看笑話。",completed:"喲，還真的做到了。",expired:"真可惜，今晚有人要失望了。",repeat:"老朋友，又有生意上門。"},
 '@saltwater':{accepted:"海上的事情變得快，你盯緊點。",completed:"行，這趟算順利。",expired:"船可不會停在那裡等你。",repeat:"喂，又輪到我們合作啦。"},
 '@oldmoney':{accepted:"請依照條件逐項核對，別漏。",completed:"核算無誤，合作愉快。",expired:"期限與條款都寫得很清楚。",repeat:"又見面了。這次也請照老規矩。"},
 '@afterimage':{accepted:"我只要原件。",completed:"確認了。沒有缺頁。",expired:"不要再聯絡我談這份資料。",repeat:"我想你應該記得我的要求。"},
 '@cobalt':{accepted:"附件規格已經列好，不用再問。",completed:"交付符合條件。",expired:"不符合要求，這筆不算。",repeat:"上次的格式很合適，照做就行。"},
 '@rancor':{accepted:"NYARLATHOTEP？你接得倒快。",completed:"收到了。這次算你準時。",expired:"時間到了。我不等第二次。"},
 '@ledger_8':{accepted:"校驗依據已附，請勿修改原始字段。",completed:"數據一致，已驗收。",expired:"數據未能按時核對，委託關閉。",repeat:"上次的記錄還在，這回照樣核對。"},
 '@sixthfloor':{accepted:"相關檔案將按約定提供。",completed:"資料符合要求。",expired:"逾期不再受理。"},
 '@greyfox':{accepted:"有些人不喜歡自己的名字出現在紙上。",completed:"我知道了。這件事到此為止。",expired:"你來得太晚，那個人已經走了。",repeat:"還是我們之間的老規矩。"},
 '@tape_09':{accepted:"我需要未經剪輯的原始版本。",completed:"聲音和時間都對得上。",expired:"檔案期限已過，別再補。"},
 '@ivory':{accepted:"只接收完整且可辨識來源的資料。",completed:"內容已完成核對。",expired:"很遺憾，研究已不再需要這份檔案。"},
 '@nullsector':{accepted:"已授權。",completed:"確認。",expired:"關閉。"},
 '@helix_09':{accepted:"文件版本請保持一致。",completed:"版本與附件吻合。",expired:"版本不符或逾期，已撤回委託。"},
 '@arbiter_6':{accepted:"所有交付均以約定記錄為準。",completed:"記錄已確認，無異議。",expired:"未履行約定，案件終止。"},
 '@executor':{accepted:"請嚴格依照附件所列文件範圍辦理。",completed:"文件已由代理人確認。",expired:"本次授權期限已屆滿。"},
});

export const MIRAGE_FEATURED_OWNER_IDS=Object.freeze(Object.keys(FEATURED));
const dateOf=day=>new Date(Date.UTC(2025,4,19)+(day-1)*86400000).toISOString().slice(0,10);
const employerId=owner=>'mc-employer-'+owner.slice(1);

// Invoked only by real OPEN->ACCEPTED, READY->COMPLETED, and
// accepted->EXPIRED transitions of the EXISTING commission runner.
export function emitMirageEmployerMessage(s,order,event){
 if(!order?.marketDaily||!/^@[a-z0-9_]{2,40}$/i.test(order.owner)||!['accepted','completed','expired'].includes(event))return false;
 const threads=s.content.conversations.mirage??(s.content.conversations.mirage=[]);
 const id=employerId(order.owner);
 let thread=threads.find(x=>x.id===id||x.name===order.owner);
 if(!thread){
  if(event!=='accepted')return false; // never conjure an employer without a successful acceptance
  thread={id,name:order.owner,avatar:order.owner.slice(1,3).toUpperCase(),online:false,unread:0,messages:[]};
  threads.push(thread);
 }
 const messageId='mirage-commission-'+order.id+'-'+event;
 if(thread.messages.some(m=>m.id===messageId))return false;
 if(event==='accepted'){
  appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:thread.id,messageId:'mirage-commission-'+order.id+'-newcontact',from:'system',kind:'system',text:'── NEW CONTACT ──',day:s.day,clock:s.clock,sentDate:dateOf(s.day),storyTag:'story55',notify:false});
 }
 const lines=FEATURED[order.owner]||STANDARD;
 const previouslyAccepted=event==='accepted'&&thread.messages.some(m=>m.id.startsWith('mirage-commission-')&&m.id.endsWith('-accepted'));
 const text=previouslyAccepted&&lines.repeat?lines.repeat:lines[event];
 if(!text)return false;
 return !!appendAuthoredPhoneMessage(s,{channel:'mirage',conversationId:thread.id,messageId,from:thread.id,text,day:s.day,clock:s.clock,sentDate:dateOf(s.day),storyTag:'story55'});
}
