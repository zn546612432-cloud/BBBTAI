// Provider boundary. No secret belongs in this file or browser storage.
export class MiniMaxVoice {
 constructor({endpoint='',accessToken=()=>null}={}){this.endpoint=endpoint;this.accessToken=accessToken;}
 async synthesize(scriptId,signal){if(!this.endpoint)throw Error('MiniMax 尚未連接，請先在後端配置語音服務。');const token=await this.accessToken();if(!token)throw Error('請先登入語音服務。');const r=await fetch(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({scriptId}),signal});if(!r.ok)throw Error('語音服務暫時無法使用，請稍後再試。');return r.blob();}
}
export class SupabaseSaveAdapter {
 constructor(client){this.client=client;}
 async save(id,snapshot){const {data:{user},error:authError}=await this.client.auth.getUser();if(authError||!user)throw Error('尚未登入');const {error}=await this.client.from('phone_saves').upsert({id,user_id:user.id,snapshot,updated_at:new Date().toISOString()});if(error)throw error;}
 async load(id){const {data,error}=await this.client.from('phone_saves').select('snapshot').eq('id',id).single();if(error)throw error;return data.snapshot;}
}
export const voice=new MiniMaxVoice();
