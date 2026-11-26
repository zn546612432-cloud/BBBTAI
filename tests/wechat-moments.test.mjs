import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {initialState,repairLegacyWechatDates} from '../src/services/storage.js';
import {timestampGroups} from '../src/services/messaging/timestamps.js';
import {authoredMoments,visibleMoments} from '../src/apps/wechat/features/moments/data.js';
import {renderMoments,momentImage,avatarUrl,handleMoment,submitMoment} from '../src/apps/wechat/features/moments/index.js';
import {momentProfiles,findMoment,allMoments} from '../src/apps/wechat/features/moments/model.js';
import {stablePublicAssetBase} from '../src/services/public-assets.js';
import {wechatAvatars} from '../src/apps/wechat/avatars.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {pictureSrc} from '../src/apps/wechat/components/chat-view.js';
import {parsePresetPayload} from '../src/story/presets/io/format.js';

test('Moments expire 72 hours after posting; profile pins remain',()=>{
 const posts=visibleMoments(authoredMoments,'2025-05-19',{clock:'13:00',includePinned:false});
 assert.ok(posts.some(p=>p.id==='xw-0519'));
 assert.ok(!posts.some(p=>p.id==='xs-0519')); // Future, 23:05.
 assert.ok(posts.every(p=>p.publishedAt<='2025-05-19T13:00'));
 const justBefore=visibleMoments(authoredMoments,'2025-05-22',{clock:'07:29',includePinned:false});
 assert.ok(justBefore.some(p=>p.id==='xw-0519'));
 const atExpiry=visibleMoments(authoredMoments,'2025-05-22',{clock:'07:30',includePinned:false});
 assert.ok(!atExpiry.some(p=>p.id==='xw-0519'));
 const pinned=visibleMoments(authoredMoments,'2025-08-16',{author:'仔仔',clock:'23:59'});
 assert.ok(pinned.some(p=>p.id==='zz-d15'));
 assert.ok(!visibleMoments(authoredMoments,'2025-08-16',{clock:'23:59',includePinned:false}).some(p=>p.id==='zz-d15'));
});

test('Awei outfit, night photos and pinned training use the approved posts and bundled media',()=>{
 const find=id=>authoredMoments.find(p=>p.id===id);
 assert.equal(find('aw-d05').pinned,true);
 assert.deepEqual(find('aw-d05').media,['aweiTraining']);
 assert.deepEqual(find('aw-d17').media,[]);
 assert.deepEqual(find('aw-d24').media,['aweiStyle']);
 const mediaRoot=new URL('../public/apps/wechat/media/',import.meta.url);
 // Confirm the actual approved photos, not just their semantic media keys.
 for(const [key,file,sha] of [
  ['aweiTraining','awei-d05-training.webp','f468dfa3a89593f6a5b2f21a29e5055638afbddbdac6d105552f3a5e18d456f4'],
  ['aweiStyle','awei-d24-style.webp','0e6834fada361678b184b7eb1116896cbe9d9b97b4e3d744be89ac3c3963cb65']
 ]){
  assert.ok(momentImage(key).endsWith('/'+file));
  assert.equal(createHash('sha256').update(readFileSync(new URL(file,mediaRoot))).digest('hex'),sha);
 }
 assert.equal(find('aw-d17').text,'走在路上被健身房招去当教练，哈哈。');
 assert.deepEqual(find('aw-d24').likes,['仔仔','小辛','阿威','熙旺','胡枫']);
 assert.equal(find('aw-d24').publishedAt,'2025-06-11T17:20');
 assert.equal(find('aw-d29').text,'耍起！');
 assert.deepEqual(find('aw-d29').media,['aweiFriends']);
 assert.equal(find('aw-d39').pinned,undefined);
 assert.deepEqual(find('aw-d39').media,['aweiFountainFront','aweiFountainBack']);
 assert.deepEqual(visibleMoments(authoredMoments,'2025-07-12',{author:'阿威'}).filter(p=>p.pinned).map(p=>p.id),['aw-d05']);
 assert.deepEqual(authoredMoments.filter(p=>p.author==='阿威').map(p=>p.id),['aw-d05','aw-d17','aw-d24','aw-d29','aw-d39']);
 const s=initialState();s.content.moments={posts:[{id:'aw-d53',author:'阿威',storyDay:53},{id:'aw-d69',author:'阿威',storyDay:69}]};
 assert.deepEqual(allMoments(s).filter(p=>p.author==='阿威').map(p=>p.id),['aw-d05','aw-d17','aw-d24','aw-d29','aw-d39']);
});

