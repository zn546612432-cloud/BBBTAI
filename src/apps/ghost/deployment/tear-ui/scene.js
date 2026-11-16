import {makeScene,buildLoop,alongLoop,bodyProfile} from './anatomy.js';
// Presentation only. The existing GHOST executor owns every progress/result change.
export function createTearScene(canvas,{reduced=false}={}){
 const ctx=canvas.getContext('2d');if(!ctx)return {resize(){},update(){},start(){},stop(){}};
 const TAU=Math.PI*2,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,n)=>a+(b-a)*n;
 let W=1,H=1,DPR=1,scene,loop,appleDots=[],last=0,lastDraw=0,raf=0,active=false,layout='';
 const mouse={x:0,y:0,tx:0,ty:0};
 const state={mode:'IDLE',speed:.0055,targetSpeed:.0055,t:0,pulsePos:-1,pulseActive:false,jawOpen:0,targetJawOpen:0,appleGlow:.35,targetAppleGlow:.35,progress:0,targetProgress:0,emphasis:0,targetEmphasis:0};
 const bone=[232,230,225],gold=[222,185,111],mixBone=(p,a=1)=>`rgba(${bone.map((v,i)=>Math.round(lerp(v,gold[i],p))).join(',')},${a})`;
function drawPath(fn,fill,stroke,width=1){ctx.beginPath();fn(ctx);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function buildHalftoneApple(){
 appleDots=[];const scale=Math.min(W,H)*.115,p=new Path2D();
 p.moveTo(0,-scale*.62);p.bezierCurveTo(scale*.55,-scale*1.05,scale*1.18,-scale*.25,scale*.72,scale*.65);p.bezierCurveTo(scale*.42,scale*1.02,scale*.12,scale*.85,0,scale*.78);p.bezierCurveTo(-scale*.12,scale*.85,-scale*.42,scale*1.02,-scale*.72,scale*.65);p.bezierCurveTo(-scale*1.18,-scale*.25,-scale*.55,-scale*1.05,0,-scale*.62);p.closePath();
 const stem=new Path2D();stem.moveTo(-scale*.03,-scale*.6);stem.quadraticCurveTo(scale*.05,-scale*.95,scale*.16,-scale*1.08);stem.lineTo(scale*.22,-scale*1.03);stem.quadraticCurveTo(scale*.1,-scale*.9,scale*.04,-scale*.6);stem.closePath();
 const step=Math.max(3.3,scale*.075);
 // Hit testing is performed in CSS coordinates with an identity transform.
 ctx.save();ctx.setTransform(1,0,0,1,0,0);
 for(let y=-scale*1.15;y<scale*1.1;y+=step)for(let x=-scale*1.15;x<scale*1.15;x+=step)if(ctx.isPointInPath(p,x,y)||ctx.isPointInPath(stem,x,y)){
 const dist=Math.hypot((x+scale*.35)/scale,(y+scale*.35)/scale),intensity=Math.max(.15,1-dist*.52);
 appleDots.push({x,y,r:step*.42*(.45+intensity*.65),a:.25+intensity*.75,hi:intensity>.78});
 }ctx.restore();
}
function drawBackgroundGrid(){
 const cx=scene.cx,cy=scene.cy,r=Math.min(W,H)*(layout==='agent'?.44:.34);
 ctx.save();ctx.strokeStyle='#ffffff0b';ctx.lineWidth=.65;
 drawPath(c=>{c.moveTo(cx,86);c.lineTo(cx,H-112);c.moveTo(20,cy);c.lineTo(W-20,cy)},null,'#ffffff09',.65);
 drawPath(c=>c.arc(cx,cy,r,0,TAU),null,'#ffffff19',.7);
 ctx.setLineDash([1,8]);drawPath(c=>c.arc(cx,cy,r*.96,state.t*.2,state.t*.2+TAU),null,'#ffffff0c',.7);ctx.setLineDash([]);
 drawPath(c=>c.arc(cx,cy,r*.92,-Math.PI*.85,-Math.PI*.15),null,'#d9202760',.8);
 ctx.restore();
}
function drawHalftoneApple(t){
 const cx=scene.cx+mouse.x*5,cy=scene.cy+mouse.y*5,pulse=reduced?1:1+Math.sin(t*2.4)*.025;
 ctx.save();const grad=ctx.createRadialGradient(cx,cy,3,cx,cy,Math.min(W,H)*.18);grad.addColorStop(0,`rgba(217,32,39,${state.appleGlow*.36})`);grad.addColorStop(1,'rgba(217,32,39,0)');
 drawPath(c=>c.arc(cx,cy,Math.min(W,H)*.18,0,TAU),grad);
 for(const d of appleDots)drawPath(c=>c.arc(cx+d.x*pulse,cy+d.y*pulse,d.r,0,TAU),d.hi&&state.appleGlow>.5?`rgba(255,110,110,${d.a})`:`rgba(217,32,39,${d.a*(.75+state.appleGlow*.35)})`);
 ctx.restore();
}
function drawSkull(pulse){
 const jaw=state.jawOpen*.32,ink=mixBone(state.progress),shadow='#08080b';
 ctx.lineCap='round';ctx.lineJoin='round';
 // Occipital ring, atlas joint and temporal processes.
 drawPath(c=>{c.ellipse(-9,0,7,6,0,0,TAU)},shadow,ink,1.15);
 drawPath(c=>{c.moveTo(-14,-3);c.lineTo(-18,-1);c.lineTo(-18,1);c.lineTo(-14,3)},null,ink,1);
 drawPath(c=>{c.moveTo(-9,-6);c.bezierCurveTo(-3,-11,5,-10,12,-7);c.lineTo(28,-3);c.quadraticCurveTo(34,0,28,3);c.lineTo(12,7);c.bezierCurveTo(5,10,-3,11,-9,6);c.closePath()},shadow,ink,1.25);
 // Parietal, frontal and nasal seams remain light, rather than a filled mascot.
 drawPath(c=>{c.moveTo(-9,0);c.lineTo(-1,0);c.quadraticCurveTo(4,-3,12,0);c.lineTo(29,0);c.moveTo(-2,-8);c.lineTo(2,-2);c.moveTo(-2,8);c.lineTo(2,2);c.moveTo(19,-5);c.lineTo(21,0);c.lineTo(19,5)},null,mixBone(state.progress,.4),.65);
 for(const side of [-1,1]){
  // Recessed orbital cavity and slender zygomatic arch.
  drawPath(c=>{c.moveTo(1,side*3);c.bezierCurveTo(3,side*8,10,side*9,16,side*5);c.quadraticCurveTo(10,side*1.5,1,side*3);c.closePath()},'#020203',mixBone(state.progress,.8),.85);
  drawPath(c=>c.ellipse(23,side*2.5,2.1,.85,side*.2,0,TAU),'#010102',mixBone(state.progress,.42),.5);
  drawPath(c=>c.arc(7,side*4.9,1.15+state.jawOpen*.2,0,TAU),pulse>.15?'#ff5960':'#a4141a');
  ctx.save();ctx.translate(-5,side*3);ctx.rotate(side*jaw);
  // Distinct articulated dentary / maxilla; the hinge stays attached to the skull.
  drawPath(c=>{c.moveTo(-5,side*1);c.bezierCurveTo(0,side*5,13,side*6,30,side*1);c.quadraticCurveTo(19,side*8,4,side*7);c.lineTo(-5,side*3);c.closePath()},shadow,ink,1.05);
  drawPath(c=>c.ellipse(-4,side*2.5,1.6,1.3,0,0,TAU),'#0b0b0e',ink,.7);
  // A curved, hollow-looking fang, with a fine inner ridge.
  drawPath(c=>{c.moveTo(21,side*3);c.quadraticCurveTo(22,side*10,14,side*(14+state.jawOpen*3));c.quadraticCurveTo(18,side*9,17,side*4);c.closePath()},mixBone(state.progress,.88),ink,.65);
  drawPath(c=>{c.moveTo(20,side*4);c.quadraticCurveTo(20,side*9,15,side*12)},null,'#09090c',.5);
  for(let i=0;i<5;i++)drawPath(c=>{c.moveTo(3+i*3,side*5);c.lineTo(4+i*3,side*(7+(i%2)));c.lineTo(5+i*3,side*5)},null,mixBone(state.progress,.65),.55);
  ctx.restore();
 }
 // Premaxillary opening and quiet jaw-tip detail.
 drawPath(c=>{c.moveTo(29,-1.7);c.lineTo(32,0);c.lineTo(29,1.7)},null,ink,.7);
 if(state.jawOpen>.3){const len=state.jawOpen*14;drawPath(c=>{c.moveTo(30,0);c.lineTo(30+len,0);c.lineTo(33+len,-2);c.moveTo(30+len,0);c.lineTo(33+len,2)},null,'#d92027',.75);}
}
function drawOuroborosSpine(){
 const cx=scene.cx+mouse.x*scene.parallax,cy=scene.cy+mouse.y*scene.parallax;
 const segments=Math.round(clamp(loop.total/11,55,105)),span=.84;
 ctx.save();ctx.translate(cx,cy);
 if(layout==='agent'){const breath=reduced?1:1+Math.sin(performance.now()/1400)*.018;const size=(1+state.emphasis*.15)*breath;ctx.scale(size,size);}
 ctx.beginPath();for(let i=0;i<=segments;i++){const p=alongLoop(loop,state.t/TAU-i/segments*span);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}
 ctx.strokeStyle=state.mode==='THINKING'?'#d9202726':'#e8e6e10b';ctx.lineWidth=7*scene.scale;ctx.lineCap='round';ctx.stroke();
 for(let i=segments;i>=0;i--){
 const u=i/segments,p=alongLoop(loop,state.t/TAU-u*span),profile=bodyProfile(u);
 const d=Math.abs(u-state.pulsePos),pulse=state.pulseActive?Math.max(0,1-d/.12):0;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(scene.scale,scene.scale);
 if(i===0){drawSkull(pulse);ctx.restore();continue;}
 const goldness=layout==='agent'?clamp((state.progress-u*.55)/.45):state.progress;
 const r=(2+15.5*profile),alpha=(.9-u*.46)*(1-u*.28);
 const color=pulse>.15?`rgba(217,32,39,${Math.min(1,alpha+pulse*.45)})`:mixBone(goldness,alpha);
 ctx.lineCap='round';ctx.lineJoin='round';
 // Paired ribs grow from a narrow neck into a full thorax, then taper to a tail.
 for(const side of [-1,1]){
  drawPath(c=>{c.moveTo(.4,side*.8);c.bezierCurveTo(-r*.1,side*r*.42,-r*.28,side*r*.8,-r*.66,side*r);c.quadraticCurveTo(-r*.84,side*r*1.04,-r*.94,side*r*.88)},null,color,1+pulse*.55);
  if(profile>.27)drawPath(c=>{c.moveTo(-r*.16,side*r*.31);c.quadraticCurveTo(-r*.31,side*r*.7,-r*.69,side*r*.9)},null,mixBone(goldness,alpha*.24),.45);
 }
 // Saddle-shaped centrum, transverse wings and a dorsal neural spine.
 const b=Math.max(.35,2.5*profile);
 drawPath(c=>{c.moveTo(-b,0);c.lineTo(-b*.5,-b*.8);c.quadraticCurveTo(.7,-b*1.28,b*.9,-b*.62);c.lineTo(b,0);c.lineTo(b*.9,b*.62);c.quadraticCurveTo(.7,b*1.28,-b*.5,b*.8);c.closePath()},mixBone(goldness,alpha*.38),color,.65);
 drawPath(c=>{c.moveTo(-b*.2,0);c.lineTo(-b*1.15,0);c.moveTo(.2,-b*.5);c.lineTo(.2,-b*1.3)},null,color,.55);
 if(u>.91)drawPath(c=>{c.moveTo(-3,0);c.lineTo(3,0)},null,mixBone(goldness,alpha*.5),.5);
 ctx.restore();
 }
 ctx.restore();
}

 function resize(width,height){
  if(width<1||height<1)return;
  W=width;H=height;DPR=Math.min(globalThis.devicePixelRatio||1,2);
  canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);
  scene=layout==='agent'?{w:W,h:H,cx:W/2,cy:H/2,scale:Math.min(W,H)/360,sx:W*.3,sy:H*.43,parallax:2}:makeScene(W,H);loop=buildLoop(scene);buildHalftoneApple();
 }
 function update({status='running',progress=0,layout:nextLayout='',emphasis=0}={}){
  if(layout!==nextLayout){layout=nextLayout;resize(W,H);}
  state.targetEmphasis=clamp(Number(emphasis)||0);
  const wasRunning=state.mode==='THINKING',running=status==='running';
  state.mode=running?'THINKING':status==='complete'?'COMPLETE':'IDLE';
  state.targetSpeed=layout==='agent'?(running?.014:.0035):(running?.026:.0055);state.targetJawOpen=running?.15:0;
  state.targetAppleGlow=running?.95:status==='failed'?.6:.35;
  state.targetProgress=status==='complete'?1:clamp(Number(progress)||0,0,1);
  state.pulseActive=running;if(running&&!wasRunning)state.pulsePos=0;
 }
 function animate(now){
  if(!active)return;raf=requestAnimationFrame(animate);
  if(!scene||document.hidden||now-lastDraw<1000/(reduced?12:40))return;
  const dt=clamp((now-last)/1000||1/40,.001,.05);last=now;lastDraw=now;
  const smooth=k=>1-Math.exp(-k*dt);
  mouse.x=lerp(mouse.x,mouse.tx,smooth(4));mouse.y=lerp(mouse.y,mouse.ty,smooth(4));
  state.speed=lerp(state.speed,state.targetSpeed,smooth(3));state.jawOpen=lerp(state.jawOpen,state.targetJawOpen,smooth(9));
  state.appleGlow=lerp(state.appleGlow,state.targetAppleGlow,smooth(5));state.progress=lerp(state.progress,state.targetProgress,smooth(5));state.emphasis=reduced?state.targetEmphasis:lerp(state.emphasis,state.targetEmphasis,smooth(5));
  if(!reduced)state.t=(state.t+state.speed*dt*60)%TAU;
  if(state.pulseActive){state.pulsePos+=dt*.85;if(state.pulsePos>1.15)state.pulsePos=-.1;}
  ctx.clearRect(0,0,W,H);drawBackgroundGrid();drawHalftoneApple(now/1000);drawOuroborosSpine();
 }
 return {resize,update,
  pointer(x,y){mouse.tx=clamp(x,-1,1);mouse.ty=clamp(y,-1,1);},
  start(){if(active)return;active=true;last=performance.now();raf=requestAnimationFrame(animate);},
  stop(){active=false;cancelAnimationFrame(raf);},
 };
}
