import {currentScript55} from '../../services/story55/scripted-chat.js';
import {createConversationTrack} from '../../services/messaging/lifecycle/engine.js';
const line=(who,text)=>({who,kind:'text',text});
const r=(s,id)=>s.story55?.wishes?.records?.[id];
const sent=(s,id)=>s.story55?.wishes?.story?.delivered?.includes(id);
const idle=(s,chat)=>!s.story55?.activeScene&&(!s.story55?.config||!currentScript55(s,'wechat',chat));
const d=(id,chat,condition,lines,extra={})=>({id,chat,at:'00:00',mandatory:true,priority:1,condition:s=>idle(s,chat)&&condition(s),lines,...extra});
export const D07_REPLY_SCENES=[
 d('headphones-promise','awei',s=>!!r(s,'d07-headphones'),[line('me','沒問題，哥買單。'),line('阿威','謝謝蒙哥！！')]),
 d('tableware-promise','wang',s=>!!r(s,'d07-tableware'),[line('me','去買十套，記我帳上。'),line('熙旺','哈哈，弟弟有錢說話就是不一樣。')]),
 d('keyboard-received','xiaoxin',s=>['delivered','completed'].includes(r(s,'d06-keyboard')?.status)&&sent(s,'wish-keyboard-thanks-2'),[line('me','這麼快就收到了？'),line('me','下次打遊戲你必須拿五殺。'),line('小辛','包的哥哥！')]),
 d('tableware-received','wang',s=>['delivered','completed'].includes(r(s,'d07-tableware')?.status)&&sent(s,'wish-tableware-photo'),[line('me','認真的嗎哥哥？'),line('me','我買的是碗，不是垃圾桶。'),line('熙旺','那……糖醋排骨？'),line('me','我要吃三碗飯。')]),
 d('brother-ask','wang',s=>s.story55?.brotherEgg?.stage==='queued',[line('熙旺','怎麼了蒙蒙？')],{onComplete:s=>{s.story55.brotherEgg.stage='waiting';}}),
 d('brother-pat','wang',s=>s.story55?.brotherEgg?.stage==='answered',[line('熙旺','乖')],{onComplete:s=>{s.story55.brotherEgg.stage='done';}})
];
export const d07RepliesTrack=createConversationTrack({day:7,prefix:'d07-reply',scenes:D07_REPLY_SCENES,progress:s=>s.story55.d07Replies??={}});
// Called only after the regular free-send path has committed an actual message.
export function observeBrotherFreeSend(s,{channel,conversationId,text,kind},messageId){
 if(s.story55?.version!==1||s.day<7||channel!=='wechat'||conversationId!=='wang'||kind!=='text')return;
 const egg=s.story55.brotherEgg;
 if(!egg&&text==='哥哥')s.story55.brotherEgg={stage:'queued',firstMessageId:messageId};
 else if(egg?.stage==='waiting'&&text.trim()){egg.stage='answered';egg.secondMessageId=messageId;}
}
