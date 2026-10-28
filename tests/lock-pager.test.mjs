import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rubberBand,dragOffset,nearestPage,pageTarget,releaseVelocity} from '../src/system/pager.js';
import {errorHaptic} from '../src/system/haptics.js';
import {initialState} from '../src/services/storage.js';
import {lock} from '../src/system/shell.js';

const W=390,N=3;

test('rubber band resists smoothly, keeps its sign and never exceeds the page width',()=>{
 assert.equal(rubberBand(0,W),0);
 let last=0;
 for(const d of [10,40,120,400,4000]){const v=rubberBand(d,W);assert.ok(v>last&&v<d&&v<W,String(d));last=v;}
 assert.equal(rubberBand(-80,W),-rubberBand(80,W));
});

test('dragOffset follows the finger inside the pager and resists beyond both ends',()=>{
 assert.equal(dragOffset({base:0,dx:-100,width:W,count:N}),-100);
 assert.equal(dragOffset({base:-W,dx:60,width:W,count:N}),-W+60);
 const first=dragOffset({base:0,dx:200,width:W,count:N});assert.ok(first>0&&first<200);
 const end=-(N-1)*W,last=dragOffset({base:end,dx:-200,width:W,count:N});assert.ok(last<end&&last>end-200);
});

test('pageTarget turns on distance or flick velocity, moves at most one page and clamps at the ends',()=>{
 const t=(from,dx,velocity=0)=>pageTarget({from,offset:-from*W+dx,velocity,width:W,count:N});
 assert.equal(t(0,-40),0,'short slow drag snaps back');
 assert.equal(t(0,-150),1,'slow drag past a third of a page turns');
 assert.equal(t(1,150),0);
 assert.equal(t(0,-30,-0.6),1,'short fast flick turns');
 assert.equal(t(1,30,0.6),0);
 assert.equal(t(0,-40,0.9),0,'a flick that points back toward the page does not turn it away');
 assert.equal(t(0,-380,-5),1,'one gesture never skips a page');
 assert.equal(t(0,200,2),0,'cannot go before the first page');
 assert.equal(t(2,-300,-2),2,'cannot go past the last page');
});

test('nearestPage drives the live page dots while dragging',()=>{
 assert.equal(nearestPage(0,W,N),0);assert.equal(nearestPage(-190,W,N),0);assert.equal(nearestPage(-200,W,N),1);
 assert.equal(nearestPage(-2000,W,N),2);assert.equal(nearestPage(300,W,N),0);
});

test('releaseVelocity uses the last moments of the drag and is zero if the finger paused',()=>{
 const moving=[{x:300,t:0},{x:280,t:20},{x:250,t:40},{x:210,t:60}];
 assert.ok(Math.abs(releaseVelocity(moving,65)-(-1.5))<1e-9);
 assert.equal(releaseVelocity(moving,60+200),0);
 assert.equal(releaseVelocity([{x:1,t:0}],5),0);assert.equal(releaseVelocity([],5),0);
});

test('wrong-passcode haptic: Vibration API first, iOS switch taps as fallback, silent otherwise',()=>{
 const calls=[];
 assert.equal(errorHaptic({nav:{vibrate:p=>{calls.push(p);return true;}},doc:null}),'vibrate');
 assert.equal(calls.length,1);assert.ok(Array.isArray(calls[0])&&calls[0].length>=3);

 let clicks=0,appended=0;const timers=[];
 const doc={head:{append(){appended++;}},createElement:()=>({style:{},setAttribute(){},append(){},click(){clicks++;},remove(){},type:''})};
 assert.equal(errorHaptic({nav:{},doc,wait:(ms,fn)=>timers.push([ms,fn])}),'switch');
 assert.equal(clicks,1);assert.equal(timers.length,2);timers.forEach(([,fn])=>fn());assert.equal(clicks,3);assert.equal(appended,3);

 assert.equal(errorHaptic({nav:undefined,doc:undefined}),'none');
 assert.equal(errorHaptic({nav:{vibrate(){throw Error('blocked');}},doc:undefined}),'none');
});

test('locked screen shows the iOS-style error only through the dots, with an accessible hidden alert',()=>{
 const s=initialState();
 const typing=lock(s,'passcode','08'),wrong=lock(s,'error','0000');
 assert.match(typing,/passcode-dots/);assert.doesNotMatch(typing,/lock-error|role="alert"/);
 assert.match(wrong,/class="[^"]*lock-error/);assert.match(wrong,/sr-only" role="alert">密码错误</);
 assert.equal((wrong.match(/<i class="filled"><\/i>/g)||[]).length,4,'all four dots stay filled while they shake');
});

// Regression guards for the visual bugs fixed on 2026-10-26.
const block=(css,selector)=>{const i=css.indexOf(`\n${selector}{`);assert.ok(i>=0,selector);return css.slice(i+1,css.indexOf('}',i)+1);};

test('notification centre is transparent frosted glass, not an opaque sheet',()=>{
 const css=readFileSync(new URL('../src/styles/motion.css',import.meta.url),'utf8');
 const shade=block(css,'.shade');
 assert.match(shade,/backdrop-filter:blur\(/);assert.match(shade,/-webkit-backdrop-filter:blur\(/);
 const background=shade.match(/(?:^|[;{\s])background:([^;]*);/);assert.ok(background,'.shade declares a background');
 const alphas=[...background[1].matchAll(/rgba\([^)]*?,\s*(0?\.\d+|1)\)/g)].map(m=>Number(m[1]));
 assert.ok(alphas.length>0&&alphas.every(a=>a<=0.3),`shade tint must stay see-through, got ${alphas}`);
 assert.doesNotMatch(background[1],/#[0-9a-f]{6}(d|e|f)[0-9a-f]\b/i,'no near-opaque hex colour');
});

test('home pager spans the screen and pages re-add the gutter so neighbouring pages stay off-screen',()=>{
 const css=readFileSync(new URL('../src/styles/motion.css',import.meta.url),'utf8');
 assert.match(block(css,'.home-pager'),/margin:0 calc\(var\(--home-gutter\) \* -1\)/);
 assert.match(block(css,'.home-page'),/padding:0 calc\(var\(--home-gutter\) \+ 8px\)/);
 assert.match(block(css,'.home-screen'),/--home-gutter:14px/);
});
