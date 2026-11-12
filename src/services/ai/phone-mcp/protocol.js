// MCP-compatible JSON-RPC facade around the same allow-listed browser tools.
// A future authenticated HTTP/stdio transport can reuse this exact dispatcher.
// It never sees raw state serialization or arbitrary table/field names.
import {PHONE_MCP_VERSION,listTaiPhoneTools,callTaiPhoneTool} from './index.js';
export const MCP_PROTOCOL_VERSION='2025-11-25';
export function dispatchTaiPhoneMcp(state,request,{liveTools=null}={}){
 if(!request||request.jsonrpc!=='2.0'||!Number.isInteger(request.id)&&typeof request.id!=='string')return null;
 const reply=result=>({jsonrpc:'2.0',id:request.id,result});
 const error=(code,message)=>({jsonrpc:'2.0',id:request.id,error:{code,message}});
 if(request.method==='initialize')return reply({protocolVersion:MCP_PROTOCOL_VERSION,
  capabilities:{tools:{listChanged:false}},
  serverInfo:{name:'bbbtai-tai-phone',version:PHONE_MCP_VERSION}});
 if(request.method==='ping')return reply({});
 if(request.method==='tools/list'){
  return reply({tools:[...listTaiPhoneTools(),...(liveTools?.list?.(state)||[])]});
 }
 if(request.method==='tools/call'){
  const name=request.params?.name,args=request.params?.arguments??{};
  // Live tools are injected only by the authenticated same-page operator.
  // The default stdio/export dispatcher remains strictly read-only.
  const result=liveTools?.has?.(name)?liveTools.call(state,name,args):callTaiPhoneTool(state,name,args);
  return reply({content:[{type:'text',text:JSON.stringify(result)}],
   isError:result.ok!==true,
   structuredContent:result});
 }
 return error(-32601,'Method not found');
}
