import test from 'node:test';
import assert from 'node:assert/strict';
import {initialLockscreenImageUrls} from '../src/system/preload.js';

test('lock-screen preload includes both icon atlases, wallpaper, and real character portraits',()=>{
 const images=initialLockscreenImageUrls('/wallpapers/midnight-glass.png');
 assert.ok(images.includes('/icons/glass-atlas.png'));
 assert.ok(images.includes('/icons/glass-utilities.png'));
 assert.ok(images.some(x=>x.endsWith('/wallpapers/midnight-glass.png')));
 assert.ok(images.includes('/apps/wechat/avatars/originals/ximeng.jpeg'));
 assert.ok(images.includes('/apps/wechat/avatars/originals/fulongsheng.jpeg'));
 assert.equal(images.length,new Set(images).size);
 assert.ok(images.every(x=>x.startsWith('/')&&!x.startsWith('//')));
});

test('custom wallpapers remain untouched when they are saved as data URLs',()=>{
 const uri='data:image/png;base64,AAAA';
 const images=initialLockscreenImageUrls(uri);
 assert.ok(images.includes(uri));
 assert.equal(images.filter(x=>x===uri).length,1);
});
