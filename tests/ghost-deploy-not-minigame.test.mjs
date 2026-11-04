import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {render as ghostRender,handle as ghostHandle} from '../src/apps/ghost/index.js';
import {toolIcon} from '../src/apps/ghost/visuals.js';
import {ghostEditor} from '../src/apps/ghost/editor.js';
import {FLOW_KEY} from '../src/services/story55/flow-d03.js';

const renderHome=s=>ghostRender({store:{get:()=>s},refresh:()=>{}},{route:'/',params:{},appId:'ghost'});
test('deployment icon exists in both regular and 55-day Ghost homes',()=>{
 const icon=toolIcon('verify');
 assert.match(icon,/<svg/);
 assert.match(icon,/<rect/);
 assert.match(icon,/<path d="M8 8h8/);
 assert.doesNotMatch(icon,/undefined/);
 for(const useStory of [false,true]){
  const s=initialState();if(useStory)activateStory55(s);
  const html=renderHome(s);
  const deploy=html.match(/<span class="gh-tool-glyph">([\s\S]*?)<\/span><section><b>部署/);
  assert.ok(deploy,'DEPLOY tool has its own icon');
  assert.match(deploy[1],/<rect/);
  assert.doesNotMatch(deploy[1],/undefined/);
 }
});
test('deployment is a key-driven installation screen, not a game in the phone UI',()=>{
 const s=initialState();activateStory55(s);
 const ctx={store:{get:()=>s},router:{open:x=>{ctx.lastRoute=x;}},refresh:()=>{}};
 ghostHandle('gh-tool',{dataset:{tool:'verify'}},ctx,{route:'/',params:{}});
 assert.equal(ctx.lastRoute.route,'/flow-deploy');
 const html=ghostRender(ctx,{route:'/flow-deploy',params:{}});
 assert.match(html,/部署密钥/);
 assert.match(html,/密钥/);
 assert.doesNotMatch(html,/gh-arcade|gh-tile|gh-pipe/);
 assert.equal(FLOW_KEY,'flow-1234');
});
test('standalone game lab and developer test menu cannot generate a DEPLOY minigame',()=>{
 const preview=readFileSync(new URL('../src/apps/ghost/preview.js',import.meta.url),'utf8');
 assert.match(preview,/t\.dataset\.tool==='verify'\)return router\.open\(\{appId:'ghost',route:'\/deploy-info'/);
 const editor=ghostEditor(initialState());
 assert.doesNotMatch(editor,/随机开启 部署 \/ DEPLOY/);
 assert.match(editor,/随机开启 破译 \/ CIPHER/);
 const info=ghostRender({store:{get:()=>initialState()}},{route:'/deploy-info',params:{}});
 assert.match(info,/验证后安装并初始化工具/);
 assert.doesNotMatch(info,/小游戏|关卡|玩家/);
 assert.doesNotMatch(info,/data-action="gh-start"/);
});
