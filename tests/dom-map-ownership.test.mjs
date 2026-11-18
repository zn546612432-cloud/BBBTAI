import test from 'node:test';
import assert from 'node:assert/strict';
import {patchElement} from '../src/system/dom.js';

test('Leaflet owns its children and generic game redraw must not replace them',()=>{
 const marker={nodeType:1,tagName:'DIV',id:'leaflet-image-layer'};
 const old={
  nodeType:1,tagName:'XM-LEAFLET-MAP',
  attributes:[],ownerDocument:{activeElement:null},
  hasAttribute:()=>false,getAttribute:()=>null,
  childNodes:[marker]
 };
 const fresh={
  nodeType:1,tagName:'XM-LEAFLET-MAP',attributes:[],
  hasAttribute:()=>false,getAttribute:()=>null,
  get childNodes(){throw Error('Generic DOM updater must never descend into Leaflet map');}
 };
 assert.doesNotThrow(()=>patchElement(old,fresh));
 assert.strictEqual(old.childNodes[0],marker);
});

test('opt-in voice details keep manual open and closed states during redraws',()=>{
 const details=(open,optIn=true)=>{
  const attrs=new Map(optIn?[['data-preserve-open','']]:[]);if(open)attrs.set('open','');
  return {nodeType:1,tagName:'DETAILS',ownerDocument:{activeElement:null},childNodes:[],
   get attributes(){return [...attrs].map(([name,value])=>({name,value}));},
   getAttribute:name=>attrs.get(name)??null,hasAttribute:name=>attrs.has(name),setAttribute:(name,value)=>attrs.set(name,value),removeAttribute:name=>attrs.delete(name)};
 };
 const opened=details(true),closed=details(false);
 patchElement(opened,details(false));assert.equal(opened.hasAttribute('open'),true);
 patchElement(closed,details(true));assert.equal(closed.hasAttribute('open'),false);
 const ordinary=details(true,false);patchElement(ordinary,details(false,false));assert.equal(ordinary.hasAttribute('open'),false);
});
