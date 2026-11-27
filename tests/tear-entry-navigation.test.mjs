import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {PhoneRouter} from '../src/services/router.js';
import {resolveTearEntry} from '../src/apps/ghost/deployment/navigation.js';
import {render as renderGhost} from '../src/apps/ghost/index.js';
import {handleTearAgent} from '../src/apps/ghost/deployment/tear-agent/actions.js';
import {handleLibraryAction,renderLibrary} from '../src/apps/files/features/local-library/index.js';
import {beginTearChatSession,ensureAgent} from '../src/apps/ghost/deployment/tear-agent/state.js';
const home={appId:'home',route:'/',params:{}};
const projects={appId:'ghost',route:'/flow-projects',params:{}};
const base={appId:'ghost',route:'/deployment',params:{project:'base'}};
const installer={appId:'ghost',route:'/flow-deploy',params:{project:'base'}};
const tear={appId:'ghost',route:'/tear',params:{}};
const docs={appId:'files',route:'/folder/documents',params:{}};
function fixture({done=true,current=projects,stack=[home]}={}){
 const s=activateStory55(initialState());s.day=25;s.clock='08:00';s.nav={current,stack:[...stack]};
 if(done){
  s.story55.completed.base={day:24,clock:'21:00'};
  s.story55.projects.base={authorized:true,batches:Array.from({length:11},(_,i)=>({complete:true,steps:Array.from({length:5},()=>({day:i+14})),testedDay:i+14,day:i+14})),active:null};
 }else delete s.story55.completed.base;
 const store={get:()=>s,update:fn=>fn(s)};
 const router=new PhoneRouter(store,new Set(['ghost','files','home','wechat','kira','mirage']));
 return {s,store,router,refresh(){},toast(){}};
}
test('completed Tear opens directly from project and installer, without an installer in Back history',()=>{
 const c=fixture();
 c.router.open(base);assert.deepEqual(c.s.nav.current,tear);assert.deepEqual(c.s.nav.stack,[home,projects]);
 c.router.back();assert.deepEqual(c.s.nav.current,projects);
 c.router.open(installer);assert.deepEqual(c.s.nav.current,tear);
 assert.deepEqual(resolveTearEntry(c.s,{appId:'ghost',route:'/deployment',params:{project:'identity'}}),{appId:'ghost',route:'/deployment',params:{project:'identity'}});
});
test('unfinished base still uses deployment and saved completed installer resolves on launch',()=>{
 const c=fixture({done:false});c.router.open(base);assert.deepEqual(c.s.nav.current,base);
 const restored=fixture({current:base});assert.deepEqual(restored.s.nav.current,tear);
});
test('old installer in back stack cannot reopen the same completed Tear screen',()=>{
 const c=fixture({current:tear,stack:[home,projects,base]});
 c.router.back();assert.deepEqual(c.s.nav.current,projects);assert.deepEqual(c.s.nav.stack,[home]);
});
test('file opened from Tear returns to the same chat session, not the Documents folder',()=>{
 const c=fixture({current:tear,stack:[home,projects]});
 beginTearChatSession(c.s);
 const a=ensureAgent(c.s),session=a.chatSession;
 a.draft='保留這句';const count=a.messages.length;
 handleTearAgent('gh-tear-artifact',{dataset:{id:'tear-artifact-research'}},c);
 assert.equal(c.s.nav.current.appId,'files');
 handleLibraryAction('files-local-nav',{dataset:{back:'true',route:'/folder/documents'}},c);
 assert.equal(c.s.nav.current.route,'/tear');assert.equal(c.s.nav.current.params.resumeTear,'1');
 renderGhost(c,c.s.nav.current);
 assert.equal(a.chatSession,session);assert.equal(a.draft,'保留這句');assert.equal(a.messages.length,count);
 assert.deepEqual(c.s.nav.stack,[home,projects]);
});
test('Files back follows actual source, including Recents, and folder rows still navigate forward',()=>{
 const recent={appId:'files',route:'/recent',params:{}};
 const c=fixture({current:recent,stack:[home]});
 c.router.open({appId:'files',route:'/item/example'});
 handleLibraryAction('files-local-nav',{dataset:{back:'true',route:'/folder/documents'}},c);
 assert.deepEqual(c.s.nav.current,recent);assert.deepEqual(c.s.nav.stack,[home]);
 handleLibraryAction('files-local-nav',{dataset:{route:'/folder/documents'}},c);
 assert.deepEqual(c.s.nav.current,docs);
 assert.match(renderLibrary(c.s,'/folder/documents'),/data-back="true"/);
});
