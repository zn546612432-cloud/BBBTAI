import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {render} from '../src/apps/ghost/index.js';
import {renderFlowD03,handleFlowD03} from '../src/apps/ghost/features/flow-d03/index.js';

test('GHOST home keeps all native tool actions, projects and history, with a stable motion field',()=>{
 const s=activateStory55(initialState()),ctx={store:{get:()=>s}},loc={appId:'ghost',route:'/',params:{}};
 const page=render(ctx,loc);
 assert.match(page,/gh-workspace-home/);
 assert.match(page,/project="ghost-home" token="0"/);
 for(const id of ['verify','cipher','route','extract','veil','strike'])assert.match(page,new RegExp('data-action="gh-tool" data-tool="'+id+'"'));
 assert.match(page,/data-action="gh-flow-projects"/);assert.match(page,/data-action="gh-history"/);
 assert.equal(render(ctx,loc),page);
});
test('both installed programs show 查看部署 and preserve existing routes and records',()=>{
 const s=activateStory55(initialState());s.story55.flowD03={deployed:true,submitted:true};s.story55.projects.base={authorized:true,batches:[],active:null};
 const page=renderFlowD03(s,{route:'/flow-deploy',params:{}});
 assert.match(page,/data-action="gh-flow-projects">查看部署/);assert.match(page,/data-action="gh-flow-base-deploy">查看部署/);
 assert.match(renderFlowD03(s,{route:'/flow-deploy',params:{project:'base'}}),/data-action="gh-flow-base-project">查看部署/);
 assert.match(renderFlowD03(s,{route:'/flow-projects'}),/project="ghost-projects" token="0"/);
 assert.match(renderFlowD03(s,{route:'/flow-record'}),/45 个安全漏洞/);
 const visited=[],ctx={router:{open:x=>visited.push(x)},store:{get:()=>s}};
 for(const action of ['gh-flow-projects','gh-flow-base-project','gh-flow-record'])assert.equal(handleFlowD03(action,ctx),true);
 assert.deepEqual(visited.map(x=>x.route),['/flow-projects','/deployment','/flow-record']);
});
