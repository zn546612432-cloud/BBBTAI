import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {home} from '../src/system/shell.js';
import {unreadAppCount,unreadBadge,badgeText} from '../src/services/unread-badges.js';
import {readConversationInState} from '../src/services/messaging/read.js';
import {PhoneRouter} from '../src/services/router.js';
import {registry} from '../src/system/registry.js';

const appButton=(html,id)=>{
 const match=html.match(new RegExp('<button\\b[^>]*data-app="'+id+'"[^>]*>[\\s\\S]*?<\\/button>'));
 assert.ok(match,'Missing Home/Dock icon: '+id);
 return match[0];
};
const blank=()=>{
 const s=initialState();
 for(const channel of ['wechat','messages','noapp','mirage'])
  for(const conversation of s.content.conversations[channel]||[])
   conversation.unread=0;
 s.content.mail=[];
 return s;
};

test('red numbered badges follow each real app unread count and cap at 99+',()=>{
 const s=blank();
 s.content.conversations.wechat[0].unread=1;
 s.content.conversations.wechat[1].unread=2;
 s.content.conversations.messages.push({id:'unread-sms',unread:4,messages:[]});
 s.content.conversations.noapp.push({id:'unread-noapp',unread:3,messages:[]});
 s.content.conversations.mirage.push({id:'unread-mirage',unread:102,messages:[]});
 s.content.mail=[
  {id:'new1',read:false},{id:'new2',read:false},
  {id:'old',read:true},{id:'sent',linkedDelivery:true,read:false}
 ];
 assert.equal(unreadAppCount(s,'wechat'),3);
 assert.equal(unreadAppCount(s,'messages'),4);
 assert.equal(unreadAppCount(s,'noapp'),3);
 assert.equal(unreadAppCount(s,'mirage'),102);
 assert.equal(unreadAppCount(s,'kira'),2);
 assert.equal(unreadAppCount(s,'phone'),0);
 assert.equal(badgeText(102),'99+');
 const html=home(s);
 for(const [id,expected] of [['wechat','3'],['messages','4'],['noapp','3'],['mirage','99+'],['kira','2']]){
  const icon=appButton(html,id);
  assert.match(icon,new RegExp('class="home-unread-badge"[^>]*>'+expected.replace('+','\\+')+'<\\/span>'));
  assert.match(icon,new RegExp('aria-label="[^"]*条未读消息'));
 }
 assert.doesNotMatch(appButton(html,'phone'),/home-unread-badge/);
 assert.doesNotMatch(appButton(html,'ghost'),/home-unread-badge/);
});

test('an icon has no red dot if all conversations and emails are read',()=>{
 const s=blank();
 const html=home(s);
 for(const id of ['wechat','messages','noapp','mirage','kira'])
  assert.doesNotMatch(appButton(html,id),/home-unread-badge/);
 assert.equal(unreadBadge(s,'wechat'),'');
 assert.equal(unreadBadge(s,'kira'),'');
});

test('chat opening clears only its conversation badge and preserves other threads',()=>{
 const s=blank();
 s.content.conversations.wechat[0].unread=3;
 s.content.conversations.wechat[1].unread=2;
 const id=s.content.conversations.wechat[0].id;
 assert.equal(unreadAppCount(s,'wechat'),5);
 assert.equal(readConversationInState(s,'wechat',id),true);
 assert.equal(unreadAppCount(s,'wechat'),2);
 assert.match(appButton(home(s),'wechat'),/home-unread-badge"[^>]*>2<\/span>/);
 assert.equal(readConversationInState(s,'wechat',s.content.conversations.wechat[1].id),true);
 assert.doesNotMatch(appButton(home(s),'wechat'),/home-unread-badge/);
});

test('opening a KIRA email, not just its inbox, clears the relevant red badge',()=>{
 const s=blank();
 s.content.mail.push({id:'kira-new1',read:false,subject:'test',body:'first'},{id:'kira-new2',read:false,subject:'test',body:'second'});
 const store={get:()=>s,update(fn){fn(s);}};
 const oldDocument=globalThis.document;
 globalThis.document={querySelector:()=>null};
 try{
  const router=new PhoneRouter(store,registry);
  assert.equal(unreadAppCount(s,'kira'),2);
  router.open({appId:'kira',route:'/'});
  assert.equal(unreadAppCount(s,'kira'),2);
  router.open({appId:'kira',route:'/mail/kira-new1'});
  assert.equal(unreadAppCount(s,'kira'),1);
  assert.match(appButton(home(s),'kira'),/home-unread-badge"[^>]*>1<\/span>/);
  router.open({appId:'kira',route:'/mail/kira-new2'});
  assert.equal(unreadAppCount(s,'kira'),0);
  assert.doesNotMatch(appButton(home(s),'kira'),/home-unread-badge/);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});

test('badge CSS stays outside the clipped app tile for both Home icons and Dock',()=>{
 const css=readFileSync(new URL('../src/styles/base.css',import.meta.url),'utf8');
 assert.match(css,/\.home-app \.home-icon-wrap\{[^}]*position:relative[^}]*overflow:visible/);
 assert.match(css,/\.home-app \.home-unread-badge\{[^}]*position:absolute[^}]*background:#ff3b30/);
 assert.match(css,/\.home-dock \.home-unread-badge\{/);
 assert.match(appButton(home(blank()),'messages'),/home-icon-wrap/);
});
