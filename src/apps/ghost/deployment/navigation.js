import {tearDeployed,tearRunAvailability} from './tear-run.js';

// A finished installer is not the entry screen of its installed program.
// Keep incomplete projects and all unrelated Ghost tools on their own routes.
export function resolveTearEntry(s,loc){
 if(loc?.appId!=='ghost')return loc;
 const project=loc.params?.project;
 const installer=loc.route==='/deployment'&&['base','second'].includes(project)||loc.route==='/flow-deploy'&&project==='base';
 if(!installer||!tearDeployed(s))return loc;
 const active=Object.values(s.story55.tearRuns||{}).find(r=>tearRunAvailability(s,r.id).resume);
 return active?{appId:'ghost',route:'/tear-run',params:{orderId:active.id}}:{appId:'ghost',route:'/tear',params:{}};
}
export const isTearHome=loc=>loc?.appId==='ghost'&&loc.route==='/tear';
export function sameResolvedTearScreen(a,b){
 return a?.appId==='ghost'&&b?.appId==='ghost'&&a.route===b.route&&
  (a.route==='/tear'||a.route==='/tear-run'&&a.params?.orderId===b.params?.orderId);
}
