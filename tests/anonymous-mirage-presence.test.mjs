import test from 'node:test';
import assert from 'node:assert/strict';
import {anonymousPresence55,ANONYMOUS_MIRAGE_WINDOWS_55} from '../src/services/story55/runtime.js';
import {render as renderMirage} from '../src/apps/mirage/index.js';
import {setMirageAuthenticated} from '../src/apps/mirage/session.js';

const phone=(day=15,clock='08:00')=>({
 day,clock,story55:{version:1,ended:false,activeScene:null,completed:{wallet:true}},
 content:{conversations:{mirage:[{id:'s55-ouroboros',name:'Dr Ouroboros',online:false,messages:[],unread:0}]},
  mirage:{account:'NYARLATHOTEP',products:[],cart:[],assets:[],wallets:[],balance:0,digitalBalance:0}},
 events:[]
});
test('D15-D24 presence follows only the Story55 clock and all three exact half-open windows',()=>{
 assert.deepEqual(ANONYMOUS_MIRAGE_WINDOWS_55,[['08:00','09:25'],['12:00','12:30'],['22:00','23:00']]);
 for(const d of [15,20,24]){
  const s=phone(d);
  for(const [at,expected] of [
   ['07:59',false],['08:00',true],['09:24',true],['09:25',false],
   ['11:59',false],['12:00',true],['12:29',true],['12:30',false],
   ['21:59',false],['22:00',true],['22:59',true],['23:00',false]]){
   s.clock=at;
   assert.equal(anonymousPresence55(s,1000).online,expected,`D${d} ${at}`);
   assert.equal(anonymousPresence55(s,99_999_999).online,expected,'real-world timestamp must not affect presence');
  }
 }
});
test('old 25-minute windows are ignored, and offline scene or story ending still wins',()=>{
 const s=phone(15,'08:20');s.story55.anonymousWindows={15:1000};
 assert.equal(anonymousPresence55(s,99_999_999).online,true);
 s.story55.activeScene='loan';assert.equal(anonymousPresence55(s).online,false);s.story55.activeScene=null;
 s.story55.loanOfflineDay=15;s.story55.loanOfflineClock='08:15';
 assert.equal(anonymousPresence55(s).online,false);
 s.clock='12:00';assert.equal(anonymousPresence55(s).online,true);
 s.clock='22:20';assert.equal(anonymousPresence55(s).online,true);
 s.day=14;assert.equal(anonymousPresence55(s).online,false);
 s.day=25;assert.equal(anonymousPresence55(s).online,true);
 s.story55.ended=true;assert.equal(anonymousPresence55(s).online,false);
});
test('Mirage contact online display uses Story55 presence instead of a stale static contact flag',()=>{
 setMirageAuthenticated(true);
 try{
  const s=phone(20,'08:00');
  const view=()=>renderMirage({store:{get:()=>s}},{route:'/'});
  assert.match(view(),/mc-contact-dot is-online/);
  s.clock='09:25';assert.doesNotMatch(view(),/mc-contact-dot is-online/);
  s.content.conversations.mirage[0].online=true;
  assert.doesNotMatch(view(),/mc-contact-dot is-online/);
 }finally{setMirageAuthenticated(false);}
});
