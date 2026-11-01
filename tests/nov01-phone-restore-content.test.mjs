import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {ensureAuthoredNotes} from '../src/apps/notes/data/seed.js';
import {activateStory55,advanceScene55} from '../src/services/story55/runtime.js';
import {allMoments} from '../src/apps/wechat/features/moments/model.js';
import {momentImage,renderMoments} from '../src/apps/wechat/features/moments/index.js';
import {groupMembersForAvatar} from '../src/apps/wechat/components/group-avatar.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {timestampGroups} from '../src/services/messaging/timestamps.js';
import {wechatAvatars,publicWeChatAsset} from '../src/apps/wechat/avatars.js';
import {restoreLegacyHistoricalContent} from '../src/services/story55/legacy-content.js';

test('55-day D01 ships photographed authored moments and never leaks D56+',()=>{
 const s=initialState();activateStory55(s);
 const posts=allMoments(s);
 assert.ok(posts.length>=20);
 assert.ok(posts.some(p=>p.storyDay===1&&p.media.length>0));
 assert.ok(posts.every(p=>p.storyDay<=55));
 s.clock='13:00';
 assert.match(renderMoments(s,'/moments'),/wx-moments-photo/);
 assert.match(momentImage('foodRice'),/apps\/wechat\/media\/user-food-rice.jpeg/);
});
test('existing empty 55-day Notes saves are repaired but player notes survive',()=>{
 const s=initialState();activateStory55(s);
 assert.ok(s.content.notes.some(n=>n.id==='xm-note-ledger'));
 s.content.notes.push({id:'my-note',text:'Do not lose'});
 const saved={...s,content:{...s.content,notes:[],notesSeedVersion:1,notesSeedRepairVersion:undefined}};
 assert.equal(ensureAuthoredNotes(saved),true);
 assert.ok(saved.content.notes.some(n=>n.id==='xm-note-ledger'));
 assert.equal(ensureAuthoredNotes(saved),false);
 assert.ok(s.content.notes.some(n=>n.id==='my-note'));
});
test('WeChat shows full day separators and aliases xin to 小辛 rather than ghost avatar',()=>{
 const s=initialState();activateStory55(s);
 s.clock='10:00';
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'sample-xin',from:'xin',text:'帮我看一下',sentDate:'2025-05-19',time:'09:50'});
 const html=renderWeChatChat(s,'group');
 assert.match(html,/2025年5月19日 09:50/);
 assert.match(html,/小辛/);
 assert.doesNotMatch(html,/>xin</);
 assert.ok(groupMembersForAvatar(group).some(x=>x.name==='小辛'));
});
test('asset paths remain relative to Pages base even when assets live in /public',()=>{
 assert.match(publicWeChatAsset('media/macau-morning.webp'),/apps\/wechat\/media\/macau-morning.webp$/);
 assert.match(wechatAvatars['小辛'],/xiaoxin.jpeg$/);
});
test('pre-D01 authored photos and notes survive migration and another campaign reset',()=>{
 const s=activateStory55(initialState());
 const historical={id:'historical-photo',storyDay:-1,author:'熙旺',publishedAt:'2025-05-17T09:00',text:'出去走走',media:['morning']};
 const old={content:{moments:{posts:[historical,{...historical,id:'old-plot',storyDay:80,publishedAt:'2025-08-06T09:00'}]},notes:[{id:'authored-private',authored:true,title:'别忘了',text:'钥匙在抽屉里'}]}};
 const storage={getItem:()=>JSON.stringify(old)};
 restoreLegacyHistoricalContent(storage,s);
 assert.ok(allMoments(s).some(p=>p.id==='historical-photo'));
 assert.ok(!allMoments(s).some(p=>p.id==='old-plot'));
 s.content.moments.posts.find(p=>p.id==='historical-photo').text='已修改';
 assert.equal(restoreLegacyHistoricalContent(storage,s),false);
 activateStory55(s);
 assert.equal(allMoments(s).find(p=>p.id==='historical-photo').text,'已修改');
 assert.ok(s.content.notes.some(n=>n.id==='authored-private'));
});
