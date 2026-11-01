import {isStory55,story55Config,nodeById,nodeStatus,completeNode,completed,date55} from './state.js';
import {anonymousPresence55,activateStory55,advanceScene55,scene55,sceneLines,markMail55,readEvidence55,sendQuestion55,payNode55,nodeLink55,tickStory55} from './runtime.js';
import {authorizeProject,startDeploymentStep,upgradeHardware} from './projects.js';
import {validateStory55Config,importStory55Config,exportStory55Config} from './config.js';
import {installMining,upgradeMining,sellMining} from './mining.js';
import {createGestureAudio} from '../voice/playback.js';
import {beginScriptedCall,answerScriptedCall,retryScriptedCall} from './scripted-phone.js';
import {voicePreview} from '../ai/gateway.js';
import {saveTestSnapshot,getTestSnapshot,restoreTestSnapshot,deleteTestSnapshot,storySourceVersion} from './test-snapshots.js';
import {rebuildStory55AtDay,prepareStory55NodeAtDay} from './rebuild.js';
const open=(c,appId,route='/',params={})=>c.router.open({appId,route,params});
function archiveAndStart(c){const old=c.store.get(),nav=structuredClone(old.nav);if(isStory55(old))saveTestSnapshot(c.store.storage,old,'创建新周目前 · D'+old.day);else c.store.storage?.setItem('ximeng-phone-before-story55',JSON.stringify(old));c.store.update(s=>{if(isStory55(s))rebuildStory55AtDay(s,1,'08:00');else activateStory55(s);s.nav=nav;s.unlocked=true;});}
export function previewNode55(s,id){return prepareStory55NodeAtDay(s,id);}

