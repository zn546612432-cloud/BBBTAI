import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {lock} from '../src/system/shell.js';
import {patchElement} from '../src/system/dom.js';

// Minimal DOM adapter: exercise the real patcher with button attributes from
// the actual lock template. The native pointer sequence is checked in browser.
const document={activeElement:null};
function node(tag,attributes={}){
 const attrs=new Map(Object.entries(attributes));
 const n={nodeType:1,tagName:tag,ownerDocument:document,childNodes:[],parentNode:null,
  get attributes(){return [...attrs].map(([name,value])=>({name,value}));},
  get id(){return attrs.get('id')||'';},getAttribute:k=>attrs.get(k)??null,
  hasAttribute:k=>attrs.has(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k),
  get firstChild(){return this.childNodes[0]||null;},
  get nextSibling(){const list=this.parentNode?.childNodes||[];return list[list.indexOf(this)+1]||null;},
  insertBefore(child,cursor){
   if(child===cursor)return child;
   child.parentNode?.removeChild(child);
   const index=cursor?this.childNodes.indexOf(cursor):this.childNodes.length;
   this.childNodes.splice(index,0,child);child.parentNode=this;return child;
  },
  removeChild(child){this.childNodes.splice(this.childNodes.indexOf(child),1);child.parentNode=null;return child;},
  cloneNode(){return node(tag,Object.fromEntries(attrs));}
 };
 return n;
}
function buttons(state){
 const parent=node('DIV');
 for(const match of lock(state).matchAll(/<button\b([^>]*)>/g)){
  const attrs=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  parent.insertBefore(node('BUTTON',attrs),null);
 }
 return parent;
}
const notice=id=>({id,title:'短信',body:id,link:{appId:'messages',route:'/chat/'+id}});

test('new lock notifications cannot turn a pressed unlock button into a notification',()=>{
 for(const count of [0,1]){
  const s=initialState();s.notifications=count?[notice('older')]:[];
  const parent=buttons(s),pressed=parent.childNodes.find(n=>n.getAttribute('data-action')==='unlock');
  s.notifications.unshift(notice('incoming'));
  patchElement(parent,buttons(s));
  assert.equal(pressed.getAttribute('data-action'),'unlock');
  assert.equal(pressed.parentNode,parent);
  assert.equal(parent.childNodes.find(n=>n.getAttribute('data-action')==='unlock'),pressed);
 }
});

test('a pressed notification keeps its own destination when another notice moves ahead of it',()=>{
 const s=initialState();s.notifications=[notice('older')];
 const parent=buttons(s),pressed=parent.childNodes.find(n=>n.getAttribute('data-id')==='older');
 s.notifications.unshift(notice('incoming'));patchElement(parent,buttons(s));
 assert.equal(pressed.getAttribute('data-id'),'older');
 assert.equal(pressed.parentNode,parent);
 assert.equal(parent.childNodes[0].getAttribute('data-id'),'incoming');
});

test('a removed notice cannot be recycled into a different clickable notice',()=>{
 const s=initialState();s.notifications=[notice('expired'),notice('older')];
 const parent=buttons(s),pressed=parent.childNodes[0];
 s.notifications=[notice('incoming'),notice('older')];patchElement(parent,buttons(s));
 assert.equal(pressed.parentNode,null);
 assert.equal(pressed.getAttribute('data-id'),'expired');
 assert.notEqual(parent.childNodes[0],pressed);
});
