import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,tickQueuedStoryScenes55,advanceScene55} from '../src/services/story55/runtime.js';
import {nodeStatus,story55Config,story55ChargeGate} from '../src/services/story55/state.js';
import {receiveInvitation,refuseD29ChessInvitation} from '../src/services/invitations.js';
import {D29_CHESS_LINES,D29_IP} from '../src/story/d29/definition.js';
import {d29ChessDraft,d29ChessDone,sendD29ChessDraft,tickD23ChessLesson} from '../src/services/chess-lesson.js';
import {resignChessMatch} from '../src/services/chess.js';
import {render as browserRender} from '../src/apps/browser/index.js';
import {entryFor} from '../src/story/diary/entries.js';

test('fixed D29 scenes, player-opened chess, refusal, scripted chess and Mirage clue',()=>{
 const s=activateStory55(initialState()),store={get:()=>s,update:fn=>fn(s)},cfg=story55Config(s);
 for(const n of cfg.nodes)if(n.day<29)s.story55.completed[n.id]={day:n.day,clock:'22:00'};
 if(!s.content.conversations.mirage.some(c=>c.id==='s55-ouroboros'))s.content.conversations.mirage.push({id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0});
 s.day=29;s.clock='21:36';s.story55.activeScene=null;s.unlocked=true;
 const finish=id=>{assert.equal(nodeStatus(s,id).state,'ready');for(const _ of cfg.scenes[id])advanceScene55(s,id);};
 finish('d29-meeting');finish('d29-after-meeting');finish('d29-father');
 assert.equal(nodeStatus(s,'d29-chess').state,'locked');assert.equal(story55ChargeGate(s),'plot');
 s.nav.current={appId:'chess',route:'/',params:{}};tickStory55(s);finish('d29-chess');
 const inv=s.invitations.find(i=>i.id==='s55-d29-chess-invite');assert.ok(inv);
 assert.equal(refuseD29ChessInvitation(s,inv.id),true);assert.equal(refuseD29ChessInvitation(s,inv.id),false);
 const id=receiveInvitation(store,inv.id),match=s.matches.find(m=>m.id===id);
 s.nav.current={appId:'chess',route:'/match/'+id,params:{}};
 let now=Date.now()+1000;
 for(const [who,copy] of D29_CHESS_LINES){
  if(who==='me'){assert.equal(d29ChessDraft(match),copy);assert.ok(sendD29ChessDraft(match,s.clock,now+=5000));}
  else assert.ok(tickD23ChessLesson(s,now+=5000));
  assert.equal(match.chat.at(-1).text,copy);
 }
 assert.ok(d29ChessDone(match));assert.ok(resignChessMatch(store,id));assert.equal(nodeStatus(s,'plan').state,'locked');
 s.story55.d29ChessExited=true;s.nav.current={appId:'mirage',route:'/chat/s55-ouroboros',params:{}};finish('plan');
 assert.equal(story55ChargeGate(s),null);
 assert.equal(cfg.projects.find(p=>p.id==='identity').key,D29_IP);
 assert.ok(s.content.notes.some(n=>n.id==='s55-d29-ip'&&n.text===D29_IP));
 assert.match(browserRender({store},{route:'/search',params:{query:D29_IP}}),/里斯本/);
 assert.match(entryFor(s,29).body,/Ghost Car Trap/);
 assert.doesNotMatch(entryFor(s,29).body,/里斯本/);
});

test('older saves update the authored investigation token without altering unrelated chat or edited notes',()=>{
 const s=activateStory55(initialState()),cfg=story55Config(s);s.day=29;s.clock='22:00';
 cfg.projects.find(p=>p.id==='identity').key='192.0.2.29';
 const line=cfg.scenes.plan.find(l=>l[1]===D29_IP);line[1]='192.0.2.29';
 s.content.notes.push({id:'s55-d29-ip',text:'192.0.2.29'},{id:'unrelated-note',text:'192.0.2.29'});
 let chat=s.content.conversations.mirage.find(c=>c.id==='s55-ouroboros');if(!chat){chat={id:'s55-ouroboros',name:'Dr Ouroboros',messages:[],unread:0};s.content.conversations.mirage.push(chat);}
 chat.messages.push({id:'s55-plan-37',text:'192.0.2.29'},{id:'unrelated',text:'192.0.2.29'});
 tickStory55(s);
 assert.equal(line[1],D29_IP);assert.equal(cfg.projects.find(p=>p.id==='identity').key,D29_IP);
 assert.equal(s.content.notes.find(n=>n.id==='s55-d29-ip').text,D29_IP);assert.equal(chat.messages.find(m=>m.id==='s55-plan-37').text,D29_IP);
 assert.equal(s.content.notes.find(n=>n.id==='unrelated-note').text,'192.0.2.29');assert.equal(chat.messages.find(m=>m.id==='unrelated').text,'192.0.2.29');
});


test('D29 Mirage chess invitation offers acceptance or resume, never a refusal button',()=>{
 const source=readFileSync(new URL('../src/apps/mirage/index.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/mc-chess-refuse/);
 assert.match(source,/btn\('mc-chess-invite'/);
 assert.match(source,/accepted\?'繼續棋局':'接受邀請'/);
});
