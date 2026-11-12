// One live provider-config check. Never prints tokens, providers' keys or chat.
import {taiCloudSession,taiCloudCall} from '../../src/services/ai/supabase-gateway.js';
const m=new Map();
globalThis.localStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};
const s=await taiCloudSession();
if(!s.access_token||!s.refresh_token)throw Error('anonymous_auth_session_unavailable');
const status=await taiCloudCall('status');
if(status.mode!=='supabase-protected'||!status.deepseek||!status.minimax)
 throw Error('provider_secrets_missing_or_gateway_not_configured');
console.log('Supabase AI JWT authentication + two provider secret flags: PASS (values never logged).');
// No paid API calls. The game feature uses the same endpoints.
