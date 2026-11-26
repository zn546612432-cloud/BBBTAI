import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {publishPlayerMoment,deletePlayerMoment,findMoment,momentProfiles,updatePlayerMomentImage,editableMoments,unreadMomentInteractions,markMomentInteractionsRead} from '../src/apps/wechat/features/moments/model.js';
import {renderMoments,handleMoment,submitMoment} from '../src/apps/wechat/features/moments/index.js';
import {scheduleMomentReactions,tickMomentReactions,momentReactionsDue} from '../src/apps/wechat/features/moments/reactions.js';
import {momentsCommentMessages,parseMomentComment,MOMENTS_PEOPLE} from '../src/services/ai/moments-comments.js';
import {handle as musicHandle} from '../src/apps/music/index.js';
const loc=route=>({appId:'wechat',route,params:{}});
function setup(){
 let s=activateStory55(initialState());s.day=23;s.clock='12:00';s.nav={current:loc('/moments'),stack:[loc('/discover')]};
 const store={get:()=>s,update(fn){s=structuredClone(s);fn(s);return s;}};
 return {store,router:{open(next){store.update(x=>{x.nav.stack.push(x.nav.current);x.nav.current={...next,params:next.params||{}};});},back(){store.update(x=>{x.nav.current=x.nav.stack.pop()||loc('/discover');});}},refresh(){},toast(){},pickImage(fn){fn('data:image/png;base64,YWJj');}};
}
function publish(c,text){const Original=globalThis.FormData;globalThis.FormData=class{get(k){return k==='text'?text:'public';}};try{submitMoment({dataset:{form:'wx-moment-send'}},c);}finally{globalThis.FormData=Original;}}
test('player publish returns to feed; Back reaches Discover, not the composer',()=>{
 const c=setup();handleMoment('wx-moment-compose',{dataset:{}},c);publish(c,'試一試');
 assert.equal(c.store.get().nav.current.route,'/moments');assert.deepEqual(c.store.get().nav.stack.map(x=>x.route),['/discover']);
 assert.match(renderMoments(c.store.get(),'/moments'),/試一試/);c.router.back();assert.equal(c.store.get().nav.current.route,'/discover');
});
test('delete is owner-only, cleans jobs and notifications; own history remains visible',()=>{
 const c=setup();let p;c.store.update(s=>{p=publishPlayerMoment(s,{text:'測試'});scheduleMomentReactions(s,p,{random:()=>.9});s.notifications.push({id:'hyq-test',momentPostId:p.id});});
 assert.ok(c.store.get().content.moments.reactionJobs.length);assert.equal(deletePlayerMoment(c.store.get(),'xs-d05'),false);
 c.store.update(s=>{s.day=30;});assert.match(renderMoments(c.store.get(),'/moments/profile/'+encodeURIComponent('熙蒙')),/測試/);
 c.store.update(s=>assert.equal(deletePlayerMoment(s,p.id),true));assert.equal(findMoment(c.store.get(),p.id),undefined);assert.ok(!c.store.get().content.moments.reactionJobs.some(j=>j.postId===p.id));assert.ok(!c.store.get().notifications.some(n=>n.momentPostId===p.id));
});
test('own avatar and cover save to the existing shared profile',()=>{const c=setup(),src='data:image/png;base64,YWJj';c.store.update(s=>{assert.equal(updatePlayerMomentImage(s,'avatar',src),true);assert.equal(updatePlayerMomentImage(s,'cover',src),true);});assert.equal(momentProfiles(c.store.get())['熙蒙'].cover,src);assert.equal(c.store.get().characterAvatars['熙蒙'],src);assert.notEqual(momentProfiles(c.store.get())['小辛'].cover,src);});
test('public reactions are whitelisted and unique; private posts remain private',async()=>{
 const c=setup();let post,secret;c.store.update(s=>{post=publishPlayerMoment(s,{text:'今天去玩。'});scheduleMomentReactions(s,post,{random:()=>.9});secret=publishPlayerMoment(s,{text:'private',privacy:'private'});assert.equal(scheduleMomentReactions(s,secret,{random:()=>.9}),false);});
 c.store.update(s=>{s.clock='13:00';});let calls=0;for(let i=0;i<12;i++)await tickMomentReactions(c.store,{request:async input=>{assert.ok(MOMENTS_PEOPLE.includes(input.by));calls++;return '走啊';}});
 const s=c.store.get(),m=s.content.moments;assert.equal(m.reactionJobs.length,0);assert.ok(findMoment(s,post.id).likes.length);assert.ok(m.comments[post.id].length);assert.equal(m.comments[secret.id],undefined);assert.equal(new Set(m.interactions.map(x=>x.id)).size,m.interactions.length);assert.ok(calls<=3&&calls>0);assert.ok(unreadMomentInteractions(s)>0);
 c.store.update(x=>markMomentInteractionsRead(x,post.id));assert.equal(unreadMomentInteractions(c.store.get()),0);
});
test('late AI reply cannot resurrect a deleted post',async()=>{const c=setup();let id;c.store.update(s=>{const p=publishPlayerMoment(s,{text:'x'});id=p.id;p.reactionPolicy=2;editableMoments(s).reactionJobs=[{id:'late',postId:id,by:'熙旺',kind:'comment',due:0}];});let finish;const result=tickMomentReactions(c.store,{request:()=>new Promise(resolve=>{finish=resolve;})});c.store.update(s=>deletePlayerMoment(s,id));finish('嗯');await result;assert.equal(findMoment(c.store.get(),id),undefined);assert.equal(c.store.get().content.moments.comments[id],undefined);});
test('music shares support empty caption and the native inline player',()=>{const c=setup();c.store.update(s=>{s.musicTrack='melatonin';s.nav={current:{appId:'music',route:'/',params:{}},stack:[]};});musicHandle('music-share-hyq',{dataset:{}},c);assert.equal(c.store.get().nav.current.route,'/moments/compose');assert.match(renderMoments(c.store.get(),'/moments/compose'),/褪黑素/);publish(c,'');const s=c.store.get(),p=s.content.moments.posts.at(-1);assert.equal(p.music.trackId,'melatonin');assert.equal(p.text,'');assert.match(renderMoments(s,'/moments'),/wx-moment-music/);assert.equal(s.nav.current.route,'/moments');c.router.back();assert.equal(c.store.get().nav.current.route,'/discover');});
test('AI prompt cannot impersonate excluded roles; optional silence is valid',()=>{const input={by:'仔仔',day:23,clock:'13:00',post:{text:'穿哪件衣服？'}};assert.equal(momentsCommentMessages(input).length,2);assert.throws(()=>momentsCommentMessages({...input,by:'熙泰'}));assert.throws(()=>momentsCommentMessages({...input,by:'傅隆生'}));assert.equal(parseMomentComment({text:'{"text":"__SKIP__"}'}),'');assert.equal(parseMomentComment({text:'{"text":"黑色那件！"}'}),'黑色那件！');});

