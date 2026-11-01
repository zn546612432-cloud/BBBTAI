// Only called by developer date reconstruction; never by normal gameplay.
import {
 linkedMissions,linkedMailId,linkedArtifactId,
 acceptLinkedMission,advanceLinkedMission
} from '../../apps/mirage/linked-missions.js';
import {deliverLinkedArtifact,tickLinkedContracts,linkedArtifacts} from '../../apps/mirage/linked-contract-runtime.js';
import {authorize,begin,finish} from '../../apps/ghost/state.js';

export function rebuildLinkedContractsForDay(s,day){
 if(!s.story55?.version)return 0;
 const missions=linkedMissions(s).filter(m=>(m.publishDay||1)===day);
 let simulated=0;
 const originalClock=s.clock;
 for(const m of missions){
  // At D01..D(N-1) the developer chose to treat authored tasks as completed.
  // 00:00 avoids inventing a failed deadline when a contract is due early.
  s.clock='00:00';
  if(!acceptLinkedMission(s,m.id))throw Error('无法重建MIRAGE委托接取：'+m.id);
  if(!s.content.mail.some(mail=>mail.id===linkedMailId(m.id)))throw Error('跨App重建缺少KIRA委托邮件：'+m.id);
  if(!advanceLinkedMission(s,m.id,2)||!advanceLinkedMission(s,m.id,3))throw Error('跨App前置步骤无法推进：'+m.id);
  const run=authorize(s,{orderId:m.id,mailId:linkedMailId(m.id),type:m.type});
  if(!run||!advanceLinkedMission(s,m.id,4))throw Error('GHOST未正确绑定委托：'+m.id);
  if(!begin(s,m.id,0))throw Error('GHOST无法模拟执行委托：'+m.id);
  finish(s,m.id,true,1000);
  run.test=true;
  const artifact=linkedArtifacts(s).find(f=>f.id===linkedArtifactId(m.id));
  if(!artifact)throw Error('GHOST没有生成成果附件：'+m.id);
  const mail=deliverLinkedArtifact(s,m.id,artifact.id,{test:true,note:'开发者时间重建 · 自动模拟此前已交付的成果'});
  if(!mail?.attachments?.includes(artifact.id))throw Error('KIRA重建缺少手动交付模拟记录：'+m.id);
  simulated++;
 }
 s.clock=originalClock;
 tickLinkedContracts(s); // game-time scheduled reviews can mature between days
 return simulated;
}