test('D05 Xiao Xin selfie uses the approved caption and Hu Feng comment, including old saved defaults',()=>{
 const s=initialState(),post=findMoment(s,'xs-d05');
 assert.equal(post.text,'相册里有个人长得好帅，原来是我');
 assert.deepEqual(post.comments,[{by:'胡枫',text:'猪来的。'},{by:'小辛',text:'不接受反駁'}]);
 assert.deepEqual(post.likes,['仔仔','阿威']);
 s.content.moments={editedPosts:{'xs-d05':{...post,text:'今天這張我先發了。別又說我相冊全是自己。',comments:[{by:'胡枫',text:'你自己先說的'},post.comments[1],{by:'仔仔',text:'哈哈'}]}}};
 assert.equal(findMoment(s,'xs-d05').text,post.text);
 assert.deepEqual(findMoment(s,'xs-d05').comments,[...post.comments,{by:'仔仔',text:'哈哈'}]);
 s.content.moments.editedPosts['xs-d05'].text='自定义文案';
 assert.equal(findMoment(s,'xs-d05').text,'自定义文案');
});

test('D15 Zaizai pinned photo teases Xiao Xin only, including legacy saved comments',()=>{
 const s=initialState(),post=findMoment(s,'zz-d15');
 const approved=[
  {by:'熙旺',text:'小辛最近是不是又胖了'},
  {by:'小辛',text:'？？？我明明很輕好不好'},
  {by:'仔仔',to:'小辛',text:'下次你背我試試'}
 ];
 assert.equal(post.text,'猜猜谁该减肥了。');
 assert.deepEqual(post.media,['brothers']);
 assert.equal(post.publishedAt,'2025-06-02T18:35');
 assert.equal(post.pinned,true);
 assert.deepEqual(post.likes,['小辛']);
 assert.deepEqual(post.comments,approved);
 assert.ok(!post.comments.some(c=>c.by==='熙蒙'));
 const original={...post,comments:[
  {by:'熙蒙',text:'你说谁？'},
  {by:'熙旺',text:'我没说累'},
  {by:'小辛',text:'这题我不敢答'},
  {by:'胡枫',text:'玩家自訂留言'}
 ]};
 s.content.moments.editedPosts['zz-d15']=original;
 const migrated=findMoment(s,'zz-d15');
 assert.deepEqual(migrated.comments,[...approved,{by:'胡枫',text:'玩家自訂留言'}]);
 assert.equal(migrated.publishedAt,post.publishedAt);
 assert.deepEqual(migrated.media,post.media);
 assert.deepEqual(s.content.moments.editedPosts['zz-d15'].comments,original.comments,'migrate only at read time');
 s.content.moments.editedPosts['zz-d15']={...post,comments:[{by:'小辛',text:'自訂評論'}]};
 assert.deepEqual(findMoment(s,'zz-d15').comments,[{by:'小辛',text:'自訂評論'}]);
});

test('Both native WeChat entrances open Moments, which have complete media & profile views',()=>{
 const s=initialState();s.day=1;s.clock='13:00';
 assert.match(renderWeChatHome(s,'/discover'),/data-label="朋友圈"/);
 assert.match(renderWeChatHome(s,'/me'),/data-label="朋友圈"/);
 const feed=renderMoments(s,'/moments');
 const profile=renderMoments({...s,day:18},'/moments/profile/%E4%BB%94%E4%BB%94');
 assert.match(feed,/wx-moments-post/);
 assert.match(feed,/data-action="wx-moment-profile"/);
 assert.match(profile,/置顶/);
 assert.match(profile,/仅展示最近三天/);
 assert.match(renderMoments(s,'/moments/compose'),/data-form="wx-moment-send"/);
 assert.match(renderMoments({...s,day:15},'/moments/photo/zz-d15/0'),/user-ximeng-brothers/);
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


test('avatar paths are base-aware strings and privacy is shown only once on a profile',()=>{
 for(const [name,path] of Object.entries(wechatAvatars))assert.equal(avatarUrl(name),path);
 const s=initialState();s.day=1;s.clock='13:00';
 const profile=renderMoments(s,'/moments/profile/熙蒙');
 assert.doesNotMatch(profile,/仅展示最近三天的朋友圈/,'own profile keeps full history');
 assert.equal((renderMoments(s,'/moments/profile/小辛').match(/仅展示最近三天的朋友圈/g)||[]).length,1,'other profiles keep the three-day limit');
 assert.doesNotMatch(renderMoments(s,'/moments'),/仅三天可见|仅展示最近三天/);
});

test('ellipsis toggles one menu in place; like and unlike preserve prewritten reactions',()=>{
 const s=initialState();s.day=1;s.clock='23:30';
 let navigations=0;
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>navigations++},refresh:()=>{}};
 const target={dataset:{id:'xs-0519'}};
 let html=renderMoments(s,'/moments');assert.doesNotMatch(html,/role="group" aria-label="动态操作"/);
 handleMoment('wx-moment-actions',target,ctx);
 html=renderMoments(s,'/moments');assert.equal((html.match(/aria-label="动态操作"/g)||[]).length,1);assert.equal(navigations,0);
 handleMoment('wx-moment-like',target,ctx);assert.equal(s.content.moments.likes['xs-0519'],true);
 assert.doesNotMatch(renderMoments(s,'/moments'),/aria-label="动态操作"/);
 handleMoment('wx-moment-like',target,ctx);assert.notEqual(s.content.moments.likes['xs-0519'],true,'unliking clears the temporary like override');
 const post=authoredMoments.find(p=>p.id==='xs-0519');assert.equal(post.comments.length,2);
});

