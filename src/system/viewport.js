export function viewportMetrics({width,layoutHeight,visualHeight=layoutHeight,offsetTop=0,focused=false}){return {mobile:width<=600,height:Math.max(220,Math.min(layoutHeight,visualHeight)),top:Math.max(0,offsetTop),keyboard:focused&&layoutHeight-visualHeight>110};}
export function mountViewport(phone){
 let frame=0,baseline=window.innerHeight,lastWidth=window.innerWidth;const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
  if(Math.abs(window.innerWidth-lastWidth)>80){baseline=window.innerHeight;lastWidth=window.innerWidth;}
  baseline=Math.max(baseline,window.innerHeight);
  const v=window.visualViewport,focused=!!document.activeElement?.matches('input,textarea,[contenteditable="true"]'),m=viewportMetrics({width:window.innerWidth,layoutHeight:baseline,visualHeight:v?.height||window.innerHeight,offsetTop:v?.offsetTop||0,focused});
  document.documentElement.classList.toggle('viewport-mobile',m.mobile);document.documentElement.style.setProperty('--visual-height',m.height+'px');document.documentElement.style.setProperty('--viewport-top',m.top+'px');phone.classList.toggle('keyboard-open',m.mobile&&m.keyboard);
  if(m.mobile&&focused&&document.activeElement.closest('.composer')){const messages=phone.querySelector('.chat-messages');if(messages)messages.scrollTop=messages.scrollHeight;}
 });};
 window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);window.addEventListener('resize',update);phone.addEventListener('focusin',update);phone.addEventListener('focusout',update);update();
}
