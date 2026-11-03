import {isStory55,taiRecognized} from '../story55/state.js';
import {taiLifeContext} from './life-context.js';
import {visibleMessages} from '../messaging/delivery.js';
import {callBridgeNote,isRecentTaiCall} from './humanize.js';
import {taiBondPrompt} from './relationship-bond.js';
import {extractTaiCuriosities,taiCuriosityPrompt} from './curiosity-memory-v9.js';
// Truthful, compact relationship context reconstructed only from visible
// NoApp messages and author-confirmed canon. Never read WeChat/private drafts.
const relevant=/喜欢|讨厌|害怕|记住|约好|答应|说好了|哥哥|圣诞惊魂夜|想你|我生气|你不认识|有事|博士|生日/;
export function xitaiRelationshipContext(s,{mode='text'}={}){
 if(!taiRecognized(s))return '';
 const c=s.content.conversations.noapp?.find(x=>x.id==='tai');
 const history=visibleMessages(c||{messages:[]}).filter(m=>m?.actual!==false&&!m.demo&&m.day<=s.day&&m.kind!=='app_invitation'&&m.kind!=='image'&&(m.kind!=='call'||m.transcript||m.callStatus==='ended')&&m.text);
 const recent=history.filter(m=>m.kind!=='call').slice(-16);
 const remembered=history.slice(0,-16).filter(m=>relevant.test(m.text)).slice(-8);
 const quotes=remembered.map(m=>'D'+m.day+' '+(m.from==='me'?'熙蒙':'熙泰')+'：'+String(m.voiceCaption||m.text).slice(0,140)).join('\n');
 const callEntry=history.filter(m=>m.kind==='call'&&(m.transcript||m.callStatus==='ended')).at(-1);
 const lastCall=callBridgeNote(callEntry,s);
 const lastUser=recent.filter(x=>x.from==='me').at(-1)?.text||'';
 let mood='基于对话自然选择反应，不强行提问。';
 if(/你不认识|忘了我|你是谁|不记得/.test(lastUser))mood='对方正在质疑你是否记得他。不要以陌生人口吻回答。可以带一点受伤、不耐烦或反问，具体指出已确立的彼此关系与真实共同话题。';
 else if(/讨厌|烦|别理|生气|走开/.test(lastUser))mood='当前可能有争执。尊重对方的情绪，允许嘴硬、追问或短暂沉默，但不要否认你们熟悉。';
 else if(/喜欢|想你|晚安|睡不着/.test(lastUser))mood='这是亲密关系对话，可以克制地亲昵，不要客服式安慰。';
 return [
  '人物关系事实：你是陈熙泰，和正在使用这部手机的熙蒙已经通过剧情相认，双方不是陌生人。你知道他是出色的黑客，感情、偏爱和默契真实存在。允许想念、吃醋、冷嘲与照顾；不能每次像第一次见面一样重新盘问他的身份。',
  '已知人物：熙旺是熙蒙的哥哥，与你们同为三胞胎；你早已查到他，不会说第一次听说熙蒙有哥哥。傅隆生是他们的养父，知道其身份不等于知道未来犯罪和私下微信。你们有技术上的共同话题，也会谈生活、出游、运动、学习、饮食与家人；他喜欢《圣诞惊魂夜》；是否陪看过必须有实际记录，不从兴趣补造共同经历。除此之外的私密共同经历，只能来自实际已发生的聊天或世界书明确设定。',
  taiBondPrompt(s,{channel:'noapp'}),
  taiCuriosityPrompt(extractTaiCuriosities(history,{day:s.day,channel:'noapp'}),{day:s.day}),
  taiLifeContext(s)+' '+mood,
  lastCall?(isRecentTaiCall(callEntry,s)?'刚打过的电话（真实发生，话题未结束时自然承接）：\n':'更早的通话原话（保留发生日期）：\n')+lastCall:'',
  recent.length?'最近已分享的生活与对话（含本人近况，须保持连续）：\n'+recent.map(m=>(m.from==='me'?'熙蒙':'熙泰')+'：'+String(m.voiceCaption||m.text).slice(0,240)).join('\n'):'',
  quotes?'较早的可核对聊天原话（不要改写成没发生的故事）：\n'+quotes:'',
  mode==='call'?'这是正在进行的实时电话，当前所有玩家发言都来自正在连通的 NoApp 电话，不要说正在打字、刚挂电话或发文字消息。你可以多讲几段，也能真实决定结束通话。':
   '这是即时文字消息，当前没有正在进行的电话。此前的通话已经真正结束，不可把玩家接着打字当成电话还在持续；只按真实挂断方和当前文字内容反应。可以多发有实际内容的消息，不必每句都反问。'
 ].filter(Boolean).join('\n\n');
}
