// Media surface for the existing NoApp scripted call session.
import {esc} from '../../../../system/ui.js';
const players=new WeakMap();
export function scriptedVideoView(call){
 return '<section class="tai-call-screen tai-native-call tai-video-call" aria-label="NoApp 視訊通話">'+
 '<video data-key="tai-scripted-video-'+call.sessionId+'" data-tai-scripted-video="'+call.sessionId+'" src="'+esc(call.scripted.video)+'" playsinline webkit-playsinline preload="auto" disablepictureinpicture></video>'+
 (call.videoBlocked?'<button type="button" data-action="tai-play-video" class="tai-video-retry">繼續播放</button>':'')+
 '<button type="button" data-action="tai-hangup" class="tai-video-end" aria-label="掛斷視訊">×</button></section>';
}
export function stopScriptedVideo(call){
 const p=players.get(call);if(!p)return;
 p.video?.pause();p.cleanup?.();players.delete(call);
}
export function mountScriptedVideo(call,{visible,retry=false,onEnd,onBlocked}){
 const doc=globalThis.document;if(!doc)return;
 let p=players.get(call);
 if(!p){p={video:null,position:0,playing:false};players.set(call,p);}
 const next=visible&&!doc.hidden?doc.querySelector('#screen-layer [data-tai-scripted-video="'+call.sessionId+'"]'):null;
 if(!next){if(p.video){p.position=p.video.currentTime||p.position;p.video.pause();}return;}
 if(p.video!==next){
  if(p.video){p.position=p.video.currentTime||p.position;p.video.pause();p.cleanup?.();}
  p.video=next;
  const ended=()=>{if(p.video===next&&next.ended)onEnd();};
  const error=()=>{if(p.video!==next)return;call.videoBlocked=true;onBlocked();};
  const hidden=()=>{if(doc.hidden){p.position=next.currentTime||p.position;next.pause();}};
  const restore=()=>{if(p.position>0&&p.position<next.duration)next.currentTime=p.position;};
  if(next.readyState>=1)restore();else next.addEventListener('loadedmetadata',restore,{once:true});
  next.addEventListener('ended',ended);next.addEventListener('error',error);doc.addEventListener('visibilitychange',hidden);
  p.cleanup=()=>{next.removeEventListener('ended',ended);next.removeEventListener('error',error);next.removeEventListener('loadedmetadata',restore);doc.removeEventListener('visibilitychange',hidden);};
 }
 if(retry){call.videoBlocked=false;if(next.error)next.load();}
 if(call.videoBlocked||p.playing||!next.paused||next.ended)return;
 p.playing=true;
 Promise.resolve(next.play()).then(()=>{p.playing=false;if(call.videoBlocked){call.videoBlocked=false;onBlocked();}}).catch(()=>{p.playing=false;if(p.video===next){call.videoBlocked=true;onBlocked();}});
}
