import test from 'node:test';
import assert from 'node:assert/strict';
import {D06_WISH_IMAGE_NAMES,d06WishImage} from '../src/services/assets/wish-media.js';

// Deliberately red until the twelve original JPEGs have really been uploaded.
// Moving assets from GitHub Pages to Supabase must not silently bypass the
// image integrity audit or publish broken message/photos in D06–D07.
test('all 12 real D06 photo objects exist and are publicly readable on Supabase Storage', {timeout:18000}, async()=>{
 assert.equal(D06_WISH_IMAGE_NAMES.length,12);
 assert.equal(new Set(D06_WISH_IMAGE_NAMES).size,12);
 const failures=[];
 await Promise.all(D06_WISH_IMAGE_NAMES.map(async name=>{
  const url=d06WishImage(name);
  try{
   const res=await fetch(url,{method:'HEAD',signal:AbortSignal.timeout(10000)});
   if(!res.ok){failures.push(name+': HTTP '+res.status);return;}
   const mime=res.headers.get('content-type')||'';
   if(!mime.includes('image/jpeg'))failures.push(name+': content-type '+mime);
  }catch(e){failures.push(name+': '+(e?.message||e));}
 }));
 assert.deepEqual(failures.sort(),[], 'Upload all twelve original JPGs to Supabase ximeng-assets/d06 before merging');
});
