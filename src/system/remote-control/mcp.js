// LIVE, same-page MCP tool adapter. Unlike the existing read-only stdio
// snapshot server, this adapter is explicitly injected into the existing
// JSON-RPC dispatcher only while a story-authorized GHOST session is active.
// Nothing here is exposed on the public network or accesses the real device.
import {finishGhostShareControl} from '../../services/story55/ghost-share.js';

export const TAI_REMOTE_TOOLS=Object.freeze([
 {name:'remote_show_tasks',description:'Show native virtual iPhone app switcher',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_open_ghost',description:'Open only the shared GHOST project or current LINK order',inputSchema:{type:'object',properties:{route:{type:'string',enum:['/deployment','/contract','/run']}},required:['route'],additionalProperties:false}},
 {name:'remote_press_ghost',description:'Press the existing GHOST start/next-step button; never change a board directly',inputSchema:{type:'object',properties:{action:{type:'string',enum:['s55-run-step','gh-start']}},required:['action'],additionalProperties:false}},
 {name:'remote_read_link',description:'Read only the LINK board shared in this takeover',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_rotate_pipe',description:'Click one real GHOST pipe button for the shared LINK board',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:80}},required:['index'],additionalProperties:false}},
 {name:'remote_release',description:'Finish current virtual phone takeover and release exclusive control',inputSchema:{type:'object',properties:{},additionalProperties:false}}
]);
const toolNames=new Map(TAI_REMOTE_TOOLS.map(tool=>[tool.name,tool]));
const bad=error=>({ok:false,error});
function grant(s){
 const p=s?.story55?.ghostShare;
 return !!(s?.unlocked&&!s.poweredOff&&!s.story55?.ended&&
  Number.isInteger(p?.remote?.authorizedDay)&&p.remote.authorizedDay>=15&&p.remote.authorizedDay<=24&&
  p?.phase==='controlling'&&p.remote?.active&&
  ['ghost-project','ghost-order'].includes(p.source?.type));
}
function runId(s){
 const p=s.story55.ghostShare;
 if(p.remote?.orderId)return p.remote.orderId;
 if(p.source.type==='ghost-order')return p.source.orderId;
 const project=s.story55?.projects?.[p.source.projectId];
 const id=project?.active;
 return id&&s.ghost?.orders?.[id]?.story55Project===p.source.projectId?id:null;
}
function authorizedOrder(s){
 const p=s.story55.ghostShare,id=runId(s),o=s.ghost?.orders?.[id];
 if(!id||!o||o.type!=='route')return null;
 if(p.source.type==='ghost-order'&&id!==p.source.orderId)return null;
 if(p.source.type==='ghost-project'&&o.story55Project!==p.source.projectId)return null;
 return o;
}
function clickNative(doc,action){
 const element=doc?.querySelector('#screen-layer [data-action="'+action+'"]');
 if(!element||element.disabled||!element.isConnected)return false;
 element.click();
 return true;
}

export function createTaiLivePhoneTools({store,router,tasks,document:dom=globalThis.document}){
 function call(state,name,args={}){
  if(!toolNames.has(name))return bad('tool_not_allowed');
  if(!grant(state))return bad('remote_control_locked');
  const schema=toolNames.get(name).inputSchema;
  if(!args||Array.isArray(args)||typeof args!=='object'||
   Object.keys(args).some(k=>!Object.hasOwn(schema.properties,k)))return bad('invalid_arguments');
  if(name==='remote_show_tasks'){
   if(state.nav.current.appId!=='mirage'&&state.nav.current.appId!=='ghost')return bad('invalid_surface');
   tasks.show(state.nav.current);
   return {ok:true,data:{surface:'task-switcher'}};
  }
  if(name==='remote_open_ghost'){
   if(!['/deployment','/contract','/run'].includes(args.route))return bad('invalid_route');
   const p=state.story55.ghostShare,id=runId(state);
   if(args.route==='/deployment'&&p.source.type!=='ghost-project')return bad('invalid_route');
   if(args.route!=='/deployment'&&!authorizedOrder(state))return bad('link_order_not_ready');
   if(tasks.visible)tasks.action('tasks-open','ghost');
   const params=args.route==='/deployment'?{project:p.source.projectId}:{orderId:id};
   const current=store.get().nav.current;
   if(current.appId!=='ghost'||current.route!==args.route||
    (args.route==='/deployment'?current.params?.project!==p.source.projectId:current.params?.orderId!==id))
    router.open({appId:'ghost',route:args.route,params});
   return {ok:true,data:{app:'ghost',route:args.route}};
  }
  if(name==='remote_press_ghost'){
   if(!['s55-run-step','gh-start'].includes(args.action)||state.nav.current.appId!=='ghost')return bad('invalid_action');
   const p=state.story55.ghostShare;
   if(args.action==='s55-run-step'){
    if(p.source.type!=='ghost-project'||state.nav.current.route!=='/deployment'||
     state.nav.current.params?.project!==p.source.projectId)return bad('wrong_project');
   }else{
    if(state.nav.current.route!=='/contract'||state.nav.current.params?.orderId!==runId(state)||
     !authorizedOrder(state))return bad('wrong_order');
   }
   if(!clickNative(dom,args.action))return bad('action_not_available');
   return {ok:true,data:{action:args.action}};
  }
  if(name==='remote_read_link'){
   const o=authorizedOrder(state);
   if(!o)return bad('link_order_not_ready');
   const board=o.board;
   return {ok:true,data:{orderId:o.id,type:o.type,status:o.status,
    board:o.status==='running'&&board?.size?{
     size:board.size,source:board.source,sink:board.sink,masks:[...board.masks]
    }:null}};
  }
  if(name==='remote_rotate_pipe'){
   const o=authorizedOrder(state),index=args.index;
   if(!Number.isInteger(index)||!o||o.status!=='running'||!o.board?.size||
    index<0||index>=o.board.masks.length||index===o.board.source||index===o.board.sink||
    state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
    state.nav.current.params?.orderId!==o.id)return bad('pipe_not_permitted');
   const pipe=dom?.querySelector('#screen-layer [data-action="gh-pipe"][data-index="'+index+'"]');
   if(!pipe||pipe.disabled||!pipe.isConnected)return bad('pipe_button_not_found');
   pipe.click();
   return {ok:true,data:{orderId:o.id,index}};
  }
  if(name==='remote_release'){
   let released=false;
   store.update(s=>{
    if(grant(s)){released=finishGhostShareControl(s);if(s.story55?.ghostShare?.remote)
     s.story55.ghostShare.remote.active=false;}
   });
   return released?{ok:true,data:{released:true}}:bad('remote_control_locked');
  }
  return bad('tool_not_allowed');
 }
 return {
  has:name=>toolNames.has(name),
  list:state=>grant(state)?TAI_REMOTE_TOOLS:[],
  call
 };
}
