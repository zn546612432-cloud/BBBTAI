import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {authoredMoments} from '../src/apps/wechat/features/moments/data.js';
import {allMoments} from '../src/apps/wechat/features/moments/model.js';
import {renderMoments} from '../src/apps/wechat/features/moments/index.js';

const authored=()=>authoredMoments.find(p=>p.id==='xw-d23');
const approved=[
 {by:'阿威',text:'你什么时候接这种业务了？'},
 {by:'熙旺',to:'阿威',text:'蒙蒙抽奖抽到的，我们又没时间吃，卖给游客好了'},
 {by:'小辛',text:'我想吃'},
 {by:'胡枫',to:'小辛',text:'再吃你要变成小猪了'},
 {by:'小辛',to:'胡枫',text:'我可以当最帅的小猪'}
];

test('D23 Xiwang voucher moment uses exact confirmed text, reply order and original photo/time',()=>{
 const p=authored();
 assert.equal(p.text,'帮人代出咖啡苑餐券，6折');
 assert.equal(p.author,'熙旺');
 assert.equal(p.storyDay,23);
 assert.match(p.publishedAt,/T12:28$/);
 assert.deepEqual(p.media,['fountain']);
 assert.deepEqual(p.comments,approved);
 assert.equal(p.comments.some(c=>c.by==='熙蒙'),false);
 const s=initialState();s.day=23;s.clock='15:48';
 const html=renderMoments(s,'/moments');
 assert.match(html,/帮人代出咖啡苑餐券，6折/);
 for(const line of approved)assert.ok(html.includes(line.text),line.text);
 assert.match(html,/熙旺 回复 阿威/);
 assert.match(html,/胡枫 回复 小辛/);
 assert.match(html,/小辛 回复 胡枫/);
 assert.doesNotMatch(html,/窗边这个位置|你不是说只喝杯茶|风景真好/);
});

test('D23 previous authored snapshots migrate without replacing player comments or custom edits',()=>{
 const p=authored(),s=initialState();
 const legacy={...structuredClone(p),text:'窗边这个位置，能坐一下午。',
  comments:[{by:'熙蒙',text:'你不是说只喝杯茶？'},{by:'阿威',text:'风景真好'},{by:'熙蒙',to:'熙旺',text:'玩家自己留下的留言'}]};
 s.content.moments={editedPosts:{'xw-d23':legacy}};
 const latest=allMoments(s).find(x=>x.id==='xw-d23');
 assert.equal(latest.text,p.text);
 assert.deepEqual(latest.comments,[...approved,legacy.comments[2]]);
 assert.equal(latest.media[0],'fountain');
 assert.match(latest.publishedAt,/T12:28$/);
 assert.equal(s.content.moments.editedPosts['xw-d23'].text,'窗边这个位置，能坐一下午。',
  'project current authored defaults on read, without mutating the saved editor record');
 const custom={...legacy,text:'我的自定义正文',comments:[{by:'阿威',text:'自定义评论'}],media:['custom-media'],publishedAt:'2025-06-10T15:30'};
 s.content.moments.editedPosts['xw-d23']=custom;
 const unchanged=allMoments(s).find(x=>x.id==='xw-d23');
 assert.equal(unchanged.text,'我的自定义正文');
 assert.deepEqual(unchanged.comments,custom.comments);
 assert.deepEqual(unchanged.media,['custom-media']);
 assert.equal(unchanged.publishedAt,'2025-06-10T15:30');
});
