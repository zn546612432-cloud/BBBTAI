import {impact} from '../../system/feedback/index.js';

let audio=null;
const loadedAt=Date.now(),pending=new WeakSet();
// Called only from the existing chess controls during a user gesture.
export function unlockChessAudio(){
 try{
  const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Audio)return;
  audio??=new Audio();
  if(audio.state==='suspended')void audio.resume().catch(()=>{});
 }catch{}
}
function sound(kind){
 if(!audio||audio.state!=='running')return;
 try{
  const notes=kind==='capture'?[180,105]:kind==='win'?[330,440,550]:kind==='draw'?[294,330]:[196,147];
  notes.forEach((frequency,index)=>{
   const start=audio.currentTime+index*.065,osc=audio.createOscillator(),gain=audio.createGain();
   osc.type='sine';osc.frequency.value=frequency;
   gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+.085);
   osc.connect(gain);gain.connect(audio.destination);osc.start(start);osc.stop(start+.095);
  });
 }catch{}
}
function visual(root,event){
 const frame=root.querySelector('.board-frame');
 if(!frame)return;
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const effect=document.createElement('span');effect.className='chess-feedback chess-feedback-'+event.kind;effect.setAttribute('aria-hidden','true');
 if(event.kind==='capture'){
  const square=root.querySelector(`[data-square="${event.square}"]`);
  if(!square)return;
  const img=square.querySelector('img');
  if(img){const ghost=img.cloneNode();ghost.src=img.src.replace(/[^/]+\.png$/,event.color+event.piece.toUpperCase()+'.png');effect.append(ghost);}
  square.append(effect);
 }else frame.append(effect);
 root.dataset.feedback=event.kind;
 impact(event.kind==='loss'?'cancel':'success');sound(event.kind);
 const frames=reduced?[{opacity:.7},{opacity:0}]:event.kind==='capture'
  ?[{opacity:1,transform:'scale(1)'},{opacity:.6,transform:'scale(1.15)',offset:.3},{opacity:0,transform:'scale(.65)'}]
  :[{opacity:0},{opacity:1,offset:.2},{opacity:0}];
 if(typeof effect.animate==='function'){
  const animation=effect.animate(frames,{duration:reduced?160:event.kind==='capture'?430:720,easing:'ease-out'});
  animation.onfinish=()=>{effect.remove();delete root.dataset.feedback;};
 }else{effect.remove();delete root.dataset.feedback;}
}
// App rendering schedules feedback after the shell patches the DOM. Consume
// before playing so re-render/refresh/reopen cannot repeat sound or animation.
export function scheduleChessFeedback(store,id){
 if(!globalThis.document||!globalThis.requestAnimationFrame||pending.has(store))return;
 const match=store.get().matches.find(m=>m.id===id);
 if(!match?.feedbackEvents?.some(x=>!x.consumed))return;
 pending.add(store);
 requestAnimationFrame(()=>{
  pending.delete(store);
  const state=store.get(),nav=state.nav?.current;
  if(!state.unlocked||document.visibilityState==='hidden'||nav?.appId!=='chess'||nav.route!=='/match/'+id)return;
  const events=state.matches.find(m=>m.id===id)?.feedbackEvents?.filter(x=>!x.consumed)||[];
  if(!events.length)return;
  store.update(s=>{for(const event of s.matches.find(m=>m.id===id)?.feedbackEvents||[])event.consumed=true;});
  const root=[...document.querySelectorAll('.match-view[data-match-id]')].find(el=>el.dataset.matchId===id);
  if(!root)return;
  for(const event of events){
   if(event.createdAt<loadedAt||Date.now()-event.createdAt>4000)continue;
   visual(root,event);
  }
 });
}