const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR3sAAAAASUVORK5CYII=';
test('photo-only posts use one Flash description for all Pro commenters, including after saving',async()=>{
 const c=setup();let id;
 c.store.update(s=>{const p=publishPlayerMoment(s,{image:photo});id=p.id;scheduleMomentReactions(s,p,{random:()=>.9});s.clock='13:00';});
 let scans=0,replies=0;const recognize=async image=>{assert.equal(image,photo);scans++;return '一張白色的小圖片';};
 const request=async input=>{assert.equal(input.post.photoDescription,'一張白色的小圖片');assert.ok(!JSON.stringify(input).includes('base64,'));replies++;return '這是什麼';};
 for(let i=0;i<12;i++)await tickMomentReactions(c.store,{recognize,request});
 assert.equal(scans,1);assert.equal(replies,3);assert.equal(findMoment(c.store.get(),id).imageVision.status,'ready');
 c.store.update(s=>{const p=publishPlayerMoment(s,{image:photo});editableMoments(s).reactionJobs.push({id:'again',postId:p.id,by:'小辛',kind:'comment',due:0});});
 await tickMomentReactions(c.store,{recognize,request});assert.equal(scans,1);assert.equal(replies,4);
});
test('private images never reach Flash; failed vision never invents a photo comment',async()=>{
 const c=setup();let id;
 c.store.update(s=>{const p=publishPlayerMoment(s,{image:photo,privacy:'private'});assert.equal(scheduleMomentReactions(s,p,{random:()=>.9}),false);editableMoments(s).reactionJobs=[{id:'private',postId:p.id,by:'小辛',kind:'comment',due:0}];});
 await tickMomentReactions(c.store,{recognize:()=>assert.fail('private image leaked'),request:()=>assert.fail('private comment')});
 c.store.update(s=>{const p=publishPlayerMoment(s,{image:photo});id=p.id;p.reactionPolicy=2;editableMoments(s).reactionJobs=['小辛','仔仔'].map(by=>({id:by,postId:id,by,kind:'comment',due:0}));});
 let calls=0;for(let i=0;i<2;i++)await tickMomentReactions(c.store,{recognize:async()=>{calls++;throw Error('offline');},request:()=>assert.fail('invented photo comment')});
 assert.equal(calls,1);assert.equal(findMoment(c.store.get(),id).imageVision.status,'failed');assert.equal(c.store.get().content.moments.comments[id],undefined);
});
test('deleting a public photo during Flash prevents Pro delivery and cache resurrection',async()=>{
 const c=setup();let id,finish,started;
 const ready=new Promise(r=>started=r);
 c.store.update(s=>{const p=publishPlayerMoment(s,{image:photo});id=p.id;p.reactionPolicy=2;editableMoments(s).reactionJobs=[{id:'late-image',postId:id,by:'小辛',kind:'comment',due:0}];});
 const work=tickMomentReactions(c.store,{recognize:()=>{started();return new Promise(r=>finish=r);},request:()=>assert.fail('deleted post sent to Pro')});
 await ready;c.store.update(s=>deletePlayerMoment(s,id));finish('照片');await work;assert.equal(findMoment(c.store.get(),id),undefined);
});
test('vision gateway fixes the Flash model, validates inline data and bounds Pro context',async()=>{
 const {momentsVisionRequest,momentsVisionDescription}=await import('../supabase/functions/tai-provider-gateway/moments-vision.js');
 const r=momentsVisionRequest(photo);assert.equal(r.model,'deepseek-flash');assert.equal(r.messages[1].content[1].image_url.url,photo);
 assert.throws(()=>momentsVisionRequest('https://example.com/a.png'));assert.throws(()=>momentsVisionRequest('data:image/png;base64,YWJj'));
 assert.equal(momentsVisionDescription({choices:[{message:{content:'桌上有一杯茶'}}]}),'桌上有一杯茶');
 const messages=momentsCommentMessages({by:'小辛',day:23,clock:'12:00',post:{text:'字'.repeat(1200),photoDescription:'茶'.repeat(400)},thread:Array(12).fill({by:'仔仔',text:'字'.repeat(300)}),examples:Array(6).fill('字'.repeat(300))});
 assert.ok(messages[1].content.length<=2100);assert.equal(JSON.parse(messages[1].content).post.photoDescription.length,400);
});

