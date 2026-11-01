import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {rebaseBundledPublicAsset} from '../src/services/public-assets.js';
import {wechatAvatars,resolveWeChatAvatar} from '../src/apps/wechat/avatars.js';
import {groupAvatar} from '../src/apps/wechat/components/group-avatar.js';
import {renderWeChatChat,pictureSrc} from '../src/apps/wechat/components/chat-view.js';
import {renderWeChatHome} from '../src/apps/wechat/components/views.js';
import {profiles,authoredMoments} from '../src/apps/wechat/features/moments/data.js';
import {momentImage,renderMoments} from '../src/apps/wechat/features/moments/index.js';
import {initialState} from '../src/services/storage.js';
import historical from '../src/story/assets/history-2024-mar-jun.media.json' with {type:'json'};

const root=fileURLToPath(new URL('../',import.meta.url));
const publicFile=relative=>path.join(root,'public',relative);
const verifyPublicUrl=url=>{
 assert.match(url,/^\//,'expected a local public URL: '+url);
 const marker=url.match(/\/(apps|assets|icons|wallpapers)\//);
 assert.ok(marker,'unrecognised image URL '+url);
 const file=url.slice(marker.index+1);
 assert.ok(existsSync(publicFile(file)),'missing bundled file '+file);
};

test('MIRAGE keeps its cartography and skull artwork in the actual Pages payload',()=>{
 const map=readFileSync(publicFile('apps/mirage/world-land.svg'),'utf8');
 assert.ok(map.length>50000);
 assert.match(map,/viewBox="0 0 1440 720"/);
 assert.match(map,/<path /);
 const css=readFileSync(path.join(root,'src/apps/mirage/styles.css'),'utf8');
 assert.match(css,/url\(['"]?\/apps\/mirage\/world-land\.svg/);
 assert.ok(existsSync(publicFile('apps/mirage/skull.svg')));
});

test('old saved WeChat images and photos are re-based to the active release',()=>{
 const base='/BBBTAI/releases/new-build/';
 const prev='/BBBTAI/releases/old-build/apps/wechat/avatars/originals/ximeng.jpeg';
 assert.equal(rebaseBundledPublicAsset(prev,{base}),base+'apps/wechat/avatars/originals/ximeng.jpeg');
 assert.equal(rebaseBundledPublicAsset('/apps/wechat/media/moment-0.webp',{base}),base+'apps/wechat/media/moment-0.webp');
 assert.equal(rebaseBundledPublicAsset('https://other.example/photo.jpg',{base}),'https://other.example/photo.jpg');
 assert.equal(rebaseBundledPublicAsset('data:image/png;base64,aGVsbG8=',{base}),'data:image/png;base64,aGVsbG8=');
 assert.equal(resolveWeChatAvatar('熙蒙','/BBBTAI/releases/outdated/apps/wechat/avatars/originals/ximeng.jpeg'),wechatAvatars['熙蒙']);
 assert.equal(momentImage('/BBBTAI/releases/outdated/apps/wechat/media/moment-0.webp'),momentImage('macau'));
 assert.equal(momentImage('https://example.org/photo.webp'),'https://example.org/photo.webp');
 const moduleUrl='https://zn546612432-cloud.github.io/BBBTAI/releases/new-build/src/apps/wechat/components/chat-view.js';
 assert.equal(pictureSrc('/BBBTAI/releases/outdated/apps/wechat/media/moment-0.webp',moduleUrl),'https://zn546612432-cloud.github.io'+base+'apps/wechat/media/moment-0.webp');
});

test('seven original avatars and group portraits are included and resolve on all WeChat screens',()=>{
 for(const [name,url] of Object.entries(wechatAvatars)){assert.ok(name);verifyPublicUrl(url);}
 const s=initialState(),older='/BBBTAI/releases/obsolete/apps/wechat/avatars/originals/xiwang.jpeg';
 s.characterAvatars={...s.characterAvatars,'熙旺':older};
 assert.ok(!renderWeChatChat(s,'wang').includes(older));
 assert.ok(!renderWeChatHome(s,'/contacts').includes(older));
 assert.ok(!renderWeChatHome(s,'/').includes(older));
 const group=s.content.conversations.wechat.find(c=>c.id==='group');
 const html=groupAvatar(group);
 assert.equal((html.match(/class="wx-group-cell"/g)||[]).length,6);
 assert.doesNotMatch(html,/old-build|obsolete/);
});

test('all authored Moment images, cover photos, videos and historical chat media are packaged',()=>{
 for(const post of authoredMoments){
  for(const image of post.media||[])verifyPublicUrl(momentImage(image));
  if(post.kind==='video')verifyPublicUrl(momentImage(post.video));
 }
 for(const [name,p] of Object.entries(profiles)){assert.ok(name);verifyPublicUrl(momentImage(p.cover));}
 for(const item of historical.assets){
  verifyPublicUrl(item.directUrl);
  if(item.posterUrl)verifyPublicUrl(item.posterUrl);
 }
 const s=initialState();s.day=3;s.clock='22:30';
 assert.match(renderMoments(s,'/moments'),/wx-moments/);
});

test('all literal source-image paths resolve to public files (no silent broken references)',()=>{
 const scan=(dir,files=[])=>{
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   if(entry.name==='legacy'||entry.name==='node_modules')continue;
   const full=path.join(dir,entry.name);
   if(entry.isDirectory())scan(full,files);
   else if(/\.(?:js|css|html|json)$/.test(entry.name))files.push(full);
  }
  return files;
 };
 const files=[...scan(path.join(root,'src')),path.join(root,'index.html')];
 const missing=[];
 const pattern=/(?:["'`(=])\/(apps|assets|wallpapers|icons)\/([a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif|mp4|mp3|wav))(?=[`'")?#]|\s|$)/g;
 for(const file of files){
  const source=readFileSync(file,'utf8');
  for(const match of source.matchAll(pattern)){
   const asset=match[1]+'/'+match[2];
   if(!existsSync(publicFile(asset)))missing.push(path.relative(root,file)+': '+asset);
  }
 }
 assert.deepEqual(missing,[]);
});
