import {dateParts} from '../../services/calendar.js';
import {uid} from '../../services/id.js';
const names={me:'熙蒙',wang:'熙旺',tai:'Dr Ouroboros',rook:'Rookery 13','胡枫':'胡枫','小辛':'小辛','阿威':'阿威','仔仔':'仔仔'};
export const conversations=s=>Object.entries(s.content.conversations).flatMap(([channel,list])=>list.map(c=>({channel,c})));
export const selectedConversation=s=>conversations(s).find(x=>x.c.id===s.editor.conversation&&(!s.editor.channel||x.channel===s.editor.channel))||conversations(s)[0]||null;
export function actorName(c,id){return c.actorNames?.[id]||c.participants?.find(p=>p.id===id)?.name||(id===c.id?c.name:names[id]||id);}
export function actors(c){
 const ids=new Set(c.participants?.length?c.participants.map(p=>p.id):c.id==='group'?['me','wang','胡枫','小辛','阿威','仔仔']:['me',c.id]);
 for(const m of c.messages)if(m.from)ids.add(m.from);
 return [...ids].map(id=>({id,name:actorName(c,id)}));
}
export function renameConversation(c,name){name=name.trim();if(!name||name.length>60)throw Error('对话名称需为 1–60 字');c.name=name;if(!isGroup(c)&&c.actorNames?.[c.id])c.actorNames[c.id]=name;}
export function renameActor(c,id,name){name=name.trim();if(!name||name.length>60)throw Error('发言人名称需为 1–60 字');if(!actors(c).some(a=>a.id===id))throw Error('发言人不存在');(c.actorNames||={})[id]=name;if(!isGroup(c)&&id===c.id)c.name=name;}
export function scheduleFrom(input,s){
 const mode=input.mode||'immediate';
 if(mode==='immediate')return {mode};
 if(mode==='game-time'){
  const day=Number(input.day??s.day),clock=input.clock??s.clock;
  if(!Number.isInteger(day)||day<1||day>90||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))throw Error('请输入 D01–D90 和有效的游戏时间');
  return {mode,day,clock};
 }
 if(mode==='chat-delay'){
  const seconds=Number(input.seconds??3);
  if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('延迟时间需为 0–3600 秒');
  return {mode,seconds};
 }
 throw Error('未知的出现条件');
}
export function clearDelivery(s,c,m){delete m.delivery;m.deliveryRevision=(m.deliveryRevision||0)+1;s.notifications=s.notifications.filter(n=>n.messageId!==m.id||n.conversationId!==c.id);}
export function setSchedule(s,c,m,input){const next=scheduleFrom(input,s);if(JSON.stringify(next)===JSON.stringify(m.schedule||{mode:'immediate'}))return;m.schedule=next;clearDelivery(s,c,m);}
export function newMessage(s,c,kind='text'){
 const last=c.messages.at(-1),from=last?.from||actors(c).find(a=>a.id!=='me')?.id||'me';
 return {id:uid(),from,text:kind==='text'?'新消息':'',time:s.clock,sentDate:dateParts(s).iso,kind,authored:true,schedule:{mode:'immediate'}};
}
export function reorderMessage(c,id,targetId,after=false){if(id===targetId)return;const i=c.messages.findIndex(m=>m.id===id);if(i<0||!c.messages.some(m=>m.id===targetId))return;const [m]=c.messages.splice(i,1),j=c.messages.findIndex(m=>m.id===targetId);c.messages.splice(j+(after?1:0),0,m);}
export function moveMessageTo(c,id,index){const i=c.messages.findIndex(m=>m.id===id);if(i<0)return;const [m]=c.messages.splice(i,1);c.messages.splice(Math.max(0,Math.min(c.messages.length,index)),0,m);}
export function scheduleLabel(m){if(!m.schedule||m.schedule.mode==='immediate')return '已在聊天记录';if(m.delivery)return '已弹出';return m.schedule.mode==='game-time'?`D${String(m.schedule.day).padStart(2,'0')} · ${m.schedule.clock}`:`打开对话后 ${m.schedule.seconds} 秒`;}
export const chatApps=[['wechat','微信'],['noapp','NoApp'],['mirage','MIRAGE'],['messages','信息']];
export const isGroup=c=>c.id==='group'||c.group===true;
export function createConversation(store,{channel,name,type='direct',members=''}){
 if(!chatApps.some(([id])=>id===channel))throw Error('请选择支持的聊天软件');
 name=String(name||'').trim();if(!name||name.length>60)throw Error('联系人或群聊名称需为 1–60 字');
 if(!['direct','group'].includes(type))throw Error('请选择私聊或群聊');
 const memberNames=[...new Set(String(members).split(/[\n,，、]/).map(n=>n.trim()).filter(n=>n&&n!=='熙蒙'))];
 if(type==='group'&&(!memberNames.length||memberNames.length>30||memberNames.some(n=>n.length>60)))throw Error('群聊请填写 1–30 位成员，每个名字不超过 60 字');
 const id=uid(),c={id,name,avatar:name.slice(0,1),group:type==='group',messages:[],authored:true};
 if(type==='group')c.participants=[{id:'me',name:'熙蒙'},...memberNames.map(name=>({id:uid(),name}))];
 store.update(s=>{(s.content.conversations[channel]||=[]).push(c);s.editor.channel=channel;s.editor.conversation=id;});
 return id;
}
