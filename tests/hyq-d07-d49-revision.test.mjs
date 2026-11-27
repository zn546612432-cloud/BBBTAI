import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {authoredMoments} from '../src/apps/wechat/features/moments/data.js';
import {allMoments,momentDate} from '../src/apps/wechat/features/moments/model.js';
import {renderMoments,momentImage} from '../src/apps/wechat/features/moments/index.js';
import {matchingTracks,trackById} from '../src/apps/music/features/shared/catalog.js';
import {addPlaylistTrack,playlistTracks} from '../src/apps/music/features/library/playlist.js';

const by=id=>authoredMoments.find(post=>post.id===id);
test('D49 moon image, 5 non-author likes, one comment and inline SEVENTEEN card',()=>{
 const p=by('xw-d49');
 assert.equal(p.text,'');
 assert.deepEqual(p.media,['d49Moon']);
 assert.deepEqual(p.likes,['熙蒙','小辛','仔仔','阿威','胡枫']);
 assert.deepEqual(p.comments,[{by:'胡枫',text:'好看好看。'}]);
 assert.equal(p.music.trackId,'fuck-my-life');
 const s=initialState();s.day=49;s.clock='08:25';
 const html=renderMoments(s,'/moments');
 assert.match(html,/d49-xiwang-moon\.webp/);
 assert.match(html,/fuck-my-life-cover\.webp/);
 assert.match(html,/data-action="wx-moment-music" data-id="xw-d49"/);
 assert.match(html,/胡枫：<\/strong>好看好看<\/button>/);
 assert.ok(existsSync('public'+momentImage('d49Moon')));
});

test('D07 changes only the music to the user-supplied FML audio and shared catalog',()=>{
 const d07=by('xs-d07');
 assert.equal(d07.text,'这首才叫真正的音乐。今天循环到耳机发烫。');
 assert.equal(d07.music.trackId,'fuck-my-life');
 assert.equal(by('xw-d49').music.trackId,d07.music.trackId);
 const track=trackById('fuck-my-life');
 assert.equal(track.title,'fu*k my life');
 assert.equal(track.artist,'SEVENTEEN');
 assert.equal(track.duration,205);
 assert.match(track.src,/fuck-my-life\.mp3$/);
 assert.match(track.cover,/fuck-my-life-cover\.webp$/);
 for(const q of ['fu*k my life','F*ck My Life','FML','Seventeen'])
  assert.equal(matchingTracks(q).find(x=>x.id==='fuck-my-life')?.id,track.id);
 const audio=readFileSync('public'+track.src);
 assert.ok(audio.length>1000000,'audio must be the full song, not a placeholder');
 assert.equal(audio.subarray(0,3).toString(),'ID3');
 assert.ok(existsSync('public'+track.cover));
 const s=initialState();s.day=7;s.clock='22:14';
 const html=renderMoments(s,'/moments');
 assert.match(html,/data-action="wx-moment-music" data-id="xs-d07"/);
 assert.match(html,/fuck-my-life-cover\.webp/);
 addPlaylistTrack(s,track.id);
 assert.equal(playlistTracks(s).find(x=>x.id===track.id)?.id,track.id);
 addPlaylistTrack(s,track.id);
 assert.equal(s.musicPlaylist.filter(id=>id===track.id).length,1);
});

test('D25 selfie and D35 caption use the approved assets and dialogue',()=>{
 assert.deepEqual(by('xs-d25').media,['xiaoxinD25Selfie']);
 assert.ok(momentImage('xiaoxinD25Selfie').endsWith('/d25-xiaoxin-selfie.webp'));
 assert.ok(existsSync('public'+momentImage('xiaoxinD25Selfie')));
 assert.equal(by('xw-d35').text,'原來澳門真的有大熊貓');
 assert.equal(by('xs-d05').comments.at(-1).text,'不接受反駁');
});

test('D51 stays Traditional Chinese and fried chicken, and D55 deleted even in old saved copies',()=>{
 const p=by('xs-d51');
 assert.equal(p.text,'愛上你 是命是病 是明知得不到的回應\n\n我最親愛的炸雞🍗');
 assert.deepEqual(p.likes,[]);
 assert.deepEqual(p.comments,[]);
 assert.equal(by('xs-d55'),undefined);
 const s=initialState();
 s.content.moments={editedPosts:{'xs-d51':{...p,text:'爱上你 是命是病 是明知得不到的回应 我最亲爱的炸鸡'}},
  posts:[{id:'xs-d55',storyDay:55,author:'小辛',publishedAt:'2025-07-12T23:31',text:'半夜刷到这个直接笑醒了。'}]};
 assert.equal(allMoments(s).find(x=>x.id==='xs-d51')?.text,p.text);
 assert.equal(allMoments(s).find(x=>x.id==='xs-d55'),undefined);
});

test('Awei HYQ contains only previously approved dates and no unapproved 2024 D17 photograph',()=>{
 const p=authoredMoments.filter(post=>post.author==='阿威');
 assert.deepEqual(p.map(x=>x.storyDay),[5,17,24,29,39]);
 assert.equal(p[0].pinned,true);
 assert.deepEqual(p[1].media,[]);
 assert.deepEqual(p[2].media,['aweiStyle']);
 assert.deepEqual(p[3].media,['aweiFriends']);
 assert.deepEqual(p[4].media,['aweiFountainFront','aweiFountainBack']);
 for(const post of p)for(const id of post.media)
  assert.ok(existsSync('public'+momentImage(id)),post.id+': '+id);
});
