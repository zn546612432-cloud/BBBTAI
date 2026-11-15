import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_PLACES,locationById,visiblePlaces,searchPlaces,mapPlaceLink} from '../src/apps/maps/data/places.js';
import {OFFLINE_MACAU} from '../src/apps/maps/data/offline-macau.js';

test('orphanage is on Macau land and fictional place descriptions are hidden',()=>{
 const {lat:y,lng:x}=locationById('orphanage');
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;};
 assert.ok(OFFLINE_MACAU.features.some(f=>f.properties.kind==='land'&&f.geometry.coordinates.some(p=>inside(p[0]))));
 assert.ok(MAP_PLACES.filter(p=>p.kind==='fictional').every(p=>!p.description));
});

test('fictional Macau anchors are marked as fictional',()=>{
 for(const p of MAP_PLACES.filter(x=>x.kind==='fictional')){
  assert.ok(p.lat>=22.1&&p.lat<=22.23);
  assert.ok(p.lng>=113.48&&p.lng<=113.6);
  assert.ok(p.revealNode||p.revealDay);
 }
});
test('D01 does not leak the future base or operation site',()=>{
 const p=visiblePlaces({day:1,story55:{version:1,completed:{}}});
 assert.ok(p.some(x=>x.id==='changning'));
 assert.ok(p.some(x=>x.id==='orphanage'));
 assert.ok(!p.some(x=>x.id==='base'));
 assert.ok(!p.some(x=>x.id==='bank'));
 assert.equal(searchPlaces('训练屋',p).length,0);
});
test('reveals when the canonical story nodes complete',()=>{
 const p=visiblePlaces({day:41,story55:{version:1,completed:{move:{},show:{}}}});
 assert.ok(p.some(x=>x.id==='base'));
 assert.ok(p.some(x=>x.id==='bank'));
 assert.equal(searchPlaces('澳兴大厦',p)[0].id,'bank');
});
test('deep links use the existing PhoneRouter contract',()=>{
 assert.deepEqual(mapPlaceLink('changning'),{appId:'maps',route:'/',params:{id:'changning'}});
 assert.equal(locationById('bogus'),null);
});
