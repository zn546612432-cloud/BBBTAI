import {isStory55,taiRecognized} from '../story55/state.js';
import {taiLifeContext} from './life-context.js';
import {visibleMessages} from '../messaging/delivery.js';
import {callBridgeNote,isRecentTaiCall,shouldRecallTaiCall} from './humanize.js';
import {taiBondPrompt} from './relationship-bond.js';
import {taiRelationshipDirector,taiRelationshipInstruction} from './relationship-director.js';
import {extractTaiCuriosities,taiCuriosityPrompt} from './curiosity-memory-v9.js';
import {taiPlotMemory,recallTaiOlderTalk} from './worldbook/plot-memory.js';
// Read-only projection from the existing game clock and delivered messages.
// No separate schedule, save or inferred history.
export function taiRelativeDayLabel(eventDay,currentDay){
 if(!Number.isInteger(eventDay)||!Number.isInteger(currentDay)||eventDay>currentDay||eventDay<1)return '日期未確認';
 const gap=currentDay-eventDay;
 return gap===0?'今天':gap===1?'昨天':gap===2?'前天':gap+' 天前';
}
export function taiDatedNoAppQuote(m,currentDay){
 const day=Number.isInteger(m?.day)?m.day:null;
 const t=String(m?.time||m?.clock||'');
 const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t)?' '+t:'';
 const when=day!=null?'D'+day+time+'（'+taiRelativeDayLabel(day,currentDay)+'）':'（日期未確認）';
 return when+' '+(m?.from==='me'?'熙蒙':'熙泰')+'：'+String(m?.voiceCaption||m?.text||'');
}
export function taiCallTimelineInstruction(s,topic=''){
 if(!Number.isInteger(s?.day))return '';
 const q=String(topic||'');
 const aboutYesterday=/(?:昨天|昨晚|昨日)/u.test(q);
 const aboutEarlier=/(?:前天|前幾天|前几天|上次|那天|之前)/u.test(q);
 return '【遊戲時間與記憶先後｜高優先級】現在是 D'+s.day+' '+(s.clock||'時間未知')+'（澳門遊戲時間）。下方聊天和通話回憶中的 D 日期均是真實來源時間，不是本通電話的即時發言。只有目前正在進行的對話中確實剛說或剛發生的事情，才可稱「剛才／剛剛」。同一天稍早也不要隨意說「剛才」；D'+(s.day-1)+' 是昨天，更早要說「之前／那天／前幾天」。引用跨日舊事時不可說「剛才」。'
  +(aboutYesterday?' 玩家此輪明確談到昨天，指的是 D'+(s.day-1)+'，相關舊事應說「昨天」，不得擅自變成「剛才」。':'')
  +(aboutEarlier?' 玩家提及較早發生的事，先按真實 D 日期再敘述，不能憑聊天列表的先後判為剛才。':'');
}
// Truthful, compact relationship context reconstructed only from visible
// NoApp messages and author-confirmed canon. Never read WeChat/private drafts.
const relevant=/喜欢|讨厌|害怕|记住|约好|答应|说好了|哥哥|圣诞惊魂夜|想你|我生气|你不认识|有事|博士|生日/;
export function xitaiRelationshipContext(s,{mode='text',callActive=false,topic=''}={}){
 if(!taiRecognized(s))return '';
 const c=s.content.conversations.noapp?.find(x=>x.id==='tai');
 const history=visibleMessages(c||{messages:[]}).filter(m=>m?.actual!==false&&!m.demo&&m.day<=s.day&&m.kind!=='app_invitation'&&m.kind!=='image'&&(m.kind!=='call'||m.transcript||m.callStatus==='ended')&&m.text);
 const recent=history.filter(m=>m.kind!=='call').slice(-16);
 const remembered=history.filter(m=>m.kind!=='call').slice(0,-16).filter(m=>relevant.test(m.text)).slice(-8);
 const quotes=remembered.map(m=>taiDatedNoAppQuote(m,s.day).slice(0,180)).join('\n');
 const plotMemory=taiPlotMemory(s,history);
 const callEntry=history.filter(m=>m.kind==='call'&&(m.transcript||m.callStatus==='ended')).at(-1);
 const userEntry=recent.filter(x=>x.from==='me').at(-1);
 const lastUser=userEntry?.voiceCaption||userEntry?.text||'';
 const lastCall=shouldRecallTaiCall(callEntry,s,lastUser)?callBridgeNote(callEntry,s):'';
 let mood='基于对话自然选择反应，不强行提问。';
 if(/你不认识|忘了我|你是谁|不记得/.test(lastUser))mood='对方正在质疑你是否记得他。不要以陌生人口吻回答。可以带一点受伤、不耐烦或反问，具体指出已确立的彼此关系与真实共同话题。';
 else if(/讨厌|烦|别理|生气|走开/.test(lastUser))mood='当前可能有争执。尊重对方的情绪，可以说明分歧、询问或短暂沉默，但不要否认你们熟悉。';
 else if(/喜欢|想你|晚安|睡不着/.test(lastUser))mood='这是亲密关系对话，可以克制地亲昵，不要客服式安慰。';
 return [
  '人物关系事实：你是陈熙泰，和正在使用这部手机的熙蒙已经通过剧情相认，双方不是陌生人。你知道他是出色的黑客，感情、偏爱和默契真实存在。允许想念、吃醋、冷嘲与照顾；不能每次像第一次见面一样重新盘问他的身份。',
  '已知人物：熙旺是熙蒙的哥哥，与你们同为三胞胎；你早已查到他，不会说第一次听说熙蒙有哥哥。傅隆生是他们的养父，知道其身份不等于知道未来犯罪和私下微信。你们有技术上的共同话题，也会谈生活、出游、运动、学习、饮食与家人；他喜欢《圣诞惊魂夜》；是否陪看过必须有实际记录，不从兴趣补造共同经历。除此之外的私密共同经历，只能来自实际已发生的聊天或世界书明确设定。',
  taiBondPrompt(s,{channel:'noapp'}),
  taiRelationshipInstruction(taiRelationshipDirector(s,{input:topic||lastUser})),
  taiCuriosityPrompt(extractTaiCuriosities(history,{day:s.day,channel:'noapp'}),{day:s.day}),
  taiLifeContext(s)+' '+mood,
  taiCallTimelineInstruction(s,topic||lastUser),
  plotMemory,
  recallTaiOlderTalk(history,topic||lastUser),
  lastCall?(isRecentTaiCall(callEntry,s)?'刚打过的电话（真实发生，话题未结束时自然承接）：\n':'更早的通话原话（保留发生日期）：\n')+lastCall:'',
  recent.length?'最近已分享的生活與對話（各自真實日期；不得當作都在剛才發生）：\n'+recent.map(m=>taiDatedNoAppQuote(m,s.day).slice(0,280)).join('\n'):'',
  quotes?'较早的可核对聊天原话（不要改写成没发生的故事）：\n'+quotes:'',
  mode==='call'?'这是正在进行的实时电话，当前所有玩家发言都来自正在连通的 NoApp 电话，不要说正在打字、刚挂电话或发文字消息。你可以多讲几段，也能真实决定结束通话。':
   callActive?'熙蒙通过即时文字消息打字，电话仍在进行中。不要假装已挂断，也不要再发起另一通电话。':
   '这是即时文字消息。此前已结束的通话不会因为打字而继续；当前通话状态以系统事实为准。可以多发有实际内容的消息，不必每句都反问。'
 ].filter(Boolean).join('\n\n');
}
