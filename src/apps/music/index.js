import {musicLibrary} from './features/library/index.js';
import {musicPlayer} from './features/player/index.js';
import {uid} from '../../services/id.js';
export const manifest={id:'music',name:'音乐',icon:14,defaultRoute:'/',supportsDeepLink:true,kicker:'MUSIC'};
let audio=null,progress=0,view='library',tab='listen',query='',repeat=true,shuffle=false;
const format=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export const render=({store})=>`<div class="ios-music">${view==='player'?musicPlayer(store.get().musicPlaying,progress,repeat,shuffle):musicLibrary({playing:store.get().musicPlaying,tab,query})}</div>`;
const sync=()=>{if(!audio)return;progress=audio.duration?audio.currentTime/audio.duration*100:0;const seek=document.querySelector('#screen-layer .music-seek-input');if(seek&&document.activeElement!==seek)seek.value=String(progress);const current=document.querySelector('[data-music-current]'),duration=document.querySelector('[data-music-duration]');if(current)current.textContent=format(audio.currentTime);if(duration)duration.textContent=format(audio.duration||0);};
export function handle(a,t,c){
 if(a==='music-tab'){tab=t.dataset.tab;view='library';c.refresh();}
 if(a==='music-open'){view='player';c.refresh();sync();}
 if(a==='music-library'){view='library';c.refresh();}
 if(a==='music-restart'||a==='music-next'){if(audio)audio.currentTime=0;sync();}
 if(a==='music-shuffle'){shuffle=!shuffle;c.refresh();}
 if(a==='music-repeat'){repeat=!repeat;if(audio)audio.loop=repeat;c.refresh();}
 if(a==='music-toggle'){
  if(!audio){audio=new Audio('/assets/night.wav');audio.loop=repeat;audio.addEventListener('timeupdate',sync);audio.addEventListener('loadedmetadata',sync);audio.addEventListener('ended',()=>{c.store.update(s=>s.musicPlaying=false);});}
  if(c.store.get().musicPlaying){audio.pause();c.store.update(s=>s.musicPlaying=false);}
  else audio.play().then(()=>c.store.update(s=>s.musicPlaying=true)).catch(()=>c.toast('音频播放失败'));
 }
 if(a==='music-share'){c.store.update(s=>s.content.conversations.noapp[0].messages.push({id:uid(),from:'me',text:'分享音乐：夜航',kind:'text',time:s.clock,actual:true}));c.router.open({appId:'noapp',route:'/chat/tai'});}
}
export function input(el){if(el.name==='music-search'){query=el.value;const match='夜航'.includes(query.trim())||!query.trim();const track=el.closest('.music-library')?.querySelector('.music-track'),empty=el.closest('.music-library')?.querySelector('.music-no-results');if(track)track.hidden=!match;if(empty)empty.hidden=match;}}
export function change(el){if(el.name==='music-seek'&&audio&&audio.duration){audio.currentTime=Number(el.value)/100*audio.duration;sync();}}
