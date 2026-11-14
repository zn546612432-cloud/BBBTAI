import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55} from '../src/services/story55/runtime.js';
import {story55Config,taiRecognized} from '../src/services/story55/state.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {startAcceptedInvitation} from '../src/services/invitations.js';
import fs from 'node:fs';

test('D20 uses only approved copy with separate wake-up timing and no soup thread',()=>{
 const content=JSON.parse(fs.readFileSync(new URL('../src/story/d14-d24/content.json',import.meta.url)));
 const scenes=content.wechat.filter(x=>x.day===20);
 assert.deepEqual(scenes.find(x=>x.id==='early').lines,[{who:'阿威',text:'今天練習提前半小時。'},{who:'熙旺',text:'收到。'}]);
 assert.deepEqual(scenes.find(x=>x.id==='awake'),{day:20,id:'awake',chat:'group',at:'09:06',lines:[{who:'小辛',text:'我才剛醒⋯'}]});
 const group=scenes.find(x=>x.id==='monitoring');assert.equal(group.at,'10:45');assert.equal(group.chat,'group');assert.equal(group.lines.length,14);
 assert.equal(group.lines[1].who,'me');assert.equal(group.lines[1].text,'理論上⋯用 AI 輔助是可行的，但現在還不能保證效果。');
 assert.deepEqual(group.lines.map(l=>[l.who,l.text]),[
  ['小辛','但我還是沒搞懂你說的監控那部分，蒙哥講得太深奧了。'],['me','理論上⋯用 AI 輔助是可行的，但現在還不能保證效果。'],
  ['小辛','所以就是還沒搞定？'],['me','我沒說過搞定了'],['胡楓','你早上那個語氣很像搞定了'],['me','你能不能先讓我說完？'],
  ['阿威','哈哈哈哈'],['熙旺','行了，先把沒確認的地方記下來，晚上再談。'],['小辛','收到收到。'],
  ['小辛','不過下次可以講簡單一點嗎，我腦袋快炸了。'],['me','那我盡量用你能聽懂的方式。'],['小辛','你是不是在罵我？'],['胡楓','是。'],['阿威','是。']
 ]);
 assert.equal(group.lines.filter(x=>x.who==='me').length,4);
 assert.equal(scenes.some(x=>x.id==='soup'||x.at==='22:42'||x.at==='22:08'),false);
 const s=activateStory55(initialState());assert.equal(taiRecognized(s),false);
 assert.equal(JSON.stringify(s.content.conversations.wechat).includes('理論上⋯用 AI 輔助是可行的，但現在還不能保證效果。'),false,'future player text is not injected at D01');
});

test('D23 chess introduction uses the existing MIRAGE scene and stays locked before 22:16',()=>{
 const s=activateStory55(initialState());
 const node=story55Config(s).nodes.find(x=>x.id==='d23-chess');
 assert.ok(node);assert.equal(node.day,23);assert.equal(node.channel,'mirage');
 assert.equal(node.conversationId,'s55-ouroboros');
 assert.equal(story55Config(s).scenes['d23-chess'].length,22);
 s.day=22;s.clock='23:59';assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros')?.id==='d23-chess',false);
 s.day=23;s.clock='22:15';assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros')?.id==='d23-chess',false);
 s.clock='22:16';s.story55.activeScene='d23-chess';
 assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros')?.text,'你會下國際象棋嗎？');
 assert.equal(taiRecognized(s),false,'chess at D23 must not prematurely reveal Tai identity');
});

test('approved 22 D23 chess turns are committed through native Send; card appears exactly once',()=>{
 const s=activateStory55(initialState());s.day=23;s.clock='22:16';s.story55.activeScene='d23-chess';
 const lines=story55Config(s).scenes['d23-chess'];
 const c=()=>s.content.conversations.mirage.find(x=>x.id==='s55-ouroboros');
 const initial=c()?.messages?.length||0;
 assert.equal(lines[0][0],'me');assert.equal(lines.at(-1)[1],'好啊，nya。');
 for(const [actor,text] of lines){
  if(actor==='me'){
   assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros')?.text,text);
   sendScriptedDraft55(s,'mirage','s55-ouroboros',text);
  }else advanceScene55(s,'d23-chess');
 }
 const invitation=s.invitations.find(i=>i.source==='d23-mirage-story');
 assert.ok(invitation);assert.equal(invitation.status,'accepted');
 assert.equal(invitation.senderId,'player');
 const card=c().messages.filter(m=>m.kind==='app_invitation'&&m.attachment?.invitationId===invitation.id);
 assert.equal(card.length,1);
 assert.equal(c().messages.filter(m=>/^s55-d23-chess-/.test(m.id)).length,22);
 assert.equal(taiRecognized(s),false);
 assert.ok((c().messages.length-initial)>=23);
 const store={get:()=>s,update:fn=>fn(s)};
 const matchId=startAcceptedInvitation(store,invitation.id);
 assert.equal(s.matches.find(m=>m.id===matchId).opponent,'tai');
 assert.equal(startAcceptedInvitation(store,invitation.id),matchId,'card reopen must resume same match');
 assert.equal(c().messages.filter(m=>m.kind==='app_invitation').length,1);
});

test('invalid D23 invitation source cannot unlock chess or Tai identity',()=>{
 const s=activateStory55(initialState());s.day=23;s.clock='21:00';
 const store={get:()=>s,update:fn=>fn(s)};
 assert.throws(()=>startAcceptedInvitation(store,'d23-chess-invite'),/邀請|不存在|接受/);
 assert.equal(taiRecognized(s),false);
 assert.equal(s.matches.length,0);
});
