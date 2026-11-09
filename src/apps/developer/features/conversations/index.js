// Keep the established complete editor as the default; date navigation is opt-in.
// Both views write the same PhoneStore conversations and reuse the same handlers.
import {btn} from '../../../../system/ui.js';
import {conversations as classicConversations,messageCard,newConversationForm} from './classic.js';
import {conversations as dateConversations} from './workspace.js';
export {messageCard,newConversationForm};
export function conversations(s){
 const dated=s.editor?.chatView==='dated';
 const count=Object.values(s.content?.conversations||{}).flat().reduce((n,c)=>n+(c.messages?.length||0),0);
 const historical=(s.content?.conversations?.wechat||[]).reduce((n,c)=>n+(c.messages||[]).filter(m=>m.sentDate&&m.sentDate<'2025-05-19').length,0);
 const modeBar=`<section class="chat-mode-toolbar" aria-label="聊天编辑器模式">
  <strong>聊天资料编辑</strong>
  ${btn('chat-view','全部消息 · 原版完整编辑',dated?'button-quiet':'button-primary',`data-view="classic"`)}
  ${btn('chat-view','按日期浏览',dated?'button-primary':'button-quiet',`data-view="dated"`)}
  <small>本机已有 ${count} 条聊天记录，D01 前 ${historical} 条。日期筛选不会删除或隐藏原始资料。</small>
  ${historical===0?`<p class="chat-source-warning">本机暂未读取到 D01 前历史聊天。内置来源文件未删除；可尝试重新补齐。</p>${btn('chat-restore-historical','从内置文件补齐 D01 前历史','button-quiet')}`:''}
  ${btn('chat-jump-top','↑ 顶部','button-quiet')}${btn('chat-jump-bottom','↓ 底部','button-quiet')}
 </section>`;
 return `<div class="chat-mode-root">${modeBar}${dated?dateConversations(s):classicConversations(s)}</div>`;
}
