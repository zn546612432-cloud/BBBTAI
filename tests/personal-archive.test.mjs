import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55,tickStory55,nodeLink55} from '../src/services/story55/runtime.js';
import {previewNode55} from '../src/services/story55/controller.js';
import {completed,nodeStatus} from '../src/services/story55/state.js';
import {authorizeProject,startDeploymentStep} from '../src/services/story55/projects.js';
import {begin,finish} from '../src/apps/ghost/state.js';
import {tick} from '../src/apps/ghost/index.js';
import {deploymentView} from '../src/apps/ghost/deployment/index.js';
import {agent,ensureAgent,tickTearAgent,ARCHIVE_RUN_MS} from '../src/apps/ghost/deployment/tear-agent/state.js';
import {handleTearAgent} from '../src/apps/ghost/deployment/tear-agent/actions.js';
import {renderTearAgent} from '../src/apps/ghost/deployment/tear-ui/view.js';
import {renderLibrary,localFileList,handleLibraryAction,unlockPersonalFiles,savePersonalFiles} from '../src/apps/files/features/local-library/index.js';
import {render as browser,handle as browserAction} from '../src/apps/browser/index.js';
import {D29_IP} from '../src/story/d29/definition.js';

test('archive deployment returns to Tear, runs once, and is saved only by the golden result marker',()=>{
 const s=activateStory55(initialState());previewNode55(s,'identity');s.story55.hardware=2;
 ensureAgent(s);authorizeProject(s,'identity',D29_IP);
 const ctx={store:{get:()=>s,update:fn=>fn(s)},router:{open:loc=>s.nav.current=loc},refresh(){}};
 const click=(action,id)=>handleTearAgent('gh-tear-'+action,{dataset:{id}},ctx);
 assert.equal(savePersonalFiles(s),null);
 for(let i=0;i<5;i++){
  const orderId=startDeploymentStep(s,'identity');assert.ok(begin(s,orderId));s.nav.current={appId:'ghost',route:'/run',params:{orderId}};
  finish(s,orderId,true);tick(ctx);
  assert.equal(s.nav.current.route,i===4?'/tear':'/run');
 }
 assert.ok(completed(s,'identity'));assert.doesNotMatch(deploymentView(s,'identity'),/報告已保存/);
 click('task','identity');assert.match(renderTearAgent(s),/<small>啟動<\/small>/);
 click('identity');assert.ok(agent(s).archiveRun);const started=agent(s).archiveRun.startedAt;
 click('identity');assert.equal(agent(s).archiveRun.startedAt,started);
 assert.doesNotMatch(renderTearAgent(s),/data-id="personal-files"/);
 click('archive-save');assert.equal(localFileList(s).some(f=>f.id==='personal-files'),false);
 agent(s).archiveRun.startedAt=Date.now()-ARCHIVE_RUN_MS-1;tickTearAgent(s);
 assert.match(renderTearAgent(s),/is-complete[^>]*data-id="personal-files"/);
 click('task','personal-files');assert.match(renderTearAgent(s),/存入本機/);
 click('archive-save');assert.equal(s.nav.current.route,'/item/personal-files');assert.ok(completed(s,'dossier'));
 click('archive-save');assert.equal(localFileList(s).filter(f=>f.id==='personal-files').length,1);
 assert.match(renderLibrary(s,'/folder/downloads'),/Personal Files/);
 assert.match(renderLibrary(s,'/item/personal-files'),/TAI.*account.txt.*Photos/s);
 assert.match(renderLibrary(s,'/item/personal-files'),/<span>TAI<\/span>/);
 assert.doesNotMatch(renderLibrary(s,'/item/personal-files'),/🔒/u);
 assert.match(renderLibrary(s,'/item/personal-files/tai'),/type="password"/);
 assert.match(renderLibrary(s,'/item/personal-files/account'),/>room404</);
 assert.doesNotMatch(renderLibrary(s,'/item/personal-files/tai/photo'),/triplets-baby-photo/);
 assert.equal(unlockPersonalFiles(s,'xitai'),false);
 assert.equal(unlockPersonalFiles(s,'XITAI'),true);
 const restored=structuredClone(s);tickStory55(restored);assert.match(renderLibrary(restored,'/item/personal-files/tai'),/IMG_0001.jpg/);
 assert.equal(nodeStatus(s,'photo').state,'ready');
 handleLibraryAction('files-local-personal-open',{dataset:{route:'/item/personal-files/tai/photo'}},ctx);
 assert.ok(completed(s,'photo'));assert.equal(nodeStatus(s,'invite').state,'locked');
 for(const name of ['IMG_4982.jpg','IMG_4985.jpg','IMG_4986.jpg','IMG_4989.jpg','Student_ID.jpg']){
  assert.match(renderLibrary(s,'/item/personal-files/photos'),new RegExp(name));
  assert.ok(existsSync(new URL('../public/assets/story55/personal-files/'+name,import.meta.url)));
 }
 assert.equal(nodeLink55(s,'harvard').route,'/item/personal-files/photos');
 const search={appId:'browser',route:'/search',params:{query:'room404'}};
 assert.match(browser(ctx,search),/data-page="room404"/);
 browserAction('browser-open',{dataset:{page:'room404'}},ctx,search);
 assert.equal(s.nav.current.params.page,'room404');
 assert.match(browser(ctx,s.nav.current),/r404-grid/);
});
