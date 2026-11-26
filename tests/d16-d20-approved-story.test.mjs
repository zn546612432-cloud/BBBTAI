import test from 'node:test';
import assert from 'node:assert/strict';
import {D14_D24_CONTENT as data} from '../src/story/d14-d24/definition.js';
import {D14_D24_TRACKS} from '../src/story/d14-d24/wechat.js';
import {seedAuthoredNotes} from '../src/services/story55/authored-notes.js';
import {authoredMoments,visibleMoments} from '../src/apps/wechat/features/moments/data.js';
import legacy from '../src/story/d14-d24/d16-d20-legacy-chats.json' with {type:'json'};
const scene=(d,id)=>data.wechat.find(s=>s.day===d&&s.id===id);
test('D16–D20 approved boundaries and exclusions',()=>{
 assert.equal(scene(16,'briefing').lines[0].text,'小辛，你起床了沒有？');
 assert.equal(scene(16,'hardware').lines.at(-1).text,'……');
 assert.ok(!data.notes.find(n=>n.day===16).text.includes('女裝'));
 assert.equal(scene(17,'laundry').lines[8].text,'我看你屁股也癢了');
 assert.equal(scene(17,'rain').lines.at(-1).text,'收到🫡');
 assert.equal(scene(18,'money').lines.length,9);
 assert.equal(scene(18,'wallet-halves').at,'14:35');
 assert.equal(scene(18,'shoulder').lines[12].text,'我服了，他看起來哪裡需要被照顧了');
 assert.equal(scene(19,'future-home').lines.at(-1).text,'大家幸福開心就好。');
 assert.equal(scene(20,'awake').lines.at(-1).text,'威威我愛你');
 assert.equal(scene(20,'monitoring').lines.length,21);
 assert.equal(data.wechat.filter(s=>s.day===20).length,3);
 assert.equal(data.notes.find(n=>n.day===20).text.split('□').length,5);
});
test('new timed notes appear once and retain edits',()=>{
 for(const n of data.notes.filter(n=>[18,20].includes(n.day))){
  const s={day:n.day,clock:n.at==='16:30'?'16:29':'22:14',story55:{},content:{notes:[]}};
  assert.equal(seedAuthoredNotes(s,[n]),false);
  s.clock=n.at;assert.equal(seedAuthoredNotes(s,[n]),true);
  s.content.notes[0].text='玩家修改';
  assert.equal(seedAuthoredNotes(s,[n]),false);
  assert.equal(s.content.notes[0].text,'玩家修改');
 }
});
test('D17 and D19 text-only moments respect publication time',()=>{
 for(const [id,date,before,at] of [['xs-d17-rain-shoes','2025-06-04','17:01','17:02'],['xs-d19-retire','2025-06-06','21:21','21:22']]){
  const post=authoredMoments.find(p=>p.id===id);
  assert.ok(post);assert.equal(post.media.length,0);
  assert.equal(visibleMoments([post],date,{clock:before}).length,0);
  assert.equal(visibleMoments([post],date,{clock:at}).length,1);
 }
});
test('old in-flight scenes retain original script and progress',()=>{
 for(const [key,oldLines] of Object.entries(legacy)){
  const [d,id]=key.split(':'),day=Number(d),prefix='d'+d;
  const track=D14_D24_TRACKS.find(t=>t.track.day===day).track;
  const s={day,clock:scene(day,id).at,story55:{version:1,completed:{loan:true},authoredDays:{[prefix]:{[id]:{started:true,index:1,nextAt:null}}}},content:{conversations:{wechat:[]}}};
  const q=track.ensure(s)[id];
  assert.equal(q.scriptVersion,1);
  assert.equal(q.index,1);
  assert.deepEqual(track.defs.find(x=>x.id===id).lines(s,q),oldLines);
 }
});
