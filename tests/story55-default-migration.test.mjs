import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {allMoments,addMoment} from '../src/apps/wechat/features/moments/model.js';

test('ordinary browser URL starts directly in 55-day D01 and migrates only historical WeChat',()=>{
 const program=`
  globalThis.window={};
  globalThis.location={search:''};
  const {PhoneStore,KEY}=await import('./src/services/storage.js');
  const storage=new Map([['ximeng-phone-v2',JSON.stringify({content:{conversations:{wechat:[{id:'group',name:'狼崽团',messages:[
    {id:'history',from:'wang',text:'换手机啦',sentDate:'2024-03-10',time:'09:00'},
    {id:'old-plot',from:'wang',text:'旧90天事件',sentDate:'2025-05-19',time:'12:00'}
  ]}]}}})]]);
  const store=new PhoneStore({getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)});
  const s=store.get(),group=s.content.conversations.wechat.find(c=>c.id==='group');
  if(KEY!=='ximeng-phone-story55-v1'||s.day!==1||s.story55?.config.totalDays!==55||!group.messages.some(m=>m.id==='history')||group.messages.some(m=>m.id==='old-plot'))
   throw Error('browser migration failed');
  console.log('55-day default with historical WeChat only');
 `;
 const r=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:process.cwd(),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);
 assert.match(r.stdout,/55-day default/);
});
test('55-day run restores authored D01–D55 Moments but excludes future D56–D90 posts',()=>{
 const s=initialState();activateStory55(s);
 assert.ok(allMoments(s).some(p=>p.id==='xw-0519'));
  assert.ok(allMoments(s).every(p=>p.storyDay<=55));
 addMoment(s,10);
 assert.ok(allMoments(s).length>1);
 assert.equal(allMoments(s).find(p=>p.id.startsWith('moment-editor-')).storyDay,10);
});
test('55-day preview cannot load or overwrite the production phone',()=>{
 const program=`
  globalThis.window={};globalThis.location={pathname:'/BBBTAI/preview/',search:''};
  globalThis.document={querySelector:()=>({content:'true'})};
  const {KEY}=await import('./src/services/storage.js');
  if(KEY!=='ximeng-phone-story55-preview-v1')throw Error('preview shares production save');
 `;
 const r=spawnSync(process.execPath,['--input-type=module','-e',program],{cwd:process.cwd(),encoding:'utf8'});
 assert.equal(r.status,0,r.stderr||r.stdout);
});
