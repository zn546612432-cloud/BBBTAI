import {esc} from '../../../../system/ui.js';
import {story55Config,nodeStatus,completed} from '../../../../services/story55/state.js';
// UI-only state. Changing a selected point never changes the story clock.
const selectedByArea=new Map();
export function selectStory55Pin(button){
 const root=button?.closest?.('.s55-map');if(!root)return false;
 const id=button.dataset.id,area=root.dataset.mapArea;
 if(!id||!root.querySelector('[data-map-detail="'+id+'"]'))return false;
 selectedByArea.set(area,id);
 root.querySelectorAll('[data-action="s55-map-pin"]').forEach(el=>{
  const active=el.dataset.id===id;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));
 });
 root.querySelectorAll('[data-map-detail]').forEach(panel=>panel.hidden=panel.dataset.mapDetail!==id);
 const tip=root.querySelector('.s55-map-placeholder');if(tip)tip.hidden=true;
 return true;
}
export function story55Map(s,loc={}){
 const c=story55Config(s),routePlace=c.locations.find(p=>p.id===loc.params?.id);
 const area=loc.params?.area||routePlace?.area||'MACAU';
 const pins=c.locations.filter(p=>p.area===area&&['ready','done'].includes(nodeStatus(s,p.node).state));
 const selected=pins.find(p=>p.id===(routePlace?.id||selectedByArea.get(area)));
 return '<div class="s55 s55-map" data-map-area="'+esc(area)+'"><nav><b>'+(area==='MACAU'?'澳门':'世界')+' / 离线地图</b><button data-action="s55-map-area" data-area="'+(area==='MACAU'?'WORLD':'MACAU')+'">'+(area==='MACAU'?'切换世界地图':'切换澳门地图')+'</button></nav>'+
 '<div class="s55-map-surface" role="group" aria-label="剧情地点示意图"><svg viewBox="0 0 400 420" preserveAspectRatio="none"><path class="land" d="M20 10 280 15 335 70 290 140 330 210 250 280 240 390 15 390Z"/><path class="road" d="M40 65 270 310M20 190 320 110M50 350 285 45M15 270 290 270M150 10 180 390"/></svg>'+
 pins.map(pin=>'<button type="button" class="s55-pin '+(selected?.id===pin.id?'selected':'')+'" style="left:'+pin.x+'%;top:'+pin.y+'%" data-action="s55-map-pin" data-id="'+esc(pin.id)+'" aria-pressed="'+String(selected?.id===pin.id)+'"><i></i><span>'+esc(pin.name)+'</span></button>').join('')+
 '<span class="s55-map-scale">剧情地点 / 位置示意</span></div>'+
 '<p class="s55-muted s55-map-placeholder"'+(selected?' hidden':'')+'>点击地点查看资料</p>'+
 pins.map(pin=>'<article class="s55-card s55-place-panel" data-map-detail="'+esc(pin.id)+'"'+(selected?.id===pin.id?'':' hidden')+'>'+
 '<small>'+esc(pin.area)+'</small><h2>'+esc(pin.name)+'</h2><p>'+esc(pin.description)+'</p>'+
 (pin.id==='uk'?'<button class="s55-button" data-action="s55-read-map" data-id="uk">'+(completed(s,'uk')?'资料已关联':'关联文件位置')+'</button>'+
  (completed(s,'uk')?'<button class="s55-button" data-action="s55-node" data-node="harvard">查看关联网页</button>':''):'')+
 '</article>').join('')+'</div>';
}
