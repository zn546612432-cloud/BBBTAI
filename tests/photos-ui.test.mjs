import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {render,handle,manifest} from '../src/apps/photos/index.js';
import {renderLibrary} from '../src/apps/photos/features/library/index.js';
import {renderCollections} from '../src/apps/photos/features/collections/index.js';
import {samplePhotos,sampleCount,allPhotos} from '../src/apps/photos/data/demo.js';
import {selection,resetSelection,handleSelection} from '../src/apps/photos/features/selection/index.js';
import {isPhotosTabSwitch,isNativeTabSwitch} from '../src/system/navigation.js';
import {initialState} from '../src/services/storage.js';

const state=initialState(),ctx={store:{get:()=>state}};
test('photos is an independent registered app and two stable first-level views',()=>{
 assert.equal(manifest.id,'photos');
 for(const [route,title] of [['/','图库'],['/collections','精选集']]){
  const html=render(ctx,{route,params:{}});
  assert.match(html,new RegExp(`<main class="ph-screen is-${route==='/'?'library':'collections'}`));
  assert.match(html,new RegExp(`<h1>${title}</h1>`));
  assert.match(html,/data-action="photos-tab"/);
  assert.equal((html.match(/class="ph-tab /g)||[]).length,2);
  assert.match(html,/ph-bottom-bar/);
  assert.match(html,/ph-search-button/);
 }
});
test('native Photos tab switching never animates the whole screen',()=>{
 assert.equal(isPhotosTabSwitch({appId:'photos',route:'/'},{appId:'photos',route:'/collections'}),true);
 assert.equal(isNativeTabSwitch({appId:'photos',route:'/collections'},{appId:'photos',route:'/'}),true);
 assert.equal(isPhotosTabSwitch({appId:'photos',route:'/'},{appId:'photos',route:'/photo'}),false);
 assert.equal(isPhotosTabSwitch({appId:'home',route:'/'},{appId:'photos',route:'/collections'}),false);
});
test('five-column Photos layout starts with zero user photos, without mock thumbnails',()=>{
 assert.equal(samplePhotos.length,0);
 assert.equal(sampleCount,0);
 assert.match(renderLibrary([]),/0个项目/);
 assert.match(renderLibrary([]),/暂无照片/);
 assert.doesNotMatch(renderLibrary([]),/示例照片|sample-\d+/);
 const markup=renderCollections([]);
 for(const name of ['回忆','固定','相簿','人物','个人收藏','最近保存','视频']){
  assert.ok(markup.includes(name),name);
 }
 assert.match(markup,/无可用回忆/);
 assert.match(markup,/0 个项目/);
 assert.doesNotMatch(markup,/微博|QQ|示例照片/);
 const css=readFileSync(new URL('../src/apps/photos/styles.css',import.meta.url),'utf8');
 assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(css,/backdrop-filter:blur/);
 assert.match(css,/#phone:has\(\.ph-screen\) #homebar\{opacity:0/);
 assert.match(css,/\.app-view\.app-photos\{padding-top:calc\(60px \+ env\(safe-area-inset-top,0px\)\)/);
});
test('only real imported photos render, and survive reload through store state',()=>{
 const own={id:'saved-1',src:'data:image/png;base64,AAAA',title:'我的图片',favorite:true,actual:true};
 assert.equal(allPhotos([own])[0].id,'saved-1');
 assert.equal(allPhotos([own]).length,1);
 assert.match(renderLibrary([own]),/1个项目/);
 const viewer=render({store:{get:()=>({content:{photos:[own]}})}},{route:'/photo',params:{photoId:'saved-1'}});
 assert.match(viewer,/data:image\/png;base64,AAAA/);
 assert.match(viewer,/data-action="photos-favorite"/);
 assert.match(viewer,/data-action="photos-wallpaper"/);
 assert.match(viewer,/data-action="photos-share"/);
});
test('selecting a saved photo offers a bottom-right delete action with confirmation',()=>{
 const first={id:'saved-1',src:'data:image/png;base64,AAAA',title:'照片一'};
 const second={id:'saved-2',src:'data:image/png;base64,BBBB',title:'照片二'};
 const live={content:{photos:[first,second]}};
 const context={store:{get:()=>live,update:fn=>fn(live)},refresh:()=>{}};
 resetSelection();
 handleSelection('photos-toggle-select',{},context);
 let html=render({store:context.store},{route:'/',params:{}});
 assert.match(html,/data-action="photos-delete-selected"/);
 assert.match(html,/aria-label="删除所选照片" disabled/);
 assert.doesNotMatch(html,/取消选择/);
 assert.doesNotMatch(html,/ph-bottom-bar/);
 handleSelection('photos-select-photo',{dataset:{id:'saved-1'}},context);
 html=render({store:context.store},{route:'/',params:{}});
 assert.match(html,/已选择 1 项/);
 assert.doesNotMatch(html,/aria-label="删除所选照片" disabled/);
 handleSelection('photos-delete-selected',{},context);
 assert.match(render({store:context.store},{route:'/',params:{}}),/删除 1 张照片？/);
 handleSelection('photos-cancel-delete',{},context);
 assert.equal(selection.deletePrompt,false);
 handleSelection('photos-delete-selected',{},context);
 handleSelection('photos-confirm-delete',{},context);
 assert.deepEqual(live.content.photos.map(photo=>photo.id),['saved-2']);
 assert.equal(selection.enabled,false);
 resetSelection();
});
test('photos remain decomposed into one folder per feature',()=>{
 for(const name of ['library','collections','albums','viewer','search','import','selection']){
  assert.ok(existsSync(new URL(`../src/apps/photos/features/${name}/index.js`,import.meta.url)),name);
 }
 const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(index,/src\/apps\/photos\/styles\.css/);
});
test('every nested Photos view exposes a back button, including a missing image',()=>{
 const own={id:'saved-1',src:'data:image/png;base64,AAAA',title:'照片测试',actual:true};
 const testCtx={store:{get:()=>({content:{photos:[own]}})}};
 for(const loc of [
  {route:'/photo',params:{photoId:'saved-1'}},
  {route:'/photo',params:{photoId:'does-not-exist'}},
  {route:'/search',params:{}},
  {route:'/album',params:{kind:'recent',title:'最近保存'}}
 ]){
  const html=render(testCtx,loc);
  assert.match(html,/data-action="back" aria-label="返回上一页"/);
  assert.match(html,/ph-icon-back/);
 }
});
