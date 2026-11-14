import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55,advanceScene55,scene55ReplyDelay,tickQueuedStoryScenes55} from '../src/services/story55/runtime.js';
import {story55Config,taiRecognized} from '../src/services/story55/state.js';
import {scriptedDraft55,sendScriptedDraft55} from '../src/services/story55/scripted-chat.js';
import {receiveInvitation,startAcceptedInvitation} from '../src/services/invitations.js';
import fs from 'node:fs';
import {advanceGameMinutes} from '../src/system/time/clock.js';
import {canCharge,canShortCharge,plugIn} from '../src/system/power/battery.js';
import {powerFullscreen} from '../src/system/power/controls.js';
import {completeNode} from '../src/services/story55/state.js';
import {tickStory55} from '../src/services/story55/runtime.js';

const D20_APPROVED_DIALOGUE=[
 ['me','人員安排都做好了嗎？'],
 ['胡楓','小辛負責在閘口放信號干擾器，阿威打頭陣，在一樓牽制剩下的保安，我和小辛去保險庫，仔仔去監控室破壞服務器。'],
 ['me','好，轉入服務器機房後，我會接入網絡打開刷開門禁，第三道是鐵門，我解除了電子報警後，需要手動撬鎖，這部分是誰負責？'],
 ['小辛','楓哥'],
 ['小辛','他練習好久了'],
 ['胡楓','我們還準備了planb的炸藥，三分鐘撬不開就炸。'],
 ['me','只要監控正常，銀行方會在保險庫被炸後十分鐘才發覺異常，你們有足夠的時間逃離。'],
 ['小辛','但我還是沒搞懂怎麼讓監控實時偽造影像？蒙哥講得太深奧了'],
 ['me','理論上⋯用 AI 輔助是可行的，但現在還不能保證效果。'],
 ['小辛','所以就是還沒搞定？'],
 ['me','我沒說過搞定了'],
 ['胡楓','你早上那個語氣很像搞定了'],
 ['me','你能不能先讓我說完？'],
 ['阿威','哈哈哈哈'],
 ['熙旺','行了，先把沒確認的地方記下來，晚上再談。'],
 ['小辛','收到收到。'],
 ['小辛','不過下次可以講簡單一點嗎，我腦袋快炸了。'],
 ['me','那我盡量用你能聽懂的方式。'],
 ['小辛','你是不是在罵我？'],
 ['胡楓','是。'],
 ['阿威','是。']
];

