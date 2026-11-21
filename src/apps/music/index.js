import {registerAudio} from '../../system/audio/index.js';
import {musicLibrary,musicAccount,musicBrowse,trackRows} from './features/library/index.js';
import {musicPlayer,modeLabels} from './features/player/index.js';
import {tracks,trackById} from './features/shared/catalog.js';
import {sendMessage} from '../../services/messaging/index.js';
export const manifest={id:'music',name:'音乐',icon:14,defaultRoute:'/',supportsDeepLink:true,kicker:'MUSIC'};
let audio=null,progress=0,view='library',tab='listen',query='',category='歌曲',playRequest=0;
const modes=Object.keys(modeLabels);
export const isPlaying=()=>!!audio&&!audio.paused;
const format=n=>`${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
export const render=({store})=>{const s=store.get(),current=trackById(s.musicTrack);return `<div class="ios-music${view==='player'?' music-full-player':''}">${view==='player'?musicPlayer(s.musicPlaying,progress,s.musicMode||'sequence',current):view==='account'?musicAccount():view==='browse'?musicBrowse(category):musicLibrary({playing:s.musicPlaying,tab,query,current})}</div>`;};
const sync=()=>{if(!audio)return;progress=audio.duration?audio.currentTime/audio.duration*100:0;const seek=document.querySelector('#screen-layer .music-seek-input');if(seek&&document.activeElement!==seek)seek.value=String(progress);const current=document.querySelector('[data-music-current]'),duration=document.querySelector('[data-music-duration]');if(current)current.textContent=format(audio.currentTime);if(duration)duration.textContent=format(audio.duration||0);};
function adjacent(s,step){const i=tracks.findIndex(t=>t.id===trackById(s.musicTrack).id);if(s.musicMode==='shuffle'&&tracks.length>1)return tracks[(i+1+Math.floor(Math.random()*(tracks.length-1)))%tracks.length];return tracks[(i+step+tracks.length)%tracks.length];}
function loadTrack(t,c){
 if(!audio){audio=registerAudio(new Audio());audio.preload='auto';audio.addEventListener('timeupdate',sync);audio.addEventListener('loadedmetadata',sync);audio.addEventListener('ended',()=>{const s=c.store.get(),i=tracks.findIndex(t=>t.id===trackById(s.musicTrack).id);if((s.musicMode||'sequence')==='sequence'&&i===tracks.length-1){c.store.update(s=>s.musicPlaying=false);return;}playTrack(adjacent(s,1).id,c);});}
 if(audio.dataset.track!==t.id||audio.error){audio.src=t.src;audio.dataset.track=t.id;audio.dataset.source='primary';progress=0;}
 audio.loop=c.store.get().musicMode==='single';
}
export function playTrack(id,c){
 const t=trackById(id),request=++playRequest;loadTrack(t,c);
 // Start synchronously inside the tap, before store rendering consumes Safari's user gesture.
 const playing=audio.play();
 c.store.update(s=>{s.musicTrack=t.id;});
 const success=()=>{if(request===playRequest)c.store.update(s=>s.musicPlaying=true);};
 const failed=()=>{if(request===playRequest){c.store.update(s=>s.musicPlaying=false);c.toast('音频播放失败，点按重试');}};
 return playing.then(success,error=>{
  if(request!==playRequest)return;
  if(t.fallback&&audio.dataset.source!=='fallback'&&error?.name!=='NotAllowedError'){
   audio.src=t.fallback;audio.dataset.source='fallback';return audio.play().then(success,failed);
  }
  failed();
 });
}
export function handle(a,t,c){
 if(a==='music-tab'){tab=t.dataset.tab;view='library';c.refresh();}
 if(a==='music-open'){view='player';c.refresh();sync();}
 if(a==='music-account'){view='account';c.refresh();}
 if(a==='music-browse'){category=t.dataset.category;view='browse';c.refresh();}
 if(a==='music-play-track'){view='player';playTrack(t.dataset.track,c);c.refresh();sync();}
 if(a==='music-library'){view='library';c.refresh();}
 if(a==='music-restart'){if(audio)audio.currentTime=0;sync();}
 if(a==='music-previous'||a==='music-next'){const s=c.store.get();if(a==='music-previous'&&audio?.currentTime>3){audio.currentTime=0;sync();return;}const next=adjacent(s,a==='music-next'?1:-1);if(isPlaying())playTrack(next.id,c);else{loadTrack(next,c);c.store.update(s=>{s.musicTrack=next.id;s.musicPlaying=false;});}sync();}
 if(a==='music-mode'){const mode=modes[(modes.indexOf(c.store.get().musicMode||'sequence')+1)%modes.length];if(audio)audio.loop=mode==='single';c.store.update(s=>s.musicMode=mode);c.toast(modeLabels[mode]);}
 if(a==='music-toggle'){if(isPlaying()){playRequest++;audio.pause();c.store.update(s=>s.musicPlaying=false);}else playTrack(trackById(c.store.get().musicTrack).id,c);}
 if(a==='music-share'){const track=trackById(c.store.get().musicTrack);sendMessage(c.store,{channel:'noapp',conversationId:'tai',text:'分享音乐：'+track.title,kind:'music',attachment:{trackId:track.id}});c.router.open({appId:'noapp',route:'/chat/tai'});}
}
export function input(el){if(el.name==='music-search'){query=el.value;const html=trackRows(query);const list=el.closest('.music-library')?.querySelector('.music-tracks'),empty=el.closest('.music-library')?.querySelector('.music-no-results');if(list){list.innerHTML=html;list.hidden=!html;}if(empty)empty.hidden=!!html;}}
export function change(el){if(el.name==='music-seek'&&audio&&audio.duration){audio.currentTime=Number(el.value)/100*audio.duration;sync();}}
