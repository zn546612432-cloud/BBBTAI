import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {visibleMessages} from '../src/services/messaging/delivery.js';
import {actors} from '../src/apps/developer/features/conversations/model.js';
import {groupMembersForAvatar} from '../src/apps/wechat/components/group-avatar.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {unpackTaiReply} from '../src/services/ai/format.js';
import {chatView} from '../src/components/chat.js';
import {dateParts} from '../src/services/calendar.js';
import {readFileSync} from 'node:fs';
test('brothers group excludes two nonmembers without affecting father private chat',()=>{
 const s=initialState(),g=s.content.conversations.wechat.find(c=>c.id==='group');
 g.members=['me','wang','father','tai','胡枫','小辛','阿威','仔仔'];
 g.messages.push({id:'bad-father',from:'father',text:'INVALID FATHER'});
 g.messages.push({id:'bad-tai',from:'tai',text:'INVALID TAI'});
 assert.deepEqual(actors(g).map(x=>x.name),['熙蒙','熙旺','胡枫','小辛','阿威','仔仔']);
 assert.deepEqual(groupMembersForAvatar(g).map(x=>x.name),['熙蒙','熙旺','胡枫','小辛','阿威','仔仔']);
 assert.doesNotMatch(renderWeChatChat(s,'group'),/INVALID FATHER|INVALID TAI/);
 assert.ok(s.content.conversations.wechat.some(c=>c.id==='fulongsheng'));
});
test('future MIRAGE authored messages follow game date and clock',()=>{
 const s=initialState();activateStory55(s);
 const c={id:'s55-ouroboros',messages:[{id:'future',from:'s55-ouroboros',text:'wait',sentDate:'2025-05-23',time:'09:30',authored:true}]};
 s.day=2;s.clock='14:00';assert.equal(visibleMessages(c,s).length,0);
 s.day=5;s.clock='08:00';assert.equal(visibleMessages(c,s).length,0);
 s.clock='09:30';assert.equal(visibleMessages(c,s).length,1);
 assert.equal(dateParts(s).iso,'2025-05-23');
});
test('DeepSeek splits text semicolons and newlines, not voice',()=>{
 const result=unpackTaiReply({text:JSON.stringify({messages:[{text:'你又熬夜了；昨天怎么答应我的;算了。\n我先忙',mode:'text'}]})},'noapp');
 assert.deepEqual(result.map(x=>x.text),['你又熬夜了','昨天怎么答应我的','算了','我先忙']);
 const voice=unpackTaiReply({text:JSON.stringify({messages:[{text:'你又熬夜了；昨天怎么答应我的',mode:'voice'}]})},'noapp');
 assert.equal(voice.length,1);
});
test('Tai voice bubble has waveform and hidden transcript; Ximeng text only',()=>{
 const s=initialState(),c=s.content.conversations.noapp.find(c=>c.id==='tai');
 c.messages=[{id:'tt',from:'tai',kind:'voice',text:'你好',voiceCaption:'你好',duration:6,audioId:'tai-tt'},{id:'me',from:'me',kind:'text',text:'哥，好久不见'}];
 const html=chatView(s,'noapp','tai');
 assert.match(html,/class="noapp-wave"/);
 assert.match(html,/6″/);
 assert.match(html,/<summary>转文字<\/summary>/);
 assert.doesNotMatch(html,/data-action="tai-record"/);
});
test('D55 recording uses the deployment-aware shared audio resolver',()=>{
 const code=readFileSync(new URL('../src/services/story55/controller.js',import.meta.url),'utf8');
 assert.match(code,/audio\.src=resolvePhoneAudioPath\(src\)/);
});
