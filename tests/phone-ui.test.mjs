import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {LockScreen} from '../src/system/lock.js';
import {PhoneStore,initialState} from '../src/services/storage.js';
import {iconAssets} from '../src/system/icon-assets.js';
import {registry,homePages,dockApps} from '../src/system/registry.js';
import {addReminder,toggleReminder,reminders} from '../src/services/reminders.js';
import {home} from '../src/system/shell.js';

test('lock blocks partial and wrong passcodes, preserves link for retry, clears it on cancel',()=>{
 const lock=new LockScreen(),link={appId:'chess',route:'/'};
 assert.equal(lock.key('0'),'ignored');
 lock.open(link);'0000'.split('').forEach(x=>lock.key(x));assert.equal(lock.stage,'error');
 assert.equal(lock.key('1'),'ignored');lock.retry();assert.deepEqual(lock.pendingLink,link);
 '081'.split('').forEach(x=>lock.key(x));assert.equal(lock.stage,'passcode');
 lock.key('erase');assert.equal(lock.digits,'08');lock.key('1');assert.equal(lock.key('6'),'unlocking');
 assert.equal(lock.key('0'),'ignored');lock.reset();assert.equal(lock.pendingLink,null);
 lock.open(link);lock.key('cancel');assert.equal(lock.pendingLink,null);assert.equal(initialState().unlocked,false);
});
test('every desktop and dock app has a generated icon with crop bounds inside its sheet',()=>{
 for(const id of new Set([...homePages.flat(),...dockApps])){
  assert.ok(registry.has(id));const a=iconAssets[id];assert.ok(a,id);
  assert.ok(a.x>=0&&a.y>=0&&a.x+a.w<=a.size&&a.y+a.h<=a.size,id);
  assert.ok(existsSync('public'+a.src),a.src);
 }
});
test('reminders persist independently of notes and old saved content can add its first reminder',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},store=new PhoneStore(storage);
 const notes=structuredClone(store.get().content.notes);
 const old=structuredClone(store.get());delete old.content.reminders;store.replace(old);
 assert.equal(reminders(store.get()).length,0);assert.equal(addReminder(store,'   '),false);
 assert.equal(addReminder(store,'试用提醒'),true);const item=reminders(store.get())[0];
 toggleReminder(store,item.id);assert.equal(reminders(new PhoneStore(storage).get())[0].done,true);
 assert.deepEqual(store.get().content.notes,notes);
 store.update(s=>{s.homePage=1;});assert.match(home(store.get()),/今天的事项已完成/);
});

import {uid} from '../src/services/id.js';
test('local record creation also works without secure-context randomUUID',()=>{const ids=new Set(Array.from({length:100},()=>uid({})));assert.equal(ids.size,100);});