function exportText(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
export async function handleStory55Action(a,t,c){
 if(!a.startsWith('s55-'))return false;
 const id=t.dataset.node,project=t.dataset.project;
 if(a==='s55-new-run'){archiveAndStart(c);return true;}
 if(a==='s55-save-snapshot'){const s=c.store.get();saveTestSnapshot(c.store.storage,s,'手动保存 · D'+s.day);c.toast?.('测试快照已单独保存');return true;}
 if(a==='s55-rebuild-snapshot'){const saved=getTestSnapshot(c.store.storage,t.dataset.snapshot);saveTestSnapshot(c.store.storage,c.store.get(),'按新版重建前 · D'+c.store.get().day);c.store.update(s=>rebuildStory55AtDay(s,saved.entry.day,saved.entry.clock));c.toast?.('已使用当前剧情重建目标日期，旧快照保留');return true;}
 if(a==='s55-restore-snapshot'){const saved=getTestSnapshot(c.store.storage,t.dataset.snapshot),changed=saved.entry.sourceVersion!==storySourceVersion(c.store.get());if(changed&&!globalThis.confirm?.('这份快照使用不同的剧情版本。按旧版恢复会切换当前测试环境，系统将先备份当前状态。确定恢复吗？'))return true;restoreTestSnapshot(c.store,t.dataset.snapshot,{allowDifferentVersion:changed});c.toast?.('快照已恢复；恢复前状态已自动备份');return true;}
 if(a==='s55-delete-snapshot'){if(!globalThis.confirm?.('确定只删除这一份测试快照吗？剧情原始数据不会删除。'))return true;deleteTestSnapshot(c.store.storage,t.dataset.snapshot);c.toast?.('测试快照已删除');return true;}
 if(a==='s55-install-noapp'){
  if(!isStory55(c.store.get())||!completed(c.store.get(),'invite'))throw Error('请先在KIRA收到并阅读NoApp邀请');
  c.store.update(s=>{s.story55.noappInstalled=true;});open(c,'noapp','/chat/tai');return true;
 }
 if(a==='s55-select-node'){c.store.update(s=>s.editor.story55Node=id);return true;}
 if(a==='s55-select-project'){c.store.update(s=>s.editor.story55Project=project);return true;}
 if(!isStory55(c.store.get()))throw Error('请先在55天运行台创建周目');
 if(a==='s55-preview-node'){saveTestSnapshot(c.store.storage,c.store.get(),'节点预览前 · D'+c.store.get().day);c.store.update(s=>previewNode55(s,id));return true;}
 if(a==='s55-day'){const day=Number(t.dataset.day);if(!Number.isInteger(day)||day<1||day>55)throw Error('目标剧情日无效');saveTestSnapshot(c.store.storage,c.store.get(),'日期跳转前 · D'+c.store.get().day);c.store.update(s=>rebuildStory55AtDay(s,day,'08:00'));return true;}
 if(a==='s55-node'){const state=nodeStatus(c.store.get(),id);if(state.state==='locked')throw Error(state.reason);if(id==='recognition')c.store.update(s=>s.story55.noappInstalled=true);c.router.open(nodeLink55(c.store.get(),id));return true;}
 if(a==='s55-anonymous-chat'){c.store.update(s=>{s.story55.anonymousWindows??={};if(s.day>=15&&s.day<=24)s.story55.anonymousWindows[s.day]??=Date.now();});open(c,'mirage','/chat/s55-ouroboros');return true;}
 if(a==='s55-objectives'){open(c,'reminders','/');return true;}
 if(a==='s55-projects'){open(c,'ghost','/deployments');return true;}
 if(a==='s55-project'){open(c,'ghost','/deployment',{project});return true;}
 if(a==='s55-files'){open(c,'files','/story55');return true;}
 if(a==='s55-linked-file'){open(c,'files','/linked/'+encodeURIComponent(t.dataset.order));return true;}
 if(a==='s55-document'){open(c,'files','/story55',{document:t.dataset.id});return true;}
 if(a==='s55-backup'){c.download();return true;}
 if(a==='s55-map-area'){open(c,'maps','/',{area:t.dataset.area});return true;}
 if(a==='s55-map-pin'){open(c,'maps','/place',{id:t.dataset.id});return true;}
 if(a==='s55-run-step'){let run;c.store.update(s=>run=startDeploymentStep(s,project));open(c,'ghost','/contract',{orderId:run});return true;}
 if(a==='s55-upgrade'){c.store.update(s=>upgradeHardware(s));return true;}
 if(a==='s55-read-mail'){c.store.update(s=>markMail55(s,t.dataset.id));return true;}
 if(['s55-read-file','s55-read-page','s55-read-map'].includes(a)){c.store.update(s=>readEvidence55(s,a.slice(9),t.dataset.id));return true;}
 if(a==='s55-question'){c.store.update(s=>sendQuestion55(s));return true;}
 if(a==='s55-pay-node'){c.store.update(s=>payNode55(s,id));return true;}
 if(a==='s55-accept-story-call'){beginScriptedCall(c,id);return true;}
  if(a==='s55-call-answer'){answerScriptedCall(c);return true;}
  if(a==='s55-call-retry'){retryScriptedCall(c);return true;}
  if(a==='s55-call-settings'){open(c,'noapp','/settings-ai');return true;}
  if(a==='s55-scene-next'){c.store.update(s=>advanceScene55(s,id));return true;}
 if(a==='s55-export-config'){exportText(exportStory55Config(c.store.get()),'ximeng-story55-config.json');return true;}
 if(a==='s55-commission'){
  let run;c.store.update(s=>{const g=s.ghost??={orders:{},history:[],balance:0,config:{}};const pending=Object.values(g.orders).find(o=>o.story55Commission&&o.status!=='paid');if(pending){run=pending.id;return;}run='s55-job-'+(Object.values(g.orders).filter(o=>o.story55Commission).length+1);g.orders[run]={id:run,type:'extract',key:'JOB-CHECK',status:'authorized',attempts:0,story55Commission:true,settings:{seconds:60,retries:1000,rounds:2,codeLength:4,reward:20000}};});open(c,'ghost','/contract',{orderId:run});return true;
 }
 if(a==='s55-mining'){open(c,'ghost','/mining');return true;}
 if(a==='s55-mining-install'){c.store.update(s=>installMining(s));return true;}
 if(a==='s55-mining-upgrade'){c.store.update(s=>upgradeMining(s));return true;}
 if(a==='s55-mining-sell'){c.store.update(s=>sellMining(s));return true;}
 if(a==='s55-speak-line'){
  const s=c.store.get(),line=sceneLines(s,id)[scene55(s,id).index],audio=createGestureAudio();if(!audio||!line)return true;
  const blob=await voicePreview({text:line[1],tone:'dry'}),url=URL.createObjectURL(blob);audio.src=url;audio.onended=()=>URL.revokeObjectURL(url);await audio.play();return true;
 }
 if(a==='s55-final-audio'){
  const src=story55Config(c.store.get()).finalAudio;if(!src)throw Error('终局音频尚未配置；可在运行台的配置中设置finalAudio资源路径');
  const audio=createGestureAudio();if(!audio)throw Error('无法创建播放器');
  // Media lives beside the deployed index, NOT beside a hashed JS module.
  const pageBase=new URL('./',globalThis.location?.href||document.baseURI);
  audio.src=/^https?:\/\//i.test(src)?src:new URL(src.replace(/^\/+/,''),pageBase).href;
  audio.onerror=()=>c.toast?.('终局录音无法加载，请检查文件路径');
  audio.onended=()=>{
   if(c.store.get().story55.finalAudioHeard)return; // replay does not replay the ending
   c.store.update(s=>{s.story55.finalAudioHeard=true;advanceScene55(s,id);});
  };
  await audio.play();return true;
 }
 return true;
}
export function submitStory55Form(form,c){
 const kind=form.dataset.form;if(!kind?.startsWith('s55-'))return false;
 if(!isStory55(c.store.get()))throw Error('请先创建55天周目');const d=new FormData(form);
 if(kind==='s55-authorize'){c.store.update(s=>authorizeProject(s,String(d.get('project')),String(d.get('key'))));return true;}
 if(kind==='s55-time'){const day=Number(d.get('day')),clock=String(d.get('clock'));if(!Number.isInteger(day)||day<1||day>55||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw Error('日期或时间无效');saveTestSnapshot(c.store.storage,c.store.get(),'日期跳转前 · D'+c.store.get().day);c.store.update(s=>rebuildStory55AtDay(s,day,clock));return true;}
 if(kind==='s55-config-import'){c.store.update(s=>{importStory55Config(s,String(d.get('json')));tickStory55(s);});return true;}
 if(kind==='s55-test-funds'){const amount=Number(d.get('amount'));if(!Number.isFinite(amount)||amount<=0||amount>100000000)throw Error('测试金额无效');c.store.update(s=>{s.bankData.balance+=amount;s.bankData.transactions.unshift({id:'s55-test-'+Date.now(),label:'TEST FUNDS',amount,test:true,time:s.clock});});return true;}
 const cfg=structuredClone(story55Config(c.store.get()));
 if(kind==='s55-node-config'){const n=cfg.nodes.find(n=>n.id===d.get('id'));if(!n)throw Error('节点不存在');n.title=String(d.get('title'));n.day=Number(d.get('day'));if(d.get('gateDay'))n.gateDay=Number(d.get('gateDay'));else delete n.gateDay;if(n.kind==='project')cfg.projects.find(p=>p.id===n.project).day=n.day;n.requires=String(d.get('requires')).split(',').map(x=>x.trim()).filter(Boolean);
  const lines=String(d.get('lines')).trim();if(lines)cfg.scenes[n.id]=lines.split('\n').map(x=>{const i=x.indexOf('|');if(i<1)throw Error('每行请填写：角色ID | 台词');return [x.slice(0,i).trim(),x.slice(i+1).trim()];});
 }
 if(kind==='s55-resource'){const table=String(d.get('table'));if(!['mails','documents','pages','locations'].includes(table))throw Error('资源类型无效');const r=cfg[table].find(x=>x.id===d.get('id'));if(!r)throw Error('资源不存在');r[table==='mails'?'subject':table==='locations'?'name':'title']=String(d.get('title'));if(table==='locations'){r.x=Number(d.get('x'));r.y=Number(d.get('y'));r.area=String(d.get('area'));r.description=String(d.get('body'));}else{r.body=String(d.get('body'));if(table==='documents')r.asset=String(d.get('asset')).trim();}}
 if(kind==='s55-media-config'){cfg.finalAudio=String(d.get('finalAudio')||'').trim();}
 if(kind==='s55-project-config'){const p=cfg.projects.find(p=>p.id===d.get('id'));p.key=String(d.get('key')).trim();p.gains=String(d.get('gains')).split(',').map(Number);p.batches=p.gains.length;p.steps=String(d.get('steps')).split(',').map(x=>x.trim());p.minimumHardware=Number(d.get('hardware'));}
 const checked=validateStory55Config(cfg);c.store.update(s=>{if(kind==='s55-project-config'){const id=String(d.get('id'));if(s.story55.projects[id]?.batches.length)throw Error('项目已有进度，请先创建新周目再调整批次或小游戏');}s.story55.config=checked;tickStory55(s);});return true;
}
