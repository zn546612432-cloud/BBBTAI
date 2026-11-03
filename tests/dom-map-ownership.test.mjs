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
