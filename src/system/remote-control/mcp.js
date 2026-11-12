// LIVE, same-page MCP tool adapter. Unlike the existing read-only stdio
// snapshot server, this adapter is explicitly injected into the existing
// JSON-RPC dispatcher only while a story-authorized GHOST session is active.
// Nothing here is exposed on the public network or accesses the real device.
import {finishGhostShareControl} from '../../services/story55/ghost-share.js';
import {veilNextCell,veilScanners} from '../../apps/ghost/games/arcade.js';

export const TAI_REMOTE_TOOLS=Object.freeze([
 {name:'remote_show_tasks',description:'Show native virtual iPhone app switcher',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_open_ghost',description:'Open only the shared GHOST project or current LINK order',inputSchema:{type:'object',properties:{route:{type:'string',enum:['/deployment','/contract','/run']}},required:['route'],additionalProperties:false}},
 {name:'remote_press_ghost',description:'Press the existing GHOST start/next-step button; never change a board directly',inputSchema:{type:'object',properties:{action:{type:'string',enum:['s55-run-step','gh-start']}},required:['action'],additionalProperties:false}},
 {name:'remote_read_link',description:'Read only the LINK board shared in this takeover',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_read_cipher',description:'Read only the displayed CIPHER tile positions for this shared order',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_read_veil',description:'Read only the authorized VEIL arcade maze or legacy keypad state',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_read_extract',description:'Read only face-up EXTRACT cards or visible legacy fingerprint choices',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'remote_rotate_pipe',description:'Click one real GHOST pipe button for the shared LINK board',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:80}},required:['index'],additionalProperties:false}},
 {name:'remote_tap_cipher_tile',description:'Click one real GHOST tile of the authorized CIPHER order',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:8}},required:['index'],additionalProperties:false}},
 {name:'remote_step_veil',description:'Press one safe native VEIL direction or WAIT button',inputSchema:{type:'object',properties:{direction:{type:'string',enum:['up','down','left','right','wait']}},required:['direction'],additionalProperties:false}},
 {name:'remote_tap_extract',description:'Flip one still-available EXTRACT card in original GHOST interface',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:9}},required:['index'],additionalProperties:false}},
 {name:'remote_choose_extract_legacy',description:'Press a visible legacy fingerprint option with the native GHOST button',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:3}},required:['index'],additionalProperties:false}},
 {name:'remote_press_veil_key',description:'Press a native legacy VEIL numeric key, never set its solution directly',inputSchema:{type:'object',properties:{key:{type:'string',pattern:'^[0-9]$'}},required:['key'],additionalProperties:false}},
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
function remoteArcadeAllowlisted(s,o){
 // D01 repair and the D06 wallet challenge have authored settlement effects.
 return !!(['veil','extract'].includes(o?.type)&&o.id!=='mirage001'&&
  o.id!=='mirage-ouroboros-10btc-d05'&&
  (o.story55Project||o.story55Commission||s.content?.mirage?.linkedMissions?.[o.id]));
}
function authorizedOrder(s){
 const p=s.story55.ghostShare,id=runId(s),o=s.ghost?.orders?.[id];
 if(!id||!o||!['route','cipher','veil','extract'].includes(o.type))return null;
 if(['veil','extract'].includes(o.type)&&!remoteArcadeAllowlisted(s,o))return null;
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
   if(!o||o.type!=='route')return bad('link_order_not_ready');
   const board=o.board;
   return {ok:true,data:{orderId:o.id,type:o.type,status:o.status,
    board:o.status==='running'&&board?.size?{
     size:board.size,source:board.source,sink:board.sink,masks:[...board.masks]
    }:null}};
  }
  if(name==='remote_rotate_pipe'){
   const o=authorizedOrder(state),index=args.index;
   if(!Number.isInteger(index)||!o||o.type!=='route'||o.status!=='running'||!o.board?.size||
    index<0||index>=o.board.masks.length||index===o.board.source||index===o.board.sink||
    state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
    state.nav.current.params?.orderId!==o.id)return bad('pipe_not_permitted');
   const pipe=dom?.querySelector('#screen-layer [data-action="gh-pipe"][data-index="'+index+'"]');
   if(!pipe||pipe.disabled||!pipe.isConnected)return bad('pipe_button_not_found');
   pipe.click();
   return {ok:true,data:{orderId:o.id,index}};
  }
  if(name==='remote_read_cipher'){
   const o=authorizedOrder(state);
   if(!o||o.type!=='cipher')return bad('cipher_order_not_ready');
   return {ok:true,data:{orderId:o.id,type:o.type,status:o.status,
    board:o.status==='running'&&Array.isArray(o.board?.tiles)?{tiles:[...o.board.tiles]}:null}};
  }
  if(name==='remote_tap_cipher_tile'){
   const o=authorizedOrder(state),index=args.index;
   if(!o||o.type!=='cipher'||o.status!=='running'||!Number.isInteger(index)||
      index<0||index>8||!Array.isArray(o.board?.tiles)||
      state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
      state.nav.current.params?.orderId!==o.id)return bad('tile_not_permitted');
   const tile=dom?.querySelector('#screen-layer [data-action="gh-tile"][data-index="'+index+'"]');
   if(!tile||tile.disabled||!tile.isConnected)return bad('tile_button_not_found');
   tile.click();
   return {ok:true,data:{orderId:o.id,index}};
  }
  if(name==='remote_read_veil'){
   const o=authorizedOrder(state);
   if(!o||o.type!=='veil')return bad('veil_order_not_ready');
   if(o.status!=='running')return {ok:true,data:{orderId:o.id,type:'veil',status:o.status,board:null,deadline:o.deadline}};
   const a=o.board?.arcade;
   if(a){
    if(a.kind!=='veil')return bad('invalid_veil_board');
    return {ok:true,data:{orderId:o.id,type:'veil',status:o.status,
     deadline:o.deadline,board:{kind:'veil',player:a.player,phase:a.phase,
      exit:a.exit,walls:[...a.walls],steps:a.steps,heat:a.heat}}};
   }
   const b=o.board;
   if(typeof b?.code!=='string'||!/^\d{1,12}$/.test(b.code))return bad('invalid_veil_board');
   return {ok:true,data:{orderId:o.id,type:'veil',status:o.status,
    deadline:o.deadline,board:{kind:'legacy-keypad',code:b.code,
     input:String(b.input||''),round:Number(b.round)||0}}};
  }
  if(name==='remote_step_veil'){
   const o=authorizedOrder(state),direction=args.direction,a=o?.board?.arcade;
   if(!o||o.type!=='veil'||o.status!=='running'||a?.kind!=='veil'||
      !['up','down','left','right','wait'].includes(direction)||
      o.deadline!==null&&Date.now()>=o.deadline||
      state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
      state.nav.current.params?.orderId!==o.id)return bad('veil_step_not_permitted');
   const cell=veilNextCell(a.player,direction,a.walls);
   if(cell===null)return bad('invalid_veil_step');
   if(veilScanners((a.phase+1)%3).includes(cell))return bad('unsafe_veil_step');
   const button=dom?.querySelector('#screen-layer [data-action="gh-arcade-step"][data-value="'+direction+'"]');
   if(!button||button.disabled||!button.isConnected)return bad('veil_button_not_found');
   button.click();
   return {ok:true,data:{orderId:o.id,direction}};
  }
  if(name==='remote_press_veil_key'){
   const o=authorizedOrder(state),key=args.key;
   if(!o||o.type!=='veil'||o.status!=='running'||o.board?.arcade||
      typeof key!=='string'||! /^[0-9]$/.test(key)||
      typeof o.board?.code!=='string'||o.deadline!==null&&Date.now()>=o.deadline||
      state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
      state.nav.current.params?.orderId!==o.id)return bad('veil_key_not_permitted');
   const button=dom?.querySelector('#screen-layer [data-action="gh-key"][data-key="'+key+'"]');
   if(!button||button.disabled||!button.isConnected)return bad('veil_key_button_not_found');
   button.click();
   return {ok:true,data:{orderId:o.id,key}};
  }
  if(name==='remote_read_extract'){
   const o=authorizedOrder(state);
   if(!o||o.type!=='extract')return bad('extract_order_not_ready');
   if(o.status!=='running')return {ok:true,data:{orderId:o.id,type:'extract',status:o.status,deadline:o.deadline,board:null}};
   const a=o.board?.arcade;
   if(a){
    if(a.kind!=='extract'||!Array.isArray(a.cards)||a.cards.length!==10||
       !Array.isArray(a.matched)||!Array.isArray(a.revealed))return bad('invalid_extract_board');
    const faceUp=new Set([...a.matched,...a.revealed]);
    const visible=[...faceUp].filter(i=>Number.isInteger(i)&&i>=0&&i<10)
     .map(index=>({index,symbol:a.cards[index]}));
    // Never return the hidden cards list from the stored board.
    return {ok:true,data:{orderId:o.id,type:'extract',status:o.status,deadline:o.deadline,
     board:{kind:'extract',cardCount:a.cards.length,
      revealed:[...a.revealed],matched:[...a.matched],visible,
      lockUntil:a.lockUntil||0,errors:a.errors||0}}};
   }
   const b=o.board;
   if(typeof b?.target!=='string'||!Array.isArray(b.options)||
      b.options.length!==4)return bad('invalid_extract_board');
   return {ok:true,data:{orderId:o.id,type:'extract',status:o.status,deadline:o.deadline,
    board:{kind:'legacy-fingerprint',target:b.target,options:[...b.options],round:b.round||0}}};
  }
  if(name==='remote_tap_extract'){
   const o=authorizedOrder(state),index=args.index,a=o?.board?.arcade;
   if(!o||o.type!=='extract'||o.status!=='running'||a?.kind!=='extract'||
      !Array.isArray(a.cards)||a.cards.length!==10||
      !Number.isInteger(index)||index<0||index>=a.cards.length||
      (a.lockUntil||0)>0||a.matched.includes(index)||a.revealed.includes(index)||
      o.deadline!==null&&Date.now()>=o.deadline||
      state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
      state.nav.current.params?.orderId!==o.id)return bad('extract_tap_not_permitted');
   const button=dom?.querySelector('#screen-layer [data-action="gh-arcade-tap"][data-value="'+index+'"]');
   if(!button||button.disabled||!button.isConnected)return bad('extract_button_not_found');
   button.click();
   return {ok:true,data:{orderId:o.id,index}};
  }
  if(name==='remote_choose_extract_legacy'){
   const o=authorizedOrder(state),index=args.index;
   if(!o||o.type!=='extract'||o.status!=='running'||o.board?.arcade||
      !Array.isArray(o.board?.options)||o.board.options.length!==4||
      !Number.isInteger(index)||index<0||index>=4||
      o.deadline!==null&&Date.now()>=o.deadline||
      state.nav.current.appId!=='ghost'||state.nav.current.route!=='/run'||
      state.nav.current.params?.orderId!==o.id)return bad('extract_option_not_permitted');
   const button=dom?.querySelector('#screen-layer [data-action="gh-match"][data-index="'+index+'"]');
   if(!button||button.disabled||!button.isConnected)return bad('extract_option_not_visible');
   button.click();
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
