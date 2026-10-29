import {esc} from '../../../../system/ui.js';
import {ntIcon} from '../../components/icons.js';

// The lock is a fictional on-device UI gate. Unlocks are deliberately session-only.
const secret='nyarlathotep';
const unlocked=new Set();
const attempts=new Map();
const dialogOpen=new Set();

export const isNoteUnlocked=id=>unlocked.has(id);
export function lockNote(id){unlocked.delete(id);dialogOpen.delete(id);}
export function prepareLockedNote(id){lockNote(id);attempts.delete(id);}
export function showUnlockDialog(id){dialogOpen.add(id);}
export function hideUnlockDialog(id){dialogOpen.delete(id);}

export function tryUnlockNote(id,entry){
 if(String(entry)===secret){unlocked.add(id);dialogOpen.delete(id);attempts.delete(id);return true;}
 const total=(attempts.get(id)||0)+1;attempts.set(id,total);
 return false;
}

export const noteUnlockAttempts=id=>attempts.get(id)||0;

export function renderLockedNote(note){
 const wrong=noteUnlockAttempts(note.id),opened=dialogOpen.has(note.id);
 return `<section class="nt-locked-page" aria-label="已锁定的备忘录">
  <header class="nt-locked-header"><button type="button" class="nt-round-button" data-action="notes-lock-back" aria-label="返回">${ntIcon('back',28)}</button>
   <span class="nt-locked-title">备忘录</span><span class="nt-locked-header-icons">${ntIcon('lock',23)}${ntIcon('share',23)}${ntIcon('more',23)}</span></header>
  <div class="nt-locked-center"><span class="nt-locked-large-icon">${ntIcon('lock',92)}</span><strong>此备忘录已锁定。</strong>
   <button type="button" data-action="notes-unlock-open">查看备忘录</button></div>
  ${opened?`<div class="nt-unlock-shade" role="presentation"><form class="nt-unlock-dialog" data-form="notes-unlock" data-id="${esc(note.id)}" role="dialog" aria-modal="true" aria-label="查看备忘录">
   <strong>查看备忘录</strong><p>${wrong?'该密码不正确。请重试。':'输入此备忘录的密码。'}</p>
   ${wrong>=3?'<p class="nt-password-hint">提示：幻影</p>':''}
   <input type="password" name="password" aria-label="密码" placeholder="密码" autocomplete="off" autocapitalize="off" spellcheck="false">
   <div class="nt-unlock-buttons"><button type="button" data-action="notes-unlock-cancel">取消</button><button type="submit">好</button></div>
   </form></div>`:''}
 </section>`;
}
