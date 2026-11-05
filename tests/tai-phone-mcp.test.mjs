import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_MCP_CHANNELS,listTaiPhoneTools,callTaiPhoneTool,taiPhoneAccessGranted} from '../src/services/ai/phone-mcp/index.js';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';
import {shouldTaiInvestigatePhone} from '../src/services/ai/phone-mcp/curiosity.js';
const fixture=()=>({
 day:3,clock:'09:30',calendar:{anchorDay:1,anchorDate:'2025-05-19'},
 unlocked:true,powerMode:'idle',poweredOff:false,events:[],
 aiDraft:{phoneMcp:{developerEnabled:true,observations:[]}},
 content:{
  conversations:{
   wechat:[{id:'wang',name:'熙旺',messages:[
    {id:'past-wang',from:'wang',text:'熙旺说：熙蒙，今晚吃饭吗',day:2,sentDate:'2025-05-20',time:'08:00',actual:true},
    {id:'today-wang',from:'wang',text:'别忘了熙旺昨天说的话',day:3,sentDate:'2025-05-21',time:'09:20',actual:true},
    {id:'later-today',from:'wang',text:'未来十点会议',day:3,sentDate:'2025-05-21',time:'10:00',actual:true},
    {id:'undelivered',from:'wang',text:'未来剧情，不能提前获知',day:3,sentDate:'2025-05-21',time:'07:00',schedule:{mode:'game-time',day:3,clock:'07:00'}},
    {id:'future-day',from:'wang',text:'未来日程绝密',day:4,sentDate:'2025-05-22',time:'08:00',actual:true},
    {id:'deleted',from:'wang',text:'已删除隐私',day:2,time:'08:00',deleted:true},
    {id:'demo',from:'wang',text:'演示语句',day:2,time:'08:00',demo:true},
    {id:'draft',from:'wang',text:'内部草稿',day:2,time:'08:00',draft:true}
   ]}],
   messages:[],mirage:[],noapp:[{id:'tai',name:'熙泰',messages:[{id:'private',from:'me',text:'我在想你',day:2,time:'12:00',sentDate:'2025-05-20'}]}],
   schedule:[{id:'secret',name:'日程',messages:[{id:'secret',text:'明天剧情'}]}],
  },
  photos:[{id:'photo-1',title:'熙旺和熙蒙合照',description:'熙旺和熙蒙在一起',src:'data:image/png;base64,SECRET_PERSONAL_IMAGE'},
   {id:'photo-future',title:'未来照片',day:11,src:'data:image/jpeg;base64,SECRET'}],
  schedule:{private:'明天会发生大事'},
  story55:{nodes:[{id:'future',secret:'未来剧情'}]},
 }
});
test('phone MCP starts locked, only a positive grant unlocks and not while powered off',()=>{
 const s=fixture();delete s.aiDraft.phoneMcp.developerEnabled;
 assert.equal(taiPhoneAccessGranted(s),false);
 assert.deepEqual(callTaiPhoneTool(s,'search_messages',{query:'熙旺'}),{ok:false,error:'phone_access_locked'});
 s.events.push({type:'tai_phone_access_granted',day:5});
 assert.equal(taiPhoneAccessGranted(s),false);
 s.events.push({type:'tai_phone_access_granted',day:2});
 assert.equal(taiPhoneAccessGranted(s),true);
 s.poweredOff=true;assert.equal(taiPhoneAccessGranted(s),false);
});
test('only allowlisted tools and channels exist; schedule never exposed',()=>{
 const s=fixture();
 assert.deepEqual(PHONE_MCP_CHANNELS,['wechat','messages','mirage','noapp']);
 const names=listTaiPhoneTools().map(x=>x.name);
 assert.equal(names.length,6);
 assert.ok(!names.some(x=>/schedule|diary|calendar|story|日程/.test(x)));
 assert.deepEqual(callTaiPhoneTool(s,'read_conversation',{channel:'schedule',conversation_id:'secret'}),{ok:false,error:'channel_forbidden'});
 assert.equal(callTaiPhoneTool(s,'search_messages',{query:'熙旺',channel:'schedule'}).ok,false);
 assert.equal(callTaiPhoneTool(s,'search_messages',{query:'foo',internal:'content.schedule'}).ok,false);
});
test('actual delivered past chats only; future day, time, scheduled, deleted and demo excluded',()=>{
 const s=fixture();
 const read=callTaiPhoneTool(s,'read_conversation',{channel:'wechat',conversation_id:'wang',limit:12});
 assert.equal(read.ok,true);
 assert.deepEqual(read.data.messages.map(x=>x.id),['past-wang','today-wang']);
 for(const forbidden of ['未来十点会议','未来剧情','未来日程绝密','已删除隐私','演示语句','内部草稿'])
  assert.ok(!JSON.stringify(read).includes(forbidden));
 const find=callTaiPhoneTool(s,'search_messages',{query:'熙旺',channel:'wechat'});
 assert.deepEqual(find.data.results.map(x=>x.id),['past-wang','today-wang']);
});
test('photo metadata only, no base64 image or fabricated image understanding',()=>{
 const s=fixture();
 const all=callTaiPhoneTool(s,'list_photos',{limit:12});
 assert.deepEqual(all.data.photos.map(x=>x.id),['photo-1']);
 const inspected=callTaiPhoneTool(s,'inspect_photo',{photo_id:'photo-1'});
 assert.equal(inspected.data.visual_interpretation,'not_performed');
 assert.equal(inspected.data.description,'熙旺和熙蒙在一起');
 assert.ok(!JSON.stringify(inspected).includes('SECRET_PERSONAL_IMAGE'));
 assert.equal(callTaiPhoneTool(s,'inspect_photo',{photo_id:'photo-future'}).ok,false);
});
test('MCP JSON-RPC initialize, list, call use exactly the same allowlisted executor',()=>{
 const s=fixture();
 const init=dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:1,method:'initialize',params:{}});
 assert.equal(init.result.serverInfo.name,'bbbtai-tai-phone');
 const tools=dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:2,method:'tools/list'});
 assert.equal(tools.result.tools.length,6);
 const result=dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'search_messages',arguments:{query:'熙旺'}}});
 assert.equal(result.result.structuredContent.ok,true);
 assert.ok(!JSON.stringify(result).includes('明天会发生大事'));
 const denied=dispatchTaiPhoneMcp(s,{jsonrpc:'2.0',id:4,method:'tools/call',params:{name:'get_schedule',arguments:{}}});
 assert.equal(denied.result.isError,true);
});
test('sparse curiosity: only relevant topics, 120-minute cooldown, daily cap and active page',()=>{
 const s=fixture();
 assert.equal(shouldTaiInvestigatePhone(s,{text:'hi',random:()=>0}),false);
 assert.equal(shouldTaiInvestigatePhone(s,{text:'熙旺怎么样？',random:()=>0}),true);
 assert.equal(shouldTaiInvestigatePhone(s,{text:'熙旺怎么样？',random:()=>0.99}),false);
 assert.equal(shouldTaiInvestigatePhone(s,{text:'我给你看微信聊天',random:()=>0.99}),true);
 s.aiDraft.phoneMcp.observations.push({day:3,gameMinute:3*1440+9*60,tool:'search_messages'});
 assert.equal(shouldTaiInvestigatePhone(s,{text:'我给你看微信聊天',random:()=>0}),false);
 s.aiDraft.phoneMcp.observations.push({day:3,gameMinute:3*1440+8*60,tool:'read_conversation'});
 assert.equal(shouldTaiInvestigatePhone(s,{text:'照片呢',random:()=>0}),false);
});
test('existing developer and NoApp wiring is importable without any new runtime package',async()=>{
 const {taiPhonePanel}=await import('../src/apps/developer/features/tai-phone/index.js');
 const html=taiPhonePanel(fixture());
 assert.match(html,/熙泰 · 虚拟手机访问工具/);
 assert.match(html,/日程/);
 assert.match(html,/tai-phone-dev-toggle/);
});
