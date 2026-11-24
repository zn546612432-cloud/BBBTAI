import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {planCallSpeech,needsCallContinuation,sameCallMeaning,selectCallSegments,callAnswerGuidance,correctCallYesterdayReference} from '../src/apps/noapp/call-engine-v2.js';
import {taiRelativeDayLabel,taiDatedNoAppQuote,taiCallTimelineInstruction,xitaiRelationshipContext} from '../src/services/ai/relationship-context.js';
import {shouldRecallTaiCall,callBridgeNote} from '../src/services/ai/humanize.js';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';

test('natural or explicit long NoApp speech uses a single complete AI answer, not a quota',()=>{
 const ordinary=planCallSpeech({text:'你為什麼不來澳門？',history:[{role:'user',content:'你為什麼不來澳門？'}]});
 assert.equal(ordinary.minSegments,1);
 assert.ok(ordinary.maxSegments>=2,'the AI can still supply substantial multi-part speech when warranted');
 assert.equal(needsCallContinuation([{text:'現在還不是時候。'}],ordinary),false);
 const explicit=planCallSpeech({text:'多說幾句'});
 assert.equal(explicit.minSegments,1);
 assert.ok(explicit.maxSegments>=3,'explicit request keeps capacity for longer speech');
 const source=readFileSync(fileURLToPath(new URL('../src/apps/noapp/voice-call.js',import.meta.url)),'utf8');
 assert.equal((source.match(/await askTai\(/g)||[]).length,1,'one live call generation, not a second filler generation');
 assert.doesNotMatch(source,/needsCallContinuation\(segments,plan\)/);
 assert.doesNotMatch(source,/expandCallSegments\(entries\)/);
 assert.match(source,/pending=synth\(segments\[i\+1\]\)/,'existing next-clip-overlap remains intact');
 assert.match(source,/!call\.scripted&&!call\.d55Story\)raw=correctCallYesterdayReference/,'scripted dialogue is exempt');
});

test('repeated empty refusals are one idea, but a real reason stays intact',()=>{
 assert.equal(sameCallMeaning('現在還不是時候。','現在不行。'),true);
 assert.equal(sameCallMeaning('現在不行。','現在不行，因為我必須先處理這件事。'),false);
 const result=selectCallSegments([{text:'現在還不是時候。'},
  {text:'現在不行。'},
  {text:'我在英國仍能幫你處理之前談過的安排。'}],{maxSegments:4});
 assert.deepEqual(result.segments.map(r=>r.text),[
  '現在還不是時候。','我在英國仍能幫你處理之前談過的安排。'
 ]);
 assert.deepEqual(result.blocked.map(r=>r.reason),['duplicate']);
});

test('a why-question requests a source-grounded explanation, not filler or invented plans',()=>{
 const prompt=callAnswerGuidance('你為什麼不來澳門？',[
  {role:'assistant',content:'我說可以幫你們辦，英國或者葡萄牙都行。'}
 ]);
 assert.match(prompt,/先正面回應/);
 assert.match(prompt,/追問原因/);
 assert.match(prompt,/不要連發「現在還不是時候」「現在不行」/);
 assert.match(prompt,/前文確實談過外部協助/);
 assert.match(prompt,/不能.*透露|不能透露/);
 assert.equal(callAnswerGuidance('我想睡了'),'', 'ordinary non-questions have no forced explanatory template');
 assert.match(callAnswerGuidance('你吃過飯嗎？'),/普通問題簡潔答就好/);
});

test('yesterday and older NoApp messages retain real game day and clock in relationship context',()=>{
 assert.equal(taiRelativeDayLabel(44,45),'昨天');
 assert.equal(taiRelativeDayLabel(43,45),'前天');
 assert.equal(taiRelativeDayLabel(45,45),'今天');
 assert.equal(taiRelativeDayLabel(46,45),'日期未確認');
 assert.equal(taiDatedNoAppQuote({day:44,time:'23:15',from:'me',text:'這件事你記得嗎？'},45),
  'D44 23:15（昨天） 熙蒙：這件事你記得嗎？');
 assert.match(taiCallTimelineInstruction({day:45,clock:'08:22'},'昨天你說的事情'),/D44 是昨天/);
 assert.match(taiCallTimelineInstruction({day:45,clock:'08:22'},'昨天你說的事情'),/不得擅自變成「剛才」/);

 const s=activateStory55(initialState());
 s.day=45;s.clock='08:22';s.story55.completed.recognition={day:33,clock:'08:00'};
 const chat=s.content.conversations.noapp.find(x=>x.id==='tai');
 chat.messages.push({id:'past-question',from:'me',text:'你會來澳門嗎？',day:44,time:'21:20',kind:'text',actual:true});
 chat.messages.push({id:'past-answer',from:'tai',text:'我還要考慮一下。',day:44,time:'21:22',kind:'text',actual:true});
 const context=xitaiRelationshipContext(s,{mode:'call',topic:'昨天我們談的事呢？'});
 assert.match(context,/D44 21:20（昨天） 熙蒙：你會來澳門嗎？/);
 assert.match(context,/D44 21:22（昨天） 熙泰：我還要考慮一下。/);
 assert.match(context,/目前正在進行的對話中確實剛說/);
});

test('previous-day phone recollection is sourced by the real call date',()=>{
 const record={kind:'call',callStatus:'ended',day:44,time:'22:40',endedBy:'tai',
  transcript:'熙蒙：你能幫我安排嗎？\n熙泰：可以，英國或者葡萄牙都行。'};
 const current={day:45,clock:'08:22'};
 assert.equal(shouldRecallTaiCall(record,current,'昨天電話裡你說可以幫忙'),true);
 assert.equal(shouldRecallTaiCall(record,current,'昨天那個安排還算數嗎？'),true);
 assert.match(callBridgeNote(record,current),/D44 22:40 [發发]生的一通真[實实]語音電話|D44 22:40 发生的一通真实语音电话/);
 assert.doesNotMatch(callBridgeNote(record,current),/剛剛結束的一通/);
 assert.equal(shouldRecallTaiCall(record,current,'今天天氣不錯'),false);
});

test('past-day AI correction is targeted, without rewriting live-call or fixed-story lines',()=>{
 const yesterday=correctCallYesterdayReference([
  {text:'剛才答應你的事還算數。',speechText:'剛才答應你的事還算數。'},
  {text:'剛才你問起昨天的事。'},
  {text:'前天我已經告訴過你。'}
 ],'昨天你答應我的事情呢？');
 assert.equal(yesterday[0].text,'昨天答應你的事還算數。');
 assert.equal(yesterday[0].speechText,'昨天答應你的事還算數。');
 assert.equal(yesterday[1].text,'剛才你問起昨天的事。');
 assert.equal(yesterday[2].text,'前天我已經告訴過你。');
 const source=[{text:'剛才說過。'}];
 assert.equal(correctCallYesterdayReference(source,'你還在嗎？'),source);
});
