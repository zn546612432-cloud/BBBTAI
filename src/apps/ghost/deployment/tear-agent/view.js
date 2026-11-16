import {esc} from '../../../../system/ui.js';
import {TEAR_STAGES} from '../../../../story/d25/tear-agent.js';
import {agent,agentFiles,researchInfo,stageReady,storyFileStage} from './state.js';
const b=(action,label,attrs='')=>`<button type="button" data-action="gh-tear-${action}" ${attrs}>${label}</button>`;
export function renderAgentContent(s){
 const a=agent(s),files=agentFiles(s),selected=files.find(f=>f.id===a.selected),r=researchInfo(s),messages=a.messages;
 const pending=Object.entries(a.jobs).filter(([,j])=>!j.done),working=!!a.thinking||pending.length>0||!!r&&!r.complete;
 const suggested=['validation','program'].filter(id=>stageReady(s,id));
 // Only casual conversation dissolves. The complete transcript remains
 // available in this session's history; task logs stay readable on the main view.
 const realNow=Date.now();
 const visible=messages.filter(m=>!m.ephemeral||realNow-Number(m.visibleAt||0)<5500);
 const message=m=>`<article class="gh-agent-text ${m.role==='user'?'gh-agent-user':'gh-agent-reply'}${m.ephemeral?' is-ephemeral':''}" data-key="${esc(m.id)}">${m.file?`<small>▤ ${esc(m.file)}</small>`:''}${m.artifact?b('artifact','▤ '+esc(m.text),`class="gh-agent-file-receipt" data-id="${esc(m.artifact)}"`):'<span>'+esc(m.text)+'</span>'}${m.identity?b('identity','REMOTE ARCHIVE ›'):''}</article>`;
 const history=a.history?`<section class="gh-agent-history" role="dialog" aria-modal="true" aria-label="本次聊天紀錄" data-key="tear-history"><header><span>本次聊天紀錄</span>${b('history-close','×','aria-label="關閉聊天紀錄"')}</header><div class="gh-agent-history-messages">${messages.map(m=>message({...m,ephemeral:false})).join('')}</div></section>`:'';
 const pad=n=>String(n).padStart(2,'0');
 const picker=a.picking?`<section class="gh-agent-picker" data-key="tear-picker"><div>新增 ${b('picker','×','aria-label="關閉"')}</div>${suggested.length?`<div>指令</div>${suggested.map(id=>b('prompt',esc(TEAR_STAGES[id].prompt),`data-id="${id}"`)).join('')}`:''}<div>本機檔案</div>${files.length?files.map(f=>b('select',esc(f.name),`data-id="${esc(f.id)}"`)).join(''):'<p>尚無檔案</p>'}</section>`:'';
 return {working,hasDialogue:visible.length>0||!!a.thinking,content:`${history}<div class="gh-agent-main" data-key="tear-main"><div class="gh-agent-research">${r?`<div><span>AAB_SECURITY</span><strong>${r.complete?'COMPLETE':r.paused?'UPDATING':r.total?'FUZZING':'INITIALIZING'}</strong></div><small>${pad(Math.floor(r.elapsed/60))}:${pad(r.elapsed%60)} · ${r.cases.toLocaleString('en-US')} TESTS · ${r.anomalies} ANOMALIES</small>`:''}${pending.filter(([id])=>!['survey','maintenance'].includes(id)).map(([id,j])=>`<div><span>${esc(TEAR_STAGES[id].title)}</span><strong>PROCESSING</strong></div>`).join('')}</div><div class="gh-agent-messages chat-messages" data-key="tear-live-messages" role="log" aria-live="polite">${visible.map(message).join('')}${a.thinking?'<div class="gh-agent-thinking">RECONSTRUCTING SIGNAL <i>▌</i></div>':''}</div>${picker}<form class="gh-agent-composer" data-form="tear-agent-send">${selected?`<div class="gh-agent-selected">▤ ${esc(selected.name)} ${b('clear-file','×','aria-label="移除附件"')}</div>`:''}<div class="gh-agent-input">${b('picker','＋',`aria-label="新增指令或文件" aria-expanded="${!!a.picking}"`)}<input name="text" id="tear-agent-input" data-key="tear-agent-input" aria-label="輸入訊息" placeholder="輸入訊息…" value="${esc(a.draft||TEAR_STAGES[storyFileStage(selected)]?.prompt||'')}" autocomplete="off" maxlength="1800"/><button type="submit" aria-label="發送">↑</button></div></form></div>`};
}
