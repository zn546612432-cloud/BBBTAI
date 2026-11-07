#!/usr/bin/env node
// Repository-local compatibility audit for the Story Fill Skill.
// Does not claim the planning JSON is an executable runtime or check cloud assets.
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateStoryPacket,APP_CAPABILITIES} from './validate-story-packet.mjs';
import {storyDayPacket} from './new-story-day.mjs';

export const requiredFiles=[
 '.agents/skills/ximeng-story-fill/SKILL.md',
 '.agents/skills/ximeng-story-fill/references/system-map.md',
 '.agents/skills/ximeng-story-fill/references/app-capabilities.json',
 '.agents/skills/ximeng-story-fill/examples/d23-cross-app-needs-adapters.example.json',
 'src/system/registry.js',
 '.agents/skills/ximeng-story-fill/references/acceptance-matrix.md',
 '.agents/skills/ximeng-story-fill/examples/d06-dinner.example.json',
 '.agents/skills/ximeng-story-fill/templates/day-packet.template.json',
 'AGENTS.md','docs/STORY_CONTENT_PIPELINE.md',
 'src/services/router.js',
 'src/system/shell.js',
 'src/services/story55/state.js',
 'src/services/messaging/phone-messages.js',
 'src/services/messaging/preset-replies.js',
 'src/services/messaging/lifecycle/registry.js',
 'src/services/reminders.js',
 'src/services/bank.js',
 'src/services/wishes/index.js',
 'src/services/assets/wish-media.js',
 'src/services/story55/projects.js',
 'src/story/d06/commission.js',
 '.github/workflows/pages.yml'
];
export function auditStorySkill(root=process.cwd()){
 const errors=[];
 const requireFile=(p)=>{if(!existsSync(resolve(root,p)))errors.push('不存在: '+p)};
 for(const p of requiredFiles)requireFile(p);
 if(errors.length)return {ok:false,errors};
 const read=(p)=>readFileSync(resolve(root,p),'utf8');
 const skill=read('.agents/skills/ximeng-story-fill/SKILL.md');
 const agents=read('AGENTS.md');
 const systemMap=read('.agents/skills/ximeng-story-fill/references/system-map.md');
 const code=read('src/services/messaging/phone-messages.js');
 const bank=read('src/services/bank.js');
 const packageInfo=JSON.parse(read('package.json'));
 const example=JSON.parse(read('.agents/skills/ximeng-story-fill/examples/d06-dinner.example.json'));
 const planned=JSON.parse(read('.agents/skills/ximeng-story-fill/examples/d23-cross-app-needs-adapters.example.json'));
 const sourceRegistry=read('src/system/registry.js');
 const imports=[...sourceRegistry.matchAll(/import \* as [a-zA-Z]+ from '\.\.\/apps\/([a-z-]+)\/index\.js'/g)].map(x=>x[1]);
 const manifestModules=new Set(imports);
 const inventoryModules=new Set(Object.values(APP_CAPABILITIES.apps).map(x=>x.module.split('/')[2]));
 if(manifestModules.size!==inventoryModules.size)
  errors.push('App 清单与 src/system/registry.js 不一致：'+JSON.stringify({
   missing:[...manifestModules].filter(x=>!inventoryModules.has(x)),
   extras:[...inventoryModules].filter(x=>!manifestModules.has(x))
  }));
 for(const [key,entry] of Object.entries(APP_CAPABILITIES.apps)){
  if(entry.module!==`src/apps/${key}/index.js`)errors.push('App 模块路径不统一: '+key);
  if(!manifestModules.has(key))errors.push('清单包含未注册 App: '+key);
  requireFile(entry.module);
  if(!existsSync(resolve(root,entry.module)))continue;
  const code=read(entry.module);
  if(!code.includes('manifest'))errors.push('App 未导出 manifest: '+key);
  if(!code.includes(`id:'${entry.appId}'`)&&!entry.aliasOf)
   errors.push('App manifest.id 不匹配: '+key+'/'+entry.appId);
  for(const [action,cap] of Object.entries(entry.capabilities)){
   if(!['wired-day','adapter-required'].includes(cap.state))errors.push('未知能力状态 '+key+'/'+action);
   if(!cap.proof||!existsSync(resolve(root,cap.proof)))errors.push('缺少能力来源证据 '+key+'/'+action);
   if(!Array.isArray(cap.kinds)||!cap.kinds.length)errors.push('能力缺少事件类型 '+key+'/'+action);
   if(cap.state==='wired-day'&&(!Array.isArray(cap.originDays)||!cap.originDays.length))
    errors.push('已实现的限定日期能力必须给 originDays: '+key+'/'+action);
  }
 }
 const checks=[
  [agents.includes('.agents/skills/ximeng-story-fill/SKILL.md'),'AGENTS.md 必须指向技能'],
  [skill.includes('先讨论、不写代码'),'Skill 必须尊重只讨论'],
  [skill.includes('不是全自动剧情执行引擎')||skill.includes('不会自动执行')||skill.includes('不是游戏运行时'),'Skill 不得声称直接运行 JSON'],
  [systemMap.includes('src/services/router.js'),'PhoneRouter 路径失真'],
  [!systemMap.includes('src/system/router.js'),'PhoneRouter 不应引用不存在的旧路径'],
  [code.includes('appendAuthoredPhoneMessage'),'消息原生写入 API 不存在'],
  [bank.includes('payBankPurchase')&&bank.includes('postBankTransaction'),'银行唯一服务接口不匹配'],
  [packageInfo.scripts?.['story:new']==='node scripts/new-story-day.mjs','story:new 命令失效'],
  [packageInfo.scripts?.['story:check']==='node scripts/validate-story-packet.mjs','story:check 命令失效'],
  [packageInfo.scripts?.['story:example']?.includes('d06-dinner.example.json'),'story:example 命令失效'],
  [validateStoryPacket(example,{strict:true}).ok,'D06 示例合同校验失败'],
  [validateStoryPacket(planned).ok,'D23 跨 App 规划格式不合法'],
  [!validateStoryPacket(planned,{strict:true}).ok,'缺少 App 适配器的跨 App 包被错误批准'],
  [Object.keys(APP_CAPABILITIES.apps).length===25,'25个注册 App 清单不完整'],
  [storyDayPacket(55).date==='2025-07-12','D55 游戏日期出错'],
  [storyDayPacket(8).events.length===0,'D08 模板不应虚构已完成剧情']
 ];
 for(const [pass,msg] of checks)if(!pass)errors.push(msg);
 return {ok:errors.length===0,errors,filesChecked:requiredFiles.length,contractChecks:checks.length,appsAudited:Object.keys(APP_CAPABILITIES.apps).length};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=auditStorySkill();
 console.log((result.ok?'PASS':'FAIL')+' STORY_SKILL_AUDIT '+JSON.stringify(result));
 if(!result.ok)process.exitCode=1;
}
