import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {face,skull} from '../src/apps/mirage/art.js';

test('MIRAGE keeps the existing Nyarlathotep avatar as an embedded vector',()=>{
 const html=skull();
 assert.match(html,/^<svg[^>]+viewBox="0 0 160 160"/);
 assert.match(html,/<path /);
 assert.match(face(null,true),/<svg/);
 assert.doesNotMatch(face(null,true),/<img|\$\{skull\(\)\}/);
});

test('MIRAGE login no longer depends on a root-only image URL',async()=>{
 const source=await readFile(new URL('../src/apps/mirage/index.js',import.meta.url),'utf8');
 assert.match(source,/\$\{skull\(\)\}/);
 assert.doesNotMatch(source,/src="\/apps\/mirage\/skull\.svg"/);
});
