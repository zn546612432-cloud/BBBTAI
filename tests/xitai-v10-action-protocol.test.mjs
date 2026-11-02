import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTaiAction,taiActionDecisionPrompt,taiActionExpressionPrompt} from '../src/services/ai/action-protocol-v10.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';

const choose=(action,opts={})=>validateTaiAction({schema_version:10,source_message_id:'u1',action,
 strategy:'tease',intensity:'medium',tone:'playful',vocal_cue:'small_laugh',intent:'想问问熙蒙'},{
 mode:'text',channel:'noapp',recognized:true,sourceMessageId:'u1',...opts
});

test('v10 covers six text decisions and three distinct in-call decisions',()=>{
 for(const a of ['send_text','send_voice','start_call','read_no_reply','defer_reply','end_session'])assert.equal(choose(a).ok,true,a);
 for(const a of ['speak','hang_up','listen']){
  const v=validateTaiAction({schema_version:10,action:a,source_message_id:'x'}, {mode:'call',callConnected:true,sourceMessageId:'x',hasIncoming:false});
  assert.equal(v.ok,true,a);
 }
 assert.equal(choose('hang_up').ok,false,'hanging up cannot be a text-channel action');
 assert.equal(validateTaiAction({schema_version:10,action:'send_voice'}, {mode:'call',callConnected:true}).ok,false);
});

test('all unauthorized actions are downgraded or rejected rather than blindly executed',()=>{
 assert.equal(choose('start_call',{recognized:false}).decision.action,'send_text');
 assert.equal(choose('start_call',{playerDeclinedCall:true}).decision.action,'send_text');
 assert.equal(choose('send_voice',{allowVoice:false}).decision.action,'send_text');
 assert.equal(choose('defer_reply',{allowDefer:false}).decision.action,'send_text');
 assert.equal(choose('read_no_reply',{hasIncoming:false}).decision.action,'end_session');
 assert.equal(choose('start_call',{channel:'mirage'}).decision.action,'send_text');
 assert.equal(choose('send_text',{sourceMessageId:'newer'}).reason,'stale_source');
 assert.equal(validateTaiAction({schema_version:10,action:'speak'}, {mode:'call',callConnected:false}).ok,false);
 assert.equal(validateTaiAction({schema_version:10,action:'listen'}, {mode:'call',callConnected:true,hasIncoming:true}).ok,false);
 assert.equal(choose('transfer_money').ok,false);
 assert.equal(choose('delete_memories').ok,false);
});

test('deferral has safe limits, structured tone/cue have allowlists',()=>{
 const a=validateTaiAction({schema_version:10,action:'defer_reply',source_message_id:'u1',delay_seconds:999999,
 tone:'loud_fake',vocal_cue:'(screaming)',strategy:'illegal'}, {sourceMessageId:'u1',recognized:true});
 assert.equal(a.decision.delay_seconds,3600);
 assert.equal(a.decision.tone,'neutral');
 assert.equal(a.decision.vocal_cue,'none');
 assert.equal(a.decision.strategy,'answer_directly');
 assert.equal(choose('defer_reply').decision.delay_seconds,90);
});

test('decision prompt has JSON-only actions while expression prompt has no (phone) commands',()=>{
 const p=taiActionDecisionPrompt({day:37,recognized:true,channel:'noapp',sourceMessageId:'u1'});
 assert.match(p,/read_no_reply/);assert.match(p,/defer_reply/);assert.match(p,/start_call/);
 assert.match(p,/情绪 tone/);assert.match(p,/声线提示 vocal_cue/);
 assert.match(p,/棋局只有剧情事件能发起/);
 const a=choose('send_voice').decision;
 const q=buildTaiPrompt({day:37,channel:'noapp',recognized:true,approvedDecision:a,outputMode:'voice'});
 assert.match(q,/v10已批准行为/);
 assert.match(q,/action=send_voice/);
 assert.doesNotMatch(q,/必须返回一项 JSON 消息/,'no legacy call marker when decision approved');
 assert.match(taiActionExpressionPrompt(a),/情绪标签不写入文字/);
});

test('emotion and vocal cues stay in metadata; never become spoken phone tags',()=>{
 const a=unpackTaiReply({text:JSON.stringify({messages:[{text:'你到底改了哪里？',mode:'voice',tone:'playful',vocal_cue:'small_laugh'}]})},'call');
 assert.equal(a.length,1);assert.equal(a[0].tone,'playful');assert.equal(a[0].vocalCue,'small_laugh');
 assert.equal(a[0].text,'你到底改了哪里？');
 assert.doesNotMatch(a[0].text,/small_laugh|playful|emotion|vocal_cue/);
});
