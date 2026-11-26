// Presentation state is deliberately separate from the canonical group/actor IDs.
import {actors} from '../../../../editor/conversations/model.js';
export const GROUP_ID='group';
export const FATHER_ID='fulongsheng';
export const BROTHERS=['熙旺','胡枫','阿威','小辛','仔仔'];
export const PRIVATE_IDS={'熙旺':'wang','胡枫':'hufeng','阿威':'awei','小辛':'xiaoxin','仔仔':'zaizai'};
export const ACTOR_IDS={'熙旺':'wang','胡枫':'胡枫','阿威':'阿威','小辛':'小辛','仔仔':'仔仔'};
export const groupThread=s=>s.content?.conversations?.wechat?.find(c=>c.id===GROUP_ID);
export const groupState=s=>s.wechatGroupEggs||{};
export function editGroupState(s){const g=s.wechatGroupEggs??={};g.jobs??=[];g.classifications??={};g.sequence??=0;return g;}
export const chatSettings=(s,id)=>s.wechatChatSettings?.[id]||{};
export function editChatSettings(s,id){const settings=s.wechatChatSettings??={};return settings[id]??={};}
export const groupEggsOpen=s=>s.story55?.version===1&&!s.story55.ended&&s.day>=2&&s.day<=53;
export const groupAway=s=>!!groupState(s).leave;
export const fatherPresent=s=>groupState(s).father?.stage==='present';
export const fatherUsed=s=>!!groupState(s).father?.used;
export const groupName=(s,c=groupThread(s))=>c?.id===GROUP_ID?(chatSettings(s,GROUP_ID).name||c.name||'狼崽團'):(c?.name||'微信');
export const chatTitle=(s,c)=>c?.id===GROUP_ID?(chatSettings(s,GROUP_ID).remark||groupName(s,c)):c?.name||'微信';
export function displayMembers(s,c=groupThread(s)){
 if(!c)return [];
 const original=actors(c);
 if(c.id!==GROUP_ID)return original;
 return [...original.filter(m=>!(m.id==='me'&&groupAway(s))),...(fatherPresent(s)?[{id:FATHER_ID,name:'傅隆生'}]:[])];
}
export const gameMinute=s=>(s.day-1)*1440+Number(s.clock.slice(0,2))*60+Number(s.clock.slice(3));
