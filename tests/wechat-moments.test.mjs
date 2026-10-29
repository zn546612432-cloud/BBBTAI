import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {initialState,repairLegacyWechatDates} from '../src/services/storage.js';
import {timestampGroups} from '../src/services/messaging/timestamps.js';
import {authoredMoments,visibleMoments} from '../src/apps/wechat/features/moments/data.js';
import {renderMoments,momentImage} from '../src/apps/wechat/features/moments/index.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {pictureSrc} from '../src/apps/wechat/components/chat-view.js';

test('Moments include only the game clock past 72 calendar hours, except pinned profile posts',()=>{
 const posts=visibleMoments(authoredMoments,'2025-05-19',{clock:'13:00',includePinned:false});
 assert.ok(posts.some(p=>p.id==='xw-0519'));
 assert.ok(!posts.some(p=>p.id==='xs-0519')); // Future, 23:05.
 assert.ok(!posts.some(p=>p.id==='hf-pin-korea')); // Old pinned invisible in global timeline.
 assert.ok(posts.every(p=>p.publishedAt<='2025-05-19T13:00'));
 const profile=visibleMoments(authoredMoments,'2025-05-19',{author:'胡枫',clock:'13:00'});
 assert.ok(profile.some(p=>p.id==='hf-pin-korea')); // Historical pin remains in the profile.
 assert.ok(profile.some(p=>p.id==='hf-0519'));
 assert.ok(!profile.some(p=>p.id==='hf-0607'));
});

test('Both native WeChat entrances open Moments, which have complete media & profile views',()=>{
 const s=initialState();s.day=1;s.clock='13:00';
 assert.match(renderWeChatHome(s,'/discover'),/data-label="朋友圈"/);
 assert.match(renderWeChatHome(s,'/me'),/data-label="朋友圈"/);
 const feed=renderMoments(s,'/moments');
 const profile=renderMoments(s,'/moments/profile/%E8%83%A1%E6%9E%AB');
 assert.match(feed,/wx-moments-post/);
 assert.match(feed,/data-action="wx-moment-profile"/);
 assert.match(profile,/置顶/);
 assert.match(profile,/仅展示最近三天/);
 assert.match(renderMoments(s,'/moments/compose'),/data-form="wx-moment-send"/);
 assert.match(renderMoments(s,'/moments/photo/zz-pin-design/0'),/zaizai-fashion-design/);
});

test('Design image and user avatar are shipped locally, never external links',()=>{
 const root=new URL('../public/apps/wechat/',import.meta.url);
 for(const name of ['avatars/originals/fulongsheng.jpeg','media/zaizai-fashion-design.webp',
  'media/moment-0.webp','media/moment-1.webp','media/moment-2.webp','media/moment-3.webp',
  'media/moment-4.webp','media/moment-5.webp','media/moment-cat-video.mp4'])
  assert.ok(existsSync(new URL(name,root)),name+' must be published');
 assert.match(momentImage('design'),/zaizai-fashion-design\.webp/);
 assert.match(pictureSrc('/apps/wechat/media/zaizai-fashion-design.webp'),/zaizai-fashion-design\.webp/);
 assert.ok(readFileSync(new URL('media/moment-cat-video.mp4',root)).length>10000);
});

test('Old accidental 2026 timestamp migrates to story clock but editor custom dates survive',()=>{
 const s=initialState();s.day=1;
 const c=s.content.conversations.wechat.find(c=>c.name==='仔仔');
 c.messages.push({id:'bad-2026',from:'仔仔',text:'不吃啦，肥死了。',time:'21:18',sentDate:'2026-10-26'});
 c.messages.push({id:'intentional',from:'仔仔',text:'未来',time:'17:00',sentDate:'2026-10-26',sentDateMode:'custom'});
 assert.equal(repairLegacyWechatDates(s),true);
 assert.equal(c.messages[0].sentDate,'2025-05-19');
 assert.equal(c.messages[0].legacySentDate,'2026-10-26');
 assert.equal(c.messages[1].sentDate,'2026-10-26');
 const mixed=[{id:'new',time:'12:00',sentDate:'2025-05-19'},{id:'old',time:'09:00',sentDate:'2025-04-20'}];
 assert.deepEqual(timestampGroups(mixed,s).map(x=>x.m.id),['old','new']);
});
