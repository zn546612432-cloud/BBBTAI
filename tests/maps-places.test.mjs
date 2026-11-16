import test from 'node:test';
import assert from 'node:assert/strict';
import {MAP_PLACES,locationById,visiblePlaces,searchPlaces,mapPlaceLink} from '../src/apps/maps/data/places.js';
import {OFFLINE_MACAU} from '../src/apps/maps/data/offline-macau.js';
import {D29_IP} from '../src/story/d29/definition.js';

test('orphanage is on Macau land and fictional place descriptions are hidden',()=>{
 const {lat:y,lng:x}=locationById('orphanage');
 const inside=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [a,b]=ring[i],[c,d]=ring[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;}return hit;};
 assert.ok(OFFLINE_MACAU.features.some(f=>f.properties.kind==='land'&&f.geometry.coordinates.some(p=>inside(p[0]))));
 assert.ok(MAP_PLACES.filter(p=>p.kind==='fictional').every(p=>!p.description));
});

test('fictional Macau anchors are marked as fictional',()=>{
 for(const p of MAP_PLACES.filter(x=>x.kind==='fictional'&&x.area==='MACAU')){
  assert.ok(p.lat>=22.1&&p.lat<=22.23);
  assert.ok(p.lng>=113.48&&p.lng<=113.6);
  assert.ok(p.revealNode||p.revealDay);
 }
});
test('Lisbon villa is an exact local lookup regardless of day, save version or notes',()=>{
 const states=[{day:1,story55:{version:1,completed:{}},content:{notes:[]}},
  {day:28,story55:{version:1,completed:{}},content:{notes:[]}},
  {day:29,story55:{version:1,completed:{}},content:{notes:[]}},
  {day:29,story55:{version:1,completed:{}},content:{notes:[{id:'s55-d29-ip',text:D29_IP}]}},
  {day:35,story55:{version:1,completed:{}},content:{notes:[{id:'s55-d29-ip',text:'203.0.113.29'}]}},
  {day:1}];
 for(const state of states){
  const before=structuredClone(state),places=visiblePlaces(state);
  const villa=searchPlaces(' '+D29_IP+' ',places)[0];
  assert.equal(villa.id,'lisbon-villa');
  assert.equal(villa.name,'葡萄牙・里斯本・銀潮別墅');
  assert.equal(villa.kind,'fictional');
  assert.equal(villa.area,'LISBON');
  for(const query of ['195.22','195.22.28.199','里斯本','銀潮別墅','203.0.113.29'])assert.deepEqual(searchPlaces(query,places),[]);
  assert.deepEqual(state,before);
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
