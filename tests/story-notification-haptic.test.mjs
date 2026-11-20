import test from 'node:test';
import assert from 'node:assert/strict';
import {deliverAuthoredIncoming} from '../src/services/messaging/authored-incoming.js';
import {hasNewStoryMessage,suppressQuietBanners,notificationMuted} from '../src/services/messaging/notification-policy.js';
import {storyMessageHaptic} from '../src/system/haptics.js';
import {musicLibrary,musicAccount} from '../src/apps/music/features/library/index.js';
import {musicPlayer} from '../src/apps/music/features/player/index.js';
import {settingsHome} from '../src/apps/settings/features/home/index.js';

test('new authored notifications vibrate independently of Focus and history',()=>{
 const s={day:41,clock:'23:40',focus:true,unlocked:false,notifications:[],content:{conversations:{wechat:[{id:'group',name:'狼崽團',unread:0}]}}};
 const incoming={conversationId:'group',from:'阿威',messageId:'current',text:'出發了'};
 assert.equal(deliverAuthoredIncoming(s,incoming),true);
 suppressQuietBanners(s);
 assert.equal(notificationMuted(s,s.notifications[0]),true);
 assert.equal(hasNewStoryMessage(s.notifications,new Set()),true);
 const seen=new Set(s.notifications.map(n=>n.id));
 assert.equal(deliverAuthoredIncoming(s,incoming),false);
 assert.equal(hasNewStoryMessage(s.notifications,seen),false);
 deliverAuthoredIncoming(s,{...incoming,messageId:'history',silent:true});
 assert.equal(hasNewStoryMessage(s.notifications,seen),false);
 assert.equal(hasNewStoryMessage([{id:'ordinary'}],seen),false);
});
test('real vibration when supported and visual fallback otherwise',()=>{
 const calls=[];const phone={animate:(...args)=>calls.push(args)};
 assert.equal(storyMessageHaptic({nav:{vibrate:pattern=>{calls.push(pattern);return true;}},phone}), 'vibrate');
 assert.deepEqual(calls,[[45,65,45]]);
 assert.equal(storyMessageHaptic({nav:{},phone,reducedMotion:false}),'visual');
 assert.ok(calls[1][0].some(frame=>frame.translate==='2px 0'));
 assert.equal(storyMessageHaptic({nav:{vibrate:()=>false},phone,reducedMotion:true}),'visual');
 assert.ok(calls[2][0].every(frame=>'opacity' in frame));
});
test('music uses actual track and shared Apple account, with working action targets',()=>{
 const home=musicLibrary({playing:false,tab:'listen',query:''});
 assert.match(home,/tonight-rain-cover.svg/);
 assert.match(home,/data-action="music-play-track"/);
 assert.match(home,/data-action="music-account"/);
 assert.match(musicAccount(),/<h1>Jack<\/h1>/);
 assert.match(settingsHome({}),/<strong>Jack<\/strong>/);
 assert.match(musicLibrary({playing:false,tab:'search',query:'zz'}),/music-tracks" hidden/);
 assert.match(musicPlayer(true,20,true,false),/aria-label="暂停"/);
 assert.match(musicPlayer(false,20,true,false),/value="20"/);
});
