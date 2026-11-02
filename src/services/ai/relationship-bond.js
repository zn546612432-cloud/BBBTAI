// Saved, local-only affinity for Chen Xitai's free conversation.
// Does not change the 55-day plot, reveal a hidden identity, or write lore.
// In particular it never consumes unrelated WeChat or private phone data.
import {taiRecognized} from '../story55/state.js';

export const TAI_BOND_INITIAL=30;
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const patterns={
  affection:/想你|想念你|爱你|愛你|喜欢你|喜歡你|想听你|想聽你|抱抱|想见你|想見你|miss you|love you/i,
  openness:/我害怕|我怕|我难受|我難受|我委屈|我在意|跟你说实话|跟你說實話|信任你|我相信你|告诉你一个秘密|告訴你一個秘密|其实我|其實我/,
  teamwork:/帮我|幫我|帮个忙|幫個忙|谢谢你|謝謝你|多亏你|多虧你|给我看看|幫我看看|麻烦你|麻煩你/,
  conflict:/讨厌你|討厭你|别理我|別理我|滚开|滾開|不想和你说话|不想和你說話/
};
const weights={affection:3,openness:3,teamwork:2,conflict:-2};
export function taiBond(s){
 const bond=s?.aiDraft?.taiBond;
 const score=clamp(Number.isFinite(bond?.score)?bond.score:TAI_BOND_INITIAL);
 return {score,level:score>=72?'close':score>=48?'trusting':score>=30?'familiar':'guarded',signals:bond?.signals||{}};
}
export function updateTaiBond(s,{messageId,text,source='noapp',now=Date.now()}={}){
 if(source!=='noapp'||!taiRecognized(s)||typeof text!=='string'||!messageId)return false;
 s.aiDraft??={};
 const b=s.aiDraft.taiBond??={score:TAI_BOND_INITIAL,signals:{},lastByType:{},ids:[]};
 b.ids??=[];b.lastByType??={};b.signals??={};
 if(b.ids.includes(messageId))return false;
 b.ids.push(messageId);if(b.ids.length>200)b.ids.shift();
 let delta=0;
 // Familiarity also grows slowly from repeated, meaningful everyday talks;
 // it is not restricted to saying a particular phrase or asking for help.
 if(text.trim().length>=6){b.meaningfulTurns=(b.meaningfulTurns||0)+1;if(b.meaningfulTurns%8===0)delta++;}
 for(const [type,re] of Object.entries(patterns)){
  if(!re.test(text))continue;
  const last=b.lastByType[type];
  // Repeating identical affection in a burst should be a conversation,
  // not a way of farming endless points.
  if(last&&last.text===text.trim()&&now-last.at<30*60*1000)continue;
  b.lastByType[type]={text:text.trim().slice(0,140),at:now};
  b.signals[type]=(b.signals[type]||0)+1;
  delta+=weights[type];
 }
 if(delta)b.score=clamp((Number.isFinite(b.score)?b.score:TAI_BOND_INITIAL)+Math.max(-3,Math.min(5,delta)));
 return delta!==0;
}
export function taiBondPrompt(s,{channel='noapp'}={}){
 const b=taiBond(s),known=taiRecognized(s);
 if(!known||channel==='mirage')
  return '关系阶段：衔尾蛇/匿名联络仍是冷静、危险、带压迫感的上位者。认可能力也可能施压、考验和不耐烦；不得因后台好感度擅自变成温柔恋人，或提前揭露真实身份。';
 if(channel==='chess')return '关系延续真实棋局与已公开身份；好胜和挑战欲仍在，不能借棋盘无故公开其他聊天内容。';
 const nuance=b.level==='close'
  ?'已经建立较深信任：可以偶尔坦率说想念、更愿意纵容或迁就，调戏和毒舌依旧存在；温柔是难得的选择，不是每句都甜。'
  :b.level==='trusting'
  ?'开始愿意敞开一些：能主动打趣、吃醋、分享私事，偶尔示弱或哄一哄，但不马上事事顺从。'
  :b.level==='familiar'
  ?'已经熟悉，但仍爱端架子：会故意逗弄、试探和嘴硬；少量关心通常表现为具体行动。'
  :'目前有点疏远或不快：更挑剔、谨慎，可能拒绝或延后话题，但不能不承认已经发生过的关系和共同记忆。';
 return '内部关系温度 '+b.score+'/100（只供人格调节，绝不对玩家展示数字或说“好感度”）：'+nuance+' 当前一条消息的语气还要结合情境、忙碌和对方真实表达；不因分数机械变成恋爱台词。';
}
