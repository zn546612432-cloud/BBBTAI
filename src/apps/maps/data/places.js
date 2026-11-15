/**
 * Fictional locations are NOT surveyed addresses. lat/lng are presentation
 * anchors on a real Macau basemap, never proof of a real building's location.
 * Real place coordinates use WGS84, the same coordinate system as Leaflet/OSM.
 * Canonical story status remains in story55.config and story55.completed.
 */
export const MAP_SCHEMA_VERSION=1;
export const MAP_PLACES=Object.freeze([
 {id:'macau',name:'澳门半岛',kind:'real',area:'MACAU',lat:22.19875,lng:113.54387,description:'澳门历史城区',aliases:['澳门']},
 {id:'taipa',name:'氹仔',kind:'real',area:'MACAU',lat:22.1577,lng:113.5583,description:'氹仔城区',aliases:[]},
 {id:'coloane',name:'路环',kind:'real',area:'MACAU',lat:22.1182,lng:113.5602,description:'路环村',aliases:[]},
 {id:'changning',name:'昌宁公寓',kind:'fictional',area:'MACAU',lat:22.1964,lng:113.5393,description:'',aliases:['昌寧公寓'],revealDay:1},
 {id:'orphanage',name:'旧孤儿院',kind:'fictional',area:'MACAU',lat:22.2035,lng:113.545,description:'',aliases:['舊孤兒院'],revealDay:1,storyLocationId:'orphanage'},
 {id:'base',name:'废弃大屋',kind:'fictional',area:'MACAU',lat:22.2021,lng:113.5374,description:'',aliases:['训练屋','Training House'],revealNode:'move',storyLocationId:'base'},
 {id:'bank',name:'金辉资金中心',kind:'fictional',area:'MACAU',lat:22.1895,lng:113.5486,description:'',aliases:['Funds Centre','澳兴大厦'],revealNode:'show',storyLocationId:'bank'}
]);
export const locationById=id=>MAP_PLACES.find(p=>p.id===id)||null;
/** Only known places appear. Search cannot leak future plot locations. */
export function visiblePlaces(s){
 if(!s?.story55||s.story55.version!==1)return MAP_PLACES.filter(p=>p.kind==='real'||p.revealDay===1);
 const done=s.story55.completed||{};
 return MAP_PLACES.filter(p=>{
  if(p.kind==='real')return true;
  if(p.revealNode)return Object.hasOwn(done,p.revealNode);
  return Number(s.day||1)>=Number(p.revealDay||1);
 });
}
export function searchPlaces(query,places){
 const needle=String(query||'').trim().toLocaleLowerCase();
 if(!needle)return [];
 return places.filter(p=>[p.name,p.description,...(p.aliases||[])].some(x=>String(x).toLocaleLowerCase().includes(needle)));
}
/** Existing PhoneRouter understands this object; no URL navigation required. */
export const mapPlaceLink=id=>({appId:'maps',route:'/',params:{id:String(id)}});
