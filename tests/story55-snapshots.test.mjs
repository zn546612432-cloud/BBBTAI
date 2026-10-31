import test from 'node:test';
import assert from 'node:assert/strict';
import {
 storySourceVersion,listTestSnapshots,saveTestSnapshot,
 getTestSnapshot,restoreTestSnapshot,deleteTestSnapshot
} from '../src/services/story55/test-snapshots.js';

function memoryStorage(){
 const data=new Map();
 return {getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,String(v));},removeItem:k=>data.delete(k)};
}
function state(day=12){
 return {version:2,day,clock:'20:00',
  story55:{version:1,config:{nodes:[{id:'intro',day:1}],totalDays:55}},
  storyPresets:{rules:[{id:'daily-1',text:'你好'}]},
  content:{conversations:{wechat:[{id:'group',messages:[{id:'2024-chat',text:'换新手机了',storyImported:true,sentDate:'2024-03-10'}]}]}},
  events:[]
 };
}
test('test snapshots survive day resets and keep the immutable original',()=>{
 const storage=memoryStorage(),start=state(45);
 const first=saveTestSnapshot(storage,start,'D45 test');
 start.day=12;start.story55.config.nodes[0].day=3;
 assert.equal(getTestSnapshot(storage,first.id).state.day,45);
 assert.equal(getTestSnapshot(storage,first.id).state.story55.config.nodes[0].day,1);
 assert.equal(listTestSnapshots(storage)[0].sourceVersion,first.sourceVersion);
});
test('same story version restores and backs up prior run first',()=>{
 const storage=memoryStorage(),current=state(45),saved=saveTestSnapshot(storage,current,'D45');
 const store={storage,get:()=>current,replace:s=>{current=s;}};
 current.day=12;
 restoreTestSnapshot(store,saved.id);
 assert.equal(current.day,45);
 assert.equal(listTestSnapshots(storage).length,2);
 assert.equal(listTestSnapshots(storage)[0].day,12);
});
test('different story versions refuse silent restore and preserve both versions',()=>{
 const storage=memoryStorage(),current=state(45),saved=saveTestSnapshot(storage,current,'original');
 current.story55.config.nodes[0].day=2;
 const version=storySourceVersion(current);
 const store={storage,get:()=>current,replace:s=>{current=s;}};
 assert.throws(()=>restoreTestSnapshot(store,saved.id),/剧情版本不同/);
 assert.equal(storySourceVersion(current),version);
 assert.equal(listTestSnapshots(storage).length,1);
 const result=restoreTestSnapshot(store,saved.id,{allowDifferentVersion:true});
 assert.equal(result.versionChanged,true);
 assert.equal(storySourceVersion(current),saved.sourceVersion);
 assert.equal(listTestSnapshots(storage).length,2);
 assert.equal(getTestSnapshot(storage,listTestSnapshots(storage)[0].id).state.story55.config.nodes[0].day,2);
});
test('delete snapshot deletes only the selected stored item',()=>{
 const storage=memoryStorage(),a=saveTestSnapshot(storage,state(12)),b=saveTestSnapshot(storage,state(45));
 assert.equal(deleteTestSnapshot(storage,a.id),true);
 assert.equal(listTestSnapshots(storage).length,1);
 assert.equal(getTestSnapshot(storage,b.id).state.day,45);
 assert.throws(()=>getTestSnapshot(storage,a.id),/找不到/);
});
test('storage quota failure aborts without publishing an index entry',()=>{
 const storage=memoryStorage();
 storage.setItem=()=>{throw Error('quota');};
 assert.throws(()=>saveTestSnapshot(storage,state(45)),/保存失败/);
 assert.equal(listTestSnapshots(storage).length,0);
});
