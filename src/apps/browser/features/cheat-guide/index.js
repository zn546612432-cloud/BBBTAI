import {esc} from '../../../../system/ui.js';
import {chargingBlock,shortChargeBlock} from '../../../../system/power/story.js';
import {date55,isStory55,story55Config,completed,nodeStatus} from '../../../../services/story55/state.js';
import {dailyContent,nodeInstructions,GUIDE_URL,GUIDE_ID} from './content.js';

export const guidePage={id:GUIDE_ID,title:'CHEAT CODE',label:'CHEAT CODE',url:GUIDE_URL,desc:'每日攻略',keywords:['cheatcode.invalid','作弊代碼','作弊代码','cheat code']};
export const isGuideUrl=query=>/^(?:https?:\/\/)?cheatcode\.invalid\/?$/i.test(String(query).trim());
const contacts={group:'狼崽團',wang:'熙旺',hufeng:'胡楓',fulongsheng:'傅隆生','s55-ouroboros':'Dr Ouroboros','mc-flow-d03':'Flow'};
const instruction=n=>nodeInstructions[n.id]||`${n.at?`${n.at} `:''}${n.channel==='wechat'?'微信':n.channel==='mirage'?'MIRAGE':'提醒事項'}${contacts[n.conversationId]?` → ${contacts[n.conversationId]}`:''}：打開當前對話，依次發送預填回覆，直到結束。`;
const item=(copy,status='')=>({copy,status});

export function dailyGuide(s){
 if(!isStory55(s))return null;
 const day=Math.max(1,Math.min(55,s.day)), content=dailyContent[day]||{}, nodes=story55Config(s).nodes;
 const required=[],other=(content.other||[]).map(x=>item(x)),eggs=(content.eggs||[]).map(x=>item(x));
 const due=nodes.filter(n=>Number.isInteger(n.gateDay)&&n.gateDay<=day&&n.day<=day);
 const prior=due.filter(n=>n.gateDay<day&&!completed(s,n.id));
 const today=nodes.filter(n=>n.day===day&&Number.isInteger(n.gateDay)&&n.gateDay<=day&&n.id!=='base');
 for(const n of [...prior,...today].filter((n,i,a)=>a.findIndex(x=>x.id===n.id)===i)){
  if(n.day>=30&&n.requires.some(id=>!completed(s,id))&&!completed(s,n.id))continue;
  required.push(item(instruction(n),completed(s,n.id)?'已完成':n.at&&day===n.day&&s.clock<n.at?`等待 ${n.at}`:'待完成'));
 }
 if(day===13)required.unshift(item('19:03 微信 → 傅隆生：完成當晚對話；KIRA 郵件最晚 22:10 發送。'));
 if(day>=14&&day<=24){
  const batch=s.story55.projects?.base?.batches?.[day-14];
  required.push(item(day===14?'GHOST → 項目 → Ouroboros’ Tear：完成五次連結測試。首次運行報錯屬正常流程。':'GHOST → 項目 → Ouroboros’ Tear：完成五次連結測試，再點擊「升級」，支付 US$100,000。',batch?.complete||completed(s,'base')?'已完成':'待完成'));
  if(day>=15&&!completed(s,'loan'))required.push(item(nodeInstructions.loan,day===15&&s.clock<'15:36'?'等待 15:36':'待完成'));
 }
 if(day>=8&&day<=10)other.push(item('MIRAGE：三份可接委託，按各自期限提交。'));
 if(day>=15&&day<=55)other.push(item('MIRAGE：查看今日兩份可接委託，完成後回委託頁手動提交。'));
 if(day>=15&&day<=24)eggs.push(item('08:00–09:25、12:00–12:30、22:00–23:00：GHOST → 已開啟的普通委託運行頁 → 右上角分享 → 確認，前往 MIRAGE 與 Dr Ouroboros 對話。'));
 if(day>=25&&completed(s,'base'))eggs.push(item('完成部署後，MIRAGE → 接下普通委託 → KIRA → 打開附件 → 文件預覽 → 分享至 Ouroboros’ Tear。每天最多兩次；完成後回 MIRAGE 手動提交。'));
 // Later chains are described one unlocked step at a time. Never reveal an
 // unopened future contact, file contents, or the outcome of a scene.
 if(day>=30){
  for(const n of nodes.filter(n=>n.day<=day&&n.day>=30&&nodeStatus(s,n.id).state==='ready'&&!required.some(x=>x.copy===instruction(n)))){
   if(n.id==='ending'&&day!==55)continue;
   const needed=due.some(g=>!completed(s,g.id)&&dependsOn(nodes,g,n.id));
   (needed?required:other).push(item(instruction(n),needed?'待完成':'可進行'));
  }
 }
 if(day===55)required.push(item('21:00、21:16、21:49、22:25、22:46、22:49：留意當晚消息與來電，依照手機畫面操作。'));
 const short=shortChargeBlock(s),long=chargingBlock(s);
 const blockers=required.filter(x=>x.status!=='已完成');
 const charge=[item(`短充：${short?'暫不可用':'可用'}`),item(`長充：${long?'暫不可用':'可用'}`)];
 if(short||long)charge.push(item(day===55?'今日請依照手機當前畫面操作。':blockers.length?'先完成上方待完成事項；有時間標記的對話須等到指定時刻。':'仍有未完成的主線；請檢查微信、MIRAGE、KIRA 的預填回覆及 GHOST 項目。'));
 if(day>=14&&day<=24&&!completed(s,'base'))charge.push(item('每日連結測試及設備升級只限制長充，不單獨限制短充。'));
 if(day===13)charge.push(item('等待晚間郵件期間不必一直掛機；其他主線門檻仍然有效。'));
 return {day,date:date55(day),required,other,eggs,charge};
}

function dependsOn(nodes,node,id,visited=new Set()){
 if(node.id===id)return true;
 if(visited.has(node.id))return false;
 visited.add(node.id);
 return node.requires.some(ref=>{const n=nodes.find(x=>x.id===ref);return n&&dependsOn(nodes,n,id,visited);});
}

const section=(title,entries,empty)=>`<section class="cc-section"><h2>${title}</h2>${entries.length?`<ul>${entries.map(({copy,status})=>`<li>${status?`<span class="cc-status${status==='已完成'?' cc-done':''}">${esc(status)}</span>`:''}<p>${esc(copy)}</p></li>`).join('')}</ul>`:`<p class="cc-empty">${empty}</p>`}</section>`;
export function renderCheatGuide(s){
 const guide=dailyGuide(s);
 if(!guide)return '<article class="cc-guide"><h1>CHEAT CODE</h1><p>目前沒有可查閱的日期。</p></article>';
 const {day,date,required,other,eggs,charge}=guide;
 return `<article class="cc-guide" data-key="cheat-guide-${day}"><header><span class="cc-brand">CHEAT<span> CODE</span></span><small>DAILY WALKTHROUGH</small></header><div class="cc-main"><div class="cc-date"><time>${esc(date.replaceAll('-','.'))}</time><span>DAY ${String(day).padStart(2,'0')}</span></div><h1>今日攻略</h1>${section('今日必做',required,'今日沒有獨立必做事項。')}${section('今日其他內容',other,'沒有新增固定內容。')}${section('今日彩蛋',eggs,'今日沒有已知的額外觸發方式。')}${section('充電條件',charge,'') }</div><footer>CHEAT CODE / 每日更新</footer></article>`;
}
