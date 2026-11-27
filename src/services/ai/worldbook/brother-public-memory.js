import {visibleMessages} from '../../messaging/delivery.js';
import {selectPublicPresetKnowledge} from './preset-knowledge.js';
const aliases={me:'熙蒙',wang:'熙旺',hufeng:'胡枫',awei:'阿威',xiaoxin:'小辛',zaizai:'仔仔','胡楓':'胡枫'};
const people=new Set(['熙蒙','熙旺','胡枫','阿威','小辛','仔仔']);
export function brotherPublicMemory(s,query){
 const group=s.content?.conversations?.wechat?.find(c=>c.id==='group');
 const evidence=visibleMessages(group,s).filter(m=>m.kind==='text'&&!m.wechatEgg&&!m.demo&&!m.authoredPending&&m.actual!==false&&!m.testOnly&&(m.day==null||m.day<=s.day)).map(m=>({...m,by:aliases[m.from]||m.from})).filter(m=>people.has(m.by));
 return selectPublicPresetKnowledge(evidence,query);
}
