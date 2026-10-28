import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mountGestures} from '../src/system/gestures.js';
import {notifications} from '../src/system/shell.js';
import {initialState} from '../src/services/storage.js';

function phoneHarness(state){
 const handlers=new Map(),out={pages:[],shades:[],homes:[],unlocks:0};
 const cover={style:{}};
 const root={
  clientHeight:800,
  getBoundingClientRect:()=>({top:0,bottom:800}),
  querySelector:()=>cover,
  hasPointerCapture:()=>false,
  setPointerCapture:()=>{},
  releasePointerCapture:()=>{},
  addEventListener(name,fn){handlers.set(name,fn);},
  dispatch(name,values){const e={timeStamp:0,cancelable:true,preventDefault(){e.prevented=true;},stopImmediatePropagation(){e.stopped=true;},...values};handlers.get(name)(e);return e;}
 };
 mountGestures(root,{state:()=>state,page:x=>out.pages.push(x),shade:x=>out.shades.push(x),unlock:()=>out.unlocks++,goHome:x=>out.homes.push(x)});
 const finger=(x,y,id=1)=>({clientX:x,clientY:y,identifier:id});
 const touch=(name,x,y,t)=>root.dispatch(name,{timeStamp:t,target:{closest:()=>null},touches:name==='touchend'?[]:[finger(x,y)],changedTouches:[finger(x,y)]});
 return {root,touch,cover,out};
}

test('iPhone touch upward swipe follows the lock cover and opens the passcode',()=>{
 const {touch,cover,out}=phoneHarness({locked:true,home:false,shade:false});
 touch('touchstart',170,680,0);
 const moving=touch('touchmove',170,530,90);
 assert.equal(moving.prevented,true);
 assert.match(cover.style.transform,/translateY\(-97\.5px\)/);
 touch('touchend',170,440,140);
 assert.equal(out.unlocks,1);
});

test('iPhone touch horizontal swipe follows the finger and settles the page',()=>{
 const {touch,out}=phoneHarness({locked:false,home:true,shade:false,page:0});
 touch('touchstart',320,400,0);
 const moving=touch('touchmove',170,405,60);
 assert.equal(moving.prevented,true);
 assert.equal(out.pages[0].settle,false);
 assert.equal(out.pages[0].dx,-150);
 touch('touchend',80,408,105);
 assert.equal(out.pages.at(-1).settle,true);
 assert.equal(out.pages.at(-1).dx,-240);
});

test('iPhone touch upwards dismisses notifications; short movement snaps back',()=>{
 const {touch,out}=phoneHarness({locked:false,home:true,shade:true,page:0});
 touch('touchstart',190,670,0);
 touch('touchmove',190,550,50);
 assert.ok(out.shades[0].progress<1);
 touch('touchend',190,430,100);
 assert.deepEqual(out.shades.at(-1),{progress:0,settle:true});
});

test('gesture listener does not intercept ordinary app scrolling',()=>{
 const {touch,out}=phoneHarness({locked:false,home:false,shade:false,page:0});
 touch('touchstart',100,400,0);
 const moving=touch('touchmove',102,245,50);
 assert.equal(moving.prevented,undefined);
 touch('touchend',102,245,100);
 assert.equal(out.pages.length+out.shades.length+out.unlocks,0);
});

test('swiping up from the bottom of an app returns home while ordinary scrolling remains untouched',()=>{
 const {touch,out}=phoneHarness({locked:false,home:false,shade:false,page:0});
 touch('touchstart',190,776,0);
 const moving=touch('touchmove',188,635,70);
 assert.equal(moving.prevented,true);
 assert.deepEqual(out.homes[0],{dy:-141,settle:false});
 touch('touchend',185,582,105);
 assert.equal(out.homes.at(-1).complete,true);
});

test('short bottom gesture springs back without navigating',()=>{
 const {touch,out}=phoneHarness({locked:false,home:false,shade:false,page:0});
 touch('touchstart',190,776,0);
 touch('touchmove',190,753,45);
 touch('touchend',190,735,70);
 assert.equal(out.homes.at(-1).complete,false);
});

test('notification sheet has only the shared bottom home indicator, no duplicate top grip or Done button',()=>{
 const markup=notifications(initialState());
 assert.doesNotMatch(markup,/shade-grip|close-shade|完成/);
 const css=readFileSync(new URL('../src/styles/motion.css',import.meta.url),'utf8');
 assert.match(css,/#homebar\{[^}]*touch-action:none/);
});
