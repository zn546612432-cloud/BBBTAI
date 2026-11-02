// D01 developer test control. Production access requires an explicit switch
// in the in-game developer workspace; a URL parameter cannot enable it.
import {D01_REPAIR} from '../../../../story/d01/runtime.js';
import {startD01PipePreview} from '../../state.js';

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
