import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {deploymentView} from '../src/apps/ghost/deployment/index.js';
import {deployment, deploymentPercent, deploymentReadiness, startDeploymentStep, completeDeploymentRun} from '../src/services/story55/projects.js';
import {motionToken} from '../src/apps/ghost/deployment/motion/view.js';

test('video deployment surface follows the real receipt count and preserves the equipment gate',()=>{
 const s=activateStory55(initialState());s.day=30;s.clock='12:00';
 const node=s.story55.config.nodes.find(n=>n.id==='identity');
 for(const id of node.requires)s.story55.completed[id]={day:29,clock:'23:00'};
 s.story55.projects.identity={authorized:true,batches:[],active:null};
 s.story55.hardware=1;
 const blocked=deploymentView(s,'identity');
 assert.match(blocked,/data-action="s55-run-step" data-project="identity" disabled/);
 assert.match(blocked,/data-action="s55-upgrade"/);
 s.story55.hardware=2;
 assert.equal(deploymentReadiness(s,'identity').canStart,true);
 const r=deployment(s,'identity'),before=motionToken(r,deploymentPercent(s,'identity'));
 for(let i=0;i<2;i++){
  const run=s.ghost.orders[startDeploymentStep(s,'identity')];run.status='success';
  assert.equal(completeDeploymentRun(s,run),true);
 }
 const snapshot=JSON.stringify(s),page=deploymentView(s,'identity');
 assert.match(page,/<strong>40<span>%<\/span><\/strong>/);
 assert.match(page,/2 \/ 5 已完成/);
 assert.equal((page.match(/class="done" data-key="deploy-step-/g)||[]).length,2);
 assert.match(page,/class="active" data-key="deploy-step-2"/);
 assert.match(page,/data-action="s55-run-step" data-project="identity" /);
 assert.doesNotMatch(page,/data-action="s55-run-step" data-project="identity" disabled/);
 assert.ok(motionToken(r,deploymentPercent(s,'identity'))>before);
 assert.equal(JSON.stringify(s),snapshot,'rendering never advances the deployment');
 assert.equal(deploymentPercent(s,'identity'),0,'partial steps do not change committed story progress');
});

test('both video clips and the reduced-motion poster are bundled native assets',()=>{
 for(const name of ['field-idle.mp4','field-pulse.mp4','field-poster.webp']){
  assert.ok(existsSync(new URL('../public/apps/ghost/deployment/'+name,import.meta.url)));
 }
});
