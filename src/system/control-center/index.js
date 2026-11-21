import {configureAudio,registerAudio} from '../audio/index.js';
import {controlCenter,controlsSettings} from './view.js';
import {patchHTML} from '../dom.js';
export function createControlCenter({store,root,router,music,settings,context,closeShade,lock,blocked}){
 const layer=document.createElement('div');layer.id='control-center-layer';root.append(layer);
 const dim=document.createElement('div');dim.id='phone-brightness';root.append(dim);
 let opened=false,flashlight=false,outputOpen=false,rendered='',audioKey='';
 // A stored playing flag must not invent playback after a page reload.
 if(store.get().musicPlaying&&!music.isPlaying?.())store.update(s=>{s.musicPlaying=false;});
 const sync=()=>{
  const s=store.get(),p=controlsSettings(s),key=JSON.stringify([p.muted,p.volume]);
  if(key!==audioKey){audioKey=key;configureAudio(p);}
  root.querySelectorAll('audio,video').forEach(registerAudio);
  dim.style.opacity=String(1-p.brightness);
  if(blocked())opened=false;
  root.classList.toggle('control-center-open',opened);root.classList.toggle('cc-flashlight',flashlight);
  layer.inert=!opened;layer.setAttribute('aria-hidden',String(!opened));
  const html=controlCenter(s,{flashlight,outputOpen});if(html!==rendered){patchHTML(layer,html);rendered=html;}
  if(opened){root.querySelector('#screen-layer').inert=true;root.querySelector('#status-layer').inert=true;}
 };
 const show=(value=true)=>{if(value&&blocked())return;opened=value;if(value){closeShade();document.activeElement?.blur();}else{root.querySelector('#screen-layer').inert=blocked();root.querySelector('#status-layer').inert=blocked();}sync();};
 const update=change=>store.update(s=>{
  if(change.muted!==undefined)s.silent=change.muted;
  const p=controlsSettings(s);s.deviceControls={...s.deviceControls,volume:change.volume??p.volume,brightness:change.brightness??p.brightness};
 });
 for(const event of ['play','loadedmetadata'])root.addEventListener(event,e=>{if(e.target.matches?.('audio,video'))registerAudio(e.target);},true);
 layer.addEventListener('click',e=>{
  const target=e.target.closest('[data-cc]');if(!target)return;e.stopPropagation();
  const action=target.dataset.cc;
  if(action.startsWith('toggle-'))return settings.handle('settings-toggle',{dataset:{key:action.slice(7)}},context());
  if(action==='output'){outputOpen=!outputOpen;sync();return;}
  if(action==='dismiss')return show(false);
  if(action==='mute')return update({muted:!controlsSettings(store.get()).muted});
  if(action==='torch'){flashlight=!flashlight;sync();return;}
  if(['play','restart','previous','next'].includes(action)){music.handle(action==='play'?'music-toggle':'music-'+action,target,context());return;}
  show(false);
  if(action==='lock'){lock();return;}
  if(!store.get().unlocked)return;
  router.open({appId:action==='battery'?'settings':action,route:action==='battery'?'/battery':'/',params:{}});
 });
 layer.addEventListener('input',e=>{
  const name=e.target.dataset.ccSlider;if(!name)return;e.stopPropagation();
  const value=Number(e.target.value)/100;
  update(name==='volume'?{volume:value,muted:value===0}:{brightness:value});
 });
 document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();show(false);}},{capture:true});
 sync();
 return {sync,show,get opened(){return opened;},gesture:({progress,settle})=>{if(settle)show(progress===1);else if(progress>0&&!opened)show(true);}};
}