test('38 authored posts span D01–D90 with optional zero-comment posts and mixed media',()=>{
 assert.equal(authoredMoments.length,38);
 assert.equal(authoredMoments[0].storyDay,1);assert.equal(authoredMoments.at(-1).storyDay,90);
 // D23 Xiwang has five user-approved threaded replies; all other limits remain unchanged.
 assert.ok(authoredMoments.every(p=>p.storyDay>=1&&p.storyDay<=90&&(p.id==='xw-d23'?p.comments.length===5: ['xw-d03','aw-d29','xs-d51','hf-d12-homecoming'].includes(p.id)?p.comments.length===0:p.comments.length>=1&&p.comments.length<=4)));
 assert.ok(authoredMoments.some(p=>p.kind==='music'));
 assert.ok(authoredMoments.some(p=>p.kind==='video'));
 assert.ok(authoredMoments.some(p=>p.media.length===0));
 assert.ok(authoredMoments.some(p=>p.media.length>1));
 for(const post of authoredMoments)for(const media of post.media||[])assert.ok(momentImage(media),post.id+': '+media);
 const find=id=>authoredMoments.find(p=>p.id===id);
 assert.deepEqual(find('xw-0519').media,['morning']);
 assert.deepEqual(authoredMoments.filter(p=>p.author==='胡枫'||p.author==='胡楓').map(p=>p.id),['hf-d12-homecoming','hf-d41']);
 assert.deepEqual(find('xs-d04').media,['xmCaught']);
 assert.deepEqual(find('xw-d04').media,['xmDinner','dinnerDish']);
 assert.equal(find('xw-d04').text,'和阿蒙出來吃飯。');
 assert.deepEqual(find('xw-d04').comments,[{by:'小辛',text:'好啊你們，偷偷吃好的'},{by:'阿威',text:'下次叫我'}]);
 assert.deepEqual(find('zz-d15').media,['brothers']);
 assert.equal(find('zz-d15').author,'仔仔');
 assert.equal(authoredMoments.filter(p=>p.author==='仔仔').length,1);
 assert.ok(authoredMoments.filter(p=>p.author==='小辛'&&p.media.some(m=>m.startsWith('xiaoxin'))).length>=3);
 assert.ok(authoredMoments.filter(p=>p.likes?.includes('仔仔')).length>=8);
 assert.ok(!authoredMoments.some(p=>p.media.includes('shumai')||p.media.includes('design')||p.media.includes('fabric')));
 assert.deepEqual(find('xw-d70').media,['groupPhoto']);
 assert.deepEqual(find('xm-d78').media,['arcade']);
 const root=new URL('../public/apps/wechat/media/',import.meta.url);
 for(const p of authoredMoments)for(const media of p.media)assert.ok(existsSync(new URL(momentImage(media).split('/').at(-1),root)),p.id);
 assert.ok(existsSync(new URL('../src/story/presets/days/D078/wechat.json',import.meta.url)));
 const [chat]=parsePresetPayload(JSON.parse(readFileSync(new URL('../src/story/presets/days/D078/wechat.json',import.meta.url),'utf8')));
 assert.equal(chat.history[0].messages[0].text,'我哥真厉害！');
 assert.equal(chat.history[0].messages[1].kind,'image');
 assert.equal(chat.history[0].messages[1].from,'熙蒙');
 assert.equal(chat.history[0].messages[1].appearance,'game-time');
 assert.equal(chat.history[0].messages[1].sentDate,find('xm-d78').publishedAt.slice(0,10));
});

