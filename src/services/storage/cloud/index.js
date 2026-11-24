import {isTaiCloudHost,saveTaiCloudSession,SESSION_KEY} from '../../ai/supabase-gateway.js';
import {openSaveJournal} from '../recovery.js';
import {currentCloudPlayer,readCloudSave,writeCloudSave,eraseCloudSave,cloudBackups,takeEmailCallback} from './api.js';
import {snapshotVoiceMedia,useCloudVoiceMedia} from './media.js';

const hash=async raw=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),b=>b.toString(16).padStart(2,'0')).join('');
const parse=value=>{try{return JSON.parse(value||'null');}catch{return null;}};
const snapshot=row=>{const s=structuredClone(row.game_state);delete s._cloudMedia;delete s._cloudWriteId;return s;};
// Day and clock form a monotonic progress checkpoint. A fresh D01 bootstrap
// must never be able to replace a later cloud save without an explicit choice.
const progressOf=s=>{
 const day=Number(s?.day)||1,match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(s?.clock||'');
 return day*1440+(match?Number(match[1])*60+Number(match[2]):0);
};
export class PlayerCloudSave{
 constructor(store,{key,validate,slot=1,enabled=true,api={},factory=globalThis.indexedDB,delay=15000,now=Date.now}={}){
  this.store=store;this.key=key;this.validate=validate;this.slot=slot;this.enabled=enabled;this.factory=factory;this.delay=delay;this.now=now;
  this.api={player:currentCloudPlayer,read:readCloudSave,write:writeCloudSave,erase:eraseCloudSave,backups:cloudBackups,media:snapshotVoiceMedia,useMedia:useCloudVoiceMedia,...api};
  this.status={phase:enabled?'connecting':'local',player:null,lastSaved:null,conflict:null};this.meta={};this.revision=null;this.media={};this.listeners=new Set();
 }
 publish(patch){Object.assign(this.status,patch);for(const fn of this.listeners)fn(this.status);}
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 get ownerKey(){return this.key+':cloud-owner';}
 get restartKey(){return this.key+':cloud-explicit-restart';}
 // 0000 + confirmation intentionally erases this player's existing run.
 // The marker is durable until DELETE and the fresh D01 upload both succeed.
 markExplicitRestart(){
  if(!this.enabled)return;
  let owner=this.player?.id||this.store.storage.getItem(this.ownerKey);
  if(!owner)try{owner=parse(this.store.storage.getItem(SESSION_KEY))?.user?.id;}catch{}
  this.store.storage.setItem(this.restartKey,JSON.stringify({owner:owner||null,at:this.now(),erase:true}));
  this.erasing=true;this.allowRollback=true;
  clearTimeout(this.timer);this.timer=null;
  this.publish({phase:'pending',conflict:null,message:''});
 }
 get metaKey(){return this.key+':cloud:'+this.player.id+':'+this.slot;}
 saveMeta(patch){Object.assign(this.meta,patch);this.store.storage.setItem(this.metaKey,JSON.stringify(this.meta));}
 timerAfter(ms=this.delay){if(this.timer||this.closed||!this.enabled||this.status.conflict)return;this.timer=setTimeout(()=>{this.timer=null;void this.flush();},ms);this.timer.unref?.();}
 schedule(raw){if(!this.enabled||this.applying||this.closed)return;this.pending=raw;if(!this.switching&&!this.erasing)this.timerAfter();}
 async backupLocal(){
  const raw=JSON.stringify(this.store.get()),owner=this.store.storage.getItem(this.ownerKey)||'unbound';
  const journal=await openSaveJournal(this.factory,this.key+':before-cloud-restore:'+owner);
  if(journal){try{journal.schedule(raw);await journal.flush();}finally{journal.close();}}
  else this.store.storage.setItem(this.key+':before-cloud-restore:'+owner,raw);
 }
 async restore(row,{expectedRaw}={}){
  if(this.erasing)return false;
  const next=this.validate(snapshot(row));await this.backupLocal();
  if(this.erasing)return false;
  if(expectedRaw!==undefined&&JSON.stringify(this.store.get())!==expectedRaw){this.conflict(row);return false;}
  this.applying=true;try{this.store.replace(next);}finally{this.applying=false;}
  this.media=row.game_state._cloudMedia||{};this.api.useMedia(this.player.id,this.media);
  this.pending=JSON.stringify(this.store.get());
  this.revision=row.revision;this.rowId=row.id;this.remoteProgress=progressOf(next);this.remoteRow=row;
  this.store.storage.setItem(this.ownerKey,this.player.id);
  this.saveMeta({revision:row.revision,id:row.id,hash:await hash(this.pending),pending:null,lastSaved:row.updated_at});
  this.store.storage.removeItem(this.restartKey);this.allowRollback=false;
  this.publish({phase:'synced',lastSaved:row.updated_at,conflict:null});
  return true;
 }
 conflict(row){this.publish({phase:'conflict',conflict:{remote:row,local:JSON.parse(this.pending||JSON.stringify(this.store.get()))}});}
 async start({switchAccount=false}={}){
  if(!this.enabled)return false;
  if(this.starting)return this.starting;
  this.starting=(async()=>{
   try{
    this.publish({phase:'connecting'});const player=await this.api.player();
    if(!player?.id)throw Error('無法確認雲端身份。');
    this.player=player;this.publish({player});
    const owner=this.store.storage.getItem(this.ownerKey);
    this.erasing=Boolean(parse(this.store.storage.getItem(this.restartKey)));
    this.allowRollback=this.erasing;
    this.meta=parse(this.store.storage.getItem(this.metaKey))||{};
    const initialRaw=JSON.stringify(this.store.get());
    const row=await this.api.read(this.slot,this.player.id);
    if(this.closed)return false;
    const raw=JSON.stringify(this.store.get());this.pending=raw;
    // Re-read the marker AFTER the network request. The player can enter 0000
    // while an earlier connection is in flight; it must never resurrect D55.
    const intentionalRestart=parse(this.store.storage.getItem(this.restartKey));
    if(intentionalRestart&&(intentionalRestart.owner&&intentionalRestart.owner!==player.id
      ||(!intentionalRestart.owner&&row)||owner&&owner!==player.id)){
     this.conflict(row);return false;
    }
    this.erasing=Boolean(intentionalRestart);
    this.allowRollback=this.erasing;
    if(this.erasing){
     // DELETE the owned save by ID and slot; PostgreSQL cascades its 3 backup
     // snapshots and TAI data. This is the only code path that destroys them.
     if(row){
      const result=await this.api.erase({slot:this.slot,player:player.id,id:row.id});
      if(result?.status!=='deleted')throw Error('雲端存檔已變更，未清除其他進度。請重試。');
     }
     this.revision=0;this.rowId=null;this.remoteProgress=0;this.remoteRow=null;this.media={};
     this.meta={};this.saveMeta({id:null,revision:0,hash:null,pending:null,lastSaved:null,missingMedia:0});
     this.store.storage.setItem(this.ownerKey,player.id);
     this.erasing=false;
     this.publish({phase:'pending',conflict:null,lastSaved:null,message:''});
     this.timerAfter(0);return true;
    }
    if(owner&&owner!==player.id){
     if(switchAccount&&row)return await this.restore(row);
     this.conflict(row);return false;
    }
    if(row){
     this.validate(snapshot(row));this.rowId=row.id;this.remoteProgress=progressOf(snapshot(row));this.remoteRow=row;
     this.media=row.game_state._cloudMedia||{};this.api.useMedia(player.id,this.media);
     const localHash=await hash(raw),sameLineage=this.meta.id===row.id;
     if((!this.store.hasExistingSave&&raw===initialRaw)||(switchAccount&&!owner))return await this.restore(row,{expectedRaw:raw});
     // If an earlier boot wrote a D01 placeholder, recover the later cloud
     // checkpoint instead of treating that placeholder as the current game.
     // For a nonempty older local game, preserve both and ask the player.
     if(!this.allowRollback&&this.remoteProgress>progressOf(this.store.get())){
      if((sameLineage&&localHash===this.meta.hash)||this.store.get().day===1&&raw===initialRaw)return await this.restore(row,{expectedRaw:raw});
      this.conflict(row);return false;
     }
     if((sameLineage&&this.meta.revision===row.revision)||(this.meta.pending?.id&&row.client_write_id===this.meta.pending.id)){
      this.revision=row.revision;
      if(row.client_write_id===this.meta.pending?.id)this.saveMeta({id:row.id,revision:row.revision,hash:this.meta.pending.hash,pending:null,lastSaved:row.updated_at});
     }else if(sameLineage&&localHash===this.meta.hash)return await this.restore(row,{expectedRaw:raw});
     else{this.conflict(row);return false;}
    }else{
     // A missing remote row is not permission to recreate a deleted save or
     // upload another account's local history.
     if(this.meta.revision){this.conflict(null);return false;}
     this.revision=0;this.remoteProgress=0;this.remoteRow=null;
    }
    this.store.storage.setItem(this.ownerKey,player.id);
    this.publish({phase:'pending',conflict:null,lastSaved:this.meta.lastSaved||null});
    this.timerAfter(0);return true;
   }catch(error){this.publish({phase:'offline',message:error.message});this.timerAfter(30000);return false;}
  })().finally(()=>{this.starting=null;});
  return this.starting;
 }
 async flush(){
  if(!this.enabled||this.closed||this.applying||this.switching||this.status.conflict)return false;
  if(this.erasing){await this.start();return false;}
  if(this.saving){
   // A second device edit may arrive while the startup save is in flight.
   // Do not report the first (stale) upload as success for the newer snapshot:
   // the newer edit must run its own revision CAS and detect a remote conflict.
   const settled=await this.saving;
   if(!settled||this.closed||this.status.conflict)return false;
   const latest=this.pending||JSON.stringify(this.store.get());
   if(await hash(latest)!==this.meta.hash||this.meta.missingMedia)return this.flush();
   return settled;
  }
  if(this.revision===null){await this.start();return false;}
  clearTimeout(this.timer);this.timer=null;
  this.saving=(async()=>{
   const raw=this.pending||JSON.stringify(this.store.get()),fingerprint=await hash(raw);
   if(!this.allowRollback&&this.remoteProgress>progressOf(JSON.parse(raw))){
    this.conflict(this.remoteRow||null);
    return false;
   }
   if(fingerprint===this.meta.hash&&!this.meta.missingMedia){this.publish({phase:'synced'});return true;}
   const previous=this.meta.pending;
   const write={id:previous?.hash===fingerprint?previous.id:crypto.randomUUID(),hash:fingerprint};
   try{
    this.saveMeta({pending:write});this.publish({phase:'saving',message:''});
    const state=this.validate(JSON.parse(raw));
    const media=await this.api.media(state,this.player.id,this.media);
    const result=await this.api.write({slot:this.slot,revision:this.revision,writeId:write.id,state:{...state,_cloudMedia:media.media},player:this.player.id});
    if(result.status==='conflict'){
     const remote=await this.api.read(this.slot,this.player.id);
     if(remote&&previous?.id===remote.client_write_id){
      this.revision=remote.revision;this.saveMeta({revision:remote.revision,pending:write});this.timerAfter(0);return false;
     }
     this.conflict(remote);return false;
    }
    if(result.status!=='saved'||!Number.isSafeInteger(result.revision))throw Error('雲端未確認存檔成功。');
    this.revision=result.revision;this.rowId=result.id;this.media=media.media;
    this.remoteProgress=progressOf(state);this.remoteRow={...result,game_state:state};
    this.api.useMedia(this.player.id,this.media);
    this.saveMeta({id:result.id,revision:result.revision,hash:fingerprint,pending:null,lastSaved:result.updated_at,missingMedia:media.missing||0});
    this.store.hasExistingSave=true;
    if(!this.erasing){this.store.storage.removeItem(this.restartKey);this.allowRollback=false;}
    this.publish({phase:media.missing?'media-pending':'synced',lastSaved:result.updated_at});
    if(this.pending!==raw)this.timerAfter();return true;
   }catch(error){this.publish({phase:'offline',message:error.message});this.timerAfter(30000);return false;}
  })().finally(()=>{this.saving=null;});
  return this.saving;
 }
 async resolve(choice){
  const conflict=this.status.conflict;if(!conflict)return false;
  if(choice==='remote'&&conflict.remote){const row=await this.api.read(this.slot,this.player.id);if(!row)throw Error('雲端存檔已變更，請重新同步。');return await this.restore(row);}
  if(choice!=='local')return false;
  // Read once more before a user-authorized replacement; CAS still protects
  // against a device that writes between this read and our upload.
  const remote=await this.api.read(this.slot,this.player.id);await this.backupLocal();
  this.revision=remote?.revision||0;this.rowId=remote?.id;
  this.store.storage.setItem(this.ownerKey,this.player.id);
  this.meta={revision:this.revision,id:this.rowId};this.saveMeta({});
  this.pending=JSON.stringify(this.store.get());this.publish({phase:'pending',conflict:null});
  this.allowRollback=true;try{return await this.flush();}finally{this.allowRollback=false;}
 }
 async acceptSession(session){
  if(!session?.access_token||!session?.refresh_token)throw Error('郵箱尚未完成驗證，原進度已保留。');
  this.switching=true;clearTimeout(this.timer);this.timer=null;
  try{
   if(this.starting)await this.starting;
   if(this.saving)await this.saving;
   await this.backupLocal();saveTaiCloudSession(session);
   const player=await this.api.player();
   if(player.id===this.player?.id){this.player=player;this.publish({player});return true;}
   this.revision=null;this.publish({conflict:null});return await this.start({switchAccount:true});
  }finally{this.switching=false;this.timerAfter(0);}
 }
 async history(){if(!this.rowId)return [];return this.api.backups(this.rowId,this.player.id);}
 async restoreBackup(row){
  this.validate(snapshot(row));await this.backupLocal();
  this.applying=true;try{this.store.replace(snapshot(row));}finally{this.applying=false;}
  this.media=row.game_state._cloudMedia||{};this.api.useMedia(this.player.id,this.media);
  this.pending=JSON.stringify(this.store.get());this.publish({phase:'pending',conflict:null});
  this.allowRollback=true;try{return await this.flush();}finally{this.allowRollback=false;}
 }
 close(){this.closed=true;clearTimeout(this.timer);}
}

