import test from 'node:test';
import assert from 'node:assert/strict';
import {extractTaiCuriosities,taiCuriosityPrompt} from '../src/services/ai/curiosity-memory-v9.js';
const messages=[
 {id:'1',from:'me',day:2,text:'我在改一个新工具',actual:true},
 {id:'2',from:'tai',day:3,text:'我刚健身完',actual:true},
 {id:'3',from:'me',day:4,text:'我哥熙旺说周末见',actual:true},
 {id:'4',from:'me',day:5,text:'测试部署成功了',actual:false},
 {id:'5',from:'me',day:8,text:'以后再说国际象棋',actual:true},
 {id:'6',from:'me',day:3,text:'[游戏系统事件：代码]',actual:true},
];
test('curiosity extracts only player-authored visible facts and respects day',()=>{
 const a=extractTaiCuriosities(messages,{day:4});
 assert.deepEqual(a.map(x=>x.topic),['family','technical']);
 assert.equal(a[1].sourceId,'1');
 assert.doesNotMatch(JSON.stringify(a),/健身|部署成功|游戏系统事件/);
});
test('no future knowledge and no invented current activity',()=>{
 const a=extractTaiCuriosities(messages,{day:8});
 assert.ok(a.every(x=>x.topic!=='chess'));
 assert.equal(a[0].topic,'family');
 const p=taiCuriosityPrompt(a,{day:8});
 assert.match(p,/不是熙蒙此刻正在做的事/);
 assert.match(p,/不主动报备自己的行程/);
 assert.equal(taiCuriosityPrompt(a,{day:1}),'');
});
test('private and deleted messages excluded',()=>{
 const a=extractTaiCuriosities([{from:'me',day:2,text:'改代码',deleted:true},{from:'me',day:2,text:'和熙旺见面',channel:'wechat'}],{day:3,channel:'noapp'});
 assert.equal(a.length,0);
});

test('chess is not a persistent follow-up trigger even after it is mentioned',()=>{
 const a=extractTaiCuriosities([{id:'c1',from:'me',day:3,text:'国际象棋那局结束了',actual:true}],{day:15});
 assert.deepEqual(a,[]);
});
