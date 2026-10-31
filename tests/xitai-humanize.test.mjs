import test from 'node:test';
import assert from 'node:assert/strict';
import {humanizeTaiText,taiTopicGate,taiHumanPrompt,callBridgeNote} from '../src/services/ai/humanize.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {buildTaiPrompt} from '../src/services/ai/tai-profile.js';
import {xitaiRelationshipContext} from '../src/services/ai/relationship-context.js';
import {initialState} from '../src/services/storage.js';

test('破折号一律清掉，语音标签保留给语音',()=>{
 assert.equal(humanizeTaiText('你听人说话，挑得比我狠——可一旦真听进去了'),'你听人说话，挑得比我狠，可一旦真听进去了');
 assert.doesNotMatch(humanizeTaiText('三个人围着锅—谁先当真谁倒霉——'),/[—–－]/);
 assert.equal(humanizeTaiText('（笑）行啊*低头*'),'行啊');
 assert.match(humanizeTaiText('好吧(breath)那就这样',{stripStage:false}),/\(breath\)/);
});
test('unpackTaiReply 输出没有破折号',()=>{
 const out=unpackTaiReply({text:JSON.stringify({messages:[{text:'刚在看书——没什么',mode:'text',tone:'dry'},{text:'行吧',mode:'text'}]})},'noapp');
 assert.equal(out.length,2);
 for(const m of out)assert.doesNotMatch(m.text,/[—–－]/);
});
test('话题闸门：对方没提就禁止主动聊莎士比亚、象棋和代码',()=>{
 const quiet=taiTopicGate([{role:'user',content:'给我发语音，我想听。'}]);
 assert.match(quiet,/莎士比亚/);assert.match(quiet,/国际象棋/);assert.match(quiet,/不要主动提/);
 const open=taiTopicGate([{role:'user',content:'你最近还在读麦克白吗'}]);
 assert.match(open,/熙蒙刚提到了莎士比亚/);
 assert.doesNotMatch(open,/没有提到[^\n]*莎士比亚/);
 assert.match(open,/没有提到国际象棋/);
});
test('提示词带口语规则、禁破折号与样稿，且文字模式不含语音标签说明',()=>{
 const prompt=buildTaiPrompt({day:60,channel:'noapp',outputMode:'text',messages:[{role:'user',content:'在干嘛'}]});
 assert.match(prompt,/活人感口语规则/);
 assert.match(prompt,/绝对不要使用破折号/);
 assert.match(prompt,/刚过隧道/);
 assert.match(prompt,/话题闸门/);
 assert.match(taiHumanPrompt({outputMode:'call'}),/语音和电话里更要像说话/);
});
test('通话记录带内容回到聊天上下文',()=>{
 const s=initialState();s.day=62;s.clock='22:30';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages.push({id:'call1',from:'me',kind:'call',callStatus:'ended',duration:288,text:'语音通话 · 04:48',transcript:'熙蒙：想听你声音\n熙泰：我更想听你说想我了',day:62,time:'22:25',actual:true});
 const ctx=xitaiRelationshipContext(s,{mode:'text'});
 assert.match(ctx,/刚打过的电话/);
 assert.match(ctx,/我更想听你说想我了/);
 assert.equal(callBridgeNote({text:'x'}),'');
 assert.match(callBridgeNote(c.messages.at(-1)),/通话内容/);
});

test('an older call remains dated memory instead of pretending it just ended',()=>{
 const s=initialState();s.day=64;s.clock='22:30';
 const c=s.content.conversations.noapp.find(x=>x.id==='tai');
 c.messages=[];
 c.messages.push({id:'old-call',from:'tai',kind:'call',callStatus:'ended',text:'语音通话 · 01:20',transcript:'熙泰：刚训练完。',day:60,time:'20:00',actual:true});
 const ctx=xitaiRelationshipContext(s);
 assert.doesNotMatch(ctx,/刚打过的电话|刚结束一通语音电话/);
 assert.match(ctx,/D60/);
});

test('system event text must not masquerade as a player technical topic',()=>{
 const gate=taiTopicGate([{role:'user',content:'[游戏系统事件，非熙蒙台词：分享研究进展]'}]);
 assert.doesNotMatch(gate,/熙蒙刚提到了[^\n]*代码和技术/);
});
