import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=readFileSync(new URL('../src/system/startup/intro.js',import.meta.url),'utf8');
function start({seen=false,reduced=false,reject=false}={}){
 const classes=new Set(),events={},timers=new Map(),changes=new Map();let serial=0;
 const node=()=>({hidden:true,textContent:'',classList:{add(){},remove(){} }});
 const nodes=Object.fromEntries(['skip','next','message','tip','tip-index'].map(id=>['xm-boot-'+id,node()]));
 nodes['xm-boot']={classList:{add:cls=>classes.add(cls)}};
 nodes['xm-boot-video']={paused:false,play:()=>reject?Promise.reject(Error('blocked')):Promise.resolve(),pause(){this.paused=true;},addEventListener:(name,fn)=>{events[name]=fn;}};
 const window={matchMedia:()=>({matches:reduced})};
 vm.runInNewContext(script,{window,document:{getElementById:id=>nodes[id]},localStorage:{getItem:()=>seen?'1':null,setItem:(k,v)=>changes.set(k,v)},setInterval:fn=>{timers.set(++serial,fn);return serial;},clearInterval:id=>timers.delete(id),setTimeout:()=>++serial,clearTimeout:()=>{},Promise});
 return {window,classes,events,timers,changes,nodes,next:nodes['xm-boot-next'],skip:nodes['xm-boot-skip'],tip:nodes['xm-boot-tip'],index:nodes['xm-boot-tip-index'],video:nodes['xm-boot-video']};
}
test('first visit plays before revealing final artwork; readiness and playback both gate entry',()=>{
 const s=start();let closed=0;
 s.window.__xmBootIntroReady(()=>closed++);
 assert.equal(s.next.hidden,true);assert.equal(s.skip.hidden,true);
 s.events.ended();assert.equal(s.video.paused,true);assert.ok(s.classes.has('intro-finished'));assert.equal(s.next.hidden,false);assert.equal(s.index.textContent,'01 / 08');assert.equal(s.changes.size,1);
 const tick=[...s.timers.values()][0];tick();assert.equal(s.index.textContent,'02 / 08');assert.match(s.tip.textContent,/Ouroboros/);
 for(let i=0;i<7;i++)tick();assert.equal(s.index.textContent,'01 / 08');s.next.onclick();s.next.onclick();assert.equal(closed,1);assert.equal(s.timers.size,0);
});
test('returning users can skip; slow preload cannot be bypassed',()=>{
 const s=start({seen:true});assert.equal(s.skip.hidden,false);s.skip.onclick();assert.equal(s.next.hidden,true);assert.ok(s.classes.has('intro-finished'));s.window.__xmBootIntroReady(()=>{});assert.equal(s.next.hidden,false);
});
test('blocked autoplay or reduced motion still show artwork and allow entry',async()=>{
 const s=start({reject:true});await Promise.resolve();await Promise.resolve();assert.ok(s.classes.has('intro-finished'));s.window.__xmBootIntroReady(()=>{});assert.equal(s.next.hidden,false);
 const r=start({reduced:true});assert.ok(r.classes.has('intro-finished'));assert.equal(r.next.hidden,true);r.window.__xmBootIntroReady(()=>{});assert.equal(r.next.hidden,false);
});
test('startup error can reveal static artwork without incorrectly allowing entry',()=>{
 const s=start();s.window.__xmBootIntroError();assert.ok(s.classes.has('intro-finished'));assert.equal(s.next.hidden,true);
});
