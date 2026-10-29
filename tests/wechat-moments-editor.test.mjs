import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {authoredMoments,visibleMoments} from '../src/apps/wechat/features/moments/data.js';
import {allMoments,findMoment,momentProfiles,editMoment,addMoment,removeMoment,addGameMomentComment,exportMomentPackage,importMomentPackage,momentDate} from '../src/apps/wechat/features/moments/model.js';
import {renderMoments} from '../src/apps/wechat/features/moments/index.js';
import {momentsEditor,changeMoments,inputMoments,handleMoments} from '../src/apps/developer/features/moments/index.js';

const ctxFor=s=>({store:{get:()=>s,update:fn=>fn(s)},router:{open:()=>{}},toast:()=>{}});

test('Editing built-in Moments preserves original data, 90-day schedule and privacy',()=>{
 const s=initialState(),original=authoredMoments.find(x=>x.id==='zz-d15');
 editMoment(s,'zz-d15',p=>{p.text='编辑之后的动态';p.storyDay=21;p.publishedAt='2025-06-08T18:35';p.pinned=false;});
 assert.equal(original.text,'猜猜谁该减肥了。');
 assert.equal(findMoment(s,'zz-d15').text,'编辑之后的动态');
 assert.equal(momentDate(21),'2025-06-08');
 assert.ok(!visibleMoments(allMoments(s),'2025-06-08',{clock:'18:34',includePinned:false}).some(x=>x.id==='zz-d15'));
 assert.ok(visibleMoments(allMoments(s),'2025-06-08',{clock:'18:35',includePinned:false}).some(x=>x.id==='zz-d15'));
 const id=addMoment(s,2);editMoment(s,id,p=>{p.text='新增的朋友圈';p.media=['data:image/jpeg;base64,YWJj'];});
 assert.match(renderMoments({...s,day:2,clock:'12:00'},'/moments'),/新增的朋友圈/);
 removeMoment(s,'zz-d15');assert.ok(!allMoments(s).some(x=>x.id==='zz-d15'));
});

test('Moments editor renders all posts and profile / media / reply controls',()=>{
 const s=initialState();s.editor.momentsMode='overview';
 assert.match(momentsEditor(s),/45 条/);
 assert.match(momentsEditor(s),/猜猜谁该减肥了。/);
 s.editor.momentsMode='edit';s.editor.momentsSelected='zz-d15';
 let html=momentsEditor(s);
 for(const text of ['定时发布','置顶','预设点赞','预设评论','熙蒙的预设回复','NPC 回复熙蒙','导出'])assert.ok(html.includes(text),text);
 s.editor.momentsMode='profile';
 html=momentsEditor(s);assert.match(html,/更换头像/);assert.match(html,/个性签名/);
 const ctx=ctxFor(s);
 inputMoments({dataset:{momentField:'bio'},value:'新签名'},ctx);
 assert.equal(momentProfiles(s)['熙蒙'].bio,'新签名');
 changeMoments({dataset:{momentField:'day'},value:'22'},ctx);
 assert.equal(findMoment(s,'zz-d15').storyDay,22);
});

test('Ximeng options, NPC conditional replies and self-contained export/import round-trip',()=>{
 const s=initialState(),ctx=ctxFor(s);s.editor.momentsSelected='hf-0519';
 handleMoments('mom-add-option',{dataset:{}},ctx);
 changeMoments({dataset:{momentOption:'0'},value:'我也想吃'},ctx);
 handleMoments('mom-add-rule',{dataset:{}},ctx);
 changeMoments({dataset:{momentRule:'trigger',index:'0'},value:'我也想吃'},ctx);
 changeMoments({dataset:{momentRule:'text',index:'0'},value:'给你留了一份'},ctx);
 assert.deepEqual(findMoment(s,'hf-0519').replyOptions,['我也想吃']);
 addGameMomentComment(s,'hf-0519','不是这个');
 assert.equal(s.content.moments.comments['hf-0519'].length,1);
 addGameMomentComment(s,'hf-0519','我也想吃');
 assert.equal(s.content.moments.comments['hf-0519'].length,3);
 assert.equal(s.content.moments.comments['hf-0519'][2].text,'给你留了一份');
 addGameMomentComment(s,'hf-0519','我也想吃');
 assert.equal(s.content.moments.comments['hf-0519'].filter(c=>c.text==='给你留了一份').length,1);
 editMoment(s,'hf-0519',p=>p.media=['data:image/jpeg;base64,YWJj']);
 const exported=JSON.parse(JSON.stringify(exportMomentPackage(s)));
 assert.equal(exported.posts.find(p=>p.id==='hf-0519').media[0],'data:image/jpeg;base64,YWJj');
 const restored=initialState();importMomentPackage(restored,exported);
 assert.deepEqual(findMoment(restored,'hf-0519').replyOptions,['我也想吃']);
 assert.equal(restored.content.moments.comments['hf-0519'],undefined); // Player state is not scripted content.
});