export async function connectPlayerSave(store,{key,validate,preview=false,location=globalThis.location,...options}={}){
 const previewHost=/^[a-z0-9-]+\.bbbtai\.pages\.dev$/.test(location?.hostname||'');
 const testPreview=previewHost&&new URLSearchParams(location?.search||'').get('saveTest')==='1';
 // The shareable friends test is the only review page with real cloud saves.
 // Its distinct local save key and slot 2 keep it isolated from production slot 1.
 const friendsTest=location?.hostname==='zn546612432-cloud.github.io'
  &&/^\/BBBTAI\/review\/friends-test\/(?:index\.html)?$/.test(location?.pathname||'');
 const enabled=isTaiCloudHost(location?.hostname)&&(!preview||friendsTest)&&(!previewHost||testPreview);
 const cloud=new PlayerCloudSave(store,{key,validate,enabled,slot:friendsTest||testPreview?2:1,...options});store.cloud=cloud;
 if(!enabled)return cloud;
 let callback=false;try{callback=takeEmailCallback();}catch(error){cloud.publish({phase:'offline',message:error.message});return cloud;}
 const initial=cloud.start({switchAccount:callback});
 // Offline or slow cloud access cannot prevent the existing local phone
 // from opening. Late arrivals use the normal conflict checks above.
 let timer;await Promise.race([initial,new Promise(resolve=>{timer=setTimeout(resolve,5000);})]);clearTimeout(timer);
 const retry=()=>{if(!cloud.status.conflict)void cloud.flush();};
 globalThis.window?.addEventListener('online',retry);
 return cloud;
}
