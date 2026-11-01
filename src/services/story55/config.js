import {STORY55_CONFIG} from '../../story/story55/catalog.js';
import {canonicalPhoneAudioPath} from '../voice/asset-url.js';
const kinds=new Set(['scene','project','file','mail','page','map','questions','payment']);
const games=new Set(['cipher','route','extract','veil','verify']);
export function normalizeStory55AudioAssets(c,{strict=false}={}){
 let changed=false;
 const normalize=(target,key)=>{
  if(!target[key])return;
  try{const path=canonicalPhoneAudioPath(target[key]);if(path!==target[key]){target[key]=path;changed=true;}}
  catch(error){if(strict)throw error;}
 };
 normalize(c,'finalAudio');
 for(const clips of Object.values(c.voiceAssets||{}))if(clips&&typeof clips==='object')for(const index of Object.keys(clips))normalize(clips,index);
 return changed;
}
export function validateStory55Config(input){
 const c=structuredClone(input);
 if(!c||c.format!=='ximeng-story55-config-v1'||c.totalDays!==55||c.startDate!=='2025-05-19')throw Error('需要55天剧情配置，起点2025-05-19');
 for(const k of ['nodes','projects','documents','pages','locations','mails'])if(!Array.isArray(c[k])||c[k].length>150)throw Error(k+'列表无效');
 const ids=new Set();
 for(const n of c.nodes){if(!/^[a-z][a-z0-9-]{0,50}$/.test(n.id)||ids.has(n.id)||typeof n.title!=='string'||n.title.length>150||!Number.isInteger(n.day)||n.day<1||n.day>55||!kinds.has(n.kind)||!Array.isArray(n.requires))throw Error('节点字段或ID无效');ids.add(n.id);}
 for(const n of c.nodes)if(n.gateDay!==undefined&&(!Number.isInteger(n.gateDay)||n.gateDay<n.day||n.gateDay>55))throw Error('节点完成期限不能早于开放日');
 for(const n of STORY55_CONFIG.nodes)if(!ids.has(n.id))throw Error('缺少核心节点：'+n.id);
 const visit=(id,path=[])=>{if(path.includes(id))throw Error('剧情树存在循环：'+[...path,id].join('→'));const n=c.nodes.find(n=>n.id===id);if(!n)throw Error('缺少前置节点：'+id);for(const p of n.requires){const parent=c.nodes.find(n=>n.id===p);if(parent?.day>n.day)throw Error('前置节点晚于当前节点');visit(p,[...path,id]);}};
 c.nodes.forEach(n=>visit(n.id));
 const projectIds=new Set();
 for(const p of c.projects){if(projectIds.has(p.id)||!ids.has(p.node)||p.day!==c.nodes.find(n=>n.id===p.node).day||!Number.isInteger(p.minimumHardware)||p.minimumHardware<1||p.minimumHardware>3||!Number.isInteger(p.batches)||p.batches<1||p.batches>55||!Array.isArray(p.gains)||p.gains.length!==p.batches||p.gains.some(v=>!Number.isFinite(v)||v<=0)||Math.abs(p.gains.reduce((a,b)=>a+b,0)-100)>.001||!Array.isArray(p.steps)||!p.steps.length||p.steps.length>5||p.steps.some(x=>!games.has(x))||typeof p.key!=='string'||!p.key||p.key.length>80)throw Error('项目批次、小游戏或完成度增量无效（总和须100%）');projectIds.add(p.id);}
 for(const n of c.nodes)if(n.kind==='project'&&!projectIds.has(n.project))throw Error('节点引用的项目不存在');
 for(const k of ['documents','pages','locations','mails']){const seen=new Set();for(const x of c[k]){if(typeof x.id!=='string'||seen.has(x.id)||!ids.has(x.node))throw Error(k+'引用或ID无效');seen.add(x.id);if(k==='locations'&&(!Number.isFinite(x.x)||!Number.isFinite(x.y)||x.x<0||x.x>100||x.y<0||x.y>100))throw Error('地图坐标需为0—100');}}
 normalizeStory55AudioAssets(c,{strict:true});
 if(c.finalAudio&&!(typeof c.finalAudio==='string'&&/^\/(?!\/)[a-zA-Z0-9_./-]+\.(mp3|wav|m4a|ogg)$/.test(c.finalAudio)))throw Error('终局音频须为站内音频路径');
 if(!c.scenes||typeof c.scenes!=='object'||Array.isArray(c.scenes))throw Error('场景正文无效');
 for(const [id,lines] of Object.entries(c.scenes))if(!ids.has(id)||!Array.isArray(lines)||lines.length>150||lines.some(x=>!Array.isArray(x)||x.length!==2||x.some(v=>typeof v!=='string')||x[1].length>3000))throw Error('场景台词无效');
 for(const n of c.nodes)if(n.kind==='scene'&&!c.scenes[n.id]?.length)throw Error('固定场景需要至少一行正文');
 const e=c.economics;if(!e||!Array.isArray(e.hardwarePrices)||e.hardwarePrices.some(v=>!Number.isFinite(v)||v<0)||!Number.isFinite(e.dailyExpense)||e.dailyExpense<0||!Number.isFinite(e.openingBalance)||e.openingBalance<0)throw Error('经济参数无效');
 for(const n of c.nodes)if([n.cost,n.credit].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0)))throw Error('节点金额无效');
 return c;
}
export const defaultStory55Config=()=>{const c=structuredClone(STORY55_CONFIG);normalizeStory55AudioAssets(c);return c;};
export function exportStory55Config(s){const c=structuredClone(s.story55?.config||STORY55_CONFIG);normalizeStory55AudioAssets(c);return JSON.stringify(c,null,2);}
export function importStory55Config(s,text){if(typeof text!=='string'||text.length>500000)throw Error('配置文件过大');const c=validateStory55Config(JSON.parse(text));for(const p of c.projects){const previous=s.story55.config.projects.find(x=>x.id===p.id);if(s.story55.projects[p.id]?.batches.length&&JSON.stringify([p.gains,p.steps])!==JSON.stringify([previous.gains,previous.steps]))throw Error('已有项目进度，请在新周目调整批次配置');}s.story55.config=c;return c;}
