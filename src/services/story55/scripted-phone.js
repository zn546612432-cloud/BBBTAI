// Fixed story phone: only Xitai is voiced. Ximeng is subtitle only.
import {isStory55,nodeStatus,completed,story55Config} from './state.js';
import {scene55,sceneLines,advanceScene55} from './runtime.js';
import {voicePreview} from '../ai/gateway.js';
import {createGestureAudio} from '../voice/playback.js';
import {TAI_PORTRAIT} from '../../apps/noapp/portrait.js';
import {esc} from '../../system/ui.js';
let active=null;
function restoreFromSave(s){
 if(valid(s,active))return active;
 const saved=s?.story55?.lockedCall;
 if(!saved||!Number.isInteger(saved.startIndex)||nodeStatus(s,saved.node).state!=='ready'||s.day!==saved.day)return null;
 active={node:saved.node,day:saved.day,phase:'ringing',caption:'',speaker:'',error:'',audio:null,pending:null,running:false};
 return active;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const valid=(s,a)=>!!a&&isStory55(s)&&!s.story55.ended&&s.day===a.day&&nodeStatus(s,a.node).state==='ready';
export const scriptedCallStatus=s=>valid(s,active)?{node:active.node,phase:active.phase}:null;
export function beginScriptedCall(ctx,node){
 const s=ctx.store.get();
 if(nodeStatus(s,node).state!=='ready'||sceneLines(s,node)[scene55(s,node).index]?.[0]!=='call')throw Error('当前不是等待接听的剧情电话');
 ctx.store.update(state=>{state.story55.lockedCall={node,day:state.day,startIndex:scene55(state,node).index};});
 active={node,day:s.day,phase:'ringing',caption:'',speaker:'',error:'',audio:null,pending:null,running:false};
 ctx.router.open({appId:'noapp',route:'/story-call',params:{node}});
 return true;
}
function assetUrl(s,node,index){
 const path=story55Config(s).voiceAssets?.[node]?.[index];
 if(!path)return null;
 if(typeof path!=='string'||!/^\/assets\/[a-z0-9_./-]+\.(mp3|wav|m4a|ogg)$/i.test(path))throw Error('音频必须放在 /assets/');
 return new URL(path.slice(1),new URL('./',globalThis.location?.href||document.baseURI)).href;
}
async function speak(ctx,a,content,index){
 let temp=null;
 try{
  const url=assetUrl(ctx.store.get(),a.node,index);
  if(url)a.audio.src=url;
  else{
   const blob=a.pending?.index===index?a.pending.blob:await voicePreview({text:content,tone:'dry'});
   a.pending={index,blob};
   temp=URL.createObjectURL(blob);a.audio.src=temp;
  }
  if(active!==a||!valid(ctx.store.get(),a))return false;
  await new Promise((resolve,reject)=>{
   a.audio.onended=resolve;a.audio.onerror=()=>reject(Error('配音文件播放失败'));
   try{a.audio.play()?.catch(reject);}catch(err){reject(err);}
  });
  a.pending=null;return true;
 }finally{
  a.audio.onended=null;a.audio.onerror=null;
  if(temp)URL.revokeObjectURL(temp);
 }
}
async function playScript(ctx,a){
 if(a.running)return;
 a.running=true;
 try{
  for(let i=0;i<150&&active===a&&valid(ctx.store.get(),a);i++){
   const s=ctx.store.get(),index=scene55(s,a.node).index,line=sceneLines(s,a.node)[index];
   if(!line)break;
   if(!['me','tai','ouroboros'].includes(line[0]))throw Error('剧本中包含无法自动播放的类型：'+line[0]);
   a.phase='connected';a.speaker=line[0]==='me'?'熙蒙':'陈熙泰';a.caption=line[1];a.error='';ctx.refresh();
   if(line[0]==='me')await wait(Math.min(6500,Math.max(1700,line[1].length*120)));
   else if(!await speak(ctx,a,line[1],index))break;
   if(active!==a||!valid(ctx.store.get(),a))break;
   ctx.store.update(state=>{
    advanceScene55(state,a.node);
    if(completed(state,a.node))delete state.story55.lockedCall;
   });
   if(completed(ctx.store.get(),a.node)){
    a.phase='ended';a.caption='通话已结束';a.speaker='';ctx.refresh();
    await wait(750);if(active===a){active=null;ctx.router.back();}
    break;
   }
   ctx.refresh();await wait(360);
  }
 }catch(err){if(active===a){a.phase='error';a.error=String(err?.message||err);ctx.refresh();}}
 finally{a.running=false;}
}
export function answerScriptedCall(ctx){
 const s=ctx.store.get(),a=restoreFromSave(s);if(!valid(s,a)||a.phase!=='ringing')return false;
 a.audio=createGestureAudio(); // iOS user gesture.
 ctx.store.update(state=>{
  const marker=state.story55.lockedCall;
  const position=scene55(state,a.node);
  if(marker&&position.index>marker.startIndex){
   // Interrupted calls restart from the opening ring; do not duplicate
   // any line already played before browser reload.
   for(const list of Object.values(state.content.conversations||{}))for(const chat of list){
    chat.messages=(chat.messages||[]).filter(m=>{
     const prefix='s55-'+a.node+'-';
     const tail=String(m.id||'').startsWith(prefix)?Number(String(m.id).slice(prefix.length)):NaN;
     return !Number.isInteger(tail)||tail<=marker.startIndex;
    });
   }
   position.index=marker.startIndex;position.accepted=false;
  }
  advanceScene55(state,a.node,{acceptCall:true});
 });
 a.phase='connected';ctx.refresh();void playScript(ctx,a);
 return true;
}
export function retryScriptedCall(ctx){
 const a=active;if(!valid(ctx.store.get(),a)||a.phase!=='error'||a.running)return false;
 a.audio??=createGestureAudio();a.error='';a.phase='connected';ctx.refresh();void playScript(ctx,a);return true;
}
export function scriptedCallView(s){
 const a=restoreFromSave(s);
 if(!valid(s,a))return '<section class="tai-call-screen s55-locked-call">当前没有预设电话</section>';
 const ringing=a.phase==='ringing',failure=a.phase==='error',done=a.phase==='ended';
 const buttons=ringing?'<button type="button" data-action="s55-call-answer" class="s55-call-answer">☎ 接听</button>':
 failure?'<button type="button" data-action="s55-call-retry" class="s55-call-retry">重试播放</button><button type="button" data-action="s55-call-settings" class="s55-call-settings">设置 MiniMax</button>':
 '<p class="s55-call-uninterruptible">剧情电话自动播放中 · 不可中途挂断</p>';
 return '<section class="tai-call-screen s55-locked-call" aria-label="固定剧情电话">'+
 '<div class="tai-call-ambient" aria-hidden="true"></div><div class="s55-call-top">NOAPP · '+(ringing?'来电中':failure?'播放暂停':done?'已结束':'通话中')+'</div>'+
 '<div class="tai-call-identity"><img class="tai-call-avatar" src="'+esc(s.characterAvatars?.['熙泰']||TAI_PORTRAIT)+'" alt="陈熙泰"><h1>'+(completed(s,'recognition')?'陈熙泰':'未知号码')+'</h1><p>'+(ringing?'邀请你语音通话':'已接通 · 剧情通话')+'</p></div>'+
 '<div class="s55-call-subtitles" aria-live="polite"><small>'+esc(a.speaker)+'</small><p>'+esc(a.caption||'接听后自动播放预设对白')+'</p>'+(failure?'<em>'+esc(a.error)+'</em>':'')+'</div>'+
 '<div class="s55-call-bottom">'+buttons+'</div></section>';
}
