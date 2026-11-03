#!/usr/bin/env python3
"""Create a SINGLE standalone HTML file. No CDN, API, service worker, or web server.
The preview is isolated from the save data and deliberately shows all test pins.
"""
import json
from pathlib import Path

def read_module(path,var):
 text=Path(path).read_text(encoding="utf8").strip()
 prefix="export const "+var+" = "
 if not text.startswith(prefix) or not text.endswith(";"):
  raise ValueError(f"Unexpected data module: {path}")
 return json.loads(text[len(prefix):-1])

seed=read_module("src/apps/maps/data/offline-macau.js","OFFLINE_MACAU")
detail=read_module("src/apps/maps/data/offline-macau-detail.js","OFFLINE_DETAILS")
features=seed["features"]+detail["features"]
assert len(features)>5000, "Full offline Macau road/building layers have not been generated yet"
payload=json.dumps({"type":"FeatureCollection","features":features},ensure_ascii=False,separators=(",",":")).replace("</","<\\/")
leaflet=Path("public/vendor/leaflet/leaflet.js").read_text(encoding="utf8").replace("</","<\\/")
css=Path("public/vendor/leaflet/leaflet.css").read_text(encoding="utf8")
html='''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>熙蒙的手机 · 澳门离线地图预览</title>
<style>
'''+css+'''
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;background:#d2e8f5;color:#1c2835}
#map{position:fixed;inset:0;background:#b9d8e9}.leaflet-container{background:#b9d8e9}
header{position:fixed;z-index:900;top:max(15px,env(safe-area-inset-top));left:14px;right:14px;box-shadow:0 3px 20px #263c4b30;border-radius:18px;padding:14px;background:#fffc;backdrop-filter:blur(18px)}
h1{margin:0 0 8px;font-size:17px;letter-spacing:.4px}
#search{border:0;border-radius:10px;padding:12px;background:#f1f3f5;width:100%;outline:none;color:#182430;font-size:15px}
#results{max-height:180px;overflow:auto;margin-top:5px}#results button{width:100%;text-align:left;background:none;border:0;padding:10px;font-size:14px;color:#1574ce}
#status{position:fixed;z-index:900;bottom:max(15px,env(safe-area-inset-bottom));left:14px;right:14px;padding:14px 18px;background:#fffd;border-radius:16px;box-shadow:0 4px 20px #2334;line-height:1.5}
small{font-size:11px;color:#566979}#place{font-size:16px;font-weight:600}#help{font-size:12px}
.p0{border:0;background:none}.p0 span{display:block;width:20px;height:20px;border:4px solid white;border-radius:50%;background:#ed9434;box-shadow:0 2px 10px #0003}
.leaflet-control-attribution{font-size:10px!important}.leaflet-top{top:148px}
</style></head><body>
<div id="map" aria-label="离线澳门真实地图"></div>
<header><h1>澳门 · 离线地图测试</h1><input id="search" placeholder="搜索虚构剧情地点或澳门地区"><div id="results"></div></header>
<div id="status"><div id="place">澳门地图已保存在本文件中</div><small id="help">全程不请求网络 · 可拖动、缩放和搜索 · 剧情地点仅为示意</small></div>
<script>'''+leaflet+'''</script>
<script id="geo" type="application/json">'''+payload+'''</script>
<script>
const data=JSON.parse(document.getElementById('geo').textContent);
const base=[22.187,113.55],map=L.map('map',{preferCanvas:true,scrollWheelZoom:false,zoomControl:true,minZoom:10,maxZoom:18}).setView(base,12);
const ren=L.canvas({padding:.35}),style={
 land:{color:'#c7d7c8',fillColor:'#f1efe9',weight:1,fillOpacity:1},
 water:{color:'#b2d3e3',fillColor:'#a8d5e9',weight:.5,fillOpacity:1},
 park:{color:'#cae8c1',fillColor:'#d4eacb',weight:.5,fillOpacity:1},
 landuse:{color:'#e0e6df',fillColor:'#e6ebe5',weight:.3,fillOpacity:.4},
 building:{color:'#d4d9d4',fillColor:'#dfe2dc',weight:.3,fillOpacity:.85},
 rail:{color:'#8ca49f',weight:2,opacity:.9,dashArray:'3 5'},
 road:{color:'#fff',weight:2.1},
 road_major:{color:'#f9f0cb',weight:4}
};
for(const kind of ['land','water','park','landuse','building','rail','road','road_major']){
 const items=data.features.filter(f=>f.properties.kind===kind);
 if(items.length)L.geoJSON({type:'FeatureCollection',features:items},{renderer:ren,interactive:false,style:()=>style[kind]}).addTo(map);
}
map.attributionControl.addAttribution('<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a>');
const places=[
 {id:'changning',name:'昌宁公寓',xy:[22.1964,113.5393]},
 {id:'orphanage',name:'旧孤儿院',xy:[22.2051,113.5335]},
 {id:'base',name:'废弃大屋',xy:[22.2021,113.5374]},
 {id:'bank',name:'金辉资金中心',xy:[22.1895,113.5486]},
 {id:'macau',name:'澳门半岛',xy:[22.19875,113.54387]},
 {id:'taipa',name:'氹仔',xy:[22.1577,113.5583]},
 {id:'coloane',name:'路环',xy:[22.1182,113.5602]}
];
const markers=new Map();
for(const p of places){
 const icon=L.divIcon({className:'p0',html:'<span></span>',iconSize:[22,22]});
 const m=L.marker(p.xy,{icon}).bindPopup('<b>'+p.name+'</b><div>地图示意锚点；不代表真实门牌地址</div>').addTo(map);
 markers.set(p.id,m);
 m.on('click',()=>document.getElementById('place').textContent=p.name);
}
document.getElementById('search').addEventListener('input',event=>{
 const q=event.target.value.trim().toLowerCase(),list=document.getElementById('results');
 list.replaceChildren();
 if(!q)return;
 for(const p of places.filter(x=>x.name.toLowerCase().includes(q))){
  const b=document.createElement('button');b.textContent=p.name;
  b.onclick=()=>{map.flyTo(p.xy,15,{duration:.6});markers.get(p.id).openPopup();list.replaceChildren();document.getElementById('place').textContent=p.name;};
  list.append(b);
 }
});
</script></body></html>'''
out=Path("preview/ximeng-macau-offline.html");out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html,encoding="utf8")
print(f"Wrote {out}: {out.stat().st_size:,} bytes, {len(features)} features")
