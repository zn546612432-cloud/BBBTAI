const TAU=Math.PI*2;
export function makeScene(w,h){
 if(h<310){const scale=Math.min(.83,Math.max(.44,w/550));return {w,h,cx:w/2,cy:h/2,scale,sx:Math.max(35,Math.min(w*.34,w/2-40*scale-12)),sy:Math.max(18,h*.36),parallax:Math.min(4,w*.01)};}
 const scale=Math.min(1.12,Math.max(.66,w/430));
 const top=78,bottom=Math.max(top+140,h-126),cy=(top+bottom)/2;
 return {w,h,cx:w/2,cy,scale,sx:Math.max(35,Math.min(w*.36,w/2-56*scale-Math.min(6,w*.014)-12)),sy:Math.max(40,Math.min((bottom-top)*.56,h*.3,265)),parallax:Math.min(6,w*.014)};
}
export function infinity(t,s){const sn=Math.sin(t),d=1+sn*sn;return{x:s.sx*Math.cos(t)/d,y:s.sy*sn*Math.cos(t)/d*1.45};}
export function buildLoop(scene,steps=1200){
 let total=0;const points=[];let prev=null;
 for(let i=0;i<=steps;i++){const p=infinity(i/steps*TAU,scene);if(prev)total+=Math.hypot(p.x-prev.x,p.y-prev.y);points.push({...p,length:total});prev=p;}
 return {points,total};
}
export function alongLoop(loop,fraction){
 const target=((fraction%1)+1)%1*loop.total,p=loop.points;
 let lo=0,hi=p.length-1;
 while(hi-lo>1){const mid=(lo+hi)>>1;if(p[mid].length<target)lo=mid;else hi=mid;}
 const u=(target-p[lo].length)/(p[hi].length-p[lo].length||1);
 return {x:p[lo].x+(p[hi].x-p[lo].x)*u,y:p[lo].y+(p[hi].y-p[lo].y)*u,angle:Math.atan2(p[hi].y-p[lo].y,p[hi].x-p[lo].x)};
}
export function bodyProfile(u){
 const neck=.34+.66*Math.sin(Math.min(1,u/.16)*Math.PI/2);
 const tail=Math.pow(Math.max(.002,1-Math.max(0,(u-.58)/.42)),.69);
 return neck*tail;
}
