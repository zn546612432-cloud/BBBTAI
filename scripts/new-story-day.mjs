#!/usr/bin/env node
// Create a D01–D55 *planning* packet; never change the phone runtime or old story.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export function storyDayPacket(day){
 if(!Number.isInteger(day)||day<1||day>55)throw Error('必须指定 D01–D55');
 const template=JSON.parse(readFileSync(new URL('../.agents/skills/ximeng-story-fill/templates/day-packet.template.json',import.meta.url),'utf8'));
 template.day=day;
 const epoch=Date.UTC(2025,4,19)+(day-1)*86400000;
 template.date=new Date(epoch).toISOString().slice(0,10);
 const label='D'+String(day).padStart(2,'0');
 template.title=label+' 剧情内容待审（未接入手机运行时）';
 template.stage='draft';
 template.scope='mixed';
 template.systems=['story55','messaging'];
 template.assets=[];
 template.events=[];
 template.acceptance=[];
 return template;
}
function main(args){
 const dayText=args.find(a=>!a.startsWith('--'));
 const match=/^D?(0?[1-9]|[1-4]\d|5[0-5])$/i.exec(dayText||'');
 if(!match){console.error('用法: node scripts/new-story-day.mjs D08 [--stdout] [--out=文件路径]');process.exitCode=2;return;}
 const day=Number(match[1]),packet=storyDayPacket(day);
 const output=JSON.stringify(packet,null,2)+'\n';
 if(args.includes('--stdout')){process.stdout.write(output);return;}
 const name='d'+String(day).padStart(2,'0')+'.json';
 const outFlag=args.find(a=>a.startsWith('--out='));
 const filename=resolve(outFlag?outFlag.slice('--out='.length):join('docs','story-packets',name));
 mkdirSync(dirname(filename),{recursive:true});
 try{writeFileSync(filename,output,{flag:'wx'});}
 catch(e){console.error('没有覆盖已有文件 '+filename+'：'+e.message);process.exitCode=1;return;}
 console.log('创建剧情设计包 '+filename+'（draft，仅设计数据；未修改游戏）');
 console.log('下一步：填真实事件与检查 → npm run story:check -- '+filename);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2));