test('D41 Good Show photo appears at 23:35; four NPC likes and threaded comments appear on D42 at 02:00',()=>{
 const s=initialState();s.day=41;s.clock='23:34';
 const render=()=>renderMoments(s,'/moments');
 assert.doesNotMatch(render(),/good show\./);
 s.clock='23:35';
 assert.match(render(),/good show\./);
 assert.match(render(),/d41-hufeng-good-show\.jpeg/);
 assert.doesNotMatch(render(),/帅气逼人组合|原地出道|小辛、仔仔、阿威、熙旺/);
 s.day=42;s.clock='01:59';
 assert.doesNotMatch(render(),/帅气逼人组合|原地出道|小辛、仔仔、阿威、熙旺/);
 s.clock='02:00';
 const html=render();assert.match(html,/小辛、仔仔、阿威、熙旺/);
 assert.match(html,/仔仔：<\/strong>帅气逼人组合/);
 assert.match(html,/小辛 回复 仔仔：<\/strong>原地出道。/);
 assert.equal((html.match(/帅气逼人组合/g)||[]).length,1);
 assert.equal(render(),html);
 assert.match(renderMoments(s,'/moments/profile/胡枫'),/原地出道。/);
 assert.match(renderMoments(s,'/moments/photo/hf-d41/0'),/d41-hufeng-good-show\.jpeg/);
 assert.doesNotMatch(render(),/把桌面收拾干净/);
 s.content.moments={posts:[{id:'xm-d41',author:'熙蒙',storyDay:41,publishedAt:'2025-06-28T23:40',text:'把桌面收拾干净，明天再继续。'}]};
 assert.equal(findMoment(s,'xm-d41'),undefined);
 assert.doesNotMatch(render(),/把桌面收拾干净/);
});

test('D06 sunset video respects publication time and remains playable through the profile pin after feed expiry',()=>{
 const s=initialState();s.day=6;s.clock='18:23';
 assert.doesNotMatch(renderMoments(s,'/moments/profile/小辛'),/查看置顶动态/);
 s.clock='18:24';
 assert.match(renderMoments(s,'/moments'),/一起看个日落叭/);
 assert.match(renderMoments(s,'/moments/profile/小辛'),/data-action="wx-moment-focus" data-id="xs-d06"/);
 s.day=12;
 assert.doesNotMatch(renderMoments(s,'/moments'),/一起看个日落叭/);
 assert.match(renderMoments(s,'/moments/profile/小辛'),/d06-xiaoxin-sunset-cover.webp/);
 let next;
 const ctx={store:{get:()=>s},router:{open:route=>next=route}};
 handleMoment('wx-moment-focus',{dataset:{id:'xs-d06'}},ctx);
 const detail=renderMoments(s,next.route);
 for(const text of ['一起看个日落叭','熙蒙、熙旺、胡枫、仔仔、阿威','仔仔：</strong>你什么时候拍的？！！','小辛 回复 仔仔：</strong>🕶️路过黑沙滩不得不来整一下','胡枫：</strong>这么韩，过来韩国陪我','小辛 回复 胡枫：</strong>给我买头等舱机票我全天候可✈️'])assert.ok(detail.includes(text),text);
 handleMoment('wx-moment-video',{dataset:{id:'xs-d06'}},ctx);
 const player=renderMoments(s,next.route);
 assert.match(player,/<video controls autoplay playsinline/);
 assert.match(player,/d06-xiaoxin-sunset.mp4/);
 for(const asset of ['d06-xiaoxin-sunset.mp4','d06-xiaoxin-sunset-cover.webp'])assert.ok(existsSync(new URL('../public/apps/wechat/media/'+asset,import.meta.url)));
 assert.equal(renderMoments(s,'/moments/comment/xs-d06'),detail);
});


