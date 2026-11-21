import {tracks} from './catalog.js';
import {listeningData} from './listening-data.js';

const clock=n=>`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
const musicalQuestion=/歌|音樂|音乐|旋律|節奏|节奏|副歌|和弦|編曲|编曲|人聲|人声|前奏|伴奏|歌詞|歌词|聽|听|哪[一個个]段|哪[一個个]秒|\d{1,2}[:：]\d{2}/;
export function musicListeningContext(history, text){
 const shares=history.filter(m=>m.kind==='music'&&m.from==='me'&&m.actual!==false&&!m.demo);
 if(!shares.length)return '';
 const latest=shares.at(-1),named=tracks.find(t=>String(text).includes(t.title)&&shares.some(m=>m.attachment?.trackId===t.id));
 const track=named||tracks.find(t=>t.id===latest.attachment?.trackId);
 if(!track||!named&&!musicalQuestion.test(String(text)))return '';
 const data=listeningData[track.id];if(!data)return '';
 const seconds=String(text).match(/(\d{1,2})[:：]([0-5]\d)/);
 const t=seconds?Number(seconds[1])*60+Number(seconds[2]):null;
 const rows=t!==null?data.windows.filter(r=>r[0]>=Math.max(0,t-20)&&r[0]<=t+15):data.windows.filter((_,i)=>i%2===0);
 const lines=rows.map(r=>`${clock(r[0])} ${r.slice(1).join('/')}`).join('；');
 return `【真實音頻分析｜${track.title} — ${track.artist}】來自已分享的同一錄音，非歌名推測；全長${data.duration}秒。每行為5秒窗口起點與平均聲能(dB，越接近0越響)/頻譜重心(Hz，越高偏亮)/低頻能量占比(%)/頻譜變化強度(相對量)/突出音高類(候選，非確定和弦)。${t!==null?`對方提到${clock(t)}，參考前後音樂變化。`:''}\n${lines}\n這是音頻量測而非逐字歌詞或樂器辨識；只在對方聊音樂時自然回應聽感，不報數字、不杜撰歌詞、樂器、演唱段落，不聲稱已和對方同步播放或真的聽完。`;
}
