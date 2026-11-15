import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState} from '../src/services/storage.js';
import {activateStory55} from '../src/services/story55/runtime.js';
import {render as filesApp} from '../src/apps/files/index.js';
import {renderWeChatChat} from '../src/apps/wechat/components/chat-view.js';
import {saveIncomingZip,localFileList,renameLocalFile,moveLocalFile,copyLocalFile,deleteLocalFile,restoreLocalFile} from '../src/apps/files/features/local-library/index.js';
import {render as weatherApp} from '../src/apps/weather/replica.js';
import {getWeather} from '../src/services/weather/world.js';
import {archiveHistoryUrl,europeanLocalTime} from '../src/services/weather/remote-history.js';

test('WeChat ZIP preview saves exactly one opaque file into Files, with no extraction or Agent side effects',()=>{
 const s=activateStory55(initialState()),chat=s.content.conversations.wechat.find(c=>c.id==='group');
 chat.messages.push({id:'archive-test',from:'阿威',kind:'file',text:'security_survey_0612.zip',fileSize:9017753,day:25,time:'10:26',sentDate:'2025-06-12'});
 assert.match(renderWeChatChat(s,'group'),/wx-file-preview/);
 const route={route:'/incoming/wechat/group/archive-test',params:{}};
 assert.match(filesApp({store:{get:()=>s}},route),/儲存到檔案/);
 const saved=saveIncomingZip(s,'group','archive-test');
 assert.equal(saved.created,true);assert.equal(saved.file.folder,'downloads');
 assert.equal(saved.file.name,'security_survey_0612.zip');
 assert.equal(saved.file.origin.app,'wechat');
 assert.equal(saved.file.deleted,false);
 assert.equal(saveIncomingZip(s,'group','archive-test').created,false);
 assert.equal(localFileList(s).length,1);
 assert.equal(chat.messages.at(-1).text,'security_survey_0612.zip');
 assert.match(filesApp({store:{get:()=>s}},{route:'/folder/downloads',params:{}}),/security_survey_0612\.zip/);
 assert.match(filesApp({store:{get:()=>s}},route),/已儲存/);
 assert.doesNotMatch(filesApp({store:{get:()=>s}},{route:'/item/'+encodeURIComponent(saved.file.id),params:{}}),/解壓|解压|Agent|分析/);
 assert.equal(s.story55.completed?.['d25-agent-import'],undefined);
});

test('Files manages ZIP rename, move, duplicate, soft-delete and restore without touching the incoming chat',()=>{
 const s=activateStory55(initialState()),chat=s.content.conversations.wechat.find(c=>c.id==='group');
 chat.messages.push({id:'zip-two',from:'阿威',kind:'file',text:'data.zip'});
 const {file}=saveIncomingZip(s,'group','zip-two');
 assert.throws(()=>renameLocalFile(s,file.id,'broken.exe'),/\.zip/);
 renameLocalFile(s,file.id,'現場記錄.zip');
 moveLocalFile(s,file.id,'documents');
 const duplicate=copyLocalFile(s,file.id);
 assert.equal(duplicate.folder,'documents');
 assert.equal(localFileList(s).length,2);
 assert.equal(deleteLocalFile(s,file.id),true);
 assert.equal(deleteLocalFile(s,file.id),false);
 assert.equal(localFileList(s).length,1);
 assert.match(filesApp({store:{get:()=>s}},{route:'/trash',params:{}}),/現場記錄.zip/);
 assert.equal(restoreLocalFile(s,file.id),true);
 assert.equal(localFileList(s).length,2);
 assert.equal(chat.messages.at(-1).text,'data.zip');
 assert.equal(chat.messages.at(-1).kind,'file');
});

test('Weather is read-only and uses true 2025 London/Paris local hours, never placeholder temperatures',()=>{
 const s=activateStory55(initialState());s.day=24;s.clock='10:26';
 const list=weatherApp({store:{get:()=>s}},{route:'/',params:{}});
 assert.match(list,/倫敦/);assert.match(list,/巴黎/);
 assert.doesNotMatch(list,/weather-edit|weather-foot|修改|編輯|编辑|•••/);
 const detail=weatherApp({store:{get:()=>s}},{route:'/city/paris',params:{}});
 assert.doesNotMatch(detail,/weather-edit|weather-history-credit/);
 assert.equal(europeanLocalTime(24,'10:26','london').date,'2025-06-11');
 assert.equal(europeanLocalTime(24,'10:26','london').subtitle,'03:26');
 assert.equal(europeanLocalTime(24,'10:26','paris').subtitle,'04:26');
 assert.equal(getWeather(s,{cityId:'paris'}).temp,null);
 assert.equal(getWeather(s,{cityId:'london'}).source,'loading');
 assert.match(archiveHistoryUrl('paris'),/archive-api\.open-meteo\.com/);
 assert.match(archiveHistoryUrl('paris'),/Europe%2FParis/);
 assert.match(archiveHistoryUrl('london'),/models=era5/);
});
