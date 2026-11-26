import test from 'node:test';
import assert from 'node:assert/strict';
import {D14_D24_CONTENT} from '../src/story/d14-d24/definition.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
import legacy from '../src/story/d14-d24/d15-legacy-chats.json' with {type:'json'};
const track=D14_D24_TRACKS.find(t=>t.track.day===15).track;
const state=(clock)=>({day:15,clock,story55:{version:1,completed:{loan:true}},content:{conversations:{wechat:['group','wang'].map(id=>({id,name:id,messages:[],unread:0}))}},nav:{current:{appId:'home',route:'/'}},events:[],notifications:[]});
test('D15 approved copy, file bubble, racing boundaries and loan tail',()=>{
 const scenes=D14_D24_CONTENT.wechat.filter(s=>s.day===15);
 assert.deepEqual(scenes.map(s=>s.at),['10:22','16:30','22:06','22:43']);
 assert.deepEqual(scenes[0].lines[0],{who:'仔仔',text:'服裝設計稿_V1.pdf',kind:'file'});
 assert.equal(scenes[1].lines[1].text,'網上一個神經病黑客。');
 assert.equal(scenes[2].lines.at(-1).text,'等我更新遊戲。');
 assert.equal(scenes[3].lines.at(-1).text,'再來一把。');
 assert.ok(scenes.slice(2).every(s=>s.optional&&s.lines.every(l=>!l.kind&&l.who!=='me')));
 assert.equal(D14_D24_CONTENT.scenes.loan.at(-1)[1],'去換套像樣的設備，別再折磨你那台破電腦了。');
 const s=state('10:22');track.tick(s,1000);track.tick(s,4000);
 const m=s.content.conversations.wechat[0].messages[0];
 assert.equal(m.kind,'file');assert.equal(m.text,'服裝設計稿_V1.pdf');
});
test('old in-flight D15 scene retains cursor and old script',()=>{
 const s=state('16:30');s.story55.authoredDays={d15:{room:{started:true,index:1,nextAt:null}}};
 track.ensure(s);assert.equal(s.story55.authoredDays.d15.room.scriptVersion,1);
 assert.equal(track.draft(s,'wang').text,legacy.room[1].text);
});
