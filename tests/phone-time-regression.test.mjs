import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultPhoneData,ensurePhoneData,restoreRecordedPhoneCalls} from '../src/services/phone-data.js';
import {receiveCall,answerCall,endCall} from '../src/services/telephony/store.js';
import {taiTimeContradiction} from '../src/services/ai/life-context.js';

const state=()=>({
 day:53,clock:'21:30',unlocked:true,batteryPercent:92,powerMode:'idle',
 content:{phone:defaultPhoneData()},
 story55:{scriptedCallCompleted:{'d53-fulongsheng-call':true},nativePhoneCalls:{}}
});
const storeOf=s=>({get(){return s;},update(fn){fn(s);}});

test('all saved phone contacts have unique full Macau numbers',()=>{
 const data=defaultPhoneData();
 const numbers=[data.self.number,...data.contacts.map(p=>p.number)];
 assert.equal(new Set(numbers).size,numbers.length);
 for(const number of numbers)assert.match(number,/^\+853 [26]\d{3} \d{4}$/);
});

test('existing saves get numbers once, without losing call history',()=>{
 const s=state();
 s.content.phone.contacts[2].number='';
 s.content.phone.calls.push({id:'known-call',name:'傅隆生',number:'UNKNOWN',day:53});
 assert.equal(ensurePhoneData(s),true);
 assert.equal(ensurePhoneData(s),false);
 assert.match(s.content.phone.contacts[2].number,/^\+853 6\d{3} \d{4}$/);
 assert.equal(s.content.phone.calls.at(-1).id,'known-call');
 assert.equal(s.content.phone.calls.at(-1).number,s.content.phone.contacts[2].number);
});

test('an actual Father call is named and recorded after hangup',()=>{
 const s=state(),store=storeOf(s),id='d53-fulongsheng-call-1';
 assert.equal(receiveCall(store,{id,source:'authored-phone',scriptId:'d53-fulongsheng-call',displayName:'傅隆生'},1000),true);
 assert.equal(answerCall(store,id,2000),true);
 assert.equal(endCall(store,id,65000,{reason:'scripted_end'}),true);
 const entry=s.content.phone.calls[0];
 assert.equal(entry.name,'傅隆生');
 assert.equal(entry.number,s.content.phone.contacts.find(p=>p.id==='contact-fu').number);
 assert.equal(entry.day,53);
 assert.equal(entry.time,'21:30');
 assert.equal(entry.duration,63);
 assert.equal(entry.missed,false);
});

test('only witnessed completed calls are recovered; never preview-only progress',()=>{
 const s=state();
 assert.equal(restoreRecordedPhoneCalls(s),false);
 s.story55.nativePhoneCalls['d53-fulongsheng-call']={transcript:[
  {speaker:'傅隆生',playedAt:1000},{speaker:'熙蒙',playedAt:41000}
 ]};
 assert.equal(restoreRecordedPhoneCalls(s),true);
 assert.equal(restoreRecordedPhoneCalls(s),false);
 assert.equal(s.content.phone.calls.filter(c=>c.scriptId==='d53-fulongsheng-call').length,1);
});

test('legacy completed calls with a real incoming trigger recover without a transcript',()=>{
 const s=state();
 s.story55.d53FuCallTriggered=true;
 assert.equal(restoreRecordedPhoneCalls(s),true);
 assert.equal(s.content.phone.calls[0].name,'傅隆生');
});

test('time correction rejects misplaced late-night claims, not natural teasing',()=>{
 const clocks={macauClock:'08:13',londonClock:'01:13'};
 assert.equal(taiTimeContradiction(['你半夜不睡，就為了這個？'],clocks),true);
 assert.equal(taiTimeContradiction(['你那邊都早上八點了吧？我這兒才凌晨一點。怎麼，這麼早就來討情話？'],clocks),false);
 assert.equal(taiTimeContradiction(['我這邊凌晨一點，你那邊早上八點。'],{macauClock:'08:13',londonClock:'12:13'}),true);
});
