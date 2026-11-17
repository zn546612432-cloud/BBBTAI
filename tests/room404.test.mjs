import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,PhoneStore} from '../src/services/storage.js';
import {activateStory55,tickStory55} from '../src/services/story55/runtime.js';
import {prepareStory55NodeAtDay} from '../src/services/story55/rebuild.js';
import {nodeStatus,completed} from '../src/services/story55/state.js';
import {render,handle} from '../src/apps/browser/index.js';
import {renderRoom404,handleRoom404,canOpenRoom404,isRoom404Url} from '../src/apps/browser/features/room404/index.js';
import {ROOM404_POSTS} from '../src/apps/browser/features/room404/content.js';
function fixture(){const s=activateStory55(initialState());prepareStory55NodeAtDay(s,'ig');s.nav.current={appId:'browser',route:'/story55',params:{page:'ig'}};return s;}
const ctx=s=>({store:{get:()=>s,update:fn=>fn(s)},router:{open:loc=>s.nav.current=loc}});
test('room404 preserves the existing investigation gate for legacy and saved routes',()=>{
 const locked=activateStory55(initialState()),c=ctx(locked);
 assert.equal(canOpenRoom404(locked),false);
 for(const loc of [{route:'/story55',params:{page:'ig'}},{route:'/page',params:{page:'room404'}}])assert.doesNotMatch(render(c,loc),/r404-grid|selfie.webp|Sem desculpas/);
 handleRoom404('browser-ig-post',{dataset:{post:'selfie'}},c,{route:'/story55',params:{page:'ig'}},{navigate:()=>assert.fail('locked navigation')});
 assert.equal(completed(locked,'ig'),false);
});
test('opening the profile records the existing evidence once, without viewing posts',()=>{
 const s=fixture(),c=ctx(s),navigate=(route,params)=>s.nav.current={appId:'browser',route,params};
 assert.equal(nodeStatus(s,'ig').state,'ready');
 renderRoom404(s,s.nav.current);assert.equal(completed(s,'ig'),false);
 tickStory55(s);assert.equal(completed(s,'ig'),true);
 const completion=JSON.stringify(s.story55.completed.ig),questions=s.story55.questions;
 handleRoom404('browser-ig-post',{dataset:{post:'selfie'}},c,s.nav.current,{navigate});
 assert.equal(JSON.stringify(s.story55.completed.ig),completion);assert.equal(s.story55.questions,questions);
 assert.equal(nodeStatus(s,'questions').state,'locked');
});
test('search result opens the profile and D34 schedules the reply through the persisted phone store',()=>{
 const s=fixture();s.day=34;s.clock='08:00';
 s.nav.current={appId:'browser',route:'/search',params:{query:'room404'}};
 const memory=new Map();
 const store=new PhoneStore({getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)});
 store.replace(s);
 const c={store,router:{open:loc=>store.update(n=>n.nav.current=loc)}};
 assert.match(render(c,store.get().nav.current),/data-page="room404"/);
 assert.equal(completed(store.get(),'ig'),false);
 handle('browser-open',{dataset:{page:'room404'}},c,store.get().nav.current);
 assert.equal(completed(store.get(),'ig'),true);
 assert.equal(nodeStatus(store.get(),'questions').state,'ready');
 assert.ok(Number.isFinite(store.get().story55.scenes.questions.nextAt));
});
test('approved copy, assets and account identity appear without leaking names',()=>{
 const s=fixture(),html=renderRoom404(s,s.nav.current);
 assert.equal((html.match(/data-post=/g)||[]).length,7);
 assert.doesNotMatch(html,/陈熙泰|陳熙泰|Chen Xitai|Tiago|收錄|线索/);
 for(const p of ROOM404_POSTS){const detail=renderRoom404(s,{route:'/page',params:{page:'room404',post:p.id}});assert.ok(detail.includes(p.caption));assert.ok(detail.includes(p.image));assert.ok(p.likes===1||p.likes===2);}
 for(const url of ['https://www.instagram.com/room.404/','instagram.com/room.404','https://instagram.com/room.404/?igsh=123'])assert.ok(isRoom404Url(url));
 for(const url of ['https://evil.example/instagram.com/room.404','https://instagram.com/room.404.fake','https://instagram.com/another'])assert.equal(isRoom404Url(url),false);
});