test('minimum one like and one comment candidate; first like is due in 1–3 game minutes',async()=>{
 const c=setup();let id;
 c.store.update(s=>{const p=publishPlayerMoment(s,{text:'你好'});id=p.id;scheduleMomentReactions(s,p,{random:()=>0});});
 const s=c.store.get(),jobs=s.content.moments.reactionJobs,minute=(s.day-1)*1440+720;
 assert.equal(jobs.filter(j=>j.kind==='like').length,1);
 assert.equal(jobs.filter(j=>j.kind==='comment').length,1);
 assert.equal(jobs.find(j=>j.kind==='like').due,minute+1);
 c.store.update(s=>{s.clock='12:01';});
 await tickMomentReactions(c.store,{request:()=>assert.fail('likes never call AI')});
 assert.equal(findMoment(c.store.get(),id).likes.length,1);
});
test('maximum five likes and three comment candidates; D55 excludes dead brother',()=>{
 const c=setup();c.store.update(s=>{
  s.day=55;s.clock='20:00';const p=publishPlayerMoment(s,{text:'今天'});scheduleMomentReactions(s,p,{random:()=>.9999});
  const jobs=s.content.moments.reactionJobs;assert.equal(jobs.filter(j=>j.kind==='like').length,4);assert.equal(jobs.filter(j=>j.kind==='comment').length,3);assert.ok(!jobs.some(j=>j.by==='熙旺'));
 });
});
test('today’s old unliked public posts get one repair only; private and historical posts remain unchanged',async()=>{
 const c=setup();let old,today,secret;
 c.store.update(s=>{s.day=22;old=publishPlayerMoment(s,{text:'昨天'}).id;s.day=23;today=publishPlayerMoment(s,{text:'你好'}).id;secret=publishPlayerMoment(s,{text:'private',privacy:'private'}).id;});
 assert.equal(momentReactionsDue(c.store.get()),true);
 await tickMomentReactions(c.store);
 const jobs=c.store.get().content.moments.reactionJobs;
 assert.equal(jobs.filter(j=>j.postId===today&&j.kind==='like').length,1);assert.ok(!jobs.some(j=>j.postId===old||j.postId===secret));
 await tickMomentReactions(c.store);assert.equal(c.store.get().content.moments.reactionJobs.length,1);
 c.store.update(s=>{s.clock='12:03';});await tickMomentReactions(c.store);assert.equal(findMoment(c.store.get(),today).likes.length,1);
});
test('shared picker lists only saved game photos, handles empty album and rejects forged IDs',async()=>{
 const {gameAlbumPhotos,openGamePhotoPicker,renderGamePhotoPicker,handleGamePhotoPicker,snapshotGamePhoto}=await import('../src/apps/photos/features/picker/index.js');
 const c=setup();let selected=null;c.store.update(s=>{s.content.photos=[];});
 openGamePhotoPicker(c,p=>selected=p);assert.match(renderGamePhotoPicker(c.store.get()),/暫無照片/);
 handleGamePhotoPicker('game-photo-cancel',{dataset:{}},c);
 c.store.update(s=>{s.content.photos=[{id:'real',src:photo,title:'相冊照片'},{id:'story',src:'/apps/wechat/media/d03-breakfast.webp'},{id:'video',src:'/apps/wechat/media/example.mp4'},{id:'external',src:'https://example.com/test.png'}];});
 assert.deepEqual(gameAlbumPhotos(c.store.get()).map(p=>p.id),['real','story']);
 openGamePhotoPicker(c,p=>selected=p);assert.doesNotMatch(renderGamePhotoPicker(c.store.get()),/手机相册选择|手機相冊選擇/);
 handleGamePhotoPicker('game-photo-select',{dataset:{id:'forged'}},c);assert.equal(selected,null);
 openGamePhotoPicker(c,p=>selected=p);handleGamePhotoPicker('game-photo-select',{dataset:{id:'real'}},c);assert.equal(selected.id,'real');assert.equal(await snapshotGamePhoto(selected),photo);
});
test('WeChat composer and chat select photos through the same album picker, never native import',async()=>{
 const {handle,render}=await import('../src/apps/wechat/index.js');
 const c=setup();c.pickImage=()=>assert.fail('native picker is only for Photos import');
 c.store.update(s=>{s.content.photos=[{id:'real',src:photo,title:'遊戲相冊'}];});
 handleMoment('wx-moment-compose',{dataset:{}},c);
 const previous=globalThis.document;globalThis.document={querySelector:()=>null};
 try{handle('wx-moment-add-image',{dataset:{}},c);}finally{globalThis.document=previous;}
 assert.match(render(c,c.store.get().nav.current),/data-action="game-photo-select"/);
 handle('game-photo-select',{dataset:{id:'real'}},c);await Promise.resolve();await Promise.resolve();
 assert.equal(c.store.get().content.moments.draft.image,photo);publish(c,'');
 const p=c.store.get().content.moments.posts.at(-1);c.store.update(s=>{s.content.photos=[];});
 assert.equal(findMoment(c.store.get(),p.id).media[0],photo);
 c.store.update(s=>{s.nav.current=loc('/chat/wang');s.content.photos=[{id:'real',src:photo}];});
 handle('attach-chat',{dataset:{id:'wang'}},c);
 assert.match(render(c,c.store.get().nav.current),/game-photo-select/);
 handle('game-photo-select',{dataset:{id:'real'}},c);await Promise.resolve();await Promise.resolve();
 assert.equal(c.store.get().content.conversations.wechat.find(x=>x.id==='wang').messages.at(-1).text,photo);
});
