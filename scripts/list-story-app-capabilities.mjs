#!/usr/bin/env node
// Reports which App story-writing operations are truly day-wired versus missing.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_CAPABILITIES} from './validate-story-packet.mjs';

export function describeAppCapabilities(appId=null){
 const entries=Object.entries(APP_CAPABILITIES.apps)
  .filter(([name,a])=>!appId||appId===name||appId===a.appId);
 if(appId&&!entries.length)throw Error('App 未在真实注册表中：'+appId);
 return entries.map(([module,a])=>({
  module,appId:a.appId,hidden:!!a.hidden,
  gateFacts:a.gateFacts||[],
  actions:Object.entries(a.capabilities).map(([name,c])=>({
   name,state:c.state,owner:c.owner,kinds:c.kinds,originDays:c.originDays||[],proof:c.proof
  }))
 }));
}
function main(args){
 const json=args.includes('--json'),app=args.find(a=>!a.startsWith('--'))||null;
 let items;
 try{items=describeAppCapabilities(app);}catch(e){console.error('ERROR '+e.message);process.exitCode=1;return;}
 if(json){console.log(JSON.stringify(items,null,2));return;}
 for(const x of items){
  console.log('\n'+x.appId+(x.hidden?' [hidden]':'')+
   (x.gateFacts.length?' [gate '+x.gateFacts.join(',')+']':''));
  if(!x.actions.length){console.log('  (no authored story capability declared)');continue;}
  for(const a of x.actions){
   console.log('  '+a.name+' — '+a.state+
    (a.originDays.length?' (origin D'+a.originDays.join(',D')+')':'')+
    ' [owner='+a.owner+']');
  }
 }
 console.log('\nNOTE: This is a planning inventory, not a running story dispatcher.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main(process.argv.slice(2));