test('Moments use the stable site media directory even when older release folders disappear',()=>{
 const module='https://example.test/BBBTAI/releases/0123456789abcdef/src/services/public-assets.js';
 assert.equal(stablePublicAssetBase(module),'/BBBTAI/');
 assert.equal(stablePublicAssetBase(module.replace('/BBBTAI/','/BBBTAI/preview/')),'/BBBTAI/preview/');
 const base='/BBBTAI/';
 assert.equal(momentImage('morning',{base}),base+'apps/wechat/media/macau-morning.webp');
 assert.equal(momentImage('/BBBTAI/releases/0123456789abcdef/apps/wechat/media/macau-morning.webp',{base}),base+'apps/wechat/media/macau-morning.webp');
 assert.equal(momentImage(base+'apps/wechat/media/macau-morning.webp',{base}),base+'apps/wechat/media/macau-morning.webp');
 assert.ok(existsSync(new URL('../public/apps/wechat/media/ximeng-moments-cover.webp',import.meta.url)));
});

test('approved Jack Moments cover, empty signature and greeting update preserve other player edits',()=>{
 const s=initialState();s.day=1;s.clock='13:00';
 s.content.moments={profiles:{'熙蒙':{bio:'别打电话，在工房。',cover:'harbor'}},editedPosts:{'xw-0519':{...authoredMoments.find(p=>p.id==='xw-0519'),text:'早上好。今天的云很好看。'}}};
 const profile=momentProfiles(s)['熙蒙'];
 assert.equal(profile.bio,'');assert.equal(profile.cover,'ximengCover');
 assert.equal(findMoment(s,'xw-0519').text,'今天的云很好看。');
 assert.deepEqual(findMoment(s,'xw-0519').likes,['小辛','阿威']);
 assert.deepEqual(findMoment(s,'xw-0519').comments,[{by:'阿威',text:'天气真好'}]);
 assert.equal(momentProfiles(s)['熙旺'].bio,'平安是福');
 const html=renderMoments(s,'/moments');
 assert.match(html,/ximeng-moments-cover\.webp/);assert.match(html,/macau-morning\.webp/);
 assert.doesNotMatch(html,/别打电话，在工房。|早上好。/);
 s.content.moments.profiles['熙蒙'].bio='本人自己写的签名';
 assert.equal(momentProfiles(s)['熙蒙'].bio,'本人自己写的签名');
});

test('D11 street without photo, D12 Hu Feng homecoming and D13 cleanup use exact approved copy',()=>{
 const s=initialState(),find=id=>findMoment(s,id);
 const xw=find('xw-d11'),hf=find('hf-d12-homecoming'),xm=find('xm-d13');
 assert.equal(xw.text,'出车前的街道，安静得像还没醒。');
 assert.deepEqual(xw.media,[]);
 assert.deepEqual(xw.comments,[{by:'熙蒙',text:'路上小心'}]);
 assert.equal(hf.publishedAt,'2025-05-30T15:00');
 assert.equal(hf.text,'집에 간다. 마카오가 그리웠어.');
 assert.deepEqual(hf.media,['hufengD12Homecoming']);
 assert.equal(hf.author,'胡枫');
 assert.ok(momentImage('hufengD12Homecoming').endsWith('/hufeng-d12-homecoming.webp'));
 assert.deepEqual(xm.media,[]);
 assert.equal(xm.text,'我讨厌大扫除');
 assert.deepEqual(xm.likes,['小辛','仔仔']);
 assert.deepEqual(xm.comments,[{by:'仔仔',text:'可是蒙哥你的东西都是我们帮你搬的！'},{by:'熙蒙',text:'我站在那里也累到了'}]);
 assert.ok(!visibleMoments(authoredMoments,'2025-05-30',{clock:'14:59'}).some(p=>p.id==='hf-d12-homecoming'));
 assert.ok(visibleMoments(authoredMoments,'2025-05-30',{clock:'15:00'}).some(p=>p.id==='hf-d12-homecoming'));
 // Old editor snapshots must not restore retired default copy or media.
 s.content.moments={editedPosts:{
  'xw-d11':{...xw,media:['macau']},
  'xm-d13':{...xm,text:'新灯装上了。看起来不像临时工房了。',comments:[{by:'熙旺',text:'早点睡'},{by:'胡枫',text:'上次你也这么说'},{by:'小辛',text:'哈哈'}],likes:[]}
 }};
 assert.deepEqual(find('xw-d11').media,[]);
 assert.equal(find('xm-d13').text,xm.text);
 assert.deepEqual(find('xm-d13').comments,[...xm.comments,{by:'小辛',text:'哈哈'}]);
 assert.deepEqual(find('xm-d13').likes,xm.likes);
});
