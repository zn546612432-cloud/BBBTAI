/* The classic script starts independently of the phone module and its resource preload. */
(function(){
 const boot=document.getElementById('xm-boot');
 if(!boot)return;
 const video=document.getElementById('xm-boot-video');
 const skip=document.getElementById('xm-boot-skip');
 const next=document.getElementById('xm-boot-next');
 const message=document.getElementById('xm-boot-message');
 const tip=document.getElementById('xm-boot-tip');
 const index=document.getElementById('xm-boot-tip-index');
 const tips=[
  '點擊右上角的電池，即可為手機充電。',
  '不想自己破解？試著將委託分享給 Ouroboros。',
  '別忘了回弟弟們的消息，他們會等你。',
  '有些郵件的附件，或許藏著意想不到的東西。',
  '收到家人的心願時，記得去提醒事項看看。',
  'Mirage 上的某些名字，值得去瀏覽器搜索一下。',
  '試著給熙旺發一句「哥哥」。',
  '凌晨 05:30 的鬧鐘，可能不只是一個鬧鐘。'
 ];
 const seenKey='xm-startup-intro-seen-v1';
 let seen=false,finished=false,ready=false,closed=false,failed=false,tipTimer,deadline,position=0;
 try{seen=localStorage.getItem(seenKey)==='1';}catch{}
 const showTip=()=>{
  index.textContent=String(position+1).padStart(2,'0')+' / '+String(tips.length).padStart(2,'0');
  tip.textContent=tips[position];
  tip.classList.remove('tip-change');void tip.offsetWidth;tip.classList.add('tip-change');
  position=(position+1)%tips.length;
 };
 const revealEntry=()=>{if(finished&&ready&&!closed&&!failed){next.hidden=false;next.textContent='點擊進入';}};
 const finish=(remember=false)=>{
  if(finished||closed)return;
  finished=true;clearTimeout(deadline);video.pause();skip.hidden=true;
  if(remember)try{localStorage.setItem(seenKey,'1');}catch{}
  boot.classList.add('intro-finished');showTip();tipTimer=setInterval(showTip,3000);revealEntry();
 };
 window.__xmBootIntroFinish=()=>finish(false);
 window.__xmBootIntroError=()=>{failed=true;finish(false);};
 window.__xmBootIntroReady=(close)=>{
  ready=true;failed=false;message.textContent='';
  next.onclick=()=>{if(closed)return;closed=true;clearInterval(tipTimer);clearTimeout(deadline);video.pause();close();};
  revealEntry();
 };
 video.addEventListener('ended',()=>finish(true),{once:true});
 video.addEventListener('error',()=>finish(false),{once:true});
 skip.onclick=()=>finish(true);
 if(seen)skip.hidden=false;
 // Reduced motion, iOS low-power autoplay rejection and media/network failure
 // always land on exactly the same static final artwork, never a stuck splash.
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){finish(false);return;}
 deadline=setTimeout(()=>finish(false),15000);
 video.muted=true;
 try{Promise.resolve(video.play()).catch(()=>finish(false));}catch{finish(false);}
})();
