import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {taiExistingCallReply} from '../src/services/ai/call-intent.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {xitaiRelationshipContext} from '../src/services/ai/relationship-context.js';
import {findMoment} from '../src/apps/wechat/features/moments/model.js';

test('all generated dialogue channels emit traditional Chinese, including speech direction',()=>{
 for(const channel of ['noapp','mirage','chess','call']){
  const [reply]=unpackTaiReply({messages:[{text:'头发剪短了，晚点给你打电话。',mode:'voice',speech_text:'头发剪短了，晚点给你打电话。'}]},channel);
  assert.match(reply.text,/頭髮剪短了，晚點給你打電話/);
  if(reply.speechText)assert.match(reply.speechText,/頭髮剪短了，晚點給你打電話/);
 }
});
test('current call overrides historical call; no duplicate call or unrelated memory',()=>{
 const s=initialState();s.day=64;s.clock='20:18';
 const c=s.content.conversations.noapp.find(c=>c.id==='tai');
 c.messages=[{id:'call-old',kind:'call',from:'tai',text:'语音通话',transcript:'熙蒙：我在孤兒院。',callStatus:'ended',day:64,time:'16:40',actual:true},{id:'why',kind:'text',from:'me',text:'为什么',day:64,time:'20:18',actual:true}];
 assert.doesNotMatch(xitaiRelationshipContext(s,{callActive:true}),/孤兒院|当前没有正在进行的电话/);
 assert.match(buildTaiPrompt({day:64,channel:'noapp',recognized:true,callActive:true}),/電話尚未結束/);
 assert.equal(taiExistingCallReply('给我打电话吧','connected'),'我還沒掛電話，回來說。');
 assert.equal(taiExistingCallReply('给我打电话吧','ended'),'');
 c.messages.push({id:'recall',kind:'text',from:'me',text:'还记得下午孤儿院吗',day:64,time:'20:18',actual:true});
 assert.match(xitaiRelationshipContext(s),/D64 16:40/);
});
test('D44 fish moment exact text, comments and like, including legacy edited snapshot',()=>{
 const s=initialState();s.day=44;
 const expected={text:'我讨厌西湖醋鱼。',comments:[{by:'胡枫',text:'我也讨厌西湖醋鱼'},{by:'仔仔',text:'+1'}],likes:['熙旺']};
 const check=()=>{const p=findMoment(s,'xm-d44');for(const key of Object.keys(expected))assert.deepEqual(p[key],expected[key]);assert.match(p.publishedAt,/2025-07-01T13:08/);};
 check();
 const old={...findMoment(s,'xm-d44'),text:'西湖醋鱼吃完了。下次别点。',comments:[{by:'胡枫',text:'我就说你不爱吃'},{by:'熙旺',text:'回去给你买烧腊'}],likes:[]};
 s.content.moments={...(s.content.moments||{}),editedPosts:{'xm-d44':old}};
 check();
});
