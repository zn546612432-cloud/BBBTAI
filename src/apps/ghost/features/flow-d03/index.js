// Ghost UI for the single D03 Flow deployment; other mission games are untouched.
import {esc} from '../../../../system/ui.js';
import {
 FLOW_TOOL,FLOW_KEY,flowState,acceptFlowKey,installFlowTool,submitFlowScan
} from '../../../../services/story55/flow-d03.js';

let dialog=null;
const btn=(action,label,cls='')=>'<button type="button" class="gh-button '+cls+'" data-action="gh-flow-'+action+'">'+label+'</button>';
const nav=ctx=>ctx.router.open({appId:'ghost',route:'/',params:{}});
const route=(ctx,path)=>ctx.router.open({appId:'ghost',route:path,params:{}});
const headline=(title,back='home')=>'<div class="gh-top">'+btn(back,'‹','gh-back')+'<span>GHOST / '+esc(title)+'</span><span>●</span></div>';
const modal=()=>{
 if(!dialog)return '';
 const definitions={
  installed:{title:'部署成功',description:'',buttons:btn('installed-ok','确定','gh-primary')},
  confirm:{title:'已扫描出 45 个安全漏洞，是否提交？',description:'',buttons:btn('cancel','取消','gh-flow-secondary')+btn('confirm','确定','gh-primary')},
  submitted:{title:'已提交',description:'',buttons:btn('submitted-ok','确定','gh-primary')}
 };
 const d=definitions[dialog];if(!d)return '';
 return '<div class="gh-flow-overlay"><section class="gh-flow-dialog" role="alertdialog" aria-modal="true"><h2>'+d.title+'</h2><div class="gh-flow-dialog-actions">'+d.buttons+'</div></section></div>';
};
export function renderFlowD03(s,loc){
 const p=flowState(s);
 let body='';
 if(loc.route==='/flow-deploy'){
  body=headline('01 部署')+'<h1>01 部署</h1>';
  if(p.deployed)body+='<div class="gh-flow-panel"><b>'+FLOW_TOOL+'</b><p>已部署至项目</p>'+btn('projects','项目','gh-primary')+'</div>';
  else body+='<div class="gh-flow-panel"><form data-form="gh-flow-key" autocomplete="off"><label for="gh-flow-key">密钥</label><input id="gh-flow-key" name="key" aria-label="部署密钥" required maxlength="80" spellcheck="false" autocomplete="off" placeholder="请输入密钥"><small class="gh-flow-error" role="status" aria-live="polite"></small><button type="submit" class="gh-button gh-primary">开始</button></form></div>'+
    (p.keyAccepted?'<div class="gh-flow-project-list"><button type="button" data-action="gh-flow-install" class="gh-flow-project"><strong>'+FLOW_TOOL+'</strong><span>›</span></button></div>':'');
 }else if(loc.route==='/flow-projects'){
  body=headline('项目')+'<h1>项目</h1>'+
   (p.deployed?'<div class="gh-flow-project-list">'+btn('scan',FLOW_TOOL+'　›','gh-flow-project')+'</div>':'<div class="gh-empty">暂无已部署项目</div>');
  if(p.submitted)body=headline('项目')+'<h1>项目</h1><div class="gh-flow-project-list">'+btn('record',FLOW_TOOL+'　›','gh-flow-project')+'</div>';
 }else if(loc.route==='/flow-record'){
  body=headline('扫描记录','projects')+'<h1>'+FLOW_TOOL+'</h1><div class="gh-flow-panel"><strong>45 个安全漏洞</strong><p>已提交</p></div>';
 }else return '';
 return '<div class="gh-shell gh-flow-shell">'+body+modal()+'</div>';
}
export function handleFlowD03(action,ctx){
 if(!action.startsWith('gh-flow-'))return false;
 switch(action){
  case 'gh-flow-home':dialog=null;nav(ctx);break;
  case 'gh-flow-projects':dialog=null;route(ctx,'/flow-projects');break;
  case 'gh-flow-deploy':dialog=null;route(ctx,'/flow-deploy');break;
  case 'gh-flow-record':dialog=null;route(ctx,'/flow-record');break;
  case 'gh-flow-install':{
   let installed=false;
   ctx.store.update(s=>{installed=installFlowTool(s);});
   if(installed){dialog='installed';ctx.refresh();}
   else route(ctx,'/flow-projects');
   break;
  }
  case 'gh-flow-installed-ok':dialog=null;route(ctx,'/flow-projects');break;
  case 'gh-flow-scan':
   if(ctx.store.get().story55?.flowD03?.submitted)route(ctx,'/flow-record');
   else{dialog='confirm';ctx.refresh();}
   break;
  case 'gh-flow-cancel':dialog=null;ctx.refresh();break;
  case 'gh-flow-confirm':{
   let submitted=false;
   ctx.store.update(s=>{submitted=submitFlowScan(s);});
   dialog=submitted?'submitted':null;
   if(submitted)ctx.refresh();
   else route(ctx,'/flow-projects');
   break;
  }
  case 'gh-flow-submitted-ok':dialog=null;route(ctx,'/flow-projects');break;
  default:return false;
 }
 return true;
}
export function submitFlowD03Form(form,ctx){
 if(form.dataset.form!=='gh-flow-key')return false;
 const key=String(new FormData(form).get('key')||'').trim();
 const p=flowState(ctx.store.get()),error=form.querySelector('.gh-flow-error');
 // Keep the input and the typed key intact for unsuccessful submissions.
 if(!p.linkOpened){if(error)error.textContent='尚未收到对应的部署任务';return true;}
 if(key!==FLOW_KEY){if(error)error.textContent='密钥错误';return true;}
 ctx.store.update(s=>acceptFlowKey(s,key));
 return true;
}
