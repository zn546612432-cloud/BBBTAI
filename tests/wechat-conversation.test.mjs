import test from 'node:test';
import assert from 'node:assert/strict';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {groupAvatar,groupMembersForAvatar} from '../src/apps/wechat/components/group-avatar.js';
import {recallWeChatMessage} from '../src/apps/wechat/features/recall/index.js';
import {speakWeChatText,stopWeChatSpeech} from '../src/apps/wechat/features/tts/index.js';
import {emojiCategories,renderEmojiPanel,insertEmoji,eraseEmoji} from '../src/apps/wechat/features/emoji/index.js';
import {appFrame} from '../src/system/shell.js';
import {manifest as wechatManifest} from '../src/apps/wechat/index.js';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {readFileSync} from 'node:fs';

const memoryStorage=()=>{
 const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
};

test('wechat group portrait uses six actual member files, not a placeholder letter',()=>{
 const group=initialState().content.conversations.wechat.find(c=>c.id==='group');
 const html=groupAvatar(group);
 assert.deepEqual(groupMembersForAvatar(group).map(a=>a.name),['熙蒙','熙旺','胡枫','小辛','阿威','仔仔']);
 assert.equal((html.match(/class="wx-group-cell"/g)||[]).length,6);
 for(const name of ['ximeng','xiwang','hufeng','xiaoxin','awei','zaizai'])assert.match(html,new RegExp(name+'\\.jpeg'));
 assert.doesNotMatch(html,/class="wx-avatar"[^>]*>六</);
});

test('native WeChat conversation has names, portraits, composer and per-message actions without DEMO',()=>{
 const s=initialState(),group=s.content.conversations.wechat.find(c=>c.id==='group');
 group.messages.push({id:'mine-1',from:'me',kind:'text',text:'哥，我回来了',time:'21:19'});
 const html=renderWeChatChat(s,'group');
 for(const item of ['wx-message-sender','胡枫','小辛','wx-message-row mine','wx-composer','wx-speak-draft','wx-message-options','哥，我回来了'])assert.ok(html.includes(item),item);
 assert.match(html,/avatars\/originals\/ximeng\.jpeg/);
 assert.match(html,/avatars\/originals\/hufeng\.jpeg/);
 assert.match(renderWeChatChat(s,'wang'),/avatars\/originals\/xiwang\.jpeg/);
 assert.equal((html.match(/loading="eager"/g)||[]).length,3);
 assert.doesNotMatch(html,/loading="lazy"/);
 assert.doesNotMatch(html,/DEMO|chat-person|聊天记录/);
 assert.equal((html.match(/class="message-row wx-message-row/g)||[]).length,3);
 const css=readFileSync(new URL('../src/apps/wechat/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.wx-message-row\.mine \.wx-bubble\{background:#95ec69/);
});

test('player recall removes content and leaves stable notice; incoming messages cannot be revoked',()=>{
 const store=new PhoneStore(memoryStorage());
 const conversation=store.get().content.conversations.wechat.find(c=>c.id==='wang');
 const oldText=conversation.messages[1].text;
 assert.throws(()=>recallWeChatMessage(store,'wang','w1'),/只能撤回自己/);
 assert.equal(conversation.messages[0].text,'阿蒙，返嚟記得食宵夜。');
 assert.equal(recallWeChatMessage(store,'wang','w2'),true);
 const next=store.get().content.conversations.wechat.find(c=>c.id==='wang');
 assert.equal(next.messages[1].kind,'recalled');
 assert.equal(next.messages[1].text,'');
 assert.equal(next.messages[1].recalledBy,'me');
 assert.ok(oldText.length>0);
 assert.match(renderWeChatChat(store.get(),'wang'),/你撤回了一条消息/);
 assert.doesNotMatch(renderWeChatChat(store.get(),'wang'),/知道啦，哥。/);
 assert.throws(()=>recallWeChatMessage(store,'wang','w2'),/已经撤回/);
 assert.ok(store.get().events.some(e=>e.type==='wechat_message_recalled'));
});

test('text-to-speech reads text in the device voice, supports Chinese and stops playback',()=>{
 const spoken=[],engine={cancel(){spoken.push('stop')},speak(item){spoken.push(item)}};
 class FakeUtterance{constructor(text){this.text=text;}}
 const voice=speakWeChatText('阿蒙，返嚟。',{engine,Utterance:FakeUtterance});
 assert.equal(voice.lang,'zh-CN');assert.equal(voice.rate,.95);
 assert.equal(voice.text,'阿蒙，返嚟。');
 assert.equal(spoken[0],'stop');assert.equal(spoken[1],voice);
 stopWeChatSpeech(engine);assert.equal(spoken[2],'stop');
 assert.equal(speakWeChatText('Hello',{engine,Utterance:FakeUtterance}).lang,'en-US');
 assert.throws(()=>speakWeChatText(''),/没有可朗读/);
 assert.throws(()=>speakWeChatText('Hi',{engine:{speak:null},Utterance:FakeUtterance}),/暂不支持/);
});

test('native WeChat chat bar has a centered contact name, back chevron, and triple-dot menu',()=>{
 const s=initialState();s.nav.current={appId:'wechat',route:'/chat/wang',params:{}};
 const markup=appFrame(s,{manifest:wechatManifest},renderWeChatChat(s,'wang'));
 assert.match(markup,/class="app-nav wx-native-nav"/);
 assert.match(markup,/aria-label="返回微信"/);
 assert.match(markup,/class="nav-home wx-native-more"/);
 assert.match(markup,/<strong>熙旺<\/strong>/);
 assert.match(markup,/circle cx="5" cy="12"/);
 assert.doesNotMatch(markup,/nav-home[^>]*>⌂/);
 const css=readFileSync(new URL('../src/apps/wechat/styles.css',import.meta.url),'utf8');
 assert.match(css,/\.app-view\.app-wechat\.has-chat\{padding-top:60px/);
 assert.match(css,/\.wx-emoji-tabs\{[^}]*padding:3px 8px 27px/);
});

test('system emoji tray offers native emoji categories and inserts at caret without sending',()=>{
 const panel=renderEmojiPanel();
 assert.match(panel,/data-action="wx-emoji-insert"/);
 assert.match(panel,/data-action="wx-emoji-delete"/);
 assert.match(panel,/data-action="wx-emoji-category"/);
 assert.equal(emojiCategories.length,4);
 assert.ok(emojiCategories.flatMap(c=>c.items).length>=140);
 assert.deepEqual(insertEmoji('阿蒙回来',2,2,'😊'),{text:'阿蒙😊回来',caret:4});
 assert.deepEqual(insertEmoji('阿蒙想你',2,3,'❤️'),{text:'阿蒙❤️你',caret:4});
 const before='你好👨‍👩‍👧‍👦';
 assert.deepEqual(eraseEmoji(before,before.length),{text:'你好',caret:2});
 const markup=renderWeChatChat(initialState(),'group');
 assert.match(markup,/class="wx-emoji-panel" hidden/);
 assert.match(markup,/aria-label="表情"/);
});
