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
  '開機密碼是 0816。',
  '點擊右上角的電池，即可為手機充電。',
  '在主畫面短充，時間會過得很快。',
  '覺得群聊太吵？打開勿擾模式！',
  '0000 能讓你回到故事起點。',
  '備忘錄能提醒你今天要做什麼。',
  '設定裡可以更換壁紙。',
  '從螢幕右上角向下滑，可以打開控制中心。',
  '想安靜一會兒？控制中心可以一鍵靜音。',
  '別忘了回弟弟們的消息，他們會等你。',
  '收到家人的心願時，記得去提醒事項看看。',
  '試著給熙旺發一句「哥哥」。',
  '有些郵件的附件，或許藏著意想不到的東西。',
  '收到 ZIP 檔案後，記得儲存到「檔案」。',
  'Mirage 上的某些名字，值得在瀏覽器搜尋一下。',
  '不想自己破解？試著將委託分享給 Ouroboros。',
  '有些委託的授權密鑰，會透過郵件寄來。',
  '完成當天的必要事項後，才可以長充。',
  '短充每天最多補充 10% 電量。',
  '有些消息只有在特定時間才會收到。',
  '凌晨 05:30 的鬧鐘，可能不只是一個鬧鐘。',
  '查看行事曆，記住接下來的安排。',
  '別忽略朋友圈，偶爾也會有新的動態。',
  '在照片裡，也可以把喜歡的圖片設為壁紙。',
  '備忘錄裡的「Cheat Code」，每天都有新的提示。'
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
 window.__xmBootIntroReady=(close,status='')=>{
  ready=true;failed=false;message.textContent=status;
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