test('D20 restores the user-authored original and deduplicates AI monitor exchange in the existing 10:45 scene',()=>{
 const content=JSON.parse(fs.readFileSync(new URL('../src/story/d14-d24/content.json',import.meta.url)));
 const scenes=content.wechat.filter(x=>x.day===20);
 assert.deepEqual(scenes.find(x=>x.id==='early').lines,[{who:'阿威',text:'今天練習提前半小時。'},{who:'熙旺',text:'收到。'}]);
 assert.deepEqual(scenes.find(x=>x.id==='awake'),{day:20,id:'awake',chat:'group',at:'09:06',lines:[{who:'小辛',text:'我才剛醒⋯'}]});
 const group=scenes.find(x=>x.id==='monitoring');
 assert.equal(group.at,'10:45');assert.equal(group.chat,'group');
 assert.equal(group.lines.length,21);
 assert.deepEqual(group.lines.map(l=>[l.who,l.text]),D20_APPROVED_DIALOGUE);
 assert.equal(group.lines.filter(l=>l.text.includes('但我還是沒搞懂')).length,1,'one monitoring question');
 assert.equal(group.lines.filter(l=>l.text.includes('理論上')).length,1,'one complete AI answer');
 assert.equal(group.lines.filter(l=>l.who==='me').length,7);
 assert.equal(scenes.filter(x=>x.id==='monitoring').length,1,'same scheduler node');
 for(const discarded of ['昨晚說的兩個地方','兩邊的資料分開對一遍','我大概明白了。','我在試一個方向'])assert.equal(group.lines.some(l=>l.text.includes(discarded)),false,'discard assistant-invented copy: '+discarded);
 assert.equal(scenes.some(x=>x.id==='soup'||x.at==='22:42'||x.at==='22:08'),false);
 const s=activateStory55(initialState());assert.equal(taiRecognized(s),false);
 assert.equal(JSON.stringify(s.content.conversations.wechat).includes('人員安排都做好了嗎？'),false,'no D20 future copy at D01');
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
 assert.ok(invitation);assert.equal(invitation.status,'pending');
 assert.equal(invitation.senderId,'tai');
 assert.equal(s.matches.length,0,'the card must not create a match without a tap');
 const card=c().messages.filter(m=>m.kind==='app_invitation'&&m.attachment?.invitationId===invitation.id);
 assert.equal(card.length,1);
 assert.equal(c().messages.filter(m=>/^s55-d23-chess-/.test(m.id)).length,22);
 assert.equal(taiRecognized(s),false);
 assert.ok((c().messages.length-initial)>=23);
 const store={get:()=>s,update:fn=>fn(s)};
 const matchId=receiveInvitation(store,invitation.id);
 assert.equal(invitation.status,'accepted','tap commits acceptance');
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

test('Ouroboros Mirage scene replies use the existing queue with human pacing',()=>{
 const s=activateStory55(initialState());s.day=23;s.clock='22:16';s.story55.activeScene='d23-chess';
 assert.equal(scene55ReplyDelay(s,'d23-chess',0),1900,'player authored line still uses ordinary policy');
 assert.equal(scene55ReplyDelay(s,'d23-chess',1),1900);
 const origin=1000;
 advanceScene55(s,'d23-chess',{now:origin});
 const due=s.story55.scenes['d23-chess'].nextAt;
 assert.equal(due-origin,1900);
 assert.equal(tickQueuedStoryScenes55(s,due-1),false,'no early NPC delivery');
 assert.equal(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id==='s55-d23-chess-1').length,0);
 assert.equal(tickQueuedStoryScenes55(s,due),true,'exactly one real NPC bubble appears at its due time');
 assert.equal(s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros').messages.filter(m=>m.id==='s55-d23-chess-1').length,1);
});

test('King’s Gambit replaces Queen’s Gambit without changing the 22-turn D23 scene',()=>{
 const s=activateStory55(initialState());
 const lines=story55Config(s).scenes['d23-chess'];
 assert.equal(lines.length,22);
 assert.deepEqual(lines[7],['me','王翼棄兵，你知道吧？']);
 assert.deepEqual(lines[8],['ouroboros',"King's Gambit？"]);
 assert.match(lines[10][1],/e4.*e5.*f/);
 assert.match(lines[12][1],/不吃就不吃/);
});
test('D23 remains unsent until native Send, including after 03:00 and old saved bubbles',()=>{
 const s=activateStory55(initialState());s.day=23;s.clock='22:20';s.unlocked=true;s.story55.activeScene='d23-chess';
 const c=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');
 c.messages.push({id:'s55-d23-chess-0',from:'me',text:'你會下國際象棋嗎？',time:'22:17'});
 tickStory55(s);
 assert.equal(c.messages.filter(m=>m.id==='s55-d23-chess-0').length,0,'unsent-looking old message must be quarantined');
 assert.equal(s.story55.d23QuarantinedMessages.length,1);
 assert.equal(s.story55.scenes['d23-chess']?.index||0,0);
 assert.equal(tickQueuedStoryScenes55(s,50000),false,'NPC never starts a player-initiated scene');
 assert.equal(c.messages.filter(m=>/^s55-d23-chess-/.test(m.id)).length,0);
 const result=advanceGameMinutes(s,99999);
 assert.equal(result.event,'d23-hold');assert.equal(s.day,23);assert.equal(s.clock,'03:00');
 assert.equal(s.batteryPercent,1);assert.equal(s.story55.d23.nightAfterMidnight,true);
 assert.equal(canCharge(s),false);assert.equal(canShortCharge(s),false);
 assert.doesNotMatch(powerFullscreen(s),/power-emergency-screen/,'1% must remain playable');
 assert.equal(scriptedDraft55(s,'mirage','s55-ouroboros')?.text,'你會下國際象棋嗎？');
 sendScriptedDraft55(s,'mirage','s55-ouroboros','你會下國際象棋嗎？');
 assert.equal(c.messages.filter(m=>m.id==='s55-d23-chess-0').length,1);
 assert.equal(tickQueuedStoryScenes55(s,Date.now()+10000),true);
 assert.equal(c.messages.filter(m=>m.id==='s55-d23-chess-1').length,1);
 assert.equal(advanceGameMinutes(s,1000).minutes,0,'03:00 cannot move until completion');
});
test('D23 invitation alone is insufficient; only the postgame farewell releases long charge',()=>{
 const s=activateStory55(initialState());s.day=23;s.clock='22:16';
 for(const n of story55Config(s).nodes)
  if(n.gateDay&&n.gateDay<23)s.story55.completed[n.id]={day:n.day,clock:'20:00',test:true};
 s.story55.activeScene='d23-chess';
 for(const [who,text] of story55Config(s).scenes['d23-chess']){
  if(who==='me')sendScriptedDraft55(s,'mirage','s55-ouroboros',text);
  else advanceScene55(s,'d23-chess');
 }
 assert.ok(s.story55.completed['d23-chess'],'the invitation dialogue finished');
 assert.equal(s.story55.completed['d23-chess-finish'],undefined);
 assert.equal(canCharge(s),false,'invitation alone cannot skip actual chess');
 s.clock='23:59';advanceGameMinutes(s,500);assert.equal(s.clock,'03:00');
 completeNode(s,'d23-chess-finish');
 assert.equal(canCharge(s),true);
 assert.equal(plugIn(s),true);
 assert.equal(s.day,24,'overnight D23 charge enters D24 exactly once');
 assert.equal(s.clock,'08:00');assert.equal(s.batteryPercent,100);
});
