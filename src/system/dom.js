// Patch owned templates in place: incoming messages must not recreate the focused composer.
const key=n=>n.nodeType===1?(n.getAttribute('data-key')||n.getAttribute('data-view-key')||n.id||null):null;
const compatible=(a,b)=>a&&a.nodeType===b.nodeType&&(a.nodeType!==1||a.tagName===b.tagName);
export function patchElement(old,fresh){
 if(old.nodeType===3){if(old.nodeValue!==fresh.nodeValue)old.nodeValue=fresh.nodeValue;return;}
 if(old.nodeType!==1)return;
 for(const a of [...old.attributes])if(!fresh.hasAttribute(a.name))old.removeAttribute(a.name);
 for(const a of fresh.attributes)if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
 const focused=old===old.ownerDocument.activeElement;
 if(old.tagName==='TEXTAREA'){if(!focused&&old.value!==fresh.value)old.value=fresh.value;return;}
 if(old.tagName==='INPUT'){if(!focused&&old.value!==fresh.value)old.value=fresh.value;if(old.checked!==fresh.checked)old.checked=fresh.checked;return;}
 patchChildren(old,[...fresh.childNodes]);
 if(old.tagName==='SELECT'&&!focused)old.value=fresh.value;
}
function patchChildren(parent,children){
 const prior=[...parent.childNodes],keyed=new Map(prior.map(n=>[key(n),n]).filter(([k])=>k)),used=new Set();let cursor=parent.firstChild;
 for(const fresh of children){
  const k=key(fresh);let node=k?keyed.get(k):cursor&&!key(cursor)&&compatible(cursor,fresh)?cursor:null;
  if(!compatible(node,fresh))node=null;
  if(!node){node=fresh.cloneNode(true);parent.insertBefore(node,cursor);}
  else{if(node!==cursor)parent.insertBefore(node,cursor);patchElement(node,fresh);}
  used.add(node);cursor=node.nextSibling;
 }
 for(const n of prior)if(!used.has(n)&&n.parentNode===parent)parent.removeChild(n);
}
export function patchHTML(parent,html){const template=parent.ownerDocument.createElement('template');template.innerHTML=html;patchChildren(parent,[...template.content.childNodes]);}
