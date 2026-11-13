import {D17_INVITATION_NODE,D17_INVITATION_LINES,D17_INVITATION_ID} from './content.js';

export function applyD17Definition(c){
 if(!c?.nodes||!c.scenes)return false;
 let changed=false;
 if(!c.nodes.some(n=>n.id===D17_INVITATION_ID)){
  const index=c.nodes.findIndex(n=>n.id==='rumours');
  c.nodes.splice(index<0?c.nodes.length:index,0,structuredClone(D17_INVITATION_NODE));
  c.scenes[D17_INVITATION_ID]=structuredClone(D17_INVITATION_LINES);changed=true;
 }
 // The single withdrawn standalone laugh is removed from unplayed persisted configs.
 // Preserve every other line and never replace author-edited scenes wholesale.
 const oldLines=c.scenes[D17_INVITATION_ID];
 if(Array.isArray(oldLines)&&oldLines.some(l=>l[0]==='ouroboros'&&l[1]==='呵呵……')){
  c.scenes[D17_INVITATION_ID]=oldLines.filter(l=>!(l[0]==='ouroboros'&&l[1]==='呵呵……'));
  changed=true;
 }
 // Only migrate the two shipped defaults. Author-edited optional search nodes stay intact.
 const node=c.nodes.find(n=>n.id==='rumours');
 if(node?.day===17&&(!node.at||node.at==='23:06')&&JSON.stringify(node.requires)==='["code"]'){
  node.requires=[];node.at='00:00';changed=true;
 }
 return changed;
}
