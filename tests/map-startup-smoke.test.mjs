import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialLockscreenImageUrls} from '../src/system/preload.js';

test('offline raster is loaded at boot before lock screen is revealed',()=>{
 const image=initialLockscreenImageUrls();
 assert.ok(image.some(url=>url.endsWith('/apps/maps/macau-offline.webp')));
 assert.equal(new Set(image).size,image.length);
});
test('map renderer does not parse giant GeoJSON on mobile or call external tile hosts',()=>{
 const code=readFileSync(new URL('../src/apps/maps/leaflet.js',import.meta.url),'utf8');
 assert.match(code,/L\.imageOverlay\(/);
 assert.doesNotMatch(code,/offline-macau-detail\.js|tile\.openstreetmap\.org|unpkg\.com/);
});
test('boot splash exists before phone root',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const boot=html.indexOf('id="xm-boot"'),root=html.indexOf('id="root"');
 assert.ok(boot>=0&&root>boot);
 assert.match(html,/id="xm-boot-percent"/);
 assert.match(html,/id="xm-boot-progress"/);
});
test('no-Leaflet fallback in the map app has a bundled map image',()=>{
 const code=readFileSync(new URL('../src/apps/maps/index.js',import.meta.url),'utf8');
 assert.match(code,/xm-map-pending/);
 assert.match(code,/apps\/maps\/macau-offline\.webp/);
});
