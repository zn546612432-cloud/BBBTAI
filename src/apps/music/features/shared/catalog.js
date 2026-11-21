import {publicAssetPath} from '../../../../services/public-assets.js';
export const tracks=[{id:'tonight-rain',title:'今夜有雨',artist:'h3r3',duration:290},{id:'melatonin',title:'褪黑素',artist:'江皓南',duration:281}].map(t=>({...t,src:publicAssetPath(`assets/music/${t.id}.m4a`),cover:publicAssetPath(`assets/music/${t.id}-cover.svg`)}));
export const trackById=id=>tracks.find(t=>t.id===id)||tracks[0];
export const matchingTracks=query=>tracks.filter(t=>`${t.title} ${t.artist}`.toLowerCase().includes(String(query).trim().toLowerCase()));
export const sharedTrack=m=>tracks.find(t=>t.id===m.attachment?.trackId||(m.kind==='text'&&m.text===`分享音乐：${t.title}`));
