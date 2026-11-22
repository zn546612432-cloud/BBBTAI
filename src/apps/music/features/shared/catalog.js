import {publicAssetPath} from '../../../../services/public-assets.js';
export const tracks=[{id:'tonight-rain',title:'今夜有雨',artist:'h3r3',duration:290},{id:'melatonin',title:'褪黑素',artist:'江皓南',duration:281,format:'mp3',fallbackFormat:'m4a'},{id:'where-were-going',title:"where we're going",artist:'Elijah Woods',duration:182,format:'mp3',coverFormat:'jpg'}].map(t=>({...t,src:publicAssetPath(`assets/music/${t.id}.${t.format||'m4a'}`),fallback:t.fallbackFormat?publicAssetPath(`assets/music/${t.id}.${t.fallbackFormat}`)+'?audio=2':undefined,cover:publicAssetPath(`assets/music/${t.id}-cover.${t.coverFormat||'svg'}`)}));
export const trackById=id=>tracks.find(t=>t.id===id)||tracks[0];
export const matchingTracks=query=>tracks.filter(t=>`${t.title} ${t.artist}`.toLowerCase().includes(String(query).trim().toLowerCase()));
export const sharedTrack=m=>tracks.find(t=>t.id===m.attachment?.trackId||(m.kind==='text'&&m.text===`分享音乐：${t.title}`));
