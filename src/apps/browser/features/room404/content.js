// User-provided photographs and approved captions, newest first.
const media='/apps/browser/room404/media/';
export const ROOM404_URL='https://www.instagram.com/room.404/';
export const ROOM404_AVATAR=media+'avatar.webp';
export const ROOM404_POSTS=[
 {id:'selfie',image:media+'selfie.webp',alt:'鏡前的身材自拍',caption:'Sem desculpas.',date:'2025-06-08',likes:2,position:'50% 45%'},
 {id:'faro',image:media+'faro.webp',alt:'Faro 咖啡店門外的座位',caption:'O de sempre.',date:'2025-05-22',likes:1},
 {id:'afterparty',image:media+'afterparty.webp',alt:'散場後的酒會，吧台上的酒瓶與酒杯',caption:'Afterparty. The undisputed champion.',date:'2025-05-18',likes:2},
 {id:'coffee',image:media+'coffee.webp',alt:'木桌上的兩杯咖啡',caption:'Como antes.',date:'2025-04-16',likes:1},
 {id:'heart',image:media+'heart.webp',alt:'透明公仔胸口的紅色心臟',caption:'Frágil.',date:'2025-02-14',likes:2},
 {id:'jetlag',image:media+'jetlag.webp',alt:'穿白色外套，在車內補眠',caption:'Jet lag…',date:'2025-01-12',likes:1},
 {id:'autumn',image:media+'autumn.webp',alt:'秋日校園裡的雕塑與石造建築',caption:'Mais um outono.',date:'2024-10-28',likes:2}
];
export const room404Page={id:'room404',title:'T. (@room.404) • Instagram 相片和影片',label:'Instagram',url:ROOM404_URL,desc:'7 則貼文 · 0 位粉絲 · 0 人追蹤中。',keywords:['room.404','room404','instagram.com/room.404']};
export function isRoom404Url(value){return /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/room\.404\/?(?:[?#].*)?$/i.test(String(value||'').trim());}
