import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const startup=html.match(/<script>\s*(\(function\(\)\{[\s\S]*?\}\)\(\);)\s*<\/script><script type="module"/)?.[1];
test('standalone boot watchdog works even if the main ES module cannot start',()=>{
 assert.ok(startup,'watchdog must be a normal script BEFORE the main module');
 const objects={
  'xm-boot':{classList:{contains:()=>false}},
  'xm-boot-percent':{textContent:'0%'},
  'xm-boot-message':{textContent:'正在准备手机资源和离线地图…'},
  'xm-boot-next':{hidden:true,onclick:null,textContent:''}
 };
 const listeners={};
 let pending,redirect=null;
 const window={addEventListener:(name,fn)=>listeners[name]=fn};
 const location={href:'https://phone.example/BBBTAI/',replace:url=>{redirect=url;}};
 const sandbox={
  window,location,URL,
  document:{getElementById:name=>objects[name]||null},
  setTimeout:fn=>{pending=fn;return 123;},
  clearTimeout:()=>{}
 };
 vm.runInNewContext(startup,sandbox,{timeout:500});
 assert.equal(typeof pending,'function');
 pending();
 assert.equal(objects['xm-boot-next'].hidden,false);
 assert.match(objects['xm-boot-message'].textContent,/长时间未完成启动/);
 assert.equal(objects['xm-boot-percent'].textContent,'加载中');
 objects['xm-boot-next'].onclick();
 assert.match(redirect,/^https:\/\/phone\.example\/BBBTAI\/\?boot-retry=\d+$/);
});

test('boot watchdog cannot falsely stall after main boot has actually started',()=>{
 const objects={
  'xm-boot':{classList:{contains:()=>false}},
  'xm-boot-percent':{textContent:'0%'},
  'xm-boot-message':{textContent:'正在准备手机资源和离线地图…'},
  'xm-boot-next':{hidden:true}
 };
 let pending,cleared=false;
 const window={addEventListener:()=>{}};
 const sandbox={
  window,location:{href:'https://phone.example/BBBTAI/'},URL,
  document:{getElementById:name=>objects[name]||null},
  setTimeout:fn=>{pending=fn;return 123;},
  clearTimeout:()=>{cleared=true;}
 };
 vm.runInNewContext(startup,sandbox,{timeout:500});
 window.__xmBootStarted();
 pending();
 assert.equal(cleared,true);
 assert.equal(objects['xm-boot-percent'].textContent,'0%');
 assert.equal(objects['xm-boot-next'].hidden,true);
});

test('story and snapshot hydration do not block the phone indefinitely',()=>{
 assert.match(code,/const boundedBootTask=async/);
 assert.match(code,/Promise\.race\(/);
 assert.match(code,/hydrateBuiltInPresets\(store\)/);
 assert.match(code,/primeTestSnapshots\(store\.storage\)/);
 assert.match(code,/globalThis\.__xmBootStarted\?\.\(\)/);
 assert.doesNotMatch(code,/localStorage\.clear\(\)|store\.replace\(initialState\(\)\)/);
 assert.match(html,/<script type="module" src="\/src\/main\.js"><\/script>/);
});

test('Safari slow module loading is not misreported as a 12-second failure',()=>{
 assert.match(html,/},8000\);/);
 assert.match(html,/},30000\);/);
 assert.doesNotMatch(html,/},12000\);/);
 assert.match(html,/window\.__xmBootModulesReady=function/);
 assert.match(code,/globalThis\.__xmBootModulesReady\?\.\(\)/);
 assert.match(code,/limit=3500/);
 assert.match(code,/primeTestSnapshots\(store\.storage\)[^\n]*1500\)/);
});

test('an actual failed ES module shows a recoverable message without clearing the phone save',()=>{
 const objects={
  'xm-boot':{classList:{contains:()=>false}},
  'xm-boot-percent':{textContent:'0%'},
  'xm-boot-message':{textContent:'正在准备手机资源和离线地图…'},
  'xm-boot-next':{hidden:true,onclick:null,textContent:''}
 };
 const listeners={},timers=[];
 let redirect=null;
 const sandbox={
  window:{addEventListener:(name,listener)=>listeners[name]=listener},
  location:{href:'https://phone.example/BBBTAI/',replace:url=>redirect=url},
  URL,
  document:{getElementById:id=>objects[id]||null},
  setTimeout:fn=>{timers.push(fn);return timers.length;},
  clearTimeout:()=>{}
 };
 vm.runInNewContext(startup,sandbox,{timeout:500});
 listeners.error({target:{tagName:'SCRIPT',type:'module'},message:'Script error.'});
 assert.equal(objects['xm-boot-next'].hidden,false);
 assert.match(objects['xm-boot-message'].textContent,/模块下载失败/);
 assert.match(objects['xm-boot-message'].textContent,/不会清除存档/);
 objects['xm-boot-next'].onclick();
 assert.match(redirect,/boot-retry=/);
 assert.doesNotMatch(html,/localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
});
