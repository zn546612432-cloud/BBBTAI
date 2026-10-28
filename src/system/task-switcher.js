import {esc} from './ui.js';

export function createTaskSwitcher({router,registry}){
 const items=new Map();let visible=false;
 const layer=()=>document.querySelector('#task-layer');
 let drag=null;
 const begin=(x,y,card,source,id)=>{if(!visible||!card)return;drag={id:card.dataset.task,card,x,y,source,pointerId:id,moved:false,axis:null,scroll:layer().querySelector('.tasks-track')?.scrollLeft||0};};
 const move=(x,y,source,id,prevent=()=>{})=>{
  if(!drag||drag.source!==source||drag.pointerId!==id)return;
  const dx=x-drag.x,dy=y-drag.y;
  if(!drag.axis&&Math.max(Math.abs(dx),Math.abs(dy))>9)drag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
  if(drag.axis==='x'){
   if(source==='pointer'){layer().querySelector('.tasks-track').scrollLeft=drag.scroll-dx;drag.moved=true;prevent();}
   return;
  }
  if(drag.axis==='y'&&dy<0){drag.moved=true;prevent();drag.card.style.transform=`translateY(${Math.max(dy,-260)}px)`;drag.card.style.opacity=String(Math.max(.25,1+dy/260));}
 };
 const end=(x,y,source,id,cancel=false)=>{
  if(!drag||drag.source!==source||drag.pointerId!==id)return;
  const {id:appId,card,moved,axis}=drag,dy=y-drag.y;drag=null;
  card.style.transform='';card.style.opacity='';
  if(!cancel&&axis==='y'&&dy<-70)action('tasks-close',appId);
  if(moved)layer().dataset.suppressClick='1';
 };
 layer().addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'&&'ontouchstart' in window)return;
  if(e.target.closest('header button'))return;
  begin(e.clientX,e.clientY,e.target.closest('.task-card'),'pointer',e.pointerId);
 });
 layer().addEventListener('pointermove',e=>move(e.clientX,e.clientY,'pointer',e.pointerId,()=>{if(!layer().hasPointerCapture(e.pointerId))layer().setPointerCapture(e.pointerId);e.preventDefault();}),{passive:false});
 layer().addEventListener('pointerup',e=>end(e.clientX,e.clientY,'pointer',e.pointerId));
 layer().addEventListener('pointercancel',e=>end(e.clientX,e.clientY,'pointer',e.pointerId,true));
 layer().addEventListener('touchstart',e=>{if(e.touches.length!==1||e.target.closest('header button'))return;const t=e.changedTouches[0];begin(t.clientX,t.clientY,e.target.closest('.task-card'),'touch',t.identifier);},{passive:true});
 layer().addEventListener('touchmove',e=>{if(drag?.source!=='touch')return;const t=[...e.changedTouches].find(t=>t.identifier===drag.pointerId);if(t)move(t.clientX,t.clientY,'touch',t.identifier,()=>{if(e.cancelable)e.preventDefault();});},{passive:false});
 layer().addEventListener('touchend',e=>{const t=[...e.changedTouches].find(t=>t.identifier===drag?.pointerId);if(t)end(t.clientX,t.clientY,'touch',t.identifier);});
 layer().addEventListener('touchcancel',e=>{const t=[...e.changedTouches].find(t=>t.identifier===drag?.pointerId);if(t)end(t.clientX,t.clientY,'touch',t.identifier,true);});
 layer().addEventListener('click',e=>{if(layer().dataset.suppressClick==='1'){e.preventDefault();e.stopPropagation();delete layer().dataset.suppressClick;}},true);
 layer().addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.task-open')){e.preventDefault();action('tasks-open',e.target.dataset.id);}});
 const snapshot=(loc)=>{
  if(!loc||loc.appId==='home')return;
  const node=document.querySelector('#screen-layer .app-view');if(!node)return;
  items.delete(loc.appId);
  items.set(loc.appId,{loc:structuredClone(loc),html:node.outerHTML.replaceAll(/\s+id="[^"]*"/g,'')});
 };
 const hide=()=>{visible=false;layer().innerHTML='';layer().classList.remove('visible');layer().setAttribute('aria-hidden','true');};
 const show=(loc)=>{
  snapshot(loc);visible=true;
  if(loc?.appId&&loc.appId!=='home')router.home();
  const cards=[...items.entries()].reverse();
  const phone=document.querySelector('#phone'),width=phone.clientWidth,height=phone.clientHeight;
  const scale=Math.min(.64,(height*.68)/Math.max(height,1));
  layer().style.setProperty('--task-source-width',`${width}px`);
  layer().style.setProperty('--task-source-height',`${height}px`);
  layer().style.setProperty('--task-scale',String(scale));
  layer().style.setProperty('--task-card-width',`${Math.round(width*scale)}px`);
  layer().style.setProperty('--task-card-height',`${Math.round(height*scale)}px`);
  layer().innerHTML=`<div class="tasks-scrim" data-action="tasks-done"></div><div class="tasks-stage"><div class="tasks-track">${cards.map(([id,item])=>`<section class="task-card" data-task="${esc(id)}"><header><span>${esc(registry.get(id)?.manifest.name||id)}</span><button type="button" data-action="tasks-close" data-id="${esc(id)}" aria-label="关闭${esc(registry.get(id)?.manifest.name||id)}">×</button></header><div class="task-open" role="button" tabindex="0" data-action="tasks-open" data-id="${esc(id)}" aria-label="返回${esc(registry.get(id)?.manifest.name||id)}"><div class="task-card-viewport">${item.html}</div></div></section>`).join('')||'<p class="tasks-empty">没有打开的 App</p>'}</div><button class="tasks-done" data-action="tasks-done">完成</button></div>`;
  layer().classList.add('visible');layer().setAttribute('aria-hidden','false');
  layer().querySelector('.tasks-track')?.lastElementChild?.scrollIntoView?.({block:'nearest',inline:'center'});
 };
 const action=(name,id)=>{
  if(name==='tasks-done'){hide();return true;}
  if(name==='tasks-close'){items.delete(id);const card=layer().querySelector(`[data-task="${CSS.escape(id)}"]`);card?.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(-110%) scale(.78)'}],{duration:280,easing:'ease-out'}).finished.catch(()=>{}).finally(()=>show(null));return true;}
  if(name==='tasks-open'){const item=items.get(id);hide();if(item)router.open(item.loc);return true;}
  return false;
 };
 return {snapshot,show,hide,action,get visible(){return visible;}};
}
