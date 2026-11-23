// D01 developer test control. Production access requires an explicit switch
// in the in-game developer workspace; a URL parameter cannot enable it.
import {D01_REPAIR} from '../../../../story/d01/runtime.js';
import {startD01PipePreview,startD02PipePreview,startD03PipePreview,startD04PipePreview,startBaseFrameworkPipePreview,finish} from '../../state.js';
import {d02OrderOfStep} from '../../../../story/d02/runtime.js';
import {d03OrderOfStep} from '../../../../story/d03/contract.js';
import {d04OrderOfStep} from '../../../../story/d04/contract.js';

export function ghostDevSkipAvailable(doc=globalThis.document,s=null){
 // Explicit developer preference wins, including switching the preview OFF.
 if(typeof s?.editor?.ghostSkipEnabled==='boolean')return s.editor.ghostSkipEnabled;
 return doc?.querySelector?.('meta[name="phone-preview"]')?.content==='true';
}

// Simulate a legitimate completed LINK board and reuse the exact 3-second
// preview -> progress -> single payout path. Do not increment money directly.
export function previewSkipD01(s,id=D01_REPAIR,now=Date.now()){
 const o=s.ghost?.orders?.[id],d=s.story55?.d01;
 if(id!==D01_REPAIR||!d?.deployed||d.rewardPaid||
   d.completedRounds>=5||o?.status!=='running'||o.type!=='route')return false;
 const b=o.board;
 if(!b?.size||!Array.isArray(b.masks)||!Array.isArray(b.solvedMasks)||
    b.masks.length!==b.solvedMasks.length||b.masks.length!==b.size*b.size)return false;
 const before=b.masks.slice();
 b.masks=b.solvedMasks.slice();
 const previousSkip=o.devSkippedRounds||0;
 o.devSkippedRounds=previousSkip+1;
 if(startD01PipePreview(s,id,now))return true;
 b.masks=before;
 o.devSkippedRounds=previousSkip;
 return false;
}

// Author-only secret mode: skip the current GHOST puzzle, never its contract,
// payment, downstream receipt, or any other App's minigame.
export function skipGhostGame(s,id,now=Date.now()){
 if(s.editor?.cheatMode!==true)return false;
 const o=s.ghost?.orders?.[id];
 if(!o||o.status!=='running'||!o.board||!['cipher','route','extract','veil','verify','strike'].includes(o.type))return false;
 if(id===D01_REPAIR)return previewSkipD01(s,id,now);
 if(o.type==='route'){
  const b=o.board;
  if(Array.isArray(b.solvedMasks)&&Array.isArray(b.masks)&&b.solvedMasks.length===b.masks.length)b.masks=b.solvedMasks.slice();
  const preview=d02OrderOfStep(id)?startD02PipePreview:d03OrderOfStep(id)?startD03PipePreview:d04OrderOfStep(id)?startD04PipePreview:o.story55Project==='base'?startBaseFrameworkPipePreview:null;
  if(preview&&preview(s,id,now))return true;
 }
 finish(s,id,true,now);
 return ['success','paid','preview-win'].includes(s.ghost.orders[id].status);
}
