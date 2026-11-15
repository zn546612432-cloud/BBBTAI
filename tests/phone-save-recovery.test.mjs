import test from 'node:test';
import assert from 'node:assert/strict';
import {readPhoneSave,writePhoneSave,saveBackupKey} from '../src/services/save-recovery.js';
import {PhoneStore,KEY} from '../src/services/storage.js';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};};
const validate=s=>{if(!s||!Number.isInteger(s.day))throw Error('bad state');return s;};
test('phone progress and sent messages survive a new store instance',()=>{
 const storage=memory(),store=new PhoneStore(storage);
 store.update(s=>{s.day=5;s.clock='12:34';s.content.conversations.wechat[0].messages.push({id:'save-regression',from:'me',text:'保存測試',day:5});});
 const reopened=new PhoneStore(storage);
 assert.equal(reopened.get().day,5);assert.equal(reopened.get().clock,'12:34');
 assert.ok(reopened.get().content.conversations.wechat[0].messages.some(m=>m.id==='save-regression'));
 assert.ok(storage.getItem(saveBackupKey(KEY)));
});
test('invalid primary recovers backup and retains the unreadable original',()=>{
 const storage=memory();writePhoneSave(storage,'phone',{day:12},{backup:true});
 storage.setItem('phone','{broken');
 assert.equal(readPhoneSave(storage,'phone',validate).day,12);
 assert.equal(storage.getItem('phone-unreadable'),'{broken');
});
test('missing primary recovers backup rather than starting D01',()=>{
 const storage=memory();writePhoneSave(storage,'phone',{day:19},{backup:true});storage.removeItem('phone');
 assert.equal(readPhoneSave(storage,'phone',validate).day,19);
});
test('invalid save with no valid backup aborts without overwriting either slot',()=>{
 const storage=memory();storage.setItem(KEY,'{"day":8}');storage.setItem(saveBackupKey(KEY),'broken');
 assert.throws(()=>new PhoneStore(storage),/沒有重新開始/);
 assert.equal(storage.getItem(KEY),'{"day":8}');assert.equal(storage.getItem(saveBackupKey(KEY)),'broken');
});
test('temporarily denied storage never creates a fresh save',()=>{
 let writes=0;const storage={getItem(){throw Error('SecurityError');},setItem(){writes++;}};
 assert.throws(()=>new PhoneStore(storage),/原進度未被覆蓋/);assert.equal(writes,0);
});
test('failed primary commit preserves the last good backup',()=>{
 const storage=memory();writePhoneSave(storage,'phone',{day:9},{backup:true});const set=storage.setItem;
 storage.setItem=(k,v)=>{if(k==='phone')throw Error('quota');set(k,v);};
 assert.throws(()=>writePhoneSave(storage,'phone',{day:10},{backup:true}),/quota/);
 assert.equal(readPhoneSave(storage,'phone',validate).day,9);
 assert.equal(JSON.parse(storage.getItem(saveBackupKey('phone'))).day,9);
});
test('backup quota failure does not prevent saving new progress',()=>{
 const storage=memory(),set=storage.setItem;storage.setItem=(k,v)=>{if(k.endsWith('-last-good'))throw Error('quota');set(k,v);};
 writePhoneSave(storage,'phone',{day:13},{backup:true});assert.equal(readPhoneSave(storage,'phone',validate).day,13);
});
