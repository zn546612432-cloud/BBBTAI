#!/usr/bin/env node
// Read-only stdio MCP transport for an explicitly exported LOCAL test save.
// Usage: node server/mcp-tai-phone-stdio.mjs <path-to-exported-json>
// IMPORTANT: It reads a static exported snapshot, not a live GitHub Pages tab.
// The browser's embedded dispatcher reads the live store directly instead.
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline';
import {dispatchTaiPhoneMcp} from '../src/services/ai/phone-mcp/protocol.js';

const path=process.argv[2];
if(!path){
 process.stderr.write('Provide a local game-export JSON path as the only argument.\n');
 process.exit(2);
}
let snapshot;
try{
 const data=await readFile(path,'utf8');
 if(data.length>12_000_000)throw Error('snapshot too large');
 snapshot=JSON.parse(data);
 if(!snapshot?.content?.conversations||!Array.isArray(snapshot?.content?.photos))
  throw Error('not a supported phone snapshot');
}catch{
 process.stderr.write('Cannot read a valid locally exported phone snapshot.\n');
 process.exit(2);
}
const rl=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of rl){
 if(!line||line.length>32000)continue;
 try{
  const request=JSON.parse(line);
  if(request?.method==='notifications/initialized')continue;
  const response=dispatchTaiPhoneMcp(snapshot,request);
  if(response)process.stdout.write(JSON.stringify(response)+'\n');
 }catch{
  // Do not echo raw input; errors could include private user content.
 }
}
